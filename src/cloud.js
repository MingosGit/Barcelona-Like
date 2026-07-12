// ---------------------------------------------------------------------------
// GUARDADO EN LA NUBE (opcional) — Google Drive appDataFolder del usuario.
// Usa Google Identity Services (token OAuth con scope drive.appdata): el
// guardado vive en la cuenta de Google DEL JUGADOR, invisible para el
// desarrollador y sin backend propio.
// Requiere BARCALYPSE_CONFIG.googleClientId; sin él, el botón lo explica.
// Fallback universal sin cuenta: exportar/importar código de guardado.
// ---------------------------------------------------------------------------
import { loadMeta, saveMeta } from "./meta.js";

const FILE_NAME = "barcalypse-save.json";
let accessToken = null;
let tokenClient = null;

function clientId() {
  return (window.BARCALYPSE_CONFIG || {}).googleClientId || "";
}

export function cloudAvailable() {
  return !!clientId();
}

export function cloudConnected() {
  return !!accessToken;
}

function loadGsi() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error("No se pudo cargar Google Identity"));
    document.head.appendChild(s);
  });
}

// Conecta y sincroniza (merge por marca de tiempo). Devuelve el meta final.
export async function cloudSync(toast) {
  await loadGsi();
  if (!tokenClient) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId(),
      scope: "https://www.googleapis.com/auth/drive.appdata",
      callback: () => {},
    });
  }
  accessToken = await new Promise((resolve, reject) => {
    tokenClient.callback = (resp) =>
      resp.access_token ? resolve(resp.access_token) : reject(new Error(resp.error || "sin token"));
    tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
  });

  const local = loadMeta();
  const remoteFile = await findRemote();
  let final = local;
  if (remoteFile) {
    const remote = await downloadRemote(remoteFile.id);
    if (remote && (remote.savedAt || 0) > (local.savedAt || 0)) {
      final = remote;
      saveMeta(final);
      toast?.("☁️ Guardado de Google restaurado (era más reciente)");
    }
  }
  final.savedAt = Date.now();
  saveMeta(final);
  await uploadRemote(remoteFile?.id, final);
  toast?.("☁️ Progreso sincronizado con tu cuenta de Google");
  return final;
}

// Sube el estado actual si hay sesión iniciada (llamar tras cada partida).
export async function cloudPush() {
  if (!accessToken) return;
  const meta = loadMeta();
  meta.savedAt = Date.now();
  saveMeta(meta);
  try {
    const remoteFile = await findRemote();
    await uploadRemote(remoteFile?.id, meta);
  } catch { /* sin red: ya se sincronizará */ }
}

async function gfetch(url, opts = {}) {
  const r = await fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${accessToken}`, ...(opts.headers || {}) },
  });
  if (!r.ok) throw new Error(`Drive ${r.status}`);
  return r;
}

async function findRemote() {
  const q = encodeURIComponent(`name='${FILE_NAME}'`);
  const r = await gfetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name)`);
  const j = await r.json();
  return j.files?.[0] || null;
}

async function downloadRemote(id) {
  try {
    const r = await gfetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`);
    return await r.json();
  } catch {
    return null;
  }
}

async function uploadRemote(id, data) {
  const body = JSON.stringify(data);
  if (id) {
    await gfetch(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body,
    });
  } else {
    const meta = { name: FILE_NAME, parents: ["appDataFolder"] };
    const boundary = "barcalypse" + Date.now();
    const multipart =
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(meta)}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
    await gfetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body: multipart,
    });
  }
}

// ------------------------- fallback: código de guardado ---------------------
export function exportSaveCode() {
  const meta = loadMeta();
  meta.savedAt = Date.now();
  return "BCN1." + btoa(unescape(encodeURIComponent(JSON.stringify(meta))));
}

export function importSaveCode(code) {
  if (!code || !code.startsWith("BCN1.")) throw new Error("Código no válido");
  const meta = JSON.parse(decodeURIComponent(escape(atob(code.slice(5)))));
  if (typeof meta.coins !== "number") throw new Error("Código corrupto");
  saveMeta(meta);
  return meta;
}
