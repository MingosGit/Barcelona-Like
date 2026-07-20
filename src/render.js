// ---------------------------------------------------------------------------
// Render 2D: sprites cartoon dibujados, mobiliario urbano, suelos con motivo
// por barrio (panot de flor, mosaico de la Rambla, adoquines...), luz de
// farolas de noche y juice general.
// ---------------------------------------------------------------------------
import { TAU, clamp, hash2 } from "./util.js";
import { STATUS_INFO } from "./game.js";
import { drawHumanoid, drawBird, drawCraneBoss, drawRat, drawRoach, drawManta } from "./sprites.js";
import { drawProp } from "./props.js";

const ZONE_STYLE = {
  vomito: { fill: "rgba(140,180,60,.32)", stroke: "rgba(140,180,60,.7)", icon: "🤢" },
  denuncia: { fill: "rgba(240,210,80,.28)", stroke: "rgba(240,210,80,.8)", icon: "📜" },
  asamblea: { fill: "rgba(150,100,220,.25)", stroke: "rgba(150,100,220,.7)", icon: "✊" },
  salsa: { fill: "rgba(230,90,40,.30)", stroke: "rgba(230,90,40,.8)", icon: "🌶️" },
  obra: { fill: "rgba(255,140,30,.30)", stroke: "rgba(255,140,30,.9)", icon: "⚠️" },
  cristales: { fill: "rgba(170,215,235,.28)", stroke: "rgba(170,215,235,.8)", icon: "🍾" },
};

