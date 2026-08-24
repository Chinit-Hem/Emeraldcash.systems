import { Buffer } from "node:buffer";
import { NextRequest, NextResponse } from "next/server";

import { getSession, hasAppPermission } from "@/lib/auth-helpers";
import { getCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf", "text/plain", "text/csv",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized - Please log in" }, { status: 401 });
  const canContribute = hasAppPermission(session.role, "loans:create") || hasAppPermission(session.role, "loans:edit") || hasAppPermission(session.role, "loans:approve");
  if (!canContribute) return NextResponse.json({ success: false, error: "Forbidden - Insufficient permissions" }, { status: 403 });
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("Choose a file to attach");
    if (!ALLOWED_TYPES.has(file.type)) throw new Error("Use an image, PDF, Word, Excel, CSV, or text file");
    if (file.size > MAX_FILE_SIZE) throw new Error("The attachment must be 10 MB or smaller");

    const cloudinary = await getCloudinary();
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        folder: "loan_activity",
        resource_type: "auto",
        use_filename: true,
        unique_filename: true,
      }, (error, result) => {
        if (error || !result?.secure_url) reject(error || new Error("Attachment upload failed"));
        else resolve({ secure_url: result.secure_url, public_id: result.public_id });
      });
      stream.end(buffer);
    });

    return NextResponse.json({ success: true, data: { name: file.name, url: uploaded.secure_url, publicId: uploaded.public_id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not upload attachment" }, { status: 400 });
  }
}
