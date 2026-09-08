"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { StickyPageHeader } from "./sticky-page-header";
import { useNavigationBlocker } from "./navigation-blocker";
import { useNavStack } from "./nav-stack";

export interface AppHeaderAction {
  /** Texto para lectores de pantalla. Por defecto "Guardar". */
  label?: string;
  /** false = tilde gris al 30%, sin tap (campos obligatorios incompletos). */
  enabled?: boolean;
  onClick: () => void;
}

interface AppHeaderProps {
  /** Título de pantalla, centrado respecto de la barra completa. Un renglón. */
  title: string;
  /**
   * Override del "volver". Por defecto hace un pop real del stack in-app
   * (`router.back()`) con fallback a `backHref`, pidiendo confirmación si hay
   * un formulario con cambios sin guardar.
   */
  onBack?: () => void;
  /** Destino de respaldo cuando no hay historial in-app (deep-link / refresh). */
  backHref?: string;
  /**
   * Acción principal a la derecha (tilde ✓). Si se omite, la zona queda vacía
   * pero reserva el mismo ancho para que el título no se descentre.
   */
  action?: AppHeaderAction;
}

/**
 * Cabecera de navegación común a las pantallas de alta y a "Vencimientos".
 * Tres zonas de igual ancho:
 *  - IZQUIERDA: chevron ‹ de volver, sin texto (área táctil 44×44).
 *  - CENTRO: título centrado a la barra, blanco, semibold, un renglón.
 *  - DERECHA: tilde ✓ de guardar, o un espaciador del mismo ancho.
 *
 * La divisoria de 1 px NO va acá: cada pantalla la dibuja debajo del switch,
 * separando toda la zona de cabecera del contenido.
 */
export function AppHeader({ title, onBack, backHref = "/", action }: AppHeaderProps) {
  const router = useRouter();
  const { isBlocked, message } = useNavigationBlocker();
  const { canGoBack } = useNavStack();

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }
    if (isBlocked && !window.confirm(message)) return;
    if (canGoBack) router.back();
    else router.push(backHref);
  }

  const actionDisabled = action?.enabled === false;

  return (
    <StickyPageHeader>
      <div className="grid grid-cols-[44px_1fr_44px] items-center">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Volver"
          className="flex h-11 w-11 items-center justify-center rounded-full text-foreground/70 transition-colors hover:text-foreground active:scale-95"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <h1 className="truncate text-center text-[17px] font-semibold text-foreground">
          {title}
        </h1>

        {action ? (
          <button
            type="button"
            onClick={actionDisabled ? undefined : action.onClick}
            disabled={actionDisabled}
            aria-label={action.label ?? "Guardar"}
            className={cn(
              "flex h-11 w-11 items-center justify-center justify-self-end rounded-full transition-colors active:scale-95",
              actionDisabled
                ? "pointer-events-none text-muted-foreground/30"
                : "text-primary hover:text-primary/80"
            )}
          >
            <Check className="h-6 w-6" />
          </button>
        ) : (
          <div className="h-11 w-11" aria-hidden />
        )}
      </div>
    </StickyPageHeader>
  );
}
