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
    const body = document.body;
    const { style } = body;
    const prevOverflow = style.overflow;
    // Solo bloquea si el contenido entra en pantalla: en pantallas bajas
    // (p. ej. iPhone SE) la home puede no entrar y tiene que poder scrollear.
    function update() {
      style.overflow = prevOverflow;
      if (body.scrollHeight <= body.clientHeight) style.overflow = "hidden";
    }
    update();
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      style.overflow = prevOverflow;
    };
  }, []);

  return null;
}
