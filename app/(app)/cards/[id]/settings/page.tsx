import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WalletCard } from "@/components/cards/wallet-card";
import { BackButton } from "@/components/shared/back-button";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import { CardSettingsToggles } from "./toggles";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CardSettingsPage({ params }: PageProps) {
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
    <div className="space-y-5">
      <StickyPageHeader>
        <div className="flex items-center justify-between">
          <BackButton />
          <h1 className="text-[15px] font-semibold text-foreground">Ajustes de tarjeta</h1>
          <div className="w-10" />
        </div>
      </StickyPageHeader>

      {/* Card visual */}
      <WalletCard card={card} />

      {/* Toggles */}
      <CardSettingsToggles cardId={id} />

      {/* Menu de opciones */}
      <nav className="overflow-hidden rounded-[18px] border border-border bg-card">
        <SettingsRow
          href={`/cards/${id}/edit`}
          label="Límite de gasto"
          value={card.credit_limit != null && card.credit_limit > 0 ? `$${card.credit_limit.toLocaleString("es-AR")}` : "Sin definir"}
        />
        <SettingsRow
          href="#"
          label="Notificaciones"
          value="Configurar alertas y notificaciones"
        />
        <SettingsRow
          href={`/cards/${id}/edit`}
          label="Cambiar alias"
          value={card.name}
        />
        <SettingsRow
          href={`/cards/${id}/block`}
          label="Bloquear tarjeta"
          value="Bloquear temporalmente o cancelar"
          danger
          last
        />
      </nav>
    </div>
  );
}

function SettingsRow({
  href,
  label,
  value,
  danger,
  last,
}: {
  href: string;
  label: string;
  value: string;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/60"
      style={{ borderBottom: last ? "none" : "1px solid var(--border)" }}
    >
      <div className="min-w-0 flex-1">
        <p className={"text-[14px] font-semibold " + (danger ? "text-destructive" : "text-foreground")}>
          {label}
        </p>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground truncate">
          {value}
        </p>
      </div>
      {danger ? (
        <ChevronRight className="h-4 w-4 text-destructive/70" />
      ) : (
        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </Link>
  );
}
