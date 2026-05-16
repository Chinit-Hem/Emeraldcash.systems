import { NeuLmsSkeleton } from "@/app/components/skeletons/NeuLmsSkeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      <NeuLmsSkeleton />
    </div>
  );
}
