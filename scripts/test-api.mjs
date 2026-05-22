// Test API routes directly using Neon REST API
const API_URL = "https://[neon-api-host]/neondb/rest/v1";

const headers = {
  "Content-Type": "application/json",
  "Accept": "application/json",
};

async function testAPI() {
  console.log("Testing API functionality directly...\n");
  console.log("API URL:", API_URL);
  
  try {
    // Test 1: Get all vehicles
    console.log("\n1. Testing GET /vehicles (get all vehicles)");
    const response = await fetch(`${API_URL}/vehicles?select=*&limit=5`, { headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const vehicles = await response.json();
    console.log(`   ✅ Found ${vehicles.length} vehicles`);
    if (vehicles.length > 0) {
      console.log("   Sample vehicle:", JSON.stringify(vehicles[0], null, 2).substring(0, 200) + "...");
    }
    
    // Test 2: Get vehicle stats
    console.log("\n2. Testing vehicle statistics");
    const countResponse = await fetch(`${API_URL}/vehicles?select=count`, { headers });
    if (!countResponse.ok) throw new Error(`HTTP ${countResponse.status}: ${countResponse.statusText}`);
    const countData = await countResponse.json();
    console.log(`   ✅ Total vehicles: ${countData.length}`);
    
    // Test 3: Search vehicles
    console.log("\n3. Testing search functionality");
    const searchResponse = await fetch(
      `${API_URL}/vehicles?select=*&or=(brand.ilike.*Toyota*,model.ilike.*Toyota*)&limit=3`,
      { headers }
    );
    if (!searchResponse.ok) throw new Error(`HTTP ${searchResponse.status}: ${searchResponse.statusText}`);
    const searchResults = await searchResponse.json();
    console.log(`   ✅ Found ${searchResults.length} vehicles matching "Toyota"`);
    
    // Test 4: Get single vehicle
    if (vehicles.length > 0) {
      console.log("\n4. Testing get single vehicle");
      const firstId = vehicles[0].id;
      const singleResponse = await fetch(`${API_URL}/vehicles?id=eq.${firstId}&select=*`, { headers });
      if (!singleResponse.ok) throw new Error(`HTTP ${singleResponse.status}: ${singleResponse.statusText}`);
      const singleVehicle = await singleResponse.json();
      console.log(`   ✅ Retrieved vehicle with ID: ${firstId}`);
    }
    
    console.log("\n✅ All API tests passed!");
    console.log("\nAvailable API endpoints:");
    console.log("  GET  /api/db-test       - Database connection test");
    console.log("  GET  /api/vehicles-db   - Get all vehicles (with filters)");
    console.log("  GET  /api/vehicles-db?id=1 - Get single vehicle");
    console.log("  GET  /api/vehicles-db?search=Toyota - Search vehicles");
    console.log("  GET  /api/vehicles-db?stats=true - Get statistics");
    console.log("  POST /api/vehicles-db   - Create vehicle (Admin only)");
    console.log("  PUT  /api/vehicles-db?id=1 - Update vehicle (Admin only)");
    console.log("  DELETE /api/vehicles-db?id=1 - Delete vehicle (Admin only)");
    
  } catch (error) {
    console.error("\n❌ API test failed:", error.message);
    process.exit(1);
  }
}

testAPI();
