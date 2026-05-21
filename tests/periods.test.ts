/**
 * tests/periods.test.ts
 * Tests de la lógica de períodos de tarjetas de crédito.
 *
 * Convención de fechas en los tests:
 * - Usamos vi.setSystemTime() para fijar "hoy".
 * - new Date(year, month-1, day) crea fechas locales.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  setDayOfMonth,
  getPeriodForDate,
  getCurrentPeriod,
  getPeriodByOffset,
  getPeriods,
  expenseFallsInPeriod,
  getInstallmentDates,
  getNextPayment,
  parseLocalDate,
  type CardForPeriod,
  type Period,
} from "@/lib/periods/calculate";

// ─── Tarjetas de prueba ───────────────────────────────────────

/** Tarjeta estándar: cierra el 23, vence el 10 del mes siguiente */
const CARD_23_10: CardForPeriod = { close_date: "2026-01-23", due_date: "2026-01-10" };

/** Tarjeta que cierra el 28, vence el 5 (vencimiento antes que el cierre del siguiente) */
const CARD_28_5: CardForPeriod = { close_date: "2026-01-28", due_date: "2026-01-05" };

/** Tarjeta que cierra el 31 (caso borde: meses cortos) */
const CARD_31_15: CardForPeriod = { close_date: "2026-01-31", due_date: "2026-01-15" };

/** Tarjeta que cierra el 1 (borde inferior) */
const CARD_1_20: CardForPeriod = { close_date: "2026-01-01", due_date: "2026-01-20" };

// ─── Helper ──────────────────────────────────────────────────

function d(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

// ─────────────────────────────────────────────────────────────
// SUITE 1: setDayOfMonth
// ─────────────────────────────────────────────────────────────

describe("setDayOfMonth", () => {
  it("retorna el día exacto cuando el mes lo tiene", () => {
    const result = setDayOfMonth(2026, 3, 23);
    expect(result).toEqual(d(2026, 3, 23));
  });

  it("ajusta al último día en febrero (año no bisiesto)", () => {
    const result = setDayOfMonth(2026, 2, 31);
    expect(result).toEqual(d(2026, 2, 28));
  });

  it("ajusta al último día en febrero (año bisiesto)", () => {
    const result = setDayOfMonth(2024, 2, 31);
    expect(result).toEqual(d(2024, 2, 29));
  });

  it("ajusta al último día en meses de 30 días", () => {
    // Abril tiene 30 días
    const result = setDayOfMonth(2026, 4, 31);
    expect(result).toEqual(d(2026, 4, 30));
  });

  it("día 28 en febrero no cambia en año no bisiesto", () => {
    const result = setDayOfMonth(2026, 2, 28);
    expect(result).toEqual(d(2026, 2, 28));
  });
});

// ─────────────────────────────────────────────────────────────
// SUITE 2: parseLocalDate
// ─────────────────────────────────────────────────────────────

describe("parseLocalDate", () => {
  it("parsea YYYY-MM-DD como fecha local sin timezone shift", () => {
    const result = parseLocalDate("2026-03-15");
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(2); // 0-indexed
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// SUITE 3: getPeriodForDate
// ─────────────────────────────────────────────────────────────

describe("getPeriodForDate — CARD_23_10", () => {
  afterEach(() => vi.useRealTimers());

  it("compra el mismo día del cierre pertenece al período de ese mes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 4, 10)); // hoy es 10 de abril

    const period = getPeriodForDate(CARD_23_10, d(2026, 3, 23)); // compra el 23/mar
    expect(period.key).toBe("2026-03");
    expect(period.label).toBe("Marzo 2026");
  });

  it("compra el día después del cierre va al período siguiente", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 4, 10));

    const period = getPeriodForDate(CARD_23_10, d(2026, 3, 24)); // compra el 24/mar
    expect(period.key).toBe("2026-04");
    expect(period.label).toBe("Abril 2026");
  });

  it("start del período es el día siguiente al cierre del mes anterior", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 4, 10));

    const period = getPeriodForDate(CARD_23_10, d(2026, 3, 15));
    // Período marzo: start = 24/feb, end = 23/mar
    expect(period.start).toEqual(d(2026, 2, 24));
    expect(period.end.getFullYear()).toBe(2026);
    expect(period.end.getMonth()).toBe(2); // marzo
    expect(period.end.getDate()).toBe(23);
  });

  it("due date es el due_day del mes siguiente al cierre", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 4, 10));

    const period = getPeriodForDate(CARD_23_10, d(2026, 3, 15));
    // Período marzo cierra el 23/mar → vence el 10/abr (due_day = 10, sin offset)
    expect(period.due).toEqual(d(2026, 4, 10));
  });

  it("período de diciembre tiene due date en enero del año siguiente", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 1, 15));

    const period = getPeriodForDate(CARD_23_10, d(2025, 12, 15));
    expect(period.key).toBe("2025-12");
    expect(period.due).toEqual(d(2026, 1, 10));
  });

  it("compra en enero después del cierre va a febrero", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 3, 10));

    const period = getPeriodForDate(CARD_23_10, d(2026, 1, 25));
    expect(period.key).toBe("2026-02");
  });
});

