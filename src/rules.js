// ---------------------------------------------------------------------------
// MOTOR DE REGLAS DE COMBATE (pattern matching declarativo)
// ---------------------------------------------------------------------------
// Toda interacción arma→enemigo pasa por aquí. Las reglas se declaran como
// datos, no como código, para poder añadir enemigos/armas/sinergias sin tocar
// el core loop. Una regla tiene esta forma:
//
//   {
//     id: 'flambeado',
//     when: {
//       weapon: ['fuego'],                       // el arma debe tener TODAS estas tags
//       enemy:  { tags: [...], status: [...] },  // el enemigo debe tener TODAS estas
//     },
//     then: {
//       damageMult: 3,             // multiplicador de daño (se acumulan multiplicando)
//       knockback: 200,            // empuje extra (se queda el mayor)
//       addStatus: [{ id: 'ardiendo', dur: 3 }], // estados que aplica al enemigo
//       banner: '¡FLAMBEADO!',     // texto flotante al dispararse la sinergia
//     },
//   }
//
// Las cartas de sinergia añaden reglas en caliente con engine.add(rule).
// ---------------------------------------------------------------------------

export const BASE_RULES = [
  {
    id: "flambeado",
    when: { weapon: ["fuego"], enemy: { status: ["empapado"] } },
    then: { damageMult: 3, addStatus: [{ id: "ardiendo", dur: 3 }], banner: "¡FLAMBEADO! x3" },
    desc: "Fuego + enemigo empapado en sangría → daño x3 y arde.",
  },
  {
    id: "dispersa-enjambre",
    when: { weapon: ["area"], enemy: { tags: ["enjambre"] } },
    then: { knockback: 220 },
    desc: "Área contra enjambres → knockback masivo.",
  },
  {
    id: "su-propia-medicina",
    when: { weapon: ["luz"], enemy: { tags: ["postureo"] } },
    then: { damageMult: 2, addStatus: [{ id: "cegado", dur: 1.5 }], banner: "¡SU PROPIA MEDICINA! x2" },
    desc: "Luz contra postureo → x2 y les ciega a ellos.",
  },
  {
    id: "que-viene-la-urbana",
    when: { weapon: ["sonido"], enemy: { tags: ["callejero"] } },
    then: { damageMult: 1.5, addStatus: [{ id: "miedo", dur: 2 }], banner: "¡LA URBANA!" },
    desc: "Sonido de silbato contra venta ambulante → huyen despavoridos.",
  },
  {
    id: "prioridad-ciclista",
    when: { weapon: ["choque"], enemy: { tags: ["vehiculo"] } },
    then: { damageMult: 2, knockback: 260, banner: "¡CARRIL BICI! x2" },
    desc: "Choque contra vehículos → x2 (por fin gana la bici).",
  },
  {
    id: "no-esta-acostumbrado",
    when: { weapon: ["picante"], enemy: { tags: ["guiri"] } },
    then: { damageMult: 2, banner: "¡TOO SPICY! x2" },
    desc: "Salsa brava contra guiris → x2, no están acostumbrados.",
  },
  {
    id: "burocracia-inflamable",
    when: { weapon: ["fuego"], enemy: { tags: ["papel"] } },
    then: { damageMult: 2, addStatus: [{ id: "ardiendo", dur: 2 }] },
    desc: "Fuego contra enemigos de panfleto/papeleo → x2 y arden.",
  },
  {
    id: "resbalon",
    when: { enemy: { status: ["empapado", "cegado"] } },
    then: { addStatus: [{ id: "aturdido", dur: 0.8 }] },
    desc: "Empapado + cegado a la vez → resbala y queda aturdido.",
  },
];

export class RuleEngine {
  constructor(rules = BASE_RULES) {
    this.rules = rules.map((r) => ({ ...r }));
  }

  add(rule) {
    this.rules.push(rule);
  }

  // ctx = { weaponTags: Set, enemyTags: Set, enemyStatuses: Set }
  resolve(ctx) {
    const out = { mult: 1, knockback: 0, addStatus: [], banners: [] };
    for (const r of this.rules) {
      if (!this.matches(r.when, ctx)) continue;
      const t = r.then;
      if (t.damageMult) out.mult *= t.damageMult;
      if (t.knockback) out.knockback = Math.max(out.knockback, t.knockback);
      if (t.addStatus) out.addStatus.push(...t.addStatus);
      if (t.banner) out.banners.push(t.banner);
    }
    return out;
  }

  matches(when, ctx) {
    if (!when) return false;
    if (when.weapon) {
      for (const tag of when.weapon) if (!ctx.weaponTags.has(tag)) return false;
    }
    if (when.enemy) {
      if (when.enemy.tags) {
        for (const tag of when.enemy.tags) if (!ctx.enemyTags.has(tag)) return false;
      }
      if (when.enemy.status) {
        for (const st of when.enemy.status) if (!ctx.enemyStatuses.has(st)) return false;
      }
    }
    return true;
  }
}
