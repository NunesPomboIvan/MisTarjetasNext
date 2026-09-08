"use client";

import * as React from "react";

import { NewExpenseHero } from "@/components/expenses/new-expense-hero";
import { LoanForm } from "@/components/loans/loan-form";
import { AppHeader } from "@/components/shared/app-header";
import { TypeSwitch } from "@/components/shared/type-switch";
import type { Card, Category } from "@/lib/supabase/database.types";

type Mode = "consumo" | "prestamo";

const CONSUMO_FORM_ID = "add-consumo-form";
const PRESTAMO_FORM_ID = "add-prestamo-form";

interface AddFlowProps {
  initialMode?: Mode;
  cards: Card[];
  categories: Category[];
  defaultCardId?: string;
  backHref: string;
  globalRate: number | null;
  /** Modo "gastos de tarjeta": sólo consumo, sin selector de tipo. */
  feeMode?: boolean;
  /** Arranca el consumo como "fijo mensual" (recurrente). */
  recurringMode?: boolean;
}

/**
 * Pantalla de alta del botón (+) de la bottom bar, y también de `/expenses/new`
 * y `/prestamos/new`. Orden vertical fijo, idéntico a "Vencimientos":
 *
 *   1. AppHeader (chevron ‹ · título · tilde ✓) — pegado al safe-area
 *   2. TypeSwitch Consumo | Préstamo
 *   3. Divisoria de 1 px
 *   4. Formulario
 *
 * Ambos formularios quedan montados y sólo se alterna cuál se ve con `hidden`,
 * así los datos ya cargados se conservan al ir y volver entre modos. El tilde ✓
 * del header dispara el `<form>` activo por su id (`requestSubmit()`).
 */
export function AddFlow({
  initialMode = "consumo",
  cards,
  categories,
  defaultCardId,
  backHref,
  globalRate,
  feeMode = false,
  recurringMode = false,
}: AddFlowProps) {
  const [mode, setMode] = React.useState<Mode>(feeMode ? "consumo" : initialMode);

  const [consumoState, setConsumoState] = React.useState({
    canSave: false,
    saving: false,
    title: feeMode ? "Gasto de tarjeta" : "Nuevo consumo",
  });
  const [prestamoState, setPrestamoState] = React.useState({
    canSave: false,
    saving: false,
  });

  const onConsumoState = React.useCallback(
    (s: { canSave: boolean; saving: boolean; title: string }) => setConsumoState(s),
    []
  );
  const onPrestamoState = React.useCallback(
    (s: { canSave: boolean; saving: boolean }) => setPrestamoState(s),
    []
  );

  const active = mode === "consumo" ? consumoState : prestamoState;
  const activeFormId = mode === "consumo" ? CONSUMO_FORM_ID : PRESTAMO_FORM_ID;
  const title = mode === "consumo" ? consumoState.title : "Nuevo préstamo";

  function submitActive() {
    const form = document.getElementById(activeFormId);
    if (form instanceof HTMLFormElement) form.requestSubmit();
  }

  return (
    <div>
      <AppHeader
        title={title}
        backHref={backHref}
        action={{
          label: "Guardar",
          enabled: active.canSave && !active.saving,
          onClick: submitActive,
        }}
      />

      <div className="mt-1 space-y-4">
        {!feeMode && (
          <TypeSwitch
            aria-label="Tipo de carga"
            options={[
              { value: "consumo", label: "Consumo" },
              { value: "prestamo", label: "Préstamo" },
            ]}
            value={mode}
            onChange={setMode}
          />
        )}

        <div className="-mx-4 border-t border-border" />

        <div hidden={mode !== "consumo"}>
          <NewExpenseHero
            cards={cards}
            categories={categories}
            defaultCardId={defaultCardId}
            feeMode={feeMode}
            recurringMode={recurringMode}
            globalRate={globalRate}
            formId={CONSUMO_FORM_ID}
            onStateChange={onConsumoState}
          />
        </div>

        <div hidden={mode !== "prestamo"}>
          <div className="rounded-2xl border border-border bg-card p-5">
            <LoanForm
              globalRate={globalRate}
              formId={PRESTAMO_FORM_ID}
              onStateChange={onPrestamoState}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
