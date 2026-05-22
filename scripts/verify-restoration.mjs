// Verify data restoration and check actual database state
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL || "";

const sql = neon(DATABASE_URL);

async function verifyRestoration() {
  try {
    console.log("🔍 Verifying data restoration...\n");
    
    // Test connection
    const versionResult = await sql`SELECT version()`;
    console.log("✅ Connected to PostgreSQL");
    console.log(`   Version: ${versionResult[0].version}\n`);
    
    // Check vehicles table
    console.log("📊 Checking vehicles table...");
    const countResult = await sql`SELECT COUNT(*) as count FROM vehicles`;
    const vehicleCount = parseInt(countResult[0].count);
    console.log(`   Total vehicles: ${vehicleCount}`);
    
    if (vehicleCount === 0) {
      console.log("\n⚠️ WARNING: Vehicles table is empty!");
      console.log("   The restoration may not have completed successfully.\n");
      
      // Check if there were any errors during insertion
      console.log("🔍 Checking for potential issues...");
      
      // Try a simple insert test
      console.log("\n🧪 Testing insert capability...");
      try {
        await sql`
          INSERT INTO vehicles (id, category, brand, model, year, plate, market_price, created_at, updated_at)
          VALUES (99999, 'Test', 'TestBrand', 'TestModel', 2024, 'TEST-123', 1000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        console.log("   ✅ Test insert successful");
        
        // Clean up test data
        await sql`DELETE FROM vehicles WHERE id = 99999`;
        console.log("   ✅ Test data cleaned up");
        console.log("\n💡 The database is writable. The restoration may need to be re-run.");
      } catch (insertError) {
        console.error("   ❌ Test insert failed:", insertError.message);
      }
    } else {
      console.log(`\n✅ SUCCESS: ${vehicleCount} vehicles found in database!`);
      
      // Show sample data
      const sample = await sql`SELECT * FROM vehicles LIMIT 3`;
      console.log("\n📋 Sample vehicles:");
      sample.forEach((v, i) => {
        console.log(`\n   ${i + 1}. ${v.brand} ${v.model} (${v.year})`);
        console.log(`      Category: ${v.category}`);
        console.log(`      Plate: ${v.plate}`);
        console.log(`      Price: $${v.market_price}`);
      });
      
      // Show statistics
      const stats = await sql`
        SELECT 
          category,
          COUNT(*) as count
        FROM vehicles
        GROUP BY category
        ORDER BY count DESC
      `;
      console.log("\n📊 Vehicles by category:");
      stats.forEach(s => {
        console.log(`   ${s.category}: ${s.count}`);
      });
    }
    
    console.log("\n✅ Verification complete!");
    
  } catch (error) {
    console.error("\n❌ Verification failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verifyRestoration();
