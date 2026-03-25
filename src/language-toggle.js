/**
 * Language Toggle Script
 *
 * Enables smart navigation when switching between Python and TypeScript docs.
 * When a user clicks the language dropdown, this redirects them to the equivalent
 * page in the target language (preserving the section hash) instead of the default
 * overview page.
 *
 * How it works:
 * 1. Tracks the current OSS page URL in sessionStorage (survives script re-execution)
 * 2. Intercepts pushState/replaceState to detect language switches before they render
 * 3. On language switch, hides the page and immediately redirects so the wrong page
 *    never visibly appears
 */

(function () {
  "use strict";

  var PYTHON_PREFIX = "/oss/python/";
  var JS_PREFIX = "/oss/javascript/";
  var STORAGE_KEY = "__lang_toggle_prev";
  var LANGUAGE_TOGGLE_SELECTOR = ".nav-dropdown-item";

  function getPreviousUrl() {
    try { return sessionStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function setPreviousUrl(url) {
    try { sessionStorage.setItem(STORAGE_KEY, url); } catch (e) {}
  }

  function clearPreviousUrl() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

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

  function updateCurrent() {
    if (getPathLanguage(location.pathname)) {
      setPreviousUrl(location.pathname + location.hash);
    }
  }

  function computeRedirect(newPath) {
    var previousUrl = getPreviousUrl();
    if (!previousUrl) return null;

    var parts = previousUrl.split("#");
    var prevPath = parts[0];
    var prevHash = parts[1] || "";
    var prevLang = getPathLanguage(prevPath);
    var newLang = getPathLanguage(newPath);

    if (prevLang && newLang && prevLang !== newLang) {
      var equiv = getEquivalentPath(prevPath, newLang);
      if (equiv && equiv !== newPath) {
        return equiv + (prevHash ? "#" + prevHash : "");
      }
    }
    return null;
  }

  function extractPath(args) {
    var url = args[2];
    if (!url) return null;
    try {
      if (typeof url === "string" && url.startsWith("/")) return url.split("?")[0].split("#")[0];
      var parsed = new URL(url, location.origin);
      if (parsed.origin === location.origin) return parsed.pathname;
    } catch (e) {}
    return null;
  }

  function hidePageAndRedirect(redirect) {
    clearPreviousUrl();
    document.documentElement.style.visibility = "hidden";
    location.replace(redirect);
  }

  document.addEventListener(
    "click",
    function (e) {
      if (e.target.closest(LANGUAGE_TOGGLE_SELECTOR)) {
        updateCurrent();
      }
    },
    true,
  );

  if (!window.__langTogglePatched) {
    window.__langTogglePatched = true;

    var originalPushState = history.pushState;
    var originalReplaceState = history.replaceState;

    history.pushState = function () {
      var targetPath = extractPath(arguments);
      if (targetPath) {
        var redirect = computeRedirect(targetPath);
        if (redirect) {
          hidePageAndRedirect(redirect);
          return;
        }
      }
      originalPushState.apply(this, arguments);
      updateCurrent();
    };

    history.replaceState = function () {
      var targetPath = extractPath(arguments);
      if (targetPath) {
        var redirect = computeRedirect(targetPath);
        if (redirect) {
          hidePageAndRedirect(redirect);
          return;
        }
      }
      originalReplaceState.apply(this, arguments);
      updateCurrent();
    };

    window.addEventListener("popstate", function () { updateCurrent(); });
  }

  var pendingRedirect = (function () {
    var previousUrl = getPreviousUrl();
    if (!previousUrl) return null;
    var prevLang = getPathLanguage(previousUrl.split("#")[0]);
    var currentLang = getPathLanguage(location.pathname);
    if (prevLang && currentLang && prevLang !== currentLang) {
      return computeRedirect(location.pathname);
    }
    return null;
  })();

  if (pendingRedirect) {
    hidePageAndRedirect(pendingRedirect);
  } else {
    updateCurrent();
  }
})();
