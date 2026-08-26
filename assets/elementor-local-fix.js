/**
 * Static export: keep Elementor chunks on this host (not safeguardsecurities.us).
 * Load after elementor-frontend-js-before and before frontend.min.js.
 */
(function () {
  "use strict";

  var REMOTE_HOST = "safeguardsecurities.us";

  function localAssets(plugin) {
    return window.location.origin + "/wp-content/plugins/" + plugin + "/assets/";
  }

  function localJsBase(plugin) {
    return localAssets(plugin).replace(/\/?$/, "/") + "js/";
  }

  function rewriteRemoteUrl(url) {
    if (typeof url !== "string" || url.indexOf(REMOTE_HOST) === -1) {
      return url;
    }
    try {
      return window.location.origin + new URL(url).pathname;
    } catch (err) {
      return url;
    }
  }

  function hookWebpackScriptLoader(req) {
    if (!req || !req.l || req.l.__sgLocalAssetsPatched) {
      return;
    }

    var originalLoader = req.l;
    req.l = function (url, chunkId, chunkName, priority) {
      return originalLoader.call(
        req,
        rewriteRemoteUrl(url),
        chunkId,
        chunkName,
        priority
      );
    };
    req.l.__sgLocalAssetsPatched = true;
  }

  function applyPatches() {
    var elementorAssets = localAssets("elementor");
    var elementorJsBase = localJsBase("elementor");

    if (window.elementorFrontendConfig && window.elementorFrontendConfig.urls) {
      window.elementorFrontendConfig.urls.assets = elementorAssets;
    }

    if (window.ElementorProFrontendConfig && window.ElementorProFrontendConfig.urls) {
      window.ElementorProFrontendConfig.urls.assets = localAssets("elementor-pro");
    }

    var req = window.__webpack_require__;
    if (req) {
      req.p = elementorJsBase;
      hookWebpackScriptLoader(req);
    }
  }

  applyPatches();
})();
