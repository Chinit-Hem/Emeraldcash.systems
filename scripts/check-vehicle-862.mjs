import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL || "";

const sql = neon(DATABASE_URL);

async function checkVehicle() {
  console.log("Checking vehicle 862...\n");
  
  // Check if vehicle 862 exists
  const result = await sql`SELECT id, brand, model, year, plate FROM vehicles WHERE id = 862`;
  console.log("Vehicle 862:", result);
  
  if (result.length === 0) {
    console.log("\n❌ Vehicle 862 NOT FOUND in database");
    
    // Check total count
    const count = await sql`SELECT COUNT(*) as count FROM vehicles`;
    console.log(`Total vehicles in database: ${count[0].count}`);
    
    // Check min and max IDs
    const range = await sql`SELECT MIN(id) as min_id, MAX(id) as max_id FROM vehicles`;
    console.log(`ID range: ${range[0].min_id} to ${range[0].max_id}`);
    
    // Show some sample IDs
    const sample = await sql`SELECT id, brand, model FROM vehicles ORDER BY id LIMIT 10`;
    console.log("\nSample vehicles:");
    sample.forEach(v => console.log(`  ID ${v.id}: ${v.brand} ${v.model}`));
  } else {
    console.log("\n✅ Vehicle 862 FOUND:");
    console.log(`  Brand: ${result[0].brand}`);
    console.log(`  Model: ${result[0].model}`);
    console.log(`  Year: ${result[0].year}`);
    console.log(`  Plate: ${result[0].plate}`);
  }
}

checkVehicle().catch(console.error);
