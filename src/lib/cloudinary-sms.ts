import { v2 as cloudinary } from 'cloudinary';
// dbManager available if needed for future DB operations

import { generateUUID } from './uuid'; // Import UUID generator
// Configure if not already (assume src/lib/cloudinary.ts exists, extend)
const uploadToCloudinary = async (file: File, folder: 'sms/assets/images' | 'sms/assets/docs', publicId?: string): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId || `sms/${generateUUID()}`, // Use UUID for security
          resource_type: folder.includes('docs') ? 'raw' : 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    return (result as {secure_url: string}).secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Upload failed');
  }
};

export { uploadToCloudinary };
