import {
  BackHeaderSkeleton,
  CardShellSkeleton,
  FormSkeleton,
} from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-4">
      <BackHeaderSkeleton />
      <CardShellSkeleton>
        <FormSkeleton fields={6} />
      </CardShellSkeleton>
    </div>
  );
}
