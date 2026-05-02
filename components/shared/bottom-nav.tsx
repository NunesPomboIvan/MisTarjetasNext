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
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        backgroundColor: "oklch(from var(--background) l c h / 0.85)",
      }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-3 pt-2.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "tap-target flex flex-col items-center justify-center gap-1 px-2.5 py-1 text-[10.5px] font-semibold tracking-[0.01em] transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-2xl px-3.5 py-1.5 transition-all duration-200",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "bg-transparent"
                )}
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
              </span>
              <span style={{ opacity: isActive ? 1 : 0.85 }}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
