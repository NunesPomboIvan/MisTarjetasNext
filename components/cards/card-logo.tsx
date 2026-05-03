import { cn } from "@/lib/utils";
import type { CardType } from "@/lib/supabase/database.types";

interface CardLogoProps {
  type: CardType;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Si se pasa, usa ese color para el texto en vez del default */
  fgColor?: string;
}

export function CardLogo({ type, className, size = "md", fgColor }: CardLogoProps) {
  const sizes = {
    sm: { wrap: "h-6 w-6", text: "text-[10px]", circles: 16 },
    md: { wrap: "h-8 w-8", text: "text-[13px]", circles: 22 },
    lg: { wrap: "h-10 w-10", text: "text-[16px]", circles: 28 },
  };
  const s = sizes[size];
  const fg = fgColor ?? "rgba(255,255,255,0.92)";

  if (type === "visa") {
    return (
      <span
        className={cn("font-black italic select-none leading-none tracking-[-0.03em]", s.text, className)}
        style={{ color: fg, fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}
      >
        VISA
      </span>
    );
  }

  if (type === "mastercard") {
    const r = s.circles;
    const overlap = r * 0.42;
    const totalW = r * 2 - overlap;
    return (
      <div
        className={cn("relative flex-shrink-0 select-none", className)}
        style={{ width: totalW, height: r }}
        aria-label="Mastercard"
      >
        {/* Círculo izquierdo — rojo */}
        <div
          className="absolute left-0 top-0 rounded-full"
          style={{
            width: r,
            height: r,
            background: "#EB001B",
            opacity: 0.92,
          }}
        />
        {/* Círculo derecho — amarillo */}
        <div
          className="absolute top-0 rounded-full"
          style={{
            width: r,
            height: r,
            right: 0,
            background: "#F79E1B",
            opacity: 0.92,
          }}
        />
        {/* Zona de superposición — mezcla naranja */}
        <div
          className="absolute top-0"
          style={{
            left: r - overlap,
            width: overlap,
            height: r,
            background: "linear-gradient(to right, #EB001B, #FF5F00, #F79E1B)",
            opacity: 0.92,
            mixBlendMode: "multiply",
          }}
        />
      </div>
    );
  }

  if (type === "amex") {
    return (
      <span
        className={cn("font-black tracking-[0.08em] select-none leading-none", s.text, className)}
        style={{ color: fg, fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: "calc(1em * 0.85)", textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}
      >
        AMEX
      </span>
    );
  }

  if (type === "naranja") {
    return (
      <span
        className={cn("font-black tracking-[-0.01em] select-none leading-none", s.text, className)}
        style={{ color: "#FF6B00", textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}
      >
        naranja
      </span>
    );
  }

  if (type === "cabal") {
    return (
      <span
        className={cn("font-bold tracking-[0.04em] select-none leading-none uppercase", s.text, className)}
        style={{ color: fg, textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}
      >
        Cabal
      </span>
    );
  }

  return (
    <span
      className={cn("font-semibold select-none leading-none opacity-80", s.text, className)}
      style={{ color: fg }}
    >
      Card
    </span>
  );
}
