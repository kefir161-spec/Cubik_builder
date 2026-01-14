// === Color pipeline utilities ======================================
(function(){
  // Convert sRGB hex (#RRGGBB) to THREE.Color in *linear* space (for r128)
  function srgbComponentToLinear(c){
    c = c/255;
    return (c <= 0.04045) ? (c/12.92) : Math.pow((c+0.055)/1.055, 2.4);
  }
  window.srgbColor = function(hex){
    // hex may be like '#6B7280' or 0xRRGGBB
    var h = (typeof hex === 'number') ? hex.toString(16).padStart(6,'0') :
            (hex.charAt(0)==='#' ? hex.slice(1) : hex);
    var r = parseInt(h.slice(0,2),16);
    var g = parseInt(h.slice(2,4),16);
    var b = parseInt(h.slice(4,6),16);
    return new THREE.Color(
      srgbComponentToLinear(r),
      srgbComponentToLinear(g),
      srgbComponentToLinear(b)
    );
  };

  window.setupColorPipeline = function(renderer){
    if(!renderer) return;

    // Prefer modern colorSpace API (r150+). Fallback to outputEncoding for older builds.
    if (renderer.outputColorSpace !== undefined && THREE.SRGBColorSpace !== undefined) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else if (renderer.outputEncoding !== undefined && THREE.sRGBEncoding !== undefined) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }

    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;
  };

  window.applyBaseColors = function(scene, floorMesh, wallMeshes, colors){
    colors = colors || { floor:'#5B676D', wall:'#8E969D', sky:'#8E969D' };
    if(scene){
      scene.background = srgbColor(colors.sky);
    }
    if(floorMesh && floorMesh.material){
      floorMesh.material.color.copy( srgbColor(colors.floor) );
      floorMesh.material.roughness = 1; floorMesh.material.metalness = 0;
      floorMesh.material.needsUpdate = true;
    }
    if(Array.isArray(wallMeshes)){
      wallMeshes.forEach(function(w){
        if(w && w.material){
          w.material.color.copy( srgbColor(colors.wall) );
          w.material.roughness = 1; w.material.metalness = 0;
          w.material.needsUpdate = true;
        }
      });
    }
  };
})();
// === End color pipeline utilities ==================================

/*
 Main app script:
 - Scene setup (Three.js)
 - Block placement / delete
 - Ghost preview
 - Editor (face select / recolor / replace)
 - Undo / Redo
 - Camera keyboard controls (WASD / E / F / Q / R)
 - Stats and GLB export
*/
(function(){
  // ===== Utilities =====
  function el(id){ return document.getElementById(id); }

// === Global loader helpers ===
var loaderStartTime = 0;
var loaderMinDuration = 3000; // минимум 3 секунды при старте
var loaderStartupPhase = false;

var loaderDefaultText =
  (window.CubikI18N && window.CubikI18N.t)
    ? window.CubikI18N.t('loader.loading')
    : 'Loading Cubiks...';

function setLoaderLabel(text){
  var root = document.getElementById('globalLoader');
  if(!root) return;
  var label = root.querySelector('.loader-label');
  if(label && text){ label.textContent = text; }
}

function showLoader(text){
  var root = document.getElementById('globalLoader');
  if(!root) return;

  if(!text) text = loaderDefaultText;
  if(text){ setLoaderLabel(text); }

  // стартовую фазу фиксируем только при первом показе
  if(!loaderStartupPhase){
    loaderStartupPhase = true;
    loaderStartTime = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();
  }
  root.style.display = 'flex';
}

function hideLoaderImmediate(){
  var root = document.getElementById('globalLoader');
  if(!root) return;
  root.style.display = 'none';
}

// обычное скрытие без минимального времени
function hideLoader(){
  loaderStartupPhase = false;
  hideLoaderImmediate();
}

function hideLoaderWithStartupMin(){
  if(!loaderStartupPhase){
    hideLoaderImmediate();
    return;
  }
  var now = (typeof performance !== 'undefined' && performance.now)
    ? performance.now()
    : Date.now();
  var elapsed = now - loaderStartTime;
  if(elapsed >= loaderMinDuration){
    loaderStartupPhase = false;
    hideLoaderImmediate();
  }else{
    var remain = loaderMinDuration - elapsed;
    setTimeout(function(){
      loaderStartupPhase = false;
      hideLoaderImmediate();
    }, remain);
  }
}

  function hexToDec(h){ return parseInt(String(h).replace('#',''),16); }
  function hexNorm(hex){
    var s=String(hex||'').trim();
    if(s.charAt(0)!=='#'){ s='#'+s; }
    if(s.length===4){
      var r=s.charAt(1),g=s.charAt(2),b=s.charAt(3);
      s='#'+r+r+g+g+b+b;
    }
    return s.toUpperCase();
  }
  function toLinear(hex){
    var c=new THREE.Color(hex);
    if(c.convertSRGBToLinear) c.convertSRGBToLinear();
    return c;
  }
  function computeOverlay(){ return 0x22c55e; }

  // ===== Palette (RAL) =====
  var RALS=[
    ["RAL 7037","#7D7F7D"],        // grey (Zen/2 grey)
    ["Bion beige","#E1B589"],      // slightly darker/muted beige for previews
    ["Bion green","#0A6F3C"],      // slightly darker green for previews
    ["RAL 9003","#F4F4F4"],        // white
    ["RAL 9005","#0A0A0A"]         // black
  ];
  var RAL_REV=(function(){
    var m={};
    for(var i=0;i<RALS.length;i++){
      m[hexNorm(RALS[i][1])] = RALS[i][0];
    }
    return m;
  })();

  
// --- Wrapper collider system (injected) ---
var wrappers = [];           // invisible wrapper meshes (raycast targets)
var snapTargets = [];        // what we raycast for snapping: wrappers + ground

function getWrapperMaterial(){
  try{
    var m = new THREE.MeshBasicMaterial({ transparent:true, opacity:0.0 });
    m.depthWrite = false;
    m.colorWrite = false; // do not render, but remain raycastable
    m.side = THREE.DoubleSide;
    return m;
  }catch(e){ return new THREE.MeshBasicMaterial({ visible:false }); }
}

function createWrapperForBlock(owner){
  try{
    if(!owner) return null;
    var eps = 0.002; // thin shell to stabilize hits at shared faces
    
    var kind = owner.userData?.kind;
    var hh = getHalf(kind);
    
    var w = new THREE.Mesh(new THREE.BoxGeometry(1+eps,1+eps,1+eps), getWrapperMaterial());
    w.name = 'wrapper';
    w.userData.wrapperOwner = owner;
    
    // Всегда устанавливаем размер на основе getHalf для точного соответствия bounding box
    w.scale.set(hh.x*2+eps, hh.y*2+eps, hh.z*2+eps);
    
    // Keep as a separate object at scene root to avoid polluting owner's bounding box
    scene.add(w);
    wrappers.push(w);
    updateSnapTargets();
    return w;
  }catch(e){ return null; }
}

function removeWrapperForBlock(owner){
  for (var i=wrappers.length-1;i>=0;i--){
    var w=wrappers[i];
    if(w.userData && w.userData.wrapperOwner===owner){
      try{ scene.remove(w); }catch(e){}
      try{
        if(w.geometry && w.geometry.dispose) w.geometry.dispose();
        if(w.material && w.material.dispose) w.material.dispose();
      }catch(e){}
      wrappers.splice(i,1);
    }
  }
  updateSnapTargets();
}

function clearAllWrappers(){
  for (var i=0;i<wrappers.length;i++){
    var w=wrappers[i];
    try{ scene.remove(w); }catch(e){}
    try{
      if(w.geometry && w.geometry.dispose) w.geometry.dispose();
      if(w.material && w.material.dispose) w.material.dispose();
    }catch(e){}
  }
  wrappers.length = 0;
  updateSnapTargets();
}

function updateSnapTargets(){
  if (Array.isArray(wrappers)){
    snapTargets = wrappers.slice();
  } else {
    snapTargets = [];
  }
  if (typeof ground !== 'undefined' && ground) snapTargets.push(ground);
}

// Keep wrappers following their owners
function __syncWrappers(){
  for (var i=0;i<wrappers.length;i++){
    var w = wrappers[i];
    var o = w.userData && w.userData.wrapperOwner;
    if(!o) continue;
    
    try{
      w.position.copy(o.position);
      w.quaternion.copy(o.quaternion);
      
      var kind = (o.userData && o.userData.kind) ? o.userData.kind : null;
      var hh = getHalf(kind);
      
      // Всегда используем getHalf для точного размера
      w.scale.set(hh.x*2 + 0.002, hh.y*2 + 0.002, hh.z*2 + 0.002);
    }catch(e){
      // Fallback - копируем масштаб владельца
      try{ w.scale.copy(o.scale); }catch(_){}
    }
  }
}

// Create a non-pickable wrapper around ghost (optional, helps visualize/debug, not used for raycast)
function attachGhostWrapper(g){
  try{
    if(!g) return;
    if (g.userData && g.userData._wrapperGhost) { return; }
    var eps = 0.002;
    var w = new THREE.Mesh(new THREE.BoxGeometry(1+eps,1+eps,1+eps), getWrapperMaterial());
    w.name = 'ghostWrapper';
    // Do not add to wrappers/snapTargets to avoid self-hits
    g.add(w);
    g.userData._wrapperGhost = w;
  }catch(e){}
}
// ===== Globals =====
  var scene,camera,renderer,controls,raycaster,mouse,ground,bgScene,bgCamera,bgMesh;
  var objects=[], pickables=[], ghost=null, ghostType='Void';
  var baseGeom={"Void":null,"Zen":null,"Bion":null,"Zen/2":null};
  var faceGeoms={};
  // === Prefabs registry ===
  var customKinds = {};
  var KIND_AUTO = 1;
  var BUILTIN_KINDS = ['box', 'Void', 'Zen', 'Zen/2', 'Zen_2', 'Bion', 'Flora'];
  
  function isCustomKind(k){ return !!customKinds[k]; }
  function isZen2LikeKind(kind){
    if (kind === 'Zen/2') return true;
    if (!kind) return false;
    var data = customKinds && customKinds[kind];
    return !!(data && data.zen2Like);
  }
  
  /**
   * Очищает все кастомные kinds (для загрузки нового проекта)
   * Удаляет их из customKinds, faceGeoms и baseGeom
   */
  function clearCustomKinds() {
    for (var k in customKinds) {
      if (!customKinds.hasOwnProperty(k)) continue;
      // Удаляем из faceGeoms
      if (faceGeoms[k]) {
        delete faceGeoms[k];
      }
      // Удаляем из baseGeom
      if (baseGeom[k]) {
        delete baseGeom[k];
      }
    }
    // Очищаем customKinds
    customKinds = {};
    KIND_AUTO = 1;
  }
  
  var currentColor=0x0A6F3C, currentColorHex='#0A6F3C'; // Bion green by default
  var editorFaceHex = null; // independent face color for editor

  var selectedBlock=null; try{ window.selectedBlock = selectedBlock; }catch(e){}
  try{ window.getSelectedBlock = function(){ return selectedBlock; }; }catch(e){}
  var selectedFaces={top:false,bottom:false,front:false,back:false,left:false,right:false};

  var isPointerDown=false, pointerDownPos={x:0,y:0}, lastCursor={x:0,y:0};
  var isRightButtonDown=false, rightClickDownPos={x:0,y:0}, rightClickDownTime=0;


  // === Ghost debug & kind alias ===
  var DEBUG_GHOST = false;
  var GHOST_KIND_NAME = 'FromEdited';
  function dbgGhost(){
    if(!DEBUG_GHOST) return;
    try{
      var args = Array.prototype.slice.call(arguments);
      args.unshift('[GHOST]');
      console.log.apply(console, args);
    }catch(e){}
  }


  var previewScene=null,previewCamera=null,previewRenderer=null,previewControls=null;
  var previewRoot=null,previewRaycaster=null,previewMouse=null,previewOutline=null;
  var previewTicker=false, hoverSuppressUntil=0;

  // undo/redo stacks
  var undoStack = [], redoStack = [];
  var MAX_UNDO_STEPS = 600;
  var hasUnsavedChanges = false;

  // Timelapse replay and video recording
  var isReplayingBuild = false;
  var replayTimer = null;
  var mediaRecorder = null;
  var recordedChunks = [];
  // keyboard movement state
  var keyState={ w:false,a:false,s:false,d:false,e:false,f:false,q:false,r:false };

  // camera orbit pivot (for Q/R rotation)
  var lastPlacedCenter = new THREE.Vector3(0, 0.5, 0);

  // ===== Gallery scenes =====
  var galleryScenes = {};

// Zen/2 orientation state for preview + ghost
  // 0 = default, 1 = rotated 90deg around X, 2 = rotated 90deg around Z
  var zen2OrientationIndex = 0;
  var zen2HalfCache = {};

  function applyZen2Orientation(mesh){
    if(!mesh) return;
    // Keep current Y rotation (for spinning preview), only change X/Z
    var ry = (mesh.rotation && mesh.rotation.y) || 0;
    if(zen2OrientationIndex === 1){
      mesh.rotation.set(Math.PI/2, ry, 0);
    } else if(zen2OrientationIndex === 2){
      mesh.rotation.set(0, ry, Math.PI/2);
    } else {
      mesh.rotation.set(0, ry, 0);
    }
  }

  // ===== Face type selection =====
  var selectedFaceType = 'Void';
  var faceTypeScenes = {};

  // ===== Face selection helpers =====
  function clearSelected(){
    selectedFaces.top=false;
    selectedFaces.bottom=false;
    selectedFaces.front=false;
    selectedFaces.back=false;
    selectedFaces.left=false;
    selectedFaces.right=false;
  }
  function selectedList(){
    var arr=[];
    for(var k in selectedFaces){
      if(selectedFaces[k]) arr.push(k);
    }
    return arr;
  }

  function msg(text, ok){
    var s=el('status');
    if(s){
      s.textContent=text;
      s.style.color = ok!==false ? 'var(--green)' : 'var(--red)';
    }
  }

  function setRAL(hex){
    currentColor=hexToDec(hex);
    currentColorHex=hex;

    var sw=el('sw');
    if(sw) sw.style.background=hex;

    var rr=el('ralSelect');
    if(rr) rr.value=hex;

    var fr=el('faceColor');
    if(fr) fr.value=hex;

    // Обновляем цвет превью кубов в галерее
    updateGalleryColors(hex);
  }

  // ===== Обновление цветов превью кубов =====
  function updateGalleryColors(colorHex){
    for(var kind in galleryScenes){
      if(galleryScenes.hasOwnProperty(kind)){
        var sceneData = galleryScenes[kind];
        if(sceneData && sceneData.mesh && sceneData.mesh.material){
          sceneData.mesh.material.color.set(toLinear(colorHex));
        }
      }
    }
  }

  // ===== Управление призрачным кубом =====
  function hideGhost(){
    if(ghost){
      ghost.visible = false;
    }
  }


  // Update ghost position/validity based on last cursor
  function updateGhost(){
    if(!ghost) return;
    try{
      var rect = renderer.domElement.getBoundingClientRect();
      var x = lastCursor.x || (rect.left + rect.width/2);
      var y = lastCursor.y || (rect.top + rect.height/2);
      onMove({clientX:x, clientY:y});
    }catch(e){
      dbgGhost('updateGhost error', e);
    }
  }

  function showGhost(){
    if(ghost){
      ghost.visible = true;
      updateGhost();
    }
  }

  // ===== Face geometry extraction =====
  function makeBoxFacesFromGeometry(geom){
    if(!geom||typeof geom.clone!=="function"){
      geom=new THREE.BoxGeometry(1,1,1);
    }
    var g=geom.clone();
    g.computeBoundingBox();
    var bb=g.boundingBox;
    var min=bb.min, max=bb.max;

    var pos=g.attributes.position.array;
    var idx=g.index?g.index.array:null;

    var faces={top:null,bottom:null,front:null,back:null,left:null,right:null};

    var EPS=1e-6;
    var ex=max.x-min.x, ey=max.y-min.y, ez=max.z-min.z;
    var tol=Math.max(ex,ey,ez)*0.03 + EPS;

    function addTri(out, ia, ib, ic){
      out.push(
        pos[ia*3],pos[ia*3+1],pos[ia*3+2],
        pos[ib*3],pos[ib*3+1],pos[ib*3+2],
        pos[ic*3],pos[ic*3+1],pos[ic*3+2]
      );
    }

    function extract(axis,isMax){
      var verts=[];
      var N=idx?idx.length/3:pos.length/9;
      for(var i=0;i<N;i++){
        var ia=idx?idx[i*3]:i*3;
        var ib=idx?idx[i*3+1]:i*3+1;
        var ic=idx?idx[i*3+2]:i*3+2;
        var a={x:pos[ia*3], y:pos[ia*3+1], z:pos[ia*3+2]};
        var b={x:pos[ib*3], y:pos[ib*3+1], z:pos[ib*3+2]};
        var c={x:pos[ic*3], y:pos[ic*3+1], z:pos[ic*3+2]};

        var plane=isMax?max[axis]:min[axis];

        if(Math.abs(a[axis]-plane)<tol &&
           Math.abs(b[axis]-plane)<tol &&
           Math.abs(c[axis]-plane)<tol){
          addTri(verts, ia, ib, ic);
        }
      }
      if(verts.length===0) return null;
      var out=new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.Float32BufferAttribute(verts,3));
      out.computeVertexNormals();
      return out;
    }

    faces.top=extract('y',true);
    faces.bottom=extract('y',false);
    faces.front=extract('z',true);
    faces.back=extract('z',false);
    faces.right=extract('x',true);
    faces.left=extract('x',false);

    // fill any missing faces with thin quads
    if(!faces.top || !faces.bottom || !faces.front || !faces.back || !faces.right || !faces.left){
      var cx=(min.x+max.x)/2,
          cy=(min.y+max.y)/2,
          cz=(min.z+max.z)/2;
      var thin=Math.max(Math.min(ex,ey,ez)*0.002, 0.0002);

      if(!faces.top){
        var gtop=new THREE.BoxGeometry(ex, thin, ez);
        gtop.translate(cx, max.y-thin/2, cz);
        faces.top=gtop;
      }
      if(!faces.bottom){
        var gb=new THREE.BoxGeometry(ex, thin, ez);
        gb.translate(cx, min.y+thin/2, cz);
        faces.bottom=gb;
      }
      if(!faces.front){
        var gf=new THREE.BoxGeometry(ex, ey, thin);
        gf.translate(cx, cy, max.z-thin/2);
        faces.front=gf;
      }
      if(!faces.back){
        var gk=new THREE.BoxGeometry(ex, ey, thin);
        gk.translate(cx, cy, min.z+thin/2);
        faces.back=gk;
      }
      if(!faces.right){
        var gr=new THREE.BoxGeometry(thin, ey, ez);
        gr.translate(max.x-thin/2, cy, cz);
        faces.right=gr;
      }
      if(!faces.left){
        var gl=new THREE.BoxGeometry(thin, ey, ez);
        gl.translate(min.x+thin/2, cy, cz);
        faces.left=gl;
      }
    }

    return faces;
  }

  function axisForFace(dir){
    var d=(dir||'').toLowerCase();
    if(d==='top') return {axis:'y',isMax:true};
    if(d==='bottom') return {axis:'y',isMax:false};
    if(d==='front') return {axis:'z',isMax:true};
    if(d==='back') return {axis:'z',isMax:false};
    if(d==='right') return {axis:'x',isMax:true};
    if(d==='left') return {axis:'x',isMax:false};
    return {axis:'y',isMax:true};
  }

  function alignGeomPlaneTo(oldGeom,newGeom,dir){
    // Skip alignment for pre-positioned geometries (like Flora)
    // Check before cloning since userData may not copy
    var isPrePositioned = newGeom.userData && newGeom.userData.prePositioned;
    
    if (isPrePositioned) {
      var ng = newGeom.clone();
      // Copy userData manually
      ng.userData = Object.assign({}, newGeom.userData);
      ng.computeBoundingBox();
      ng.computeVertexNormals();
      return ng;
    }
    
    var a=axisForFace(dir);
    var axis=a.axis, isMax=a.isMax;

    var og=oldGeom.clone(); og.computeBoundingBox();
    var ng=newGeom.clone(); ng.computeBoundingBox();

    var oBB=og.boundingBox, nBB=ng.boundingBox;
    
    // Выравнивание по оси грани (перпендикулярной плоскости)
    var oPlane=isMax?oBB.max[axis]:oBB.min[axis];
    var nPlane=isMax?nBB.max[axis]:nBB.min[axis];
    var delta=oPlane-nPlane;

    var t=new THREE.Vector3(0,0,0);
    t[axis]=delta;
    
    // Центрирование по двум другим осям (параллельным плоскости грани)
    // Это исправляет смещение граней разных типов
    var axes = ['x', 'y', 'z'];
    for (var i = 0; i < axes.length; i++) {
      var ax = axes[i];
      if (ax === axis) continue; // пропускаем ось грани
      
      var oCenterAx = (oBB.min[ax] + oBB.max[ax]) / 2;
      var nCenterAx = (nBB.min[ax] + nBB.max[ax]) / 2;
      t[ax] = oCenterAx - nCenterAx;
    }
    
    ng.translate(t.x,t.y,t.z);

    ng.computeBoundingBox();
    ng.computeVertexNormals();
    return ng;
  }

  // Extract per-face metadata (colors, types, geometries in group space)
  function faceMetaFromBlock(blk){
    var colors={}, types={}, geoms={}, dirs=['top','bottom','front','back','left','right'];
    for(var i=0;i<dirs.length;i++){
      var dir=dirs[i], f=blk.userData.faces[dir];
      if(!f) continue;
      var hex = '#7D7F7D';
      try{
        if(f.material && f.material.userData && f.material.userData.baseHex) hex = f.material.userData.baseHex;
        else if(f.material && f.material.color) hex = '#'+f.material.color.getHexString();
      }catch(e){}
      colors[dir]=hex;
      
      // Определяем тип грани
      var faceType = (blk.userData.faceTypes && blk.userData.faceTypes[dir]) || null;
      if (!faceType) {
        faceType = blk.userData.kind || 'Void';
      }
      types[dir] = faceType;
      
      var g = f.geometry.clone();
      
      // Remove UV attribute for merge compatibility
      if (g.attributes.uv) {
        g.deleteAttribute('uv');
      }
      
      var mtx=new THREE.Matrix4().compose(
        f.position.clone(),
        new THREE.Quaternion().setFromEuler(f.rotation.clone()),
        f.scale.clone()
      );
      g.applyMatrix4(mtx);
      geoms[dir]=g;
    }
    return { colors:colors, types:types, geoms:geoms };
  }

  // Register a new prefab/custom kind from edited block
  function registerCustomKindFromBlock(blk, name){
    var merged = mergedGeomFromBlock(blk);
    if(!merged) return null;
    var meta = faceMetaFromBlock(blk);

    // Генерируем уникальное имя вида, чтобы не перетирать предыдущие
    var kind;
    if (name){
      var base = String(name);
      var candidate = base;
      var idx = 1;
      // Не даём перезаписать уже существующий kind
      while ((baseGeom[candidate] || customKinds[candidate]) && idx < 10000){
        candidate = base + '_' + String(idx++);
      }
      kind = candidate;
    } else {
      kind = 'Kind-' + String(KIND_AUTO++).padStart(3,'0');
    }

    // Для solid-куба используем слитую геометрию,
    // а для по-гранной версии — точные геометрии граней из meta.geoms
    baseGeom[kind] = merged;
    faceGeoms[kind] = meta.geoms || makeBoxFacesFromGeometry(merged);

    // Determine if this kind should behave like Zen/2 for snapping/orientation
    var zen2Like = false;
    try{
      if (blk && blk.userData){
        var srcKind = blk.userData.kind;
        if (srcKind === 'Zen/2'){
          zen2Like = true;
        } else if (customKinds && customKinds[srcKind] && customKinds[srcKind].zen2Like){
          zen2Like = true;
        }
      }
    }catch(e){}

    customKinds[kind] = {
      mergedGeom: merged,
      faceGeoms: meta.geoms,
      faceColors: meta.colors,
      faceTypes: meta.types,
      zen2Like: zen2Like
    };
    dbgGhost && dbgGhost('registered kind', { kind:kind, zen2Like:zen2Like });
    return kind;
  }

  try{ window.registerCustomKindFromBlock = registerCustomKindFromBlock; window.buildGroupFromCustomKind = buildGroupFromCustomKind; window.faceMetaFromBlock = faceMetaFromBlock; }catch(e){}

  // Build an editable group (6 faces) from a custom kind
  function buildGroupFromCustomKind(kind){
    var data = customKinds[kind];
    if(!data) return null;
    var group=new THREE.Group();
    group.userData={ kind:kind, isBlock:true, solid:false, faces:{}, faceTypes:{} };
    var dirs=['top','bottom','front','back','left','right'];
    for(var i=0;i<dirs.length;i++){
      var dir=dirs[i];
      var geom = data.faceGeoms[dir];
      if(!geom) continue;
      var hex = data.faceColors[dir] || '#7D7F7D';
      var mat = createMat(hex);
      try{ mat.userData={ baseHex:hex }; }catch(e){}
      var m=new THREE.Mesh(geom.clone(), mat);
      m.castShadow=true;
      m.name='face_'+dir;
      m.userData={ isFace:true, faceDir:dir };
      group.add(m);
      group.userData.faces[dir]=m;
      group.userData.faceTypes[dir] = data.faceTypes[dir] || kind;
      pickables.push(m);
    }
    return group;
  }
  // Build merged geometry from faces of an editable block (group)
  function mergedGeomFromBlock(blk){
    if(!blk || !blk.userData || !blk.userData.faces){
      dbgGhost('mergedGeomFromBlock: no faces on block', blk);
      return null;
    }
    var parts=[];
    var dirs=['top','bottom','front','back','left','right'];
    for(var i=0;i<dirs.length;i++){
      var dir=dirs[i];
      var f=blk.userData.faces[dir];
      if(!f || !f.geometry) continue;
      var g=f.geometry.clone();
      var mtx=new THREE.Matrix4();
      mtx.compose(
        f.position.clone(),
        new THREE.Quaternion().setFromEuler(f.rotation.clone()),
        f.scale.clone()
      );
      g.applyMatrix4(mtx);
      
      // Remove UV attribute to ensure merge compatibility
      if (g.attributes.uv) {
        g.deleteAttribute('uv');
      }
      
      parts.push(g);
    }
    if(parts.length===0){
      dbgGhost('mergedGeomFromBlock: no geometry parts collected');
      return null;
    }
    try{
      var merged=THREE.BufferGeometryUtils.mergeBufferGeometries(parts, true);
      merged.computeBoundingBox();
      merged.computeVertexNormals();
      return merged;
    }catch(e){
      dbgGhost('mergeBufferGeometries failed:', e);
      return null;
    }
  }

  // Adopt ghost geometry from the last edited block
  function adoptGhostFromEdited(blk){
    try{
      if(!blk){
        dbgGhost('adoptGhostFromEdited: no block');
        return false;
      }

      var kindName = GHOST_KIND_NAME;

      // Prefer full custom-kind registration to preserve per-face colors and geometry
      if (typeof registerCustomKindFromBlock === 'function'){
        var k = registerCustomKindFromBlock(blk, GHOST_KIND_NAME);
        if (k) kindName = k;
      } else {
        // Fallback: only merged geometry, like old behaviour
        var g = mergedGeomFromBlock(blk);
        if(!g){
          dbgGhost('adoptGhostFromEdited: merged geometry unavailable, keeping previous ghost.');
          return false;
        }
        baseGeom[kindName] = g;
        faceGeoms[kindName] = makeBoxFacesFromGeometry(g);
      }

      ghostType = kindName;

      // Update ghost using the same path as other UI controls
      if (typeof setGhostType === 'function'){
        setGhostType(kindName);
      } else if (typeof makeGhost === 'function'){
        makeGhost(kindName);
      }

      var g2 = baseGeom[kindName];
      if (g2 && g2.computeBoundingBox){
        g2.computeBoundingBox();
        var bb = g2.boundingBox;
        var size = new THREE.Vector3();
        bb.getSize(size);
        var half = size.clone().multiplyScalar(0.5);
        dbgGhost('adopted', {
          kind: kindName,
          size: [size.x,size.y,size.z],
          half: [half.x,half.y,half.z]
        });
      }

      return true;
    }catch(e){
      dbgGhost('adoptGhostFromEdited error:', e);
      return false;
    }
  }

  // expose helpers globally
  try{ window.mergedGeomFromBlock = mergedGeomFromBlock; window.adoptGhostFromEdited = adoptGhostFromEdited; }catch(e){}

  // ===== Scene / setup =====
  function setupScene(){
    scene=new THREE.Scene();

    // Fullscreen radial gradient background in a separate scene
    bgScene = new THREE.Scene();
    bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    (function(){
      var inner = srgbColor('#E9EDF5'); // bottom (near horizon)
      var outer = srgbColor('#111827'); // top / corners

      var bgMaterial = new THREE.ShaderMaterial({
        uniforms: {
          colorInner: { value: inner },
          colorOuter: { value: outer }
        },
        vertexShader: [
          'varying vec2 vUv;',
          'void main(){',
          '  vUv = uv;',
          '  gl_Position = vec4(position.xy, 0.0, 1.0);',
          '}'
        ].join('\n'),
        fragmentShader: [
          'varying vec2 vUv;',
          'uniform vec3 colorInner;',
          'uniform vec3 colorOuter;',
          'void main(){',
          '  float t = smoothstep(0.0, 1.0, vUv.y);',
          '  vec3 col = mix(colorInner, colorOuter, t);',
          '  gl_FragColor = vec4(col, 1.0);',
          '}'
        ].join('\n'),
        depthTest: false,
        depthWrite: false
      });

      bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMaterial);
      bgMesh.frustumCulled = false;
      bgScene.add(bgMesh);
    })();

    // The main 3D scene itself has no background color; gradient quad covers the frame
    scene.background = null;

    camera=new THREE.PerspectiveCamera(
      60,
      window.innerWidth/window.innerHeight,
      0.1,
      300
    );
    camera.position.set(6,4.2,6);

    
renderer=new THREE.WebGLRenderer({antialias:true});
    renderer.autoClear = false;
    
    
    
try{ renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 1.5)); }catch(_){}

