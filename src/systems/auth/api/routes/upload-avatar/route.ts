/**
 * Avatar Upload API - Upload user profile pictures to Cloudinary
 * 
 * Features:
 * - Cloudinary image upload
 * - Image compression and optimization
 * - Secure authentication required
 * 
 * @module api/auth/upload-avatar
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import crypto from "crypto";

// Cloudinary config
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Security headers
const securityHeaders = {
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  console.log(`[${requestId}] POST /api/auth/upload-avatar - Started`);
  
  try {
    // Check Cloudinary config
    if (!CLOUD_NAME) {
      return NextResponse.json(
        { ok: false, error: "Cloudinary not configured" },
        { status: 500, headers: securityHeaders }
      );
    }
    
    // Authenticate session
    const session = getSession(req);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized - Please log in" },
        { status: 401, headers: securityHeaders }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No file provided" },
        { status: 400, headers: securityHeaders }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." },
        { status: 400, headers: securityHeaders }
      );
    }

    // Validate file size (max 500KB for fast upload)
    const maxSize = 500 * 1024; // 500KB
    if (file.size > maxSize) {
      return NextResponse.json(
        { ok: false, error: "File too large. Maximum size is 500KB for avatars." },
        { status: 400, headers: securityHeaders }
      );
    }

    console.log(`[${requestId}] Uploading: ${file.name}, ${file.size} bytes, type: ${file.type}`);

    // Convert to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;
    
    console.log(`[${requestId}] Data URI length: ${dataUri.length} chars`);

    // Use signed upload (more reliable than unsigned)
    const timestamp = Math.round(Date.now() / 1000);
    const publicId = `avatar-${session.username}-${timestamp}`;
    const folder = "user-avatars";
    
    // Generate signature for signed upload
    let signature = "";
    if (API_SECRET) {
      const stringToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
      signature = crypto.createHash("sha1").update(stringToSign).digest("hex");
    }

    // Upload directly to Cloudinary using fetch
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    
    const uploadFormData = new FormData();
    uploadFormData.append("file", dataUri);
    uploadFormData.append("api_key", API_KEY || "");
    uploadFormData.append("timestamp", timestamp.toString());
    uploadFormData.append("public_id", publicId);
    uploadFormData.append("folder", folder);
    if (signature) {
      uploadFormData.append("signature", signature);
    }
    
    console.log(`[${requestId}] Cloud name: ${CLOUD_NAME}`);
    console.log(`[${requestId}] Using signed upload: ${!!signature}`);
    console.log(`[${requestId}] URL: ${cloudinaryUrl}`);
    
    const response = await fetch(cloudinaryUrl, {
      method: "POST",
      body: uploadFormData,
    });

    console.log(`[${requestId}] Cloudinary response status: ${response.status}`);
    
    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = { raw: await response.text() };
      }
      console.error(`[${requestId}] Cloudinary error (${response.status}):`, JSON.stringify(errorDetails, null, 2));
      return NextResponse.json(
        { ok: false, error: `Cloudinary error: ${errorDetails?.error?.message || JSON.stringify(errorDetails)}` },
        { status: 500, headers: securityHeaders }
      );
    }

    const result = await response.json();
    console.log(`[${requestId}] Upload successful:`, result.secure_url);

    return NextResponse.json({
      ok: true,
      url: result.secure_url,
      public_id: result.public_id,
    }, { headers: securityHeaders });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] Error:`, errorMessage);
    return NextResponse.json(
      { ok: false, error: "Upload failed", details: errorMessage },
      { status: 500, headers: securityHeaders }
    );
  }
}
