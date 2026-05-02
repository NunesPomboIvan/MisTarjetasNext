"use client";

import * as React from "react";

const KEY = "mt:lastCardId";

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

/**
 * Hook que recuerda la última tarjeta usada para registrar un consumo.
 * Persiste en localStorage para que la próxima entrada arranque pre-seleccionada.
 *
 * Implementado con useSyncExternalStore para hidratación SSR-safe y sin
 * incurrir en `setState` dentro de un useEffect (regla de React Compiler).
 */
export function useLastCard(): {
  lastCardId: string | null;
  setLastCardId: (id: string) => void;
} {
  const lastCardId = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLastCardId = React.useCallback((id: string) => {
    try {
      window.localStorage.setItem(KEY, id);
      // Notificar a otros hooks/pestañas (storage event no se dispara en la misma pestaña)
      window.dispatchEvent(new StorageEvent("storage", { key: KEY, newValue: id }));
    } catch {
      /* noop */
    }
  }, []);

  return { lastCardId, setLastCardId };
}
