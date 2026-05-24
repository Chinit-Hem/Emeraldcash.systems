export function driveThumbnailUrl(fileId: string, size = "w1000-h1000") {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=${encodeURIComponent(size)}`;
}

export function isDriveHostedImageUrl(value: string | null | undefined): boolean {
  if (!value) return false;

  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "drive.google.com" || host.endsWith(".googleusercontent.com");
  } catch {
    return false;
  }
}

export function extractDriveFileId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;

  // If it's already a file id.
  if (/^[a-zA-Z0-9_-]{10,}$/.test(raw)) return raw;

  // Common Drive URL formats:
  // - https://drive.google.com/thumbnail?id=FILEID&sz=...
  // - https://drive.google.com/open?id=FILEID
  // - https://drive.google.com/uc?id=FILEID
  try {
    const url = new URL(raw);
    const id = url.searchParams.get("id");
    if (id && /^[a-zA-Z0-9_-]{10,}$/.test(id)) return id;
  } catch {
    // ignore
  }

  // - https://drive.google.com/file/d/FILEID/view
  const filePathMatch = raw.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (filePathMatch?.[1]) return filePathMatch[1];

  // - https://lh3.googleusercontent.com/d/FILEID=...
  const googleusercontentMatch = raw.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]{10,})/);
  if (googleusercontentMatch?.[1]) return googleusercontentMatch[1];

  return null;
}
