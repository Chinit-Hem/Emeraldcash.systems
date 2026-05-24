// Test Cloudinary folder paths
import { getCloudinaryFolder, CLOUDINARY_FOLDERS } from "../src/lib/cloudinary-folders.ts";

console.log("Testing Cloudinary folder paths...\n");

// Test categories
const testCategories = [
  "Car",
  "SUV", 
  "Motorcycle",
  "Scooter",
  "TukTuk",
  "Auto Rickshaw",
  "Truck",
  "Sedan"
];

console.log("Folder mappings:");
testCategories.forEach(cat => {
  const folder = getCloudinaryFolder(cat);
  console.log(`  ${cat} -> ${folder}`);
});

console.log("\nExpected folders:");
console.log(`  CARS: ${CLOUDINARY_FOLDERS.CARS}`);
console.log(`  MOTORCYCLES: ${CLOUDINARY_FOLDERS.MOTORCYCLES}`);
console.log(`  TUKTUKS: ${CLOUDINARY_FOLDERS.TUKTUKS}`);

// Verify the paths match expected format
const expectedPaths = ["vms/cars", "vms/motorcycles", "vms/tuktuks"];
const actualPaths = [
  CLOUDINARY_FOLDERS.CARS,
  CLOUDINARY_FOLDERS.MOTORCYCLES,
  CLOUDINARY_FOLDERS.TUKTUKS
];

const allMatch = expectedPaths.every((expected, i) => expected === actualPaths[i]);

if (allMatch) {
  console.log("\n✅ All folder paths are correct!");
} else {
  console.log("\n❌ Folder paths don't match expected format");
  console.log("Expected:", expectedPaths);
  console.log("Actual:", actualPaths);
}