// ─────────────────────────────────────────────────────────────
// SUITE 4: Casos borde con meses cortos (close_day=31)
// ─────────────────────────────────────────────────────────────

describe("Casos borde — CARD_31_15 (cierra el 31)", () => {
  afterEach(() => vi.useRealTimers());

  it("período de febrero: end es el 28 en año no bisiesto", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 3, 10));

    const period = getPeriodForDate(CARD_31_15, d(2026, 2, 15));
    expect(period.key).toBe("2026-02");
    expect(period.end.getDate()).toBe(28);
    expect(period.end.getMonth()).toBe(1); // feb
  });

  it("período de febrero: end es el 29 en año bisiesto", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2024, 3, 10));

    const period = getPeriodForDate(CARD_31_15, d(2024, 2, 15));
    expect(period.key).toBe("2024-02");
    expect(period.end.getDate()).toBe(29);
  });

  it("período de abril: end es el 30 (abril tiene 30 días)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 5, 10));

    const period = getPeriodForDate(CARD_31_15, d(2026, 4, 15));
    expect(period.key).toBe("2026-04");
    expect(period.end.getDate()).toBe(30);
  });

  it("compra el 31/ene pertenece al período de enero", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 3, 10));

    const period = getPeriodForDate(CARD_31_15, d(2026, 1, 31));
    expect(period.key).toBe("2026-01");
  });
});

// ─────────────────────────────────────────────────────────────
// SUITE 5: getCurrentPeriod y status
// ─────────────────────────────────────────────────────────────

describe("getCurrentPeriod y status", () => {
  afterEach(() => vi.useRealTimers());

  it("status current cuando hoy está dentro del período", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 3, 15)); // 15/mar, dentro del período 24/feb-23/mar

    const period = getCurrentPeriod(CARD_23_10);
    expect(period.status).toBe("current");
    expect(period.key).toBe("2026-03");
  });

  it("status current el mismo día del cierre", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 3, 23)); // día de cierre

    const period = getCurrentPeriod(CARD_23_10);
    expect(period.status).toBe("current");
    expect(period.key).toBe("2026-03");
  });

  it("status future para el período siguiente", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 3, 15));

    const period = getPeriodByOffset(CARD_23_10, 1);
    expect(period.status).toBe("future");
  });

  it("status past para el período anterior", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 3, 15));

    const period = getPeriodByOffset(CARD_23_10, -1);
    expect(period.status).toBe("past");
  });
});

// ─────────────────────────────────────────────────────────────
// SUITE 6: getPeriodByOffset
// ─────────────────────────────────────────────────────────────

