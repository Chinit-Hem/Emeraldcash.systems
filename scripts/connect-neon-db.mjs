// Connect to your Neon database
// Project: [neon-project-id]
// Branch: [neon-branch-id]
// Database: neondb
import { neon } from "@neondatabase/serverless";

// Your Neon database connection
// Get your connection string from: https://console.neon.tech/app/projects/[neon-project-id]/branches/[neon-branch-id]/tables?database=neondb
// Click "Connect" button and copy the connection string

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log(`
❌ DATABASE_URL not set!

To get your connection string:
1. Go to: https://console.neon.tech/app/projects/[neon-project-id]/branches/[neon-branch-id]/tables?database=neondb
2. Click the "Connect" button
3. Copy the connection string
4. Set it as environment variable:

   $env:DATABASE_URL="postgresql://[user]:[password]@[host]/neondb?sslmode=require"

Then run this script again.
  `);
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function testConnection() {
  try {
    console.log("🔌 Connecting to Neon database...");
    console.log(`   Project: [neon-project-id]`);
    console.log(`   Branch: [neon-branch-id]`);
    console.log(`   Database: neondb\n`);
    
    // Test connection
    const result = await sql`SELECT version()`;
    console.log("✅ Connected successfully!");
    console.log(`   PostgreSQL: ${result[0].version}\n`);
    
    // List all tables
    console.log("📋 Tables in database:");
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    if (tables.length === 0) {
      console.log("   (No tables found)");
    } else {
      tables.forEach((t, i) => {
        console.log(`   ${i + 1}. ${t.table_name}`);
      });
    }
    
    // Check if vehicles table exists
    const hasVehicles = tables.some(t => t.table_name === 'vehicles');
    if (hasVehicles) {
      console.log("\n🚗 Vehicles table found!");
      const count = await sql`SELECT COUNT(*) as count FROM vehicles`;
      console.log(`   Total vehicles: ${count[0].count}`);
      
      // Show sample data
      const vehicles = await sql`SELECT * FROM vehicles LIMIT 3`;
      if (vehicles.length > 0) {
        console.log("\n📊 Sample vehicles:");
        vehicles.forEach((v, i) => {
          console.log(`\n   ${i + 1}. ${v.vehicle_id}: ${v.brand} ${v.model} (${v.category})`);
          if (v.image) {
            console.log(`      Image: ${v.image.substring(0, 60)}...`);
          } else {
            console.log(`      Image: (none)`);
          }
        });
      }
    }
    
    console.log("\n✅ Database connection test complete!");
    
  } catch (error) {
    console.error("\n❌ Connection failed:", error.message);
    console.log("\n💡 Make sure your DATABASE_URL is correct.");
    console.log("   Get it from: https://console.neon.tech/app/projects/[neon-project-id]/branches/[neon-branch-id]/tables?database=neondb");
    process.exit(1);
  }
}

testConnection();
