// Test script for Neon PostgreSQL connection
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL || "";


async function testConnection() {
  console.log("Testing Neon PostgreSQL connection...");
  console.log("Database URL:", DATABASE_URL.replace(/:([^:@]+)@/, ":****@")); // Hide password
  
  try {
    const sql = neon(DATABASE_URL);
    
    // Test basic connection
    console.log("\n1. Testing basic connection...");
    const versionResult = await sql`SELECT version()`;
    console.log("✅ Connection successful!");
    console.log("PostgreSQL Version:", versionResult[0].version);
    
    // Test current time
    console.log("\n2. Testing query execution...");
    const timeResult = await sql`SELECT NOW() as current_time`;
    console.log("✅ Query successful!");
    console.log("Current database time:", timeResult[0].current_time);
    
    // Test database info
    console.log("\n3. Getting database information...");
    const dbInfo = await sql`
      SELECT 
        current_database() as database_name,
        current_user as username,
        inet_server_addr() as server_address,
        inet_server_port() as server_port
    `;
    console.log("✅ Database info retrieved!");
    console.log("Database:", dbInfo[0].database_name);
    console.log("User:", dbInfo[0].username);
    console.log("Server:", `${dbInfo[0].server_address}:${dbInfo[0].server_port}`);
    
    // List tables if any exist
    console.log("\n4. Checking existing tables...");
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    if (tables.length === 0) {
      console.log("ℹ️ No tables found in public schema");
    } else {
      console.log("✅ Found tables:", tables.map(t => t.table_name).join(", "));
    }
    
    console.log("\n✅ All tests passed! Database connection is working correctly.");
    return true;
    
  } catch (error) {
    console.error("\n❌ Connection failed!");
    console.error("Error:", error.message);
    
    if (error.message.includes("ECONNREFUSED")) {
      console.error("\nPossible causes:");
      console.error("- Database URL is incorrect");
      console.error("- Network connectivity issues");
      console.error("- Database server is down");
    } else if (error.message.includes("password")) {
      console.error("\nPossible causes:");
      console.error("- Invalid password");
      console.error("- Username is incorrect");
    } else if (error.message.includes("database")) {
      console.error("\nPossible causes:");
      console.error("- Database name is incorrect");
      console.error("- Database does not exist");
    }
    
    return false;
  }
}

// Run the test
testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
