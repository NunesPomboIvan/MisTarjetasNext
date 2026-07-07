/**
 * database.types.ts
 * Tipos del schema de Supabase.
 * Para regenerar: npm run types:gen
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type CardType = "visa" | "mastercard" | "amex" | "naranja" | "cabal" | "other";
export type Currency = "ARS" | "USD";

export interface Database {
  public: {
    Tables: {
      cards: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: CardType;
          last_four: string;
          close_date: string; // YYYY-MM-DD, el día del mes se usa para calcular períodos
          due_date: string;   // YYYY-MM-DD, el día del mes es el día de vencimiento
          /** Historial de fechas por período. Clave = period key "YYYY-MM" hasta el cual aplican (inclusive). null = todos los períodos usan close_date/due_date */
          date_overrides: Record<string, { close_date: string; due_date: string }> | null;
          color: string;
          bank: string | null;
          is_extension: boolean;
          parent_card_id: string | null;
          credit_limit: number | null;
          holder_name: string | null;
          expiry: string | null;
          titular_id: string | null;
          archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: CardType;
          last_four: string;
          close_date: string;
          due_date: string;
          date_overrides?: Record<string, { close_date: string; due_date: string }> | null;
          color?: string;
          bank?: string | null;
          is_extension?: boolean;
          parent_card_id?: string | null;
          credit_limit?: number | null;
          holder_name?: string | null;
          expiry?: string | null;
          titular_id?: string | null;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: CardType;
          last_four?: string;
          close_date?: string;
          due_date?: string;
          date_overrides?: Record<string, { close_date: string; due_date: string }> | null;
          color?: string;
          bank?: string | null;
          is_extension?: boolean;
          parent_card_id?: string | null;
          credit_limit?: number | null;
          holder_name?: string | null;
          expiry?: string | null;
          titular_id?: string | null;
          archived?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      titulares: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          emoji: string;
          color_bg: string;
          color_text: string;
          is_preset: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          emoji: string;
          color_bg: string;
          color_text: string;
          is_preset?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          emoji?: string;
          color_bg?: string;
          color_text?: string;
          is_preset?: boolean;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          card_id: string;
          category_id: string | null;
          description: string;
          total_amount: number;
          total_amount_with_interest: number | null;
          installments: number;
          installment_amount: number;
          /** Montos individuales por cuota. Clave = índice 0-based (string). null = todas usan installment_amount */
          installment_amounts: Record<string, number> | null;
          /** true = consumo fijo que se repite todos los meses (sin fin). El monto mensual va en installment_amount. */
          recurring: boolean;
          discount_percentage: number | null;
          discount_cap: number | null;
          expense_date: string;
          currency: Currency;
          /** Tipo de cambio (ARS por 1 USD) cuando currency = USD. null en ARS. */
          exchange_rate: number | null;
          /** true = TC personalizado: los cambios del TC global no lo pisan */
          exchange_rate_custom: boolean;
          notes: string | null;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          card_id: string;
          category_id?: string | null;
          description: string;
          total_amount: number;
          total_amount_with_interest?: number | null;
          installments?: number;
          installment_amount: number;
          installment_amounts?: Record<string, number> | null;
          recurring?: boolean;
          discount_percentage?: number | null;
          discount_cap?: number | null;
          expense_date: string;
          currency?: Currency;
          exchange_rate?: number | null;
          exchange_rate_custom?: boolean;
          notes?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          card_id?: string;
          category_id?: string | null;
          description?: string;
          total_amount?: number;
          total_amount_with_interest?: number | null;
          installments?: number;
          installment_amount?: number;
          installment_amounts?: Record<string, number> | null;
          recurring?: boolean;
          discount_percentage?: number | null;
          discount_cap?: number | null;
          expense_date?: string;
          currency?: Currency;
          exchange_rate?: number | null;
          exchange_rate_custom?: boolean;
          notes?: string | null;
          tags?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      loans: {
        Row: {
          id: string;
          user_id: string;
          titular_id: string | null;
          description: string;
          bank: string | null;
          color: string;
          total_amount: number;
          installment_amount: number;
          issue_date: string; // YYYY-MM-DD
          currency: Currency;
          /** Tipo de cambio (ARS por 1 USD) cuando currency = USD. null en ARS. */
          exchange_rate: number | null;
          /** true = TC propio del préstamo: los cambios del TC global no lo pisan */
          exchange_rate_custom: boolean;
          archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          titular_id?: string | null;
          description: string;
          bank?: string | null;
          color?: string;
          total_amount: number;
          installment_amount: number;
          issue_date: string;
          currency?: Currency;
          exchange_rate?: number | null;
          exchange_rate_custom?: boolean;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          titular_id?: string | null;
          description?: string;
          bank?: string | null;
          color?: string;
          total_amount?: number;
          installment_amount?: number;
          issue_date?: string;
          currency?: Currency;
          exchange_rate?: number | null;
          exchange_rate_custom?: boolean;
          archived?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      loan_installments: {
        Row: {
          id: string;
          loan_id: string;
          user_id: string;
          installment_number: number;
          amount: number;
          due_date: string; // YYYY-MM-DD
          /** TC efectivo de la cuota (ARS por 1 USD). null para préstamos en ARS. */
          exchange_rate: number | null;
          /** true = TC personalizado: los cambios globales/del préstamo no la pisan */
          exchange_rate_custom: boolean;
          paid: boolean;
          paid_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          loan_id: string;
          user_id: string;
          installment_number: number;
          amount: number;
          due_date: string;
          exchange_rate?: number | null;
          exchange_rate_custom?: boolean;
          paid?: boolean;
          paid_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          loan_id?: string;
          user_id?: string;
          installment_number?: number;
          amount?: number;
          due_date?: string;
          exchange_rate?: number | null;
          exchange_rate_custom?: boolean;
          paid?: boolean;
          paid_date?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "loan_installments_loan_id_fkey";
            columns: ["loan_id"];
            isOneToOne: false;
            referencedRelation: "loans";
            referencedColumns: ["id"];
          }
        ];
      };
      exchange_rate_history: {
        Row: {
          id: string;
          user_id: string;
          /** Tipo de cambio global (ARS por 1 USD). El vigente = fila más reciente. */
          rate: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          rate: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          rate?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      card_period_payments: {
        Row: {
          id: string;
          user_id: string;
          card_id: string;
          period_key: string; // "YYYY-MM"
          paid: boolean;
          paid_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          card_id: string;
          period_key: string;
          paid?: boolean;
          paid_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          card_id?: string;
          period_key?: string;
          paid?: boolean;
          paid_date?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "card_period_payments_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          }
        ];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          amount: number;
          period: "monthly";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          amount: number;
          period?: "monthly";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          amount?: number;
          period?: "monthly";
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      card_type: CardType;
      currency: Currency;
    };
    CompositeTypes: Record<string, never>;
  };
}

// ─── Helpers ──────────────────────────────────────────────────
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Card = Tables<"cards">;
export type CardInsert = TablesInsert<"cards">;
export type CardUpdate = TablesUpdate<"cards">;

export type Titular = Tables<"titulares">;
export type TitularInsert = TablesInsert<"titulares">;
export type TitularUpdate = TablesUpdate<"titulares">;

export type Category = Tables<"categories">;
export type CategoryInsert = TablesInsert<"categories">;
export type CategoryUpdate = TablesUpdate<"categories">;

export type Expense = Tables<"expenses">;
export type ExpenseInsert = TablesInsert<"expenses">;
export type ExpenseUpdate = TablesUpdate<"expenses">;

export type Budget = Tables<"budgets">;
export type BudgetInsert = TablesInsert<"budgets">;
export type BudgetUpdate = TablesUpdate<"budgets">;

export type Loan = Tables<"loans">;
export type LoanInsert = TablesInsert<"loans">;
export type LoanUpdate = TablesUpdate<"loans">;

export type LoanInstallment = Tables<"loan_installments">;
export type LoanInstallmentInsert = TablesInsert<"loan_installments">;
export type LoanInstallmentUpdate = TablesUpdate<"loan_installments">;

export type ExchangeRateEntry = Tables<"exchange_rate_history">;

export type CardPeriodPayment = Tables<"card_period_payments">;
export type CardPeriodPaymentInsert = TablesInsert<"card_period_payments">;
export type CardPeriodPaymentUpdate = TablesUpdate<"card_period_payments">;

export type LoanWithInstallments = Loan & { installments: LoanInstallment[] };

export type ExpenseWithCategory = Expense & { category: Category | null };
export type ExpenseWithCard = Expense & { card: Card };
export type ExpenseWithAll = Expense & { category: Category | null; card: Card };
