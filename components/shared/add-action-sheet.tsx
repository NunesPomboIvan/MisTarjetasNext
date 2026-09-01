"use client";

import { useRouter } from "next/navigation";
import { Banknote, CreditCard } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useNavigationBlocker } from "./navigation-blocker";

interface AddActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Action sheet del (+) de la bottom bar: elegí entre cargar un consumo de
 * tarjeta o registrar un préstamo. Sube desde abajo, con handle y cierre por
 * tap fuera / Cancelar.
 */
export function AddActionSheet({ open, onOpenChange }: AddActionSheetProps) {
  const router = useRouter();
  const { isBlocked, message } = useNavigationBlocker();

  function navTo(href: string) {
    if (isBlocked && !window.confirm(message)) return;
    onOpenChange(false);
    router.push(href);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="gap-2 rounded-t-3xl border-white/[0.08] bg-card px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto mt-1 h-1 w-10 rounded-full bg-muted-foreground/30" />

        <SheetHeader className="px-1 pt-2 pb-1">
          <SheetTitle className="text-[16px]">Agregar</SheetTitle>
          <SheetDescription className="sr-only">
            Elegí qué querés registrar
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => navTo("/expenses/new")}
            className="flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-border bg-background/40 px-4 py-3 text-left transition-transform active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <CreditCard className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold text-foreground">
                Consumo de tarjeta
              </span>
              <span className="block text-[12px] text-muted-foreground">
                Cargá un gasto en una de tus tarjetas
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => navTo("/prestamos/new")}
            className="flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-border bg-background/40 px-4 py-3 text-left transition-transform active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Banknote className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold text-foreground">
                Préstamo
              </span>
              <span className="block text-[12px] text-muted-foreground">
                Registrá un préstamo con sus cuotas
              </span>
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="mt-3 mb-1 w-full rounded-2xl border border-border bg-card py-3 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancelar
        </button>
      </SheetContent>
    </Sheet>
  );
}
