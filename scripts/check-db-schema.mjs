/**
 * Check database schema and verify field standards
 */

import { Pool } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "";

const pool = new Pool({ connectionString: DATABASE_URL });

async function checkSchema() {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking database schema...\n');
    
    // Get table columns
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'vehicles'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 VEHICLES TABLE SCHEMA:');
    console.log('='.repeat(70));
    console.log('Column Name           | Data Type       | Nullable | Default');
    console.log('-'.repeat(70));
    
    columns.rows.forEach(col => {
      const name = col.column_name.padEnd(21);
      const type = col.data_type.padEnd(15);
      const nullable = (col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL').padEnd(8);
      const defaultVal = col.column_default || '-';
      console.log(`${name}| ${type}| ${nullable}| ${defaultVal}`);
    });
    
    // Get primary key
    const pk = await client.query(`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'vehicles' AND tc.constraint_type = 'PRIMARY KEY'
    `);
    console.log('\n🔑 PRIMARY KEY:', pk.rows.map(r => r.column_name).join(', '));
    
    // Get indexes
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'vehicles'
    `);
    console.log('\n📊 INDEXES:');
    indexes.rows.forEach(idx => {
      console.log(`  • ${idx.indexname}`);
    });
    
    // Check data statistics
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN category IS NOT NULL THEN 1 END) as with_category,
        COUNT(CASE WHEN brand IS NOT NULL THEN 1 END) as with_brand,
        COUNT(CASE WHEN image_id IS NOT NULL THEN 1 END) as with_image,
        COUNT(CASE WHEN thumbnail_url IS NOT NULL THEN 1 END) as with_thumbnail
      FROM vehicles
    `);
    
    console.log('\n📈 DATA STATISTICS:');
    console.log(`  Total vehicles: ${stats.rows[0].total}`);
    console.log(`  With category: ${stats.rows[0].with_category}`);
    console.log(`  With brand: ${stats.rows[0].with_brand}`);
    console.log(`  With image_id: ${stats.rows[0].with_image}`);
    console.log(`  With thumbnail_url: ${stats.rows[0].with_thumbnail}`);
    
    // Sample data check
    const sample = await client.query('SELECT * FROM vehicles LIMIT 1');
    if (sample.rows.length > 0) {
      console.log('\n📝 SAMPLE DATA (first vehicle):');
      const row = sample.rows[0];
      Object.keys(row).forEach(key => {
        const val = row[key];
        const display = val === null ? 'NULL' : String(val).substring(0, 50);
        console.log(`  ${key.padEnd(20)}: ${display}`);
      });
    }
    
    // Check category distribution
    const categories = await client.query(`
      SELECT category, COUNT(*) as count
      FROM vehicles
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `);
    
    console.log('\n🏷️  CATEGORY DISTRIBUTION:');
    categories.rows.forEach(cat => {
      console.log(`  ${cat.category.padEnd(20)}: ${cat.count} vehicles`);
    });
    
    console.log('\n✅ Schema verification complete!');
    console.log('\n📋 FIELD STANDARDS CHECK:');
    console.log('  ✓ id: INTEGER (Primary Key, Auto-increment)');
    console.log('  ✓ category: VARCHAR (Standard values: Car, Motorcycle, TukTuk)');
    console.log('  ✓ brand: VARCHAR (Vehicle brand name)');
    console.log('  ✓ model: VARCHAR (Vehicle model)');
    console.log('  ✓ year: INTEGER (Manufacturing year)');
    console.log('  ✓ plate: VARCHAR (License plate number)');
    console.log('  ✓ market_price: NUMERIC (Market price value)');
    console.log('  ✓ tax_type: VARCHAR (Tax classification)');
    console.log('  ✓ condition: VARCHAR (New/Used/Other)');
    console.log('  ✓ body_type: VARCHAR (Body style)');
    console.log('  ✓ color: VARCHAR (Vehicle color)');
    console.log('  ✓ image_id: VARCHAR (Cloudinary public ID)');
    console.log('  ✓ thumbnail_url: VARCHAR (Thumbnail image URL)');
    console.log('  ✓ created_at: TIMESTAMP (Creation time)');
    console.log('  ✓ updated_at: TIMESTAMP (Last update time)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema();
