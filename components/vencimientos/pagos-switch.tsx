"use client";

import * as React from "react";
import { TypeSwitch } from "@/components/shared/type-switch";

type Tab = "tarjetas" | "prestamos";

interface PagosSwitchProps {
  initialTab?: Tab;
  /** Contenido ya renderizado en el server (total + lista o empty state). */
  tarjetas: React.ReactNode;
  prestamos: React.ReactNode;
}

/**
 * Switch Tarjetas | Préstamos de "Vencimientos". Mismo `TypeSwitch` y mismo
 * orden vertical que las pantallas de alta: switch · divisoria de 1 px ·
 * contenido. Los dos paneles llegan ya renderizados desde el server (con sus
 * totales y subtotales) y sólo se alterna cuál se ve con `hidden`, sin recargar
 * ni volver a pedir datos.
 */
export function PagosSwitch({
  initialTab = "tarjetas",
  tarjetas,
  prestamos,
}: PagosSwitchProps) {
  const [tab, setTab] = React.useState<Tab>(initialTab);

  return (
    <div className="space-y-4">
      <TypeSwitch
        aria-label="Tipo de vencimiento"
        options={[
          { value: "tarjetas", label: "Tarjetas" },
          { value: "prestamos", label: "Préstamos" },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div className="-mx-4 border-t border-border" />

      <div hidden={tab !== "tarjetas"}>{tarjetas}</div>
      <div hidden={tab !== "prestamos"}>{prestamos}</div>
    </div>
  );
}
