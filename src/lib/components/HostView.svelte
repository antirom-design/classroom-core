<script>
  import { onMount, onDestroy } from "svelte";
  import { fade, scale, fly } from "svelte/transition";
  import TopBar from "./TopBar.svelte";

  export let websocket;
  export let roomCode;

  let canvas;
  let ctx;
  let animationFrame;
  let width, height;

  // Game State
  let gameState = "LOBBY"; // LOBBY, PLAYING, VICTORY
  let users = [];
  let strikes = 0;
  let asteroidsDestroyed = 0;
  let totalAsteroids = 0;

  // Local Leaderboard (tracked from shots)
  let leaderboard = new Map(); // sessionId -> { name, score, streaks }

  // Entities
  let spaceship = { x: 0, y: 0, angle: -Math.PI / 2, radius: 30 };
  let asteroids = [];
  let lasers = [];
  let particles = [];
  let pulses = [];
  let scoringNotifs = []; // { x, y, text, life, opacity }
  let spawnQueue = 0;

  // Configuration
  const SPAWN_RATE = 1500; // ms between spawns
  let lastSpawnTime = 0;

  const COLORS = {
    ship: "#4ECDC4",
    asteroid: "#A0AEC0",
    laser: "#FF6B6B",
    background: "#0f172a", // Deep space
    text: "#ffffff",
    accent: "#FBBF24", // Gold
  };

  onMount(() => {
    if (canvas) {
      ctx = canvas.getContext("2d");
    }
    resize();
    window.addEventListener("resize", resize);

    const unsubscribe = websocket.subscribe((msg) => {
      handleMessage(msg);
    });

    loop();

    return () => {
      window.removeEventListener("resize", resize);
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
      spaceship.x = width / 2;
      spaceship.y = height / 2;
    }
  }

  function handleMessage(msg) {
    if (msg.type === "rooms") {
      users = msg.data.filter((u) => !u.isHousemaster);
    }
    if (msg.type === "towerShot") {
      console.log("[HostView] 🔫 Laser Shot!", msg.data);
      fireLaser(msg.data);
      updateLeaderboard(msg.data);
    }
    if (msg.type === "pulse") {
      handlePulse(msg.data);
    }
  }

  function updateLeaderboard(data) {
    const { from, fromName, damage } = data;
    if (!leaderboard.has(from)) {
      leaderboard.set(from, { name: fromName, score: 0, shots: 0 });
    }
    const entry = leaderboard.get(from);
    entry.score += damage; // Use damage as score proxy
    entry.shots += 1;
    leaderboard = leaderboard; // Reactive update
  }

  function handlePulse(data) {
    pulses.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 0,
      maxRadius: 200,
      opacity: 1,
      color: "#ffffff",
      label: data.fromName,
    });
  }

  function startGame() {
    gameState = "PLAYING";
    strikes = 0;
    asteroidsDestroyed = 0;
    leaderboard = new Map();
    asteroids = [];
    lasers = [];

    // Calculate Total Asteroids: Users * Questions
    // Hardcoded question count for now (4 questions in startQuizMission)
    const questionCount = 4;
    totalAsteroids = users.length * questionCount;
    spawnQueue = totalAsteroids;

    lastSpawnTime = Date.now();

    // Start Quiz
    websocket.startQuizMission(sessionStorage.getItem("quiz_session_id"), [
      {
        id: 1,
        text: "What is 2 + 2?",
        options: ["3", "4", "5", "Fish"],
        correctIndex: 1,
      },
      {
        id: 2,
        text: "Capital of France?",
        options: ["London", "Berlin", "Madrid", "Paris"],
        correctIndex: 3,
      },
      {
        id: 3,
        text: "H2O is?",
        options: ["Water", "Gold", "Silver", "Air"],
        correctIndex: 0,
      },
      {
        id: 4,
        text: "Speed of light?",
        options: ["Fast", "Very Fast", "299,792 km/s", "Slow"],
        correctIndex: 2,
      },
    ]);
  }

  function handleLeave() {
    window.location.reload();
  }

  function fireLaser(data) {
    // Find nearest asteroid
    let target = null;
    let minDist = Infinity;

    for (const asteroid of asteroids) {
      if (asteroid.destroyed) continue;
      const dx = asteroid.x - spaceship.x;
      const dy = asteroid.y - spaceship.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        target = asteroid;
      }
    }

    let angle = -Math.PI / 2;
    let tx = spaceship.x;
    let ty = -100; // Default aim up

    if (target) {
      angle = Math.atan2(target.y - spaceship.y, target.x - spaceship.x);
      tx = target.x;
      ty = target.y;

      // Scoring Notification
      scoringNotifs.push({
        x: spaceship.x + 40,
        y: spaceship.y - 40,
        text: `${data.fromName} +${data.damage}`,
        life: 1.0,
        opacity: 1.0,
      });

      // Instant Hit Visual
      lasers.push({
        x1: spaceship.x,
        y1: spaceship.y,
        x2: target.x,
        y2: target.y,
        life: 1.0,
        color: data.level > 2 ? "#d946ef" : COLORS.laser, // Purple for super
        width: data.level * 2,
      });

      // Destroy logic
      target.hp -= data.damage;
      if (target.hp <= 0 && !target.destroyed) {
        target.destroyed = true;
        asteroidsDestroyed++;
        createParticles(target.x, target.y, COLORS.asteroid, 10);
        createParticles(target.x, target.y, COLORS.accent, 5); // Gold sparks context
      }
    } else {
      // Warning shot / Miss
      lasers.push({
        x1: spaceship.x,
        y1: spaceship.y,
        x2: spaceship.x + Math.cos(angle) * 1000,
        y2: spaceship.y + Math.sin(angle) * 1000,
        life: 1.0,
        color: COLORS.laser,
        width: 2,
      });
    }

    // Recoil
    spaceship.x -= Math.cos(angle) * 5;
    spaceship.y -= Math.sin(angle) * 5;
  }

  function spawnAsteroid() {
    if (spawnQueue <= 0) return;
    spawnQueue--;

    const angle = Math.random() * Math.PI * 2;
    const r = Math.max(width, height) / 2 + 100; // Spawn offscreen
    const x = width / 2 + Math.cos(angle) * r;
    const y = height / 2 + Math.sin(angle) * r;

    // Random Polygon Shape
    const vertices = [];
    const points = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < points; i++) {
      const a = (Math.PI * 2 * i) / points;
      const radiusVar = 20 + Math.random() * 15;
      vertices.push({
        x: Math.cos(a) * radiusVar,
        y: Math.sin(a) * radiusVar,
      });
    }

    asteroids.push({
      x,
      y,
      vx: (spaceship.x - x) * 0.002, // Move towards center
      vy: (spaceship.y - y) * 0.002,
      hp: 10,
      vertices,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.05,
      destroyed: false,
    });
  }

  function update() {
    const now = Date.now();
    let nearest = null;
    let minDist = Infinity;

    // Spawning logic
    if (gameState === "PLAYING" && now - lastSpawnTime > SPAWN_RATE) {
      if (spawnQueue > 0) {
        spawnAsteroid();
        lastSpawnTime = now;
      } else if (asteroids.length === 0) {
        // All spawned and all destroyed/hit
        gameState = "VICTORY";
      }
    }

    // Ship Drift (return to center)
    spaceship.x += (width / 2 - spaceship.x) * 0.05;
    spaceship.y += (height / 2 - spaceship.y) * 0.05;

    // Movement & Collision
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      if (a.destroyed) {
        asteroids.splice(i, 1);
        continue;
      }

      a.x += a.vx;
      a.y += a.vy;
      a.rotation += a.rotSpeed;

      // Distance check for tracking
      const distToShip = Math.sqrt(
        (a.x - spaceship.x) ** 2 + (a.y - spaceship.y) ** 2,
      );

      if (distToShip < minDist) {
        minDist = distToShip;
        nearest = a;
      }

      // Hit Ship?
      if (distToShip < spaceship.radius + 30) {
        // STRIKE!
        strikes++;
        asteroids.splice(i, 1);
        createParticles(spaceship.x, spaceship.y, "#ef4444", 20); // Red explosion
      }
    }

    // Rotate Ship to face nearest
    if (nearest) {
      const targetAngle = Math.atan2(
        nearest.y - spaceship.y,
        nearest.x - spaceship.x,
      );
      // Smooth rotation
      let diff = targetAngle - spaceship.angle;
      // Normalize
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      spaceship.angle += diff * 0.1;
    } else {
      // Spin slowly if idle
      spaceship.angle += 0.01;
    }

    // Ship Drift (return to center)
    spaceship.x += (width / 2 - spaceship.x) * 0.05;
    spaceship.y += (height / 2 - spaceship.y) * 0.05;

    // Lasers
    for (const l of lasers) {
      l.life -= 0.1;
    }
    lasers = lasers.filter((l) => l.life > 0);

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Pulses
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.radius += 5;
      p.opacity -= 0.02;
      if (p.opacity <= 0) pulses.splice(i, 1);
    }

    // Scoring Notifications
    for (let i = scoringNotifs.length - 1; i >= 0; i--) {
      const s = scoringNotifs[i];
      s.y -= 1; // Float up
      s.life -= 0.02;
      s.opacity = s.life;
      if (s.life <= 0) scoringNotifs.splice(i, 1);
    }
  }

  function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 1.0,
        size: Math.random() * 4 + 2,
      });
    }
  }

  function draw() {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    // Draw Pulses (Signals)
    ctx.lineWidth = 2;
    for (const p of pulses) {
      ctx.globalAlpha = p.opacity;
      ctx.strokeStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = p.color;
      ctx.font = "14px Inter";
      ctx.textAlign = "center";
      ctx.fillText(p.label, p.x, p.y);
    }
    ctx.globalAlpha = 1.0;

    // Draw Particles
    for (const p of particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Draw Lasers
    for (const l of lasers) {
      ctx.globalAlpha = l.life;
      ctx.strokeStyle = l.color;
      ctx.lineWidth = l.width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Draw Asteroids
    ctx.fillStyle = COLORS.asteroid;
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    for (const a of asteroids) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rotation);

      ctx.beginPath();
      const v = a.vertices;
      ctx.moveTo(v[0].x, v[0].y);
      for (let i = 1; i < v.length; i++) {
        ctx.lineTo(v[i].x, v[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Draw Spaceship
    ctx.save();
    ctx.translate(spaceship.x, spaceship.y);
    ctx.rotate(spaceship.angle); // Apply rotation

    // Draw Triangle Ship
    ctx.fillStyle = COLORS.ship;
    ctx.shadowBlur = 15;
    ctx.shadowColor = COLORS.ship;

    ctx.beginPath();
    ctx.moveTo(20, 0); // Tip
    ctx.lineTo(-15, 15); // Bottom Right
    ctx.lineTo(-5, 0); // Engine notch
    ctx.lineTo(-15, -15); // Bottom Left
    ctx.closePath();
    ctx.fill();

    // Draw Scoring Notifications
    ctx.textAlign = "left";
    ctx.font = "bold 18px Inter";
    for (const s of scoringNotifs) {
      ctx.globalAlpha = s.opacity;
      ctx.fillStyle = COLORS.accent;
      ctx.fillText(s.text, s.x, s.y);
    }
    ctx.globalAlpha = 1.0;

    // Shield / Strike Indicator
    if (strikes > 0) {
      ctx.strokeStyle = "#ef4444"; // Red for danger
      ctx.beginPath();
      ctx.arc(0, 0, 35, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
    ctx.shadowBlur = 0;
  }

  function loop() {
    update();
    draw();
    animationFrame = requestAnimationFrame(loop);
  }
</script>

<div class="host-container">
  <TopBar {roomCode} isHousemaster={true} on:leave={handleLeave} />

  {#if gameState === "LOBBY"}
    <div class="overlay lobby" in:fade>
      <div class="hero">
        <h1>ASTEROID DEFENSE</h1>
        <p class="subtitle">
          MISSION READINESS: {users.length} OPERATORS CONNECTED
        </p>
      </div>

      <div class="player-grid">
        {#each users as user}
          <div class="player-bubble" transition:scale>
            <span class="status-dot"></span>
            {user.name}
          </div>
        {/each}
      </div>

      <button
        class="start-btn"
        on:click={startGame}
        disabled={users.length === 0}
      >
        INITIATE MISSION
      </button>
    </div>
  {/if}

  <canvas bind:this={canvas} class:active={true}></canvas>

  {#if gameState === "PLAYING"}
    <div class="hud">
      <div class="panel left glass">
        <div class="label">STRIKES</div>
        <div class="value danger">{strikes}</div>
      </div>
      <div class="panel right glass">
        <div class="label">DESTROYED</div>
        <div class="value success">{asteroidsDestroyed} / {totalAsteroids}</div>
      </div>
    </div>
  {/if}

  {#if gameState === "VICTORY"}
    <div class="overlay victory glass" in:scale>
      <h1>MISSION DEBRIEF</h1>
      <h2 class="result-text">
        {strikes === 0 ? "PERFECT DEFENSE!" : `${strikes} HULL BREACHES`}
      </h2>

      <div class="leaderboard">
        {#each Array.from(leaderboard.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, 5) as player, i}
          <div class="rank-row">
            <span class="rank">#{i + 1}</span>
            <span class="name">{player.name}</span>
            <span class="score">{player.score} PTS</span>
          </div>
        {/each}
      </div>

      <button class="start-btn" on:click={startGame}> RE-ENGAGE </button>
    </div>
  {/if}
</div>

<style>
  .host-container {
    width: 100%;
    height: 100%;
    position: relative;
    color: white;
    font-family: "Inter", sans-serif;
    overflow: hidden;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    width: 90%;
    max-width: 800px;
    z-index: 10;
    padding: 3rem;
    border-radius: 32px;
  }

  .overlay.glass {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  }

  .subtitle {
    color: rgba(255, 255, 255, 0.5);
    letter-spacing: 3px;
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 4rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
    letter-spacing: -2px;
    background: linear-gradient(to right, #4ecdc4, #556270);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .result-text {
    font-size: 1.5rem;
    color: #4ecdc4;
    letter-spacing: 2px;
    margin-bottom: 2rem;
  }

  .player-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
    margin: 2rem 0 3rem 0;
  }

  .player-bubble {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    padding: 0.6rem 1.2rem;
    border-radius: 20px;
    font-weight: bold;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    gap: 10px;
    backdrop-filter: blur(5px);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    background: #4ecdc4;
    border-radius: 50%;
    box-shadow: 0 0 10px #4ecdc4;
  }

  .start-btn {
    background: #4ecdc4;
    color: #0f172a;
    border: none;
    padding: 1.2rem 4rem;
    font-size: 1.5rem;
    font-weight: 900;
    border-radius: 60px;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 3px;
    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-shadow: 0 0 30px rgba(78, 205, 196, 0.3);
  }

  .start-btn:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 0 50px rgba(78, 205, 196, 0.6);
  }

  .start-btn:disabled {
    opacity: 0.2;
    cursor: not-allowed;
  }

  .hud {
    position: absolute;
    top: 20px;
    left: 0;
    width: 100%;
    display: flex;
    justify-content: space-between;
    padding: 0 20px;
    pointer-events: none;
    box-sizing: border-box;
  }

  .panel.glass {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: 1rem 2rem;
    border-radius: 20px;
    min-width: 150px;
  }

  .label {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 2px;
    font-weight: 700;
  }

  .value {
    font-size: 2rem;
    font-weight: 900;
    line-height: 1;
  }

  .value.danger {
    color: #fe6b6b;
  }
  .value.success {
    color: #4ecdc4;
  }

  .leaderboard {
    margin: 2rem 0;
    text-align: left;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 16px;
    padding: 10px;
  }

  .rank-row {
    display: flex;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 1.2rem;
  }

  .rank-row:last-child {
    border-bottom: none;
  }

  .rank {
    font-weight: 900;
    color: #4ecdc4;
    width: 40px;
  }

  .name {
    flex-grow: 1;
    font-weight: 500;
  }

  .score {
    font-weight: 800;
    color: #4ecdc4;
  }
</style>
