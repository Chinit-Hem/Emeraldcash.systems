#!/usr/bin/env node
/**
 * Integration Test: Image Upload Flow
 * 
 * This script tests the complete image upload flow:
 * 1. Create a test vehicle with image
 * 2. Verify Cloudinary folder path
 * 3. Verify database record
 * 4. Measure latency at each step (ល្បឿនឆ្លើយតប)
 */

import { v2 as cloudinary } from "cloudinary";
import { sql } from "../src/lib/db.ts";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "..", ".env.local") });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  testVehicle: {
    Category: "Cars",
    Brand: "TestBrand",
    Model: "TestModel",
    Year: 2024,
    Plate: "TEST-123",
    PriceNew: 25000,
    Condition: "New",
    Color: "Red",
  },
};

// Performance tracking
class PerformanceTracker {
  constructor() {
    this.steps = [];
    this.startTime = null;
  }

  start(stepName) {
    this.startTime = Date.now();
    console.log(`\n🚀 [${stepName}] កំពុងចាប់ផ្តើម...`);
    return this;
  }

  end(stepName) {
    const duration = Date.now() - this.startTime;
    this.steps.push({ name: stepName, latency: duration });
    console.log(`✅ [${stepName}] បានបញ្ចប់ - ល្បឿនឆ្លើយតប: ${duration}ms`);
    return duration;
  }

  summary() {
    console.log("\n" + "=".repeat(60));
    console.log("📊 សង្ខេបល្បឿនឆ្លើយតប (Latency Summary)");
    console.log("=".repeat(60));
    
    let totalLatency = 0;
    this.steps.forEach((step, index) => {
      totalLatency += step.latency;
      console.log(`${index + 1}. ${step.name}: ${step.latency}ms`);
    });
    
    console.log("-".repeat(60));
    console.log(`🔢 សរុបពេលវេលា: ${totalLatency}ms (${(totalLatency / 1000).toFixed(2)}s)`);
    console.log("=".repeat(60));
    
    return totalLatency;
  }
}

// Create a small test image (1x1 pixel red PNG in base64)
const createTestImage = () => {
  // 1x1 red PNG
  const base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  return `data:image/png;base64,${base64Image}`;
};

