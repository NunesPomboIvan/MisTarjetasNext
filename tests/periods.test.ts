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
  getPeriodByKey,
  expenseFallsInPeriod,
  getInstallmentDates,
  getInstallmentIndexInPeriod,
  getInstallmentPeriod,
  getNextPayment,
  parseLocalDate,
  addMonthsToKey,
  applyPeriodDatesChange,
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

/** Tarjeta que cierra el 5 y vence el 19 del MISMO mes (due_day >= close_day) */
const CARD_5_19: CardForPeriod = { close_date: "2026-01-05", due_date: "2026-01-19" };

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

  it("vence el MISMO mes cuando due_day >= close_day (cierra 05, vence 19)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 7, 10));

    // Período de julio: cierra 05/jul → vence 19/jul (mismo mes)
    const period = getPeriodForDate(CARD_5_19, d(2026, 7, 3));
    expect(period.key).toBe("2026-07");
    expect(period.end.getMonth()).toBe(6); // julio
    expect(period.end.getDate()).toBe(5);
    expect(period.due).toEqual(d(2026, 7, 19));
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
// SUITE 9b: Consumos recurrentes (fijos mensuales)
// ─────────────────────────────────────────────────────────────

describe("consumos recurrentes", () => {
  afterEach(() => vi.useRealTimers());

  it("cae en su período base y en todos los siguientes (sin tope de cuotas)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 3, 10));

    // installments=1 pero recurring=true → aparece todos los meses
    const expense = { expense_date: "2026-03-15", installments: 1, recurring: true };

    const mar = getPeriodForDate(CARD_23_10, d(2026, 3, 15));
    const may = getPeriodForDate(CARD_23_10, d(2026, 5, 15));
    const farFuture = getPeriodForDate(CARD_23_10, d(2030, 1, 15));

    expect(expenseFallsInPeriod(expense, mar)).toBe(true);
    expect(expenseFallsInPeriod(expense, may)).toBe(true);
    expect(expenseFallsInPeriod(expense, farFuture)).toBe(true);
  });

  it("NO cae en períodos anteriores a su fecha", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 3, 10));

    const expense = { expense_date: "2026-03-15", installments: 1, recurring: true };
    const feb = getPeriodForDate(CARD_23_10, d(2026, 2, 15));

    expect(expenseFallsInPeriod(expense, feb)).toBe(false);
  });

  it("el índice equivale a la cantidad de meses desde la compra", () => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 3, 10));

    const expense = { expense_date: "2026-03-15", installments: 1, recurring: true };
    const may = getPeriodForDate(CARD_23_10, d(2026, 5, 15));

    // marzo=0, abril=1, mayo=2
    expect(getInstallmentIndexInPeriod(expense, may)).toBe(2);
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

// ─────────────────────────────────────────────────────────────
// SUITE 12: date_overrides — propagación hacia adelante
// ─────────────────────────────────────────────────────────────

/**
 * Tarjeta que cerraba el 23 / vencía el 10 y cuyo período 2026-07 se cargó
 * con fechas nuevas: cierra el 25, vence el 7. Las fechas viejas quedan
 * congeladas hasta el período 2026-06 inclusive.
 */
const CARD_WITH_HISTORY: CardForPeriod = {
  close_date: "2026-07-25",
  due_date: "2026-08-07",
  date_overrides: {
    "2026-06": { close_date: "2026-06-23", due_date: "2026-07-10" },
  },
};

