// ---------------------------------------------------------------------------
// PERSONAJES JUGABLES (meta-progresión: se desbloquean con cèntims).
// ---------------------------------------------------------------------------

export const CHARACTERS = [
  {
    id: "superviviente", name: "Superviviente de barrio", emoji: "😤",
    desc: "El último catalanoparlante del bloque. Equilibrado, como su humor: regular.",
    cost: 0, startWeapon: "clipper",
    sprite: { outfit: "#2e5e4e", pants: "#37414f", face: "angry", hairStyle: "short" }, // chándal del Barça de andar por casa
    stats: { hp: 100, speed: 130, dmgMult: 1, cdMult: 1, magnetR: 60, armor: 0, regen: 0, coinMult: 1 },
  },
  {
    id: "turista", name: "Turista arrepentido", emoji: "🧢",
    desc: "Vino en 2019 de despedida y se le pasó el vuelo. Rápido pero frágil. Empieza con el paraguas robado.",
    cost: 400, startWeapon: "paraguas",
    sprite: { outfit: "#ff9ecb", face: "drunk", hat: "🧢", skin: "#ffb3a0" },
    stats: { hp: 80, speed: 150, dmgMult: 1, cdMult: 1, magnetR: 70, armor: 0, regen: 0, coinMult: 1 },
  },
  {
    id: "camarero", name: "Camarero veterano", emoji: "🧑‍🍳",
    desc: "30 años de terraza. Pega más fuerte (años cargando bandejas) y empieza lanzando bocatas.",
    cost: 800, startWeapon: "bocata",
    sprite: { outfit: "#2c2c34", face: "neutral", prop: "🍽️", hairStyle: "bald", beard: "#5c4632" },
    stats: { hp: 100, speed: 125, dmgMult: 1.2, cdMult: 1, magnetR: 60, armor: 1, regen: 0, coinMult: 1 },
  },
  {
    id: "vecina", name: "Vecina histórica", emoji: "👵",
    desc: "Lo ha visto TODO desde el balcón. Tanque puro y empieza con el silbato: aquí se dispersa todo el mundo.",
    cost: 1200, startWeapon: "silbato",
    sprite: { outfit: "#9a6d9e", face: "old", hairStyle: "grey-bun", prop: "🧹" },
    stats: { hp: 140, speed: 110, dmgMult: 1, cdMult: 0.95, magnetR: 60, armor: 2, regen: 0.3, coinMult: 1 },
  },
  {
    id: "skater", name: "Skater del MACBA", emoji: "🛹",
    desc: "Lleva 15 años intentando el mismo truco en la misma plaza. Rapidísimo, frágil, empieza con la litrona.",
    cost: 1600, startWeapon: "litrona",
    sprite: { outfit: "#c8b445", pants: "#37414f", face: "shades", hat: "🧢", prop: "🛹" },
    stats: { hp: 75, speed: 165, dmgMult: 1.05, cdMult: 1, magnetR: 65, armor: 0, regen: 0, coinMult: 1 },
  },
  {
    id: "pijo", name: "Pijo de Pedralbes", emoji: "⛵",
    desc: "Baja al centro 'a mezclarse'. Gana +30% de cèntims (el dinero llama al dinero) y empieza con la chancla de su yaya.",
    cost: 2500, startWeapon: "chancla",
    sprite: { outfit: "#e8a7b8", pants: "#f0f0e8", face: "shades", hairStyle: "short", hair: "#c9b370", prop: "⛵" },
    stats: { hp: 95, speed: 135, dmgMult: 1, cdMult: 1, magnetR: 75, armor: 1, regen: 0, coinMult: 1.3 },
  },
];
