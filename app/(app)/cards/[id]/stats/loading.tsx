import { BackHeaderSkeleton, ChartSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-4">
      <BackHeaderSkeleton />
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
  );
}
