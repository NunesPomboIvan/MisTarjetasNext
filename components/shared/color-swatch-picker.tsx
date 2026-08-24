"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Nombre legible por color, para lectores de pantalla (no depender del matiz). */
export const COLOR_NAMES: Record<string, string> = {
  "#6366f1": "Índigo",
  "#3b82f6": "Azul",
  "#14b8a6": "Turquesa",
  "#1a7a46": "Verde",
  "#eab308": "Amarillo",
  "#f97316": "Naranja",
  "#ef4444": "Rojo",
  "#ec4899": "Rosa",
  "#8b5cf6": "Violeta",
};

interface ColorSwatchPickerProps {
  colors: string[];
  value: string | null | undefined;
  onChange: (color: string) => void;
  disabled?: boolean;
  /** Nombre del grupo para el lector de pantalla (aria-label del contenedor). */
  label?: string;
  className?: string;
}

/**
 * Grupo de swatches de color accesible: cada botón anuncia su nombre (no el
 * hex) y su estado con aria-pressed, y la selección se marca también con un
 * check superpuesto — no depende solo del color (WCAG 1.4.1).
 */
export function ColorSwatchPicker({
  colors,
  value,
  onChange,
  disabled,
  label = "Color",
  className,
}: ColorSwatchPickerProps) {
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {colors.map((color) => {
        const selected = value === color;
        const name = COLOR_NAMES[color] ?? color;
        return (
          <button
            key={color}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            aria-label={name}
            onClick={() => onChange(color)}
            className={cn(
              "relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform hover:scale-110 disabled:opacity-50",
              selected ? "border-foreground scale-110" : "border-transparent"
            )}
            style={{ backgroundColor: color }}
          >
            {selected && (
              <Check
                aria-hidden="true"
                className="h-4 w-4 text-white"
                style={{ filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,0.85))" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
