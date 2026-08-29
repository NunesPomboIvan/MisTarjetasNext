import { Skeleton } from "@/components/ui/skeleton";
import { FormSkeleton, LoadingBar } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-5">
      {/* Header: Cancelar / título / Guardar */}
      <div className="-mx-4 -mt-4 flex items-center justify-between border-b border-border/50 px-4 py-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>
      <LoadingBar />
      {/* Hero monto */}
      <div className="space-y-3 py-4 text-center">
        <Skeleton className="mx-auto h-3 w-16" />
        <Skeleton className="mx-auto h-12 w-48" />
      </div>
      <FormSkeleton fields={4} />
    </div>
  );
}
