<script>
  import { onMount, onDestroy } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  
  export let websocket;

  let canvas;
  let ctx;
  let animationFrame;
  let width, height;

  // Game State
  let gameState = 'LOBBY'; // LOBBY, PLAYING, VICTORY
  let users = [];
  let score = 0;
  let wave = 1;

  // Entities
  let tower = { x: 0, y: 0, radius: 40, angle: 0, energy: 0 };
  let enemies = [];
  let projectiles = [];
  let particles = [];
  let texts = [];

  // Configuration
  const ENEMY_SPAWN_RATE = 2000; // ms
  let lastSpawnTime = 0;

  // Colors
  const COLORS = {
    tower: '#4ECDC4',
    enemy: '#FF6B6B',
    projectile: '#FFE66D',
    background: '#1a1a1a',
    text: '#ffffff'
  };

  onMount(() => {
    resize();
    window.addEventListener('resize', resize);
    
    // Setup WS listeners
    const unsubscribe = websocket.subscribe(msg => {
      handleMessage(msg);
    });

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
      unsubscribe();
    };
  });

  function resize() {
    if (canvas) {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      tower.x = width / 2;
      tower.y = height / 2;
    }
  }

  function handleMessage(msg) {
    if (msg.type === 'rooms') {
        // Update user list in lobby
        users = msg.data.filter(u => !u.isHousemaster);
    }
    if (msg.type === 'towerShot') {
        fireTower(msg.data);
    }
  }

  function startGame() {
    gameState = 'PLAYING';
    score = 0;
    wave = 1;
    enemies = [];
    projectiles = [];
    lastSpawnTime = Date.now();
    loop();
    
    // Start Quiz on clients
    websocket.startQuizMission(sessionStorage.getItem('quiz_session_id'), [
        { id: 1, text: 'What is 2 + 2?', options: ['3', '4', '5', 'Fish'], correctIndex: 1 },
        { id: 2, text: 'Capital of France?', options: ['London', 'Berlin', 'Madrid', 'Paris'], correctIndex: 3 },
        { id: 3, text: 'H2O is?', options: ['Water', 'Gold', 'Silver', 'Air'], correctIndex: 0 },
        { id: 4, text: 'Speed of light?', options: ['Fast', 'Very Fast', '299,792 km/s', 'Slow'], correctIndex: 2 }
    ]);
  }

  function fireTower(data) {
    // Find nearest enemy
    let target = null;
    let minDist = Infinity;
    
    for (const enemy of enemies) {
        const dx = enemy.x - tower.x;
        const dy = enemy.y - tower.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < minDist) {
            minDist = dist;
            target = enemy;
        }
    }

    let angle = 0;
    if (target) {
        angle = Math.atan2(target.y - tower.y, target.x - tower.x);
    } else {
        angle = Math.random() * Math.PI * 2;
    }

    // Spawn Projectile
    projectiles.push({
        x: tower.x,
        y: tower.y,
        vx: Math.cos(angle) * 10,
        vy: Math.sin(angle) * 10,
        damage: data.damage,
        level: data.level,
        color: data.level > 2 ? '#FF00FF' : COLORS.projectile,
        size: data.level * 4 + 4,
        from: data.fromName
    });

    // Pulse Tower
    tower.radius = 45;
  }

  function spawnEnemy() {
    // Spawn at edge
    const angle = Math.random() * Math.PI * 2;
    const r = Math.max(width, height) / 2 + 50;
    const x = width/2 + Math.cos(angle) * r;
    const y = height/2 + Math.sin(angle) * r;
    
    enemies.push({
        x, y,
        speed: 1 + (wave * 0.1),
        hp: 10 + (wave * 2),
        maxHp: 10 + (wave * 2),
        size: 20,
        color: COLORS.enemy
    });
  }

  function update() {
    const now = Date.now();

    if (now - lastSpawnTime > ENEMY_SPAWN_RATE / Math.sqrt(wave)) {
        spawnEnemy();
        lastSpawnTime = now;
    }

    // Update Tower
    if (tower.radius > 40) tower.radius -= 0.5;

    // Move Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx;
        p.y += p.vy;
        
        // Bounds check
        if (p.x < -100 || p.x > width + 100 || p.y < -100 || p.y > height + 100) {
            projectiles.splice(i, 1);
            continue;
        }

        // Collision Check
        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            const dx = p.x - e.x;
            const dy = p.y - e.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < e.size + p.size) {
                // Hit
                e.hp -= p.damage;
                createParticles(e.x, e.y, p.color, 5);
                
                if (e.hp <= 0) {
                    enemies.splice(j, 1);
                    score += 10;
                    createParticles(e.x, e.y, COLORS.enemy, 15);
                }
                
                projectiles.splice(i, 1);
                break;
            }
        }
    }

    // Move Enemies
    for (const e of enemies) {
        const dx = tower.x - e.x;
        const dy = tower.y - e.y;
        const angle = Math.atan2(dy, dx);
        
        e.x += Math.cos(angle) * e.speed;
        e.y += Math.sin(angle) * e.speed;
        
        // Damage Tower?
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < tower.radius + e.size) {
            // Game Over logic here (not implemented for MVP)
        }
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function createParticles(x, y, color, count) {
      for(let i=0; i<count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 5;
          particles.push({
              x, y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              color,
              life: 1.0,
              size: Math.random() * 5 + 2
          });
      }
  }

  function draw() {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    // Draw Particles
    for (const p of particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Draw Tower
    ctx.fillStyle = COLORS.tower;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, tower.radius, 0, Math.PI * 2);
    ctx.fill();
    // Tower glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = COLORS.tower;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw Enemies
    for (const e of enemies) {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        // Draw Hexagon for enemies
        for (let i = 0; i < 6; i++) {
             const angle = (Math.PI / 3) * i;
             const x = e.x + Math.cos(angle) * e.size;
             const y = e.y + Math.sin(angle) * e.size;
             if (i===0) ctx.moveTo(x, y);
             else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }

    // Draw Projectiles
    for (const p of projectiles) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Trail
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx*2, p.y - p.vy*2);
        ctx.strokeStyle = p.color;
        ctx.stroke();
    }
  }

  function loop() {
    if (gameState !== 'PLAYING') return;
    update();
    draw();
    animationFrame = requestAnimationFrame(loop);
  }
