import Link from "next/link";
import {
  BarChart3,
  Settings,
  HelpCircle,
  Shield,
  ChevronRight,
  Bell,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/shared/sign-out-button";

export const metadata = { title: "Más" };

export default async function MorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const userName = (user?.email?.split("@")[0] ?? "").split(/[._-]/)[0];
  const displayName = userName ? userName.charAt(0).toUpperCase() + userName.slice(1) : "Usuario";

  return (
    <div className="space-y-5">
      <h1 className="font-display text-[24px] font-bold tracking-tight text-foreground">
        Más
      </h1>

      {/* Perfil */}
      <section className="flex items-center gap-3 rounded-[18px] border border-border bg-card p-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full font-display text-[18px] font-bold text-white"
          style={{ background: "linear-gradient(135deg, #6366f1, #4338ca)" }}
        >
          {displayName.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-foreground">{displayName}</p>
          <p className="truncate text-[12px] text-muted-foreground">{user?.email}</p>
        </div>
      </section>

      {/* Lista de opciones */}
      <nav className="overflow-hidden rounded-[18px] border border-border bg-card">
        <MoreRow href="/stats" icon={<BarChart3 className="h-5 w-5" />} label="Estadísticas" />
        <MoreRow href="/settings" icon={<Settings className="h-5 w-5" />} label="Ajustes generales" />
        <MoreRow href="/settings" icon={<Bell className="h-5 w-5" />} label="Notificaciones" />
        <MoreRow href="#" icon={<Shield className="h-5 w-5" />} label="Privacidad y seguridad" />
        <MoreRow href="#" icon={<HelpCircle className="h-5 w-5" />} label="Ayuda" last />
      </nav>

      <SignOutButton />
    </div>
  );
}

function MoreRow({
  href,
  icon,
  label,
  last,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/60"
      style={{ borderBottom: last ? "none" : "1px solid var(--border)" }}
    >
      <span
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-foreground/70"
        style={{ background: "rgba(99,102,241,0.10)" }}
      >
        {icon}
      </span>
      <span className="flex-1 text-[14px] font-medium text-foreground">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
