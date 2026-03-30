/**
 * Cubik AI Generator — integrated panel for 3D Builder
 * Sends prompts to backend API and adds generated blocks to the scene.
 */
(function () {
  'use strict';

  var API_URL = 'https://cubikai.amiscon.com/api/generate.php';
  var currentMode = 'fast';
  var isGenerating = false;

  function t(key, fallback) {
    return (window.CubikI18N && typeof window.CubikI18N.t === 'function')
      ? window.CubikI18N.t(key, fallback)
      : (fallback || key);
  }
  var recognition = null;
  var isRecording = false;
  var loadingTimerInterval = null;
  var loadingStartTime = null;

  // =========================================================================
  // Inject CSS
  // =========================================================================
  var style = document.createElement('style');
  style.textContent = [
    '#aiPanel{position:fixed;bottom:16px;left:16px;width:340px;max-height:520px;',
    'background:rgba(0,0,0,0.96);border:1px solid rgba(255,255,255,0.14);',
    'border-radius:18px;',
    'z-index:500;display:flex;flex-direction:column;overflow:hidden;',
    'transition:transform .25s ease,opacity .25s ease;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}',

    '#aiPanel.ai-collapsed{transform:scale(0);opacity:0;pointer-events:none;transform-origin:bottom left;}',
    '#aiPanel:not(.ai-collapsed){transform-origin:bottom left;}',

    '#aiToggleFloat{position:fixed;bottom:20px;left:0;min-width:168px;width:auto;height:auto;',
    'padding:12px 23px 12px 16px;border-radius:0 999px 999px 0;border:none;box-shadow:none;cursor:pointer;z-index:501;',
    'background:#000000;color:#FFFFFF;font-size:15px;font-weight:500;',
    'display:inline-flex;align-items:center;justify-content:center;gap:8px;',
    'font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;',
    'transition:transform .2s ease;-webkit-tap-highlight-color:transparent;}',
    '#aiToggleFloat:hover{transform:scale(1.02);color:#FFFFFF;}',
    '#aiToggleFloat.ai-active{display:none;}',
    '#hudBar #aiToggleFloat{position:static;bottom:auto;left:auto;right:auto;flex:1;height:auto;min-width:168px;',
    'display:inline-flex;align-items:center;justify-content:center;gap:10px;',
    'padding:12px 23px 12px 16px;border-radius:0 999px 999px 0;border:none;box-shadow:none;',
    'background:#000000;color:#FFFFFF;font-size:15px;font-weight:500;line-height:1;letter-spacing:0;',
    'font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;',
    '-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;',
    'flex-shrink:0;margin:0;align-self:center;-webkit-tap-highlight-color:transparent;}',
    '#hudBar #aiToggleFloat .ai-editor-label{margin:0;padding:0;white-space:nowrap;}',
    '#hudBar #aiToggleFloat:hover{transform:none;box-shadow:none;background:rgba(255,255,255,0.12);}',
    '#hudBar #aiToggleFloat svg{width:21px;height:21px;flex-shrink:0;stroke:currentColor;fill:none;}',
    '#aiToggleFloat svg{stroke:currentColor;width:21px;height:21px;flex-shrink:0;}',
    '#aiToggleFloat .ai-editor-label{margin:0;padding:0;white-space:nowrap;}',

    '.ai-header{display:flex;align-items:center;justify-content:space-between;',
    'padding:14px 16px 10px;border-bottom:1px solid rgba(255,255,255,0.1);}',
    '.ai-header-left{display:flex;flex-direction:column;gap:2px;}',
    '.ai-header-title{color:#FFFFFF;font-size:15px;font-weight:600;}',
    '.ai-header-sub{color:rgba(255,255,255,0.6);font-size:11px;}',
    '.ai-close{width:28px;height:28px;border:none;border-radius:50%;cursor:pointer;',
    'background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);font-size:16px;',
    'display:flex;align-items:center;justify-content:center;transition:all .15s;}',
    '.ai-close:hover{background:rgba(255,255,255,0.16);color:#fff;}',

    '.ai-modes{display:flex;gap:4px;padding:8px 16px;',
    'border-bottom:1px solid rgba(255,255,255,0.06);}',
    '.ai-mode-btn{flex:1;padding:7px 0;border:none;border-radius:10px;cursor:pointer;',
    'font-size:12px;font-weight:500;background:transparent;color:rgba(255,255,255,0.6);transition:all .2s;}',
    '.ai-mode-btn:hover{color:#FFFFFF;}',
    '.ai-mode-btn:focus-visible{outline:none;box-shadow:0 0 0 2px rgba(11,140,93,0.5);}',
    '.ai-mode-btn.active{background:rgba(11,140,93,0.2);color:#0B8C5D;}',
    '.ai-mode-btn.active[data-mode="creative"]{background:rgba(155,89,182,0.2);color:#bb86fc;}',

    '.ai-add-toggle{display:flex;align-items:center;gap:6px;padding:6px 16px;',
    'border-bottom:1px solid rgba(255,255,255,0.06);cursor:pointer;user-select:none;}',
    '.ai-add-toggle input{accent-color:#0B8C5D;width:14px;height:14px;cursor:pointer;}',
    '.ai-add-toggle label{color:rgba(255,255,255,0.6);font-size:11px;cursor:pointer;}',

    '.ai-chat{flex:1;overflow-y:auto;padding:12px 16px;min-height:120px;max-height:280px;',
    'scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.12) transparent;}',
    '.ai-chat::-webkit-scrollbar{width:4px;}',
    '.ai-chat::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:2px;}',

    '.ai-welcome{text-align:center;padding:20px 10px;}',
    '.ai-welcome-icon{width:50px;height:50px;margin:0 auto 12px;',
    'background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:50%;',
    'display:flex;align-items:center;justify-content:center;font-size:24px;}',
    '.ai-welcome h4{color:#FFFFFF;font-size:14px;font-weight:600;margin:0 0 4px;}',
    '.ai-welcome p{color:rgba(255,255,255,0.6);font-size:12px;line-height:1.4;margin:0;}',
    '.ai-blocks-badge{display:inline-flex;align-items:center;gap:6px;',
    'padding:5px 12px;margin-top:10px;background:rgba(255,255,255,0.06);',
    'border-radius:14px;}',
    '.ai-blocks-badge .cnt{color:#0B8C5D;font-weight:700;font-size:15px;}',
    '.ai-blocks-badge .lbl{color:rgba(255,255,255,0.6);font-size:11px;}',

    '.ai-msg{margin-bottom:10px;display:flex;flex-direction:column;}',
    '.ai-msg.user{align-items:flex-end;}',
    '.ai-msg.assistant{align-items:flex-start;}',
    '.ai-msg-bubble{max-width:85%;padding:8px 12px;border-radius:14px;font-size:13px;line-height:1.4;white-space:pre-line;}',
    '.ai-msg.user .ai-msg-bubble{background:#0B8C5D;color:#fff;border-bottom-right-radius:4px;}',
    '.ai-msg.assistant .ai-msg-bubble{background:rgba(255,255,255,0.08);color:#FFFFFF;border-bottom-left-radius:4px;}',
    '.ai-msg-time{font-size:10px;color:rgba(255,255,255,0.5);margin-top:2px;padding:0 4px;}',

    '.ai-loading{display:flex;align-items:center;gap:10px;padding:8px 0;}',
    '.ai-loading-dots{display:flex;gap:4px;}',
    '.ai-loading-dots span{width:6px;height:6px;background:#0B8C5D;border-radius:50%;',
    'animation:aiDotBounce 1.4s ease-in-out infinite;}',
    '.ai-loading-dots span:nth-child(2){animation-delay:.2s;}',
    '.ai-loading-dots span:nth-child(3){animation-delay:.4s;}',
    '@keyframes aiDotBounce{0%,80%,100%{transform:scale(0.6);opacity:0.4;}40%{transform:scale(1);opacity:1;}}',
    '.ai-loading-text{color:rgba(255,255,255,0.6);font-size:12px;}',
    '.ai-loading-time{color:rgba(255,255,255,0.5);font-size:10px;margin-left:auto;}',

    '.ai-input{display:flex;gap:8px;padding:10px 12px;',
    'border-top:1px solid rgba(255,255,255,0.1);align-items:center;}',
    '.ai-input textarea{flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);',
    'border-radius:18px;padding:9px 14px;color:#FFFFFF;font-size:16px;line-height:22px;font-family:inherit;',
    'resize:none;outline:none;min-height:38px;max-height:80px;transition:border-color .2s;}',
    '.ai-input textarea::placeholder{color:rgba(255,255,255,0.5);}',
    '.ai-input textarea:focus{border-color:#0B8C5D;outline:none;box-shadow:0 0 0 2px rgba(11,140,93,0.5);}',

    '.ai-send,.ai-mic{width:38px;height:38px;border:none;border-radius:50%;cursor:pointer;',
    'display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;}',
    '.ai-send{background:#0B8C5D;color:#fff;}',
    '.ai-send:hover{background:rgba(11,140,93,0.9);}',
    '.ai-send:focus{outline:none;box-shadow:0 0 0 2px rgba(11,140,93,0.6);}',
    '.ai-send:active{transform:scale(0.93);}',
    '.ai-send svg,.ai-mic svg{width:18px;height:18px;fill:#fff;}',
    '.ai-mic{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);}',
    '.ai-mic:hover{background:rgba(255,255,255,0.14);}',
    '.ai-mic.recording{background:#ef4444;animation:aiPulseRed 1.5s infinite;}',
    '.ai-mic.recording svg{fill:#fff;}',
    '@keyframes aiPulseRed{0%,100%{opacity:1;}50%{opacity:0.85;}}',

    '.ai-thinking-bar{padding:4px 16px 6px;border-bottom:1px solid rgba(255,255,255,0.06);display:none;}',
    '.ai-thinking-bar.visible{display:block;}',
    '.ai-thinking-text{color:rgba(255,255,255,0.5);font-size:10px;line-height:1.3;max-height:40px;overflow-y:auto;}',

    '@media (max-width:480px){',
    '  #aiToggleFloat{bottom:12px;left:0;min-width:115px;padding:11px 18px;font-size:14px;}',
    '}',
    'body.touch-mode #hudBar #aiToggleFloat{padding:12px 23px 12px 16px;align-self:center;}',
    '.hud-bar.has-ai-editor{left:0 !important;padding-left:0 !important;border-radius:0 999px 999px 0 !important;}',

    '@media (max-width:767px){',
    '  #aiPanel{position:fixed!important;inset:0!important;left:0!important;right:0!important;top:0!important;bottom:0!important;',
    '  width:100%!important;max-width:100%!important;height:100%!important;max-height:100vh!important;',
    '  max-height:100dvh!important;border-radius:0!important;padding-top:env(safe-area-inset-top);',
    '  padding-bottom:env(safe-area-inset-bottom);display:flex!important;flex-direction:column!important;}',
    '  #aiPanel.ai-collapsed{transform:scale(0);opacity:0;}',
    '  #aiPanel .ai-chat{flex:1!important;min-height:0!important;overflow-y:auto!important;max-height:none!important;-webkit-overflow-scrolling:touch;}',
    '  #aiPanel .ai-input{flex-shrink:0;padding-bottom:calc(10px + env(safe-area-inset-bottom));}',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  // =========================================================================
  // Inject HTML
  // =========================================================================
  function injectHTML() {
    var toggleBtn = document.createElement('button');
    toggleBtn.id = 'aiToggleFloat';
    toggleBtn.title = t('ai.title', 'AI Constructor');
    toggleBtn.setAttribute('type', 'button');
    toggleBtn.className = 'ai-toggle-btn';
    toggleBtn.setAttribute('data-i18n-attr', 'title');
    toggleBtn.setAttribute('data-i18n-key', 'ai.title');
    var isMobile = (window.CubikMobile && typeof window.CubikMobile.isTouchMode === 'function' && window.CubikMobile.isTouchMode()) || window.innerWidth <= 768;
    var chatIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="10" y1="12" x2="14" y2="12"/></svg>';
    toggleBtn.innerHTML = chatIcon + '<span class="ai-editor-label" data-i18n-key="ai.editor">' + t('ai.editor', 'AI Editor') + '</span>';
    if (isMobile) {
      var panelLeftSlide = document.getElementById('panelLeftSlide');
      var rowHelp = panelLeftSlide && panelLeftSlide.querySelector('.row.row-help');
      if (panelLeftSlide && rowHelp) {
        var footerDivider = document.createElement('div');
        footerDivider.className = 'footer-divider';
        footerDivider.setAttribute('aria-hidden', 'true');
        var rowAi = document.createElement('div');
        rowAi.className = 'row row-ai-editor';
        rowAi.appendChild(toggleBtn);
        panelLeftSlide.insertBefore(footerDivider, rowHelp.nextSibling);
        panelLeftSlide.insertBefore(rowAi, footerDivider.nextSibling);
      } else {
        document.body.appendChild(toggleBtn);
      }
    } else {
      document.body.appendChild(toggleBtn);
    }

    var panel = document.createElement('div');
    panel.id = 'aiPanel';
    panel.className = 'ai-collapsed';
    panel.innerHTML = [
      '<div class="ai-header">',
      '  <div class="ai-header-left">',
      '    <div class="ai-header-title" data-i18n-key="ai.title">' + t('ai.title', 'AI Constructor') + '</div>',
      '    <div class="ai-header-sub" id="aiStatus">' + t('ai.ready', 'Ready') + '</div>',
      '  </div>',
      '  <button class="ai-close" id="aiCloseBtn" title="' + t('help.close', 'Close') + '" data-i18n-attr="title" data-i18n-key="help.close">✕</button>',
      '</div>',
      '<div class="ai-modes">',
      '  <button class="ai-mode-btn active" data-mode="fast" id="aiModeFast">⚡ <span data-i18n-key="ai.mode.fast">' + t('ai.mode.fast', 'Fast') + '</span></button>',
      '  <button class="ai-mode-btn" data-mode="creative" id="aiModeCreative">✨ <span data-i18n-key="ai.mode.creative">' + t('ai.mode.creative', 'Creative') + '</span></button>',
      '</div>',
      '<div class="ai-add-toggle">',
      '  <input type="checkbox" id="aiAddMode"/>',
      '  <label for="aiAddMode" data-i18n-key="ai.addMode">' + t('ai.addMode', 'Add to scene (otherwise — replace)') + '</label>',
      '</div>',
      '<div class="ai-thinking-bar" id="aiThinkingBar">',
      '  <div class="ai-thinking-text" id="aiThinkingText"></div>',
      '</div>',
      '<div class="ai-chat" id="aiChat">',
      '  <div class="ai-welcome" id="aiWelcome">',
      '    <div class="ai-welcome-icon">🎨</div>',
      '    <h4 data-i18n-key="ai.welcomeTitle">' + t('ai.welcomeTitle', 'Cubik AI') + '</h4>',
      '    <p data-i18n-key="ai.welcomeDesc">' + t('ai.welcomeDesc', 'Describe what to build, e.g. "Green house with red roof" or "Robot"') + '</p>',
      '    <div class="ai-blocks-badge">',
      '      <span class="cnt" id="aiBlockCount">0</span>',
      '      <span class="lbl" data-i18n-key="ai.blocks">' + t('ai.blocks', 'blocks') + '</span>',
      '    </div>',
      '  </div>',
      '</div>',
      '<div class="ai-input">',
      '  <textarea id="aiInput" placeholder="' + t('ai.placeholder', 'What should I build?...') + '" rows="1" data-i18n-placeholder="ai.placeholder"></textarea>',
      '  <button class="ai-send" id="aiSendBtn" title="' + t('ai.send', 'Send') + '" data-i18n-attr="title" data-i18n-key="ai.send">',
      '    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
      '  </button>',
      '  <button class="ai-mic" id="aiMicBtn" title="' + t('ai.voiceInput', 'Voice input') + '" data-i18n-attr="title" data-i18n-key="ai.voiceInput">',
      '    <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>',
      '  </button>',
      '</div>'
    ].join('\n');
    document.body.appendChild(panel);
  }

  // =========================================================================
  // DOM helpers
  // =========================================================================
  var els = {};

  function cacheEls() {
    els.panel = document.getElementById('aiPanel');
    els.toggle = document.getElementById('aiToggleFloat');
    els.close = document.getElementById('aiCloseBtn');
    els.chat = document.getElementById('aiChat');
    els.input = document.getElementById('aiInput');
    els.send = document.getElementById('aiSendBtn');
    els.mic = document.getElementById('aiMicBtn');
    els.modeFast = document.getElementById('aiModeFast');
    els.modeCreative = document.getElementById('aiModeCreative');
    els.status = document.getElementById('aiStatus');
    els.blockCount = document.getElementById('aiBlockCount');
    els.addMode = document.getElementById('aiAddMode');
    els.thinkingBar = document.getElementById('aiThinkingBar');
    els.thinkingText = document.getElementById('aiThinkingText');
  }

  // =========================================================================
  // Panel toggle
  // =========================================================================
  var panelOpen = false;
  var lastStatusKey = 'ai.ready';
  var lastStatusParam = null;

  function togglePanel() {
    panelOpen = !panelOpen;
    els.panel.classList.toggle('ai-collapsed', !panelOpen);
    els.toggle.classList.toggle('ai-active', panelOpen);
    if (panelOpen) els.input.focus();
  }

  // =========================================================================
  // Mode switch
  // =========================================================================
  function setMode(mode) {
    currentMode = mode;
    els.modeFast.classList.toggle('active', mode === 'fast');
    els.modeCreative.classList.toggle('active', mode === 'creative');
  }

  // =========================================================================
  // Chat messages
  // =========================================================================
  function scrollChatToBottom() {
    if (!els.chat) return;
    els.chat.scrollTop = els.chat.scrollHeight;
    setTimeout(function () { els.chat.scrollTop = els.chat.scrollHeight; }, 50);
  }

  function addMessage(text, isUser) {
    var msg = document.createElement('div');
    msg.className = 'ai-msg ' + (isUser ? 'user' : 'assistant');

    var bubble = document.createElement('div');
    bubble.className = 'ai-msg-bubble';
    bubble.textContent = text;

    var time = document.createElement('div');
    time.className = 'ai-msg-time';
    time.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    msg.appendChild(bubble);
    msg.appendChild(time);
    els.chat.appendChild(msg);
    scrollChatToBottom();
  }

  var loadingEl = null;

  function showLoading() {
    loadingStartTime = Date.now();
    loadingEl = document.createElement('div');
    loadingEl.className = 'ai-loading';
    loadingEl.innerHTML =
      '<div class="ai-loading-dots"><span></span><span></span><span></span></div>' +
      '<div class="ai-loading-text" data-i18n-key="ai.generating">' + t('ai.generating', 'Generating...') + '</div>' +
      '<div class="ai-loading-time" id="aiLoadTime">0s</div>';
    els.chat.appendChild(loadingEl);
    scrollChatToBottom();

    loadingTimerInterval = setInterval(function () {
      var sec = Math.floor((Date.now() - loadingStartTime) / 1000);
      var el = document.getElementById('aiLoadTime');
      if (el) el.textContent = sec + 's';
    }, 1000);
  }

  function hideLoading() {
    if (loadingEl && loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);
    loadingEl = null;
    if (loadingTimerInterval) { clearInterval(loadingTimerInterval); loadingTimerInterval = null; }
  }

  function updateBlockCount(n) {
    if (els.blockCount) els.blockCount.textContent = String(n);
  }

  function setStatus(text, key, param) {
    if (key) { lastStatusKey = key; lastStatusParam = param; }
    if (els.status) els.status.textContent = text;
  }

  function refreshStatusFromI18n() {
    if (!els.status) return;
    var txt = lastStatusKey === 'ai.blocksCount' && lastStatusParam != null
      ? (t('ai.blocksCount', '{n} blocks')).replace('{n}', lastStatusParam)
      : t(lastStatusKey, lastStatusKey);
    els.status.textContent = txt;
  }

  // =========================================================================
  // AI thinking tooltip
  // =========================================================================
  function showThinking(text) {
    if (text && els.thinkingBar) {
      els.thinkingText.textContent = text;
      els.thinkingBar.classList.add('visible');
    }
  }

  function hideThinking() {
    if (els.thinkingBar) els.thinkingBar.classList.remove('visible');
  }

  // =========================================================================
  // Kind mapping: AI API → 3D Builder
  // =========================================================================
  var KIND_MAP = { 'Zen_2': 'Zen/2', 'Zen/2': 'Zen/2' };

  function mapKind(kind) {
    return KIND_MAP[kind] || kind;
  }

  function mapFaceType(ft) {
    if (ft === 'Zen/2' || ft === 'Zen_2') return 'Zen/2';
    return ft;
  }

  // =========================================================================
  // Compute axis-aligned bounding box of blocks (considering position + scale)
  // =========================================================================
  function getBlocksBounds(blocks) {
    if (!blocks || blocks.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
    }
    var minX = Infinity, maxX = -Infinity;
    var minY = Infinity, maxY = -Infinity;
    var minZ = Infinity, maxZ = -Infinity;
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      var pos = b.position || [0, 0, 0];
      var scl = b.scale || [1, 1, 1];
      var hx = scl[0] / 2, hy = scl[1] / 2, hz = scl[2] / 2;
      var x = pos[0], y = pos[1], z = pos[2];
      minX = Math.min(minX, x - hx); maxX = Math.max(maxX, x + hx);
      minY = Math.min(minY, y - hy); maxY = Math.max(maxY, y + hy);
      minZ = Math.min(minZ, z - hz); maxZ = Math.max(maxZ, z + hz);
    }
    return { minX: minX, maxX: maxX, minY: minY, maxY: maxY, minZ: minZ, maxZ: maxZ };
  }

  /**
   * Returns offset [dx, dy, dz] so that newBlocks don't overlap with existingBlocks.
   * Places new construction to the right (+X) of existing with a gap.
   */
  function findNonOverlappingOffset(existingBlocks, newBlocks) {
    if (!existingBlocks || existingBlocks.length === 0) return [0, 0, 0];
    var existing = getBlocksBounds(existingBlocks);
    var newer = getBlocksBounds(newBlocks);
    var GAP = 1;
    var offsetX = existing.maxX - newer.minX + GAP;
    return [offsetX, 0, 0];
  }

  function applyOffsetToBlocks(blocks, offset) {
    if (!offset || (offset[0] === 0 && offset[1] === 0 && offset[2] === 0)) return blocks;
    var result = [];
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      var copy = {};
      for (var k in b) if (b.hasOwnProperty(k)) copy[k] = b[k];
      var pos = (copy.position || [0, 0, 0]).slice();
      pos[0] += offset[0]; pos[1] += offset[1]; pos[2] += offset[2];
      copy.position = pos;
      result.push(copy);
    }
    return result;
  }

  // =========================================================================
  // Convert AI API blocks to 3D builder snapshot format
  // =========================================================================
  function convertAIBlocks(blocks) {
    var result = [];
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      var kind = mapKind(b.kind || 'Bion');
      var pos = b.position || [0, 0.5, 0];
      var scl = b.scale || [1, 1, 1];
      var rot = b.rotation || [0, 0, 0];

      if (b.type === 'group' && b.faces) {
        var faces = {};
        for (var dir in b.faces) {
          if (!b.faces.hasOwnProperty(dir)) continue;
          var f = b.faces[dir];
          faces[dir] = {
            colorHex: f.colorHex || '#0B8C5D',
            faceType: mapFaceType(f.faceType || 'Zen')
          };
        }
        result.push({
          type: 'group',
          kind: kind,
          position: pos,
          rotation: rot,
          scale: scl,
          faces: faces
        });
      } else {
        result.push({
          type: 'solid',
          kind: kind,
          colorHex: b.colorHex || '#0B8C5D',
          position: pos,
          rotation: rot,
          scale: scl
        });
      }
    }
    return result;
  }

  // =========================================================================
  // API call
  // =========================================================================
  function callAPI(prompt) {
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt, mode: currentMode })
    })
      .then(function (resp) {
        if (!resp.ok) throw new Error('Server error ' + resp.status);
        return resp.json();
      })
      .then(function (data) {
        if (data.error) throw new Error(data.error);
        if (!data.blocks || !Array.isArray(data.blocks)) throw new Error('Invalid response');
        return data;
      });
  }

  // =========================================================================
  // Generate & apply
  // =========================================================================
  function generate(prompt) {
    if (isGenerating) return;
    if (!prompt || !prompt.trim()) return;
    prompt = prompt.trim();

    isGenerating = true;
    addMessage(prompt, true);
    showLoading();
    setStatus(t('ai.generating', 'Generating...'), 'ai.generating');
    hideThinking();

    callAPI(prompt)
      .then(function (data) {
        hideLoading();

        if (data.thinking) showThinking(data.thinking);

        console.group('%c[AI Generator] API Response', 'color: #0ff; font-weight: bold;');
        console.log('Raw blocks from API:', JSON.parse(JSON.stringify(data.blocks)));
        var groupCount = 0, solidCount = 0;
        for (var bi = 0; bi < data.blocks.length; bi++) {
          if (data.blocks[bi].type === 'group' && data.blocks[bi].faces) groupCount++;
          else solidCount++;
        }
        console.log('Solid blocks:', solidCount, '| Group blocks (with faces):', groupCount);
        if (groupCount === 0) console.warn('⚠ API returned 0 group blocks — all cubes will be solid (no per-face types)');
        console.groupEnd();

        var aiBlocks = convertAIBlocks(data.blocks);
        var addToExisting = els.addMode && els.addMode.checked;

        if (addToExisting && typeof window.snapshotScene === 'function') {
          var current = window.snapshotScene();
          var offset = findNonOverlappingOffset(current, aiBlocks);
          var shiftedBlocks = applyOffsetToBlocks(aiBlocks, offset);
          var merged = current.concat(shiftedBlocks);
          window.loadSceneFromSnapshot(merged);
        } else {
          window.loadSceneFromSnapshot(aiBlocks);
        }

        if (typeof window.pushState === 'function') window.pushState();
        if (typeof window.updateCounter === 'function') window.updateCounter();

        updateBlockCount(data.blocks.length);
        var doneMsg = (t('ai.doneBlocks', 'Done! Built {n} blocks')).replace('{n}', data.blocks.length);
        addMessage(doneMsg, false);
        var blocksStatus = (t('ai.blocksCount', '{n} blocks')).replace('{n}', data.blocks.length);
        setStatus(blocksStatus, 'ai.blocksCount', data.blocks.length);
      })
      .catch(function (err) {
        hideLoading();
        console.error('[AI Generator]', err);
        addMessage(t('status.error', 'Error') + ': ' + err.message, false);
        setStatus(t('status.error', 'Error'), 'status.error');
      })
      .then(function () {
        isGenerating = false;
      });
  }

  // =========================================================================
  // Voice input
  // =========================================================================
  function initSpeech() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      if (els.mic) { els.mic.style.opacity = '0.3'; els.mic.style.pointerEvents = 'none'; }
      return;
    }
    recognition = new SR();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = function () {
      isRecording = true;
      els.mic.classList.add('recording');
      setStatus(t('ai.listening', 'Listening...'), 'ai.listening');
    };
    recognition.onresult = function (e) {
      var txt = '';
      for (var i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      els.input.value = txt;
      if (e.results[e.results.length - 1].isFinal) {
        stopRec();
        generate(txt);
        els.input.value = '';
      }
    };
    recognition.onerror = function () { stopRec(); };
    recognition.onend = function () { stopRec(); };
  }

  function stopRec() {
    isRecording = false;
    if (els.mic) els.mic.classList.remove('recording');
    setStatus(t('ai.ready', 'Ready'), 'ai.ready');
  }

  function toggleRec() {
    if (!recognition) return;
    if (isRecording) { recognition.stop(); } else {
      try { recognition.start(); } catch (e) { /* already started */ }
    }
  }

  // =========================================================================
  // Event listeners
  // =========================================================================
  function bindEvents() {
    els.toggle.addEventListener('click', function (e) { e.stopPropagation(); togglePanel(); });
    els.toggle.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    els.toggle.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    els.close.addEventListener('click', togglePanel);

    els.modeFast.addEventListener('click', function () { setMode('fast'); });
    els.modeCreative.addEventListener('click', function () { setMode('creative'); });

    els.send.addEventListener('click', function () {
      var txt = els.input.value.trim();
      if (txt) { generate(txt); els.input.value = ''; els.input.style.height = 'auto'; }
    });

    els.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        var txt = els.input.value.trim();
        if (txt) { generate(txt); els.input.value = ''; els.input.style.height = 'auto'; }
      }
    });

    els.input.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 80) + 'px';
    });

    els.mic.addEventListener('click', toggleRec);

    var stopProp = function (e) { e.stopPropagation(); };
    els.panel.addEventListener('mousedown', stopProp);
    els.panel.addEventListener('pointerdown', stopProp);
    els.panel.addEventListener('wheel', stopProp);
    els.panel.addEventListener('keydown', stopProp);
    els.panel.addEventListener('keyup', stopProp);
    els.panel.addEventListener('keypress', stopProp);
    els.panel.addEventListener('touchstart', stopProp);
    els.panel.addEventListener('touchmove', stopProp);

    document.addEventListener('i18n:langChanged', function () {
      if (window.CubikI18N && typeof window.CubikI18N.apply === 'function') {
        window.CubikI18N.apply();
        refreshStatusFromI18n();
      }
    });
  }

  // =========================================================================
  // Init
  // =========================================================================
  function init() {
    injectHTML();
    cacheEls();
    bindEvents();
    initSpeech();
    console.log('[AI Generator] Integrated panel ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