try{
  var _dom = renderer.domElement;
  _dom.addEventListener('webglcontextlost', function(e){ e.preventDefault(); console.warn('WebGL context lost'); });
  _dom.addEventListener('webglcontextrestored', function(){ try{ renderer.info.reset(); }catch(_){ } });
}catch(_){}
setupColorPipeline(renderer);
    renderer.setClearColor( srgbColor('#8B95A7'), 1 );
    renderer.setSize(window.innerWidth,window.innerHeight);
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // --- Lights (studio-style warm key + cool rim + hemi fill) ---
    // soft fill from above/below
    var hemiLight = new THREE.HemisphereLight(
      0xbfd7ff, // cool sky
      0x2a1a10, // warm ground bounce
      0
    );
    /* hemi light disabled */
    scene.add(new THREE.AmbientLight(0xffffff, 0.02));

    // warm key light with shadows
    var keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(8,14,6);
    keyLight.castShadow=true;
    keyLight.shadow.mapSize.width  = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.radius = 24;
    keyLight.shadow.camera.far  = 80;
    keyLight.shadow.camera.left   = -20;
    keyLight.shadow.camera.right  =  20;
    keyLight.shadow.camera.top    =  20;
    keyLight.shadow.camera.bottom = -20;
    keyLight.shadow.normalBias = 0.015;
    scene.add(keyLight);

    // cool rim/back light, no shadows
    var rimLight = new THREE.DirectionalLight(0xffffff, 0.65);
    rimLight.position.set(-6,6,-10);
    rimLight.castShadow=false;
    scene.add(rimLight);

    // === Floor & walls from Cubik Build 1.0 ===
var plateSize=26*0.8;

    var floorMat=new THREE.MeshLambertMaterial({ color:0x5B676D });
    floorMat.color.copy( srgbColor('#5B676D') );;
    var floor=new THREE.Mesh(
      new THREE.PlaneGeometry(plateSize,plateSize),
      floorMat
    );
    floor.rotation.x=-Math.PI/2;
    floor.position.y=0;
    floor.receiveShadow=true;
    floor.name='floor';
    scene.add(floor);
    ground=floor;

    // glowing border around floor
    var edgeGeo=new THREE.EdgesGeometry(new THREE.PlaneGeometry(plateSize, plateSize));
    var edgeMat=new THREE.LineBasicMaterial({
      color:0x00eaff,
      transparent:true,
      opacity:0.5
    });
    var border=new THREE.LineSegments(edgeGeo,edgeMat);
    border.rotation.x=-Math.PI/2;
    border.position.y=0.002;
    scene.add(border);

    // corner walls
    var wallH=plateSize*0.4125;
    var wallMat=new THREE.MeshLambertMaterial({ color:0x8E969D });
    wallMat.color.copy( srgbColor('#8E969D') );;

    var wallFront=new THREE.Mesh(
      new THREE.PlaneGeometry(plateSize, wallH),
      wallMat
    );
    wallFront.position.set(0, wallH/2, -plateSize/2);
    wallFront.receiveShadow=true;
    scene.add(wallFront);

    var wallLeft=new THREE.Mesh(
      new THREE.PlaneGeometry(plateSize, wallH),
      wallMat
    );
    wallLeft.position.set(-plateSize/2, wallH/2, 0);
    wallLeft.rotation.y=Math.PI/2;
    wallLeft.receiveShadow=true;
    scene.add(wallLeft);
    applyBaseColors(scene, floor, [wallFront, wallLeft], { floor:'#5B676D', wall:'#8E969D', sky:'#8E969D' });

    // bevels
    var bevelW=plateSize*0.015;
    var bevelMat=new THREE.MeshLambertMaterial({ color:0x8E969D });;

    var bevelCorner=new THREE.Mesh(
      new THREE.BoxGeometry(bevelW, wallH, bevelW),
      bevelMat
    );
    bevelCorner.position.set(
      -plateSize/2 + bevelW/2,
      wallH/2,
      -plateSize/2 + bevelW/2
    );
    bevelCorner.castShadow=true;
    bevelCorner.receiveShadow=true;
    scene.add(bevelCorner);

    var bevelFrontFloor=new THREE.Mesh(
      new THREE.BoxGeometry(plateSize, bevelW, bevelW),
      bevelMat
    );
    bevelFrontFloor.position.set(
      0,
      bevelW/2,
      -plateSize/2 + bevelW/2
    );
    bevelFrontFloor.castShadow=true;
    bevelFrontFloor.receiveShadow=true;
    scene.add(bevelFrontFloor);

    var bevelLeftFloor=new THREE.Mesh(
      new THREE.BoxGeometry(bevelW, bevelW, plateSize),
      bevelMat
    );
    bevelLeftFloor.position.set(
      -plateSize/2 + bevelW/2,
      bevelW/2,
      0
    );
    bevelLeftFloor.castShadow=true;
    bevelLeftFloor.receiveShadow=true;
    scene.add(bevelLeftFloor);

    // edge lines for walls
    var wEdgeMat=new THREE.LineBasicMaterial({
      color:0x0a1222,
      transparent:true,
      opacity:0.55
    });
    var w1e=new THREE.LineSegments(
      new THREE.EdgesGeometry(wallFront.geometry),
      wEdgeMat
    );
    w1e.position.copy(wallFront.position);
    scene.add(w1e);

    var w2e=new THREE.LineSegments(
      new THREE.EdgesGeometry(wallLeft.geometry),
      wEdgeMat
    );
    w2e.position.copy(wallLeft.position);
    w2e.rotation.y=Math.PI/2;
    scene.add(w2e);

// Core interaction helpers
    raycaster=new THREE.Raycaster();
    mouse=new THREE.Vector2();

    controls=new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping=false;
    // disable middle-button orbit so we can use MMB to pick faces
    if(controls.mouseButtons){
      controls.mouseButtons.MIDDLE = null;
    }

    // Limit zoom-out distance so scene always stays in view
    if(typeof plateSize === 'number'){
      if(controls.maxDistance !== undefined) controls.maxDistance = plateSize * 0.9 * 1.4; // +40% zoom-out headroom
    }


    // Pointer events
    renderer.domElement.addEventListener('pointermove', onMoveQueued);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('click', onLeftClick);
    renderer.domElement.addEventListener('contextmenu', onRightClick);

    // Middle button / Tab -> open editor on hovered block
    function openByMiddle(e){
      if(e.button!==1) return;
      e.preventDefault();
      var hit=rayAt(e.clientX,e.clientY,pickables,true);
      if(hit){
        selectBlock(rootOf(hit.object));
        openEditor();
        ensureEditableSelected();
      }
    }
    renderer.domElement.addEventListener('auxclick', openByMiddle, false);
    renderer.domElement.addEventListener('mouseup', openByMiddle, false);
    renderer.domElement.addEventListener('mousedown', function(e){
      if(e.button===1) e.preventDefault();
    }, false);

    // Resize
    window.addEventListener('resize', function(){
      camera.aspect=window.innerWidth/window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth,window.innerHeight);
    });

    // UI buttons
    var clearBtn=el('clearBtn');
    if(clearBtn){
      clearBtn.addEventListener('click', function(){
        clearAll();
        pushState();
        resetPivot();
      });
    }

    var undoBtn=el('undoBtn');
    if(undoBtn) undoBtn.addEventListener('click', undoAction);

    var redoBtn=el('redoBtn');
    if(redoBtn) redoBtn.addEventListener('click', redoAction);

    var replayBtn = el('replayBuildBtn');
    if (replayBtn){
      replayBtn.addEventListener('click', function(){
        startBuildReplay({ record:false });
      });
    }

    var recordBtn = el('recordTimelapseBtn');
    if (recordBtn){
      recordBtn.addEventListener('click', function(){
        startBuildReplay({ record:true });
      });
    }

    var fr=el('faceColor');
    if(fr){
      fr.addEventListener('change', function(ev){
        setRAL(ev.target.value);
      });
    }

    var rep=el('replaceBtn');
    if(rep){
      rep.addEventListener('click', function(){
        if(replaceFaces()){
          pushState();
        }
      });
    }

    var edOv=el('edOverlay');
    if(edOv){
      edOv.addEventListener('click', closeEditor);
    }


    // Copy block under cursor to ghost (Ctrl+C)
    function copyBlockFromCursor(){
      if(!scene || !renderer) return false;

      var rect = renderer.domElement.getBoundingClientRect();
      var x = (lastCursor && lastCursor.x) || (rect.left + rect.width/2);
      var y = (lastCursor && lastCursor.y) || (rect.top + rect.height/2);

      var arr = (pickables && pickables.length) ? pickables : objects;
      if(!arr || !arr.length) return false;

      var hit = rayAt(x, y, arr, true);
      var blk = hit && hit.object ? rootOf(hit.object) : null;

      if(!blk && selectedBlock) blk = selectedBlock;
      if(!blk && objects && objects.length) blk = objects[objects.length-1];
      if(!blk) return false;

      var sourceBlock = blk;

      // Если копируем Zen/2-подобный куб — синхронизируем глобальную ориентацию
      try{
        if (sourceBlock && sourceBlock.userData && isZen2LikeKind(sourceBlock.userData.kind)){
          var twoPi = Math.PI * 2;
          function normAngleLocal(a){
            a = a % twoPi;
            if (a < 0) a += twoPi;
            return a;
          }
          var rx = normAngleLocal(sourceBlock.rotation.x || 0);
          var rz = normAngleLocal(sourceBlock.rotation.z || 0);
          var eps = 0.01;
          var ori = 0;
          if (Math.abs(rx - Math.PI/2) < eps || Math.abs(rx - 3*Math.PI/2) < eps){
            ori = 1;
          } else if (Math.abs(rz - Math.PI/2) < eps || Math.abs(rz - 3*Math.PI/2) < eps){
            ori = 2;
          }
          zen2OrientationIndex = ori;
          zen2HalfCache = {};
        }
      }catch(e){}

      // Helper: основной цвет блока
      function getBlockMainColorHex(block){
        try{
          if(block.userData && block.userData.faces){
            var dirs=['top','front','right','left','back','bottom'];
            for(var i=0;i<dirs.length;i++){
              var f=block.userData.faces[dirs[i]];
              if(!f || !f.material) continue;
              if(f.material.userData && f.material.userData.baseHex){
                return f.material.userData.baseHex;
              }
              if(f.material.color){
                return '#'+f.material.color.getHexString();
              }
            }
          }
          if(block.material){
            if(block.material.userData && block.material.userData.baseHex){
              return block.material.userData.baseHex;
            }
            if(block.material.color){
              return '#'+block.material.color.getHexString();
            }
          }
        }catch(e){}
        return currentColorHex || '#7D7F7D';
      }

      var kindHex = getBlockMainColorHex(sourceBlock);

      // Если это обычный солидный куб — просто используем базовый kind
      if(sourceBlock.userData && sourceBlock.userData.solid){
        var baseKind = sourceBlock.userData.kind || ghostType || 'Zen';

        if(kindHex){
          currentColorHex = kindHex;
          if(typeof setRAL === 'function') setRAL(kindHex);
        }

        if(typeof setGhostType === 'function'){
          setGhostType(baseKind);
        }else{
          ghostType = baseKind;
          if(typeof makeGhost === 'function') makeGhost(baseKind);
        }

        if(typeof updateGhost === 'function') updateGhost();
        try{ console.log('[COPY] solid block copied as kind', baseKind, 'color', kindHex); }catch(_){}
        return true;
      }

      // Если это уже "редакторский" / составной блок — регаем кастомный kind
      var kindSource = sourceBlock;
      var kind = null;

      if(typeof registerCustomKindFromBlock === 'function' && kindSource){
        try{
          kind = registerCustomKindFromBlock(kindSource, null);
        }catch(e){
          try{ console.error('[COPY] registerCustomKindFromBlock failed', e); }catch(_){}
        }
      }

      if(kind && typeof setGhostType === 'function'){
        setGhostType(kind);
      }

      if(kindHex){
        currentColorHex = kindHex;
        if(typeof setRAL === 'function') setRAL(kindHex);
      }

      if(typeof updateGhost === 'function') updateGhost();
      try{ console.log('[COPY] complex block copied to ghost', kind); }catch(_){}
      return true;
    }

    // Keyboard controls / hotkeys
    window.addEventListener('keydown', function(e){
      if((e.ctrlKey||e.metaKey) && e.shiftKey && (e.key==='z' || e.key==='Z')){ e.preventDefault(); return; }

      var k = (e.key||'').toLowerCase();
      var isCtrl = e.ctrlKey || e.metaKey;

      // Ctrl+C -> copy block under cursor to ghost
      if(isCtrl && k==='c'){
        var t = e.target;
        var tag = t && t.tagName ? t.tagName.toLowerCase() : '';
        var isEditing = t && (t.isContentEditable || tag==='input' || tag==='textarea' || tag==='select');
        if(!isEditing){
          e.preventDefault();
          e.stopPropagation();
          if(typeof copyBlockFromCursor === 'function' && copyBlockFromCursor()){
            return;
          }
        }
      }

      if(e.code==='KeyW') keyState.w=true;
      if(e.code==='KeyA') keyState.a=true;
      if(e.code==='KeyS') keyState.s=true;
      if(e.code==='KeyD') keyState.d=true;
      if(e.code==='KeyE') keyState.e=true;
      if(e.code==='KeyF') keyState.f=true;
      if(e.code==='KeyQ') keyState.q=true;
      if(e.code==='KeyR') keyState.r=true;

      if(e.key==='Escape'){
        closeEditor();
      }
      if(e.key==='Tab'){
        e.preventDefault();
        var hit=rayAt(lastCursor.x,lastCursor.y,pickables,true);
        if(hit){
          selectBlock(rootOf(hit.object));
          openEditor();
          ensureEditableSelected();
        }
      }
      // Undo / Redo
      if((e.ctrlKey||e.metaKey) && (e.key==='z' || e.key==='Z')){
        e.preventDefault();
        undoAction();
      }
      if((e.ctrlKey||e.metaKey) && (e.key==='y' || e.key==='Y')){
        e.preventDefault();
        redoAction();
      }
    });

    window.addEventListener('keyup', function(e){
      if(e.code==='KeyW') keyState.w=false;
      if(e.code==='KeyA') keyState.a=false;
      if(e.code==='KeyS') keyState.s=false;
      if(e.code==='KeyD') keyState.d=false;
      if(e.code==='KeyE') keyState.e=false;
      if(e.code==='KeyF') keyState.f=false;
      if(e.code==='KeyQ') keyState.q=false;
      if(e.code==='KeyR') keyState.r=false;
    });
  }

  // reset pivot to origin-ish
  function resetPivot(){
    try{
      var h=getHalf('Void').y;
      lastPlacedCenter.set(0, h, 0);
    }catch(e){
      lastPlacedCenter.set(0, 0.5, 0);
    }
  }

  function rootOf(o){
    var x=o;
    while(x && x.parent && x.parent!==scene){
      if(x.userData && x.userData.isBlock) break;
      x=x.parent;
    }
    return x||o;
  }

  function rayAt(x,y,arr,recursive){
    var r=renderer.domElement.getBoundingClientRect();
    var v=new THREE.Vector2(
      ((x-r.left)/r.width)*2-1,
      -((y-r.top)/r.height)*2+1
    );
    raycaster.setFromCamera(v,camera);
    var list=arr||scene.children;
    var hits=raycaster.intersectObjects(list, !!recursive);
    return hits[0]||null;
  }

  function getHalf(kind){
    // Orientation-aware half extents for Zen/2-like kinds
    if (isZen2LikeKind(kind)){
      // Use cached value per (kind, orientation) pair if available
      var cacheKey = String(kind) + ':' + String(zen2OrientationIndex);
      if (zen2HalfCache && zen2HalfCache.hasOwnProperty(cacheKey)){
        return zen2HalfCache[cacheKey].clone();
      }
      var g0 = baseGeom[kind];
      if (!g0){
        return new THREE.Vector3(0.5,0.5,0.5);
      }
      if (!g0.boundingBox){
        g0.computeBoundingBox();
      }
      // Start from base bounding box and rotate a copy according to orientation
      var box = g0.boundingBox.clone();
      var m = new THREE.Matrix4();
      if (zen2OrientationIndex === 1){
        m.makeRotationX(Math.PI/2);
        box.applyMatrix4(m);
      } else if (zen2OrientationIndex === 2){
        m.makeRotationZ(Math.PI/2);
        box.applyMatrix4(m);
      }
      var size = new THREE.Vector3();
      box.getSize(size);
      var h0 = size.multiplyScalar(0.5);

      if (!zen2HalfCache) zen2HalfCache = {};
      zen2HalfCache[cacheKey] = h0.clone();
      return h0;
    }

    var g = baseGeom[kind];
    if(!g){
      return new THREE.Vector3(0.5,0.5,0.5);
    }

    // Принудительно вычисляем bounding box
    if (!g.boundingBox) {
      g.computeBoundingBox();
    }

    var s = new THREE.Vector3();
    g.boundingBox.getSize(s);
    return s.multiplyScalar(0.5);
  }

  /**
   * Get half-extents for SNAPPING purposes (ignores Flora bowl protrusion)
   * For Flora-based kinds, returns standard cube size (0.5, 0.5, 0.5)
   * because snapping should align cube bases, not bowl tips
   */
  function getSnapHalf(kind) {
    // Check if kind has Flora faces - if so, use standard cube size for snapping
    if (kind === 'Flora') {
      return new THREE.Vector3(0.5, 0.5, 0.5);
    }
    
    // Check custom kinds for Flora faces
    if (customKinds && customKinds[kind]) {
      var ck = customKinds[kind];
      var hasFloraFace = false;
      if (ck.faceTypes) {
        var dirs = ['front', 'back', 'left', 'right', 'top', 'bottom'];
        for (var i = 0; i < dirs.length; i++) {
          if (ck.faceTypes[dirs[i]] === 'Flora') {
            hasFloraFace = true;
            break;
          }
        }
      }
      if (hasFloraFace) {
        // Use base kind size or standard cube
        var baseKind = ck.baseKind || 'Bion';
        if (baseKind === 'Flora') {
          return new THREE.Vector3(0.5, 0.5, 0.5);
        }
        // Get size from base kind (e.g. Bion)
        return getHalf(baseKind);
      }
    }
    
    // For non-Flora kinds, use regular getHalf
    return getHalf(kind);
  }

