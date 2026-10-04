import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecentExpenses, type RecentExpense } from "@/components/home/recent-expenses";

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
    card: { name: "Visa", bank: "Macro", last_four: "4016", type: "visa" },
    ...overrides,
  } as RecentExpense;
}

describe("RecentExpenses", () => {
  it("muestra el estado vacío con acceso a cargar el primero", () => {
    render(<RecentExpenses expenses={[]} />);
    expect(screen.getByText("Todavía no cargaste consumos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cargar el primero" })).toHaveAttribute("href", "/nuevo");
    expect(screen.queryByText("Ver todos")).not.toBeInTheDocument();
  });

  it("muestra un consumo con tarjeta, fecha y link al detalle", () => {
    render(<RecentExpenses expenses={[expense("a", "2026-10-01")]} />);
    expect(screen.getByText("Macro · Visa 4016")).toBeInTheDocument();
    expect(screen.getByText("01/10/2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver consumo Consumo a" })).toHaveAttribute("href", "/expenses/a");
    expect(screen.getByRole("link", { name: "Ver todos" })).toHaveAttribute("href", "/expenses");
  });

  it("muestra siempre la fecha dd/MM/yyyy (sin Hoy / Ayer)", () => {
    render(
      <RecentExpenses
        expenses={[
          expense("a", "2026-09-30"),
          expense("b", "2026-09-29", { card: { name: "Gold", bank: null, last_four: "1234", type: "mastercard" } as RecentExpense["card"] }),
          expense("c", "2026-01-05"),
          expense("d", "2025-12-31"),
        ]}
      />
    );
    expect(screen.getByText("30/09/2026")).toBeInTheDocument();
    expect(screen.getByText("29/09/2026")).toBeInTheDocument();
    expect(screen.getByText("05/01/2026")).toBeInTheDocument();
    expect(screen.getByText("Gold · Mastercard 1234")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^Ver consumo/ })).toHaveLength(4);
  });
});
