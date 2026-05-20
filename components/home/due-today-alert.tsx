"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface DueTodayCard {
  cardId: string;
  cardName: string;
  total: number;
}

interface DueTodayAlertProps {
  /** Fecha de hoy en formato YYYY-MM-DD calculada en zona Argentina (en el server) */
  todayKey: string;
  cards: DueTodayCard[];
}

/**
 * Si hoy es la fecha de vencimiento de una o más tarjetas, muestra un pop-up
 * al abrir la app. Se acuerda de la fecha dismissed en localStorage para no
 * volver a mostrarlo el mismo día.
 */
export function DueTodayAlert({ todayKey, cards }: DueTodayAlertProps) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (cards.length === 0) return;
    try {
      const dismissed = localStorage.getItem("mt_due_alert_dismissed");
      if (dismissed === todayKey) return;
    } catch {
      // ignore — show anyway
    }
    setOpen(true);
  }, [cards.length, todayKey]);

  function handleClose() {
    setOpen(false);
    try {
      localStorage.setItem("mt_due_alert_dismissed", todayKey);
    } catch {}
  }

  if (cards.length === 0) return null;

  const single = cards.length === 1 ? cards[0] : null;

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <AlertDialogTitle className="text-left">
              {single
                ? `Hoy vence ${single.cardName}`
                : `Hoy vencen ${cards.length} tarjetas`}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Recordá pagar el resumen antes de que cierre el día.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="space-y-1 text-sm text-foreground">
          {cards.map((c) => (
            <li
              key={c.cardId}
              className="flex items-center justify-between gap-3"
            >
              <Link
                href={`/cards/${c.cardId}`}
                onClick={handleClose}
                className="font-medium underline-offset-2 hover:underline"
              >
                {c.cardName}
              </Link>
              <span className="tabular-nums text-muted-foreground">
                {c.total > 0
                  ? new Intl.NumberFormat("es-AR", {
                      style: "currency",
                      currency: "ARS",
                      minimumFractionDigits: 2,
                    }).format(c.total)
                  : "—"}
              </span>
            </li>
          ))}
        </ul>

        <AlertDialogFooter>
          <AlertDialogAction onClick={handleClose}>Entendido</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