function aabb(kind,center){
    var h=getHalf(kind);
    return new THREE.Box3().setFromCenterAndSize(
      center,
      new THREE.Vector3(h.x*2,h.y*2,h.z*2)
    );
  }

  // Helper: get face direction name from normal vector
  function getFaceDirFromNormal(n) {
    var ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    if (ay >= ax && ay >= az) {
      return n.y > 0 ? 'top' : 'bottom';
    } else if (ax >= ay && ax >= az) {
      return n.x > 0 ? 'right' : 'left';
    } else {
      return n.z > 0 ? 'front' : 'back';
    }
  }

  // Helper: check if block has Flora face in given direction
  function hasFloraFace(blk, dir) {
    if (!blk || !blk.userData) return false;
    var faceTypes = blk.userData.faceTypes;
    if (!faceTypes) return false;
    return faceTypes[dir] === 'Flora';
  }

  // Helper: get Flora protrusion for a block face (returns 0 if not Flora)
  function getFloraProtrusion(blk, dir) {
    if (hasFloraFace(blk, dir)) {
      return typeof FLORA_BOWL_PROTRUSION !== 'undefined' ? FLORA_BOWL_PROTRUSION : 0.46;
    }
    return 0;
  }


  // ===== Flora upright correction (roll around face normal) =====
  // Ensures Flora bowls stay "up" in WORLD space even when the parent block is rotated.
  function __floraFaceNormalLocal(dir){
    var d=(dir||'').toLowerCase();
    if(d==='left') return new THREE.Vector3(-1,0,0);
    if(d==='right') return new THREE.Vector3(1,0,0);
    if(d==='front') return new THREE.Vector3(0,0,1);
    if(d==='back') return new THREE.Vector3(0,0,-1);
    if(d==='top') return new THREE.Vector3(0,1,0);
    if(d==='bottom') return new THREE.Vector3(0,-1,0);
    return new THREE.Vector3(0,1,0);
  }

  // Local "up" direction of Flora geometry for each face, in BLOCK local coordinates.
  // This matches createFloraForFace() rotations (see embedded models section).
  function __floraUpLocal(dir){
    var d=(dir||'').toLowerCase();
    // IMPORTANT:
    // createFloraForFace('top') does: translate as front + rotateX(-90°)
    // so original Flora +Y (model "up") becomes BLOCK local -Z.
    // createFloraForFace('bottom') does: translate as front + rotateX(+90°)
    // so original Flora +Y becomes BLOCK local +Z.
    if(d==='top') return new THREE.Vector3(0,0,-1);
    if(d==='bottom') return new THREE.Vector3(0,0,1);
    // For side faces Flora is only rotated around Y, so +Y remains "up".
    return new THREE.Vector3(0,1,0);
  }

  function applyFloraUprightRoll(faceMesh, blk, dir){
    if(!faceMesh || !blk || !blk.quaternion) return;

    // Base orientation (identity for normal faces). If not present, capture once.
    try{
      if(!faceMesh.userData) faceMesh.userData = {};
      if(!faceMesh.userData._floraBaseQuat){
        faceMesh.userData._floraBaseQuat = faceMesh.quaternion.clone();
      }
    }catch(_){}

    var baseQ = (faceMesh.userData && faceMesh.userData._floraBaseQuat)
      ? faceMesh.userData._floraBaseQuat
      : new THREE.Quaternion();

    var localNormal = __floraFaceNormalLocal(dir).normalize();
    var floraLocalUp = __floraUpLocal(dir).normalize();

    // World normal of the face
    var worldNormal = localNormal.clone().applyQuaternion(blk.quaternion).normalize();
    var worldUp = new THREE.Vector3(0,1,0);

    // Desired world-up projected onto the face plane (cannot be achieved if face is horizontal in world)
    var dotWU = worldUp.dot(worldNormal);
    var desiredWorldUp = worldUp.clone().sub(worldNormal.clone().multiplyScalar(dotWU));
    if(desiredWorldUp.lengthSq() < 1e-8){
      // Face is (almost) horizontal in world; keep base roll.
      faceMesh.quaternion.copy(baseQ);
      return;
    }
    desiredWorldUp.normalize();

    // Convert desired world-up into block local space
    var invCubeQ = blk.quaternion.clone().invert();
    var desiredLocalUp = desiredWorldUp.clone().applyQuaternion(invCubeQ).normalize();

    // Project both vectors onto the plane orthogonal to the localNormal (roll around normal)
    var currentProjected = floraLocalUp.clone().sub(localNormal.clone().multiplyScalar(floraLocalUp.dot(localNormal)));
    var desiredProjected = desiredLocalUp.clone().sub(localNormal.clone().multiplyScalar(desiredLocalUp.dot(localNormal)));

    if(currentProjected.lengthSq() < 1e-8 || desiredProjected.lengthSq() < 1e-8){
      faceMesh.quaternion.copy(baseQ);
      return;
    }

    currentProjected.normalize();
    desiredProjected.normalize();

    var cosAngle = currentProjected.dot(desiredProjected);
    // Clamp to avoid NaNs from floating point drift
    cosAngle = Math.max(-1, Math.min(1, cosAngle));

    var sinAngle = new THREE.Vector3().crossVectors(currentProjected, desiredProjected).dot(localNormal);
    var angle = Math.atan2(sinAngle, cosAngle);

    var rotQ = new THREE.Quaternion().setFromAxisAngle(localNormal, angle);

    // Compose base orientation with roll correction
    faceMesh.quaternion.copy(baseQ).multiply(rotQ);
  }

  function __blockHasAnyFlora(blk){
    if(!blk || !blk.userData || !blk.userData.faceTypes) return false;
    var ft = blk.userData.faceTypes;
    return ft.top==='Flora' || ft.bottom==='Flora' || ft.front==='Flora' || ft.back==='Flora' || ft.left==='Flora' || ft.right==='Flora';
  }

  // Apply upright correction to all Flora faces in the scene.
  // Runs cheaply: updates only when block quaternion changed.
  function ensureFloraUprightAll(){
    if(!objects || objects.length===0) return;
    for(var i=0;i<objects.length;i++){
      var blk = objects[i];
      if(!blk || !blk.userData || !blk.userData.faces) continue;
      if(!__blockHasAnyFlora(blk)) continue;

      var q = blk.quaternion;
      if(!q) continue;

      var last = blk.userData._floraLastQ;
      var same = false;
      if(last){
        // small epsilon is enough; quaternions are stable
        same = (Math.abs(last.x - q.x) < 1e-6) &&
               (Math.abs(last.y - q.y) < 1e-6) &&
               (Math.abs(last.z - q.z) < 1e-6) &&
               (Math.abs(last.w - q.w) < 1e-6);
      }
      if(same) continue;

      blk.userData._floraLastQ = {x:q.x, y:q.y, z:q.z, w:q.w};

      var dirs=['top','bottom','front','back','left','right'];
      for(var di=0; di<dirs.length; di++){
        var dir = dirs[di];
        if(!(blk.userData.faceTypes && blk.userData.faceTypes[dir]==='Flora')) continue;
        var faceMesh = blk.userData.faces[dir];
        if(!faceMesh) continue;
        try{ applyFloraUprightRoll(faceMesh, blk, dir); }catch(_){}
      }
    }
  }

  // Helper: get all Flora bowl boxes for a block (for collision detection)
  function getFloraBoxes(blk) {
    var boxes = [];
    if (!blk || !blk.userData || !blk.userData.faceTypes) return boxes;
    
    var pos = blk.position;
    var kind = blk.userData.kind || 'Void';
    // Use baseKind for half-extents calculation
    var baseKind = kind;
    if (customKinds && customKinds[kind] && customKinds[kind].baseKind) {
      baseKind = customKinds[kind].baseKind;
    }
    var h = getHalf(baseKind);
    var protrusion = typeof FLORA_BOWL_PROTRUSION !== 'undefined' ? FLORA_BOWL_PROTRUSION : 0.46;
    var bowlSize = 1.0; // bowl width/height (slightly less than cube face)
    
    var faceTypes = blk.userData.faceTypes;
    
    // For each Flora face, create a box representing the bowl protrusion
    if (faceTypes.front === 'Flora') {
      boxes.push(new THREE.Box3(
        new THREE.Vector3(pos.x - bowlSize/2, pos.y - bowlSize/2, pos.z + h.z),
        new THREE.Vector3(pos.x + bowlSize/2, pos.y + bowlSize/2, pos.z + h.z + protrusion)
      ));
    }
    if (faceTypes.back === 'Flora') {
      boxes.push(new THREE.Box3(
        new THREE.Vector3(pos.x - bowlSize/2, pos.y - bowlSize/2, pos.z - h.z - protrusion),
        new THREE.Vector3(pos.x + bowlSize/2, pos.y + bowlSize/2, pos.z - h.z)
      ));
    }
    if (faceTypes.right === 'Flora') {
      boxes.push(new THREE.Box3(
        new THREE.Vector3(pos.x + h.x, pos.y - bowlSize/2, pos.z - bowlSize/2),
        new THREE.Vector3(pos.x + h.x + protrusion, pos.y + bowlSize/2, pos.z + bowlSize/2)
      ));
    }
    if (faceTypes.left === 'Flora') {
      boxes.push(new THREE.Box3(
        new THREE.Vector3(pos.x - h.x - protrusion, pos.y - bowlSize/2, pos.z - bowlSize/2),
        new THREE.Vector3(pos.x - h.x, pos.y + bowlSize/2, pos.z + bowlSize/2)
      ));
    }
    
    return boxes;
  }

  // collision / placement check
  
function canPlace(center, kind, ignore){
    var h = getHalf(kind);

    // Допуск для проверки пересечений - достаточно большой чтобы учесть
    // погрешности при стыковке грань-к-грани
    var EPS = Math.max(h.x, h.y, h.z) * 0.01; // 1% от размера блока

    // Не даём кубу заметно проваливаться ниже пола
    var bottomY = center.y - h.y;
    if (bottomY < -EPS){
      return false;
    }

    // Жёстко запрещаем ставить куб в позицию, где уже стоит другой куб
    // (центры совпадают в пределах малого допуска). Это отрубает кейс "куб в куб".
    var centerEps = Math.max(h.x, h.y, h.z) * 0.1; // 10% - достаточно для детекции "куб в кубе"
    for (var ci = 0; ci < objects.length; ci++){
      var co = objects[ci];
      if (!co || !co.userData) continue;
      if (ignore && (co === ignore || co.uuid === ignore.uuid)) continue;
      var cp = co.position;
      if (Math.abs(cp.x - center.x) < centerEps &&
          Math.abs(cp.y - center.y) < centerEps &&
          Math.abs(cp.z - center.z) < centerEps){
        return false;
      }
    }

    // Тестовый бокс для нового блока - немного уменьшаем чтобы
    // разрешить стыковку грань-к-грани без ложных срабатываний
    var shrink = EPS * 2;
    var sx = Math.max(h.x * 2 - shrink, 0.01);
    var sy = Math.max(h.y * 2 - shrink, 0.01);
    var sz = Math.max(h.z * 2 - shrink, 0.01);
    var test = new THREE.Box3().setFromCenterAndSize(
      center,
      new THREE.Vector3(sx, sy, sz)
    );

    for (var i = 0; i < objects.length; i++){
      var o = objects[i];
      if (!o || !o.userData) continue;
      
      if (ignore){
        // Всегда игнорируем сам объект, к которому стыкуемся.
        if (o === ignore || o.uuid === ignore.uuid) continue;

        // Для Zen/2-подобных колонн разрешаем стыковку к целой колонне
        if (typeof isZen2LikeKind === 'function' &&
            isZen2LikeKind(kind) &&
            o.userData && ignore.userData &&
            isZen2LikeKind(ignore.userData.kind)){
          var dxCol = Math.abs(o.position.x - ignore.position.x);
          var dzCol = Math.abs(o.position.z - ignore.position.z);
          if (dxCol < 1e-3 && dzCol < 1e-3){
            continue;
          }
        }
      }

      var okind = o.userData.kind;
      var ob;
      // Для Zen/2-подобных берём реальный AABB по текущему повороту,
      // для остальных — используем aabb по типу
      var useExactBox = isZen2LikeKind(okind);
      if (!useExactBox && o.scale){
        var scx = Math.abs(o.scale.x - 1);
        var scy = Math.abs(o.scale.y - 1);
        var scz = Math.abs(o.scale.z - 1);
        if (scx > 1e-6 || scy > 1e-6 || scz > 1e-6){
          useExactBox = true;
        }
      }
      
      if (useExactBox){
        ob = new THREE.Box3().setFromObject(o);
      } else {
        ob = aabb(okind, o.position);
      }
      
      // Также немного уменьшаем существующий бокс для допуска касания
      var obShrink = EPS;
      ob.min.x += obShrink;
      ob.min.y += obShrink;
      ob.min.z += obShrink;
      ob.max.x -= obShrink;
      ob.max.y -= obShrink;
      ob.max.z -= obShrink;

      // Проверяем реальное пересечение (не касание)
      var overlapX = test.max.x > ob.min.x && test.min.x < ob.max.x;
      var overlapY = test.max.y > ob.min.y && test.min.y < ob.max.y;
      var overlapZ = test.max.z > ob.min.z && test.min.z < ob.max.z;

      if (overlapX && overlapY && overlapZ){
        return false;
      }
    }
    
    // Flora bowls are decorative - they can overlap with other blocks
    // The snap logic handles proper positioning with offset
    
    return true;
  }

