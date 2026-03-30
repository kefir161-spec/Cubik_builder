/**
 * ============================================================================
 *  GLB EXPORT — ПОЛНАЯ СПРАВКА ПО ФУНКЦИОНАЛЬНОСТИ
 * ============================================================================
 *
 *  Этот файл собран из нескольких модулей проекта 3D Builder и содержит
 *  ВСЕ функции, связанные с экспортом сцены в формат GLB (бинарный glTF).
 *
 *  ФАЙЛЫ-ИСТОЧНИКИ:
 *    1. app.js          — buildExportGroup(), toLinear()
 *    2. io.js           — mergeExportGroupForSize(), exportGLB()
 *    3. backend-api.js  — generateGLB(), getProjectData(), getProjectFormData()
 *
 *  ВНЕШНИЕ ЗАВИСИМОСТИ (подключаются через <script> в index.html):
 *    - Three.js v0.128.0                (THREE)
 *    - THREE.BufferGeometryUtils        (merge геометрий)
 *    - THREE.GLTFExporter               (сериализация в glTF/GLB)
 *
 *  КАК РАБОТАЕТ ПАЙПЛАЙН ЭКСПОРТА:
 *
 *    ┌─────────────────────┐
 *    │  objects[] (сцена)   │  Массив THREE.Object3D — все объекты на сцене
 *    └────────┬────────────┘
 *             │
 *             ▼
 *    ┌─────────────────────┐
 *    │  buildExportGroup() │  Клонирует объекты, конвертирует материалы
 *    │  (app.js)           │  в MeshStandardMaterial (для корректного glTF)
 *    └────────┬────────────┘
 *             │
 *             ▼
 *    ┌───────────────────────────┐
 *    │  mergeExportGroupForSize()│  Группирует меши по цвету материала,
 *    │  (io.js)                  │  объединяет геометрии → уменьшает размер
 *    └────────┬──────────────────┘
 *             │
 *             ▼
 *    ┌─────────────────────┐
 *    │  THREE.GLTFExporter  │  Стандартный экспортер Three.js:
 *    │  .parse(root, ...)   │  binary:true → ArrayBuffer → Blob
 *    └────────┬────────────┘
 *             │
 *        ┌────┴─────┐
 *        ▼          ▼
 *   exportGLB()  generateGLB()
 *   (скачивание) (Blob для API)
 *
 * ============================================================================
 */


// ─────────────────────────────────────────────────────────────────────────────
// РАЗДЕЛ 1.  ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ — КОНВЕРТАЦИЯ ЦВЕТА В LINEAR
// Источник:  app.js, строка ~182
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Переводит HEX-цвет из sRGB в linear color space.
 * GLB/glTF хранит цвета в linear space, поэтому перед экспортом
 * все hex-цвета материалов конвертируются этой функцией.
 *
 * @param {string} hex - Цвет в формате "#RRGGBB"
 * @returns {THREE.Color} Цвет в linear space
 */
function toLinear(hex) {
  var c = new THREE.Color(hex);
  if (c.convertSRGBToLinear) c.convertSRGBToLinear();
  return c;
}


// ─────────────────────────────────────────────────────────────────────────────
// РАЗДЕЛ 2.  СБОРКА ЭКСПОРТНОЙ ГРУППЫ ИЗ ОБЪЕКТОВ СЦЕНЫ
// Источник:  app.js, строка ~7340
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Обходит глобальный массив objects[] (все объекты на 3D-сцене),
 * клонирует каждый и конвертирует материалы в MeshStandardMaterial.
 *
 * Зачем конвертировать материалы:
 *   - В рабочей сцене могут быть MeshBasicMaterial, MeshLambertMaterial и т.д.
 *   - GLB/glTF поддерживает только PBR-материалы (MeshStandardMaterial).
 *   - Если не конвертировать, экспортер Three.js может потерять цвета
 *     или выбросить ошибку.
 *
 * Логика конвертации:
 *   1. Если материал уже MeshStandardMaterial — оставляет как есть.
 *   2. Иначе берёт baseHex из userData (если задан) или hex из material.color.
 *   3. Создаёт новый MeshStandardMaterial с roughness=0.85, metalness=0.05.
 *   4. Цвет переводит в linear space через toLinear().
 *
 * @returns {THREE.Group} Корневая группа, готовая к передаче в GLTFExporter
 */
