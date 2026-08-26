/**
 * Applies shared footer nav links and contact info from assets/site-config.js.
 */
(function () {
  "use strict";

  var config = window.SG_SITE_CONFIG;
  if (!config) {
    return;
  }

  var contact = config.contact || {};
  var footerSections = config.footerSections || {};

  function normalizeHeading(text) {
    return (text || "").replace(/\s+/g, " ").trim().toUpperCase();
  }

  function mapsSearchUrl() {
    if (contact.mapsQuery) {
      return (
        "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(contact.mapsQuery).replace(/%20/g, "+")
      );
    }
    var q = (contact.address || "").replace(/,/g, " ").trim();
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q).replace(/%20/g, "+");
  }

  function buildFooterLinkItem(item) {
    var li = document.createElement("li");
    li.className = "elementor-icon-list-item";

    var a = document.createElement("a");
    a.href = item.href;

    var span = document.createElement("span");
    span.className = "elementor-icon-list-text";
    span.textContent = item.label;

    a.appendChild(span);
    li.appendChild(a);
    return li;
  }

  function applySharedFooterLinks() {
    var columns = document.querySelectorAll("footer .elementor-column");
    if (!columns.length) {
      return;
    }

    columns.forEach(function (column) {
      var headingEl = column.querySelector(".elementor-widget-heading .elementor-heading-title");
      var listEl = column.querySelector(".elementor-widget-icon-list .elementor-icon-list-items");
      if (!headingEl || !listEl) {
        return;
      }

      var key = normalizeHeading(headingEl.textContent);
      var links = footerSections[key];
      if (!links) {
        return;
      }

      listEl.innerHTML = "";
      links.forEach(function (item) {
        listEl.appendChild(buildFooterLinkItem(item));
      });
    });
  }

  function setIconListText(item, text) {
    var span = item.querySelector(".elementor-icon-list-text");
    if (span) {
      span.textContent = text;
    }
  }

  function iconInItem(item, classFragment) {
    var icon = item.querySelector(".elementor-icon-list-icon i");
    if (!icon || !icon.className) {
      return false;
    }
    return icon.className.indexOf(classFragment) !== -1;
  }

  function applyFooterContactColumn(column) {
    var items = column.querySelectorAll(".elementor-icon-list-items > .elementor-icon-list-item");
    items.forEach(function (item) {
      if (iconInItem(item, "fa-phone")) {
        setIconListText(item, contact.phoneDisplay || "");
        var telLink = item.querySelector('a[href^="tel:"]');
        if (telLink && contact.phoneTel) {
          telLink.setAttribute("href", "tel:" + contact.phoneTel);
        }
      } else if (iconInItem(item, "fa-envelope")) {
        setIconListText(item, contact.email || "");
        var mailLink = item.querySelector('a[href^="mailto:"]');
        if (mailLink && contact.email) {
          mailLink.setAttribute("href", "mailto:" + contact.email);
        }
      } else if (iconInItem(item, "fa-map-marker")) {
        setIconListText(item, contact.address || "");
      }
    });
  }

  function findFooterContactColumn() {
    var footer = document.getElementById("colophon");
    if (!footer) {
      return null;
    }

    var columns = footer.querySelectorAll(".elementor-column");
    for (var i = 0; i < columns.length; i++) {
      var column = columns[i];
      var headingEl = column.querySelector(".elementor-widget-heading .elementor-heading-title");
      if (headingEl && normalizeHeading(headingEl.textContent) === "CONTACT") {
        return column;
      }
    }
    return null;
  }

  function applyImageBoxContacts(root) {
    if (!root) {
      return;
    }

    root.querySelectorAll(".elementor-image-box-wrapper").forEach(function (wrapper) {
      var titleEl = wrapper.querySelector(".elementor-image-box-title");
      var descEl = wrapper.querySelector(".elementor-image-box-description");
      if (!titleEl || !descEl) {
        return;
      }

      var title = normalizeHeading(titleEl.textContent);
      var column = wrapper.closest(".elementor-column");
      if (title === "PHONE") {
        descEl.textContent = contact.phoneDisplay || "";
        if (column) {
          var telBtn = column.querySelector('a[href^="tel:"]');
          if (telBtn && contact.phoneTel) {
            telBtn.setAttribute("href", "tel:" + contact.phoneTel);
          }
        }
      } else if (title === "EMAIL") {
        descEl.textContent = contact.email || "";
        if (column) {
          var mailBtn = column.querySelector('a[href^="mailto:"]');
          if (mailBtn && contact.email) {
            mailBtn.setAttribute("href", "mailto:" + contact.email);
          }
        }
      } else if (title === "LOCATION") {
        descEl.textContent = contact.address || "";
        if (column) {
          var mapBtn = column.querySelector('a[href*="google.com/maps"]');
          if (mapBtn) {
            mapBtn.setAttribute("href", mapsSearchUrl());
          }
        }
      }
    });
  }

  function applyContactInfo() {
    var footerContact = findFooterContactColumn();
    if (footerContact) {
      applyFooterContactColumn(footerContact);
    }

    var page = document.getElementById("page");
    if (page) {
      applyImageBoxContacts(page);
    } else {
      applyImageBoxContacts(document.body);
    }

    if (contact.email) {
      document.querySelectorAll('a[href^="mailto:info@safeguardsecurities"]').forEach(function (a) {
        a.setAttribute("href", "mailto:" + contact.email);
      });
    }
    if (contact.phoneTel) {
      document.querySelectorAll('a[href^="tel:+12163407164"], a[href^="tel:216"]').forEach(function (a) {
        a.setAttribute("href", "tel:" + contact.phoneTel);
      });
    }
  }

  function boot() {
    applySharedFooterLinks();
    applyContactInfo();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
