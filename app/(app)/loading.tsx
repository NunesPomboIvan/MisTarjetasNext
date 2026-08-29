import { Skeleton } from "@/components/ui/skeleton";
import { LoadingBar } from "@/components/shared/skeletons";

/**
 * Fallback de la pantalla de inicio (y de cualquier ruta de (app) sin su
 * propio loading.tsx). Respeta el layout del home: saludo, carrusel de
 * tarjetas y accesos.
 */
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col space-y-6">
      <div className="flex min-h-[52px] items-center justify-between gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <LoadingBar />

      <Skeleton className="h-[200px] w-full rounded-[22px]" />

      <Skeleton className="h-24 w-full rounded-[20px]" />

      <div className="space-y-2">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-44 w-full rounded-[20px]" />
      </div>
    </div>
  );
}
