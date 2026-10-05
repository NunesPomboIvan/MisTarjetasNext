"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, CalendarDays, ReceiptText, MoreHorizontal, Plus } from "lucide-react";
import { cn, formatDate, nowInArgentina } from "@/lib/utils";
import { GuardedLink } from "./guarded-link";
import { useNavigationBlocker } from "./navigation-blocker";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  match: (p: string) => boolean;
}

// El detalle de una tarjeta (/cards/:id) se abre desde el carrusel del inicio;
// el listado/gestión de tarjetas (/cards) y los préstamos viven en Cuenta.
// "Resumen" es el detalle del período actual; el resto de los períodos
// (listado y otros meses) cae en "Períodos".
function buildNavItems(currentPeriodHref: string): NavItem[] {
  return [
    { href: "/",               label: "Inicio",   icon: Home,           match: (p) => p === "/" || p.startsWith("/expenses") || (p.startsWith("/cards/") && !p.startsWith("/cards/new")) },
    { href: "/vencimientos",   label: "Períodos", icon: CalendarDays,   match: (p) => p.startsWith("/vencimientos") && p !== currentPeriodHref },
    { href: currentPeriodHref, label: "Resumen",  icon: ReceiptText,    match: (p) => p === currentPeriodHref },
    { href: "/more",           label: "Cuenta",   icon: MoreHorizontal, match: (p) => p.startsWith("/more") || p.startsWith("/prestamos") || p === "/cards" || p.startsWith("/cards/new") || p.startsWith("/settings") || p.startsWith("/stats") || p.startsWith("/pagos") || p.startsWith("/cierres") || p.startsWith("/security") || p.startsWith("/help") },
  ];
}

export function BottomNav() {
  const pathname = usePathname() ?? "/";
  const NAV_ITEMS = buildNavItems(`/vencimientos/${formatDate(nowInArgentina(), "yyyy-MM")}`);
  const router = useRouter();
  const { isBlocked, message } = useNavigationBlocker();

  // Dentro de una tarjeta concreta (detalle o subpáginas, no "nueva") el (+)
  // abre la pantalla de alta con esa tarjeta preseleccionada; en el resto, sin
  // preselección. Siempre arranca en "Consumo", con el switch a "Préstamo"
  // disponible.
  const cardMatch = pathname.match(/^\/cards\/(?!new(?:\/|$))([^/]+)/);

  function handleAdd() {
    if (isBlocked && !window.confirm(message)) return;
    router.push(cardMatch ? `/nuevo?card_id=${cardMatch[1]}` : "/nuevo");
  }

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 pb-safe">
      {/* Telón opaco detrás de toda la zona de la barra: el contenido NO se
          ve por detrás ni en el hueco bajo la barra (incluye el safe area).
          Solo el borde superior tiene unos px de fundido para no cortar seco. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-4 bottom-[calc(-1*env(safe-area-inset-bottom))]"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0px, var(--background) 22px)",
        }}
      />
      <div className="pointer-events-auto relative mx-auto w-full max-w-lg px-3 pb-3 pt-3">
        <div className="relative">
          {/* FAB central — apenas sobresale sobre la barra */}
          <button
            type="button"
            onClick={handleAdd}
            aria-label="Agregar"
            className="tap-target absolute left-1/2 top-0 z-20 flex h-[60px] w-[60px] -translate-x-1/2 -translate-y-[32%] items-center justify-center rounded-[16px] text-white backdrop-blur-xl transition-transform active:scale-95"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,85,164,0.55) 0%, rgba(0,85,164,0.22) 100%)",
              border: "1px solid rgba(0,85,164,0.55)",
              boxShadow:
                "0 0 20px -2px rgba(0,85,164,0.66), inset 0 1px 0 rgba(255,255,255,0.10)",
              backdropFilter: "blur(20px) saturate(160%)",
              WebkitBackdropFilter: "blur(20px) saturate(160%)",
            }}
          >
            <Plus className="h-5 w-5" strokeWidth={2.6} />
          </button>

          {/* Barra flotante OPACA con halo violeta exterior. Nada de
              transparencia: el contenido nunca se lee a través de la barra
              (el telón de fondo de arriba cubre el resto de la zona). */}
          <div
            data-bottom-bar
            className="relative rounded-[24px] border border-white/[0.08] bg-card px-2 py-1.5"
            style={{
              boxShadow:
                "0 0 36px -4px rgba(91,143,214,0.28), 0 14px 40px -12px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
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
                  "radial-gradient(ellipse at top, rgba(91,143,214,0.45) 0%, rgba(91,143,214,0.15) 45%, transparent 75%)",
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
  item: NavItem;
  pathname: string;
}) {
  const isActive = item.match(pathname);
  const Icon = item.icon;
  return (
    <GuardedLink
      href={item.href}
      className={cn(
        "tap-target flex flex-1 flex-col items-center justify-center gap-1 px-1 py-1 transition-colors duration-200",
        isActive ? "text-primary" : "text-muted-foreground"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
          isActive ? "bg-primary/15" : "bg-transparent"
        )}
      >
        <Icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.4 : 1.8} />
      </div>
      <span
        className={cn(
          "text-[10.5px] font-semibold tracking-[0.01em]",
          isActive ? "text-primary" : "text-muted-foreground/80"
        )}
      >
        {item.label}
      </span>
    </GuardedLink>
  );
}