function buildExportGroup() {
  var root = new THREE.Group();

  for (var i = 0; i < objects.length; i++) {
    var o = objects[i];
    if (!o) continue;

    var clone = o.clone(true);

    clone.traverse(function(ch) {
      if (ch.isMesh && ch.material) {
        ch.material = ch.material.clone();

        if (!(ch.material instanceof THREE.MeshStandardMaterial)) {
          var baseHex = (ch.material.userData && ch.material.userData.baseHex)
            ? ch.material.userData.baseHex
            : (ch.material.color
                ? '#' + ch.material.color.getHexString()
                : '#7D7F7D');

          var stdMat = new THREE.MeshStandardMaterial({
            color:     toLinear(baseHex),
            roughness: 0.85,
            metalness: 0.05,
            side:      THREE.DoubleSide
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

// Функция экспортируется в глобальную область:
// window.buildExportGroup = buildExportGroup;


// ─────────────────────────────────────────────────────────────────────────────
// РАЗДЕЛ 3.  ОПТИМИЗАЦИЯ — СЛИЯНИЕ МЕШЕЙ ПО МАТЕРИАЛУ
// Источник:  io.js, строка ~401
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Принимает группу (от buildExportGroup) и объединяет все меши
 * с одинаковым материалом (цветом) в один меш.
 *
 * Пример: если на сцене 500 кубиков одного цвета — вместо 500 мешей
 * в GLB-файле будет 1 меш. Это РАДИКАЛЬНО уменьшает размер файла.
 *
 * Алгоритм:
 *   1. Собирает все меши из дерева объектов (traverse).
 *   2. Группирует их по ключу материала:
 *      - userData.baseHex (приоритет)
 *      - material.color.getHexString()
 *      - material.uuid (fallback)
 *   3. Клонирует геометрию каждого меша и применяет его мировую матрицу
 *      (applyMatrix4) — чтобы сохранить позицию/поворот/масштаб.
 *   4. Для каждой группы вызывает BufferGeometryUtils.mergeBufferGeometries().
 *   5. Возвращает новую THREE.Group с объединёнными мешами.
 *
 * @param {THREE.Group} root - Группа от buildExportGroup()
 * @returns {THREE.Group} Оптимизированная группа (меньше мешей)
 */
function mergeExportGroupForSize(root) {
  if (!root
      || typeof THREE === 'undefined'
      || !THREE.BufferGeometryUtils
      || !THREE.BufferGeometryUtils.mergeBufferGeometries) {
    return root; // fallback — возвращаем как есть
  }

  // Шаг 1: собрать все меши
  var meshes = [];
  root.traverse(function(obj) {
    if (obj.isMesh && obj.geometry) meshes.push(obj);
  });
  if (meshes.length === 0) return root;

  // Шаг 2: группировка по ключу материала (цвету)
  var byKey = {};
  for (var i = 0; i < meshes.length; i++) {
    var mesh = meshes[i];
    var mat  = mesh.material;
    var key  = 'default';

    if (mat) {
      if (mat.userData && mat.userData.baseHex)                    key = mat.userData.baseHex;
      else if (mat.color && typeof mat.color.getHexString === 'function') key = '#' + mat.color.getHexString();
      else                                                        key = mat.uuid || key;
    }

    if (!byKey[key]) byKey[key] = { material: mat, geometries: [] };

    var geom = mesh.geometry.clone();
    if (mesh.matrixWorld) geom.applyMatrix4(mesh.matrixWorld); // «впечатываем» трансформации
    byKey[key].geometries.push(geom);
  }

  // Шаг 3: объединение геометрий в один меш на группу
  var out = new THREE.Group();
  for (var k in byKey) {
    var entry = byKey[k];
    if (entry.geometries.length === 0) continue;

    var merged;
    try {
      merged = THREE.BufferGeometryUtils.mergeBufferGeometries(entry.geometries, true);
    } catch (e) {
      merged = entry.geometries[0]; // fallback — берём первую
    }
    if (merged) out.add(new THREE.Mesh(merged, entry.material));
  }
  return out;
}


// ─────────────────────────────────────────────────────────────────────────────
// РАЗДЕЛ 4.  ЭКСПОРТ GLB С АВТОМАТИЧЕСКИМ СКАЧИВАНИЕМ (через браузер)
// Источник:  io.js, строка ~442
// Публичный API:  CubikIO.exportGLB(filename)  /  window.exportGLB(filename)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Основная пользовательская функция экспорта.
 * Собирает сцену → оптимизирует → экспортирует через GLTFExporter
 * → создаёт Blob → скачивает файл через <a download>.
 *
 * Вызов из консоли браузера:
 *   CubikIO.exportGLB()           → скачает scene.glb
 *   CubikIO.exportGLB('my.glb')   → скачает my.glb
 *
 * @param {string} [filename='scene.glb'] - Имя скачиваемого файла
 */
function exportGLB(filename) {
  if (!THREE.GLTFExporter) {
    console.warn('GLTFExporter not available');
    return;
  }
  try {
    var exporter = new THREE.GLTFExporter();

    // Получаем дерево объектов сцены
    var root = typeof global.buildExportGroup === 'function'
      ? global.buildExportGroup()
      : global.scene;

    // Оптимизация: сливаем меши по материалу
    root = mergeExportGroupForSize(root);

    // Парсинг сцены в бинарный GLB (ArrayBuffer)
    exporter.parse(root, function(result) {
      try {
        var blob = new Blob([result], { type: 'model/gltf-binary' });
        var url  = URL.createObjectURL(blob);

        // Программное скачивание через невидимую ссылку
        var a      = document.createElement('a');
        a.href     = url;
        a.download = (typeof filename === 'string' && filename) ? filename : 'scene.glb';
        document.body.appendChild(a);
        a.click();

        // Освобождаем память через 1 секунду
        setTimeout(function() {
          URL.revokeObjectURL(url);
          try { a.remove(); } catch (e) {}
        }, 1000);
      } catch (e) {
        console.error('[IO] GLB export error:', e);
      }
    }, {
      binary:      true,   // GLB (бинарный), а не .gltf (JSON)
      onlyVisible: true,   // Экспортировать только видимые объекты
      trs:         false   // Использовать матрицы трансформации, а не TRS-компоненты
    });
  } catch (e) {
    console.error('[IO] GLB export error:', e);
  }
}

// Публичные точки входа:
// window.CubikIO.exportGLB = exportGLB;
// window.exportGLB         = exportGLB;  // обратная совместимость


// ─────────────────────────────────────────────────────────────────────────────
// РАЗДЕЛ 5.  ГЕНЕРАЦИЯ GLB КАК BLOB (для отправки на бэкенд, без скачивания)
// Источник:  backend-api.js, строка ~205
// Публичный API:  CubikBackendAPI.generateGLB()
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Возвращает Promise<Blob> с готовым GLB-файлом.
 * В отличие от exportGLB() — НЕ скачивает файл, а возвращает Blob,
 * который можно отправить на сервер через FormData.
 *
 * ПРИМЕЧАНИЕ: эта версия НЕ вызывает mergeExportGroupForSize().
 * Она работает с «сырой» группой от buildExportGroup().
 *
 * Использование:
 *   CubikBackendAPI.generateGLB().then(function(blob) {
 *     // blob — готовый GLB-файл, тип 'model/gltf-binary'
 *   });
 *
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
      var root     = buildExportGroup();

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
        binary:      true,
        onlyVisible: true,
        trs:         false
      });
    } catch (e) {
      reject(e);
    }
  });
}

// Публичная точка входа:
// window.CubikBackendAPI.generateGLB = generateGLB;


// ─────────────────────────────────────────────────────────────────────────────
// РАЗДЕЛ 6.  ИНТЕГРАЦИЯ GLB В ПАКЕТ ДАННЫХ ПРОЕКТА (для сохранения на сервер)
// Источник:  backend-api.js, строка ~257
// Публичный API:  CubikBackendAPI.getProjectData(options)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Собирает полный пакет данных проекта: JSON-снапшот, цену, иконку и GLB.
 * GLB генерируется параллельно с thumbnail через Promise.all.
 *
 * @param {Object} [options]
 * @param {string}  [options.name='Cubik Project'] - Название проекта
 * @param {boolean} [options.includeGLB=true]       - Включить GLB в результат
 * @param {boolean} [options.includeThumbnail=true]  - Включить иконку
 * @param {number}  [options.thumbnailWidth=512]
 * @param {number}  [options.thumbnailHeight=512]
 * @param {string}  [options.thumbnailFormat='image/png']
 *
 * @returns {Promise<Object>} Объект с полями:
 *   {
 *     name, version, timestamp,
 *     snapshot,         // JSON-снапшот сцены
 *     objectCount,      // Количество объектов
 *     price,            // Цена (число)
 *     priceDetails,     // Детализация цены
 *     currency,         // 'EUR'
 *     thumbnail,        // data:image/png;base64,...
 *     thumbnailBlob,    // Blob для FormData
 *     glb               // Blob (GLB файл) или null
 *   }
 */
function getProjectData(options) {
  var opts = Object.assign({
    name:             'Cubik Project',
    thumbnailWidth:   512,
    thumbnailHeight:  512,
    thumbnailFormat:  'image/png',
    includeGLB:       true,
    includeThumbnail: true
  }, options);

  return new Promise(function(resolve, reject) {
    try {
      var snapshot = snapshotScene();
      var objects  = getObjectsArray();
      var priceDetails = getPriceDetails();

      var result = {
        name:          opts.name,
        version:       '1.2',
        timestamp:     Date.now(),
        snapshot:      snapshot,
        objectCount:   objects.length,
        price:         priceDetails.total,
        priceDetails:  priceDetails,
        currency:      'EUR',
        thumbnail:     null,
        thumbnailBlob: null,
        glb:           null
      };

      var promises = [];

      // ... (здесь также генерируется thumbnail, опущено для краткости) ...

      // Генерация GLB параллельно с thumbnail
      if (opts.includeGLB) {
        var glbPromise = generateGLB().then(function(blob) {
          result.glb = blob;
        }).catch(function(e) {
          console.warn('[BackendAPI] GLB generation failed:', e);
          result.glb = null; // не ломаем весь экспорт из-за ошибки GLB
        });
        promises.push(glbPromise);
      }

      Promise.all(promises).then(function() {
        resolve(result);
      }).catch(function() {
        resolve(result); // отдаём частичный результат даже при ошибках
      });

    } catch (e) {
      reject(e);
    }
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// РАЗДЕЛ 7.  ФОРМИРОВАНИЕ FormData ДЛЯ ОТПРАВКИ НА СЕРВЕР
// Источник:  backend-api.js, строка ~361
// Публичный API:  CubikBackendAPI.getProjectFormData(options)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Оборачивает результат getProjectData() в FormData,
 * готовый к отправке через fetch() / XMLHttpRequest.
 *
 * GLB-файл добавляется как поле 'model' с именем 'model.glb'.
 *
 * Использование:
 *   CubikBackendAPI.getProjectFormData({ name: 'My Project' })
 *     .then(function(formData) {
 *       fetch('/api/save', { method: 'POST', body: formData });
 *     });
 *
 * Структура FormData:
 *   - projectId    (string, опционально)
 *   - name         (string)
 *   - timestamp    (string)
 *   - objectCount  (string)
 *   - price        (string)
 *   - currency     (string)
 *   - priceDetails (JSON string)
 *   - project      (Blob, 'project.json')
 *   - thumbnail    (Blob, 'thumbnail.png')
 *   - model        (Blob, 'model.glb')     ← GLB-файл
 */
function getProjectFormData(options) {
  var opts = Object.assign({ projectId: null }, options);

  return getProjectData(opts).then(function(data) {
    var formData = new FormData();

    if (opts.projectId) formData.append('projectId', opts.projectId);
    formData.append('name',         data.name);
    formData.append('timestamp',    data.timestamp.toString());
    formData.append('objectCount',  data.objectCount.toString());
    formData.append('price',        data.price.toString());
    formData.append('currency',     data.currency);
    formData.append('priceDetails', JSON.stringify(data.priceDetails));

    var snapshotBlob = new Blob([JSON.stringify({
      name:      data.name,
      version:   data.version,
      timestamp: data.timestamp,
      snapshot:  data.snapshot
    })], { type: 'application/json' });
    formData.append('project', snapshotBlob, 'project.json');

    if (data.thumbnailBlob) {
      var ext = opts.thumbnailFormat === 'image/jpeg' ? 'jpg' : 'png';
      formData.append('thumbnail', data.thumbnailBlob, 'thumbnail.' + ext);
    }

    // GLB-модель
    if (data.glb) {
      formData.append('model', data.glb, 'model.glb');
    }

    return formData;
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// РАЗДЕЛ 8.  ПОДКЛЮЧЕНИЕ GLTFExporter (index.html)
// ─────────────────────────────────────────────────────────────────────────────
//
// В index.html подключается внешний скрипт:
//
//   <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js"></script>
//
// Он добавляет THREE.GLTFExporter в глобальную область.
// Также нужен BufferGeometryUtils для mergeExportGroupForSize():
//
//   <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/BufferGeometryUtils.js"></script>
//


// ─────────────────────────────────────────────────────────────────────────────
// КРАТКИЙ СПРАВОЧНИК ПУБЛИЧНЫХ API
// ─────────────────────────────────────────────────────────────────────────────
//
//  СПОСОБ 1 — Скачать GLB файл прямо из браузера:
//    CubikIO.exportGLB()             // → скачает scene.glb
//    CubikIO.exportGLB('model.glb')  // → скачает model.glb
//
//  СПОСОБ 2 — Получить GLB как Blob (для отправки на сервер):
//    CubikBackendAPI.generateGLB().then(function(blob) { ... })
//
//  СПОСОБ 3 — Полный пакет (JSON + цена + иконка + GLB):
//    CubikBackendAPI.getProjectData().then(function(data) {
//      data.glb  // Blob или null
//    })
//
//  СПОСОБ 4 — Готовый FormData для POST на бэкенд:
//    CubikBackendAPI.getProjectFormData().then(function(formData) {
//      fetch('/api/save', { method: 'POST', body: formData });
//    })
//
