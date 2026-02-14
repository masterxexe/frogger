// Frogger clone built with a simple tile/grid system.
(() => {
  const COLS = 13;
  const ROWS = 15;
  const TILE = 65;

  const CANVAS_W = COLS * TILE;
  const CANVAS_H = ROWS * TILE;

  const COLORS = {
    grass: '#1f7a3f',
    safe: '#2c8f4a',
    road: '#2d2d34',
    river: '#1b4d8a',
    laneStripe: '#f8fafc',
    frog: '#79f76a',
    frogEye: '#111827',
    turtle: '#4b5563',
    log: '#8b5e34',
    carA: '#ef4444',
    carB: '#f59e0b',
    carC: '#3b82f6',
    homeEmpty: '#14532d',
    homeFilled: '#84cc16',
    waterFoam: 'rgba(255,255,255,0.25)',
    flash: 'rgba(255,255,255,0.25)'
  };

  const ROW_TYPE = {
    HOME: 0,
    SAFE_TOP: 1,
    RIVER: [2, 3, 4, 5],
    SAFE_MID: 6,
    ROAD: [7, 8, 9, 10, 11],
    SAFE_BOTTOM: 12,
    START: 14
  };

  class Actor {
    constructor(row, x, widthTiles, speedTilesPerSecond) {
      this.row = row;
      this.x = x;
      this.width = widthTiles * TILE;
      this.speed = speedTilesPerSecond * TILE;
      this.y = row * TILE;
      this.height = TILE * 0.8;
    }

    update(dt) {
      this.x += this.speed * dt;
      if (this.speed > 0 && this.x > CANVAS_W + this.width) {
        this.x = -this.width - TILE;
      } else if (this.speed < 0 && this.x + this.width < -TILE) {
        this.x = CANVAS_W + TILE;
      }
    }

    draw(ctx, color) {
      const pad = TILE * 0.08;
      const yOffset = (TILE - this.height) / 2;
      ctx.fillStyle = color;
      ctx.fillRect(this.x + pad, this.y + yOffset, this.width - pad * 2, this.height);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(this.x + pad + 8, this.y + yOffset + 8, this.width - pad * 2 - 16, this.height - 16);
    }

    intersects(px, py, pw, ph) {
      const yOffset = (TILE - this.height) / 2;
      return (
        px < this.x + this.width &&
        px + pw > this.x &&
        py < this.y + yOffset + this.height &&
        py + ph > this.y + yOffset
      );
    }
  }

  class Player {
    constructor() {
      this.width = TILE * 0.68;
      this.height = TILE * 0.68;
      this.reset();
    }

    reset() {
      this.col = Math.floor(COLS / 2);
      this.row = ROWS - 1;
      this.updatePixelPosition();
    }

    updatePixelPosition() {
      this.x = this.col * TILE + (TILE - this.width) / 2;
      this.y = this.row * TILE + (TILE - this.height) / 2;
    }

    move(dx, dy) {
      this.col = Math.max(0, Math.min(COLS - 1, this.col + dx));
      this.row = Math.max(0, Math.min(ROWS - 1, this.row + dy));
      this.updatePixelPosition();
    }

    carry(amountPx) {
      this.x += amountPx;
      this.col = Math.round((this.x + this.width / 2 - TILE / 2) / TILE);
      this.row = Math.max(0, Math.min(ROWS - 1, this.row));
    }

    outOfBounds() {
      return this.x + this.width < 0 || this.x > CANVAS_W;
    }

    draw(ctx) {
      ctx.fillStyle = COLORS.frog;
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, this.width, this.height, 12);
      ctx.fill();

      const eyeY = this.y + this.height * 0.28;
      ctx.fillStyle = COLORS.frogEye;
      ctx.beginPath();
      ctx.arc(this.x + this.width * 0.3, eyeY, 3.8, 0, Math.PI * 2);
      ctx.arc(this.x + this.width * 0.7, eyeY, 3.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  const hudScore = document.getElementById('hud-score');
  const hudLevel = document.getElementById('hud-level');
  const hudLives = document.getElementById('hud-lives');
  const hudState = document.getElementById('hud-state');
  const startOverlay = document.getElementById('start-overlay');
  const playBtn = document.getElementById('play-btn');

  const game = {
    level: 1,
    score: 0,
    lives: 3,
    paused: false,
    gameOver: false,
    won: false,
    countdown: 3,
    countdownTimer: 0,
    flashTimer: 0,
    shakeTimer: 0,
    player: new Player(),
    vehicles: [],
    platforms: [],
    homes: [],
    lastTime: 0,
    stateMessage: 'Press Play to begin',
    started: false
  };

  function homeCenters() {
    return [1, 3.5, 6, 8.5, 11].map((c) => c * TILE);
  }

  function createLevel(level) {
    game.vehicles = [];
    game.platforms = [];
    game.homes = homeCenters().map((x, idx) => ({
      id: idx,
      x,
      y: TILE * 0.5,
      width: TILE * 1.2,
      height: TILE * 0.6,
      filled: false
    }));

    const speedScale = 1 + (level - 1) * 0.12;
    const laneConfigs = [
      { row: 11, speed: 2.1, widths: [1.3, 1.2, 1.5], color: COLORS.carA, offset: 0 },
      { row: 10, speed: -2.8, widths: [1.1, 1.8, 1.2], color: COLORS.carB, offset: 130 },
      { row: 9, speed: 2.6, widths: [1.4, 1.4, 1.6], color: COLORS.carC, offset: 250 },
      { row: 8, speed: -2.2, widths: [1.8, 1.6, 1.3], color: COLORS.carA, offset: 60 },
      { row: 7, speed: 3.0, widths: [1.2, 1.3, 1.4], color: COLORS.carB, offset: 190 }
    ];

    laneConfigs.forEach((lane) => {
      lane.widths.forEach((w, i) => {
        const x = (i * 320 + lane.offset) % (CANVAS_W + 250) - 100;
        const car = new Actor(lane.row, x, w, lane.speed * speedScale);
        car.color = lane.color;
        game.vehicles.push(car);
      });
    });

    const riverConfigs = [
      { row: 5, speed: -1.3, widths: [2.2, 1.8], type: 'log', offset: 30 },
      { row: 4, speed: 1.5, widths: [1.4, 1.4, 1.6], type: 'turtle', offset: 170 },
      { row: 3, speed: -1.7, widths: [2.0, 1.6], type: 'log', offset: 280 },
      { row: 2, speed: 1.9, widths: [1.4, 1.2, 1.4], type: 'turtle', offset: 80 }
    ];

    riverConfigs.forEach((lane) => {
      lane.widths.forEach((w, i) => {
        const x = (i * 360 + lane.offset) % (CANVAS_W + 320) - 140;
        const p = new Actor(lane.row, x, w, lane.speed * speedScale);
        p.type = lane.type;
        game.platforms.push(p);
      });
    });

    startCountdown(`Level ${level}`);
  }

  function startCountdown(message = 'Ready') {
    game.countdown = 3;
    game.countdownTimer = 0;
    game.stateMessage = message;
    game.player.reset();
  }

  function loseLife() {
    game.lives -= 1;
    game.flashTimer = 0.18;
    game.shakeTimer = 0.2;

    if (game.lives <= 0) {
      game.gameOver = true;
      game.stateMessage = 'Game Over';
      return;
    }

    startCountdown('Watch out!');
  }

  function completeHome(slot) {
    if (slot.filled) return;
    slot.filled = true;
    game.score += 250 + game.level * 20;
    const filled = game.homes.filter((h) => h.filled).length;
    if (filled === game.homes.length) {
      game.level += 1;
      game.score += 1000;
      createLevel(game.level);
      game.stateMessage = `Level ${game.level}`;
    } else {
      startCountdown('Nice!');
    }
  }

  function restartGame() {
    game.started = true;
    if (startOverlay) startOverlay.hidden = true;
    game.level = 1;
    game.score = 0;
    game.lives = 3;
    game.paused = false;
    game.gameOver = false;
    game.won = false;
    game.flashTimer = 0;
    game.shakeTimer = 0;
    createLevel(game.level);
  }

  function isRiverRow(row) {
    return ROW_TYPE.RIVER.includes(row);
  }

  function isRoadRow(row) {
    return ROW_TYPE.ROAD.includes(row);
  }

  function handleMovementKey(key) {
    const map = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      w: [0, -1],
      s: [0, 1],
      a: [-1, 0],
      d: [1, 0]
    };

    const move = map[key];
    if (!move) return false;
    game.player.move(move[0], move[1]);
    game.score += move[1] < 0 ? 10 : 0;
    return true;
  }

  function onKeyDown(event) {
    const key = event.key;
    const lower = key.length === 1 ? key.toLowerCase() : key;

    if (!game.started && key === 'Enter') {
      restartGame();
      return;
    }

    if (lower === 'p' || key === 'Escape') {
      if (!game.gameOver) {
        game.paused = !game.paused;
        game.stateMessage = game.paused ? 'Paused' : 'Running';
      }
      return;
    }

    if (lower === 'r') {
      restartGame();
      return;
    }

    if (game.paused || game.gameOver || game.countdown > 0) return;
    if (handleMovementKey(lower)) event.preventDefault();
  }

  function update(dt) {
    if (!game.started || game.paused || game.gameOver) return;

    if (game.flashTimer > 0) game.flashTimer -= dt;
    if (game.shakeTimer > 0) game.shakeTimer -= dt;

    if (game.countdown > 0) {
      game.countdownTimer += dt;
      if (game.countdownTimer >= 1) {
        game.countdownTimer = 0;
        game.countdown -= 1;
        if (game.countdown <= 0) game.stateMessage = 'Running';
      }
      return;
    }

    game.vehicles.forEach((v) => v.update(dt));
    game.platforms.forEach((p) => p.update(dt));

    const player = game.player;

    if (isRoadRow(player.row)) {
      for (const car of game.vehicles) {
        if (car.row === player.row && car.intersects(player.x, player.y, player.width, player.height)) {
          loseLife();
          return;
        }
      }
    }

    if (isRiverRow(player.row)) {
      let onPlatform = null;
      for (const platform of game.platforms) {
        if (platform.row === player.row && platform.intersects(player.x, player.y, player.width, player.height)) {
          onPlatform = platform;
          break;
        }
      }

      if (!onPlatform) {
        loseLife();
        return;
      }

      player.carry(onPlatform.speed * dt);
      if (player.outOfBounds()) {
        loseLife();
        return;
      }
    }

    if (player.row === ROW_TYPE.HOME) {
      const centerX = player.x + player.width / 2;
      const slot = game.homes.find((h) => centerX >= h.x && centerX <= h.x + h.width);
      if (slot && !slot.filled) {
        completeHome(slot);
      } else {
        loseLife();
      }
    }
  }

  function drawRows() {
    for (let row = 0; row < ROWS; row += 1) {
      if (row === ROW_TYPE.HOME || row === ROW_TYPE.SAFE_TOP || row === ROW_TYPE.SAFE_MID || row >= ROW_TYPE.SAFE_BOTTOM) {
        ctx.fillStyle = row === ROW_TYPE.HOME ? '#14532d' : COLORS.safe;
      } else if (isRiverRow(row)) {
        ctx.fillStyle = COLORS.river;
      } else {
        ctx.fillStyle = COLORS.road;
      }
      ctx.fillRect(0, row * TILE, CANVAS_W, TILE);

      if (isRoadRow(row)) {
        ctx.strokeStyle = 'rgba(248,250,252,0.45)';
        ctx.lineWidth = 3;
        ctx.setLineDash([20, 12]);
        ctx.beginPath();
        ctx.moveTo(0, row * TILE + TILE / 2);
        ctx.lineTo(CANVAS_W, row * TILE + TILE / 2);
        ctx.stroke();
      }

      if (isRiverRow(row)) {
        ctx.fillStyle = COLORS.waterFoam;
        for (let i = 0; i < COLS; i += 2) {
          ctx.fillRect(i * TILE + 6, row * TILE + TILE * 0.68, TILE * 0.6, 3);
        }
      }
    }

    ctx.setLineDash([]);
  }

  function drawHomes() {
    game.homes.forEach((h) => {
      ctx.fillStyle = h.filled ? COLORS.homeFilled : COLORS.homeEmpty;
      ctx.fillRect(h.x, h.y, h.width, h.height);
      if (!h.filled) {
        ctx.strokeStyle = 'rgba(250,250,250,0.25)';
        ctx.strokeRect(h.x + 3, h.y + 3, h.width - 6, h.height - 6);
      }
    });
  }

  function drawOverlayText() {
    if (!game.started || game.paused || game.gameOver || game.countdown > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 56px Segoe UI';

      if (!game.started) {
        ctx.fillText('Frogger', CANVAS_W / 2, CANVAS_H / 2 - 40);
        ctx.font = '24px Segoe UI';
        ctx.fillText('Click Play to start', CANVAS_W / 2, CANVAS_H / 2 + 10);
      } else if (game.gameOver) {
        ctx.fillText('Game Over', CANVAS_W / 2, CANVAS_H / 2 - 20);
        ctx.font = '24px Segoe UI';
        ctx.fillText('Press R to restart', CANVAS_W / 2, CANVAS_H / 2 + 30);
      } else if (game.paused) {
        ctx.fillText('Paused', CANVAS_W / 2, CANVAS_H / 2);
      } else if (game.countdown > 0) {
        ctx.fillText(String(game.countdown), CANVAS_W / 2, CANVAS_H / 2);
      }
    }
  }

  function draw() {
    ctx.save();
    if (game.shakeTimer > 0) {
      const amount = 4;
      ctx.translate((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount);
    }

    drawRows();
    drawHomes();

    game.platforms.forEach((p) => {
      p.draw(ctx, p.type === 'log' ? COLORS.log : COLORS.turtle);
      if (p.type === 'turtle') {
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.arc(p.x + p.width * 0.35, p.y + TILE * 0.5, 6, 0, Math.PI * 2);
        ctx.arc(p.x + p.width * 0.7, p.y + TILE * 0.5, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    game.vehicles.forEach((v) => v.draw(ctx, v.color));
    game.player.draw(ctx);

    if (game.flashTimer > 0) {
      ctx.fillStyle = COLORS.flash;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    drawOverlayText();
    ctx.restore();
  }

  function updateHud() {
    hudScore.textContent = `Score: ${game.score}`;
    hudLevel.textContent = `Level: ${game.level}`;
    hudLives.textContent = `Lives: ${game.lives}`;

    if (!game.started) {
      hudState.textContent = 'Waiting to start';
    } else if (game.gameOver) {
      hudState.textContent = 'Game Over';
    } else if (game.paused) {
      hudState.textContent = 'Paused';
    } else if (game.countdown > 0) {
      hudState.textContent = `${game.stateMessage} ${game.countdown}`;
    } else {
      hudState.textContent = 'Running';
    }
  }

  function loop(timestamp) {
    const dt = Math.min((timestamp - game.lastTime) / 1000, 0.05);
    game.lastTime = timestamp;

    update(dt);
    draw();
    updateHud();

    requestAnimationFrame(loop);
  }

  document.addEventListener('keydown', onKeyDown);
  if (playBtn) {
    playBtn.addEventListener('click', () => restartGame());
  }
  requestAnimationFrame((t) => {
    game.lastTime = t;
    loop(t);
  });
})();
