/**
 * Cubik Builder - Autosave Module
 * @module autosave
 * @description Automatic scene saving and restoration
 * @author Andrey Bovdurets
 * @version 1.1
 */
(function(global) {
  'use strict';

  // =============================================================================
  // Configuration
  // =============================================================================

  var STORAGE_KEY = 'c3d_autosave_v3';
  var META_KEY = 'c3d_autosave_meta_v3';
  var DEBOUNCE_MS = 300;
  var AUTO_SAVE_INTERVAL = 8000;
  var RESTORE_TIMEOUT = 10000;

  // =============================================================================
  // State
  // =============================================================================

  var restored = false;
  var pendingData = null;
  var isDirty = false;
  var lastHash = null;

  // =============================================================================
  // Utility Functions
  // =============================================================================

  /**
   * Debounce function
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
   * Simple hash function (djb2)
   */
  function hash(str) {
    var h = 5381;
    var i = str.length;
    while (i) {
      h = ((h << 5) + h) ^ str.charCodeAt(--i);
    }
    return (h >>> 0).toString(16);
  }

  /**
   * Check if scene functions are available
   */
  function isReady() {
    try {
      return global.scene &&
        Array.isArray(global.objects) &&
        typeof global.snapshotScene === 'function' &&
        (typeof global.loadSceneFromSnapshot === 'function' || typeof global.restoreScene === 'function');
    } catch (e) {
      return false;
    }
  }

  /**
   * Create snapshot string
   */
  function createSnapshot() {
    try {
      return JSON.stringify(global.snapshotScene());
    } catch (e) {
      return null;
    }
  }

  // =============================================================================
  // Save Functions
  // =============================================================================

  /**
   * Save scene to localStorage
   */
  function save() {
    if (!isReady()) return;

    var snapshot = createSnapshot();
    if (!snapshot) return;

    var h = hash(snapshot);
    if (h === lastHash) {
      isDirty = false;
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, snapshot);
      localStorage.setItem(META_KEY, JSON.stringify({
        ts: Date.now(),
        hash: h
      }));
      lastHash = h;
      isDirty = false;
    } catch (e) {
      // localStorage unavailable or full
    }
  }

  var scheduleSave = debounce(save, DEBOUNCE_MS);

  /**
   * Mark scene as dirty (needs saving)
   */
  function markDirty() {
    isDirty = true;
    scheduleSave();
  }

  // =============================================================================
  // Restore Functions
  // =============================================================================

  /**
   * Try to restore scene from localStorage
   * @returns {boolean} Whether restoration was successful
   */
  function tryRestore() {
    if (restored || !pendingData || !isReady()) {
      return false;
    }

    try {
      var arr = JSON.parse(pendingData);
      if (Array.isArray(arr) && arr.length > 0) {
        // Use loadSceneFromSnapshot for full scene replacement (clears existing objects)
        if (typeof global.loadSceneFromSnapshot === 'function') {
          global.loadSceneFromSnapshot(arr);
        } else {
          global.restoreScene(arr);
        }
        restored = true;
        lastHash = hash(pendingData);
        isDirty = false;
        return true;
      }
    } catch (e) {
      // Invalid data
    }

    return false;
  }

  /**
   * Clear autosaved data
   */
  function clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(META_KEY);
    } catch (e) {}
    pendingData = null;
    lastHash = null;
    isDirty = false;
  }

  // =============================================================================
  // Keyboard Guards
  // =============================================================================

  function handleKeydown(e) {
    var key = (e.key || '').toLowerCase();

    // Ctrl+S - save
    if ((e.ctrlKey || e.metaKey) && key === 's') {
      e.preventDefault();
      scheduleSave();
      return false;
    }

    // F5 or Ctrl+R - refresh guard
    if (key === 'f5' || ((e.ctrlKey || e.metaKey) && key === 'r')) {
      e.preventDefault();
      scheduleSave();
      return false;
    }

    // Backspace guard (prevent browser navigation)
    if (key === 'backspace') {
      var target = e.target;
      var tag = target && target.tagName ? target.tagName.toLowerCase() : '';
      var isEditable = target && (target.isContentEditable || tag === 'input' || tag === 'textarea');
      if (!isEditable) {
        e.preventDefault();
        return false;
      }
    }
  }

  // =============================================================================
  // Object Disposal
  // =============================================================================

  /**
   * Recursively dispose of Three.js object resources
   * @param {THREE.Object3D} obj - Object to dispose
   */
  function disposeObjectRecursive(obj) {
    if (!obj) return;

    obj.traverse(function(node) {
      try {
        if (node.geometry && node.geometry.dispose) {
          node.geometry.dispose();
        }
        var material = node.material;
        if (material) {
          if (Array.isArray(material)) {
            material.forEach(function(m) {
              if (m && m.dispose) {
                try { m.dispose(); } catch (e) {}
              }
            });
          } else if (material.dispose) {
            try { material.dispose(); } catch (e) {}
          }
        }
        if (node.texture && node.texture.dispose) {
          try { node.texture.dispose(); } catch (e) {}
        }
      } catch (e) {}
    });
  }

  // =============================================================================
  // Initialization
  // =============================================================================

  function init() {
    // Load pending data
    try {
      pendingData = localStorage.getItem(STORAGE_KEY);
    } catch (e) {}

    // Keyboard guards
    window.addEventListener('keydown', handleKeydown, true);

    // Warn before unload if dirty
    window.addEventListener('beforeunload', function(e) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    // Save on visibility change
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') {
        scheduleSave();
      }
    });

    // Wrap pushState to mark dirty
    try {
      if (typeof global.pushState === 'function' && !global.pushState.__wrapped) {
        var originalPushState = global.pushState;
        var wrappedPushState = function() {
          var result = originalPushState.apply(this, arguments);
          try {
            markDirty();
          } catch (e) {}
          return result;
        };
        wrappedPushState.__wrapped = true;
        global.pushState = wrappedPushState;
      }
    } catch (e) {}

    // Try to restore on load
    window.addEventListener('load', function() {
      var startTime = Date.now();
      var intervalId = setInterval(function() {
        if (tryRestore() || (Date.now() - startTime > RESTORE_TIMEOUT)) {
          clearInterval(intervalId);
        }
      }, 300);

      // Periodic autosave
      setInterval(scheduleSave, AUTO_SAVE_INTERVAL);
    }, { once: true });
  }

  // Auto-initialize
  init();

  // =============================================================================
  // Public API
  // =============================================================================

  global.CubikAutosave = {
    save: save,
    scheduleSave: scheduleSave,
    tryRestore: tryRestore,
    clear: clear,
    markDirty: markDirty,
    isRestored: function() { return restored; },
    isDirty: function() { return isDirty; }
  };

  // Backward compatibility
  global.disposeObjectRecursive = disposeObjectRecursive;

})(window);
