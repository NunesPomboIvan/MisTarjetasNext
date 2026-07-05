"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banknote, Calendar, CalendarClock, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface VencimientosSelectorProps {
  /** Ruta a los vencimientos de préstamos (o al listado si no hay cuotas pendientes). */
  loansHref: string;
}

/**
 * Acceso único "Vencimientos" en la home: al tocarlo abre un selector flotante
 * (bottom sheet) con dos opciones — Tarjetas y Préstamos — que reemplaza los
 * dos accesos separados que había antes.
 */
export function VencimientosSelector({ loansHref }: VencimientosSelectorProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 text-left transition-colors"
        aria-label="Ver vencimientos de tarjetas y préstamos"
      >
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: "#6366f120", color: "#6366f1" }}
        >
          <CalendarClock className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-tight text-foreground">
            Vencimientos
          </p>
          <p className="text-[11.5px] text-muted-foreground">
            Tarjetas y préstamos
          </p>
        </div>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-active:translate-x-0.5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="pb-safe px-0"
          initialFocus={false}
        >
          <SheetHeader className="px-5 pb-2">
            <SheetTitle>Vencimientos</SheetTitle>
          </SheetHeader>

          <div className="space-y-2 px-5 pb-2">
            <button
              type="button"
              onClick={() => go("/pagos")}
              className="group flex w-full items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3.5 text-left transition-all active:scale-[0.99]"
            >
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: "#6366f120", color: "#6366f1" }}
              >
                <Calendar className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold leading-tight text-foreground">
                  Tarjetas
                </p>
                <p className="text-[11.5px] text-muted-foreground">
                  Ver vencimientos de tus tarjetas
                </p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-active:translate-x-0.5" />
            </button>

            <button
              type="button"
              onClick={() => go(loansHref)}
              className="group flex w-full items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3.5 text-left transition-all active:scale-[0.99]"
            >
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: "#6366f120", color: "#6366f1" }}
              >
                <Banknote className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold leading-tight text-foreground">
                  Préstamos
                </p>
                <p className="text-[11.5px] text-muted-foreground">
                  Ver cuotas de tus préstamos
                </p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-active:translate-x-0.5" />
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
