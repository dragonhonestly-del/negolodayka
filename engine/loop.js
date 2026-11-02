// engine/loop.js

class GameLoop {
  constructor(world, player, updateUI) {
    this.world = world;
    this.player = player;
    this.updateUI = updateUI; // Callback для передачи данных в React HUD
    
    this.lastTime = performance.now();
    this.animationFrameId = null;
    this.isRunning = false;
    this.timeSpeed = 1; // Множитель для тестов

    // Игровое время и сезоны
    this.time = {
      totalSeconds: 0,
      day: 1,
      segment: 0,         // 0..15 (16 сегментов в дне)
      segmentProgress: 0,
      phase: 'Day',       // Day (0-8), Dusk (9-12), Night (13-15)
      season: 'Autumn',   // Autumn, Winter, Spring, Summer
      charlieTimer: 0,    // Таймер нахождения в темноте
      shadowTimer: 0      // Таймер низкого рассудка (для спавна теней)
    };

    // Настройки длительности (1 сегмент = 10 реальных секунд)
    this.SEGMENT_DURATION = 10; 
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.tick = this.tick.bind(this);
      this.animationFrameId = requestAnimationFrame(this.tick);
    }
  }

  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  // Главный цикл (вызывается ~60 раз в секунду)
  tick(now) {
    if (!this.isRunning) return;

    let rawDt = (now - this.lastTime) / 1000;
    if (rawDt > 0.1) rawDt = 0.1; // Ограничиваем dt при лагах/сворачивании
    
    this.lastTime = now;
    const dt = rawDt * this.timeSpeed;

    this.updateTimeAndSeasons(dt);
    this.updatePlayerMovement(rawDt); // Движение не зависит от timeSpeed
    this.updateVitalsAndEnvironment(dt);
    
    // Обновление ИИ мобов (если менеджер подключен)
    if (this.mobManager) {
      this.mobManager.update(dt, now);
    }

    // Синхронизация с React UI (10 раз в секунду для оптимизации)
    if (now % 100 < 20) {
      this.updateUI({
        time: { ...this.time },
        player: { ...this.player }
      });
    }

    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  // 1. ВРЕМЯ, ФАЗЫ ДНЯ И СЕЗОНЫ
  updateTimeAndSeasons(dt) {
    const t = this.time;
    t.segmentProgress += dt;

    if (t.segmentProgress >= this.SEGMENT_DURATION) {
      t.segmentProgress -= this.SEGMENT_DURATION;
      t.segment++;

      if (t.segment >= 16) {
        t.segment = 0;
        t.day++;
        this.checkSeasonChange();
      }
    }

    if (t.segment <= 8) t.phase = 'Day';
    else if (t.segment <= 12) t.phase = 'Dusk';
    else t.phase = 'Night';
  }

  checkSeasonChange() {
    const cycleDay = ((this.time.day - 1) % 70) + 1;
    if (cycleDay <= 20) this.time.season = 'Autumn';
    else if (cycleDay <= 35) this.time.season = 'Winter';
    else if (cycleDay <= 55) this.time.season = 'Spring';
    else this.time.season = 'Summer';
  }

  // 2. ДВИЖЕНИЕ И КОЛЛИЗИИ (С океаном)
  updatePlayerMovement(dt) {
    const p = this.player;
    if (p.hp <= 0 || (p.vx === 0 && p.vy === 0)) {
      p.isMoving = false;
      return;
    }

    p.isMoving = true;
    
    const mag = Math.hypot(p.vx, p.vy);
    const normX = p.vx / mag;
    const normY = p.vy / mag;

    const nextX = p.x + normX * p.speed * dt;
    const nextY = p.y + normY * p.speed * dt;

    const tileSize = 64;
    const tileCol = Math.floor(nextX / tileSize);
    const tileRow = Math.floor(nextY / tileSize);
    
    if (tileCol >= 0 && tileCol < this.world.size && tileRow >= 0 && tileRow < this.world.size) {
      const turfType = this.world.tiles[tileRow * this.world.size + tileCol];
      
      if (turfType !== window.DST_BIOMES.TURF.OCEAN) {
        p.x = nextX;
        p.y = nextY;
      }
    }

    if (Math.abs(normX) > 0.1) p.facing = normX > 0 ? 1 : -1;
  }

  // 3. ЖИЗНЕННЫЕ ПОКАЗАТЕЛИ, ЧАРЛИ И ТЕМПЕРАТУРА
  updateVitalsAndEnvironment(dt) {
    const p = this.player;
    const t = this.time;
    if (p.hp <= 0) return; 

    // === Проверка освещения ===
    let inLight = t.phase === 'Day';
    let nearFire = false;

    if (p.equip?.hand?.id === 'torch' || p.equip?.hand?.id === 'lighter') {
      inLight = true;
    }

    // Проверка костров поблизости
    for (let ent of this.world.entities) {
      if ((ent.type === 'campfire_item' || ent.type === 'pit_fire_item') && ent.fuel > 0) {
        if (Math.hypot(ent.x - p.x, ent.y - p.y) < 250) {
          inLight = true;
          nearFire = true;
          break;
        }
      }
    }

    p.inLight = inLight;

    // === ГОЛОД ===
    const mightyMult = (p.id === 'wolfgang' && p.hunger > 225) ? 2.0 : 1.0;
    p.hunger = Math.max(0, p.hunger - (0.4 * mightyMult * dt));

    if (p.hunger === 0) {
      p.hp = Math.max(0, p.hp - (1.5 * dt));
    }

    // === РАССУДОК ===
    let sanityDelta = 0;
    if (t.phase === 'Dusk') sanityDelta = -0.15;
    if (t.phase === 'Night') sanityDelta = inLight ? -0.2 : -1.0;
    
    if (p.equip?.head?.sanityBonus) {
      sanityDelta += p.equip.head.sanityBonus * 0.1;
    }

    p.sanity = Math.max(0, Math.min(p.maxSanity, p.sanity + (sanityDelta * dt)));

    // === ТЕМПЕРАТУРА И СЕЗОНЫ ===
    let ambientTemp = 20; 
    if (t.season === 'Winter') ambientTemp = -5;
    if (t.season === 'Summer') ambientTemp = 40;
    if (t.season === 'Spring') ambientTemp = 15;

    if (nearFire) {
      p.temp = Math.min(35, p.temp + 5 * dt); 
      p.wetness = Math.max(0, p.wetness - 3 * dt);
    } else {
      let insulation = p.equip?.head?.insulation || 0;
      if (p.id === 'wilson') insulation += Math.min(15, t.day * 0.5); 

      const tempRate = insulation > 0 ? 0.05 : 0.2;
      
      if (p.temp > ambientTemp) p.temp -= tempRate * dt;
      else if (p.temp < ambientTemp) p.temp += tempRate * dt;
    }

    if (p.temp <= 0) p.hp = Math.max(0, p.hp - (1.2 * dt)); 
    if (p.temp >= 38 && p.id !== 'willow') p.hp = Math.max(0, p.hp - (1.2 * dt)); 

    // Дождь весной
    if (t.season === 'Spring' && !nearFire) {
      p.wetness = Math.min(100, p.wetness + 0.5 * dt);
      if (p.id === 'wx78' && p.wetness > 30) {
        p.hp = Math.max(0, p.hp - (0.8 * dt)); 
      }
    } else {
      p.wetness = Math.max(0, p.wetness - 0.5 * dt);
    }

    // === ЧАРЛИ ===
    if (t.phase === 'Night' && !inLight) {
      t.charlieTimer += dt;
      
      if (t.charlieTimer >= 2.0 && t.charlieTimer - dt < 2.0) {
        if (window.soundManager) window.soundManager.playCharlie();
      }
      
      if (t.charlieTimer >= 4.5) {
        t.charlieTimer = 0; 
        const armorMult = p.equip?.body?.id === 'log_suit' ? 0.2 : 1.0;
        const dmg = Math.round(100 * armorMult);
        p.hp = Math.max(0, p.hp - dmg);
        if (window.soundManager) window.soundManager.playHit();
      }
    } else {
      t.charlieTimer = 0; 
    }
  }

  // 4. СИСТЕМА КРАФТА
  craftItem(recipeId) {
    const recipe = window.DST_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return false;

    if (recipe.station !== 'none') {
      const isNearStation = this.world.entities.some(ent => 
        ent.type === recipe.station && 
        Math.hypot(ent.x - this.player.x, ent.y - this.player.y) < 120 
      );
      
      if (!isNearStation) {
        console.log(`Нужна станция: ${window.DST_ITEMS[recipe.station].name}`);
        return false;
      }
    }

    for (const [ingredient, requiredCount] of Object.entries(recipe.cost)) {
      if ((this.player.inventory[ingredient] || 0) < requiredCount) {
        console.log(`Не хватает: ${window.DST_ITEMS[ingredient].name}`);
        return false;
      }
    }

    for (const [ingredient, requiredCount] of Object.entries(recipe.cost)) {
      this.player.inventory[ingredient] -= requiredCount;
      if (this.player.inventory[ingredient] <= 0) {
        delete this.player.inventory[ingredient];
      }
    }

    const itemData = window.DST_ITEMS[recipe.result];
    
    if (itemData.type === 'equip') {
      this.player.equip[itemData.slot] = { 
        id: recipe.result, 
        durability: itemData.durability 
      };
    } else if (itemData.type === 'structure') {
      this.player.placementMode = recipe.result;
    } else {
      this.player.inventory[recipe.result] = (this.player.inventory[recipe.result] || 0) + 1;
    }

    if (window.soundManager) window.soundManager.playCraft();
    return true;
  }

  // 5. УСТАНОВКА ПОСТРОЕК (Placement Mode)
  placeStructure(screenX, screenY, screenWidth, screenHeight) {
    const p = this.player;
    if (!p.placementMode) return false;

    const camX = p.x - screenWidth / 2;
    const camY = p.y - screenHeight / 2;
    const worldX = camX + screenX;
    const worldY = camY + screenY;

    const dist = Math.hypot(worldX - p.x, worldY - p.y);
    if (dist > 250) {
      console.log("Слишком далеко!"); 
      return false;
    }

    const tileSize = 64;
    const tileCol = Math.floor(worldX / tileSize);
    const tileRow = Math.floor(worldY / tileSize);

    if (tileCol < 0 || tileCol >= this.world.size || tileRow < 0 || tileRow >= this.world.size) return false;
    
    const turf = this.world.tiles[tileRow * this.world.size + tileCol];
    if (turf === window.DST_BIOMES.TURF.OCEAN) {
      console.log("Нельзя строить на воде!");
      return false;
    }

    const structureId = p.placementMode;
    this.world.entities.push({
      id: `${structureId}_${Date.now()}`,
      type: structureId,
      x: worldX,
      y: worldY,
      fuel: structureId.includes('fire') ? 100 : 0 
    });

    p.placementMode = null;
    if (window.soundManager) window.soundManager.playCraft();
    return true;
  }

  // 6. ОБРАБОТКА ДЕЙСТВИЙ (Сбор и Атака)
  performAction(actionType) {
    if (this.player.hp <= 0) return;

    if (actionType === 'gather') {
      this.handleGather();
    } else if (actionType === 'attack') {
      this.handleAttack();
    }
  }

  handleGather() {
    const p = this.player;
    const interactRange = 80; 

    let nearest = null;
    let minDist = interactRange;

    for (let i = 0; i < this.world.entities.length; i++) {
      const ent = this.world.entities[i];
      const dist = Math.hypot(ent.x - p.x, ent.y - p.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = ent;
      }
    }

    if (!nearest) return; 

    const itemData = window.DST_ITEMS[nearest.type];
    const toolInHand = p.equip?.hand ? window.DST_ITEMS[p.equip.hand.id] : null;

    if (itemData && (itemData.type === 'resource' || itemData.type === 'food')) {
      p.inventory[nearest.type] = (p.inventory[nearest.type] || 0) + 1;
      this.world.entities = this.world.entities.filter(e => e.id !== nearest.id);
      if (window.soundManager) window.soundManager.playGather();
      return;
    }

    if (nearest.type === 'evergreen_tree') {
      if (toolInHand && toolInHand.tool === 'chop') {
        nearest.chops = (nearest.chops || 5) - 1; 
        this.useToolDurability(p.equip.hand);
        
        if (nearest.chops <= 0) {
          this.spawnLoot('logs', nearest.x, nearest.y, 2);
          this.spawnLoot('pinecone', nearest.x, nearest.y, 1);
          this.world.entities = this.world.entities.filter(e => e.id !== nearest.id);
        }
      }
    }

    if (nearest.type === 'boulder' || nearest.type === 'gold_vein') {
      if (toolInHand && toolInHand.tool === 'mine') {
        nearest.mines = (nearest.mines || 4) - 1;
        this.useToolDurability(p.equip.hand);
        
        if (nearest.mines <= 0) {
          this.spawnLoot('rocks', nearest.x, nearest.y, 2);
          this.spawnLoot('flint', nearest.x, nearest.y, 1);
          if (nearest.type === 'gold_vein') this.spawnLoot('gold_nugget', nearest.x, nearest.y, 1);
          
          this.world.entities = this.world.entities.filter(e => e.id !== nearest.id);
        }
      }
    }
  }

  handleAttack() {
    const p = this.player;
    const attackRange = 100;

    if (!this.mobManager) return;
    
    let nearestMob = null;
    let minDist = attackRange;

    for (let mob of this.mobManager.mobs) {
      const dist = Math.hypot(mob.x - p.x, mob.y - p.y);
      if (dist < minDist && mob.hp > 0) {
        minDist = dist;
        nearestMob = mob;
      }
    }

    if (!nearestMob) return; 

    let baseDamage = 10; 
    const weapon = p.equip?.hand ? window.DST_ITEMS[p.equip.hand.id] : null;
    
    if (weapon && weapon.damage) {
      baseDamage = weapon.damage;
      this.useToolDurability(p.equip.hand); 
    }

    let mult = 1.0;
    if (p.id === 'wolfgang' && p.hunger > 225) mult = 2.0; 
    if (p.id === 'wendy') mult = 0.75; 

    const finalDamage = Math.round(baseDamage * mult);
    nearestMob.hp -= finalDamage;
    
    nearestMob.state = 'Chase';
    nearestMob.target = p;

    if (window.soundManager) window.soundManager.playHit();
  }

  useToolDurability(equipSlot) {
    if (!equipSlot) return;
    equipSlot.durability -= 1;
    if (equipSlot.durability <= 0) {
      this.player.equip.hand = null; 
    }
  }

  spawnLoot(itemId, x, y, count) {
    for(let i=0; i<count; i++) {
      this.world.entities.push({
        id: `${itemId}_${Date.now()}_${i}`,
        type: itemId,
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40
      });
    }
  }
}

window.GameLoop = GameLoop;
