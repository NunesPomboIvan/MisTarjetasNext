import { ListRowsSkeleton } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-28 rounded-[20px]" />
      <ListRowsSkeleton rows={4} />
    </div>
  );
}
