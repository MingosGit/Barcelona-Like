# BARÇALYPSE — Documento de Diseño (GDD)

> *Roguelike de supervivencia estilo Vampire Survivors, ambientado en una
> Barcelona caótica y satírica. Controlas al último catalanoparlante del
> bloque, sobreviviendo a oleadas infinitas de arquetipos urbanos exagerados.*

---

## 1. Concepto general

**Elevator pitch:** Vampire Survivors se muda a un piso interior sin
ascensor en Barcelona. Oleadas infinitas de tópicos urbanos —guiris,
Charos, patinetes, caseros— contra un vecino armado con un Clipper, un
cubo de sangría y muy mala leche.

- **Género:** roguelike de supervivencia / bullet heaven, partidas de 10–15 min.
- **Plataforma:** móvil primero (Android/iOS vía web/PWA o wrapper), también jugable en escritorio.
- **Controles:** joystick virtual táctil (un pulgar) + WASD/flechas en escritorio. El ataque es automático: el jugador solo se mueve y elige mejoras.
- **Tono:** humor negro, cariñoso y autoparódico. Ácido con TODOS los tópicos por igual: turistas, vecinos, gentrificación, postureo, política de bar. El chiste siempre va sobre **comportamientos y clichés urbanos**, nunca sobre personas reales ni rasgos protegidos.

## 2. Stack técnico

- **Motor:** HTML5 Canvas + JavaScript (ES modules), sin dependencias ni build. Elegido para el prototipo por: portabilidad móvil inmediata, iteración instantánea y facilidad de empaquetar después (Capacitor/Cordova para stores). El diseño de datos es agnóstico: migrable a Godot/Unity conservando los JSON de enemigos/armas/reglas.
- **Arquitectura de combate:** **reglas declarativas con pattern matching** (`src/rules.js`). Toda interacción arma→enemigo se resuelve contra una lista de reglas-dato. Añadir un enemigo, un arma o una sinergia = añadir datos, sin tocar el core loop.
- **Arte:** sprites cartoon **dibujados proceduralmente en canvas** (`src/sprites.js`, `src/props.js`), cero assets binarios. Cada personaje es un spec declarativo (ropa, capucha, bandana, cara, vehículo); el mobiliario urbano (tiendas con toldo y rótulo, kioscos, farolas con luz real de noche) da identidad a cada barrio junto a los suelos temáticos (panot de flor, mosaico de Miró, adoquines, arena). El tono de piel de todo humanoide se sortea de una paleta diversa — jamás se codifica por arquetipo.
- **Audio:** SFX procedurales WebAudio (`src/sfx.js`), sin ficheros.

```js
// Ejemplo real del motor (src/rules.js):
{
  id: "flambeado",
  when: { weapon: ["fuego"], enemy: { status: ["empapado"] } },
  then: { damageMult: 3, addStatus: [{ id: "ardiendo", dur: 3 }], banner: "¡FLAMBEADO! x3" },
}
```

- Las **cartas de sinergia** añaden reglas nuevas al motor *en caliente*
  durante la partida (`engine.add(rule)`): el deck-building modifica
  literalmente las leyes físicas del combate.

### Estructura del código

| Fichero | Responsabilidad |
|---|---|
| `src/rules.js` | Motor de reglas + reglas base |
| `src/data/enemies.js` | Roster completo (stats, IA por clave, tags, frases) |
| `src/data/weapons.js` | 8 armas con 5 niveles cada una |
| `src/data/biomes.js` | 6 barrios + 6 jefes |
| `src/data/cards.js` | Pasivas y sinergias (cartas de mejora) |
| `src/data/characters.js` | Personajes desbloqueables |
| `src/data/mods.js` | Modificadores de dificultad |
| `src/game.js` | Core loop: IA, armas, jefes, director de oleadas |
| `src/sprites.js` | Sprites cartoon procedurales (humanoides, vehículos, jefes) |
| `src/props.js` | Mobiliario urbano (tiendas, kioscos, farolas, sombrillas...) |
| `src/render.js` | Render canvas: suelos temáticos, luces, juice |
| `src/sfx.js` | Efectos de sonido WebAudio procedurales |
| `src/ads.js` | Integración Google AdSense (raíles + banner) |
| `src/cloud.js` | Guardado en Google Drive appData + códigos de guardado |
| `src/meta.js` | Meta-progresión persistente (localStorage) |
| `src/main.js` | Menús, HUD, bucle |
| `config.js` | IDs de AdSense y OAuth de Google (producción) |

