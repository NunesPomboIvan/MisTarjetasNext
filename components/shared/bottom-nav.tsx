"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CreditCard, List, BarChart2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",         label: "Inicio",      icon: Home        },
  { href: "/cards",    label: "Tarjetas",    icon: CreditCard  },
  { href: "/expenses", label: "Consumos",    icon: List        },
  { href: "/stats",    label: "Stats",       icon: BarChart2   },
  { href: "/settings", label: "Ajustes",     icon: Settings    },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 pb-safe"
      style={{
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        backgroundColor: "oklch(from var(--background) l c h / 0.85)",
      }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 pt-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "tap-target flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-150",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-lg p-1.5 transition-spring",
                  isActive && "gradient-primary shadow-brand scale-110"
                )}
              >
                <Icon
                  className={cn("h-5 w-5", isActive && "text-white")}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </span>
              <span className={cn(isActive && "font-semibold")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
