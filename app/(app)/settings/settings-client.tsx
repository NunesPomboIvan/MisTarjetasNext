"use client";

import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Moon, Sun, Monitor, LogOut, Download, Upload,
  Plus, Trash2, Pencil, Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createCategory, updateCategory, deleteCategory } from "@/actions/categories";
import { exportData, importData } from "@/actions/backup";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/lib/supabase/database.types";

const THEMES = [
  { value: "light",  label: "Claro",     icon: Sun     },
  { value: "dark",   label: "Oscuro",    icon: Moon    },
  { value: "system", label: "Sistema",   icon: Monitor },
] as const;

const EMOJI_OPTIONS = ["🛒","🍔","🚗","💊","🎬","👕","⚡","✈️","💻","📦","🏠","🐾","🎮","📚","🍷","💈","🏋️","🎁"];
const COLOR_PAIRS: Array<{ bg: string; text: string; label: string }> = [
  { bg: "#dcfce7", text: "#15803d", label: "Verde"    },
  { bg: "#fef9c3", text: "#a16207", label: "Amarillo" },
  { bg: "#dbeafe", text: "#1d4ed8", label: "Azul"     },
  { bg: "#fce7f3", text: "#9d174d", label: "Rosa"     },
  { bg: "#ede9fe", text: "#6d28d9", label: "Violeta"  },
  { bg: "#fef3c7", text: "#d97706", label: "Naranja"  },
  { bg: "#e0f2fe", text: "#0369a1", label: "Celeste"  },
  { bg: "#f5f5f4", text: "#57534e", label: "Gris"     },
];

interface SettingsClientProps {
  categories: Category[];
  userEmail: string;
}

export function SettingsClient({ categories: initialCategories, userEmail }: SettingsClientProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Category form state
  const [showNewCat, setShowNewCat] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catEmoji, setCatEmoji] = useState("📦");
  const [catColors, setCatColors] = useState(COLOR_PAIRS[7]);

  const userCategories = initialCategories.filter((c) => !c.is_preset);
  const presetCategories = initialCategories.filter((c) => c.is_preset);

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setCatName(cat.name);
    setCatEmoji(cat.emoji);
    setCatColors(
      COLOR_PAIRS.find((c) => c.bg === cat.color_bg) ?? COLOR_PAIRS[7]
    );
  }

  function cancelEdit() {
    setEditingId(null);
    setShowNewCat(false);
    setCatName("");
    setCatEmoji("📦");
    setCatColors(COLOR_PAIRS[7]);
  }

  function saveCategory() {
    if (!catName.trim()) return toast.error("El nombre es requerido");
    startTransition(async () => {
      const data = { name: catName.trim(), emoji: catEmoji, color_bg: catColors.bg, color_text: catColors.text };
      const result = editingId
        ? await updateCategory(editingId, data)
        : await createCategory(data);
      if (result.success) {
        toast.success(editingId ? "Categoría actualizada" : "Categoría creada");
        cancelEdit();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDeleteCategory(id: string) {
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result.success) {
        toast.success("Categoría eliminada");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  async function handleExport() {
    const result = await exportData();
    if (!result.success) return toast.error(result.error);
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mis-tarjetas-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exportado");
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await importData(data);
      if (result.success) {
        toast.success("Datos importados correctamente");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Archivo inválido");
    }
    e.target.value = "";
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Ajustes</h1>

      {/* Perfil */}
      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold">Cuenta</h2>
        <p className="text-sm text-muted-foreground">{userEmail}</p>
        <Button variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </section>

      {/* Tema */}
      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold">Apariencia</h2>
        <div className="flex gap-2">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all ${
                theme === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Categorías personalizadas */}
      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Mis categorías</h2>
          <Button size="sm" variant="outline" onClick={() => { setShowNewCat(true); setEditingId(null); }}>
            <Plus className="mr-1 h-4 w-4" /> Nueva
          </Button>
        </div>

        {/* Form nueva/editar */}
        {(showNewCat || editingId) && (
          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
            <Input
              placeholder="Nombre de la categoría"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              autoFocus
            />
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Emoji</p>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setCatEmoji(e)}
                    className={`h-8 w-8 rounded-lg text-lg transition-all ${catEmoji === e ? "ring-2 ring-primary scale-110" : "hover:scale-105"}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Color</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_PAIRS.map((pair) => (
                  <button
                    key={pair.bg}
                    type="button"
                    onClick={() => setCatColors(pair)}
                    className={`rounded-lg px-2 py-1 text-xs font-medium transition-all ${
                      catColors.bg === pair.bg ? "ring-2 ring-primary scale-105" : ""
                    }`}
                    style={{ backgroundColor: pair.bg, color: pair.text }}
                  >
                    {pair.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="gradient-primary shadow-brand" onClick={saveCategory} disabled={isPending}>
                <Check className="mr-1 h-4 w-4" /> Guardar
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                <X className="mr-1 h-4 w-4" /> Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Lista de categorías del usuario */}
        {userCategories.length === 0 && !showNewCat ? (
          <p className="text-sm text-muted-foreground">No tenés categorías personalizadas</p>
        ) : (
          <div className="space-y-2">
            {userCategories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-base"
                  style={{ backgroundColor: cat.color_bg }}
                >
                  {cat.emoji}
                </span>
                <span className="flex-1 text-sm font-medium">{cat.name}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(cat)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Los consumos que usaban &quot;{cat.name}&quot; quedarán sin categoría.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive" onClick={() => handleDeleteCategory(cat.id)}>
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}

        <Separator />
        <p className="text-xs text-muted-foreground">Categorías predefinidas</p>
        <div className="flex flex-wrap gap-2">
          {presetCategories.map((cat) => (
            <span
              key={cat.id}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
              style={{ backgroundColor: cat.color_bg, color: cat.color_text }}
            >
              {cat.emoji} {cat.name}
            </span>
          ))}
        </div>
      </section>

      {/* Backup */}
      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold">Datos</h2>
        <div className="flex flex-col gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar backup (JSON)
          </Button>
          <label className="cursor-pointer">
            <div className="flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <Upload className="h-4 w-4" />
              Importar desde backup
            </div>
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          El backup incluye tarjetas, consumos y categorías. La importación no elimina datos existentes.
        </p>
      </section>
    </div>
  );
}
