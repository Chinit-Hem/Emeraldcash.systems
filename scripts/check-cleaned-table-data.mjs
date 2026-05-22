/**
 * @fileoverview Backup Table Verification Service
 *
 * WHY THIS EXISTS:
 * After data migrations or bulk cleanup operations, vehicle records can be lost
 * due to transaction failures, constraint violations, or accidental deletions.
 * This service verifies that our backup table (cleaned_vehicles_for_google_sheets)
 * contains all expected vehicle records and identifies any discrepancies with the
 * main production table (vehicles).
 *
 * This is critical for data integrity audits and disaster recovery planning.
 * If the backup has MORE records than production, we may have missing data
 * that needs to be restored.
 *
 * @module scripts/check-cleaned-table-data
 * @author Data Integrity Team
 * @version 1.0.0
 */

import "dotenv/config";
import { pathToFileURL } from "node:url";
import { neon } from "@neondatabase/serverless";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configuration constants for the backup verification service.
 * Centralizes all hardcoded values to make the script maintainable
 * and environment-specific settings easy to modify.
 * Exported for testing and external access.
 *
 * @constant {Object}
 */
export const CONFIG = {
  /** Database connection string - provided at runtime, never committed */
  DATABASE_URL: process.env.DATABASE_URL || "",

  /** Name of the backup table containing cleaned vehicle data from Google Sheets import */
  BACKUP_TABLE_NAME: process.env.BACKUP_TABLE_NAME || "cleaned_vehicles_for_google_sheets",

  /** Name of the main production vehicles table */
  PRODUCTION_TABLE_NAME: "vehicles",

  /**
   * Expected maximum vehicle ID in production before data loss occurred.
   * This represents the last known good state of the database.
   * @type {number}
   */
  EXPECTED_MAX_VEHICLE_ID: Number(process.env.EXPECTED_MAX_VEHICLE_ID || 1222),

  /**
   * Actual maximum vehicle ID found in production after suspected data loss.
   * If this is less than EXPECTED_MAX_VEHICLE_ID, we have missing records.
   * @type {number}
   */
  ACTUAL_MAX_VEHICLE_ID: Number(process.env.ACTUAL_MAX_VEHICLE_ID || 1190),

  /**
   * Number of sample records to display for manual verification.
   * @type {number}
   */
  SAMPLE_SIZE: Number(process.env.BACKUP_SAMPLE_SIZE || 3),
};

// ============================================================================
// DATABASE SERVICE MODULE
// ============================================================================

/**
 * Creates a database connection using the Neon serverless driver.
 *
 * WHY: Centralizing connection creation allows us to:
 * 1. Apply consistent SSL and security settings
 * 2. Swap database drivers easily if needed
 * 3. Add connection pooling or retry logic in one place
 *
 * @param {string} databaseUrl - The PostgreSQL connection string
 * @returns {Function} Neon SQL query function
 *
 * @example
 * const query = createDatabaseConnection(CONFIG.DATABASE_URL);
 * const results = await query`SELECT * FROM vehicles`;
 */
export function createDatabaseConnection(databaseUrl) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  return neon(databaseUrl);
}

/**
 * Retrieves the total row count for a specified table.
 *
 * WHY: Knowing table sizes is essential for:
 * 1. Detecting data loss (sudden count drops)
 * 2. Estimating query performance and resource needs
 * 3. Validating ETL operations completed successfully
 *
 * @param {Function} sqlQuery - The Neon SQL query function
 * @param {string} tableName - Name of the table to count
 * @returns {Promise<number>} Total number of rows in the table
 *
 * @example
 * const count = await getTableRowCount(sql`SELECT * FROM vehicles`, 'vehicles');
 * console.log(`Table has ${count} records`);
 */
export async function getTableRowCount(sqlQuery, tableName) {
  const countResult = await sqlQuery`SELECT COUNT(*) as total_rows FROM ${sqlQuery.unsafe(tableName)}`;
  return parseInt(countResult[0].total_rows, 10);
}

/**
 * Retrieves the minimum and maximum ID values from a table.
 *
 * WHY: ID range analysis helps us:
 * 1. Identify gaps in auto-increment sequences (sign of deletions)
 * 2. Verify all expected records exist (min/max should match expectations)
 * 3. Detect if records were inserted at unexpected ID ranges
 *
 * @param {Function} sqlQuery - The Neon SQL query function
 * @param {string} tableName - Name of the table to analyze
 * @returns {Promise<{minId: number, maxId: number}>} Object containing min and max IDs
 *
 * @example
 * const range = await getVehicleIdRange(sql, 'vehicles');
 * console.log(`IDs range from ${range.minId} to ${range.maxId}`);
 */
export async function getVehicleIdRange(sqlQuery, tableName) {
  const rangeResult = await sqlQuery`
    SELECT
      MIN(id) as minimum_id,
      MAX(id) as maximum_id
    FROM ${sqlQuery.unsafe(tableName)}
  `;

  return {
    minId: parseInt(rangeResult[0].minimum_id, 10),
    maxId: parseInt(rangeResult[0].maximum_id, 10),
  };
}

