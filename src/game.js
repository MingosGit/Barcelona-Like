// ---------------------------------------------------------------------------
// CORE LOOP de BARÇALYPSE. El combate delega toda interacción arma→enemigo
// en el RuleEngine (rules.js); las IA de enemigos y jefes son funciones
// pequeñas seleccionadas por clave (`behavior` / `ai`) desde los datos.
// ---------------------------------------------------------------------------
import { TAU, clamp, dist, norm, rand, randInt, pick, chance, weightedPick, hash2 } from "./util.js";
import { ENEMIES } from "./data/enemies.js";
import { WEAPONS, MAX_WEAPON_LEVEL, MAX_WEAPON_SLOTS } from "./data/weapons.js";
import { BOSSES } from "./data/biomes.js";
import { PASSIVES, SYNERGIES } from "./data/cards.js";
import { RuleEngine } from "./rules.js";
import { SKIN_TONES, HAIR_TONES } from "./sprites.js";
import { sfx } from "./sfx.js";

const CELL = 170; // tamaño de celda para obstáculos procedurales

const STATUS_INFO = {
  empapado: { icon: "💧", slow: 0.6 },
  ardiendo: { icon: "🔥", dps: 4 },
  aturdido: { icon: "💫", slow: 0 },
  cegado: { icon: "😵" },
  miedo: { icon: "😱" },
};

export class Game {
  constructor(input, biome, charDef, cb, opts = {}) {
    this.input = input;
    this.biome = biome;
    this.cb = cb; // { levelUp, gameOver, toast, flash }
    this.turbo = !!opts.turbo;
    this.rules = new RuleEngine();
    this.seed = randInt(1, 99999);

    const s = charDef.stats;
    this.player = {
      def: charDef, x: 0, y: 0, r: 14,
      hp: s.hp, maxHp: s.hp, baseSpeed: s.speed, speedMult: 1,
      dmgMult: s.dmgMult, cdMult: s.cdMult, magnetR: s.magnetR,
      armor: s.armor, regen: s.regen,
      xp: 0, level: 1, xpNext: 12, kills: 0, coins: 0,
      iframe: 0, stunT: 0, blindT: 0, immobT: 0, slowMul: 1, stickT: 0,
      faceX: 1, faceY: 0, dash: null, stunCd: 0,
      passiveCounts: {}, synergiesTaken: new Set(),
      weapons: [],
    };
    this.coinMult = s.coinMult || 1;

    // modificadores de dificultad (mutadores)
    this.spawnRateMult = 1;
    this.globalEnemySpeed = 1;
    this.eliteChanceMult = 1;
    this.eliteFrom = 300;
    this.rentDrain = 0;
    this.maxWeaponSlots = MAX_WEAPON_SLOTS;
    this.modCoinMult = 1;
    this.mods = opts.mods || [];
    for (const m of this.mods) {
      m.apply(this);
      this.modCoinMult *= m.coinMult;
    }

    this.streak = 0;
    this.streakT = 0;
    this.bassSlow = false; // la banda del altavoz te frena con el bajo
    this._sfxT = 0;
    this.addWeapon(charDef.startWeapon);

    this.time = 0;
    this.enemies = [];
    this.projectiles = []; // de armas del jugador
    this.eProjectiles = []; // de enemigos
    this.zones = [];
    this.pickups = [];
    this.floaters = [];
    this.bubbles = 0; // limitador de bocadillos simultáneos
    this.effects = [];
    this.dynObstacles = []; // vallas temporales de jefes
    this.spawnT = 1;
    this.craneT = 4;
    this.boss = null;
    this.bossSpawned = false;
    this.bossTime = this.turbo ? 45 : biome.duration;
    this.over = false;
    this.result = null;
    this.levelUpsQueued = 0;
    this.levelUpActive = false;
    this.shake = 0;
    this.enemyBuffStacks = 0; // subidas de alquiler del Casero
    this.killedBy = null;
  }

  // ------------------------------------------------------------ armas
  addWeapon(id) {
    this.player.weapons.push({
      def: WEAPONS[id], level: 1,
      state: { t: rand(0.3, 1), angle: rand(TAU), fireT: 0 },
    });
  }

  weaponStats(w) {
    return w.def.levels[w.level - 1];
  }

  // ------------------------------------------------------------ obstáculos procedurales
  obstacleAt(cx, cy) {
    const b = this.biome;
    // "plazas": superbloques 6x6 con menos densidad (respiro en biomas laberinto)
    const plaza = b.maze && hash2(Math.floor(cx / 6), Math.floor(cy / 6), this.seed + 9) < 0.28;
    const density = plaza ? b.obstacleDensity * 0.15 : b.obstacleDensity;
    const h = hash2(cx, cy, this.seed);
    if (h > density) return null;
    // sin obstáculos en la zona de aparición
    const ox = cx * CELL + (hash2(cx, cy, this.seed + 1) - 0.5) * CELL * 0.6 + CELL / 2;
    const oy = cy * CELL + (hash2(cx, cy, this.seed + 2) - 0.5) * CELL * 0.6 + CELL / 2;
    if (Math.hypot(ox, oy) < 150) return null;
    // elige el prop por peso (tienda de fundas, kiosco, farola...)
    let total = 0;
    for (const pr of b.props) total += pr.w;
    let roll = hash2(cx, cy, this.seed + 3) * total;
    let def = b.props[0];
    for (const pr of b.props) { roll -= pr.w; if (roll <= 0) { def = pr; break; } }
    const v = hash2(cx, cy, this.seed + 4);
    const sign = def.signs ? def.signs[Math.floor(hash2(cx, cy, this.seed + 5) * def.signs.length)] : null;
    return { x: ox, y: oy, r: def.r * (0.9 + v * 0.25), kind: def.kind, sign, v };
  }

  obstaclesNear(x, y, rad) {
    const out = [];
    const c0x = Math.floor((x - rad) / CELL), c1x = Math.floor((x + rad) / CELL);
    const c0y = Math.floor((y - rad) / CELL), c1y = Math.floor((y + rad) / CELL);
    for (let cx = c0x; cx <= c1x; cx++)
      for (let cy = c0y; cy <= c1y; cy++) {
        const o = this.obstacleAt(cx, cy);
        if (o) out.push(o);
      }
    for (const o of this.dynObstacles) {
      if (Math.abs(o.x - x) < rad + o.r && Math.abs(o.y - y) < rad + o.r) out.push(o);
    }
    return out;
  }

  collideObstacles(ent) {
    for (const o of this.obstaclesNear(ent.x, ent.y, ent.r + 40)) {
      const d = dist(ent.x, ent.y, o.x, o.y);
      const min = ent.r + o.r;
      if (d < min && d > 0.001) {
        const push = (min - d) / d;
        ent.x += (ent.x - o.x) * push;
        ent.y += (ent.y - o.y) * push;
      }
    }
  }

  onSlowPatch(x, y) {
    if (!this.biome.slowPatches) return false;
    const cx = Math.floor(x / 130), cy = Math.floor(y / 130);
    return hash2(cx, cy, this.seed + 77) < 0.14;
  }

  // ------------------------------------------------------------ update principal
  update(dt) {
    if (this.over) return;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 30);

    this.updatePlayer(dt);
    this.updateWeapons(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateZones(dt);
    this.updatePickups(dt);
    this.updateFloaters(dt);
    this.director(dt);

    if (this.biome.craneRain) this.craneRain(dt);
  }

