import { cn } from "@/lib/utils";
import type { CardType } from "@/lib/supabase/database.types";

interface CardLogoProps {
  type: CardType;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-5 w-8 text-[8px]",
  md: "h-7 w-11 text-[10px]",
  lg: "h-9 w-14 text-xs",
};

const cardStyles: Record<CardType, { bg: string; text: string; label: string }> = {
  visa: { bg: "bg-blue-600", text: "text-white", label: "VISA" },
  mastercard: { bg: "bg-gradient-to-r from-red-500 to-yellow-400", text: "text-white", label: "MC" },
  amex: { bg: "bg-cyan-600", text: "text-white", label: "AMEX" },
  naranja: { bg: "bg-orange-500", text: "text-white", label: "NRJ" },
  cabal: { bg: "bg-blue-800", text: "text-white", label: "CABAL" },
  other: { bg: "bg-gray-500", text: "text-white", label: "CARD" },
};

export function CardLogo({ type, className, size = "md" }: CardLogoProps) {
  const style = cardStyles[type];
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded font-bold tracking-tight",
        style.bg,
        style.text,
        sizeClasses[size],
        className
      )}
    >
      {style.label}
    </div>
  );
}
