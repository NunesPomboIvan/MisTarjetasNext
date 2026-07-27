/**
 * tests/vencimientos.test.ts
 * Tests de lib/vencimientos.ts (consolidación de vencimientos por mes).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { computeUpcomingByMonth } from "@/lib/vencimientos";
import type { Card, Expense } from "@/lib/supabase/database.types";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "card-1",
    user_id: "user-1",
    name: "ICBC",
    type: "visa",
    last_four: "1234",
    close_date: "2026-01-20",
    due_date: "2026-01-03",
    date_overrides: null,
    color: "#6366f1",
    bank: "ICBC",
    is_extension: false,
    parent_card_id: null,
    credit_limit: null,
    holder_name: null,
    expiry: null,
    titular_id: null,
    archived: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense-1",
    user_id: "user-1",
    card_id: "card-1",
    category_id: null,
    description: "Federación Patronal",
    total_amount: 15000,
    total_amount_with_interest: null,
    installments: 1,
    installment_amount: 15000,
    installment_amounts: null,
    recurring: false,
    discount_percentage: null,
    discount_cap: null,
    expense_date: "2026-01-15",
    currency: "ARS",
    exchange_rate: null,
    exchange_rate_custom: false,
    notes: null,
    tags: [],
    created_at: "2026-01-15T00:00:00.000Z",
    updated_at: "2026-01-15T00:00:00.000Z",
    ...overrides,
  } as Expense;
}

describe("computeUpcomingByMonth — consumos recurrentes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it(
    "suma el consumo recurrente en un período ya cerrado pero todavía no vencido " +
      "(regresión: antes desaparecía porque se anclaba en getCurrentPeriod)",
    () => {
      // Tarjeta cierra el 20, vence el 3 del mes siguiente. Hoy: 26/jul/2026 —
      // el período de julio (cierre 20/jul) YA CERRÓ pero vence el 3/ago,
      // todavía no vencido.
      vi.setSystemTime(new Date(2026, 6, 26, 12, 0, 0));

      const card = makeCard();
      const recurring = makeExpense({
        recurring: true,
        installments: 1,
        expense_date: "2026-01-15",
      });

      const result = computeUpcomingByMonth({
        cards: [card],
        expenses: [recurring],
        loans: [],
        pendingInstallments: [],
        totalByLoan: new Map(),
        paidCardPeriods: new Set(),
        now: new Date(2026, 6, 26, 12, 0, 0),
      });

      const augustMonth = result.months.find((m) => m.key === "2026-08");
      expect(augustMonth).toBeDefined();

      const icbcEntry = augustMonth!.cards.find((c) => c.periodKey === "2026-07");
      expect(icbcEntry).toBeDefined();
      expect(icbcEntry!.amount).toBe(15000);
      expect(icbcEntry!.dueDateKey).toBe("2026-08-03");
    }
  );

  it("no duplica ni pierde el recurrente en el período actual (caso normal)", () => {
    // Hoy todavía dentro del período de julio (antes del cierre): el período
    // actual y el próximo a vencer coinciden.
    vi.setSystemTime(new Date(2026, 6, 10, 12, 0, 0));

    const card = makeCard();
    const recurring = makeExpense({ recurring: true, expense_date: "2026-01-15" });

    const result = computeUpcomingByMonth({
      cards: [card],
      expenses: [recurring],
      loans: [],
      pendingInstallments: [],
      totalByLoan: new Map(),
      paidCardPeriods: new Set(),
      now: new Date(2026, 6, 10, 12, 0, 0),
    });

    const allEntries = result.months.flatMap((m) => m.cards);
    const matching = allEntries.filter((c) => c.periodKey === "2026-07");
    expect(matching).toHaveLength(1);
    expect(matching[0].amount).toBe(15000);
  });
});
