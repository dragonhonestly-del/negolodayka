// data/items.js

const ITEMS_DB = {
  // ==========================================
  // БАЗОВЫЕ РЕСУРСЫ
  // ==========================================
  cutgrass: { name: 'Срезанная трава', icon: '🌿', type: 'resource', stack: 40, tags: { inedible: 1 } },
  twigs: { name: 'Ветки', icon: '🥢', type: 'resource', stack: 40, tags: { inedible: 1 } },
  logs: { name: 'Бревно', icon: '🪵', type: 'resource', stack: 20, fuel: 45, tags: { inedible: 1 } },
  flint: { name: 'Кремень', icon: '🪨', type: 'resource', stack: 40 },
  rocks: { name: 'Камень', icon: '🧱', type: 'resource', stack: 40 },
  gold_nugget: { name: 'Золотой самородок', icon: '🪙', type: 'resource', stack: 20 },
  silk: { name: 'Паутина', icon: '🕸️', type: 'resource', stack: 40 },
  pig_skin: { name: 'Свиная шкура', icon: '🐽', type: 'resource', stack: 20 },
  hound_tooth: { name: 'Клык гончей', icon: '🦷', type: 'resource', stack: 20 },
  pinecone: { name: 'Шишка', icon: '🌰', type: 'seed', stack: 40 },
  gears: { name: 'Шестеренки', icon: '⚙️', type: 'food', stack: 20, hp: 60, hunger: 75, sanity: 50, wxUpgrade: true },
  abigail_flower: { name: 'Цветок Абигейл', icon: '🌺', type: 'special', stack: 1 },

  // ==========================================
  // ЕДА И ИНГРЕДИЕНТЫ (с тегами для казана)
  // ==========================================
  berries: { name: 'Ягоды', icon: '🍒', type: 'food', stack: 40, hp: 0, hunger: 9.5, sanity: 0, cookTo: 'roasted_berries', tags: { fruit: 0.5 } },
  roasted_berries: { name: 'Жареные ягоды', icon: '🍓', type: 'food', stack: 40, hp: 1, hunger: 12.5, sanity: 0, tags: { fruit: 0.5 } },
  carrot: { name: 'Морковь', icon: '🥕', type: 'food', stack: 40, hp: 1, hunger: 12.5, sanity: 0, cookTo: 'roasted_carrot', tags: { veggie: 1 } },
  roasted_carrot: { name: 'Печеная морковь', icon: '🍠', type: 'food', stack: 40, hp: 3, hunger: 12.5, sanity: 0, tags: { veggie: 1 } },
  petals: { name: 'Лепестки', icon: '🌸', type: 'food', stack: 40, hp: 1, hunger: 0, sanity: 0, tags: { veggie: 0.5 } },
  meat: { name: 'Мясо', icon: '🥩', type: 'food', stack: 20, hp: 1, hunger: 25, sanity: -10, cookTo: 'cooked_meat', tags: { meat: 1 } },
  cooked_meat: { name: 'Жареное мясо', icon: '🍖', type: 'food', stack: 20, hp: 3, hunger: 25, sanity: 0, tags: { meat: 1 } },
  monster_meat: { name: 'Мясо монстра', icon: '🟣', type: 'food', stack: 20, hp: -20, hunger: 18, sanity: -15, cookTo: 'cooked_monster_meat', tags: { meat: 1, monster: 1 } },
  cooked_monster_meat: { name: 'Жар. мясо монстра', icon: '🟪', type: 'food', stack: 20, hp: -3, hunger: 18, sanity: -10, tags: { meat: 1, monster: 1 } },
  egg: { name: 'Яйцо', icon: '🥚', type: 'food', stack: 40, hp: 0, hunger: 9.5, sanity: 0, tags: { egg: 1 } },
  spider_gland: { name: 'Паучья железа', icon: '🫀', type: 'food', stack: 20, hp: 8, hunger: 0, sanity: 0 },
  deerclops_eyeball: { name: 'Глаз Циклопа', icon: '👁️', type: 'food', stack: 1, hp: 60, hunger: 75, sanity: -15 },

  // ==========================================
  // БЛЮДА ИЗ КАЗАНА (CROCK POT)
  // ==========================================
  meatballs: { name: 'Тефтели', icon: '🧆', type: 'food', stack: 20, hp: 3, hunger: 62.5, sanity: 5 },
  pierogi: { name: 'Вареники', icon: '🥟', type: 'food', stack: 20, hp: 40, hunger: 37.5, sanity: 5 },
  ratatouille: { name: 'Рататуй', icon: '🥗', type: 'food', stack: 20, hp: 3, hunger: 25, sanity: 5 },
  monster_lasagna: { name: 'Монстр-лазанья', icon: '🥘', type: 'food', stack: 20, hp: -20, hunger: 37.5, sanity: -20 },
  wet_goop: { name: 'Мокрое месиво', icon: '💩', type: 'food', stack: 20, hp: 0, hunger: 0, sanity: 0 },

  // ==========================================
  // ИНСТРУМЕНТЫ И ОРУЖИЕ (Слот: Рука)
  // ==========================================
  axe: { name: 'Топор', icon: '🪓', type: 'equip', slot: 'hand', damage: 27, tool: 'chop', durability: 100 },
  pickaxe: { name: 'Кирка', icon: '⛏️', type: 'equip', slot: 'hand', damage: 27, tool: 'mine', durability: 100 },
  shovel: { name: 'Лопата', icon: '🥄', type: 'equip', slot: 'hand', damage: 17, tool: 'dig', durability: 100 },
  torch: { name: 'Факел', icon: '🔥', type: 'equip', slot: 'hand', damage: 17, lightRadius: 155, durability: 100 },
  lighter: { name: 'Зажигалка', icon: '🕯️', type: 'equip', slot: 'hand', damage: 17, lightRadius: 145, durability: 999 },
  spear: { name: 'Копье', icon: '🔱', type: 'equip', slot: 'hand', damage: 34, durability: 150 },

  // ==========================================
  // БРОНЯ И ОДЕЖДА (Слоты: Тело / Голова)
  // ==========================================
  log_suit: { name: 'Деревянная броня', icon: '🛡️', type: 'equip', slot: 'body', armor: 0.8, durability: 450 },
  backpack: { name: 'Рюкзак (+4 слота)', icon: '🎒', type: 'equip', slot: 'body', armor: 0, bonusSlots: 4 },
  garland: { name: 'Венок', icon: '💐', type: 'equip', slot: 'head', sanityBonus: 1.5, insulation: 0 },
  winter_hat: { name: 'Зимняя шапка', icon: '🧶', type: 'equip', slot: 'head', sanityBonus: 1.3, insulation: 120 },

  // ==========================================
  // ПОСТРОЙКИ (Размещаются на карте)
  // ==========================================
  campfire_item: { name: 'Костер', icon: '🏕️', type: 'structure', structureType: 'campfire' },
  pit_fire_item: { name: 'Кострище', icon: '🌋', type: 'structure', structureType: 'pit_fire' },
  science_machine_item: { name: 'Научная машина', icon: '⚗️', type: 'structure', structureType: 'science_machine' },
  alchemy_engine_item: { name: 'Алхим. двигатель', icon: '🔬', type: 'structure', structureType: 'alchemy_engine' },
  crockpot_item: { name: 'Казан', icon: '🍲', type: 'structure', structureType: 'crockpot' }
};

window.DST_ITEMS = ITEMS_DB;
