// ---------------------------------------------------------------------------
// SPRITES: personajes cartoon dibujados a mano en canvas (nada de emojis
// sueltos). Cada enemigo/personaje tiene un "spec" declarativo:
//   { outfit, pants, hair, hairStyle, hat, prop, face, stripes, vehicle,
//     custom, build }
// El tono de piel se asigna al azar de una paleta diversa en el spawn
// (una ciudad de verdad), salvo que el spec lo fije (p. ej. el mimo pintado).
// ---------------------------------------------------------------------------
import { TAU, clamp } from "./util.js";

export const SKIN_TONES = ["#f6cf9f", "#eab98a", "#d69a63", "#b07b45", "#8a5a33", "#6e4526"];
export const HAIR_TONES = ["#2b2118", "#4a3220", "#7a5230", "#111", "#5a5a5a", "#c9b370"];

const OUT = "#241b2e"; // color de línea cartoon

function px(ctx, c) { ctx.fillStyle = c; ctx.strokeStyle = OUT; }

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) + amt, 0, 255);
  const g = clamp(((n >> 8) & 255) + amt, 0, 255);
  const b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}

// ---------------------------------------------------------------- humanoide
// o = { t, moving, face(1|-1), scale, alpha, flash, skin, hairTone }
export function drawHumanoid(ctx, s, x, y, o) {
  const sc = o.scale || 1;
  const t = o.t || 0;
  const ph = o.phase || 0;
  const walk = o.moving ? Math.sin(t * 11 + ph) : 0;
  const bounce = o.moving ? Math.abs(Math.sin(t * 11 + ph)) * 2.2 * sc : Math.sin(t * 2 + ph) * 0.7 * sc;

  ctx.save();
  ctx.translate(x, y - bounce);
  ctx.scale(o.face || 1, 1);
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  ctx.lineWidth = Math.max(1.4, 1.6 * sc);
  ctx.lineJoin = "round";

  const skin = s.skin || o.skin || "#eab98a";
  const outfit = s.outfit || "#888";
  const pants = s.pants || shade(outfit, -45);
  const U = 13 * sc; // media anchura de referencia

  if (s.vehicle) {
    drawVehicle(ctx, s, sc, t, skin, outfit, o);
  } else {
    const bw = (s.build || 1) * 15 * sc, bh = 14.5 * sc;
    const bodyTop = -7 * sc - bh;
    // capa (estelada, bandera al hombro...) por detrás del cuerpo
    if (s.cape) {
      px(ctx, s.cape);
      const flap = Math.sin(t * 4 + ph) * 2 * sc;
      ctx.beginPath();
      ctx.moveTo(-bw / 2, bodyTop + 2 * sc);
      ctx.quadraticCurveTo(-bw - 4 * sc - flap, -8 * sc, -bw * 0.7 - flap, -1 * sc);
      ctx.lineTo(-2 * sc, -4 * sc);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      if (s.capeStripes) {
        ctx.strokeStyle = s.capeStripes;
        ctx.lineWidth = 1.4 * sc;
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(-bw / 2 - i * 2.2 * sc, bodyTop + (2 + i * 2) * sc);
          ctx.lineTo(-bw * 0.7 - flap + i * 1.5 * sc, -1 * sc - i * 1.2 * sc);
          ctx.stroke();
        }
        ctx.strokeStyle = OUT;
      }
    }
    // piernas
    px(ctx, pants);
    const lw = 4.6 * sc, lh = 8 * sc;
    rr(ctx, -5.5 * sc, -lh + walk * 2.4 * sc, lw, lh, 2 * sc); ctx.fill(); ctx.stroke();
    rr(ctx, 1 * sc, -lh - walk * 2.4 * sc, lw, lh, 2 * sc); ctx.fill(); ctx.stroke();
    if (s.socksAndals) { // calcetines blancos con sandalias: el uniforme
      ctx.fillStyle = "#f4f4f4";
      ctx.fillRect(-5.5 * sc, -3 * sc + walk * 2.4 * sc, lw, 3 * sc);
      ctx.fillRect(1 * sc, -3 * sc - walk * 2.4 * sc, lw, 3 * sc);
    }
    // cuerpo (sin camiseta = torso de piel, con quemadura si toca)
    px(ctx, s.shirtless ? skin : outfit);
    rr(ctx, -bw / 2, bodyTop, bw, bh, 5 * sc); ctx.fill(); ctx.stroke();
    if (s.stripes) { // camiseta a rayas (mimo, marinero)
      ctx.save(); ctx.clip();
      ctx.fillStyle = s.stripes;
      for (let i = 0; i < 3; i++) ctx.fillRect(-bw / 2, bodyTop + (2.5 + i * 5) * sc, bw, 2.2 * sc);
      ctx.restore();
    }
    if (s.pattern === "leopard") { // estampado leopardo, elegancia máxima
      ctx.save(); rr(ctx, -bw / 2, bodyTop, bw, bh, 5 * sc); ctx.clip();
      ctx.fillStyle = "#00000055";
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.arc(-bw / 2 + ((i * 37) % bw), bodyTop + ((i * 23) % bh), 1.7 * sc, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    if (s.pattern === "quilt") { // bata de guatiné, blindaje de barrio
      ctx.save(); rr(ctx, -bw / 2, bodyTop, bw, bh, 5 * sc); ctx.clip();
      ctx.strokeStyle = "#00000033";
      ctx.lineWidth = 1 * sc;
      for (let i = -3; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(i * 5 * sc - 8 * sc, bodyTop); ctx.lineTo(i * 5 * sc + 8 * sc, bodyTop + bh); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i * 5 * sc + 8 * sc, bodyTop); ctx.lineTo(i * 5 * sc - 8 * sc, bodyTop + bh); ctx.stroke();
      }
      ctx.restore();
    }
    if (s.pattern === "cases") { // chaleco tapizado de fundas de móvil
      ctx.save(); rr(ctx, -bw / 2, bodyTop, bw, bh, 5 * sc); ctx.clip();
      const cols = ["#e05a72", "#3db6a5", "#e8c33d", "#c96be0", "#5f9e52"];
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = cols[i % cols.length];
        ctx.fillRect(-bw / 2 + ((i * 29) % (bw - 4 * sc)), bodyTop + ((i * 17) % (bh - 6 * sc)), 4 * sc, 6 * sc);
      }
      ctx.restore();
    }
    if (s.vest) { // chaleco (rider, obrero)
      px(ctx, s.vest);
      rr(ctx, -bw / 2 + 1.5 * sc, bodyTop + 1 * sc, bw * 0.34, bh - 2 * sc, 2 * sc); ctx.fill();
      rr(ctx, bw / 2 - 1.5 * sc - bw * 0.34, bodyTop + 1 * sc, bw * 0.34, bh - 2 * sc, 2 * sc); ctx.fill();
    }
    // BARRIGA: el rasgo más honesto de la ciudad
    if (s.belly) {
      px(ctx, s.shirtless ? skin : s.belly === true ? outfit : s.belly);
      ctx.beginPath();
      ctx.ellipse(0.5 * sc, -6 * sc, bw * 0.42, 5.5 * sc, 0, 0, TAU);
      ctx.fill(); ctx.stroke();
      if (s.shirtless) { // ombligo orgulloso
        ctx.fillStyle = OUT;
        ctx.beginPath(); ctx.arc(0.5 * sc, -5.5 * sc, 0.9 * sc, 0, TAU); ctx.fill();
      }
      if (s.tattoo) {
        ctx.fillStyle = "#3a6a8a";
        ctx.font = `bold ${Math.round(3.6 * sc)}px Trebuchet MS`;
        ctx.textAlign = "center";
        ctx.fillText(s.tattoo, 0.5 * sc, -5 * sc);
      }
    }
    // cadena de oro
    if (s.chain) {
      ctx.strokeStyle = "#e8c33d";
      ctx.lineWidth = 1.6 * sc;
      ctx.beginPath();
      ctx.arc(0, bodyTop + 1.5 * sc, 4.6 * sc, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = "#e8c33d";
      ctx.beginPath(); ctx.arc(0, bodyTop + 6.5 * sc, 1.5 * sc, 0, TAU); ctx.fill();
      ctx.strokeStyle = OUT;
    }
    // cámara colgada al cuello (crucerista)
    if (s.camera) {
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1.2 * sc;
      ctx.beginPath();
      ctx.moveTo(-4 * sc, bodyTop + 1 * sc);
      ctx.quadraticCurveTo(0, bodyTop + 6 * sc, 4 * sc, bodyTop + 1 * sc);
      ctx.stroke();
      ctx.strokeStyle = OUT;
      px(ctx, "#2c2c34");
      rr(ctx, -3.5 * sc, bodyTop + 5 * sc, 7 * sc, 5 * sc, 1 * sc); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#9fd7ff";
      ctx.beginPath(); ctx.arc(0, bodyTop + 7.5 * sc, 1.5 * sc, 0, TAU); ctx.fill();
    }
    // brazos
    px(ctx, s.shirtless ? skin : outfit);
    const aw = 3.6 * sc;
    rr(ctx, -bw / 2 - aw + 0.5 * sc, bodyTop + 2 * sc + walk * 1.6 * sc, aw, 9 * sc, 2 * sc); ctx.fill(); ctx.stroke();
    rr(ctx, bw / 2 - 0.5 * sc, bodyTop + 2 * sc - walk * 1.6 * sc, aw, 9 * sc, 2 * sc); ctx.fill(); ctx.stroke();
    drawHead(ctx, s, sc, skin, o, bodyTop);
    // gotas de sudor (explotación, agosto o ambas)
    if (s.sweat) {
      const k = (t * 1.6 + ph) % 1;
      ctx.fillStyle = `rgba(120,190,255,${0.9 * (1 - k)})`;
      ctx.beginPath();
      ctx.arc(9 * sc, bodyTop - 8 * sc + k * 9 * sc, 1.6 * sc, 0, TAU);
      ctx.fill();
    }
  }

  // accesorio en mano (emoji pequeño como PROP, no como personaje)
  if (s.prop) {
    ctx.font = `${Math.round(11 * sc)}px serif`;
    ctx.textAlign = "center";
    const propY = s.vehicle ? -14 * sc : -13 * sc;
    ctx.fillText(s.prop, 10.5 * sc, propY + Math.sin(t * 3 + ph) * sc);
  }
  ctx.restore();

  // flash blanco al recibir daño
  if (o.flash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.7, o.flash * 8);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y - 13 * sc, 15 * sc, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawHead(ctx, s, sc, skin, o, bodyTop) {
  const hy = bodyTop - 5.5 * sc; // centro de la cabeza
  const hr = 7 * sc;
  px(ctx, skin);
  ctx.beginPath(); ctx.arc(0, hy, hr, 0, TAU); ctx.fill(); ctx.stroke();

  // pelo
  const hair = s.hair || o.hairTone || "#2b2118";
  if (s.hairStyle !== "bald") {
    ctx.fillStyle = hair;
    ctx.beginPath();
    if (s.hairStyle === "bun") { // moño hipster
      ctx.arc(0, hy, hr, Math.PI, 0);
      ctx.fill();
      ctx.beginPath(); ctx.arc(0, hy - hr - 1.5 * sc, 2.6 * sc, 0, TAU); ctx.fill(); ctx.stroke();
    } else if (s.hairStyle === "long") {
      ctx.arc(0, hy, hr + 0.8 * sc, Math.PI * 0.85, Math.PI * 0.15);
      ctx.rect(-hr - 0.8 * sc, hy, (hr + 0.8 * sc) * 2, 6 * sc);
      ctx.fill();
    } else if (s.hairStyle === "grey-bun") {
      ctx.fillStyle = "#cfcfcf";
      ctx.arc(0, hy, hr, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.arc(0, hy - hr, 2.8 * sc, 0, TAU); ctx.fill();
    } else if (s.hairStyle === "dreads") { // rastas de asamblea
      ctx.arc(0, hy, hr, Math.PI, 0); ctx.fill();
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 2.6 * sc, hy - hr + 1 * sc);
        ctx.quadraticCurveTo(i * 4 * sc, hy + 2 * sc, i * 4.4 * sc, hy + 6 * sc);
        ctx.lineWidth = 1.8 * sc;
        ctx.strokeStyle = hair;
        ctx.stroke();
      }
      ctx.strokeStyle = OUT;
      ctx.lineWidth = Math.max(1.4, 1.6 * sc);
    } else if (s.hairStyle === "slick") { // gomina de promotor
      ctx.arc(0, hy, hr, Math.PI * 1.1, -Math.PI * 0.1); ctx.fill();
      ctx.strokeStyle = "#ffffff44";
      ctx.lineWidth = 0.8 * sc;
      ctx.beginPath(); ctx.arc(0, hy, hr * 0.8, Math.PI * 1.2, Math.PI * 1.6); ctx.stroke();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = Math.max(1.4, 1.6 * sc);
    } else { // corto
      ctx.arc(0, hy, hr, Math.PI * 1.05, -Math.PI * 0.05);
      ctx.fill();
    }
  }
  // rulos de peluquería de barrio (van SOBRE el pelo)
  if (s.curlers) {
    px(ctx, "#f2a3c0");
    for (let i = -1; i <= 1; i++) {
      rr(ctx, i * 4 * sc - 1.8 * sc, hy - hr - 1.5 * sc + Math.abs(i) * sc, 3.6 * sc, 3 * sc, 1.4 * sc);
      ctx.fill(); ctx.stroke();
    }
  }

  // cara
  ctx.fillStyle = OUT;
  const ex = 2.6 * sc, ey = hy - 0.5 * sc;
  switch (s.face) {
    case "shades":
      ctx.fillRect(-hr + 1.5 * sc, ey - 1.8 * sc, hr * 2 - 3 * sc, 3.2 * sc);
      break;
    case "drunk":
      ctx.lineWidth = 1.2 * sc;
      ctx.beginPath(); ctx.arc(-ex, ey, 1.6 * sc, 0, Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(ex, ey, 1.6 * sc, 0, Math.PI); ctx.stroke();
      ctx.fillStyle = "#e07b7b"; // moflete
      ctx.beginPath(); ctx.arc(0, hy + 3.4 * sc, 1.6 * sc, 0, TAU); ctx.fill();
      break;
    case "angry":
      ctx.beginPath(); ctx.arc(-ex, ey + 0.4 * sc, 1.2 * sc, 0, TAU); ctx.arc(ex, ey + 0.4 * sc, 1.2 * sc, 0, TAU); ctx.fill();
      ctx.lineWidth = 1.4 * sc;
      ctx.beginPath();
      ctx.moveTo(-ex - 1.6 * sc, ey - 2.6 * sc); ctx.lineTo(-ex + 1.2 * sc, ey - 1.2 * sc);
      ctx.moveTo(ex + 1.6 * sc, ey - 2.6 * sc); ctx.lineTo(ex - 1.2 * sc, ey - 1.2 * sc);
      ctx.stroke();
      break;
    case "mime": // cara pintada
      ctx.fillStyle = "#f4f4f4";
      ctx.beginPath(); ctx.arc(0, hy, hr - 0.8 * sc, 0, TAU); ctx.fill();
      ctx.fillStyle = OUT;
      ctx.beginPath(); ctx.arc(-ex, ey, 1.1 * sc, 0, TAU); ctx.arc(ex, ey, 1.1 * sc, 0, TAU); ctx.fill();
      ctx.lineWidth = 1.1 * sc;
      ctx.beginPath(); ctx.moveTo(-1.5 * sc, hy + 3.4 * sc); ctx.lineTo(1.5 * sc, hy + 3.4 * sc); ctx.stroke();
      break;
    case "old":
      ctx.lineWidth = 1.1 * sc;
      ctx.beginPath(); ctx.arc(-ex, ey, 2 * sc, 0, TAU); ctx.moveTo(ex + 2 * sc, ey); ctx.arc(ex, ey, 2 * sc, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-ex + 2 * sc, ey); ctx.lineTo(ex - 2 * sc, ey); ctx.stroke();
      ctx.fillStyle = OUT;
      ctx.beginPath(); ctx.arc(-ex, ey, 0.8 * sc, 0, TAU); ctx.arc(ex, ey, 0.8 * sc, 0, TAU); ctx.fill();
      break;
    case "phone": // mirando el móvil (no te ve)
      ctx.beginPath(); ctx.arc(-ex, ey + 1 * sc, 1.1 * sc, 0, TAU); ctx.arc(ex, ey + 1 * sc, 1.1 * sc, 0, TAU); ctx.fill();
      px(ctx, "#333");
      rr(ctx, 3.5 * sc, hy + 3 * sc, 4 * sc, 6.5 * sc, sc); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#9fd7ff";
      ctx.fillRect(4.2 * sc, hy + 3.8 * sc, 2.6 * sc, 4 * sc);
      break;
    case "duck": // morritos de story de Instagram
      ctx.beginPath(); ctx.arc(-ex, ey, 1.3 * sc, 0, TAU); ctx.arc(ex, ey, 1.3 * sc, 0, TAU); ctx.fill();
      ctx.fillStyle = "#d96a8a";
      ctx.beginPath(); ctx.ellipse(0.3 * sc, hy + 3 * sc, 2.2 * sc, 1.5 * sc, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 0.8 * sc;
      ctx.beginPath(); ctx.moveTo(-1.2 * sc, hy + 3 * sc); ctx.lineTo(1.8 * sc, hy + 3 * sc); ctx.stroke();
      break;
    case "spiral": { // ojos de espiral: 14 mojitos
      ctx.lineWidth = 0.9 * sc;
      for (const sx of [-ex, ex]) {
        ctx.beginPath();
        ctx.arc(sx, ey, 1.9 * sc, 0, TAU * 0.8);
        ctx.arc(sx, ey, 1 * sc, 0, TAU * 0.6);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(0.3 * sc, hy + 3.2 * sc, 1.8 * sc, 1.1 * sc, 0, 0, TAU); ctx.stroke();
      break;
    }
    case "tired": // ojeras de tres trabajos
      ctx.beginPath(); ctx.arc(-ex, ey, 1.1 * sc, 0, TAU); ctx.arc(ex, ey, 1.1 * sc, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#00000055";
      ctx.lineWidth = 1 * sc;
      ctx.beginPath(); ctx.arc(-ex, ey + 1.4 * sc, 1.7 * sc, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(ex, ey + 1.4 * sc, 1.7 * sc, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
      ctx.strokeStyle = OUT;
      ctx.beginPath(); ctx.moveTo(-1.5 * sc, hy + 3.2 * sc); ctx.lineTo(1.8 * sc, hy + 3.4 * sc); ctx.stroke();
      break;
    case "grin": { // sonrisa de comercial: DEMASIADOS dientes
      ctx.beginPath(); ctx.arc(-ex, ey, 1.2 * sc, 0, TAU); ctx.arc(ex, ey, 1.2 * sc, 0, TAU); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(0.3 * sc, hy + 2 * sc, 3 * sc, 0.1 * Math.PI, 0.9 * Math.PI); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 0.7 * sc;
      ctx.stroke();
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(0.3 * sc + i * 1.5 * sc, hy + 2.3 * sc); ctx.lineTo(0.3 * sc + i * 1.5 * sc, hy + 4 * sc); ctx.stroke();
      }
      break;
    }
    default: // neutral
      ctx.beginPath(); ctx.arc(-ex, ey, 1.2 * sc, 0, TAU); ctx.arc(ex, ey, 1.2 * sc, 0, TAU); ctx.fill();
      ctx.lineWidth = 1.1 * sc;
      ctx.beginPath(); ctx.arc(0.4 * sc, hy + 2.2 * sc, 1.8 * sc, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }
  // palillo de bar en la boca
  if (s.toothpick) {
    ctx.strokeStyle = "#c8a562";
    ctx.lineWidth = 1 * sc;
    ctx.beginPath(); ctx.moveTo(1 * sc, hy + 2.8 * sc); ctx.lineTo(5.5 * sc, hy + 4.2 * sc); ctx.stroke();
    ctx.strokeStyle = OUT;
  }
  // uniceja de opiniones firmes
  if (s.unibrow) {
    ctx.strokeStyle = hair;
    ctx.lineWidth = 1.6 * sc;
    ctx.beginPath(); ctx.moveTo(-ex - 1.8 * sc, ey - 2.4 * sc); ctx.quadraticCurveTo(0, ey - 3.4 * sc, ex + 1.8 * sc, ey - 2.4 * sc); ctx.stroke();
    ctx.strokeStyle = OUT;
  }

  // barba/mascarilla/bigote
  if (s.beard) {
    ctx.fillStyle = s.beard;
    ctx.beginPath(); ctx.arc(0, hy + 2.2 * sc, hr - 1.6 * sc, 0.1 * Math.PI, 0.9 * Math.PI); ctx.fill();
  }
  if (s.bandana) {
    px(ctx, s.bandana);
    ctx.beginPath(); ctx.arc(0, hy - 2.2 * sc, hr - 0.4 * sc, Math.PI, 0); ctx.fill(); ctx.stroke();
    ctx.fillRect(hr - 3 * sc, hy - 3 * sc, 4.5 * sc, 2.4 * sc);
  }
  if (s.hood) { // capucha
    px(ctx, s.hood);
    ctx.lineWidth = 1.4 * sc;
    ctx.beginPath();
    ctx.arc(0, hy + 0.5 * sc, hr + 1.6 * sc, Math.PI * 0.75, Math.PI * 2.25);
    ctx.stroke(); ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(0, hy + 0.8 * sc, hr - 1.6 * sc, 0, TAU); ctx.fill();
    ctx.fillStyle = OUT; // ojos dentro de la capucha
    ctx.beginPath(); ctx.arc(-2 * sc, hy, 1.1 * sc, 0, TAU); ctx.arc(2 * sc, hy, 1.1 * sc, 0, TAU); ctx.fill();
  }
  // sombrero como emoji-prop encima (gorra, boina, corona...)
  if (s.hat) {
    ctx.font = `${Math.round(10.5 * sc)}px serif`;
    ctx.textAlign = "center";
    ctx.fillText(s.hat, 0.5 * sc, hy - hr + 1 * sc);
  }
}

// ---------------------------------------------------------------- vehículos
function drawVehicle(ctx, s, sc, t, skin, outfit, o) {
  const spin = t * 12;
  const wheel = (wx, wy, wr) => {
    px(ctx, "#2c2c34");
    ctx.beginPath(); ctx.arc(wx, wy, wr, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.moveTo(wx - Math.cos(spin) * wr * 0.7, wy - Math.sin(spin) * wr * 0.7);
    ctx.lineTo(wx + Math.cos(spin) * wr * 0.7, wy + Math.sin(spin) * wr * 0.7);
    ctx.stroke();
    ctx.strokeStyle = OUT;
  };

  switch (s.vehicle) {
    case "taxi": {
      // el icónico negro y amarillo
      wheel(-12 * sc, -3 * sc, 5 * sc);
      wheel(12 * sc, -3 * sc, 5 * sc);
      px(ctx, "#1c1c22");
      rr(ctx, -19 * sc, -16 * sc, 38 * sc, 11 * sc, 4 * sc); ctx.fill(); ctx.stroke();
      px(ctx, "#f7c948");
      rr(ctx, -8 * sc, -15 * sc, 16 * sc, 9 * sc, 2 * sc); ctx.fill();
      px(ctx, "#1c1c22");
      rr(ctx, -10 * sc, -24 * sc, 20 * sc, 9 * sc, 3 * sc); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#9fd7ff";
      rr(ctx, -7.5 * sc, -22.5 * sc, 6.5 * sc, 6 * sc, 1.5 * sc); ctx.fill();
      // cabeza cabreada asomando
      ctx.fillStyle = skin;
      ctx.beginPath(); ctx.arc(3.5 * sc, -19.5 * sc, 3.6 * sc, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = OUT;
      ctx.beginPath(); ctx.arc(4.5 * sc, -20 * sc, 0.8 * sc, 0, TAU); ctx.fill();
      // letrero verde LLIURE (mentira)
      ctx.fillStyle = "#43c465";
      ctx.fillRect(-4 * sc, -27 * sc, 8 * sc, 2.6 * sc);
      break;
    }
    case "scooter": {
      wheel(-9 * sc, -2.5 * sc, 3.4 * sc);
      wheel(9 * sc, -2.5 * sc, 3.4 * sc);
      ctx.lineWidth = 2 * sc;
      ctx.beginPath(); ctx.moveTo(-11 * sc, -5.5 * sc); ctx.lineTo(11 * sc, -5.5 * sc); ctx.stroke(); // deck
      ctx.beginPath(); ctx.moveTo(9 * sc, -5.5 * sc); ctx.lineTo(12 * sc, -21 * sc); ctx.stroke(); // manillar
      ctx.beginPath(); ctx.moveTo(9 * sc, -21 * sc); ctx.lineTo(15 * sc, -21 * sc); ctx.stroke();
      miniRider(ctx, sc, skin, outfit, s, -6 * sc, o);
      break;
    }
    case "moto": {
      wheel(-11 * sc, -3.5 * sc, 5 * sc);
      wheel(11 * sc, -3.5 * sc, 5 * sc);
      px(ctx, outfit);
      rr(ctx, -9 * sc, -11 * sc, 18 * sc, 6 * sc, 3 * sc); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 2 * sc;
      ctx.beginPath(); ctx.moveTo(9 * sc, -9 * sc); ctx.lineTo(13.5 * sc, -18 * sc); ctx.stroke();
      miniRider(ctx, sc, skin, outfit, s, -11 * sc, o);
      // mochila-cubo enorme
      px(ctx, s.boxColor || "#37c66e");
      rr(ctx, -20 * sc, -27 * sc, 12 * sc, 12 * sc, 2.5 * sc); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = `${Math.round(6 * sc)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("APP", -14 * sc, -19.5 * sc);
      break;
    }
    case "bike": {
      wheel(-10 * sc, -4 * sc, 6 * sc);
      wheel(10 * sc, -4 * sc, 6 * sc);
      ctx.strokeStyle = s.frame || "#d43f3f";
      ctx.lineWidth = 2 * sc;
      ctx.beginPath();
      ctx.moveTo(-10 * sc, -4 * sc); ctx.lineTo(-2 * sc, -13 * sc); ctx.lineTo(10 * sc, -4 * sc);
      ctx.moveTo(-2 * sc, -13 * sc); ctx.lineTo(8 * sc, -15 * sc);
      ctx.stroke();
      ctx.strokeStyle = OUT;
      miniRider(ctx, sc, skin, outfit, s, -13 * sc, o);
      break;
    }
    case "cart": { // señora + carrito de la compra
      miniRider(ctx, sc, skin, outfit, s, -1 * sc, o, true);
      px(ctx, s.cartColor || "#a4373a");
      rr(ctx, 8 * sc, -16 * sc, 10 * sc, 13 * sc, 2 * sc); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#00000033";
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(8 * sc, -16 * sc + i * 4.3 * sc); ctx.lineTo(18 * sc, -16 * sc + i * 4.3 * sc); ctx.stroke();
      }
      ctx.strokeStyle = OUT;
      wheel(10 * sc, -2 * sc, 2.2 * sc);
      wheel(16 * sc, -2 * sc, 2.2 * sc);
      break;
    }
    case "segway": { // el Turista Definitivo
      wheel(-8 * sc, -3 * sc, 5 * sc);
      wheel(8 * sc, -3 * sc, 5 * sc);
      ctx.lineWidth = 2.4 * sc;
      ctx.beginPath(); ctx.moveTo(-8 * sc, -7 * sc); ctx.lineTo(8 * sc, -7 * sc); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -7 * sc); ctx.lineTo(0, -24 * sc); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6 * sc, -24 * sc); ctx.lineTo(6 * sc, -24 * sc); ctx.stroke();
      miniRider(ctx, sc, skin, outfit, s, -8 * sc, o, true);
      break;
    }
  }
}

function miniRider(ctx, sc, skin, outfit, s, dy, o, standing = false) {
  // cuerpo compacto del conductor
  px(ctx, outfit);
  rr(ctx, -6 * sc, dy - 12 * sc, 12 * sc, 11 * sc, 4 * sc); ctx.fill(); ctx.stroke();
  if (s.vest) {
    px(ctx, s.vest);
    rr(ctx, -5 * sc, dy - 11 * sc, 3.6 * sc, 9 * sc, 1.5 * sc); ctx.fill();
    rr(ctx, 1.4 * sc, dy - 11 * sc, 3.6 * sc, 9 * sc, 1.5 * sc); ctx.fill();
  }
  drawHead(ctx, s, sc * 0.92, skin, o, dy - 12 * sc);
}

// ---------------------------------------------------------------- especiales
export function drawBird(ctx, x, y, o) {
  const sc = o.scale || 1;
  const t = o.t || 0;
  const flap = Math.sin(t * 14 + (o.phase || 0)) * 6 * sc;
  ctx.save();
  ctx.translate(x, y - 16 * sc); // vuela por encima de su sombra
  ctx.scale(o.face || 1, 1);
  ctx.lineWidth = 1.5 * sc;
  // alas
  px(ctx, o.color || "#e8e8ee");
  ctx.beginPath();
  ctx.moveTo(-2 * sc, -2 * sc);
  ctx.quadraticCurveTo(-13 * sc, -8 * sc - flap, -17 * sc, -2 * sc - flap);
  ctx.quadraticCurveTo(-10 * sc, 1 * sc, -2 * sc, 1 * sc);
  ctx.fill(); ctx.stroke();
  // cuerpo
  ctx.beginPath();
  ctx.ellipse(0, 0, 8 * sc, 5.5 * sc, -0.2, 0, TAU);
  ctx.fill(); ctx.stroke();
  // cabeza
  ctx.beginPath(); ctx.arc(7 * sc, -4 * sc, 4 * sc, 0, TAU); ctx.fill(); ctx.stroke();
  // pico
  px(ctx, "#f2b134");
  ctx.beginPath();
  ctx.moveTo(10.5 * sc, -4.5 * sc); ctx.lineTo(15 * sc, -3 * sc); ctx.lineTo(10.5 * sc, -2 * sc);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // ojo de psicópata
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(8 * sc, -4.5 * sc, 1.8 * sc, 0, TAU); ctx.fill();
  ctx.fillStyle = OUT;
  ctx.beginPath(); ctx.arc(8.4 * sc, -4.5 * sc, 0.9 * sc, 0, TAU); ctx.fill();
  ctx.restore();
}

export function drawRat(ctx, x, y, o) {
  const sc = o.scale || 1;
  const t = o.t || 0;
  const scurry = Math.sin(t * 22 + (o.phase || 0)) * 1.5 * sc;
  ctx.save();
  ctx.translate(x, y - 3 * sc);
  ctx.scale(o.face || 1, 1);
  ctx.lineWidth = 1.3 * sc;
  // cola
  ctx.strokeStyle = "#c98a8a";
  ctx.beginPath();
  ctx.moveTo(-8 * sc, 0);
  ctx.quadraticCurveTo(-15 * sc, -3 * sc + scurry, -19 * sc, 1 * sc - scurry);
  ctx.stroke();
  ctx.strokeStyle = OUT;
  // cuerpo
  px(ctx, o.color || "#6e6259");
  ctx.beginPath();
  ctx.ellipse(0, 0, 9 * sc, 5.5 * sc, 0, 0, TAU);
  ctx.fill(); ctx.stroke();
  // cabeza puntiaguda
  ctx.beginPath();
  ctx.moveTo(6 * sc, -3.5 * sc);
  ctx.quadraticCurveTo(14 * sc, -1 * sc, 13.5 * sc, 2 * sc);
  ctx.quadraticCurveTo(9 * sc, 4 * sc, 5 * sc, 3 * sc);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // oreja + ojo + bigotes
  ctx.beginPath(); ctx.arc(5.5 * sc, -4.5 * sc, 2.4 * sc, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = OUT;
  ctx.beginPath(); ctx.arc(9.5 * sc, -0.5 * sc, 1 * sc, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#00000077";
  ctx.lineWidth = 0.8 * sc;
  ctx.beginPath(); ctx.moveTo(12 * sc, 1 * sc); ctx.lineTo(17 * sc, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12 * sc, 2 * sc); ctx.lineTo(17 * sc, 3 * sc); ctx.stroke();
  ctx.restore();
}

export function drawRoach(ctx, x, y, o) {
  const sc = o.scale || 1;
  const t = o.t || 0;
  const jitter = Math.sin(t * 30 + (o.phase || 0)) * 0.8 * sc;
  ctx.save();
  ctx.translate(x + jitter, y - 2 * sc);
  ctx.scale(o.face || 1, 1);
  ctx.lineWidth = 1.1 * sc;
  // patas frenéticas
  ctx.strokeStyle = "#3a2a1a";
  for (let i = -1; i <= 1; i++) {
    const k = Math.sin(t * 30 + i * 2) * 2 * sc;
    ctx.beginPath(); ctx.moveTo(i * 3 * sc, 0); ctx.lineTo(i * 3 * sc - 4 * sc, 4 * sc + k); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i * 3 * sc, 0); ctx.lineTo(i * 3 * sc + 4 * sc, 4 * sc - k); ctx.stroke();
  }
  ctx.strokeStyle = OUT;
  // cuerpo brillante
  px(ctx, "#5a3620");
  ctx.beginPath();
  ctx.ellipse(0, 0, 7 * sc, 4.2 * sc, 0, 0, TAU);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#7a4a2a";
  ctx.beginPath();
  ctx.ellipse(-1 * sc, -1 * sc, 4 * sc, 2 * sc, 0, 0, TAU);
  ctx.fill();
  // antenas
  ctx.strokeStyle = "#3a2a1a";
  ctx.beginPath(); ctx.moveTo(6 * sc, -2 * sc); ctx.quadraticCurveTo(11 * sc, -6 * sc, 13 * sc, -4 * sc + jitter); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6 * sc, -1 * sc); ctx.quadraticCurveTo(12 * sc, -3 * sc, 14 * sc, 0 + jitter); ctx.stroke();
  ctx.restore();
}

// manta de top manta desplegada en el suelo, con género expuesto
export function drawManta(ctx, x, y, o) {
  const sc = o.scale || 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 1.5;
  px(ctx, "#f0f0f0");
  ctx.save();
  ctx.rotate(0.06);
  rr(ctx, -30 * sc, -18 * sc, 60 * sc, 36 * sc, 3 * sc);
  ctx.fill(); ctx.stroke();
  ctx.restore();
  // género: relojes, bolsos, zapas
  ctx.font = `${Math.round(9 * sc)}px serif`;
  ctx.textAlign = "center";
  ctx.fillText("⌚", -16 * sc, -6 * sc);
  ctx.fillText("👜", 0, -4 * sc);
  ctx.fillText("👟", 15 * sc, -6 * sc);
  ctx.fillText("🕶️", -8 * sc, 8 * sc);
  ctx.fillText("⌚", 10 * sc, 9 * sc);
  // cuerdas de plegado exprés en las esquinas
  ctx.strokeStyle = "#00000044";
  ctx.beginPath(); ctx.moveTo(-28 * sc, -16 * sc); ctx.lineTo(-34 * sc, -22 * sc); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(28 * sc, -16 * sc); ctx.lineTo(34 * sc, -22 * sc); ctx.stroke();
  ctx.restore();
}

export function drawCraneBoss(ctx, x, y, o) {
  const sc = (o.scale || 1) * 0.9;
  const t = o.t || 0;
  const sway = Math.sin(t * 1.2) * 6 * sc;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 2 * sc;
  // torre de celosía
  px(ctx, "#f2b134");
  rr(ctx, -5 * sc, -56 * sc, 10 * sc, 56 * sc, 2 * sc); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#00000044";
  for (let i = 0; i < 6; i++) {
    const yy = -8 * sc - i * 8 * sc;
    ctx.beginPath(); ctx.moveTo(-5 * sc, yy); ctx.lineTo(5 * sc, yy - 8 * sc); ctx.stroke();
  }
  ctx.strokeStyle = OUT;
  // pluma
  px(ctx, "#f2b134");
  rr(ctx, -14 * sc, -62 * sc, 62 * sc, 6 * sc, 2 * sc); ctx.fill(); ctx.stroke();
  // cabina con operario eterno
  px(ctx, "#3b3f52");
  rr(ctx, -14 * sc, -56 * sc, 13 * sc, 10 * sc, 2 * sc); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#9fd7ff";
  ctx.fillRect(-12 * sc, -54 * sc, 6 * sc, 5 * sc);
  // gancho balanceándose con viga
  ctx.strokeStyle = "#555";
  ctx.beginPath(); ctx.moveTo(40 * sc, -58 * sc); ctx.lineTo(40 * sc + sway, -26 * sc); ctx.stroke();
  ctx.strokeStyle = OUT;
  px(ctx, "#b34a3d");
  rr(ctx, 28 * sc + sway, -26 * sc, 24 * sc, 6 * sc, 1.5 * sc); ctx.fill(); ctx.stroke();
  // cartel eterno
  px(ctx, "#fff");
  rr(ctx, -22 * sc, -14 * sc, 44 * sc, 11 * sc, 2 * sc); ctx.fill(); ctx.stroke();
  ctx.fillStyle = OUT;
  ctx.font = `bold ${Math.round(5.2 * sc)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("FIN DE OBRA: 2026*", 0, -9.5 * sc);
  ctx.font = `${Math.round(3.4 * sc)}px sans-serif`;
  ctx.fillText("*el año es orientativo desde 1882", 0, -5.5 * sc);
  ctx.restore();
}
