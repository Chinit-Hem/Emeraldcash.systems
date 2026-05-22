type UploadSmsImageOptions = {
  file: File | null;
  folder: string;
  publicIdPrefix: string;
  entityId?: string | null;
};

export async function uploadSmsImage({
  file,
  folder,
  publicIdPrefix,
  entityId,
}: UploadSmsImageOptions): Promise<string | undefined> {
  const trimmedEntityId = entityId?.trim();
  if (!file || !trimmedEntityId) return undefined;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  formData.append("publicId", `${publicIdPrefix}_${trimmedEntityId}_${Date.now()}`);

  const response = await fetch("/api/sms/assets/upload", {
    method: "POST",
    body: formData,
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false || typeof result.url !== "string") {
    throw new Error(result.error || "Image upload failed");
  }

  return result.url;
}
