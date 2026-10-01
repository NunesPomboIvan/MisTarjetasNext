import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecentExpenses, type RecentExpense } from "@/components/home/recent-expenses";

const today = new Date(2026, 9, 1); // 1 oct 2026

function expense(id: string, expense_date: string, overrides: Partial<RecentExpense> = {}): RecentExpense {
  return {
    id,
    user_id: "u",
    card_id: "c",
    category_id: null,
    description: `Consumo ${id}`,
    total_amount: 1000,
    total_amount_with_interest: null,
    installments: 1,
    installment_amount: 1000,
    installment_amounts: null,
    recurring: false,
    discount_percentage: null,
    discount_cap: null,
    expense_date,
    currency: "ARS",
    exchange_rate: null,
    exchange_rate_custom: false,
    notes: null,
    tags: [],
    excluded_installments: [],
    created_at: "2026-10-01T12:00:00Z",
    updated_at: "2026-10-01T12:00:00Z",
    category: null,
    card: { name: "Visa", bank: "Macro" },
    ...overrides,
  } as RecentExpense;
}

describe("RecentExpenses", () => {
  it("muestra el estado vacío con acceso a cargar el primero", () => {
    render(<RecentExpenses expenses={[]} today={today} />);
    expect(screen.getByText("Todavía no cargaste consumos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cargar el primero" })).toHaveAttribute("href", "/nuevo");
    expect(screen.queryByText("Ver todos →")).not.toBeInTheDocument();
  });

  it("muestra un consumo con tarjeta, fecha relativa y link al detalle", () => {
    render(<RecentExpenses expenses={[expense("a", "2026-10-01")]} today={today} />);
    expect(screen.getByText("Macro · hoy")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver consumo Consumo a" })).toHaveAttribute("href", "/expenses/a");
    expect(screen.getByRole("link", { name: "Ver todos →" })).toHaveAttribute("href", "/expenses");
  });

  it("usa 'ayer' y el formato corto para fechas anteriores", () => {
    render(
      <RecentExpenses
        expenses={[
          expense("a", "2026-09-30"),
          expense("b", "2026-09-29", { card: { name: "Gold", bank: null } as RecentExpense["card"] }),
          expense("c", "2026-01-05"),
          expense("d", "2025-12-31"),
        ]}
        today={today}
      />
    );
    expect(screen.getByText("Macro · ayer")).toBeInTheDocument();
    expect(screen.getByText("Gold · 29 sep")).toBeInTheDocument();
    expect(screen.getByText("Macro · 5 ene")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^Ver consumo/ })).toHaveLength(4);
  });
});
