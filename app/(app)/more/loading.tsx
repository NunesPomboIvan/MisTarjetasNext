import { Skeleton } from "@/components/ui/skeleton";
import { TitleHeaderSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-5">
      <TitleHeaderSkeleton />
      <Skeleton className="h-20 w-full rounded-[18px]" />
      <Skeleton className="h-28 w-full rounded-[18px]" />
      <Skeleton className="h-36 w-full rounded-[18px]" />
    </div>
  );
}