describe("date_overrides — propagación de fechas", () => {
  afterEach(() => vi.useRealTimers());

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 7, 1));
  });

  it("los períodos pasados conservan sus fechas históricas", () => {
    const jun = getPeriodByKey(CARD_WITH_HISTORY, "2026-06");
    expect(jun.end.getDate()).toBe(23);
    expect(jun.due).toEqual(d(2026, 7, 10));

    const may = getPeriodByKey(CARD_WITH_HISTORY, "2026-05");
    expect(may.end.getDate()).toBe(23);
    expect(may.due).toEqual(d(2026, 6, 10));
  });

  it("el período editado usa las fechas nuevas y arranca donde terminó el viejo", () => {
    const jul = getPeriodByKey(CARD_WITH_HISTORY, "2026-07");
    // Empieza el día siguiente al cierre VIEJO (23/jun), no al nuevo día 25
    expect(jul.start).toEqual(d(2026, 6, 24));
    expect(jul.end.getDate()).toBe(25);
    expect(jul.due).toEqual(d(2026, 8, 7));
  });

  it("las fechas nuevas se replican hacia adelante: mismo día, mes +1", () => {
    const ago = getPeriodByKey(CARD_WITH_HISTORY, "2026-08");
    expect(ago.end).toEqual(endOfDayDate(2026, 8, 25));
    expect(ago.due).toEqual(d(2026, 9, 7));

    const sep = getPeriodByKey(CARD_WITH_HISTORY, "2026-09");
    expect(sep.due).toEqual(d(2026, 10, 7));
  });

  it("maneja el salto de año: el período de diciembre vence en enero", () => {
    const dic = getPeriodByKey(CARD_WITH_HISTORY, "2026-12");
    expect(dic.end.getDate()).toBe(25);
    expect(dic.due).toEqual(d(2027, 1, 7));
  });

  it("ajusta al último día válido en meses cortos", () => {
    const card: CardForPeriod = {
      close_date: "2026-07-31",
      due_date: "2026-08-30",
      date_overrides: {
        "2026-06": { close_date: "2026-06-28", due_date: "2026-07-05" },
      },
    };
    // Septiembre tiene 30 días → cierra el 30
    const sep = getPeriodByKey(card, "2026-09");
    expect(sep.end.getDate()).toBe(30);
    // Febrero 2027 → cierra el 28
    const feb = getPeriodByKey(card, "2027-02");
    expect(feb.end.getDate()).toBe(28);
  });
});

// Helper local: fin de día para comparar `end`
function endOfDayDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

// ─────────────────────────────────────────────────────────────
// SUITE 13: applyPeriodDatesChange
// ─────────────────────────────────────────────────────────────

describe("applyPeriodDatesChange", () => {
  it("congela las fechas viejas para los períodos anteriores", () => {
    const card: CardForPeriod = { close_date: "2026-06-23", due_date: "2026-07-10" };
    const update = applyPeriodDatesChange(card, "2026-07-25", "2026-08-07");

    expect(update.close_date).toBe("2026-07-25");
    expect(update.due_date).toBe("2026-08-07");
    expect(update.date_overrides).toEqual({
      "2026-06": { close_date: "2026-06-23", due_date: "2026-07-10" },
    });
  });

  it("no agrega historial si los días no cambiaron (solo avanza el mes)", () => {
    const card: CardForPeriod = { close_date: "2026-06-23", due_date: "2026-07-10" };
    const update = applyPeriodDatesChange(card, "2026-07-23", "2026-08-10");

    expect(update.date_overrides).toBeNull();
  });

  it("ediciones repetidas del mismo período conservan el histórico original", () => {
    // Primera edición: 23 → 25 (ya aplicada)
    const card: CardForPeriod = {
      close_date: "2026-07-25",
      due_date: "2026-08-07",
      date_overrides: {
        "2026-06": { close_date: "2026-06-23", due_date: "2026-07-10" },
      },
    };
    // Segunda edición del MISMO período: 25 → 27
    const update = applyPeriodDatesChange(card, "2026-07-27", "2026-08-07");

    expect(update.close_date).toBe("2026-07-27");
    // El histórico sigue siendo el original (día 23), no el intermedio (25)
    expect(update.date_overrides).toEqual({
      "2026-06": { close_date: "2026-06-23", due_date: "2026-07-10" },
    });
  });

  it("renovaciones sucesivas acumulan historial por tramos", () => {
    const card: CardForPeriod = {
      close_date: "2026-07-25",
      due_date: "2026-08-07",
      date_overrides: {
        "2026-06": { close_date: "2026-06-23", due_date: "2026-07-10" },
      },
    };
    // Renueva el período siguiente con otro corrimiento: 25 → 28
    const update = applyPeriodDatesChange(card, "2026-08-28", "2026-09-09");

    expect(update.date_overrides).toEqual({
      "2026-06": { close_date: "2026-06-23", due_date: "2026-07-10" },
      "2026-07": { close_date: "2026-07-25", due_date: "2026-08-07" },
    });

    // Y los tramos resuelven bien: jun→23, jul→25, ago en adelante→28
    const cardAfter: CardForPeriod = { ...card, ...update };
    expect(getPeriodByKey(cardAfter, "2026-06").end.getDate()).toBe(23);
    expect(getPeriodByKey(cardAfter, "2026-07").end.getDate()).toBe(25);
    expect(getPeriodByKey(cardAfter, "2026-08").end.getDate()).toBe(28);
    expect(getPeriodByKey(cardAfter, "2026-09").end.getDate()).toBe(28);
  });

  it("descarta overrides que quedaron obsoletos (claves >= período editado)", () => {
    const card: CardForPeriod = {
      close_date: "2026-07-25",
      due_date: "2026-08-07",
      date_overrides: {
        "2026-09": { close_date: "2026-06-23", due_date: "2026-07-10" },
      },
    };
    const update = applyPeriodDatesChange(card, "2026-08-28", "2026-09-09");

    // El override "2026-09" tapaba al período editado → se elimina
    expect(update.date_overrides).toEqual({
      "2026-07": { close_date: "2026-07-25", due_date: "2026-08-07" },
    });
  });
});

