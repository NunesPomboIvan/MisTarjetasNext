import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export const metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: categories }, { data: cards }] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .or(`user_id.eq.${user!.id},user_id.is.null`)
      .order("is_preset", { ascending: false })
      .order("name"),
    supabase
      .from("cards")
      .select("id, name, bank, last_four, is_extension")
      .eq("user_id", user!.id)
      .eq("archived", false)
      .order("name"),
  ]);

  return <SettingsClient categories={categories ?? []} cards={cards ?? []} />;
}
