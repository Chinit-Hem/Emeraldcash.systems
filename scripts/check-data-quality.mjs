/**
 * Database Data Quality Check
 * Analyzes vehicles table for data standardization issues
 */

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL || "";

const sql = neon(DATABASE_URL);

console.log("=".repeat(80));
console.log("DATABASE DATA QUALITY CHECK");
console.log("=".repeat(80));
console.log();

async function checkDataQuality() {
  const issues = [];
  const warnings = [];
  
  try {
    // 1. Basic stats
    console.log("[1/10] Basic Statistics...");
    const totalCount = await sql`SELECT COUNT(*) as count FROM vehicles`;
    const total = parseInt(totalCount[0].count);
    console.log(`   Total vehicles: ${total}`);
    
    // 2. Check for NULL values in critical fields
    console.log("\n[2/10] Checking for NULL values in critical fields...");
    const nullChecks = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE category IS NULL) as null_category,
        COUNT(*) FILTER (WHERE brand IS NULL) as null_brand,
        COUNT(*) FILTER (WHERE model IS NULL) as null_model,
        COUNT(*) FILTER (WHERE year IS NULL) as null_year,
        COUNT(*) FILTER (WHERE plate IS NULL) as null_plate,
        COUNT(*) FILTER (WHERE market_price IS NULL) as null_price,
        COUNT(*) FILTER (WHERE condition IS NULL) as null_condition
      FROM vehicles
    `;
    
    const nulls = nullChecks[0];
    if (nulls.null_category > 0) issues.push(`Category: ${nulls.null_category} NULL values`);
    if (nulls.null_brand > 0) issues.push(`Brand: ${nulls.null_brand} NULL values`);
    if (nulls.null_model > 0) issues.push(`Model: ${nulls.null_model} NULL values`);
    if (nulls.null_year > 0) issues.push(`Year: ${nulls.null_year} NULL values`);
    if (nulls.null_plate > 0) issues.push(`Plate: ${nulls.null_plate} NULL values`);
    if (nulls.null_price > 0) warnings.push(`Market Price: ${nulls.null_price} NULL values`);
    if (nulls.null_condition > 0) warnings.push(`Condition: ${nulls.null_condition} NULL values`);
    
    console.log(`   NULL Categories: ${nulls.null_category}`);
    console.log(`   NULL Brands: ${nulls.null_brand}`);
    console.log(`   NULL Models: ${nulls.null_model}`);
    console.log(`   NULL Years: ${nulls.null_year}`);
    console.log(`   NULL Plates: ${nulls.null_plate}`);
    console.log(`   NULL Prices: ${nulls.null_price}`);
    console.log(`   NULL Conditions: ${nulls.null_condition}`);
    
    // 3. Check category values
    console.log("\n[3/10] Checking category values...");
    const categories = await sql`
      SELECT category, COUNT(*) as count 
      FROM vehicles 
      GROUP BY category 
      ORDER BY count DESC
    `;
    console.log("   Categories found:");
    categories.forEach(c => {
      console.log(`     - ${c.category}: ${c.count} vehicles`);
      // Check if category is standard
      const standardCategories = ['Cars', 'Motorcycles', 'Tuk Tuk', 'SUV', 'Truck', 'Van'];
      if (!standardCategories.includes(c.category)) {
        warnings.push(`Non-standard category: "${c.category}" (${c.count} vehicles)`);
      }
    });
    
    // 4. Check for duplicate plates
    console.log("\n[4/10] Checking for duplicate plate numbers...");
    const duplicates = await sql`
      SELECT plate, COUNT(*) as count
      FROM vehicles
      WHERE plate IS NOT NULL
      GROUP BY plate
      HAVING COUNT(*) > 1
    `;
    
    if (duplicates.length > 0) {
      issues.push(`Duplicate plates found: ${duplicates.length} plates`);
      console.log(`   ❌ Found ${duplicates.length} duplicate plates:`);
      duplicates.slice(0, 5).forEach(d => {
        console.log(`     - ${d.plate}: ${d.count} occurrences`);
      });
      if (duplicates.length > 5) {
        console.log(`     ... and ${duplicates.length - 5} more`);
      }
    } else {
      console.log("   ✅ No duplicate plates found");
    }
    
    // 5. Check year range
    console.log("\n[5/10] Checking year values...");
    const yearStats = await sql`
      SELECT 
        MIN(year) as min_year,
        MAX(year) as max_year,
        COUNT(*) FILTER (WHERE year < 1900) as too_old,
        COUNT(*) FILTER (WHERE year > 2030) as too_new
      FROM vehicles
    `;
    
    console.log(`   Year range: ${yearStats[0].min_year} - ${yearStats[0].max_year}`);
    if (yearStats[0].too_old > 0) {
      warnings.push(`${yearStats[0].too_old} vehicles with year < 1900`);
    }
    if (yearStats[0].too_new > 0) {
      warnings.push(`${yearStats[0].too_new} vehicles with year > 2030`);
    }
    
    // 6. Check price ranges
    console.log("\n[6/10] Checking price values...");
    const priceStats = await sql`
      SELECT 
        MIN(market_price) as min_price,
        MAX(market_price) as max_price,
        AVG(market_price)::numeric(10,2) as avg_price,
        COUNT(*) FILTER (WHERE market_price <= 0) as invalid_price,
        COUNT(*) FILTER (WHERE market_price > 1000000) as high_price
      FROM vehicles
    `;
    
    console.log(`   Price range: $${priceStats[0].min_price} - $${priceStats[0].max_price}`);
    console.log(`   Average price: $${priceStats[0].avg_price}`);
    if (priceStats[0].invalid_price > 0) {
      warnings.push(`${priceStats[0].invalid_price} vehicles with price <= 0`);
    }
    if (priceStats[0].high_price > 0) {
      warnings.push(`${priceStats[0].high_price} vehicles with price > $1,000,000`);
    }
    
    // 7. Check image_id formats
    console.log("\n[7/10] Checking image_id formats...");
    const imageStats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE image_id IS NULL OR image_id = '') as no_image,
        COUNT(*) FILTER (WHERE image_id LIKE 'http%') as full_urls,
        COUNT(*) FILTER (WHERE image_id IS NOT NULL AND image_id != '' AND image_id NOT LIKE 'http%') as public_ids
      FROM vehicles
    `;
    
    console.log(`   No image: ${imageStats[0].no_image}`);
    console.log(`   Full URLs: ${imageStats[0].full_urls}`);
    console.log(`   Public IDs: ${imageStats[0].public_ids}`);
    
    if (imageStats[0].public_ids > 0) {
      warnings.push(`${imageStats[0].public_ids} vehicles have public_id instead of full URL`);
    }
    
    // 8. Check condition values
    console.log("\n[8/10] Checking condition values...");
    const conditions = await sql`
      SELECT condition, COUNT(*) as count
      FROM vehicles
      WHERE condition IS NOT NULL
      GROUP BY condition
      ORDER BY count DESC
    `;
    
    console.log("   Conditions found:");
    conditions.forEach(c => {
      console.log(`     - ${c.condition}: ${c.count}`);
      const standardConditions = ['New', 'Used', 'Good', 'Fair', 'Poor'];
      if (!standardConditions.includes(c.condition)) {
        warnings.push(`Non-standard condition: "${c.condition}" (${c.count} vehicles)`);
      }
    });
    
    // 9. Check tax_type values
    console.log("\n[9/10] Checking tax_type values...");
    const taxTypes = await sql`
      SELECT tax_type, COUNT(*) as count
      FROM vehicles
      WHERE tax_type IS NOT NULL
      GROUP BY tax_type
      ORDER BY count DESC
    `;
    
    console.log("   Tax types found:");
    taxTypes.forEach(t => {
      console.log(`     - ${t.tax_type}: ${t.count}`);
    });
    
    // 10. Sample data check
    console.log("\n[10/10] Sample data check...");
    const samples = await sql`
      SELECT id, category, brand, model, year, plate, market_price, condition, image_id
      FROM vehicles
      ORDER BY RANDOM()
      LIMIT 3
    `;
    
    console.log("   Random samples:");
    samples.forEach((s, i) => {
      console.log(`\n   Sample ${i + 1}:`);
      console.log(`     ID: ${s.id}`);
      console.log(`     Category: ${s.category}`);
      console.log(`     Brand: ${s.brand}`);
      console.log(`     Model: ${s.model}`);
      console.log(`     Year: ${s.year}`);
      console.log(`     Plate: ${s.plate}`);
      console.log(`     Price: $${s.market_price}`);
      console.log(`     Condition: ${s.condition}`);
      console.log(`     Image: ${s.image_id ? (s.image_id.length > 50 ? s.image_id.substring(0, 50) + '...' : s.image_id) : 'NULL'}`);
    });
    
    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("DATA QUALITY SUMMARY");
    console.log("=".repeat(80));
    
    if (issues.length === 0 && warnings.length === 0) {
      console.log("✅ EXCELLENT: No data quality issues found!");
    } else {
      if (issues.length > 0) {
        console.log(`\n❌ ISSUES FOUND (${issues.length}):`);
        issues.forEach(i => console.log(`   - ${i}`));
      }
      
      if (warnings.length > 0) {
        console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
        warnings.forEach(w => console.log(`   - ${w}`));
      }
    }
    
    // Standardization recommendations
    console.log("\n" + "=".repeat(80));
    console.log("RECOMMENDATIONS");
    console.log("=".repeat(80));
    
    const recommendations = [];
    
    if (nulls.null_category > 0 || nulls.null_brand > 0 || nulls.null_model > 0) {
      recommendations.push("Fill in missing required fields (category, brand, model)");
    }
    
    if (duplicates.length > 0) {
      recommendations.push("Resolve duplicate plate numbers - should be unique");
    }
    
    if (imageStats[0].public_ids > 0) {
      recommendations.push("Convert Cloudinary public_ids to full URLs for proper image loading");
    }
    
    if (categories.some(c => !['Cars', 'Motorcycles', 'Tuk Tuk'].includes(c.category))) {
      recommendations.push("Standardize category names (Cars, Motorcycles, Tuk Tuk)");
    }
    
    if (recommendations.length === 0) {
      console.log("✅ Data is well-standardized! No recommendations.");
    } else {
      recommendations.forEach((r, i) => {
        console.log(`${i + 1}. ${r}`);
      });
    }
    
    console.log("\n" + "=".repeat(80));
    
  } catch (error) {
    console.error("❌ Error checking data quality:", error.message);
    process.exit(1);
  }
}

checkDataQuality();
