"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { parseLocalDate } from "@/lib/periods/calculate";
import { updateCardPeriod } from "@/actions/cards";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PeriodEditDialogProps {
  cardId: string;
  currentCloseDate: string; // YYYY-MM-DD
  currentDueDate: string;   // YYYY-MM-DD
}

export function PeriodEditDialog({
  cardId,
  currentCloseDate,
  currentDueDate,
}: PeriodEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [closeDate, setCloseDate] = useState(currentCloseDate);
  const [dueDate, setDueDate] = useState(currentDueDate);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateCardPeriod(cardId, closeDate, dueDate);
      if (result.success) {
        toast.success("Período actualizado");
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Reset to current values on close
      setCloseDate(currentCloseDate);
      setDueDate(currentDueDate);
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors">
        <Pencil className="h-3 w-3" />
        Editar período
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar período actual</DialogTitle>
          <DialogDescription>
            Modificá las fechas del período vigente. Las fechas nuevas se
            replican a los períodos siguientes (mismo día, un mes más); los
            períodos pasados conservan sus fechas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-close-date">Fecha de cierre</Label>
            <Input
              id="edit-close-date"
              type="date"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-due-date">Fecha de vencimiento</Label>
            <Input
              id="edit-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Cierre actual:{" "}
            <span className="font-medium text-foreground">
              {format(parseLocalDate(currentCloseDate), "dd/MM/yyyy")}
            </span>
          </p>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
