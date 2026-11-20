import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";
import { cookies } from "next/headers";
import { HOME_CARD_ORDER_COOKIE, parseHomeCardOrder } from "@/lib/home-card-order";
import { getMpCommissions } from "@/lib/commissions/server";

export const metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: categories }, { data: cards }, mpCommissions] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .or(`user_id.eq.${user!.id},user_id.is.null`)
      .order("is_preset", { ascending: false })
      .order("name"),
    supabase
      .from("cards")
      .select("id, name, bank, last_four, is_extension, type")
      .eq("user_id", user!.id)
      .eq("archived", false)
      .order("name"),
    getMpCommissions(),
  ]);

  const cookieStore = await cookies();

  return (
    <SettingsClient
      categories={categories ?? []}
      cards={cards ?? []}
      homeCardOrder={parseHomeCardOrder(cookieStore.get(HOME_CARD_ORDER_COOKIE)?.value)}
      mpCommissions={mpCommissions}
    />
  );
}
