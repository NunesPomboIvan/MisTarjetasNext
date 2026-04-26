"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/supabase/database.types";

interface CategoryPickerProps {
  categories: Category[];
  value?: string | null;
  onChange: (id: string | null) => void;
}

export function CategoryPicker({ categories, value, onChange }: CategoryPickerProps) {
  const presets = categories.filter((c) => c.is_preset);
  const custom = categories.filter((c) => !c.is_preset);

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
      <div className="flex flex-wrap gap-2">
        {presets.map(renderCategory)}
      </div>
      {custom.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">Mis categorías</p>
          <div className="flex flex-wrap gap-2">
            {custom.map(renderCategory)}
          </div>
        </>
      )}
    </div>
  );
}
