"use client";

import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Moon, Sun, Monitor, Download, Upload,
  Plus, Trash2, Pencil, Check, X, FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/shared/back-button";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createCategory, updateCategory, deleteCategory } from "@/actions/categories";
import {
  exportData,
  importData,
  exportExpensesCsv,
  importExpensesCsv,
  exportCsvTemplate,
} from "@/actions/backup";
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

// ── Utilidades de color: a partir de un color base genera un fondo pastel
//    (claro) y un texto oscuro legible, ambos con el mismo tono. ───────────
const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

function hexToRgb(hex: string) {
  const m = hex.replace("#", "");
  return {
    r: parseInt(m.slice(0, 2), 16),
    g: parseInt(m.slice(2, 4), 16),
    b: parseInt(m.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const h = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number) {
  h /= 360; s /= 100; l /= 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return rgbToHex(r * 255, g * 255, b * 255);
}

/** Color base → { bg pastel, text oscuro } con el mismo tono. */
function deriveColors(baseHex: string): { bg: string; text: string } {
  const { r, g, b } = hexToRgb(baseHex);
  const { h, s } = rgbToHsl(r, g, b);
  return {
    bg: hslToHex(h, clamp(s, 0, 75), 92),
    text: hslToHex(h, clamp(s, 45, 90), 32),
  };
}

interface SettingsClientProps {
  categories: Category[];
}

export function SettingsClient({ categories: initialCategories }: SettingsClientProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Category form state
  const [showNewCat, setShowNewCat] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catEmoji, setCatEmoji] = useState("📦");
  const [catColors, setCatColors] = useState<{ bg: string; text: string }>(COLOR_PAIRS[7]);
  const [customColor, setCustomColor] = useState("#6366f1");

  const userCategories = initialCategories.filter((c) => !c.is_preset);
  const presetCategories = initialCategories.filter((c) => c.is_preset);
  const isCustomColor = !COLOR_PAIRS.some((p) => p.bg === catColors.bg);

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setCatName(cat.name);
    setCatEmoji(cat.emoji);
    setCatColors({ bg: cat.color_bg, text: cat.color_text });
    setCustomColor(cat.color_text);
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

  /** Fila editable de categoría (sirve para propias y predefinidas) */
  function categoryRow(cat: Category) {
    return (
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
          <AlertDialogTrigger className="flex h-7 w-7 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
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
    );
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

  async function handleExportCsv() {
    const result = await exportExpensesCsv();
    if (!result.success) return toast.error(result.error);
    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mis-tarjetas-consumos-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Consumos exportados");
  }

  async function handleDownloadTemplate() {
    const result = await exportCsvTemplate();
    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-consumos.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Plantilla descargada");
  }

  async function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = await importExpensesCsv(text);
      if (result.success) {
        toast.success(
          `${result.imported} consumos importados${
            result.skipped ? ` · ${result.skipped} omitidos` : ""
          }`
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Archivo inválido");
    }
    e.target.value = "";
  }

  return (
    <div className="space-y-5">
      <StickyPageHeader>
        <div className="flex items-center gap-3">
          <BackButton href="/more" />
          <h1 className="font-display text-[28px] font-bold tracking-tight text-foreground">
            Ajustes
          </h1>
        </div>
      </StickyPageHeader>

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
              <div className="flex items-center gap-2">
                <Input
                  value={catEmoji}
                  onChange={(e) => setCatEmoji(e.target.value)}
                  className="h-9 w-14 text-center text-lg"
                  maxLength={4}
                  placeholder="🎯"
                  aria-label="Emoji personalizado"
                />
                <span className="text-xs text-muted-foreground">
                  Editá libremente o elegí uno
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
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
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_PAIRS.map((pair) => (
                  <button
                    key={pair.bg}
                    type="button"
                    onClick={() => setCatColors({ bg: pair.bg, text: pair.text })}
                    className={`rounded-lg px-2 py-1 text-xs font-medium transition-all ${
                      catColors.bg === pair.bg ? "ring-2 ring-primary scale-105" : ""
                    }`}
                    style={{ backgroundColor: pair.bg, color: pair.text }}
                  >
                    {pair.label}
                  </button>
                ))}

                {/* Color personalizado */}
                <label
                  className={`relative flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium transition-all ${
                    isCustomColor
                      ? "scale-105 border-transparent ring-2 ring-primary"
                      : "border-border text-muted-foreground"
                  }`}
                  style={isCustomColor ? { backgroundColor: catColors.bg, color: catColors.text } : undefined}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-black/10"
                    style={{ background: customColor }}
                  />
                  Personalizado
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      setCatColors(deriveColors(e.target.value));
                    }}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Elegir color personalizado"
                  />
                </label>
              </div>

              {/* Vista previa con el color elegido */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Vista previa:</span>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: catColors.bg, color: catColors.text }}
                >
                  {catEmoji} {catName.trim() || "Categoría"}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="btn-glass-primary" onClick={saveCategory} disabled={isPending}>
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
          <div className="space-y-2">{userCategories.map(categoryRow)}</div>
        )}

        <Separator />
        <p className="text-xs text-muted-foreground">Categorías predefinidas</p>
        {presetCategories.length > 0 && (
          <div className="space-y-2">{presetCategories.map(categoryRow)}</div>
        )}
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

        <Separator />

        <p className="text-xs font-medium text-muted-foreground">
          Consumos (Excel / CSV)
        </p>
        <div className="flex flex-col gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <FileDown className="mr-2 h-4 w-4" />
            Descargar plantilla (CSV)
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Exportar consumos (CSV)
          </Button>
          <label className="cursor-pointer">
            <div className="flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <Upload className="h-4 w-4" />
              Importar consumos (CSV)
            </div>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImportCsv}
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          El CSV se abre en Excel y tiene las mismas columnas que la exportación.
          Para importar, el <strong>Banco</strong> y el <strong>NumeroTarjeta</strong>{" "}
          deben coincidir con una tarjeta existente. La fecha admite{" "}
          <strong>DD/MM/AAAA</strong>.
        </p>
      </section>
    </div>
  );
}
