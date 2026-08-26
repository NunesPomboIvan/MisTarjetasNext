import { cn } from "@/lib/utils";

/**
 * Bloque de carga con animación de pulso. Se compone para armar esqueletos
 * que respeten el layout real de cada pantalla (ver components/shared/skeletons).
 */
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted/60", className)}
    />
  );
}

export { Skeleton };
