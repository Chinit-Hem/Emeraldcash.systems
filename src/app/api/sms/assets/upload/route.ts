import { NextRequest, NextResponse } from 'next/server';
import { uploadImage } from '@/lib/cloudinary';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = formData.get('folder') as string || 'sms/assets/images';
    const publicId = formData.get('publicId') as string || `sms-${randomUUID().replace(/-/g, '').slice(0, 8)}`;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const result = await uploadImage(file, {
      folder,
      publicId,
      compress: true,
      timeout: 30000,
    });

    if (result.success) {
      return NextResponse.json({ success: true, url: result.url, publicId: result.publicId });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