function snap(v, step){
    var eps = step * 1e-4;
    return Math.round((v + (v >= 0 ? eps : -eps)) / step) * step;
  }

  function getAxisSnapStep(axis, hv, kind){
    var st;
    if (typeof isZen2LikeKind === 'function' && isZen2LikeKind(kind)){
      if (zen2OrientationIndex === 1){
        if (axis === 'x'){
          st = 128;
        } else if (axis === 'y'){
          st = 225;
        } else {
          st = hv[axis] * 2;
        }
      } else if (zen2OrientationIndex === 2){
        if (axis === 'z'){
          st = 128;
        } else if (axis === 'y'){
          st = 225;
        } else {
          st = hv[axis] * 2;
        }
      } else {
        st = hv[axis] * 2;
      }
    } else {
      st = hv[axis] * 2;
    }
    return st;
  }


  // Pointer move = ghost follow
  function onMove(e){
    // Скрываем призрак если открыт редактор
    if(document.body.classList.contains('editor-open')){
      if(ghost && ghost.visible){
        ghost.visible = false;
      }
      return;
    }

    lastCursor.x=e.clientX;
    lastCursor.y=e.clientY;

    var r=renderer.domElement.getBoundingClientRect();
    mouse.x=((e.clientX-r.left)/r.width)*2-1;
    mouse.y=-((e.clientY-r.top)/r.height)*2+1;

    raycaster.setFromCamera(mouse,camera);
    var hits=raycaster.intersectObjects(snapTargets,true);

    if(!ghost){
      return;
    }
    if(!hits.length){
      ghost.visible=false;
      return;
    }
    var hit=hits[0];
    if(hit && hit.object && hit.object.userData && hit.object.userData.wrapperOwner){ hit.object = hit.object.userData.wrapperOwner; }

    var h=getSnapHalf(ghostType);
    var pos=new THREE.Vector3();
    var ok=true;

    if(hit.object===ground){
      // Попали в пол. Но сначала проверим, нет ли над точкой пола куба,
      // от которого логичнее стыковаться (как в твоём кейсе под перемычкой).
      var hp = hit.point.clone();
      var support = null;
      var supportBox = null;
      var bestY = Infinity;
      var epsXZ = 1e-3;

      for(var si=0; si<objects.length; si++){
        var so = objects[si];
        if(!so || !so.userData) continue;
        var sk = so.userData.kind;
        var sbox;
        // Для Zen/2 используем setFromObject из-за ориентации,
        // для остальных - точный aabb на основе known half-extents
        if (typeof isZen2LikeKind === 'function' && isZen2LikeKind(sk)){
          sbox = new THREE.Box3().setFromObject(so);
        } else {
          sbox = aabb(sk, so.position);
        }
        if(hp.x >= sbox.min.x - epsXZ && hp.x <= sbox.max.x + epsXZ &&
           hp.z >= sbox.min.z - epsXZ && hp.z <= sbox.max.z + epsXZ &&
           sbox.min.y > hp.y + 1e-3){
          if(sbox.min.y < bestY){
            bestY = sbox.min.y;
            support = so;
            supportBox = sbox;
          }
        }
      }

      if(support && supportBox){
        // Проверяем, есть ли место между полом и support'ом для нового куба
        var spaceUnderSupport = supportBox.min.y;
        var newBlockHeight = h.y * 2;
        
        // Если места достаточно для куба на полу под support'ом
        if(spaceUnderSupport >= newBlockHeight - 0.01){
          // Ставим куб на пол, выравнивая по XZ с support'ом
          var axisU='x', axisV='z';

          function clampSnapLocal(val,axis,box,hv){
            var min=box.min[axis], max=box.max[axis];
            var half=hv[axis];

            var st = getAxisSnapStep(axis, hv, ghostType);

            var bottom=min+half, top=max-half;

            // Если блок больше доступного пролёта по этой оси — прижимаем к ближайшему краю.
            if(top < bottom){
              return (Math.abs(val - bottom) <= Math.abs(val - top)) ? bottom : top;
            }

            var nv = snap(val - bottom, st) + bottom;

            if(Math.abs(val-top) <= st*0.5) nv=top;
            if(Math.abs(val-bottom) <= st*0.5) nv=bottom;

            if(nv<bottom) nv=bottom;
            if(nv>top) nv=top;
            return nv;
          }

          pos.x = clampSnapLocal(hp.x,'x',supportBox,h);
          pos.z = clampSnapLocal(hp.z,'z',supportBox,h);
          // Ставим на пол (центр куба на высоте h.y)
          pos.y = h.y;

          ok = canPlace(pos, ghostType, support);
          if(ghost && ghost.userData){ ghost.userData.hitBlock = support; }
        } else {
          // Места нет - обычная логика пола
          var stx = h.x * 2;
          var stz = h.z * 2;
          pos.set(
            snap(hit.point.x, stx),
            h.y,
            snap(hit.point.z, stz)
          );
          ok = canPlace(pos, ghostType);
          if(ghost && ghost.userData){ ghost.userData.hitBlock = null; }
        }
      } else {
        // Обычная логика снапа по полу: на базовом уровне сетка не зависит от ориентации блока.
        var stx = h.x * 2;
        var stz = h.z * 2;
        pos.set(
          snap(hit.point.x, stx),
          h.y,
          snap(hit.point.z, stz)
        );
        ok = canPlace(pos, ghostType);
        if(ghost && ghost.userData){ ghost.userData.hitBlock = null; }
      }
    }else {      var blk=rootOf(hit.object);
      
      // Используем точный AABB на основе known half-extents вместо setFromObject,
      // который даёт неточные результаты для сложной геометрии
      var blkKind = (blk.userData && blk.userData.kind) ? blk.userData.kind : 'Void';
      var box;
      if (isZen2LikeKind(blkKind)) {
        // Для Zen/2 всё ещё используем setFromObject из-за ориентации
        box = new THREE.Box3().setFromObject(blk);
      } else {
        // Для остальных - используем точный aabb на основе half-extents
        box = aabb(blkKind, blk.position);
      }

      var n=hit.face.normal.clone()
        .transformDirection(hit.object.matrixWorld)
        .normalize();

      // Check if hit point is outside the base cube bounds (i.e. hitting a Flora bowl)
      var isFloraHit = false;
      var floraFaceDir = null;
      var floraWorldNormal = null;
      var floraLocalHalfExtent = 0; // Расстояние от центра блока до грани Flora (в локальных координатах)
      
      if (blk.userData && blk.userData.faceTypes) {
        var baseKind = blkKind;
        if (customKinds && customKinds[blkKind] && customKinds[blkKind].baseKind) {
          baseKind = customKinds[blkKind].baseKind;
        }
        
        // Для Zen/2 используем локальные half-extents (оригинальные размеры без rotation)
        var blkH;
        if (isZen2LikeKind(blkKind)) {
          var origGeom = baseGeom[blkKind];
          if (origGeom) {
            if (!origGeom.boundingBox) origGeom.computeBoundingBox();
            var origSize = new THREE.Vector3();
            origGeom.boundingBox.getSize(origSize);
            blkH = origSize.multiplyScalar(0.5);
          } else {
            blkH = getHalf(baseKind);
          }
        } else {
          blkH = getHalf(baseKind);
        }
        
        // Преобразуем hit.point в ИСТИННЫЕ локальные координаты (с учётом rotation)
        var localHit = blk.worldToLocal(hit.point.clone());
        
        // Check if hit point is outside cube bounds (with small tolerance)
        var tol = 0.05;
        var outsideX = Math.abs(localHit.x) > blkH.x + tol;
        var outsideY = Math.abs(localHit.y) > blkH.y + tol;
        var outsideZ = Math.abs(localHit.z) > blkH.z + tol;
        
        if (outsideX || outsideY || outsideZ) {
          // Hit point is outside cube - determine which Flora face (in LOCAL coords)
          var maxDist = 0;
          var faces = [
            { dir: 'right',  dist: localHit.x - blkH.x, hasFlora: blk.userData.faceTypes.right === 'Flora', localNormal: new THREE.Vector3(1, 0, 0), halfExt: blkH.x },
            { dir: 'left',   dist: -localHit.x - blkH.x, hasFlora: blk.userData.faceTypes.left === 'Flora', localNormal: new THREE.Vector3(-1, 0, 0), halfExt: blkH.x },
            { dir: 'top',    dist: localHit.y - blkH.y, hasFlora: blk.userData.faceTypes.top === 'Flora', localNormal: new THREE.Vector3(0, 1, 0), halfExt: blkH.y },
            { dir: 'bottom', dist: -localHit.y - blkH.y, hasFlora: blk.userData.faceTypes.bottom === 'Flora', localNormal: new THREE.Vector3(0, -1, 0), halfExt: blkH.y },
            { dir: 'front',  dist: localHit.z - blkH.z, hasFlora: blk.userData.faceTypes.front === 'Flora', localNormal: new THREE.Vector3(0, 0, 1), halfExt: blkH.z },
            { dir: 'back',   dist: -localHit.z - blkH.z, hasFlora: blk.userData.faceTypes.back === 'Flora', localNormal: new THREE.Vector3(0, 0, -1), halfExt: blkH.z }
          ];
          
          // Find the face that the point is most outside of
          for (var fi = 0; fi < faces.length; fi++) {
            if (faces[fi].dist > maxDist && faces[fi].hasFlora) {
              maxDist = faces[fi].dist;
              floraFaceDir = faces[fi].dir;
              floraLocalHalfExtent = faces[fi].halfExt;
              // Преобразуем локальную нормаль в мировую
              floraWorldNormal = faces[fi].localNormal.clone().applyQuaternion(blk.quaternion).normalize();
              isFloraHit = true;
            }
          }
        }
      }

      var axisN='y',axisU='x',axisV='z';
      if(Math.abs(n.x)>=Math.abs(n.y) && Math.abs(n.x)>=Math.abs(n.z)){
        axisN='x'; axisU='y'; axisV='z';
      } else if(Math.abs(n.z)>=Math.abs(n.x) && Math.abs(n.z)>=Math.abs(n.y)){
        axisN='z'; axisU='x'; axisV='y';
      }
      
      // For Flora hit, override axis based on WORLD normal
      if (isFloraHit && floraWorldNormal) {
        var absX = Math.abs(floraWorldNormal.x);
        var absY = Math.abs(floraWorldNormal.y);
        var absZ = Math.abs(floraWorldNormal.z);
        
        if (absX >= absY && absX >= absZ) {
          axisN = 'x'; axisU = 'y'; axisV = 'z';
        } else if (absY >= absX && absY >= absZ) {
          axisN = 'y'; axisU = 'x'; axisV = 'z';
        } else {
          axisN = 'z'; axisU = 'x'; axisV = 'y';
        }
        // Use world normal for snapping direction
        n.copy(floraWorldNormal);
      }

      // For Flora hit, use block center for snapping (not bowl surface point)
      var snapPoint = isFloraHit ? blk.position : hit.point;

      function clampSnap(val,axis,box,hv){
        var min=box.min[axis], max=box.max[axis];
        var half=hv[axis];

        var st;
        if (isZen2LikeKind(ghostType)){
          // Orientation-specific snapping for Zen/2
          if (zen2OrientationIndex === 1){
            // Rotated 90° around X:
            //  - right/left (world X) step = 128 mm
            //  - up (world Y) step = 225 mm
            if (axis === 'x'){
              st = 128;
            } else if (axis === 'y'){
              st = 225;
            } else {
              // other axis keeps default block-based step
              st = (axis==='y'? hv.y*2 : (axis==='x'? hv.x*2 : hv.z*2));
            }
          } else if (zen2OrientationIndex === 2){
            // Rotated 90° around Z:
            //  - forward/back (world Z) step = 128 mm
            //  - up (world Y) step = 225 mm
            if (axis === 'z'){
              st = 128;
            } else if (axis === 'y'){
              st = 225;
            } else {
              st = (axis==='y'? hv.y*2 : (axis==='x'? hv.x*2 : hv.z*2));
            }
          } else {
            // Orientation index 0 — keep previous behaviour as is
            st = (axis==='y'? hv.y*2 : (axis==='x'? hv.x*2 : hv.z*2));
          }
        } else {
          st = (axis==='y'? hv.y*2 : (axis==='x'? hv.x*2 : hv.z*2));
        }

        // Вычисляем допустимый диапазон для центра нового блока
        var bottom=min+half, top=max-half;

        // Если блок больше пролёта по этой оси, прижимаем к ближайшей границе
        if(top < bottom){
          return (Math.abs(val - bottom) <= Math.abs(val - top)) ? bottom : top;
        }

        // Привязываем к сетке относительно грани куба
        var nv = snap(val - bottom, st) + bottom;

        // Приоритет краям, если курсор близко к ним
        if(Math.abs(val-top) <= st*0.5) nv=top;
        if(Math.abs(val-bottom) <= st*0.5) nv=bottom;

        // Ограничиваем результат в допустимом диапазоне
        if(nv<bottom) nv=bottom;
        if(nv>top) nv=top;
        return nv;
      }

      // Вычисляем позицию по нормали (грань-к-грани)
      // Для Flora hit на повёрнутом блоке: специальная логика
      if (isFloraHit && floraWorldNormal) {
        // Ghost half-extent вдоль направления нормали
        var absNx = Math.abs(floraWorldNormal.x);
        var absNy = Math.abs(floraWorldNormal.y);
        var absNz = Math.abs(floraWorldNormal.z);
        
        var ghostHalfInNormalDir;
        var ghostTouchFace;
        if (absNx >= absNy && absNx >= absNz) {
          ghostHalfInNormalDir = h.x;
          ghostTouchFace = floraWorldNormal.x > 0 ? 'left' : 'right';
        } else if (absNy >= absNx && absNy >= absNz) {
          ghostHalfInNormalDir = h.y;
          ghostTouchFace = floraWorldNormal.y > 0 ? 'bottom' : 'top';
        } else {
          ghostHalfInNormalDir = h.z;
          ghostTouchFace = floraWorldNormal.z > 0 ? 'back' : 'front';
        }
        
        // Check if ghost has Flora on the touching face
        var ghostHasFlora = false;
        if (customKinds && customKinds[ghostType] && customKinds[ghostType].faceTypes) {
          ghostHasFlora = customKinds[ghostType].faceTypes[ghostTouchFace] === 'Flora';
        }
        
        // Общее расстояние от центра блока до центра ghost'а
        var totalDist = floraLocalHalfExtent + ghostHalfInNormalDir;
        if (!ghostHasFlora) {
          totalDist += (typeof FLORA_BOWL_PROTRUSION !== 'undefined' ? FLORA_BOWL_PROTRUSION : 0.46);
        }
        
        // Позиция ghost'а = центр блока + floraWorldNormal * totalDist
        pos.copy(blk.position).addScaledVector(floraWorldNormal, totalDist);
        
      } else {
        // Стандартная логика для не-Flora
        pos[axisN]=(n[axisN]>0
          ? box.max[axisN]+h[axisN]
          : box.min[axisN]-h[axisN]);
      }

      // If ghost has Flora on the touching face, add offset so bowl doesn't intersect target
      // (Only when NOT snapping to Flora - that case is handled above)
      if (!isFloraHit) {
        var ghostTouchFaceNormal = null;
        if (n[axisN] > 0) {
          // Ghost's negative face touches target's positive face
          if (axisN === 'x') ghostTouchFaceNormal = 'left';
          else if (axisN === 'y') ghostTouchFaceNormal = 'bottom';
          else if (axisN === 'z') ghostTouchFaceNormal = 'back';
        } else {
          // Ghost's positive face touches target's negative face
          if (axisN === 'x') ghostTouchFaceNormal = 'right';
          else if (axisN === 'y') ghostTouchFaceNormal = 'top';
          else if (axisN === 'z') ghostTouchFaceNormal = 'front';
        }
        
        var ghostHasFloraOnTouch = false;
        if (customKinds && customKinds[ghostType] && customKinds[ghostType].faceTypes) {
          ghostHasFloraOnTouch = customKinds[ghostType].faceTypes[ghostTouchFaceNormal] === 'Flora';
        }
        
        if (ghostHasFloraOnTouch) {
          // Ghost has Flora bowl on the face touching target - need to move ghost away
          var floraOffsetGhost = typeof FLORA_BOWL_PROTRUSION !== 'undefined' ? FLORA_BOWL_PROTRUSION : 0.46;
          if (n[axisN] > 0) {
            pos[axisN] += floraOffsetGhost;
          } else {
            pos[axisN] -= floraOffsetGhost;
          }
        }
      }

      // Вычисляем позицию по осям параллельным грани
      // Для Flora hit: уже установили pos через addScaledVector, просто центрируем на блоке
      if (isFloraHit && floraWorldNormal) {
        // pos уже содержит правильную позицию вдоль нормали от addScaledVector
        // Нужно только убедиться что по другим осям центрируем на блоке
        // (addScaledVector уже это делает, но для ясности)
      } else {
        pos[axisU]=clampSnap(snapPoint[axisU],axisU,box,h);
        pos[axisV]=clampSnap(snapPoint[axisV],axisV,box,h);
      }
      
      // For side snap to Flora, align with target block center
      // (Уже учтено в addScaledVector для Flora hit)
      if (isFloraHit && !floraWorldNormal && axisN !== 'y') {
        // Старая логика для fallback
        pos.y = blk.position.y;
        if (axisN === 'x') {
          pos.z = blk.position.z;
        } else if (axisN === 'z') {
          pos.x = blk.position.x;
        }
      }
      
      // For vertical stacking on Flora blocks, center the new block
      // This ensures proper lid-to-lid alignment
      // (Для Flora hit на повёрнутом блоке уже центрировано)
      if (!isFloraHit && axisN === 'y' && blk && blk.userData && blk.userData.faceTypes) {
        var hasSideFlora = blk.userData.faceTypes.front === 'Flora' ||
                          blk.userData.faceTypes.back === 'Flora' ||
                          blk.userData.faceTypes.left === 'Flora' ||
                          blk.userData.faceTypes.right === 'Flora';
        if (hasSideFlora) {
          // Center on target block
          pos.x = blk.position.x;
          pos.z = blk.position.z;
        }
      }
      
      // При стыковке к Zen/2-подобным кубам даём приоритет выравниванию грань-к-грани,
      // а уже потом учитываем шаг. Особенно важно по вертикали (ось Y).
      // Пропускаем для Flora hit - позиция уже вычислена правильно
      if(!(isFloraHit && floraWorldNormal) && blk && blk.userData && isZen2LikeKind(blk.userData.kind)){
        ['x','y','z'].forEach(function(ax){
          if(ax===axisU || ax===axisV){
            var val = hit.point[ax];
            var half = h[ax];
            var bottom = box.min[ax] + half;
            var top = box.max[ax] - half;

            if(ax === 'y'){
              // По вертикали всегда цепляемся к ближайшему краю (низ/верх),
              // чтобы куб легко стыковался с нижней/верхней кромкой колонки,
              // даже если курсор далеко от самой границы.
              var distBottom = Math.abs(val - bottom);
              var distTop = Math.abs(val - top);
              pos[ax] = (distBottom <= distTop) ? bottom : top;
            } else {
              // По остальным осям сохраняем прежнюю логику:
              // сначала шаг, но грань может перебить его, если ближе к клику.
              var snapped = pos[ax];
              var best = snapped;
              if(Math.abs(bottom - val) < Math.abs(best - val)) best = bottom;
              if(Math.abs(top - val) < Math.abs(best - val)) best = top;
              pos[ax] = best;
            }
          }
        });
      }


      ok=canPlace(pos,ghostType,blk);

      // Fallback removed: Zen/2 no longer snaps freely along face; only grid/edge snapping is used.

      if(ghost && ghost.userData){ ghost.userData.hitBlock = blk; }
    }

    ghost.position.copy(pos);
    ghost.userData.ok=ok;
    ghost.visible=true;
    ghost.material.color.set( ok?0x22c55e:0xef4444 );
    
    // Ensure rotation is correct for non-Zen/2 kinds
    // (Zen/2 rotation is handled by applyZen2Orientation)
    if (typeof isZen2LikeKind === 'function' && !isZen2LikeKind(ghostType)) {
      ghost.rotation.set(0, 0, 0);
    }

    if(DEBUG_GHOST){
      if(!ghost.userData._dbg){ ghost.userData._dbg = { ok:null, hit:null }; }
      var hitType = (hit.object===ground) ? 'ground' : 'block';
      var dbg = ghost.userData._dbg;
      if(dbg.ok !== ok || dbg.hit !== hitType){
        dbgGhost('move', {hit: hitType, pos:[+pos.x.toFixed(3), +pos.y.toFixed(3), +pos.z.toFixed(3)], ok: ok});
        dbg.ok = ok; dbg.hit = hitType;
      }
    }
  }

  function onPointerDown(e){
    // Отслеживаем правую кнопку отдельно, чтобы отличать клик от драга
    if(e.button===2){
      isRightButtonDown=true;
      rightClickDownPos.x=e.clientX;
      rightClickDownPos.y=e.clientY;
      rightClickDownTime=(typeof performance!=='undefined' && performance.now)?performance.now():Date.now();
    }

    if(e.button!==0) return;
    isPointerDown=true;
    pointerDownPos.x=e.clientX;
    pointerDownPos.y=e.clientY;
  }

  function onPointerUp(e){
    if(e.button===2){
      isRightButtonDown=false;
    }
    if(e.button!==0) return;
    isPointerDown=false;
  }

  // Left click = place block if valid ghost
  function onLeftClick(e){
    // Не размещаем блоки если открыт редактор
    if(document.body.classList.contains('editor-open')){
      return;
    }

    if(e.button!==0) return;

    var dx=Math.abs(e.clientX-pointerDownPos.x);
    var dy=Math.abs(e.clientY-pointerDownPos.y);
    if(dx>5||dy>5) return;

    if(ghost && ghost.visible && ghost.userData.ok){
      var b = null;
      if(isCustomKind(ghostType)){
        b = buildGroupFromCustomKind(ghostType);
      } else {
        b = makeSolid(ghostType,currentColorHex);
      }
      if(!b) return;
      b.position.copy(ghost.position);
      // Синхронизируем ориентацию с призраком только для Zen/2-like kinds
      // Обычные кубы (включая Flora-based) всегда ставятся с rotation (0,0,0)
      if(ghost){
        if (typeof isZen2LikeKind === 'function' && isZen2LikeKind(ghostType)) {
          b.rotation.copy(ghost.rotation);
        } else {
          b.rotation.set(0, 0, 0);
        }
      }


      dbgGhost('place', {kind: ghostType, pos:[b.position.x,b.position.y,b.position.z]});
scene.add(b);
      objects.push(b);
      try{ createWrapperForBlock(b); }catch(e){}
      pickables.push(b);

      lastPlacedCenter.copy(b.position);

      updateCounter();
      msg('Cubik added', true);

      pushState();
    }
  }

  // Right click = delete block
  
// --- Safe GPU resource disposal for removed objects (injected) ---
function disposeObjectRecursive(obj){
  if(!obj) return;
  try{
    obj.traverse(function(n){
      try{
        if(n.isMesh){
          if(n.geometry && typeof n.geometry.dispose==='function'){ n.geometry.dispose(); }
          var mats = Array.isArray(n.material) ? n.material : [n.material];
          for(var i=0;i<mats.length;i++){
            var m=mats[i];
            if(m && m.isMaterial && typeof m.dispose==='function'){ m.dispose(); }
          }
        } else if(n.isLine){
          if(n.geometry && typeof n.geometry.dispose==='function'){ n.geometry.dispose(); }
          if(n.material && typeof n.material.dispose==='function'){ n.material.dispose(); }
        }
      }catch(e){ /* noop */ }
    });
  }catch(e){ /* noop */ }
}

function onRightClick(e){
  // Не удаляем блоки если открыт редактор
  if (document.body.classList.contains('editor-open')){
    e.preventDefault();
    return;
  }

  // Игнорируем правый клик, если это был драг (камера вращалась), а не точный клик
  // Сравниваем позицию при нажатии с позицией при contextmenu
  var dx = Math.abs(e.clientX - (rightClickDownPos && rightClickDownPos.x || 0));
  var dy = Math.abs(e.clientY - (rightClickDownPos && rightClickDownPos.y || 0));
  if (dx > 5 || dy > 5){
    // слишком большое смещение — считаем, что это был драг, не удаляем куб
    return;
  }

  e.preventDefault();

  var hit = null;

  // 1) Сначала пытаемся попасть по оболочкам, чтобы не простреливать полый блок насквозь
  try{
    if (Array.isArray(wrappers) && wrappers.length){
      hit = rayAt(e.clientX, e.clientY, wrappers, true);
    }
  }catch(_){}

  // 2) Если по оболочке не попали, тогда уже пробуем по реальным объектам
  if (!hit){
    hit = rayAt(e.clientX, e.clientY, objects, true);
  }
  if (!hit) return;

  var obj = hit.object;
  var b = null;

  // если попали по wrapper'у — берём его владельца
  if (obj && obj.userData && obj.userData.wrapperOwner){
    b = obj.userData.wrapperOwner;
  } else {
    b = rootOf(obj);
  }
  if (!b) return;

  // remove from scene + arrays
  try{ removeWrapperForBlock(b); }catch(e){}

  var tmp = [], i;
  for (i = 0; i < objects.length; i++){
    var o = objects[i];
    try{ disposeObjectRecursive(o); }catch(e){}
    scene.remove(o);
    if (o !== b){
      tmp.push(o);
      scene.add(o);
    }
  }
  // IMPORTANT: keep the same array instance (other modules may hold references)
  objects.length = 0;
  Array.prototype.push.apply(objects, tmp);

  if (b.userData && b.userData.solid){
    tmp = [];
    for (i = 0; i < pickables.length; i++){
      if (pickables[i] !== b) tmp.push(pickables[i]);
    }
    // IMPORTANT: keep the same array instance (other modules may hold references)
    pickables.length = 0;
    Array.prototype.push.apply(pickables, tmp);
  } else {
    var kidsSet = {};
    for (i = 0; i < b.children.length; i++){
      kidsSet[b.children[i].uuid] = true;
    }
    tmp = [];
    for (i = 0; i < pickables.length; i++){
      var p = pickables[i];
      if (!(kidsSet[p.uuid] || p === b)){
        tmp.push(p);
      }
    }
    // IMPORTANT: keep the same array instance (other modules may hold references)
    pickables.length = 0;
    Array.prototype.push.apply(pickables, tmp);
  }

  updateCounter();
  try{ disposeObjectRecursive(b); }catch(e){}
  msg('Deleted', true);

  pushState();

  // Refresh ghost state after deletion so we can place at the same spot
  try{
    if (ghost){
      onMove({ clientX: e.clientX, clientY: e.clientY });
    }
  }catch(_){}
}


  function clearAll(){
    for(var i=0;i<objects.length;i++){
      try{ disposeObjectRecursive(objects[i]); }catch(e){}
    scene.remove(objects[i]);
    
  try{ clearAllWrappers(); }catch(e){}
}
    // IMPORTANT: keep the same array instances (other modules may hold references)
    objects.length = 0;
    pickables.length = 0;
    updateCounter();
    msg('Scene cleared', true);
  }

  function updateCounter(){
var c=el('cnt');
    if(c) c.textContent=String(objects.length);
    var sb=document.getElementById('statsBadgeCnt'); if(sb) sb.textContent=String(objects.length);
    var hc=document.getElementById('hudCnt'); if(hc) hc.textContent=String(objects.length);
    updateFacetStats();
  }

  // rotate camera around lastPlacedCenter horizontally (Y axis)
  function rotateAroundPivotY(pivot, angle){
    if(!pivot) return;
    var rel=camera.position.clone().sub(pivot);
    var cos=Math.cos(angle), sin=Math.sin(angle);

    var nx =  rel.x *  cos + rel.z * sin;
    var nz = -rel.x *  sin + rel.z * cos;

    rel.x = nx;
    rel.z = nz;

    camera.position.copy(pivot.clone().add(rel));
    controls.target.copy(pivot);
  }

  // WASD / E / F / Q / R camera control
  function updateKeyboardCamera(){
    if(!camera || !controls) return;

    var moveSpeed=0.25;
    var rotSpeed=0.08;

    var moved=false;
    var delta=new THREE.Vector3(0,0,0);

    var upVec=new THREE.Vector3(0,1,0);
    var dir=new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.normalize();

    var strafe=new THREE.Vector3();
    strafe.crossVectors(dir, upVec).normalize();

    if(keyState.w){ delta.addScaledVector(dir, moveSpeed); moved=true; }
    if(keyState.s){ delta.addScaledVector(dir,-moveSpeed); moved=true; }
    if(keyState.a){ delta.addScaledVector(strafe,-moveSpeed); moved=true; }
    if(keyState.d){ delta.addScaledVector(strafe, moveSpeed); moved=true; }
    if(keyState.e){ delta.addScaledVector(upVec, moveSpeed); moved=true; }
    if(keyState.f){ delta.addScaledVector(upVec,-moveSpeed); moved=true; }

    if(moved){
      camera.position.add(delta);
      controls.target.add(delta);
    }

    // Q/R orbit camera horizontally around lastPlacedCenter
    if(keyState.q || keyState.r){
      var da=0;
      if(keyState.q) da += rotSpeed;
      if(keyState.r) da -= rotSpeed;
      rotateAroundPivotY(lastPlacedCenter, da);
    }
  }

  
// --- Queue pointer-move to next animation frame (injected) ---
var __queuedMoveEvt = null;
var __queuedPrevMoveEvt = null;
function onMoveQueued(e){ __queuedMoveEvt = e; }
function onPreviewMoveQueued(e){ __queuedPrevMoveEvt = e; }
function animate(){
    requestAnimationFrame(animate);
    try{ __syncWrappers(); }catch(e){}
    try{ if(__queuedMoveEvt){ onMove(__queuedMoveEvt); __queuedMoveEvt=null; } }catch(e){}
    try{ if(__queuedPrevMoveEvt){ onPreviewMove(__queuedPrevMoveEvt); __queuedPrevMoveEvt=null; } }catch(e){}
    if(controls) controls.update();
    if(typeof updateKeyboardCamera === 'function'){ updateKeyboardCamera(); }

    // Keep Flora bowls upright in world space (especially important for rotated Zen/2)
    try{ ensureFloraUprightAll(); }catch(e){}

    if(!renderer) return;

    // First draw the fullscreen gradient background, then the main 3D scene
    renderer.clear();
    if(bgScene && bgCamera){
      renderer.render(bgScene, bgCamera);
    }
    if(scene && camera){
      renderer.render(scene, camera);
    }
  }

