"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SESSION_KEY = "mt_splash_v2";
const HOLD_MS = 1400;
const FADE_MS = 450;

/**
 * Pantalla de carga inicial. Se muestra una sola vez por sesión del browser
 * (sessionStorage). Aparece pegada al primer paint, mantiene foco por
 * HOLD_MS y después se desvanece durante FADE_MS antes de desmontarse.
 */
export function SplashScreen() {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // si no hay storage, igual mostramos
    }
    setShow(true);

    const fadeTimer = setTimeout(() => setFadingOut(true), HOLD_MS);
    const unmountTimer = setTimeout(() => setShow(false), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!mounted || !show) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background transition-opacity",
        fadingOut ? "pointer-events-none opacity-0" : "opacity-100"
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      {/* Resplandor de fondo — presente pero quieto, sin pulso */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          width: 640,
          height: 640,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--primary) 16%, transparent) 0%, color-mix(in srgb, var(--primary) 5%, transparent) 45%, transparent 70%)",
        }}
      />

      {/* Textura sutil: grilla de puntos, casi imperceptible */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />

      {/* Contenido centrado */}
      <div className="relative flex flex-col items-center gap-6">
        {/* Marca: dos formas superpuestas (cuentas en general — tarjetas Y
            préstamos — no un ícono literal de tarjeta de crédito), trazo en
            degradé, sobre una superficie quieta con borde fino. */}
        <div
          className="splash-mark relative flex h-16 w-16 items-center justify-center rounded-[18px]"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "0 24px 48px -20px color-mix(in srgb, var(--primary) 45%, transparent)",
          }}
        >
          <svg width="34" height="26" viewBox="0 0 34 26" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="splash-mark-grad" x1="0" y1="26" x2="34" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="var(--primary)" />
                <stop offset="1" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
            <rect
              x="9" y="1" width="24" height="16" rx="4"
              stroke="url(#splash-mark-grad)"
              strokeWidth="1.6"
              opacity="0.55"
            />
            <rect
              x="1" y="9" width="24" height="16" rx="4"
              fill="var(--card)"
              stroke="url(#splash-mark-grad)"
              strokeWidth="1.6"
            />
          </svg>
        </div>

        {/* Un solo mensaje, sin nombre de marca: la app cubre tarjetas Y
            préstamos, no solo tarjetas. */}
        <p className="splash-text font-display text-[16px] font-semibold text-foreground">
          Tarjetas y préstamos, en un solo lugar
        </p>
      </div>
    </div>
  );
}
