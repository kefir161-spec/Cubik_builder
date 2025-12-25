/**
 * Cubik Builder - I/O Module
 * @module io
 * @description Import/Export functionality for scenes and projects
 * @author Andrey Bovdurets
 * @version 1.2 - Optimized: no geometry serialization for built-in kinds
 */
(function(global) {
  'use strict';

  // =============================================================================
  // Built-in Kinds (loaded from .obj files, no need to serialize geometry)
  // =============================================================================

  var BUILTIN_KINDS = ['box', 'Void', 'Zen', 'Zen/2', 'Zen_2', 'Bion', 'Flora'];

  /**
   * Check if kind is built-in
   */
  function isBuiltinKind(kind) {
    return BUILTIN_KINDS.indexOf(kind) !== -1;
  }

  /**
   * Check if kind is available in the app
   */
  function isKindAvailable(kind) {
    if (isBuiltinKind(kind)) return true;
    if (global.customKinds && global.customKinds[kind]) return true;
    if (global.baseGeom && global.baseGeom[kind]) return true;
    return false;
  }

  // =============================================================================
  // Geometry Serialization (only for truly custom kinds)
  // =============================================================================

  var _bufferGeomLoader = null;

  function getBufferGeomLoader() {
    if (!_bufferGeomLoader && typeof THREE !== 'undefined' && THREE.BufferGeometryLoader) {
      _bufferGeomLoader = new THREE.BufferGeometryLoader();
    }
    return _bufferGeomLoader;
  }

  /**
   * Serialize geometry to JSON (only when absolutely needed)
   */
  function serializeGeometry(geom) {
    if (!geom || typeof geom.toJSON !== 'function') {
      return null;
    }

    try {
      var g = geom;
      if (g.index && g.toNonIndexed) {
        g = g.toNonIndexed();
      }
      return g.toJSON();
    } catch (e) {
      console.warn('[IO] serializeGeometry failed:', e);
      return null;
    }
  }

  /**
   * Deserialize geometry from JSON
   */
  function deserializeGeometry(json) {
    if (!json) return null;

    var loader = getBufferGeomLoader();
    if (!loader) return null;

    try {
      return loader.parse(json);
    } catch (e) {
      console.warn('[IO] deserializeGeometry failed:', e);
      return null;
    }
  }

  // =============================================================================
  // Custom Kinds Serialization (OPTIMIZED - no geometry for built-ins)
  // =============================================================================

  /**
   * Collect used kinds from snapshot
   */
  function collectUsedKinds(snapshot) {
    var used = {};
    if (!Array.isArray(snapshot)) return used;

    for (var i = 0; i < snapshot.length; i++) {
      var s = snapshot[i];
      if (!s) continue;

      if (s.kind) {
        used[s.kind] = true;
      }

      if (s.faces) {
        for (var dir in s.faces) {
          if (!Object.prototype.hasOwnProperty.call(s.faces, dir)) continue;
          var fs = s.faces[dir];
          if (fs && fs.faceType) {
            used[fs.faceType] = true;
          }
        }
      }
    }

    return used;
  }

  /**
   * Serialize custom kinds for export (OPTIMIZED)
   * - Built-in kinds: only faceColors/faceTypes, NO geometry
   * - Custom kinds: faceColors/faceTypes + base kind reference
   */
  function serializeCustomKinds(snapshot) {
    if (!global.customKinds) return null;

    var usedKinds = collectUsedKinds(snapshot);
    var result = {};

    for (var kind in usedKinds) {
      if (!Object.prototype.hasOwnProperty.call(usedKinds, kind)) continue;

      // Skip built-in kinds - they're loaded from .obj files
      if (isBuiltinKind(kind)) continue;

      var ck = global.customKinds[kind];
      if (!ck) continue;

      // For custom kinds, save only metadata (no geometry!)
      result[kind] = {
        faceColors: ck.faceColors || {},
        faceTypes: ck.faceTypes || {},
        zen2Like: !!ck.zen2Like,
        // Reference to base kind if available
        baseKind: ck.baseKind || null
      };
    }

    if (Object.keys(result).length === 0) return null;
    return result;
  }

  /**
   * Restore custom kinds from payload (OPTIMIZED)
   */
  function restoreCustomKinds(map) {
    if (!map || typeof map !== 'object') return;

    var dirs = ['top', 'bottom', 'front', 'back', 'left', 'right'];

    for (var kind in map) {
      if (!Object.prototype.hasOwnProperty.call(map, kind)) continue;

      var data = map[kind];
      if (!data) continue;

      // Skip if already exists
      if (global.customKinds && global.customKinds[kind]) continue;

      var faceMap = {};
      var merged = null;

      // Get geometry from base kind
      var baseKind = data.baseKind || 'Bion';
      if (global.baseGeom && global.baseGeom[baseKind]) {
        merged = global.baseGeom[baseKind];
      }
      
      // For each face, get geometry from the correct face type (not just baseKind!)
      var faceTypes = data.faceTypes || {};
      for (var i = 0; i < dirs.length; i++) {
        var d = dirs[i];
        var faceType = faceTypes[d] || baseKind;
        
        // Try to get geometry for this face type
        if (global.faceGeoms && global.faceGeoms[faceType] && global.faceGeoms[faceType][d]) {
          faceMap[d] = global.faceGeoms[faceType][d];
        } else if (global.faceGeoms && global.faceGeoms[baseKind] && global.faceGeoms[baseKind][d]) {
          // Fallback to baseKind geometry
          faceMap[d] = global.faceGeoms[baseKind][d];
        } else if (global.faceGeoms && global.faceGeoms['Bion'] && global.faceGeoms['Bion'][d]) {
          // Fallback to Bion geometry
          faceMap[d] = global.faceGeoms['Bion'][d];
          console.warn('[IO:restoreCustomKinds] Using Bion fallback for', kind, d);
        } else if (global.faceGeoms && global.faceGeoms['box'] && global.faceGeoms['box'][d]) {
          // Fallback to box geometry
          faceMap[d] = global.faceGeoms['box'][d];
          console.warn('[IO:restoreCustomKinds] Using box fallback for', kind, d);
        }
        
        // Last resort: create face geometry on the fly
        if (!faceMap[d]) {
          console.warn('[IO:restoreCustomKinds] Creating fallback geometry for', kind, d);
          try {
            var boxGeom = new THREE.BoxGeometry(1,1,1);
            // Simple face extraction
            faceMap[d] = boxGeom; // Will use box as fallback
          } catch(e) {}
        }
      }

      // Legacy support: deserialize geometry if present in old format
      if (data.faceGeoms) {
        for (var j = 0; j < dirs.length; j++) {
          var dd = dirs[j];
          if (!data.faceGeoms[dd]) continue;
          var g = deserializeGeometry(data.faceGeoms[dd]);
          if (g) {
            faceMap[dd] = g;
          }
        }
      }

      if (data.mergedGeom) {
        var mergedDeserialized = deserializeGeometry(data.mergedGeom);
        if (mergedDeserialized) {
          merged = mergedDeserialized;
        }
      }

      // Fallback to box geometry
      if (!merged) {
        merged = new THREE.BoxGeometry(1, 1, 1);
      }

      // Register the kind
      if (global.baseGeom) global.baseGeom[kind] = merged;
      if (global.faceGeoms) global.faceGeoms[kind] = faceMap;
      if (!global.customKinds) global.customKinds = {};

      global.customKinds[kind] = {
        mergedGeom: merged,
        faceGeoms: faceMap,
        faceColors: data.faceColors || {},
        faceTypes: data.faceTypes || {},
        zen2Like: !!data.zen2Like,
        baseKind: data.baseKind || null
      };
    }
  }

  // =============================================================================
  // JSON Export (OPTIMIZED)
  // =============================================================================

  /**
   * Export project to JSON file
   */
  function exportJSON(filename) {
    try {
      if (typeof global.snapshotScene !== 'function') {
        throw new Error('snapshotScene not available');
      }

      var snapshot = global.snapshotScene();

      // Build compact payload
      var payload = {
        name: 'Cubik Project',
        version: '1.2',
        timestamp: Date.now(),
        snapshot: snapshot
      };

      // Only include custom kinds (non-built-in) - without geometry!
      var customPayload = serializeCustomKinds(snapshot);
      if (customPayload) {
        payload.customKinds = customPayload;
      }

      // Use compact JSON (no pretty print for smaller size)
      var json = JSON.stringify(payload);

      // Log size for debugging
      var sizeKB = (json.length / 1024).toFixed(1);
      console.log('[IO] Export size: ' + sizeKB + ' KB, ' + snapshot.length + ' objects');

      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);

      var a = document.createElement('a');
      a.href = url;
      a.download = filename || 'project.json';
      document.body.appendChild(a);
      a.click();

      setTimeout(function() {
        try { document.body.removeChild(a); } catch (e) {}
        try { URL.revokeObjectURL(url); } catch (e) {}
      }, 100);

      if (global.CubikUI && global.CubikUI.showStatus) {
        global.CubikUI.showStatus('Exported (' + sizeKB + ' KB)', true);
      } else if (typeof global.msg === 'function') {
        global.msg('Exported (' + sizeKB + ' KB)', true);
      }
    } catch (e) {
      console.error('[IO] JSON export failed:', e);
      if (global.CubikUI && global.CubikUI.showStatus) {
        global.CubikUI.showStatus('Export failed', false);
      }
    }
  }

  /**
   * Import project from JSON text
   */
  function importJSON(text) {
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('[IO] JSON parse error:', e);
      alert('Invalid JSON file');
      return false;
    }

    // Support multiple formats
    var snapshot = null;
    var customPayload = null;

    if (Array.isArray(data)) {
      snapshot = data;
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.snapshot)) {
        snapshot = data.snapshot;
      }
      if (data.customKinds && typeof data.customKinds === 'object') {
        customPayload = data.customKinds;
      }
    }

    if (!snapshot || !snapshot.length) {
      alert('No scene data found in JSON');
      return false;
    }

    // Restore custom kinds first
    if (customPayload) {
      try {
        restoreCustomKinds(customPayload);
      } catch (e) {
        console.warn('[IO] restore customKinds error:', e);
      }
    }

    // Validate all kinds are available
    var usedKinds = collectUsedKinds(snapshot);
    var missing = [];
    for (var kind in usedKinds) {
      if (!isKindAvailable(kind)) {
        missing.push(kind);
      }
    }
    if (missing.length > 0) {
      console.warn('[IO] Missing kinds:', missing);
    }

    // Restore scene
    try {
      if (typeof global.loadSceneFromSnapshot === 'function') {
        global.loadSceneFromSnapshot(snapshot);
      } else if (typeof global.restoreScene === 'function') {
        global.restoreScene(snapshot);
      } else {
        throw new Error('No scene restore function available');
      }
    } catch (e) {
      console.error('[IO] scene restore error:', e);
      alert('Failed to restore scene');
      return false;
    }

    // Reset history
    if (global.CubikHistory) {
      global.CubikHistory.reset();
    }

    if (global.CubikUI && global.CubikUI.showStatus) {
      global.CubikUI.showStatus('Project loaded (' + snapshot.length + ' objects)', true);
    } else if (typeof global.msg === 'function') {
      global.msg('Project loaded (' + snapshot.length + ' objects)', true);
    }

    return true;
  }

  // =============================================================================
  // GLB Export
  // =============================================================================

  function exportGLB(filename) {
    if (!THREE.GLTFExporter) {
      alert('GLTFExporter not available');
      return;
    }

    try {
      if (global.CubikLoader) {
        global.CubikLoader.show('Exporting GLB...');
      }

      var exporter = new THREE.GLTFExporter();

      var root;
      if (typeof global.buildExportGroup === 'function') {
        root = global.buildExportGroup();
      } else {
        root = global.scene;
      }

      exporter.parse(root, function(result) {
        try {
          var blob = new Blob([result], { type: 'model/gltf-binary' });
          var url = URL.createObjectURL(blob);

          var a = document.createElement('a');
          a.href = url;
          a.download = filename || 'scene.glb';
          document.body.appendChild(a);
          a.click();

          setTimeout(function() {
            URL.revokeObjectURL(url);
            try { a.remove(); } catch (e) {}
          }, 1000);

          if (global.CubikUI && global.CubikUI.showStatus) {
            global.CubikUI.showStatus('Scene exported to GLB', true);
          }
        } catch (e) {
          console.error('[IO] GLB export error:', e);
        } finally {
          if (global.CubikLoader) {
            global.CubikLoader.hide();
          }
        }
      }, {
        binary: true,
        onlyVisible: true,
        trs: false
      });
    } catch (e) {
      console.error('[IO] GLB export error:', e);
      if (global.CubikLoader) {
        global.CubikLoader.hide();
      }
    }
  }

  // =============================================================================
  // File Input Handler
  // =============================================================================

  function handleFileInput(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        importJSON(e.target.result);
      } catch (err) {
        console.error('[IO] file read error:', err);
        alert('Failed to read file');
      }
      try { event.target.value = ''; } catch (e) {}
    };

    reader.onerror = function() {
      alert('Failed to read file');
    };

    reader.readAsText(file);
  }

  // =============================================================================
  // Initialization
  // =============================================================================

  function init() {
    var exportJsonBtn = document.getElementById('exportJsonBtn');
    if (exportJsonBtn && !exportJsonBtn._ioInitialized) {
      exportJsonBtn._ioInitialized = true;
      exportJsonBtn.addEventListener('click', function() {
        exportJSON();
      });
    }

    var importJsonBtn = document.getElementById('importJsonBtn');
    var importJsonInput = document.getElementById('importJsonInput');

    if (importJsonBtn && importJsonInput && !importJsonBtn._ioInitialized) {
      importJsonBtn._ioInitialized = true;
      importJsonBtn.addEventListener('click', function() {
        importJsonInput.click();
      });

      importJsonInput.addEventListener('change', handleFileInput);
    }

    var exportGlbBtn = document.getElementById('exportGlbBtn');
    if (exportGlbBtn && !exportGlbBtn._ioInitialized) {
      exportGlbBtn._ioInitialized = true;
      exportGlbBtn.addEventListener('click', function() {
        exportGLB();
      });
    }
  }

  // =============================================================================
  // Public API
  // =============================================================================

  global.CubikIO = {
    // JSON
    exportJSON: exportJSON,
    importJSON: importJSON,

    // GLB
    exportGLB: exportGLB,

    // Geometry (for advanced use)
    serializeGeometry: serializeGeometry,
    deserializeGeometry: deserializeGeometry,

    // Custom Kinds
    serializeCustomKinds: serializeCustomKinds,
    restoreCustomKinds: restoreCustomKinds,

    // Utilities
    isBuiltinKind: isBuiltinKind,
    isKindAvailable: isKindAvailable,
    collectUsedKinds: collectUsedKinds,

    // Init
    init: init
  };

  // Backward compatibility
  global.exportProjectJSON = exportJSON;
  global.importProjectJSONFromText = importJSON;
  global.exportGLB = exportGLB;

})(window);
