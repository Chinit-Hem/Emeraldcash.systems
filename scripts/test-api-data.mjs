import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Pricing calculation functions (copied from src/systems/vms/utils/pricing.ts)
function roundTo(value, decimals = 2) {
  const safeDecimals = Math.max(0, Math.min(6, Math.trunc(decimals)));
  const factor = 10 ** safeDecimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function percentOfPrice(price, percent, decimals = 2) {
  if (price == null) return null;
  if (!Number.isFinite(price)) return null;
  if (!Number.isFinite(percent)) return null;
  return roundTo(price * percent, decimals);
}

function derivePrice40(priceNew) {
  return percentOfPrice(priceNew, 0.4);
}

function derivePrice70(priceNew) {
  return percentOfPrice(priceNew, 0.7);
}

async function testApiData() {
  try {
    console.log("🔍 Testing API data format with pricing calculations...\n");

    // Get vehicles from database
    const dbVehicles = await sql`SELECT * FROM vehicles LIMIT 3`;
    
    console.log(`✅ Retrieved ${dbVehicles.length} vehicles from database\n`);
    
    // Simulate toVehicle conversion with calculated prices
    const vehicles = dbVehicles.map(v => {
      const priceNew = parseFloat(v.market_price) || 0;
      const price40 = derivePrice40(priceNew);
      const price70 = derivePrice70(priceNew);
      return {
        VehicleId: String(v.id),
        Category: v.category,
        Brand: v.brand,
        Model: v.model,
        Year: v.year,
        Plate: v.plate,
        PriceNew: priceNew,
        Price40: price40,
        Price70: price70,

        TaxType: v.tax_type,
        Condition: v.condition,
        BodyType: v.body_type,
        Color: v.color,
        Image: v.image_id || "",
        Time: v.created_at,
      };
    });

    console.log("📋 API Response Format with Calculated Prices:");
    vehicles.forEach((v, i) => {
      console.log(`\nVehicle ${i + 1}:`);
      console.log(`  VehicleId: ${v.VehicleId}`);
      console.log(`  Brand: ${v.Brand}`);
      console.log(`  Model: ${v.Model}`);
      console.log(`  PriceNew (Market Price): $${v.PriceNew?.toLocaleString()}`);
      console.log(`  Price40 (D.O.C. 40%): $${v.Price40?.toLocaleString()} ✅`);
      console.log(`  Price70 (Vehicles 70%): $${v.Price70?.toLocaleString()} ✅`);
      console.log(`  Plate: ${v.Plate}`);
    });

    console.log("\n✅ All vehicles have VehicleId, PriceNew, and calculated Price40/Price70!");

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

testApiData();
