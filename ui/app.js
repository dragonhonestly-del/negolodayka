// ui/app.js

const { useState, useEffect, useRef } = React;

// --- КОМПОНЕНТ ДЖОЙСТИКА И КНОПОК ---
const TouchControls = ({ player }) => {
  const joystickRef = useRef(null);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });

  const handleTouch = (e) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const touch = e.targetTouches[0];
    
    if (!touch) {
      setStickPos({ x: 0, y: 0 });
      if (player) {
        player.vx = 0;
        player.vy = 0;
      }
      return;
    }

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    
    const distance = Math.min(Math.hypot(dx, dy), 40);
    const angle = Math.atan2(dy, dx);
    
    setStickPos({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance
    });

    if (player) {
      player.vx = Math.cos(angle);
      player.vy = Math.sin(angle);
    }
  };

  const vibrate = (style = 'light') => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
    }
  };

  const handleAction = (actionType) => {
    vibrate('medium');
    if (window.gameLoopInstance) {
      window.gameLoopInstance.performAction(actionType);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex justify-between items-end p-8">
      {/* Джойстик */}
      <div 
        ref={joystickRef}
        className="w-32 h-32 bg-stone-900/50 rounded-full border-2 border-stone-700 relative pointer-events-auto touch-none"
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
        onTouchEnd={handleTouch}
      >
        <div 
          className="w-12 h-12 bg-stone-400 rounded-full absolute top-1/2 left-1/2 shadow-lg"
          style={{ transform: `translate(calc(-50% + ${stickPos.x}px), calc(-50% + ${stickPos.y}px))` }}
        />
      </div>

      {/* Кнопки действий */}
      <div className="flex gap-4 pointer-events-auto">
        <button 
          className="w-16 h-16 bg-stone-800/80 rounded-full border-2 border-amber-900 active:scale-95 text-2xl flex items-center justify-center shadow-lg"
          onTouchStart={() => handleAction('gather')}
        >
          🖐️
        </button>
        <button 
          className="w-20 h-20 bg-stone-800/80 rounded-full border-2 border-red-900 active:scale-95 text-3xl flex items-center justify-center shadow-lg mb-4"
          onTouchStart={() => handleAction('attack')}
        >
          ⚔️
        </button>
      </div>
    </div>
  );
};

