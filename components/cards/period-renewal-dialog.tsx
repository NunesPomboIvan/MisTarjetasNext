"use client";

import { useState, useTransition } from "react";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { parseLocalDate } from "@/lib/periods/calculate";
import { updateCardPeriod } from "@/actions/cards";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PeriodRenewalDialogProps {
  cardId: string;
  cardName: string;
  oldCloseDate: string; // YYYY-MM-DD
  oldDueDate: string;   // YYYY-MM-DD
}

function addOneMonth(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const next = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return format(next, "yyyy-MM-dd");
}

export function PeriodRenewalDialog({
  cardId,
  cardName,
  oldCloseDate,
  oldDueDate,
}: PeriodRenewalDialogProps) {
  const [open, setOpen] = useState(true);
  const [newCloseDate, setNewCloseDate] = useState(addOneMonth(oldCloseDate));
  const [newDueDate, setNewDueDate] = useState(addOneMonth(oldDueDate));
  const [isPending, startTransition] = useTransition();

  const oldClose = parseLocalDate(oldCloseDate);
  const newPeriodStart = addDays(oldClose, 1);
  const newPeriodEnd = newCloseDate ? parseLocalDate(newCloseDate) : null;
  const minCloseDate = format(addDays(oldClose, 1), "yyyy-MM-dd");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newCloseDate || !newDueDate) return;

    startTransition(async () => {
      const result = await updateCardPeriod(cardId, newCloseDate, newDueDate);
      if (!result.success) {
        toast.error(result.error);
      }
      // On success the page revalidates and re-renders without the dialog
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <CalendarClock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-center">Período vencido</DialogTitle>
          <DialogDescription className="text-center">
            El período de <strong>{cardName}</strong> cerró el{" "}
            {format(oldClose, "d 'de' MMMM 'de' yyyy", { locale: es })}.
            Ingresá las nuevas fechas para continuar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="renewal-close-date">Nueva fecha de cierre</Label>
            <Input
              id="renewal-close-date"
              type="date"
              value={newCloseDate}
              min={minCloseDate}
              onChange={(e) => setNewCloseDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="renewal-due-date">Nueva fecha de vencimiento</Label>
            <Input
              id="renewal-due-date"
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              required
            />
          </div>

          {newCloseDate && newPeriodEnd && (
            <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Nuevo período
              </p>
              <p className="font-medium text-foreground">
                {format(newPeriodStart, "d 'de' MMMM", { locale: es })}
                {" → "}
                {format(newPeriodEnd, "d 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Guardando..." : "Confirmar nuevo período"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cargar después
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
