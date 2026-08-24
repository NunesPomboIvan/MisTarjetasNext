"use client";

import { useSyncExternalStore } from "react";
import { Archive } from "lucide-react";
import { WalletCard } from "./wallet-card";
import { CardPressWrapper } from "./card-press-wrapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Card } from "@/lib/supabase/database.types";

export interface CardSortItem {
  card: Card;
  /** Total del período actual (ARS). */
  total: number;
  closeLabel: string;
  dueLabel: string;
  /** Timestamp del próximo cierre, para ordenar. */
  closeTime: number;
  /** Timestamp del próximo vencimiento, para ordenar. */
  dueTime: number;
  /** Banco (o nombre) usado para ordenar A-Z. */
  bank: string;
}

type SortKey = "monto" | "cierre" | "vencimiento" | "banco";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "monto", label: "Monto (mayor a menor)" },
  { value: "cierre", label: "Cierre más próximo" },
  { value: "vencimiento", label: "Vencimiento más próximo" },
  { value: "banco", label: "Banco (A-Z)" },
];

const STORAGE_KEY = "cards:sort";
const STORAGE_EVENT = "cards:sort-change";
const DEFAULT_SORT: SortKey = "monto";

function isSortKey(v: string | null): v is SortKey {
  return !!v && SORT_OPTIONS.some((o) => o.value === v);
}

/**
 * Lee/escribe el criterio de orden en localStorage como un store externo, igual
 * que en el listado de préstamos. Usamos useSyncExternalStore para que la
 * preferencia persista entre visitas sin mismatch de hidratación.
 */
function subscribe(callback: () => void) {
  window.addEventListener(STORAGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(STORAGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function usePersistentSort(): [SortKey, (next: SortKey) => void] {
  const stored = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(STORAGE_KEY),
    () => null
  );
  const sort = isSortKey(stored) ? stored : DEFAULT_SORT;

  const setSort = (next: SortKey) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    window.dispatchEvent(new Event(STORAGE_EVENT));
  };

  return [sort, setSort];
}

function sortItems(items: CardSortItem[], sort: SortKey): CardSortItem[] {
  const copy = [...items];
  switch (sort) {
    case "monto":
      copy.sort((a, b) => b.total - a.total);
      break;
    case "cierre":
      copy.sort((a, b) => a.closeTime - b.closeTime);
      break;
    case "vencimiento":
      copy.sort((a, b) => a.dueTime - b.dueTime);
      break;
    case "banco":
      copy.sort((a, b) =>
        a.bank.localeCompare(b.bank, "es", { sensitivity: "base" })
      );
      break;
  }
  return copy;
}

interface CardsSortableProps {
  active: CardSortItem[];
  archived: CardSortItem[];
}

export function CardsSortable({ active, archived }: CardsSortableProps) {
  const [sort, changeSort] = usePersistentSort();

  const sortedActive = sortItems(active, sort);
  const sortedArchived = sortItems(archived, sort);

  return (
    <div className="space-y-5">
      {/* Selector de orden — se recuerda la última elección. Pegado a la
          derecha, cerca del botón "Nueva" del header de arriba (margen
          negativo para acercarlo, ya que el gap con el header lo separaba
          demasiado). */}
      <div className="-mt-4 flex items-center justify-end">
        <Select value={sort} onValueChange={(v) => changeSort(v as SortKey)}>
          <SelectTrigger size="sm" aria-label="Ordenar tarjetas">
            {/* Label explícito: si no lo pasamos, hasta que el desplegable
                se abre una vez, muestra el value crudo ("monto") en vez
                de la etiqueta ("Monto (mayor a menor)"). */}
            <SelectValue>
              {SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort}
            </SelectValue>
          </SelectTrigger>
          {/* w-auto: el ancho del desplegable no debe copiar el del trigger
              (que varía según la opción elegida), o las opciones más largas
              como "Vencimiento más próximo" quedan recortadas. */}
          <SelectContent align="end" className="w-auto min-w-[200px]">
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sortedActive.length > 0 && <StackedWallet items={sortedActive} />}

      {sortedArchived.length > 0 && (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 py-2 text-sm text-muted-foreground">
            <Archive className="h-4 w-4" />
            <span>
              {sortedArchived.length} tarjeta
              {sortedArchived.length !== 1 ? "s" : ""} archivada
              {sortedArchived.length !== 1 ? "s" : ""}
            </span>
          </summary>
          <div className="mt-2 opacity-60">
            <StackedWallet items={sortedArchived} />
          </div>
        </details>
      )}
    </div>
  );
}

function StackedWallet({ items }: { items: CardSortItem[] }) {
  return (
    <div className="space-y-3">
      {items.map(({ card, total, closeLabel, dueLabel }) => (
        <CardPressWrapper
          key={card.id}
          href={`/cards/${card.id}`}
          bank={card.bank || card.name}
          lastFour={card.last_four}
          total={total}
          className="block transition-transform duration-150 active:scale-[0.985]"
        >
          <WalletCard
            card={card}
            total={total}
            closeLabel={closeLabel}
            dueLabel={dueLabel}
          />
        </CardPressWrapper>
      ))}
    </div>
  );
}
