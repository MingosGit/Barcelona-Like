// ---------------------------------------------------------------------------
// ANUNCIOS (monetización real vía Google AdSense).
// - Con BARCALYPSE_CONFIG.adsenseClient configurado: inyecta el script
//   oficial `adsbygoogle` y rellena los tres huecos (izq/dcha/abajo) con
//   bloques display responsive.
// - Sin configurar: los huecos muestran un placeholder discreto para que
//   el layout sea el definitivo desde el primer día.
// Los raíles laterales solo existen en pantallas anchas (CSS); en móvil
// queda el banner inferior, fuera de la zona de juego/joystick.
// ---------------------------------------------------------------------------

export function initAds() {
  const cfg = window.BARCALYPSE_CONFIG || {};
  const slots = [
    { el: document.getElementById("ad-left"), slot: cfg.adSlotLeft, fmt: "vertical" },
    { el: document.getElementById("ad-right"), slot: cfg.adSlotRight, fmt: "vertical" },
    { el: document.getElementById("ad-bottom"), slot: cfg.adSlotBottom, fmt: "horizontal" },
  ];

  if (!cfg.adsenseClient) {
    for (const s of slots) {
      if (!s.el) continue;
      s.el.innerHTML = `<div class="ad-placeholder"><span>PUBLICIDAD</span><small>configura AdSense en config.js</small></div>`;
    }
    return;
  }

  // script oficial de AdSense
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(cfg.adsenseClient)}`;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);

  for (const s of slots) {
    if (!s.el || !s.slot) continue;
    const ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.style.width = "100%";
    ins.style.height = "100%";
    ins.setAttribute("data-ad-client", cfg.adsenseClient);
    ins.setAttribute("data-ad-slot", s.slot);
    ins.setAttribute("data-ad-format", s.fmt);
    ins.setAttribute("data-full-width-responsive", "false");
    s.el.appendChild(ins);
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }
}
