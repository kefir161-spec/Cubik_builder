/**
 * Cubik Builder - PDF Instructions Module
 * @module pdf-instructions
 * @description IKEA-style PDF assembly instructions generator
 * @author Andrey Bovdurets
 * @version 3.0
 */
(function(global) {
  'use strict';

  // =============================================================================
  // Dependencies (from global scope)
  // =============================================================================
  
  function getObjects() {
    if (typeof global.getObjects === 'function') return global.getObjects();
    return global.objects || [];
  }
  
  function getCamera() { return global.camera; }
  function getControls() { return global.controls; }
  function getRenderer() { return global.renderer; }
  function getScene() { return global.scene; }
  function showMsg(text, success) {
    if (typeof global.msg === 'function') global.msg(text, success);
  }

  // =============================================================================
  // Scene Decomposition for Assembly Instructions
  // =============================================================================

  /**
   * Get complete decomposition of scene for assembly instructions
   * @returns {Object} - Detailed scene decomposition
   */
  function getSceneDecomposition() {
    var objects = getObjects();
    var result = {
      totalBlocks: objects.length,
      blocks: [],
      summary: {
        byKind: {},
        byColor: {},
        byFaceType: {}
      }
    };

    var dirs = ['top', 'bottom', 'front', 'back', 'left', 'right'];

    function getMaterialHex(mat) {
      if (!mat) return '#7D7F7D';
      if (mat.userData && mat.userData.baseHex) return mat.userData.baseHex;
      if (mat.color) return '#' + mat.color.getHexString().toUpperCase();
      return '#7D7F7D';
    }

    function quaternionToOrientation(q) {
      var euler = new THREE.Euler().setFromQuaternion(q, 'XYZ');
      var degX = Math.round(THREE.MathUtils.radToDeg(euler.x));
      var degY = Math.round(THREE.MathUtils.radToDeg(euler.y));
      var degZ = Math.round(THREE.MathUtils.radToDeg(euler.z));
      
      degX = ((degX % 360) + 360) % 360;
      degY = ((degY % 360) + 360) % 360;
      degZ = ((degZ % 360) + 360) % 360;
      
      return {
        euler: { x: degX, y: degY, z: degZ },
        quaternion: { x: q.x.toFixed(4), y: q.y.toFixed(4), z: q.z.toFixed(4), w: q.w.toFixed(4) },
        readable: 'X:' + degX + '° Y:' + degY + '° Z:' + degZ + '°'
      };
    }

    for (var i = 0; i < objects.length; i++) {
      var o = objects[i];
      if (!o || !o.userData) continue;

      var blockInfo = {
        index: i,
        kind: o.userData.kind || 'Unknown',
        position: {
          x: parseFloat(o.position.x.toFixed(3)),
          y: parseFloat(o.position.y.toFixed(3)),
          z: parseFloat(o.position.z.toFixed(3))
        },
        orientation: quaternionToOrientation(o.quaternion),
        faces: {}
      };

      var kindName = blockInfo.kind;
      result.summary.byKind[kindName] = (result.summary.byKind[kindName] || 0) + 1;

      // Zen/2 flat faces are top/bottom (Bion type) - this is a PHYSICAL constraint
      // Zen/2 geometry has slots only on 4 side faces, top/bottom are always flat
      var zen2FlatFaces = ['top', 'bottom'];
      var isZen2 = (o.userData.kind === 'Zen/2');
      
      // Check if this is a Zen/2-based block (native Zen/2 or custom kind with Zen/2 faces)
      var isZen2Based = isZen2;
      if (!isZen2Based && o.userData.faceTypes) {
        // Check if any face has Zen/2 type - indicates this is a Zen/2-based block
        for (var checkDir in o.userData.faceTypes) {
          if (o.userData.faceTypes[checkDir] === 'Zen/2') {
            isZen2Based = true;
            break;
          }
        }
      }
      
      if (o.userData.faces) {
        for (var j = 0; j < dirs.length; j++) {
          var dir = dirs[j];
          var f = o.userData.faces[dir];
          if (!f) continue;

          var storedFaceType = (o.userData.faceTypes && o.userData.faceTypes[dir]) || null;
          var faceType;
          
          // PRIORITY: Use stored face type if it exists
          if (storedFaceType) {
            faceType = storedFaceType;
            
            // PHYSICAL CONSTRAINT CORRECTION:
            // For Zen/2-based blocks, top/bottom faces CANNOT have Zen/2 geometry (no slots there)
            // If incorrectly saved as 'Zen/2', correct to 'Bion'
            if (isZen2Based && faceType === 'Zen/2' && zen2FlatFaces.indexOf(dir) !== -1) {
              faceType = 'Bion';
            }
          } else if (isZen2Based) {
            // No stored type for Zen/2-based: apply default structure (top/bottom = Bion, others = Zen/2)
            faceType = (zen2FlatFaces.indexOf(dir) !== -1) ? 'Bion' : 'Zen/2';
          } else {
            // Non-Zen/2 without stored type: use block kind
            faceType = o.userData.kind || 'Unknown';
          }
          
          var faceColor = getMaterialHex(f.material);

          blockInfo.faces[dir] = { type: faceType, color: faceColor };
          result.summary.byFaceType[faceType] = (result.summary.byFaceType[faceType] || 0) + 1;
          result.summary.byColor[faceColor] = (result.summary.byColor[faceColor] || 0) + 1;
        }
      } else if (o.userData.solid) {
        var solidColor = getMaterialHex(o.material);
        var solidKind = o.userData.kind || 'Unknown';
        
        // For Zen/2 solid blocks: top/bottom are Bion, others are Zen/2
        var isSolidZen2 = (solidKind === 'Zen/2');
        
        for (var k = 0; k < dirs.length; k++) {
          var solidDir = dirs[k];
          var solidFaceType = solidKind;
          
          if (isSolidZen2) {
            // Apply correct Zen/2 structure: top/bottom = Bion, others = Zen/2
            solidFaceType = (solidDir === 'top' || solidDir === 'bottom') ? 'Bion' : 'Zen/2';
          }
          
          blockInfo.faces[solidDir] = { type: solidFaceType, color: solidColor };
          result.summary.byFaceType[solidFaceType] = (result.summary.byFaceType[solidFaceType] || 0) + 1;
          result.summary.byColor[solidColor] = (result.summary.byColor[solidColor] || 0) + 1;
        }
      }

      result.blocks.push(blockInfo);
    }

    return result;
  }

  /**
   * Print scene decomposition to console
   */
  function printDecomposition() {
    var data = getSceneDecomposition();
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  SCENE DECOMPOSITION - ' + data.totalBlocks + ' BLOCKS');
    console.log('═══════════════════════════════════════════════════════════');
    
    console.log('\n📊 SUMMARY:');
    console.log('───────────────────────────────────────────────────────────');
    
    console.log('\n  By Block Kind:');
    for (var kind in data.summary.byKind) {
      console.log('    ' + kind + ': ' + data.summary.byKind[kind]);
    }
    
    console.log('\n  By Face Type:');
    for (var fType in data.summary.byFaceType) {
      console.log('    ' + fType + ': ' + data.summary.byFaceType[fType]);
    }
    
    console.log('\n  By Color:');
    for (var color in data.summary.byColor) {
      console.log('    ' + color + ': ' + data.summary.byColor[color]);
    }
    
    console.log('\n\n🧱 BLOCKS DETAIL:');
    console.log('───────────────────────────────────────────────────────────');
    
    for (var i = 0; i < data.blocks.length; i++) {
      var b = data.blocks[i];
      console.log('\n  Block #' + b.index + ' [' + b.kind + ']');
      console.log('    Position: X=' + b.position.x + ', Y=' + b.position.y + ', Z=' + b.position.z);
      console.log('    Orientation: ' + b.orientation.readable);
      console.log('    Faces:');
      
      for (var dir in b.faces) {
        var f = b.faces[dir];
        console.log('      ' + dir.toUpperCase().padEnd(7) + ' → ' + f.type.padEnd(8) + ' ' + f.color);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  Use getSceneDecomposition() to get raw JSON data');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    return data;
  }

  /**
   * Export decomposition as JSON file
   */
  function exportDecomposition() {
    var data = getSceneDecomposition();
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'scene-decomposition.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      URL.revokeObjectURL(url);
      try { a.remove(); } catch(e) {}
    }, 100);
    showMsg('Decomposition exported', true);
    return data;
  }

  // =============================================================================
  // PDF Renderer Utilities
  // =============================================================================

  var _pdfRenderer = null;

  function getPdfRenderer(w, h) {
    if (!_pdfRenderer) {
      _pdfRenderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
        alpha: true
      });
      _pdfRenderer.shadowMap.enabled = true;
      _pdfRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if (typeof global.setupColorPipeline === 'function') {
        global.setupColorPipeline(_pdfRenderer);
      }
    }
    _pdfRenderer.setSize(w, h);
    _pdfRenderer.setPixelRatio(1);
    return _pdfRenderer;
  }

  function createPdfScene() {
    var sc = new THREE.Scene();
    // Light gray background for better contrast with white/black cubes
    sc.background = new THREE.Color('#F5F5F5');
    
    var ambient = new THREE.AmbientLight(0xffffff, 0.5);
    sc.add(ambient);
    
    var keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(5, 10, 7);
    sc.add(keyLight);
    
    var fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-5, 5, -5);
    sc.add(fillLight);
    
    var rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 5, -10);
    sc.add(rimLight);
    
    return sc;
  }

  /**
   * Add edge lines to an object for better visibility
   * @param {THREE.Object3D} obj - Object to add edges to
   * @param {THREE.Scene} scene - Scene to add edge lines to
   * @param {number} edgeColor - Color for edge lines (hex)
   */
  // Colors for part labels (distinct, easy to see)
  var partLabelColors = [
    '#E53935', // Red
    '#1E88E5', // Blue
    '#43A047', // Green
    '#FB8C00', // Orange
    '#8E24AA', // Purple
    '#00ACC1', // Cyan
    '#F4511E', // Deep Orange
    '#3949AB', // Indigo
    '#7CB342', // Light Green
    '#C0CA33', // Lime
    '#EC407A', // Pink
    '#5C6BC0', // Blue Grey
    '#26A69A', // Teal
    '#D81B60', // Pink Dark
    '#039BE5', // Light Blue
    '#FFB300', // Amber
    '#6D4C41', // Brown
    '#00897B', // Teal Dark
    '#546E7A', // Blue Grey Dark
    '#757575'  // Grey
  ];

  // Letters array for part labels
  var partLetters = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];

  /**
   * Convert number to letter (1=A, 2=B, etc.)
   */
  function numberToLetter(num) {
    if (num <= 26) {
      return partLetters[num - 1];
    } else {
      // AA, AB, etc. for > 26
      var first = Math.floor((num - 1) / 26);
      var second = ((num - 1) % 26);
      return partLetters[first - 1] + partLetters[second];
    }
  }

  /**
   * Create a sprite with a letter label
   * @param {number} partNumber - Part number (1-based)
   * @returns {THREE.Sprite} - Sprite with the letter
   */
  function createNumberSprite(partNumber) {
    var canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    var ctx = canvas.getContext('2d');
    
    // Get color for this part
    var colorIndex = (partNumber - 1) % partLabelColors.length;
    var bgColor = partLabelColors[colorIndex];
    
    // Draw circle background with part color
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw white border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw letter
    var letter = numberToLetter(partNumber);
    ctx.fillStyle = 'white';
    ctx.font = 'bold ' + (letter.length > 1 ? '44' : '56') + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, 64, 68);
    
    var texture = new THREE.CanvasTexture(canvas);
    var material = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      depthTest: true,  // Hidden labels behind cubes
      depthWrite: false
    });
    var sprite = new THREE.Sprite(material);
    sprite.scale.set(0.3, 0.3, 1); // Smaller labels
    
    return sprite;
  }

  function addEdgeLines(obj, scene, edgeColor, light) {
    edgeColor = edgeColor || 0x333333;
    var edgeObjects = [];
    
    obj.traverse(function(child) {
      if (child.isMesh && child.geometry) {
        try {
          var edgesGeom = new THREE.EdgesGeometry(child.geometry, 15); // 15 degree threshold
          var lineMat = new THREE.LineBasicMaterial({ 
            color: edgeColor,
            linewidth: 1,
            transparent: light ? true : false,
            opacity: light ? 0.5 : 1.0
          });
          var lineSegments = new THREE.LineSegments(edgesGeom, lineMat);
          
          // Add as child to the mesh so it inherits transforms automatically
          child.add(lineSegments);
          
          edgeObjects.push(lineSegments);
        } catch(e) {}
      }
    });
    
    return edgeObjects;
  }

  /**
   * Create a drop shadow under an object
   * @param {THREE.Box3} bounds - Bounding box of the object
   * @param {THREE.Scene} scene - Scene to add shadow to
   */
  function addDropShadow(bounds, scene) {
    var center = new THREE.Vector3();
    bounds.getCenter(center);
    var size = new THREE.Vector3();
    bounds.getSize(size);
    
    // Create elliptical shadow plane slightly below the object
    var shadowRadius = Math.max(size.x, size.z) * 0.6;
    var shadowGeom = new THREE.CircleGeometry(shadowRadius, 32);
    var shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    var shadow = new THREE.Mesh(shadowGeom, shadowMat);
    
    // Position below the object, rotated to be horizontal
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(center.x, bounds.min.y - 0.02, center.z);
    
    scene.add(shadow);
    return shadow;
  }

  function cloneObjectsWithOpacity(sourceObjects, targetScene, opacity, visibleFilter, partNumberMap, addEdges) {
    // addEdges: true to add edge lines (for transparent views), false to skip (for solid views)
    if (addEdges === undefined) addEdges = true; // Default: add edges for backward compatibility
    
    sourceObjects.forEach(function(obj, idx) {
      if (!obj) return;
      if (visibleFilter && !visibleFilter(obj, idx)) return;
      
      try {
        var clone = obj.clone(true);
        clone.traverse(function(child) {
          if (child.isMesh && child.material) {
            child.material = child.material.clone();
            // For opacity 1.0, use opaque material (no transparency)
            // For opacity < 1.0, use transparent material
            if (opacity >= 1.0) {
              child.material.transparent = false;
              child.material.opacity = 1.0;
              child.material.depthWrite = true;
            } else {
              child.material.transparent = true;
              child.material.opacity = opacity;
              child.material.depthWrite = false;
            }
            child.material.needsUpdate = true;
          }
        });
        targetScene.add(clone);
        
        // Add light edge lines only if requested (for transparent views)
        if (addEdges) {
          addEdgeLines(clone, targetScene, 0x555555, true);
        }
        
        // Add part label sprite if mapping provided
        if (partNumberMap && partNumberMap[idx] !== undefined) {
          var sprite = createNumberSprite(partNumberMap[idx]);
          // Position above the cube (like a sticker on top)
          sprite.position.set(
            obj.position.x,
            obj.position.y + 0.55, // Above the cube top
            obj.position.z
          );
          targetScene.add(sprite);
        }
      } catch(e) {}
    });
  }

  function setupPdfCamera(cam, bounds, viewType) {
    var center = new THREE.Vector3();
    bounds.getCenter(center);
    var size = new THREE.Vector3();
    bounds.getSize(size);
    
    var fov = cam.fov * (Math.PI / 180);
    var maxDim, padding;
    
    if (viewType === 'iso' || viewType === 'iso_back') {
      // For isometric views, calculate 3D diagonal
      var diagXZ = Math.sqrt(size.x * size.x + size.z * size.z);
      var diag3D = Math.sqrt(diagXZ * diagXZ + size.y * size.y);
      maxDim = diag3D;
      
      // Adaptive padding based on object size
      // Goal: LARGE, READABLE pictures for assembly instructions
      // For layer-by-layer assembly, prioritize readability over preventing minor clipping
      var objectSize = Math.max(size.x, size.y, size.z);
      
      // Much more aggressive approach for layer renders - bring camera closer
      // Users need to see details clearly to assemble, so prioritize large, readable images
      var minPadding = 1.1; // Very close for small objects - fills frame
      var maxPadding = 1.4; // Still close even for large objects - keeps them readable
      
      // Use gentle scaling - keep padding low to ensure large, readable renders
      var normalizedSize = Math.min(objectSize / 15.0, 1.0); // Normalize to 0-1
      var sqrtFactor = Math.sqrt(normalizedSize); // Square root scale 0-1
      
      padding = minPadding + (maxPadding - minPadding) * sqrtFactor;
      
      // For very large objects, still keep padding low to maintain readability
      if (objectSize > 8.0) {
        padding = 1.3; // Fixed low padding for large objects - keeps them large and readable
      }
      
      // Clamp to safe range - prioritize readability
      padding = Math.max(1.1, Math.min(1.4, padding));
    } else if (viewType === 'top') {
      maxDim = Math.max(size.x, size.z);
      padding = 1.5;
    } else {
      maxDim = Math.max(size.x, size.y, size.z);
      padding = 1.5;
    }
    
    var distance = (maxDim / 2) / Math.tan(fov / 2);
    distance *= padding;
    distance = Math.max(distance, 2.0);
    
    switch(viewType) {
      case 'front':
        cam.position.set(center.x, center.y, center.z + distance);
        break;
      case 'right':
        cam.position.set(center.x + distance, center.y, center.z);
        break;
      case 'top':
        cam.position.set(center.x, center.y + distance, center.z + 0.001);
        break;
      case 'iso_back':
        // Isometric view from back-right (opposite corner)
        var db = distance * 0.58;
        cam.position.set(center.x - db, center.y + db * 0.7, center.z - db);
        break;
      case 'iso':
      default:
        var d = distance * 0.58;
        cam.position.set(center.x + d, center.y + d * 0.7, center.z + d);
        break;
    }
    
    cam.lookAt(center);
    cam.near = 0.1;
    cam.far = distance * 20;
    cam.updateProjectionMatrix();
  }

  function renderWhiteBg(viewType, opacity, visibleFilter, partNumberMap, addEdges) {
    var objects = getObjects();
    var sc = createPdfScene();
    // For solid views (opacity 1.0), don't add edges. For transparent views, add edges.
    var shouldAddEdges = (addEdges !== undefined) ? addEdges : (opacity < 1.0);
    cloneObjectsWithOpacity(objects, sc, opacity, visibleFilter, partNumberMap, shouldAddEdges);
    
    var bounds = new THREE.Box3();
    sc.traverse(function(child) {
      if (child.isMesh) bounds.expandByObject(child);
    });
    
    var cam = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    setupPdfCamera(cam, bounds, viewType);
    
    var rend = getPdfRenderer(1024, 1024); // Higher resolution for better quality
    rend.render(sc, cam);
    
    var dataURL = rend.domElement.toDataURL('image/png');
    
    while (sc.children.length > 0) {
      var ch = sc.children[0];
      sc.remove(ch);
      if (ch.geometry && ch.geometry.dispose) ch.geometry.dispose();
      if (ch.material) {
        if (Array.isArray(ch.material)) {
          ch.material.forEach(function(m) { if (m.dispose) m.dispose(); });
        } else if (ch.material.dispose) {
          ch.material.dispose();
        }
      }
    }
    
    return dataURL;
  }

  /**
   * Render a single cube by its index for parts list preview
   * @param {number} objectIndex - Index of the object in objects array
   * @param {number} size - Render size in pixels
   * @returns {string} - Data URL of the rendered image
   */
  function renderSingleCube(objectIndex, size) {
    var objects = getObjects();
    var obj = objects[objectIndex];
    if (!obj) return null;
    
    size = size || 256;
    var sc = createPdfScene();
    
    // Clone the single cube with transparency (for Parts List)
    var clone;
    try {
      clone = obj.clone(true);
      clone.traverse(function(child) {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 0.6;
          child.material.depthWrite = true; // Enable depth write to remove reflection effect
          child.material.needsUpdate = true;
        }
      });
      sc.add(clone);
    } catch(e) {
      return null;
    }
    
    // Calculate bounds BEFORE moving to get accurate size
    var bounds = new THREE.Box3().setFromObject(clone);
    var center = new THREE.Vector3();
    bounds.getCenter(center);
    var bSize = new THREE.Vector3();
    bounds.getSize(bSize);
    
    // Move clone so its center is at origin
    clone.position.sub(center);
    
    // Add edge lines for better visibility (for Parts List previews)
    // Using dark color for strong contrast
    addEdgeLines(clone, sc, 0x222222, false);
    
    // Setup isometric camera - looking at origin now
    // Use closer camera for single cube previews to fill frame better
    var cam = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    var maxDim = Math.max(bSize.x, bSize.y, bSize.z);
    // Reduced multiplier (1.2 instead of 1.4) to bring camera closer for better fill
    var distance = (maxDim * 1.2) / Math.tan((cam.fov * Math.PI / 180) / 2);
    distance = Math.max(distance, 2.0);
    
    // Isometric-like angle from origin - closer position
    var d = distance * 0.6; // Reduced from 0.65 to bring camera closer
    cam.position.set(d, d * 0.8, d);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    
    var rend = getPdfRenderer(size, size);
    rend.render(sc, cam);
    
    var dataURL = rend.domElement.toDataURL('image/png');
    
    // Cleanup
    while (sc.children.length > 0) {
      var ch = sc.children[0];
      sc.remove(ch);
      if (ch.geometry && ch.geometry.dispose) ch.geometry.dispose();
      if (ch.material) {
        if (Array.isArray(ch.material)) {
          ch.material.forEach(function(m) { if (m.dispose) m.dispose(); });
        } else if (ch.material.dispose) {
          ch.material.dispose();
        }
      }
    }
    
    return dataURL;
  }

  // =============================================================================
  // PDF Generation Helpers
  // =============================================================================

  var colorNames = {
    '#7D7F7D': 'gray', '#7d7f7d': 'gray',
    '#E1B589': 'beige', '#e1b589': 'beige',
    '#0A6F3C': 'green', '#0a6f3c': 'green',
    '#F4F4F4': 'white', '#f4f4f4': 'white',
    '#0A0A0A': 'black', '#0a0a0a': 'black'
  };

  function getColorName(hex) {
    return colorNames[hex] || colorNames[hex.toUpperCase()] || 'colored';
  }

  function describeCube(blk) {
    var faceCount = {};
    var dirs = ['top', 'bottom', 'front', 'back', 'left', 'right'];
    
    dirs.forEach(function(dir) {
      if (blk.faces[dir]) {
        var fType = blk.faces[dir].type || 'Void';
        var fColor = blk.faces[dir].color || '#7D7F7D';
        if (fType.indexOf('FromEdited') === 0 || fType.indexOf('_') !== -1) {
          fType = 'Custom';
        }
        var key = fType + '|' + getColorName(fColor);
        faceCount[key] = (faceCount[key] || 0) + 1;
      }
    });
    
    var parts = [];
    for (var key in faceCount) {
      var split = key.split('|');
      parts.push(faceCount[key] + 'x ' + split[0] + ' ' + split[1]);
    }
    
    return parts.join(' + ');
  }

  function cubeSignature(blk) {
    var faces = [];
    var dirs = ['top', 'bottom', 'front', 'back', 'left', 'right'];
    dirs.forEach(function(dir) {
      if (blk.faces[dir]) {
        var fType = blk.faces[dir].type || 'Void';
        var fColor = blk.faces[dir].color || '#7D7F7D';
        faces.push(dir + ':' + fType + ':' + fColor);
      }
    });
    return faces.sort().join('|');
  }

  // =============================================================================
  // Main PDF Generator
  // =============================================================================

  /**
   * Function to load logo image as base64
   */
  function loadLogoAsBase64() {
    try {
      var logoPath = (window.CUBIK_ICONS_BASE || '/3dbuilder/icons/') + 'cubikone-57bd1f3988.png?v=1742';
      // Use fetch to load and convert to base64
      return fetch(logoPath)
        .then(function(response) {
          if (!response.ok) throw new Error('Failed to fetch logo');
          return response.blob();
        })
        .then(function(blob) {
          return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onloadend = function() {
              resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        })
        .catch(function(err) {
          console.warn('Could not load logo:', err);
          return null;
        });
    } catch(e) {
      console.warn('Could not load logo:', e);
      return Promise.resolve(null);
    }
  }

  /**
   * Generate IKEA-style PDF assembly instructions
   */
  function generatePDFInstructions(options) {
    options = options || {};
    
    if (typeof global.jspdf === 'undefined') {
      console.error('jsPDF not loaded!');
      alert('jsPDF library not loaded. Please refresh the page.');
      return;
    }
    
    var jsPDF = global.jspdf.jsPDF;
    var objects = getObjects();
    var camera = getCamera();
    var controls = getControls();
    var renderer = getRenderer();
    
    var decomp = getSceneDecomposition();
    if (!decomp || decomp.totalBlocks === 0) {
      alert('Scene is empty!');
      return;
    }
    
    showMsg('Generating PDF...', true);
    
    // Load logo before generating PDF
    var logoPromise = loadLogoAsBase64();
    
    // Generate PDF after logo is loaded (or if it fails)
    logoPromise.then(function(logoData) {
      generatePDFWithLogo(logoData, jsPDF, objects, camera, controls, renderer, decomp);
    }).catch(function(err) {
      console.warn('Logo loading failed, generating PDF without logo:', err);
      generatePDFWithLogo(null, jsPDF, objects, camera, controls, renderer, decomp);
    });
  }
  
  /**
   * Internal function to generate PDF (called after logo is loaded)
   */
  function generatePDFWithLogo(logoImageData, jsPDF, objects, camera, controls, renderer, decomp) {
    
    var origCamPos = camera.position.clone();
    var origCamTarget = controls.target.clone();
    
    // Group cubes
    var cubeGroups = {};
    decomp.blocks.forEach(function(blk) {
      var sig = cubeSignature(blk);
      if (!cubeGroups[sig]) {
        cubeGroups[sig] = {
          description: describeCube(blk),
          blocks: [],
          mainColor: (blk.faces.top && blk.faces.top.color) || (blk.faces.front && blk.faces.front.color) || '#7D7F7D',
          sampleIndex: blk.index, // Store first cube index for preview render
          minY: blk.position.y // Track minimum Y level for sorting
        };
      } else {
        // Update minY if this block is lower
        if (blk.position.y < cubeGroups[sig].minY) {
          cubeGroups[sig].minY = blk.position.y;
        }
      }
      cubeGroups[sig].blocks.push(blk);
    });
    
    // Sort by Y level (bottom to top), then by quantity
    var partsList = Object.values(cubeGroups).sort(function(a, b) { 
      // First sort by minimum Y level (ascending - bottom first)
      var yDiff = a.minY - b.minY;
      if (Math.abs(yDiff) > 0.1) return yDiff;
      // Then by quantity (descending)
      return b.blocks.length - a.blocks.length; 
    });
    
    // Create mapping: objectIndex -> partNumber (1-based)
    var partNumberMap = {};
    partsList.forEach(function(part, partIndex) {
      part.blocks.forEach(function(blk) {
        partNumberMap[blk.index] = partIndex + 1; // 1-based numbering
      });
    });
    
    // Pre-render cube previews for parts list (higher resolution for quality)
    var cubePreviewsMap = {};
    partsList.forEach(function(part) {
      var preview = renderSingleCube(part.sampleIndex, 512);
      if (preview) {
        cubePreviewsMap[part.sampleIndex] = preview;
      }
    });
    
    // Create PDF
    var pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var pageW = 210, pageH = 297, margin = 12;
    var contentW = pageW - margin * 2;
    var y = margin;
    
    // PDF Helpers
    function text(str, x, yy, size, style, col) {
      pdf.setFontSize(size || 10);
      pdf.setFont('helvetica', style || 'normal');
      col = col || [40, 40, 40];
      pdf.setTextColor(col[0], col[1], col[2]);
      pdf.text(String(str), x, yy);
    }
    
    function rect(x, yy, w, h, color) {
      var r = parseInt(color.slice(1,3), 16);
      var g = parseInt(color.slice(3,5), 16);
      var b = parseInt(color.slice(5,7), 16);
      pdf.setFillColor(r, g, b);
      pdf.rect(x, yy, w, h, 'F');
      pdf.setDrawColor(150, 150, 150);
      pdf.rect(x, yy, w, h, 'S');
    }
    
    function addImage(img, x, yy, w, h, label) {
      pdf.addImage(img, 'PNG', x, yy, w, h);
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.3);
      pdf.rect(x, yy, w, h, 'S');
      if (label) {
        var tw = pdf.getTextWidth(label);
        text(label, x + w/2 - tw/2, yy + h + 4, 8, 'italic', [100,100,100]);
      }
    }
    
    // Function to add logo in bottom right corner
    function addBottomLogo() {
      if (logoImageData) {
        try {
          // Logo size - compact for bottom corner
          var logoWidth = 20; // Width in mm
          var logoHeight = 8; // Height in mm
          
          // Position in bottom right corner with small margin
          var logoMargin = 3; // Margin from edges
          var logoX = pageW - logoWidth - logoMargin;
          var logoY = pageH - logoHeight - logoMargin;
          
          pdf.addImage(logoImageData, 'PNG', logoX, logoY, logoWidth, logoHeight);
        } catch(e) {
          console.warn('Could not add bottom logo to PDF:', e);
        }
      }
    }
    
    // Function to add footer with contacts on each page
    function addFooter(isLastPage) {
      // On last page, raise footer to make room for logo
      var logoSpace = isLastPage ? (8 + 3 * 2) : 0; // Logo height + margins if last page
      var footerY = pageH - 6 - logoSpace;
      var footerHeight = 6;
      var lineHeight = 2; // Compact line height to prevent overlap
      
      // Draw subtle footer line
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.2);
      // Line position: footerY - footerHeight - offset (increase offset to raise the line)
      var lineOffset = 3; // Adjust this value to raise/lower the line (positive = raise)
      pdf.line(margin, footerY - footerHeight - lineOffset, pageW - margin, footerY - footerHeight - lineOffset);
      
      // Add contact information - use compact font
      pdf.setFontSize(5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      
      // Left side: Copyright (single line)
      var copyrightText = '\u00A9 ' + new Date().getFullYear() + ' Cubik.one';
      pdf.text(copyrightText, margin, footerY - 4.5);
      
      // Right side: Full contact information (multi-line, compact format)
      // Split long address into two lines for better fit
      var contactLines = [
        'cubik.one | info@cubik.one',
        'Bulgaria, 4230 Asenovgrad',
        'str. Zavodska 1, entry 14. | Phone: +359-89-987-11773'
      ];
      
      // Check if lines fit and adjust font size if needed
      var maxAvailableWidth = (pageW - margin * 2) / 2; // Half page width for contacts
      var maxLineWidth = 0;
      for (var i = 0; i < contactLines.length; i++) {
        var lineWidth = pdf.getTextWidth(contactLines[i]);
        if (lineWidth > maxLineWidth) maxLineWidth = lineWidth;
      }
      
      // If lines are too wide, reduce font size further
      if (maxLineWidth > maxAvailableWidth) {
        pdf.setFontSize(4.5);
        // Recalculate widths with smaller font
        maxLineWidth = 0;
        for (var j = 0; j < contactLines.length; j++) {
          var w = pdf.getTextWidth(contactLines[j]);
          if (w > maxLineWidth) maxLineWidth = w;
        }
        
        // If still too wide, make last line even more compact
        if (maxLineWidth > maxAvailableWidth && contactLines.length > 0) {
          contactLines[contactLines.length - 1] = 'Zavodska 1, entry 14. | +359-89-987-11773';
          maxLineWidth = 0;
          for (var k = 0; k < contactLines.length; k++) {
            var w2 = pdf.getTextWidth(contactLines[k]);
            if (w2 > maxLineWidth) maxLineWidth = w2;
          }
        }
      }
      
      // Draw contact lines right-aligned, ensuring no overlap
      var contactStartY = footerY - 4.5;
      for (var l = 0; l < contactLines.length; l++) {
        var lineWidth = pdf.getTextWidth(contactLines[l]);
        var lineX = pageW - margin - 3 - lineWidth;
        // Ensure line doesn't go beyond left margin (no overlap with copyright)
        var copyrightWidth = pdf.getTextWidth(copyrightText);
        if (lineX < margin + copyrightWidth + 8) {
          lineX = margin + copyrightWidth + 8;
        }
        pdf.text(contactLines[l], lineX, contactStartY + l * lineHeight);
      }
    }
    
    // ========== PAGE 1: Overview ==========
    // Corporate green color: #0A6F3C = RGB(10, 111, 60)
    pdf.setFillColor(10, 111, 60);
    pdf.rect(0, 0, pageW, 20, 'F');
    
    // Add title text (same as other pages)
    text('ASSEMBLY INSTRUCTIONS', margin, 14, 16, 'bold', [255,255,255]);
    
    // Add logo on the right side of header (instead of CUBIK.ONE text)
    if (logoImageData) {
      try {
        // Calculate logo size - use reasonable dimensions that maintain aspect ratio
        // Most logos are wider than tall, typical ratio 2-3:1
        var headerHeight = 20;
        var logoHeight = 12; // Height in mm
        var logoWidth = 28; // Width in mm (approximately 2.3:1 ratio)
        
        // Position logo on the right side, centered vertically
        var logoX = pageW - margin - logoWidth;
        var logoY = (headerHeight - logoHeight) / 2;
        
        pdf.addImage(logoImageData, 'PNG', logoX, logoY, logoWidth, logoHeight);
      } catch(e) {
        console.warn('Could not add logo to PDF:', e);
      }
    }
    
    y = 28;
    
    text('PARTS LIST (' + decomp.totalBlocks + ' cubes total):', margin, y, 11, 'bold');
    y += 8;
    
    // Adaptive layout: maximize space usage
    // Calculate optimal number of columns and sizes based on parts count
    var partsCount = partsList.length;
    
    // Use 3 columns maximum on first page, move to next page if doesn't fit
    var numCols = 3; // Fixed to 3 columns as requested
    var maxCols = 3; // Maximum columns per page
    
    // Calculate how many items fit on first page with 3 columns
    var availableH = pageH - y - 12; // Space from current y to bottom with margin
    var availableW = contentW;
    
    var gapX = 4; // Horizontal gap between items
    var gapY = 6; // Vertical gap between rows
    var textHeight = 10; // Space for description text below preview
    
    var itemWidth = (availableW - gapX * (numCols - 1)) / numCols;
    var minItemHeight = 50; // Minimum item height for readability
    var maxItemHeight = 75; // Maximum item height to prevent oversized items on small projects
    var itemsOnFirstPage, rowsNeeded, itemHeight, previewSize;
    
    // For very small projects (1-3 items), use fixed reasonable size
    if (partsCount <= 3) {
      // Small project - use fixed size to prevent "explosion"
      itemHeight = 65; // Fixed reasonable height
      previewSize = Math.min(itemWidth, itemHeight - textHeight - 2);
      previewSize = Math.max(45, Math.min(60, previewSize));
      rowsNeeded = 1;
      itemsOnFirstPage = partsCount;
    } else {
      // Normal calculation for larger projects
      var maxRowsOnPage = Math.floor((availableH - gapY) / (minItemHeight + gapY));
      var maxItemsOnFirstPage = maxRowsOnPage * numCols;
      
      // If too many items, they will be moved to next page
      itemsOnFirstPage = Math.min(partsCount, maxItemsOnFirstPage);
      
      // Calculate actual item size for first page
      rowsNeeded = Math.ceil(itemsOnFirstPage / numCols);
      if (rowsNeeded === 0) rowsNeeded = 1; // At least one row
      
      itemHeight = (availableH - gapY * (rowsNeeded - 1)) / rowsNeeded;
      // Clamp item height between min and max to prevent issues
      itemHeight = Math.max(minItemHeight, Math.min(maxItemHeight, itemHeight));
      
      previewSize = Math.min(itemWidth, itemHeight - textHeight - 2);
      // Clamp preview size to reasonable range
      previewSize = Math.max(45, Math.min(65, previewSize));
    }
    
    var colWidth = itemWidth;
    
    var partsStartY = y;
    var col = 0;
    var maxY = partsStartY;
    var partsPageNum = 1;
    
    // Helper to draw a single part item
    function drawPartItem(part, itemX, itemY, partIndex) {
      // Draw preview image with border
      var preview = cubePreviewsMap[part.sampleIndex];
      if (preview) {
        pdf.addImage(preview, 'PNG', itemX, itemY, previewSize, previewSize);
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.2);
        pdf.rect(itemX, itemY, previewSize, previewSize, 'S');
      } else {
        // Fallback: color rectangle with border
        rect(itemX, itemY, previewSize, previewSize, part.mainColor);
      }
      
      // Badge size (same for both quantity and letter)
      var badgeRadius = Math.max(5, previewSize * 0.12);
      var badgeFontSize = Math.max(8, previewSize * 0.18);
      
      // Quantity badge (top-right of preview)
      pdf.setFillColor(50, 50, 50);
      pdf.circle(itemX + previewSize - badgeRadius + 2, itemY + badgeRadius - 2, badgeRadius, 'F');
      text('x' + part.blocks.length, itemX + previewSize - badgeRadius - 2, itemY + badgeRadius + 1, badgeFontSize, 'bold', [255,255,255]);
      
      // Part letter with colored circle (bottom-right of preview)
      var partLetter = numberToLetter(partIndex + 1);
      var colorIdx = partIndex % partLabelColors.length;
      var partColor = partLabelColors[colorIdx];
      var r = parseInt(partColor.slice(1,3), 16);
      var g = parseInt(partColor.slice(3,5), 16);
      var b = parseInt(partColor.slice(5,7), 16);
      pdf.setFillColor(r, g, b);
      pdf.circle(itemX + previewSize - badgeRadius + 2, itemY + previewSize - badgeRadius + 2, badgeRadius, 'F');
      text(partLetter, itemX + previewSize - badgeRadius - 1, itemY + previewSize - badgeRadius + 3.5, badgeFontSize, 'bold', [255,255,255]);
      
      // Description text BELOW the preview
      var desc = part.description;
      var textMaxWidth = colWidth - 2;
      var descFontSize = 7;
      var lineHeight = 3.5;
      pdf.setFontSize(descFontSize);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(60, 60, 60);
      
      var lines = pdf.splitTextToSize(desc, textMaxWidth);
      // Limit to 3 lines
      if (lines.length > 3) {
        lines = lines.slice(0, 3);
        lines[2] = lines[2].substring(0, Math.max(0, lines[2].length - 3)) + '...';
      }
      
      var textY = itemY + previewSize + 4;
      lines.forEach(function(line, li) {
        pdf.text(line, itemX, textY + li * lineHeight);
      });
    }
    
    // Draw parts on first page (up to maxItemsOnFirstPage)
    var partsDrawn = 0;
    // Draw parts - properly handle pagination
    var currentPageRow = 0;
    var currentPageCol = 0;
    var itemsOnCurrentPage = 0;
    
    partsList.forEach(function(part, i) {
      // Check if we need to move to next page
      // First page: check if we've exceeded itemsOnFirstPage
      // Subsequent pages: check if current item doesn't fit
      var needsNewPage = false;
      
      if (i === itemsOnFirstPage && itemsOnFirstPage < partsCount) {
        // Exactly at the boundary - move to next page
        needsNewPage = true;
      } else if (i > 0) {
        // Check if current item fits on current page
        var testRow = currentPageRow;
        var testCol = currentPageCol;
        var testY = y + testRow * (itemHeight + gapY);
        
        if (testY + itemHeight > pageH - 10) {
          // Doesn't fit - need new page
          needsNewPage = true;
        }
      }
      
      if (needsNewPage) {
        // Add logo to previous page before creating new one
        if (i > 0) {
          addBottomLogo();
        }
        
        pdf.addPage();
        partsPageNum++;
        y = margin;
        
        // Add header on new page
        // Corporate green color: #0A6F3C = RGB(10, 111, 60)
        pdf.setFillColor(10, 111, 60);
        pdf.rect(0, 0, pageW, 16, 'F');
        text('ASSEMBLY INSTRUCTIONS', margin, 11, 12, 'bold', [255,255,255]);
        text('PARTS (cont.)', pageW - margin - 30, 11, 9, 'normal', [180,180,180]);
        y = 22;
        
        // Recalculate for new page
        var remainingItems = partsCount - i;
        var colsOnNextPage = Math.min(maxCols, remainingItems > 12 ? 4 : 3);
        availableH = pageH - y - 12;
        
        // For very small remaining items, use fixed size
        if (remainingItems <= 3) {
          itemHeight = 65;
          rowsNeeded = 1;
        } else {
          rowsNeeded = Math.ceil(remainingItems / colsOnNextPage);
          if (rowsNeeded === 0) rowsNeeded = 1;
          itemHeight = (availableH - gapY * (rowsNeeded - 1)) / rowsNeeded;
          // Clamp item height between min and max
          itemHeight = Math.max(minItemHeight, Math.min(maxItemHeight, itemHeight));
        }
        
        itemWidth = (availableW - gapX * (colsOnNextPage - 1)) / colsOnNextPage;
        previewSize = Math.min(itemWidth, itemHeight - textHeight - 2);
        // Clamp preview size to reasonable range
        previewSize = Math.max(45, Math.min(65, previewSize));
        colWidth = itemWidth;
        numCols = colsOnNextPage;
        maxY = y;
        
        // Reset position counters for new page
        currentPageRow = 0;
        currentPageCol = 0;
        itemsOnCurrentPage = 0;
      }
      
      // Calculate position on current page
      var itemX = margin + currentPageCol * (colWidth + gapX);
      var itemY = y + currentPageRow * (itemHeight + gapY);
      
      drawPartItem(part, itemX, itemY, i);
      
      // Update position for next item
      currentPageCol++;
      if (currentPageCol >= numCols) {
        currentPageCol = 0;
        currentPageRow++;
      }
      itemsOnCurrentPage++;
      
      // Track max Y
      if (itemY + itemHeight > maxY) maxY = itemY + itemHeight;
    });
    
    // Update y position after parts list
    y = maxY + 8;
    
    // Footer removed - only on last page
    // addFooter();
    
    // Add logo in bottom right corner on first page
    addBottomLogo();
    
    // ========== PAGE 2+: Layer-by-layer ==========
    var layers = {};
    var objectYLevels = {};
    
    decomp.blocks.forEach(function(blk, idx) {
      var ly = Math.round(blk.position.y * 2) / 2;
      if (!layers[ly]) layers[ly] = [];
      layers[ly].push({ block: blk, objectIndex: idx });
    });
    
    var layerKeys = Object.keys(layers).sort(function(a,b) { return parseFloat(a) - parseFloat(b); });
    
    objects.forEach(function(obj, idx) {
      if (!obj || !obj.position) return;
      var ly = Math.round(obj.position.y * 2) / 2;
      objectYLevels[idx] = ly;
    });
    
    // Calculate layer box size to fill page properly - maximize space usage
    var layersPerPage = 3;
    var headerHeight = 16;
    var startY = 22;
    var bottomMargin = 4; // Minimal bottom margin
    
    for (var pageStart = 0; pageStart < layerKeys.length; pageStart += layersPerPage) {
      pdf.addPage();
      y = margin;
      
      // Corporate green color: #0A6F3C = RGB(10, 111, 60)
      pdf.setFillColor(10, 111, 60);
      pdf.rect(0, 0, pageW, headerHeight, 'F');
      text('LAYER-BY-LAYER ASSEMBLY', margin, 11, 12, 'bold', [255,255,255]);
      
      var pageEnd = Math.min(pageStart + layersPerPage, layerKeys.length);
      var layersOnThisPage = pageEnd - pageStart;
      text('Layers ' + (pageStart + 1) + '-' + pageEnd + ' of ' + layerKeys.length, pageW - margin - 35, 11, 9, 'normal', [180,180,180]);
      y = startY;
      
      // Calculate layer box size dynamically based on actual layers on this page
      var availableForLayers = pageH - startY - bottomMargin;
      var layerGap = 4; // Reduced gap
      var layerBoxH = Math.floor((availableForLayers - layerGap * (layersOnThisPage - 1)) / layersOnThisPage);
      // Ensure minimum size but maximize usage
      layerBoxH = Math.max(layerBoxH, 60); // Reduced minimum to allow more flexibility
      
      for (var li = pageStart; li < pageEnd; li++) {
        var lk = layerKeys[li];
        var layerBlocks = layers[lk];
        var boxY = y;
        
        pdf.setFillColor(250, 250, 250);
        pdf.roundedRect(margin, boxY, contentW, layerBoxH, 3, 3, 'F');
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(margin, boxY, contentW, layerBoxH, 3, 3, 'S');
        
        // Layer icon and label will be added in bottom left corner of image block later
        
        var currentLayerIdx = li;
        var currentLayerY = parseFloat(lk);
        
        var layerFilter = function(obj, idx) {
          var objY = objectYLevels[idx];
          if (objY === undefined && obj.position) {
            objY = Math.round(obj.position.y * 2) / 2;
          }
          var objLayerIdx = layerKeys.indexOf(String(objY));
          if (objLayerIdx === -1) {
            for (var li2 = 0; li2 < layerKeys.length; li2++) {
              if (Math.abs(parseFloat(layerKeys[li2]) - objY) < 0.3) {
                objLayerIdx = li2;
                break;
              }
            }
          }
          return objLayerIdx <= currentLayerIdx;
        };
        
        // Create partNumberMap only for current layer (not previous layers)
        var currentLayerLabels = {};
        layerBlocks.forEach(function(item) {
          var objIdx = item.block.index;
          if (partNumberMap[objIdx] !== undefined) {
            currentLayerLabels[objIdx] = partNumberMap[objIdx];
          }
        });
        
        // Render two views: isometric left and isometric right (back)
        // No transparency - solid views
        var layerImgLeft = renderWhiteBg('iso', 1.0, layerFilter, currentLayerLabels, false);
        var layerImgRight = renderWhiteBg('iso_back', 1.0, layerFilter, currentLayerLabels, false);
        
        // Much larger images - maximize space usage, fill ENTIRE box
        // No header - use all space for images
        var boxHeaderHeight = 0; // No header - maximize image space
        var imgGap = 3; // Minimal gap between images
        var boxPadding = 2; // Minimal padding for maximum image size
        
        // Block boundaries - exact limits
        var blockLeft = margin;
        var blockRight = margin + contentW;
        var blockTop = boxY;
        var blockBottom = boxY + layerBoxH;
        
        // Available space inside block - use MAXIMUM space for large, readable images
        // No header - use entire block height for images
        var availableWidth = contentW - boxPadding * 2;
        var availableHeight = layerBoxH - boxPadding * 2; // No header height subtraction
        
        // Calculate image size - MAXIMIZE for readability
        // Two images side by side: (imgW * 2) + gap <= availableWidth
        var aspectRatio = 1.1; // width/height
        var dualImgW = (availableWidth - imgGap) / 2;
        var dualImgH = availableHeight; // Use full available height
        
        // Adjust to maintain aspect ratio
        if (dualImgH * aspectRatio > dualImgW) {
          // Height allows wider images
          var idealW = dualImgH * aspectRatio;
          if (idealW * 2 + imgGap <= availableWidth) {
            dualImgW = idealW;
          } else {
            // Width is limiting
            dualImgW = (availableWidth - imgGap) / 2;
            dualImgH = dualImgW / aspectRatio;
          }
        } else {
          // Width allows taller images, but use full height for maximum size
          dualImgH = availableHeight;
          dualImgW = dualImgH * aspectRatio;
          // Re-check width constraint
          if (dualImgW * 2 + imgGap > availableWidth) {
            dualImgW = (availableWidth - imgGap) / 2;
            dualImgH = dualImgW / aspectRatio;
          }
        }
        
        // Calculate positions - ensure they fit exactly within boundaries
        // Start from top of block (no header)
        var imgX1 = blockLeft + boxPadding;
        var imgX2 = imgX1 + dualImgW + imgGap;
        var imgY = blockTop + boxPadding;
        
        // CRITICAL: Final verification - ensure right edge of second image doesn't exceed boundary
        var maxRightEdge = blockRight - boxPadding;
        if (imgX2 + dualImgW > maxRightEdge) {
          // Recalculate to fit exactly - use exact available width
          var exactAvailableWidth = maxRightEdge - (blockLeft + boxPadding);
          dualImgW = (exactAvailableWidth - imgGap) / 2;
          dualImgH = dualImgW / aspectRatio;
          // Re-check height
          if (dualImgH > availableHeight) {
            dualImgH = availableHeight;
            dualImgW = dualImgH * aspectRatio;
            // Final width check
            if (dualImgW * 2 + imgGap > exactAvailableWidth) {
              dualImgW = (exactAvailableWidth - imgGap) / 2;
              dualImgH = dualImgW / aspectRatio;
            }
          }
          imgX1 = blockLeft + boxPadding;
          imgX2 = imgX1 + dualImgW + imgGap;
        }
        
        // Verify vertical fit
        if (imgY + dualImgH > blockBottom - boxPadding) {
          dualImgH = (blockBottom - boxPadding) - imgY;
          dualImgW = dualImgH * aspectRatio;
          // Re-check width after height adjustment
          var exactAvailableWidth = blockRight - boxPadding - (blockLeft + boxPadding);
          if (dualImgW * 2 + imgGap > exactAvailableWidth) {
            dualImgW = (exactAvailableWidth - imgGap) / 2;
            dualImgH = dualImgW / aspectRatio;
          }
          imgX1 = blockLeft + boxPadding;
          imgX2 = imgX1 + dualImgW + imgGap;
        }
        
        // Final absolute check before rendering
        var finalMaxRight = blockRight - boxPadding;
        if (imgX2 + dualImgW > finalMaxRight) {
          // Last resort: force fit
          dualImgW = (finalMaxRight - (blockLeft + boxPadding) - imgGap) / 2;
          dualImgH = dualImgW / aspectRatio;
          imgX1 = blockLeft + boxPadding;
          imgX2 = imgX1 + dualImgW + imgGap;
        }
        
        pdf.addImage(layerImgLeft, 'PNG', imgX1, imgY, dualImgW, dualImgH);
        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.3);
        pdf.rect(imgX1, imgY, dualImgW, dualImgH, 'S');
        
        pdf.addImage(layerImgRight, 'PNG', imgX2, imgY, dualImgW, dualImgH);
        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.3);
        pdf.rect(imgX2, imgY, dualImgW, dualImgH, 'S');
        
        // Add layer label in bottom left corner of left image (same style as cube counter)
        var layerLabelText = 'LAYER ' + (li + 1);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        var layerTextWidth = pdf.getTextWidth(layerLabelText);
        var layerX = imgX1 + 4; // Left edge with small margin
        var layerY = imgY + dualImgH - 4; // Bottom edge with small margin
        
        // Draw background for text readability (same style as cube counter)
        pdf.setFillColor(40, 40, 40);
        pdf.roundedRect(layerX - 2, layerY - 5, layerTextWidth + 4, 6, 1, 1, 'F');
        
        // Draw text in white
        pdf.setTextColor(255, 255, 255);
        pdf.text(layerLabelText, layerX, layerY - 1);
        
        // Add cube counter in bottom right corner of right image (inside the image block)
        var cubeCountText = layerBlocks.length + ' cube' + (layerBlocks.length > 1 ? 's' : '');
        var counterTextWidth = pdf.getTextWidth(cubeCountText);
        var counterX = imgX2 + dualImgW - counterTextWidth - 4; // Right edge with small margin
        var counterY = imgY + dualImgH - 4; // Bottom edge with small margin
        
        // Draw background for text readability (same style as layer label)
        pdf.setFillColor(40, 40, 40);
        pdf.roundedRect(counterX - 2, counterY - 5, counterTextWidth + 4, 6, 1, 1, 'F');
        
        // Draw text in white
        pdf.setTextColor(255, 255, 255);
        pdf.text(cubeCountText, counterX, counterY - 1);
        
        y += layerBoxH + layerGap;
      }
      
      // Footer removed - only on last page
      // addFooter();
      
      // Add logo in bottom right corner on each layer page
      addBottomLogo();
    }
    
    // ========== PAGE: VIEWS ==========
    var views = [
      { name: 'ISOMETRIC', view: 'iso' },
      { name: 'FRONT', view: 'front' },
      { name: 'SIDE', view: 'right' },
      { name: 'TOP', view: 'top' }
    ];
    
    // Always start VIEWS on new page
    pdf.addPage();
    y = margin;
    // Corporate green color: #0A6F3C = RGB(10, 111, 60)
    pdf.setFillColor(10, 111, 60);
    pdf.rect(0, 0, pageW, 16, 'F');
    text('ASSEMBLY INSTRUCTIONS', margin, 11, 12, 'bold', [255,255,255]);
    text('VIEWS', pageW - margin - 18, 11, 9, 'normal', [180,180,180]);
    y = 22;
    
    // Small title
    text('VIEWS:', margin, y, 10, 'bold');
    var titleHeight = 7;
    y += titleHeight;
    
    // Calculate maximum available space - use almost entire page
    // Reserve space for TIP (7mm) and footer (6mm) at bottom with gap
    // On last page, also reserve space for logo in bottom right
    var logoHeight = 8; // Height of logo in bottom corner
    var logoMargin = 3; // Margin for logo
    var logoSpace = logoHeight + logoMargin * 2; // Total space needed for logo (only on last page)
    
    var tipHeight = 7; // Tip box height
    var footerHeight = 6; // Footer height (compact for full contact info)
    var gapBetween = 3; // Gap between tip and footer (increased to prevent overlap)
    var bottomMargin = 2; // Minimal margin
    var availableHeight = pageH - y - tipHeight - footerHeight - gapBetween - logoSpace - bottomMargin;
    var availableWidth = contentW;
    
    // Always use 2x2 grid for 4 views
    var numViews = views.length;
    var numCols = 2;
    var numRows = 2;
    
    // Minimal gaps to maximize image size
    var imgGapX = 3;
    var imgGapY = 3;
    var labelHeight = 4; // Space for label below each image
    
    // Calculate maximum image size - PRIORITIZE HEIGHT to fill vertical space
    var totalGapY = imgGapY * (numRows - 1);
    var totalLabelHeight = labelHeight * numRows;
    
    // Calculate image height to use ALL available vertical space
    var imgH = (availableHeight - totalGapY - totalLabelHeight) / numRows;
    
    // Calculate width based on aspect ratio
    var aspectRatio = 1.1; // width/height ratio
    var imgW = imgH * aspectRatio;
    
    // Check if width fits, if not adjust
    var totalGapX = imgGapX * (numCols - 1);
    var totalWidthNeeded = imgW * numCols + totalGapX;
    
    if (totalWidthNeeded > availableWidth) {
      // Width is limiting, recalculate from width
      imgW = (availableWidth - totalGapX) / numCols;
      imgH = imgW / aspectRatio;
    }
    
    // Use full width - start from margin
    var startX = margin;
    
    var captures = [];
    
    views.forEach(function(v) {
      var img = renderWhiteBg(v.view, 1.0, null, null, false); // No transparency, no labels, no edges
      captures.push({ label: v.name, img: img });
    });
    
    // Add images without border (like final render) - maximized size, fill entire space
    captures.forEach(function(cap, i) {
      var col = i % numCols;
      var row = Math.floor(i / numCols);
      var ix = startX + col * (imgW + imgGapX);
      // Calculate Y position to fill entire available height
      var rowHeight = imgH + labelHeight;
      var iy = y + row * (rowHeight + imgGapY);
      
      // Add image directly without border
      pdf.addImage(cap.img, 'PNG', ix, iy, imgW, imgH);
      
      // Add label below image
      var labelText = cap.label;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(100, 100, 100);
      var tw = pdf.getTextWidth(labelText);
      pdf.text(labelText, ix + imgW/2 - tw/2, iy + imgH + 3);
    });
    
    // TIP above footer - make it smaller to fit footer with proper spacing
    // On last page, need space for logo in bottom right corner
    var logoHeight = 8; // Height of logo in bottom corner
    var logoMargin = 3; // Margin for logo
    var logoSpace = logoHeight + logoMargin * 2; // Total space needed for logo
    
    var footerHeight = 6; // Space needed for footer (compact for full contact info)
    var gapBetweenTipAndFooter = 8; // Gap between TIP and footer to prevent overlap
    var tipBoxHeight = 7; // Reduced height
    
    // Raise TIP and footer to make room for logo in bottom right
    var tipY = pageH - footerHeight - gapBetweenTipAndFooter - tipBoxHeight - logoSpace; // Position above footer with gap and logo space
    
    // Add padding on sides of TIP block
    var tipPadding = 3; // Padding on left and right sides
    var tipX = margin + tipPadding;
    var tipWidth = contentW - (tipPadding * 2);
    
    pdf.setFillColor(255, 252, 235);
    pdf.roundedRect(tipX, tipY, tipWidth, tipBoxHeight, 2, 2, 'F');
    pdf.setDrawColor(200, 180, 100);
    pdf.roundedRect(tipX, tipY, tipWidth, tipBoxHeight, 2, 2, 'S');
    
    // Add text with internal padding
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    var tipText = 'TIP: Snap cubes firmly until click. Build from bottom layer up.';
    var textPadding = 2; // Internal padding for text
    text(tipText, tipX + textPadding, tipY + 4.5, 6.5);
    
    // Add footer to views page (raised to make room for logo)
    addFooter(true); // true = last page
    
    // Add logo in bottom right corner on last page
    addBottomLogo();
    
    // Restore camera position
    try {
      camera.position.copy(origCamPos);
      controls.target.copy(origCamTarget);
      controls.update();
      renderer.render(getScene(), camera);
    } catch(e) {}
    
    pdf.save('cubik-assembly-instructions.pdf');
    showMsg('PDF saved!', true);
    
    return decomp;
  }

  // =============================================================================
  // Public API
  // =============================================================================

  global.CubikPDF = {
    getSceneDecomposition: getSceneDecomposition,
    printDecomposition: printDecomposition,
    exportDecomposition: exportDecomposition,
    generatePDFInstructions: generatePDFInstructions
  };

  // Console shortcuts
  global.getSceneDecomposition = getSceneDecomposition;
  global.printDecomposition = printDecomposition;
  global.exportDecomposition = exportDecomposition;
  global.decompose = getSceneDecomposition;
  global.logScene = printDecomposition;
  global.generatePDFInstructions = generatePDFInstructions;
  global.makePDF = generatePDFInstructions;

  console.log('[CubikPDF] Module loaded');

})(window);
