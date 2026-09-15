"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPeriodByOffset } from "@/lib/periods/calculate";
import type { CardForPeriod, Period } from "@/lib/periods/calculate";
import { getCardPalette, tint, shade } from "@/lib/cards/card-colors";
import { Money } from "@/components/shared/money";
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
  /** "Cierra en 12 días" — se muestra chiquito, flotando sobre el punto de avance de hoy en la línea de tiempo. */
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
    { key: "lastDue", label: "Últ. venc.", date: lastDueLabel, reached: lastDueReached, pct: 0, align: "start" as const },
    { key: "close", label: "Cierre", date: closeLabel, reached: closeReached, pct: closePct, align: "center" as const },
    { key: "due", label: "Vencimiento", date: dueLabel, reached: dueReached, pct: 100, align: "end" as const },
  ];
  const nextPendingKey = nodes.find((n) => !n.reached)?.key ?? null;

  function anchorStyle(pct: number, align: "start" | "center" | "end") {
    if (align === "start") return { left: 0 as const };
    if (align === "end") return { right: 0 as const };
    return { left: `${pct}%`, transform: "translateX(-50%)" };
  }

  const bank = card.bank?.trim();
  const name = card.name?.trim();
  const sameAsBank = !!bank && !!name && bank.toLowerCase() === name.toLowerCase();
  const title = bank || name;

  const ARROW_CLASS =
    "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/10";

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
        className="relative overflow-hidden rounded-[28px] px-4 py-4"
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

        {/* TOP: nombre + toggle de pago (izq) / logo de red (der) */}
        <div className="relative flex items-start justify-between gap-2">
          <div className="min-w-0 flex flex-wrap items-center gap-2">
            {title && (
              <span
                className="truncate text-[19px] font-extrabold uppercase tracking-wide"
                style={{ color: fg }}
              >
                {title}
              </span>
            )}
            <CardPeriodPaidToggle
              tone="onColor"
              cardId={cardId}
              periodKey={currentPeriod.key}
              paid={paid}
              paidDate={paidDate}
            />
          </div>
          <CardLogo type={card.type} size="lg" fgColor={fg} />
        </div>

        {card.is_extension && (
          <div className="relative mt-1 flex flex-wrap items-center gap-1.5">
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

        {/* Período + número de tarjeta */}
        <div className="relative mt-3 flex items-center justify-between gap-2">
          <span
            className="text-[11px] font-semibold uppercase"
            style={{ color: fgMuted, letterSpacing: "0.16em" }}
          >
            {currentPeriod.label}
          </span>
          <span
            className="text-[13px] tabular-nums"
            style={{ color: fgSecondary, letterSpacing: "0.12em" }}
          >
            •••• {card.last_four}
          </span>
        </div>

        {/* Saldo */}
        <div className="relative mt-1">
          <Money
            amount={saldo}
            currency={currency}
            hide={hideBalance}
            className="font-display text-[30px] font-extrabold leading-none tabular-nums"
            style={{ letterSpacing: "-0.02em", color: fg }}
          />
        </div>

        {/* Separador sutil */}
        <div
          className="relative mt-3"
          style={{ height: 1, background: `rgba(255,255,255,${isLight ? "0.22" : "0.12"})` }}
        />

        {/* Línea de tiempo, con las flechas de navegación al principio y al final */}
        <div className="relative mt-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => navigate(offset - 1)}
            aria-label={`Ir a ${previousPeriod.label}`}
            className={ARROW_CLASS}
            style={{ color: fgMuted }}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <div className="relative min-w-0 flex-1 px-1">
            <div className="relative h-3.5">
              {nodes.map((n) => (
                <span
                  key={n.key}
                  className={cn(
                    "absolute top-0 overflow-hidden text-ellipsis text-[11px] font-semibold whitespace-nowrap",
                    n.align === "center" ? "" : "max-w-[42%]"
                  )}
                  style={{
                    ...anchorStyle(n.pct, n.align),
                    color: n.key === nextPendingKey ? fg : fgMuted,
                  }}
                >
                  {n.label}
                </span>
              ))}
            </div>

            <div className="relative mt-1.5 h-3.5">
              <div
                className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full"
                style={{ background: `rgba(255,255,255,${isLight ? "0.28" : "0.18"})` }}
              />
              <div
                className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full transition-[width] duration-500"
                style={{ width: `${progressPct}%`, background: fg }}
              />
              {nodes.map((n) => (
                <span
                  key={n.key}
                  className={cn(
                    "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors",
                    n.key === nextPendingKey ? "h-3.5 w-3.5" : "h-3 w-3"
                  )}
                  style={{
                    left: `${n.pct}%`,
                    borderColor: n.reached || n.key === nextPendingKey ? fg : `rgba(255,255,255,${isLight ? "0.35" : "0.25"})`,
                    backgroundColor: n.key === nextPendingKey ? g1 : n.reached ? fg : g1,
                  }}
                />
              ))}
            </div>

            {/* Frase de estado, flotando justo debajo del punto de avance de hoy */}
            {progressPct > 0 && progressPct < 100 && (
              <div className="relative h-3">
                <span
                  className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[8px] font-bold"
                  style={{ left: `${progressPct}%`, color: fgMuted }}
                >
                  {statusText}
                </span>
              </div>
            )}

            <div className="relative mt-1.5 h-3.5">
              {nodes.map((n) => (
                <span
                  key={n.key}
                  className="absolute top-0 whitespace-nowrap text-[13px] font-bold tabular-nums"
                  style={{ ...anchorStyle(n.pct, n.align), color: n.reached ? fg : fgMuted }}
                >
                  {n.date}
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(offset + 1)}
            aria-label={`Ir a ${nextPeriod.label}`}
            className={ARROW_CLASS}
            style={{ color: fgMuted }}
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
