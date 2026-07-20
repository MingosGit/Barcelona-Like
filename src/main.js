// ---------------------------------------------------------------------------
// Bootstrap: menús DOM, bucle principal, HUD y meta-progresión.
// ---------------------------------------------------------------------------
import { Input } from "./input.js";
import { Game } from "./game.js";
import { render } from "./render.js";
import { BIOMES, BOSSES } from "./data/biomes.js";
import { CHARACTERS } from "./data/characters.js";
import { DEATH_QUOTES } from "./data/enemies.js";
import { MODS } from "./data/mods.js";
import { loadMeta, saveMeta } from "./meta.js";
import { formatTime } from "./util.js";
import { initAds } from "./ads.js";
import { sfx, setMuted, isMuted } from "./sfx.js";
import { cloudAvailable, cloudSync, cloudPush, exportSaveCode, importSaveCode } from "./cloud.js";
import { drawHumanoid, drawRat, drawRoach, drawBird, SKIN_TONES, HAIR_TONES } from "./sprites.js";
import { ENEMIES } from "./data/enemies.js";

const $ = (id) => document.getElementById(id);
const canvas = $("game");
const ctx = canvas.getContext("2d");
const input = new Input();
const TURBO = new URLSearchParams(location.search).has("turbo");

let meta = loadMeta();
let game = null;
let paused = false;
let inLevelUp = false;
let lastT = 0;
let selChar = meta.unlockedChars[0] || "superviviente";
let selBiome = meta.unlockedBiomes[0] || "ramblas";
let selMods = new Set();

// ------------------------------------------------------------ canvas
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

// ------------------------------------------------------------ helpers UI
function show(id) { $(id).classList.add("open"); }
function hide(id) { $(id).classList.remove("open"); }

let toastT = null;
function toast(text) {
  const el = $("toast");
  el.textContent = text;
  el.style.opacity = 1;
  clearTimeout(toastT);
  toastT = setTimeout(() => (el.style.opacity = 0), 2200);
}

function flash() {
  const el = $("flash");
  el.style.opacity = 0.85;
  setTimeout(() => (el.style.opacity = 0), 120);
}

let bossIntroT = null;
function bossIntro(def) {
  const el = $("bossintro");
  el.querySelector(".bi-emoji").textContent = def.emoji;
  el.querySelector(".bi-name").textContent = def.name;
  el.querySelector(".bi-desc").textContent = def.intro;
  el.classList.remove("show");
  void el.offsetWidth; // reinicia las animaciones CSS
  el.classList.add("show");
  clearTimeout(bossIntroT);
  bossIntroT = setTimeout(() => el.classList.remove("show"), 3200);
}

// ------------------------------------------------------------ menú principal
// ------------------------------------------------------------ desfile del menú
// Los propios sprites del juego desfilan por la portada, cada uno con su
// frase. La ciudad se presenta sola.
const charCanvases = [];
const PARADE_IDS = ["guiri", "charo", "galan", "cigarro", "taxista", "gemelos", "senyora", "pandilla", "crucerista", "mimo",
  "rider", "afters", "vecino", "montse", "indepe", "facha", "putero", "hipster", "promotor", "meador", "cunyado", "rata", "gaviota", "kebabero"];
let parade = null;

function initParade(w) {
  parade = [];
  let x = 0;
  for (const id of PARADE_IDS) {
    const def = ENEMIES[id];
    parade.push({
      def, x: x, speed: 26 + Math.random() * 26,
      skin: def.sprite?.skin || SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)],
      hair: HAIR_TONES[Math.floor(Math.random() * HAIR_TONES.length)],
      phase: Math.random() * 6, sayT: 3 + Math.random() * 14,
    });
    x += 62 + Math.random() * 40;
  }
  parade.total = Math.max(x, w + 80);
}

