"use client";

import { useEffect } from "react";

/**
 * Bloquea el scroll vertical del documento mientras el componente esté montado.
 * Restaura el estilo previo al desmontarse.
 */
export function ScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);
  return null;
}
