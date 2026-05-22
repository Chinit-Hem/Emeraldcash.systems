// Verify database connection with provided URL
import { neon } from "@neondatabase/serverless";

// Your provided database URL
const DATABASE_URL = process.env.DATABASE_URL || "";

const sql = neon(DATABASE_URL);

async function verifyConnection() {
  try {
    console.log("🔌 Connecting to Neon PostgreSQL database...");
    
    // Test basic connection
    const versionResult = await sql`SELECT version()`;
    console.log("✅ Connected successfully!");
    console.log(`📊 PostgreSQL Version: ${versionResult[0].version}`);
    
    // Check database health
    const healthCheck = await sql`SELECT 1 as health`;
    console.log("✅ Database health check passed");
    
    // List tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log("\n📋 Tables in database:");
    if (tables.length === 0) {
      console.log("   (No tables found)");
    } else {
      tables.forEach(t => console.log(`   - ${t.table_name}`));
    }
    
    // If vehicles table exists, show its columns
    const vehiclesTable = tables.find(t => t.table_name === 'vehicles');
    if (vehiclesTable) {
      const columns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND table_schema = 'public'
      `;
      console.log("\n🚗 Vehicles table columns:");
      columns.forEach(c => {
        console.log(`   - ${c.column_name}: ${c.data_type}`);
      });
      
      // Count rows
      const countResult = await sql`SELECT COUNT(*) as count FROM vehicles`;
      console.log(`\n📈 Total vehicles: ${countResult[0].count}`);
    }
    
    console.log("\n✅ Database connection verification complete!");
    
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    process.exit(1);
  }
}

verifyConnection();
