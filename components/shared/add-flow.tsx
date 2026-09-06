"use client";

import * as React from "react";

import { NewExpenseHero } from "@/components/expenses/new-expense-hero";
import { LoanForm } from "@/components/loans/loan-form";
import { BackButton } from "@/components/shared/back-button";
import { cn } from "@/lib/utils";
import type { Card, Category } from "@/lib/supabase/database.types";

type Mode = "consumo" | "prestamo";

interface AddFlowProps {
  initialMode?: Mode;
  cards: Card[];
  categories: Category[];
  defaultCardId?: string;
  backHref: string;
  globalRate: number | null;
}

/**
 * Pantalla de alta del botón (+) de la bottom bar. Arranca en "Consumo" y un
 * selector segmentado permite pasar a "Préstamo" sin recargar: ambos
 * formularios quedan montados y sólo se alterna cuál se ve, así los datos ya
 * cargados en cada uno se conservan al ir y volver.
 *
 * Los formularios (`NewExpenseHero`, `LoanForm`) son los mismos que usan
 * `/expenses/new` y `/prestamos/new`; acá sólo se los envuelve con el switch.
 */
export function AddFlow({
  initialMode = "consumo",
  cards,
  categories,
  defaultCardId,
  backHref,
  globalRate,
}: AddFlowProps) {
  const [mode, setMode] = React.useState<Mode>(initialMode);

  return (
    <div>
      {/* Selector segmentado: Consumo | Préstamo */}
      <div
        role="tablist"
        aria-label="Tipo de carga"
        className="mb-5 flex rounded-[14px] border border-border bg-muted/40 p-1"
      >
        <SegmentButton
          active={mode === "consumo"}
          onClick={() => setMode("consumo")}
        >
          Consumo
        </SegmentButton>
        <SegmentButton
          active={mode === "prestamo"}
          onClick={() => setMode("prestamo")}
        >
          Préstamo
        </SegmentButton>
      </div>

      {/* Consumo */}
      <div hidden={mode !== "consumo"}>
        <NewExpenseHero
          cards={cards}
          categories={categories}
          defaultCardId={defaultCardId}
          backHref={backHref}
          globalRate={globalRate}
        />
      </div>

      {/* Préstamo */}
      <div hidden={mode !== "prestamo"} className="space-y-4">
        <div className="sticky top-0 z-20 -mx-4 flex items-center gap-3 bg-background px-4 pb-3">
          <BackButton href="/prestamos" />
          <div>
            <h1 className="text-xl font-bold">Nuevo préstamo</h1>
            <p className="text-sm text-muted-foreground">
              Elegí entre monto total dividido o cargar cada cuota a mano
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <LoanForm globalRate={globalRate} />
        </div>
      </div>
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex-1 rounded-[10px] px-3 py-2 text-[13px] font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground"
      )}
    >
      {children}
    </button>
  );
}
