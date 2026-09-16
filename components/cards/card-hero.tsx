"use client";

import type { CSSProperties } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { getPeriodByOffset } from "@/lib/periods/calculate";
import type { CardForPeriod, Period } from "@/lib/periods/calculate";
import { getCardPalette, tint, shade } from "@/lib/cards/card-colors";
import { CardLogo } from "@/components/cards/card-logo";
import { CardPeriodPaidToggle } from "@/components/cards/card-period-paid-toggle";
import type { Card, Currency } from "@/lib/supabase/database.types";

interface CardHeroProps {
  card: Card & CardForPeriod;
  cardId: string;
  currentPeriod: Period;
  currency?: Currency;
  hideBalance?: boolean;
  saldo: number;
  paid: boolean;
  paidDate: string | null;
  /** "Cierra en 12 días" — se muestra debajo de la barra, a la altura del avance de hoy. */
  statusText: string;
  /** Posición del nodo "Cierre" en la barra (0–100). */
  closePct: number;
  /** Avance de "hoy" sobre la barra (0–100). */
  progressPct: number;
  /** Fechas pre-formateadas en el servidor ("06/08"). "—" si no hay período previo. */
  lastDueLabel: string;
  closeLabel: string;
  dueLabel: string;
  lastDueReached: boolean;
  closeReached: boolean;
  dueReached: boolean;
  /** Hito a resaltar: "close", "due", o null si ya no queda ninguno pendiente. */
  highlightKey: "close" | "due" | null;
}

/** Separa "$ 1.234,56" en símbolo/entero/decimales para achicar el símbolo y los decimales. */
function splitAmount(formatted: string): { symbol: string; integer: string; decimals: string } | null {
  const match = formatted.match(/^([^\d]*)([\d.]+),(\d{2})$/);
  if (!match) return null;
  const [, symbol, integer, decimals] = match;
  return { symbol, integer, decimals };
}

