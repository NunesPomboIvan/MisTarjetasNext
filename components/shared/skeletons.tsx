import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Piezas de esqueleto reutilizables para los `loading.tsx` de cada ruta.
 * La idea es que cada pantalla muestre un esqueleto acorde a su layout real
 * (header + lista, header + formulario, etc.), no un spinner genérico.
 */

/** Header compacto: botón "atrás" + título (mismo lugar que StickyPageHeader). */
export function BackHeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      {withAction && <Skeleton className="h-10 w-10 shrink-0 rounded-full" />}
    </div>
  );
}

/** Header con título grande (Tarjetas, Cuenta, Ajustes…). */
export function TitleHeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3.5 w-24" />
      </div>
      {withAction && <Skeleton className="h-10 w-24 rounded-full" />}
    </div>
  );
}

/** Barra de búsqueda tipo pill. */
export function SearchBarSkeleton() {
  return <Skeleton className="h-11 w-full rounded-full" />;
}

/** Lista de filas (consumos, tarjetas, cuotas, pagos…). */
export function ListRowsSkeleton({
  rows = 6,
  avatar = true,
  className,
}: {
  rows?: number;
  avatar?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
        >
          {avatar && <Skeleton className="h-12 w-12 shrink-0 rounded-[15px]" />}
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Formulario: pares label + campo, y un botón al final. */
export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="space-y-5">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}

/** Contenedor tipo tarjeta (rounded-2xl border p-5) para formularios. */
export function CardShellSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">{children}</div>
  );
}

/** Bloque de gráfico / panel de estadísticas. */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 rounded-2xl border border-border bg-card p-4", className)}>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

/** Tarjeta-imagen grande (detalle de tarjeta / préstamo). */
export function HeroCardSkeleton() {
  return <Skeleton className="h-48 w-full rounded-[22px]" />;
}
