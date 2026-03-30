/**
 * Cubik Builder -> cubik.one shop integration (triggered on HUD Save)
 * @version 2.7.0
 * @date 2026-02-04
 * 
 * What it does:
 *  - Build facet map via CubikBackendAPI.buildFacetMap()
 *  - Convert facet map to shop "items" ({id,count}) via mapping (type|#HEX -> productId)
 *  - Generate preview as Blob via CubikBackendAPI.getProjectData() / CubikThumbnail.captureAsBlob()
 *  - POST FormData(items,file) to /add-new-resource-api/
 *  - On success, open returned URL (same-tab by default; configurable)
 *  - On error, show message to user
 *
 * v2.7.0 - Один сценарий: прелоадер → new-tab или same-tab при блокировке; без предоткрытой вкладки
 * v2.6.0 - new-tab: открывать вкладку с «Идёт переход…» (data URL), не пустую; Safari OK
 * v2.5.0 - redirectMode: same-tab by default (Safari/popup blocker fix)
 * v2.4.0 - Improved preloader: 3D rotating cube animation, "please wait" message, animated dots
 * v2.3.0 - Added "Sign In" button to error modal for auth errors (opens https://cubik.one/sign-in/)
 * v1.3.1 - Open shop in new tab instead of redirect (keep editor open)
 * v1.3.0 - i18n support (translations via CubikI18N)
 * v1.2.0 - Preloader overlay instead of popup; redirect in same tab
 * v1.1.1 - Fixed popup redirect (removed 'noopener' flag)
 * v1.1.0 - Skip /cubiks/ fetch if CUBIK_SHOP_MAP already loaded
 * 
 * This file is intentionally non-invasive: it doesn't replace your existing Save logic.
 */
