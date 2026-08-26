import { BackHeaderSkeleton, ListRowsSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-4">
      <BackHeaderSkeleton />
      <ListRowsSkeleton rows={6} />
    </div>
  );
}
