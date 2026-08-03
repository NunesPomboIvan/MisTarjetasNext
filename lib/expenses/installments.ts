export type DiscountDistribution = "first" | "prorated";

export interface InstallmentBreakdown {
  /** Monto base por cuota (a guardar en installment_amount). */
  installmentAmount: number;
  /** Overrides por índice de cuota (a guardar en installment_amounts), o null si todas las cuotas son iguales. */
  installmentAmounts: Record<string, number> | null;
  /** Monto de cada cuota, en orden — para mostrar el preview. */
  amounts: number[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calcula cómo se reparte un consumo (con descuento opcional) entre sus cuotas.
 *
 * - "first": el descuento completo se descuenta de la primera cuota; el resto
 *   de las cuotas se calculan sin descuento (total / cuotas).
 * - "prorated": el descuento se prorratea en partes iguales entre todas las
 *   cuotas, ajustando centavos en la última para que el total cierre exacto.
 */
export function calculateInstallmentBreakdown(
  totalAmount: number,
  installments: number,
  discountAmount: number,
  distribution: DiscountDistribution
): InstallmentBreakdown {
  const precioFinal = totalAmount - discountAmount;

  if (installments <= 1) {
    const amt = round2(precioFinal);
    return { installmentAmount: amt, installmentAmounts: null, amounts: [amt] };
  }

  if (distribution === "first") {
    const share = round2(totalAmount / installments);
    const first = round2(precioFinal - share * (installments - 1));
    const amounts = [first, ...Array(installments - 1).fill(share)];
    const installmentAmounts = first === share ? null : { "0": first };
    return { installmentAmount: share, installmentAmounts, amounts };
  }

  // prorated
  const share = round2(precioFinal / installments);
  const last = round2(precioFinal - share * (installments - 1));
  const amounts = [...Array(installments - 1).fill(share), last];
  const installmentAmounts = last === share ? null : { [String(installments - 1)]: last };
  return { installmentAmount: share, installmentAmounts, amounts };
}
