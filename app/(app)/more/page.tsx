import Link from "next/link";
import {
  BarChart3,
  Settings,
  HelpCircle,
  Shield,
  ChevronRight,
  CalendarClock,
  PieChart,
} from "lucide-react";
import { SignOutButton } from "@/components/shared/sign-out-button";
import {
  LocalUserName,
  LocalUserEmail,
  LocalUserInitial,
} from "@/components/shared/local-user";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";

export const metadata = { title: "Cuenta" };

export default function MorePage() {
  return (
    <div className="space-y-5">
      <StickyPageHeader>
        <h1 className="font-display text-[24px] font-bold tracking-tight text-foreground">
          Cuenta
        </h1>
      </StickyPageHeader>

      {/* Perfil */}
      <section className="flex items-center gap-3 rounded-[18px] border border-border bg-card p-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full font-display text-[18px] font-bold text-white"
          style={{ background: "linear-gradient(135deg, #6366f1, #4338ca)" }}
        >
          <LocalUserInitial fallback="U" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-foreground">
            <LocalUserName fallback="Usuario" />
          </p>
          <p className="truncate text-[12px] text-muted-foreground">
            <LocalUserEmail />
          </p>
        </div>
      </section>

      {/* Herramientas: cosas de los datos / finanzas */}
      <MoreSection title="Herramientas">
        <MoreRow href="/expenses" icon={<PieChart className="h-5 w-5" />} label="Consumos" />
        <MoreRow href="/cierres" icon={<CalendarClock className="h-5 w-5" />} label="Cierre de tarjetas" />
        <MoreRow href="/stats" icon={<BarChart3 className="h-5 w-5" />} label="Estadísticas" last />
      </MoreSection>

      {/* Cuenta: ajustes y ayuda */}
      <MoreSection title="General">
        <MoreRow href="/settings" icon={<Settings className="h-5 w-5" />} label="Ajustes generales" />
        <MoreRow href="/security" icon={<Shield className="h-5 w-5" />} label="Privacidad y seguridad" />
        <MoreRow href="/help" icon={<HelpCircle className="h-5 w-5" />} label="Ayuda" last />
      </MoreSection>

      <SignOutButton />
    </div>
  );
}

function MoreSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </h2>
      <nav className="overflow-hidden rounded-[18px] border border-border bg-card">
        {children}
      </nav>
    </section>
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