(function (global) {
  'use strict';

  var DEFAULTS = {
    // Endpoints
    cubiksUrl: '/cubiks/',
    apiUrl: '/add-new-resource-api/',
    // Optional: direct mapping JSON endpoint that returns { "Type|#HEX": productId, ... }
    shopMapUrl: '',
    // Trigger
    bindToSaveButton: true,
    saveButtonId: 'hudSaveBtn',
    // Behaviour on successful shop API response (same-tab avoids Safari/popup blocker)
    redirectMode: 'same-tab', // 'same-tab' | 'new-tab' | 'none'
    // Thumbnail
    thumbnailWidth: 512,
    thumbnailHeight: 512,
    thumbnailFormat: 'image/png',
    // Networking
    credentials: 'same-origin',
    // Debug
    log: true
  };

  function cfg() {
    var c = global.CUBIK_ORDER || {};
    var out = {};
    for (var k in DEFAULTS) out[k] = DEFAULTS[k];
    for (var k2 in c) out[k2] = c[k2];
    return out;
  }

  function log() {
    var c = cfg();
    if (!c.log) return;
    try { console.log.apply(console, arguments); } catch (_) {}
  }

  function warn() {
    try { console.warn.apply(console, arguments); } catch (_) {}
  }

  function upperHex(hex) {
    if (!hex) return null;
    var h = String(hex).trim().toUpperCase();
    if (h[0] !== '#') h = '#' + h;
    // normalize short #RGB
    if (h.length === 4) {
      h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    }
    return h;
  }

  function deepClone(obj) {
    try { return JSON.parse(JSON.stringify(obj)); } catch (_) { return obj; }
  }

  function getRalToHexMap() {
    // Prefer palette from app if present
    var map = {
      '7037': '#7D7F7D', // grey
      '1011': '#8A6642', // brown/beige
      '6010': '#4C9141', // green
      '9003': '#F4F4F4', // white
      '9005': '#0A0A0A'  // black
    };

    // If window.RALS exists, try to enrich using its labels (best-effort)
    // RALS format in app: [[label, hex], ...], label might include RAL code.
    try {
      if (global.RALS && global.RALS.length) {
        for (var i = 0; i < global.RALS.length; i++) {
          var label = String(global.RALS[i][0] || '');
          var hex = upperHex(global.RALS[i][1] || '');
          var m = label.match(/\bRAL\s*([0-9]{4})\b/i);
          if (m && hex) map[m[1]] = hex;
        }
      }
    } catch (_) {}
    return map;
  }

  function parseTypeFromName(name) {
    var n = String(name || '').toLowerCase();
    // order matters (zen/2 must come before zen)
    if (n.indexOf('zen/2') !== -1 || n.indexOf('zen 2') !== -1 || n.indexOf('зен/2') !== -1 || n.indexOf('зен 2') !== -1) return 'Zen/2';
    if (n.indexOf('bion') !== -1 || n.indexOf('бион') !== -1) return 'Bion';
    if (n.indexOf('flora') !== -1 || n.indexOf('флор') !== -1) return 'Flora';
    if (n.indexOf('void') !== -1 || n.indexOf('воид') !== -1 || n.indexOf('пуст') !== -1) return 'Void';
    if (n.indexOf('zen') !== -1 || n.indexOf('зен') !== -1) return 'Zen';
    return null;
  }

  function parseHexFromName(name) {
    var n = String(name || '');
    var m = n.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/);
    if (m) return upperHex(m[1]);
    return null;
  }

  function parseRalFromName(name) {
    var n = String(name || '');
    var m = n.match(/\bRAL\s*([0-9]{4})\b/i);
    if (m) return m[1];
    // often "9005" without RAL
    var m2 = n.match(/\b(7037|1011|6010|9003|9005)\b/);
    if (m2) return m2[1];
    return null;
  }

  function parseColorFromName(name) {
    var hex = parseHexFromName(name);
    if (hex) return hex;
    var ral = parseRalFromName(name);
    if (ral) {
      var map = getRalToHexMap();
      return upperHex(map[ral] || null);
    }
    // last resort word-based
    var n = String(name || '').toLowerCase();
    if (/\b(black|черн)\b/.test(n)) return '#0A0A0A';
    if (/\b(white|бел)\b/.test(n)) return '#F4F4F4';
    if (/\b(grey|gray|сер)\b/.test(n)) return '#7D7F7D';
    if (/\b(green|зел)\b/.test(n)) return '#4C9141';
    if (/\b(beige|brown|беж|корич)\b/.test(n)) return '#8A6642';
    return null;
  }

  function ensureShopMapObj() {
    if (!global.CUBIK_SHOP_MAP || typeof global.CUBIK_SHOP_MAP !== 'object') {
      global.CUBIK_SHOP_MAP = {};
    }
    return global.CUBIK_SHOP_MAP;
  }

  function fetchJson(url) {
    return fetch(url, { credentials: cfg().credentials, headers: { 'Accept': 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
        return r.json();
      });
  }

  function loadShopMapFromUrl(url) {
    return fetchJson(url).then(function (json) {
      var map = ensureShopMapObj();
      // allow either {key:id} or {map:{key:id}}
      var src = json && json.map && typeof json.map === 'object' ? json.map : json;
      for (var k in src) map[String(k)] = src[k];
      log('[CubikShop] Loaded shop map from', url, 'keys=', Object.keys(map).length);
      return map;
    });
  }

  function loadShopMapFromCubiksList(url) {
    return fetchJson(url).then(function (list) {
      var map = ensureShopMapObj();
      var unknown = [];
      if (!Array.isArray(list)) {
        // sometimes wrapped: {data:[...]} or {cubiks:[...]}
        if (list && Array.isArray(list.data)) list = list.data;
        else if (list && Array.isArray(list.cubiks)) list = list.cubiks;
      }
      if (!Array.isArray(list)) throw new Error('Unexpected /cubiks response format');

      for (var i = 0; i < list.length; i++) {
        var item = list[i] || {};
        var id = item.id != null ? item.id : item.ID != null ? item.ID : null;
        var name = item.name || item.title || item.caption || item.label || '';
        if (id == null) continue;

        var type = item.type || item.kind || parseTypeFromName(name);
        var hex = item.colorHex || item.hex || item.baseHex || parseColorFromName(name);

        type = type ? String(type) : null;
        hex = upperHex(hex);

        if (!type || !hex) {
          unknown.push({ id: id, name: name, type: type, hex: hex });
          continue;
        }

        var key = type + '|' + hex;
        if (map[key] != null && map[key] !== id) {
          warn('[CubikShop] Duplicate key in map:', key, 'existing=', map[key], 'new=', id);
          continue;
        }
        map[key] = id;
      }

      if (unknown.length) {
        warn('[CubikShop] Some products could not be auto-mapped from /cubiks:', unknown.slice(0, 20));
      }
      log('[CubikShop] Built shop map from', url, 'keys=', Object.keys(map).length);
      return map;
    });
  }

  // Public: loads mapping (shopMapUrl preferred, else cubiksUrl)
  // Skip loading if CUBIK_SHOP_MAP already has entries (from cubik-shop-map.js)
  function cubikLoadShopMap() {
    var c = cfg();
    var map = ensureShopMapObj();
    
    // If map already has entries, skip fetching
    if (Object.keys(map).length > 0) {
      log('[CubikShop] Shop map already loaded, skipping fetch. Keys:', Object.keys(map).length);
      return Promise.resolve(map);
    }
    
    if (c.shopMapUrl) return loadShopMapFromUrl(c.shopMapUrl);
    return loadShopMapFromCubiksList(c.cubiksUrl);
  }

  function buildOrderItemsFromFacetMap(facetMap) {
    var map = ensureShopMapObj();
    var items = [];
    var missing = [];

    for (var type in facetMap) {
      var colors = facetMap[type] || {};
      for (var hex in colors) {
        var count = colors[hex] || 0;
        if (!count) continue;

        var key = String(type) + '|' + upperHex(hex);
        var pid = map[key];

        if (pid == null) {
          missing.push({ key: key, type: type, hex: upperHex(hex), count: count });
          continue;
        }
        items.push({ id: pid, count: count });
      }
    }
    return { items: items, missing: missing };
  }

  function getFacetMap() {
    if (global.CubikBackendAPI && typeof global.CubikBackendAPI.buildFacetMap === 'function') {
      return global.CubikBackendAPI.buildFacetMap();
    }
    throw new Error('CubikBackendAPI.buildFacetMap() not found (backend-api.js must be loaded).');
  }

  function getThumbnailBlob() {
    var c = cfg();
    // Prefer unified bundle from backend api
    if (global.CubikBackendAPI && typeof global.CubikBackendAPI.getProjectData === 'function') {
      return global.CubikBackendAPI.getProjectData({
        name: 'Cubik Project',
        includeGLB: false,
        includeThumbnail: true,
        thumbnailWidth: c.thumbnailWidth,
        thumbnailHeight: c.thumbnailHeight,
        thumbnailFormat: c.thumbnailFormat
      }).then(function (bundle) {
        if (bundle && bundle.thumbnailBlob) return bundle.thumbnailBlob;
        if (bundle && bundle.thumbnail) {
          // convert dataURL -> blob (fallback)
          return fetch(bundle.thumbnail).then(function (r) { return r.blob(); });
        }
        throw new Error('No thumbnailBlob in bundle');
      });
    }
    // Fallback to CubikThumbnail module
    if (global.CubikThumbnail && typeof global.CubikThumbnail.captureAsBlob === 'function') {
      return global.CubikThumbnail.captureAsBlob({
        width: c.thumbnailWidth,
        height: c.thumbnailHeight,
        format: c.thumbnailFormat
      });
    }
    throw new Error('Thumbnail generator not found (thumbnail.js must be loaded).');
  }

  function postToShop(items, blob, modelCode) {
    var c = cfg();
    var fd = new FormData();
    fd.append('items', JSON.stringify(items));
    
    // Добавляем model_code (JSON snapshot проекта) для возможности последующего открытия проекта
    if (modelCode) {
      fd.append('model_code', modelCode);
    }

    var pc = global.CubikPartnerConfig;
    if (pc && pc.partnerId) {
      fd.append('partner', pc.partnerId);
    }
    if (pc && pc.currency) {
      fd.append('currency', pc.currency);
    }
    
    var fileName = 'project-preview.png';
    try {
      // try to infer extension from mime
      var mime = blob && blob.type ? String(blob.type) : '';
      if (mime.indexOf('webp') !== -1) fileName = 'project-preview.webp';
      else if (mime.indexOf('jpeg') !== -1 || mime.indexOf('jpg') !== -1) fileName = 'project-preview.jpg';
    } catch (_) {}

    var file;
    try {
      file = new File([blob], fileName, { type: blob.type || 'image/png' });
    } catch (_) {
      // older browsers
      file = blob;
    }
    fd.append('file', file);

    return fetch(c.apiUrl, {
      method: 'POST',
      credentials: c.credentials,
      headers: { 'Accept': 'application/json' },
      body: fd
    }).then(function (r) {
      // Handle 401 (Unauthorized) specifically
      if (r.status === 401) {
        return { success: false, message: 'Authentication required. Please sign in to save your project.', data: [] };
      }
      
      // Try to parse JSON response
      return r.json().then(function (data) {
        // If HTTP error but valid JSON, return the data (will be handled by caller)
        return data;
      }).catch(function () {
        // JSON parse failed - return error object based on HTTP status
        if (!r.ok) {
          var errorMsg = 'HTTP ' + r.status + ': ' + r.statusText;
          if (r.status === 401) {
            errorMsg = 'Authentication required. Please sign in to save your project.';
          }
          return { success: false, message: errorMsg, data: [] };
        }
        return { success: false, message: 'Invalid server response', data: [] };
      });
    });
  }

  function showUserMessage(text, ok) {
    // For errors, show a modal dialog (more visible than status bar)
    if (!ok) {
      showErrorModal(text);
      return;
    }
    // For success, use status bar
    try {
      if (typeof global.msg === 'function') return global.msg(text, true);
    } catch (_) {}
  }

  // Check if error message indicates authentication is required
  function isAuthError(text) {
    if (!text) return false;
    var lower = String(text).toLowerCase();
    // Check for common auth-related keywords in different languages
    return (
      lower.indexOf('auth') !== -1 ||
      lower.indexOf('login') !== -1 ||
      lower.indexOf('sign in') !== -1 ||
      lower.indexOf('sign-in') !== -1 ||
      lower.indexOf('авториз') !== -1 ||
      lower.indexOf('войти') !== -1 ||
      lower.indexOf('войдите') !== -1 ||
      lower.indexOf('unauthorized') !== -1 ||
      lower.indexOf('401') !== -1 ||
      lower.indexOf('anmeld') !== -1 ||       // German
      lower.indexOf('connexion') !== -1 ||    // French
      lower.indexOf('inloggen') !== -1        // Dutch
    );
  }

  function showErrorModal(text) {
    // Remove existing modal if any
    var existing = document.getElementById('cubik-error-modal');
    if (existing) existing.parentNode.removeChild(existing);

    var isAuth = isAuthError(text);

    var modal = document.createElement('div');
    modal.id = 'cubik-error-modal';
    modal.style.cssText = 
      'position:fixed;top:0;left:0;right:0;bottom:0;' +
      'background:rgba(0,0,0,0.7);z-index:99999;' +
      'display:flex;align-items:center;justify-content:center;';

    var box = document.createElement('div');
    box.style.cssText = 
      'background:#2a2a2a;color:#fff;padding:30px 40px;border-radius:14px;' +
      'max-width:400px;text-align:center;font-family:sans-serif;' +
      '';

    var icon = document.createElement('div');
    icon.textContent = isAuth ? '🔐' : '⚠️';
    icon.style.cssText = 'font-size:48px;margin-bottom:15px;';

    var msg = document.createElement('div');
    msg.textContent = text;
    msg.style.cssText = 'font-size:16px;margin-bottom:20px;line-height:1.5;';

    // Button container for multiple buttons
    var btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display:flex;gap:12px;justify-content:center;flex-wrap:wrap;';

    // Sign In button (only for auth errors) — фирменный зелёный #0B8C5D
    if (isAuth) {
      var signInBtn = document.createElement('button');
      signInBtn.textContent = tt('shop.signIn', 'Sign In');
      signInBtn.style.cssText = 
        'background:#0B8C5D;color:#fff;border:none;padding:12px 30px;' +
        'border-radius:10px;font-size:16px;cursor:pointer;' +
        'transition:background 0.2s;';
      signInBtn.onmouseover = function() { signInBtn.style.background = 'rgba(11,140,93,0.9)'; };
      signInBtn.onmouseout = function() { signInBtn.style.background = '#0B8C5D'; };
      signInBtn.onclick = function() {
        // Open sign-in page in new window/tab
        global.open('https://cubik.one/sign-in/', '_blank');
      };
      btnContainer.appendChild(signInBtn);
    }

    var btn = document.createElement('button');
    btn.textContent = isAuth ? tt('shop.close', 'Close') : 'OK';
    btn.style.cssText = 
      'background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.6);padding:12px 40px;' +
      'border-radius:6px;font-size:16px;cursor:pointer;' +
      'transition:background 0.2s,border-color 0.2s;';
    btn.onmouseover = function() { btn.style.background = 'rgba(255,255,255,0.12)'; btn.style.borderColor = 'rgba(255,255,255,0.9)'; };
    btn.onmouseout = function() { btn.style.background = 'transparent'; btn.style.borderColor = 'rgba(255,255,255,0.6)'; };
    btn.onclick = function() {
      modal.parentNode.removeChild(modal);
    };
    btnContainer.appendChild(btn);

    box.appendChild(icon);
    box.appendChild(msg);
    box.appendChild(btnContainer);
    modal.appendChild(box);
    document.body.appendChild(modal);

    // Close on backdrop click
    modal.onclick = function(e) {
      if (e.target === modal) modal.parentNode.removeChild(modal);
    };
  }

  // ==========================================================================
  // Preloader overlay
  // ==========================================================================
  var preloaderEl = null;

  // Get translation helper (fallback if i18n not loaded)
  function tt(key, fallback) {
    if (global.CubikI18N && typeof global.CubikI18N.t === 'function') {
      return global.CubikI18N.t(key, fallback);
    }
    return fallback;
  }

  function showPreloader() {
    if (preloaderEl) return;
    
    var sendingText = tt('shop.sending', 'Sending to your personal account...');
    var pleaseWaitText = tt('shop.pleaseWait', 'Please wait, this may take a few seconds');
    
    preloaderEl = document.createElement('div');
    preloaderEl.id = 'cubik-shop-preloader';
    preloaderEl.innerHTML = 
      '<div class="cubik-preloader-content">' +
        '<div class="cubik-preloader-cube">' +
          '<div class="cubik-cube-face cubik-cube-front"></div>' +
          '<div class="cubik-cube-face cubik-cube-back"></div>' +
          '<div class="cubik-cube-face cubik-cube-right"></div>' +
          '<div class="cubik-cube-face cubik-cube-left"></div>' +
          '<div class="cubik-cube-face cubik-cube-top"></div>' +
          '<div class="cubik-cube-face cubik-cube-bottom"></div>' +
        '</div>' +
        '<div class="cubik-preloader-text">' + sendingText + '</div>' +
        '<div class="cubik-preloader-subtext">' + pleaseWaitText + '</div>' +
        '<div class="cubik-preloader-dots"><span>.</span><span>.</span><span>.</span></div>' +
      '</div>';
    
    // Inline styles for the overlay
    preloaderEl.style.cssText = 
      'position:fixed;top:0;left:0;right:0;bottom:0;' +
      'background:rgba(0,0,0,0.85);z-index:99999;' +
      'display:flex;align-items:center;justify-content:center;' +
      'backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);';
    
    var content = preloaderEl.firstChild;
    content.style.cssText = 'text-align:center;color:#fff;';
    
    var cube = content.children[0];
    cube.style.cssText = 
      'width:60px;height:60px;margin:0 auto 25px;' +
      'position:relative;transform-style:preserve-3d;' +
      'animation:cubik-rotate 2s ease-in-out infinite;';
    
    // Style cube faces
    var faces = cube.children;
    var faceBaseStyle = 
      'position:absolute;width:60px;height:60px;' +
      'border:2px solid rgba(255,255,255,0.3);' +
      'background:linear-gradient(135deg,rgba(74,144,226,0.6) 0%,rgba(46,204,113,0.6) 100%);' +
      '';
    
    faces[0].style.cssText = faceBaseStyle + 'transform:translateZ(30px);'; // front
    faces[1].style.cssText = faceBaseStyle + 'transform:rotateY(180deg) translateZ(30px);'; // back
    faces[2].style.cssText = faceBaseStyle + 'transform:rotateY(90deg) translateZ(30px);'; // right
    faces[3].style.cssText = faceBaseStyle + 'transform:rotateY(-90deg) translateZ(30px);'; // left
    faces[4].style.cssText = faceBaseStyle + 'transform:rotateX(90deg) translateZ(30px);'; // top
    faces[5].style.cssText = faceBaseStyle + 'transform:rotateX(-90deg) translateZ(30px);'; // bottom
    
    var text = content.children[1];
    text.style.cssText = 'font-size:22px;font-family:sans-serif;font-weight:600;margin-bottom:8px;';
    
    var subtext = content.children[2];
    subtext.style.cssText = 'font-size:14px;font-family:sans-serif;color:rgba(255,255,255,0.6);margin-bottom:15px;';
    
    var dots = content.children[3];
    dots.style.cssText = 'font-size:28px;letter-spacing:4px;';
    var dotSpans = dots.children;
    dotSpans[0].style.cssText = 'animation:cubik-blink 1.4s infinite 0s;opacity:0;';
    dotSpans[1].style.cssText = 'animation:cubik-blink 1.4s infinite 0.2s;opacity:0;';
    dotSpans[2].style.cssText = 'animation:cubik-blink 1.4s infinite 0.4s;opacity:0;';
    
    // Add keyframes for animations
    if (!document.getElementById('cubik-preloader-style')) {
      var style = document.createElement('style');
      style.id = 'cubik-preloader-style';
      style.textContent =
        '@keyframes cubik-rotate{' +
          '0%{transform:rotateX(-20deg) rotateY(0deg);}' +
          '50%{transform:rotateX(-20deg) rotateY(180deg);}' +
          '100%{transform:rotateX(-20deg) rotateY(360deg);}' +
        '}' +
        '@keyframes cubik-blink{' +
          '0%,20%{opacity:0;}' +
          '40%,100%{opacity:1;}' +
        '}' +
        '#cubik-shop-preloader .cubik-preloader-content{max-width:90vw;max-height:90vh;}' +
        '@media (max-width:768px),(max-height:600px){' +
          '#cubik-shop-preloader .cubik-preloader-content{transform:scale(0.78);transform-origin:center center;}' +
        '}' +
        '@media (max-width:400px),(max-height:500px){' +
          '#cubik-shop-preloader .cubik-preloader-content{transform:scale(0.62);transform-origin:center center;}' +
        '}';
      document.head.appendChild(style);
    }
    
    document.body.appendChild(preloaderEl);
    log('[CubikShop] Preloader shown');
  }

  function hidePreloader() {
    if (preloaderEl && preloaderEl.parentNode) {
      preloaderEl.parentNode.removeChild(preloaderEl);
      preloaderEl = null;
      log('[CubikShop] Preloader hidden');
    }
  }

  function dumpMissingMap(missing) {
    var obj = {};
    for (var i = 0; i < missing.length; i++) obj[missing[i].key] = null;
    return obj;
  }

  function cubikBuildOrderItems() {
    var facetMap = getFacetMap();
    var res = buildOrderItemsFromFacetMap(facetMap);
    return {
      facetMap: deepClone(facetMap),
      items: res.items,
      missing: res.missing
    };
  }

  var inFlight = false;

  /**
   * @param {Object} [options] - usePreloader
   */
  function cubikSendToShop(options) {
    if (inFlight) {
      warn('[CubikShop] Submission already in progress');
      return Promise.reject(new Error('Submission already in progress'));
    }
    inFlight = true;

    var opt = options || {};
    var usePreloader = opt.usePreloader !== false; // default true

    // Show preloader
    if (usePreloader) {
      showPreloader();
    }

    // Small delay to let browser render preloader before heavy operations
    return new Promise(function(resolve) {
      requestAnimationFrame(function() {
        setTimeout(resolve, 50);
      });
    })
      .then(function () { return cubikLoadShopMap(); })
      .then(function () {
        var built = cubikBuildOrderItems();
        if (built.missing && built.missing.length) {
          var missingObj = dumpMissingMap(built.missing);
          warn('[CubikShop] Missing shop mapping for:', built.missing);
          showUserMessage(tt('shop.errorMissing', 'Cannot send to shop: product ID not found for some facets. See console.'), false);
          global.CUBIK_SHOP_MAP_MISSING = missingObj;
          throw new Error('Missing shop mapping');
        }
        
        // Получаем JSON snapshot проекта для model_code
        var modelCode = null;
        try {
          if (typeof global.snapshotScene === 'function') {
            var snapshot = global.snapshotScene();
            if (snapshot && Array.isArray(snapshot)) {
              // Создаем полный payload с customKinds если нужно
              var payload = {
                name: 'Cubik Project',
                version: '1.2',
                timestamp: Date.now(),
                snapshot: snapshot
              };
              
              // Добавляем customKinds если они есть
              if (global.CubikIO && typeof global.CubikIO.serializeCustomKinds === 'function') {
                var customKinds = global.CubikIO.serializeCustomKinds(snapshot);
                if (customKinds) {
                  payload.customKinds = customKinds;
                }
              }
              
              modelCode = JSON.stringify(payload);
              log('[CubikShop] Generated model_code, size:', (modelCode.length / 1024).toFixed(1), 'KB');
            }
          }
        } catch (e) {
          warn('[CubikShop] Failed to generate model_code:', e);
        }
        
        return Promise.all([built.items, getThumbnailBlob(), Promise.resolve(modelCode)]);
      })
      .then(function (arr) {
        var items = arr[0];
        var blob = arr[1];
        var modelCode = arr[2];
        return postToShop(items, blob, modelCode);
      })
      .then(function (resp) {
        inFlight = false;
        hidePreloader();
        // Полный ответ API при добавлении проекта — смотреть в консоли после нажатия Continue
        try { console.log('[CubikShop] Ответ add-new-resource-api:', resp); } catch (_) {}
        
        // Успех: success !== false (может быть true или отсутствовать)
        if (!resp || (resp.success !== undefined && resp.success === false)) {
          var msgText = (resp && resp.message) ? resp.message : tt('shop.error', 'Shop API error');
          showUserMessage(msgText, false);
          throw new Error(msgText);
        }
        
        // URL для перехода: поддерживаем разные форматы ответа (data.url, url, data.editUrl, editUrl)
        var url = (resp.data && resp.data.url) ? resp.data.url : (resp.url || (resp.data && resp.data.editUrl) || resp.editUrl) || null;
        if (!url && resp) log('[CubikShop] No URL in response. Expected: { success: true, data: { url: "https://cubik.one/3dbuilder/?project_id=..." } }. Got:', JSON.stringify(resp).slice(0, 200));
        if (url) {
          var pc2 = global.CubikPartnerConfig;
          if (pc2 && pc2.partnerId) {
            var sep = url.indexOf('?') !== -1 ? '&' : '?';
            url += sep + 'partner=' + encodeURIComponent(pc2.partnerId);
          }
          var mode = cfg().redirectMode || 'same-tab';
          if (mode === 'new-tab') {
            var w = global.open(url, '_blank');
            if (w && !w.closed) {
              log('[CubikShop] Success! Opened in new tab:', url);
            } else {
              global.location.href = url;
              log('[CubikShop] Success! Popup blocked, redirecting in same tab:', url);
            }
          } else {
            global.location.href = url;
            log('[CubikShop] Success! Redirecting in same tab:', url);
          }
          showUserMessage(tt('shop.sent', 'Sent to shop'), true);
        } else {
          showUserMessage(tt('shop.sentNoUrl', 'Sent to shop (but no URL received)'), true);
        }
        return resp;
      })
      .catch(function (e) {
        inFlight = false;
        hidePreloader();
        // Show error to user if not already shown
        if (e && e.message && e.message.indexOf('Missing shop mapping') === -1) {
          showUserMessage(e.message || tt('shop.error', 'Shop API error'), false);
        }
        warn('[CubikShop] Error:', e);
      });
  }

  function bindSaveButton() {
    var c = cfg();
    if (!c.bindToSaveButton) return;

    function attach() {
      var btn = document.getElementById(c.saveButtonId);
      if (!btn) return false;

      // bubble listener registered after ui/io.js should run after their handlers
      btn.addEventListener('click', function () {
        cubikSendToShop().catch(function (e) {
          warn('[CubikShop] Send failed:', e);
        });
      }, false);

      log('[CubikShop] Bound to Save button #' + c.saveButtonId);
      return true;
    }

    if (!attach()) {
      // try again when DOM is ready
      document.addEventListener('DOMContentLoaded', function () { attach(); });
    }
  }

  // Expose API
  global.cubikLoadShopMap = cubikLoadShopMap;
  global.cubikBuildOrderItems = cubikBuildOrderItems;
  global.cubikSendToShop = cubikSendToShop;
  global.cubikDumpMissingShopMap = function (missing) {
    var obj = dumpMissingMap(missing || []);
    log('[CubikShop] Missing map skeleton:', obj);
    return obj;
  };

  // Init
  try {
    bindSaveButton();
    log('[CubikShop] Adapter loaded (on Save trigger)');
  } catch (e) {
    warn('[CubikShop] Adapter init failed:', e);
  }

})(window);
