const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { defineSecret } = require("firebase-functions/params");
const nodemailer = require("nodemailer");
const { TWILIO_AUTH_TOKEN } = require("./voice/config");
const { validateTwilioRequest } = require("./voice/validate");
const { handleVoice } = require("./voice/handlers");

const EMAIL_API_KEY = defineSecret("EMAIL_API_KEY");
const SMTP_HOST = defineSecret("SMTP_HOST");
const SMTP_PORT = defineSecret("SMTP_PORT");
const SMTP_SECURE = defineSecret("SMTP_SECURE");
const SMTP_USER = defineSecret("SMTP_USER");
const SMTP_PASS = defineSecret("SMTP_PASS");
const MAIL_FROM = defineSecret("MAIL_FROM");

function normalizeBoolean(value) {
  return String(value || "false").toLowerCase() === "true";
}

function normalizeRecipients(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ");
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return "";
}

function applySubstitutions(template, substitutions) {
  if (!template || !substitutions || typeof substitutions !== "object") {
    return template;
  }

  return template.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (match, key) => {
    if (!Object.prototype.hasOwnProperty.call(substitutions, key)) {
      return match;
    }

    const replacement = substitutions[key];
    return replacement == null ? "" : String(replacement);
  });
}

function readPayload(req) {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === "string") {
    return JSON.parse(req.body);
  }

  return req.body;
}

function unauthorized(res) {
  res.status(401).json({ ok: false, error: "Unauthorized" });
}

function badRequest(res, message) {
  res.status(400).json({ ok: false, error: message });
}

exports.sendMarketEmail = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "256MiB",
    secrets: [
      EMAIL_API_KEY,
      SMTP_HOST,
      SMTP_PORT,
      SMTP_SECURE,
      SMTP_USER,
      SMTP_PASS,
      MAIL_FROM,
    ],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.set("Allow", "POST");
      res.status(405).json({ ok: false, error: "Method Not Allowed" });
      return;
    }

    const authHeader = req.get("authorization") || "";
    const expectedAuthHeader = `Bearer ${EMAIL_API_KEY.value()}`;

    if (authHeader !== expectedAuthHeader) {
      unauthorized(res);
      return;
    }

    let payload;

    try {
      payload = readPayload(req);
    } catch (error) {
      badRequest(res, "Request body must be valid JSON.");
      return;
    }

    const to = normalizeRecipients(payload.to);
    const cc = normalizeRecipients(payload.cc);
    const bcc = normalizeRecipients(payload.bcc);
    const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
    const from = typeof payload.from === "string" && payload.from.trim() ? payload.from.trim() : MAIL_FROM.value();
    const replyTo = typeof payload.replyTo === "string" && payload.replyTo.trim() ? payload.replyTo.trim() : undefined;
    const substitutions = payload.substitutions || {};
    const html = applySubstitutions(payload.html || "", substitutions);
    const text = applySubstitutions(payload.text || "", substitutions);

    if (!to) {
      badRequest(res, "`to` is required.");
      return;
    }

    if (!subject) {
      badRequest(res, "`subject` is required.");
      return;
    }

    if (!html && !text) {
      badRequest(res, "Provide `html`, `text`, or both.");
      return;
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST.value(),
      port: Number(SMTP_PORT.value() || 587),
      secure: normalizeBoolean(SMTP_SECURE.value()),
      auth: {
        user: SMTP_USER.value(),
        pass: SMTP_PASS.value(),
      },
    });

    try {
      const info = await transporter.sendMail({
        from,
        to,
        cc: cc || undefined,
        bcc: bcc || undefined,
        replyTo,
        subject,
        html: html || undefined,
        text: text || undefined,
      });

      logger.info("Email sent", {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      });

      res.status(200).json({
        ok: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      });
    } catch (error) {
      logger.error("Email send failed", error);
      res.status(500).json({
        ok: false,
        error: "Email send failed.",
        details: error.message,
      });
    }
  }
);

/**
 * Twilio Voice IVR — receptionist greeting, menu routing, optional after-hours voicemail.
 * Configure your Twilio number "A call comes in" webhook to this function URL (POST).
 */
exports.voice = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 30,
    memory: "256MiB",
    invoker: "public",
  },
  async (req, res) => {
    if (req.method !== "POST" && req.method !== "GET") {
      res.set("Allow", "GET, POST");
      res.status(405).send("Method Not Allowed");
      return;
    }

    const authToken = TWILIO_AUTH_TOKEN.value();
    if (!validateTwilioRequest(req, authToken)) {
      logger.warn("Twilio signature validation failed", { path: req.path });
      res.status(403).send("Forbidden");
      return;
    }

    try {
      const xml = handleVoice(req);
      res.set("Content-Type", "text/xml; charset=utf-8");
      res.status(200).send(xml);
    } catch (error) {
      logger.error("Voice handler failed", error);
      res.set("Content-Type", "text/xml; charset=utf-8");
      res.status(200).send(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">We are experiencing technical difficulties. Please try again later.</Say><Hangup/></Response>'
      );
    }
  }
);