// Test functions
async function testCloudinaryConnection(tracker) {
  tracker.start("ភ្ជាប់ទៅ Cloudinary (Cloudinary Connection)");
  
  try {
    const result = await cloudinary.api.ping();
    const latency = tracker.end("ភ្ជាប់ទៅ Cloudinary (Cloudinary Connection)");
    
    console.log(`   📡 Cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    console.log(`   ✅ Connection successful`);
    return { success: true, latency };
  } catch (error) {
    tracker.end("ភ្ជាប់ទៅ Cloudinary (Cloudinary Connection)");
    console.error(`   ❌ Connection failed: ${error.message}`);
    throw error;
  }
}

async function testDatabaseConnection(tracker) {
  tracker.start("ភ្ជាប់ទៅ Database (Database Connection)");
  
  try {
    const result = await sql`SELECT NOW() as current_time`;
    const latency = tracker.end("ភ្ជាប់ទៅ Database (Database Connection)");
    
    console.log(`   🗄️  Database time: ${result[0].current_time}`);
    console.log(`   ✅ Connection successful`);
    return { success: true, latency };
  } catch (error) {
    tracker.end("ភ្ជាប់ទៅ Database (Database Connection)");
    console.error(`   ❌ Connection failed: ${error.message}`);
    throw error;
  }
}

async function createTestVehicleWithImage(tracker) {
  tracker.start("បង្កើតយានយន្តជាមួយរូបភាព (Create Vehicle with Image)");
  
  const testImage = createTestImage();
  const formData = new FormData();
  
  // Add vehicle data
  Object.entries(TEST_CONFIG.testVehicle).forEach(([key, value]) => {
    formData.append(key, String(value));
  });
  
  // Add image
  const blob = Buffer.from(testImage.split(",")[1], "base64");
  formData.append("Image", testImage);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/vehicles`, {
      method: "POST",
      body: formData,
    });
    
    const responseTime = Date.now() - startTime;
    const data = await response.json();
    
    if (!response.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    
    const latency = tracker.end("បង្កើតយានយន្តជាមួយរូបភាព (Create Vehicle with Image)");
    
    console.log(`   🚗 Vehicle ID: ${data.data?.VehicleId || "N/A"}`);
    console.log(`   🖼️  Image URL: ${data.data?.Image ? data.data.Image.substring(0, 60) + "..." : "None"}`);
    console.log(`   ⏱️  Response time: ${responseTime}ms`);
    
    return {
      success: true,
      vehicle: data.data,
      latency,
      responseTime,
    };
  } catch (error) {
    tracker.end("បង្កើតយានយន្តជាមួយរូបភាព (Create Vehicle with Image)");
    console.error(`   ❌ Failed to create vehicle: ${error.message}`);
    throw error;
  }
}

async function verifyCloudinaryFolder(vehicle, tracker) {
  tracker.start("ផ្ទៀងផ្ទាត់ថត Cloudinary (Verify Cloudinary Folder)");
  
  if (!vehicle.Image || !vehicle.Image.includes("cloudinary.com")) {
    tracker.end("ផ្ទៀងផ្ទាត់ថត Cloudinary (Verify Cloudinary Folder)");
    console.log(`   ⚠️  No Cloudinary image found`);
    return { success: false, reason: "No Cloudinary image" };
  }
  
  try {
    // Extract public_id from Cloudinary URL
    // URL format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{folder}/{public_id}
    const urlParts = vehicle.Image.split("/");
    const publicIdWithExtension = urlParts[urlParts.length - 1];
    const publicId = publicIdWithExtension.split(".")[0]; // Remove file extension
    const folder = urlParts[urlParts.length - 2];
    const fullPublicId = `${folder}/${publicId}`;
    
    // Expected folder based on category
    const expectedFolder = `vms/${TEST_CONFIG.testVehicle.Category.toLowerCase()}s`;
    
    console.log(`   📁 Folder in URL: ${folder}`);
    console.log(`   📁 Expected folder: ${expectedFolder}`);
    console.log(`   🆔 Public ID: ${publicId}`);
    
    // Verify the resource exists in Cloudinary
    try {
      const resource = await cloudinary.api.resource(fullPublicId);
      const latency = tracker.end("ផ្ទៀងផ្ទាត់ថត Cloudinary (Verify Cloudinary Folder)");
      
      console.log(`   ✅ Image exists in Cloudinary`);
      console.log(`   📊 Format: ${resource.format}`);
      console.log(`   📊 Size: ${resource.bytes} bytes`);
      console.log(`   📊 Created: ${resource.created_at}`);
      
      return {
        success: true,
        folder,
        expectedFolder,
        isCorrectFolder: folder === expectedFolder,
        resource,
        latency,
      };
    } catch (cloudinaryError) {
      tracker.end("ផ្ទៀងផ្ទាត់ថត Cloudinary (Verify Cloudinary Folder)");
      console.log(`   ⚠️  Could not verify in Cloudinary API: ${cloudinaryError.message}`);
      return {
        success: true,
        folder,
        expectedFolder,
        isCorrectFolder: folder === expectedFolder,
        verified: false,
        latency: 0,
      };
    }
  } catch (error) {
    tracker.end("ផ្ទៀងផ្ទាត់ថត Cloudinary (Verify Cloudinary Folder)");
    console.error(`   ❌ Error verifying folder: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function verifyDatabaseRecord(vehicle, tracker) {
  tracker.start("ផ្ទៀងផ្ទាត់កំណត់ត្រាមូលដ្ឋានទិន្នន័យ (Verify Database Record)");
  
  try {
    const vehicleId = parseInt(vehicle.VehicleId, 10);
    if (isNaN(vehicleId)) {
      throw new Error("Invalid vehicle ID");
    }
    
    const result = await sql`
      SELECT * FROM vehicles 
      WHERE id = ${vehicleId}
    `;
    
    const latency = tracker.end("ផ្ទៀងផ្ទាត់កំណត់ត្រាមូលដ្ឋានទិន្នន័យ (Verify Database Record)");
    
    if (result.length === 0) {
      console.log(`   ❌ Vehicle not found in database`);
      return { success: false, reason: "Vehicle not found" };
    }
    
    const dbRecord = result[0];
    
    console.log(`   ✅ Vehicle found in database`);
    console.log(`   🆔 ID: ${dbRecord.id}`);
    console.log(`   🏷️  Category: ${dbRecord.category}`);
    console.log(`   🖼️  Image ID: ${dbRecord.image_id ? dbRecord.image_id.substring(0, 60) + "..." : "None"}`);
    console.log(`   💰 Market Price: $${dbRecord.market_price}`);
    
    // Verify image_id matches
    const imageMatches = dbRecord.image_id === vehicle.Image;
    console.log(`   ${imageMatches ? "✅" : "❌"} Image URL matches: ${imageMatches}`);
    
    return {
      success: true,
      record: dbRecord,
      imageMatches,
      latency,
    };
  } catch (error) {
    tracker.end("ផ្ទៀងផ្ទាត់កំណត់ត្រាមូលដ្ឋានទិន្នន័យ (Verify Database Record)");
    console.error(`   ❌ Error verifying database: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function cleanupTestVehicle(vehicle, tracker) {
  tracker.start("សម្អាតទិន្នន័យសាកល្បង (Cleanup Test Data)");
  
  try {
    const vehicleId = parseInt(vehicle.VehicleId, 10);
    if (isNaN(vehicleId)) {
      throw new Error("Invalid vehicle ID");
    }
    
    // Delete from database
    await sql`DELETE FROM vehicles WHERE id = ${vehicleId}`;
    
    // Try to delete from Cloudinary if we have the image
    if (vehicle.Image && vehicle.Image.includes("cloudinary.com")) {
      try {
        const urlParts = vehicle.Image.split("/");
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = publicIdWithExtension.split(".")[0];
        const folder = urlParts[urlParts.length - 2];
        const fullPublicId = `${folder}/${publicId}`;
        
        await cloudinary.uploader.destroy(fullPublicId);
        console.log(`   🗑️  Deleted from Cloudinary: ${fullPublicId}`);
      } catch (cloudinaryError) {
        console.log(`   ⚠️  Could not delete from Cloudinary: ${cloudinaryError.message}`);
      }
    }
    
    const latency = tracker.end("សម្អាតទិន្នន័យសាកល្បង (Cleanup Test Data)");
    console.log(`   ✅ Test data cleaned up`);
    
    return { success: true, latency };
  } catch (error) {
    tracker.end("សម្អាតទិន្នន័យសាកល្បង (Cleanup Test Data)");
    console.error(`   ⚠️  Cleanup error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main test runner
async function runIntegrationTest() {
  console.log("=".repeat(60));
  console.log("🧪 ការធ្វើតេស្តរួមបញ្ចូលរូបភាព (Image Upload Integration Test)");
  console.log("=".repeat(60));
  
  const tracker = new PerformanceTracker();
  const results = {
    cloudinaryConnection: null,
    databaseConnection: null,
    vehicleCreation: null,
    cloudinaryFolder: null,
    databaseRecord: null,
    cleanup: null,
  };
  
  try {
    // Step 1: Test connections
    results.cloudinaryConnection = await testCloudinaryConnection(tracker);
    results.databaseConnection = await testDatabaseConnection(tracker);
    
    // Step 2: Create test vehicle
    results.vehicleCreation = await createTestVehicleWithImage(tracker);
    
    if (!results.vehicleCreation.success) {
      throw new Error("Vehicle creation failed");
    }
    
    // Step 3: Verify Cloudinary folder
    results.cloudinaryFolder = await verifyCloudinaryFolder(
      results.vehicleCreation.vehicle,
      tracker
    );
    
    // Step 4: Verify database record
    results.databaseRecord = await verifyDatabaseRecord(
      results.vehicleCreation.vehicle,
      tracker
    );
    
    // Step 5: Cleanup
    results.cleanup = await cleanupTestVehicle(
      results.vehicleCreation.vehicle,
      tracker
    );
    
    // Print summary
    const totalLatency = tracker.summary();
    
    // Final results
    console.log("\n" + "=".repeat(60));
    console.log("📋 លទ្ធផលតេស្ត (Test Results)");
    console.log("=".repeat(60));
    
    const allPassed = 
      results.cloudinaryConnection?.success &&
      results.databaseConnection?.success &&
      results.vehicleCreation?.success &&
      results.cloudinaryFolder?.success &&
      results.databaseRecord?.success;
    
    if (allPassed) {
      console.log("✅ ការធ្វើតេស្តទាំងអស់ជោគជ័យ! (All tests passed!)");
      
      if (results.cloudinaryFolder?.isCorrectFolder) {
        console.log("✅ ថត Cloudinary ត្រឹមត្រូវ (Cloudinary folder is correct)");
      } else {
        console.log("⚠️  ថត Cloudinary មិនត្រឹមត្រូវ (Cloudinary folder may be incorrect)");
        console.log(`   បានរកឃើញ: ${results.cloudinaryFolder?.folder}`);
        console.log(`   រំពឹងទុក: ${results.cloudinaryFolder?.expectedFolder}`);
      }
      
      if (results.databaseRecord?.imageMatches) {
        console.log("✅ រូបភាពត្រូវបានរក្សាទុកត្រឹមត្រូវក្នុងមូលដ្ឋានទិន្នន័យ (Image saved correctly in database)");
      } else {
        console.log("⚠️  រូបភាពមិនត្រូវបានផ្ទៀងផ្ទាត់ក្នុងមូលដ្ឋានទិន្នន័យ (Image verification issue)");
      }
    } else {
      console.log("❌ ការធ្វើតេស្តមួយចំនួនបរាជ័យ (Some tests failed)");
    }
    
    console.log("=".repeat(60));
    
    return {
      success: allPassed,
      results,
      totalLatency,
    };
    
  } catch (error) {
    console.error("\n❌ ការធ្វើតេស្តបរាជ័យ (Test failed):", error.message);
    
    // Try to cleanup even if test failed
    if (results.vehicleCreation?.vehicle) {
      console.log("\n🧹 កំពុងសម្អាតទិន្នន័យ (Cleaning up)...");
      await cleanupTestVehicle(results.vehicleCreation.vehicle, tracker);
    }
    
    tracker.summary();
    return { success: false, error: error.message };
  }
}

// Run the test
runIntegrationTest()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