// ─────────────────────────────────────────────────────────────
// SUITE 14: los consumos quedan anclados a su período
// ─────────────────────────────────────────────────────────────

describe("consumos anclados — el cambio de fechas no re-asigna cuotas", () => {
  afterEach(() => vi.useRealTimers());

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(d(2026, 7, 1));
  });

  // Compra del 24/mar (después del cierre viejo del 23) en 6 cuotas.
  // Período base = 2026-04; cuota N → 2026-04 + N.
  const expense = { expense_date: "2026-03-24", installments: 6 };

  it("addMonthsToKey suma meses con salto de año", () => {
    expect(addMonthsToKey("2026-04", 3)).toBe("2026-07");
    expect(addMonthsToKey("2026-11", 2)).toBe("2027-01");
    expect(addMonthsToKey("2026-01", -1)).toBe("2025-12");
  });

  it("cada cuota vive en período base + N, también tras el cambio de fechas", () => {
    for (let i = 0; i < 6; i++) {
      const p = getInstallmentPeriod(CARD_WITH_HISTORY, expense, i);
      expect(p.key).toBe(addMonthsToKey("2026-04", i));
    }
  });

  it("la cuota NO se muda aunque su fecha caiga dentro de los límites corridos", () => {
    // Cuota 4 tiene fecha 24/jul. El período 2026-07 ahora abarca hasta el
    // 25/jul (cierre nuevo), o sea que por FECHA la cuota caería en 2026-07.
    // Pero la cadena la mantiene en 2026-08 (base 2026-04 + 4).
    const jul = getPeriodByKey(CARD_WITH_HISTORY, "2026-07");
    const ago = getPeriodByKey(CARD_WITH_HISTORY, "2026-08");

    expect(getInstallmentIndexInPeriod(expense, ago)).toBe(4);
    expect(expenseFallsInPeriod(expense, jul, 4)).toBe(false);
    expect(getInstallmentIndexInPeriod(expense, jul)).toBe(3); // la cuota 3, no la 4
  });

  it("consumos de períodos pasados conservan su período", () => {
    const exp = { expense_date: "2026-05-15", installments: 1 };
    const may = getPeriodByKey(CARD_WITH_HISTORY, "2026-05");

    expect(expenseFallsInPeriod(exp, may)).toBe(true);
    expect(getPeriodForDate(CARD_WITH_HISTORY, d(2026, 5, 15)).key).toBe("2026-05");
  });
});
