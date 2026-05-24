import { useRouter } from "next/navigation";

interface VehicleHeaderProps {
  vehicleId: string;
  brand: string;
  model: string;
  onEdit: () => void;
  onDelete: () => void;
}

// Custom button styles instead of shadcn

interface VehicleHeaderProps {
  vehicleId: string;
  brand: string;
  model: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function VehicleHeader({ vehicleId, brand, model, onEdit, onDelete }: VehicleHeaderProps) {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Back & Breadcrumb */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
              aria-label="Go back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Vehicle Details</p>
              <h1 className="text-2xl lg:text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                {brand} {model}
              </h1>
              <p className="text-sm text-slate-500">ID: #{vehicleId}</p>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onDelete}
              className="font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all bg-rose-500 hover:bg-rose-600 text-white"
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
            <button
              onClick={onEdit}
              className="font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.5h3m1.5-3l-3 3-3-3" />
              </svg>
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

