import { BackHeaderSkeleton, ListRowsSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-5">
      <BackHeaderSkeleton withAction />
      <ListRowsSkeleton rows={8} avatar={false} />
    </div>
  );
}
