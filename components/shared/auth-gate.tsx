"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  hasBiometricSet,
  hasPinSet,
  isLockEnabled,
  isUnlocked,
  markUnlocked,
  verifyBiometric,
  verifyPin,
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

    if (isLockEnabled() && !isUnlocked()) {
      setPhase("locked");
    } else {
      setPhase("ready");
    }
  }, [router]);

  if (phase === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (phase === "locked") {
    return <LockScreen onUnlock={() => { markUnlocked(); setPhase("ready"); }} />;
  }

  return <>{children}</>;
}

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const bioAvailable = hasBiometricSet();
  const pinAvailable = hasPinSet();

  const triedBioRef = React.useRef(false);

  async function tryBiometric() {
    if (!bioAvailable || triedBioRef.current) return;
    triedBioRef.current = true;
    setBusy(true);
    const ok = await verifyBiometric();
    setBusy(false);
    if (ok) onUnlock();
  }

  // Disparamos biometría automáticamente al montar (si está activada).
  React.useEffect(() => {
    if (bioAvailable) tryBiometric();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const ok = await verifyPin(pin);
    setBusy(false);
    if (ok) onUnlock();
    else setError("PIN incorrecto");
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
                className="text-center text-lg tracking-[0.4em]"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <Button
              type="submit"
              className="gradient-primary shadow-brand w-full"
              disabled={busy || pin.length < 4}
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
