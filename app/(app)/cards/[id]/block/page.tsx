import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WalletCard } from "@/components/cards/wallet-card";
import { BackButton } from "@/components/shared/back-button";
import { BlockCardActions } from "./actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BlockCardPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: card } = await supabase
    .from("cards")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!card) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <BackButton />
        <h1 className="text-[15px] font-semibold text-foreground">Bloquear tarjeta</h1>
        <div className="w-10" />
      </div>

      <div className="flex flex-col items-center px-4 pt-4 text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: "rgba(99,102,241,0.12)" }}
        >
          <Lock className="h-9 w-9 text-primary" />
        </div>
        <h2 className="mt-5 font-display text-[20px] font-bold text-foreground">
          Bloquear tarjeta
        </h2>
        <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-muted-foreground">
          Podés bloquear esta tarjeta temporalmente. Cuando quieras, la podés volver a activar.
        </p>
      </div>

      <WalletCard card={card} />

      <BlockCardActions cardId={id} archived={card.archived} />
    </div>
  );
}
