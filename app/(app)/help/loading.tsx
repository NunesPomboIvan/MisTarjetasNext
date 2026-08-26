import { Skeleton } from "@/components/ui/skeleton";
import { BackHeaderSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-5">
      <BackHeaderSkeleton />
      <Skeleton className="h-32 w-full rounded-[20px]" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-[18px]" />
      ))}
    </div>
  );
}
