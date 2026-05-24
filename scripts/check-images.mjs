import { sql } from '../src/lib/db.ts';

async function checkImages() {
  try {
    console.log('Checking vehicles with images...\n');
    
    // Get vehicles with images
    const vehicles = await sql`
      SELECT id, image_id, brand, model, category 
      FROM vehicles 
      WHERE image_id IS NOT NULL AND image_id != ''
      LIMIT 10
    `;
    
    console.log(`Found ${vehicles.length} vehicles with images:\n`);
    
    for (const v of vehicles) {
      console.log(`ID: ${v.id}`);
      console.log(`Brand: ${v.brand} ${v.model}`);
      console.log(`Category: ${v.category}`);
      console.log(`Image ID: ${v.image_id}`);
      console.log(`Is Cloudinary: ${v.image_id.includes('cloudinary.com')}`);
      console.log(`Is Google Drive: ${v.image_id.includes('drive.google.com') || v.image_id.length > 20}`);
      console.log('---');
    }
    
    // Check image_id patterns
    const allWithImages = await sql`
      SELECT image_id 
      FROM vehicles 
      WHERE image_id IS NOT NULL AND image_id != ''
    `;
    
    console.log(`\nTotal vehicles with image_id: ${allWithImages.length}`);
    
    const cloudinary = allWithImages.filter(v => v.image_id.includes('cloudinary.com'));
    const googleDrive = allWithImages.filter(v => v.image_id.includes('drive.google.com'));
    const fileIds = allWithImages.filter(v => !v.image_id.includes('http') && v.image_id.length > 10);
    
    console.log(`Cloudinary URLs: ${cloudinary.length}`);
    console.log(`Google Drive URLs: ${googleDrive.length}`);
    console.log(`File IDs only: ${fileIds.length}`);
    
    if (fileIds.length > 0) {
      console.log('\nSample file IDs (first 3):');
      fileIds.slice(0, 3).forEach(v => console.log(`  - ${v.image_id}`));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkImages();