// --- ГЛАВНЫЙ КОМПОНЕНТ ПРИЛОЖЕНИЯ ---
const App = () => {
  const [gameState, setGameState] = useState({
    time: { day: 1, phase: 'Day', segment: 0 },
    player: { 
      hp: 150, maxHp: 150, hunger: 150, maxHunger: 150, sanity: 200, maxSanity: 200, 
      id: 'wilson', inventory: {}, equip: {} 
    }
  });

  useEffect(() => {
    const saveManager = new window.SaveManager();
    const canvas = document.getElementById('game-canvas');
    let loop, renderer;

    const startGame = (savedData) => {
      // 1. Генерация или загрузка мира
      const seed = savedData ? savedData.seed : 'NEUMANNE';
      const worldGen = new window.WorldGenerator(seed);
      const world = worldGen.generate();

      if (savedData && savedData.entities) {
        world.entities.push(...savedData.entities);
      }

      // 2. Игрок
      const charConfig = window.DST_CHARACTERS.find(c => c.id === 'wilson');
      let player = {
        ...charConfig,
        x: world.size / 2 * 64, y: world.size / 2 * 64,
        vx: 0, vy: 0, speed: 180, facing: 1, temp: 20, wetness: 0,
        inventory: { 'flint': 2, 'twigs': 2 },
        equip: { hand: null, body: null, head: null },
        placementMode: null
      };

      if (savedData && savedData.player) {
        player = { ...player, ...savedData.player };
      }

      const startTime = savedData ? savedData.time : { 
        day: 1, phase: 'Day', segment: 0, season: 'Autumn', segmentProgress: 0, charlieTimer: 0 
      };

      // 3. Запуск движков
      renderer = new window.GameRenderer(canvas, world, startTime);
      loop = new window.GameLoop(world, player, (newState) => {
        setGameState(prev => ({ ...prev, ...newState }));
        renderer.uiState = newState.time;
        renderer.render(player, world.entities, performance.now());
      });

      loop.time = startTime;
      loop.mobManager = new window.MobManager(world, player, loop.time);
      window.gameLoopInstance = loop;
      
      loop.start();

      // Автосохранение
      window.autoSaveInterval = setInterval(() => {
        saveManager.save(world, player, loop.time);
      }, 15000);
    };

    saveManager.load((data) => {
      startGame(data);
    });

    const resizeCanvas = () => renderer?.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    const handleVisibility = () => {
      if (document.hidden && window.gameLoopInstance) {
        saveManager.save(
          window.gameLoopInstance.world, 
          window.gameLoopInstance.player, 
          window.gameLoopInstance.time
        );
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(window.autoSaveInterval);
      if (window.gameLoopInstance) window.gameLoopInstance.stop();
    };
  }, []);

  const handleCanvasTap = (e) => {
    if (!gameState.player.placementMode) return;
    const touch = e.type.includes('touch') ? e.touches[0] : e;
    if (window.gameLoopInstance) {
      window.gameLoopInstance.placeStructure(
        touch.clientX, 
        touch.clientY, 
        window.innerWidth, 
        window.innerHeight
      );
    }
  };

  const { time, player } = gameState;
  const clockColor = time.phase === 'Day' ? 'bg-amber-400' : time.phase === 'Dusk' ? 'bg-orange-700' : 'bg-blue-950';
  const clockRotation = (time.segment / 16) * 360;

  // Отрисовка инвентаря на 15 слотов
  const inventoryItems = Object.entries(player.inventory || {});
  const slots = [...Array(15)].map((_, i) => {
    if (i < inventoryItems.length) {
      const [id, count] = inventoryItems[i];
      const itemData = window.DST_ITEMS ? window.DST_ITEMS[id] : null;
      return { id, count, icon: itemData ? itemData.icon : '?' };
    }
    return null;
  });

  return (
    <div className="w-full h-full relative font-serif text-amber-50">
      <canvas 
        id="game-canvas" 
        className="absolute top-0 left-0 w-full h-full pointer-events-auto"
        onTouchStart={handleCanvasTap} 
        onClick={handleCanvasTap} 
      />
      
      {/* HUD: ВЕРХНИЙ ПРАВЫЙ УГОЛ */}
      <div className="absolute top-4 right-4 flex gap-6 items-start z-40 pointer-events-none">
        <div className="flex flex-col gap-2">
          {/* Голод */}
          <div className="flex items-center justify-end gap-2">
            <span className="font-bold text-xl drop-shadow-md">{Math.round(player.hunger)}</span>
            <div className="w-10 h-10 rounded-full border-2 border-stone-900 bg-amber-700 flex items-center justify-center overflow-hidden relative">
              <div className="absolute bottom-0 w-full bg-amber-500 transition-all duration-300" style={{ height: `${(player.hunger / player.maxHunger) * 100}%` }} />
              <span className="relative z-10 text-xl">🥩</span>
            </div>
          </div>
          {/* Рассудок */}
          <div className="flex items-center justify-end gap-2">
            <span className="font-bold text-xl drop-shadow-md">{Math.round(player.sanity)}</span>
            <div className="w-10 h-10 rounded-full border-2 border-stone-900 bg-red-900 flex items-center justify-center overflow-hidden relative">
              <div className="absolute bottom-0 w-full bg-red-500 transition-all duration-300" style={{ height: `${(player.sanity / player.maxSanity) * 100}%` }} />
              <span className="relative z-10 text-xl">🧠</span>
            </div>
          </div>
          {/* ХП */}
          <div className="flex items-center justify-end gap-2">
            <span className="font-bold text-xl drop-shadow-md">{Math.round(player.hp)}</span>
            <div className="w-10 h-10 rounded-full border-2 border-stone-900 bg-rose-950 flex items-center justify-center overflow-hidden relative">
              <div className="absolute bottom-0 w-full bg-rose-600 transition-all duration-300" style={{ height: `${(player.hp / player.maxHp) * 100}%` }} />
              <span className="relative z-10 text-xl">❤️</span>
            </div>
          </div>
        </div>

        {/* Часы */}
        <div className="relative w-24 h-24 rounded-full border-4 border-amber-900 bg-stone-900 flex items-center justify-center shadow-xl transition-colors duration-1000">
          <div className={`absolute inset-1 rounded-full ${clockColor} opacity-50`} />
          <div 
            className="absolute w-1 h-12 bg-amber-100 origin-bottom rounded-full transition-transform duration-1000 ease-linear"
            style={{ transform: `translateY(-50%) rotate(${clockRotation}deg)` }}
          />
          <div className="relative z-10 text-center font-bold">
            <div className="text-xs text-stone-400">DAY</div>
            <div className="text-2xl">{time.day}</div>
          </div>
        </div>
      </div>

      {/* HUD: НИЖНЯЯ ПАНЕЛЬ (Инвентарь) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 z-40 bg-stone-900/80 p-2 rounded-lg border-2 border-stone-700 pointer-events-auto overflow-x-auto max-w-[80vw]">
        {slots.map((slot, i) => (
          <div key={i} className="w-12 h-12 min-w-[3rem] bg-stone-800 border border-stone-600 rounded flex items-center justify-center relative">
            {slot && (
              <>
                <span className="text-2xl">{slot.icon}</span>
                <span className="absolute bottom-0 right-1 text-xs font-bold">{slot.count}</span>
              </>
            )}
          </div>
        ))}
      </div>

      <TouchControls player={player} />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('ui-root'));
root.render(<App />);
