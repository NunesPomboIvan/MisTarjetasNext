import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { getGlobalExchangeRate } from "@/lib/exchange/server";
import { AddFlow } from "@/components/shared/add-flow";
import { parseMercadoPagoReceipt, receiptNote } from "@/lib/receipts/mercadopago";
import type { ReceiptPrefill } from "@/components/expenses/new-expense-hero";

export const metadata = { title: "Nuevo" };

export default async function NuevoPage({
  searchParams,
}: {
  searchParams: Promise<{ card_id?: string; tipo?: string; comprobante?: string }>;
}) {
  const { card_id, tipo, comprobante } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const activeTitularId = await getActiveTitularId();

  let cardsQuery = supabase
    .from("cards")
    .select("*")
    .eq("user_id", user!.id)
    .eq("archived", false)
    .order("name");
  if (activeTitularId) cardsQuery = cardsQuery.eq("titular_id", activeTitularId);

  const [cardsResult, categoriesResult, globalRate] = await Promise.all([
    cardsQuery,
    supabase
      .from("categories")
      .select("*")
      .or(`user_id.eq.${user!.id},user_id.is.null`)
      .order("is_preset", { ascending: false })
      .order("name"),
    getGlobalExchangeRate(),
  ]);

  // Comprobante compartido desde Mercado Pago (Atajo de iOS).
  let receipt: ReceiptPrefill | undefined;
  if (comprobante) {
    const parsed = parseMercadoPagoReceipt(comprobante);
    receipt = { parsed, existing: null };
    if (parsed?.operationId) {
      const { data: existing } = await supabase
        .from("expenses")
        .select("id, description, total_amount, expense_date")
        .eq("user_id", user!.id)
        .ilike("notes", `%${receiptNote(parsed.operationId)}%`)
        .limit(1)
        .maybeSingle();
      receipt.existing = existing ?? null;
    }
  }

  return (
    <AddFlow
      initialMode={tipo === "prestamo" ? "prestamo" : "consumo"}
      cards={cardsResult.data ?? []}
      categories={categoriesResult.data ?? []}
      defaultCardId={card_id}
      globalRate={globalRate?.rate ?? null}
      receipt={receipt}
    />
  );
}