</script>

<div class="host-container">
  {#if gameState === 'LOBBY'}
    <div class="lobby" in:fade>
      <h1>Classroom Core: Defense Lobby</h1>
      <div class="info">
        <p>Waiting for Operators...</p>
        <div class="player-count">{users.length} connected</div>
      </div>
      
      <div class="player-grid">
         {#each users as user}
            <div class="player-bubble" transition:scale>
                {user.name}
            </div>
         {/each}
      </div>

      <button class="start-btn" on:click={startGame} disabled={users.length === 0}>
        INITIATE MISSION
      </button>
    </div>
  {/if}

  <canvas bind:this={canvas} class:hidden={gameState === 'LOBBY'}></canvas>
  
  {#if gameState === 'PLAYING'}
    <div class="hud">
        <div class="score">SCORE: {score}</div>
        <div class="wave">WAVE: {wave}</div>
    </div>
  {/if}
</div>

<style>
  .host-container {
    width: 100%;
    height: 100%;
    position: relative;
    background: #1a1a1a;
    color: white;
    font-family: 'Inter', sans-serif;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
  
  canvas.hidden {
      display: none;
  }

  .lobby {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    width: 80%;
  }

  .player-grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 1rem;
      margin: 2rem 0;
  }

  .player-bubble {
      background: #4ECDC4;
      color: #1a1a1a;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: bold;
  }

  .start-btn {
      background: #FF6B6B;
      color: white;
      border: none;
      padding: 1rem 3rem;
      font-size: 1.5rem;
      font-weight: bold;
      border-radius: 4px;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 2px;
  }
  
  .start-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
  }

  .hud {
      position: absolute;
      top: 2rem;
      left: 2rem;
      font-size: 2rem;
      font-weight: bold;
      pointer-events: none;
  }
</style>