describe("getPeriodByOffset", () => {
  afterEach(() => vi.useRealTimers());

  it("offset 0 es el período actual", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 4, 10));

    const current = getCurrentPeriod(CARD_23_10);
    const offset0 = getPeriodByOffset(CARD_23_10, 0);
    expect(offset0.key).toBe(current.key);
  });

  it("offset -1 es el mes anterior", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 4, 10));

    // Hoy 10/abr → período actual es abril → offset -1 es marzo
    const prev = getPeriodByOffset(CARD_23_10, -1);
    expect(prev.key).toBe("2026-03");
  });

  it("offset +1 cruza año correctamente (diciembre → enero)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2025, 12, 15)); // hoy 15/dic → período actual es dic 2025

    const next = getPeriodByOffset(CARD_23_10, 1);
    expect(next.key).toBe("2026-01");
  });

  it("offset -1 cruza año correctamente (enero → diciembre)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 1, 15)); // hoy 15/ene → período actual es ene 2026

    const prev = getPeriodByOffset(CARD_23_10, -1);
    expect(prev.key).toBe("2025-12");
  });
});

// ─────────────────────────────────────────────────────────────
// SUITE 7: getPeriods
// ─────────────────────────────────────────────────────────────

describe("getPeriods", () => {
  afterEach(() => vi.useRealTimers());

  it("retorna la cantidad correcta de períodos", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 4, 10));

    const periods = getPeriods(CARD_23_10, { past: 3, future: 2 });
    expect(periods).toHaveLength(6); // 3 past + 1 current + 2 future
  });

  it("los períodos están ordenados de más antiguo a más nuevo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 4, 10));

    const periods = getPeriods(CARD_23_10, { past: 2, future: 2 });
    for (let i = 1; i < periods.length; i++) {
      expect(periods[i].start.getTime()).toBeGreaterThan(periods[i - 1].start.getTime());
    }
  });
});

// ─────────────────────────────────────────────────────────────
// SUITE 8: getInstallmentDates
// ─────────────────────────────────────────────────────────────

describe("getInstallmentDates", () => {
  it("compra de contado → una sola fecha", () => {
    const dates = getInstallmentDates({ expense_date: "2026-03-15", installments: 1 });
    expect(dates).toHaveLength(1);
    expect(dates[0]).toEqual(d(2026, 3, 15));
  });

  it("3 cuotas → 3 fechas separadas por un mes", () => {
    const dates = getInstallmentDates({ expense_date: "2026-03-15", installments: 3 });
    expect(dates).toHaveLength(3);
    expect(dates[0]).toEqual(d(2026, 3, 15));
    expect(dates[1]).toEqual(d(2026, 4, 15));
    expect(dates[2]).toEqual(d(2026, 5, 15));
  });

  it("cuotas que cruzan el año", () => {
    const dates = getInstallmentDates({ expense_date: "2025-12-01", installments: 3 });
    expect(dates[0]).toEqual(d(2025, 12, 1));
    expect(dates[1]).toEqual(d(2026, 1, 1));
    expect(dates[2]).toEqual(d(2026, 2, 1));
  });

  it("12 cuotas desde noviembre — la última cuota es en octubre del año siguiente", () => {
    const dates = getInstallmentDates({ expense_date: "2025-11-10", installments: 12 });
    expect(dates).toHaveLength(12);
    expect(dates[11]).toEqual(d(2026, 10, 10));
  });
});

// ─────────────────────────────────────────────────────────────
// SUITE 9: expenseFallsInPeriod
// ─────────────────────────────────────────────────────────────

