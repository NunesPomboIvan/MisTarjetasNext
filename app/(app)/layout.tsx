import { BottomNav } from "@/components/shared/bottom-nav";
import { GlobalFab } from "@/components/shared/global-fab";
import { createClient } from "@/lib/supabase/server";
import type { Card, Category } from "@/lib/supabase/database.types";

/**
 * Layout para rutas protegidas.
 * El guard de autenticación se hace en proxy.ts.
 *
 * Carga las tarjetas y categorías del usuario una sola vez para alimentar
 * el FAB global de ingreso rápido. Los datos se cachean por request del usuario.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let cards: Card[] = [];
  let categories: Category[] = [];

  if (user) {
    const [cardsRes, catsRes] = await Promise.all([
      supabase
        .from("cards")
        .select("*")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("created_at"),
      supabase
        .from("categories")
        .select("*")
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order("is_preset", { ascending: false })
        .order("name"),
    ]);
    cards = (cardsRes.data ?? []) as Card[];
    categories = (catsRes.data ?? []) as Category[];
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-lg px-4 py-4">{children}</div>
      </main>

      <GlobalFab cards={cards} categories={categories} />
      <BottomNav />
    </div>
  );
}
