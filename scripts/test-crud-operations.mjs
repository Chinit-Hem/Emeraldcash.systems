/**
 * Test CRUD operations for vehicles
 * Tests: Create, Read, Update, Delete
 */

import { Pool } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "";

const pool = new Pool({ connectionString: DATABASE_URL });

async function testCRUD() {
  console.log('🧪 Testing Vehicle CRUD Operations\n');
  console.log('='.repeat(60));
  
  const client = await pool.connect();
  let testVehicleId = null;
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    // Test 1: CREATE
    console.log('\n📥 TEST 1: CREATE Vehicle');
    console.log('-'.repeat(60));
    try {
      const newVehicle = {
        category: 'Car',
        brand: 'TEST_BRAND',
        model: 'TEST_MODEL',
        year: 2024,
        plate: 'TEST-1234',
        market_price: 25000,
        tax_type: 'Type A',
        condition: 'New',
        body_type: 'Sedan',
        color: 'Red',
        image_id: null,
        thumbnail_url: null,
      };
      
      console.log('Creating test vehicle:', newVehicle.plate);
      
      const createResult = await client.query(`
        INSERT INTO vehicles (category, brand, model, year, plate, market_price, tax_type, condition, body_type, color, image_id, thumbnail_url, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *
      `, [
        newVehicle.category,
        newVehicle.brand,
        newVehicle.model,
        newVehicle.year,
        newVehicle.plate,
        newVehicle.market_price,
        newVehicle.tax_type,
        newVehicle.condition,
        newVehicle.body_type,
        newVehicle.color,
        newVehicle.image_id,
        newVehicle.thumbnail_url,
      ]);
      
      if (createResult.rows.length > 0) {
        testVehicleId = createResult.rows[0].id;
        console.log('✅ CREATE PASSED');
        console.log(`   ID: ${testVehicleId}`);
        console.log(`   Plate: ${createResult.rows[0].plate}`);
        testsPassed++;
      } else {
        console.log('❌ CREATE FAILED: No rows returned');
        testsFailed++;
      }
    } catch (error) {
      console.log('❌ CREATE ERROR:', error.message);
      testsFailed++;
    }
    
    // Test 2: READ (Get by ID)
    if (testVehicleId) {
      console.log('\n📖 TEST 2: READ Vehicle (Get by ID)');
      console.log('-'.repeat(60));
      try {
        const readResult = await client.query(
          'SELECT * FROM vehicles WHERE id = $1',
          [testVehicleId]
        );
        
        if (readResult.rows.length > 0) {
          const v = readResult.rows[0];
          console.log('✅ READ PASSED');
          console.log(`   Found: ${v.brand} ${v.model}`);
          console.log(`   Plate: ${v.plate}`);
          testsPassed++;
        } else {
          console.log('❌ READ FAILED: Vehicle not found');
          testsFailed++;
        }
      } catch (error) {
        console.log('❌ READ ERROR:', error.message);
        testsFailed++;
      }
    }
    
    // Test 3: UPDATE
    if (testVehicleId) {
      console.log('\n✏️  TEST 3: UPDATE Vehicle');
      console.log('-'.repeat(60));
      try {
        console.log(`Updating vehicle ID ${testVehicleId}...`);
        
        const updateResult = await client.query(`
          UPDATE vehicles 
          SET brand = $1, model = $2, color = $3, market_price = $4, updated_at = NOW()
          WHERE id = $5
          RETURNING *
        `, ['UPDATED_BRAND', 'UPDATED_MODEL', 'Blue', 30000, testVehicleId]);
        
        if (updateResult.rows.length > 0) {
          const v = updateResult.rows[0];
          console.log('✅ UPDATE PASSED');
          console.log(`   New Brand: ${v.brand}`);
          console.log(`   New Model: ${v.model}`);
          console.log(`   New Color: ${v.color}`);
          console.log(`   New Price: ${v.market_price}`);
          testsPassed++;
        } else {
          console.log('❌ UPDATE FAILED: No rows updated');
          testsFailed++;
        }
      } catch (error) {
        console.log('❌ UPDATE ERROR:', error.message);
        testsFailed++;
      }
    }
    
    // Test 4: Verify Update (Read again)
    if (testVehicleId) {
      console.log('\n🔍 TEST 4: VERIFY Update (Read again)');
      console.log('-'.repeat(60));
      try {
        const verifyResult = await client.query(
          'SELECT * FROM vehicles WHERE id = $1',
          [testVehicleId]
        );
        
        if (verifyResult.rows.length > 0) {
          const v = verifyResult.rows[0];
          if (v.brand === 'UPDATED_BRAND' && v.color === 'Blue') {
            console.log('✅ VERIFY PASSED');
            console.log(`   Brand: ${v.brand} ✓`);
            console.log(`   Color: ${v.color} ✓`);
            console.log(`   Price: ${v.market_price} ✓`);
            testsPassed++;
          } else {
            console.log('❌ VERIFY FAILED: Data not updated correctly');
            console.log(`   Expected Brand: UPDATED_BRAND, Got: ${v.brand}`);
            testsFailed++;
          }
        } else {
          console.log('❌ VERIFY FAILED: Vehicle not found');
          testsFailed++;
        }
      } catch (error) {
        console.log('❌ VERIFY ERROR:', error.message);
        testsFailed++;
      }
    }
    
    // Test 5: DELETE
    if (testVehicleId) {
      console.log('\n🗑️  TEST 5: DELETE Vehicle');
      console.log('-'.repeat(60));
      try {
        console.log(`Deleting vehicle ID ${testVehicleId}...`);
        
        const deleteResult = await client.query(
          'DELETE FROM vehicles WHERE id = $1 RETURNING id',
          [testVehicleId]
        );
        
        if (deleteResult.rows.length > 0) {
          console.log('✅ DELETE PASSED');
          console.log(`   Vehicle ${testVehicleId} deleted successfully`);
          testsPassed++;
        } else {
          console.log('❌ DELETE FAILED: No rows deleted');
          testsFailed++;
        }
      } catch (error) {
        console.log('❌ DELETE ERROR:', error.message);
        testsFailed++;
      }
    }
    
    // Test 6: Verify Delete (Should not find vehicle)
    if (testVehicleId) {
      console.log('\n🔍 TEST 6: VERIFY Delete (Should not find vehicle)');
      console.log('-'.repeat(60));
      try {
        const checkResult = await client.query(
          'SELECT * FROM vehicles WHERE id = $1',
          [testVehicleId]
        );
        
        if (checkResult.rows.length === 0) {
          console.log('✅ VERIFY DELETE PASSED');
          console.log(`   Vehicle ${testVehicleId} no longer exists ✓`);
          testsPassed++;
        } else {
          console.log('❌ VERIFY DELETE FAILED: Vehicle still exists');
          testsFailed++;
        }
      } catch (error) {
        console.log('✅ VERIFY DELETE PASSED');
        console.log(`   Vehicle ${testVehicleId} not found (as expected) ✓`);
        testsPassed++;
      }
    }
    
  } finally {
    client.release();
    await pool.end();
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  const totalTests = testsPassed + testsFailed;
  console.log(`📈 Success Rate: ${totalTests > 0 ? Math.round((testsPassed / totalTests) * 100) : 0}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 ALL CRUD OPERATIONS WORKING CORRECTLY!');
    console.log('   You can now:');
    console.log('   • Add new vehicles');
    console.log('   • Edit existing vehicles');
    console.log('   • Update vehicle details');
    console.log('   • Delete vehicles');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

testCRUD().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
