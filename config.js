// ---------------------------------------------------------------------------
// CONFIGURACIÓN DE MONETIZACIÓN Y SERVICIOS (rellenar para producción).
// Este fichero NO es un módulo: se carga antes que el juego y define
// window.BARCALYPSE_CONFIG. Sin estos IDs el juego funciona igual, con
// placeholders en los huecos de anuncio y sin guardado en Google.
// ---------------------------------------------------------------------------
window.BARCALYPSE_CONFIG = {
  // Google AdSense: tu ID de publicador (ej. "ca-pub-1234567890123456").
  // Crea 3 bloques "display" en AdSense y pon sus data-ad-slot aquí.
  adsenseClient: "",            // ej. "ca-pub-XXXXXXXXXXXXXXXX"
  adSlotLeft: "",               // ej. "1111111111"
  adSlotRight: "",              // ej. "2222222222"
  adSlotBottom: "",             // ej. "3333333333"

  // Google OAuth (guardado en la nube en Drive appData del usuario).
  // Crea un "OAuth Client ID (Web)" en Google Cloud Console con tu dominio
  // como origen autorizado y pégalo aquí.
  googleClientId: "",           // ej. "xxxx.apps.googleusercontent.com"
};