## 3. Escenarios (biomas)

Cada barrio dura ~10 min y culmina con su jefe. Se desbloquean en orden.

| # | Barrio | Rasgo mecánico | Jefe |
|---|---|---|---|
| 1 | **Les Rambles** | Denso en NPCs, obstáculos por todas partes, poco espacio | El Turista Definitivo |
| 2 | **La Barceloneta** | Arena abierta; toallas = parches que ralentizan; sombrillas = obstáculos | El Turista Definitivo (All Inclusive) |
| 3 | **Gràcia** | Laberinto de calles estrechas con plazas (generación procedural con "superbloques" despejados) | El Casero del Airbnb |
| 4 | **El Born / Gòtic** | **Nocturno**: visibilidad reducida (viñeta de oscuridad), mimos emboscados, rateros | El Virtuós del Metro |
| 5 | **El Raval** | Donde se junta todo; rateros velocísimos que te roban cèntims al golpearte | El Rey del Top Manta |
| 6 | **Sagrada Família** (final) | Hazard ambiental permanente: vigas que caen telegrafiadas, vallas que brotan | La Obra Interminable |

## 4. Roster de enemigos

Todos definidos como datos + una clave de IA reutilizable (12 comportamientos
para 16 enemigos): `swarm, drunk, flasher, skirmisher, charger, conga,
caster, ambush, stabber, rider, wall, buffer`.

| Enemigo | IA | Ataque característico |
|---|---|---|
| **"¿Tienes un cigarro?"** 🚬 | swarm | Enjambre; si te rodean ≥6, te aturden a base de pedirte cosas |
| **Guiri de despedida de soltero** 🍺 | drunk | Camina errático en manada; vomita charcos que ralentizan |
| **Charo del postureo** 🤳 | flasher | Persigue con el móvil en alto; su flash te ciega (pantallazo blanco) |
| **Vendedor de Rolex de aire** ⌚ | skirmisher | Mantiene distancia, huye si te acercas, lanza relojes |
| **Latero de las 3 AM** 🥫 | skirmisher | Aparece cuando menos lo necesitas; latas con puntería olímpica |
| **Patinete eléctrico kamikaze** 🛴 | charger | Embiste en línea recta con daño alto; se rompe al chocar |
| **Guía de free tour** ☂️ | conga | Arrastra una fila de guiris: un solo enemigo larguísimo. Si matas al guía, la cola deambula perdida |
| **Vecino del "not for sale"** 📢 | caster | Zonas de denuncia que inmovilizan. Agresivo pero, y esto es lo peor, tiene razón |
| **Mimo estatua viviente** 🗿 | ambush | Inmóvil (semitransparente) hasta que te acercas: jumpscare de alto daño |
| **Ratero del Raval** 🥷 | stabber | Entra en zigzag, pincha, **te roba cèntims** y se retira |
| **Taxista cabreado** 🚕 | charger | Embiste sin romperse; su bocinazo te empuja |
| **Rider con mochila-cubo** 🛵 | rider | Cruza el mapa en rectas imposibles; no te ve, la app le da 4 minutos |
| **Cuñado de terraza** 🗣️ | skirmisher | Dispara opiniones no solicitadas **teledirigidas** que te siguen |
| **Percusionista asambleario** 🪘 | caster | Círculos de asamblea que ralentizan y absorben |
| **Manifestante con estelada** 🎗️ | skirmisher | Banderas **boomerang**; corta calles con eficiencia logística |
| **Nostálgico de bandera al hombro** 🦅 | wall | Falange lenta, compacta y resistente al knockback: no se mueve de sus ideas ni de tu camino |
| **Gentrificador de flat white** ☕ | buffer | Casi no pega: su aura "sube el precio" del área (los enemigos cercanos van más rápido y pegan más) |
| **La banda del altavoz** 🔊 | pack | Grupo cohesionado alrededor de un altavoz-nevera; el bajo del reggaeton te ralentiza físicamente |
| **El de "dame todo"** 🔪 | stabber | Ratero premium: más rápido, roba más cèntims, "algo brilla en su mano". Trabaja L3 y L4 |
| **Ciclista de Strava** 🚴 | charger | Embestida a 460 px/s gritando ¡CARRIL!; no frena, el KOM no se baja solo |
| **Señora del carrito** 🛒 | charger | Tanque de barrio con ariete de cuadros escoceses; casi inmune al knockback, ella estaba primero |
| **Promotor de discoteca** 🎫 | puller | No pega: te ARRASTRA hacia su lista VIP como un agujero gravitacional |
| **Trilero de la Rambla** 🎩 | ambush | Camuflado tras su caja; la bolita no existe y nunca existió |
| **Gaviota del Port Vell** 🕊️ | flyer | Vuela sobre los obstáculos, hace pasadas en picado y **te roba los tickets de XP del suelo** |
| **Turista de crucero** 🛳️ | swarm | Marabunta lenta, ancha y tanque, con 45 minutos para "hacer" Barcelona |
| **Camarero de terraza trampa** 🧾 | skirmisher | Cuentas infladas teledirigidas ("son 27,50; el pan se cobra") |
| **Dependiente de fundas** 📱 | skirmisher | Lanza carcasas; su tienda lleva 9 años "de liquidación" |
| **Repartidor de flyers de kebab** 🥙 | skirmisher | Sus flyers 2x1 se te pegan a los pies y te frenan |

