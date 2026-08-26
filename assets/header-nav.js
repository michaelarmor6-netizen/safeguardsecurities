(function () {
  "use strict";

  var servicesItems = [
    { label: "Stocks", href: "/stock/index.html" },
    { label: "Options", href: "/options/index.html" },
    { label: "Cryptocurrency", href: "/crypto/index.html" },
    { label: "Futures", href: "/futures/index.html" },
    { label: "IPOs", href: "/ipos/index.html" },
    { label: "Mergers & Acquisitions", href: "/mergers-acquisitions/index.html" },
    { label: "ETFs", href: "/etfs/index.html" },
    { label: "Bonds", href: "/bonds/index.html" }
  ];

  var topLevelItems = [
    { label: "Home", href: "/index.html", className: "hfe-menu-item" },
    { label: "About Us", href: "/about/index.html", className: "hfe-menu-item" },
    { label: "Our Services", href: "/services/index.html", children: servicesItems, className: "hfe-menu-item" },
    { label: "Our Team", href: "/our-team/index.html", className: "hfe-menu-item" },
    { label: "M&A", href: "/mergers-acquisitions/index.html", className: "hfe-menu-item" },
    { label: "Contact", href: "/contact/index.html", className: "hfe-menu-item" }
  ];

  function normalizePath(path) {
    if (!path) return "/";
    var out = path.toLowerCase();
    out = out.replace(/\/index\.html$/, "/");
    if (out.endsWith(".html")) return out;
    if (!out.endsWith("/")) out += "/";
    return out;
  }

  function isActive(currentPath, linkPath) {
    var cur = normalizePath(currentPath);
    var link = normalizePath(linkPath);
    if (link === "/" || link === "/index.html") {
      return cur === "/" || cur === "/index.html";
    }
    if (cur === link) return true;
    return cur.startsWith(link.endsWith("/") ? link : link + "/");
  }

  function createMenuItem(item, currentPath) {
    var li = document.createElement("li");
    li.className = "menu-item menu-item-type-post_type menu-item-object-page hfe-creative-menu";

    if (item.children && item.children.length) {
      li.className = "menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children parent hfe-has-submenu hfe-creative-menu";

      var wrap = document.createElement("div");
      wrap.className = "hfe-has-submenu-container";

      var parentA = document.createElement("a");
      parentA.className = item.className || "hfe-menu-item";
      parentA.href = item.href || "#";
      parentA.textContent = item.label;

      var toggle = document.createElement("span");
      toggle.className = "hfe-menu-toggle sub-arrow hfe-menu-child-0";
      toggle.innerHTML = "<i class='fa'></i>";
      parentA.appendChild(toggle);
      wrap.appendChild(parentA);
      li.appendChild(wrap);

      var sub = document.createElement("ul");
      sub.className = "sub-menu";

      var hasActiveChild = false;

      item.children.forEach(function (child) {
        var childLi = document.createElement("li");
        childLi.className = "menu-item menu-item-type-post_type menu-item-object-page hfe-creative-menu";
        if (isActive(currentPath, child.href)) {
          childLi.classList.add("current-menu-item");
          hasActiveChild = true;
        }

        var childA = document.createElement("a");
        childA.href = child.href;
        childA.className = "hfe-sub-menu-item";
        childA.textContent = child.label;

        childLi.appendChild(childA);
        sub.appendChild(childLi);
      });

      if (hasActiveChild || (item.href && isActive(currentPath, item.href))) {
        li.classList.add("current-menu-item");
      }

      li.appendChild(sub);
      return li;
    }

    if (isActive(currentPath, item.href)) {
      li.classList.add("current-menu-item");
    }

    var a = document.createElement("a");
    a.href = item.href;
    a.className = item.className || "hfe-menu-item";
    a.textContent = item.label;

    li.appendChild(a);
    return li;
  }

  function buildMenu(ul) {
    var currentPath = window.location.pathname || "/";
    ul.innerHTML = "";

    topLevelItems.forEach(function (item) {
      ul.appendChild(createMenuItem(item, currentPath));
    });
  }

  function applySharedHeaderMenu() {
    var menus = document.querySelectorAll(".elementor-element-79f3d88 ul.hfe-nav-menu");
    if (!menus.length) return;

    menus.forEach(function (ul) {
      buildMenu(ul);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applySharedHeaderMenu);
  } else {
    applySharedHeaderMenu();
  }
})();