// ===== Materials / block constructors =====
  function createMat(col){
    return new THREE.MeshStandardMaterial({
      color: toLinear(col),
      roughness:0.85,
      metalness:0.05,
      side:THREE.DoubleSide
    });
  }

  // Solid block (single mesh)
  function makeSolid(kind,colHexOrNum){
    var g=baseGeom[kind];
    if(!g){
      console && console.warn && console.warn('[makeSolid] Unknown kind "' + kind + '", using box fallback');
      g = baseGeom['Bion'] || baseGeom['box'] || new THREE.BoxGeometry(1,1,1);
    }
    var mat=createMat(colHexOrNum);

    try{
      mat.userData={
        baseHex: (typeof colHexOrNum==='string'
          ? colHexOrNum
          : '#'+(new THREE.Color(colHexOrNum)).getHexString())
      };
    }catch(e){
      mat.userData={ baseHex:'#7D7F7D' };
    }

    var m=new THREE.Mesh(g.clone(), mat);
    m.castShadow=true;
    m.userData={kind:kind,isBlock:true,solid:true};
    return m;
  }

  // Editable block (one mesh per face)
  function buildCubeGroup(type,colorHex){
    var group=new THREE.Group();
    group.userData={
      kind:type,
      isBlock:true,
      solid:false,
      faces:{},
      faceTypes:{}
    };

    var fgs=faceGeoms[type];
    
    // Fallback: if kind not found, try 'Bion', then 'box'
    if(!fgs){
      console && console.warn && console.warn('[buildCubeGroup] Unknown kind "' + type + '", trying fallback...');
      
      // Try Bion first (most common)
      if(faceGeoms['Bion']){
        fgs = faceGeoms['Bion'];
        console && console.log && console.log('[buildCubeGroup] Using Bion as fallback for "' + type + '"');
      } else if(faceGeoms['box']){
        fgs = faceGeoms['box'];
        console && console.log && console.log('[buildCubeGroup] Using box as fallback for "' + type + '"');
      } else {
        // Last resort: create box geometry on the fly
        console && console.warn && console.warn('[buildCubeGroup] No fallback available, creating box geometry');
        try {
          fgs = makeBoxFacesFromGeometry(new THREE.BoxGeometry(1,1,1));
        } catch(e) {
          console && console.error && console.error('[buildCubeGroup] Failed to create fallback geometry');
          return group;
        }
      }
    }

    var dirs=['top','bottom','front','back','left','right'];
    for(var i=0;i<dirs.length;i++){
      var dir=dirs[i];
      var geom=fgs[dir];
      
      // If geometry is null/missing for this face, try fallbacks
      if(!geom){
        // For Flora, top/bottom are intentionally null - use Bion for those faces
        if(faceGeoms['Bion'] && faceGeoms['Bion'][dir]){
          geom = faceGeoms['Bion'][dir];
        } else if(faceGeoms['box'] && faceGeoms['box'][dir]){
          geom = faceGeoms['box'][dir];
        }
        
        if(!geom){
          console && console.warn && console.warn('[buildCubeGroup] No geometry for', type, dir, '- skipping face');
          continue;
        }
      }

      var mat=createMat(colorHex);
      mat.userData={ baseHex: colorHex, _isolated:true };

      var mesh=new THREE.Mesh(geom.clone(), mat);
      mesh.castShadow=true;
      mesh.name='face_'+dir;
      mesh.userData={isFace:true,faceDir:dir};

      group.add(mesh);
      group.userData.faces[dir]=mesh;

      // Определяем тип грани
      // Тип грани должен соответствовать РЕАЛЬНОЙ геометрии, а не быть условным
      var faceTypeForDir = type;
      
      // Для кастомных видов восстанавливаем тип грани из сохранённого префаба
      try{
        if (customKinds && customKinds[type] && customKinds[type].faceTypes && customKinds[type].faceTypes[dir]){
          faceTypeForDir = customKinds[type].faceTypes[dir];
        }
      }catch(e){}
      group.userData.faceTypes[dir]=faceTypeForDir;

      pickables.push(mesh);
    }
    return group;
  }

  /**
   * Создаёт куб из данных снапшота с правильными гранями сразу
   * @param {Object} snapData - данные из JSON: {kind, faces: {dir: {faceType, colorHex}}}
   * @param {string} defaultColor - цвет по умолчанию
   * @returns {THREE.Group}
   */
  function buildCubeGroupFromSnapshot(snapData, defaultColor) {
    var kind = snapData.kind || 'Bion';
    var isZen2Like = (kind === 'Zen/2') || (customKinds && customKinds[kind] && customKinds[kind].zen2Like);
    
    var group = new THREE.Group();
    group.userData = {
      kind: kind,
      isBlock: true,
      solid: false,
      faces: {},
      faceTypes: {}
    };

    var dirs = ['top', 'bottom', 'front', 'back', 'left', 'right'];
    
    // Определяем базовую геометрию для куба (для выравнивания)
    var baseGeomSource = faceGeoms[kind] || faceGeoms['Bion'] || faceGeoms['box'];
    
    for (var i = 0; i < dirs.length; i++) {
      var dir = dirs[i];
      
      // Получаем данные грани из снапшота
      var faceData = (snapData.faces && snapData.faces[dir]) || {};
      var faceType = faceData.faceType || kind;
      var colorHex = faceData.colorHex || defaultColor || '#7D7F7D';
      
      // Получаем геометрию для нужного типа грани
      var faceGeomSource = faceGeoms[faceType];
      if (!faceGeomSource || !faceGeomSource[dir]) {
        // Fallback: используем базовую геометрию куба
        faceGeomSource = baseGeomSource;
      }
      
      if (!faceGeomSource || !faceGeomSource[dir]) {
        console && console.warn && console.warn('[buildCubeGroupFromSnapshot] No geometry for', faceType, dir);
        continue;
      }
      
      // Получаем геометрию для выравнивания (базовая грань куба)
      var baseGeomForDir = baseGeomSource && baseGeomSource[dir];
      var targetGeom = faceGeomSource[dir];
      
      // Выравниваем геометрию если есть базовая
      var finalGeom;
      if (baseGeomForDir && faceType !== kind) {
        finalGeom = alignGeomPlaneTo(baseGeomForDir, targetGeom, dir);
        
        // Для Flora на Zen/2: дополнительная коррекция позиции
        if (faceType === 'Flora' && isZen2Like) {
          try {
            var oldGeomClone = baseGeomForDir.clone();
            oldGeomClone.computeBoundingBox();
            var oldBB = oldGeomClone.boundingBox;
            var axisInfo = axisForFace(dir);
            var axis = axisInfo.axis;
            var isMax = axisInfo.isMax;
            var oldPlane = isMax ? oldBB.max[axis] : oldBB.min[axis];
            var floraPlane = isMax ? 0.5 : -0.5;
            var offset = oldPlane - floraPlane;
            var translate = new THREE.Vector3(0, 0, 0);
            translate[axis] = offset;
            finalGeom.translate(translate.x, translate.y, translate.z);
            finalGeom.computeBoundingBox();
          } catch(e) {}
        }
      } else {
        finalGeom = targetGeom.clone();
      }
      
      // Создаём материал
      var mat = createMat(colorHex);
      mat.userData = { baseHex: colorHex, _isolated: true };
      
      // Создаём меш
      var mesh = new THREE.Mesh(finalGeom, mat);
      mesh.castShadow = true;
      mesh.name = 'face_' + dir;
      mesh.userData = { isFace: true, faceDir: dir };
      
      // Восстанавливаем поворот грани
      if (faceType === 'Flora') {
        mesh.rotation.set(0, 0, 0);
        mesh.userData._floraBaseQuat = mesh.quaternion.clone();
        try { applyFloraUprightRoll(mesh, group, dir); } catch(e) {}
      } else if (faceData.faceQuaternion && Array.isArray(faceData.faceQuaternion) && faceData.faceQuaternion.length === 4) {
        mesh.quaternion.set(faceData.faceQuaternion[0], faceData.faceQuaternion[1], faceData.faceQuaternion[2], faceData.faceQuaternion[3]);
      }
      
      group.add(mesh);
      group.userData.faces[dir] = mesh;
      group.userData.faceTypes[dir] = faceType;
      pickables.push(mesh);
    }
    
    return group;
  }

  // Make solid block editable if needed
  function ensureEditableSelected(){
    var b=selectedBlock;
    if(!b) return b;
    if(!b.userData || !b.userData.solid){
      return b;
    }

    var kind=b.userData.kind;
    var hex='#7D7F7D';

    try{
      if(b.material && b.material.userData && b.material.userData.baseHex){
        hex=b.material.userData.baseHex;
      } else if(b.material && b.material.color){
        hex='#'+b.material.color.getHexString();
      }
    }catch(e){}

    var g=buildCubeGroup(kind, hex);
    g.position.copy(b.position);
    g.rotation.copy(b.rotation);
    g.scale.copy(b.scale);

    scene.remove(b);
    try{ removeWrapperForBlock(b); }catch(e){}
    scene.add(g);
    try{ createWrapperForBlock(g); updateSnapTargets(); }catch(e){}

    // IMPORTANT: keep the same array instances (other modules may hold references)
    var tmp=[], i;
    for(i=0;i<objects.length;i++){
      tmp.push(objects[i]===b? g : objects[i]);
    }
    objects.length = 0;
    Array.prototype.push.apply(objects, tmp);

    var tmp2=[];
    for(i=0;i<pickables.length;i++){
      if(pickables[i]!==b) tmp2.push(pickables[i]);
    }
    pickables.length = 0;
    Array.prototype.push.apply(pickables, tmp2);

    selectedBlock=g; try{ window.selectedBlock = selectedBlock; }catch(e){}
    return g;
  }

  // ===== Editor preview =====
  function ensurePreview(){
    var wrap=el('previewWrap');
    if(!wrap) return;

    if(!previewRenderer){
      var w=Math.max(1, wrap.clientWidth||320),
          h=Math.max(1, wrap.clientHeight||240);
      previewRenderer=new THREE.WebGLRenderer({antialias:true});
      
    
      setupColorPipeline(previewRenderer);
      previewRenderer.setClearColor(0x050814, 1);
      previewRenderer.setPixelRatio(window.devicePixelRatio||1);
      previewRenderer.setSize(w,h);
      wrap.appendChild(previewRenderer.domElement);

      previewRenderer.domElement.addEventListener('pointermove', onPreviewMoveQueued);
      previewRenderer.domElement.addEventListener('click', onPreviewClick);

      window.addEventListener('resize', onPreviewResize);
    }

    if(!previewScene){
      previewScene=new THREE.Scene();
      previewScene.background=new THREE.Color(0x050814);
      previewScene.add(new THREE.AmbientLight(0xffffff, 0.8));
      var dl=new THREE.DirectionalLight(0xffffff, 1.0);
      dl.position.set(6,8,6);
      previewScene.add(dl);
    }

    if(!previewCamera){
      var w2=Math.max(1, wrap.clientWidth||320),
          h2=Math.max(1, wrap.clientHeight||240);
      previewCamera=new THREE.PerspectiveCamera(55, w2/h2, 0.1, 100);
      previewCamera.position.set(2.2,1.7,2.2);
    }

    if(!previewControls && THREE.OrbitControls){
      previewControls=new THREE.OrbitControls(previewCamera, previewRenderer.domElement);
      previewControls.enableDamping=false;
      previewControls.enablePan=false;
      previewControls.minDistance=0.8;
      previewControls.maxDistance=8;
    }

    if(!previewRaycaster){
      previewRaycaster=new THREE.Raycaster();
    }
    if(!previewMouse){
      previewMouse=new THREE.Vector2();
    }

    if(!previewTicker){
      previewTicker=true;
      requestAnimationFrame(tickPreview);
    }
  }

  function tickPreview(){
    try{
      if(previewRenderer && previewScene && previewCamera){
        if(previewControls && previewControls.update){
          previewControls.update();
        }
        previewRenderer.render(previewScene, previewCamera);
      }
    }catch(err){}
    if(previewTicker){
      requestAnimationFrame(tickPreview);
    }
  }

  function onPreviewResize(){
    if(!previewRenderer||!previewCamera) return;
    var wrap=el('previewWrap');
    if(!wrap) return;

    var w=Math.max(1, wrap.clientWidth||320),
        h=Math.max(1, wrap.clientHeight||240);

    previewRenderer.setSize(w,h);
    previewCamera.aspect=w/h;
    previewCamera.updateProjectionMatrix();
  }

  function clearPreviewRoot(){
    if(previewRoot && previewRoot.parent){
      previewRoot.parent.remove(previewRoot);
    }
    previewRoot=null;
  }

  function clearPreviewOutline(){
    if(previewOutline && previewOutline.parent){
      previewOutline.parent.remove(previewOutline);
    }
    previewOutline=null;
  }

  function faceDirFromObject(o){
    var x=o;
    while(x){
      if(x.userData && x.userData.faceDir){
        return x.userData.faceDir;
      }
      x=x.parent;
    }
    return null;
  }

  function getPreviewFaceByDir(dir){
    if(!previewRoot) return null;
    for(var i=0;i<previewRoot.children.length;i++){
      var ch=previewRoot.children[i];
      if(ch.userData && ch.userData.faceDir===dir){
        return ch;
      }
    }
    return null;
  }

  function setPreviewOutline(mesh){
    clearPreviewOutline();
    if(!mesh||!mesh.geometry) return;
    try{
      // Контурная подсветка кубика в превью, без заливки
      var g=new THREE.EdgesGeometry(mesh.geometry, 40);
      var mat=new THREE.LineBasicMaterial({
        color: computeOverlay(),
        transparent:true,
        opacity:0.9,
        depthWrite:false,
        depthTest:false
      });
      var outline=new THREE.LineSegments(g, mat);
      outline.scale.setScalar(1.01);
      outline.position.copy(mesh.position);
      outline.rotation.copy(mesh.rotation);
      outline.renderOrder=999;

      previewOutline=outline;
      if(mesh.parent){
        mesh.parent.add(outline);
      }
    }catch(err){}
  }

  function rebuildPreviewFromSelected(){
    var hint=el('previewHint');
    if(!selectedBlock){
      clearPreviewRoot();
      if(hint) hint.textContent='No cubik selected';
      return;
    }

    ensurePreview();

    var blk=ensureEditableSelected();
    if(!blk){
      clearPreviewRoot();
      return;
    }
    if(hint) hint.textContent='';

    clearPreviewRoot();
    previewRoot=new THREE.Group();
    previewRoot.name='previewRoot';
    previewScene.add(previewRoot);

    // Обновляем мировые матрицы выбранного куба, чтобы превью повторяло его поворот
    blk.updateMatrixWorld(true);

    var dirs=['top','bottom','front','back','left','right'];
    for(var i=0;i<dirs.length;i++){
      var dir=dirs[i];
      var faceMesh=blk.userData && blk.userData.faces
        ? blk.userData.faces[dir]
        : null;
      if(!faceMesh) continue;

      var gg=faceMesh.geometry.clone();
      var mm=faceMesh.material.clone();
      var m2=new THREE.Mesh(gg,mm);

      m2.userData={faceDir:dir,original:faceMesh};

      // Копируем полный мировой трансформ грани (включая поворот всего куба)
      try{
        var wPos=new THREE.Vector3();
        var wQuat=new THREE.Quaternion();
        var wScale=new THREE.Vector3();
        faceMesh.updateMatrixWorld(true);
        faceMesh.matrixWorld.decompose(wPos,wQuat,wScale);
        m2.position.copy(wPos);
        m2.quaternion.copy(wQuat);
        m2.scale.copy(wScale);
      }catch(e){
        // Фоллбек — локальные координаты, если что-то пошло не так
        m2.position.copy(faceMesh.position);
        m2.rotation.copy(faceMesh.rotation);
        m2.scale.copy(faceMesh.scale);
      }

      previewRoot.add(m2);
    }

    previewRoot.updateMatrixWorld(true);

    var box=new THREE.Box3().setFromObject(previewRoot);
    var center=box.getCenter(new THREE.Vector3());
    var size=box.getSize(new THREE.Vector3());
    var maxDim=Math.max(size.x,size.y,size.z);

    var fov=previewCamera.fov*(Math.PI/180);
    var cameraDist=maxDim/(2*Math.tan(fov/2));
    cameraDist*=1.2;

    previewCamera.position.set(
      center.x+cameraDist,
      center.y+cameraDist*0.4,
      center.z+cameraDist
    );
    previewCamera.lookAt(center);
    previewCamera.updateProjectionMatrix();

    if(previewControls){
      previewControls.target.copy(center);
    }

    updatePreviewHighlight();
  }

  function updatePreviewHighlight(){
    if(!previewRoot) return;
    for(var i=0;i<previewRoot.children.length;i++){
      var child=previewRoot.children[i];
      var dir=child.userData?child.userData.faceDir:null;
      var on=!!selectedFaces[dir];
      if(on){
        if(child.material && child.material.emissive){
          child.material.emissive.setHex(computeOverlay());
          child.material.emissiveIntensity=1.0;
        }
      } else {
        if(child.material && child.material.emissive){
          child.material.emissive.setHex(0x000000);
          child.material.emissiveIntensity=0;
        }
      }
    }
  }

  function onPreviewMove(e){
    if(!previewRenderer||!previewScene||!previewCamera) return;

    if(hoverSuppressUntil && (typeof performance!=='undefined') &&
       performance.now()<hoverSuppressUntil){
      return;
    }

    var rect=previewRenderer.domElement.getBoundingClientRect();
    previewMouse.x=((e.clientX-rect.left)/rect.width)*2-1;
    previewMouse.y=-((e.clientY-rect.top)/rect.height)*2+1;

    if(!previewRoot||previewRoot.children.length===0) return;

    previewRaycaster.setFromCamera(previewMouse, previewCamera);
    var hits=previewRaycaster.intersectObjects(previewRoot.children,true);

    var picked=null;
    for(var i=0;i<hits.length;i++){
      var obj=hits[i].object;
      if(obj!==previewOutline){
        picked=hits[i];
        break;
      }
    }

    if(picked){
      var dir=faceDirFromObject(picked.object);
      var real=dir ? getPreviewFaceByDir(dir) : null;
      if(real){
        setPreviewOutline(real);
      }
      drawHoverOverlay(dir);
    } else {
      clearPreviewOutline();
      clearHoverOverlay();
    }
  }

  function onPreviewClick(e){
    if(!previewRenderer||!previewScene||!previewCamera) return;

    var rect=previewRenderer.domElement.getBoundingClientRect();
    previewMouse.x=((e.clientX-rect.left)/rect.width)*2-1;
    previewMouse.y=-((e.clientY-rect.top)/rect.height)*2+1;

    if(!previewRoot||!previewRaycaster) return;

    previewRaycaster.setFromCamera(previewMouse, previewCamera);
    var hits=previewRaycaster.intersectObjects(previewRoot.children,true);

    var picked=null;
    for(var i=0;i<hits.length;i++){
      var obj=hits[i].object;
      if(obj!==previewOutline){
        picked=hits[i];
        break;
      }
    }

    if(picked){
      var dir=faceDirFromObject(picked.object);
      if(dir){
        if(e.shiftKey){
          selectedFaces[dir]=!selectedFaces[dir];
        } else {
          clearSelected();
          selectedFaces[dir]=true;
        }
        updateFaceButtons();
        updatePreviewHighlight();
        drawSelectedOverlays();

        if(typeof performance!=='undefined'){
          hoverSuppressUntil=performance.now()+140;
        }
      }
    }
  }

  // ===== Scene overlays (selected / hover faces) =====
  var faceOverlaySelected=null, faceOverlayHover=null;

  function clearSelectedOverlays(){
    if(faceOverlaySelected && faceOverlaySelected.parent){
      faceOverlaySelected.parent.remove(faceOverlaySelected);
    }
    faceOverlaySelected=null;
  }
  function clearHoverOverlay(){
    if(faceOverlayHover && faceOverlayHover.parent){
      faceOverlayHover.parent.remove(faceOverlayHover);
    }
    faceOverlayHover=null;
  }

  function drawSelectedOverlays(){
  clearSelectedOverlays();
  if(!selectedBlock) return;

  var blk = selectedBlock;
  var dirs = selectedList();
  if(dirs.length === 0) return;

  faceOverlaySelected = new THREE.Group();

  for(var i = 0; i < dirs.length; i++){
    var d = dirs[i];
    var f = blk.userData.faces[d];
    if(!f) continue;

    // Подсветка только рёбер грани, без заливки
    var g = new THREE.EdgesGeometry(f.geometry, 40);

    var mat = new THREE.LineBasicMaterial({
      color: computeOverlay(),
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false
    });

    var overlay = new THREE.LineSegments(g, mat);
    overlay.position.copy(f.position);
    overlay.rotation.copy(f.rotation);
    overlay.scale.copy(f.scale).multiplyScalar(1.02);
    overlay.renderOrder = 999;

    faceOverlaySelected.add(overlay);
  }

  blk.add(faceOverlaySelected);
  renderer.render(scene, camera);
}
function drawHoverOverlay(d){
  clearHoverOverlay();
  if(!d || !selectedBlock) return;

  var blk = selectedBlock;
  var f = blk.userData.faces[d];
  if(!f) return;

  var g = new THREE.EdgesGeometry(f.geometry, 40);

  var mat = new THREE.LineBasicMaterial({
    color: computeOverlay(),
    transparent: true,
    opacity: 0.5,
    depthTest: false,
    depthWrite: false
  });

  var overlay = new THREE.LineSegments(g, mat);
  overlay.position.copy(f.position);
  overlay.rotation.copy(f.rotation);
  overlay.scale.copy(f.scale).multiplyScalar(1.04);
  overlay.renderOrder = 998;

  faceOverlayHover = overlay;
  blk.add(faceOverlayHover);
  renderer.render(scene, camera);
}


  function updateFaceButtons(){
    var root=el('faceButtons');
    if(!root) return;

    var btns=root.getElementsByTagName('button');
    for(var i=0;i<btns.length;i++){
      var b=btns[i];
      var dir=(b.getAttribute('data-face')||'').toLowerCase();
      var on=!!selectedFaces[dir];
      if(on){
        if(b.className.indexOf('active')===-1){
          b.className+=' active';
        }
      } else {
        b.className=b.className.replace(/\bactive\b/g,'').trim();
      }
    }

    var info=el('faceInfo');
    var list=selectedList();
    if(info){
      if(list.length===0){
        info.textContent='No facet selected';
      }else if(list.length===1){
        info.textContent='Facet selected: '+list[0];
      }else{
        info.textContent='Facets selected: '+list.length;
      }
    }
  }

  function selectBlock(b){
    if(selectedBlock===b) return;
    selectedBlock=b; try{ window.selectedBlock = selectedBlock; }catch(e){}
    clearSelected();
    updateFaceButtons();
    rebuildPreviewFromSelected();
    drawSelectedOverlays();
  }

  function openEditor(){
    el('editor').className='open';
    if(document.body.className.indexOf('editor-open')===-1){
      document.body.className+=' editor-open';
    }
    ensurePreview();
    rebuildPreviewFromSelected();
    drawSelectedOverlays();
    
    // Скрываем призрак при открытии редактора
    hideGhost();
  }

  function closeEditor(){
    el('editor').className='';
    document.body.className=document.body.className.replace(/\beditor-open\b/g,'').trim();
    clearSelectedOverlays();
    clearHoverOverlay();

    // Синхронизируем глобальную ориентацию Zen/2 с фактическим поворотом редактируемого блока
    try {
      if (selectedBlock && selectedBlock.userData && selectedBlock.userData.kind === 'Zen/2') {
        var twoPi = Math.PI * 2;
        function normAngle(a){
          a = a % twoPi;
          if (a < 0) a += twoPi;
          return a;
        }
        var rx = normAngle(selectedBlock.rotation.x);
        var rz = normAngle(selectedBlock.rotation.z);
        var eps = 0.01;
        var ori = 0;
        if (Math.abs(rx - Math.PI/2) < eps || Math.abs(rx - 3*Math.PI/2) < eps){
          ori = 1;
        } else if (Math.abs(rz - Math.PI/2) < eps || Math.abs(rz - 3*Math.PI/2) < eps){
          ori = 2;
        }
        zen2OrientationIndex = ori;
        zen2HalfCache = {};
      }
    } catch(e){}

    // После выхода из редактора перестраиваем призрак из последнего редактируемого куба
    try { window.adoptGhostFromEdited && window.adoptGhostFromEdited(selectedBlock); } catch(e) { dbgGhost('closeEditor adopt failed', e); }

    // Синхронизируем ориентацию призрака с повёрнутым блоком
    // ТОЛЬКО для Zen/2-like kinds, обычные кубы не должны наследовать rotation
    try {
      if (selectedBlock && typeof ghost !== 'undefined' && ghost && ghost.rotation && selectedBlock.rotation){
        // Only copy rotation for Zen/2-like ghosts
        if (typeof isZen2LikeKind === 'function' && isZen2LikeKind(ghostType)) {
          ghost.rotation.copy(selectedBlock.rotation);
        } else {
          // For regular cubes (including Flora-based), reset rotation
          ghost.rotation.set(0, 0, 0);
        }
      }
    } catch(e){}

    // Показываем призрак при закрытии редактора
    showGhost();
  }

  // ===== Paint / Replace logic =====
  function paintFaces(){
    if(!selectedBlock){
      msg('Select a cubik first', false);
      return false;
    
  try { pushState(); } catch(e) { /* noop */ }
}
    var blk=selectedBlock;
    var dirs=selectedList();
    if(dirs.length===0){
      msg('Select a facett', false);
      return false;
    }

    
    var paintHex = (typeof editorFaceHex==='string' && editorFaceHex) ? editorFaceHex : currentColorHex;
for(var i=0;i<dirs.length;i++){
      var d=dirs[i];
      var f=blk.userData.faces[d];
      if(f && f.material){
        if(!f.material.userData || !f.material.userData._isolated){
          f.material=f.material.clone();
          f.material.userData={_isolated:true, baseHex: paintHex};
        } else {
          f.material.userData.baseHex=paintHex;
        }
        var lin=toLinear(paintHex);
        f.material.color.copy(lin);
        f.material.needsUpdate=true;
      }
    }

    drawSelectedOverlays();
    updatePreviewHighlight();
    msg('Colored facets: '+dirs.length, true);

    try{
      rebuildPreviewFromSelected();
    }catch(err){}

    updateFacetStats();
    return true;
  }

  function replaceFaces(){
    if(!selectedBlock){
      msg('Select a cubik first', false);
      return false;
    }

    try { pushState(); } catch(e) { /* noop */ }

    var blk=ensureEditableSelected();
    var dirs=selectedList();
    if(dirs.length===0){
      msg('Select a facett', false);
      return false;
    }

    // Проверяем повёрнут ли куб
    var isRotated = false;
    if (blk && blk.rotation) {
      var rx = Math.abs(blk.rotation.x);
      var ry = Math.abs(blk.rotation.y);
      var rz = Math.abs(blk.rotation.z);
      isRotated = (rx > 0.01 || ry > 0.01 || rz > 0.01);
    }
    
    // Проверяем zen2Like
    var isZen2Like = false;
    if (blk && blk.userData) {
      var blkKind = blk.userData.kind;
      isZen2Like = (blkKind === 'Zen/2') || 
                   (customKinds && customKinds[blkKind] && customKinds[blkKind].zen2Like);
    }

    // Zen/2 rule: cannot replace faces that have Zen/2 geometry (with slots)
    if(blk && blk.userData){
      for(var ii=0; ii<dirs.length; ii++){
        var dLow = String(dirs[ii]).toLowerCase();
        var currentFaceType = blk.userData.faceTypes && blk.userData.faceTypes[dLow];
        if(currentFaceType === 'Zen/2'){
          msg('Cannot replace Zen/2 facet (has slots). Only flat faces (Bion) can be replaced.', false);
          return false;
        }
      }
    }

    // Flora rule for Zen/2:
    // - Flora можно ставить на любую НЕ-Zen/2 грань (Bion, Void, Zen - все плоские)
    // - И ТОЛЬКО если куб Zen/2 ПОВЁРНУТ
    if(selectedFaceType === 'Flora' && isZen2Like){
      if (!isRotated) {
        msg('Flora can only be applied to rotated Zen/2 cubes', false);
        return false;
      }
      
      for(var ff=0; ff<dirs.length; ff++){
        var fDir = String(dirs[ff]).toLowerCase();
        var faceTypeForFlora = blk.userData.faceTypes && blk.userData.faceTypes[fDir];
        // Для Zen/2: разрешаем Flora на любую плоскую грань (не Zen/2)
        if(faceTypeForFlora === 'Zen/2'){
          msg('Flora cannot be applied to Zen/2 faces (have slots)', false);
          return false;
        }
      }
    }

    var targetType = selectedFaceType;
    if(!faceGeoms[targetType]){
      msg('No geometry for '+targetType, false);
      return false;
    }

    var replaced=0;
    for(var i=0;i<dirs.length;i++){
      var dir=String(dirs[i]).toLowerCase();
      var oldFace=blk.userData.faces[dir];
      if(!oldFace) continue;

      var fg=faceGeoms[targetType]||{};
      var newGeom=fg[dir];
      if(!newGeom) continue;

      var mat=oldFace.material;

      var basePos=oldFace.position.clone();
      var rot=oldFace.rotation.clone();
      var scl=oldFace.scale.clone();

      blk.remove(oldFace);

      // remove oldFace from pickables - сохраняем ту же ссылку на массив
      var pickIdx = pickables.indexOf(oldFace);
      if (pickIdx !== -1) {
        pickables.splice(pickIdx, 1);
      }

      var aligned=alignGeomPlaneTo(oldFace.geometry, newGeom, dir);
      
      // Для Flora на Zen/2: корректируем позицию, т.к. Flora создана для куба 1×1×1,
      // а Zen/2 имеет другие размеры (~0.33×1×1)
      if (targetType === 'Flora' && isZen2Like) {
        // Получаем bounding box старой грани (реальный размер)
        var oldGeomClone = oldFace.geometry.clone();
        oldGeomClone.computeBoundingBox();
        var oldBB = oldGeomClone.boundingBox;
        
        // Flora: не используем bbox-экстремум (он указывает на край чаши),
        // вместо этого используем плоскость рамки крепления, которая в createFloraForFace()
        // выставлена ровно на ±0.5 по оси соответствующей грани.
        // Определяем ось и направление для данной грани
        var axisInfo = axisForFace(dir);
        var axis = axisInfo.axis;
        var isMax = axisInfo.isMax;
        
        // Вычисляем смещение: разница между позицией старой грани и Flora
        var oldPlane = isMax ? oldBB.max[axis] : oldBB.min[axis];
        var floraPlane = isMax ? 0.5 : -0.5;
        var offset = oldPlane - floraPlane;
        
        // Применяем смещение к Flora
        var translate = new THREE.Vector3(0, 0, 0);
        translate[axis] = offset;
        aligned.translate(translate.x, translate.y, translate.z);
        aligned.computeBoundingBox();
      }
      
      var newFace=new THREE.Mesh(aligned, mat);
      newFace.castShadow=true;
      newFace.name='face_'+dir;
      newFace.userData={isFace:true,faceDir:dir};

      newFace.position.copy(basePos);

      // Flora должна оставаться "ковшом вверх" в МИРОВЫХ координатах.
      // Поворот вычисляется как "ролл" вокруг нормали грани так, чтобы локальный верх Flora
      // совпал с мировым +Y (насколько это возможно для данной ориентации грани).
      if (targetType === 'Flora') {
        newFace.rotation.set(0, 0, 0);
        try{
          newFace.userData = newFace.userData || {};
          if (!newFace.userData._floraBaseQuat) newFace.userData._floraBaseQuat = newFace.quaternion.clone();
        }catch(_){ }
        try{ applyFloraUprightRoll(newFace, blk, dir); }catch(_){ }
      } else {
        newFace.rotation.copy(rot);
      }
      newFace.scale.copy(scl);


      blk.add(newFace);
      blk.userData.faces[dir]=newFace;
      blk.userData.faceTypes[dir]=targetType;
      pickables.push(newFace);

      replaced++;
    }

    drawSelectedOverlays();
    updatePreviewHighlight();
    msg('Replaced facets: '+replaced, true);

    try{
      rebuildPreviewFromSelected();
    }catch(err){}

    updateFacetStats();
    return replaced>0;
  }

  // ===== Ghost & Gallery =====
  function makeGhost(kind){
    if(ghost){
      scene.remove(ghost);
    }
    var g=baseGeom[kind]||new THREE.BoxGeometry(1,1,1);
    ghost=new THREE.Mesh(
      g.clone(),
      new THREE.MeshBasicMaterial({
        color:0x6ee7b7,
        transparent:true,
        opacity:0.5,
        depthWrite:false
      })
    );
    try{ attachGhostWrapper(ghost); }catch(e){}
    ghost.visible=false;
    ghost.userData={ok:false};

    // Apply current orientation for Zen/2 ghost
    if(isZen2LikeKind(kind)){
      applyZen2Orientation(ghost);
    } else {
      ghost.rotation.set(0,0,0);
    }

    scene.add(ghost);
  }


  // Setter for ghostType that also rebuilds the ghost and updates UI
  function setGhostType(kind){
    try{
      ghostType = kind;
      if (typeof makeGhost === 'function') makeGhost(kind);
      try { document.getElementById('typ').textContent = kind; } catch(e) {}
      try { updateCounter && updateCounter(); } catch(e) {}
      try { window.ghostType = ghostType; } catch(e) {}
    }catch(e){ console && console.error('[GHOST] setGhostType error', e); }
  }
  // Expose to global
  try{ window.makeGhost = makeGhost; window.setGhostType = setGhostType; }catch(e){}

  // Resize gallery preview canvases to match CSS size (prevents squashed previews on short screens / zoom)
  function resizeGalleryPreviews(){
    try{
      var gal = el('gallery');
      if(!gal) return;
      var cards = gal.getElementsByClassName('card');
      for(var i=0;i<cards.length;i++){
        var card = cards[i];
        var kind = card.getAttribute('data-kind');
        if(!kind) continue;

        var data = (typeof galleryScenes !== 'undefined' && galleryScenes) ? galleryScenes[kind] : null;
        if(!data || !data.renderer || !data.camera) continue;

        var canvas = data.canvas || (card.getElementsByTagName('canvas')[0]);
        if(!canvas) continue;

        // Read the rendered size from CSS/layout
        var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
        var w = Math.max(1, Math.round((rect && rect.width) || card.clientWidth || canvas.clientWidth || 160));
        var h = Math.max(1, Math.round((rect && rect.height) || canvas.clientHeight || 96));

        // Keep pixel ratio sane
        try { data.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 1.5)); } catch(_){}

        data.renderer.setSize(w, h, false);
        data.camera.aspect = w / h;
        data.camera.updateProjectionMatrix();
      }
    }catch(e){ /* noop */ }
  }


  function setupGallery(){
    var gal=el('gallery');
    var cards=gal.getElementsByClassName('card');

    for(var i=0;i<cards.length;i++){
      (function(card){
        var kind=card.getAttribute('data-kind');
        var canvas=card.getElementsByTagName('canvas')[0];

        // Match the renderer size to the canvas CSS size to avoid vertical squashing on short viewports
        var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
        var w = Math.max(1, Math.round((rect && rect.width) || card.clientWidth || canvas.clientWidth || 160));
        var h = Math.max(1, Math.round((rect && rect.height) || canvas.clientHeight || 96));

        var r=new THREE.WebGLRenderer({
          antialias:true,
          canvas:canvas,
          alpha:true
        });
        setupColorPipeline(r);
        r.setSize(w,h,false);
        r.setPixelRatio(Math.min(window.devicePixelRatio||1, 1.5));

        var sc=new THREE.Scene();
        // Lighten gallery preview background so black cubes are visible
        sc.background = srgbColor('#1F2933');

        var cam=new THREE.PerspectiveCamera(35, w/h, 0.1, 50);
        cam.position.set(2.2,1.6,2.2);

              cam.lookAt(0,0,0);
sc.add(new THREE.AmbientLight(0xffffff, 0.8));
        var dl=new THREE.DirectionalLight(0xffffff, 1.0);
        dl.position.set(4,6,4);
        sc.add(dl);

        var g=baseGeom[kind]||new THREE.BoxGeometry(1,1,1);
        var m=new THREE.MeshStandardMaterial({
          color:toLinear(currentColorHex),
          roughness:1,
          metalness:0,
          side:THREE.DoubleSide
        });
        var g2 = g.clone(); if(g2.center){ g2.center(); }
      var mesh = new THREE.Mesh(g2, new THREE.MeshStandardMaterial({ color: toLinear(currentColorHex), roughness:0.85, metalness:0.05 }));
      mesh.position.set(0,0,0);
        sc.add(mesh);

        // Сохраняем сцену для обновления цвета
        galleryScenes[kind] = {
          scene: sc,
          camera: cam,
          renderer: r,
          canvas: canvas,
          mesh: mesh
        };

        // Кнопка поворота Zen/2: 0 -> X -> Z -> 0
        if(kind === 'Zen/2'){
          var rotateBtn = document.createElement('button');
          rotateBtn.className = 'card-rotate-btn';
          rotateBtn.type = 'button';
          rotateBtn.title = 'Поворачивать Zen/2: X → Z → 0';
          rotateBtn.textContent = '⟳';
          rotateBtn.addEventListener('click', function(ev){
            ev.stopPropagation();
            zen2OrientationIndex = (zen2OrientationIndex + 1) % 3;
            // reset cached half-extents for Zen/2
            zen2HalfCache = {};
            // обновляем превью
            applyZen2Orientation(mesh);
            // и призрак, если сейчас выбран Zen/2
            if(isZen2LikeKind(ghostType) && ghost){
              applyZen2Orientation(ghost);
              if(typeof updateGhost === 'function'){
                updateGhost();
              }
            }
          });
          card.appendChild(rotateBtn);
        }

        var ctr = { update:function(){} }; // controls disabled in gallery

        function frame(){
          mesh.rotation.y+=0.01;
          /* controls disabled */
r.render(sc, cam);
          requestAnimationFrame(frame);
        }
        frame();

        card.addEventListener('click', function(){
          selectGallery(kind);
          el('typeSelect').value=kind;
          ghostType=kind;
          makeGhost(ghostType);
        });
      })(cards[i]);
    }

    // Keep previews correct when CSS changes canvas height (responsive / browser zoom)
    try { resizeGalleryPreviews(); } catch(_){}
    if(!window._galleryPreviewsResizeBound){
      window._galleryPreviewsResizeBound = true;
      window.addEventListener('resize', function(){
        try { resizeGalleryPreviews(); } catch(_){}
      });
    }

  }

  // ===== Face Type Gallery =====
  function setupFaceTypeGallery(){
    var container = el('faceTypeGallery');
    if(!container) return;

    var faceTypes = ['Void', 'Zen', 'Bion', 'Flora'];
    
    faceTypes.forEach(function(kind, index){
      var card = document.createElement('div');
      card.className = 'face-type-card' + (index === 0 ? ' active' : '');
      card.setAttribute('data-type', kind);
      
      var canvas = document.createElement('canvas');
      card.appendChild(canvas);
      
      var label = document.createElement('div');
      label.className = 'face-type-label';
      label.textContent = kind;
      card.appendChild(label);
      
      container.appendChild(card);

      // Создаем сцену для иконки
      var w = 80;
      var h = 80;

      var renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: canvas,
        alpha: true
      });
      
      setupColorPipeline(renderer);
renderer.setSize(w, h, false);
      renderer.setPixelRatio(1);

      var scene = new THREE.Scene();
// Камера смотрящая прямо на переднюю грань
      var camera = new THREE.PerspectiveCamera(45, w/h, 0.1, 10);
      camera.position.set(0, 0, 2.5);
      camera.lookAt(0, 0, 0);

      // Освещение
      var ambient = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambient);
      
      var frontLight = new THREE.DirectionalLight(0xffffff, 0.8);
      frontLight.position.set(0, 0, 2);
      scene.add(frontLight);
      
      var topLight = new THREE.DirectionalLight(0xffffff, 0.3);
      topLight.position.set(0, 2, 0);
      scene.add(topLight);

      // Создаем меш с БЕЛЫМ цветом
      var g = baseGeom[kind] || new THREE.BoxGeometry(1, 1, 1);
      var m = new THREE.MeshStandardMaterial({ color: toLinear('#FFFFFF'), roughness:0.7, metalness:0.2, side:THREE.DoubleSide });
      var g2 = g.clone(); if(g2.center){ g2.center(); }
      var mesh = new THREE.Mesh(g2, m);
      mesh.position.set(0,0,0);
      
      // Поворачиваем куб чтобы передняя грань смотрела на камеру
      mesh.rotation.y = Math.PI; // Поворачиваем на 180 градусов чтобы видеть переднюю грань
      
      scene.add(mesh);

      // Сохраняем сцену
      faceTypeScenes[kind] = {
        scene: scene,
        camera: camera,
        renderer: renderer,
        mesh: mesh
      };

      // Рендерим статичное изображение
      renderer.render(scene, camera);

      // Обработчик клика
      card.addEventListener('click', function(){
        selectFaceType(kind);
      });
    });
  }

  function selectFaceType(kind){
    selectedFaceType = kind;
    
    // Обновляем активную карточку
    var cards = document.querySelectorAll('.face-type-card');
    for(var i=0; i<cards.length; i++){
      var card = cards[i];
      var on = (card.getAttribute('data-type') === kind);
      if(on){
        if(card.className.indexOf('active') === -1){
          card.className += ' active';
        }
      } else {
        card.className = card.className.replace(/\bactive\b/g, '').trim();
      }
    }
  }

  function selectGallery(kind){
    var cards=el('gallery').getElementsByClassName('card');
    for(var i=0;i<cards.length;i++){
      var c=cards[i];
      var on=(c.getAttribute('data-kind')===kind);
      if(on){
        if(c.className.indexOf('active')===-1){
          c.className+=' active';
        }
      } else {
        c.className=c.className.replace(/\bactive\b/g,'').trim();
      }
    }
  }

  
