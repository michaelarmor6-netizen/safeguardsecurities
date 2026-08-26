/**
 * Mobile off-canvas nav — dedicated drawer on <body>, not HFE positioning.
 * Desktop: original Elementor / HFE header menu unchanged.
 */
(function () {
  "use strict";

  var MQ = "(max-width: 1024px)";
  var NAV_WIDGET = ".elementor-element-79f3d88";
  var EBANK_LOGIN = "https://app.safeguardsecurities.us/login";

  function isMobileNav() {
    return window.matchMedia(MQ).matches;
  }

  function getNavParts() {
    var masthead = document.getElementById("masthead");
    if (!masthead) {
      return null;
    }
    var widget = masthead.querySelector(NAV_WIDGET);
    if (!widget) {
      return null;
    }
    var toggle = widget.querySelector(".hfe-nav-menu__toggle");
    var sourceMenu = widget.querySelector("ul.hfe-nav-menu");
    if (!toggle || !sourceMenu) {
      return null;
    }
    return { widget: widget, toggle: toggle, sourceMenu: sourceMenu };
  }

  function linkLabel(anchor) {
    var label = "";
    anchor.childNodes.forEach(function (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        label += node.textContent;
      }
    });
    label = label.trim();
    if (!label) {
      label = (anchor.textContent || "").replace(/\s+/g, " ").trim();
    }
    return label;
  }

  function resolveHref(href) {
    if (!href || href === "#") {
      return href;
    }
    try {
      return new URL(href, window.location.href).href;
    } catch (err) {
      return href;
    }
  }

  function buildDrawerList(sourceMenu) {
    var list = document.createElement("ul");
    list.className = "sg-mobile-drawer__list";

    sourceMenu.querySelectorAll(":scope > li").forEach(function (li) {
      var topLink =
        li.querySelector(":scope > a.hfe-menu-item") ||
        li.querySelector(":scope > .hfe-has-submenu-container > a.hfe-menu-item");
      var subMenu = li.querySelector(":scope > .sub-menu");
      if (!topLink) {
        return;
      }

      var item = document.createElement("li");
      item.className = "sg-mobile-drawer__item";

      if (subMenu) {
        item.classList.add("sg-mobile-drawer__item--has-children");

        var row = document.createElement("div");
        row.className = "sg-mobile-drawer__row";

        var link = document.createElement("a");
        link.className = "sg-mobile-drawer__link";
        link.href = resolveHref(topLink.getAttribute("href"));
        link.textContent = linkLabel(topLink);

        var subToggle = document.createElement("button");
        subToggle.type = "button";
        subToggle.className = "sg-mobile-drawer__subtoggle";
        subToggle.setAttribute("aria-label", "Toggle " + link.textContent + " submenu");
        subToggle.setAttribute("aria-expanded", "false");

        row.appendChild(link);
        row.appendChild(subToggle);
        item.appendChild(row);

        var subList = document.createElement("ul");
        subList.className = "sg-mobile-drawer__sublist";
        subMenu.querySelectorAll(":scope > li > a.hfe-sub-menu-item").forEach(function (subLink) {
          var subItem = document.createElement("li");
          var a = document.createElement("a");
          a.className = "sg-mobile-drawer__sublink";
          a.href = resolveHref(subLink.getAttribute("href"));
          a.textContent = linkLabel(subLink) || subLink.textContent.trim();
          subItem.appendChild(a);
          subList.appendChild(subItem);
        });
        item.appendChild(subList);

        subToggle.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          var open = item.classList.toggle("sg-mobile-drawer__item--open");
          subToggle.setAttribute("aria-expanded", open ? "true" : "false");
        });
      } else {
        var leaf = document.createElement("a");
        leaf.className = "sg-mobile-drawer__link sg-mobile-drawer__link--solo";
        leaf.href = resolveHref(topLink.getAttribute("href"));
        leaf.textContent = linkLabel(topLink);
        item.appendChild(leaf);
      }

      list.appendChild(item);
    });

    var loginItem = document.createElement("li");
    loginItem.className = "sg-mobile-drawer__item";
    var loginA = document.createElement("a");
    loginA.className = "sg-mobile-drawer__link sg-mobile-drawer__link--solo sg-mobile-drawer__link--external-login";
    loginA.href = EBANK_LOGIN;
    loginA.rel = "noopener noreferrer";
    loginA.textContent = "Login";
    loginItem.appendChild(loginA);
    list.appendChild(loginItem);

    return list;
  }

  function ensureMobileDrawer(parts) {
    var drawer = document.querySelector(".sg-mobile-drawer");
    if (!drawer) {
      drawer = document.createElement("nav");
      drawer.className = "sg-mobile-drawer";
      drawer.id = "sg-mobile-drawer";
      drawer.setAttribute("aria-label", "Main menu");
      drawer.setAttribute("aria-hidden", "true");
      drawer.innerHTML =
        '<button type="button" class="sg-mobile-drawer__close" aria-label="Close menu">&times;</button>';

      document.body.appendChild(drawer);

      drawer.querySelector(".sg-mobile-drawer__close").addEventListener("click", function () {
        closeNav();
      });
    }

    var sourceId = parts.sourceMenu.id || "menu-source";
    if (drawer.dataset.sgSourceId !== sourceId) {
      drawer.dataset.sgSourceId = sourceId;
      var existingList = drawer.querySelector(".sg-mobile-drawer__list");
      if (existingList) {
        existingList.remove();
      }
      drawer.appendChild(buildDrawerList(parts.sourceMenu));
    }

    return drawer;
  }

  function ensureBackdrop() {
    var backdrop = document.querySelector(".sg-mobile-nav-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("button");
      backdrop.type = "button";
      backdrop.className = "sg-mobile-nav-backdrop";
      backdrop.setAttribute("aria-label", "Close menu");
      document.body.appendChild(backdrop);
      backdrop.addEventListener("click", function () {
        closeNav();
      });
    }
    return backdrop;
  }

  function detachHfeMobileHandlers(widget) {
    if (!window.jQuery || !widget) {
      return;
    }
    var $w = window.jQuery(widget);
    $w.find(".hfe-nav-menu__toggle").off("click keyup");
    $w.find("div.hfe-has-submenu-container").off("click");
    $w.find(".hfe-menu-toggle, .sub-arrow").off("click keyup");
    $w.find("ul.hfe-nav-menu li a").off("click");
  }

  function openNav(parts) {
    if (!parts) {
      parts = getNavParts();
    }
    if (!parts || !isMobileNav()) {
      return;
    }
    detachHfeMobileHandlers(parts.widget);
    ensureMobileDrawer(parts);
    ensureBackdrop();
    document.body.classList.add("sg-nav-open");
    parts.toggle.setAttribute("aria-expanded", "true");
    parts.toggle.setAttribute("aria-label", "Close menu");
    var drawer = document.querySelector(".sg-mobile-drawer");
    if (drawer) {
      drawer.setAttribute("aria-hidden", "false");
    }
  }

  function closeNav(parts) {
    if (!parts) {
      parts = getNavParts();
    }
    document.body.classList.remove("sg-nav-open");
    if (parts) {
      parts.toggle.setAttribute("aria-expanded", "false");
      parts.toggle.setAttribute("aria-label", "Open menu");
    }
    var drawer = document.querySelector(".sg-mobile-drawer");
    if (drawer) {
      drawer.setAttribute("aria-hidden", "true");
      drawer.querySelectorAll(".sg-mobile-drawer__item--open").forEach(function (item) {
        item.classList.remove("sg-mobile-drawer__item--open");
        var btn = item.querySelector(".sg-mobile-drawer__subtoggle");
        if (btn) {
          btn.setAttribute("aria-expanded", "false");
        }
      });
    }
  }

  function resetDesktopNav(parts) {
    if (!parts) {
      parts = getNavParts();
    }
    closeNav(parts);
  }

  function ensureNavWidgetVisible(widget) {
    if (!widget) {
      return;
    }
    widget.classList.remove("elementor-invisible");
    widget.style.visibility = "visible";
    widget.style.opacity = "1";
    var wrap = widget.closest(".elementor-widget-wrap");
    if (wrap) {
      wrap.style.visibility = "visible";
      wrap.style.opacity = "1";
    }
    var column = widget.closest(".elementor-element-914f9f9");
    if (column) {
      column.style.visibility = "visible";
      column.style.opacity = "1";
    }
  }

  function ensureMobileToggleVisible(parts) {
    if (!parts || !isMobileNav()) {
      return;
    }
    ensureNavWidgetVisible(parts.widget);
    parts.toggle.style.display = "flex";
    parts.toggle.style.visibility = "visible";
    parts.toggle.style.opacity = "1";
    parts.toggle.style.pointerEvents = "auto";
    var iconWrap = parts.toggle.querySelector(".hfe-nav-menu-icon");
    if (iconWrap) {
      iconWrap.style.display = "block";
      iconWrap.style.visibility = "visible";
      iconWrap.style.opacity = "1";
    }
  }

  function fixMobileToggleA11y(toggle) {
    if (!toggle) {
      return;
    }
    toggle.setAttribute("role", "button");
    toggle.setAttribute("tabindex", "0");
    if (!toggle.getAttribute("aria-expanded")) {
      toggle.setAttribute("aria-expanded", "false");
    }
    if (!toggle.getAttribute("aria-label")) {
      toggle.setAttribute("aria-label", "Open menu");
    }
  }

  function refreshNav() {
    var parts = getNavParts();
    if (!parts) {
      return;
    }
    var menuWasOpen = document.body.classList.contains("sg-nav-open");
    ensureNavWidgetVisible(parts.widget);
    ensureMobileToggleVisible(parts);
    fixMobileToggleA11y(parts.toggle);
    detachHfeMobileHandlers(parts.widget);

    if (!isMobileNav()) {
      resetDesktopNav(parts);
      return;
    }

    ensureMobileDrawer(parts);

    if (!menuWasOpen) {
      closeNav(parts);
    }
  }

  function init() {
    var parts = getNavParts();
    if (!parts) {
      return;
    }

    ensureBackdrop();
    refreshNav();

    if (parts.widget.dataset.sgNavBound === "1") {
      return;
    }
    parts.widget.dataset.sgNavBound = "1";

    parts.toggle.addEventListener(
      "click",
      function (e) {
        if (!isMobileNav()) {
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        if (document.body.classList.contains("sg-nav-open")) {
          closeNav(parts);
        } else {
          openNav(parts);
        }
      },
      true
    );

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isMobileNav() && document.body.classList.contains("sg-nav-open")) {
        closeNav(parts);
      }
    });

    window.addEventListener("resize", refreshNav);
  }

  function boot() {
    init();
    if (window.jQuery) {
      window.jQuery(window).on("elementor/frontend/init", function () {
        setTimeout(refreshNav, 0);
        setTimeout(refreshNav, 400);
      });
    }
    window.addEventListener("pageshow", refreshNav);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
