/**
 * Cubik Builder - Mobile Detection Module
 * @module mobile
 * @description Detects mobile/touch devices for layout (touch-mode)
 * @version 1.4
 */
(function() {
  'use strict';

  /**
   * iPadOS 13+: Safari sends Mac UA, so "iPad" is missing. Detect by Mac + multi-touch.
   * @returns {boolean}
   */
  function isIPadWithDesktopUA() {
    return navigator.platform === 'MacIntel' &&
           typeof navigator.maxTouchPoints === 'number' &&
           navigator.maxTouchPoints > 1;
  }

  /**
   * Check if device is mobile or tablet (use touch layout)
   * @returns {boolean}
   */
  function isMobile() {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
      return true;
    if (isIPadWithDesktopUA())
      return true;
    return window.innerWidth <= 768 && 'ontouchstart' in window;
  }

  /**
   * Force mobile/touch UX from desktop for testing (e.g. index.html?mobile=1).
   */
  function forceTouchMode() {
    return /[?&](mobile|touch)=1/i.test(window.location.search || '');
  }

  /** True when we should use touch UX: real mobile or ?mobile=1/?touch=1 */
  function isTouchMode() {
    return isMobile() || forceTouchMode();
  }

  // Export for external use
  window.CubikMobile = {
    isMobile: isMobile,
    forceTouchMode: forceTouchMode,
    isTouchMode: isTouchMode
  };

})();
