import { Skeleton } from "@/components/ui/skeleton";
import { BackHeaderSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-5">
      <BackHeaderSkeleton />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}
