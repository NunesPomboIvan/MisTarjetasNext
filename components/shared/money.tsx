import { cn, formatCurrency } from "@/lib/utils";

interface MoneyProps {
  amount: number;
  currency?: "ARS" | "USD";
  className?: string;
  /** Si true, aplica el gradiente naranja al texto */
  gradient?: boolean;
  /** Tamaño del texto (heredado por defecto) */
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
};

export function Money({ amount, currency = "ARS", className, gradient, size }: MoneyProps) {
  const formatted = formatCurrency(amount, currency);
  return (
    <span
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
