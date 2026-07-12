// ---------------------------------------------------------------------------
// PERSONAJES JUGABLES (meta-progresión: se desbloquean con cèntims).
// ---------------------------------------------------------------------------

export const CHARACTERS = [
  {
    id: "superviviente", name: "Superviviente de barrio", emoji: "😤",
    desc: "El último catalanoparlante del bloque. Equilibrado, como su humor: regular.",
    cost: 0, startWeapon: "clipper",
    stats: { hp: 100, speed: 130, dmgMult: 1, cdMult: 1, magnetR: 60, armor: 0, regen: 0 },
  },
  {
    id: "turista", name: "Turista arrepentido", emoji: "🧢",
    desc: "Vino en 2019 de despedida y se le pasó el vuelo. Rápido pero frágil. Empieza con el paraguas robado.",
    cost: 400, startWeapon: "paraguas",
    stats: { hp: 80, speed: 150, dmgMult: 1, cdMult: 1, magnetR: 70, armor: 0, regen: 0 },
  },
  {
    id: "camarero", name: "Camarero veterano", emoji: "🧑‍🍳",
    desc: "30 años de terraza. Pega más fuerte (años cargando bandejas) y empieza lanzando bocatas.",
    cost: 800, startWeapon: "bocata",
    stats: { hp: 100, speed: 125, dmgMult: 1.2, cdMult: 1, magnetR: 60, armor: 1, regen: 0 },
  },
  {
    id: "vecina", name: "Vecina histórica", emoji: "👵",
    desc: "Lo ha visto TODO desde el balcón. Tanque puro y empieza con el silbato: aquí se dispersa todo el mundo.",
    cost: 1200, startWeapon: "silbato",
    stats: { hp: 140, speed: 110, dmgMult: 1, cdMult: 0.95, magnetR: 60, armor: 2, regen: 0.3 },
  },
];
