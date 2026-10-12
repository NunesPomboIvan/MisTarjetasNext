"use client";

import * as React from "react";

import { NewExpenseHero } from "@/components/expenses/new-expense-hero";
import { LoanForm } from "@/components/loans/loan-form";
import { StickySaveBar } from "@/components/shared/sticky-save-bar";
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
  globalRate: number | null;
  /** Modo "gastos de tarjeta": sólo consumo, sin selector de tipo. */
  feeMode?: boolean;
  /** Arranca el consumo como "fijo mensual" (recurrente). */
  recurringMode?: boolean;
}

interface FormState {
  canSave: boolean;
  saving: boolean;
}

/**
 * Pantalla de alta del botón (+) de la bottom bar, y también de `/expenses/new`
 * y `/prestamos/new`. Sin encabezado (se sale con el "atrás" del sistema o la
 * bottom bar):
 *
 *   1. TypeSwitch Consumo | Préstamo
 *   2. Formulario: importe + una card por campo, sobre el fondo de la app
 *   3. Tilde ✓ de guardar, fijo abajo a la derecha (`StickySaveBar`)
 *
 * Ambos formularios quedan montados y sólo se alterna cuál se ve con `hidden`,
 * así los datos ya cargados se conservan al ir y volver entre modos. El botón
 * de guardar dispara el `<form>` activo por su id (`requestSubmit()`).
 */
export function AddFlow({
  initialMode = "consumo",
  cards,
  categories,
  defaultCardId,
  globalRate,
  feeMode = false,
  recurringMode = false,
}: AddFlowProps) {
  const [mode, setMode] = React.useState<Mode>(feeMode ? "consumo" : initialMode);

  const [consumoState, setConsumoState] = React.useState<FormState>({
    canSave: false,
    saving: false,
  });
  const [prestamoState, setPrestamoState] = React.useState<FormState>({
    canSave: false,
    saving: false,
  });

  const active = mode === "consumo" ? consumoState : prestamoState;
  const activeFormId = mode === "consumo" ? CONSUMO_FORM_ID : PRESTAMO_FORM_ID;

  function submitActive() {
    const form = document.getElementById(activeFormId);
    if (form instanceof HTMLFormElement) form.requestSubmit();
  }

  return (
    // El margen negativo compensa el safe-area que el layout suma dos veces
    // (padding de `main` + padding de `body`): sin él queda scroll vacío abajo.
    <div className="-mb-[env(safe-area-inset-bottom)]">
      <div className="space-y-4">
        {!feeMode && (
          <TypeSwitch
            aria-label="Tipo de carga"
            shape="square"
            options={[
              { value: "consumo", label: "Consumo" },
              { value: "prestamo", label: "Préstamo" },
            ]}
            value={mode}
            onChange={setMode}
          />
        )}

        <div hidden={mode !== "consumo"}>
          <NewExpenseHero
            cards={cards}
            categories={categories}
            defaultCardId={defaultCardId}
            feeMode={feeMode}
            recurringMode={recurringMode}
            globalRate={globalRate}
            formId={CONSUMO_FORM_ID}
            onStateChange={setConsumoState}
          />
        </div>

        <div hidden={mode !== "prestamo"}>
          <LoanForm
            globalRate={globalRate}
            formId={PRESTAMO_FORM_ID}
            onStateChange={setPrestamoState}
          />
        </div>
      </div>

      {/* Reserva lugar para que el botón fijo no tape el final del form. */}
      <div aria-hidden className="h-8" />

      {!(mode === "consumo" && cards.length === 0) && (
        <StickySaveBar
          enabled={active.canSave}
          saving={active.saving}
          onClick={submitActive}
        />
      )}
    </div>
  );
}
