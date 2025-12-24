/**
 * Cubik Builder - Utilities Module
 * @module utils
 * @description Common utility functions used across the application
 * @author Andrey Bovdurets
 * @version 1.1
 */
(function(global) {
  'use strict';

  // =============================================================================
  // DOM Utilities
  // =============================================================================

  /**
   * Get element by ID (shorthand)
   * @param {string} id - Element ID
   * @returns {HTMLElement|null}
   */
  function el(id) {
    return document.getElementById(id);
  }

  /**
   * Query selector shorthand
   * @param {string} selector - CSS selector
   * @param {HTMLElement} [parent=document] - Parent element
   * @returns {HTMLElement|null}
   */
  function qs(selector, parent) {
    return (parent || document).querySelector(selector);
  }

  /**
   * Query selector all shorthand
   * @param {string} selector - CSS selector
   * @param {HTMLElement} [parent=document] - Parent element
   * @returns {NodeList}
   */
  function qsa(selector, parent) {
    return (parent || document).querySelectorAll(selector);
  }

  // =============================================================================
  // Color Utilities
  // =============================================================================

  /**
   * Convert hex color to decimal
   * @param {string} hex - Hex color string (with or without #)
   * @returns {number}
   */
  function hexToDec(hex) {
    return parseInt(String(hex).replace('#', ''), 16);
  }

  /**
   * Normalize hex color string
   * @param {string} hex - Hex color string
   * @returns {string} Normalized uppercase hex with #
   */
  function hexNorm(hex) {
    var s = String(hex || '').trim();
    if (s.charAt(0) !== '#') {
      s = '#' + s;
    }
    // Expand shorthand (#RGB -> #RRGGBB)
    if (s.length === 4) {
      var r = s.charAt(1);
      var g = s.charAt(2);
      var b = s.charAt(3);
      s = '#' + r + r + g + g + b + b;
    }
    return s.toUpperCase();
  }

  /**
   * Convert sRGB component to linear space
   * @param {number} c - sRGB component (0-255)
   * @returns {number} Linear component (0-1)
   */
  function srgbComponentToLinear(c) {
    c = c / 255;
    return (c <= 0.04045) ? (c / 12.92) : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  /**
   * Convert sRGB hex to THREE.Color in linear space
   * @param {string|number} hex - Hex color (#RRGGBB or 0xRRGGBB)
   * @returns {THREE.Color}
   */
  function srgbColor(hex) {
    var h = (typeof hex === 'number') 
      ? hex.toString(16).padStart(6, '0')
      : (hex.charAt(0) === '#' ? hex.slice(1) : hex);
    var r = parseInt(h.slice(0, 2), 16);
    var g = parseInt(h.slice(2, 4), 16);
    var b = parseInt(h.slice(4, 6), 16);
    return new THREE.Color(
      srgbComponentToLinear(r),
      srgbComponentToLinear(g),
      srgbComponentToLinear(b)
    );
  }

  /**
   * Convert hex to THREE.Color in linear space
   * @param {string} hex - Hex color string
   * @returns {THREE.Color}
   */
  function toLinear(hex) {
    var c = new THREE.Color(hex);
    if (c.convertSRGBToLinear) {
      c.convertSRGBToLinear();
    }
    return c;
  }

  // =============================================================================
  // Function Utilities
  // =============================================================================

  /**
   * Debounce function execution
   * @param {Function} fn - Function to debounce
   * @param {number} [ms=250] - Delay in milliseconds
   * @returns {Function}
   */
  function debounce(fn, ms) {
    var timer = null;
    return function() {
      var args = arguments;
      var context = this;
      clearTimeout(timer);
      timer = setTimeout(function() {
        fn.apply(context, args);
      }, ms || 250);
    };
  }

  /**
   * Throttle function execution
   * @param {Function} fn - Function to throttle
   * @param {number} [ms=100] - Minimum interval in milliseconds
   * @returns {Function}
   */
  function throttle(fn, ms) {
    var lastTime = 0;
    return function() {
      var now = Date.now();
      if (now - lastTime >= (ms || 100)) {
        lastTime = now;
        fn.apply(this, arguments);
      }
    };
  }

  // =============================================================================
  // Hash Utilities
  // =============================================================================

  /**
   * Simple string hash (djb2 algorithm)
   * @param {string} str - String to hash
   * @returns {string} Hex hash string
   */
  function hash(str) {
    var h = 5381;
    var i = str.length;
    while (i) {
      h = ((h << 5) + h) ^ str.charCodeAt(--i);
    }
    return (h >>> 0).toString(16);
  }

  // =============================================================================
  // Object Utilities
  // =============================================================================

  /**
   * Deep clone an object (simple JSON-based)
   * @param {Object} obj - Object to clone
   * @returns {Object}
   */
  function clone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      return obj;
    }
  }

  /**
   * Check if value is a plain object
   * @param {*} val - Value to check
   * @returns {boolean}
   */
  function isObject(val) {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
  }

  // =============================================================================
  // Public API
  // =============================================================================

  global.CubikUtils = {
    // DOM
    el: el,
    qs: qs,
    qsa: qsa,

    // Color
    hexToDec: hexToDec,
    hexNorm: hexNorm,
    srgbColor: srgbColor,
    srgbComponentToLinear: srgbComponentToLinear,
    toLinear: toLinear,

    // Functions
    debounce: debounce,
    throttle: throttle,

    // Hash
    hash: hash,

    // Object
    clone: clone,
    isObject: isObject
  };

  // Also expose commonly used functions globally for backward compatibility
  global.srgbColor = srgbColor;
  global.hexToDec = hexToDec;
  global.hexNorm = hexNorm;

})(window);
