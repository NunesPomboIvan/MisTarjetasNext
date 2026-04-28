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
          color: string;
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
          color?: string;
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
          color?: string;
          archived?: boolean;
          updated_at?: string;
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
          discount_percentage: number | null;
          discount_cap: number | null;
          expense_date: string;
          currency: Currency;
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
          discount_percentage?: number | null;
          discount_cap?: number | null;
          expense_date: string;
          currency?: Currency;
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
          discount_percentage?: number | null;
          discount_cap?: number | null;
          expense_date?: string;
          currency?: Currency;
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

export type Category = Tables<"categories">;
export type CategoryInsert = TablesInsert<"categories">;
export type CategoryUpdate = TablesUpdate<"categories">;

export type Expense = Tables<"expenses">;
export type ExpenseInsert = TablesInsert<"expenses">;
export type ExpenseUpdate = TablesUpdate<"expenses">;

export type Budget = Tables<"budgets">;
export type BudgetInsert = TablesInsert<"budgets">;
export type BudgetUpdate = TablesUpdate<"budgets">;

export type ExpenseWithCategory = Expense & { category: Category | null };
export type ExpenseWithCard = Expense & { card: Card };
export type ExpenseWithAll = Expense & { category: Category | null; card: Card };