  // ------------------------------------------------------------ jugador
  updatePlayer(dt) {
    const p = this.player;
    p.iframe = Math.max(0, p.iframe - dt);
    p.stunT = Math.max(0, p.stunT - dt);
    p.blindT = Math.max(0, p.blindT - dt);
    p.immobT = Math.max(0, p.immobT - dt);
    p.stunCd = Math.max(0, p.stunCd - dt);
    p.stickT = Math.max(0, p.stickT - dt);
    if (p.regen > 0) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
    if (this.rentDrain > 0) { // modificador "Alquiler al día"
      p.hp -= this.rentDrain * dt;
      if (p.hp <= 0 && !this.over) {
        p.hp = 0;
        this.over = true;
        this.killedBy = "alquiler";
        this.result = { victory: false };
        sfx.death();
        this.cb.gameOver(this.buildResult());
        return;
      }
    }

    if (p.dash) {
      // embestida del Bicing: iframes y daño a lo que cruces
      p.dash.t -= dt;
      p.x += p.dash.dx * p.dash.speed * dt;
      p.y += p.dash.dy * p.dash.speed * dt;
      p.iframe = Math.max(p.iframe, 0.1);
      for (const e of this.enemies) {
        if (p.dash.hit.has(e)) continue;
        if (dist(p.x, p.y, e.x, e.y) < p.dash.width / 2 + e.r) {
          p.dash.hit.add(e);
          this.applyHit(e, p.dash.dmg, WEAPONS.bicing.tags, { dir: [p.dash.dx, p.dash.dy], baseKnock: 200 });
        }
      }
      if (p.dash.t <= 0) p.dash = null;
    } else if (p.stunT <= 0 && p.immobT <= 0) {
      const mv = this.input.getMove();
      let slow = 1;
      p.slowMul = 1;
      for (const z of this.zones) {
        if (z.telegraph > 0 || z.owner !== "enemy") continue;
        if (dist(p.x, p.y, z.x, z.y) > z.r) continue;
        if (z.type === "vomito") slow = Math.min(slow, 0.55);
        if (z.type === "asamblea") {
          slow = Math.min(slow, 0.6);
          const [dx, dy] = norm(z.x - p.x, z.y - p.y);
          p.x += dx * 30 * dt; p.y += dy * 30 * dt;
        }
        if (z.type === "denuncia") p.immobT = Math.max(p.immobT, 0.1);
      }
      if (this.onSlowPatch(p.x, p.y)) slow *= 0.75;
      if (this.bassSlow) slow *= 0.78; // el bajo del reggaeton es física aplicada
      if (p.stickT > 0) slow *= 0.7; // flyers de kebab pegados a los pies
      const spd = p.baseSpeed * p.speedMult * slow;
      p.x += mv.x * spd * dt;
      p.y += mv.y * spd * dt;
      if (Math.abs(mv.x) + Math.abs(mv.y) > 0.1) {
        [p.faceX, p.faceY] = norm(mv.x, mv.y);
      }
    }
    this.collideObstacles(p);
  }

  hurtPlayer(dmg, sourceId) {
    const p = this.player;
    if (p.iframe > 0 || this.over) return;
    const real = Math.max(1, dmg - p.armor);
    p.hp -= real;
    p.iframe = 0.45;
    this.shake = 6;
    sfx.hurt();
    this.floaters.push({ x: p.x, y: p.y - 20, text: `-${Math.round(real)}`, t: 0.8, color: "#ff6b6b", vy: -50 });
    if (navigator.vibrate) navigator.vibrate(30);
    if (p.hp <= 0) {
      p.hp = 0;
      this.over = true;
      this.killedBy = sourceId;
      this.result = { victory: false };
      sfx.death();
      this.cb.gameOver(this.buildResult());
    }
  }

  buildResult() {
    const p = this.player;
    return {
      victory: this.result.victory,
      time: this.time, kills: p.kills, level: p.level,
      coins: Math.round((p.coins + (this.result.victory ? 150 : 0)) * this.modCoinMult),
      killedBy: this.killedBy,
      biome: this.biome,
      mods: this.mods.length,
    };
  }

  // ------------------------------------------------------------ armas del jugador
  aimDir(maxRange = 400) {
    const p = this.player;
    let best = null, bd = maxRange;
    for (const e of this.enemies) {
      const d = dist(p.x, p.y, e.x, e.y);
      if (d < bd && !(e.state && e.state.hidden)) { bd = d; best = e; }
    }
    if (best) return norm(best.x - p.x, best.y - p.y);
    return [p.faceX, p.faceY];
  }

  updateWeapons(dt) {
    const p = this.player;
    for (const w of p.weapons) {
      const st = this.weaponStats(w);
      const S = w.state;
      switch (w.def.kind) {
        case "cone": {
          S.t -= dt;
          if (S.t <= 0) {
            S.t = st.cd * p.cdMult;
            const [dx, dy] = this.aimDir(st.range + 120);
            const a0 = Math.atan2(dy, dx);
            this.effects.push({ type: "cone", x: p.x, y: p.y, angle: a0, arc: st.arc, r: st.range, t: 0.3, dur: 0.3 });
            for (const e of this.enemies) {
              const d = dist(p.x, p.y, e.x, e.y);
              if (d > st.range + e.r) continue;
              let da = Math.atan2(e.y - p.y, e.x - p.x) - a0;
              da = Math.atan2(Math.sin(da), Math.cos(da));
              if (Math.abs(da) < st.arc / 2 + 0.15) {
                this.applyHit(e, st.dmg, w.def.tags, {
                  dir: norm(e.x - p.x, e.y - p.y),
                  forceStatus: [{ id: "ardiendo", dur: 2 }],
                });
              }
            }
          }
          break;
        }
        case "aura": {
          S.t -= dt;
          S.angle += dt * 1.5;
          if (S.t <= 0) {
            S.t = st.tick * p.cdMult;
            for (const e of this.enemies) {
              if (dist(p.x, p.y, e.x, e.y) < st.radius + e.r) {
                this.applyHit(e, st.dmg, w.def.tags, {
                  dir: norm(e.x - p.x, e.y - p.y),
                  forceStatus: [{ id: "empapado", dur: 2.5 }],
                });
              }
            }
          }
          break;
        }
        case "beam": {
          S.angle += st.rot * dt;
          S.t -= dt;
          if (S.t <= 0) {
            S.t = st.tick * p.cdMult;
            for (let b = 0; b < st.beams; b++) {
              const a = S.angle + (TAU / st.beams) * b;
              const bx = Math.cos(a), by = Math.sin(a);
              for (const e of this.enemies) {
                // distancia del enemigo al segmento del rayo
                const ex = e.x - p.x, ey = e.y - p.y;
                const t = clamp(ex * bx + ey * by, 0, st.length);
                const d = dist(ex, ey, bx * t, by * t);
                if (d < e.r + 7) this.applyHit(e, st.dmg, w.def.tags, { dir: [bx, by] });
              }
            }
          }
          break;
        }
        case "ram": {
          S.t -= dt;
          if (S.t <= 0 && !p.dash && this.enemies.length) {
            S.t = st.cd * p.cdMult;
            const [dx, dy] = this.aimDir(st.dashLen + 100);
            p.dash = {
              dx, dy, speed: st.dashLen / 0.28, t: 0.28,
              dmg: st.dmg, width: st.width, hit: new Set(),
            };
            this.effects.push({ type: "trail", x: p.x, y: p.y, dx, dy, len: st.dashLen, t: 0.35, dur: 0.35 });
          }
          break;
        }
        case "boomerang": {
          S.t -= dt;
          if (S.t <= 0) {
            S.t = st.cd * p.cdMult;
            for (let i = 0; i < st.count; i++) {
              const [dx, dy] = this.aimDir(450);
              const a = Math.atan2(dy, dx) + (i - (st.count - 1) / 2) * 0.45;
              this.projectiles.push({
                x: p.x, y: p.y, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed,
                dmg: st.dmg, phase: "out", speed: st.speed, ttl: 5,
                emoji: "🥖", rot: 0, hit: new Set(), tags: w.def.tags,
              });
            }
          }
          break;
        }
        case "nova": {
          S.t -= dt;
          if (S.t <= 0) {
            S.t = st.cd * p.cdMult;
            this.effects.push({ type: "nova", x: p.x, y: p.y, r: st.radius, t: 0.4, dur: 0.4 });
            for (const e of this.enemies) {
              if (dist(p.x, p.y, e.x, e.y) < st.radius + e.r) {
                this.applyHit(e, st.dmg, w.def.tags, {
                  dir: norm(e.x - p.x, e.y - p.y), baseKnock: st.knock,
                });
              }
            }
          }
          break;
        }
        case "bomb": {
          S.t -= dt;
          if (S.t <= 0) {
            S.t = st.cd * p.cdMult;
            const targets = this.enemies.filter((e) => dist(p.x, p.y, e.x, e.y) < 340);
            const tgt = targets.length ? pick(targets) : { x: p.x + rand(-200, 200), y: p.y + rand(-200, 200) };
            this.projectiles.push({
              x: p.x, y: p.y, bomb: true, t: 0, dur: 0.7,
              x0: p.x, y0: p.y, x1: tgt.x, y1: tgt.y,
              dmg: st.dmg, radius: st.radius, dotDmg: st.dotDmg, dotDur: st.dotDur,
              emoji: "🥔", tags: w.def.tags, ttl: 2,
            });
          }
          break;
        }
        case "homing": { // la chancla no falla nunca
          S.t -= dt;
          if (S.t <= 0 && this.enemies.length) {
            S.t = st.cd * p.cdMult;
            const pool = this.enemies.filter((e) => !e.state.hidden && dist(p.x, p.y, e.x, e.y) < 520);
            for (let i = 0; i < st.count && pool.length; i++) {
              const tgt = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
              const [dx, dy] = norm(tgt.x - p.x, tgt.y - p.y);
              this.projectiles.push({
                x: p.x, y: p.y, vx: dx * st.speed, vy: dy * st.speed,
                homingPlayer: true, target: tgt, speed: st.speed,
                dmg: st.dmg, emoji: "🩴", rot: 0, ttl: 6, tags: w.def.tags, hit: new Set(),
              });
            }
          }
          break;
        }
        case "bottle": { // litrona: empapa y deja cristales
          S.t -= dt;
          if (S.t <= 0) {
            S.t = st.cd * p.cdMult;
            const targets = this.enemies.filter((e) => dist(p.x, p.y, e.x, e.y) < 330);
            const tgt = targets.length ? pick(targets) : { x: p.x + rand(-180, 180), y: p.y + rand(-180, 180) };
            this.projectiles.push({
              x: p.x, y: p.y, bomb: true, bottle: true, t: 0, dur: 0.65,
              x0: p.x, y0: p.y, x1: tgt.x, y1: tgt.y,
              dmg: st.dmg, radius: st.radius, zoneDur: st.zoneDur,
              emoji: "🍾", tags: w.def.tags, ttl: 2,
            });
          }
          break;
        }
        case "taunt": { // el dürüm atrae y funde
          S.t -= dt;
          for (const e of this.enemies) {
            if (e.boss) continue;
            const d = dist(p.x, p.y, e.x, e.y);
            if (d < st.radius * 1.8 && d > 30) {
              const [dx, dy] = norm(p.x - e.x, p.y - e.y);
              e.x += dx * st.pull * dt;
              e.y += dy * st.pull * dt;
            }
          }
          if (S.t <= 0) {
            S.t = st.tick * p.cdMult;
            for (const e of this.enemies) {
              if (dist(p.x, p.y, e.x, e.y) < st.radius + e.r) {
                this.applyHit(e, st.dmg, w.def.tags, {});
              }
            }
          }
          break;
        }
        case "slam": { // el PERSIANAZO
          S.t -= dt;
          if (S.t <= 0 && this.enemies.length) {
            S.t = st.cd * p.cdMult;
            const [dx, dy] = this.aimDir(st.range + 100);
            this.effects.push({ type: "slam", x: p.x, y: p.y, dx, dy, range: st.range, width: st.width, t: 0.28, dur: 0.28 });
            sfx.slam();
            this.shake = Math.max(this.shake, 3);
            for (const e of this.enemies) {
              const ex = e.x - p.x, ey = e.y - p.y;
              const fwd = ex * dx + ey * dy;
              const lat = Math.abs(ex * -dy + ey * dx);
              if (fwd > -e.r && fwd < st.range + e.r && lat < st.width / 2 + e.r) {
                this.applyHit(e, st.dmg, w.def.tags, {
                  dir: [dx, dy], baseKnock: 240,
                  forceStatus: [{ id: "aturdido", dur: st.stun }],
                });
              }
            }
          }
          break;
        }
        case "pets": { // escuadrón de palomas
          if (!S.birds) S.birds = [];
          while (S.birds.length < st.count) {
            S.birds.push({ x: p.x + rand(-40, 40), y: p.y + rand(-40, 40), tickT: 0, phase: rand(TAU) });
          }
          S.birds.length = st.count;
          for (const b of S.birds) {
            let tgt = null, bd = 420;
            for (const e of this.enemies) {
              if (e.state.hidden) continue;
              const d = dist(b.x, b.y, e.x, e.y);
              if (d < bd) { bd = d; tgt = e; }
            }
            if (tgt) {
              const [dx, dy] = norm(tgt.x - b.x, tgt.y - b.y);
              b.x += dx * st.speed * dt;
              b.y += dy * st.speed * dt;
              b.tickT -= dt;
              if (bd < tgt.r + 12 && b.tickT <= 0) {
                b.tickT = st.tick;
                this.applyHit(tgt, st.dmg, w.def.tags, {});
              }
            } else { // sin objetivo: revolotean cerca del jugador
              const a = this.time * 1.5 + b.phase;
              const hx = p.x + Math.cos(a) * 55, hy = p.y + Math.sin(a) * 55;
              const [dx, dy] = norm(hx - b.x, hy - b.y);
              b.x += dx * st.speed * 0.8 * dt;
              b.y += dy * st.speed * 0.8 * dt;
            }
          }
          break;
        }
        case "orbit": {
          S.angle += st.rot * dt;
          for (let i = 0; i < st.count; i++) {
            const a = S.angle + (TAU / st.count) * i;
            const ux = p.x + Math.cos(a) * st.radius;
            const uy = p.y + Math.sin(a) * st.radius;
            for (const e of this.enemies) {
              if (!e._orbCd) e._orbCd = 0;
              if (e._orbCd > this.time) continue;
              if (dist(ux, uy, e.x, e.y) < e.r + 16) {
                e._orbCd = this.time + 0.5;
                this.applyHit(e, st.dmg, w.def.tags, {
                  dir: norm(e.x - p.x, e.y - p.y), baseKnock: 120,
                  forceStatus: [{ id: "aturdido", dur: st.stun }],
                });
              }
            }
          }
          break;
        }
      }
    }
  }

