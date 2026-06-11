"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, DollarSign, Loader2, Pencil, X } from "lucide-react";
import { updateGlobalExchangeRate } from "@/actions/exchange";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ExchangeRateEntry } from "@/lib/supabase/database.types";

interface ExchangeRateClientProps {
  /** Historial ordenado del más reciente al más antiguo */
  history: ExchangeRateEntry[];
}

export function ExchangeRateClient({ history }: ExchangeRateClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<{
    expenses: number;
    installments: number;
  } | null>(null);

  const current = history[0] ?? null;

  function startEdit() {
    setDraft(current ? Number(current.rate) : null);
    setEditing(true);
  }

  function save() {
    if (!(draft && draft > 0)) {
      toast.error("Ingresá un tipo de cambio mayor a 0");
      return;
    }
    startTransition(async () => {
      const result = await updateGlobalExchangeRate(draft);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setEditing(false);
      setLastResult({
        expenses: result.expensesUpdated,
        installments: result.installmentsUpdated,
      });
      toast.success(
        `Se actualizaron ${result.expensesUpdated} consumo${
          result.expensesUpdated === 1 ? "" : "s"
        } y ${result.installmentsUpdated} cuota${
          result.installmentsUpdated === 1 ? "" : "s"
        }`
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* TC vigente */}
      <section className="glass-card rounded-[20px] px-5 py-[18px]">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <p className="text-[12px] font-medium text-muted-foreground">
            Tipo de cambio general (ARS por 1 USD)
          </p>
        </div>

        {!editing ? (
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-[28px] font-bold leading-none tracking-tight text-foreground tabular-nums">
                {current ? formatCurrency(Number(current.rate)) : "Sin configurar"}
              </p>
              {current && (
                <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                  Actualizado el {formatDate(new Date(current.created_at), "d/M/yyyy HH:mm")}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startEdit}
              className="flex-shrink-0 rounded-full"
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Editar
            </Button>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <Label htmlFor="global-rate">Nuevo tipo de cambio</Label>
            <Input
              id="global-rate"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="Ej: 1200"
              autoFocus
              value={draft ?? ""}
              onChange={(e) => {
                const n = Number(e.target.value);
                setDraft(e.target.value === "" || isNaN(n) ? null : n);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Al guardar se recalculan en pesos todos los consumos en USD y las
              cuotas de préstamos en USD que NO tengan un TC personalizado.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                className="btn-glass-primary"
                onClick={save}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-1 h-4 w-4" />
                )}
                Guardar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={isPending}
              >
                <X className="mr-1 h-4 w-4" />
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {lastResult && !editing && (
          <p className="mt-3 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-[12px] font-medium text-foreground">
            Se actualizaron {lastResult.expenses} consumo
            {lastResult.expenses === 1 ? "" : "s"} y {lastResult.installments} cuota
            {lastResult.installments === 1 ? "" : "s"}.
          </p>
        )}
      </section>

      {/* Historial */}
      <section className="space-y-2">
        <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Historial de cambios
        </h2>
        {history.length === 0 ? (
          <p className="rounded-[14px] border border-border bg-card px-4 py-6 text-center text-[12px] text-muted-foreground">
            Todavía no configuraste el tipo de cambio
          </p>
        ) : (
          <div className="overflow-hidden rounded-[18px] border border-border bg-card">
            {history.map((entry, idx) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0"
              >
                <span className="text-[13px] text-muted-foreground">
                  {formatDate(new Date(entry.created_at), "d/M/yyyy HH:mm")}
                </span>
                <span className="text-[14px] font-semibold tabular-nums text-foreground">
                  {formatCurrency(Number(entry.rate))}
                  {idx === 0 && (
                    <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                      Vigente
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
