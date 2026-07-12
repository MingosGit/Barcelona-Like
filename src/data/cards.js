// ---------------------------------------------------------------------------
// CARTAS DE MEJORA (se ofrecen 3 al subir de nivel, estilo deck-building).
// Tipos: arma nueva | mejora de arma | pasiva | sinergia (añade una REGLA
// al motor de combate en caliente — el showcase del pattern matching).
// ---------------------------------------------------------------------------

export const PASSIVES = [
  {
    id: "fuet", name: "Bocata de fuet", emoji: "🥪", type: "pasiva",
    desc: "+25 vida máxima y te cura 25. El seguro médico de toda la vida.",
    apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); },
  },
  {
    id: "chandal", name: "Chándal aerodinámico", emoji: "👟", type: "pasiva",
    desc: "+12% velocidad. El uniforme oficial de bajar un momento al chino.",
    apply: (p) => { p.speedMult *= 1.12; },
  },
  {
    id: "cafe", name: "Café solo del bar de menú", emoji: "☕", type: "pasiva",
    desc: "-10% de espera entre ataques. Sube la tensión, literal.",
    apply: (p) => { p.cdMult *= 0.9; },
  },
  {
    id: "malaleche", name: "Mala leche crónica", emoji: "😤", type: "pasiva",
    desc: "+15% de daño global. Alimentada por años de obras en tu calle.",
    apply: (p) => { p.dmgMult *= 1.15; },
  },
  {
    id: "rinyonera", name: "Riñonera táctica", emoji: "👝", type: "pasiva",
    desc: "-2 de daño de cada golpe recibido. Ahí no entra ni un ratero.",
    apply: (p) => { p.armor += 2; },
  },
  {
    id: "iman", name: "Imán de nevera de Bar Manolo", emoji: "🧲", type: "pasiva",
    desc: "+40% de radio para recoger tickets de metro (XP).",
    apply: (p) => { p.magnetR *= 1.4; },
  },
  {
    id: "vermut", name: "Vermut de aperitivo", emoji: "🍸", type: "pasiva",
    desc: "Regeneras 0,6 de vida por segundo. La medicina del mediodía.",
    apply: (p) => { p.regen += 0.6; },
  },
];

// Sinergias: requieren tener ciertas armas; su efecto es añadir una regla
// declarativa nueva al RuleEngine (¡el sistema pedido en el diseño!).
export const SYNERGIES = [
  {
    id: "flambe_total", name: "Flambeado profesional", emoji: "🍳", type: "sinergia",
    needs: ["clipper", "sangria"],
    desc: "REGLA NUEVA: fuego contra CUALQUIER enemigo empapado → además explota en quemadura larga.",
    rule: {
      id: "flambe_total",
      when: { weapon: ["fuego"], enemy: { status: ["empapado"] } },
      then: { damageMult: 1.5, addStatus: [{ id: "ardiendo", dur: 5 }], banner: "¡FLAMBÉ! " },
    },
  },
  {
    id: "brava_picantisima", name: "Salsa del Bar Tomás", emoji: "🌶️", type: "sinergia",
    needs: ["brava"],
    desc: "REGLA NUEVA: picante contra enemigos ardiendo → daño x2,5. Combo ilegal en 7 comunidades.",
    rule: {
      id: "brava_picantisima",
      when: { weapon: ["picante"], enemy: { status: ["ardiendo"] } },
      then: { damageMult: 2.5, banner: "¡RECALENTADO! x2,5" },
    },
  },
  {
    id: "concierto_privado", name: "Concierto no solicitado", emoji: "🔊", type: "sinergia",
    needs: ["silbato", "ringlight"],
    desc: "REGLA NUEVA: sonido contra cegados → x2 y los aturde. Luces y música: ya es una discoteca.",
    rule: {
      id: "concierto_privado",
      when: { weapon: ["sonido"], enemy: { status: ["cegado"] } },
      then: { damageMult: 2, addStatus: [{ id: "aturdido", dur: 1 }], banner: "¡FIESTA! x2" },
    },
  },
  {
    id: "reparto_a_domicilio", name: "Reparto a domicilio", emoji: "📦", type: "sinergia",
    needs: ["bicing", "bocata"],
    desc: "REGLA NUEVA: proyectiles de comida contra enemigos aturdidos → x2. Entrega en mano.",
    rule: {
      id: "reparto_a_domicilio",
      when: { weapon: ["comida"], enemy: { status: ["aturdido"] } },
      then: { damageMult: 2, banner: "¡ENTREGADO! x2" },
    },
  },
];
