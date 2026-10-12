"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TypeSwitchOption<T extends string> {
  value: T;
  label: string;
}

interface TypeSwitchProps<T extends string> {
  /** Exactamente dos segmentos de 50%. */
  options: [TypeSwitchOption<T>, TypeSwitchOption<T>];
  value: T;
  onChange: (value: T) => void;
  "aria-label"?: string;
  /**
   * "pill" (default) o "square": la variante de las pantallas de alta, con el
   * formato de sus items — sólo borde, sin relleno, y el activo en azul tenue.
   */
  shape?: "pill" | "square";
}

/**
 * Selector de tipo compartido (Consumo | Préstamo / Tarjetas | Préstamos).
 * Segmented control tipo pill, ancho completo, mismo estilo en todas las
 * pantallas. Va siempre inmediatamente debajo del `AppHeader`.
 *
 * - Fondo apenas distinto al de pantalla, borde 1 px muy tenue, padding
 *   interno de 4 px para que el pill activo quede inset.
 * - ACTIVO: fondo violeta de acento, texto azul muy oscuro semibold.
 *   INACTIVO: sin fondo, texto gris claro regular. Mismo tamaño de fuente en
 *   ambos estados: sólo cambian peso y color.
 * - El pill activo se desliza (~200 ms ease-out), no aparece de golpe.
 * - Todo el ancho del segmento es tocable.
 */
export function TypeSwitch<T extends string>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel = "Selector de tipo",
  shape = "pill",
}: TypeSwitchProps<T>) {
  const square = shape === "square";
  const radius = square ? "rounded-md" : "rounded-full";
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "relative flex w-full border p-1",
        square
          ? "h-9 rounded-lg border-border bg-transparent"
          : "h-11 rounded-full border-white/[0.07] bg-secondary"
      )}
    >
      {/* Pill activo deslizante */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] transition-transform duration-200 ease-out",
          square ? "border border-primary bg-primary/10" : "bg-primary",
          radius
        )}
        style={{
          transform: activeIndex === 1 ? "translateX(100%)" : "translateX(0)",
        }}
      />

      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative z-10 flex-1 transition-colors",
              radius,
              square ? "text-[13px] font-semibold" : "text-[14px]",
              active
                ? square
                  ? "text-primary"
                  : "font-semibold text-primary-foreground"
                : square
                  ? "text-muted-foreground"
                  : "font-normal text-muted-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
