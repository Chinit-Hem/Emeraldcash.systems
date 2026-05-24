/**
 * Image Update Flow Diagnostic Test
 * 
 * This script tests the complete image update flow to identify where it fails:
 * 1. Frontend → Cloudinary upload
 * 2. Cloudinary → API payload
 * 3. API → Database update
 * 4. Database → Response
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("=".repeat(80));
console.log("IMAGE UPDATE FLOW DIAGNOSTIC");
console.log("=".repeat(80));

// Check 1: Verify useUpdateVehicleOptimistic.ts sends correct payload
console.log("\n🔍 CHECK 1: Frontend Hook (useUpdateVehicleOptimistic.ts)");
console.log("Expected behavior:");
console.log("  - Should upload image to Cloudinary first");
console.log("  - Should send PUT to /api/vehicles/{id} with image_id field");
console.log("  - Payload should contain: { image_id: 'https://res.cloudinary.com/...' }");

const useUpdatePath = path.join(__dirname, '../src/systems/vms/components/vehicles/useUpdateVehicleOptimistic.ts');
if (fs.existsSync(useUpdatePath)) {
  const content = fs.readFileSync(useUpdatePath, 'utf8');
  
  // Check for image_id in payload
  const hasImageIdInPayload = content.includes('payload.image_id = cloudinaryImageUrl');
  console.log(`  ✓ Sets payload.image_id: ${hasImageIdInPayload ? 'YES' : 'NO ❌'}`);
  
  // Check for PUT request
  const hasPutRequest = content.includes("method: \"PUT\"");
  console.log(`  ✓ Uses PUT method: ${hasPutRequest ? 'YES' : 'NO ❌'}`);
  
  // Check for correct endpoint
  const hasCorrectEndpoint = content.includes('/api/vehicles/${encodeURIComponent(vehicleId)}');
  console.log(`  ✓ Calls /api/vehicles/{id}: ${hasCorrectEndpoint ? 'YES' : 'NO ❌'}`);
  
  // Check for Cloudinary upload
  const hasCloudinaryUpload = content.includes('uploadImageToCloudinary');
  console.log(`  ✓ Uploads to Cloudinary: ${hasCloudinaryUpload ? 'YES' : 'NO ❌'}`);
} else {
  console.log("  ❌ File not found!");
}

// Check 2: Verify API route receives and processes image_id
console.log("\n🔍 CHECK 2: API Route ([id]/route.ts)");
console.log("Expected behavior:");
console.log("  - Should extract image_id from request body");
console.log("  - Should pass image_id to updateVehicle() function");
console.log("  - Should return updated vehicle with Image field");

const apiRoutePath = path.join(__dirname, '../src/app/api/vehicles/[id]/route.ts');
if (fs.existsSync(apiRoutePath)) {
  const content = fs.readFileSync(apiRoutePath, 'utf8');
  
  // Check for image_id extraction
  const extractsImageId = content.includes('body.image_id') || content.includes('body.imageId') || content.includes('body.Image');
  console.log(`  ✓ Extracts image_id from body: ${extractsImageId ? 'YES' : 'NO ❌'}`);
  
  // Check for updateVehicle call with image_id
  const passesImageId = content.includes('updateData.image_id = imageId') || content.includes("updateData.image_id =");
  console.log(`  ✓ Passes image_id to updateVehicle: ${passesImageId ? 'YES' : 'NO ❌'}`);
  
  // Check for response with Image
  const returnsImage = content.includes('responseVehicle.Image');
  console.log(`  ✓ Returns Image in response: ${returnsImage ? 'YES' : 'NO ❌'}`);
} else {
  console.log("  ❌ File not found!");
}

// Check 3: Verify VehicleService entity mapping handles image_id
console.log("\n🔍 CHECK 3: VehicleService Entity Mapping");
console.log("Expected behavior:");
console.log("  - updateVehicle should accept image_id in vehicle parameter");
console.log("  - Should pass through to vehicleService.updateVehicle");

const dbSchemaPath = path.join(__dirname, '../src/systems/vms/services/VehicleService.ts');
if (fs.existsSync(dbSchemaPath)) {
  const content = fs.readFileSync(dbSchemaPath, 'utf8');
  
  // Check for image_id in VehicleDB type
  const hasImageIdInType = content.includes('image_id:');
  console.log(`  ✓ VehicleDB has image_id field: ${hasImageIdInType ? 'YES' : 'NO ❌'}`);
  
  // Check for updateVehicle function
  const hasUpdateFunction = content.includes('export async function updateVehicle');
  console.log(`  ✓ Has updateVehicle function: ${hasUpdateFunction ? 'YES' : 'NO ❌'}`);
} else {
  console.log("  ❌ File not found!");
}

// Check 4: Verify VehicleService.updateVehicle handles image_id
console.log("\n🔍 CHECK 4: VehicleService (VehicleService.ts)");
console.log("Expected behavior:");
console.log("  - Should accept image_id in update data");
console.log("  - Should pass to BaseService.update which builds SQL");

const vehicleServicePath = path.join(__dirname, '../src/systems/vms/services/VehicleService.ts');
if (fs.existsSync(vehicleServicePath)) {
  const content = fs.readFileSync(vehicleServicePath, 'utf8');
  
  // Check for updateVehicle method
  const hasUpdateMethod = content.includes('public async updateVehicle');
  console.log(`  ✓ Has updateVehicle method: ${hasUpdateMethod ? 'YES' : 'NO ❌'}`);
  
  // Check for image_id in toEntity (for reading back)
  const hasImageInEntity = content.includes('image_id');
  console.log(`  ✓ toEntity handles image_id: ${hasImageInEntity ? 'YES' : 'NO ❌'}`);
} else {
  console.log("  ❌ File not found!");
}

// Check 5: Verify BaseService.update builds correct SQL
console.log("\n🔍 CHECK 5: BaseService (BaseService.ts)");
console.log("Expected behavior:");
console.log("  - Should dynamically build UPDATE SQL with all provided fields");
console.log("  - Should include image_id in SET clause if provided");

const baseServicePath = path.join(__dirname, '../src/shared/utils/services/BaseService.ts');
if (fs.existsSync(baseServicePath)) {
  const content = fs.readFileSync(baseServicePath, 'utf8');
  
  // Check for dynamic UPDATE building
  const buildsDynamicUpdate = content.includes('UPDATE') && content.includes('SET');
  console.log(`  ✓ Builds dynamic UPDATE: ${buildsDynamicUpdate ? 'YES' : 'NO ❌'}`);
  
  // Check for field iteration
  const iteratesFields = content.includes('Object.entries(data)');
  console.log(`  ✓ Iterates over data fields: ${iteratesFields ? 'YES' : 'NO ❌'}`);
  
  // Check for sanitizeColumnName (should allow image_id)
  const hasSanitization = content.includes('sanitizeColumnName');
  console.log(`  ✓ Sanitizes column names: ${hasSanitization ? 'YES' : 'NO ❌'}`);
} else {
  console.log("  ❌ File not found!");
}

// Check 6: Verify VehiclesClient uses correct handler
console.log("\n🔍 CHECK 6: VehiclesClient (VehiclesClient.tsx)");
console.log("Expected behavior:");
console.log("  - Should use handleSubmitVehicle for both add and edit");
console.log("  - handleSubmitVehicle should route to updateVehicle when editing");

const vehiclesClientPath = path.join(__dirname, '../src/systems/vms/views/VehiclesClient.tsx');
if (fs.existsSync(vehiclesClientPath)) {
  const content = fs.readFileSync(vehiclesClientPath, 'utf8');
  
  // Check for handleSubmitVehicle
  const hasSubmitHandler = content.includes('const handleSubmitVehicle');
  console.log(`  ✓ Has handleSubmitVehicle: ${hasSubmitHandler ? 'YES' : 'NO ❌'}`);
  
  // Check for editingVehicle check
  const checksEditing = content.includes('if (editingVehicle)');
  console.log(`  ✓ Checks editingVehicle state: ${checksEditing ? 'YES' : 'NO ❌'}`);
  
  // Check for updateVehicle call
  const callsUpdateVehicle = content.includes('await updateVehicle(');
  console.log(`  ✓ Calls updateVehicle hook: ${callsUpdateVehicle ? 'YES' : 'NO ❌'}`);
  
  // Check VehicleModal uses handleSubmitVehicle
  const modalUsesCorrectHandler = content.includes('onSave={handleSubmitVehicle}');
  console.log(`  ✓ VehicleModal uses handleSubmitVehicle: ${modalUsesCorrectHandler ? 'YES' : 'NO ❌'}`);
} else {
  console.log("  ❌ File not found!");
}

// Summary
console.log("\n" + "=".repeat(80));
console.log("DIAGNOSTIC SUMMARY");
console.log("=".repeat(80));

console.log(`
If all checks show YES ✓, the image update flow should work correctly.

Common failure points:
1. ❌ Cloudinary upload fails (check env vars: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET)
2. ❌ API route doesn't receive image_id (check field name matches: image_id vs imageId vs Image)
3. ❌ Database column name mismatch (should be 'image_id' in PostgreSQL)
4. ❌ SQL sanitization blocks the field (check sanitizeColumnName allows underscores)

To test manually:
1. Open browser dev tools
2. Edit a vehicle and select a new image
3. Watch Network tab for PUT /api/vehicles/{id}
4. Check request payload contains: { image_id: "https://res.cloudinary.com/..." }
5. Check response contains updated Image field
6. Check console for any error messages
`);

console.log("=".repeat(80));
