import { Skeleton } from "@/components/ui/skeleton";
import { FormSkeleton, LoadingBar } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-5">
      {/* Selector segmentado Consumo | Préstamo */}
      <Skeleton className="h-11 w-full rounded-lg" />
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
