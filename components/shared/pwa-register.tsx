"use client";

import { useEffect } from "react";

/**
 * Registra el service worker en el cliente.
 * Colocar en el root layout dentro de ThemeProvider.
 */
export function PWARegister() {
  useEffect(() => {
    // Solo registrar SW en producción para evitar conflictos en dev
    if (process.env.NODE_ENV !== "production") {
      // Desregistrar cualquier SW existente en dev
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => reg.unregister());
        });
      }
      return;
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("SW registered:", reg.scope))
        .catch((err) => console.warn("SW registration failed:", err));
    }
  }, []);

  return null;
}
