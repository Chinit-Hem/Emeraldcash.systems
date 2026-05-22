// Check database status and list all tables with data
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL || "";

const sql = neon(DATABASE_URL);

async function checkDatabaseStatus() {
  try {
    console.log("🔌 Connecting to Neon database...");
    console.log("   Project: [neon-project-id]");
    console.log("   Branch: br-still-sea-aisox7ii");
    console.log("   Database: neondb\n");
    
    // Test connection
    const versionResult = await sql`SELECT version()`;
    console.log("✅ Connected successfully!");
    console.log(`   PostgreSQL: ${versionResult[0].version}\n`);
    
    // Get all tables
    console.log("📋 Finding all tables...\n");
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log(`Found ${tables.length} table(s):\n`);
    
    let totalRows = 0;
    const tableData = [];
    
    // For each table, get row count and sample data
    for (const table of tables) {
      const tableName = table.table_name;
      
      try {
        // Get row count
        const countQuery = `SELECT COUNT(*) as count FROM "${tableName}"`;
        const countResult = await sql.unsafe(countQuery);
        const rowCount = parseInt(countResult[0]?.count || 0);
        totalRows += rowCount;
        
        // Get column names
        const columns = await sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = ${tableName} AND table_schema = 'public'
          ORDER BY ordinal_position
        `;
        
        tableData.push({
          name: tableName,
          rowCount,
          columns: columns.map(c => c.column_name)
        });
        
        console.log(`📊 ${tableName}:`);
        console.log(`   Rows: ${rowCount}`);
        console.log(`   Columns: ${columns.map(c => c.column_name).join(', ')}`);
        
        // Show sample data if table has data
        if (rowCount > 0) {
          const sampleQuery = `SELECT * FROM "${tableName}" LIMIT 2`;
          const sampleData = await sql.unsafe(sampleQuery);
          console.log(`   Sample:`);
          sampleData.forEach((row, index) => {
            const preview = Object.entries(row)
              .slice(0, 3)
              .map(([key, value]) => {
                const val = value === null ? 'NULL' : 
                           typeof value === 'string' && value.length > 30 ? 
                           value.substring(0, 30) + '...' : value;
                return `${key}=${val}`;
              })
              .join(', ');
            console.log(`     Row ${index + 1}: ${preview}`);
          });
        }
        console.log('');
      } catch (tableError) {
        console.log(`⚠️ Error reading table ${tableName}: ${tableError.message}\n`);
      }
    }
    
    console.log("═══════════════════════════════════════");
    console.log(`📈 SUMMARY:`);
    console.log(`   Total Tables: ${tables.length}`);
    console.log(`   Total Rows: ${totalRows}`);
    console.log("═══════════════════════════════════════\n");
    
    // Check for vehicles table specifically
    const vehiclesTable = tableData.find(t => t.name === 'vehicles');
    if (vehiclesTable) {
      console.log("🚗 VEHICLES TABLE FOUND:");
      console.log(`   Status: ${vehiclesTable.rowCount > 0 ? '✅ Has data' : '⚠️ Empty'}`);
      console.log(`   Row count: ${vehiclesTable.rowCount}`);
      
      if (vehiclesTable.rowCount === 0) {
        console.log("\n⚠️ WARNING: Vehicles table is empty!");
        console.log("   Data restoration may be needed.");
      }
    } else {
      console.log("❌ VEHICLES TABLE NOT FOUND!");
      console.log("   Database schema may need to be created.");
    }
    
    console.log("\n✅ Database check complete!");
    
  } catch (error) {
    console.error("\n❌ Connection failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkDatabaseStatus();