> **Nota de tono:** la sátira política reparte a ambos lados (estelada y
> bandera al hombro reciben por igual), y los arquetipos de economía
> callejera se ríen del *cliché de la situación* (la lata caliente a las
> 3 AM, la manta plegada en 0,2 s), nunca del origen de nadie.

### Elites
A partir del minuto 5, un 8 % de spawns son **élite** (👑): ×3,5 vida,
×1,5 daño, más grandes, ×3 XP.

## 5. Jefes

| Jefe | Bioma | Mecánicas |
|---|---|---|
| **El Turista Definitivo** 🧳 | Rambles / Barceloneta | Fusión guiri+Charo+segway. Rota 4 ataques: embestida en segway, selfie-flash cegador, barra libre de vómito (3 charcos), invocar despedida de soltero. Bajo 40 % de vida: se acelera |
| **El Casero del Airbnb** 🔑 | Gràcia | **Barra de ALQUILER** que sube sola; al llenarse: reforma sorpresa (zonas de obra) + buff permanente a todos los enemigos → te obliga a jugar rápido. Lanza manojos de llaves, invoca "visitas del piso", cláusulas abusivas que inmovilizan |
| **El Virtuós del Metro** 🎻 | Born/Gòtic | Anillos de corcheas radiales, se teletransporta "de vagón", el público te arremolina hacia él (atracción forzada). Lleva Despacito en bucle desde 2017 |
| **El Rey del Top Manta** 🛍️ | Raval | Se teletransporta plegando la manta si te acercas, abanicos de proyectiles (stock infinito), convoca a su gremio |
| **La Obra Interminable** 🏗️ | Sagrada Família | Lluvia de vigas telegrafiada, anillos de vallas 🚧 que te encierran (obstáculos temporales), invoca operarios motorizados. Enrage bajo 30 %: vigas a ritmo frenético. En obras desde 1882 |

## 6. Armas (cada una contrarresta un arquetipo vía reglas)

