"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getDescriptionSuggestions } from "@/actions/expenses";

interface DescriptionAutocompleteProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  id?: string;
  autoFocus?: boolean;
}

/**
 * Input de descripción con autocompletado basado en consumos previos del usuario.
 * - Debounce 250ms
 * - Server action para obtener sugerencias (escala con la base)
 * - Cierra dropdown al elegir o blur
 */
export function DescriptionAutocomplete({
  value,
  onChange,
  placeholder,
  invalid,
  id,
  autoFocus,
}: DescriptionAutocompleteProps) {
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const userTypingRef = React.useRef(false);

  // Sync sincrónico (setState during render) para limpiar sugerencias cuando el
  // texto baja del umbral. Evita renders en cascada de useEffect.
  const trimmed = value.trim();
  const tooShort = trimmed.length < 2;
  if (tooShort && (suggestions.length > 0 || open)) {
    setSuggestions([]);
    setOpen(false);
  }

  // Debounced fetch (sólo cuando el usuario está tipeando y el texto tiene largo suficiente)
  React.useEffect(() => {
    if (!userTypingRef.current) return;
    if (tooShort) return;
    const handle = setTimeout(async () => {
      const results = await getDescriptionSuggestions(trimmed);
      // Filtrar exact match para no sugerir lo que ya tipeó
      const filtered = results.filter((r) => r.toLowerCase() !== trimmed.toLowerCase());
      setSuggestions(filtered);
      setOpen(filtered.length > 0);
      setHighlight(-1);
    }, 250);
    return () => clearTimeout(handle);
  }, [trimmed, tooShort]);

  // Cerrar al click afuera
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function pick(s: string) {
    userTypingRef.current = false;
    onChange(s);
    setOpen(false);
    setSuggestions([]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(suggestions.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter" && highlight >= 0) {
      e.preventDefault();
      pick(suggestions[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        type="text"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          userTypingRef.current = true;
          onChange(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        className={cn(invalid && "border-destructive")}
      />
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                // mouseDown evita perder foco antes de aplicar
                e.preventDefault();
                pick(s);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "cursor-pointer truncate px-3 py-2 text-sm",
                i === highlight ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
              )}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
