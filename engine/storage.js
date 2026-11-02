// engine/storage.js

class SaveManager {
  constructor() {
    // Подключаем CloudStorage из Telegram API, если недоступно — фолбэк на localStorage браузера
    this.storage = window.Telegram?.WebApp?.CloudStorage || null;
    this.saveKey = 'dst_miniapp_save_v1';
  }

  // Сбор данных и отправка в облако
  save(world, player, time) {
    // Отсекаем лишние данные, чтобы не превысить лимиты Telegram
    const saveData = {
      seed: world.seed || 'NEUMANNE',
      // Сохраняем только постройки и выброшенные предметы (без деревьев/камней, их сгенерирует сид)
      entities: world.entities.filter(e => 
        e.type.includes('item') || e.type.includes('fire') || e.type.includes('machine')
      ).map(e => ({ id: e.id, type: e.type, x: e.x, y: e.y, fuel: e.fuel || 0 })),
      
      player: {
        id: player.id,
        x: player.x,
        y: player.y,
        hp: player.hp,
        hunger: player.hunger,
        sanity: player.sanity,
        inventory: player.inventory,
        equip: player.equip
      },
      time: time
    };

    const jsonStr = JSON.stringify(saveData);

    if (this.storage) {
      this.storage.setItem(this.saveKey, jsonStr, (err, success) => {
        if (err) console.error("Ошибка сохранения в TG Cloud:", err);
      });
    } else {
      localStorage.setItem(this.saveKey, jsonStr);
    }
  }

  // Асинхронная загрузка при старте
  load(callback) {
    if (this.storage) {
      this.storage.getItem(this.saveKey, (err, value) => {
        if (!err && value) callback(JSON.parse(value));
        else callback(null);
      });
    } else {
      const val = localStorage.getItem(this.saveKey);
      callback(val ? JSON.parse(val) : null);
    }
  }
}

window.SaveManager = SaveManager;
