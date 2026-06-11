import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/shared/back-button";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import { ExchangeRateClient } from "./client";
import type { ExchangeRateEntry } from "@/lib/supabase/database.types";

export const metadata = { title: "Tipo de cambio" };

export default async function TipoCambioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Historial completo (el más reciente = TC vigente). Si la tabla todavía
  // no existe (migración 0011 sin aplicar), data viene null y se muestra vacío.
  const { data } = await supabase
    .from("exchange_rate_history")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const history = (data ?? []) as ExchangeRateEntry[];

  return (
    <div className="space-y-5">
      <StickyPageHeader>
        <div className="flex items-center justify-between">
          <BackButton />
          <h1 className="font-display text-[20px] font-semibold text-foreground">
            Tipo de cambio
          </h1>
          <div className="h-10 w-10" aria-hidden />
        </div>
      </StickyPageHeader>

      <ExchangeRateClient history={history} />
    </div>
  );
}