// ===== Embedded models (OBJ from /models) =====
(function(){
  // Map logical kinds to .obj files in /models
  var OBJ_FILES = {
    "Void":  "3dbuilder/models/Void.obj",
    "Zen":   "3dbuilder/models/Zen.obj",
    "Bion":  "3dbuilder/models/Bion.obj",
    "Zen/2": "3dbuilder/models/Zen_2.obj",
    "Flora": "3dbuilder/models/Flora.obj"
  };
  
  // Flora bowl geometry - loaded as face type, not cube
  var floraBowlGeom = null;
  
  // Flora bowl protrusion distance from cube face (bowl sticks out this far)
  var FLORA_BOWL_PROTRUSION = 0.46;


  function loadObjGeom(url){
    return new Promise(function(resolve, reject){
      try{
        var loader = new THREE.OBJLoader();
        loader.load(
          url,
          function(root){
            try{
              var geoms = [];
              root.traverse(function(ch){
                try{ if (ch.isMesh && ch.geometry) geoms.push(ch.geometry); }catch(_){}
              });

              var g = null;
              if (geoms.length === 0){
                g = new THREE.BoxGeometry(1,1,1);
              } else {
                if (geoms.length > 1){
                  try{
                    if (THREE.BufferGeometryUtils && THREE.BufferGeometryUtils.mergeBufferGeometries){
                      g = THREE.BufferGeometryUtils.mergeBufferGeometries(geoms, true);
                    }else{
                      g = geoms[0];
                    }
                  }catch(e){
                    g = geoms[0];
                  }
                } else {
                  g = geoms[0];
                }
                g = g.clone();
                try{
                  g.computeBoundingBox();
                  var size = new THREE.Vector3();
                  g.boundingBox.getSize(size);
                  var s = 1 / Math.max(size.x, size.y, size.z || 1);
                  g.scale(s, s, s);
                  g.center();
                  g.computeVertexNormals();
                }catch(e){}
              }
              resolve(g);
            }catch(e){
              reject(e);
            }
          },
          undefined,
          function(err){ reject(err); }
        );
      }catch(e){
        reject(e);
      }
    });
  }

  function embeddedInit(){
    var keys = Object.keys(OBJ_FILES);
    var promises = keys.map(function(k){
      return loadObjGeom(OBJ_FILES[k]).then(function(g){
        return { key:k, geom:g };
      });
    });

    Promise.all(promises).then(function(results){
      // Fill baseGeom
      baseGeom = {};
      results.forEach(function(r){
        baseGeom[r.key] = r.geom;
      });

      // Build per-face geometries for cube types
      faceGeoms = {};
      for (var k in baseGeom){
        if (!Object.prototype.hasOwnProperty.call(baseGeom, k)) continue;
        if (k === 'Flora') continue; // Flora handled separately
        var src = baseGeom[k];
        if (!src || typeof src.clone !== 'function') src = new THREE.BoxGeometry(1,1,1);
        try{
          faceGeoms[k] = makeBoxFacesFromGeometry(src);
        }catch(err){
          faceGeoms[k] = makeBoxFacesFromGeometry(new THREE.BoxGeometry(1,1,1));
        }
      }

      // Create Flora face geometries - Flora is a 3D bowl that attaches to side faces
      // Flora.obj: base in XY (~3x3), depth in Z (~1.7), normalized to max=1, centered
      try {
        if (baseGeom['Flora']) {
          floraBowlGeom = baseGeom['Flora'];
          
          // Remove UV attribute from source geometry to avoid merge errors
          if (floraBowlGeom.attributes.uv) {
            floraBowlGeom.deleteAttribute('uv');
          }
          
          floraBowlGeom.computeBoundingBox();
          var bb = floraBowlGeom.boundingBox;
          
          console && console.log && console.log('[Flora] Source geometry bbox:', 
            'X:', bb.min.x.toFixed(3), 'to', bb.max.x.toFixed(3),
            'Y:', bb.min.y.toFixed(3), 'to', bb.max.y.toFixed(3),
            'Z:', bb.min.z.toFixed(3), 'to', bb.max.z.toFixed(3));
          
          // Flora after loadObjGeom: centered, max dimension = 1
          // Create 4 variants for each side face
          
          faceGeoms['Flora'] = {
            top: createFloraForFace('top'),
            bottom: createFloraForFace('bottom'),
            front: createFloraForFace('front'),
            back: createFloraForFace('back'),
            left: createFloraForFace('left'),
            right: createFloraForFace('right')
          };
          
          // Log created geometries
          ['top','bottom','front','back','left','right'].forEach(function(d){
            var fg = faceGeoms['Flora'][d];
            if (fg) {
              fg.computeBoundingBox();
              var fbb = fg.boundingBox;
              console && console.log && console.log('[Flora]', d, 'bbox:',
                'X:', fbb.min.x.toFixed(3), 'to', fbb.max.x.toFixed(3),
                'Z:', fbb.min.z.toFixed(3), 'to', fbb.max.z.toFixed(3));
            }
          });
          
          console && console.log && console.log('[Flora] Face geometries created');
        }
      } catch(e) {
        console && console.warn && console.warn('[Flora] face geometry creation failed', e);
      }

      // Create 'box' type (simple cube) - needed for legacy JSON files
      try {
        if (!baseGeom['box']) {
          baseGeom['box'] = new THREE.BoxGeometry(1,1,1);
        }
        if (!faceGeoms['box']) {
          faceGeoms['box'] = makeBoxFacesFromGeometry(new THREE.BoxGeometry(1,1,1));
        }
      } catch(e) {
        console && console.warn && console.warn('[Init] box type creation failed', e);
      }

      // Create 'Zen_2' alias for 'Zen/2' - some JSON files may use underscore variant
      try {
        if (baseGeom['Zen/2'] && !baseGeom['Zen_2']) {
          baseGeom['Zen_2'] = baseGeom['Zen/2'];
        }
        if (faceGeoms['Zen/2'] && !faceGeoms['Zen_2']) {
          faceGeoms['Zen_2'] = faceGeoms['Zen/2'];
        }
      } catch(e) {
        console && console.warn && console.warn('[Init] Zen_2 alias creation failed', e);
      }

      // Show UI and start app
      var ui = document.getElementById('ui'); if (ui) ui.style.display = 'block';
      var stats = document.getElementById('stats'); if (stats) stats.style.display = 'block';

      // Export geometry data to window for external modules (io.js)
      try {
        window.faceGeoms = faceGeoms;
        window.baseGeom = baseGeom;
        window.customKinds = customKinds;
      } catch(_) {}

      if (typeof initApp === 'function') initApp();

      try { hideLoaderWithStartupMin(); } catch(_){}
    }).catch(function(e){
      try{ console.error('[OBJ] init error', e); }catch(_){}
      try{
        baseGeom = {
          "Void":  new THREE.BoxGeometry(1,1,1),
          "Zen":   new THREE.BoxGeometry(1,1,1),
          "Bion":  new THREE.BoxGeometry(1,1,1),
          "Zen/2": new THREE.BoxGeometry(1,1,1),
          "box":   new THREE.BoxGeometry(1,1,1),
          "Zen_2": new THREE.BoxGeometry(1,1,1)
        };
        floraBowlGeom = null;
        faceGeoms = {};
        for (var k in baseGeom){
          if (!Object.prototype.hasOwnProperty.call(baseGeom, k)) continue;
          faceGeoms[k] = makeBoxFacesFromGeometry(baseGeom[k]);
        }
        
        // Export geometry data to window for external modules (io.js)
        try {
          window.faceGeoms = faceGeoms;
          window.baseGeom = baseGeom;
          window.customKinds = customKinds;
        } catch(_) {}
        
        if (typeof initApp === 'function') initApp();
      }catch(e2){}
      try { hideLoaderWithStartupMin(); } catch(_){ }
    });
  }
  
  // Create Flora geometry for a specific face direction
  // Flora needs special handling:
  // 1. Position so the frame (back of bowl) is at the cube face
  // 2. Bowl protrudes outward
  // 3. Remove UV attribute to avoid merge errors
  // 4. Mark as pre-positioned so alignGeomPlaneTo skips it
  
  function createFloraForFace(dir){
    if (!floraBowlGeom) return null;
    
    var flora = floraBowlGeom.clone();
    
    // Remove UV attribute if present (causes merge errors)
    if (flora.attributes.uv) {
      flora.deleteAttribute('uv');
    }
    
    flora.computeBoundingBox();
    var bb = flora.boundingBox;
    
    // Flora.obj after loadObjGeom normalization:
    // - Centered at origin, max dimension = 1
    // - Original: base XY (~3x3cm), depth Z (~1.7cm), Z from 0.9 to 2.6
    // - Frame (flat back) was at Z ≈ 1.2 in original
    // - After normalization: frame at approximately Z = -0.17 to -0.20
    // - Bowl opens toward +Z (max Z ≈ 0.29)
    
    // Calculate frame position (17% from min Z based on original model)
    var zSize = bb.max.z - bb.min.z;
    var frameOffsetFromMin = zSize * 0.17;
    var frameZ = bb.min.z + frameOffsetFromMin; // approximately -0.17
    
    // For each direction, rotate and position so:
    // - Frame sits at the cube face (±0.5)
    // - Bowl protrudes outward
    
    var matrix = new THREE.Matrix4();
    
    if (dir === 'front') {
      // Front face at z=+0.5, bowl protrudes in +Z
      // No rotation needed - bowl already opens in +Z
      // Shift so frame is at z = 0.5
      flora.translate(0, 0, 0.5 - frameZ);
      
    } else if (dir === 'back') {
      // Back face at z=-0.5, bowl protrudes in -Z
      // Rotate 180° around Y to flip
      matrix.makeRotationY(Math.PI);
      flora.applyMatrix4(matrix);
      flora.computeBoundingBox();
      bb = flora.boundingBox;
      // After rotation, frame is now near max.z
      var newFrameZ = bb.max.z - frameOffsetFromMin;
      flora.translate(0, 0, -0.5 - newFrameZ);
      
    } else if (dir === 'right') {
      // Right face at x=+0.5, bowl protrudes in +X
      // First position as front (frame at z=0.5), then rotate around Y
      flora.translate(0, 0, 0.5 - frameZ);
      matrix.makeRotationY(Math.PI/2);
      flora.applyMatrix4(matrix);
      
    } else if (dir === 'left') {
      // Left face at x=-0.5, bowl protrudes in -X
      // First position as front, then rotate around Y
      flora.translate(0, 0, 0.5 - frameZ);
      matrix.makeRotationY(-Math.PI/2);
      flora.applyMatrix4(matrix);
      
    } else if (dir === 'top') {
      // Top face at y=+0.5, bowl protrudes in +Y
      // First position as front (frame at z=0.5), then rotate around X
      flora.translate(0, 0, 0.5 - frameZ);
      matrix.makeRotationX(-Math.PI/2);
      flora.applyMatrix4(matrix);
      
    } else if (dir === 'bottom') {
      // Bottom face at y=-0.5, bowl protrudes in -Y
      // First position as front, then rotate around X
      flora.translate(0, 0, 0.5 - frameZ);
      matrix.makeRotationX(Math.PI/2);
      flora.applyMatrix4(matrix);
    }
    
    flora.computeBoundingBox();
    flora.computeVertexNormals();
    
    // Mark as pre-positioned (for alignGeomPlaneTo to skip)
    flora.userData = flora.userData || {};
    flora.userData.prePositioned = true;
    flora.userData.floraFace = dir;
    
    return flora;
  }

  document.addEventListener('DOMContentLoaded', function(){
    try { if (typeof openHelp === 'function') openHelp(); } catch(_){}
    try { showLoader(); } catch(_){}
    embeddedInit();
  });
})();
// ===== End embedded models =====// ===== End embedded models =====


