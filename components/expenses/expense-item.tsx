"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { toast } from "sonner";
import { Trash2, Pencil, Copy, Check, Lock, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Money } from "@/components/shared/money";
import { deleteExpense, excludeExpenseInstallment, cloneExpense } from "@/actions/expenses";
import { getInstallmentAmountForIndex } from "@/lib/periods/calculate";
import { formatDate, cn } from "@/lib/utils";
import type { ExpenseWithCategory } from "@/lib/supabase/database.types";

interface ExpenseItemProps {
  expense: ExpenseWithCategory;
  onEdit?: (id: string) => void;
  /** URL directa para editar (alternativa a onEdit, usada desde Server Components) */
  editHref?: string;
  /** Índice 0-based de la cuota que cae en el período visualizado. Undefined = no mostrar */
  installmentIndex?: number;
  /** ID de la tarjeta, necesario para el editor de importe inline */
  cardId?: string;
  /** Nombre de la tarjeta, para mostrar en listas globales */
  cardName?: string;
  /** Modo selección múltiple: el tap selecciona en vez de abrir el detalle */
  selectionMode?: boolean;
  /** Si está seleccionado (en modo selección) */
  selected?: boolean;
  /** Callback al togglear la selección de este item */
  onSelectToggle?: (id: string) => void;
}

const LONG_PRESS_MS = 450;
const MOVE_THRESHOLD = 10;

