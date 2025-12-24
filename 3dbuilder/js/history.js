/**
 * Cubik Builder - History Module
 * @module history
 * @description Undo/Redo functionality for scene state management
 * @author Andrey Bovdurets
 * @version 1.1
 */
(function(global) {
  'use strict';

  // =============================================================================
  // Configuration
  // =============================================================================

  var MAX_UNDO_STEPS = 600;

  // =============================================================================
  // State
  // =============================================================================

  var undoStack = [];
  var redoStack = [];
  var hasUnsavedChanges = false;

  // Expose for backward compatibility
  global.undoStack = undoStack;
  global.redoStack = redoStack;
  global.hasUnsavedChanges = hasUnsavedChanges;

  // =============================================================================
  // Core Functions
  // =============================================================================

  /**
   * Push current state to undo stack
   */
  function pushState() {
    if (typeof global.snapshotScene !== 'function') {
      return;
    }

    try {
      var snapshot = global.snapshotScene();
      undoStack.push(snapshot);

      // Limit stack size
      while (undoStack.length > MAX_UNDO_STEPS) {
        undoStack.shift();
      }

      // Clear redo stack on new action
      redoStack.length = 0;
      hasUnsavedChanges = true;

      updateUI();
    } catch (e) {
      console.warn('[History] pushState error:', e);
    }
  }

  /**
   * Undo last action
   * @returns {boolean} Whether undo was successful
   */
  function undo() {
    if (undoStack.length <= 1) {
      return false;
    }

    if (typeof global.restoreScene !== 'function') {
      return false;
    }

    try {
      // Save current state to redo stack
      var currentState = undoStack.pop();
      redoStack.push(currentState);

      // Restore previous state
      var previousState = undoStack[undoStack.length - 1];
      if (previousState) {
        global.restoreScene(previousState);
      }

      hasUnsavedChanges = true;
      updateUI();
      return true;
    } catch (e) {
      console.warn('[History] undo error:', e);
      return false;
    }
  }

  /**
   * Redo last undone action
   * @returns {boolean} Whether redo was successful
   */
  function redo() {
    if (redoStack.length === 0) {
      return false;
    }

    if (typeof global.restoreScene !== 'function') {
      return false;
    }

    try {
      // Get state from redo stack
      var stateToRestore = redoStack.pop();

      // Push to undo stack
      undoStack.push(stateToRestore);

      // Restore state
      global.restoreScene(stateToRestore);

      hasUnsavedChanges = true;
      updateUI();
      return true;
    } catch (e) {
      console.warn('[History] redo error:', e);
      return false;
    }
  }

  /**
   * Clear all history
   */
  function clear() {
    undoStack.length = 0;
    redoStack.length = 0;
    hasUnsavedChanges = false;
    updateUI();
  }

  /**
   * Reset history with current state as baseline
   */
  function reset() {
    clear();
    pushState();
  }

  // =============================================================================
  // UI Updates
  // =============================================================================

  /**
   * Update undo/redo button states
   */
  function updateUI() {
    var undoBtn = document.getElementById('undoBtn');
    var redoBtn = document.getElementById('redoBtn');

    if (undoBtn) {
      undoBtn.disabled = undoStack.length <= 1;
      undoBtn.classList.toggle('disabled', undoStack.length <= 1);
    }

    if (redoBtn) {
      redoBtn.disabled = redoStack.length === 0;
      redoBtn.classList.toggle('disabled', redoStack.length === 0);
    }

    // Also expose the function globally
    if (typeof global.updateUndoRedoUI === 'function' && global.updateUndoRedoUI !== updateUI) {
      try {
        global.updateUndoRedoUI();
      } catch (e) {}
    }
  }

  // =============================================================================
  // Keyboard Handler
  // =============================================================================

  function handleKeydown(e) {
    // Ctrl+Z - Undo
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      undo();
      return;
    }

    // Ctrl+Shift+Z or Ctrl+Y - Redo
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      redo();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      redo();
      return;
    }
  }

  // =============================================================================
  // Initialization
  // =============================================================================

  function init() {
    // NOTE: Undo/Redo is handled in app.js
    // This module provides CubikHistory API as a wrapper
    
    // Button bindings (with guard against double-binding)
    var undoBtn = document.getElementById('undoBtn');
    var redoBtn = document.getElementById('redoBtn');

    if (undoBtn && !undoBtn._historyInitialized) {
      undoBtn._historyInitialized = true;
      undoBtn.addEventListener('click', undo);
    }

    if (redoBtn && !redoBtn._historyInitialized) {
      redoBtn._historyInitialized = true;
      redoBtn.addEventListener('click', redo);
    }
  }

  // Do NOT auto-initialize - app.js handles undo/redo
  // The module exposes CubikHistory API for external use

  // =============================================================================
  // Public API
  // =============================================================================

  global.CubikHistory = {
    pushState: pushState,
    undo: undo,
    redo: redo,
    clear: clear,
    reset: reset,
    updateUI: updateUI,

    // Getters
    canUndo: function() { return undoStack.length > 1; },
    canRedo: function() { return redoStack.length > 0; },
    getUndoCount: function() { return undoStack.length; },
    getRedoCount: function() { return redoStack.length; },
    hasUnsavedChanges: function() { return hasUnsavedChanges; },

    // Configuration
    MAX_STEPS: MAX_UNDO_STEPS
  };

  // NOTE: Do not override window.pushState - it's defined in app.js
  // global.updateUndoRedoUI is safe to set as a fallback
  if (typeof global.updateUndoRedoUI !== 'function') {
    global.updateUndoRedoUI = updateUI;
  }

})(window);
