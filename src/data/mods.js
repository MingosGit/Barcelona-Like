// ---------------------------------------------------------------------------
// MODIFICADORES DE DIFICULTAD (mutadores). Se eligen antes de la partida,
// se pueden combinar y multiplican los cèntims ganados.
// apply(game) se ejecuta en el constructor de la partida.
// ---------------------------------------------------------------------------

export const MODS = [
  {
    id: "temporada_alta", name: "Temporada alta", emoji: "🧳", coinMult: 1.25,
    desc: "+60% de spawns. Agosto, vaya.",
    apply: (g) => { g.spawnRateMult *= 1.6; },
  },
  {
    id: "ola_calor", name: "Ola de calor", emoji: "🥵", coinMult: 1.2,
    desc: "Tú −12% velocidad, ellos +10%. 34°C y 90% de humedad: el asfalto también te odia.",
    apply: (g) => { g.player.speedMult *= 0.88; g.globalEnemySpeed *= 1.1; },
  },
  {
    id: "huelga_metro", name: "Huelga de metro", emoji: "🚇", coinMult: 1.2,
    desc: "−50% de radio de imán: los tickets de metro (XP) casi hay que ir a buscarlos a pie. Lógico.",
    apply: (g) => { g.player.magnetR *= 0.5; },
  },
  {
    id: "merce", name: "Festes de la Mercè", emoji: "🎆", coinMult: 1.3,
    desc: "Triple de élites 👑 y aparecen antes. La ciudad entera está en la calle, incluida la peor parte.",
    apply: (g) => { g.eliteChanceMult *= 3; g.eliteFrom = 60; },
  },
  {
    id: "alquiler_diario", name: "Alquiler al día", emoji: "🔑", coinMult: 1.5,
    desc: "Pierdes 1 de vida por segundo, siempre. El casero cobra hasta cuando esquivas.",
    apply: (g) => { g.rentDrain = 1; },
  },
  {
    id: "piso_compartido", name: "Piso compartido", emoji: "🚪", coinMult: 1.35,
    desc: "Máximo 3 armas: en tu habitación de 6m² no cabe más arsenal.",
    apply: (g) => { g.maxWeaponSlots = 3; },
  },
];
