import { formatPrice } from "@/systems/vms/utils/vehicle-helpers";

interface VehicleStatsCardProps {
  marketPrice: number;
  price40: number;
  price70: number;
}

export function VehicleStatsCard({ marketPrice, price40, price70 }: VehicleStatsCardProps) {
  return (
    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-2xl shadow-xl p-8 border border-emerald-200">
      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Pricing Summary
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Market Price */}
        <div className="group text-center p-6 rounded-xl bg-white shadow-md hover:shadow-xl transition-all border border-emerald-100 hover:border-emerald-200">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-emerald-100 rounded-2xl group-hover:bg-emerald-200 transition-colors">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-1">Market Price</p>
          <p className="text-3xl font-black text-emerald-600">{formatPrice(marketPrice)}</p>
        </div>

        {/* DOC 40% */}
        <div className="group text-center p-6 rounded-xl bg-white shadow-md hover:shadow-xl transition-all border border-rose-100 hover:border-rose-200">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-rose-100 rounded-2xl group-hover:bg-rose-200 transition-colors">
            <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-1">DOC 40%</p>
          <p className="text-2xl font-black text-rose-600">{formatPrice(price40)}</p>
        </div>

        {/* DOC 70% */}
        <div className="group text-center p-6 rounded-xl bg-white shadow-md hover:shadow-xl transition-all border border-blue-100 hover:border-blue-200">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-2xl group-hover:bg-blue-200 transition-colors">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-1">DOC 70%</p>
          <p className="text-2xl font-black text-blue-600">{formatPrice(price70)}</p>
        </div>
      </div>
    </div>
  );
}