function CardAmount({
  amount,
  currency,
  hide,
  className,
  style,
}: {
  amount: number;
  currency: Currency;
  hide: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  if (hide) {
    return (
      <span className={className} style={style}>
        <span style={{ fontSize: "0.58em", verticalAlign: "top" }}>
          {currency === "USD" ? "US$ " : "$ "}
        </span>
        ••••
      </span>
    );
  }
  const formatted = formatCurrency(amount, currency);
  const parts = splitAmount(formatted);
  if (!parts) {
    return (
      <span className={className} style={style}>
        {formatted}
      </span>
    );
  }
  return (
    <span className={className} style={style}>
      <span style={{ fontSize: "0.58em", verticalAlign: "top" }}>{parts.symbol}</span>
      {parts.integer}
      <span style={{ fontSize: "0.58em", verticalAlign: "top" }}>,{parts.decimals}</span>
    </span>
  );
}

/**
 * Card única de la pantalla de detalle: tarjeta física (gradiente de marca) +
 * saldo + navegación de período + línea de tiempo, todo en un solo
 * contenedor con el color de la tarjeta. Límite/disponible viven en el
 * popup de CardBalanceDialog, no acá. Reemplaza a WalletCard + PeriodNavigator
 * en esta pantalla (el resto de la app sigue usando WalletCard solo).
 */
export function CardHero({
  card,
  cardId,
  currentPeriod,
  currency = "ARS",
  hideBalance = false,
  saldo,
  paid,
  paidDate,
  statusText,
  closePct,
  progressPct,
  lastDueLabel,
  closeLabel,
  dueLabel,
  lastDueReached,
  closeReached,
  dueReached,
  highlightKey,
}: CardHeroProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { base, isLight, fg, fgMuted, fgSecondary, g0, g1, g2, shadowRgb } =
    getCardPalette(card.color);
  const { r, g, b } = shadowRgb;

  const offset = parseInt(searchParams.get("offset") ?? "0");

  function navigate(newOffset: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (newOffset === 0) {
      params.delete("offset");
    } else {
      params.set("offset", newOffset.toString());
    }
    // `replace` (no `push`): moverse entre períodos es cambio de estado, no
    // navegación. Así el botón "volver" regresa al origen real y no va saltando
    // período por período.
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const previousPeriod = getPeriodByOffset(card, offset - 1);
  const nextPeriod = getPeriodByOffset(card, offset + 1);

  const nodes = [
    { key: "lastDue", label: "Último vencimiento", date: lastDueLabel, reached: lastDueReached, pct: 0, align: "start" as const },
    { key: "close", label: "Cierre", date: closeLabel, reached: closeReached, pct: closePct, align: "center" as const },
    { key: "due", label: "Vencimiento", date: dueLabel, reached: dueReached, pct: 100, align: "end" as const },
  ];

  function anchorStyle(pct: number, align: "start" | "center" | "end") {
    if (align === "start") return { left: 0 as const };
    if (align === "end") return { right: 0 as const };
    return { left: `${pct}%`, transform: "translateX(-50%)" };
  }

  const bank = card.bank?.trim();
  const name = card.name?.trim();
  const sameAsBank = !!bank && !!name && bank.toLowerCase() === name.toLowerCase();
  const title = bank || name;

  const pillBg = `rgba(255,255,255,${isLight ? "0.16" : "0.12"})`;

  const ARROW_CLASS = cn(
    "relative flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-colors",
    "hover:bg-white/10 active:bg-white/15",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60",
    // Hit area mínima 44x44 sin agrandar el botón visualmente.
    "after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"
  );

  return (
    <div
      className="relative rounded-[28px]"
      style={{
        width: "100%",
        boxShadow: `0 18px 40px -16px rgba(${r},${g},${b},0.45)`,
        transform: "translateZ(0)",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      <div
        className="relative overflow-hidden rounded-[28px] p-5"
        style={{
          backgroundColor: g1,
          background: `linear-gradient(145deg, ${g0} 0%, ${g1} 48%, ${g2} 100%)`,
          color: fg,
          clipPath: "inset(0 round 28px)",
          WebkitClipPath: "inset(0 round 28px)",
        }}
      >
        {/* Shine diagonal */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[28px]"
          style={{
            background:
              "linear-gradient(132deg, rgba(255,255,255,0.19) 0%, rgba(255,255,255,0.05) 40%, transparent 62%)",
          }}
        />
        {/* Glow radial top-right */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: -60,
            right: -50,
            width: 240,
            height: 240,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${tint(base, 0.45)} 0%, transparent 65%)`,
            opacity: 0.35,
            filter: "blur(2px)",
          }}
        />
        {/* Glow radial bottom-left */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            bottom: -50,
            left: -30,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${shade(base, 0.55)} 0%, transparent 65%)`,
            opacity: 0.5,
            filter: "blur(4px)",
          }}
        />

        {/* 1. Encabezado: banco a la izquierda, período a la misma altura
            (centrado), red a la derecha. `items-start` alinea los tres por
            arriba, contra la primera línea del banco — los últimos 4 dígitos
            cuelgan debajo sin correr esa alineación. */}
        <div className="relative grid grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,1fr)] items-start gap-1.5">
          <div className="min-w-0">
            {title && (
              <div
                className="truncate text-[19px] font-extrabold uppercase leading-tight tracking-wide"
                style={{ color: fg }}
              >
                {title}
              </div>
            )}
            <div
              className="mt-0.5 truncate text-[12px] tabular-nums"
              style={{ color: fgSecondary, letterSpacing: "0.08em" }}
            >
              •••• {card.last_four}
            </div>
          </div>

          {/* Selector de período: flechas + label, dentro de una píldora. El
              label trunca con ellipsis si el ancho disponible no alcanza,
              para no empujar el layout ni superponerse con banco/red. */}
          <div
            className="inline-flex min-w-0 max-w-full items-center gap-1.5 justify-self-center rounded-full px-1"
            style={{ background: pillBg }}
          >
            <button
              type="button"
              onClick={() => navigate(offset - 1)}
              aria-label="Período anterior"
              title={`Ir a ${previousPeriod.label}`}
              className={ARROW_CLASS}
              style={{ color: fgMuted }}
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span
              className="min-w-0 truncate text-[10px] font-semibold uppercase tabular-nums"
              style={{ color: fgMuted, letterSpacing: "0.04em" }}
            >
              {currentPeriod.label}
            </span>
            <button
              type="button"
              onClick={() => navigate(offset + 1)}
              aria-label="Período siguiente"
              title={`Ir a ${nextPeriod.label}`}
              className={ARROW_CLASS}
              style={{ color: fgMuted }}
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="min-w-0 justify-self-end">
            <CardLogo type={card.type} size="lg" fgColor={fg} />
          </div>
        </div>

        {card.is_extension && (
          <div className="relative mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center rounded-[5px] px-1.5 py-0.5 text-[9px] font-bold uppercase"
              style={{
                background: `rgba(255,255,255,${isLight ? "0.22" : "0.15"})`,
                color: fgMuted,
                letterSpacing: "0.14em",
              }}
            >
              Adicional
            </span>
            {card.holder_name && (
              <span
                className="truncate text-[11px] font-semibold"
                style={{ color: fg, maxWidth: 160 }}
                title={card.holder_name}
              >
                {card.holder_name}
              </span>
            )}
            {!sameAsBank && name && bank && (
              <span className="truncate text-[11px]" style={{ color: fgMuted }}>
                {name}
              </span>
            )}
          </div>
        )}

        {/* 2. Monto + botón de estado */}
        <div className="relative mt-3 flex flex-wrap items-center justify-between gap-2">
          <CardAmount
            amount={saldo}
            currency={currency}
            hide={hideBalance}
            className="font-display text-[24px] font-extrabold leading-none tabular-nums"
            style={{ letterSpacing: "-0.02em", color: fg }}
          />
          <CardPeriodPaidToggle
            tone="onColor"
            cardId={cardId}
            periodKey={currentPeriod.key}
            paid={paid}
            paidDate={paidDate}
          />
        </div>

        {/* 3. Línea de tiempo: etiquetas arriba de la barra, barra con los
            hitos, días restantes debajo (a la altura del avance de hoy),
            fechas al final. */}
        <div className="relative mt-3">
          <div className="relative h-3.5">
            {nodes.map((n) => {
              const isHighlight = n.key === highlightKey;
              return (
                <span
                  key={n.key}
                  className={cn(
                    "absolute top-0 max-w-[36%] truncate whitespace-nowrap text-[8px] font-semibold uppercase",
                    n.align === "center" && "text-center",
                    n.align === "end" && "text-right"
                  )}
                  style={{ ...anchorStyle(n.pct, n.align), color: isHighlight ? fg : fgMuted, letterSpacing: "0.02em" }}
                >
                  {n.label}
                </span>
              );
            })}
          </div>

          <div className="relative mt-1 h-3.5">
            <div
              className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full"
              style={{ background: `rgba(255,255,255,${isLight ? "0.28" : "0.18"})` }}
            />
            <div
              className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full transition-[width] duration-500"
              style={{ width: `${progressPct}%`, background: fg }}
            />
            {nodes.map((n) => {
              const isHighlight = n.key === highlightKey;
              return (
                <span
                  key={n.key}
                  className={cn(
                    "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors",
                    isHighlight ? "h-3.5 w-3.5" : "h-3 w-3"
                  )}
                  style={{
                    left: `${n.pct}%`,
                    borderColor: n.reached || isHighlight ? fg : `rgba(255,255,255,${isLight ? "0.35" : "0.25"})`,
                    backgroundColor: isHighlight ? g1 : n.reached ? fg : g1,
                  }}
                />
              );
            })}
          </div>

          {/* Días restantes: a la altura del avance de hoy en la barra. */}
          {highlightKey && (
            <div className="relative mt-1 h-3">
              <span
                className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold"
                style={{ left: `${Math.min(92, Math.max(8, progressPct))}%`, color: fg }}
              >
                {statusText}
              </span>
            </div>
          )}

          <div className="relative mt-1 h-4">
            {nodes.map((n) => {
              const isHighlight = n.key === highlightKey;
              return (
                <span
                  key={n.key}
                  className="absolute top-0 max-w-[32%] truncate whitespace-nowrap text-[13px] font-bold tabular-nums"
                  style={{ ...anchorStyle(n.pct, n.align), color: isHighlight ? fg : fgSecondary }}
                >
                  {n.date}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
