/**
 * Cubik Shop Map - Mapping of Type|Color to Product IDs
 * 
 * Автоматически сгенерировано на основе данных с https://cubik.one/cubiks/
 * 
 * Подключить в index.html ПЕРЕД shop-on-save.cubik.one.js:
 * <script src="/3dbuilder/js/cubik-shop-map.js"></script>
 */

window.CUBIK_SHOP_MAP = {
  // ========== ZEN ==========
  "Zen|#7D7F7D": 49,      // Facet Zen grey
  "Zen|#F4F4F4": 50,      // Facet Zen white
  "Zen|#0A0A0A": 47,      // Facet Zen black
  "Zen|#E1B589": 33,      // Facet Zen beige
  "Zen|#0A6F3C": 48,      // Facet Zen green
  
  // ========== BION ==========
  "Bion|#7D7F7D": 41,     // Facet Bion grey
  "Bion|#F4F4F4": 42,     // Facet Bion white
  "Bion|#0A0A0A": 39,     // Facet Bion black
  "Bion|#E1B589": 115,    // Facet Bion beige
  "Bion|#0A6F3C": 40,     // Facet Bion green
  
  // ========== VOID ==========
  "Void|#7D7F7D": 45,     // Facet Void grey
  "Void|#F4F4F4": 46,     // Facet Void white
  "Void|#0A0A0A": 43,     // Facet Void black
  "Void|#E1B589": 32,     // Facet Void beige
  "Void|#0A6F3C": 44,     // Facet Void green
  
  // ========== FLORA ==========
  "Flora|#7D7F7D": 444,   // Flora grey
  "Flora|#F4F4F4": 446,   // Flora white
  "Flora|#0A0A0A": 447,   // Flora black
  "Flora|#E1B589": 441,   // Flora beige
  "Flora|#0A6F3C": 445,   // Flora green
  
  // ========== ZEN/2 ==========
  "Zen/2|#7D7F7D": 119,   // Facet Zen/2 grey
  "Zen/2|#F4F4F4": 120,   // Facet Zen/2 white
  "Zen/2|#0A0A0A": 117,   // Facet Zen/2 black
  "Zen/2|#E1B589": 116,   // Facet Zen/2 beige
  "Zen/2|#0A6F3C": 118    // Facet Zen/2 green
};

// Отключаем автозагрузку с /cubiks/ - используем этот маппинг
window.CUBIK_ORDER = window.CUBIK_ORDER || {};
window.CUBIK_ORDER.shopMapUrl = '';
window.CUBIK_ORDER.cubiksUrl = '';

console.log('[CubikShopMap] Loaded', Object.keys(window.CUBIK_SHOP_MAP).length, 'product mappings');

// Хелпер для проверки в консоли: showUsedCombinations()
window.showUsedCombinations = function() {
  if (!window.CubikBackendAPI || !window.CubikBackendAPI.buildFacetMap) {
    console.error('CubikBackendAPI not available');
    return;
  }
  
  var map = window.CubikBackendAPI.buildFacetMap();
  var missing = [];
  
  console.log('=== Используемые комбинации Type|Color ===');
  
  for (var type in map) {
    for (var color in map[type]) {
      var count = map[type][color];
      var key = type + '|' + color.toUpperCase();
      var productId = window.CUBIK_SHOP_MAP[key];
      
      if (productId != null) {
        console.log('✅', key, '×', count, '→ id:', productId);
      } else {
        console.log('❌', key, '×', count, '→ НЕТ ID!');
        missing.push(key);
      }
    }
  }
  
  if (missing.length) {
    console.warn('Отсутствуют ID для:', missing);
  } else {
    console.log('✅ Все комбинации имеют ID!');
  }
  
  return { map: map, missing: missing };
};
