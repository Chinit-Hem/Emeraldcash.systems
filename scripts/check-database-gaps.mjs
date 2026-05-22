import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL || "";

const sql = neon(DATABASE_URL);

async function checkDatabaseGaps() {
  console.log("Checking database for ID gaps and missing vehicles...\n");
  
  // Get all vehicle IDs
  const vehicles = await sql`SELECT id FROM vehicles ORDER BY id ASC`;
  const ids = vehicles.map(v => v.id);
  
  console.log(`📊 Total vehicles in database: ${ids.length}`);
  console.log(`🔢 ID Range: ${ids[0]} to ${ids[ids.length - 1]}`);
  
  // Find gaps in sequence
  const gaps = [];
  for (let i = 0; i < ids.length - 1; i++) {
    if (ids[i + 1] - ids[i] > 1) {
      gaps.push({
        from: ids[i],
        to: ids[i + 1],
        missing: ids[i + 1] - ids[i] - 1
      });
    }
  }
  
  if (gaps.length > 0) {
    console.log(`\n⚠️  Found ${gaps.length} gap(s) in ID sequence:`);
    gaps.forEach(gap => {
      console.log(`   IDs ${gap.from + 1} to ${gap.to - 1} (${gap.missing} vehicles missing)`);
    });
  } else {
    console.log(`\n✅ No gaps in ID sequence (1 to ${ids.length})`);
  }
  
  // Check for highest ID
  const maxId = Math.max(...ids);
  console.log(`\n📈 Highest ID in database: ${maxId}`);
  
  if (maxId > 1190) {
    console.log(`   ✅ Found vehicles with IDs > 1190`);
    const extraVehicles = await sql`SELECT * FROM vehicles WHERE id > 1190 ORDER BY id ASC`;
    console.log(`   📊 Extra vehicles: ${extraVehicles.length}`);
    extraVehicles.forEach(v => {
      console.log(`      ID ${v.id}: ${v.brand} ${v.model} (${v.year})`);
    });
  } else {
    console.log(`   ⚠️  No vehicles with IDs > 1190`);
  }
  
  // Check if user mentioned 1222 vehicles
  const expectedCount = 1222;
  const actualCount = ids.length;
  const missingCount = expectedCount - actualCount;
  
  if (missingCount > 0) {
    console.log(`\n❌ MISSING VEHICLES:`);
    console.log(`   Expected: ${expectedCount} vehicles`);
    console.log(`   Actual:   ${actualCount} vehicles`);
    console.log(`   Missing:  ${missingCount} vehicles`);
    console.log(`\n💡 The CSV file only contains 1,190 vehicles.`);
    console.log(`   ${missingCount} vehicles were not included in the CSV export.`);
  }
  
  console.log("\n✅ Check complete!");
}

checkDatabaseGaps().catch(console.error);
