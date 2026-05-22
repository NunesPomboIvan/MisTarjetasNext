"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Plus, Check, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createTitular, setActiveTitular } from "@/actions/titulares";
import type { Titular } from "@/lib/supabase/database.types";

interface TitularSwitcherProps {
  titulares: Titular[];
  activeId: string | null;
}

export function TitularSwitcher({ titulares, activeId }: TitularSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  const active = titulares.find((t) => t.id === activeId) ?? titulares[0];
  if (!active) return null;

  function switchTo(id: string) {
    if (id === activeId) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      await setActiveTitular(id);
      setOpen(false);
      router.refresh();
    });
  }

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await createTitular(name);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setNewName("");
      setAdding(false);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground transition-colors active:scale-95"
        aria-label="Cambiar de titular"
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: active.color }}
        />
        <span className="max-w-[120px] truncate">{active.name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="pb-safe px-0">
          <SheetHeader className="px-5 pb-2">
            <SheetTitle>Titular</SheetTitle>
          </SheetHeader>

          <div className="divide-y divide-border/50">
            {titulares.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => switchTo(t.id)}
                disabled={isPending}
                className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition-colors active:bg-muted/60 disabled:opacity-60"
              >
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                <span className="flex-1 text-[15px] font-medium text-foreground">
                  {t.name}
                </span>
                {t.id === active.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}

            {adding ? (
              <div className="flex items-center gap-2 px-5 py-3.5">
                <Input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreate();
                    }
                  }}
                  placeholder="Nombre del titular"
                  maxLength={40}
                />
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={isPending || !newName.trim()}
                  className="gradient-primary shadow-brand shrink-0 text-white"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Agregar"}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left text-primary transition-colors active:bg-muted/60"
              >
                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                  <Plus className="h-4 w-4" />
                </span>
                <span className="flex-1 text-[15px] font-semibold">Nuevo titular</span>
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
