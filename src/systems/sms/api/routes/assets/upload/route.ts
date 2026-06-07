import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-helpers';
import { uploadImage } from '@/lib/cloudinary';
import { randomUUID } from 'crypto';

const DEFAULT_SMS_UPLOAD_FOLDER = 'sms/assets/images';
const ALLOWED_SMS_UPLOAD_FOLDERS = new Set([
  DEFAULT_SMS_UPLOAD_FOLDER,
  'sms/transfers/images',
  'sms/returns/images',
]);
const SAFE_PUBLIC_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,120}$/;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getFormString(formData: FormData, field: string): string | null {
  const value = formData.get(field);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function POST(req: NextRequest) {
  try {
    const createAuth = requirePermission(req, 'sms:create');
    const transferAuth = createAuth.response ? requirePermission(req, 'sms:transfer') : createAuth;
    const auth = createAuth.response ? transferAuth : createAuth;
    if (auth.response) return auth.response;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = getFormString(formData, 'folder') || DEFAULT_SMS_UPLOAD_FOLDER;
    const publicId = getFormString(formData, 'publicId') || `sms-${randomUUID().replace(/-/g, '').slice(0, 8)}`;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_SMS_UPLOAD_FOLDERS.has(folder)) {
      return NextResponse.json({ success: false, error: 'Invalid upload folder' }, { status: 400 });
    }

    if (!SAFE_PUBLIC_ID_PATTERN.test(publicId) || publicId.includes('..')) {
      return NextResponse.json({ success: false, error: 'Invalid upload public id' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'Image file is too large' }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ success: false, error: 'Invalid image file type' }, { status: 400 });
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
