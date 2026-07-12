// ---------------------------------------------------------------------------
// BIOMAS (barrios). Cada uno define paleta, obstáculos, tabla de spawns con
// puertas de tiempo, duración y jefe. Se desbloquean en orden al matar jefes.
//
// spawns: { id, w (peso), from (segundos desde inicio) }
// obstacleDensity: probabilidad de obstáculo por celda de 170px.
// ---------------------------------------------------------------------------

export const BIOMES = [
  {
    id: "ramblas", name: "Les Rambles", emoji: "💐",
    desc: "Denso, sin sitio para moverse, mucho guiri por metro cuadrado. El bioma inicial: bienvenido al epicentro.",
    ground: "#b7a98c", groundAlt: "#ac9e82", decoColor: "#8c7f66",
    obstacleDensity: 0.16, obstacles: ["🌳", "💐", "🗞️"], dark: false, slowPatches: false,
    duration: 600, boss: "turista",
    spawns: [
      { id: "cigarro", w: 10, from: 0 },
      { id: "guiri", w: 8, from: 25 },
      { id: "charo", w: 5, from: 60 },
      { id: "mimo", w: 3, from: 90 },
      { id: "mantero", w: 4, from: 120 },
      { id: "freetour", w: 2, from: 180 },
      { id: "patinete", w: 4, from: 240 },
      { id: "cunyado", w: 3, from: 300 },
      { id: "hipster", w: 2, from: 380 },
    ],
  },
  {
    id: "barceloneta", name: "La Barceloneta", emoji: "🏖️",
    desc: "Arena abierta, literalmente. Los obstáculos son toallas y sombrillas. Los guiris, infinitos.",
    ground: "#d9c28f", groundAlt: "#d0b986", decoColor: "#b09a6a",
    obstacleDensity: 0.10, obstacles: ["⛱️", "🌴"], dark: false, slowPatches: true, slowEmoji: "🏖️",
    duration: 600, boss: "turista2",
    spawns: [
      { id: "guiri", w: 10, from: 0 },
      { id: "latero", w: 6, from: 20 },
      { id: "charo", w: 5, from: 45 },
      { id: "patinete", w: 5, from: 90 },
      { id: "rider", w: 4, from: 150 },
      { id: "mantero", w: 5, from: 180 },
      { id: "freetour", w: 3, from: 240 },
      { id: "cigarro", w: 5, from: 300 },
      { id: "hipster", w: 2, from: 400 },
    ],
  },
  {
    id: "gracia", name: "Gràcia", emoji: "🏘️",
    desc: "Calles estrechas tipo laberinto, plazas como respiro... hasta que llega el jefe. Cuidado con las asambleas.",
    ground: "#9d9384", groundAlt: "#948a7b", decoColor: "#6e6557",
    obstacleDensity: 0.30, obstacles: ["🏠", "🪴", "🛵"], dark: false, slowPatches: false, maze: true,
    duration: 600, boss: "casero",
    spawns: [
      { id: "vecino", w: 8, from: 0 },
      { id: "perroflauta", w: 6, from: 30 },
      { id: "hipster", w: 5, from: 60 },
      { id: "cigarro", w: 5, from: 90 },
      { id: "indepe", w: 5, from: 120 },
      { id: "charo", w: 4, from: 180 },
      { id: "rider", w: 4, from: 240 },
      { id: "cunyado", w: 4, from: 300 },
    ],
  },
  {
    id: "gotic", name: "El Born / Gòtic", emoji: "🌙",
    desc: "Bioma nocturno. Callejones, poca luz y mimos que no ves venir. Todo es precioso y todo quiere robarte.",
    ground: "#3b3a4d", groundAlt: "#343346", decoColor: "#22212f",
    obstacleDensity: 0.24, obstacles: ["🏛️", "🕯️", "🚧"], dark: true, maze: true,
    duration: 600, boss: "virtuoso",
    spawns: [
      { id: "mimo", w: 7, from: 0 },
      { id: "ratero", w: 5, from: 30 },
      { id: "guiri", w: 6, from: 60 },
      { id: "mantero", w: 5, from: 90 },
      { id: "charo", w: 4, from: 150 },
      { id: "freetour", w: 3, from: 210 },
      { id: "taxista", w: 3, from: 270 },
      { id: "facha", w: 3, from: 330 },
      { id: "indepe", w: 3, from: 330 },
    ],
  },
  {
    id: "raval", name: "El Raval", emoji: "🌆",
    desc: "Donde se junta todo y todos. Rateros velocísimos que no dudan en pincharte. El bioma más honesto de la ciudad.",
    ground: "#6b5d55", groundAlt: "#63564e", decoColor: "#443a34",
    obstacleDensity: 0.22, obstacles: ["🛒", "📦", "🚧"], dark: false, maze: true,
    duration: 600, boss: "topmanta",
    spawns: [
      { id: "ratero", w: 8, from: 0 },
      { id: "latero", w: 6, from: 0 },
      { id: "mantero", w: 6, from: 30 },
      { id: "cigarro", w: 6, from: 60 },
      { id: "patinete", w: 4, from: 90 },
      { id: "hipster", w: 4, from: 150 },
      { id: "perroflauta", w: 4, from: 210 },
      { id: "taxista", w: 3, from: 270 },
      { id: "guiri", w: 5, from: 330 },
      { id: "mimo", w: 3, from: 390 },
    ],
  },
  {
    id: "sagrada", name: "Sagrada Família", emoji: "⛪",
    desc: "Bioma final. Las obras interminables SON el jefe: grúas que caen, vallas que brotan. Terminarla, no se termina.",
    ground: "#8f8578", groundAlt: "#877d70", decoColor: "#5f574d",
    obstacleDensity: 0.20, obstacles: ["🚧", "🏗️", "🧱"], dark: false, craneRain: true,
    duration: 600, boss: "grua",
    spawns: [
      { id: "freetour", w: 7, from: 0 },
      { id: "charo", w: 7, from: 0 },
      { id: "guiri", w: 6, from: 30 },
      { id: "patinete", w: 5, from: 60 },
      { id: "taxista", w: 4, from: 120 },
      { id: "rider", w: 5, from: 150 },
      { id: "facha", w: 3, from: 210 },
      { id: "indepe", w: 3, from: 210 },
      { id: "vecino", w: 4, from: 270 },
      { id: "ratero", w: 4, from: 330 },
      { id: "mimo", w: 4, from: 390 },
    ],
  },
];

