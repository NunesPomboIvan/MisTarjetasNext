"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavStack } from "@/components/shared/nav-stack";

interface PeriodDetailNavProps {
  label: string;
  prevKey: string | null;
  nextKey: string | null;
  isCurrentMonth: boolean;
  /** Header de totales del período. */
  children: React.ReactNode;
}

/**
 * Título del período con flechas ‹ › para moverse al anterior/siguiente.
 * Moverse entre períodos es cambio de estado, no navegación: usamos
 * `router.replace` + `markReplace()` para no acumular entradas en el stack,
 * así el botón "volver" regresa siempre al origen real.
 * Sin card propia: va dentro de la card única del detalle, junto a las filas.
 */
export function PeriodDetailNav({
  label,
  prevKey,
  nextKey,
  isCurrentMonth,
  children,
}: PeriodDetailNavProps) {
  const router = useRouter();
  const { markReplace } = useNavStack();

  React.useEffect(() => {
    if (prevKey) router.prefetch(`/vencimientos/${prevKey}`);
    if (nextKey) router.prefetch(`/vencimientos/${nextKey}`);
  }, [prevKey, nextKey, router]);

  function go(key: string | null) {
    if (!key) return;
    markReplace();
    router.replace(`/vencimientos/${key}`);
  }

  return (
    <div className="py-[18px]">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(prevKey)}
          disabled={!prevKey}
          aria-label="Período anterior"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground/70 transition-colors hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-display text-[16px] font-bold text-foreground">
            {label}
          </span>
          {isCurrentMonth && (
            <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
              Actual
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => go(nextKey)}
          disabled={!nextKey}
          aria-label="Período siguiente"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground/70 transition-colors hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-3">{children}</div>
    </div>
  );
}
