(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__EVA_SDK_LOADER_INITIALIZED__) return;
  window.__EVA_SDK_LOADER_INITIALIZED__ = true;

  var currentScript = document.currentScript;
  var scriptSrc = currentScript ? currentScript.src : '';
  var baseUrl = scriptSrc ? scriptSrc.substring(0, scriptSrc.lastIndexOf('/') + 1) : '';

  window.__EVA_SDK_ASSET_BASE__ = baseUrl;

  var cssFile = (currentScript && currentScript.getAttribute('data-css')) || 'sdk-styles.css';
  var jsFile = (currentScript && currentScript.getAttribute('data-js')) || 'eva-web-sdk.umd.js';

  var cssHref = baseUrl + cssFile;
  var jsSrc = baseUrl + jsFile;

  function preload(href, asType) {
    var l = document.createElement('link');
    l.rel = 'preload';
    l.as = asType;
    l.href = href;
    if (asType === 'style') l.setAttribute('crossorigin', 'anonymous');
    document.head.appendChild(l);
  }

  try {
    preload(cssHref, 'style');
    preload(jsSrc, 'script');
  } catch (e) { /* ignore */ }

  if (!document.querySelector('link[data-eva-sdk-css]')) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssHref;
    link.setAttribute('data-eva-sdk-css', 'true');
    document.head.appendChild(link);
  }

  function autoInit() {
    try {
      var cfg = window.EvaSDKConfig;
      if (cfg && window.EvaSDK && typeof window.EvaSDK.initializeSDK === 'function') {
        window.EvaSDK.initializeSDK(cfg);
      }
    } catch (e) {
      console.error('[EVA SDK] Auto-init failed:', e);
    }
    try {
      window.dispatchEvent(new Event('eva-sdk-loaded'));
    } catch (e) { /* IE fallback not needed for this SDK */ }
  }

  if (!document.querySelector('script[data-eva-sdk-js]')) {
    var script = document.createElement('script');
    script.src = jsSrc;
    script.async = false;
    script.defer = false;
    script.setAttribute('data-eva-sdk-js', 'true');

    script.onload = autoInit;
    script.onerror = function () {
      console.error('[EVA SDK] Failed to load main bundle from:', script.src);
    };

    document.head.appendChild(script);
  }
})();
