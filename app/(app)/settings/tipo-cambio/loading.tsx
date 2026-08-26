import { Skeleton } from "@/components/ui/skeleton";
import { BackHeaderSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-5">
      <BackHeaderSkeleton />
      <Skeleton className="h-28 w-full rounded-[20px]" />
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-32 w-full rounded-[18px]" />
      </div>
    </div>
  );
}
