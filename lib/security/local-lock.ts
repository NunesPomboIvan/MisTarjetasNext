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
}

export function clearUnlocked(): void {
  sessionStorage.removeItem(UNLOCK_FLAG);
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

export async function verifyBiometric(): Promise<boolean> {
  if (!isBiometricSupported()) return false;
  const credId = localStorage.getItem(BIOMETRIC_KEY);
  if (!credId) return false;

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
    return !!cred;
  } catch {
    return false;
  }
}
