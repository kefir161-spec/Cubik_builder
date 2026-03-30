/**
 * Cubik Builder - Loader 3D Scene
 * @description Renders Bion cube (palette color) with smooth X+Y rotation on loading screen
 * Respects prefers-reduced-motion (static when enabled)
 */
(function() {
  'use strict';

  var container = null;
  var scene = null;
  var camera = null;
  var renderer = null;
  var mesh = null;
  var animId = null;
  var reduceMotion = false;
  var disposed = false;

  // Bion green from palette
  var CUBE_COLOR = 0x0A6F3C;

  function getModelsBase() {
    var base = (window.CUBIK_MODELS_BASE || './3dbuilder/models/');
    if (base.indexOf('://') === -1) {
      try {
        base = new URL(base, window.location.href).href;
      } catch (_) {}
    }
    return base.replace(/\/?$/, '/');
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    if (scene && renderer) {
      try {
        scene.traverse(function(obj) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach(function(m) { if (m && m.dispose) m.dispose(); });
            } else if (obj.material.dispose) {
              obj.material.dispose();
            }
          }
        });
      } catch (_) {}
    }
    if (renderer) {
      try { renderer.dispose(); } catch (_) {}
      renderer = null;
    }
    mesh = null;
    camera = null;
    if (container) {
      try {
        while (container.firstChild) container.removeChild(container.firstChild);
      } catch (_) {}
    }
    scene = null;
    container = null;
  }

  function init() {
    disposed = false;
    container = document.getElementById('loaderCubeContainer');
    if (!container || typeof THREE === 'undefined' || typeof THREE.OBJLoader !== 'function') return;

    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var size = Math.min(window.innerWidth, window.innerHeight, 480) * 0.875;
    size = Math.max(size, 400);
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    container.appendChild(canvas);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);
    camera.position.set(0, 0, 2.0);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(size, size);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    var ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    var keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(4, 6, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 512;
    keyLight.shadow.mapSize.height = 512;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -2;
    keyLight.shadow.camera.right = 2;
    keyLight.shadow.camera.top = 2;
    keyLight.shadow.camera.bottom = -2;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    var bionUrl = getModelsBase() + 'Bion.obj';
    var loader = new THREE.OBJLoader();
    loader.load(
      bionUrl,
      function(obj) {
        if (disposed) return;
        var geoms = [];
        obj.traverse(function(ch) {
          if (ch.isMesh && ch.geometry) geoms.push(ch.geometry);
        });
        var geom = geoms.length > 0 ? geoms[0] : new THREE.BoxGeometry(1, 1, 1);
        if (geoms.length > 1 && THREE.BufferGeometryUtils && THREE.BufferGeometryUtils.mergeBufferGeometries) {
          try {
            geom = THREE.BufferGeometryUtils.mergeBufferGeometries(geoms, true);
          } catch (_) {}
        }
        geom = geom.clone();
        try {
          geom.computeBoundingBox();
          var size = new THREE.Vector3();
          geom.boundingBox.getSize(size);
          var s = 1 / Math.max(size.x, size.y, size.z || 1);
          geom.scale(s, s, s);
          geom.center();
          geom.computeVertexNormals();
        } catch (_) {}
        var material = new THREE.MeshStandardMaterial({
          color: CUBE_COLOR,
          roughness: 0.85,
          metalness: 0.05
        });
        mesh = new THREE.Mesh(geom, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
      },
      undefined,
      function() {
        if (disposed) return;
        var mat = new THREE.MeshStandardMaterial({
          color: CUBE_COLOR,
          roughness: 0.85,
          metalness: 0.05
        });
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
      }
    );

    function animate() {
      if (disposed || !renderer || !scene || !camera) return;
      if (!container || !document.body.contains(container)) {
        dispose();
        return;
      }
      animId = requestAnimationFrame(animate);
      if (mesh && !reduceMotion) {
        var t = performance.now() * 0.001;
        mesh.rotation.x = t * 0.18;
        mesh.rotation.y = t * 0.22;
      }
      renderer.render(scene, camera);
    }
    animate();
  }

  window.CubikLoaderScene = { dispose: dispose };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
