/**
 * Cubik Builder - UI Module
 * @module ui
 * @description User interface components and interactions
 * @author Andrey Bovdurets
 * @version 1.2
 */
(function(global) {
  'use strict';

  // =============================================================================
  // Help Modal & Tutorial Integration
  // =============================================================================

  /**
   * Open help modal (legacy)
   */
  function openHelp() {
    document.body.classList.add('help-open');
  }

  /**
   * Close help modal
   */
  function closeHelp() {
    document.body.classList.remove('help-open');
  }

  /**
   * Toggle help modal
   */
  function toggleHelp() {
    document.body.classList.toggle('help-open');
  }

  /**
   * Check if help is open
   * @returns {boolean}
   */
  function isHelpOpen() {
    return document.body.classList.contains('help-open');
  }

  /**
   * Start interactive tutorial tour
   * @param {boolean} [force=true] - Start even if already completed
   */
  function startTour(force) {
    if (global.CubikTutorial && typeof global.CubikTutorial.start === 'function') {
      global.CubikTutorial.start(force !== false);
    } else {
      // Fallback to legacy help modal if tutorial not available
      console.warn('[UI] Tutorial module not available, opening help modal');
      openHelp();
    }
  }

  /**
   * Handle help button click
   * - Normal click: open help modal (quick start)
   * @param {MouseEvent} e - Click event
   */
  function handleHelpClick(e) {
    // Normal click opens help modal
    openHelp();
  }

  // =============================================================================
  // Navigation
  // =============================================================================

  /**
   * Open side navigation
   */
  function openNav() {
    document.body.classList.add('nav-open');
  }

  /**
   * Close side navigation
   */
  function closeNav() {
    document.body.classList.remove('nav-open');
  }

  /**
   * Toggle side navigation
   */
  function toggleNav() {
    document.body.classList.toggle('nav-open');
  }

  /**
   * Check if navigation is open
   * @returns {boolean}
   */
  function isNavOpen() {
    return document.body.classList.contains('nav-open');
  }

  // =============================================================================
  // Editor Panel
  // =============================================================================

  /**
   * Open editor panel
   */
  function openEditor() {
    document.body.classList.add('editor-open');
  }

  /**
   * Close editor panel
   */
  function closeEditor() {
    document.body.classList.remove('editor-open');
  }

  /**
   * Toggle editor panel
   */
  function toggleEditor() {
    document.body.classList.toggle('editor-open');
  }

  /**
   * Check if editor is open
   * @returns {boolean}
   */
  function isEditorOpen() {
    return document.body.classList.contains('editor-open');
  }

  // =============================================================================
  // Status Messages
  // =============================================================================

  /**
   * Show status message
   * @param {string} text - Message text
   * @param {boolean} [success=true] - Whether this is a success message
   */
  function showStatus(text, success) {
    var statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.style.color = (success !== false) ? 'var(--green)' : 'var(--red)';
    }
  }

  // =============================================================================
  // HUD Updates
  // =============================================================================

  /**
   * Update cubik count display
   * @param {number} count - Number of cubiks
   */
  function updateCubikCount(count) {
    var countEl = document.getElementById('cubikCount');
    if (countEl) {
      countEl.textContent = String(count);
    }
  }

  // =============================================================================
  // Language Switcher
  // =============================================================================

  /**
   * Initialize language switcher
   */
  function initLanguageSwitcher() {
    var switcher = document.getElementById('langSwitcher');
    if (!switcher) return;

    switcher.addEventListener('click', function(e) {
      var btn = e.target.closest('.lang-btn');
      if (btn && btn.dataset.lang && global.CubikI18N) {
        global.CubikI18N.setLang(btn.dataset.lang);
      }
    });
  }

  // =============================================================================
  // Keyboard Shortcuts
  // =============================================================================

  /**
   * Handle global keyboard shortcuts for UI
   * @param {KeyboardEvent} e - Keyboard event
   */
  function handleKeyboard(e) {
    // Block Ctrl+Shift+Z (browser-specific behavior)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      return;
    }

    // Escape closes modals/panels
    if (e.key === 'Escape') {
      if (isHelpOpen()) {
        closeHelp();
      } else if (isNavOpen()) {
        closeNav();
      } else if (isEditorOpen()) {
        closeEditor();
      }
    }
  }

  // =============================================================================
  // Initialization
  // =============================================================================

  /**
   * Initialize all UI components
   * NOTE: Navigation is handled in index.html, so we skip it here
   */
  function init() {
    // Help modal bindings (with guard against double-binding)
    var helpBtn = document.getElementById('helpBtn');
    var helpOverlay = document.getElementById('helpOverlay');
    var helpClose = document.getElementById('helpClose');
    var helpStart = document.getElementById('helpStart');

    // Help button: opens help modal (quick start)
    if (helpBtn && !helpBtn._uiInitialized) {
      helpBtn._uiInitialized = true;
      helpBtn.addEventListener('click', handleHelpClick);
    }
    
    // Tutorial button: starts interactive tutorial
    var tutorialBtn = document.getElementById('tutorialBtn');
    if (tutorialBtn && !tutorialBtn._uiInitialized) {
      tutorialBtn._uiInitialized = true;
      tutorialBtn.addEventListener('click', function() {
        startTour(true);
      });
    }
    if (helpOverlay && !helpOverlay._uiInitialized) {
      helpOverlay._uiInitialized = true;
      helpOverlay.addEventListener('click', closeHelp);
    }
    if (helpClose && !helpClose._uiInitialized) {
      helpClose._uiInitialized = true;
      helpClose.addEventListener('click', closeHelp);
    }
    // Help Start button - just closes the modal
    if (helpStart && !helpStart._uiInitialized) {
      helpStart._uiInitialized = true;
      helpStart.addEventListener('click', function() {
        closeHelp();
      });
    }
    
    // Tutorial button inside help modal - starts interactive tutorial
    var helpTutorialBtn = document.getElementById('helpTutorialBtn');
    if (helpTutorialBtn && !helpTutorialBtn._uiInitialized) {
      helpTutorialBtn._uiInitialized = true;
      helpTutorialBtn.addEventListener('click', function() {
        closeHelp();
        // Start tutorial after help modal closes
        setTimeout(function() {
          startTour(true);
        }, 200);
      });
    }

    // NOTE: Navigation bindings are in index.html - do not duplicate here
    // Language switcher is also in index.html

    // Global keyboard handler (only add once)
    if (!window._uiKeyboardInitialized) {
      window._uiKeyboardInitialized = true;
      window.addEventListener('keydown', handleKeyboard);
    }

    // NOTE: Auto-start is now handled by tutorial.js module
    // First-time visitors will see the interactive tour automatically
  }

  // =============================================================================
  // Auto-Initialize
  // =============================================================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // =============================================================================
  // Public API
  // =============================================================================

  global.CubikUI = {
    // Help & Tutorial
    openHelp: openHelp,
    closeHelp: closeHelp,
    toggleHelp: toggleHelp,
    isHelpOpen: isHelpOpen,
    startTour: startTour,

    // Navigation
    openNav: openNav,
    closeNav: closeNav,
    toggleNav: toggleNav,
    isNavOpen: isNavOpen,

    // Editor
    openEditor: openEditor,
    closeEditor: closeEditor,
    toggleEditor: toggleEditor,
    isEditorOpen: isEditorOpen,

    // Status
    showStatus: showStatus,
    msg: showStatus, // Alias

    // HUD
    updateCubikCount: updateCubikCount,

    // Init
    init: init
  };

  // Backward compatibility
  global.openHelp = openHelp;
  global.closeHelp = closeHelp;
  global.msg = showStatus;
  global.startTour = startTour;

})(window);
