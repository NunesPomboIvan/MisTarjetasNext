"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Option {
  id: string;
  label: string;
}

interface MovimientosFiltersProps {
  /** Ruta base a la que navegar al aplicar (sin query). */
  basePath: string;
  /** Tarjetas para filtrar. Omitir cuando la vista ya es de una tarjeta. */
  cards?: Option[];
  categories: Option[];
}

const ALL = "all";

export function MovimientosFilters({
  basePath,
  cards,
  categories,
}: MovimientosFiltersProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = React.useState(false);

  const [cardId, setCardId] = React.useState(sp.get("card_id") ?? "");
  const [categoryId, setCategoryId] = React.useState(
    sp.get("category_id") ?? ""
  );
  const [dateFrom, setDateFrom] = React.useState(sp.get("date_from") ?? "");
  const [dateTo, setDateTo] = React.useState(sp.get("date_to") ?? "");
  const [cuotas, setCuotas] = React.useState(sp.get("cuotas") ?? "");

  function openSheet() {
    // Sincronizar el borrador con los filtros vigentes al abrir.
    setCardId(sp.get("card_id") ?? "");
    setCategoryId(sp.get("category_id") ?? "");
    setDateFrom(sp.get("date_from") ?? "");
    setDateTo(sp.get("date_to") ?? "");
    setCuotas(sp.get("cuotas") ?? "");
    setOpen(true);
  }

  const activeCount = [
    cards ? sp.get("card_id") : null,
    sp.get("category_id"),
    sp.get("date_from"),
    sp.get("date_to"),
    sp.get("cuotas"),
  ].filter(Boolean).length;

  function apply() {
    const params = new URLSearchParams(sp.toString());
    const set = (k: string, v: string) => {
      if (v) params.set(k, v);
      else params.delete(k);
    };
    if (cards) set("card_id", cardId);
    set("category_id", categoryId);
    set("date_from", dateFrom);
    set("date_to", dateTo);
    set("cuotas", cuotas);
    setOpen(false);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  function clearAll() {
    const params = new URLSearchParams();
    const q = sp.get("q");
    if (q) params.set("q", q);
    setCardId("");
    setCategoryId("");
    setDateFrom("");
    setDateTo("");
    setCuotas("");
    setOpen(false);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        aria-label="Filtros"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground/70"
      >
        <SlidersHorizontal className="h-[18px] w-[18px]" />
        {activeCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="pb-safe">
          <SheetHeader className="pb-2">
            <SheetTitle>Filtros</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 px-1 pb-2">
            {cards && cards.length > 0 && (
              <div className="space-y-1.5">
                <Label>Tarjeta</Label>
                <Select
                  value={cardId || ALL}
                  onValueChange={(v) => setCardId(v && v !== ALL ? v : "")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todas</SelectItem>
                    {cards.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select
                value={categoryId || ALL}
                onValueChange={(v) => setCategoryId(v && v !== ALL ? v : "")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-from">Desde</Label>
                <input
                  id="f-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-to">Hasta</Label>
                <input
                  id="f-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de pago</Label>
              <Select
                value={cuotas || ALL}
                onValueChange={(v) => setCuotas(v && v !== ALL ? v : "")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  <SelectItem value="multi">En cuotas</SelectItem>
                  <SelectItem value="single">Pago único</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={clearAll}
              >
                Limpiar
              </Button>
              <Button
                className="gradient-primary shadow-brand flex-1"
                onClick={apply}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
