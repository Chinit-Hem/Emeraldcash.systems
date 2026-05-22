/**
 * Diagnostic test for 502 errors in vehicle updates
 */

import { Pool } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "";

const pool = new Pool({ connectionString: DATABASE_URL });

async function diagnose502() {
  console.log('🔍 Diagnosing 502 Error in Vehicle Update\n');
  console.log('=' .repeat(60));
  
  const client = await pool.connect();
  
  try {
    // Test 1: Check if vehicle exists
    console.log('\n📋 TEST 1: Check vehicle ID=3');
    console.log('-'.repeat(60));
    const vehicleResult = await client.query(
      'SELECT id, category, brand, model, plate, image_id FROM vehicles WHERE id = 3'
    );
    
    if (vehicleResult.rows.length === 0) {
      console.log('❌ Vehicle ID=3 not found');
      return;
    }
    
    const vehicle = vehicleResult.rows[0];
    console.log('✅ Vehicle found:', vehicle);
    
    // Test 2: Test direct database update
    console.log('\n📋 TEST 2: Direct database update');
    console.log('-'.repeat(60));
    try {
      const updateResult = await client.query(`
        UPDATE vehicles 
        SET brand = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, brand
      `, ['DIAGNOSTIC_TEST', 3]);
      
      if (updateResult.rows.length > 0) {
        console.log('✅ Direct DB update successful:', updateResult.rows[0]);
        
        // Revert
        await client.query(`
          UPDATE vehicles 
          SET brand = $1, updated_at = NOW()
          WHERE id = $2
        `, [vehicle.brand, 3]);
        console.log('   Reverted brand back to:', vehicle.brand);
      }
    } catch (error) {
      console.log('❌ Direct DB update failed:', error.message);
    }
    
    // Test 3: Check Cloudinary config
    console.log('\n📋 TEST 3: Check Cloudinary configuration');
    console.log('-'.repeat(60));
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    console.log('Cloudinary Config:');
    console.log('  CLOUDINARY_CLOUD_NAME:', cloudName ? '✅ Set' : '❌ Missing');
    console.log('  CLOUDINARY_API_KEY:', apiKey ? '✅ Set' : '❌ Missing');
    console.log('  CLOUDINARY_API_SECRET:', apiSecret ? '✅ Set' : '❌ Missing');
    
    if (!cloudName || !apiKey || !apiSecret) {
      console.log('\n⚠️  WARNING: Cloudinary config incomplete - image uploads will fail with 502');
    }
    
    // Test 4: Check for common 502 causes
    console.log('\n📋 TEST 4: Check for common 502 error causes');
    console.log('-'.repeat(60));
    
    // Check if vehicle has problematic image_id
    if (vehicle.image_id) {
      console.log('Vehicle has image_id:', vehicle.image_id.substring(0, 100) + '...');
      
      if (vehicle.image_id.startsWith('data:image/')) {
        console.log('⚠️  WARNING: image_id contains base64 data URL - this can cause 502 errors');
        console.log('   The API should upload this to Cloudinary and store the URL, not the base64 data');
      }
      
      if (vehicle.image_id.length > 1000) {
        console.log('⚠️  WARNING: image_id is very long (' + vehicle.image_id.length + ' chars) - this can cause issues');
      }
    } else {
      console.log('Vehicle has no image_id (null or empty)');
    }
    
    // Test 5: Check database connection pool
    console.log('\n📋 TEST 5: Database connection pool status');
    console.log('-'.repeat(60));
    console.log('Pool total count:', pool.totalCount);
    console.log('Pool idle count:', pool.idleCount);
    console.log('Pool waiting count:', pool.waitingCount);
    
  } finally {
    client.release();
    await pool.end();
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Diagnosis Summary');
  console.log('='.repeat(60));
  console.log('Common causes of 502 errors:');
  console.log('  1. Cloudinary upload timeout (large images)');
  console.log('  2. Database connection timeout');
  console.log('  3. Missing Cloudinary configuration');
  console.log('  4. Base64 image data stored in image_id field');
  console.log('  5. Server-side exception not caught');
  console.log('');
  console.log('Next steps:');
  console.log('  - Check server console logs during update attempt');
  console.log('  - Test with a vehicle that has no image');
  console.log('  - Verify Cloudinary credentials are correct');
}

diagnose502().catch(console.error);
