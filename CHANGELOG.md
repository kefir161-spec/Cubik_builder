# Исправления в 3D Builder

## Проблема
При загрузке модели из JSON файла зелёный дефолтный куб оставался на сцене вместо того, чтобы удаляться.

---

## Причины

### 1. Некорректная обработка ошибок в `loadSceneFromSnapshot`

**Было:**
```javascript
try{
  for (var i = 0; i < objects.length; i++){
    var obj = objects[i];
    try{ removeWrapperForBlock(obj); }catch(e){}
    try{ disposeObjectRecursive(obj); }catch(e){}
    try{ scene.remove(obj); }catch(e){}
    // ... очистка pickables
  }
}catch(e){}
```

Весь цикл очистки обёрнут в один `try/catch`. Любая ошибка внутри цикла прерывала очистку **всех** объектов, при этом ошибка "проглатывалась" без логирования.

### 2. Отсутствие проверки `faces` в `restoreScene`

**Было:**
```javascript
} else {
  for(var dir in obj.userData.faces){
    // ...
  }
}
```

Если `obj.userData.faces` равен `undefined`, код падал с ошибкой при попытке итерации.

---

## Исправления

### Файл: `3dbuilder/js/app.js`

#### Функция `loadSceneFromSnapshot` (строка ~3884)

**Стало:**
```javascript
function loadSceneFromSnapshot(snapArr){
  if (!Array.isArray(snapArr)) return;

  // Создаём копию массива для безопасной итерации
  var toRemove = objects.slice();
  
  for (var i = 0; i < toRemove.length; i++){
    var obj = toRemove[i];
    try{ 
      removeWrapperForBlock(obj); 
    }catch(e){ 
      console.warn('[loadSceneFromSnapshot] removeWrapperForBlock error:', e); 
    }
    try{ 
      disposeObjectRecursive(obj); 
    }catch(e){ 
      console.warn('[loadSceneFromSnapshot] disposeObjectRecursive error:', e); 
    }
    try{ 
      scene.remove(obj);
    }catch(e){ 
      console.warn('[loadSceneFromSnapshot] scene.remove error:', e); 
    }
  }

  objects = [];
  pickables = [];
  selectedBlock = null;
  try{ window.selectedBlock = null; }catch(e){}
  // ...
}
```

**Изменения:**
- Создаётся копия массива `objects.slice()` перед итерацией
- Каждая операция в отдельном `try/catch` с логированием
- Убрана избыточная очистка `pickables` внутри цикла (массив обнуляется после)

#### Функция `restoreScene` (строка ~3740)

**Стало:**
```javascript
if(obj.userData && obj.userData.solid){
  var pickIndex = pickables.indexOf(obj);
  if(pickIndex !== -1) pickables.splice(pickIndex,1);
} else if(obj.userData && obj.userData.faces) {
  for(var dir in obj.userData.faces){
    if(!obj.userData.faces.hasOwnProperty(dir)) continue;
    var face = obj.userData.faces[dir];
    var faceIndex = pickables.indexOf(face);
    if(faceIndex !== -1) pickables.splice(faceIndex,1);
  }
}
```

**Изменения:**
- Добавлена проверка `obj.userData.faces` перед итерацией
- Добавлена проверка `hasOwnProperty` для безопасной итерации

---

## Результат
Теперь при загрузке JSON-проекта все существующие объекты (включая дефолтный куб) корректно удаляются со сцены перед загрузкой новых.
