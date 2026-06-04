import type {
  CreateAssetResult,
  SmsAssetApiItem,
  SmsAssetOption,
} from "@/systems/sms/types/sms-movement";

const SMS_ASSETS_URL = "/api/sms/assets?pageSize=200";

export const NEW_ASSET_VALIDATION_ID = "00000000-0000-4000-8000-000000000000";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toAssetOption(asset: SmsAssetApiItem): SmsAssetOption {
  return {
    id: asset.id,
    name: asset.name,
    itemCode: asset.itemCode,
    location: asset.location,
    assignedTo: asset.assignedTo,
    status: asset.status || "Available",
  };
}

export async function fetchSmsAssetOptions(signal?: AbortSignal): Promise<SmsAssetOption[]> {
  const response = await fetch(SMS_ASSETS_URL, { signal });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success || !Array.isArray(data.data)) {
    return [];
  }

  return data.data.map(toAssetOption);
}

export async function createAssetFromTransfer(assetName: string): Promise<CreateAssetResult> {
  try {
    const response = await fetch("/api/sms/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: assetName.trim(),
        type: "Other",
        quantity: 1,
        status: "Available",
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success || typeof result.data?.id !== "string") {
      return { success: false, error: result.error || "Failed to create asset" };
    }

    return { success: true, assetId: result.data.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create asset" };
  }
}

export function isValidUUID(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function findAssetByInput(assets: SmsAssetOption[], input: string): SmsAssetOption | undefined {
  const query = input.trim().toLowerCase();
  if (!query) return undefined;

  return assets.find(
    (asset) =>
      asset.name.toLowerCase() === query ||
      asset.itemCode?.toLowerCase() === query
  );
}

export function getVisibleMovementAssets(
  assets: SmsAssetOption[],
  searchInput: string,
  limit = 12
): SmsAssetOption[] {
  const query = searchInput.trim().toLowerCase();
  const matches: SmsAssetOption[] = [];

  for (const asset of assets) {
    const isMatch =
      !query ||
      asset.name.toLowerCase().includes(query) ||
      (asset.itemCode?.toLowerCase().includes(query) ?? false) ||
      asset.id.toLowerCase().includes(query) ||
      (asset.assignedTo?.toLowerCase().includes(query) ?? false);

    if (!isMatch) continue;

    matches.push(asset);
    if (matches.length >= limit) break;
  }

  return matches;
}
