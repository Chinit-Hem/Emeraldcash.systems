import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth-helpers";
import { uploadImage } from "@/lib/cloudinary";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized - Please log in" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("Choose an image to upload");
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error("Use a JPG, PNG, WebP, or GIF image");
    if (file.size > MAX_IMAGE_SIZE) throw new Error("The image must be 8 MB or smaller");

    const result = await uploadImage(file, {
      folder: "operation_reports",
      tags: ["operation-report", session.username],
      compress: true,
      maxWidth: 1600,
      quality: 0.85,
      timeout: 120_000,
      retryAttempts: 2,
    });
    if (!result.success || !result.url) throw new Error(result.error || "Image upload failed");

    return NextResponse.json({ success: true, data: { name: file.name, url: result.url, publicId: result.publicId || null } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not upload image" }, { status: 400 });
  }
}