  // ------------------------------------------------------------ daño con reglas
  applyHit(enemy, baseDmg, weaponTags, opts = {}) {
    if (enemy.dead) return;
    const ctx = {
      weaponTags: new Set(weaponTags),
      enemyTags: new Set(enemy.def.tags),
      enemyStatuses: new Set(Object.keys(enemy.statuses)),
    };
    const res = this.rules.resolve(ctx);
    const dmg = baseDmg * this.player.dmgMult * res.mult;
    enemy.hp -= dmg;
    enemy.flashT = 0.09;
    if (this.time - this._sfxT > 0.07) { this._sfxT = this.time; sfx.hit(); }
    const knock = Math.max(opts.baseKnock || 0, res.knockback) * (enemy.boss ? 0.1 : enemy.def.behavior === "wall" ? 0.25 : 1);
    if (knock > 0 && opts.dir) {
      enemy.kx = (enemy.kx || 0) + opts.dir[0] * knock;
      enemy.ky = (enemy.ky || 0) + opts.dir[1] * knock;
    }
    for (const st of res.addStatus) this.applyStatus(enemy, st.id, st.dur);
    if (opts.forceStatus) for (const st of opts.forceStatus) this.applyStatus(enemy, st.id, st.dur);

    const crit = res.mult > 1.01;
    this.floaters.push({
      x: enemy.x + rand(-8, 8), y: enemy.y - enemy.r - 6,
      text: String(Math.round(dmg)), t: 0.7,
      color: crit ? "#ffd76b" : "#fff", vy: -60, big: crit,
    });
    for (const b of res.banners) {
      if (chance(0.25)) this.floaters.push({ x: enemy.x, y: enemy.y - enemy.r - 24, text: b, t: 1.1, color: "#ffd76b", vy: -35, big: true });
    }
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  applyStatus(e, id, dur) {
    if (e.boss && (id === "aturdido" || id === "miedo")) dur *= 0.3;
    e.statuses[id] = Math.max(e.statuses[id] || 0, dur);
  }

  killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    if (e.say) { e.say = null; this.bubbles = Math.max(0, this.bubbles - 1); }
    const p = this.player;
    p.kills++;
    // racha de bajas: dispersar tópicos en cadena tiene premio
    this.streak++;
    this.streakT = 2.5;
    if (this.streak > 0 && this.streak % 15 === 0) {
      this.floaters.push({ x: e.x, y: e.y - 30, text: `¡RATXA x${this.streak}!`, t: 1.3, color: "#ffd76b", vy: -40, big: true });
      this.pickups.push({ x: e.x, y: e.y, type: "coin", val: 3, emoji: "🪙" });
    }
    const xpMul = this.turbo ? 3 : 1;
    this.pickups.push({ x: e.x + rand(-6, 6), y: e.y + rand(-6, 6), type: "xp", val: e.def.xp * xpMul, emoji: "🎫" });
    if (chance(0.13)) this.pickups.push({ x: e.x + rand(-12, 12), y: e.y + rand(-12, 12), type: "coin", val: randInt(1, 3), emoji: "🪙" });
    if (chance(0.025)) this.pickups.push({ x: e.x, y: e.y, type: "heal", val: 15, emoji: "🍅" });
    this.effects.push({ type: "pop", x: e.x, y: e.y, emoji: e.def.emoji, t: 0.35, dur: 0.35 });

    if (e.boss) {
      this.boss = null;
      this.over = true;
      this.result = { victory: true };
      sfx.victory();
      this.cb.gameOver(this.buildResult());
    }
    // la cola del free tour se desorienta si cae el guía
    if (e.def.behavior === "conga") {
      for (const f of this.enemies) {
        if (f.state && f.state.leader === e) { f.state.leader = null; }
      }
    }
  }

