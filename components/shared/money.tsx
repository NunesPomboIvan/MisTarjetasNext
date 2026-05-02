import { cn, formatCurrency } from "@/lib/utils";
import type { CSSProperties } from "react";

interface MoneyProps {
  amount: number;
  currency?: "ARS" | "USD";
  className?: string;
  style?: CSSProperties;
  /** Si true, aplica el gradiente naranja al texto */
  gradient?: boolean;
  /** Tamaño del texto (heredado por defecto) */
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  /** Si true, oculta el monto y muestra placeholder ($ ••••) */
  hide?: boolean;
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
};

export function Money({
  amount,
  currency = "ARS",
  className,
  style,
  gradient,
  size,
  hide,
}: MoneyProps) {
  const formatted = hide
    ? currency === "USD"
      ? "US$ ••••"
      : "$ ••••"
    : formatCurrency(amount, currency);
  return (
    <span
      style={style}
      className={cn(
        "font-semibold tabular-nums",
        size && sizeClasses[size],
        gradient && "gradient-text",
        className
      )}
    >
      {formatted}
    </span>
  );
}
