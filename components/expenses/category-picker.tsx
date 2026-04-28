"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createCategory } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Category } from "@/lib/supabase/database.types";

const EMOJI_OPTIONS = ["🛒","🍔","🚗","💊","🎬","👕","⚡","✈️","💻","📦","🏠","🐾","🎮","📚","🍷","💈","🏋️","🎁"];

const COLOR_PAIRS = [
  { bg: "#dcfce7", text: "#15803d", label: "Verde"    },
  { bg: "#fef9c3", text: "#a16207", label: "Amarillo" },
  { bg: "#dbeafe", text: "#1d4ed8", label: "Azul"     },
  { bg: "#fce7f3", text: "#9d174d", label: "Rosa"     },
  { bg: "#ede9fe", text: "#6d28d9", label: "Violeta"  },
  { bg: "#fef3c7", text: "#d97706", label: "Naranja"  },
  { bg: "#e0f2fe", text: "#0369a1", label: "Celeste"  },
  { bg: "#f5f5f4", text: "#57534e", label: "Gris"     },
];

interface CategoryPickerProps {
  categories: Category[];
  value?: string | null;
  onChange: (id: string | null) => void;
}

export function CategoryPicker({ categories, value, onChange }: CategoryPickerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local extras: categorías creadas en esta sesión antes del próximo refresh
  const [extras, setExtras] = useState<Category[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("📦");
  const [newColors, setNewColors] = useState(COLOR_PAIRS[7]);

  const presets = categories.filter((c) => c.is_preset);
  const custom = [
    ...categories.filter((c) => !c.is_preset),
    ...extras.filter((e) => !categories.some((c) => c.id === e.id)),
  ];

  function openDialog() {
    setNewName("");
    setNewEmoji("📦");
    setNewColors(COLOR_PAIRS[7]);
    setDialogOpen(true);
  }

  function handleCreate() {
    if (!newName.trim()) return toast.error("El nombre es requerido");
    startTransition(async () => {
      const result = await createCategory({
        name: newName.trim(),
        emoji: newEmoji,
        color_bg: newColors.bg,
        color_text: newColors.text,
      });
      if (result.success) {
        toast.success("Categoría creada");
        if (result.category) {
          setExtras((prev) => [...prev, result.category!]);
          onChange(result.category.id);
        }
        setDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function renderCategory(cat: Category) {
    const isSelected = value === cat.id;
    return (
      <button
        key={cat.id}
        type="button"
        onClick={() => onChange(isSelected ? null : cat.id)}
        className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all",
          isSelected
            ? "border-primary bg-primary/10 font-medium text-primary"
            : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
        )}
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded-lg text-base"
          style={{ backgroundColor: cat.color_bg }}
        >
          {cat.emoji}
        </span>
        <span>{cat.name}</span>
        {isSelected && <Check className="ml-auto h-3.5 w-3.5" />}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {/* Categorías preset */}
      <div className="flex flex-wrap gap-2">
        {presets.map(renderCategory)}
      </div>

      {/* Categorías personalizadas + botón nueva */}
      <div className="space-y-2">
        {custom.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground">Mis categorías</p>
            <div className="flex flex-wrap gap-2">
              {custom.map(renderCategory)}
            </div>
          </>
        )}
        <button
          type="button"
          onClick={openDialog}
          className="flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva categoría
        </button>
      </div>

      {/* Dialog para crear categoría inline */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nombre"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />

            <div>
              <p className="mb-2 text-xs text-muted-foreground">Emoji</p>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setNewEmoji(e)}
                    className={cn(
                      "h-8 w-8 rounded-lg text-lg transition-all",
                      newEmoji === e ? "ring-2 ring-primary scale-110" : "hover:scale-105"
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs text-muted-foreground">Color</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_PAIRS.map((pair) => (
                  <button
                    key={pair.bg}
                    type="button"
                    onClick={() => setNewColors(pair)}
                    className={cn(
                      "rounded-lg px-2 py-1 text-xs font-medium transition-all",
                      newColors.bg === pair.bg && "ring-2 ring-primary scale-105"
                    )}
                    style={{ backgroundColor: pair.bg, color: pair.text }}
                  >
                    {pair.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-xl text-lg"
                style={{ backgroundColor: newColors.bg }}
              >
                {newEmoji}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-sm font-medium"
                style={{ backgroundColor: newColors.bg, color: newColors.text }}
              >
                {newName || "Nombre"}
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                className="gradient-primary shadow-brand flex-1"
                onClick={handleCreate}
                disabled={isPending}
              >
                <Check className="mr-1.5 h-4 w-4" />
                Guardar
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
