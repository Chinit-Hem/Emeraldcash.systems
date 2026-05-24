/**
 * Test script to diagnose the API 500 error
 * Tests database connection and API endpoints directly
 */

import { dbManager } from '../src/lib/db-singleton.ts';

async function testDatabaseConnection() {
  console.log('\n=== Testing Database Connection ===\n');
  
  try {
    const result = await dbManager.testConnection();
    console.log('Connection test result:', result);
    
    if (!result.success) {
      console.error('❌ Database connection failed!');
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    return false;
  }
}

async function testSimpleQuery() {
  console.log('\n=== Testing Simple Query ===\n');
  
  try {
    const result = await dbManager.executeUnsafe('SELECT 1 as test');
    console.log('Simple query result:', result);
    console.log('✅ Simple query successful');
    return true;
  } catch (error) {
    console.error('❌ Simple query failed:', error);
    return false;
  }
}

async function testVehiclesTable() {
  console.log('\n=== Testing Vehicles Table ===\n');
  
  try {
    // Test if table exists
    const tableCheck = await dbManager.executeUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'vehicles'
      ) as exists
    `);
    
    console.log('Table check result:', tableCheck);
    
    if (!tableCheck[0]?.exists) {
      console.error('❌ Vehicles table does not exist!');
      return false;
    }
    
    console.log('✅ Vehicles table exists');
    
    // Test count
    const countResult = await dbManager.executeUnsafe('SELECT COUNT(*) as count FROM vehicles');
    console.log('Vehicle count:', countResult[0]?.count);
    
    // Test simple select
    const vehicles = await dbManager.executeUnsafe('SELECT id, brand, model FROM vehicles LIMIT 5');
    console.log('Sample vehicles:', vehicles);
    
    console.log('✅ Vehicles table query successful');
    return true;
  } catch (error) {
    console.error('❌ Vehicles table query failed:', error);
    return false;
  }
}

async function testVehicleService() {
  console.log('\n=== Testing VehicleService ===\n');
  
  try {
    // Dynamic import to handle TypeScript module
    const { vehicleService } = await import('../src/services/VehicleService.ts');
    
    console.log('Getting vehicles via service...');
    const result = await vehicleService.getVehicles({ limit: 5 });
    
    console.log('Service result:', {
      success: result.success,
      dataLength: result.data?.length,
      error: result.error,
      meta: result.meta,
    });
    
    if (!result.success) {
      console.error('❌ VehicleService failed:', result.error);
      return false;
    }
    
    console.log('✅ VehicleService successful');
    return true;
  } catch (error) {
    console.error('❌ VehicleService error:', error);
    return false;
  }
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         API 500 Error Diagnostic Test Suite                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const results = {
    connection: await testDatabaseConnection(),
    simpleQuery: await testSimpleQuery(),
    vehiclesTable: await testVehiclesTable(),
    vehicleService: await testVehicleService(),
  };
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      Test Summary                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  for (const [test, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  }
  
  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    console.log('\n✅ All tests passed! The API should be working.');
  } else {
    console.log('\n❌ Some tests failed. Check the logs above for details.');
    console.log('The 500 error is likely caused by the failed test(s).');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed with error:', error);
  process.exit(1);
});
