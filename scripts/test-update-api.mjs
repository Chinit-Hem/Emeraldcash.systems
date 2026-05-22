/**
 * Test vehicle update API to diagnose 502 errors
 */

import { Pool } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "";

const pool = new Pool({ connectionString: DATABASE_URL });

const BASE_URL = 'http://localhost:3000';

async function testUpdateAPI() {
  console.log('🔍 Testing Vehicle Update API\n');
  
  // First, get a real vehicle ID to test with
  const client = await pool.connect();
  let testVehicleId = null;
  
  try {
    // Get a test vehicle
    const vehicleResult = await client.query(
      'SELECT id, category, brand, model, plate FROM vehicles LIMIT 1'
    );
    
    if (vehicleResult.rows.length === 0) {
      console.log('❌ No vehicles found in database');
      return;
    }
    
    const vehicle = vehicleResult.rows[0];
    testVehicleId = vehicle.id;
    console.log(`📝 Test Vehicle: ID=${vehicle.id}, ${vehicle.brand} ${vehicle.model} (${vehicle.plate})`);
    
  } finally {
    client.release();
  }
  
  // Test 1: Simple update without image (JSON)
  console.log('\n📤 TEST 1: Simple JSON update (no image)');
  console.log('-'.repeat(60));
  try {
    const updateData = {
      Category: vehicle.category,
      Brand: 'TEST_UPDATE_BRAND',
      Model: vehicle.model,
      Year: 2024,
      Plate: vehicle.plate,
      PriceNew: 50000,
      Condition: 'Used',
      Color: 'Blue',
    };
    
    console.log('Sending PUT request...');
    const startTime = Date.now();
    
    const response = await fetch(`${BASE_URL}/api/vehicles/${testVehicleId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=eyJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFkbWluIn0=', // Mock admin session
      },
      body: JSON.stringify(updateData),
    });
    
    const duration = Date.now() - startTime;
    console.log(`Response status: ${response.status} (${duration}ms)`);
    
    const responseText = await response.text();
    console.log('Response body:', responseText.substring(0, 500));
    
    if (response.ok) {
      console.log('✅ JSON update test PASSED');
    } else {
      console.log('❌ JSON update test FAILED');
    }
  } catch (error) {
    console.log('❌ JSON update test ERROR:', error.message);
  }
  
  // Test 2: Check if server is running
  console.log('\n📤 TEST 2: Check server health');
  console.log('-'.repeat(60));
  try {
    const response = await fetch(`${BASE_URL}/api/health`, {
      method: 'GET',
    });
    console.log(`Health check status: ${response.status}`);
    const health = await response.json().catch(() => ({}));
    console.log('Health response:', health);
  } catch (error) {
    console.log('❌ Server not running or health endpoint error:', error.message);
    console.log('   Please start the dev server with: npm run dev');
  }
  
  // Test 3: Direct database update test
  console.log('\n📤 TEST 3: Direct database update');
  console.log('-'.repeat(60));
  const client2 = await pool.connect();
  try {
    const updateResult = await client2.query(`
      UPDATE vehicles 
      SET brand = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, brand
    `, ['DIRECT_DB_TEST', testVehicleId]);
    
    if (updateResult.rows.length > 0) {
      console.log('✅ Direct DB update PASSED');
      console.log(`   Updated brand to: ${updateResult.rows[0].brand}`);
      
      // Revert the change
      await client2.query(`
        UPDATE vehicles 
        SET brand = $1, updated_at = NOW()
        WHERE id = $2
      `, [vehicle.brand, testVehicleId]);
      console.log('   Reverted brand back to original');
    } else {
      console.log('❌ Direct DB update FAILED: No rows updated');
    }
  } catch (error) {
    console.log('❌ Direct DB update ERROR:', error.message);
  } finally {
    client2.release();
  }
  
  await pool.end();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Diagnosis Summary');
  console.log('='.repeat(60));
  console.log('If TEST 1 fails with 502:');
  console.log('  1. Check if Next.js dev server is running (npm run dev)');
  console.log('  2. Check server console for error logs');
  console.log('  3. Verify session/authentication is working');
  console.log('  4. Check if the API route has syntax errors');
  console.log('');
  console.log('If TEST 3 fails:');
  console.log('  1. Database connection issue');
  console.log('  2. Table permissions issue');
}

testUpdateAPI().catch(console.error);
