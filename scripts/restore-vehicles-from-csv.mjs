// Restore vehicles data from CSV to Neon database
import { neon } from "@neondatabase/serverless";
import fs from 'fs';
import path from 'path';

const DATABASE_URL = process.env.DATABASE_URL || "";

const sql = neon(DATABASE_URL);

// CSV file path
const CSV_PATH = "C:\\Users\\Chinit Hem\\Downloads\\cleaned_vehicles_for_google_sheets.csv";

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = parseCSVLine(lines[0]);
  
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((header, index) => {
      let value = values[index] || null;
      
      // Clean up the value
      if (value === '' || value === 'NULL') {
        value = null;
      }
      
      // Convert numeric fields
      if (header === 'id' || header === 'year' || header === 'market_price') {
        value = value ? parseFloat(value) : null;
      }
      
      row[header] = value;
    });
    return row;
  });
}

async function restoreVehicles() {
  try {
    console.log("🔌 Connecting to Neon database...");
    console.log("   Project: [neon-project-id]");
    console.log("   Branch: br-still-sea-aisox7ii\n");
    
    // Test connection
    const versionResult = await sql`SELECT version()`;
    console.log("✅ Connected to PostgreSQL");
    console.log(`   Version: ${versionResult[0].version}\n`);
    
    // Read CSV file
    console.log("📁 Reading CSV file...");
    console.log(`   Path: ${CSV_PATH}`);
    
    if (!fs.existsSync(CSV_PATH)) {
      console.error(`❌ CSV file not found: ${CSV_PATH}`);
      process.exit(1);
    }
    
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const vehicles = parseCSV(csvContent);
    
    console.log(`   Found ${vehicles.length} vehicles to restore\n`);
    
    // Show sample data
    console.log("📊 Sample data (first 3 vehicles):");
    vehicles.slice(0, 3).forEach((v, i) => {
      console.log(`\n   ${i + 1}. ${v.brand} ${v.model} (${v.year})`);
      console.log(`      Category: ${v.category}`);
      console.log(`      Plate: ${v.plate}`);
      console.log(`      Price: $${v.market_price}`);
      console.log(`      Color: ${v.color}`);
      console.log(`      Image ID: ${v.image_id ? v.image_id.substring(0, 30) + '...' : 'None'}`);
    });
    
    // Check current vehicles count
    const currentCount = await sql`SELECT COUNT(*) as count FROM vehicles`;
    const existingCount = parseInt(currentCount[0].count);
    console.log(`\n📈 Current vehicles in database: ${existingCount}`);
    
    if (existingCount > 0) {
      console.log("⚠️ Database already has vehicles!");
      console.log("   Options:");
      console.log("   1. Skip restoration (keep existing data)");
      console.log("   2. Truncate and restore (replace with CSV data)");
      console.log("   3. Append (add CSV data to existing)");
      
      // For now, let's ask user or default to append
      console.log("\n📝 Proceeding with APPEND mode (adding new vehicles)...");
    }
    
    // Insert vehicles
    console.log("\n🚀 Starting data restoration...");
    console.log("   Inserting vehicles into database...\n");
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      
      try {
        // Check if vehicle with same ID already exists
        const existing = await sql`SELECT id FROM vehicles WHERE id = ${v.id}`;
        
        if (existing.length > 0) {
          // Update existing vehicle
          await sql`
            UPDATE vehicles SET
              category = ${v.category},
              brand = ${v.brand},
              model = ${v.model},
              year = ${v.year},
              plate = ${v.plate},
              market_price = ${v.market_price},
              tax_type = ${v.tax_type},
              condition = ${v.condition},
              body_type = ${v.body_type},
              color = ${v.color},
              image_id = ${v.image_id},
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ${v.id}
          `;
        } else {
          // Insert new vehicle
          await sql`
            INSERT INTO vehicles (
              id, category, brand, model, year, plate, market_price,
              tax_type, condition, body_type, color, image_id, created_at, updated_at
            ) VALUES (
              ${v.id}, ${v.category}, ${v.brand}, ${v.model}, ${v.year},
              ${v.plate}, ${v.market_price}, ${v.tax_type}, ${v.condition},
              ${v.body_type}, ${v.color}, ${v.image_id},
              ${v.created_at || new Date().toISOString()},
              ${v.updated_at || new Date().toISOString()}
            )
          `;
        }
        
        successCount++;
        
        // Progress indicator every 20 vehicles
        if ((i + 1) % 20 === 0 || i === vehicles.length - 1) {
          process.stdout.write(`\r   Progress: ${i + 1}/${vehicles.length} (${Math.round((i + 1) / vehicles.length * 100)}%)`);
        }
      } catch (error) {
        errorCount++;
        errors.push({ vehicle: v, error: error.message });
        console.error(`\n   ❌ Error with vehicle ${v.id}: ${error.message}`);
      }
    }
    
    console.log("\n\n═══════════════════════════════════════");
    console.log("📊 RESTORATION SUMMARY:");
    console.log("═══════════════════════════════════════");
    console.log(`   Total vehicles processed: ${vehicles.length}`);
    console.log(`   ✅ Successfully restored: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   Success rate: ${Math.round(successCount / vehicles.length * 100)}%`);
    
    // Final count
    const finalCount = await sql`SELECT COUNT(*) as count FROM vehicles`;
    console.log(`\n📈 Database now has: ${finalCount[0].count} vehicles`);
    
    if (errorCount > 0) {
      console.log("\n⚠️ Some vehicles failed to restore:");
      errors.slice(0, 5).forEach((e, i) => {
        console.log(`   ${i + 1}. Vehicle ${e.vehicle.id}: ${e.error}`);
      });
      if (errors.length > 5) {
        console.log(`   ... and ${errors.length - 5} more errors`);
      }
    }
    
    console.log("\n✅ Data restoration complete!");
    
  } catch (error) {
    console.error("\n❌ Restoration failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

restoreVehicles();
