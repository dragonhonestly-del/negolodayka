// data/biomes.js

// Идентификаторы типов земли (Turf) для массива Uint8Array
const TURF = {
  OCEAN: 0,
  MEADOW: 1,  // Луг (зеленый)
  FOREST: 2,  // Лес (темно-зеленый)
  ROCKY: 3,   // Пустошь (серый)
  SAVANNA: 4, // Саванна (желто-оранжевый)
  MARSH: 5    // Болото (фиолетово-коричневый)
};

// Конфигурация "Комнат" (Rooms), из которых графом собирается остров
const ROOMS_CONFIG = {
  // 1. Стартовая поляна (Безопасная зона, всегда 1 на карте)
  STARTING_AREA: {
    turf: TURF.MEADOW,
    guaranteed: [{ id: 'portal', count: 1 }], // Спавн портала Константы
    loot: [
      { id: 'flint', chance: 0.15 },
      { id: 'cutgrass_node', chance: 0.2 }, // Кусты травы
      { id: 'sapling_node', chance: 0.2 },  // Саженцы
      { id: 'flower', chance: 0.2 }
    ],
    mobs: [] // Безопасно, мобов нет
  },

  // 2. Обычные луга (Основа острова)
  MEADOW_ROOM: {
    turf: TURF.MEADOW,
    guaranteed: [],
    loot: [
      { id: 'cutgrass_node', chance: 0.15 },
      { id: 'sapling_node', chance: 0.1 },
      { id: 'carrot_planted', chance: 0.05 },
      { id: 'berry_bush', chance: 0.08 }
    ],
    mobs: [
      { id: 'pigman_house', chance: 0.02 } // Редкие дома свиней
    ]
  },

  // 3. Густой лес (Много дерева, но опасные пауки)
  EVERGREEN_FOREST: {
    turf: TURF.FOREST,
    guaranteed: [],
    loot: [
      { id: 'evergreen_tree', chance: 0.45 }, // Плотный лес
      { id: 'sapling_node', chance: 0.1 }
    ],
    mobs: [
      { id: 'spider_den', chance: 0.04 } // Коконы пауков
    ]
  },

  // 4. Каменистая пустошь (Золото и валуны)
  ROCKY_WASTELAND: {
    turf: TURF.ROCKY,
    guaranteed: [],
    loot: [
      { id: 'boulder', chance: 0.25 }, // Обычные камни
      { id: 'gold_vein', chance: 0.1 }, // Камни с золотом
      { id: 'flint', chance: 0.15 }
    ],
    mobs: []
  },

  // 5. Саванна (Только трава и кролики/бифало)
  SAVANNA_PLAINS: {
    turf: TURF.SAVANNA,
    guaranteed: [],
    loot: [
      { id: 'cutgrass_node', chance: 0.35 } // Очень много травы
    ],
    mobs: [
      // В будущем тут можно добавить Beefalo
    ]
  }
};

// Сценарий генерации графа (Blueprint).
// Движок прочитает это и создаст узлы в нужной пропорции.
const ISLAND_BLUEPRINT = [
  { type: 'STARTING_AREA', count: 1 },    // Ровно 1 портал
  { type: 'MEADOW_ROOM', count: 12 },     // 12 комнат лугов
  { type: 'EVERGREEN_FOREST', count: 8 }, // 8 лесных зон
  { type: 'ROCKY_WASTELAND', count: 5 },  // 5 зон для фарма камня
  { type: 'SAVANNA_PLAINS', count: 6 }    // 6 зон саванны
];

// Экспорт в window для доступа без сборщика
window.DST_BIOMES = { TURF, ROOMS_CONFIG, ISLAND_BLUEPRINT };
