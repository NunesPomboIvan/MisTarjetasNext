"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { updateLoan } from "@/actions/loans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { cn } from "@/lib/utils";

const COLOR_PRESETS = [
  "#6366f1", "#f97316", "#ef4444", "#eab308",
  "#1a7a46", "#3b82f6", "#8b5cf6", "#ec4899",
];

interface LoanEditFormProps {
  loanId: string;
  initial: {
    description: string;
    bank: string | null;
    color: string;
    issue_date: string;
  };
}

export function LoanEditForm({ loanId, initial }: LoanEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [description, setDescription] = useState(initial.description);
  const [bank, setBank] = useState(initial.bank ?? "");
  const [color, setColor] = useState(initial.color || "#6366f1");
  const [issueDate, setIssueDate] = useState(initial.issue_date);

  function submit() {
    if (!description.trim()) {
      toast.error("La descripción es requerida");
      return;
    }
    startTransition(async () => {
      const result = await updateLoan(loanId, {
        description: description.trim(),
        bank: bank.trim() || null,
        color,
        issue_date: issueDate,
      });
      if (result.success) {
        toast.success("Préstamo actualizado");
        router.push(`/prestamos/${loanId}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="bank">Banco o entidad</Label>
          <Input
            id="bank"
            placeholder="Ej: Galicia, Santander…"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Descripción</Label>
          <Input
            id="description"
            placeholder="Ej: Préstamo personal auto"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Fecha de emisión</Label>
          <DatePickerField value={issueDate} onChange={setIssueDate} />
        </div>

        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                  color === c ? "border-foreground scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
              title="Color personalizado"
            />
          </div>
        </div>
      </div>

      <p className="text-[12px] text-muted-foreground">
        Para cambiar el monto o las cuotas, eliminá el préstamo y cargalo de nuevo
        (así no se pierde el estado de las cuotas ya pagadas).
      </p>

      <Button
        type="button"
        onClick={submit}
        className="btn-glass-primary w-full font-semibold"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Guardar cambios
          </>
        )}
      </Button>
    </div>
  );
}
