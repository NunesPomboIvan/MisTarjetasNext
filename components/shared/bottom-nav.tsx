"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CreditCard, PieChart, Calendar, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",         label: "Resumen",  icon: Home,            match: (p: string) => p === "/" },
  { href: "/cards",    label: "Tarjetas", icon: CreditCard,      match: (p: string) => p.startsWith("/cards") },
  { href: "/expenses", label: "Gastos",   icon: PieChart,        match: (p: string) => p.startsWith("/expenses") },
  { href: "/pagos",    label: "Pagos",    icon: Calendar,        match: (p: string) => p.startsWith("/pagos") },
  { href: "/more",     label: "Más",      icon: MoreHorizontal,  match: (p: string) => p.startsWith("/more") || p.startsWith("/settings") || p.startsWith("/stats") },
] as const;

export function BottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border pb-safe"
      style={{
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        backgroundColor: "rgba(255, 255, 255, 0.92)",
      }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 pt-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "tap-target flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 1.8} />
              <span className={cn(
                "text-[10.5px] font-semibold tracking-[0.01em]",
                isActive ? "text-primary" : "text-muted-foreground/80"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
