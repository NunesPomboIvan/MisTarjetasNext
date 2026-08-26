import {
  BackHeaderSkeleton,
  CardShellSkeleton,
  FormSkeleton,
} from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <BackHeaderSkeleton />
      <CardShellSkeleton>
        <div className="space-y-5">
          <Skeleton className="h-11 w-full rounded-[14px]" />
          <FormSkeleton fields={5} />
        </div>
      </CardShellSkeleton>
    </div>
  );
}
