/**
 * Cubik Builder - Backend API Module
 * @module backend-api
 * @description Unified API for backend integration - exports project data bundle
 * @author Andrey Bovdurets
 * @version 1.1
 * @date 2026-01-16
 * 
 * v1.1 - Added getZen2FlatFaces() for Zen/2 face type fallback (top/bottom → Bion)
 * 
 * Этот модуль предоставляет единый метод для получения всех данных проекта:
 * - JSON snapshot
 * - Цена
 * - Иконка (thumbnail)
 * - GLB модель
 */
(function(global) {
  'use strict';

  // =============================================================================
  // Price Configuration
  // =============================================================================

  var PRICES_EUR = {
    'Bion': 1.95,
    'Zen': 2.05,
    'Void': 1.58,
    'Zen/2': 1.58,
    'Flora': 2.80
  };

  function getActivePrices() {
    var pc = global.CubikPartnerConfig;
    return (pc && pc.prices) ? pc.prices : PRICES_EUR;
  }

  function getActiveCurrency() {
    var pc = global.CubikPartnerConfig;
    return (pc && pc.currency) ? pc.currency : 'EUR';
  }

  // =============================================================================
  // Helper Functions
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

  // =============================================================================
  // Price Calculation
  // =============================================================================

  /**
   * Возвращает плоские грани Zen/2 (в локальных координатах).
   * Всегда top и bottom, независимо от rotation.
   * @returns {Array} массив имён плоских граней
   */
  function getZen2FlatFaces() {
    return ['top', 'bottom'];
  }

  /**
   * Build facet map from objects
   * @returns {Object} map[faceType][colorHex] = count
   */
  function buildFacetMap() {
    var objects = getObjectsArray();
    var map = {};

    function inc(type, color, n) {
      if (!map[type]) map[type] = {};
      if (!map[type][color]) map[type][color] = 0;
      map[type][color] += n;
    }

    function matBaseHex(mat) {
      if (!mat) return '#7D7F7D';
      if (mat.userData && mat.userData.baseHex) return mat.userData.baseHex;
      if (mat.color) return '#' + mat.color.getHexString().toUpperCase();
      return '#7D7F7D';
    }

    for (var i = 0; i < objects.length; i++) {
      var o = objects[i];
      if (!o || !o.userData) continue;

      if (o.userData.solid) {
        var type = o.userData.kind || 'Unknown';
        var hex = matBaseHex(o.material);

        // Zen/2 special: 4 Zen/2 faces + 2 Bion faces
        if (type === 'Zen/2') {
          inc('Zen/2', hex, 4);
          inc('Bion', hex, 2);
        } else {
          inc(type, hex, 6);
        }

      } else if (o.userData.faces) {
        var dirs = ['top', 'bottom', 'front', 'back', 'left', 'right'];
        
        // Для Zen/2: плоские грани всегда top/bottom
        var zen2FlatFaces = (o.userData.kind === 'Zen/2') ? getZen2FlatFaces() : [];
        
        for (var j = 0; j < dirs.length; j++) {
          var d = dirs[j];
          var f = o.userData.faces[d];
          if (!f) continue;

          var t = (o.userData.faceTypes && o.userData.faceTypes[d])
            ? o.userData.faceTypes[d]
            : null;

          // Fallback for Zen/2: плоские грани → Bion (зависит от rotation)
          if (!t) {
            if (o.userData.kind === 'Zen/2' && zen2FlatFaces.indexOf(d) !== -1) {
              t = 'Bion';
            } else {
              t = o.userData.kind || 'Unknown';
            }
          }

          var hx = matBaseHex(f.material);
          inc(t, hx, 1);
        }
      }
    }

    return map;
  }

  /**
   * Calculate total price from facet map
   * @param {Object} [map] - Facet map, will be computed if not provided
   * @returns {number} Total price in EUR
   */
  function calculatePrice(map) {
    if (!map) map = buildFacetMap();

    var total = 0;
    for (var type in map) {
      if (!Object.prototype.hasOwnProperty.call(map, type)) continue;
      var bucket = map[type];
      if (!bucket) continue;

      var facets = 0;
      for (var colorHex in bucket) {
        if (!Object.prototype.hasOwnProperty.call(bucket, colorHex)) continue;
        facets += bucket[colorHex];
      }

      var prices = getActivePrices();
      var unit = prices.hasOwnProperty(type) ? prices[type] : 0;
      total += facets * unit;
    }

    return +total.toFixed(2);
  }

  /**
   * Get detailed price breakdown
   * @returns {Object} { total, breakdown: [{type, facets, unitPrice, subtotal}], currency }
   */
  function getPriceDetails() {
    var map = buildFacetMap();
    var prices = getActivePrices();
    var breakdown = [];
    var total = 0;

    for (var type in map) {
      if (!Object.prototype.hasOwnProperty.call(map, type)) continue;
      var bucket = map[type];
      if (!bucket) continue;

      var facets = 0;
      for (var colorHex in bucket) {
        if (!Object.prototype.hasOwnProperty.call(bucket, colorHex)) continue;
        facets += bucket[colorHex];
      }

      var unit = prices.hasOwnProperty(type) ? prices[type] : 0;
      var subtotal = +(facets * unit).toFixed(2);
      total += subtotal;

      breakdown.push({
        type: type,
        facets: facets,
        unitPrice: unit,
        subtotal: subtotal
      });
    }

    return {
      total: +total.toFixed(2),
      breakdown: breakdown,
      currency: getActiveCurrency()
    };
  }

  // =============================================================================
  // GLB Export (as Blob, without download)
  // =============================================================================

  /**
   * Generate GLB model as Blob
   * @returns {Promise<Blob>} GLB blob
   */
  function generateGLB() {
    return new Promise(function(resolve, reject) {
      if (typeof THREE === 'undefined' || typeof THREE.GLTFExporter === 'undefined') {
        reject(new Error('GLTFExporter not available'));
        return;
      }

      var buildExportGroup = global.buildExportGroup;
      if (typeof buildExportGroup !== 'function') {
        reject(new Error('buildExportGroup not available'));
        return;
      }

      try {
        var exporter = new THREE.GLTFExporter();
        var root = buildExportGroup();

        exporter.parse(root, function(result) {
          try {
            var blob = new Blob([result], { type: 'model/gltf-binary' });
            resolve(blob);
          } catch (e) {
            reject(e);
          }
        }, function(error) {
          reject(error);
        }, {
          binary: true,
          onlyVisible: true,
          trs: false
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  // =============================================================================
  // Main Export Function
  // =============================================================================

  /**
   * Get complete project data bundle for backend
   * @param {Object} [options] - Options
   * @param {string} [options.name] - Project name
   * @param {number} [options.thumbnailWidth=512] - Thumbnail width
   * @param {number} [options.thumbnailHeight=512] - Thumbnail height
   * @param {string} [options.thumbnailFormat='image/png'] - Thumbnail format
   * @param {boolean} [options.includeGLB=true] - Include GLB model
   * @param {boolean} [options.includeThumbnail=true] - Include thumbnail
   * @returns {Promise<Object>} Project data bundle
   */
  function getProjectData(options) {
    var opts = Object.assign({
      name: 'Cubik Project',
      thumbnailWidth: 512,
      thumbnailHeight: 512,
      thumbnailFormat: 'image/png',
      includeGLB: true,
      includeThumbnail: true
    }, options);

    return new Promise(function(resolve, reject) {
      try {
        // 1. Get snapshot
        var snapshotScene = global.snapshotScene;
        if (typeof snapshotScene !== 'function') {
          reject(new Error('snapshotScene not available'));
          return;
        }

        var snapshot = snapshotScene();
        var objects = getObjectsArray();

        // 2. Calculate price
        var priceDetails = getPriceDetails();

        // 3. Build result object
        var result = {
          name: opts.name,
          version: '1.2',
          timestamp: Date.now(),
          
          // JSON data
          snapshot: snapshot,
          objectCount: objects.length,
          
          // Price
          price: priceDetails.total,
          priceDetails: priceDetails,
          currency: getActiveCurrency(),
          
          // Will be filled below
          thumbnail: null,
          thumbnailBlob: null,
          glb: null
        };

        // 4. Generate thumbnail and GLB in parallel
        var promises = [];

        if (opts.includeThumbnail && global.CubikThumbnail) {
          var thumbPromise = global.CubikThumbnail.capture({
            width: opts.thumbnailWidth,
            height: opts.thumbnailHeight,
            format: opts.thumbnailFormat
          }).then(function(dataURL) {
            result.thumbnail = dataURL;
          }).catch(function(e) {
            console.warn('[BackendAPI] Thumbnail generation failed:', e);
            result.thumbnail = null;
          });
          promises.push(thumbPromise);

          // Also get as blob
          var thumbBlobPromise = global.CubikThumbnail.captureAsBlob({
            width: opts.thumbnailWidth,
            height: opts.thumbnailHeight,
            format: opts.thumbnailFormat
          }).then(function(blob) {
            result.thumbnailBlob = blob;
          }).catch(function(e) {
            result.thumbnailBlob = null;
          });
          promises.push(thumbBlobPromise);
        }

        if (opts.includeGLB) {
          var glbPromise = generateGLB().then(function(blob) {
            result.glb = blob;
          }).catch(function(e) {
            console.warn('[BackendAPI] GLB generation failed:', e);
            result.glb = null;
          });
          promises.push(glbPromise);
        }

        // 5. Wait for all and resolve
        Promise.all(promises).then(function() {
          resolve(result);
        }).catch(function(e) {
          // Still resolve with partial data
          resolve(result);
        });

      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Get project data as FormData (ready to send)
   * @param {Object} [options] - Same as getProjectData + projectId
   * @returns {Promise<FormData>} FormData ready to POST
   */
  function getProjectFormData(options) {
    var opts = Object.assign({
      projectId: null
    }, options);

    return getProjectData(opts).then(function(data) {
      var formData = new FormData();

      // Project metadata
      if (opts.projectId) {
        formData.append('projectId', opts.projectId);
      }
      formData.append('name', data.name);
      formData.append('timestamp', data.timestamp.toString());
      formData.append('objectCount', data.objectCount.toString());

      // Price
      formData.append('price', data.price.toString());
      formData.append('currency', data.currency);
      formData.append('priceDetails', JSON.stringify(data.priceDetails));

      // Partner tracking
      var pc = global.CubikPartnerConfig;
      if (pc && pc.partnerId) {
        formData.append('partner', pc.partnerId);
      }

      // JSON snapshot
      var snapshotBlob = new Blob([JSON.stringify({
        name: data.name,
        version: data.version,
        timestamp: data.timestamp,
        snapshot: data.snapshot
      })], { type: 'application/json' });
      formData.append('project', snapshotBlob, 'project.json');

      // Thumbnail
      if (data.thumbnailBlob) {
        var ext = opts.thumbnailFormat === 'image/jpeg' ? 'jpg' : 'png';
        formData.append('thumbnail', data.thumbnailBlob, 'thumbnail.' + ext);
      }

      // GLB
      if (data.glb) {
        formData.append('model', data.glb, 'model.glb');
      }

      return formData;
    });
  }

  /**
   * Send project to backend endpoint
   * @param {string} url - Backend URL
   * @param {Object} [options] - Options (same as getProjectData)
   * @returns {Promise<Response>} Fetch response
   */
  function sendToBackend(url, options) {
    return getProjectFormData(options).then(function(formData) {
      return fetch(url, {
        method: 'POST',
        body: formData
      });
    });
  }

  // =============================================================================
  // Quick Access Functions
  // =============================================================================

  /**
   * Get just the JSON + price (no GLB/thumbnail)
   * @param {string} [name] - Project name
   * @returns {Object} { snapshot, price, priceDetails, objectCount }
   */
  function getProjectJSON(name) {
    var snapshotScene = global.snapshotScene;
    if (typeof snapshotScene !== 'function') {
      throw new Error('snapshotScene not available');
    }

    var snapshot = snapshotScene();
    var priceDetails = getPriceDetails();
    var objects = getObjectsArray();

    return {
      name: name || 'Cubik Project',
      version: '1.2',
      timestamp: Date.now(),
      snapshot: snapshot,
      objectCount: objects.length,
      price: priceDetails.total,
      priceDetails: priceDetails,
      currency: getActiveCurrency()
    };
  }

  // =============================================================================
  // Public API
  // =============================================================================

  global.CubikBackendAPI = {
    // Main export function
    getProjectData: getProjectData,
    getProjectFormData: getProjectFormData,
    sendToBackend: sendToBackend,

    // Quick access
    getProjectJSON: getProjectJSON,
    
    // Price functions
    calculatePrice: calculatePrice,
    getPriceDetails: getPriceDetails,
    buildFacetMap: buildFacetMap,
    
    // GLB generation
    generateGLB: generateGLB,

    // Price configuration (active, respects partner config)
    get PRICES() { return getActivePrices(); }
  };

  // Shorthand global functions
  global.getProjectData = getProjectData;
  global.getProjectFormData = getProjectFormData;
  global.sendProjectToBackend = sendToBackend;

  console.log('[CubikBackendAPI] Module loaded');

})(window);