// ===== App init after models loaded =====
  function initApp(){
    setupScene();
    setupGallery();
    setupFaceTypeGallery();

    // Build color palettes (main + editor face)
    buildPalette('palette', function(hex){
      setRAL(hex);
      var rr=el('ralSelect');
      if(rr){
        rr.value=hex;
        var ev=document.createEvent('HTMLEvents');
        ev.initEvent('change', true, false);
        rr.dispatchEvent(ev);
      }
    });

    buildPalette('paletteFace', function(hex){
  editorFaceHex = hex; // decoupled from main palette
  if(selectedBlock && selectedList().length>0){
    if(paintFaces()){
      pushState();
    }
  }
});

    // set initial color
    var ralSelect=el('ralSelect');
    if(ralSelect){
      setRAL(ralSelect.value);
    }

    // init ghost + default type — Bion
    setGhostType('Bion');

    // Auto-load initial project JSON embedded in HTML (if provided)
    var loadedInitial = false;
    try{
      var initial = (typeof window !== 'undefined') ? window.__INITIAL_PROJECT__ : null;
      if(initial && typeof importProjectJSONFromText === 'function'){
        var text = (typeof initial === 'string') ? initial : JSON.stringify(initial);
        loadedInitial = !!importProjectJSONFromText(text);
      }
    }catch(e){
      console && console.warn && console.warn('[Initial JSON] load failed', e);
      loadedInitial = false;
    }

    // Check if autosave data exists (will be restored after window.load by CubikAutosave)
    var hasAutosave = false;
    try{
      var autosaveData = localStorage.getItem('c3d_autosave_v3');
      if(autosaveData){
        var arr = JSON.parse(autosaveData);
        hasAutosave = Array.isArray(arr) && arr.length > 0;
      }
    }catch(e){}

    // Fallback: place first block at origin so user sees something
    // Skip if autosave data exists (will be restored later by CubikAutosave)
    if(!loadedInitial && !hasAutosave){
      var b=makeSolid('Bion', currentColorHex);
      b.position.set(0, getHalf('Bion').y, 0);
      scene.add(b);
      objects.push(b);
      try{ createWrapperForBlock(b); }catch(e){}
      pickables.push(b);
      lastPlacedCenter.copy(b.position);
    }
animate();
    updateCounter();
    selectGallery('Bion');
    updateFacetStats();

    // facet stats panel collapse toggle
    var fs=el('facetStats');
    var side=el('facetSideToggle');
    if(fs && side){
      var saved=null;
      try{
        saved=localStorage.getItem('facetCollapsed');
      }catch(e){}
      if(saved==='1'){
        if(fs.className.indexOf('collapsed')===-1){
          fs.className+=(fs.className?' ':'')+'collapsed';
        }
        side.setAttribute('aria-expanded','false');
        side.textContent='▶';
        side.title='Expand';
      } else {
        side.setAttribute('aria-expanded','true');
        side.textContent='◀';
        side.title='Collapse';
      }

      side.addEventListener('click', function(){
        var cls=fs.className||'';
        var coll=cls.indexOf('collapsed')!==-1;
        if(coll){
          fs.className=cls.replace(/\bcollapsed\b/g,'').trim();
          side.setAttribute('aria-expanded','true');
          side.textContent='◀';
          side.title='Collapse';
          try{
            localStorage.setItem('facetCollapsed','0');
          }catch(e){}
        } else {
          fs.className=(cls?cls+' ':'')+'collapsed';
          side.setAttribute('aria-expanded','false');
          side.textContent='▶';
          side.title='Expand';
          try{
            localStorage.setItem('facetCollapsed','1');
          }catch(e){}
        }
      });
    }

    // GLB export
    var exportBtn = el('exportBtn');
    if(exportBtn){
      exportBtn.addEventListener('click', function(){
        exportGLB();
      });
    }

    
    // TXT stats export
    var exportStatsBtn = el('exportStatsBtn');
    if(exportStatsBtn){
      exportStatsBtn.addEventListener('click', function(){
        exportStatsTXT();
      });
    }

    // HUD Cubiks pill click - export stats
    var hudCubiksPill = el('hudCubiksPill');
    if(hudCubiksPill){
      hudCubiksPill.addEventListener('click', function(){
        // Only export if there are objects in the scene
        if(objects && objects.length > 0){
          exportStatsTXT();
          msg('Stats exported', true);
        } else {
          msg('No cubiks to export', false);
        }
      });
    }

    // JSON export for backend
    var exportJsonBtn = el('exportJsonBtn');
    if(exportJsonBtn){
      exportJsonBtn.addEventListener('click', function(){
        exportProjectJSON();
      });
    }

    // JSON import (Load scene from JSON file)
    var importJsonBtn = el('importJsonBtn');
    var importJsonInput = el('importJsonInput');
    if(importJsonBtn && importJsonInput && typeof window.FileReader !== 'undefined'){
      importJsonBtn.addEventListener('click', function(){
        importJsonInput.click();
      });

      importJsonInput.addEventListener('change', function(ev){
        try{
          var file = ev.target && ev.target.files && ev.target.files[0];
          if(!file){
            return;
          }
          var reader = new FileReader();
          reader.onload = function(e){
            try{
              var text = String(e.target.result || '');
              if(typeof importProjectJSONFromText === 'function'){
                importProjectJSONFromText(text);
              }
            }catch(err){
              console && console.error && console.error('[Import JSON] onload error', err);
              try{ alert('Ошибка при загрузке JSON'); }catch(_){}
            }finally{
              try{ importJsonInput.value = ''; }catch(_){}
            }
          };
          reader.onerror = function(){
            try{ alert('Не удалось прочитать файл JSON'); }catch(_){}
          };
          reader.readAsText(file, 'utf-8');
        }catch(err){
          console && console.error && console.error('[Import JSON] change handler error', err);
        }
      });
    }

// initial undo snapshot
    pushState();
    hasUnsavedChanges = false;
    updateUndoRedoUI();
  }

  function buildPalette(containerId, onPick){
    var container=el(containerId);
    container.innerHTML='';

    for(var i=0;i<RALS.length;i++){
      (function(name,hex,idx){
        var d=document.createElement('div');
        d.className='dot'+(idx===0?' active':'');
        d.style.background=hex;
        d.title=name+' '+hex;

        d.addEventListener('click', function(){
          var dots=container.getElementsByClassName('dot');
          for(var j=0;j<dots.length;j++){
            dots[j].className = dots[j].className
              .replace(/\bactive\b/g,'')
              .trim();
          }
          d.className+=' active';
          onPick(hex);
        });

        container.appendChild(d);
      })(RALS[i][0], RALS[i][1], i);
    }

    var sw=el('sw');
    if(sw){
      sw.style.background=RALS[0][1];
    }
  }

  // ===== Facet stats =====
  function matBaseHex(mat){
    try{
      if(mat && mat.userData && mat.userData.baseHex){
        return hexNorm(mat.userData.baseHex);
      }
      if(mat && mat.color){
        return hexNorm('#'+mat.color.getHexString());
      }
    }catch(e){}
    return '#7D7F7D';
  }

  function ralName(hex){
    var h=hexNorm(hex);
    return RAL_REV[h] ? RAL_REV[h] : h;
  }

  function computeTotalPriceFromFacetMap(map){
  if(!map) return 0;
  var prices = {
    'Bion': 1.95,
    'Zen': 2.05,
    'Void': 1.58,
    'Zen/2': 1.58,
    'Flora': 2.80
  };
  var total = 0;
  for (var type in map){
    if(!Object.prototype.hasOwnProperty.call(map, type)) continue;
    var bucket = map[type];
    if(!bucket) continue;
    var facets = 0;
    for (var colorHex in bucket){
      if(!Object.prototype.hasOwnProperty.call(bucket, colorHex)) continue;
      facets += bucket[colorHex];
    }
    var unit = prices.hasOwnProperty(type) ? prices[type] : 0;
    total += facets * unit;
  }
  return +total.toFixed(2);
}

function updateFacetStats(){
    // map[type][colorHex] = count of faces
    var map={};

    function inc(type,color,n){
      if(!map[type]) map[type]={};
      if(!map[type][color]) map[type][color]=0;
      map[type][color]+=n;
    }

    for(var i=0;i<objects.length;i++){
      var o=objects[i];
      if(!o||!o.userData) continue;

      if(o.userData.solid){
        var type=o.userData.kind||'Unknown';
        var hex=matBaseHex(o.material);

        // Zen/2 special stats rule:
        // Физически Zen/2 имеет 4 боковые грани со слотами + 2 плоские грани (top/bottom)
        if(type==='Zen/2'){
          inc('Zen/2',hex,4);
          inc('Bion',hex,2);
        } else {
          inc(type,hex,6);
        }

      } else if(o.userData.faces){
        var dirs=['top','bottom','front','back','left','right'];
        for(var j=0;j<dirs.length;j++){
          var d=dirs[j];
          var f=o.userData.faces[d];
          if(!f) continue;

          var t=(o.userData.faceTypes && o.userData.faceTypes[d])
            ? o.userData.faceTypes[d]
            : null;
          
          // Fallback: используем kind куба
          if (!t) {
            t = o.userData.kind || 'Unknown';
          }

          var hx=matBaseHex(f.material);
          inc(t,hx,1);
        }
      }
    }

    renderFacetStats(map);

    try{
      var totalPrice = computeTotalPriceFromFacetMap(map);
      var hudPriceEl = document.getElementById('hudPrice');
      if(hudPriceEl){
        var v = totalPrice;
        var text = '$' + (Math.abs(v - Math.round(v)) < 0.005 ? Math.round(v).toString() : v.toFixed(2));
        hudPriceEl.textContent = text;
      }
    }catch(e){}

  }

  function renderFacetStats(map){
    var box=el('facetBody');
    if(!box) return;

    var types=['Void','Bion','Zen','Zen/2'];
    var hasAny=false;
    var html='';

    for(var ti=0; ti<types.length; ti++){
      var t=types[ti];
      if(!map[t]) continue;

      var total=0;
      for(var k in map[t]){
        if(map[t].hasOwnProperty(k)){
          total+=map[t][k];
        }
      }

      html+='<div class="type">';
      html+='<div class="name">'+t+': '+total+'</div>';
      html+='<div class="chips">';

      for(var k2 in map[t]){
        if(!map[t].hasOwnProperty(k2)) continue;
        var cnt=map[t][k2];
        html+='<div class="chip">';
        html+='<span class="sw" style="background:'+k2+'"></span>';
        html+='<span>'+ralName(k2)+': '+cnt+'</span>';
        html+='</div>';
      }

      html+='</div></div>';
      hasAny=true;
    }

    if(!hasAny){
      html+='<div class="muted">—</div>';
    }

    box.innerHTML=html;
  }

 // ===== Undo / Redo =====
function snapshotScene(){
  var snap=[];
  for(var i=0;i<objects.length;i++){
    var o=objects[i];
    if(!o || !o.userData) continue;

    if(o.userData.solid){
      var colorHex=matBaseHex(o.material);
      snap.push({
        type:'solid',
        kind:o.userData.kind,
        colorHex:colorHex,
        position:[o.position.x,o.position.y,o.position.z],
        rotation:[o.rotation.x,o.rotation.y,o.rotation.z],
        // Сохраняем quaternion для точного восстановления поворота
        quaternion:[o.quaternion.x,o.quaternion.y,o.quaternion.z,o.quaternion.w],
        scale:[o.scale.x,o.scale.y,o.scale.z],
        uuid: o.uuid // сохраняем UUID для идентификации
      });
      continue;
    }

    if(o.userData.faces){
      var gSnap={
        type:'group',
        kind:o.userData.kind,
        position:[o.position.x,o.position.y,o.position.z],
        rotation:[o.rotation.x,o.rotation.y,o.rotation.z],
        // Сохраняем quaternion для точного восстановления поворота (особенно для Zen/2)
        quaternion:[o.quaternion.x,o.quaternion.y,o.quaternion.z,o.quaternion.w],
        scale:[o.scale.x,o.scale.y,o.scale.z],
        faces:{},
        uuid: o.uuid // сохраняем UUID
      };

      for(var dir in o.userData.faces){
        if(!o.userData.faces.hasOwnProperty(dir)) continue;
        var f=o.userData.faces[dir];
        if(!f) continue;

        var fColor=matBaseHex(f.material);
        var fType=(o.userData.faceTypes && o.userData.faceTypes[dir])
          ? o.userData.faceTypes[dir]
          : null;
        
        // Fallback: если faceType не установлен, используем kind куба
        if (!fType) {
          fType = o.userData.kind;
        }

        gSnap.faces[dir]={
          colorHex:fColor,
          faceType:fType,
          faceUuid: f.uuid, // сохраняем UUID грани
          // Сохраняем поворот грани (важно для Flora на Zen/2)
          faceRotation: [f.rotation.x, f.rotation.y, f.rotation.z],
          // Сохраняем quaternion для точного восстановления (особенно для Flora)
          faceQuaternion: [f.quaternion.x, f.quaternion.y, f.quaternion.z, f.quaternion.w]
        };
      }
      snap.push(gSnap);
    }
  }
  return snap;
}

/**
 * Восстанавливает сцену из снапшота (для undo/redo)
 * Использует loadSceneFromSnapshot для гарантированной корректности
 */
function restoreScene(snapArr){
  loadSceneFromSnapshot(snapArr);
}


function loadSceneFromSnapshot(snapArr){
  if (!Array.isArray(snapArr)) return;

  // === ОЧИСТКА СЦЕНЫ ===
  var toRemove = objects.slice();
  for (var i = 0; i < toRemove.length; i++){
    var obj = toRemove[i];
    try { removeWrapperForBlock(obj); } catch(e) {}
    try { disposeObjectRecursive(obj); } catch(e) {}
    try { scene.remove(obj); } catch(e) {}
  }

  objects.length = 0;
  pickables.length = 0;
  selectedBlock = null;
  try { window.selectedBlock = null; } catch(e) {}

  var loadedCount = 0;

  // === ЗАГРУЗКА ОБЪЕКТОВ ===
  for (var si = 0; si < snapArr.length; si++){
    var s = snapArr[si];
    if (!s) continue;

    var pos = s.position || [0, 0, 0];
    var scl = s.scale || [1, 1, 1];

    if (s.type === 'solid'){
      // Solid блок (не редактировался)
      var m = makeSolid(s.kind, s.colorHex || '#7D7F7D');
      m.position.set(pos[0], pos[1], pos[2]);
      
      if (s.quaternion && s.quaternion.length === 4) {
        m.quaternion.set(s.quaternion[0], s.quaternion[1], s.quaternion[2], s.quaternion[3]);
      } else if (s.rotation) {
        m.rotation.set(s.rotation[0] || 0, s.rotation[1] || 0, s.rotation[2] || 0);
      }
      m.scale.set(scl[0], scl[1], scl[2]);
      if (s.uuid) m.uuid = s.uuid;

      scene.add(m);
      objects.push(m);
      pickables.push(m);
      try { createWrapperForBlock(m); } catch(e) {}
      loadedCount++;

    } else if (s.type === 'group'){
      // Group блок (с отдельными гранями)
      // Используем новую функцию которая создаёт правильные грани сразу
      var grp = buildCubeGroupFromSnapshot(s, '#7D7F7D');
      
      grp.position.set(pos[0], pos[1], pos[2]);
      
      if (s.quaternion && s.quaternion.length === 4) {
        grp.quaternion.set(s.quaternion[0], s.quaternion[1], s.quaternion[2], s.quaternion[3]);
      } else if (s.rotation) {
        grp.rotation.set(s.rotation[0] || 0, s.rotation[1] || 0, s.rotation[2] || 0);
      }
      grp.scale.set(scl[0], scl[1], scl[2]);
      if (s.uuid) grp.uuid = s.uuid;

      // После установки позиции/поворота группы - пересчитываем Flora ориентацию
      // (она зависит от мировой ориентации группы)
      if (grp.userData && grp.userData.faces) {
        for (var dir in grp.userData.faces) {
          if (!grp.userData.faces.hasOwnProperty(dir)) continue;
          var faceType = grp.userData.faceTypes && grp.userData.faceTypes[dir];
          if (faceType === 'Flora') {
            var faceMesh = grp.userData.faces[dir];
            try {
              faceMesh.userData = faceMesh.userData || {};
              faceMesh.userData._floraBaseQuat = new THREE.Quaternion();
              applyFloraUprightRoll(faceMesh, grp, dir);
            } catch(e) {}
          }
        }
      }

      scene.add(grp);
      objects.push(grp);
      try { createWrapperForBlock(grp); } catch(e) {}
      loadedCount++;
    }
  }

  // === ФИНАЛИЗАЦИЯ ===
  clearSelected();
  closeEditor();
  rebuildPreviewFromSelected();
  updateCounter();
  updateFacetStats();

  if (objects.length > 0){
    lastPlacedCenter.copy(objects[objects.length - 1].position);
  } else {
    resetPivot();
  }
  
  console && console.log && console.log('[loadSceneFromSnapshot] Loaded:', loadedCount, 'objects');
}



function pushState(){
  if (isReplayingBuild) return; // не пишем историю во время таймлапса
  var snap = snapshotScene();
  undoStack.push(snap);
  redoStack = [];
  if (undoStack.length > MAX_UNDO_STEPS) undoStack.shift();
  hasUnsavedChanges = undoStack.length > 1;
  updateUndoRedoUI();
}
function undoAction(){
  if (undoStack.length <= 1) {
    updateUndoRedoUI();
    return;
  }
  const currentSnap = undoStack.pop();
  redoStack.push(currentSnap);

  const prevSnap = undoStack[undoStack.length - 1];
  restoreScene(prevSnap);

  updateUndoRedoUI();
  msg('Undo', true);
}

function redoAction(){
  if (redoStack.length === 0) {
    updateUndoRedoUI();
    return;
  }
  const nextSnap = redoStack.pop();
  undoStack.push(nextSnap);
  restoreScene(nextSnap);
  updateUndoRedoUI();
  msg('Redo', true);
}



// ===== Timelapse / build replay =====

// Вспомогательная функция: блокируем UI во время воспроизведения
function setReplayUIBusy(busy){
  isReplayingBuild = busy;

  // затемняем левую панель, чтобы было понятно что идёт проигрывание
  var uiPanel = el('ui');
  if (uiPanel){
    uiPanel.style.pointerEvents = busy ? 'none' : '';
    uiPanel.style.opacity = busy ? 0.6 : '';
  }

  updateUndoRedoUI();
}

// Запуск записи Canvas -> WebM
function startCanvasRecording(){
  if (!renderer || !renderer.domElement || !renderer.domElement.captureStream){
    msg('Запись видео не поддерживается в этом браузере', true);
    return false;
  }

  var stream = renderer.domElement.captureStream(30);
  recordedChunks = [];

  try{
    mediaRecorder = new MediaRecorder(stream, { mimeType:'video/webm;codecs=vp9' });
  }catch(e){
    try{
      mediaRecorder = new MediaRecorder(stream, { mimeType:'video/webm' });
    }catch(e2){
      console.error(e2);
      msg('Не удалось запустить запись видео', true);
      return false;
    }
  }

  mediaRecorder.ondataavailable = function(e){
    if (e.data && e.data.size > 0){
      recordedChunks.push(e.data);
    }
  };
  mediaRecorder.onstop = function(){
    if (!recordedChunks || !recordedChunks.length) return;
    var blob = new Blob(recordedChunks, { type:'video/webm' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'build-timelapse.webm';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){
      URL.revokeObjectURL(url);
    }, 1000);
    recordedChunks = [];
  };

  mediaRecorder.start();
  return true;
}

function stopCanvasRecording(){
  if (mediaRecorder && mediaRecorder.state !== 'inactive'){
    mediaRecorder.stop();
  }
}

// Воспроизведение истории сборки (по undoStack).
// Если options.record === true — параллельно пишем видео.
function startBuildReplay(options){
  options = options || {};
  var withRecording = !!options.record;

  if (isReplayingBuild){
    return;
  }
  if (!undoStack || undoStack.length <= 1){
    msg('Нет истории сборки для воспроизведения', true);
    return;
  }

  // запоминаем финальное состояние, чтобы вернуть его в конце
  var finalSnap = snapshotScene();
  var snaps = undoStack.slice(0);
  var index = 0;

  if (withRecording){
    var ok = startCanvasRecording();
    if (!ok){
      withRecording = false;
    }
  }

  setReplayUIBusy(true);

  function step(){
    if (!isReplayingBuild){
      return;
    }
    if (index >= snaps.length){
      clearInterval(replayTimer);
      replayTimer = null;
      if (withRecording){
        stopCanvasRecording();
      }
      // возвращаем финальное состояние
      restoreScene(finalSnap);
      setReplayUIBusy(false);
      return;
    }
    var snap = snaps[index];
    index++;
    restoreScene(snap);
  }

  // стартуем немедленно
  step();
  replayTimer = setInterval(step, 80);
}

