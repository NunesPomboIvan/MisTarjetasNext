import { TitleHeaderSkeleton, ChartSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-4">
      <TitleHeaderSkeleton />
      <ChartSkeleton />
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
  );
}
