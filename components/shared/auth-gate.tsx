"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getPinLockRemainingMs,
  hasBiometricSet,
  hasPinSet,
  isLockEnabled,
  isUnlocked,
  markUnlocked,
  registerFailedPinAttempt,
  verifyBiometric,
  verifyPin,
  type BiometricFailReason,
} from "@/lib/security/local-lock";

const STORAGE_KEY = "mt_auth_v1";

/**
 * Gate de autenticación local + bloqueo opcional con PIN o biometría.
 * Si no hay sesión guardada, redirige a /login. Si la sesión está pero
 * el usuario configuró un PIN o Face ID, se exige antes de mostrar la app.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<"checking" | "locked" | "ready">(
    "checking",
  );

  React.useEffect(() => {
    try {
      const ok = localStorage.getItem(STORAGE_KEY) === "1";
      if (!ok) {
        router.replace("/login");
        return;
      }
    } catch {
      router.replace("/login");
      return;
    }

    // Init de una sola vez tras leer localStorage (no hay servidor con el que
    // sincronizar el estado de bloqueo).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase(isLockEnabled() && !isUnlocked() ? "locked" : "ready");
  }, [router]);

  if (phase === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <BrandLoader />
      </div>
    );
  }

  if (phase === "locked") {
    return <LockScreen onUnlock={() => { markUnlocked(); setPhase("ready"); }} />;
  }

  return <>{children}</>;
}

/** Marca de la app latiendo suavemente — reemplaza el spinner genérico. */
function BrandLoader() {
  return (
    <div
      className="flex h-16 w-16 animate-pulse items-center justify-center rounded-3xl text-white"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.62 0.16 35) 0%, oklch(0.55 0.18 25) 100%)",
        boxShadow: "0 12px 32px oklch(0.55 0.18 25 / 0.35)",
      }}
    >
      <KeyRound className="h-7 w-7" />
    </div>
  );
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

const BIO_MESSAGES: Record<BiometricFailReason, string | null> = {
  // Cancelación deliberada: no alarmamos, solo volvemos al PIN.
  cancelled: null,
  error:
    "No pudimos verificar tu identidad. Probá de nuevo o usá tu PIN.",
  unavailable:
    "La biometría no está disponible en este momento. Ingresá tu PIN para continuar.",
  "not-registered":
    "La biometría no está configurada. Ingresá tu PIN para continuar.",
};

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = React.useState("");
  const [error, setError] = React.useState("");
  const [bioError, setBioError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [lockMs, setLockMs] = React.useState(() => getPinLockRemainingMs());
  const bioAvailable = hasBiometricSet();
  const pinAvailable = hasPinSet();
  const isLocked = lockMs > 0;

  const triedBioRef = React.useRef(false);

  // Countdown del bloqueo temporal. Re-lee de localStorage por si el bloqueo
  // fue impuesto en otra pestaña / recarga.
  React.useEffect(() => {
    if (lockMs <= 0) return;
    const id = setInterval(() => {
      setLockMs(getPinLockRemainingMs());
    }, 250);
    return () => clearInterval(id);
  }, [lockMs]);

  async function tryBiometric() {
    if (!bioAvailable || triedBioRef.current) return;
    triedBioRef.current = true;
    setBioError("");
    setBusy(true);
    const res = await verifyBiometric();
    setBusy(false);
    if (res.ok) {
      onUnlock();
      return;
    }
    const msg = BIO_MESSAGES[res.reason];
    if (msg) setBioError(msg);
  }

  // Disparamos biometría automáticamente al montar (si está activada).
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  React.useEffect(() => {
    if (bioAvailable) tryBiometric();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLocked) return;
    setError("");
    setBusy(true);
    const ok = await verifyPin(pin);
    setBusy(false);
    if (ok) {
      onUnlock();
      return;
    }
    const { lockRemainingMs } = registerFailedPinAttempt();
    setPin("");
    if (lockRemainingMs > 0) {
      setLockMs(lockRemainingMs);
      setError("");
    } else {
      setError("PIN incorrecto");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl text-white"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.62 0.16 35) 0%, oklch(0.55 0.18 25) 100%)",
            boxShadow: "0 12px 32px oklch(0.55 0.18 25 / 0.35)",
          }}
        >
          <KeyRound className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h1 className="font-display text-[22px] font-bold tracking-tight text-foreground">
            Mis Tarjetas
          </h1>
          <p className="text-[13px] text-muted-foreground">
            Desbloqueá para continuar
          </p>
        </div>

        {bioError && (
          <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-left">
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
            <p className="text-[12.5px] leading-snug text-foreground/80">
              {bioError}
            </p>
          </div>
        )}

        {pinAvailable && (
          <form onSubmit={handlePinSubmit} className="space-y-3 text-left">
            <div className="space-y-1.5">
              <Label htmlFor="lock-pin">Código PIN</Label>
              <Input
                id="lock-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                autoFocus
                disabled={isLocked || busy}
                className="text-center text-lg tracking-[0.4em]"
              />
              {isLocked ? (
                <p className="text-xs text-muted-foreground tabular-nums">
                  Demasiados intentos. Probá de nuevo en {formatCountdown(lockMs)}
                </p>
              ) : (
                error && <p className="text-xs text-destructive">{error}</p>
              )}
            </div>
            <Button
              type="submit"
              className="gradient-primary shadow-brand w-full"
              disabled={busy || isLocked || pin.length < 4}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Desbloquear"}
            </Button>
          </form>
        )}

        {bioAvailable && (
          <Button
            variant={pinAvailable ? "outline" : "default"}
            className={`w-full ${
              !pinAvailable ? "gradient-primary shadow-brand" : ""
            }`}
            onClick={() => {
              triedBioRef.current = false;
              tryBiometric();
            }}
            disabled={busy}
          >
            <Fingerprint className="mr-2 h-4 w-4" />
            Usar Face ID / huella
          </Button>
        )}
      </div>
    </div>
  );
}
