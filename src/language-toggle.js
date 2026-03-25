/**
 * Language Toggle Script
 *
 * Enables smart navigation when switching between Python and TypeScript docs.
 * When a user clicks the language dropdown, this redirects them to the equivalent
 * page in the target language (preserving the section hash) instead of the default
 * overview page.
 *
 * How it works:
 * Mintlify's language dropdown renders <a> tags inside a Radix UI portal. Next.js
 * intercepts clicks on these <a> tags for client-side SPA navigation. We use a
 * MutationObserver to detect when the dropdown portal appears, then rewrite the
 * href on each dropdown link to point to the equivalent page in the other language.
 * Next.js then navigates directly to the correct page — no redirect or page refresh.
 */

(function () {
  "use strict";

  if (window.__langToggleInit) return;
  window.__langToggleInit = true;

  var PYTHON_PREFIX = "/oss/python/";
  var JS_PREFIX = "/oss/javascript/";

  function getPathLanguage(path) {
    if (path.startsWith(PYTHON_PREFIX)) return "python";
    if (path.startsWith(JS_PREFIX)) return "javascript";
    return null;
  }

  function getEquivalentPath(sourcePath, targetLang) {
    var sourcePrefix = targetLang === "python" ? JS_PREFIX : PYTHON_PREFIX;
    var targetPrefix = targetLang === "python" ? PYTHON_PREFIX : JS_PREFIX;
    if (sourcePath.startsWith(sourcePrefix)) {
      return targetPrefix + sourcePath.substring(sourcePrefix.length);
    }
    return null;
  }

  function rewriteDropdownLinks(portal) {
    var currentLang = getPathLanguage(location.pathname);
    if (!currentLang) return;

    var links = portal.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      var href = link.getAttribute("href");
      if (!href) continue;

      var linkLang = getPathLanguage(href);
      if (linkLang && linkLang !== currentLang) {
        var equiv = getEquivalentPath(location.pathname, linkLang);
        if (equiv) {
          link.setAttribute("href", equiv + location.hash);
        }
      }
    }
  }

  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var added = mutations[i].addedNodes;
      for (var j = 0; j < added.length; j++) {
        var node = added[j];
        if (node.nodeType !== 1) continue;
        var portal = node.querySelector
          ? node.querySelector("[data-radix-popper-content-wrapper]")
          : null;
        if (!portal && node.matches && node.matches("[data-radix-popper-content-wrapper]")) {
          portal = node;
        }
        if (portal) {
          rewriteDropdownLinks(portal);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
