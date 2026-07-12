// ---------------------------------------------------------------------------
// PROPS DE ESCENARIO: tiendas de fundas, kebabs, badulakes 24h, kioscos de
// las Rambles, farolas, sombrillas... El atrezzo que da personalidad.
// Cada prop llega como { x, y, r, kind, sign, v } (v = hash 0..1 para variar).
// ---------------------------------------------------------------------------
import { TAU } from "./util.js";
import { shade } from "./sprites.js";

const OUT = "#241b2e";

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const AWNING_COLORS = [["#c94f43", "#f0e5d2"], ["#3f7a52", "#f0e5d2"], ["#3d6ea5", "#f0e5d2"], ["#b3452e", "#f2d049"]];
const FACADE_COLORS = ["#c8b49a", "#b8a08c", "#a89484", "#c0a890"];

export function drawProp(ctx, p, t, dark) {
  const { x, y, kind, v } = p;
  ctx.save();
  ctx.lineWidth = 1.6;
  ctx.lineJoin = "round";
  ctx.textAlign = "center";

  // sombra común
  ctx.fillStyle = "rgba(0,0,0,.22)";
  ctx.beginPath();
  ctx.ellipse(x, y + p.r * 0.5, p.r * 1.05, p.r * 0.38, 0, 0, TAU);
  ctx.fill();

  switch (kind) {
    case "shop": { // fachada de tienda con toldo y rótulo
      const W = 104, H = 66;
      const fx = x - W / 2, fy = y - H + 12;
      const [awA, awB] = AWNING_COLORS[Math.floor(v * AWNING_COLORS.length)];
      // fachada
      ctx.fillStyle = FACADE_COLORS[Math.floor(v * 7) % FACADE_COLORS.length];
      ctx.strokeStyle = OUT;
      rr(ctx, fx, fy, W, H, 4); ctx.fill(); ctx.stroke();
      // escaparate iluminado
      ctx.fillStyle = dark ? "#ffd98a" : "#bfe3f2";
      rr(ctx, fx + 8, fy + 28, W - 40, H - 36, 3); ctx.fill(); ctx.stroke();
      // puerta
      ctx.fillStyle = shade(awA, -30);
      rr(ctx, fx + W - 26, fy + 26, 18, H - 32, 3); ctx.fill(); ctx.stroke();
      // género amontonado en el escaparate
      ctx.font = "11px serif";
      const stuff = p.sign?.includes("KEBAB") || p.sign?.includes("DÖNER") ? "🥙" :
        p.sign?.includes("FUNDES") || p.sign?.includes("FUNDAS") ? "📱" :
        p.sign?.includes("24H") || p.sign?.includes("ALIMENTACI") ? "🥫" :
        p.sign?.includes("SOUVENIR") ? "🧲" :
        p.sign?.includes("FARMÀCIA") ? "💊" :
        p.sign?.includes("COFFEE") || p.sign?.includes("MATCHA") ? "☕" :
        p.sign?.includes("ORO") ? "💰" : "🛍️";
      ctx.fillText(stuff, fx + 24, fy + 46);
      ctx.fillText(stuff, fx + 44, fy + 42);
      // toldo a rayas
      ctx.fillStyle = awA;
      ctx.beginPath();
      ctx.moveTo(fx - 4, fy + 22);
      ctx.lineTo(fx + W + 4, fy + 22);
      ctx.lineTo(fx + W - 2, fy + 12);
      ctx.lineTo(fx + 2, fy + 12);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = awB;
      for (let i = 0; i < 5; i++) {
        const sx = fx + 4 + i * (W / 5);
        ctx.beginPath();
        ctx.moveTo(sx + 4, fy + 12); ctx.lineTo(sx + 14, fy + 12);
        ctx.lineTo(sx + 16, fy + 22); ctx.lineTo(sx + 6, fy + 22);
        ctx.closePath(); ctx.fill();
      }
      // rótulo
      ctx.fillStyle = "#2b2436";
      rr(ctx, fx + 2, fy + 1, W - 4, 11, 2); ctx.fill();
      ctx.fillStyle = dark ? "#ffd98a" : "#f7e9c8";
      ctx.font = "bold 7px Trebuchet MS";
      ctx.fillText(p.sign || "BOTIGA", fx + W / 2, fy + 9);
      // neón ABIERTO/OBERT 24h en el badulake
      if (p.sign?.includes("24H")) {
        ctx.fillStyle = "#6bff8a";
        ctx.font = "bold 6px Trebuchet MS";
        ctx.fillText("O B E R T", fx + W - 34, fy + 34);
      }
      break;
    }
    case "kiosk": { // kiosco verde de las Rambles
      const W = 60, H = 54;
      const fx = x - W / 2, fy = y - H + 10;
      ctx.fillStyle = "#3f6b4f";
      ctx.strokeStyle = OUT;
      rr(ctx, fx, fy + 10, W, H - 10, 5); ctx.fill(); ctx.stroke();
      // techo ondulado
      ctx.fillStyle = "#2f5440";
      ctx.beginPath();
      ctx.moveTo(fx - 6, fy + 12);
      ctx.quadraticCurveTo(x, fy - 8, fx + W + 6, fy + 12);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // mostrador con flores/prensa
      ctx.fillStyle = "#f0e5d2";
      rr(ctx, fx + 6, fy + 24, W - 12, 16, 2); ctx.fill(); ctx.stroke();
      ctx.font = "10px serif";
      const goods = p.sign === "FLORS" ? "💐🌹🌻" : p.sign === "LOTERIA" ? "🎟️🎟️" : "📰📖";
      ctx.fillText(goods, x, fy + 37);
      ctx.fillStyle = "#f7e9c8";
      ctx.font = "bold 6.5px Trebuchet MS";
      ctx.fillText(p.sign || "KIOSC", x, fy + 20);
      break;
    }
    case "tree": { // plátano de toda la vida
      ctx.strokeStyle = OUT;
      ctx.fillStyle = "#7a5a3a";
      rr(ctx, x - 4, y - 26, 8, 28, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#6d8f4e";
      const sway = Math.sin(t * 0.8 + v * 9) * 2;
      ctx.beginPath(); ctx.arc(x - 9 + sway, y - 34, 12, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 9 + sway, y - 32, 12, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x + sway, y - 42, 13, 0, TAU); ctx.fill(); ctx.stroke();
      break;
    }
    case "palm": {
      ctx.strokeStyle = OUT;
      ctx.fillStyle = "#9a7448";
      ctx.beginPath();
      ctx.moveTo(x - 4, y); ctx.quadraticCurveTo(x - 2, y - 30, x + 6, y - 44);
      ctx.quadraticCurveTo(x + 10, y - 30, x + 4, y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#5f9e52";
      const sway = Math.sin(t * 0.9 + v * 7) * 3;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.55;
        ctx.beginPath();
        ctx.ellipse(x + 6 + Math.cos(a) * 14 + sway, y - 46 + Math.sin(a) * 9, 13, 4.5, a, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case "lamp": { // farola modernista
      ctx.strokeStyle = OUT;
      ctx.fillStyle = "#3a4046";
      rr(ctx, x - 2.5, y - 44, 5, 45, 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); // brazo curvado
      ctx.moveTo(x, y - 42);
      ctx.quadraticCurveTo(x + 12, y - 46, x + 13, y - 38);
      ctx.lineWidth = 2.4; ctx.stroke(); ctx.lineWidth = 1.6;
      ctx.fillStyle = dark ? "#ffe9a8" : "#d8dde2";
      ctx.beginPath(); ctx.arc(x + 13, y - 35, 4.5, 0, TAU); ctx.fill(); ctx.stroke();
      if (dark) { // halo cálido de gas
        const g = ctx.createRadialGradient(x + 13, y - 35, 2, x + 13, y - 35, 70);
        g.addColorStop(0, "rgba(255,220,140,.35)");
        g.addColorStop(1, "rgba(255,220,140,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x + 13, y - 35, 70, 0, TAU); ctx.fill();
      }
      break;
    }
    case "bench": {
      ctx.strokeStyle = OUT;
      ctx.fillStyle = "#8a6a48";
      rr(ctx, x - 20, y - 12, 40, 6, 2); ctx.fill(); ctx.stroke();
      rr(ctx, x - 20, y - 22, 40, 5, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#3a4046";
      ctx.fillRect(x - 17, y - 8, 4, 8);
      ctx.fillRect(x + 13, y - 8, 4, 8);
      break;
    }
    case "container": { // contenedor de reciclaje
      ctx.strokeStyle = OUT;
      ctx.fillStyle = ["#c9b23a", "#3f7a52", "#3d6ea5"][Math.floor(v * 3)];
      rr(ctx, x - 18, y - 26, 36, 26, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#00000033";
      rr(ctx, x - 10, y - 22, 20, 6, 3); ctx.fill();
      // bolsa que no cabía (siempre hay una)
      ctx.fillStyle = "#555";
      ctx.beginPath(); ctx.arc(x + 22, y - 5, 6, 0, TAU); ctx.fill(); ctx.stroke();
      break;
    }
    case "dumpster": {
      ctx.strokeStyle = OUT;
      ctx.fillStyle = "#5a616b";
      rr(ctx, x - 18, y - 22, 36, 22, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#485058";
      rr(ctx, x - 19, y - 26, 38, 7, 3); ctx.fill(); ctx.stroke();
      ctx.font = "9px serif";
      ctx.fillText("🗑️", x, y - 10);
      break;
    }
    case "scaffold": { // andamio con lona
      ctx.strokeStyle = "#b0893d";
      ctx.lineWidth = 2.6;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(x + i * 16, y); ctx.lineTo(x + i * 16, y - 46); ctx.stroke();
      }
      for (let j = 0; j < 3; j++) {
        ctx.beginPath(); ctx.moveTo(x - 16, y - 8 - j * 16); ctx.lineTo(x + 16, y - 8 - j * 16); ctx.stroke();
      }
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
      ctx.fillStyle = "rgba(120,180,90,.4)"; // malla verde
      rr(ctx, x - 18, y - 44, 36, 40, 2); ctx.fill();
      break;
    }
    case "umbrella": { // sombrilla de playa
      ctx.strokeStyle = OUT;
      ctx.fillStyle = "#9a7448";
      ctx.fillRect(x - 1.5, y - 34, 3, 34);
      const cols = [["#e05252", "#f0e5d2"], ["#3d6ea5", "#f0e5d2"], ["#e8a33d", "#f0e5d2"]][Math.floor(v * 3)];
      ctx.beginPath();
      ctx.moveTo(x - 26, y - 30);
      ctx.quadraticCurveTo(x, y - 52, x + 26, y - 30);
      ctx.closePath();
      ctx.fillStyle = cols[0]; ctx.fill(); ctx.stroke();
      ctx.fillStyle = cols[1];
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x - 16 + i * 20, y - 33);
        ctx.quadraticCurveTo(x - 10 + i * 20, y - 46, x - 4 + i * 20, y - 33.5);
        ctx.closePath(); ctx.fill();
      }
      break;
    }
    case "column": { // columna gótica / pilar del Born
      ctx.strokeStyle = OUT;
      ctx.fillStyle = "#7d7a8c";
      rr(ctx, x - 8, y - 48, 16, 48, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#8d8a9c";
      rr(ctx, x - 11, y - 52, 22, 7, 2); ctx.fill(); ctx.stroke();
      rr(ctx, x - 11, y - 4, 22, 6, 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#00000033";
      ctx.beginPath(); ctx.moveTo(x - 3, y - 46); ctx.lineTo(x - 3, y - 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 3, y - 46); ctx.lineTo(x + 3, y - 6); ctx.stroke();
      break;
    }
    case "cone": {
      ctx.strokeStyle = OUT;
      ctx.fillStyle = "#e8762e";
      ctx.beginPath();
      ctx.moveTo(x - 8, y); ctx.lineTo(x - 2, y - 16); ctx.lineTo(x + 2, y - 16); ctx.lineTo(x + 8, y);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.fillRect(x - 5, y - 9, 10, 3.4);
      break;
    }
    case "moto": { // moto aparcada (en la acera, claro)
      ctx.strokeStyle = OUT;
      ctx.fillStyle = "#2c2c34";
      ctx.beginPath(); ctx.arc(x - 9, y - 4, 4.5, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 9, y - 4, 4.5, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ["#c94f43", "#3d6ea5", "#666"][Math.floor(v * 3)];
      rr(ctx, x - 8, y - 12, 16, 6, 3); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 7, y - 10); ctx.lineTo(x + 11, y - 17); ctx.stroke();
      break;
    }
    case "planter": { // jardinera "vecinal"
      ctx.strokeStyle = OUT;
      ctx.fillStyle = "#8a5f42";
      rr(ctx, x - 11, y - 10, 22, 10, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#6d8f4e";
      ctx.beginPath(); ctx.arc(x - 5, y - 13, 6, 0, TAU); ctx.arc(x + 5, y - 12, 6, 0, TAU); ctx.fill();
      ctx.font = "8px serif";
      ctx.fillText("🌼", x, y - 15);
      break;
    }
    case "statue": { // peana de estatua (o de mimo, quién sabe)
      ctx.strokeStyle = OUT;
      ctx.fillStyle = "#9a97a8";
      rr(ctx, x - 12, y - 8, 24, 8, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#8d8a9c";
      rr(ctx, x - 8, y - 30, 16, 22, 2); ctx.fill(); ctx.stroke();
      ctx.font = "13px serif";
      ctx.fillText("🕊️", x + 8, y - 28); // siempre hay una paloma encima
      break;
    }
    case "fountain": { // Canaletes: si bebes, vuelves
      ctx.strokeStyle = OUT;
      ctx.fillStyle = "#3a4046";
      rr(ctx, x - 6, y - 36, 12, 36, 4); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - 40, 7, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#9fd7ff";
      ctx.beginPath();
      ctx.arc(x - 9, y - 24 + Math.sin(t * 6) * 1.5, 2, 0, TAU);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}
