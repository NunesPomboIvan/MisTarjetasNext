"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Tab = "tarjetas" | "prestamos";

interface PagosSwitchProps {
  initialTab?: Tab;
  /** Contenido ya renderizado en el server (total + lista o empty state). */
  tarjetas: React.ReactNode;
  prestamos: React.ReactNode;
}

/**
 * Switch segmentado Tarjetas | Préstamos para la pantalla de vencimientos.
 * Mismo patrón que `AddFlow`: los dos paneles llegan ya renderizados desde el
 * server y sólo se alterna cuál se ve con `hidden`, sin recargar ni volver a
 * pedir datos.
 */
export function PagosSwitch({
  initialTab = "tarjetas",
  tarjetas,
  prestamos,
}: PagosSwitchProps) {
  const [tab, setTab] = React.useState<Tab>(initialTab);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Tipo de vencimiento"
        className="mb-5 flex rounded-[14px] border border-border bg-muted/40 p-1"
      >
        <SegmentButton active={tab === "tarjetas"} onClick={() => setTab("tarjetas")}>
          Tarjetas
        </SegmentButton>
        <SegmentButton active={tab === "prestamos"} onClick={() => setTab("prestamos")}>
          Préstamos
        </SegmentButton>
      </div>

      <div hidden={tab !== "tarjetas"}>{tarjetas}</div>
      <div hidden={tab !== "prestamos"}>{prestamos}</div>
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex-1 rounded-[10px] px-3 py-2 text-[13px] font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground"
      )}
    >
      {children}
    </button>
  );
}