describe("expenseFallsInPeriod", () => {
  afterEach(() => vi.useRealTimers());

  it("compra de contado cae en el período correcto", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 3, 10));

    const period = getPeriodForDate(CARD_23_10, d(2026, 3, 15));
    const expense = { expense_date: "2026-03-15", installments: 1 };

    expect(expenseFallsInPeriod(expense, period)).toBe(true);
  });

  it("compra de contado NO cae en período equivocado", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 3, 10));

    const wrongPeriod = getPeriodForDate(CARD_23_10, d(2026, 2, 15));
    const expense = { expense_date: "2026-03-15", installments: 1 };

    expect(expenseFallsInPeriod(expense, wrongPeriod)).toBe(false);
  });

  it("cuota 2 de 3 cae en el período de mayo (compra en marzo)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 5, 10));

    const expense = { expense_date: "2026-03-15", installments: 3 };
    const periodMay = getPeriodForDate(CARD_23_10, d(2026, 5, 15));

    // Cuota 0 → marzo, cuota 1 → abril, cuota 2 → mayo
    expect(expenseFallsInPeriod(expense, periodMay, 2)).toBe(true);
    expect(expenseFallsInPeriod(expense, periodMay, 0)).toBe(false);
    expect(expenseFallsInPeriod(expense, periodMay, 1)).toBe(false);
  });

  it("sin índice: retorna true si ALGUNA cuota cae en el período", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 4, 10));

    const expense = { expense_date: "2026-03-15", installments: 3 };
    const periodApr = getPeriodForDate(CARD_23_10, d(2026, 4, 15));

    expect(expenseFallsInPeriod(expense, periodApr)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// SUITE 10: Tarjeta con close_day=1 (borde inferior)
// ─────────────────────────────────────────────────────────────

describe("CARD_1_20 — cierra el día 1", () => {
  afterEach(() => vi.useRealTimers());

  it("compra el 1/mar pertenece al período de marzo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 3, 15));

    const period = getPeriodForDate(CARD_1_20, d(2026, 3, 1));
    expect(period.key).toBe("2026-03");
  });

  it("compra el 2/mar va al período de abril", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 4, 10));

    const period = getPeriodForDate(CARD_1_20, d(2026, 3, 2));
    expect(period.key).toBe("2026-04");
  });
});

// ─────────────────────────────────────────────────────────────
// SUITE 11: getNextPayment — próximo pago con saldo
// ─────────────────────────────────────────────────────────────

describe("getNextPayment — CARD_23_10", () => {
  afterEach(() => vi.useRealTimers());

  it("salta el período más próximo a vencer si está vacío y devuelve el siguiente con saldo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 5, 15));

    // Período más próximo a vencer (2026-05, vence 10/jun) NO tiene consumos.
    // El consumo cae en 2026-06 (vence 10/jul).
    const expenses = [
      { expense_date: "2026-06-01", installments: 1, installment_amount: 1000 },
    ];

    const payment = getNextPayment(CARD_23_10, expenses);
    expect(payment).not.toBeNull();
    expect(payment!.period.key).toBe("2026-06");
    expect(payment!.total).toBe(1000);
    expect(payment!.period.due).toEqual(d(2026, 7, 10));
  });

  it("devuelve el período más próximo a vencer cuando tiene saldo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 5, 15));

    const expenses = [
      { expense_date: "2026-05-01", installments: 1, installment_amount: 500 },
    ];

    const payment = getNextPayment(CARD_23_10, expenses);
    expect(payment!.period.key).toBe("2026-05");
    expect(payment!.total).toBe(500);
    expect(payment!.period.due).toEqual(d(2026, 6, 10));
  });

  it("incluye el período que vence HOY si tiene saldo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 6, 10)); // = vencimiento del período 2026-05

    const expenses = [
      { expense_date: "2026-05-01", installments: 1, installment_amount: 500 },
    ];

    const payment = getNextPayment(CARD_23_10, expenses);
    expect(payment!.period.key).toBe("2026-05");
    expect(payment!.period.due).toEqual(d(2026, 6, 10));
    expect(payment!.total).toBe(500);
  });

  it("devuelve null cuando la tarjeta no tiene pagos pendientes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 5, 15));

    expect(getNextPayment(CARD_23_10, [])).toBeNull();
  });
});
