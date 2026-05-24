import { sql } from "@/lib/db";
import { formatPrice, getVehicleThumbnailUrl } from "@/systems/vms/utils/vehicle-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Vehicle type definition based on the vehicles table schema
interface Vehicle {
  id: number;
  category: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  market_price: number;
  tax_type: string | null;
  condition: string;
  body_type: string | null;
  color: string | null;
  image_id: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}



// Server Component - fetches data directly from Neon PostgreSQL
// This is optimized for Vercel deployment using the @neondatabase/serverless driver
export default async function VehiclesDbPage() {
  let vehicles: Vehicle[] = [];
  let error: string | null = null;
  let isLoading = true;

  try {
    // Test the database connection first
    const testResult = await sql`SELECT 1 as test`;
    if (!testResult || testResult.length === 0) {
      throw new Error("Database connection test failed");
    }

    // Fetch all vehicles from the vehicles table
    // This contains the real 1,190 vehicles from Google Sheets
    const result = await sql`
      SELECT 
        id,
        category,
        brand,
        model,
        year,
        plate,
        market_price,
        tax_type,
        condition,
        body_type,
        color,
        image_id,
        thumbnail_url,
        created_at,
        updated_at
      FROM vehicles
      ORDER BY COALESCE(updated_at, created_at) DESC NULLS LAST, id DESC
    `;


    
    // Cast the result to Vehicle[]
    vehicles = result as unknown as Vehicle[];
    isLoading = false;
  } catch (err) {
    console.error("Error fetching vehicles:", err);
    error = err instanceof Error ? err.message : "Failed to fetch vehicles";
    isLoading = false;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
              Vehicles Database (Server Component)
            </h1>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <span className="ml-3 text-slate-600 dark:text-slate-400">Loading vehicles...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
              Vehicles Database (Server Component)
            </h1>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <h3 className="text-red-800 dark:text-red-300 font-semibold mb-2">Error Loading Vehicles</h3>
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
            Vehicles Database (Server Component)
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Total: <span className="font-semibold text-emerald-600">{vehicles.length.toLocaleString()}</span> vehicles from Neon PostgreSQL
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
            Fetched directly from database using @neondatabase/serverless
          </p>
        </div>

        {/* Responsive Table Container */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <table className="w-full text-sm">
            {/* Table Header */}
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  ID
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Image
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Category
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Brand
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Model
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Year
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Plate
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Market Price
                </th>

                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Condition
                </th>

              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {vehicles.map((vehicle: Vehicle) => (
                <tr
                  key={vehicle.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {vehicle.id}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {(() => {
                      const imageUrl =
                        getVehicleThumbnailUrl(vehicle.image_id, "w96-h96") ||
                        getVehicleThumbnailUrl(vehicle.thumbnail_url, "w96-h96");
                      return imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={`${vehicle.brand} ${vehicle.model}`}
                          className="h-12 w-12 rounded-lg object-cover bg-slate-100 dark:bg-slate-700"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-400">
                          No image
                        </div>
                      );
                    })()}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {vehicle.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {vehicle.brand}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {vehicle.model}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {vehicle.year}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {vehicle.plate}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {formatPrice(vehicle.market_price)}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      vehicle.condition === 'New' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {vehicle.condition}
                    </span>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {vehicles.length === 0 && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            No vehicles found in the database.
          </div>
        )}
      </div>
    </div>
  );
}
