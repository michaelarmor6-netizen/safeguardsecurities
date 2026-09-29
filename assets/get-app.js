/**
 * Homepage "Get the app" button and install dialog.
 * The installable app lives on app.safeguardsecurities.us.
 */
(function () {
  "use strict";

  var APP_URL = "https://app.safeguardsecurities.us/?getapp=1";
  var ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';

  var dialog;

  function makeButton(extraClass) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "sg-get-app" + (extraClass ? " " + extraClass : "");
    button.setAttribute("aria-haspopup", "dialog");
    button.innerHTML = ICON + "<span>Get the app</span>";
    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      openDialog();
    });
    return button;
  }

  function ensureDialog() {
    if (dialog) {
      return dialog;
    }
    dialog = document.createElement("div");
    dialog.className = "sg-get-app-dialog";
    dialog.hidden = true;
    dialog.innerHTML =
      '<div class="sg-get-app-card" role="dialog" aria-modal="true" aria-labelledby="sg-get-app-title">' +
      '<button type="button" class="sg-get-app-close" aria-label="Close">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>' +
      "</button>" +
      '<img src="/assets/favicon/apple-touch-icon.png" alt="" width="40" height="40" style="border-radius:10px">' +
      '<h2 id="sg-get-app-title">Get SafeGuard as an app</h2>' +
      '<p class="sg-get-app-lead">It opens full-screen like any other app — no app store needed. Here\'s how:</p>' +
      '<div class="sg-get-app-note sg-get-app-note--desk">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>' +
      "<p>On a computer, open <strong>app.safeguardsecurities.us</strong>, then click the install icon at the right end of the address bar — or open the browser menu and choose <strong>Install SafeGuard</strong>.</p>" +
      "</div>" +
      '<div class="sg-get-app-note sg-get-app-note--phone">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="#db2777" stroke-width="1.8" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>' +
      "<p>On a phone instead? Open this same address there and tap <strong>Get the app</strong>.</p>" +
      "</div>" +
      '<a class="sg-get-app-domain" href="' +
      APP_URL +
      '">app.safeguardsecurities.us</a>' +
      '<a class="sg-get-app-go" href="' +
      APP_URL +
      '">Open the app</a>' +
      "</div>";
    document.body.appendChild(dialog);

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) {
        closeDialog();
      }
    });
    dialog.querySelector(".sg-get-app-close").addEventListener("click", closeDialog);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !dialog.hidden) {
        closeDialog();
      }
    });
    return dialog;
  }

  function openDialog() {
    var node = ensureDialog();
    node.hidden = false;
    document.body.classList.add("sg-get-app-open");
  }

  function closeDialog() {
    if (!dialog) {
      return;
    }
    dialog.hidden = true;
    document.body.classList.remove("sg-get-app-open");
  }

  function placeOnce(parent, className) {
    if (!parent || parent.querySelector(".sg-get-app")) {
      return;
    }
    var wrap = document.createElement("div");
    wrap.className = className || "sg-get-app-inline";
    wrap.appendChild(makeButton());
    parent.appendChild(wrap);
  }

  function placeHeader() {
    var container = document.querySelector("#masthead .elementor-top-section > .elementor-container");
    var logoCol = document.querySelector("#masthead .elementor-element-2f4dddd");
    if (container && logoCol && !container.querySelector(".sg-get-app-slot--desktop")) {
      var desktop = document.createElement("div");
      desktop.className = "sg-get-app-slot sg-get-app-slot--desktop";
      desktop.appendChild(makeButton("sg-get-app--header"));
      logoCol.insertAdjacentElement("afterend", desktop);
    }

    var masthead = document.getElementById("masthead");
    if (masthead && !masthead.querySelector(".sg-get-app-slot--mobile")) {
      var mobile = document.createElement("div");
      mobile.className = "sg-get-app-slot sg-get-app-slot--mobile";
      mobile.appendChild(makeButton("sg-get-app--header"));
      masthead.appendChild(mobile);
    }
  }

  function placeCtas() {
    ["71624038"].forEach(function (id) {
      var widget = document.querySelector(".elementor-element-" + id + " .elementor-widget-container");
      placeOnce(widget);
    });

    var ai = document.querySelector(".ai-cta");
    if (ai && !ai.querySelector(".sg-get-app")) {
      ai.appendChild(makeButton());
    }

    placeOnce(document.querySelector(".elementor-element-cad3918 .elementor-widget-wrap"));
    placeOnce(document.querySelector(".elementor-element-f2e4d64 .elementor-widget-wrap"));
  }

  function boot() {
    if (!document.body || !document.body.classList.contains("home")) {
      return;
    }
    placeHeader();
    placeCtas();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
