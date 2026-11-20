import { describe, it, expect } from "vitest";
import { formatPct, parseMpCommissions, withCommission } from "@/lib/commissions/mercadopago";

describe("comisión de Mercado Pago", () => {
  it("suma el % al importe y redondea a centavos", () => {
    expect(withCommission(37800, 6.53)).toBe(40268.34);
    expect(withCommission(37800, 6.99)).toBe(40442.22);
    expect(withCommission(1000, 0)).toBe(1000);
  });

  it("normaliza lo guardado: sólo redes conocidas y % válidos", () => {
    expect(
      parseMpCommissions({ visa: 6.53, amex: "6.99", other: 5, cabal: -1, naranja: 150 })
    ).toEqual({ visa: 6.53, amex: 6.99 });
    expect(parseMpCommissions(null)).toEqual({});
  });

  it("muestra el % con coma", () => {
    expect(formatPct(6.53)).toBe("6,53%");
    expect(formatPct(7)).toBe("7%");
  });
});