function renderMenuExtras(now) {
  if (!$("menu").classList.contains("open")) return;
  const t = now / 1000;
  const pc = $("parade");
  if (pc) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = pc.clientWidth, chh = pc.clientHeight;
    if (pc.width !== cw * dpr) { pc.width = cw * dpr; pc.height = chh * dpr; }
    const c = pc.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, cw, chh);
    // suelo del desfile
    c.fillStyle = "#00000030";
    c.fillRect(0, chh - 16, cw, 16);
    if (!parade) initParade(cw);
    for (const w of parade) {
      w.x += w.speed / 60;
      if (w.x > parade.total) w.x -= parade.total;
      const x = w.x - 60;
      if (x < -60 || x > cw + 60) continue;
      const y = chh - 14;
      const spec = w.def.sprite || {};
      const o = { t, moving: true, face: 1, scale: 1.08, phase: w.phase, skin: w.skin, hairTone: w.hair };
      if (spec.custom === "rat") drawRat(c, x, y, o);
      else if (spec.custom === "roach") drawRoach(c, x, y, o);
      else if (spec.custom === "bird") drawBird(c, x, y, { ...o, color: spec.color });
      else drawHumanoid(c, spec, x, y, o);
      // de vez en cuando, uno suelta su frase
      w.sayT -= 1 / 60;
      if (w.sayT < 0) w.sayT = 10 + Math.random() * 18;
      if (w.sayT > 8.2 && w.sayT < 10.6) {
        const text = w.def.intro || w.def.quotes[0];
        c.font = "10px Trebuchet MS";
        const tw = c.measureText(text).width + 12;
        c.fillStyle = "rgba(255,255,255,.94)";
        const bx = Math.min(Math.max(x, tw / 2 + 2), cw - tw / 2 - 2);
        c.beginPath();
        c.roundRect(bx - tw / 2, y - 62, tw, 16, 7);
        c.fill();
        c.fillStyle = "#222";
        c.textAlign = "center";
        c.fillText(text, bx, y - 50);
      }
    }
  }
  // retratos animados de las cartas de personaje
  for (const cc of charCanvases) {
    if (!cc.cv.isConnected) continue;
    const c = cc.cv.getContext("2d");
    c.setTransform(2, 0, 0, 2, 0, 0);
    c.clearRect(0, 0, 72, 72);
    c.fillStyle = "#00000038";
    c.beginPath(); c.ellipse(36, 64, 18, 5, 0, 0, Math.PI * 2); c.fill();
    drawHumanoid(c, cc.sprite || {}, 36, 66, { t, moving: false, face: 1, scale: 1.6, phase: cc.phase });
  }
}

const TAGLINES = [
  "L'última persona que parla català contra los tópicos de la ciudad.",
  "Sobrevive a tu propio barrio. Nadie lo ha conseguido aún.",
  "El único juego donde el jefe final es tu casero.",
  "10 minutos de partida. 37 años de hipoteca.",
  "Ni la rata paga tanto alquiler como tú.",
  "Basado en hechos reales. Por desgracia, en todos.",
  "Ahora con más 'amego, ¿segarro?' por metro cuadrado.",
];

function buildMenu() {
  $("menucoins").textContent = `🪙 ${meta.coins} cèntims`;
  document.querySelector("#menu .tagline").textContent = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];

  const cr = $("charrow");
  cr.innerHTML = "";
  charCanvases.length = 0;
  for (const c of CHARACTERS) {
    const unlocked = meta.unlockedChars.includes(c.id);
    const div = document.createElement("div");
    div.className = "selcard" + (selChar === c.id ? " sel" : "") + (unlocked ? "" : " locked");
    div.innerHTML = `<canvas class="charcv" width="144" height="144"></canvas><span class="nm">${c.name}</span>
      <span class="ds">${c.desc}</span>` +
      (unlocked ? "" : `<span class="lk">🔒 ${c.cost} cèntims — toca para desbloquear</span>`);
    charCanvases.push({ cv: div.querySelector("canvas"), sprite: c.sprite, phase: Math.random() * 6 });
    div.onclick = () => {
      if (!unlocked) {
        if (meta.coins >= c.cost) {
          meta.coins -= c.cost;
          meta.unlockedChars.push(c.id);
          saveMeta(meta);
          selChar = c.id;
          toast(`✅ ${c.name} desbloqueado`);
        } else {
          toast(`Te faltan ${c.cost - meta.coins} cèntims. Como para el alquiler.`);
          return;
        }
      } else {
        selChar = c.id;
      }
      buildMenu();
    };
    cr.appendChild(div);
  }

  const br = $("biomerow");
  br.innerHTML = "";
  for (const b of BIOMES) {
    const unlocked = meta.unlockedBiomes.includes(b.id);
    const div = document.createElement("div");
    div.className = "selcard biomecard" + (selBiome === b.id ? " sel" : "") + (unlocked ? "" : " locked");
    div.style.background = `linear-gradient(165deg, ${b.ground}33, #221733 62%)`;
    div.innerHTML = `<span class="em">${b.emoji}</span><span class="nm">${b.name}</span>
      <span class="ds">${b.desc}</span>` +
      (unlocked ? "" : `<span class="lk">🔒 Vence al jefe del barrio anterior</span>`);
    div.onclick = () => {
      if (!unlocked) { toast("Primero sobrevive al barrio anterior."); return; }
      selBiome = b.id;
      buildMenu();
    };
    br.appendChild(div);
  }

  // modificadores de dificultad
  const mr = $("modrow");
  mr.innerHTML = "";
  for (const m of MODS) {
    const chip = document.createElement("div");
    chip.className = "modchip" + (selMods.has(m.id) ? " on" : "");
    chip.innerHTML = `${m.emoji} ${m.name} <span class="mult">×${m.coinMult}</span>`;
    chip.title = m.desc;
    chip.onclick = () => {
      selMods.has(m.id) ? selMods.delete(m.id) : selMods.add(m.id);
      buildMenu();
    };
    mr.appendChild(chip);
  }
  const active = MODS.filter((m) => selMods.has(m.id));
  const totalMult = active.reduce((acc, m) => acc * m.coinMult, 1);
  $("modhint").textContent = active.length
    ? `${active.map((m) => m.desc).join(" · ")} — cèntims ×${totalMult.toFixed(2)}`
    : "Sin modificadores: la ciudad ya es suficientemente hostil.";

  $("mutebtn").textContent = isMuted() ? "🔇 Sonido OFF" : "🔊 Sonido";
}

