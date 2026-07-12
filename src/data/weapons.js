// ---------------------------------------------------------------------------
// ARMAS TEMÁTICAS. Cada una contrarresta (vía rules.js) a un arquetipo.
// kind = comportamiento genérico implementado en game.js:
//   cone | aura | beam | ram | boomerang | nova | bomb | orbit
// levels[] = stats por nivel (nivel 1 = índice 0). Máximo nivel 5.
// ---------------------------------------------------------------------------

export const WEAPONS = {
  clipper: {
    id: "clipper", name: 'Mechero "Clipper" infinito', emoji: "🔥", kind: "cone",
    tags: ["fuego"],
    desc: "Llamarada en cono. Quema. Contrarresta al enjambre del cigarrito: sin fuego no hay 'fuego, ¿tienes?'.",
    levels: [
      { dmg: 6, cd: 1.5, range: 110, arc: 0.9 },
      { dmg: 8, cd: 1.3, range: 125, arc: 1.0 },
      { dmg: 11, cd: 1.15, range: 140, arc: 1.15 },
      { dmg: 14, cd: 1.0, range: 160, arc: 1.3 },
      { dmg: 19, cd: 0.85, range: 180, arc: 1.5 },
    ],
  },
  sangria: {
    id: "sangria", name: "Cubo de sangría giratorio", emoji: "🍷", kind: "aura",
    tags: ["area", "liquido"],
    desc: "Aura que salpica: 'emborracha' (ralentiza) y empapa. Los guiris entran solos, es su hábitat natural.",
    levels: [
      { dmg: 3, tick: 0.7, radius: 75 },
      { dmg: 4, tick: 0.65, radius: 88 },
      { dmg: 5, tick: 0.6, radius: 100 },
      { dmg: 7, tick: 0.5, radius: 112 },
      { dmg: 9, tick: 0.45, radius: 130 },
    ],
  },
  ringlight: {
    id: "ringlight", name: "Ring light láser", emoji: "💡", kind: "beam",
    tags: ["luz"],
    desc: "Aro de luz que barre en círculo. A las Charos les devuelve el flash: cegadas por su propio aesthetic.",
    levels: [
      { dmg: 4, tick: 0.3, length: 130, beams: 1, rot: 1.6 },
      { dmg: 5, tick: 0.28, length: 150, beams: 1, rot: 1.9 },
      { dmg: 6, tick: 0.26, length: 165, beams: 2, rot: 2.1 },
      { dmg: 8, tick: 0.24, length: 180, beams: 2, rot: 2.4 },
      { dmg: 10, tick: 0.22, length: 200, beams: 3, rot: 2.7 },
    ],
  },
  bicing: {
    id: "bicing", name: "Bicing embestida", emoji: "🚲", kind: "ram",
    tags: ["choque"],
    desc: "Cada pocos segundos, sprint automático arrollando lo que pilles. Contra patinetes y taxis: justicia vial.",
    levels: [
      { dmg: 14, cd: 6, dashLen: 200, width: 40 },
      { dmg: 18, cd: 5.4, dashLen: 220, width: 44 },
      { dmg: 24, cd: 4.8, dashLen: 245, width: 48 },
      { dmg: 30, cd: 4.2, dashLen: 270, width: 54 },
      { dmg: 40, cd: 3.6, dashLen: 300, width: 60 },
    ],
  },
  bocata: {
    id: "bocata", name: "Bocadillo de calamares boomerang", emoji: "🥖", kind: "boomerang",
    tags: ["proyectil", "comida"],
    desc: "Proyectil que atraviesa y vuelve. Como todo bocata de calamares digno: siempre vuelve a ti.",
    levels: [
      { dmg: 9, cd: 2.2, speed: 300, count: 1 },
      { dmg: 12, cd: 2.0, speed: 320, count: 1 },
      { dmg: 14, cd: 1.8, speed: 340, count: 2 },
      { dmg: 17, cd: 1.6, speed: 360, count: 2 },
      { dmg: 22, cd: 1.4, speed: 380, count: 3 },
    ],
  },
  silbato: {
    id: "silbato", name: "Silbato de Guàrdia Urbana", emoji: "📯", kind: "nova",
    tags: ["sonido", "area"],
    desc: "Pitido radial que empuja y asusta. La venta ambulante desaparece por reflejo condicionado.",
    levels: [
      { dmg: 4, cd: 4, radius: 130, knock: 160 },
      { dmg: 6, cd: 3.6, radius: 150, knock: 180 },
      { dmg: 8, cd: 3.2, radius: 170, knock: 200 },
      { dmg: 10, cd: 2.8, radius: 190, knock: 220 },
      { dmg: 14, cd: 2.4, radius: 215, knock: 250 },
    ],
  },
  brava: {
    id: "brava", name: "Patata brava explosiva", emoji: "🥔", kind: "bomb",
    tags: ["explosivo", "area", "picante"],
    desc: "Bomba de área que deja charco de salsa brava (daño en el tiempo). Nivel de picante: 'de verdad, no guiri'.",
    levels: [
      { dmg: 12, cd: 3.5, radius: 70, dotDmg: 3, dotDur: 3 },
      { dmg: 16, cd: 3.2, radius: 80, dotDmg: 4, dotDur: 3.5 },
      { dmg: 20, cd: 2.9, radius: 90, dotDmg: 5, dotDur: 4 },
      { dmg: 26, cd: 2.6, radius: 100, dotDmg: 6, dotDur: 4 },
      { dmg: 34, cd: 2.2, radius: 115, dotDmg: 8, dotDur: 4.5 },
    ],
  },
  paraguas: {
    id: "paraguas", name: "Paraguas de guía turístico", emoji: "🌂", kind: "orbit",
    tags: ["escudo", "area"],
    desc: "Paraguas orbitando que golpea y aturde. Robado a un free tour. La ironía hace daño extra moral.",
    levels: [
      { dmg: 6, count: 1, radius: 70, rot: 2.4, stun: 0.4 },
      { dmg: 8, count: 2, radius: 75, rot: 2.6, stun: 0.4 },
      { dmg: 10, count: 2, radius: 82, rot: 2.9, stun: 0.5 },
      { dmg: 13, count: 3, radius: 90, rot: 3.2, stun: 0.5 },
      { dmg: 17, count: 4, radius: 98, rot: 3.6, stun: 0.6 },
    ],
  },
};

export const MAX_WEAPON_LEVEL = 5;
export const MAX_WEAPON_SLOTS = 5;
