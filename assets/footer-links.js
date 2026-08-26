/**
 * @deprecated Use assets/site-config.js (data) and assets/site-footer.js (runtime).
 * Kept so old bookmarks or docs still resolve; logic lives in site-footer.js.
 */
(function () {
  "use strict";
  if (!window.SG_SITE_CONFIG) {
    console.warn("[Safeguard] Load /assets/site-config.js before site-footer.js");
  }
})();