/**
 * Finds vehicle records in the backup table that are missing from production.
 *
 * WHY: After data cleanup operations, some valid records may be accidentally
 * removed. This function identifies those "orphaned" backup records so they
 * can be restored to production.
 *
 * @param {Function} sqlQuery - The Neon SQL query function
 * @param {string} backupTableName - Name of the backup table
 * @param {number} productionMaxId - Maximum ID in production (records above this are "extra")
 * @returns {Promise<Array<Object>>} Array of vehicle records missing from production
 *
 * @example
 * const missingVehicles = await findMissingVehicles(sql, 'backup_table', 1190);
 * missingVehicles.forEach(vehicle => console.log(vehicle.plate_number));
 */
export async function findMissingVehicles(sqlQuery, backupTableName, productionMaxId) {
  const extraVehicles = await sqlQuery`
    SELECT
      id,
      brand as vehicle_brand,
      model as vehicle_model,
      year as manufacture_year,
      plate as plate_number
    FROM ${sqlQuery.unsafe(backupTableName)}
    WHERE id > ${productionMaxId}
    ORDER BY id ASC
  `;

  return extraVehicles;
}

/**
 * Retrieves a sample of records for manual inspection.
 *
 * WHY: Sampling allows developers to:
 * 1. Verify data quality without loading entire tables
 * 2. Confirm field mappings are correct (brand/model/year)
 * 3. Spot-check that backup data is readable and complete
 *
 * @param {Function} sqlQuery - The Neon SQL query function
 * @param {string} tableName - Name of the table to sample
 * @param {number} sampleSize - Number of records to retrieve
 * @returns {Promise<Array<Object>>} Array of sample vehicle records
 *
 * @example
 * const samples = await getSampleVehicles(sql, 'vehicles', 5);
 * samples.forEach(v => console.log(`${v.brand} ${v.model}`));
 */
export async function getSampleVehicles(sqlQuery, tableName, sampleSize) {
  return await sqlQuery`
    SELECT
      id,
      brand as vehicle_brand,
      model as vehicle_model,
      year as manufacture_year
    FROM ${sqlQuery.unsafe(tableName)}
    LIMIT ${sampleSize}
  `;
}

// ============================================================================
// REPORTING SERVICE
// ============================================================================

/**
 * Displays a formatted comparison report between backup and production tables.
 *
 * WHY: Visual comparison makes it easy to spot discrepancies at a glance.
 * The emoji indicators and clear labeling help junior developers quickly
 * understand if there's a data integrity issue requiring action.
 *
 * @param {number} productionCount - Number of records in production table
 * @param {number} backupCount - Number of records in backup table
 * @param {number} expectedMaxId - Expected maximum vehicle ID
 * @param {number} actualMaxId - Actual maximum vehicle ID found
 * @returns {void}
 *
 * @example
 * displayComparisonReport(1190, 1222, 1222, 1190);
 * // Output: Shows that 32 vehicles are missing
 */
export function displayComparisonReport(productionCount, backupCount, expectedMaxId, actualMaxId) {
  console.log(`\n📊 TABLE COMPARISON REPORT`);
  console.log(`   Production Table: ${productionCount} vehicles`);
  console.log(`   Backup Table:     ${backupCount} vehicles`);

  const missingFromProduction = expectedMaxId - actualMaxId;

  if (backupCount > productionCount) {
    console.log(`\n✅ BACKUP HAS MORE DATA`);
    console.log(`   The backup table contains ${backupCount - productionCount} additional vehicles.`);
    console.log(`   Expected max ID: ${expectedMaxId}, Found: ${actualMaxId}`);
    console.log(`   Missing vehicles count: ${missingFromProduction}`);
    console.log(`   ⚠️  ACTION REQUIRED: Consider restoring missing vehicles to production`);
  } else if (backupCount === productionCount) {
    console.log(`\nℹ️  TABLES ARE IN SYNC`);
    console.log(`   Both tables contain the same number of vehicles.`);
    console.log(`   No restoration action needed at this time.`);
  } else {
    console.log(`\n❌ PRODUCTION HAS MORE DATA`);
    console.log(`   This is unexpected - backup should have equal or more records.`);
    console.log(`   ⚠️  ACTION REQUIRED: Investigate why backup has fewer records`);
  }
}

/**
 * Displays details of vehicles that exist in backup but not in production.
 *
 * WHY: When restoration is needed, developers need to see exactly WHICH
 * vehicles are missing so they can verify the data before re-inserting.
 * This prevents accidental restoration of corrupted or duplicate records.
 *
 * @param {Array<Object>} missingVehicles - Array of vehicle records from backup
 * @returns {void}
 *
 * @example
 * const missing = [{id: 1191, brand: 'Toyota', model: 'Camry', year: 2020, plate: 'ABC123'}];
 * displayMissingVehicles(missing);
 * // Output: Formatted list of vehicles to restore
 */
