// Meta-progresión persistente entre partidas (localStorage).
const KEY = "barcalypse_save_v1";

const DEFAULTS = {
  coins: 0,
  unlockedChars: ["superviviente"],
  unlockedBiomes: ["ramblas"],
  totalKills: 0,
  bestTime: 0,
  bossesBeaten: [],
};

export function loadMeta() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveMeta(meta) {
  try {
    localStorage.setItem(KEY, JSON.stringify(meta));
  } catch {
    /* modo incógnito: la ciudad no recuerda nada, como siempre */
  }
}