// ------------------------------------------------------------ partida
function startRun() {
  const biome = BIOMES.find((b) => b.id === selBiome);
  const charDef = CHARACTERS.find((c) => c.id === selChar);
  const mods = MODS.filter((m) => selMods.has(m.id));
  game = new Game(input, biome, charDef, { levelUp: onLevelUp, gameOver: onGameOver, toast, flash, bossIntro }, { turbo: TURBO, mods });
  window.__game = game; // depuración / tests automatizados
  paused = false;
  inLevelUp = false;
  hide("menu");
  hide("gameover");
  $("hud").style.display = "block";
  $("pausebtn").style.display = "block";
  $("bossbar").style.display = "none";
  $("rentwrap").style.display = "none";
  lastT = performance.now();
}

function quitToMenu() {
  game = null;
  paused = false;
  inLevelUp = false;
  hide("paused");
  hide("levelup");
  hide("gameover");
  $("hud").style.display = "none";
  $("pausebtn").style.display = "none";
  $("bossbar").style.display = "none";
  buildMenu();
  show("menu");
}

// ------------------------------------------------------------ subida de nivel
function onLevelUp() {
  inLevelUp = true;
  sfx.levelup();
  const row = $("uprow");
  row.innerHTML = "";
  const subs = [
    "Elige tu mejora. Ninguna soluciona el alquiler.",
    "Tres opciones, como los pisos de Idealista: todas con trampa.",
    "Escoge rápido, que la terraza cierra a las 12 por ordenanza.",
    "El nivel sube. El barrio también. Todo sube.",
  ];
  $("lvlsub").textContent = subs[Math.floor(Math.random() * subs.length)];
  const choices = game.getUpgradeChoices();
  if (!choices.length) { inLevelUp = false; game.consumeLevelUp(); return; }
  for (const c of choices) {
    const div = document.createElement("div");
    div.className = "upcard";
    div.innerHTML = `<span class="em">${c.emoji}</span><span class="tp ${c.type}">${c.type}</span>
      <span class="nm">${c.name}</span><span class="ds">${c.desc}</span>`;
    div.onclick = () => {
      game.applyChoice(c);
      hide("levelup");
      if (game.consumeLevelUp()) {
        onLevelUp(); // había más niveles en cola
      } else {
        inLevelUp = false;
        lastT = performance.now();
      }
    };
    row.appendChild(div);
  }
  show("levelup");
}

// ------------------------------------------------------------ fin de partida
function onGameOver(res) {
  meta.coins += res.coins;
  meta.totalKills += res.kills;
  meta.bestTime = Math.max(meta.bestTime, res.time);
  if (res.victory) {
    if (!meta.bossesBeaten.includes(res.biome.boss)) meta.bossesBeaten.push(res.biome.boss);
    const idx = BIOMES.findIndex((b) => b.id === res.biome.id);
    const next = BIOMES[idx + 1];
    if (next && !meta.unlockedBiomes.includes(next.id)) {
      meta.unlockedBiomes.push(next.id);
      toast(`🗺️ Nuevo barrio desbloqueado: ${next.name}`);
    }
  }
  meta.savedAt = Date.now();
  saveMeta(meta);
  cloudPush(); // si hay sesión de Google, sube el progreso

  const t = $("goTitle");
  if (res.victory) {
    t.textContent = idx_victory_title(res.biome.id);
    t.className = "victoria";
    $("deathquote").textContent = BOSSES[res.biome.boss].name + " ha caído. El barrio respira... hasta la próxima temporada alta.";
  } else {
    const titles = ["HAS SIDO GENTRIFICADO", "DESAHUCIADO", "FIN DE CONTRATO (SIN RENOVAR)",
      "EL BARRIO TE HA ESCUPIDO", "CONVERTIDO EN AIRBNB", "BAJA POR TÓPICOS"];
    t.textContent = titles[Math.floor(Math.random() * titles.length)];
    t.className = "derrota";
    $("deathquote").textContent = DEATH_QUOTES[res.killedBy] || DEATH_QUOTES.generic;
  }
  $("gostats").innerHTML =
    `⏱️ Tiempo <b>${formatTime(res.time)}</b><br>` +
    `💀 Tópicos dispersados <b>${res.kills}</b><br>` +
    `📈 Nivel alcanzado <b>${res.level}</b><br>` +
    `🪙 Cèntims ganados <b>+${res.coins}</b><br>` +
    `🏦 Total ahorrado <b>${meta.coins}</b> <span style="font-size:11px;color:#b8a99a">(no da ni para fianza)</span>`;
  setTimeout(() => {
    $("hud").style.display = "none";
    $("pausebtn").style.display = "none";
    $("bossbar").style.display = "none";
    show("gameover");
  }, 900);
}

