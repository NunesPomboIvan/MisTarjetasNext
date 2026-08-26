import { Skeleton } from "@/components/ui/skeleton";
import { BackHeaderSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-5">
      <BackHeaderSkeleton />
      <Skeleton className="h-4 w-3/4" />
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}
