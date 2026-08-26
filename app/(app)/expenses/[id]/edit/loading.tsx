import { Skeleton } from "@/components/ui/skeleton";
import { BackHeaderSkeleton, FormSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-5">
      <BackHeaderSkeleton />
      <Skeleton className="h-10 w-full rounded-full" />
      <FormSkeleton fields={5} />
    </div>
  );
}
