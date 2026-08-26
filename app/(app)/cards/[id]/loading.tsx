import {
  BackHeaderSkeleton,
  HeroCardSkeleton,
  ListRowsSkeleton,
} from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <BackHeaderSkeleton withAction />
      <HeroCardSkeleton />
      <Skeleton className="h-14 w-full rounded-2xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <ListRowsSkeleton rows={5} />
      </div>
    </div>
  );
}
