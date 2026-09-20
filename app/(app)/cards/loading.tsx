import { Skeleton } from "@/components/ui/skeleton";
import { TitleHeaderSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-5">
      <TitleHeaderSkeleton withAction />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-[22px]" />
        ))}
      </div>
    </div>
  );
}
