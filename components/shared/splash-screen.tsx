"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SESSION_KEY = "mt_splash_v1";
const HOLD_MS = 1500;
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
        "fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity",
        fadingOut ? "pointer-events-none opacity-0" : "opacity-100"
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      {/* Glow radial de fondo */}
      <div
        className="splash-bg pointer-events-none absolute"
        style={{
          width: 520,
          height: 520,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.35) 0%, rgba(99,102,241,0.10) 45%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Contenido centrado */}
      <div className="relative flex flex-col items-center gap-7">
        {/* Icono con halo expansivo */}
        <div className="relative">
          <span
            aria-hidden
            className="splash-halo absolute inset-0 rounded-[28px]"
          />
          <div
            className="splash-icon relative flex h-24 w-24 items-center justify-center rounded-[28px] gradient-primary text-[44px] leading-none text-white"
            style={{
              boxShadow:
                "0 24px 50px -12px rgba(99,102,241,0.55), inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
          >
            💳
          </div>
        </div>

        {/* Nombre + tagline */}
        <div className="text-center">
          <h1 className="splash-text font-display text-[30px] font-bold tracking-tight text-foreground">
            Mis Tarjetas
          </h1>
          <p className="splash-tagline mt-1.5 text-[13px] text-muted-foreground">
            Tus tarjetas y préstamos en un solo lugar
          </p>
        </div>
      </div>
    </div>
  );
}
