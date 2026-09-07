"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useNavigationBlocker } from "./navigation-blocker";
import { useNavStack } from "./nav-stack";

interface BackButtonProps {
  /**
   * Destino de respaldo: se usa SOLO cuando no hay historial in-app al que
   * volver (deep-link directo o refresh). En el flujo normal el botón hace un
   * pop real del stack (`router.back()`), así respeta siempre el origen real.
   */
  href?: string;
  /** Override manual del label del origen. Por defecto usa el de la pila. */
  label?: string;
  /**
   * Solo el ícono de flecha, sin texto. El área táctil se mantiene (botón
   * cuadrado de 40px) y el label de accesibilidad queda fijo en "Volver".
   */
  iconOnly?: boolean;
}

export function BackButton({ href = "/", label, iconOnly = false }: BackButtonProps) {
  const router = useRouter();
  const { isBlocked, message } = useNavigationBlocker();
  const { canGoBack, parentLabel } = useNavStack();

  const text = label ?? parentLabel ?? "Volver";

  function go() {
    if (isBlocked && !window.confirm(message)) return;
    if (canGoBack) router.back();
    else router.push(href);
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={go}
        aria-label="Volver"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground active:scale-95"
      >
        <ChevronLeft className="h-5 w-5 flex-shrink-0" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={go}
      aria-label={text === "Volver" ? "Volver" : `Volver a ${text}`}
      className="flex h-10 shrink-0 items-center gap-1 rounded-full border border-border bg-card pl-1.5 pr-3 text-muted-foreground transition-colors hover:text-foreground active:scale-95"
    >
      <ChevronLeft className="h-5 w-5 flex-shrink-0" />
      <span className="max-w-[38vw] truncate text-[13px] font-semibold">{text}</span>
    </button>
  );
}
