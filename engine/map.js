// engine/map.js

class WorldGenerator {
  constructor(seedString = 'NEUMANNE') {
    this.size = 650;
    this.tiles = new Uint8Array(this.size * this.size);
    this.entities = [];
    this.nodes = []; // Центры комнат (ячейки Вороного)
    this.seed = seedString;
    
    // Инициализация PRNG (Генератор псевдослучайных чисел)
    const seedHash = this.cyrb128(seedString);
    this.random = this.mulberry32(seedHash[0]);
  }

  // Хэширование строки в числовой сид
  cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
      k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
  }

  // Быстрый детерминированный генератор случайных чисел (0.0 - 1.0)
  mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  }

  // Получить случайное число в диапазоне [min, max]
  range(min, max) {
    return min + this.random() * (max - min);
  }

  // 1. Расстановка узлов (комнат) по блюпринту из data/biomes.js
  generateNodes() {
    const blueprint = window.DST_BIOMES.ISLAND_BLUEPRINT;
    const center = this.size / 2;
    const maxRadius = this.size * 0.4; // Остров занимает 80% карты, края - океан

    blueprint.forEach(zone => {
      for (let i = 0; i < zone.count; i++) {
        // Стартовая зона всегда строго в центре карты
        if (zone.type === 'STARTING_AREA') {
          this.nodes.push({
            x: Math.floor(center),
            y: Math.floor(center),
            type: zone.type,
            config: window.DST_BIOMES.ROOMS_CONFIG[zone.type]
          });
          continue;
        }

        // Остальные зоны распределяем по кругу
        const angle = this.random() * Math.PI * 2;
        const dist = Math.sqrt(this.random()) * maxRadius; 
        
        this.nodes.push({
          x: Math.floor(center + Math.cos(angle) * dist),
          y: Math.floor(center + Math.sin(angle) * dist),
          type: zone.type,
          config: window.DST_BIOMES.ROOMS_CONFIG[zone.type]
        });
      }
    });
  }

  // 2. Построение острова через диаграмму Вороного
  buildVoronoiIsland() {
    const center = this.size / 2;
    const islandRadiusSq = Math.pow(this.size * 0.42, 2);

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const index = y * this.size + x;
        const distToCenterSq = Math.pow(x - center, 2) + Math.pow(y - center, 2);

        // Обрезаем края карты под океан
        const noiseEdge = islandRadiusSq + (this.random() * 4000 - 2000);
        if (distToCenterSq > noiseEdge) {
          this.tiles[index] = window.DST_BIOMES.TURF.OCEAN;
          continue;
        }

        // Ищем ближайший узел для тайла
        let minDist = Infinity;
        let closestNode = null;

        for (let i = 0; i < this.nodes.length; i++) {
          const node = this.nodes[i];
          const dSq = Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2);
          if (dSq < minDist) {
            minDist = dSq;
            closestNode = node;
          }
        }

        if (closestNode) {
          this.tiles[index] = closestNode.config.turf;
        } else {
          this.tiles[index] = window.DST_BIOMES.TURF.OCEAN;
        }
      }
    }
  }

  // 3. Заполнение комнат объектами и мобами (с умножением на размер тайла 64px)
  populateEntities() {
    let entityId = 1;
    const tileSize = 64;

    this.nodes.forEach(node => {
      // Спавн гарантированных объектов (портал)
      if (node.config.guaranteed) {
        node.config.guaranteed.forEach(item => {
          for (let i = 0; i < item.count; i++) {
            this.entities.push({
              id: `${item.id}_${entityId++}`,
              type: item.id,
              x: (node.x + this.range(-3, 3)) * tileSize,
              y: (node.y + this.range(-3, 3)) * tileSize
            });
          }
        });
      }

      // Случайный лут, деревья и ресурсы
      const roomSize = 80; 
      for (let i = 0; i < roomSize; i++) {
        const rx = Math.floor(node.x + this.range(-25, 25));
        const ry = Math.floor(node.y + this.range(-25, 25));
        
        if (rx < 0 || rx >= this.size || ry < 0 || ry >= this.size) continue;
        if (this.tiles[ry * this.size + rx] === window.DST_BIOMES.TURF.OCEAN) continue;

        const randVal = this.random();
        let cumulative = 0;

        for (let j = 0; j < node.config.loot.length; j++) {
          const lootItem = node.config.loot[j];
          cumulative += lootItem.chance;
          if (randVal < cumulative) {
            this.entities.push({
              id: `${lootItem.id}_${entityId++}`,
              type: lootItem.id,
              x: (rx + this.random()) * tileSize,
              y: (ry + this.random()) * tileSize
            });
            break; 
          }
        }
      }

      // Спавн домов мобов
      if (node.config.mobs) {
        node.config.mobs.forEach(mobSpawn => {
          if (this.random() < mobSpawn.chance * 10) {
            this.entities.push({
              id: `${mobSpawn.id}_${entityId++}`,
              type: mobSpawn.id,
              x: (node.x + this.range(-12, 12)) * tileSize,
              y: (node.y + this.range(-12, 12)) * tileSize
            });
          }
        });
      }
    });
  }

  // Главный метод запуска
  generate() {
    this.generateNodes();
    this.buildVoronoiIsland();
    this.populateEntities();
    
    return {
      size: this.size,
      tiles: this.tiles,
      entities: this.entities,
      seed: this.seed
    };
  }
}

// Экспорт в window
window.WorldGenerator = WorldGenerator;
