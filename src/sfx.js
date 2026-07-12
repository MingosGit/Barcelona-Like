// ---------------------------------------------------------------------------
// SFX procedurales con WebAudio: cero assets, máximo juice.
// ---------------------------------------------------------------------------
let ac = null;
let muted = false;

function ctx() {
  if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === "suspended") ac.resume();
  return ac;
}

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

function tone(freq, dur, type = "square", vol = 0.08, slide = 0) {
  if (muted) return;
  try {
    const a = ctx();
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, a.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), a.currentTime + dur);
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur + 0.02);
  } catch { /* autoplay bloqueado: silencio digno */ }
}

export const sfx = {
  hit: () => tone(160 + Math.random() * 60, 0.07, "square", 0.05, -60),
  hurt: () => tone(110, 0.18, "sawtooth", 0.09, -50),
  pickup: () => tone(660 + Math.random() * 120, 0.07, "triangle", 0.06, 220),
  coin: () => { tone(880, 0.06, "square", 0.05); setTimeout(() => tone(1320, 0.09, "square", 0.05), 55); },
  levelup: () => [440, 554, 659, 880].forEach((f, i) => setTimeout(() => tone(f, 0.12, "triangle", 0.08), i * 85)),
  synergy: () => [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.1, "square", 0.06), i * 60)),
  boss: () => { tone(80, 0.5, "sawtooth", 0.12, -20); setTimeout(() => tone(75, 0.6, "sawtooth", 0.12, -25), 350); },
  death: () => [330, 262, 196, 131].forEach((f, i) => setTimeout(() => tone(f, 0.25, "triangle", 0.09), i * 180)),
  victory: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, "triangle", 0.08), i * 120)),
  nova: () => tone(300, 0.25, "sine", 0.08, 500),
  boom: () => tone(70, 0.3, "sawtooth", 0.1, -30),
  flash: () => tone(1200, 0.12, "sine", 0.06, 600),
  slam: () => { tone(90, 0.15, "square", 0.1, -40); setTimeout(() => tone(60, 0.2, "sawtooth", 0.08, -20), 60); },
};