| Arma | Tipo | Contrarresta |
|---|---|---|
| **Mechero "Clipper" infinito** 🔥 | Cono de llama, quema | Al enjambre del cigarrito |
| **Cubo de sangría giratorio** 🍷 | Aura AoE que *empapa* y ralentiza ("emborracha") | A los guiris (entran solos) |
| **Ring light láser** 💡 | Rayos rotatorios | A las Charos: cegadas por su propia medicina (x2) |
| **Bicing embestida** 🚲 | Dash automático arrollador con iframes | A patinetes y taxis: x2, "justicia vial" |
| **Bocadillo de calamares boomerang** 🥖 | Proyectil perforante que vuelve | Genérico; sinergia con aturdidos |
| **Silbato de Guàrdia Urbana** 📯 | Nova radial con knockback | A la venta ambulante: huyen despavoridos (miedo) |
| **Patata brava explosiva** 🥔 | Bomba AoE + charco de salsa (DoT picante) | A los guiris: "too spicy" x2 |
| **Paraguas de guía turístico** 🌂 | Escudos orbitales que aturden | Defensa; la ironía (es robado a un free tour) hace daño moral |
| **La Chancla Teledirigida** 🩴 | Proyectil que persigue al objetivo por toda la ciudad | A la juventud: x2,5, autoridad ancestral |
| **Litrona de recena** 🍾 | Se estrella: empapa + charco de cristales que frena | Combustible premium del Clipper (¡FLAMBEADO!) |
| **Dürüm de las 4 AM** 🌯 | Su olor ATRAE enemigos y la salsa dudosa los funde (DoT) | Alto riesgo/recompensa; sinergia con área |
| **Persiana metálica** 🔩 | PERSIANAZO frontal: aturde + knockback masivo | A la fauna nocturna: x1,75, "cerramos" |
| **Escuadrón de palomas** 🕊️ | Mascotas que acosan al enemigo más cercano | Daño constante; contra gaviotas x0,5 (les das de comer, genio) |

Todas con 5 niveles. Máximo 5 armas simultáneas (3 con el modificador "Piso compartido").

### Reglas de combate base (pattern matching)

```
fuego      + empapado            → daño x3 + ardiendo      "¡FLAMBEADO!"
area       + enjambre            → knockback masivo
luz        + postureo            → x2 + cegado             "¡SU PROPIA MEDICINA!"
sonido     + callejero           → x1,5 + miedo            "¡LA URBANA!"
sonido     + reggaeton           → x2 + aturdido           "¡GUERRA DE ALTAVOCES!"
choque     + vehiculo            → x2 + knockback          "¡CARRIL BICI!"
picante    + guiri               → x2                      "¡TOO SPICY!"
maternal   + joven               → x2,5                    "¡LA CHANCLA!"
acero      + nocturno            → x1,75                   "¡CERRAMOS!"
comida     + fauna               → x0,5                    "¡LE ESTÁS DANDO DE COMER!"
fuego      + papel               → x2 + ardiendo
empapado   + cegado (estados)    → resbala: aturdido
```

## 7. Estados

| Estado | Efecto |
|---|---|
| 💧 empapado | −40 % velocidad; combustible para el fuego |
| 🔥 ardiendo | 4 dps durante la duración |
| 💫 aturdido | no se mueve ni ataca |
| 😵 cegado | deambula al azar |
| 😱 miedo | huye del jugador |

Sobre el jugador: ceguera (flash), inmovilización (denuncia),
ralentización (vómito/asamblea/toallas), aturdimiento (rodeado por el enjambre).

## 8. Progresión

### Durante la partida (deck-building)
Al subir de nivel: elige 1 de 3 cartas —

- **Arma nueva** (hasta 5 slots)
- **Mejora de arma** (+1 nivel, hasta 5)
- **Pasiva** (hasta 3 copias): Bocata de fuet (+vida), Chándal aerodinámico (+velocidad), Café solo del bar de menú (−cooldowns), Mala leche crónica (+daño), Riñonera táctica (armadura), Imán de nevera de Bar Manolo (+radio de recogida), Vermut de aperitivo (regeneración)
- **Sinergia** (requiere armas concretas; **añade una regla nueva al motor**):
  - *Flambeado profesional* (Clipper+Sangría): fuego contra empapados quema más y explota
  - *Salsa del Bar Tomás* (Brava): picante contra ardiendo → x2,5
  - *Concierto no solicitado* (Silbato+Ring light): sonido contra cegados → x2 + aturde
  - *Reparto a domicilio* (Bicing+Bocata): comida contra aturdidos → x2

La XP son **tickets de metro T-Casual** 🎫; la vida se recupera con
**pa amb tomàquet** 🍅.

### Modificadores de dificultad (mutadores)
Acumulables antes de la partida; cada uno multiplica los cèntims ganados:

| Modificador | Efecto | Cèntims |
|---|---|---|
| 🧳 Temporada alta | +60 % spawns | ×1,25 |
| 🥵 Ola de calor | Tú −12 % velocidad, ellos +10 % | ×1,2 |
| 🚇 Huelga de metro | −50 % de radio de imán de XP | ×1,2 |
| 🎆 Festes de la Mercè | Triple de élites 👑 y llegan antes | ×1,3 |
| 🔑 Alquiler al día | Pierdes 1 vida/segundo, siempre | ×1,5 |
| 🚪 Piso compartido | Máximo 3 armas | ×1,35 |