function updateUndoRedoUI(){
  var u = el('undoBtn');
  if (u){
    u.disabled = (undoStack.length <= 1) || isReplayingBuild;
  }
  var r = el('redoBtn');
  if (r){
    r.disabled = (redoStack.length === 0) || isReplayingBuild;
  }
  var rb = el('replayBuildBtn');
  if (rb){
    rb.disabled = (undoStack.length <= 1) || isReplayingBuild;
  }
  var vb = el('recordTimelapseBtn');
  if (vb){
    vb.disabled = (undoStack.length <= 1) || isReplayingBuild;
  }
}
// Warn about unsaved changes when leaving the page
window.addEventListener('beforeunload', function(e){
  if (!hasUnsavedChanges) return;
  var message = 'You have unsaved changes. If you leave, your project will be lost.';
  e.preventDefault();
  e.returnValue = message;
  return message;
});
  
  // ===== TXT Stats Export =====
  function hexToColorName(hex){
    // normalize hex to uppercase #RRGGBB
    if(!hex) return 'неизвестный цвет';
    var h = String(hex).toUpperCase();
    // Map known palette to Russian color names
    var map = {
      '#7D7F7D': 'серый',    // RAL 7037
      '#8A6642': 'коричневый', // RAL 1011
      '#4C9141': 'зелёный',  // RAL 6010
      '#F4F4F4': 'белый',    // RAL 9003
      '#0A0A0A': 'чёрный'    // RAL 9005
    };
    return map[h] || 'неизвестный цвет';
  }

  function buildFacetMap(){
    // map[type][colorHex] = count of faces (same logic as updateFacetStats)
    var map={};

    function inc(type,color,n){
      if(!map[type]) map[type]={};
      if(!map[type][color]) map[type][color]=0;
      map[type][color]+=n;
    }

    for(var i=0;i<objects.length;i++){
      var o=objects[i];
      if(!o||!o.userData) continue;

      if(o.userData.solid){
        var type=o.userData.kind||'Unknown';
        var hex=matBaseHex(o.material);

        // Zen/2 special stats rule:
        // Физически Zen/2 имеет 4 боковые грани со слотами + 2 плоские грани (top/bottom)
        if(type==='Zen/2'){
          inc('Zen/2',hex,4);
          inc('Bion',hex,2);
        } else {
          inc(type,hex,6);
        }

      } else if(o.userData.faces){
        var dirs=['top','bottom','front','back','left','right'];
        for(var di=0; di<dirs.length; di++){
          var d=dirs[di];
          var f=o.userData.faces[d];
          if(!f) continue;

          var t=(o.userData.faceTypes && o.userData.faceTypes[d])
            ? o.userData.faceTypes[d]
            : null;
          
          // Fallback: используем kind куба
          if (!t) {
            t = o.userData.kind || 'Unknown';
          }

          var hx=matBaseHex(f.material);
          inc(t,hx,1);
        }
      }
    }
    return map;
  }

  function exportStatsTXT(){
  var map = buildFacetMap();
  var types = Object.keys(map).sort();

  // Unit prices per 1 facet (EUR)
  var prices = {
    'Bion': 1.95,
    'Zen': 2.05,
    'Void': 1.58,
    'Zen/2': 1.58,
    'Flora': 2.80
  };

  function colorNameEN(hex){
    // Use English names only for export; fall back to hex
    var h = String(hex || '').toUpperCase();
    var dict = {
      '#7D7F7D': 'gray',
      '#E1B589': 'beige',
      '#0A6F3C': 'green',
      '#F4F4F4': 'white',
      '#0A0A0A': 'black'
    };
    return dict[h] || h || 'unknown';
  }

  function fmt(n){ return (+n).toFixed(2); }

  var lines = [];
  var grandTotalFacets = 0;
  var grandTotalPrice = 0;

  lines.push('=== Facet Statistics ===');
  lines.push('');

  for (var i=0; i<types.length; i++){
    var t = types[i];
    var byColor = map[t];
    var colorKeys = Object.keys(byColor);
    if (colorKeys.length === 0) continue;

    lines.push('Type: ' + t);
    var typeTotal = 0;

    // Sort by color name for readability
    colorKeys.sort(function(a,b){
      var na = colorNameEN(a);
      var nb = colorNameEN(b);
      if(na<nb) return -1; if(na>nb) return 1; return 0;
    });

    for (var j=0; j<colorKeys.length; j++){
      var hex = colorKeys[j];
      var count = byColor[hex];
      var name = colorNameEN(hex);
      lines.push('  ' + name + ': ' + count);
      typeTotal += count;
    }
    lines.push('  Total by type: ' + typeTotal);
    lines.push('');

    grandTotalFacets += typeTotal;
  }

  lines.push('Grand total facets: ' + grandTotalFacets);
  lines.push('');

  // Pricing section
  lines.push('=== Pricing ===');
  lines.push('Unit price per 1 facet:');
  lines.push('  Bion - 1.95 €');
  lines.push('  Zen - 2.05 €');
  lines.push('  Void - 1.58 €');
  lines.push('  Zen/2 - 1.58 €');
  lines.push('  Flora - 2.80 €');
  lines.push('');

  // Totals by type
  lines.push('=== Totals by Type ===');
  for (var k=0; k<types.length; k++){
    var type = types[k];
    var subtotalFacets = 0;
    var bucket = map[type];
    for (var colorHex in bucket){
      if (Object.prototype.hasOwnProperty.call(bucket, colorHex)){
        subtotalFacets += bucket[colorHex];
      }
    }
    var unit = prices.hasOwnProperty(type) ? prices[type] : 0;
    var subtotalPrice = +(subtotalFacets * unit).toFixed(2);
    lines.push('  ' + type + ': ' + subtotalFacets + ' facets × ' + fmt(unit) + ' € = ' + fmt(subtotalPrice) + ' €');
    grandTotalPrice += subtotalPrice;
  }
  lines.push('');
  lines.push('Grand total price: ' + fmt(grandTotalPrice) + ' €');

  var txt = lines.join('\n');
  var blob = new Blob([txt], {type:'text/plain;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'stats.txt';
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}


// ===== Custom kinds serialization for JSON export/import =====
  var _bufferGeomLoader = null;
  function getBufferGeomLoader(){
    if(!_bufferGeomLoader && typeof THREE !== 'undefined' && THREE.BufferGeometryLoader){
      _bufferGeomLoader = new THREE.BufferGeometryLoader();
    }
    return _bufferGeomLoader;
  }

  function serializeGeometryForJSON(geom){
    if(!geom || typeof geom.toJSON !== 'function') return null;
    try{
      var g = geom;
      // Only call toNonIndexed if geometry has an index (to avoid warning)
      if(g.index && g.toNonIndexed){
        g = g.toNonIndexed();
      }
      return g.toJSON();
    }catch(e){
      try{ console && console.warn && console.warn('[CustomKinds] serializeGeometry failed', e); }catch(_){}
      return null;
    }
  }

  function reviveGeometryFromJSON(json){
    if(!json) return null;
    var loader = getBufferGeomLoader();
    if(!loader) return null;
    try{
      // BufferGeometryLoader.parse понимает объект, возвращённый BufferGeometry.toJSON()
      return loader.parse(json);
    }catch(e){
      try{ console && console.warn && console.warn('[CustomKinds] reviveGeometry failed', e); }catch(_){}
      return null;
    }
  }

  // Собираем список используемых типов из снапшота
  function collectUsedKindsFromSnapshot(snap){
    var used = {};
    if(!Array.isArray(snap)) return used;

    for(var i = 0; i < snap.length; i++){
      var s = snap[i];
      if(!s) continue;

      if(s.kind){
        used[s.kind] = true;
      }

      if(s.faces){
        for(var dir in s.faces){
          if(!Object.prototype.hasOwnProperty.call(s.faces, dir)) continue;
          var fs = s.faces[dir];
          if(fs && fs.faceType){
            used[fs.faceType] = true;
          }
        }
      }
    }
    return used;
  }

  // Built-in kinds - loaded from .obj files, no need to serialize geometry
  // (BUILTIN_KINDS defined at top of file)
  
  function isBuiltinKind(kind) {
    return BUILTIN_KINDS.indexOf(kind) !== -1;
  }

  // OPTIMIZED: сериализация кастомных типов БЕЗ геометрии
  // Встроенные типы не сохраняются - они загружаются из .obj
  // Кастомные сохраняют только faceColors/faceTypes
  function serializeCustomKindsForSnapshot(snap){
    if(!customKinds) return null;

    var usedKinds = collectUsedKindsFromSnapshot(snap);
    var result = {};

    for(var kind in usedKinds){
      if(!Object.prototype.hasOwnProperty.call(usedKinds, kind)) continue;
      
      // Skip built-in kinds - they're loaded from .obj files
      if(isBuiltinKind(kind)) continue;
      
      var ck = customKinds[kind];
      if(!ck) continue;

      // Save only metadata - NO geometry!
      result[kind] = {
        faceColors: ck.faceColors || {},
        faceTypes: ck.faceTypes || {},
        zen2Like: !!ck.zen2Like,
        baseKind: ck.baseKind || 'Bion'
      };
    }

    if(Object.keys(result).length === 0) return null;
    return result;
  }

  // OPTIMIZED: восстановление customKinds из payload
  // Использует уже загруженную геометрию из .obj файлов
  // Поддерживает legacy формат с сериализованной геометрией
  function restoreCustomKindsFromPayload(map){
    if(!map || typeof map !== 'object') return;

    var dirs = ['top','bottom','front','back','left','right'];

    for(var kind in map){
      if(!Object.prototype.hasOwnProperty.call(map, kind)) continue;
      var data = map[kind];
      if(!data) continue;

      // Если kind уже существует - удаляем старый (будет пересоздан с новыми данными)
      if(customKinds && customKinds[kind]) {
        delete customKinds[kind];
        if (faceGeoms[kind]) delete faceGeoms[kind];
        if (baseGeom[kind]) delete baseGeom[kind];
      }

      var faceMap = {};
      var merged = null;
      var baseMergedFallback = null;
      var zen2MergedFallback = null;

      // Base kind is used as a fallback only (we rebuild merged geometry from faces).
      var baseKind = data.baseKind || 'Bion';
      if(baseGeom && baseGeom[baseKind]){
        baseMergedFallback = baseGeom[baseKind];
      }
      
      // CRITICAL FIX: Для zen2Like kinds используем геометрию из Zen/2
      // потому что все грани должны быть правильного размера для узкого куба
      var isZen2Like = !!data.zen2Like;
      var geometrySourceKind = isZen2Like ? 'Zen/2' : baseKind;

      // Prefer Zen/2 merged geometry as a fallback for zen2Like kinds
      if (isZen2Like && baseGeom && baseGeom['Zen/2']) {
        zen2MergedFallback = baseGeom['Zen/2'];
      }
      
      // Проверяем доступность источника геометрии
      if (isZen2Like && (!faceGeoms || !faceGeoms['Zen/2'])) {
        console && console.warn && console.warn('[restoreCustomKinds] Zen/2 geometry not available for zen2Like kind:', kind);
        geometrySourceKind = baseKind;
      }
      
      // Helper: build Flora geometry aligned to the (narrow) Zen/2 face plane.
      // This preserves Flora bowls on zen2Like custom kinds during JSON import.
      function alignedFloraForZen2Face(dir){
        try{
          if(!faceGeoms || !faceGeoms['Flora'] || !faceGeoms['Flora'][dir]) return null;

          // Prefer Zen/2 face as plane reference (correct dimensions)
          var ref = null;
          if(faceGeoms['Zen/2'] && faceGeoms['Zen/2'][dir]) ref = faceGeoms['Zen/2'][dir];
          else if(faceGeoms[baseKind] && faceGeoms[baseKind][dir]) ref = faceGeoms[baseKind][dir];
          else if(faceGeoms['Bion'] && faceGeoms['Bion'][dir]) ref = faceGeoms['Bion'][dir];
          else if(faceGeoms['box'] && faceGeoms['box'][dir]) ref = faceGeoms['box'][dir];
          if(!ref) return null;

          // Flora geometries are pre-positioned for a 1×1×1 cube; we translate them to Zen/2 plane
          var aligned = alignGeomPlaneTo(ref, faceGeoms['Flora'][dir], dir);

          var oldGeomClone = ref.clone();
          oldGeomClone.computeBoundingBox();
          var oldBB = oldGeomClone.boundingBox;

          var axisInfo = axisForFace(dir);
          var axis = axisInfo.axis;
          var isMax = axisInfo.isMax;

          var oldPlane = isMax ? oldBB.max[axis] : oldBB.min[axis];
          var floraPlane = isMax ? 0.5 : -0.5;
          var offset = oldPlane - floraPlane;

          var translate = new THREE.Vector3(0, 0, 0);
          translate[axis] = offset;
          aligned.translate(translate.x, translate.y, translate.z);
          aligned.computeBoundingBox();
          aligned.computeVertexNormals();

          return aligned;
        }catch(e){
          return null;
        }
      }

      // For each face, pick a geometry source.
      // zen2Like kinds keep Zen/2 dimensions, but must preserve Flora bowls.
      var faceTypes = data.faceTypes || {};
      for(var i = 0; i < dirs.length; i++){
        var d = dirs[i];
        var faceType = faceTypes[d] || baseKind;

        if (isZen2Like) {
          // Preserve Flora bowls on zen2Like (aligned to narrow cube plane)
          if (faceType === 'Flora') {
            var floraAligned = alignedFloraForZen2Face(d);
            if (floraAligned) {
              faceMap[d] = floraAligned;
            }
          }

          // Default for zen2Like: keep Zen/2 geometry (correct size)
          if (!faceMap[d] && faceGeoms && faceGeoms['Zen/2'] && faceGeoms['Zen/2'][d]) {
            faceMap[d] = faceGeoms['Zen/2'][d];
          }
        }

        // Non-zen2Like (or zen2Like fallback): geometry from faceType if available
        if(!faceMap[d] && faceGeoms && faceGeoms[faceType] && faceGeoms[faceType][d]){
          faceMap[d] = faceGeoms[faceType][d];
        } else if(!faceMap[d] && faceGeoms && faceGeoms[baseKind] && faceGeoms[baseKind][d]){
          // Fallback to baseKind geometry
          faceMap[d] = faceGeoms[baseKind][d];
        } else if(!faceMap[d] && faceGeoms && faceGeoms['Bion'] && faceGeoms['Bion'][d]){
          // Fallback to Bion geometry
          faceMap[d] = faceGeoms['Bion'][d];
          console && console.warn && console.warn('[restoreCustomKinds] Using Bion fallback for', kind, d);
        } else if(!faceMap[d] && faceGeoms && faceGeoms['box'] && faceGeoms['box'][d]){
          // Fallback to box geometry
          faceMap[d] = faceGeoms['box'][d];
          console && console.warn && console.warn('[restoreCustomKinds] Using box fallback for', kind, d);
        }
        
        // Last resort: create face geometry on the fly
        if(!faceMap[d]){
          console && console.warn && console.warn('[restoreCustomKinds] Creating fallback geometry for', kind, d);
          try{
            var boxFaces = makeBoxFacesFromGeometry(new THREE.BoxGeometry(1,1,1));
            if(boxFaces && boxFaces[d]){
              faceMap[d] = boxFaces[d];
            }
          }catch(e){}
        }
      }
      
      // NOTE: Do NOT force merged geometry to Zen/2 here.
      // We try to rebuild a merged geometry from faceMap (so Flora survives),
      // and only fall back to Zen/2/baseKind later if merge fails.

      // Legacy support: deserialize geometry if present in old format
      if(data.faceGeoms){
        for(var j = 0; j < dirs.length; j++){
          var dd = dirs[j];
          if(!data.faceGeoms[dd]) continue;
          var g = reviveGeometryFromJSON(data.faceGeoms[dd]);
          if(g){
            faceMap[dd] = g;
          }
        }
      }

      if(data.mergedGeom){
        var mergedDeserialized = reviveGeometryFromJSON(data.mergedGeom);
        if(mergedDeserialized){
          merged = mergedDeserialized;
        }
      }

      // Fallback: build from faces or use box
      if(!merged){
        var parts = [];
        for(var dk in faceMap){
          if(!Object.prototype.hasOwnProperty.call(faceMap, dk)) continue;
          try{
            var partGeom = faceMap[dk].clone();
            if (partGeom.attributes && partGeom.attributes.uv) {
              partGeom.deleteAttribute('uv');
            }
            parts.push(partGeom);
          }catch(_){}
        }
        if(parts.length && THREE.BufferGeometryUtils && THREE.BufferGeometryUtils.mergeBufferGeometries){
          try{
            merged = THREE.BufferGeometryUtils.mergeBufferGeometries(parts, true);
            if(merged){
              merged.computeBoundingBox();
              merged.computeVertexNormals();
            }
          }catch(e){
            try{ console && console.warn && console.warn('[CustomKinds] merge faces failed', e); }catch(_){}
          }
        }
      }

      if(!merged){
        // If we cannot rebuild merged geometry, fall back to a sensible base.
        // For zen2Like kinds we prefer Zen/2 dimensions; otherwise baseKind.
        merged = (isZen2Like && zen2MergedFallback)
          ? zen2MergedFallback
          : (baseMergedFallback || new THREE.BoxGeometry(1,1,1));
      }

      // Ensure all 6 faces exist
      for(var fi = 0; fi < dirs.length; fi++){
        var fd = dirs[fi];
        if(!faceMap[fd]){
          console && console.warn && console.warn('[restoreCustomKinds] Missing face after restore:', kind, fd);
        }
      }

      baseGeom[kind] = merged;
      faceGeoms[kind] = faceMap;
      customKinds[kind] = {
        mergedGeom: merged,
        faceGeoms: faceMap,
        faceColors: data.faceColors || {},
        faceTypes: data.faceTypes || {},
        zen2Like: !!data.zen2Like,
        baseKind: data.baseKind || 'Bion'
      };
    }
  }






// ===== JSON Export for backend sample =====
  function exportProjectJSON(){
    try{
      var snap = snapshotScene();
      var payload = {
        name: 'Cubik Project',
        version: '1.2',
        timestamp: Date.now(),
        snapshot: snap
      };

      // Сохраняем кастомные типы, если есть (без геометрии!)
      var customPayload = serializeCustomKindsForSnapshot(snap);
      if(customPayload){
        payload.customKinds = customPayload;
      }

      // Compact JSON (no pretty print for smaller size)
      var json = JSON.stringify(payload);
      
      // Log size for debugging
      var sizeKB = (json.length / 1024).toFixed(1);
      try{
        if(window.console && console.log){
          console.log('[Export] Size: ' + sizeKB + ' KB, ' + snap.length + ' objects');
        }
      }catch(_){}

      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'project.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){
        try{ document.body.removeChild(a); }catch(_){}
        try{ URL.revokeObjectURL(url); }catch(_){}
      }, 0);
      
      msg('Exported (' + sizeKB + ' KB)', true);
    }catch(e){
      console.error('JSON export failed', e);
      alert('Не удалось экспортировать JSON');
    }
  }



  // ===== JSON Import / Load Scene (minimal) =====
  function importProjectJSONFromText(text){
    var data;
    try{
      data = JSON.parse(text);
    }catch(e){
      console && console.error && console.error('[Import JSON] parse error', e);
      try{ alert('Некорректный JSON файл'); }catch(_){}
      return;
    }

    // поддержка форматов:
    // 1) просто массив снапшота
    // 2) объект { snapshot: [...], customKinds?: {...} }
    var snapArr = null;
    var customPayload = null;

    if (Array.isArray(data)){
      snapArr = data;
    } else if (data && typeof data === 'object'){
      if (Array.isArray(data.snapshot)){
        snapArr = data.snapshot;
      }
      if (data.customKinds && typeof data.customKinds === 'object'){
        customPayload = data.customKinds;
      }
    }

    if (!snapArr || !snapArr.length){
      try{ alert('В JSON нет snapshot для загрузки сцены'); }catch(_){}
      return;
    }

    // остановить возможный активный таймлапс
    try{
      if (typeof replayTimer !== 'undefined' && replayTimer){
        clearInterval(replayTimer);
        replayTimer = null;
      }
      if (typeof isReplayingBuild !== 'undefined'){
        isReplayingBuild = false;
      }
      if (typeof setReplayUIBusy === 'function'){
        setReplayUIBusy(false);
      }
    }catch(e){
      console && console.warn && console.warn('[Import JSON] replay state reset error', e);
    }

    // Восстанавливаем кастомные типы, если они есть в JSON
    try{
      // ВАЖНО: очищаем старые кастомные kinds перед загрузкой новых
      // Иначе при загрузке разных проектов kinds с одинаковыми именами
      // будут иметь неправильные faceTypes от предыдущего проекта
      clearCustomKinds();
      
      if(customPayload){
        restoreCustomKindsFromPayload(customPayload);
      }
    }catch(e){
      console && console.warn && console.warn('[Import JSON] restore customKinds error', e);
    }

    // Валидация - проверяем какие типы используются и какие отсутствуют
    try{
      var usedKinds = {};
      var usedFaceTypes = {};
      for(var vi = 0; vi < snapArr.length; vi++){
        var vs = snapArr[vi];
        if(!vs) continue;
        if(vs.kind) usedKinds[vs.kind] = true;
        if(vs.faces){
          for(var vdir in vs.faces){
            if(!vs.faces.hasOwnProperty(vdir)) continue;
            var vfs = vs.faces[vdir];
            if(vfs && vfs.faceType) usedFaceTypes[vfs.faceType] = true;
          }
        }
      }
      
      var missingKinds = [];
      var missingFaceTypes = [];
      
      for(var uk in usedKinds){
        if(!faceGeoms || !faceGeoms[uk]){
          missingKinds.push(uk);
        }
      }
      
      for(var uft in usedFaceTypes){
        if(!faceGeoms || !faceGeoms[uft]){
          missingFaceTypes.push(uft);
        }
      }
      
      if(missingKinds.length > 0){
        console && console.warn && console.warn('[Import JSON] Missing cube kinds (will use fallback):', missingKinds);
      }
      if(missingFaceTypes.length > 0){
        console && console.warn && console.warn('[Import JSON] Missing face types (will use fallback):', missingFaceTypes);
      }
    }catch(e){
      console && console.warn && console.warn('[Import JSON] validation error', e);
    }

    // восстановить сцену из снапшота
    try{
      if(typeof loadSceneFromSnapshot === 'function'){
        loadSceneFromSnapshot(snapArr);
      } else {
        console && console.error && console.error('[Import JSON] loadSceneFromSnapshot() is not available');
        try{ alert('Невозможно восстановить сцену: нет функции loadSceneFromSnapshot'); }catch(_){}
        return;
      }
    }catch(e){
      console && console.error && console.error('[Import JSON] loadSceneFromSnapshot error', e);
      try{ alert('Ошибка при восстановлении сцены из JSON'); }catch(_){}
      return;
    }

    // после загрузки считаем это новым стартовым состоянием истории
    try{
      if(typeof undoStack !== 'undefined' && typeof snapshotScene === 'function'){
        undoStack = [ snapshotScene() ];
      }
      if(typeof redoStack !== 'undefined'){
        redoStack = [];
      }
      if(typeof hasUnsavedChanges !== 'undefined'){
        hasUnsavedChanges = false;
      }
      if(typeof updateUndoRedoUI === 'function'){
        updateUndoRedoUI();
      }
    }catch(e){
      console && console.warn && console.warn('[Import JSON] undo/redo reset error', e);
    }

    try{
      msg && msg('Scene loaded from JSON', true);
    }catch(_){}

    return true; // Успешная загрузка
  }


  try{ window.importProjectJSONFromText = importProjectJSONFromText; }catch(_){}

  // =============================================================================
  // Export core functions to window for modular architecture
  // =============================================================================
  try {
    window.snapshotScene = snapshotScene;
    window.restoreScene = restoreScene;
    window.loadSceneFromSnapshot = loadSceneFromSnapshot;
    window.buildExportGroup = buildExportGroup;
    window.scene = scene;
    window.camera = camera;
    window.renderer = renderer;
    
    // Getter function for reliable access to objects array
    window.getObjects = function() { return objects; };
    
    // Direct reference (for backward compatibility)
    Object.defineProperty(window, 'objects', {
      get: function() { return objects; },
      enumerable: true,
      configurable: true
    });
    
    // Note: faceGeoms, baseGeom, customKinds are exported in embeddedInit() after loading
  } catch(_) {}

// ===== GLB Export =====
  function buildExportGroup(){
    var root = new THREE.Group();
    for(var i=0;i<objects.length;i++){
      var o=objects[i];
      if(!o) continue;

      var clone = o.clone(true);
      clone.traverse(function(ch){
        if(ch.isMesh && ch.material){
          ch.material = ch.material.clone();

          if(!(ch.material instanceof THREE.MeshStandardMaterial)){
            var baseHex = (ch.material.userData && ch.material.userData.baseHex)
              ? ch.material.userData.baseHex
              : (ch.material.color
                  ? '#'+ch.material.color.getHexString()
                  : '#7D7F7D');

            var stdMat = new THREE.MeshStandardMaterial({
              color: toLinear(baseHex),
              roughness:0.85,
              metalness:0.05,
              side:THREE.DoubleSide
            });
            stdMat.userData = { baseHex: baseHex };
            ch.material = stdMat;
          }
        }
      });

      root.add(clone);
    }
    return root;
  }

  function exportGLB(){
    if(typeof THREE.GLTFExporter === 'undefined'){
      alert('GLTFExporter not found');
      return;
    }

    // Лоадер на время тяжёлого GLB экспорта (без минимального 3с)
    try { showLoader('Exporting GLB...'); } catch(_){}

    var exporter = new THREE.GLTFExporter();
    var root = buildExportGroup();

    try{
      exporter.parse(root, function(result){
        try{
          var blob = new Blob([result], {type:'model/gltf-binary'});
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'scene.glb';
          document.body.appendChild(a);
          a.click();
          setTimeout(function(){
            URL.revokeObjectURL(url);
            a.remove();
          }, 1000);
          msg('Scene exported to GLB', true);
        }catch(e){
          console.error(e);
          msg('Export failed', false);
        } finally {
          try { hideLoader(); } catch(_){}
        }
      }, {
        binary:true,
        onlyVisible:true,
        trs:false
      });
    }catch(e){
      console.error(e);
      msg('Export failed', false);
      try { hideLoader(); } catch(_){}
    }
  }

})(); // end main IIFE

// =============================================================================
