import {
  getAppScrollSnapshot,
  getRememberedAppScrollSnapshot,
  rememberAppScrollSnapshot,
  rememberAppShellRouteScrollPosition,
  type AppScrollSnapshot,
} from "@/shared/utils/appScroll";

export const SMS_ASSETS_PATH = "/sms/assets";
export const SMS_ASSET_RETURN_PARAM = "from";
export const SMS_ASSET_FOCUS_PARAM = "focusAsset";
export const SMS_ASSET_LIST_SCROLL_SNAPSHOT_STORAGE_PREFIX = "sms_asset_list_scroll:";

export type AssetListFilters = {
  search: string;
  status: string;
  type: string;
  category: string;
  location: string;
  assignedTo: string;
  createdBy: string;
  sort: string;
  page: number;
  pageSize: number;
};

type SearchParamReader = {
  get(name: string): string | null;
};

export const DEFAULT_ASSET_LIST_FILTERS: AssetListFilters = {
  search: "",
  status: "",
  type: "",
  category: "",
  location: "",
  assignedTo: "",
  createdBy: "",
  sort: "updated_desc",
  page: 1,
  pageSize: 20,
};

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseAssetListFilters(searchParams: SearchParamReader): AssetListFilters {
  return {
    search: searchParams.get("search") ?? DEFAULT_ASSET_LIST_FILTERS.search,
    status: searchParams.get("status") ?? DEFAULT_ASSET_LIST_FILTERS.status,
    type: searchParams.get("type") ?? DEFAULT_ASSET_LIST_FILTERS.type,
    category: searchParams.get("category") ?? DEFAULT_ASSET_LIST_FILTERS.category,
    location: searchParams.get("location") ?? DEFAULT_ASSET_LIST_FILTERS.location,
    assignedTo:
      searchParams.get("assignedTo") ??
      searchParams.get("assigned_to") ??
      DEFAULT_ASSET_LIST_FILTERS.assignedTo,
    createdBy:
      searchParams.get("createdBy") ??
      searchParams.get("created_by") ??
      DEFAULT_ASSET_LIST_FILTERS.createdBy,
    sort: searchParams.get("sort") ?? DEFAULT_ASSET_LIST_FILTERS.sort,
    page: parsePositiveInteger(searchParams.get("page"), DEFAULT_ASSET_LIST_FILTERS.page),
    pageSize: parsePositiveInteger(
      searchParams.get("pageSize"),
      DEFAULT_ASSET_LIST_FILTERS.pageSize
    ),
  };
}

export function areAssetListFiltersEqual(
  left: AssetListFilters,
  right: AssetListFilters
) {
  return (
    left.search === right.search &&
    left.status === right.status &&
    left.type === right.type &&
    left.category === right.category &&
    left.location === right.location &&
    left.assignedTo === right.assignedTo &&
    left.createdBy === right.createdBy &&
    left.sort === right.sort &&
    left.page === right.page &&
    left.pageSize === right.pageSize
  );
}

export function buildAssetListPath(
  filters: AssetListFilters = DEFAULT_ASSET_LIST_FILTERS,
  focusAssetId?: string
) {
  const params = new URLSearchParams();
  const search = filters.search.trim();
  const type = filters.type.trim();
  const category = filters.category.trim();
  const location = filters.location.trim();
  const assignedTo = filters.assignedTo.trim();
  const createdBy = filters.createdBy.trim();

  if (search) params.set("search", search);
  if (filters.status) params.set("status", filters.status);
  if (type) params.set("type", type);
  if (category) params.set("category", category);
  if (location) params.set("location", location);
  if (assignedTo) params.set("assignedTo", assignedTo);
  if (createdBy) params.set("createdBy", createdBy);
  if (filters.sort !== DEFAULT_ASSET_LIST_FILTERS.sort) params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize !== DEFAULT_ASSET_LIST_FILTERS.pageSize) {
    params.set("pageSize", String(filters.pageSize));
  }
  if (focusAssetId) params.set(SMS_ASSET_FOCUS_PARAM, focusAssetId);

  const query = params.toString();
  return query ? `${SMS_ASSETS_PATH}?${query}` : SMS_ASSETS_PATH;
}

export function buildAssetDetailPath(assetId: string, returnPath?: string) {
  if (!returnPath) {
    return `${SMS_ASSETS_PATH}/${assetId}`;
  }

  const params = new URLSearchParams({ [SMS_ASSET_RETURN_PARAM]: returnPath });
  return `${SMS_ASSETS_PATH}/${assetId}?${params.toString()}`;
}

export function buildAssetEditPath(assetId: string, returnPath?: string) {
  if (!returnPath) {
    return `${SMS_ASSETS_PATH}/${assetId}/edit`;
  }

  const params = new URLSearchParams({ [SMS_ASSET_RETURN_PARAM]: returnPath });
  return `${SMS_ASSETS_PATH}/${assetId}/edit?${params.toString()}`;
}

export function getSafeAssetListReturnPath(returnPath?: string | null) {
  if (!returnPath) {
    return SMS_ASSETS_PATH;
  }

  const trimmedPath = returnPath.trim();

  if (!trimmedPath.startsWith(SMS_ASSETS_PATH) || trimmedPath.startsWith("//")) {
    return SMS_ASSETS_PATH;
  }

  try {
    const url = new URL(trimmedPath, "https://local.sms");

    if (url.origin !== "https://local.sms" || url.pathname !== SMS_ASSETS_PATH) {
      return SMS_ASSETS_PATH;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return SMS_ASSETS_PATH;
  }
}

export function getAssetListItemElementId(assetId: string) {
  return `sms-asset-${assetId}`;
}

function getAssetListScrollSnapshotStorageKey(returnPath: string) {
  return `${SMS_ASSET_LIST_SCROLL_SNAPSHOT_STORAGE_PREFIX}${getSafeAssetListReturnPath(returnPath)}`;
}

export function rememberAssetListScrollSnapshot(
  returnPath: string,
  snapshot: AppScrollSnapshot = getAppScrollSnapshot()
) {
  const safeReturnPath = getSafeAssetListReturnPath(returnPath);

  rememberAppScrollSnapshot(getAssetListScrollSnapshotStorageKey(safeReturnPath), snapshot);
  rememberAppShellRouteScrollPosition(safeReturnPath, snapshot);
}

export function getStoredAssetListScrollSnapshot(returnPath: string) {
  return getRememberedAppScrollSnapshot(getAssetListScrollSnapshotStorageKey(returnPath));
}
