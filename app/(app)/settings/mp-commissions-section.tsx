"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setMpCommissions } from "@/actions/preferences";
import { CARD_TYPE_LABEL } from "@/lib/cards/card-type-label";
import {
  MP_COMMISSION_CARD_TYPES,
  parseMpCommissions,
  type MpCommissions,
} from "@/lib/commissions/mercadopago";
import type { CardType } from "@/lib/supabase/database.types";

interface MpCommissionsSectionProps {
  initial: MpCommissions;
  /** Redes de las tarjetas del usuario; si no tiene ninguna, se muestran todas. */
  cardTypes: CardType[];
}

const toInput = (n: number | undefined) =>
  n == null ? "" : String(n).replace(".", ",");

/**
 * Cuenta → Ajustes: % que cobra Mercado Pago al pagar con tarjeta de crédito
 * (ej. una transferencia). En el alta de consumo aparece un tilde para sumarlo.
 */
export function MpCommissionsSection({ initial, cardTypes }: MpCommissionsSectionProps) {
  const types = MP_COMMISSION_CARD_TYPES.filter(
    (t) => cardTypes.length === 0 || cardTypes.includes(t)
  );
  const [values, setValues] = useState<Partial<Record<CardType, string>>>(() =>
    Object.fromEntries(types.map((t) => [t, toInput(initial[t])]))
  );
  const [isPending, startTransition] = useTransition();

  function save() {
    const rates: Record<string, number> = {};
    for (const t of types) {
      const raw = (values[t] ?? "").trim().replace(",", ".");
      if (!raw) continue;
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0 || n >= 100) {
        toast.error(`El % de ${CARD_TYPE_LABEL[t]} tiene que estar entre 0 y 100`);
        return;
      }
      rates[t] = n;
    }
    // Conserva lo configurado para redes que hoy no se muestran.
    const merged = { ...parseMpCommissions(initial), ...rates };
    for (const t of types) if (!(t in rates)) delete merged[t];

    startTransition(async () => {
      const res = await setMpCommissions(merged);
      if (res.success) toast.success("Comisiones guardadas");
      else toast.error(res.error);
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <h2 className="font-semibold">Comisión de Mercado Pago</h2>
        <p className="text-xs text-muted-foreground">
          Lo que cobra Mercado Pago al pagar con tarjeta de crédito (por ejemplo, una
          transferencia). Al cargar un consumo podés sumarla con un tilde.
        </p>
      </div>
      <div className="space-y-2">
        {types.map((t) => (
          <label key={t} className="flex items-center gap-3">
            <span className="flex-1 text-sm font-medium">{CARD_TYPE_LABEL[t]}</span>
            <div className="relative w-28">
              <Input
                inputMode="decimal"
                placeholder="0"
                value={values[t] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [t]: e.target.value.replace(/[^\d.,]/g, "") }))
                }
                className="pr-7 text-right"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </label>
        ))}
      </div>
      <Button size="sm" onClick={save} disabled={isPending} className="w-full">
        {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
        Guardar comisiones
      </Button>
    </section>
  );
}