### Meta-progresión (entre partidas)
- Moneda: **cèntims** 🪙 (los rateros y el de "dame todo" te los ROBAN durante la partida).
- **Personajes desbloqueables:**
  - 😤 *Superviviente de barrio* (inicial) — equilibrado, empieza con Clipper
  - 🧢 *Turista arrepentido* (400 c) — rápido y frágil, empieza con Paraguas
  - 🧑‍🍳 *Camarero veterano* (800 c) — +20 % daño, empieza con Bocata
  - 👵 *Vecina histórica* (1200 c) — tanque con regeneración, empieza con Silbato
  - 🛹 *Skater del MACBA* (1600 c) — velocísimo y frágil, empieza con Litrona
  - ⛵ *Pijo de Pedralbes* (2500 c) — +30 % cèntims, empieza con la Chancla de su yaya
- **Barrios:** se desbloquean venciendo al jefe del anterior.
- **Persistencia:** `localStorage` + opcional **cuenta de Google del jugador**
  (Drive appData vía OAuth, sin backend propio) + código de guardado
  exportable/importable como fallback universal.

### Monetización
- **Google AdSense** integrado: dos raíles laterales (solo escritorio, fuera
  del área táctil) y un banner inferior. IDs en `config.js`; sin configurar,
  huecos con placeholder. El diseño reserva el espacio desde el día 1 para no
  recolocar la UI al activar los anuncios.
- Futuro: rewarded ads opcionales ("ver un anuncio = revivir una vez"),
  cosméticos. Nunca pay-to-win: esto va de sufrir la ciudad, no de pagarla.

## 9. Tono y límites de diseño (contrato creativo)

1. **Sátira de comportamientos y clichés urbanos, jamás de nacionalidad,
   etnia, religión ni rasgos protegidos.** Por eso los arquetipos de
   venta ambulante se definen por la *situación* (el reloj "originalísimo",
   la lata caliente) y no por el origen de nadie; y por eso la sátira
   política golpea simétricamente a todas las banderas.
2. **Nada de acentos étnicos parodiados.** El brief original sugería
   imitar acentos; se descarta conscientemente porque colisiona con la
   regla 1 (que el propio brief declara innegociable). El *spanglish de
   guiri* sí entra: parodia el comportamiento turista, no un origen.
3. **Sin violencia gráfica realista.** Los enemigos "se dispersan"
   (pop cartoon + emoji), no mueren. Estética emoji/cartoon exagerada.
4. **Cariñoso en el fondo:** el Vecino "tiene razón", el rider va
   explotado por el algoritmo, el taxista "no le falta motivo, según él".
   La ciudad es la víctima y todos sus tópicos son a la vez verdugos y
   víctimas.
5. **Guiños localizados:** catalán ("Amic...", "Els carrers seran sempre
   nostres"), castellano de barrio, spanglish de guiri ("One beer plis",
   "WHERE IS LA RAMBLA").

## 10. Roadmap (post-prototipo)

- **Audio:** rumba catalana chiptune, SFX de bocina/silbato/flash.
- **Arte:** sustituir emojis por pixel art propio (los datos ya separan sprite de lógica).
- **Más contenido:** enemigos GDD-only pendientes — gaviota del Port Vell (te roba el bocata-arma), camarero de terraza turística (lanza cuentas infladas), influencer con dron, corredor del Túnel de la Rovira; evoluciones de arma (Clipper+Brava → "Calçotada infernal").
- **Modos:** modo infinito post-jefe, desafíos diarios ("día de la Mercè": todo son gigantes).
- **Empaquetado móvil:** Capacitor + haptics nativos (ya hay `navigator.vibrate`), cloud save.
- **Accesibilidad:** modo sin flashes (la ceguera de la Charo como viñeta en vez de pantallazo), tamaños de fuente.

## 11. Cómo probarlo

```bash
# cualquier servidor estático vale
python3 -m http.server 8000
# → http://localhost:8000  (móvil: misma red, IP de la máquina)
# modo debug rápido: http://localhost:8000/?turbo  (jefe al min 0:45, XP x3)
```
