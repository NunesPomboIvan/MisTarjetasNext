"use client";

import { CalendarClock } from "lucide-react";
import { FIELD_CARD, fieldOption } from "@/components/shared/field-styles";
import { cn } from "@/lib/utils";
import { getCloseDayChoice, parseLocalDate, type CardForPeriod } from "@/lib/periods/calculate";

interface CloseDayChoiceProps {
  card: (CardForPeriod & { name: string; bank?: string | null }) | undefined;
  /** Fecha del consumo (YYYY-MM-DD). */
  date: string | undefined;
  /** true = resumen siguiente. null/undefined = lo que diga la tarjeta. */
  value: boolean | null | undefined;
  onChange: (nextPeriod: boolean) => void;
}

/** Valor efectivo: lo elegido en el consumo o, si no, la preferencia de la tarjeta. */
export function resolveNextPeriod(
  card: CardForPeriod | undefined,
  date: string | undefined,
  value: boolean | null | undefined
): boolean | null {
  if (!card || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!getCloseDayChoice(card, parseLocalDate(date))) return null;
  return value ?? card.close_day_next ?? false;
}

/**
 * Compra hecha el mismo día del cierre: según el horario en que el comercio
 * la informa, el banco la incluye en el resumen que cierra o la pasa al
 * siguiente. Se elige acá (precargado con la preferencia de la tarjeta).
 */
export function CloseDayChoice({ card, date, value, onChange }: CloseDayChoiceProps) {
  if (!card || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const choice = getCloseDayChoice(card, parseLocalDate(date));
  if (!choice) return null;

  const nextPeriod = value ?? card.close_day_next ?? false;
  const cardName = card.bank || card.name;

  return (
    <div className={cn(FIELD_CARD, "space-y-2 p-3")}>
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
        <CalendarClock className="h-3.5 w-3.5 text-amber-500" />
        Ese día cierra {cardName}. ¿En qué resumen entra?
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={fieldOption(!nextPeriod)}
          aria-pressed={!nextPeriod}
        >
          Este
          <span className="block text-[11px] font-medium opacity-80">{choice.current.label}</span>
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={fieldOption(nextPeriod)}
          aria-pressed={nextPeriod}
        >
          El siguiente
          <span className="block text-[11px] font-medium opacity-80">{choice.next.label}</span>
        </button>
      </div>
    </div>
  );
}
