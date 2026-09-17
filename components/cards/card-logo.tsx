import { cn } from "@/lib/utils";
import type { CardType } from "@/lib/supabase/database.types";

interface CardLogoProps {
  type: CardType;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  /** Si se pasa, usa ese color para el texto en vez del default */
  fgColor?: string;
}

export function CardLogo({ type, className, size = "md", fgColor }: CardLogoProps) {
  const sizes = {
    sm: { wrap: "h-6 w-6", text: "text-[10px]", circles: 16 },
    md: { wrap: "h-8 w-8", text: "text-[13px]", circles: 22 },
    lg: { wrap: "h-10 w-10", text: "text-[16px]", circles: 28 },
    // Mismo tamaño de letra que el nombre del banco en CardHero (19px).
    xl: { wrap: "h-11 w-11", text: "text-[19px]", circles: 34 },
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
    const d = s.circles; // diámetro de cada círculo
    const rad = d / 2;
    const overlap = d * 0.42;
    const totalW = d * 2 - overlap;
    const leftCx = rad;
    const rightCx = totalW - rad;
    const cy = rad;
    // Id estable por tamaño: todos los logos del mismo tamaño comparten la misma
    // geometría de recorte, así que reutilizar el id es seguro (sin hooks → server-safe).
    const clipId = `mc-clip-${d}`;
    return (
      <svg
        width={totalW}
        height={d}
        viewBox={`0 0 ${totalW} ${d}`}
        className={cn("flex-shrink-0 select-none", className)}
        role="img"
        aria-label="Mastercard"
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx={leftCx} cy={cy} r={rad} />
          </clipPath>
        </defs>
        {/* Círculo izquierdo — rojo */}
        <circle cx={leftCx} cy={cy} r={rad} fill="#EB001B" />
        {/* Círculo derecho — amarillo */}
        <circle cx={rightCx} cy={cy} r={rad} fill="#F79E1B" />
        {/* Intersección (lente) — naranja, recortada al círculo izquierdo */}
        <g clipPath={`url(#${clipId})`}>
          <circle cx={rightCx} cy={cy} r={rad} fill="#FF5F00" />
        </g>
      </svg>
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