  // ------------------------------------------------------------ enemigos
  spawnEnemy(id, x, y, elite = false) {
    const def = ENEMIES[id];
    const e = {
      def, x, y, r: def.r, hp: def.hp, maxHp: def.hp,
      statuses: {}, state: {}, kx: 0, ky: 0,
      attackCd: rand(0, 0.4), sayT: rand(4, 14), elite,
      // aspecto: tono de piel/pelo al azar de una paleta diversa (así es la
      // ciudad); el spec puede fijarlo (mimo pintado, guiri gamba...)
      skin: def.sprite?.skin || pick(SKIN_TONES),
      hairTone: pick(HAIR_TONES),
      phase: rand(TAU), face: chance(0.5) ? 1 : -1, flashT: 0,
    };
    if (elite) {
      e.hp = e.maxHp = def.hp * 3.5;
      e.r = def.r * 1.35;
    }
    const scale = 1 + this.time / 240; // escalado de vida con el tiempo
    e.hp = e.maxHp = e.hp * scale;
    this.enemies.push(e);
    return e;
  }

  spawnAtRing(id, elite) {
    const p = this.player;
    const a = rand(TAU);
    const d = rand(480, 640);
    const def = ENEMIES[id];
    if (def.behavior === "conga") {
      const head = this.spawnEnemy(id, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, elite);
      let prev = head;
      for (let i = 0; i < def.special.followers; i++) {
        const f = this.spawnEnemy(id, head.x + rand(-20, 20), head.y + rand(-20, 20), false);
        f.state.leader = prev;
        f.follower = true;
        f.spriteOverride = def.spriteFollower;
        f.hp = f.maxHp = f.hp * 0.6;
        prev = f;
      }
      return;
    }
    if (def.behavior === "pack") { // la banda llega junta, como debe ser
      for (let i = 0; i < def.special.packSize; i++) {
        this.spawnEnemy(id, p.x + Math.cos(a) * d + rand(-35, 35), p.y + Math.sin(a) * d + rand(-35, 35), elite && i === 0);
      }
      return;
    }
    if (def.behavior === "wall") {
      const px = -Math.sin(a), py = Math.cos(a);
      for (let i = 0; i < def.special.rowSize; i++) {
        const off = (i - (def.special.rowSize - 1) / 2) * def.special.rowSpacing;
        const w = this.spawnEnemy(id, p.x + Math.cos(a) * d + px * off, p.y + Math.sin(a) * d + py * off, elite && i === 0);
        w.state.dir = [-Math.cos(a), -Math.sin(a)];
      }
      return;
    }
    this.spawnEnemy(id, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, elite);
  }

  enemySpeed(e) {
    let s = e.def.speed * this.globalEnemySpeed;
    if (e.statuses.empapado) s *= STATUS_INFO.empapado.slow;
    if (e.statuses.aturdido) return 0;
    if (e._spdBuff) s *= e._spdBuff;
    if (this.onSlowPatch(e.x, e.y)) s *= 0.75;
    for (const z of this.zones) { // cristales de litrona: nadie pisa fuerte
      if (z.type === "cristales" && z.telegraph <= 0 && dist(e.x, e.y, z.x, z.y) < z.r) { s *= 0.55; break; }
    }
    return s;
  }

