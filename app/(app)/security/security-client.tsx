"use client";

import * as React from "react";
import { toast } from "sonner";
import { Fingerprint, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  hasPinSet,
  hasBiometricSet,
  setPin,
  verifyPin,
  clearPin,
  clearBiometric,
  isBiometricSupported,
  registerBiometric,
} from "@/lib/security/local-lock";

type PinDialogMode = "set" | "change" | "remove" | null;

export function SecurityClient() {
  const [pinOn, setPinOn] = React.useState(false);
  const [bioOn, setBioOn] = React.useState(false);
  const [bioSupported, setBioSupported] = React.useState(false);
  const [pinMode, setPinMode] = React.useState<PinDialogMode>(null);
  const [bioBusy, setBioBusy] = React.useState(false);

  React.useEffect(() => {
    setPinOn(hasPinSet());
    setBioOn(hasBiometricSet());
    setBioSupported(isBiometricSupported());
  }, []);

  async function handleBiometricToggle() {
    if (bioOn) {
      clearBiometric();
      setBioOn(false);
      toast.success("Biometría desactivada");
      return;
    }
    setBioBusy(true);
    try {
      await registerBiometric();
      setBioOn(true);
      toast.success("Biometría activada");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo activar la biometría";
      toast.error(msg);
    } finally {
      setBioBusy(false);
    }
  }

  return (
    <>
      <section className="relative overflow-hidden rounded-[20px] border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-foreground">
              Bloqueo al ingresar a la app
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              Pedí un código o tu huella / Face ID cada vez que abrís Mis
              Tarjetas. Los datos quedan solo en este dispositivo.
            </p>
          </div>
        </div>
      </section>

      {/* PIN */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-foreground">Código PIN</p>
            <p className="text-[12px] text-muted-foreground">
              {pinOn ? "Activado — se pide al abrir la app" : "Configurá un PIN de 4 a 6 dígitos"}
            </p>
          </div>
          <SwitchButton
            checked={pinOn}
            onClick={() => setPinMode(pinOn ? "remove" : "set")}
          />
        </div>

        {pinOn && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={() => setPinMode("change")}
          >
            Cambiar PIN
          </Button>
        )}
      </section>

      {/* Biometría */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Fingerprint className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-foreground">Face ID / huella</p>
            <p className="text-[12px] text-muted-foreground">
              {!bioSupported
                ? "Tu dispositivo no soporta autenticación biométrica"
                : bioOn
                  ? "Activado — usá tu biometría al abrir la app"
                  : "Usá la biometría del dispositivo al abrir la app"}
            </p>
          </div>
          <SwitchButton
            checked={bioOn}
            disabled={!bioSupported || bioBusy}
            onClick={handleBiometricToggle}
          />
        </div>
        {bioBusy && (
          <p className="mt-2 flex items-center gap-2 text-[12px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Esperando autenticación…
          </p>
        )}
      </section>

      <p className="px-1 text-[11.5px] text-muted-foreground">
        Tus datos siempre se guardan en tu dispositivo. Si olvidás el PIN podés
        reinstalar la app — vas a perder el bloqueo pero también el acceso local
        guardado.
      </p>

      {pinMode && (
        <PinDialog
          mode={pinMode}
          onClose={() => setPinMode(null)}
          onDone={() => {
            setPinMode(null);
            setPinOn(hasPinSet());
          }}
        />
      )}
    </>
  );
}

function SwitchButton({
  checked,
  onClick,
  disabled,
}: {
  checked: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
        checked ? "bg-primary" : "bg-input"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function PinDialog({
  mode,
  onClose,
  onDone,
}: {
  mode: Exclude<PinDialogMode, null>;
  onClose: () => void;
  onDone: () => void;
}) {
  const [currentPin, setCurrentPin] = React.useState("");
  const [newPin, setNewPin] = React.useState("");
  const [confirmPin, setConfirmPin] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const needsCurrent = mode === "change" || mode === "remove";
  const needsNew = mode === "set" || mode === "change";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (needsCurrent) {
      const ok = await verifyPin(currentPin);
      if (!ok) {
        setError("PIN actual incorrecto");
        return;
      }
    }

    if (mode === "remove") {
      clearPin();
      toast.success("PIN eliminado");
      onDone();
      return;
    }

    if (needsNew) {
      if (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
        setError("El PIN debe tener entre 4 y 6 dígitos");
        return;
      }
      if (newPin !== confirmPin) {
        setError("Los dos PIN nuevos no coinciden");
        return;
      }
      setBusy(true);
      await setPin(newPin);
      setBusy(false);
      toast.success(mode === "set" ? "PIN configurado" : "PIN actualizado");
      onDone();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 shadow-xl sm:rounded-3xl">
        <h3 className="text-[17px] font-semibold text-foreground">
          {mode === "set"
            ? "Configurar PIN"
            : mode === "change"
              ? "Cambiar PIN"
              : "Eliminar PIN"}
        </h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {needsCurrent && (
            <div className="space-y-1.5">
              <Label htmlFor="cur-pin">PIN actual</Label>
              <Input
                id="cur-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={currentPin}
                onChange={(e) =>
                  setCurrentPin(e.target.value.replace(/\D/g, ""))
                }
                autoFocus
              />
            </div>
          )}
          {needsNew && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="new-pin">PIN nuevo (4 a 6 dígitos)</Label>
                <Input
                  id="new-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  autoFocus={!needsCurrent}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-pin">Repetí el PIN</Label>
                <Input
                  id="confirm-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) =>
                    setConfirmPin(e.target.value.replace(/\D/g, ""))
                  }
                />
              </div>
            </>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={onClose}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="gradient-primary shadow-brand flex-1"
              disabled={busy}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
