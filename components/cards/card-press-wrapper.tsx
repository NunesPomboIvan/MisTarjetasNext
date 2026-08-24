import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";

interface CardPressWrapperProps {
  /** Página de detalle de la tarjeta */
  href: string;
  bank: string;
  lastFour: string;
  /** Saldo del período actual. Si no se pasa, se omite del aria-label. */
  total?: number;
  currency?: "ARS" | "USD";
  children: React.ReactNode;
  className?: string;
}

/**
 * Envuelve una tarjeta en un link real: navega al detalle con click/tap y
 * permite el long-press nativo del sistema (vista previa, abrir en nueva
 * pestaña). El feedback de "press" es puramente CSS (active:*) para no
 * interceptar el gesto con JS.
 */
export function CardPressWrapper({
  href,
  bank,
  lastFour,
  total,
  currency = "ARS",
  children,
  className,
}: CardPressWrapperProps) {
  const saldoLabel =
    total != null ? `, saldo ${formatCurrency(total, currency)}` : "";

  return (
    <Link
      href={href}
      aria-label={`Tarjeta ${bank}, terminada en ${lastFour}${saldoLabel}`}
      className={cn("focus-ring rounded-[24px]", className)}
    >
      {children}
    </Link>
  );
}
