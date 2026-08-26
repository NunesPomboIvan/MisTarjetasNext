import { TitleHeaderSkeleton, ListRowsSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-5">
      <TitleHeaderSkeleton withAction />
      <ListRowsSkeleton rows={5} />
    </div>
  );
}
