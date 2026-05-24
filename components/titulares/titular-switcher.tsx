"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Plus, Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createTitular,
  setActiveTitular,
  updateTitular,
  deleteTitular,
} from "@/actions/titulares";
import type { Titular } from "@/lib/supabase/database.types";

interface TitularSwitcherProps {
  titulares: Titular[];
  activeId: string | null;
}

const COLORS = [
  "#6366f1", "#ef4444", "#f97316", "#eab308",
  "#10b981", "#3b82f6", "#8b5cf6", "#ec4899",
];

export function TitularSwitcher({ titulares, activeId }: TitularSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editColor, setEditColor] = React.useState(COLORS[0]);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
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

  function startEdit(t: Titular) {
    setEditingId(t.id);
    setEditName(t.name);
    setEditColor(t.color);
    setConfirmingDelete(false);
    setAdding(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setConfirmingDelete(false);
  }

  function handleSaveEdit(id: string) {
    const name = editName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await updateTitular(id, name, editColor);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      cancelEdit();
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteTitular(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      cancelEdit();
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold text-foreground shadow-sm transition-all hover:shadow-md active:scale-95"
        style={{
          background: `linear-gradient(135deg, ${active.color}26 0%, var(--card) 62%)`,
          borderColor: `${active.color}55`,
        }}
        aria-label="Cambiar de titular"
      >
        <span className="max-w-[140px] truncate">{active.name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-y-0.5" />
      </button>

      <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) cancelEdit(); }}>
        <SheetContent side="bottom" showCloseButton={false} className="pb-safe px-0">
          <SheetHeader className="px-5 pb-2">
            <SheetTitle>Titular</SheetTitle>
          </SheetHeader>

          <div className="space-y-2 px-5 pb-2">
            {titulares.map((t) => {
              if (editingId === t.id) {
                return (
                  <div
                    key={t.id}
                    className="space-y-3 rounded-xl border p-3.5"
                    style={{
                      background: `linear-gradient(135deg, ${editColor}26 0%, var(--card) 62%)`,
                      borderColor: `${editColor}55`,
                    }}
                  >
                    <Input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nombre del titular"
                      maxLength={40}
                    />
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          className={cn(
                            "h-7 w-7 rounded-full border-2 transition-transform",
                            editColor === c ? "scale-110 border-foreground" : "border-transparent"
                          )}
                          style={{ backgroundColor: c }}
                          aria-label={`Color ${c}`}
                        />
                      ))}
                    </div>

                    {confirmingDelete ? (
                      <div className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
                        <p className="text-[13px] text-foreground">
                          ¿Eliminar a <strong>{t.name}</strong>? Sus tarjetas quedarán sin
                          titular asignado.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={() => handleDelete(t.id)}
                            disabled={isPending}
                            className="flex-1 bg-destructive text-white hover:bg-destructive/90"
                          >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sí, eliminar"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirmingDelete(false)}
                            disabled={isPending}
                            className="flex-1"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          onClick={() => handleSaveEdit(t.id)}
                          disabled={isPending || !editName.trim()}
                          className="gradient-primary shadow-brand flex-1 text-white"
                        >
                          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={cancelEdit}
                          disabled={isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        {titulares.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirmingDelete(true)}
                            disabled={isPending}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = t.id === active.id;
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-xl border p-2 pl-3.5 transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${t.color}${isActive ? "33" : "1f"} 0%, var(--card) ${isActive ? "60%" : "65%"})`,
                    borderColor: `${t.color}${isActive ? "66" : "40"}`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => switchTo(t.id)}
                    disabled={isPending}
                    className="flex flex-1 items-center gap-2 text-left disabled:opacity-60"
                  >
                    <span className="flex-1 truncate text-[15px] font-semibold text-foreground">
                      {t.name}
                    </span>
                    {isActive && (
                      <Check
                        className="h-4 w-4 flex-shrink-0"
                        style={{ color: t.color }}
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(t)}
                    aria-label={`Editar ${t.name}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground active:scale-95"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              );
            })}

            {adding ? (
              <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-2 pl-2">
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
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0"
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
                onClick={() => { setAdding(true); cancelEdit(); }}
                className="flex w-full items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3.5 py-3 text-left text-primary transition-all hover:border-primary/60 hover:bg-primary/10 active:scale-[0.99]"
              >
                <Plus className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-[15px] font-semibold">Nuevo titular</span>
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
