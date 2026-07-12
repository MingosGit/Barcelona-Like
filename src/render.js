// ---------------------------------------------------------------------------
// Render 2D en canvas: estética cartoon exagerada a base de emoji + formas.
// La cámara sigue al jugador; el mundo es infinito.
// ---------------------------------------------------------------------------
import { TAU, clamp, hash2 } from "./util.js";
import { STATUS_INFO } from "./game.js";

const ZONE_STYLE = {
  vomito: { fill: "rgba(140,180,60,.32)", stroke: "rgba(140,180,60,.7)", icon: "🤢" },
  denuncia: { fill: "rgba(240,210,80,.28)", stroke: "rgba(240,210,80,.8)", icon: "📜" },
  asamblea: { fill: "rgba(150,100,220,.25)", stroke: "rgba(150,100,220,.7)", icon: "✊" },
  salsa: { fill: "rgba(230,90,40,.30)", stroke: "rgba(230,90,40,.8)", icon: "🌶️" },
  obra: { fill: "rgba(255,140,30,.30)", stroke: "rgba(255,140,30,.9)", icon: "⚠️" },
};

export function render(game, ctx, W, H) {
  const p = game.player;
  const shx = (Math.random() - 0.5) * game.shake;
  const shy = (Math.random() - 0.5) * game.shake;
  const camX = p.x - W / 2 + shx;
  const camY = p.y - H / 2 + shy;
  const b = game.biome;

  // ---- suelo
  ctx.fillStyle = b.ground;
  ctx.fillRect(0, 0, W, H);
  const tile = 170;
  const x0 = Math.floor(camX / tile), x1 = Math.floor((camX + W) / tile);
  const y0 = Math.floor(camY / tile), y1 = Math.floor((camY + H) / tile);
  ctx.fillStyle = b.groundAlt;
  for (let tx = x0; tx <= x1; tx++)
    for (let ty = y0; ty <= y1; ty++) {
      if ((tx + ty) % 2 === 0) ctx.fillRect(tx * tile - camX, ty * tile - camY, tile, tile);
    }
  // toallas de la Barceloneta (parches lentos)
  if (b.slowPatches) {
    const st = 130;
    const sx0 = Math.floor(camX / st), sx1 = Math.floor((camX + W) / st);
    const sy0 = Math.floor(camY / st), sy1 = Math.floor((camY + H) / st);
    for (let tx = sx0; tx <= sx1; tx++)
      for (let ty = sy0; ty <= sy1; ty++) {
        if (hash2(tx, ty, game.seed + 77) < 0.14) {
          const cx = tx * st + st / 2 - camX, cy = ty * st + st / 2 - camY;
          ctx.fillStyle = ["#e8788b66", "#6bb3e055", "#e0c76b55"][Math.floor(hash2(tx, ty, 5) * 3)];
          ctx.fillRect(cx - 42, cy - 26, 84, 52);
        }
      }
  }

  // ---- zonas
  for (const z of game.zones) {
    const zx = z.x - camX, zy = z.y - camY;
    if (zx < -150 || zx > W + 150 || zy < -150 || zy > H + 150) continue;
    const st = ZONE_STYLE[z.type];
    if (!st) continue;
    if (z.telegraph > 0) {
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = st.stroke;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(zx, zy, z.r, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "20px serif";
      ctx.textAlign = "center";
      ctx.fillText(st.icon, zx, zy + 7);
    } else {
      ctx.fillStyle = st.fill;
      ctx.beginPath();
      ctx.arc(zx, zy, z.r, 0, TAU);
      ctx.fill();
      ctx.font = "18px serif";
      ctx.textAlign = "center";
      ctx.globalAlpha = 0.7;
      ctx.fillText(st.icon, zx, zy + 6);
      ctx.globalAlpha = 1;
    }
  }

  // ---- obstáculos
  for (const o of game.obstaclesNear(p.x, p.y, Math.max(W, H) * 0.7)) {
    const ox = o.x - camX, oy = o.y - camY;
    if (ox < -60 || ox > W + 60 || oy < -60 || oy > H + 60) continue;
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.beginPath();
    ctx.ellipse(ox, oy + o.r * 0.55, o.r, o.r * 0.4, 0, 0, TAU);
    ctx.fill();
    ctx.font = `${Math.round(o.r * 2)}px serif`;
    ctx.textAlign = "center";
    ctx.fillText(o.emoji, ox, oy + o.r * 0.6);
  }

  // ---- pickups
  ctx.font = "16px serif";
  for (const pk of game.pickups) {
    const px = pk.x - camX, py = pk.y - camY;
    if (px < -30 || px > W + 30 || py < -30 || py > H + 30) continue;
    ctx.fillText(pk.emoji, px, py + 6);
  }

  // ---- efectos de armas activos (aura, rayos, paraguas)
  for (const w of p.weapons) {
    const st = w.def.levels[w.level - 1];
    const S = w.state;
    const px = p.x - camX, py = p.y - camY;
    if (w.def.kind === "aura") {
      ctx.fillStyle = "rgba(160,40,80,.16)";
      ctx.strokeStyle = "rgba(180,50,90,.45)";
      ctx.beginPath();
      ctx.arc(px, py, st.radius, 0, TAU);
      ctx.fill();
      ctx.stroke();
      const bx = px + Math.cos(S.angle) * st.radius * 0.8;
      const by = py + Math.sin(S.angle) * st.radius * 0.8;
      ctx.font = "20px serif";
      ctx.fillText("🍷", bx, by + 7);
    }
    if (w.def.kind === "beam") {
      for (let i = 0; i < st.beams; i++) {
        const a = S.angle + (TAU / st.beams) * i;
        const gx = Math.cos(a), gy = Math.sin(a);
        const grad = ctx.createLinearGradient(px, py, px + gx * st.length, py + gy * st.length);
        grad.addColorStop(0, "rgba(255,240,180,.9)");
        grad.addColorStop(1, "rgba(255,240,180,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + gx * st.length, py + gy * st.length);
        ctx.stroke();
        ctx.font = "16px serif";
        ctx.fillText("💡", px + gx * st.length, py + gy * st.length + 6);
      }
    }
    if (w.def.kind === "orbit") {
      ctx.font = "22px serif";
      for (let i = 0; i < st.count; i++) {
        const a = S.angle + (TAU / st.count) * i;
        ctx.fillText("🌂", px + Math.cos(a) * st.radius, py + Math.sin(a) * st.radius + 8);
      }
    }
  }

  // ---- efectos puntuales
  for (const fx of game.effects) {
    const k = 1 - fx.t / fx.dur;
    const ex = fx.x - camX, ey = fx.y - camY;
    if (fx.type === "nova") {
      ctx.strokeStyle = `rgba(120,200,255,${1 - k})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(ex, ey, fx.r * k, 0, TAU);
      ctx.stroke();
    } else if (fx.type === "boom") {
      ctx.fillStyle = `rgba(255,${160 - k * 100},40,${0.6 * (1 - k)})`;
      ctx.beginPath();
      ctx.arc(ex, ey, fx.r * (0.5 + k * 0.5), 0, TAU);
      ctx.fill();
    } else if (fx.type === "cone") {
      ctx.fillStyle = `rgba(255,140,30,${0.5 * (1 - k)})`;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.arc(ex, ey, fx.r, fx.angle - fx.arc / 2, fx.angle + fx.arc / 2);
      ctx.closePath();
      ctx.fill();
    } else if (fx.type === "pop") {
      ctx.globalAlpha = 1 - k;
      ctx.font = `${Math.round(20 + k * 20)}px serif`;
      ctx.textAlign = "center";
      ctx.fillText(fx.emoji, ex, ey);
      ctx.globalAlpha = 1;
    } else if (fx.type === "trail") {
      ctx.strokeStyle = `rgba(120,220,180,${0.7 * (1 - k)})`;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + fx.dx * fx.len, ey + fx.dy * fx.len);
      ctx.stroke();
    }
  }

  // ---- proyectiles
  ctx.textAlign = "center";
  for (const pr of game.projectiles) {
    ctx.save();
    ctx.translate(pr.x - camX, pr.y - camY);
    if (pr.rot) ctx.rotate(pr.rot);
    ctx.font = "20px serif";
    ctx.fillText(pr.emoji, 0, 7);
    ctx.restore();
  }
  ctx.font = "18px serif";
  for (const pr of game.eProjectiles) {
    ctx.fillText(pr.emoji, pr.x - camX, pr.y - camY + 6);
  }

  // ---- enemigos
  for (const e of game.enemies) {
    const ex = e.x - camX, ey = e.y - camY;
    if (ex < -60 || ex > W + 60 || ey < -60 || ey > H + 60) continue;
    const hidden = e.state && e.state.hidden;
    ctx.globalAlpha = hidden ? 0.55 : 1;
    // sombra
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.beginPath();
    ctx.ellipse(ex, ey + e.r * 0.8, e.r * 0.9, e.r * 0.35, 0, 0, TAU);
    ctx.fill();
    // telegrafiado de carga
    if (e.state && e.state.mode === "aim" && e.state.dir) {
      ctx.strokeStyle = "rgba(255,60,60,.5)";
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + e.state.dir[0] * 140, ey + e.state.dir[1] * 140);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const size = Math.round(e.r * 2.1);
    ctx.font = `${size}px serif`;
    ctx.fillText(e.def.emoji, ex, ey + e.r * 0.7);
    if (e.elite) {
      ctx.font = "13px serif";
      ctx.fillText("👑", ex, ey - e.r - 4);
    }
    // iconos de estado
    let sx = ex - 10 * (Object.keys(e.statuses).length - 1) * 0.5;
    ctx.font = "12px serif";
    for (const id of Object.keys(e.statuses)) {
      const info = STATUS_INFO[id];
      if (info) { ctx.fillText(info.icon, sx, ey - e.r - 2); sx += 12; }
    }
    // barra de vida (solo si está tocado y no es jefe: el jefe tiene la suya)
    if (!e.boss && e.hp < e.maxHp) {
      const bw = e.r * 2;
      ctx.fillStyle = "rgba(0,0,0,.5)";
      ctx.fillRect(ex - bw / 2, ey + e.r + 4, bw, 4);
      ctx.fillStyle = "#e05252";
      ctx.fillRect(ex - bw / 2, ey + e.r + 4, bw * clamp(e.hp / e.maxHp, 0, 1), 4);
    }
    ctx.globalAlpha = 1;
    // bocadillo
    if (e.say && !hidden) {
      drawBubble(ctx, ex, ey - e.r - 16, e.say.text);
    }
  }

  // ---- jugador
  {
    const px = p.x - camX, py = p.y - camY;
    ctx.fillStyle = "rgba(0,0,0,.3)";
    ctx.beginPath();
    ctx.ellipse(px, py + 12, 13, 5, 0, 0, TAU);
    ctx.fill();
    if (!(p.iframe > 0 && Math.floor(game.time * 20) % 2 === 0)) {
      ctx.font = "30px serif";
      ctx.fillText(p.def.emoji, px, py + 10);
    }
    if (p.stunT > 0) { ctx.font = "14px serif"; ctx.fillText("💫", px, py - 22); }
    if (p.immobT > 0) { ctx.font = "14px serif"; ctx.fillText("📜", px, py - 22); }
  }

  // ---- flotantes
  ctx.textAlign = "center";
  for (const f of game.floaters) {
    ctx.globalAlpha = clamp(f.t / 0.3, 0, 1);
    ctx.font = f.big ? "bold 15px Trebuchet MS" : "bold 12px Trebuchet MS";
    ctx.strokeStyle = "rgba(0,0,0,.7)";
    ctx.lineWidth = 3;
    ctx.strokeText(f.text, f.x - camX, f.y - camY);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x - camX, f.y - camY);
    ctx.globalAlpha = 1;
  }

  // ---- noche del Gòtic
  if (b.dark) {
    const px = p.x - camX, py = p.y - camY;
    const g = ctx.createRadialGradient(px, py, 90, px, py, Math.max(W, H) * 0.75);
    g.addColorStop(0, "rgba(8,6,18,0)");
    g.addColorStop(1, "rgba(8,6,18,.88)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // ---- ceguera por flash de Charo
  if (p.blindT > 0) {
    ctx.fillStyle = `rgba(255,255,255,${clamp(p.blindT / 1.3, 0, 1) * 0.75})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawBubble(ctx, x, y, text) {
  ctx.font = "11px Trebuchet MS";
  const w = ctx.measureText(text).width + 14;
  const h = 18;
  ctx.fillStyle = "rgba(255,255,255,.92)";
  roundRect(ctx, x - w / 2, y - h, w, h, 8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 4, y);
  ctx.lineTo(x + 4, y);
  ctx.lineTo(x, y + 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#222";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y - 5.5);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