function idx_victory_title(biomeId) {
  return biomeId === "sagrada" ? "¡LA OBRA SE HA ACABADO!" : "¡BARRIO LIBERADO!";
}

// ------------------------------------------------------------ HUD
function updateHud() {
  const p = game.player;
  $("hpbar").firstElementChild.style.width = `${(p.hp / p.maxHp) * 100}%`;
  $("xpbar").firstElementChild.style.width = `${(p.xp / p.xpNext) * 100}%`;
  $("timer").textContent = formatTime(game.time);
  $("lvlchip").textContent = `Nv ${p.level}`;
  $("killchip").textContent = `💀 ${p.kills}`;
  $("coinchip").textContent = `🪙 ${p.coins}`;

  const boss = game.boss;
  if (boss) {
    $("bossbar").style.display = "block";
    $("bossname").textContent = `${boss.def.emoji} ${boss.def.name}`;
    $("bossfill").style.width = `${(boss.hp / boss.maxHp) * 100}%`;
    if (boss.ai === "bossCasero") {
      $("rentwrap").style.display = "block";
      $("rentfill").style.width = `${(boss.state.rent || 0) * 100}%`;
    }
  } else {
    $("bossbar").style.display = "none";
  }
}

// ------------------------------------------------------------ pausa
$("pausebtn").onclick = () => { if (game && !inLevelUp && !game.over) { paused = true; show("paused"); } };
$("resumebtn").onclick = () => { paused = false; hide("paused"); lastT = performance.now(); };
$("quitbtn").onclick = quitToMenu;
$("startbtn").onclick = startRun;
$("againbtn").onclick = () => { game = null; hide("gameover"); buildMenu(); show("menu"); };
document.addEventListener("visibilitychange", () => {
  if (document.hidden && game && !game.over && !inLevelUp) { paused = true; show("paused"); }
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && game && !game.over && !inLevelUp) {
    paused = !paused;
    paused ? show("paused") : (hide("paused"), (lastT = performance.now()));
  }
});

// ------------------------------------------------------------ bucle
function loop(t) {
  requestAnimationFrame(loop);
  if (!game) { renderMenuExtras(t); return; }
  const dt = Math.min((t - lastT) / 1000, 0.1);
  lastT = t;
  if (!paused && !inLevelUp && !game.over) {
    game.update(dt);
    updateHud();
  }
  render(game, ctx, window.innerWidth, window.innerHeight);
}

// ------------------------------------------------------------ ajustes y guardado
$("mutebtn").onclick = () => { setMuted(!isMuted()); buildMenu(); };

$("googlebtn").onclick = async () => {
  if (!cloudAvailable()) {
    toast("Configura googleClientId en config.js para activar el guardado en Google");
    return;
  }
  try {
    await cloudSync(toast);
    meta = loadMeta();
    buildMenu();
  } catch (e) {
    toast("No se pudo conectar con Google: " + (e?.message || e));
  }
};

$("exportbtn").onclick = async () => {
  const code = exportSaveCode();
  try {
    await navigator.clipboard.writeText(code);
    toast("📋 Código de guardado copiado al portapapeles");
  } catch {
    prompt("Copia tu código de guardado:", code);
  }
};

$("importbtn").onclick = () => {
  const code = prompt("Pega tu código de guardado (BCN1.…):");
  if (!code) return;
  try {
    meta = importSaveCode(code.trim());
    buildMenu();
    toast("✅ Guardado importado");
  } catch (e) {
    toast("❌ " + (e?.message || "Código no válido"));
  }
};

initAds();
buildMenu();
requestAnimationFrame(loop);
