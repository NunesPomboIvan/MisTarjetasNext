"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface StickySaveBarProps {
  label?: string;
  /** false = botón apagado (campos obligatorios incompletos). */
  enabled: boolean;
  saving?: boolean;
  onClick: () => void;
}

/** Separación entre el botón y el teclado. */
const GAP = 12;
/** Separación con la bottom bar: el FAB (+) sobresale unos px por encima. */
const NAV_GAP = 20;

const noopSubscribe = () => () => {};
/** Debajo de esto, la diferencia de viewport no es el teclado (barras del navegador). */
const KEYBOARD_MIN = 120;

/**
 * Botón de guardar de las pantallas de alta: ancho completo, fijo abajo.
 * Sin teclado queda apoyado sobre la bottom bar; con el teclado abierto se
 * pega encima del teclado (iOS no achica el layout viewport, así que la
 * posición se calcula con `visualViewport`).
 *
 * Va por portal a `<body>`: las páginas de alta entran con una animación de
 * `transform`, que convertiría al wrapper en el contenedor del `fixed`.
 */
export function StickySaveBar({ label = "Guardar", enabled, saving, onClick }: StickySaveBarProps) {
  // false en el SSR, true en el cliente: el portal necesita `document.body`.
  const mounted = React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
  const [bottom, setBottom] = React.useState<number | null>(null);

  React.useEffect(() => {
    const vv = window.visualViewport;

    function update() {
      const keyboard = vv ? window.innerHeight - (vv.height + vv.offsetTop) : 0;
      if (keyboard > KEYBOARD_MIN) {
        setBottom(keyboard + GAP);
        return;
      }
      const nav = document.querySelector("[data-bottom-nav]");
      const top = nav?.getBoundingClientRect().top;
      setBottom(top != null ? window.innerHeight - top + NAV_GAP : null);
    }

    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (!mounted) return null;

  const disabled = !enabled || saving;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 z-[60]"
      style={{ bottom: bottom ?? "calc(7rem + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto w-full max-w-lg px-4">
        <button
          type="button"
          // Sin esto, el toque saca el foco del input y el teclado se cierra
          // antes del click: el botón se movería bajo el dedo.
          onPointerDown={(e) => e.preventDefault()}
          onClick={disabled ? undefined : onClick}
          disabled={disabled}
          aria-label={label}
          className={cn(
            "pointer-events-auto flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold transition-transform active:scale-[0.98]",
            // Siempre opaco: flota sobre el formulario y no debe transparentarlo.
            !enabled && !saving
              ? "border border-border bg-secondary text-muted-foreground"
              : "gradient-primary shadow-brand text-white"
          )}
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
          {label}
        </button>
      </div>
    </div>,
    document.body
  );
}
