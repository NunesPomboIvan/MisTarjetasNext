import {
  BackHeaderSkeleton,
  SearchBarSkeleton,
  ListRowsSkeleton,
} from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-4">
      <BackHeaderSkeleton withAction />
      <SearchBarSkeleton />
      <ListRowsSkeleton rows={8} />
    </div>
  );
}
