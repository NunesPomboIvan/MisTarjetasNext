"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CreditCard, PieChart, MoreHorizontal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",         label: "Resumen",  icon: Home,            match: (p: string) => p === "/" },
  { href: "/cards",    label: "Tarjetas", icon: CreditCard,      match: (p: string) => p.startsWith("/cards") },
  { href: "/expenses", label: "Gastos",   icon: PieChart,        match: (p: string) => p.startsWith("/expenses") },
  { href: "/more",     label: "Más",      icon: MoreHorizontal,  match: (p: string) => p.startsWith("/more") || p.startsWith("/settings") || p.startsWith("/stats") || p.startsWith("/pagos") },
] as const;

export function BottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border pb-safe backdrop-blur-xl bg-card/90 supports-backdrop-filter:bg-card/75"
      style={{
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
      }}
    >
      <div className="relative mx-auto flex max-w-lg items-stretch justify-around px-2 pt-2">
        {/* Items izquierda */}
        {NAV_ITEMS.slice(0, 2).map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        {/* FAB central */}
        <div className="relative flex flex-1 items-center justify-center">
          <Link
            href="/expenses/new"
            aria-label="Nuevo consumo"
            className="tap-target -mt-7 flex h-14 w-14 items-center justify-center rounded-full text-white gradient-primary shadow-brand-glow ring-4 ring-card transition-transform active:scale-95"
          >
            <Plus className="h-6 w-6" strokeWidth={2.6} />
          </Link>
        </div>

        {/* Items derecha */}
        {NAV_ITEMS.slice(2).map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}

function NavLink({
  item,
  pathname,
}: {
  item: (typeof NAV_ITEMS)[number];
  pathname: string;
}) {
  const isActive = item.match(pathname);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "tap-target flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors duration-200",
        isActive ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 1.8} />
      <span
        className={cn(
          "text-[10.5px] font-semibold tracking-[0.01em]",
          isActive ? "text-primary" : "text-muted-foreground/80"
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}