export function displayMissingVehicles(missingVehicles) {
  if (missingVehicles.length === 0) {
    console.log(`\n✅ No missing vehicles found.`);
    return;
  }

  console.log(`\n📋 MISSING VEHICLES DETECTED (${missingVehicles.length} records):`);
  console.log(`   These vehicles exist in backup but not in production:\n`);

  missingVehicles.forEach((vehicleRecord) => {
    console.log(
      `   ID ${vehicleRecord.id}: ` +
      `${vehicleRecord.vehicle_brand} ${vehicleRecord.vehicle_model} ` +
      `(${vehicleRecord.manufacture_year}) - Plate: ${vehicleRecord.plate_number}`
    );
  });

  console.log(`\n💡 NEXT STEPS:`);
  console.log(`   1. Verify these vehicles should exist in production`);
  console.log(`   2. Run restoration script to migrate them from backup`);
  console.log(`   3. Re-run this verification to confirm restoration`);
}

/**
 * Displays sample records for quick data quality verification.
 *
 * WHY: Before making restoration decisions, developers should manually
 * verify that the backup data looks correct (valid brands, reasonable years,
 * no corrupted characters). This prevents restoring bad data.
 *
 * @param {Array<Object>} sampleVehicles - Array of sample vehicle records
 * @returns {void}
 *
 * @example
 * const samples = [{id: 1, brand: 'Honda', model: 'Civic', year: 2019}];
 * displaySampleData(samples);
 * // Output: Formatted sample records
 */
export function displaySampleData(sampleVehicles) {
  console.log(`\n📋 SAMPLE DATA FROM BACKUP TABLE:`);
  console.log(`   (Showing ${sampleVehicles.length} records for verification)\n`);

  sampleVehicles.forEach((vehicleRecord) => {
    console.log(
      `   ID ${vehicleRecord.id}: ` +
      `${vehicleRecord.vehicle_brand} ${vehicleRecord.vehicle_model} ` +
      `(${vehicleRecord.manufacture_year})`
    );
  });
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

/**
 * Main verification orchestrator.
 *
 * WHY: This function coordinates the entire backup verification workflow:
 * 1. Connects to database
 * 2. Gathers statistics from both tables
 * 3. Identifies discrepancies
 * 4. Presents actionable report to developer
 *
 * This is the entry point that junior developers should run when they
 * suspect data loss after maintenance operations.
 *
 * @returns {Promise<void>}
 *
 * @example
 * // Run from command line:
 * // node scripts/check-cleaned-table-data.mjs
 *
 * // Or import and run programmatically:
 * import { runBackupVerification } from './check-cleaned-table-data.mjs';
 * await runBackupVerification();
 */
export async function runBackupVerification() {
  console.log("🔍 STARTING BACKUP TABLE VERIFICATION");
  console.log("   Purpose: Compare backup table against production to find missing vehicles\n");

  let databaseQuery;

  try {
    // Step 1: Establish database connection
    databaseQuery = createDatabaseConnection(CONFIG.DATABASE_URL);

    // Step 2: Get row counts from both tables
    const backupRowCount = await getTableRowCount(databaseQuery, CONFIG.BACKUP_TABLE_NAME);
    const productionRowCount = await getTableRowCount(databaseQuery, CONFIG.PRODUCTION_TABLE_NAME);

    console.log(`📊 BACKUP TABLE: ${CONFIG.BACKUP_TABLE_NAME}`);
    console.log(`   Total rows: ${backupRowCount}`);

    if (backupRowCount === 0) {
      console.log("\n⚠️  WARNING: Backup table is empty!");
      console.log("   No data available for restoration.");
      return;
    }

    // Step 3: Analyze ID ranges in backup table
    const backupIdRange = await getVehicleIdRange(databaseQuery, CONFIG.BACKUP_TABLE_NAME);
    console.log(`🔢 ID Range in backup: ${backupIdRange.minId} to ${backupIdRange.maxId}`);

    // Step 4: Display comparison between tables
    displayComparisonReport(
      productionRowCount,
      backupRowCount,
      CONFIG.EXPECTED_MAX_VEHICLE_ID,
      CONFIG.ACTUAL_MAX_VEHICLE_ID
    );

    // Step 5: If backup has more data, show the missing vehicles
    if (backupRowCount > productionRowCount) {
      const missingVehicles = await findMissingVehicles(
        databaseQuery,
        CONFIG.BACKUP_TABLE_NAME,
        CONFIG.ACTUAL_MAX_VEHICLE_ID
      );
      displayMissingVehicles(missingVehicles);
    }

    // Step 6: Show sample data for quality verification
    const sampleVehicles = await getSampleVehicles(
      databaseQuery,
      CONFIG.BACKUP_TABLE_NAME,
      CONFIG.SAMPLE_SIZE
    );
    displaySampleData(sampleVehicles);

    console.log("\n✅ VERIFICATION COMPLETE");
    console.log("   Review the report above and take appropriate action.");

  } catch (error) {
    console.error("\n❌ VERIFICATION FAILED");
    console.error("   Error:", error.message);
    console.error("\n🔧 TROUBLESHOOTING:");
    console.error("   1. Check database connection string");
    console.error("   2. Verify network connectivity to Neon");
    console.error("   3. Confirm table names exist in database");
    throw error;
  }
}

// Run if executed directly from command line
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runBackupVerification();
}
