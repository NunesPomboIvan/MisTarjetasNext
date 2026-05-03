"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, BarChart2, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickExpenseSheet } from "@/components/expenses/quick-expense-sheet";
import type { Card, Category } from "@/lib/supabase/database.types";

const LEFT_NAV = [
  { href: "/",         label: "Inicio",      icon: Home      },
  { href: "/expenses", label: "Movimientos", icon: List      },
] as const;

const RIGHT_NAV = [
  { href: "/stats",    label: "Stats",   icon: BarChart2 },
  { href: "/settings", label: "Ajustes", icon: Settings  },
] as const;

interface BottomNavProps {
  cards: Card[];
  categories: Category[];
}

export function BottomNav({ cards, categories }: BottomNavProps) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  const cardDetailMatch = pathname?.match(/^\/cards\/([^/]+)$/);
  const defaultCardId = cardDetailMatch ? cardDetailMatch[1] : undefined;

  function NavItem({
    href,
    label,
    icon: Icon,
  }: {
    href: string;
    label: string;
    icon: typeof Home;
  }) {
    const isActive = href === "/" ? pathname === "/" : pathname?.startsWith(href);
    return (
      <Link
        href={href}
        className={cn(
          "tap-target flex flex-1 flex-col items-center justify-center gap-1 px-2 py-1 text-[10.5px] font-semibold tracking-[0.01em] transition-colors duration-200",
          isActive ? "text-primary" : "text-muted-foreground"
        )}
      >
        <span
          className={cn(
            "flex items-center justify-center rounded-2xl px-3.5 py-1.5 transition-all duration-200",
            isActive ? "bg-accent text-accent-foreground" : "bg-transparent"
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} />
        </span>
        <span style={{ opacity: isActive ? 1 : 0.85 }}>{label}</span>
      </Link>
    );
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 pb-safe"
        style={{
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          backgroundColor: "oklch(from var(--background) l c h / 0.85)",
        }}
      >
        <div className="mx-auto flex max-w-lg items-end justify-around px-3 pt-2">
          {LEFT_NAV.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}

          {/* Botón central "+" */}
          <div className="flex flex-col items-center pb-1">
            <button
              type="button"
              aria-label="Nuevo consumo"
              onClick={() => setSheetOpen(true)}
              className="relative -mt-5 flex h-14 w-14 items-center justify-center rounded-full transition-transform active:scale-95"
              style={{
                background: "linear-gradient(145deg, oklch(0.48 0.26 268) 0%, oklch(0.34 0.26 260) 100%)",
                boxShadow: [
                  "0 0 0 1.5px oklch(0.55 0.22 264 / 0.45)",
                  "0 0 0 3.5px oklch(0.55 0.22 264 / 0.12)",
                  "0 8px 24px -4px oklch(0.28 0.22 264 / 0.70)",
                  "0 2px 8px -2px oklch(0.28 0.22 264 / 0.45)",
                  "0 1px 0 rgba(255,255,255,0.20) inset",
                ].join(", "),
              }}
            >
              {/* Shine diagonal */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  background:
                    "linear-gradient(130deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 40%, transparent 60%)",
                }}
              />
              <Plus className="relative h-6 w-6 text-white" strokeWidth={2.5} />
            </button>
          </div>

          {RIGHT_NAV.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>
      </nav>

      <QuickExpenseSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        cards={cards}
        categories={categories}
        defaultCardId={defaultCardId}
      />
    </>
  );
}
