import { cn } from "@/lib/utils";

/**
 * Ghost de carga: bloque muy tenue con respiración lenta (sin barrido de
 * brillo). Se compone para armar esqueletos que respeten el layout real de
 * cada pantalla (ver components/shared/skeletons). La señal de "cargando"
 * la lleva la <LoadingBar /> fija en el top.
 */
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("skeleton-ghost rounded-md", className)}
    />
  );
}

export { Skeleton };
