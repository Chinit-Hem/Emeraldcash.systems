/**
 * Update all code references from cleaned_vehicles_for_google_sheets to vehicles
 * Run this after running rename-vehicle-table.mjs
 */

import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const OLD_NAME = "cleaned_vehicles_for_google_sheets";
const NEW_NAME = "vehicles";

const FILES_TO_UPDATE = [
  "src/systems/vms/services/VehicleService.ts",
  "src/app/api/upload/route.ts",
  "src/lib/db.ts",
];

console.log("=".repeat(60));
console.log("UPDATE CODE REFERENCES");
console.log(`"${OLD_NAME}" → "${NEW_NAME}"`);
console.log("=".repeat(60));
console.log();

async function updateFile(filePath) {
  try {
    const fullPath = join(process.cwd(), filePath);
    const content = await readFile(fullPath, "utf-8");
    
    // Check if file contains old name
    if (!content.includes(OLD_NAME)) {
      console.log(`⚠️  ${filePath} - No references found (may already be updated)`);
      return { file: filePath, updated: false, reason: "No references found" };
    }
    
    // Replace all occurrences
    const updatedContent = content.replace(new RegExp(OLD_NAME, "g"), NEW_NAME);
    
    // Write back
    await writeFile(fullPath, updatedContent, "utf-8");
    
    // Count replacements
    const count = (content.match(new RegExp(OLD_NAME, "g")) || []).length;
    console.log(`✅ ${filePath} - Updated ${count} reference(s)`);
    
    return { file: filePath, updated: true, count };
  } catch (error) {
    console.error(`❌ ${filePath} - Error: ${error.message}`);
    return { file: filePath, updated: false, error: error.message };
  }
}

async function updateAllFiles() {
  console.log("Updating files...\n");
  
  const results = [];
  for (const file of FILES_TO_UPDATE) {
    const result = await updateFile(file);
    results.push(result);
  }
  
  console.log("\n" + "=".repeat(60));
  const updated = results.filter(r => r.updated);
  const skipped = results.filter(r => !r.updated && !r.error);
  const errors = results.filter(r => r.error);
  
  console.log(`✅ Updated: ${updated.length} file(s)`);
  console.log(`⚠️  Skipped: ${skipped.length} file(s)`);
  console.log(`❌ Errors: ${errors.length} file(s)`);
  
  if (errors.length > 0) {
    console.log("\nErrors:");
    errors.forEach(e => console.log(`  - ${e.file}: ${e.error}`));
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("NEXT STEPS:");
  console.log("1. Restart your Next.js development server");
  console.log("2. Test the application to ensure everything works");
  console.log("3. Run: node scripts/verify-db-connection.mjs");
  console.log("=".repeat(60));
}

updateAllFiles().catch(err => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