  updateEnemies(dt) {
    const p = this.player;

    // buffs del gentrificador
    const hipsters = this.enemies.filter((e) => e.def.behavior === "buffer" && !e.dead);
    for (const e of this.enemies) { e._spdBuff = 1; e._dmgBuff = 1; }
    for (const h of hipsters) {
      const sp = h.def.special;
      for (const e of this.enemies) {
        if (e === h) continue;
        if (dist(h.x, h.y, e.x, e.y) < sp.auraR) {
          e._spdBuff = sp.speedBuff;
          e._dmgBuff = sp.dmgBuff;
        }
      }
    }

    // ¿hay una banda del altavoz cerca? El bajo te ralentiza (updatePlayer)
    this.bassSlow = false;
    for (const e of this.enemies) {
      if (e.def.behavior === "pack" && !e.dead && dist(p.x, p.y, e.x, e.y) < (e.def.special.bassR || 110)) {
        this.bassSlow = true;
        break;
      }
    }

    // el enjambre del cigarrito te atosiga hasta aturdirte
    let surround = 0;
    for (const e of this.enemies) {
      if (e.def.behavior === "swarm" && !e.dead && dist(p.x, p.y, e.x, e.y) < (e.def.special.surroundDist || 46)) surround++;
    }
    if (surround >= 6 && p.stunCd <= 0) {
      p.stunT = 0.7;
      p.stunCd = 5;
      this.floaters.push({ x: p.x, y: p.y - 30, text: "¡TE HAN RODEADO!", t: 1, color: "#ffd76b", vy: -40, big: true });
    }

    // separación barata con rejilla para que no se apilen
    const grid = new Map();
    const gs = 48;
    for (const e of this.enemies) {
      const k = `${Math.floor(e.x / gs)},${Math.floor(e.y / gs)}`;
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(e);
    }

    for (const e of this.enemies) {
      if (e.dead) continue;
      e.flashT = Math.max(0, (e.flashT || 0) - dt);

      // estados
      for (const id of Object.keys(e.statuses)) {
        e.statuses[id] -= dt;
        if (e.statuses[id] <= 0) delete e.statuses[id];
      }
      if (e.statuses.ardiendo) {
        e._burnT = (e._burnT || 0) - dt;
        if (e._burnT <= 0) {
          e._burnT = 0.5;
          e.hp -= STATUS_INFO.ardiendo.dps * 0.5;
          this.floaters.push({ x: e.x, y: e.y - e.r, text: "🔥", t: 0.4, color: "#ff9c42", vy: -40 });
          if (e.hp <= 0) { this.killEnemy(e); continue; }
        }
      }

      // knockback con decaimiento
      if (e.kx || e.ky) {
        e.x += e.kx * dt; e.y += e.ky * dt;
        e.kx *= Math.pow(0.0001, dt); e.ky *= Math.pow(0.0001, dt);
        if (Math.abs(e.kx) < 4) e.kx = 0;
        if (Math.abs(e.ky) < 4) e.ky = 0;
      }

      const spd = this.enemySpeed(e);
      if (spd > 0 && !e.statuses.aturdido) {
        if (e.statuses.miedo) this.steer(e, p.x, p.y, -spd * 1.25, dt);
        else if (e.statuses.cegado) {
          e.state.wanderA = (e.state.wanderA ?? rand(TAU)) + rand(-2, 2) * dt;
          e.x += Math.cos(e.state.wanderA) * spd * dt;
          e.y += Math.sin(e.state.wanderA) * spd * dt;
        } else if (e.boss) {
          this.updateBoss(e, dt, spd);
        } else {
          this.updateBehavior(e, dt, spd);
        }
      }

      // separación
      if (!e.follower) {
        const cx = Math.floor(e.x / gs), cy = Math.floor(e.y / gs);
        for (let gx = cx - 1; gx <= cx + 1; gx++)
          for (let gy = cy - 1; gy <= cy + 1; gy++) {
            const cell = grid.get(`${gx},${gy}`);
            if (!cell) continue;
            for (const o of cell) {
              if (o === e || o.dead) continue;
              const d = dist(e.x, e.y, o.x, o.y);
              const min = (e.r + o.r) * 0.8;
              if (d < min && d > 0.001) {
                const push = ((min - d) / d) * 0.5;
                e.x += (e.x - o.x) * push;
                e.y += (e.y - o.y) * push;
              }
            }
          }
      }

      if (e.def.behavior !== "flyer") this.collideObstacles(e); // las gaviotas vuelan

      // contacto con el jugador
      e.attackCd -= dt;
      const dp = dist(p.x, p.y, e.x, e.y);
      if (dp < p.r + e.r && e.attackCd <= 0 && !(e.state.hidden)) {
        e.attackCd = 0.8;
        this.hurtPlayer(e.def.dmg * (e._dmgBuff || 1) * (e.elite ? 1.5 : 1), e.def.id);
        if (e.def.behavior === "stabber") {
          const steal = Math.min(p.coins, randInt(...e.def.special.steals));
          if (steal > 0) {
            p.coins -= steal;
            this.floaters.push({ x: p.x, y: p.y - 34, text: `-${steal} 🪙`, t: 1, color: "#ffd76b", vy: -45 });
          }
          e.state.mode = "retreat";
          e.state.modeT = 1;
        }
      }

      // bocadillos de texto
      e.sayT -= dt;
      if (e.sayT <= 0 && this.bubbles < 4 && dp < 380 && !e.state.hidden) {
        e.sayT = rand(10, 25);
        e.say = { text: pick(e.def.quotes), t: 2.2 };
        this.bubbles++;
      }
      if (e.say) {
        e.say.t -= dt;
        if (e.say.t <= 0) { e.say = null; this.bubbles = Math.max(0, this.bubbles - 1); }
      }

      // reposicionar a los que se quedan lejísimos (mantiene la presión)
      if (dp > 950 && !e.boss) {
        const a = rand(TAU);
        e.x = p.x + Math.cos(a) * 600;
        e.y = p.y + Math.sin(a) * 600;
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  }

  steer(e, tx, ty, spd, dt) {
    const [dx, dy] = norm(tx - e.x, ty - e.y);
    e.x += dx * spd * dt;
    e.y += dy * spd * dt;
  }

  updateBehavior(e, dt, spd) {
    const p = this.player;
    const S = e.state;
    const sp = e.def.special || {};
    const dp = dist(p.x, p.y, e.x, e.y);

    switch (e.def.behavior) {
      case "swarm":
        this.steer(e, p.x, p.y, spd, dt);
        break;

      case "drunk": {
        S.phase = (S.phase ?? rand(TAU)) ;
        const a = Math.atan2(p.y - e.y, p.x - e.x) + Math.sin(this.time * 2.5 + S.phase) * 0.9;
        e.x += Math.cos(a) * spd * dt;
        e.y += Math.sin(a) * spd * dt;
        S.vomitT = (S.vomitT ?? rand(...sp.vomitEvery)) - dt;
        if (S.vomitT <= 0) {
          S.vomitT = rand(...sp.vomitEvery);
          this.zones.push({ x: e.x, y: e.y, r: sp.vomitR, type: "vomito", t: sp.vomitDur, telegraph: 0, owner: "enemy" });
          if (!e.say && this.bubbles < 4) { e.say = { text: "buaAAAgh", t: 1.2 }; this.bubbles++; }
        }
        break;
      }

      case "flasher": {
        S.flashCd = Math.max(0, (S.flashCd ?? 0) - dt);
        if (S.windup !== undefined) {
          S.windup -= dt;
          if (S.windup <= 0) {
            S.windup = undefined;
            S.flashCd = sp.flashCd;
            if (dp < sp.flashRange * 1.4) {
              p.blindT = sp.blindDur;
              this.cb.flash();
              this.floaters.push({ x: e.x, y: e.y - e.r - 10, text: "📸 ¡FLASH!", t: 0.9, color: "#fff", vy: -40, big: true });
            }
          }
        } else if (dp < sp.flashRange && S.flashCd <= 0) {
          S.windup = sp.windup;
        } else {
          this.steer(e, p.x, p.y, spd, dt);
        }
        break;
      }

      case "skirmisher": {
        if (dp < sp.minDist) this.steer(e, p.x, p.y, -spd, dt);
        else if (dp > sp.maxDist) this.steer(e, p.x, p.y, spd, dt);
        else {
          S.strafe = S.strafe ?? (chance(0.5) ? 1 : -1);
          const a = Math.atan2(e.y - p.y, e.x - p.x) + (Math.PI / 2) * S.strafe;
          e.x += Math.cos(a) * spd * 0.6 * dt;
          e.y += Math.sin(a) * spd * 0.6 * dt;
        }
        S.shootT = (S.shootT ?? rand(0.5, sp.shootCd)) - dt;
        if (S.shootT <= 0 && dp < sp.maxDist + 60) {
          S.shootT = sp.shootCd;
          const [dx, dy] = norm(p.x - e.x, p.y - e.y);
          this.eProjectiles.push({
            x: e.x, y: e.y, vx: dx * sp.projSpeed, vy: dy * sp.projSpeed,
            dmg: e.def.dmg * (e._dmgBuff || 1), r: 8, emoji: sp.projEmoji, ttl: 4,
            homing: sp.homing, boomerang: sp.boomerang, slows: sp.slows, t: 0, home: { x: e.x, y: e.y },
          });
        }
        break;
      }

      case "charger": {
        S.mode = S.mode || "seek";
        if (S.mode === "seek") {
          this.steer(e, p.x, p.y, spd, dt);
          S.cd = Math.max(0, (S.cd ?? 0) - dt);
          if (dp < sp.chargeRange && S.cd <= 0) {
            S.mode = "aim";
            S.aimT = sp.windup;
            S.dir = norm(p.x - e.x, p.y - e.y);
          }
        } else if (S.mode === "aim") {
          S.aimT -= dt;
          S.dir = norm(p.x - e.x, p.y - e.y); // apunta hasta el final
          if (S.aimT <= 0) {
            S.mode = "charge";
            S.dist = 0;
            if (sp.honkKnock && dp < 130) {
              const [dx, dy] = norm(p.x - e.x, p.y - e.y);
              p.x += dx * 40; p.y += dy * 40;
              this.floaters.push({ x: e.x, y: e.y - 24, text: "¡MOOOC!", t: 0.8, color: "#ffd76b", vy: -40, big: true });
            }
          }
        } else if (S.mode === "charge") {
          const step = sp.chargeSpeed * dt;
          e.x += S.dir[0] * step;
          e.y += S.dir[1] * step;
          S.dist += step;
          if (dist(p.x, p.y, e.x, e.y) < p.r + e.r) {
            this.hurtPlayer(e.def.dmg, e.def.id);
            if (sp.breaksOnHit) { this.killEnemy(e); return; }
            S.mode = "seek"; S.cd = sp.chargeCd || 3;
          }
          if (S.dist > sp.chargeRange * 1.3) {
            if (sp.breaksOnHit && chance(0.35)) { this.killEnemy(e); return; } // se estampa solo
            S.mode = "seek"; S.cd = sp.chargeCd || 3;
          }
        }
        break;
      }

      case "conga": {
        if (e.follower) {
          const L = S.leader;
          if (!L || L.dead) { // sin guía, deambulan como guiris
            e.def = { ...e.def, behavior: "drunk", special: { vomitEvery: [6, 10], vomitR: 45, vomitDur: 4 } };
            e.follower = false;
            break;
          }
          const d = dist(e.x, e.y, L.x, L.y);
          const spacing = ENEMIES.freetour.special.spacing;
          if (d > spacing) this.steer(e, L.x, L.y, spd * 1.6, dt);
        } else {
          this.steer(e, p.x, p.y, spd, dt);
        }
        break;
      }

      case "caster": {
        if (dp > sp.castRange * 0.8) this.steer(e, p.x, p.y, spd, dt);
        else if (dp < sp.castRange * 0.4) this.steer(e, p.x, p.y, -spd * 0.7, dt);
        S.castT = (S.castT ?? rand(1, sp.castCd)) - dt;
        if (S.castT <= 0 && dp < sp.castRange) {
          S.castT = sp.castCd;
          this.zones.push({
            x: p.x, y: p.y, r: sp.zoneR, type: sp.zoneType,
            t: sp.zoneDur, telegraph: sp.telegraph, owner: "enemy",
          });
        }
        break;
      }

      case "ambush": {
        if (S.mode === undefined) { S.mode = "hidden"; S.hidden = true; }
        if (S.mode === "hidden") {
          if (dp < sp.triggerDist) {
            S.mode = "lunge";
            S.hidden = false;
            S.lungeT = sp.lungeDur;
            S.dir = norm(p.x - e.x, p.y - e.y);
            this.floaters.push({ x: e.x, y: e.y - e.r - 12, text: "¡¡BU!!", t: 0.8, color: "#fff", vy: -50, big: true });
          }
        } else if (S.mode === "lunge") {
          S.lungeT -= dt;
          e.x += S.dir[0] * sp.lungeSpeed * dt;
          e.y += S.dir[1] * sp.lungeSpeed * dt;
          if (S.lungeT <= 0) { S.mode = "chase"; }
        } else {
          this.steer(e, p.x, p.y, 40, dt); // agotado tras el susto
        }
        break;
      }

      case "stabber": {
        S.mode = S.mode || "in";
        if (S.mode === "in") {
          this.steer(e, p.x, p.y, spd, dt);
          // el zigzag: desviación lateral senoidal
          const a = Math.atan2(p.y - e.y, p.x - e.x) + Math.PI / 2;
          const zig = Math.sin(this.time * 8 + (S.zigPhase ?? (S.zigPhase = rand(TAU)))) * spd * 0.5;
          e.x += Math.cos(a) * zig * dt;
          e.y += Math.sin(a) * zig * dt;
        } else {
          S.modeT -= dt;
          this.steer(e, p.x, p.y, -sp.dashSpeed * 0.8, dt);
          if (S.modeT <= 0) S.mode = "in";
        }
        break;
      }

      case "rider": {
        S.retargetT = (S.retargetT ?? 0) - dt;
        if (S.retargetT <= 0 || !S.target) {
          S.retargetT = rand(...sp.retargetEvery);
          S.target = { x: p.x + rand(-180, 180), y: p.y + rand(-180, 180) };
        }
        this.steer(e, S.target.x, S.target.y, spd, dt);
        break;
      }

      case "wall": {
        const dir = S.dir || norm(p.x - e.x, p.y - e.y);
        // recalcula MUY lentamente, como sus ideas
        if (chance(0.005)) S.dir = norm(p.x - e.x, p.y - e.y);
        e.x += dir[0] * spd * dt;
        e.y += dir[1] * spd * dt;
        break;
      }

      case "buffer": {
        if (dp > 220) this.steer(e, p.x, p.y, spd, dt);
        else if (dp < 120) this.steer(e, p.x, p.y, -spd, dt);
        break;
      }

      case "pack": { // la banda: cohesión de grupo + perreo intimidatorio
        let cx = 0, cy = 0, n = 0;
        for (const o of this.enemies) {
          if (o.def.id !== e.def.id || o.dead) continue;
          if (dist(e.x, e.y, o.x, o.y) < 140) { cx += o.x; cy += o.y; n++; }
        }
        this.steer(e, p.x, p.y, spd, dt);
        if (n > 1) this.steer(e, cx / n, cy / n, spd * 0.4, dt); // no se separan del altavoz
        break;
      }

      case "puller": { // promotor: su lista VIP es un agujero gravitacional
        if (dp > sp.pullRange * 0.9) this.steer(e, p.x, p.y, spd, dt);
        else if (dp < 90) this.steer(e, p.x, p.y, -spd * 0.8, dt);
        if (dp < sp.pullRange && p.immobT <= 0 && p.stunT <= 0) {
          const [dx, dy] = norm(e.x - p.x, e.y - p.y);
          p.x += dx * sp.pullForce * dt;
          p.y += dy * sp.pullForce * dt;
          S.vipT = (S.vipT ?? 0) - dt;
          if (S.vipT <= 0) {
            S.vipT = sp.pullCd;
            this.floaters.push({ x: e.x, y: e.y - e.r - 14, text: "¡LISTA VIP, BRO!", t: 1, color: "#c98cff", vy: -35, big: true });
          }
        }
        break;
      }

      case "flyer": { // gaviota: vuela sobre todo y roba tickets
        S.mode = S.mode || "circle";
        if (S.mode === "circle") {
          S.orbA = (S.orbA ?? rand(TAU)) + dt * 1.4;
          const tx = p.x + Math.cos(S.orbA) * sp.circleR;
          const ty = p.y + Math.sin(S.orbA) * sp.circleR;
          this.steer(e, tx, ty, spd, dt);
          S.swoopT = (S.swoopT ?? rand(1, sp.swoopCd)) - dt;
          if (S.swoopT <= 0) {
            S.mode = "swoop";
            S.swoopT = sp.swoopCd;
            S.dir = norm(p.x - e.x, p.y - e.y);
            S.dist = 0;
            S.stole = false;
          }
        } else {
          const step = sp.swoopSpeed * dt;
          e.x += S.dir[0] * step;
          e.y += S.dir[1] * step;
          S.dist += step;
          if (!S.stole) { // al pasar, te roba un ticket del suelo
            for (const pk of this.pickups) {
              if (pk.type === "xp" && !pk.taken && dist(e.x, e.y, pk.x, pk.y) < 26) {
                pk.taken = true;
                S.stole = true;
                this.floaters.push({ x: e.x, y: e.y - 26, text: "¡SKRAAA! 🎫", t: 1, color: "#fff", vy: -45, big: true });
                break;
              }
            }
          }
          if (S.dist > sp.circleR * 2.4) S.mode = "circle";
        }
        break;
      }

      default:
        this.steer(e, p.x, p.y, spd, dt);
    }
  }

  // ------------------------------------------------------------ jefes
  spawnBoss() {
    const def = BOSSES[this.biome.boss];
    const p = this.player;
    const a = rand(TAU);
    const e = {
      def: { ...def, behavior: "boss", quotes: [def.intro] },
      x: p.x + Math.cos(a) * 520, y: p.y + Math.sin(a) * 520,
      r: def.r, hp: def.hp, maxHp: def.hp,
      statuses: {}, state: { atkT: 2 }, kx: 0, ky: 0,
      attackCd: 0, sayT: 0.5, boss: true, ai: def.ai,
      skin: def.sprite?.skin || pick(SKIN_TONES), hairTone: pick(HAIR_TONES),
      phase: rand(TAU), face: 1, flashT: 0,
    };
    if (this.turbo) { e.hp = e.maxHp = def.hp * 0.35; }
    this.enemies.push(e);
    this.boss = e;
    this.bossSpawned = true;
    this.cb.toast(`⚠️ ${def.name} ⚠️`);
    sfx.boss();
    this.shake = 10;
  }

  updateBoss(e, dt, spd) {
    const p = this.player;
    const S = e.state;
    const dp = dist(p.x, p.y, e.x, e.y);
    S.atkT = (S.atkT ?? 2) - dt;
    const enraged = e.hp < e.maxHp * 0.4;

    switch (e.ai) {
      case "bossTurista": {
        S.seq = S.seq ?? 0;
        if (S.charging) {
          e.x += S.dir[0] * 380 * dt;
          e.y += S.dir[1] * 380 * dt;
          S.chargeD += 380 * dt;
          if (dist(p.x, p.y, e.x, e.y) < p.r + e.r) { this.hurtPlayer(e.def.dmg, "boss"); S.charging = false; }
          if (S.chargeD > 500) S.charging = false;
          return;
        }
        this.steer(e, p.x, p.y, spd * (enraged ? 1.4 : 1), dt);
        if (S.atkT <= 0) {
          S.atkT = enraged ? 2.2 : 3.2;
          const move = S.seq % 4; S.seq++;
          if (move === 0) { // embestida en segway
            S.charging = true; S.chargeD = 0; S.dir = norm(p.x - e.x, p.y - e.y);
            this.floaters.push({ x: e.x, y: e.y - e.r - 14, text: "¡SEGWAY TIME!", t: 1, color: "#ffd76b", vy: -35, big: true });
          } else if (move === 1) { // selfie flash
            if (dp < 230) { p.blindT = 1.4; this.cb.flash(); }
            this.floaters.push({ x: e.x, y: e.y - e.r - 14, text: "📸 SELFIEEE", t: 1, color: "#fff", vy: -35, big: true });
          } else if (move === 2) { // barra libre de vómito
            for (let i = 0; i < 3; i++)
              this.zones.push({ x: p.x + rand(-120, 120), y: p.y + rand(-120, 120), r: 55, type: "vomito", t: 5, telegraph: 0.6, owner: "enemy" });
          } else { // llama a la despedida de soltero
            for (let i = 0; i < 5; i++) this.spawnAtRing("guiri", false);
          }
        }
        break;
      }

      case "bossCasero": {
        // EL ALQUILER: barra que sube; al llenarse, reforma sorpresa
        S.rent = (S.rent ?? 0) + dt / (this.turbo ? 18 : 40);
        if (S.rent >= 1) {
          S.rent = 0;
          this.enemyBuffStacks++;
          this.cb.toast("🔑 ¡EL ALQUILER HA SUBIDO! Reforma sorpresa");
          for (let i = 0; i < 3; i++)
            this.zones.push({ x: p.x + rand(-150, 150), y: p.y + rand(-150, 150), r: 75, type: "obra", t: 4, telegraph: 1, owner: "enemy" });
          for (const en of this.enemies) if (!en.boss) { en.hp *= 1.1; en.maxHp *= 1.1; }
        }
        this.steer(e, p.x, p.y, spd, dt);
        if (S.atkT <= 0) {
          S.atkT = enraged ? 1.8 : 2.8;
          const move = (S.seq = (S.seq ?? 0) + 1) % 3;
          if (move === 0) { // manojo de llaves
            for (let i = -1; i <= 1; i++) {
              const a = Math.atan2(p.y - e.y, p.x - e.x) + i * 0.3;
              this.eProjectiles.push({ x: e.x, y: e.y, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, dmg: 12, r: 9, emoji: "🔑", ttl: 3.5 });
            }
          } else if (move === 1) { // invoca visitas del piso
            this.spawnAtRing("hipster", false);
            this.spawnAtRing("charo", false);
          } else {
            this.zones.push({ x: p.x, y: p.y, r: 80, type: "denuncia", t: 3, telegraph: 1, owner: "enemy" });
            this.floaters.push({ x: e.x, y: e.y - e.r - 14, text: "¡CLÁUSULA ABUSIVA!", t: 1, color: "#ffd76b", vy: -35, big: true });
          }
        }
        break;
      }

      case "bossVirtuoso": {
        S.tpT = (S.tpT ?? 8) - dt;
        if (S.tpT <= 0) { // se cambia de vagón
          S.tpT = 8;
          const a = rand(TAU);
          e.x = p.x + Math.cos(a) * 260;
          e.y = p.y + Math.sin(a) * 260;
          this.effects.push({ type: "pop", x: e.x, y: e.y, emoji: "🚇", t: 0.5, dur: 0.5 });
        }
        if (dp > 300) this.steer(e, p.x, p.y, spd, dt);
        if (S.atkT <= 0) {
          S.atkT = enraged ? 1.6 : 2.4;
          const move = (S.seq = (S.seq ?? 0) + 1) % 3;
          if (move === 2 && dp < 420) { // el público se arremolina: te absorbe
            const [dx, dy] = norm(e.x - p.x, e.y - p.y);
            p.x += dx * 70; p.y += dy * 70;
            this.floaters.push({ x: e.x, y: e.y - e.r - 14, text: "🎻 DESPACITO (otra vez)", t: 1.2, color: "#ffd76b", vy: -30, big: true });
          } else { // anillo de corcheas
            const n = enraged ? 12 : 8;
            for (let i = 0; i < n; i++) {
              const a = (TAU / n) * i + rand(0.2);
              this.eProjectiles.push({ x: e.x, y: e.y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, dmg: 10, r: 8, emoji: "🎵", ttl: 3 });
            }
          }
        }
        break;
      }

      case "bossTopmanta": {
        if (dp < 130) { // pliega la manta y reaparece lejos
          const a = rand(TAU);
          e.x = p.x + Math.cos(a) * 280;
          e.y = p.y + Math.sin(a) * 280;
          this.effects.push({ type: "pop", x: e.x, y: e.y, emoji: "🛍️", t: 0.5, dur: 0.5 });
        } else if (dp > 260) this.steer(e, p.x, p.y, spd, dt);
        if (S.atkT <= 0) {
          S.atkT = enraged ? 1.4 : 2.2;
          const move = (S.seq = (S.seq ?? 0) + 1) % 4;
          if (move === 3) { // convoca al gremio
            this.spawnAtRing("mantero", false);
            this.spawnAtRing("latero", false);
            this.spawnAtRing("ratero", false);
          } else { // liquidación de stock
            for (let i = -2; i <= 2; i++) {
              const a = Math.atan2(p.y - e.y, p.x - e.x) + i * 0.22;
              this.eProjectiles.push({ x: e.x, y: e.y, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, dmg: 11, r: 9, emoji: pick(["⌚", "👜", "👟"]), ttl: 3.5 });
            }
          }
        }
        break;
      }

      case "bossGrua": {
        this.steer(e, p.x, p.y, spd, dt);
        S.girderT = (S.girderT ?? 2) - dt;
        if (S.girderT <= 0) { // lluvia de vigas
          S.girderT = enraged ? 1.1 : 2.4;
          this.zones.push({ x: p.x + rand(-140, 140), y: p.y + rand(-140, 140), r: 65, type: "obra", t: 0.7, telegraph: 1.1, owner: "enemy" });
        }
        if (S.atkT <= 0) {
          S.atkT = 12;
          // anillo de vallas: encierra al jugador con las obras
          this.cb.toast("🚧 CALLE CORTADA POR OBRAS 🚧");
          for (let i = 0; i < 8; i++) {
            const a = (TAU / 8) * i;
            this.dynObstacles.push({ x: p.x + Math.cos(a) * 170, y: p.y + Math.sin(a) * 170, r: 24, emoji: "🚧", ttl: 6 });
          }
          this.spawnAtRing("rider", false);
          this.spawnAtRing("patinete", false);
        }
        break;
      }
    }
  }

  // ------------------------------------------------------------ proyectiles
  updateProjectiles(dt) {
    const p = this.player;

    // proyectiles del jugador
    for (const pr of this.projectiles) {
      pr.ttl -= dt;
      if (pr.bomb) {
        pr.t += dt;
        const k = Math.min(1, pr.t / pr.dur);
        pr.x = pr.x0 + (pr.x1 - pr.x0) * k;
        pr.y = pr.y0 + (pr.y1 - pr.y0) * k - Math.sin(k * Math.PI) * 60;
        if (k >= 1) {
          pr.ttl = 0;
          this.effects.push({ type: "boom", x: pr.x1, y: pr.y1, r: pr.radius, t: 0.4, dur: 0.4, glass: pr.bottle });
          this.shake = 4;
          sfx.boom();
          for (const e of this.enemies) {
            if (dist(pr.x1, pr.y1, e.x, e.y) < pr.radius + e.r) {
              this.applyHit(e, pr.dmg, pr.tags, {
                dir: norm(e.x - pr.x1, e.y - pr.y1), baseKnock: 140,
                forceStatus: pr.bottle ? [{ id: "empapado", dur: 4 }] : undefined,
              });
            }
          }
          this.zones.push(pr.bottle
            ? { x: pr.x1, y: pr.y1, r: pr.radius * 0.9, type: "cristales", t: pr.zoneDur, telegraph: 0, owner: "player" }
            : {
              x: pr.x1, y: pr.y1, r: pr.radius * 0.85, type: "salsa",
              t: pr.dotDur, telegraph: 0, owner: "player",
              dotDmg: pr.dotDmg, tags: ["picante"], tickT: 0,
            });
        }
        continue;
      }
      if (pr.homingPlayer) { // la chancla persigue hasta el final
        if (!pr.target || pr.target.dead) {
          let bd = 500; pr.target = null;
          for (const e of this.enemies) {
            const d = dist(pr.x, pr.y, e.x, e.y);
            if (d < bd && !e.state.hidden) { bd = d; pr.target = e; }
          }
          if (!pr.target) { pr.ttl = 0; continue; }
        }
        const [dx, dy] = norm(pr.target.x - pr.x, pr.target.y - pr.y);
        pr.vx += dx * 900 * dt;
        pr.vy += dy * 900 * dt;
        const [nx, ny] = norm(pr.vx, pr.vy);
        pr.vx = nx * pr.speed; pr.vy = ny * pr.speed;
        pr.rot += dt * 14;
        pr.x += pr.vx * dt;
        pr.y += pr.vy * dt;
        if (dist(pr.x, pr.y, pr.target.x, pr.target.y) < pr.target.r + 10) {
          this.applyHit(pr.target, pr.dmg, pr.tags, { dir: [nx, ny], baseKnock: 100 });
          pr.ttl = 0;
        }
        continue;
      }
      // bocata boomerang
      pr.rot += dt * 10;
      if (pr.phase === "out") {
        pr.vx *= Math.pow(0.05, dt);
        pr.vy *= Math.pow(0.05, dt);
        if (Math.hypot(pr.vx, pr.vy) < 40) { pr.phase = "back"; pr.hit.clear(); }
      } else {
        const [dx, dy] = norm(p.x - pr.x, p.y - pr.y);
        pr.vx = dx * pr.speed;
        pr.vy = dy * pr.speed;
        if (dist(p.x, p.y, pr.x, pr.y) < 24) pr.ttl = 0;
      }
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      for (const e of this.enemies) {
        if (pr.hit.has(e)) continue;
        if (dist(pr.x, pr.y, e.x, e.y) < e.r + 12) {
          pr.hit.add(e);
          this.applyHit(e, pr.dmg, pr.tags, { dir: norm(pr.vx, pr.vy), baseKnock: 80 });
        }
      }
    }
    this.projectiles = this.projectiles.filter((pr) => pr.ttl > 0);

    // proyectiles enemigos
    for (const pr of this.eProjectiles) {
      pr.ttl -= dt;
      pr.t = (pr.t || 0) + dt;
      if (pr.homing) { // opiniones de cuñado: te siguen despacio
        const [dx, dy] = norm(p.x - pr.x, p.y - pr.y);
        const sp = Math.hypot(pr.vx, pr.vy);
        pr.vx += dx * 200 * dt;
        pr.vy += dy * 200 * dt;
        const [nx, ny] = norm(pr.vx, pr.vy);
        pr.vx = nx * sp; pr.vy = ny * sp;
      }
      if (pr.boomerang && pr.t > 1.1 && !pr.returning) { // esteladas: vuelven
        pr.returning = true;
        pr.vx *= -1; pr.vy *= -1;
      }
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      if (dist(p.x, p.y, pr.x, pr.y) < p.r + pr.r) {
        this.hurtPlayer(pr.dmg, "proyectil");
        if (pr.slows) p.stickT = 1.4; // flyer de kebab pegado al zapato
        pr.ttl = 0;
      }
    }
    this.eProjectiles = this.eProjectiles.filter((pr) => pr.ttl > 0);
  }

  // ------------------------------------------------------------ zonas
  updateZones(dt) {
    const p = this.player;
    for (const z of this.zones) {
      if (z.telegraph > 0) {
        z.telegraph -= dt;
        if (z.telegraph <= 0 && z.type === "obra") {
          // impacto de viga al terminar el telegrafiado
          this.shake = 5;
          if (dist(p.x, p.y, z.x, z.y) < z.r + p.r) this.hurtPlayer(22, "boss");
        }
        continue;
      }
      z.t -= dt;
      if (z.type === "salsa") { // charco de brava: daña enemigos (pasa por las reglas)
        z.tickT -= dt;
        if (z.tickT <= 0) {
          z.tickT = 0.5;
          for (const e of this.enemies) {
            if (dist(z.x, z.y, e.x, e.y) < z.r + e.r) {
              this.applyHit(e, z.dotDmg, z.tags, {});
            }
          }
        }
      }
      if (z.type === "obra" && z.owner === "enemy") {
        if (dist(p.x, p.y, z.x, z.y) < z.r && p.iframe <= 0) this.hurtPlayer(8, "boss");
      }
      if (z.type === "denuncia" && dist(p.x, p.y, z.x, z.y) < z.r) {
        p.immobT = Math.max(p.immobT, 0.15);
      }
    }
    this.zones = this.zones.filter((z) => z.t > 0);

    for (const o of this.dynObstacles) o.ttl -= dt;
    this.dynObstacles = this.dynObstacles.filter((o) => o.ttl > 0);
  }

  // ------------------------------------------------------------ pickups / xp
  updatePickups(dt) {
    const p = this.player;
    for (const pk of this.pickups) {
      const d = dist(p.x, p.y, pk.x, pk.y);
      if (d < p.magnetR) {
        const [dx, dy] = norm(p.x - pk.x, p.y - pk.y);
        const pull = 240 + (p.magnetR - d) * 4;
        pk.x += dx * pull * dt;
        pk.y += dy * pull * dt;
      }
      if (d < p.r + 10) {
        pk.taken = true;
        if (pk.type === "xp") {
          this.gainXp(pk.val);
          if (this.time - (this._pickT || 0) > 0.09) { this._pickT = this.time; sfx.pickup(); }
        } else if (pk.type === "coin") {
          p.coins += Math.round(pk.val * this.coinMult);
          sfx.coin();
        } else if (pk.type === "heal") {
          p.hp = Math.min(p.maxHp, p.hp + pk.val);
          this.floaters.push({ x: p.x, y: p.y - 24, text: `+${pk.val} 🍅`, t: 0.9, color: "#7dde8b", vy: -45 });
        }
      }
    }
    this.pickups = this.pickups.filter((pk) => !pk.taken);
  }

  gainXp(v) {
    const p = this.player;
    p.xp += v;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.level++;
      p.xpNext = Math.floor(8 + p.level * 6 + p.level * p.level * 0.7);
      this.levelUpsQueued = (this.levelUpsQueued || 0) + 1;
    }
    if (this.levelUpsQueued > 0 && !this.levelUpActive) {
      this.levelUpActive = true;
      this.cb.levelUp();
    }
  }

  // main.js llama a esto tras aplicar una carta: ¿quedan niveles en cola?
  consumeLevelUp() {
    this.levelUpsQueued--;
    if (this.levelUpsQueued > 0) return true;
    this.levelUpActive = false;
    return false;
  }

  // ------------------------------------------------------------ cartas de mejora
  getUpgradeChoices() {
    const p = this.player;
    const owned = new Set(p.weapons.map((w) => w.def.id));
    const pool = [];

    for (const w of p.weapons) {
      if (w.level < MAX_WEAPON_LEVEL) {
        pool.push({
          kind: "upgrade", weapon: w, weight: 3,
          emoji: w.def.emoji, name: `${w.def.name} +${w.level + 1}`,
          type: "mejora", desc: `Sube a nivel ${w.level + 1}. Más daño, menos paciencia.`,
        });
      }
    }
    if (p.weapons.length < this.maxWeaponSlots) {
      for (const id of Object.keys(WEAPONS)) {
        if (owned.has(id)) continue;
        const def = WEAPONS[id];
        pool.push({
          kind: "new", weaponId: id, weight: 2.5,
          emoji: def.emoji, name: def.name, type: "arma", desc: def.desc,
        });
      }
    }
    for (const ps of PASSIVES) {
      if ((p.passiveCounts[ps.id] || 0) >= 3) continue;
      pool.push({
        kind: "passive", passive: ps, weight: 2,
        emoji: ps.emoji, name: ps.name, type: "pasiva", desc: ps.desc,
      });
    }
    for (const sy of SYNERGIES) {
      if (p.synergiesTaken.has(sy.id)) continue;
      if (!sy.needs.every((n) => owned.has(n))) continue;
      pool.push({
        kind: "synergy", synergy: sy, weight: 5,
        emoji: sy.emoji, name: sy.name, type: "sinergia", desc: sy.desc,
      });
    }

    const choices = [];
    const bag = [...pool];
    while (choices.length < 3 && bag.length) {
      const c = weightedPick(bag, (i) => i.weight);
      bag.splice(bag.indexOf(c), 1);
      choices.push(c);
    }
    return choices;
  }

  applyChoice(c) {
    const p = this.player;
    if (c.kind === "upgrade") c.weapon.level++;
    else if (c.kind === "new") this.addWeapon(c.weaponId);
    else if (c.kind === "passive") {
      c.passive.apply(p);
      p.passiveCounts[c.passive.id] = (p.passiveCounts[c.passive.id] || 0) + 1;
    } else if (c.kind === "synergy") {
      p.synergiesTaken.add(c.synergy.id);
      this.rules.add(c.synergy.rule); // ¡regla nueva en caliente!
      sfx.synergy();
      this.cb.toast(`✨ Nueva regla de combate: ${c.synergy.name}`);
    }
  }

  // ------------------------------------------------------------ director de oleadas
  director(dt) {
    if (!this.bossSpawned && this.time >= this.bossTime) this.spawnBoss();

    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    const t = this.time * (this.turbo ? 6 : 1);
    this.spawnT = Math.max(0.35, 1.5 - t * 0.0018) / this.spawnRateMult;
    const maxEnemies = Math.min(220, 25 + t * 0.45) * (this.boss ? 0.6 : 1);
    if (this.enemies.length >= maxEnemies) return;

    const avail = this.biome.spawns.filter((s) => t >= s.from);
    const batch = 1 + Math.floor(t / 75);
    for (let i = 0; i < batch; i++) {
      const s = weightedPick(avail, (x) => x.w);
      const elite = t > this.eliteFrom && chance(0.08 * this.eliteChanceMult);
      this.spawnAtRing(s.id, elite);
    }
  }

  craneRain(dt) {
    // hazard ambiental de la Sagrada Família: vigas incluso antes del jefe
    this.craneT -= dt;
    if (this.craneT <= 0) {
      this.craneT = rand(4, 7);
      const p = this.player;
      this.zones.push({ x: p.x + rand(-200, 200), y: p.y + rand(-200, 200), r: 60, type: "obra", t: 0.6, telegraph: 1.2, owner: "enemy" });
    }
  }

  // ------------------------------------------------------------ flotantes
  updateFloaters(dt) {
    this.streakT -= dt;
    if (this.streakT <= 0) this.streak = 0;
    for (const f of this.floaters) {
      f.t -= dt;
      f.y += (f.vy || -50) * dt;
    }
    this.floaters = this.floaters.filter((f) => f.t > 0);
    for (const fx of this.effects) fx.t -= dt;
    this.effects = this.effects.filter((fx) => fx.t > 0);
  }
}

export { STATUS_INFO };
