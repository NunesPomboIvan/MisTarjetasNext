"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Money } from "@/components/shared/money";

interface CardBalanceDialogProps {
  saldo: number;
  limite: number;
  disponible: number;
}

/**
 * Botón que reemplaza al acceso directo "Fijo" en la fila de acciones del
 * detalle de tarjeta: al tocarlo abre un popup con saldo actual, disponible
 * y límite del período (antes vivían siempre visibles en la card superior).
 */
export function CardBalanceDialog({ saldo, limite, disponible }: CardBalanceDialogProps) {
  const [open, setOpen] = useState(false);
  const pctUsado = limite > 0 ? Math.min(100, Math.round((saldo / limite) * 100)) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 flex-shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3 text-[12px] font-semibold text-foreground/80 transition-colors hover:text-foreground"
      >
        <Wallet className="h-3.5 w-3.5" />
        Saldo
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Saldo del período</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Saldo actual</p>
              <Money
                amount={saldo}
                className="mt-0.5 block font-display text-[26px] font-bold leading-tight tracking-tight text-foreground tabular-nums"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground">Disponible</p>
                <Money
                  amount={disponible}
                  className="mt-0.5 block text-[16px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground">Límite total</p>
                {limite > 0 ? (
                  <Money
                    amount={limite}
                    className="mt-0.5 block text-[16px] font-bold tabular-nums text-foreground"
                  />
                ) : (
                  <span className="mt-0.5 block text-[13px] text-muted-foreground">
                    Sin definir
                  </span>
                )}
              </div>
            </div>

            {pctUsado != null && (
              <div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Usado</span>
                  <span className="tabular-nums">{pctUsado}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${pctUsado}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
