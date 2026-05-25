"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CreditCard, PieChart, MoreHorizontal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",         label: "Resumen",  icon: Home,            match: (p: string) => p === "/" || p.startsWith("/cierres") },
  { href: "/cards",    label: "Tarjetas", icon: CreditCard,      match: (p: string) => p.startsWith("/cards") },
  { href: "/expenses", label: "Consumos", icon: PieChart,        match: (p: string) => p.startsWith("/expenses") },
  { href: "/more",     label: "Más",      icon: MoreHorizontal,  match: (p: string) => p.startsWith("/more") || p.startsWith("/settings") || p.startsWith("/stats") || p.startsWith("/pagos") },
] as const;

export function BottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 pb-safe">
      <div className="pointer-events-auto mx-auto w-full max-w-lg px-3 pb-0 pt-3">
        <div className="relative">
          {/* FAB central — apenas sobresale sobre la barra */}
          <Link
            href="/expenses/new"
            aria-label="Nuevo consumo"
            className="tap-target absolute left-1/2 top-0 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-[30%] items-center justify-center rounded-[18px] text-white gradient-primary transition-transform active:scale-95"
            style={{
              boxShadow:
                "0 10px 22px -4px rgba(99,102,241,0.6), 0 0 0 1px rgba(255,255,255,0.08) inset, 0 1px 0 rgba(255,255,255,0.25) inset",
            }}
          >
            <Plus className="h-6 w-6" strokeWidth={2.6} />
          </Link>

          {/* Barra flotante glass con halo violeta exterior */}
          <div
            className="relative rounded-[24px] border border-white/[0.08] bg-card/85 px-2 py-2 backdrop-blur-xl"
            style={{
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              boxShadow:
                "0 0 36px -4px rgba(129,140,248,0.28), 0 14px 40px -12px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            {/* Resplandor violeta sobre la barra justo bajo el FAB */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-px mx-auto h-10 w-32 rounded-full"
              style={{
                left: "50%",
                transform: "translateX(-50%)",
                background:
                  "radial-gradient(ellipse at top, rgba(129,140,248,0.45) 0%, rgba(129,140,248,0.15) 45%, transparent 75%)",
                filter: "blur(8px)",
              }}
            />
            <div className="flex items-stretch justify-around gap-1">
              {/* Items izquierda */}
              {NAV_ITEMS.slice(0, 2).map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}

              {/* Spacer para el FAB flotante */}
              <div className="w-14 shrink-0" aria-hidden />

              {/* Items derecha */}
              {NAV_ITEMS.slice(2).map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </div>
          </div>
        </div>
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
        "tap-target flex flex-1 flex-col items-center justify-center gap-1 px-1 py-1 transition-colors duration-200",
        isActive ? "text-primary" : "text-muted-foreground"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
          isActive ? "bg-primary/15" : "bg-transparent"
        )}
      >
        <Icon className="h-[20px] w-[20px]" strokeWidth={isActive ? 2.4 : 1.8} />
      </div>
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
