// data/recipes.js

// 1. РЕЦЕПТЫ КРАФТА (Создание предметов и построек)
const CRAFTING_RECIPES = [
  // ==========================================
  // 🪓 ИНСТРУМЕНТЫ (Tools)
  // ==========================================
  { id: 'axe', category: 'tools', result: 'axe', cost: { twigs: 1, flint: 1 }, station: 'none', desc: 'Рубит деревья. Служит простым оружием.' },
  { id: 'pickaxe', category: 'tools', result: 'pickaxe', cost: { twigs: 2, flint: 2 }, station: 'none', desc: 'Раскалывает валуны для добычи камня и золота.' },
  { id: 'shovel', category: 'tools', result: 'shovel', cost: { twigs: 2, flint: 2 }, station: 'science_machine', desc: 'Выкапывает кусты, корни и пни.' },

  // ==========================================
  // 🔥 СВЕТ И КОСТРЫ (Light)
  // ==========================================
  { id: 'torch', category: 'light', result: 'torch', cost: { cutgrass: 2, twigs: 2 }, station: 'none', desc: 'Портативный источник света. Защищает от Чарли!' },
  { id: 'campfire_item', category: 'light', result: 'campfire_item', cost: { logs: 2, cutgrass: 3 }, station: 'none', desc: 'Временный костер. Согревает, освещает и жарит еду.' },
  { id: 'pit_fire_item', category: 'light', result: 'pit_fire_item', cost: { rocks: 8, logs: 2 }, station: 'science_machine', desc: 'Каменное кострище. Не исчезает, можно подкидывать дрова.' },

  // ==========================================
  // ⚗️ НАУКА (Science)
  // ==========================================
  { id: 'science_machine_item', category: 'science', result: 'science_machine_item', cost: { gold_nugget: 1, logs: 4, rocks: 4 }, station: 'none', desc: 'Открывает рецепты 1-го уровня. Прототип дает +15 Рассудка!' },
  { id: 'alchemy_engine_item', category: 'science', result: 'alchemy_engine_item', cost: { logs: 6, rocks: 4, gold_nugget: 2 }, station: 'science_machine', desc: 'Продвинутая станция науки 2-го уровня.' },

  // ==========================================
  // 🍲 ВЫЖИВАНИЕ (Survival)
  // ==========================================
  { id: 'crockpot_item', category: 'survival', result: 'crockpot_item', cost: { rocks: 3, logs: 3, twigs: 4 }, station: 'science_machine', desc: 'Казан для варки сытных блюд из 4 ингредиентов.' },
  { id: 'backpack', category: 'survival', result: 'backpack', cost: { cutgrass: 4, twigs: 4 }, station: 'science_machine', desc: 'Увеличивает вместимость инвентаря на 4 слота.' },
  { id: 'garland', category: 'survival', result: 'garland', cost: { petals: 12 }, station: 'none', desc: 'Медленно восстанавливает рассудок днем.' },
  { id: 'winter_hat', category: 'survival', result: 'winter_hat', cost: { silk: 4, pig_skin: 1 }, station: 'science_machine', desc: 'Согревает суровой зимой и бережет рассудок.' },

  // ==========================================
  // 🔱 БОЙ (Combat)
  // ==========================================
  { id: 'spear', category: 'combat', result: 'spear', cost: { twigs: 2, cutgrass: 2, flint: 1 }, station: 'science_machine', desc: 'Острое копье (34 урона).' },
  { id: 'log_suit', category: 'combat', result: 'log_suit', cost: { logs: 6, cutgrass: 2 }, station: 'science_machine', desc: 'Поглощает 80% физического урона.' }
];

// 2. АЛГОРИТМ КАЗАНА (CROCK POT)
// Принимает массив из 4 ID предметов, возвращает ID готового блюда
const evaluateCrockPotRecipe = (ingredientIds) => {
  const tags = { meat: 0, veggie: 0, fruit: 0, monster: 0, egg: 0, inedible: 0 };

  // Собираем сумму всех тегов из 4 ингредиентов
  ingredientIds.forEach(id => {
    const item = window.DST_ITEMS[id];
    if (item && item.tags) {
      Object.entries(item.tags).forEach(([k, v]) => {
        tags[k] = (tags[k] || 0) + v;
      });
    } else {
      tags.inedible += 1;
    }
  });

  // Правило 1: Несъедобные ресурсы (ветки/бревна) портят еду, если их нельзя использовать как наполнитель
  if (tags.inedible > 0) {
    return 'wet_goop'; // Мокрое месиво
  }

  // Правило 2: Монстр-лазанья (Если >= 2 мяса монстра, всё превращается в отраву)
  if (tags.monster >= 2) {
    return 'monster_lasagna';
  }

  // Правило 3: Вареники (Pierogi): Мясо >= 0.5, Яйцо >= 1, Овощи >= 0.5
  if (tags.meat >= 0.5 && tags.egg >= 1 && tags.veggie >= 0.5) {
    return 'pierogi';
  }

  // Правило 4: Тефтели (Meatballs): Мясо >= 0.5 (любое мясо + наполнители)
  if (tags.meat >= 0.5) {
    return 'meatballs';
  }

  // Правило 5: Рататуй (Овощи/Фрукты, нет мяса)
  if (tags.veggie >= 0.5 || tags.fruit >= 1.5) {
    return 'ratatouille';
  }

  // Дефолт, если рецепт не подошел ни под одно условие
  return 'wet_goop';
};

// Экспорт в глобальную область видимости
window.DST_RECIPES = CRAFTING_RECIPES;
window.evaluateCrockPotRecipe = evaluateCrockPotRecipe;
