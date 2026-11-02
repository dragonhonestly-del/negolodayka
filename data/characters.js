// data/characters.js

const CHARACTERS = [
  {
    id: 'wilson',
    name: 'Уилсон',
    title: 'Ученый-джентльмен',
    hp: 150,
    hunger: 150,
    sanity: 200,
    perk: 'Отращивает великолепную бороду, которая защищает от зимнего холода.',
    color: '#d97706',      // Цвет иконки/тела
    hairColor: '#1f2937',  // Цвет волос для рендера
    startItems: [
      { id: 'flint', count: 2 },
      { id: 'twigs', count: 2 }
    ]
  },
  {
    id: 'willow',
    name: 'Уиллоу',
    title: 'Поджигательница',
    hp: 150,
    hunger: 150,
    sanity: 120,
    perk: 'Иммунитет к огню. Начинает игру со своей верной Зажигалкой (вечный свет в руке).',
    color: '#dc2626',
    hairColor: '#111827',
    startItems: [
      { id: 'lighter', count: 1 }, // Уникальный предмет
      { id: 'logs', count: 2 }
    ]
  },
  {
    id: 'wolfgang',
    name: 'Вольфганг',
    title: 'Силач',
    hp: 200,
    hunger: 300,       // Увеличенный максимальный голод для Могучей формы
    sanity: 200,
    perk: 'При сытости > 225 входит в Могучую форму (Урон x2, Макс HP 300). Быстрее теряет рассудок в темноте.',
    color: '#2563eb',
    hairColor: '#78350f',
    startItems: [
      { id: 'meat', count: 2 },
      { id: 'berries', count: 4 }
    ]
  },
  {
    id: 'wendy',
    name: 'Венди',
    title: 'Скорбящая сестра',
    hp: 150,
    hunger: 150,
    sanity: 200,
    perk: 'Призывает призрак сестры Абигейл (бьет врагов вокруг). Урон самой Венди в ближнем бою снижен на 25%.',
    color: '#9333ea',
    hairColor: '#fde047',
    startItems: [
      { id: 'abigail_flower', count: 1 }, // Уникальный предмет для призыва
      { id: 'petals', count: 6 }
    ]
  },
  {
    id: 'wx78',
    name: 'WX-78',
    title: 'Бездушный автоматон',
    hp: 150,           // Базовые статы, которые будут расти от шестеренок
    hunger: 150,
    sanity: 150,
    perk: 'Ест шестеренки для прокачки максимальных характеристик. Страдает от сырости весной (получает урон от дождя).',
    color: '#65a30d',
    hairColor: '#71717a',
    startItems: [
      { id: 'gears', count: 2 }, // Предмет для прокачки
      { id: 'flint', count: 2 }
    ]
  }
];

// Экспорт в глобальную область видимости
window.DST_CHARACTERS = CHARACTERS;
