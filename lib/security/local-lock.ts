/**
 * lib/security/local-lock.ts
 *
 * Bloqueo local opcional para acceder a la app: PIN numérico y/o autenticación
 * biométrica (WebAuthn — Face ID / Touch ID / huella). Todo se guarda en
 * localStorage; no se envía a ningún servidor.
 *
 * El PIN se guarda como un hash SHA-256 codificado en hex; no guardamos el
 * código en claro. Sirve para evitar lecturas casuales por terceros, no como
 * defensa criptográfica.
 */

const PIN_HASH_KEY = "mt_pin_hash_v1";
const BIOMETRIC_KEY = "mt_biometric_credential_v1";
const UNLOCK_FLAG = "mt_unlocked_v1";
const PIN_ATTEMPTS_KEY = "mt_pin_attempts_v1";

/**
 * Política de backoff progresivo para el PIN local. Se evalúa de mayor a menor
 * umbral: al llegar (o superar) `threshold` intentos fallidos, cada nuevo fallo
 * bloquea el ingreso durante `lockMs`. Ajustar acá los tiempos/umbrales.
 */
export const PIN_LOCKOUT_POLICY: ReadonlyArray<{ threshold: number; lockMs: number }> = [
  { threshold: 3, lockMs: 30_000 },
  { threshold: 5, lockMs: 60_000 },
  { threshold: 7, lockMs: 5 * 60_000 },
];

export function isLockEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(PIN_HASH_KEY) || !!localStorage.getItem(BIOMETRIC_KEY);
}

export function hasPinSet(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(PIN_HASH_KEY);
}

export function hasBiometricSet(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(BIOMETRIC_KEY);
}

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function setPin(pin: string): Promise<void> {
  const hash = await hashPin(pin);
  localStorage.setItem(PIN_HASH_KEY, hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(PIN_HASH_KEY);
  if (!stored) return false;
  const hash = await hashPin(pin);
  return hash === stored;
}

export function clearPin(): void {
  localStorage.removeItem(PIN_HASH_KEY);
}

export function clearBiometric(): void {
  localStorage.removeItem(BIOMETRIC_KEY);
}

export function isUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(UNLOCK_FLAG) === "1";
}

export function markUnlocked(): void {
  sessionStorage.setItem(UNLOCK_FLAG, "1");
  // Un desbloqueo válido (PIN o biometría) limpia el contador de intentos.
  resetPinAttempts();
}

export function clearUnlocked(): void {
  sessionStorage.removeItem(UNLOCK_FLAG);
}

/* ─── Intentos fallidos de PIN + bloqueo temporal ─────────────
 * Contador y timestamp de bloqueo persistidos en localStorage, así sobreviven
 * a que se cierre y reabra la app. Es una protección de conveniencia contra
 * fuerza bruta casual, no una defensa de servidor.
 */

interface PinAttemptState {
  fails: number;
  /** Epoch ms hasta el que el ingreso está bloqueado (0 = sin bloqueo). */
  lockedUntil: number;
}

function readPinAttempts(): PinAttemptState {
  if (typeof window === "undefined") return { fails: 0, lockedUntil: 0 };
  try {
    const raw = localStorage.getItem(PIN_ATTEMPTS_KEY);
    if (!raw) return { fails: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw) as Partial<PinAttemptState>;
    return {
      fails: Number(parsed.fails) || 0,
      lockedUntil: Number(parsed.lockedUntil) || 0,
    };
  } catch {
    return { fails: 0, lockedUntil: 0 };
  }
}

function writePinAttempts(state: PinAttemptState): void {
  try {
    localStorage.setItem(PIN_ATTEMPTS_KEY, JSON.stringify(state));
  } catch {}
}

/** Intentos fallidos acumulados desde el último desbloqueo correcto. */
export function getFailedPinAttempts(): number {
  return readPinAttempts().fails;
}

/** ms restantes de bloqueo del PIN (0 si no está bloqueado). */
export function getPinLockRemainingMs(now: number = Date.now()): number {
  const { lockedUntil } = readPinAttempts();
  return lockedUntil > now ? lockedUntil - now : 0;
}

/**
 * Registra un intento de PIN fallido y aplica el backoff de PIN_LOCKOUT_POLICY.
 * Devuelve el nuevo total de fallos y los ms de bloqueo resultantes.
 */
export function registerFailedPinAttempt(now: number = Date.now()): {
  fails: number;
  lockRemainingMs: number;
} {
  const prev = readPinAttempts();
  const fails = prev.fails + 1;
  const rule = [...PIN_LOCKOUT_POLICY]
    .sort((a, b) => b.threshold - a.threshold)
    .find((r) => fails >= r.threshold);
  const lockedUntil = rule ? now + rule.lockMs : prev.lockedUntil;
  writePinAttempts({ fails, lockedUntil });
  return { fails, lockRemainingMs: lockedUntil > now ? lockedUntil - now : 0 };
}

/** Limpia el contador de intentos y cualquier bloqueo activo. */
export function resetPinAttempts(): void {
  try {
    localStorage.removeItem(PIN_ATTEMPTS_KEY);
  } catch {}
}

/* ─── WebAuthn (Face ID / huella) ─────────────────────────────
 * Implementación pragmática: registra un credential del autenticador de
 * plataforma (Face ID en iOS, Touch ID en Mac, huella en Android). En la
 * verificación se pide allowCredentials con el rawId guardado.
 */

function bufferToB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function b64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

export function isBiometricSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.PublicKeyCredential && !!navigator.credentials;
}

export async function registerBiometric(): Promise<void> {
  if (!isBiometricSupported()) throw new Error("Tu dispositivo no soporta biometría");

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Mis Tarjetas" },
      user: {
        id: userId,
        name: "usuario@mistarjetas.local",
        displayName: "Usuario Mis Tarjetas",
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
      timeout: 60_000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("No se pudo registrar el autenticador");

  localStorage.setItem(BIOMETRIC_KEY, bufferToB64(credential.rawId));
}

/**
 * Motivo por el que falló la verificación biométrica:
 * - `unavailable`: el dispositivo/navegador no soporta WebAuthn o el SO la bloqueó.
 * - `not-registered`: no hay credential guardada (biometría no configurada).
 * - `cancelled`: el usuario canceló el prompt (o expiró el timeout).
 * - `error`: fallo de lectura u otro error inesperado del autenticador.
 */
export type BiometricFailReason =
  | "unavailable"
  | "not-registered"
  | "cancelled"
  | "error";

export type BiometricResult =
  | { ok: true }
  | { ok: false; reason: BiometricFailReason };

export async function verifyBiometric(): Promise<BiometricResult> {
  if (!isBiometricSupported()) return { ok: false, reason: "unavailable" };
  const credId = localStorage.getItem(BIOMETRIC_KEY);
  if (!credId) return { ok: false, reason: "not-registered" };

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            type: "public-key",
            id: b64ToBuffer(credId),
            transports: ["internal"],
          },
        ],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return cred ? { ok: true } : { ok: false, reason: "error" };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    // NotAllowedError: cancelación del usuario o timeout — no son distinguibles
    // entre sí por especificación. AbortError: cancelado programáticamente.
    if (name === "NotAllowedError" || name === "AbortError") {
      return { ok: false, reason: "cancelled" };
    }
    // El SO bloqueó la biometría por demasiados intentos, o el navegador no la
    // permite en este contexto.
    if (
      name === "SecurityError" ||
      name === "NotSupportedError" ||
      name === "InvalidStateError" ||
      name === "UnknownError"
    ) {
      return { ok: false, reason: "unavailable" };
    }
    return { ok: false, reason: "error" };
  }
}
