import { Skeleton } from "@/components/ui/skeleton";
import { TitleHeaderSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-5">
      <TitleHeaderSkeleton />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-36 w-full rounded-2xl" />
      ))}
    </div>
  );
}