// -------------------------------- JEFES ------------------------------------
// ai: clave del comportamiento en game.js (bossTurista, bossCasero, ...)
export const BOSSES = {
  turista: {
    id: "turista", name: "EL TURISTA DEFINITIVO", emoji: "🧳", ai: "bossTurista",
    hp: 900, speed: 60, dmg: 15, r: 34, xp: 60,
    tags: ["guiri", "postureo", "vehiculo"],
    intro: "Fusión de guiri, Charo y segway. Tiene 4 estómagos: todos de sangría.",
  },
  turista2: {
    id: "turista2", name: "EL TURISTA DEFINITIVO (ALL INCLUSIVE)", emoji: "🛳️", ai: "bossTurista",
    hp: 1400, speed: 66, dmg: 18, r: 36, xp: 80, rageAt: 0.5,
    tags: ["guiri", "postureo", "vehiculo"],
    intro: "Ha bajado de un crucero de 6.000 plazas. Las 6.000 vienen detrás.",
  },
  casero: {
    id: "casero", name: "EL CASERO DEL AIRBNB", emoji: "🔑", ai: "bossCasero",
    hp: 1600, speed: 46, dmg: 12, r: 32, xp: 100,
    tags: ["postureo", "papel"],
    intro: "Cada segundo que tardas, EL ALQUILER SUBE. Cuando la barra se llena: reforma sorpresa.",
  },
  virtuoso: {
    id: "virtuoso", name: "EL VIRTUÓS DEL METRO", emoji: "🎻", ai: "bossVirtuoso",
    hp: 1800, speed: 55, dmg: 14, r: 32, xp: 110,
    tags: ["callejero", "postureo"],
    intro: "Lleva el 'Despacito' en bucle desde 2017. Sus ondas de sonido son literalmente un arma.",
  },
  topmanta: {
    id: "topmanta", name: "EL REY DEL TOP MANTA", emoji: "🛍️", ai: "bossTopmanta",
    hp: 2000, speed: 75, dmg: 14, r: 33, xp: 120,
    tags: ["callejero"],
    intro: "Su manta es un portal. Se teletransporta, invoca a su gremio y su stock es infinito.",
  },
  grua: {
    id: "grua", name: "LA OBRA INTERMINABLE", emoji: "🏗️", ai: "bossGrua",
    hp: 2600, speed: 30, dmg: 20, r: 42, xp: 200,
    tags: ["vehiculo", "grupo"],
    intro: "En obras desde 1882. Hoy tampoco se acaba. Grúas que caen, vallas que brotan, presupuesto que se esfuma.",
  },
};
