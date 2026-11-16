import Matter from 'matter-js';
import { BOARD, ROW_COLORS, TIERS } from '../config/gameConfig';

const { Engine, Bodies, Body, Composite, Events } = Matter;
const rand = (a, b) => a + Math.random() * (b - a);
const STEP_MS = 1000 / 120; // fixed physics step (120 Hz) for stable collisions

/**
 * Framework-free Plinko engine: Matter.js physics + Canvas 2D rendering.
 * React talks to it through the callbacks passed to the constructor:
 *   getDerived()  -> current derived game values (special pegs, per-hit bonuses)
 *   getSettings() -> { particles, trail }
 *   onPegHit({ x, y, kind, hits })
 *   onSettle({ slot, value, flat, free, x })
 */
export class PlinkoEngine {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cb = callbacks;
    this.engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.00085 } });
    this.balls = new Set();
    this.pegs = [];
    this.particles = [];
    this.paused = false;
    this.running = false;
    this.time = 0;
    this.acc = 0;
    this.last = 0;
    this.scale = 1;

    // Generate stars only on the outer sides (open sky), keeping the peg triangle clean
    const stars = [];
    const centerX = BOARD.W / 2;
    let attempts = 0;
    while (stars.length < 80 && attempts < 1000) {
      attempts++;
      const x = Math.random() * BOARD.W;
      const y = Math.random() * (BOARD.slotTop - 15);

      // Check if point is inside the peg pyramid or spawn path
      let insideBallZone = false;
      if (y >= 45 && y <= BOARD.slotTop) {
        const progress = (y - 45) / (BOARD.slotTop - 45);
        const halfWidth = 32 + progress * 155;
        if (Math.abs(x - centerX) < halfWidth + 14) {
          insideBallZone = true;
        }
      } else if (y < 45 && Math.abs(x - centerX) < 38) {
        insideBallZone = true;
      }

      if (!insideBallZone) {
        stars.push({
          x,
          y,
          r: rand(0.4, 1.6),
          phase: rand(0, 6.28),
          speed: rand(0.6, 2.2),
        });
      }
    }
    this.stars = stars;

    this.build();
    this.onCollide = (e) => this.handleCollisions(e);
    Events.on(this.engine, 'collisionStart', this.onCollide);
    this.tick = this.tick.bind(this);
    this.resize();
  }

  // ----- world ------------------------------------------------------------
  build() {
    const { W, H, rows, spacingX, spacingY, startY, pegR, slotCount, slotTop, outGutterW = 36 } = BOARD;
    const world = this.engine.world;
    const statics = [];

    for (let r = 0; r < rows; r++) {
      const n = r + 2;
      const y = startY + r * spacingY;
      for (let j = 0; j < n; j++) {
        const x = W / 2 + (j - (n - 1) / 2) * spacingX;
        const body = Bodies.circle(x, y, pegR, {
          isStatic: true,
          restitution: 0.65,
          friction: 0.002,
          label: 'peg',
        });
        body.plugin = { id: `${r}-${j}`, color: ROW_COLORS[r % ROW_COLORS.length], flash: 0 };
        this.pegs.push(body);
        statics.push(body);
      }
    }

    // Side walls keep balls inside the board.
    statics.push(
      Bodies.rectangle(-10, H / 2, 20, H * 2, { isStatic: true, restitution: 0.7, label: 'wall' }),
      Bodies.rectangle(W + 10, H / 2, 20, H * 2, { isStatic: true, restitution: 0.7, label: 'wall' })
    );

    // Slot dividers: 9 slots with Left and Right OUT gutters
    const slotAreaW = W - outGutterW * 2;
    const slotW = slotAreaW / slotCount;

    // Dividers separating OUT gutters from the 9 slots
    statics.push(
      Bodies.rectangle(outGutterW, slotTop + (H - slotTop) / 2, 4, H - slotTop, { isStatic: true, restitution: 0.5, label: 'divider' }),
      Bodies.circle(outGutterW, slotTop, 3.5, { isStatic: true, restitution: 0.6, label: 'divider' }),
      Bodies.rectangle(W - outGutterW, slotTop + (H - slotTop) / 2, 4, H - slotTop, { isStatic: true, restitution: 0.5, label: 'divider' }),
      Bodies.circle(W - outGutterW, slotTop, 3.5, { isStatic: true, restitution: 0.6, label: 'divider' })
    );

    // Inner dividers between the 9 slots
    for (let k = 1; k < slotCount; k++) {
      const x = outGutterW + k * slotW;
      statics.push(
        Bodies.rectangle(x, slotTop + (H - slotTop) / 2, 4, H - slotTop, { isStatic: true, restitution: 0.5, label: 'divider' }),
        Bodies.circle(x, slotTop, 3.5, { isStatic: true, restitution: 0.6, label: 'divider' })
      );
    }
    Composite.add(world, statics);
  }

  // ----- public API -------------------------------------------------------
  start() {
    if (this.running) return;
    this.running = true;
    this.last = 0;
    this.raf = requestAnimationFrame(this.tick);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    Events.off(this.engine, 'collisionStart', this.onCollide);
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }

  setPaused(p) {
    this.paused = p;
  }

  activeCount() {
    return this.balls.size;
  }

  drop({ value, free = false, tier = 0, bet = 0 }) {
    const { ballR, spawnX, spawnY } = BOARD;
    // Varied spawn offset so balls hit pegs at diverse angles instead of a boring vertical line
    const spawnOffsetX = rand(-16, 16);
    const ball = Bodies.circle(spawnX + spawnOffsetX, spawnY, ballR, {
      restitution: 0.68,
      friction: 0.001,
      frictionAir: 0.015,
      density: 0.002,
      label: 'ball',
      collisionFilter: { group: -1 }, // balls never collide with each other
    });
    ball.plugin = {
      value,
      flat: 0,
      hits: 0,
      free,
      tier,
      bet,
      hitSpecials: new Set(),
      trail: [],
      born: performance.now(),
      stuck: 0,
    };
    Body.setVelocity(ball, { x: rand(-0.7, 0.7), y: 0.2 });
    Composite.add(this.engine.world, ball);
    this.balls.add(ball);
    return ball;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const cssW = rect.width || BOARD.W;
    const cssH = rect.height || (cssW * BOARD.H) / BOARD.W;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.scale = this.canvas.width / BOARD.W;
  }

  // ----- physics events ---------------------------------------------------
  handleCollisions(e) {
    for (const pair of e.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      const ball = a.label === 'ball' ? a : b.label === 'ball' ? b : null;
      const peg = a.label === 'peg' ? a : b.label === 'peg' ? b : null;
      if (ball && peg) this.onPegHit(ball, peg, pair);
    }
  }

  onPegHit(ball, peg, pair) {
    const info = ball.plugin;
    const pi = peg.plugin;
    pi.flash = 1;
    info.hits++;

    // Dynamic lateral bounce impulse so ball bounces back and forth across pegs
    const dx = ball.position.x - peg.position.x;
    const dy = ball.position.y - peg.position.y;
    const dist = Math.hypot(dx, dy) || 1;
    const dirX = dx / dist;

    // Apply energetic ricochet force
    const kickX = (dirX + rand(-0.25, 0.25)) * rand(0.0007, 0.0016);
    Body.applyForce(ball, ball.position, { x: kickX, y: -0.0003 });

    const derived = this.cb.getDerived();
    const settings = this.cb.getSettings();
    let kind = 'normal';

    if (derived.bonusPegIds.has(pi.id) && !info.hitSpecials.has(pi.id)) {
      info.hitSpecials.add(pi.id);
      info.value += derived.bonusPegValue;
      kind = 'bonus';
    } else if (derived.multPegIds.has(pi.id) && !info.hitSpecials.has(pi.id)) {
      info.hitSpecials.add(pi.id);
      info.value *= derived.multPegFactor;
      kind = 'mult';
    }
    info.value += derived.perHitValue;
    info.flat += derived.flatPerHit;

    const sp = pair.collision?.supports?.[0] || peg.position;
    if (settings.particles) this.burst(sp.x, sp.y, pi.color, kind === 'normal' ? 6 : 14);
    this.cb.onPegHit({ x: peg.position.x, y: peg.position.y, kind, hits: info.hits });
  }

  burst(x, y, color, count) {
    if (this.particles.length > 260) return;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: rand(-90, 90),
        vy: rand(-130, -20),
        life: rand(0.35, 0.8),
        max: 0.8,
        r: rand(1, 2.6),
        color,
      });
    }
  }

  finalize(ball) {
    const { W, slotCount, settleY, outGutterW = 36 } = BOARD;
    const info = ball.plugin;
    const tier = info.tier || 0;
    const tierInfo = TIERS[tier] || TIERS[0];
    const x = ball.position.x;

    // Check if ball landed in Left OUT or Right OUT gutter
    if (x < outGutterW || x > W - outGutterW) {
      this.burst(x, settleY, '#EF4444', 20);
      Composite.remove(this.engine.world, ball);
      this.balls.delete(ball);
      this.cb.onOut?.({ x, y: settleY, tier, bet: info.bet || 0 });
      return;
    }

    const slotAreaW = W - outGutterW * 2;
    const slotW = slotAreaW / slotCount;
    const slot = Math.max(0, Math.min(slotCount - 1, Math.floor((x - outGutterW) / slotW)));

    this.burst(x, settleY, tierInfo.color || '#FFC94A', 22);
    Composite.remove(this.engine.world, ball);
    this.balls.delete(ball);
    this.cb.onSettle({ slot, value: info.value, flat: info.flat, free: info.free, tier, bet: info.bet || 0, x });
  }

  afterStep() {
    const now = performance.now();
    for (const ball of [...this.balls]) {
      const info = ball.plugin;
      const v = ball.velocity;
      const speed = Math.hypot(v.x, v.y);

      if (speed > 11) Body.setVelocity(ball, { x: (v.x / speed) * 11, y: (v.y / speed) * 11 });

      info.trail.push({ x: ball.position.x, y: ball.position.y });
      if (info.trail.length > 16) info.trail.shift();

      // Anti-stuck nudge if the ball balances on a peg.
      if (speed < 0.2) {
        info.stuck++;
        if (info.stuck > 40) {
          Body.setVelocity(ball, { x: rand(-1.6, 1.6), y: -0.8 });
          info.stuck = 0;
        }
      } else {
        info.stuck = 0;
      }

      if (ball.position.y > BOARD.settleY || now - info.born > 20000) this.finalize(ball);
    }
  }

  // ----- main loop --------------------------------------------------------
  tick(ts) {
    if (!this.running) return;
    const dt = Math.min(64, ts - (this.last || ts));
    this.last = ts;
    this.time += dt / 1000;

    if (!this.paused) {
      this.acc += dt;
      let n = 0;
      while (this.acc >= STEP_MS && n < 8) {
        Engine.update(this.engine, STEP_MS);
        this.acc -= STEP_MS;
        n++;
      }
      this.afterStep();
    }

    for (const p of this.pegs) if (p.plugin.flash > 0) p.plugin.flash = Math.max(0, p.plugin.flash - dt / 280);
    this.updateParticles(dt / 1000);
    this.render();
    this.raf = requestAnimationFrame(this.tick);
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += 320 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  // ----- rendering --------------------------------------------------------
  render() {
    const { ctx } = this;
    const { W, H, pegR, ballR, slotTop, slotCount, spawnX } = BOARD;
    const derived = this.cb.getDerived();
    const settings = this.cb.getSettings();
    const t = this.time;

    const scaleX = this.canvas.width / BOARD.W;
    const scaleY = this.canvas.height / BOARD.H;
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#2B1B66');
    bg.addColorStop(0.45, '#1A1448');
    bg.addColorStop(1, '#0C0C22');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Twinkling stars
    ctx.fillStyle = '#fff';
    for (const s of this.stars) {
      ctx.globalAlpha = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Moon with glow
    const mx = W - 52;
    const my = 56;
    const glow = ctx.createRadialGradient(mx, my, 6, mx, my, 70);
    glow.addColorStop(0, 'rgba(255,233,184,0.55)');
    glow.addColorStop(1, 'rgba(255,233,184,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(mx - 80, my - 80, 160, 160);
    ctx.fillStyle = '#FFEBC0';
    ctx.beginPath();
    ctx.arc(mx, my, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,160,110,0.45)';
    [[-7, -5, 4], [6, 4, 5], [-2, 9, 3]].forEach(([dx, dy, r]) => {
      ctx.beginPath();
      ctx.arc(mx + dx, my + dy, r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Drop indicator (bobbing arrow)
    const bob = Math.sin(t * 4) * 3;
    ctx.save();
    ctx.translate(spawnX, 12 + bob);
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-9, -8);
    ctx.lineTo(9, -8);
    ctx.lineTo(9, 0);
    ctx.lineTo(14, 0);
    ctx.lineTo(0, 14);
    ctx.lineTo(-14, 0);
    ctx.lineTo(-9, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Slot dividers and OUT gutter boundaries
    const { outGutterW = 36 } = BOARD;
    const slotAreaW = W - outGutterW * 2;
    const slotW = slotAreaW / slotCount;

    // OUT boundary dividers (Red glow)
    for (const outX of [outGutterW, W - outGutterW]) {
      const g = ctx.createLinearGradient(0, slotTop, 0, H);
      g.addColorStop(0, '#EF4444');
      g.addColorStop(1, '#581C1C');
      ctx.fillStyle = g;
      ctx.fillRect(outX - 2, slotTop, 4, H - slotTop);
      ctx.save();
      ctx.shadowColor = '#EF4444';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#F87171';
      ctx.beginPath();
      ctx.arc(outX, slotTop, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Inner slot dividers (Purple glow)
    for (let k = 1; k < slotCount; k++) {
      const x = outGutterW + k * slotW;
      const g = ctx.createLinearGradient(0, slotTop, 0, H);
      g.addColorStop(0, '#6D4FE0');
      g.addColorStop(1, '#2A2160');
      ctx.fillStyle = g;
      ctx.fillRect(x - 2, slotTop, 4, H - slotTop);
      ctx.save();
      ctx.shadowColor = '#8B5CF6';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#B79CFF';
      ctx.beginPath();
      ctx.arc(x, slotTop, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Pegs
    for (const peg of this.pegs) {
      const { x, y } = peg.position;
      const { id, color, flash } = peg.plugin;
      const isBonus = derived.bonusPegIds.has(id);
      const isMult = derived.multPegIds.has(id);

      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 8 + flash * 18;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, pegR + flash * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(x - 1.5, y - 1.7, 1.5, 0, Math.PI * 2);
      ctx.fill();

      if (flash > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${flash * 0.7})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, pegR + (1 - flash) * 11, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (isBonus || isMult) {
        const c = isBonus ? '#FFC94A' : '#FF6FA9';
        const pulse = 0.6 + 0.4 * Math.sin(t * 5 + x);
        ctx.save();
        ctx.strokeStyle = c;
        ctx.globalAlpha = pulse;
        ctx.shadowColor = c;
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, pegR + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = c;
        ctx.font = '700 8px "Lilita One", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(isBonus ? `+${derived.bonusPegValue}` : `×${derived.multPegFactor}`, x, y - 11);
      }
    }

    // Balls + trails
    for (const ball of this.balls) {
      const { x, y } = ball.position;
      const trail = ball.plugin.trail;
      const tier = ball.plugin.tier || 0;
      const tierInfo = TIERS[tier] || TIERS[0];
      const ballColor = tierInfo.color || '#FFC94A';

      if (settings.trail && trail.length > 2) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.shadowColor = ballColor;
        ctx.shadowBlur = 10;
        for (let i = 1; i < trail.length; i++) {
          const k = i / trail.length;
          ctx.strokeStyle = `rgba(255,201,74,${k * 0.55})`;
          ctx.lineWidth = ballR * 1.7 * k;
          ctx.beginPath();
          ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx.lineTo(trail[i].x, trail[i].y);
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.save();
      ctx.shadowColor = ballColor;
      ctx.shadowBlur = 16;
      const bg2 = ctx.createRadialGradient(x - 2.5, y - 3, 1, x, y, ballR + 1);
      bg2.addColorStop(0, '#FFFFFF');
      bg2.addColorStop(0.4, ballColor);
      bg2.addColorStop(1, '#1A0E2E');
      ctx.fillStyle = bg2;
      ctx.beginPath();
      ctx.arc(x, y, ballR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, ballR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = tier === 0 ? '#6B3F00' : '#FFFFFF';
      ctx.font = '700 11px "Lilita One", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = tier === 0 ? '1' : (tierInfo.symbol || tierInfo.roman);
      ctx.fillText(label, x, y + 0.5);
    }

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
