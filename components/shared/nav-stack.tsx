"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { capitalize, formatDate } from "@/lib/utils";
import { parseLocalDate } from "@/lib/periods/calculate";

/**
 * Pila de navegación in-app. Registra las rutas visitadas para que el botón
 * "volver" pueda:
 *  - hacer un pop real al historial (`router.back()`) en vez de ir a un destino
 *    fijo, y
 *  - mostrar el nombre del origen ("‹ Julio 2026", "‹ Tarjetas", "‹ Inicio").
 *
 * Detección push/pop: si la nueva ruta coincide con la ante-última de la pila
 * asumimos que fue un "atrás" (pop); si no, un "adelante" (push). Cubre los
 * flujos lineales de la app (un nivel de profundidad), que es lo que necesita
 * el botón volver.
 */

interface StackEntry {
  path: string;
  label: string;
}

interface NavStackValue {
  /** true si el usuario ya navegó dentro de la app (hay algo a lo que volver). */
  canGoBack: boolean;
  /** Label de la pantalla anterior en la pila, o null si no hay. */
  parentLabel: string | null;
  /**
   * Marca el próximo cambio de ruta como "reemplazo" (no crece la pila). Lo usan
   * las flechas ‹ › entre períodos: cambiar de período es cambio de estado, no
   * navegación, así que al volver se regresa al origen original.
   */
  markReplace: () => void;
}

const NavStackContext = React.createContext<NavStackValue>({
  canGoBack: false,
  parentLabel: null,
  markReplace: () => {},
});

/** Nombre legible para una ruta, usado como label del botón volver. */
function routeLabel(path: string): string {
  const clean = path.split("?")[0].replace(/\/+$/, "") || "/";

  if (clean === "/") return "Inicio";

  const period = clean.match(/^\/vencimientos\/(\d{4})-(\d{2})$/);
  if (period) {
    return capitalize(
      formatDate(parseLocalDate(`${period[1]}-${period[2]}-01`), "MMMM yyyy")
    );
  }

  if (clean === "/vencimientos") return "Períodos";
  if (clean === "/cards") return "Tarjetas";
  if (clean.startsWith("/cards/")) return "Tarjeta";
  if (clean === "/prestamos") return "Préstamos";
  if (clean.startsWith("/prestamos/")) return "Préstamo";
  if (clean === "/cierres") return "Cierres";
  if (clean === "/expenses") return "Consumos";
  if (clean.startsWith("/stats")) return "Estadísticas";
  if (clean === "/more") return "Cuenta";

  return "Volver";
}

export function NavStackProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";

  const stackRef = React.useRef<StackEntry[]>([
    { path: pathname, label: routeLabel(pathname) },
  ]);
  const replaceNextRef = React.useRef(false);

  const [state, setState] = React.useState<{
    canGoBack: boolean;
    parentLabel: string | null;
  }>({ canGoBack: false, parentLabel: null });

  React.useEffect(() => {
    const stack = stackRef.current;
    const top = stack[stack.length - 1];
    if (top?.path === pathname) return;

    if (replaceNextRef.current) {
      replaceNextRef.current = false;
      stack[stack.length - 1] = { path: pathname, label: routeLabel(pathname) };
    } else {
      const prev = stack[stack.length - 2];
      if (prev && prev.path === pathname) {
        stack.pop();
      } else {
        stack.push({ path: pathname, label: routeLabel(pathname) });
      }
    }

    const parent = stack.length >= 2 ? stack[stack.length - 2] : null;
    setState({ canGoBack: true, parentLabel: parent?.label ?? null });
  }, [pathname]);

  const markReplace = React.useCallback(() => {
    replaceNextRef.current = true;
  }, []);

  const value = React.useMemo<NavStackValue>(
    () => ({
      canGoBack: state.canGoBack,
      parentLabel: state.parentLabel,
      markReplace,
    }),
    [state, markReplace]
  );

  return (
    <NavStackContext.Provider value={value}>{children}</NavStackContext.Provider>
  );
}

export function useNavStack() {
  return React.useContext(NavStackContext);
}
