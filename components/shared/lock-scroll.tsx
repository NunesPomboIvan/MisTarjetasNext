"use client";

import * as React from "react";

/**
 * Bloquea el scroll del contenedor scrolleable (el <body>, ver globals.css)
 * mientras el componente está montado. Lo usa la home, que debe entrar
 * entera en pantalla y no "deslizarse" ni hacer rubber-band al arrastrar.
 * Al desmontar (navegar a otra ruta) restaura el scroll normal.
 */
export function LockScroll() {
  React.useEffect(() => {
    const { style } = document.body;
    const prevOverflow = style.overflow;
    style.overflow = "hidden";
    return () => {
      style.overflow = prevOverflow;
    };
  }, []);

  return null;
}
