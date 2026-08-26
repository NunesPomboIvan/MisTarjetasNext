"use client";

import * as React from "react";

const DEFAULT_MESSAGE =
  "Tenés cambios sin guardar. Si salís ahora se van a perder. ¿Querés salir igual?";

interface NavigationBlockerContextValue {
  /** true = hay un formulario con cambios sin guardar en pantalla */
  isBlocked: boolean;
  setIsBlocked: (blocked: boolean) => void;
  /** Mensaje de confirmación vigente (lo define el formulario activo) */
  message: string;
  setMessage: (message: string) => void;
}

const NavigationBlockerContext =
  React.createContext<NavigationBlockerContextValue>({
    isBlocked: false,
    setIsBlocked: () => {},
    message: DEFAULT_MESSAGE,
    setMessage: () => {},
  });

export function NavigationBlockerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isBlocked, setIsBlocked] = React.useState(false);
  const [message, setMessage] = React.useState(DEFAULT_MESSAGE);

  const value = React.useMemo(
    () => ({ isBlocked, setIsBlocked, message, setMessage }),
    [isBlocked, message]
  );

  return (
    <NavigationBlockerContext.Provider value={value}>
      {children}
    </NavigationBlockerContext.Provider>
  );
}

export function useNavigationBlocker() {
  return React.useContext(NavigationBlockerContext);
}

/**
 * Marca el formulario actual como "con cambios sin guardar" y pide confirmación
 * antes de abandonarlo. Cubre:
 *
 * - **Links internos** (`GuardedLink`, usado por `BackButton` y `BottomNav`):
 *   vía el contexto + `onNavigate` del `<Link>` de Next.
 * - **Cierre / recarga de la pestaña**: vía `beforeunload`.
 * - **Botón atrás / gesto de volver del navegador** (`popstate`): con un truco
 *   de history — se empuja una entrada centinela y se atrapa el `popstate`.
 *   Es best-effort: puede requerir un toque extra de "atrás" en algunos casos.
 *
 * NO intercepta `router.push()` programático (sólo se usa después de guardar).
 */
export function useUnsavedChangesGuard(dirty: boolean, message?: string) {
  const { setIsBlocked, setMessage } = useNavigationBlocker();
  const confirmMessage = message ?? DEFAULT_MESSAGE;

  // Sincroniza el estado global (para GuardedLink) con el dirty local.
  React.useEffect(() => {
    setIsBlocked(dirty);
    if (message) setMessage(message);
    return () => setIsBlocked(false);
  }, [dirty, message, confirmMessage, setIsBlocked, setMessage]);

  // beforeunload: cerrar / recargar pestaña.
  React.useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // popstate: botón atrás / gesto de volver.
  React.useEffect(() => {
    if (!dirty) return;

    // Entrada centinela: el primer "atrás" cae acá y podemos preguntar.
    window.history.pushState({ __unsavedGuard: true }, "");

    // Cuando confirmamos salir, hacemos un history.go programático que también
    // dispara popstate; este flag evita volver a preguntar en ese salto.
    let bypass = false;

    const onPopState = () => {
      if (bypass) {
        bypass = false;
        return;
      }
      if (window.confirm(confirmMessage)) {
        // Estamos en la página del formulario (una atrás del centinela).
        // Saltamos una más para llegar a donde el usuario venía.
        bypass = true;
        setIsBlocked(false);
        window.history.go(-1);
      } else {
        // Se queda: re-armamos el centinela.
        window.history.pushState({ __unsavedGuard: true }, "");
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [dirty, confirmMessage, setIsBlocked]);
}
