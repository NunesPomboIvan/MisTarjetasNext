import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BackButton } from "./back-button";
import { StickyPageHeader } from "./sticky-page-header";

interface StackHeaderProps {
  /** Título del header. Se centra respecto de la barra, no del espacio libre. Opcional: si no se pasa, no se renderiza. */
  title?: ReactNode;
  /**
   * Clases de tipografía del título. Cada pantalla conserva su propio estilo
   * (no se unifica la tipografía, solo el layout del header).
   */
  titleClassName?: string;
  /** Destino de respaldo del botón volver (deep-link / refresh). */
  backHref?: string;
  /** Slot opcional a la derecha (menú de acciones, filtros, etc.). */
  right?: ReactNode;
}

/**
 * Header de navegación común a las pantallas apiladas (períodos, vencimientos,
 * cierres, movimientos, detalle de tarjeta). Estructura unificada:
 *  - a la izquierda, solo la flecha de "volver" (sin texto);
 *  - el título centrado horizontalmente respecto de la barra completa
 *    (posición absoluta al 50%, independiente del ancho de los elementos
 *    laterales), truncado con puntos suspensivos si es largo;
 *  - a la derecha, el slot `right` o un espaciador que reserva el mismo ancho
 *    que el botón de volver.
 */
export function StackHeader({
  title,
  titleClassName,
  backHref = "/",
  right,
}: StackHeaderProps) {
  return (
    <StickyPageHeader>
      <div className="relative flex items-center justify-between">
        <BackButton href={backHref} iconOnly />
        {title != null && (
          <h1
            className={cn(
              "pointer-events-none absolute left-1/2 max-w-[62%] -translate-x-1/2 truncate text-center",
              titleClassName
            )}
          >
            {title}
          </h1>
        )}
        {right ?? <div className="h-10 w-10 shrink-0" aria-hidden />}
      </div>
    </StickyPageHeader>
  );
}
