/**
 * Cubik Builder - Thumbnail Module
 * @module thumbnail
 * @description Project icon/thumbnail generation for catalogs, social media, etc.
 * @author Andrey Bovdurets
 * @version 1.0
 */
(function(global) {
  'use strict';

  // =============================================================================
  // Configuration
  // =============================================================================

  var DEFAULT_OPTIONS = {
    width: 512,           // Thumbnail width
    height: 512,          // Thumbnail height
    format: 'image/png',  // Output format: 'image/png', 'image/jpeg', 'image/webp'
    quality: 0.92,        // JPEG/WebP quality (0-1)
    background: null,     // Custom background color (hex), null = use scene background
    padding: 0.25,        // Padding around objects (0-1) - now adaptive
    antialias: true,      // Antialiasing
    preserveDrawingBuffer: true // Required for toDataURL
  };

  // =============================================================================
  // Internal State
  // =============================================================================

  var _thumbRenderer = null;
  var _thumbScene = null;
  var _thumbCamera = null;

  // =============================================================================
  // Utility Functions
  // =============================================================================

  /**
   * Get objects array reliably
   */
  function getObjectsArray() {
    // Try getter function first
    if (typeof global.getObjects === 'function') {
      return global.getObjects();
    }
    // Fallback to direct property
    return global.objects || [];
  }

  /**
   * Calculate bounding box of all objects in scene
   */
  function calculateSceneBounds(objects) {
    var box = new THREE.Box3();
    var hasObjects = false;

    for (var i = 0; i < objects.length; i++) {
      var obj = objects[i];
      if (!obj) continue;
      
      var objBox = new THREE.Box3().setFromObject(obj);
      if (!objBox.isEmpty()) {
        box.union(objBox);
        hasObjects = true;
      }
    }

    if (!hasObjects) {
      // Default box if no objects
      box.set(
        new THREE.Vector3(-1, 0, -1),
        new THREE.Vector3(1, 2, 1)
      );
    }

    return box;
  }

  /**
   * Setup camera to frame the scene nicely - ADAPTIVE
   * Automatically adjusts to fit any size construction
   */
  function setupCameraForBounds(camera, bounds, padding) {
    var center = new THREE.Vector3();
    bounds.getCenter(center);

    var size = new THREE.Vector3();
    bounds.getSize(size);

    var fov = camera.fov * (Math.PI / 180);

    // For isometric view, calculate apparent size considering 3D diagonal
    var diagXZ = Math.sqrt(size.x * size.x + size.z * size.z);
    var maxDim = Math.max(diagXZ * 0.85, size.y) * 1.1; // Account for 3D projection
    
    // Calculate distance to fit object in frame
    var distance = (maxDim / 2) / Math.tan(fov / 2);
    
    // Add padding
    var basePadding = padding || 0.15;
    distance *= (1 + basePadding);

    // Minimum distance to avoid clipping
    distance = Math.max(distance, 2);

    // Position camera at isometric-like angle
    var d = distance * 0.65;
    camera.position.set(
      center.x + d,
      center.y + d * 0.75,
      center.z + d
    );

    // Look at exact geometric center
    camera.lookAt(center);
    
    // Update near/far planes based on distance
    camera.near = Math.max(0.1, distance * 0.01);
    camera.far = distance * 20;
    camera.updateProjectionMatrix();
  }

  /**
   * Clone scene objects for thumbnail rendering
   */
  function cloneObjectsToScene(sourceObjects, targetScene) {
    for (var i = 0; i < sourceObjects.length; i++) {
      var obj = sourceObjects[i];
      if (!obj) continue;

      try {
        var clone = obj.clone(true);
        targetScene.add(clone);
      } catch (e) {
        console.warn('[Thumbnail] Failed to clone object:', e);
      }
    }
  }

  /**
   * Setup lights for thumbnail scene
   */
  function setupThumbnailLights(scene) {
    // Ambient light
    var ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    // Key light (main)
    var keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(5, 10, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 512;
    keyLight.shadow.mapSize.height = 512;
    scene.add(keyLight);

    // Fill light
    var fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Rim light
    var rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 5, -10);
    scene.add(rimLight);
  }

  // =============================================================================
  // Thumbnail Renderer Management
  // =============================================================================

  /**
   * Get or create thumbnail renderer
   */
  function getThumbRenderer(options) {
    var opts = Object.assign({}, DEFAULT_OPTIONS, options);

    if (!_thumbRenderer) {
      _thumbRenderer = new THREE.WebGLRenderer({
        antialias: opts.antialias,
        preserveDrawingBuffer: true,
        alpha: true
      });
      
      // Setup color pipeline
      if (global.setupColorPipeline) {
        global.setupColorPipeline(_thumbRenderer);
      } else if (_thumbRenderer.outputColorSpace !== undefined && THREE.SRGBColorSpace !== undefined) {
        _thumbRenderer.outputColorSpace = THREE.SRGBColorSpace;
      }

      _thumbRenderer.shadowMap.enabled = true;
      _thumbRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    _thumbRenderer.setSize(opts.width, opts.height);
    _thumbRenderer.setPixelRatio(1); // Use 1:1 pixel ratio for consistent output

    return _thumbRenderer;
  }

  /**
   * Cleanup thumbnail renderer
   */
  function disposeThumbRenderer() {
    if (_thumbRenderer) {
      _thumbRenderer.dispose();
      _thumbRenderer = null;
    }
    if (_thumbScene) {
      _thumbScene = null;
    }
    if (_thumbCamera) {
      _thumbCamera = null;
    }
  }

  // =============================================================================
  // Main Capture Functions
  // =============================================================================

  /**
   * Capture project thumbnail as Base64 data URL
   * @param {Object} [options] - Capture options
   * @param {number} [options.width=512] - Output width
   * @param {number} [options.height=512] - Output height
   * @param {string} [options.format='image/png'] - Output format
   * @param {number} [options.quality=0.92] - JPEG/WebP quality
   * @param {string} [options.background] - Background color (hex)
   * @param {number} [options.padding=0.15] - Padding around objects
   * @returns {Promise<string>} Base64 data URL
   */
  function capture(options) {
    return new Promise(function(resolve, reject) {
      try {
        var opts = Object.assign({}, DEFAULT_OPTIONS, options);

        // Get objects from global scope
        var objects = getObjectsArray();
        if (!objects || objects.length === 0) {
          reject(new Error('No objects in scene'));
          return;
        }

        // Create thumbnail scene
        var thumbScene = new THREE.Scene();
        
        // Set background
        if (opts.background) {
          var bgColor = global.srgbColor ? global.srgbColor(opts.background) : new THREE.Color(opts.background);
          thumbScene.background = bgColor;
        } else {
          // Use neutral background
          var defaultBg = global.srgbColor ? global.srgbColor('#8E969D') : new THREE.Color('#8E969D');
          thumbScene.background = defaultBg;
        }

        // Clone objects to thumbnail scene
        cloneObjectsToScene(objects, thumbScene);

        // Setup lights
        setupThumbnailLights(thumbScene);

        // Calculate bounds and setup camera
        var bounds = calculateSceneBounds(objects);
        var thumbCamera = new THREE.PerspectiveCamera(45, opts.width / opts.height, 0.1, 1000);
        setupCameraForBounds(thumbCamera, bounds, opts.padding);

        // Get renderer and render
        var renderer = getThumbRenderer(opts);
        renderer.render(thumbScene, thumbCamera);

        // Get data URL
        var dataURL = renderer.domElement.toDataURL(opts.format, opts.quality);

        // Cleanup cloned objects
        while (thumbScene.children.length > 0) {
          var child = thumbScene.children[0];
          thumbScene.remove(child);
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(function(m) { if (m.dispose) m.dispose(); });
            } else if (child.material.dispose) {
              child.material.dispose();
            }
          }
        }

        resolve(dataURL);
      } catch (e) {
        console.error('[Thumbnail] Capture failed:', e);
        reject(e);
      }
    });
  }

  /**
   * Capture project thumbnail as Blob
   * @param {Object} [options] - Capture options (same as capture())
   * @returns {Promise<Blob>} Image blob
   */
  function captureAsBlob(options) {
    return new Promise(function(resolve, reject) {
      try {
        var opts = Object.assign({}, DEFAULT_OPTIONS, options);

        // Get objects from global scope
        var objects = getObjectsArray();
        if (!objects || objects.length === 0) {
          reject(new Error('No objects in scene'));
          return;
        }

        // Create thumbnail scene
        var thumbScene = new THREE.Scene();
        
        // Set background
        if (opts.background) {
          var bgColor = global.srgbColor ? global.srgbColor(opts.background) : new THREE.Color(opts.background);
          thumbScene.background = bgColor;
        } else {
          var defaultBg = global.srgbColor ? global.srgbColor('#8E969D') : new THREE.Color('#8E969D');
          thumbScene.background = defaultBg;
        }

        // Clone objects to thumbnail scene
        cloneObjectsToScene(objects, thumbScene);

        // Setup lights
        setupThumbnailLights(thumbScene);

        // Calculate bounds and setup camera
        var bounds = calculateSceneBounds(objects);
        var thumbCamera = new THREE.PerspectiveCamera(45, opts.width / opts.height, 0.1, 1000);
        setupCameraForBounds(thumbCamera, bounds, opts.padding);

        // Get renderer and render
        var renderer = getThumbRenderer(opts);
        renderer.render(thumbScene, thumbCamera);

        // Get blob via canvas.toBlob
        renderer.domElement.toBlob(function(blob) {
          // Cleanup cloned objects
          while (thumbScene.children.length > 0) {
            var child = thumbScene.children[0];
            thumbScene.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(function(m) { if (m.dispose) m.dispose(); });
              } else if (child.material.dispose) {
                child.material.dispose();
              }
            }
          }

          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, opts.format, opts.quality);

      } catch (e) {
        console.error('[Thumbnail] CaptureAsBlob failed:', e);
        reject(e);
      }
    });
  }

  /**
   * Capture multiple frames for rotation animation
   * @param {Object} [options] - Capture options
   * @param {number} [options.frames=8] - Number of frames
   * @param {number} [options.width=256] - Frame width
   * @param {number} [options.height=256] - Frame height
   * @returns {Promise<string[]>} Array of Base64 data URLs
   */
  function captureRotation(options) {
    return new Promise(function(resolve, reject) {
      try {
        var opts = Object.assign({}, DEFAULT_OPTIONS, options, {
          frames: (options && options.frames) || 8
        });

        var objects = getObjectsArray();
        if (!objects || objects.length === 0) {
          reject(new Error('No objects in scene'));
          return;
        }

        // Create thumbnail scene
        var thumbScene = new THREE.Scene();
        
        if (opts.background) {
          var bgColor = global.srgbColor ? global.srgbColor(opts.background) : new THREE.Color(opts.background);
          thumbScene.background = bgColor;
        } else {
          var defaultBg = global.srgbColor ? global.srgbColor('#8E969D') : new THREE.Color('#8E969D');
          thumbScene.background = defaultBg;
        }

        cloneObjectsToScene(objects, thumbScene);
        setupThumbnailLights(thumbScene);

        var bounds = calculateSceneBounds(objects);
        var center = new THREE.Vector3();
        bounds.getCenter(center);

        var size = new THREE.Vector3();
        bounds.getSize(size);

        var thumbCamera = new THREE.PerspectiveCamera(45, opts.width / opts.height, 0.1, 1000);
        
        // Adaptive distance calculation (same logic as setupCameraForBounds)
        var aspect = thumbCamera.aspect;
        var fov = thumbCamera.fov * (Math.PI / 180);
        var fovH = 2 * Math.atan(Math.tan(fov / 2) * aspect);
        var diagonal = Math.sqrt(size.x * size.x + size.z * size.z);
        var distanceV = (size.y / 2) / Math.tan(fov / 2);
        var distanceH = (diagonal / 2) / Math.tan(fovH / 2);
        var distance = Math.max(distanceV, distanceH);
        var maxDim = Math.max(size.x, size.y, size.z);
        var adaptivePadding = opts.padding + (maxDim < 3 ? 0.15 : 0);
        distance *= (1 + adaptivePadding);
        distance = Math.max(distance, 2);

        var renderer = getThumbRenderer(opts);
        var frames = [];
        var elevation = Math.PI / 5.5;

        for (var i = 0; i < opts.frames; i++) {
          var angle = (i / opts.frames) * Math.PI * 2;

          thumbCamera.position.set(
            center.x + distance * Math.sin(angle) * Math.cos(elevation),
            center.y + distance * Math.sin(elevation) + size.y * 0.15,
            center.z + distance * Math.cos(angle) * Math.cos(elevation)
          );

          var lookTarget = new THREE.Vector3(center.x, center.y + size.y * 0.1, center.z);
          thumbCamera.lookAt(lookTarget);
          thumbCamera.near = Math.max(0.1, distance * 0.01);
          thumbCamera.far = distance * 10;
          thumbCamera.updateProjectionMatrix();

          renderer.render(thumbScene, thumbCamera);
          frames.push(renderer.domElement.toDataURL(opts.format, opts.quality));
        }

        // Cleanup
        while (thumbScene.children.length > 0) {
          var child = thumbScene.children[0];
          thumbScene.remove(child);
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(function(m) { if (m.dispose) m.dispose(); });
            } else if (child.material.dispose) {
              child.material.dispose();
            }
          }
        }

        resolve(frames);
      } catch (e) {
        console.error('[Thumbnail] CaptureRotation failed:', e);
        reject(e);
      }
    });
  }

  /**
   * Quick capture from current view (uses main renderer)
   * @param {Object} [options] - Options
   * @returns {Promise<string>} Base64 data URL
   */
  function captureCurrentView(options) {
    return new Promise(function(resolve, reject) {
      try {
        var opts = Object.assign({}, DEFAULT_OPTIONS, options);

        // Get main renderer, scene, camera
        var renderer = global.renderer;
        var scene = global.scene;
        var camera = global.camera;

        if (!renderer || !scene || !camera) {
          reject(new Error('Main renderer/scene/camera not available'));
          return;
        }

        // Store original size
        var originalSize = renderer.getSize(new THREE.Vector2());
        var originalPixelRatio = renderer.getPixelRatio();

        // Resize for capture
        renderer.setSize(opts.width, opts.height);
        renderer.setPixelRatio(1);

        // Force render
        renderer.render(scene, camera);

        // Get data URL
        var dataURL = renderer.domElement.toDataURL(opts.format, opts.quality);

        // Restore original size
        renderer.setSize(originalSize.x, originalSize.y);
        renderer.setPixelRatio(originalPixelRatio);

        // Re-render at original size
        renderer.render(scene, camera);

        resolve(dataURL);
      } catch (e) {
        console.error('[Thumbnail] CaptureCurrentView failed:', e);
        reject(e);
      }
    });
  }

  // =============================================================================
  // Public API
  // =============================================================================

  global.CubikThumbnail = {
    // Main capture methods
    capture: capture,
    captureAsBlob: captureAsBlob,
    captureRotation: captureRotation,
    captureCurrentView: captureCurrentView,

    // Cleanup
    dispose: disposeThumbRenderer,

    // Default options (for reference)
    DEFAULT_OPTIONS: DEFAULT_OPTIONS
  };

  // Backward compatibility / shorthand
  global.captureProjectThumbnail = capture;
  global.captureProjectThumbnailAsBlob = captureAsBlob;

  console.log('[CubikThumbnail] Module loaded');

})(window);
