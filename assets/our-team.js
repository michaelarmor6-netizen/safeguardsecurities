/**
 * Our Team page — initials avatars and tier labels on leadership cards.
 */
(function () {
  "use strict";

  if (!document.body.classList.contains("elementor-page-1623")) {
    return;
  }

  var TIER_LABELS = {
    executive: "Executive Office",
    csuite: "C-Suite",
    senior: "Senior Leadership",
    management: "Department Management",
  };

  function initialsFromName(name) {
    var parts = name
      .replace(/[^a-zA-Z\s]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) {
      return "";
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function addAvatar(container, name) {
    if (!container || container.querySelector(".sg-team-avatar")) {
      return;
    }
    var avatar = document.createElement("span");
    avatar.className = "sg-team-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = initialsFromName(name);
    container.insertBefore(avatar, container.firstChild);
  }

  function addTierLabel(body, tier) {
    if (!body || !tier || body.querySelector(".sg-team-card__tier-label")) {
      return;
    }
    var label = TIER_LABELS[tier];
    if (!label) {
      return;
    }
    var el = document.createElement("p");
    el.className = "sg-team-card__tier-label";
    el.textContent = label;
    body.appendChild(el);
  }

  function init() {
    document.querySelectorAll(".sg-team-leadership-grid .ha-infobox-body").forEach(function (body) {
      var title = body.querySelector(".ha-infobox-title");
      var card = body.closest("[data-sg-tier]");
      var tier = card ? card.getAttribute("data-sg-tier") : null;
      if (!tier) {
        var level = body.closest(".sg-team-level");
        tier = level ? level.getAttribute("data-sg-tier") : null;
      }
      if (title) {
        addAvatar(body, title.textContent);
      }
      addTierLabel(body, tier);
    });

    document.querySelectorAll(".sg-intro-subtitle").forEach(function (el) {
      el.remove();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
