import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL || "";

const sql = neon(DATABASE_URL);

async function testUpdateVehicle() {
  console.log("Testing vehicle update functionality...\n");
  
  const vehicleId = 862;
  
  // 1. Check if vehicle exists
  console.log(`1. Checking vehicle ${vehicleId}...`);
  const before = await sql`SELECT * FROM vehicles WHERE id = ${vehicleId}`;
  if (before.length === 0) {
    console.log(`   ❌ Vehicle ${vehicleId} not found`);
    return;
  }
  console.log(`   ✅ Vehicle found: ${before[0].brand} ${before[0].model}`);
  
  // 2. Test direct SQL update
  console.log(`\n2. Testing direct SQL update...`);
  try {
    const updateResult = await sql`
      UPDATE vehicles 
      SET brand = ${before[0].brand}, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${vehicleId}
      RETURNING *
    `;
    console.log(`   ✅ Direct update successful`);
    console.log(`   Updated vehicle: ${updateResult[0].brand} ${updateResult[0].model}`);
  } catch (error) {
    console.log(`   ❌ Direct update failed: ${error.message}`);
  }
  
  // 3. Check vehicle after update
  console.log(`\n3. Verifying vehicle after update...`);
  const after = await sql`SELECT * FROM vehicles WHERE id = ${vehicleId}`;
  console.log(`   Vehicle: ${after[0].brand} ${after[0].model}`);
  console.log(`   Updated at: ${after[0].updated_at}`);
  
  console.log("\n✅ Test complete!");
}

testUpdateVehicle().catch(console.error);