export function ExpenseItem({
  expense,
  onEdit,
  editHref,
  installmentIndex,
  cardId,
  cardName,
  selectionMode = false,
  selected = false,
  onSelectToggle,
}: ExpenseItemProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const cat = expense.category;

  // Detalle del consumo, conservando contexto de tarjeta/cuota
  const detailParams = new URLSearchParams();
  if (cardId) detailParams.set("card_id", cardId);
  if (installmentIndex !== undefined && installmentIndex >= 0)
    detailParams.set("installment", String(installmentIndex));
  const detailHref = `/expenses/${expense.id}${
    detailParams.toString() ? `?${detailParams.toString()}` : ""
  }`;

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = React.useRef<{ x: number; y: number } | null>(null);
  const longPressedRef = React.useRef(false);
  const movedRef = React.useRef(false);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    if (e.button === 2) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    longPressedRef.current = false;
    movedRef.current = false;
    // En modo selección no hay long-press: el tap selecciona.
    if (selectionMode) return;
    clearTimer();
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      setMenuOpen(true);
    }, LONG_PRESS_MS);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!startRef.current) return;
    const dx = Math.abs(e.clientX - startRef.current.x);
    const dy = Math.abs(e.clientY - startRef.current.y);
    if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
      movedRef.current = true;
      clearTimer();
    }
  }

  function onPointerUp() {
    clearTimer();
    if (selectionMode) {
      if (!movedRef.current) onSelectToggle?.(expense.id);
      startRef.current = null;
      return;
    }
    if (!longPressedRef.current && !movedRef.current) {
      router.push(detailHref);
    }
    startRef.current = null;
  }

  function onPointerCancel() {
    clearTimer();
    startRef.current = null;
  }

  function handleEdit() {
    setMenuOpen(false);
    if (editHref) router.push(editHref);
    else onEdit?.(expense.id);
  }

  function handleClone() {
    setMenuOpen(false);
    startTransition(async () => {
      const result = await cloneExpense(expense.id);
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Consumo duplicado para hoy");
        router.refresh();
      }
    });
  }

  // Eliminar un consumo recurrente desde el contexto de un mes puntual ofrece
  // elegir el alcance; el resto de los casos elimina el registro completo.
  const canChooseDeleteScope =
    expense.recurring && installmentIndex !== undefined && installmentIndex >= 0;

  function handleDeleteAll() {
    startTransition(async () => {
      const result = await deleteExpense(expense.id, expense.card_id);
      if (!result.success) toast.error(result.error);
      else {
        toast.success(canChooseDeleteScope ? "Consumo eliminado por completo" : "Consumo eliminado");
        router.refresh();
      }
      setDeleteOpen(false);
      setMenuOpen(false);
    });
  }

  function handleDeleteOnlyThis() {
    if (installmentIndex === undefined) return;
    startTransition(async () => {
      const result = await excludeExpenseInstallment(
        expense.id,
        installmentIndex,
        expense.card_id
      );
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Este mes fue eliminado");
        router.refresh();
      }
      setDeleteOpen(false);
      setMenuOpen(false);
    });
  }

  const showInstallmentBadge =
    expense.installments > 1 &&
    installmentIndex !== undefined &&
    installmentIndex >= 0;

  const displayAmount =
    installmentIndex !== undefined && installmentIndex >= 0
      ? getInstallmentAmountForIndex(expense, installmentIndex)
      : expense.installment_amount;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            router.push(detailHref);
          }
        }}
        className={cn(
          "group flex items-center gap-3 rounded-xl border bg-card p-3 transition-all active:scale-[0.99]",
          selectionMode && selected
            ? "border-primary ring-1 ring-primary/40"
            : "border-border",
          isPending && "opacity-40"
        )}
        style={{
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
          cursor: "pointer",
        }}
      >
        {/* Checkbox de selección múltiple */}
        {selectionMode && (
          <div
            aria-hidden
            className={cn(
              "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-colors",
              selected
                ? "border-primary bg-primary text-white"
                : "border-muted-foreground/40"
            )}
          >
            {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          </div>
        )}

        {/* Category emoji — badge "3D realista" (marco circular con luz + sombra,
            emoji nativo con sombra propia para que "flote") */}
        {cat ? (
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[15px] text-[26px]"
            style={{
              background: `radial-gradient(130% 130% at 32% 24%, #ffffff 0%, ${cat.color_bg} 72%, ${cat.color_bg} 100%)`,
              boxShadow: `0 5px 12px -3px rgba(0,0,0,0.40), 0 2px 6px ${cat.color_text}40, inset 0 1px 1.5px rgba(255,255,255,0.95), inset 0 -2px 4px ${cat.color_text}26`,
            }}
          >
            <span style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.28))" }}>
              {cat.emoji}
            </span>
          </div>
        ) : (
          <div className="h-12 w-12 flex-shrink-0" />
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{expense.description}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              {formatDate(expense.expense_date + "T00:00:00")}
            </span>

            {expense.recurring ? (
              <Badge
                variant="secondary"
                className="h-4 gap-0.5 bg-primary/10 px-1.5 text-[10px] text-primary"
              >
                <Repeat className="h-2.5 w-2.5" />
                Mensual
              </Badge>
            ) : showInstallmentBadge ? (
              <Badge
                variant="secondary"
                className="h-4 bg-amber-100 px-1.5 text-[10px] text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              >
                Cuota {installmentIndex! + 1}/{expense.installments}
              </Badge>
            ) : expense.installments > 1 ? (
              <Badge
                variant="secondary"
                className="h-4 bg-amber-100 px-1.5 text-[10px] text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              >
                {expense.installments} cuotas
              </Badge>
            ) : null}

            {cat && (
              <span
                className="rounded-full px-1.5 py-0 text-[10px] font-medium"
                style={{ backgroundColor: cat.color_bg, color: cat.color_text }}
              >
                {cat.name}
              </span>
            )}

            {cardName && (
              <span className="text-[10px] text-muted-foreground">
                💳 {cardName}
              </span>
            )}

            {expense.tags?.map((tag) => (
              <span key={tag} className="text-[10px] text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <span className="inline-flex items-center gap-1">
            {/* Candado: consumo en USD con TC personalizado (no sigue el global) */}
            {expense.currency === "USD" && expense.exchange_rate_custom && (
              <Lock
                className="h-3 w-3 text-amber-500"
                aria-label="Tipo de cambio personalizado"
              />
            )}
            <Money
              amount={displayAmount}
              currency={expense.currency}
              size="md"
              className={cn(displayAmount < 0 && "text-emerald-600 dark:text-emerald-400")}
            />
          </span>
          {expense.installments > 1 && !showInstallmentBadge && (
            <span className="text-[10px] text-muted-foreground">c/u</span>
          )}
        </div>
      </div>

      {/* Menú al mantener apretado */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="px-0 pb-safe">
          <SheetHeader className="px-5 pb-1">
            <SheetTitle className="truncate">{expense.description}</SheetTitle>
          </SheetHeader>
          <div className="divide-y divide-border/50">
            {(editHref || onEdit) && (
              <button
                type="button"
                onClick={handleEdit}
                className="flex w-full items-center gap-3.5 px-5 py-4 text-left text-[15px] font-medium text-foreground transition-colors active:bg-muted/60"
              >
                <Pencil className="h-5 w-5 text-muted-foreground" />
                Editar consumo
              </button>
            )}
            <button
              type="button"
              onClick={handleClone}
              className="flex w-full items-center gap-3.5 px-5 py-4 text-left text-[15px] font-medium text-foreground transition-colors active:bg-muted/60"
            >
              <Copy className="h-5 w-5 text-muted-foreground" />
              Repetir hoy
            </button>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="flex w-full items-center gap-3.5 px-5 py-4 text-left text-[15px] font-medium text-destructive transition-colors active:bg-muted/60"
            >
              <Trash2 className="h-5 w-5" />
              Eliminar consumo
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar consumo?</AlertDialogTitle>
            <AlertDialogDescription>
              {canChooseDeleteScope ? (
                <>
                  &quot;{expense.description}&quot; es un consumo fijo mensual. Elegí si
                  eliminás solo este mes o el consumo completo (todos los meses, pasados y
                  futuros). Esta acción no se puede deshacer.
                </>
              ) : (
                <>
                  Vas a eliminar &quot;{expense.description}&quot;. Esta acción no se
                  puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {canChooseDeleteScope ? (
            <AlertDialogFooter className="flex-col sm:flex-col gap-2">
              <AlertDialogAction
                onClick={handleDeleteOnlyThis}
                disabled={isPending}
                className="w-full bg-destructive text-white hover:bg-destructive/90"
              >
                Eliminar solo este mes
              </AlertDialogAction>
              <AlertDialogAction
                onClick={handleDeleteAll}
                disabled={isPending}
                className="w-full bg-destructive text-white hover:bg-destructive/90"
              >
                Eliminar todos los meses
              </AlertDialogAction>
              <AlertDialogCancel className="w-full" disabled={isPending}>
                Cancelar
              </AlertDialogCancel>
            </AlertDialogFooter>
          ) : (
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAll}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