export function render(game, ctx, W, H) {
  const p = game.player;
  const shx = (Math.random() - 0.5) * game.shake;
  const shy = (Math.random() - 0.5) * game.shake;
  const camX = p.x - W / 2 + shx;
  const camY = p.y - H / 2 + shy;
  const b = game.biome;
  const t = game.time;

  drawGround(game, ctx, W, H, camX, camY);

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
      ctx.arc(zx, zy, z.r * (0.7 + 0.3 * Math.sin(t * 10)), 0, TAU);
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
      if (z.type === "cristales") { // destellos de vidrio
        ctx.fillStyle = "rgba(255,255,255,.7)";
        for (let i = 0; i < 5; i++) {
          const a = i * 1.9 + z.r;
          const gx = zx + Math.cos(a) * z.r * 0.55, gy = zy + Math.sin(a) * z.r * 0.55;
          if (Math.sin(t * 6 + i * 2) > 0.4) ctx.fillRect(gx, gy, 2.5, 2.5);
        }
      }
      ctx.font = "16px serif";
      ctx.textAlign = "center";
      ctx.globalAlpha = 0.6;
      ctx.fillText(st.icon, zx, zy + 5);
      ctx.globalAlpha = 1;
    }
  }

  // ---- props (mobiliario), ordenados por Y para profundidad
  const lampGlows = [];
  const props = game.obstaclesNear(p.x, p.y, Math.max(W, H) * 0.72)
    .filter((o) => {
      const ox = o.x - camX, oy = o.y - camY;
      return ox > -90 && ox < W + 90 && oy > -90 && oy < H + 110;
    })
    .sort((a, c) => a.y - c.y);
  for (const o of props) {
    if (o.ttl !== undefined) { // valla dinámica de jefe
      drawProp(ctx, { ...o, kind: "cone", v: 0.5 }, t, b.dark);
      continue;
    }
    drawProp(ctx, { ...o, x: o.x - camX, y: o.y - camY }, t, b.dark);
    if (b.dark && (o.kind === "lamp" || o.kind === "shop")) {
      lampGlows.push({ x: o.x - camX + (o.kind === "lamp" ? 13 : 0), y: o.y - camY - (o.kind === "lamp" ? 35 : 20), r: o.kind === "lamp" ? 80 : 55 });
    }
  }

  // ---- fauna ambiental (palomas picoteando, ratas cruzando)
  if (game.ambient) {
    for (const am of game.ambient) {
      const ax = am.x - camX, ay = am.y - camY;
      if (ax < -40 || ax > W + 40 || ay < -40 || ay > H + 40) continue;
      if (am.type === "rat") {
        drawRat(ctx, ax, ay, { t, scale: 0.7, phase: am.phase, face: Math.cos(am.dir) >= 0 ? 1 : -1 });
      } else {
        // paloma: picotea; si huye, alza el vuelo
        const peck = am.flee ? 0 : Math.max(0, Math.sin(t * 6 + am.phase)) * 2;
        ctx.globalAlpha = am.flee ? clamp(am.t / 0.9, 0, 1) : 1;
        drawBird(ctx, ax, ay - (am.z || 0) + peck, { t: am.flee ? t : 0.04, scale: 0.5, phase: am.phase, face: am.flee && Math.cos(am.dir) < 0 ? -1 : 1, color: "#b9bcc8" });
        ctx.globalAlpha = 1;
      }
    }
  }

  // ---- pickups
  ctx.font = "15px serif";
  ctx.textAlign = "center";
  for (const pk of game.pickups) {
    const px = pk.x - camX, py = pk.y - camY;
    if (px < -30 || px > W + 30 || py < -30 || py > H + 30) continue;
    const bob = Math.sin(t * 4 + pk.x) * 2;
    ctx.fillText(pk.emoji, px, py + 5 + bob);
  }

  // ---- armas activas (auras, rayos, orbitales, palomas)
  drawWeaponFx(game, ctx, camX, camY, t);

  // ---- efectos puntuales
  for (const fx of game.effects) {
    const k = 1 - fx.t / fx.dur;
    const ex = fx.x - camX, ey = fx.y - camY;
    if (fx.type === "nova") {
      ctx.strokeStyle = `rgba(120,200,255,${1 - k})`;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(ex, ey, fx.r * k, 0, TAU); ctx.stroke();
      ctx.strokeStyle = `rgba(120,200,255,${(1 - k) * 0.5})`;
      ctx.beginPath(); ctx.arc(ex, ey, fx.r * k * 0.7, 0, TAU); ctx.stroke();
    } else if (fx.type === "boom") {
      ctx.fillStyle = fx.glass
        ? `rgba(170,215,235,${0.6 * (1 - k)})`
        : `rgba(255,${160 - k * 100},40,${0.6 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(ex, ey, fx.r * (0.5 + k * 0.5), 0, TAU); ctx.fill();
    } else if (fx.type === "cone") {
      const grd = ctx.createRadialGradient(ex, ey, 6, ex, ey, fx.r);
      grd.addColorStop(0, `rgba(255,200,60,${0.75 * (1 - k)})`);
      grd.addColorStop(1, `rgba(230,80,30,0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.arc(ex, ey, fx.r, fx.angle - fx.arc / 2, fx.angle + fx.arc / 2);
      ctx.closePath(); ctx.fill();
    } else if (fx.type === "slam") { // el persianazo
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(Math.atan2(fx.dy, fx.dx));
      ctx.fillStyle = `rgba(180,190,210,${0.55 * (1 - k)})`;
      ctx.fillRect(0, -fx.width / 2, fx.range * (0.4 + k * 0.6), fx.width);
      ctx.strokeStyle = `rgba(240,245,255,${0.8 * (1 - k)})`;
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const lx = fx.range * (0.3 + k * 0.6) * ((i + 1) / 3);
        ctx.beginPath(); ctx.moveTo(lx, -fx.width / 2); ctx.lineTo(lx, fx.width / 2); ctx.stroke();
      }
      ctx.restore();
    } else if (fx.type === "pop") { // puf de dispersión
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const a = (TAU / 5) * i;
        const rr = 8 + k * 18;
        ctx.beginPath();
        ctx.arc(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr, 3 * (1 - k), 0, TAU);
        ctx.stroke();
      }
      ctx.font = `${Math.round(14 + k * 10)}px serif`;
      ctx.textAlign = "center";
      ctx.fillText(fx.emoji, ex, ey - k * 14);
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
  ctx.font = "17px serif";
  for (const pr of game.eProjectiles) {
    ctx.fillText(pr.emoji, pr.x - camX, pr.y - camY + 6);
  }

  // ---- enemigos (orden por Y para profundidad)
  const seen = [...game.enemies].sort((a, c) => a.y - c.y);
  for (const e of seen) {
    const ex = e.x - camX, ey = e.y - camY;
    if (ex < -70 || ex > W + 70 || ey < -80 || ey > H + 80) continue;
    drawEnemy(game, ctx, e, ex, ey, t);
  }

  // ---- jugador
  drawPlayer(game, ctx, p, W / 2 - shx, H / 2 - shy, t);

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

  // ---- noche del Gòtic + luz de farolas
  if (b.dark) {
    const px = W / 2, py = H / 2;
    const g = ctx.createRadialGradient(px, py, 90, px, py, Math.max(W, H) * 0.75);
    g.addColorStop(0, "rgba(8,6,18,0)");
    g.addColorStop(1, "rgba(8,6,18,.88)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const lg of lampGlows) {
      const gg = ctx.createRadialGradient(lg.x, lg.y, 4, lg.x, lg.y, lg.r);
      gg.addColorStop(0, "rgba(255,214,120,.28)");
      gg.addColorStop(1, "rgba(255,214,120,0)");
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(lg.x, lg.y, lg.r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ---- racha de bajas
  if (game.streak >= 8) {
    ctx.textAlign = "center";
    ctx.font = "bold 17px Trebuchet MS";
    const pulse = 1 + Math.sin(t * 12) * 0.06;
    ctx.save();
    ctx.translate(W / 2, 96);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = "rgba(0,0,0,.7)";
    ctx.lineWidth = 4;
    ctx.strokeText(`RATXA x${game.streak}`, 0, 0);
    ctx.fillStyle = "#ffd76b";
    ctx.fillText(`RATXA x${game.streak}`, 0, 0);
    ctx.restore();
  }

  // ---- viñeta sutil: profundidad de cámara
  {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.78);
    g.addColorStop(0, "rgba(20,12,30,0)");
    g.addColorStop(1, "rgba(20,12,30,.22)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // ---- ceguera por flash
  if (p.blindT > 0) {
    ctx.fillStyle = `rgba(255,255,255,${clamp(p.blindT / 1.3, 0, 1) * 0.75})`;
    ctx.fillRect(0, 0, W, H);
  }
  // ---- vidas bajas: viñeta roja
  if (p.hp < p.maxHp * 0.25) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    g.addColorStop(0, "rgba(200,30,30,0)");
    g.addColorStop(1, `rgba(200,30,30,${0.25 + Math.sin(t * 5) * 0.1})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

// ------------------------------------------------------------ suelo
function drawGround(game, ctx, W, H, camX, camY) {
  const b = game.biome;
  ctx.fillStyle = b.ground;
  ctx.fillRect(0, 0, W, H);

  const tile = 96;
  const x0 = Math.floor(camX / tile), x1 = Math.floor((camX + W) / tile);
  const y0 = Math.floor(camY / tile), y1 = Math.floor((camY + H) / tile);

  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = y0; ty <= y1; ty++) {
      const cx = tx * tile - camX, cy = ty * tile - camY;
      const h = hash2(tx, ty, game.seed + 31);
      if ((tx + ty) % 2 === 0) {
        ctx.fillStyle = b.groundAlt;
        ctx.fillRect(cx, cy, tile, tile);
      }
      switch (b.groundKind) {
        case "panot": // la flor de Barcelona
          if (h < 0.6) drawPanot(ctx, cx + tile / 2, cy + tile / 2, "rgba(0,0,0,.07)");
          break;
        case "sand":
          ctx.fillStyle = "rgba(0,0,0,.08)";
          for (let i = 0; i < 4; i++) {
            ctx.fillRect(cx + ((h * 97 + i * 31) % tile), cy + ((h * 61 + i * 47) % tile), 2.4, 2.4);
          }
          if (h > 0.93) { ctx.font = "10px serif"; ctx.textAlign = "center"; ctx.fillText("🐚", cx + tile / 2, cy + tile / 2); }
          break;
        case "cobble":
          ctx.strokeStyle = "rgba(0,0,0,.13)";
          ctx.lineWidth = 1;
          for (let i = 0; i < 3; i++)
            for (let j = 0; j < 3; j++) {
              const ox = cx + 14 + i * 32 + (j % 2) * 14, oy = cy + 14 + j * 32;
              ctx.beginPath(); ctx.arc(ox, oy, 11, 0.15 * TAU, 0.62 * TAU); ctx.stroke();
            }
          break;
        case "mosaic": { // el paseo central: teselas discretas estilo Miró
          const worldX = tx * tile;
          const band = ((worldX % 1400) + 1400) % 1400;
          if (band < 200) {
            const cols = ["#c94f43", "#3d6ea5", "#e8c33d"];
            for (let i = 0; i < 3; i++) {
              const hh = hash2(tx, ty, game.seed + 40 + i);
              ctx.fillStyle = cols[Math.floor(hh * 3)] + "2e";
              ctx.beginPath();
              ctx.arc(cx + 16 + hh * (tile - 32), cy + 16 + hash2(tx, ty, game.seed + 50 + i) * (tile - 32), 5 + hh * 5, 0, TAU);
              ctx.fill();
            }
          } else if (h < 0.35) {
            drawPanot(ctx, cx + tile / 2, cy + tile / 2, "rgba(0,0,0,.045)");
          }
          break;
        }
        case "asphalt":
          if (h < 0.25) { // grietas
            ctx.strokeStyle = "rgba(0,0,0,.15)";
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(cx + h * 60, cy + 10);
            ctx.lineTo(cx + h * 60 + 14, cy + 40 + h * 20);
            ctx.lineTo(cx + h * 60 + 6, cy + 70);
            ctx.stroke();
          } else if (h > 0.94) { // tag de graffiti
            ctx.fillStyle = ["#c94f8880", "#3db6a580", "#e8c33d80"][Math.floor(h * 100) % 3];
            ctx.font = "bold italic 13px Trebuchet MS";
            ctx.textAlign = "center";
            ctx.fillText(["BCN", "1992", "☆", "puja el pa"][Math.floor(h * 50) % 4], cx + tile / 2, cy + tile / 2);
          } else if (h > 0.88) { // tapa de alcantarilla
            ctx.strokeStyle = "rgba(0,0,0,.2)";
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(cx + tile / 2, cy + tile / 2, 12, 0, TAU); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx + tile / 2, cy + tile / 2, 8, 0, TAU); ctx.stroke();
          }
          break;
        case "works":
          if (h < 0.2) { // huellas de rodada
            ctx.strokeStyle = "rgba(0,0,0,.1)";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(cx, cy + 30 + h * 40);
            ctx.quadraticCurveTo(cx + 48, cy + 20 + h * 60, cx + 96, cy + 34 + h * 40);
            ctx.stroke();
          } else if (h > 0.9) { // tablón olvidado
            ctx.save();
            ctx.translate(cx + tile / 2, cy + tile / 2);
            ctx.rotate(h * 3);
            ctx.fillStyle = "rgba(120,85,50,.5)";
            ctx.fillRect(-24, -5, 48, 10);
            ctx.restore();
          }
          break;
      }
      // charcos en los barrios viejos (reflejan la luz de noche)
      if ((b.id === "gotic" || b.id === "raval") && h > 0.955) {
        ctx.fillStyle = b.dark ? "rgba(150,170,230,.16)" : "rgba(80,100,130,.14)";
        ctx.beginPath();
        ctx.ellipse(cx + tile / 2, cy + tile / 2, 20 + h * 12, 10, 0.3, 0, TAU);
        ctx.fill();
        ctx.fillStyle = b.dark ? "rgba(255,225,150,.14)" : "rgba(255,255,255,.1)";
        ctx.beginPath();
        ctx.ellipse(cx + tile / 2 - 6, cy + tile / 2 - 2, 8, 3, 0.3, 0, TAU);
        ctx.fill();
      }
      // basurilla dispersa: la ciudad respira
      if (h > 0.68 && h < 0.705) {
        ctx.fillStyle = "rgba(0,0,0,.12)";
        ctx.fillRect(cx + (h * 977) % tile, cy + (h * 631) % tile, 3.5, 2.5);
        ctx.fillRect(cx + (h * 431) % tile, cy + (h * 269) % tile, 2.5, 3.5);
      }
    }
  }

  // toallas de la Barceloneta
  if (b.slowPatches) {
    const st = 130;
    const sx0 = Math.floor(camX / st), sx1 = Math.floor((camX + W) / st);
    const sy0 = Math.floor(camY / st), sy1 = Math.floor((camY + H) / st);
    for (let tx = sx0; tx <= sx1; tx++)
      for (let ty = sy0; ty <= sy1; ty++) {
        const h = hash2(tx, ty, game.seed + 77);
        if (h < 0.14) {
          const cx = tx * st + st / 2 - camX, cy = ty * st + st / 2 - camY;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate((h * 40) % 0.6 - 0.3);
          const cols = [["#e05a72", "#f0e5d2"], ["#3d6ea5", "#f0e5d2"], ["#e8a33d", "#5f9e52"]][Math.floor(h * 21) % 3];
          ctx.fillStyle = cols[0];
          ctx.fillRect(-40, -24, 80, 48);
          ctx.fillStyle = cols[1];
          for (let i = 0; i < 3; i++) ctx.fillRect(-40, -16 + i * 14, 80, 6);
          ctx.restore();
        }
      }
  }
}

function drawPanot(ctx, x, y, color) {
  // la flor de 4 pétalos del panot barcelonés (pequeña y discreta)
  ctx.fillStyle = color;
  for (let i = 0; i < 4; i++) {
    const a = (TAU / 4) * i;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 4.2, 2.8, a, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y, 1.8, 0, TAU);
  ctx.fill();
}

// ------------------------------------------------------------ armas
function drawWeaponFx(game, ctx, camX, camY, t) {
  const p = game.player;
  const px = p.x - camX, py = p.y - camY;
  for (const w of p.weapons) {
    const st = w.def.levels[w.level - 1];
    const S = w.state;
    if (w.def.kind === "aura") { // cubo de sangría
      ctx.fillStyle = "rgba(160,40,80,.14)";
      ctx.strokeStyle = "rgba(180,50,90,.5)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, st.radius, 0, TAU); ctx.fill();
      ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.arc(px, py, st.radius, t, TAU + t); ctx.stroke();
      ctx.setLineDash([]);
      // gotas orbitando
      ctx.fillStyle = "rgba(190,50,90,.85)";
      for (let i = 0; i < 5; i++) {
        const a = S.angle + (TAU / 5) * i;
        ctx.beginPath();
        ctx.arc(px + Math.cos(a) * st.radius * 0.85, py + Math.sin(a) * st.radius * 0.85, 3.4, 0, TAU);
        ctx.fill();
      }
      ctx.font = "16px serif";
      ctx.textAlign = "center";
      ctx.fillText("🍷", px + Math.cos(S.angle) * st.radius * 0.6, py + Math.sin(S.angle) * st.radius * 0.6 + 6);
    }
    if (w.def.kind === "taunt") { // olor del dürüm
      ctx.strokeStyle = "rgba(230,170,70,.4)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 10]);
      ctx.beginPath(); ctx.arc(px, py, st.radius, -t * 1.3, TAU - t * 1.3); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "14px serif";
      for (let i = 0; i < 3; i++) { // líneas de olor
        const a = t * 0.9 + i * (TAU / 3);
        const wob = Math.sin(t * 5 + i) * 5;
        ctx.fillText("〰️", px + Math.cos(a) * (st.radius * 0.6 + wob), py + Math.sin(a) * (st.radius * 0.6) + 5);
      }
      ctx.font = "15px serif";
      ctx.fillText("🌯", px + 14, py - 16);
    }
    if (w.def.kind === "beam") {
      for (let i = 0; i < st.beams; i++) {
        const a = S.angle + (TAU / st.beams) * i;
        const gx = Math.cos(a), gy = Math.sin(a);
        const grad = ctx.createLinearGradient(px, py, px + gx * st.length, py + gy * st.length);
        grad.addColorStop(0, "rgba(255,240,190,.95)");
        grad.addColorStop(1, "rgba(255,180,220,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + gx * st.length, py + gy * st.length); ctx.stroke();
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = "rgba(255,255,255,.9)";
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + gx * st.length * 0.9, py + gy * st.length * 0.9); ctx.stroke();
        // el aro de luz en la punta
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(px + gx * st.length, py + gy * st.length, 5, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(255,220,240,.8)";
        ctx.beginPath(); ctx.arc(px + gx * st.length, py + gy * st.length, 9, 0, TAU); ctx.stroke();
      }
    }
    if (w.def.kind === "orbit") { // paraguas dibujados
      for (let i = 0; i < st.count; i++) {
        const a = S.angle + (TAU / st.count) * i;
        const ux = px + Math.cos(a) * st.radius, uy = py + Math.sin(a) * st.radius;
        ctx.save();
        ctx.translate(ux, uy);
        ctx.rotate(a + Math.PI / 2);
        ctx.strokeStyle = "#241b2e";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, 14); ctx.stroke();
        ctx.fillStyle = "#c9403a";
        ctx.beginPath();
        ctx.moveTo(-11, 2);
        ctx.quadraticCurveTo(0, -12, 11, 2);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#f0e5d2";
        ctx.beginPath();
        ctx.moveTo(-4, 0.5); ctx.quadraticCurveTo(0, -8, 4, 0.5);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
    if (w.def.kind === "pets" && S.birds) { // palomas
      for (const bd of S.birds) {
        drawBird(ctx, bd.x - camX, bd.y - camY, { t, scale: 0.55, phase: bd.phase, face: 1, color: "#b9bcc8" });
      }
    }
  }
}

// ------------------------------------------------------------ entidades
function drawEnemy(game, ctx, e, ex, ey, t) {
  const hidden = e.state && e.state.hidden;
  const spec = e.spriteOverride || e.def.sprite || {};
  const scale = (e.r / 13) * (e.elite ? 1.12 : 1);

  // sombra
  ctx.fillStyle = "rgba(0,0,0,.26)";
  ctx.beginPath();
  ctx.ellipse(ex, ey + 3, e.r * 0.85, e.r * 0.32, 0, 0, TAU);
  ctx.fill();

  // aura de jefe
  if (e.boss) {
    ctx.strokeStyle = `rgba(200,140,255,${0.5 + Math.sin(t * 4) * 0.2})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ex, ey - 8, e.r + 8 + Math.sin(t * 4) * 3, 0, TAU);
    ctx.stroke();
  }
  // aura del gentrificador: la zona "sube de precio"
  if (e.def.behavior === "buffer") {
    ctx.strokeStyle = "rgba(230,190,90,.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.arc(ex, ey, e.def.special.auraR, t, TAU + t); ctx.stroke();
    ctx.setLineDash([]);
  }
  // ondas del altavoz de la banda
  if (e.def.behavior === "pack") {
    const k = (t * 1.6 + e.phase) % 1;
    ctx.strokeStyle = `rgba(200,180,70,${0.5 * (1 - k)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ex, ey - 12, 14 + k * 40, 0, TAU); ctx.stroke();
  }

  // telegrafiado de embestida
  if (e.state && e.state.mode === "aim" && e.state.dir) {
    ctx.strokeStyle = "rgba(255,60,60,.5)";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + e.state.dir[0] * 150, ey + e.state.dir[1] * 150);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // decide flip por movimiento
  if (e._px !== undefined) {
    const dx = e.x - e._px;
    if (Math.abs(dx) > 0.3) e.face = dx > 0 ? 1 : -1;
  }
  const moving = e._px !== undefined && (Math.abs(e.x - e._px) + Math.abs(e.y - e._py)) > 0.25;
  e._px = e.x; e._py = e.y;

  // el top manta desplegado dibuja su tienda entera en el suelo
  if (e.def.behavior === "manta" && e.state.mode !== "fold") {
    drawManta(ctx, ex, ey + 10, { scale: 0.85 });
  }

  // emboscadas con disfraz: el mimo ES una estatua, el trilero ES una caja
  if (hidden && spec.hiddenStyle === "plinth") {
    ctx.fillStyle = "#8d8a9c";
    ctx.strokeStyle = "#241b2e";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.rect(ex - 15 * scale, ey - 2, 30 * scale, 8);
    ctx.fill(); ctx.stroke();
    // el mimo posa quieto sobre su peana, congelado (t fijo)
    drawHumanoid(ctx, spec, ex, ey - 4, {
      t: 0.2, moving: false, face: e.face || 1, scale, phase: 0,
      alpha: 1, skin: e.skin, hairTone: e.hairTone,
    });
    return;
  }
  if (hidden && spec.hiddenStyle === "box") {
    // caja de cartón "sospechosamente normal" con ojos asomando
    ctx.fillStyle = "#b08a55";
    ctx.strokeStyle = "#241b2e";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.rect(ex - 16 * scale, ey - 26 * scale, 32 * scale, 26 * scale);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#00000044";
    ctx.beginPath(); ctx.moveTo(ex, ey - 26 * scale); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = "#241b2e";
    ctx.font = `${Math.round(7 * scale)}px Trebuchet MS`;
    ctx.textAlign = "center";
    ctx.fillText("FRÁGIL", ex, ey - 8 * scale);
    // ojos por la ranura
    ctx.fillStyle = "#fff";
    ctx.fillRect(ex - 8 * scale, ey - 20 * scale, 16 * scale, 4 * scale);
    ctx.fillStyle = "#241b2e";
    ctx.beginPath();
    ctx.arc(ex - 4 * scale, ey - 18 * scale, 1.4 * scale, 0, TAU);
    ctx.arc(ex + 4 * scale, ey - 18 * scale, 1.4 * scale, 0, TAU);
    ctx.fill();
    ctx.fillText("🥤", ex + 14 * scale, ey + 2); // los vasitos preparados
    return;
  }

  const opts = {
    t, moving, face: e.face || 1, scale, phase: e.phase || 0,
    alpha: hidden ? 0.45 : 1, flash: e.flashT || 0,
    skin: e.skin, hairTone: e.hairTone,
  };
  if (spec.custom === "bird") drawBird(ctx, ex, ey, { ...opts, color: spec.color });
  else if (spec.custom === "rat") drawRat(ctx, ex, ey, opts);
  else if (spec.custom === "roach") drawRoach(ctx, ex, ey, opts);
  else if (spec.custom === "crane") drawCraneBoss(ctx, ex, ey, opts);
  else drawHumanoid(ctx, spec, ex, ey, opts);
  if (spec.custom && spec.custom !== "crane" && e.flashT > 0) { // flash de daño en fauna
    ctx.globalAlpha = Math.min(0.7, e.flashT * 8);
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(ex, ey - 8 * scale, 13 * scale, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (e.elite) {
    ctx.font = `${Math.round(12 * scale)}px serif`;
    ctx.textAlign = "center";
    ctx.fillText("👑", ex, ey - 38 * scale);
  }
  // iconos de estado
  const stKeys = Object.keys(e.statuses);
  if (stKeys.length) {
    ctx.font = "11px serif";
    ctx.textAlign = "center";
    let sx = ex - (stKeys.length - 1) * 6;
    for (const id of stKeys) {
      const info = STATUS_INFO[id];
      if (info) { ctx.fillText(info.icon, sx, ey - 34 * scale - 4); sx += 12; }
    }
  }
  // barra de vida
  if (!e.boss && e.hp < e.maxHp) {
    const bw = e.r * 2;
    ctx.fillStyle = "rgba(0,0,0,.5)";
    ctx.fillRect(ex - bw / 2, ey + 7, bw, 3.6);
    ctx.fillStyle = "#e05252";
    ctx.fillRect(ex - bw / 2, ey + 7, bw * clamp(e.hp / e.maxHp, 0, 1), 3.6);
  }
  // bocadillo
  if (e.say && !hidden) drawBubble(ctx, ex, ey - 34 * scale - 12, e.say.text);
}

function drawPlayer(game, ctx, p, px, py, t) {
  ctx.fillStyle = "rgba(0,0,0,.3)";
  ctx.beginPath();
  ctx.ellipse(px, py + 3, 12, 4.5, 0, 0, TAU);
  ctx.fill();
  if (p.dash) { // estela del Bicing
    ctx.strokeStyle = "rgba(120,220,180,.5)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(px, py - 8);
    ctx.lineTo(px - p.dash.dx * 40, py - 8 - p.dash.dy * 40);
    ctx.stroke();
  }
  const blink = p.iframe > 0 && Math.floor(t * 20) % 2 === 0;
  if (!blink) {
    const mv = game.input.getMove();
    const moving = Math.abs(mv.x) + Math.abs(mv.y) > 0.1;
    drawHumanoid(ctx, p.def.sprite || {}, px, py, {
      t, moving, face: p.faceX >= 0 ? 1 : -1, scale: 1.05, phase: 0,
    });
  }
  if (p.stunT > 0) { ctx.font = "13px serif"; ctx.textAlign = "center"; ctx.fillText("💫", px, py - 42); }
  if (p.immobT > 0) { ctx.font = "13px serif"; ctx.textAlign = "center"; ctx.fillText("📜", px, py - 42); }
  if (game.bassSlow) { ctx.font = "11px serif"; ctx.textAlign = "center"; ctx.fillText("🔊", px + 16, py - 36); }
}

function drawBubble(ctx, x, y, text) {
  ctx.font = "11px Trebuchet MS";
  const w = ctx.measureText(text).width + 14;
  const h = 18;
  ctx.fillStyle = "rgba(255,255,255,.93)";
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
