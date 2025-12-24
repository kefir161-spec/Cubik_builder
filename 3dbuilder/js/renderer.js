/**
 * Cubik Builder - Renderer Module
 * @module renderer
 * @description Three.js renderer setup and color pipeline configuration
 * @author Andrey Bovdurets
 * @version 1.1
 */
(function(global) {
  'use strict';

  // =============================================================================
  // Color Pipeline Setup
  // =============================================================================

  /**
   * Setup color pipeline for renderer
   * Configures output color space and tone mapping
   * @param {THREE.WebGLRenderer} renderer - The renderer to configure
   */
  function setupColorPipeline(renderer) {
    if (!renderer) return;

    // Prefer modern colorSpace API (r150+)
    // Fallback to outputEncoding for older builds (r128)
    if (renderer.outputColorSpace !== undefined && THREE.SRGBColorSpace !== undefined) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else if (renderer.outputEncoding !== undefined && THREE.sRGBEncoding !== undefined) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }

    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;
  }

  // =============================================================================
  // Scene Colors
  // =============================================================================

  /**
   * Apply base colors to scene elements
   * @param {THREE.Scene} scene - The scene
   * @param {THREE.Mesh} floorMesh - Floor mesh
   * @param {THREE.Mesh[]} wallMeshes - Array of wall meshes
   * @param {Object} [colors] - Color configuration
   * @param {string} [colors.floor='#5B676D'] - Floor color
   * @param {string} [colors.wall='#8E969D'] - Wall color
   * @param {string} [colors.sky='#8E969D'] - Sky/background color
   */
  function applyBaseColors(scene, floorMesh, wallMeshes, colors) {
    colors = colors || {
      floor: '#5B676D',
      wall: '#8E969D',
      sky: '#8E969D'
    };

    var srgbColor = global.srgbColor || global.CubikUtils.srgbColor;

    if (scene) {
      scene.background = srgbColor(colors.sky);
    }

    if (floorMesh && floorMesh.material) {
      floorMesh.material.color.copy(srgbColor(colors.floor));
      floorMesh.material.roughness = 1;
      floorMesh.material.metalness = 0;
      floorMesh.material.needsUpdate = true;
    }

    if (Array.isArray(wallMeshes)) {
      wallMeshes.forEach(function(w) {
        if (w && w.material) {
          w.material.color.copy(srgbColor(colors.wall));
          w.material.roughness = 1;
          w.material.metalness = 0;
          w.material.needsUpdate = true;
        }
      });
    }
  }

  // =============================================================================
  // Renderer Factory
  // =============================================================================

  /**
   * Create and configure a WebGL renderer
   * @param {Object} [options] - Renderer options
   * @param {HTMLCanvasElement} [options.canvas] - Existing canvas element
   * @param {boolean} [options.antialias=true] - Enable antialiasing
   * @param {boolean} [options.alpha=false] - Enable alpha channel
   * @param {number} [options.pixelRatio] - Device pixel ratio (default: window.devicePixelRatio)
   * @returns {THREE.WebGLRenderer}
   */
  function createRenderer(options) {
    options = options || {};

    var renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: options.antialias !== false,
      alpha: options.alpha || false
    });

    renderer.setPixelRatio(options.pixelRatio || window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    setupColorPipeline(renderer);

    return renderer;
  }

  // =============================================================================
  // Public API
  // =============================================================================

  global.CubikRenderer = {
    setupColorPipeline: setupColorPipeline,
    applyBaseColors: applyBaseColors,
    createRenderer: createRenderer
  };

  // Backward compatibility
  global.setupColorPipeline = setupColorPipeline;
  global.applyBaseColors = applyBaseColors;

})(window);
