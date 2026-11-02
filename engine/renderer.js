// engine/renderer.js

class GameRenderer {
  constructor(canvas, world, uiState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false }); // Отключение alpha для оптимизации FPS
    this.world = world;
    this.uiState = uiState;
    this.tileSize = 64; // Базовый размер тайла
    
    // Цветовая палитра биомов
    this.turfColors = {
      0: '#1a3b5c', // Океан
      1: '#4a5d23', // Луг (Meadow) - приглушенный зеленый
      2: '#2b3b19', // Лес (Forest) - темный
      3: '#5a554c', // Пустошь (Rocky)
      4: '#8b733d', // Саванна (Savanna)
      5: '#3e2c3a'  // Болото (Marsh)
    };
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.width = width;
    this.height = height;
  }

  // Вспомогательный метод для фирменной черной обводки в стиле наброска
  applySketchStyle(ctx) {
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 3.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  }

  render(player, entities, now) {
    // 1. Расчет камеры (Viewport)
    const camX = player.x - this.width / 2;
    const camY = player.y - this.height / 2;

    // 2. Отрисовка тайлов земли (только видимых)
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const startCol = Math.max(0, Math.floor(camX / this.tileSize));
    const endCol = Math.min(this.world.size, Math.ceil((camX + this.width) / this.tileSize));
    const startRow = Math.max(0, Math.floor(camY / this.tileSize));
    const endRow = Math.min(this.world.size, Math.ceil((camY + this.height) / this.tileSize));

    for (let y = startRow; y < endRow; y++) {
      for (let x = startCol; x < endCol; x++) {
        const turf = this.world.tiles[y * this.world.size + x];
        this.ctx.fillStyle = this.turfColors[turf] || '#000';
        
        this.ctx.fillRect(
          Math.floor(x * this.tileSize - camX), 
          Math.floor(y * this.tileSize - camY), 
          this.tileSize + 1, 
          this.tileSize + 1
        );
      }
    }

    // 3. Сбор и сортировка всех сущностей по глубине (Y-Sorting)
    const renderList = [];
    
    entities.forEach(ent => {
      if (ent.x > camX - 150 && ent.x < camX + this.width + 150 &&
          ent.y > camY - 150 && ent.y < camY + this.height + 150) {
        renderList.push(ent);
      }
    });
    
    renderList.push({ ...player, isPlayer: true });
    
    // Сортируем: объекты с меньшим Y рисуются первыми (сзади)
    renderList.sort((a, b) => a.y - b.y);

    // 4. Отрисовка сущностей
    renderList.forEach(ent => {
      const screenX = ent.x - camX;
      const screenY = ent.y - camY;
      
      this.ctx.save();
      this.applySketchStyle(this.ctx);
      
      // Тень под объектом
      this.ctx.fillStyle = 'rgba(0,0,0,0.35)';
      this.ctx.beginPath();
      this.ctx.ellipse(screenX, screenY + 5, 20, 8, 0, 0, Math.PI * 2);
      this.ctx.fill();

      if (ent.isPlayer) {
        this.drawPlayer(screenX, screenY, ent, now);
      } else if (ent.type.includes('spider')) {
        this.drawSpider(screenX, screenY, now);
      } else if (ent.type.includes('pig')) {
        this.drawPig(screenX, screenY, now);
      } else if (ent.type.includes('fire')) {
        this.drawFirepit(screenX, screenY, now);
      } else if (ent.type.includes('tree')) {
        this.drawTree(screenX, screenY, now);
      } else {
        // Базовый ресурс / предмет / камень
        this.ctx.fillStyle = '#64748b';
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - 10, 12, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
      }
      
      this.ctx.restore();
    });

    // 5. Освещение и темнота (Ночь / Вечер / Чарли)
    if (this.uiState.phase === 'Night' || this.uiState.phase === 'Dusk') {
      this.renderLighting(player, entities, camX, camY, now);
    }
  }

  // Отрисовка главного героя (Стиль Уилсона)
  drawPlayer(x, y, player, now) {
    const bounce = player.isMoving ? Math.abs(Math.sin(now * 0.015)) * 4 : 0;
    
    // Тело (красная жилетка)
    this.ctx.fillStyle = '#992222';
    this.ctx.fillRect(x - 12, y - 30 - bounce, 24, 25);
    this.ctx.strokeRect(x - 12, y - 30 - bounce, 24, 25);
    
    // Голова
    this.ctx.fillStyle = '#fef3c7';
    this.ctx.beginPath();
    this.ctx.arc(x, y - 45 - bounce, 16, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Глаза
    this.ctx.fillStyle = '#111';
    this.ctx.beginPath();
    this.ctx.ellipse(x - 5, y - 47 - bounce, 3, 5, 0, 0, Math.PI * 2);
    this.ctx.ellipse(x + 5, y - 47 - bounce, 3, 5, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Волосы (три острых рога)
    this.ctx.fillStyle = '#111';
    this.ctx.beginPath();
    this.ctx.moveTo(x - 16, y - 55 - bounce);
    this.ctx.lineTo(x - 22, y - 75 - bounce);
    this.ctx.lineTo(x - 8, y - 60 - bounce);
    this.ctx.lineTo(x, y - 80 - bounce);
    this.ctx.lineTo(x + 8, y - 60 - bounce);
    this.ctx.lineTo(x + 22, y - 75 - bounce);
    this.ctx.lineTo(x + 16, y - 55 - bounce);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
  }

  // Отрисовка паука
  drawSpider(x, y, now) {
    const bounce = Math.abs(Math.sin(now * 0.01)) * 3;
    this.ctx.fillStyle = '#1c1917';
    
    this.ctx.beginPath();
    this.ctx.moveTo(x - 25, y - 5);
    this.ctx.lineTo(x, y - 15 - bounce);
    this.ctx.lineTo(x + 25, y - 5);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(x, y - 15 - bounce, 14, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#fef08a';
    this.ctx.beginPath();
    this.ctx.arc(x - 5, y - 18 - bounce, 3, 0, Math.PI * 2);
    this.ctx.arc(x + 5, y - 18 - bounce, 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  // Отрисовка свиньи
  drawPig(x, y, now) {
    const bounce = Math.abs(Math.sin(now * 0.012)) * 3;
    this.ctx.fillStyle = '#f472b6';
    this.ctx.beginPath();
    this.ctx.arc(x, y - 22 - bounce, 16, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#fbcfe8';
    this.ctx.beginPath();
    this.ctx.ellipse(x, y - 20 - bounce, 7, 5, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
  }

  // Отрисовка костра / кострища
  drawFirepit(x, y, now) {
    this.ctx.fillStyle = '#78716c';
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, 22, 10, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    const flicker = Math.sin(now * 0.02) * 4;
    this.ctx.fillStyle = '#f97316';
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - 25 - flicker);
    this.ctx.quadraticCurveTo(x - 15, y - 10, x, y + 2);
    this.ctx.quadraticCurveTo(x + 15, y - 10, x, y - 25 - flicker);
    this.ctx.fill();
  }

  // Отрисовка дерева (Ель)
  drawTree(x, y, now) {
    const sway = Math.sin(now * 0.001 + x) * 2;
    this.ctx.fillStyle = '#451a03';
    this.ctx.fillRect(x - 6, y - 20, 12, 20);
    this.ctx.strokeRect(x - 6, y - 20, 12, 20);

    this.ctx.fillStyle = '#14532d';
    for (let i = 0; i < 3; i++) {
      const tierY = y - 20 - i * 25;
      const w = 35 - i * 8;
      this.ctx.beginPath();
      this.ctx.moveTo(x + sway * (i+1), tierY - 40);
      this.ctx.lineTo(x - w, tierY);
      this.ctx.lineTo(x + w, tierY);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    }
  }

  // Система динамического освещения
  renderLighting(player, entities, camX, camY, now) {
    const alpha = this.uiState.phase === 'Night' ? 0.94 : 0.5;
    
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = `rgba(5, 5, 10, ${alpha})`;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.globalCompositeOperation = 'destination-out';
    
    const lights = [];
    
    if (player.equip?.hand?.id === 'torch') {
      lights.push({ x: player.x - camX, y: player.y - camY - 20, r: 160 + Math.sin(now*0.02)*5 });
    }

    entities.forEach(ent => {
      if (ent.type.includes('fire') && (ent.fuel === undefined || ent.fuel > 0)) {
        lights.push({ x: ent.x - camX, y: ent.y - camY, r: 220 + Math.sin(now*0.015+ent.x)*8 });
      }
    });

    lights.forEach(light => {
      const grad = this.ctx.createRadialGradient(light.x, light.y, light.r * 0.2, light.x, light.y, light.r);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(light.x, light.y, light.r, 0, Math.PI * 2);
      this.ctx.fill();
    });

    this.ctx.restore();
  }
}

window.GameRenderer = GameRenderer;
