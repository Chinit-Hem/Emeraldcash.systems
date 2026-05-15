 "use client";

import { useAuthUser } from '@/app/components/AuthContext';

export default function CleanedVehiclesPage() {
  const authUser = useAuthUser();

  if (!authUser) {
    return <div>Please log in to view cleaned vehicles.</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Cleaned Vehicles</h1>
      <p className="text-lg text-slate-600">Your cleaned vehicles will appear here.</p>
    </div>
  );
}

