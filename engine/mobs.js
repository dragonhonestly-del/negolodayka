// engine/mobs.js

class MobManager {
  constructor(world, player, timeState) {
    this.world = world;
    this.player = player;
    this.time = timeState;
    this.mobs = [];
    
    this.lastHoundDay = 0;
    this.deerclopsSpawned = false;

    // Инициализация стартовых мобов вокруг их домов
    this.spawnInitialMobs();
  }

  // Находим на карте дома (свинарники, коконы) и спавним рядом мобов
  spawnInitialMobs() {
    this.world.entities.forEach(ent => {
      if (ent.type === 'spider_den') {
        this.addMob('spider', ent.x, ent.y);
      } else if (ent.type === 'pigman_house') {
        this.addMob('pigman', ent.x, ent.y);
      }
    });
  }

  addMob(type, x, y) {
    const config = this.getMobConfig(type);
    this.mobs.push({
      id: `${type}_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      type: type,
      x: x,
      y: y,
      spawnX: x,
      spawnY: y,
      state: 'Idle',       // Idle, Wander, Chase, Attack, Retreat, Sleep
      target: null,
      allyTimer: 0,        // Для прирученных свиней
      lastAttack: 0,
      ...config
    });
  }

  getMobConfig(type) {
    const configs = {
      spider: { name: 'Паук', hp: 100, maxHp: 100, damage: 20, speed: 95, aggro: 150, attackRange: 45, cooldown: 3000 },
      pigman: { name: 'Свинья', hp: 250, maxHp: 250, damage: 33, speed: 85, aggro: 0, attackRange: 50, cooldown: 2000 },
      hound: { name: 'Гончая', hp: 150, maxHp: 150, damage: 20, speed: 125, aggro: 600, attackRange: 55, cooldown: 2000 },
      shadow: { name: 'Тень', hp: 110, maxHp: 110, damage: 20, speed: 90, aggro: 500, attackRange: 50, cooldown: 2500 },
      deerclops: { name: 'Циклоп-Олень', hp: 4000, maxHp: 4000, damage: 75, speed: 65, aggro: 800, attackRange: 80, cooldown: 4000 }
    };
    return configs[type];
  }

  // Вызывается из engine/loop.js каждый кадр
  update(dt, now) {
    this.checkSpawns();

    // Обработка FSM для каждого моба
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];
      if (mob.hp <= 0) {
        this.handleMobDeath(mob);
        this.mobs.splice(i, 1);
        continue;
      }
      this.updateMobFSM(mob, dt, now);
    }
  }

  // Спавн волн (Гончие и Боссы)
  checkSpawns() {
    // 1. Тени (если рассудок < 15%)
    const sanityPct = this.player.sanity / this.player.maxSanity;
    const shadowCount = this.mobs.filter(m => m.type === 'shadow').length;
    
    if (sanityPct < 0.15 && shadowCount < 2 && Math.random() < 0.005) {
      const angle = Math.random() * Math.PI * 2;
      this.addMob('shadow', this.player.x + Math.cos(angle)*250, this.player.y + Math.sin(angle)*250);
    } 
    // Если рассудок восстановился — тени исчезают
    else if (sanityPct > 0.2) {
      this.mobs = this.mobs.filter(m => m.type !== 'shadow');
    }

    // 2. Волны гончих (каждые 5 дней)
    if (this.time.day > 2 && this.time.day % 5 === 0 && this.lastHoundDay !== this.time.day) {
      this.lastHoundDay = this.time.day;
      const count = Math.min(4, 1 + Math.floor(this.time.day / 10)); // Чем дольше живем, тем больше собак
      for (let i=0; i<count; i++) {
        const angle = Math.random() * Math.PI * 2;
        this.addMob('hound', this.player.x + Math.cos(angle)*400, this.player.y + Math.sin(angle)*400);
      }
    }

    // 3. Циклоп-Олень Зимой (30-й день)
    if (this.time.day === 30 && !this.deerclopsSpawned) {
      this.deerclopsSpawned = true;
      this.addMob('deerclops', this.player.x + 300, this.player.y - 300);
    }
  }

  // Логика Конечного Автомата (FSM)
  updateMobFSM(mob, dt, now) {
    const distToPlayer = Math.hypot(this.player.x - mob.x, this.player.y - mob.y);

    // --- УНИКАЛЬНОЕ ПОВЕДЕНИЕ ПО ТИПАМ --- //

    // Свинья-друг (Ally)
    if (mob.type === 'pigman' && mob.allyTimer > 0) {
      mob.allyTimer -= dt;
      // Ищет врагов вокруг игрока
      const enemy = this.mobs.find(e => e.type !== 'pigman' && Math.hypot(e.x - mob.x, e.y - mob.y) < 180);
      if (enemy) {
        mob.state = 'Chase';
        mob.target = enemy;
      } else {
        // Если врагов нет, бежит за игроком
        if (distToPlayer > 80) this.moveTowards(mob, this.player.x, this.player.y, dt);
      }
    }

    // Дневной/Ночной цикл для Пауков и Свиней
    if (mob.type === 'spider') {
      if (this.time.phase === 'Day') mob.state = 'Retreat'; // Пауки боятся света
      else mob.aggro = (this.time.phase === 'Night') ? 250 : 150; // Ночью злее
    }
    
    if (mob.type === 'pigman' && mob.allyTimer <= 0) {
      if (this.time.phase === 'Night') mob.state = 'Retreat'; // Свиньи паникуют ночью
    }

    // --- БАЗОВЫЕ СОСТОЯНИЯ FSM --- //

    // АГРЕССИЯ: Проверка радиуса
    if (mob.type !== 'pigman' || (mob.type === 'pigman' && mob.allyTimer <= 0 && mob.state === 'Attacked')) {
      if (distToPlayer < mob.aggro && mob.state !== 'Retreat') {
        mob.state = 'Chase';
        mob.target = this.player;
      }
    }

    switch (mob.state) {
      case 'Idle':
        if (Math.random() < 0.01) {
          mob.state = 'Wander';
          // Выбираем случайную точку для прогулки недалеко от спавна
          mob.wanderX = mob.spawnX + (Math.random() - 0.5) * 200;
          mob.wanderY = mob.spawnY + (Math.random() - 0.5) * 200;
        }
        break;

      case 'Wander':
        const dWander = Math.hypot(mob.wanderX - mob.x, mob.wanderY - mob.y);
        if (dWander < 10) mob.state = 'Idle';
        else this.moveTowards(mob, mob.wanderX, mob.wanderY, dt, 0.5); // Гуляют медленнее (0.5 от скорости)
        break;

      case 'Retreat':
        // Возвращаются домой (к точке спавна)
        const dHome = Math.hypot(mob.spawnX - mob.x, mob.spawnY - mob.y);
        if (dHome < 20) mob.state = 'Idle'; // Прибежал домой, уснул
        else this.moveTowards(mob, mob.spawnX, mob.spawnY, dt);
        break;

      case 'Chase':
        if (!mob.target || mob.target.hp <= 0) {
          mob.state = 'Idle';
          break;
        }
        
        const distTarget = Math.hypot(mob.target.x - mob.x, mob.target.y - mob.y);
        
        // Потеря агро (если игрок убежал далеко)
        if (distTarget > mob.aggro * 1.5 && mob.type !== 'hound' && mob.type !== 'deerclops' && mob.target === this.player) {
          mob.state = 'Retreat';
          mob.target = null;
          break;
        }

        // Подошли на радиус атаки
        if (distTarget <= mob.attackRange) {
          mob.state = 'Attack';
        } else {
          this.moveTowards(mob, mob.target.x, mob.target.y, dt);
        }
        break;

      case 'Attack':
        if (!mob.target || mob.target.hp <= 0) {
          mob.state = 'Idle';
          break;
        }
        
        const dAtk = Math.hypot(mob.target.x - mob.x, mob.target.y - mob.y);
        if (dAtk > mob.attackRange + 10) {
          mob.state = 'Chase'; // Цель отбежала, снова догоняем (Kiting)
          break;
        }

        // Удар по кулдауну
        if (now - mob.lastAttack >= mob.cooldown) {
          mob.lastAttack = now;
          this.performAttack(mob, mob.target);
        }
        break;
    }
  }

  // Физика перемещения моба
  moveTowards(mob, targetX, targetY, dt, speedMult = 1.0) {
    const dx = targetX - mob.x;
    const dy = targetY - mob.y;
    const mag = Math.hypot(dx, dy);
    if (mag > 0) {
      // Простейшая проверка коллизий с океаном (как у игрока)
      const nextX = mob.x + (dx / mag) * (mob.speed * speedMult) * dt;
      const nextY = mob.y + (dy / mag) * (mob.speed * speedMult) * dt;
      
      const tileSize = 64;
      const tileCol = Math.floor(nextX / tileSize);
      const tileRow = Math.floor(nextY / tileSize);
      
      if (tileCol >= 0 && tileCol < this.world.size && tileRow >= 0 && tileRow < this.world.size) {
        if (this.world.tiles[tileRow * this.world.size + tileCol] !== window.DST_BIOMES.TURF.OCEAN) {
          mob.x = nextX;
          mob.y = nextY;
        }
      }
    }
  }

  // Расчет урона
  performAttack(mob, target) {
    if (target === this.player) {
      // Броня игрока (log_suit поглощает 80% урона)
      let armorMult = 1.0;
      if (this.player.equip?.body?.id === 'log_suit') {
        armorMult = 0.2;
        // Тратим прочность брони
        this.player.equip.body.durability -= (mob.damage * 0.5);
        if (this.player.equip.body.durability <= 0) {
          this.player.equip.body = null; // Броня сломалась
        }
      }
      
      const finalDamage = Math.max(1, Math.round(mob.damage * armorMult));
      this.player.hp = Math.max(0, this.player.hp - finalDamage);
      
      if (window.soundManager) window.soundManager.playHit();
    } else {
      // Моб бьет другого моба (Свинья vs Паук)
      target.hp -= mob.damage;
      target.state = 'Chase'; // Спровоцирован
      target.target = mob;
    }
  }

  handleMobDeath(mob) {
    // В будущем тут спавн лута через UI / Inventory System
    // Например: Паук -> Мясо монстра, Паутина
    // Свинья -> Мясо, Свиная шкура
    console.log(`${mob.name} погиб!`);
  }
}

window.MobManager = MobManager;
