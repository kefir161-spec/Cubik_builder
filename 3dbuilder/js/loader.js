/**
 * Cubik Builder - Loader Module
 * @module loader
 * @description Global loading indicator management
 * @author Andrey Bovdurets
 * @version 1.1
 */
(function(global) {
  'use strict';

  // =============================================================================
  // Configuration
  // =============================================================================

  var LOADER_ID = 'globalLoader';
  var MIN_STARTUP_DURATION = 3000; // Minimum 3 seconds on startup

  // =============================================================================
  // State
  // =============================================================================

  var loaderStartTime = 0;
  var isStartupPhase = false;

  // =============================================================================
  // Private Functions
  // =============================================================================

  /**
   * Get loader element
   * @returns {HTMLElement|null}
   */
  function getLoaderElement() {
    return document.getElementById(LOADER_ID);
  }

  /**
   * Get default loading text from i18n
   * @returns {string}
   */
  function getDefaultText() {
    if (global.CubikI18N && global.CubikI18N.t) {
      return global.CubikI18N.t('loader.loading');
    }
    return 'Loading Cubiks...';
  }

  /**
   * Get current timestamp
   * @returns {number}
   */
  function now() {
    return (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();
  }

  // =============================================================================
  // Public Functions
  // =============================================================================

  /**
   * Set loader label text
   * @param {string} text - Text to display
   */
  function setLabel(text) {
    var root = getLoaderElement();
    if (!root) return;
    
    var label = root.querySelector('.loader-label');
    if (label && text) {
      label.textContent = text;
    }
  }

  /**
   * Show the loader
   * @param {string} [text] - Optional text to display
   */
  function show(text) {
    var root = getLoaderElement();
    if (!root) return;

    // Set text
    setLabel(text || getDefaultText());

    // Mark startup phase on first show
    if (!isStartupPhase) {
      isStartupPhase = true;
      loaderStartTime = now();
    }

    root.style.display = 'flex';
  }

  /**
   * Hide the loader immediately (no minimum time)
   */
  function hideImmediate() {
    var root = getLoaderElement();
    if (!root) return;
    root.style.display = 'none';
  }

  /**
   * Hide the loader (simple hide without startup timing)
   */
  function hide() {
    isStartupPhase = false;
    hideImmediate();
  }

  /**
   * Hide the loader respecting minimum startup duration
   * Ensures loader shows for at least MIN_STARTUP_DURATION on startup
   */
  function hideWithMinDuration() {
    if (!isStartupPhase) {
      hideImmediate();
      return;
    }

    var elapsed = now() - loaderStartTime;

    if (elapsed >= MIN_STARTUP_DURATION) {
      isStartupPhase = false;
      hideImmediate();
    } else {
      var remaining = MIN_STARTUP_DURATION - elapsed;
      setTimeout(function() {
        isStartupPhase = false;
        hideImmediate();
      }, remaining);
    }
  }

  /**
   * Check if loader is currently visible
   * @returns {boolean}
   */
  function isVisible() {
    var root = getLoaderElement();
    return root && root.style.display !== 'none';
  }

  // =============================================================================
  // Public API
  // =============================================================================

  global.CubikLoader = {
    show: show,
    hide: hide,
    hideImmediate: hideImmediate,
    hideWithMinDuration: hideWithMinDuration,
    setLabel: setLabel,
    isVisible: isVisible,

    // Configuration
    MIN_DURATION: MIN_STARTUP_DURATION
  };

  // Backward compatibility aliases
  global.showLoader = show;
  global.hideLoader = hide;
  global.hideLoaderImmediate = hideImmediate;
  global.hideLoaderWithStartupMin = hideWithMinDuration;
  global.setLoaderLabel = setLabel;

})(window);
