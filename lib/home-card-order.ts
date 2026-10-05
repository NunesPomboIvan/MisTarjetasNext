/**
 * Orden de las tarjetas del carrusel del inicio. Se guarda en una cookie
 * (como el titular activo): la app no tiene sesión de Supabase Auth, así que
 * no hay `user_metadata` donde guardarlo, y así no hace falta migración.
 */
export const HOME_CARD_ORDER_COOKIE = "home_card_order";

export const HOME_CARD_ORDERS = [
  { value: "last_used",   label: "Último uso",          description: "La que usaste más recientemente primero" },
  { value: "amount_desc", label: "Mayor importe",       description: "Saldo del período actual, de mayor a menor" },
  { value: "amount_asc",  label: "Menor importe",       description: "Saldo del período actual, de menor a mayor" },
  { value: "close",       label: "Próximo cierre",      description: "La que cierra antes primero" },
  { value: "due",         label: "Próximo vencimiento", description: "La que vence antes primero" },
  { value: "name",        label: "Alfabético",          description: "Por banco o nombre, de la A a la Z" },
  { value: "created",     label: "Fecha de alta",       description: "En el orden en que las cargaste" },
] as const;

export type HomeCardOrder = (typeof HOME_CARD_ORDERS)[number]["value"];

export const DEFAULT_HOME_CARD_ORDER: HomeCardOrder = "last_used";

export function parseHomeCardOrder(value: unknown): HomeCardOrder {
  return HOME_CARD_ORDERS.some((o) => o.value === value)
    ? (value as HomeCardOrder)
    : DEFAULT_HOME_CARD_ORDER;
}

export interface SortableHomeCard {
  name: string;
  createdAt: string;
  lastUsed: string;
  total: number;
  close: Date;
  due: Date;
  closeReached: boolean;
  dueReached: boolean;
}

/**
 * Fechas pendientes primero (la más cercana antes); las que ya pasaron en el
 * período actual van al final.
 */
function byUpcoming(aDate: Date, aReached: boolean, bDate: Date, bReached: boolean) {
  if (aReached !== bReached) return aReached ? 1 : -1;
  return aDate.getTime() - bDate.getTime();
}

export function sortHomeCards<T>(
  items: T[],
  order: HomeCardOrder,
  get: (item: T) => SortableHomeCard
): T[] {
  const compare = (x: T, y: T): number => {
    const a = get(x);
    const b = get(y);
    switch (order) {
      case "amount_desc":
        return b.total - a.total;
      case "amount_asc":
        return a.total - b.total;
      case "close":
        return byUpcoming(a.close, a.closeReached, b.close, b.closeReached);
      case "due":
        return byUpcoming(a.due, a.dueReached, b.due, b.dueReached);
      case "name":
        return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
      case "created":
        return a.createdAt.localeCompare(b.createdAt);
      case "last_used":
      default:
        return b.lastUsed.localeCompare(a.lastUsed);
    }
  };
  return [...items].sort(compare);
}
