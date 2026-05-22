// Upload vehicle images to Cloudinary folders
import { v2 as cloudinary } from "cloudinary";
import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

// Configure Cloudinary
const CLOUDINARY_URL = process.env.CLOUDINARY_URL;

if (!CLOUDINARY_URL) {
  console.error("❌ CLOUDINARY_URL environment variable is not set");
  console.error("Please set it to: cloudinary://451223545965496:9WNuYMzGCDjif2b96IgyS1HS8kQ@dgntrakv6");
  process.exit(1);
}

const urlMatch = CLOUDINARY_URL.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
if (!urlMatch) {
  console.error("❌ Invalid CLOUDINARY_URL format");
  process.exit(1);
}

const [, apiKey, apiSecret, cloudName] = urlMatch;

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

// Database connection
const DATABASE_URL = process.env.DATABASE_URL || "";
const sql = neon(DATABASE_URL);

// Folders in Cloudinary
const FOLDERS = {
  CAR: "CarsVMS",
  MOTORCYCLE: "MotorcyclesVMS",
  TUKTUK: "TukTuksVMS"
};

/**
 * Upload image to Cloudinary folder
 * @param {string} imagePath - Local path to image file
 * @param {string} folder - Cloudinary folder name
 * @param {string} publicId - Unique identifier for the image
 */
async function uploadImage(imagePath, folder, publicId) {
  try {
    console.log(`📤 Uploading ${path.basename(imagePath)} to ${folder}...`);
    
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: folder,
      public_id: publicId,
      resource_type: "image",
      overwrite: true,
    });
    
    console.log(`✅ Uploaded successfully!`);
    console.log(`   URL: ${result.secure_url}`);
    console.log(`   Public ID: ${result.public_id}`);
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      folder: folder
    };
  } catch (error) {
    console.error(`❌ Upload failed:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update vehicle image in database
 * @param {string} vehicleId - Vehicle ID
 * @param {string} imageUrl - Cloudinary image URL
 */
async function updateVehicleImage(vehicleId, imageUrl) {
  try {
    const result = await sql`
      UPDATE vehicles 
      SET image = ${imageUrl}, updated_at = NOW()
      WHERE vehicle_id = ${vehicleId}
      RETURNING *
    `;
    
    if (result.length > 0) {
      console.log(`✅ Updated vehicle ${vehicleId} with image URL`);
      return true;
    } else {
      console.log(`⚠️ Vehicle ${vehicleId} not found`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Database update failed:`, error.message);
    return false;
  }
}

/**
 * Get all vehicles from database
 */
async function getAllVehicles() {
  try {
    const vehicles = await sql`SELECT * FROM vehicles ORDER BY vehicle_id`;
    return vehicles;
  } catch (error) {
    console.error("❌ Failed to get vehicles:", error.message);
    return [];
  }
}

/**
 * List images in a Cloudinary folder
 * @param {string} folder - Folder name
 */
async function listImagesInFolder(folder) {
  try {
    console.log(`\n📁 Listing images in folder: ${folder}`);
    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: folder,
      max_results: 100
    });
    
    if (result.resources.length === 0) {
      console.log("   (No images found)");
    } else {
      console.log(`   Found ${result.resources.length} image(s):`);
      result.resources.forEach((img, i) => {
        console.log(`   ${i + 1}. ${img.public_id}`);
        console.log(`      URL: ${img.secure_url}`);
      });
    }
    
    return result.resources;
  } catch (error) {
    console.error(`❌ Failed to list images:`, error.message);
    return [];
  }
}

// Main menu
async function showMenu() {
  console.log("\n========================================");
  console.log("   Cloudinary Vehicle Image Manager");
  console.log("========================================\n");
  console.log("1. Upload image to CarsVMS folder");
  console.log("2. Upload image to MotorcyclesVMS folder");
  console.log("3. Upload image to TukTuksVMS folder");
  console.log("4. List all images in folders");
  console.log("5. View vehicles in database");
  console.log("6. Update vehicle with image URL");
  console.log("7. Exit");
  console.log("");
}

// Example usage functions
async function uploadExample() {
  console.log("\n📸 Example: Upload an image");
  console.log("----------------------------");
  
  // This is an example - replace with your actual image path
  const exampleImagePath = "./example-vehicle.jpg";
  
  if (!fs.existsSync(exampleImagePath)) {
    console.log(`\nℹ️  To upload an image, place it in the project folder`);
    console.log(`   and run: node scripts/upload-vehicle-images.mjs`);
    console.log(`\n   Example code:`);
    console.log(`   const result = await uploadImage(`);
    console.log(`     "./my-car.jpg",`);
    console.log(`     "CarsVMS",`);
    console.log(`     "toyota_landcruiser_2023"`);
    console.log(`   );`);
    return;
  }
  
  const result = await uploadImage(exampleImagePath, FOLDERS.CAR, "example_vehicle");
  if (result.success) {
    console.log(`\n✅ Image uploaded!`);
    console.log(`   Save this URL: ${result.url}`);
  }
}

// Quick upload function for specific vehicle
async function quickUpload(imagePath, vehicleId, category) {
  let folder;
  switch(category.toLowerCase()) {
    case 'car':
    case 'suv':
    case 'sedan':
    case 'truck':
      folder = FOLDERS.CAR;
      break;
    case 'motorcycle':
    case 'motorbike':
      folder = FOLDERS.MOTORCYCLE;
      break;
    case 'tuktuk':
    case 'tuk-tuk':
    case 'auto rickshaw':
      folder = FOLDERS.TUKTUK;
      break;
    default:
      folder = FOLDERS.CAR;
  }
  
  const publicId = `${vehicleId}_${Date.now()}`;
  const uploadResult = await uploadImage(imagePath, folder, publicId);
  
  if (uploadResult.success) {
    await updateVehicleImage(vehicleId, uploadResult.url);
  }
  
  return uploadResult;
}

// Main function
async function main() {
  console.log("🔌 Connecting to Cloudinary...");
  try {
    const pingResult = await cloudinary.api.ping();
    console.log("✅ Cloudinary connected!");
    console.log(`   Cloud: ${cloudName}`);
    console.log(`   Status: ${pingResult.status}`);
  } catch (error) {
    console.error("❌ Cloudinary connection failed:", error.message);
    process.exit(1);
  }
  
  // Show available folders
  console.log("\n📁 Available folders:");
  Object.entries(FOLDERS).forEach(([key, value]) => {
    console.log(`   - ${value}`);
  });
  
  // Show example
  await uploadExample();
  
  // List existing images
  console.log("\n🔍 Checking existing images...");
  for (const folder of Object.values(FOLDERS)) {
    await listImagesInFolder(folder);
  }
  
  console.log("\n✅ Setup complete!");
  console.log("\nTo upload an image in your code:");
  console.log(`
import { uploadImage } from './scripts/upload-vehicle-images.mjs';

// Upload and save to database
const result = await quickUpload(
  './path/to/image.jpg',     // Local image path
  'VH001',                   // Vehicle ID
  'SUV'                      // Category (determines folder)
);

// Result:
// {
//   success: true,
//   url: 'https://res.cloudinary.com/dgntrakv6/image/upload/...',
//   publicId: 'CarsVMS/VH001_1234567890',
//   folder: 'CarsVMS'
// }
  `);
}

// Run main
main().catch(console.error);

// Export functions for use in other scripts
export { uploadImage, updateVehicleImage, quickUpload, listImagesInFolder, FOLDERS };
