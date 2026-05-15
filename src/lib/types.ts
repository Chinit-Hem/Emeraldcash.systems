
export type Role = "Admin" | "Staff" | "Transfer" | string;

// Role definition for custom roles
export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: Permission[];
  isSystem: boolean; // true for Admin/Staff, false for custom roles
  createdAt?: string;
  updatedAt?: string;
}

// Permission types
export type Permission =
  | "vehicles:view"
  | "vehicles:create"
  | "vehicles:edit"
  | "vehicles:delete"
  | "sms:view"
  | "sms:create"
  | "sms:edit"
  | "sms:delete"
  | "sms:transfer"
  | "users:view"
  | "users:create"
  | "users:edit"
  | "users:delete"
  | "lms:view"
  | "lms:manage"
  | "settings:view"
  | "settings:manage"
  | "reports:view"
  | "reports:manage"
  | "roles:manage";

// Default permissions for system roles
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  Admin: [
    "vehicles:view", "vehicles:create", "vehicles:edit", "vehicles:delete",
    "sms:view", "sms:create", "sms:edit", "sms:delete", "sms:transfer",
    "users:view", "users:create", "users:edit", "users:delete",
    "lms:view", "lms:manage",
    "settings:view", "settings:manage",
    "reports:view", "reports:manage",
    "roles:manage"
  ],
  Staff: [
    "vehicles:view",           // Can view vehicles (read-only)
    "sms:view",                // Can view stock/assets
    "sms:transfer",            // Can participate in stock transfers
    "users:view",              // Can view users
    "lms:view",                // Can access LMS
    "reports:view"             // Can view reports
    // Note: Staff CANNOT create/edit/delete vehicles or access settings
  ],
  Transfer: [
    "lms:view",                // Can access LMS
    "sms:view",                // Can view stock/assets
    "sms:transfer",            // Can create and manage transfers
    "users:view"               // Can view users for sender/receiver selection
  ]
};

// Permission labels for UI
export const PERMISSION_LABELS: Record<Permission, string> = {
  "vehicles:view": "View Vehicles",
  "vehicles:create": "Create Vehicles",
  "vehicles:edit": "Edit Vehicles",
  "vehicles:delete": "Delete Vehicles",
  "sms:view": "View Stock",
  "sms:create": "Create Stock",
  "sms:edit": "Edit Stock",
  "sms:delete": "Delete Stock",
  "sms:transfer": "Transfer Stock",
  "users:view": "View Users",
  "users:create": "Create Users",
  "users:edit": "Edit Users",
  "users:delete": "Delete Users",
  "lms:view": "View LMS",
  "lms:manage": "Manage LMS",
  "settings:view": "View Settings",
  "settings:manage": "Manage Settings",
  "reports:view": "View Reports",
  "reports:manage": "Manage Reports",
  "roles:manage": "Manage Roles"
};

// Permission categories for grouping
export const PERMISSION_CATEGORIES = {
  "Vehicles": ["vehicles:view", "vehicles:create", "vehicles:edit", "vehicles:delete"] as Permission[],
  "SMS": ["sms:view", "sms:create", "sms:edit", "sms:delete", "sms:transfer"] as Permission[],
  "Users": ["users:view", "users:create", "users:edit", "users:delete"] as Permission[],
  "LMS": ["lms:view", "lms:manage"] as Permission[],
  "Settings": ["settings:view", "settings:manage"] as Permission[],
  "Reports": ["reports:view", "reports:manage"] as Permission[],
  "System": ["roles:manage"] as Permission[]
};

export type User = {
  username: string;
  role: Role;
  full_name?: string;
  email?: string;
  phone?: string;
  bio?: string;
  profile_picture?: string;
  created_at?: string;
  updated_at?: string;
};

// Tax type options for vehicle registration
export const TAX_TYPE_OPTIONS = [
  "Tax Paper",
  "Plate Number",
  "Standard",
  "Luxury",
  "Commercial",
] as const;

export type TaxType = (typeof TAX_TYPE_OPTIONS)[number];

// Tax Type metadata with descriptions for static data
export interface TaxTypeMetadata {
  value: TaxType;
  label: string;
  description: string;
  color: string;
}

export const TAX_TYPE_METADATA: TaxTypeMetadata[] = [
  {
    value: "Tax Paper",
    label: "Tax Paper",
    description: "Standard tax documentation",
    color: "blue",
  },
  {
    value: "Plate Number",
    label: "Plate Number",
    description: "Vehicle with license plate registration",
    color: "cyan",
  },
  {
    value: "Standard",
    label: "Standard",
    description: "Regular vehicle registration",
    color: "green",
  },
  {
    value: "Luxury",
    label: "Luxury",
    description: "High-end vehicle taxes",
    color: "purple",
  },
  {
    value: "Commercial",
    label: "Commercial",
    description: "Business/commercial vehicles",
    color: "orange",
  },
] as const;

// Color options for vehicle selection
export const COLOR_OPTIONS = [
  { value: "White", hex: "#FFFFFF" },
  { value: "Black", hex: "#000000" },
  { value: "Silver", hex: "#C0C0C0" },
  { value: "Gray", hex: "#808080" },
  { value: "Red", hex: "#FF0000" },
  { value: "Blue", hex: "#0000FF" },
  { value: "Green", hex: "#008000" },
  { value: "Yellow", hex: "#FFFF00" },
  { value: "Orange", hex: "#FFA500" },
  { value: "Brown", hex: "#A52A2A" },
  { value: "Beige", hex: "#F5F5DC" },
  { value: "Gold", hex: "#FFD700" },
  { value: "Navy", hex: "#000080" },
  { value: "Purple", hex: "#800080" },
  { value: "Pink", hex: "#FFC0CB" },
  { value: "Other", hex: "#808080" },
] as const;

// Plate number validation helper
export const PLATE_NUMBER_MAX_LENGTH = 20;

// Cambodia plate number format hints
export const PLATE_NUMBER_HINTS = [
  "1A-1234",
  "2B-5678",
  "AA-9999",
  "BB-1234",
];

export type Vehicle = {
  VehicleId: string;
  Category: string;
  Brand: string;
  Model: string;
  Year: number | null;
  Plate: string;
  PriceNew: number | null;
  Price40: number | null;
  Price70: number | null;
  TaxType: string;
  Condition: string;
  BodyType: string;
  Color: string;
  ShadowBox?: string | null; // Shadow box/trim color
  // Image is always normalized to a string (Google Sheets arrays are converted)
  Image: string;
  Time: string;
  _deleted?: boolean;
  Description?: string | null; // Additional notes/description about the vehicle

  // Stock tracking for mortgage/employee use
  SenderId?: number | null;
  ReceiverId?: number | null;
  HandoverDate?: string | null;
Status?: 'PENDING' | 'ASSIGNED' | 'ACCEPTED' | 'LOST' | 'RETURNED' | 'OUT' | 'NOT_RETURNED';
  Remarks?: string;

  // Market price fields (optional, populated from external sources)
  MarketPriceLow?: number | null;
  MarketPriceMedian?: number | null;
  MarketPriceHigh?: number | null;
  MarketPriceSource?: string | null;
  MarketPriceSamples?: number | null;
  MarketPriceUpdatedAt?: string | null;
  MarketPriceConfidence?: "High" | "Medium" | "Low" | null;
};

export type StockMovementType = 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER' | 'RETURN';

export interface StockItem {
  id: number;
  model_key: string; // brand_model_year_condition_color hash
  location: string;
  quantity: number;
  min_stock: number;
  available: number;
  reserved: number;
  last_updated: string;
  brand: string;
  model: string;
  year: number | null;
  condition: string;
  color: string;
  is_low_stock: boolean;
}

export interface StockMovement {
  id: number;
  stock_item_id: number;
  type: StockMovementType;
  quantity: number;
  reason: string;
  user_id: number;
  from_location?: string;
  to_location?: string;
  created_at: string;
}

export interface StockStats {
  total_items: number;
  total_quantity: number;
  low_stock_items: number;
  locations: string[];
}



// VehicleMeta represents the FULL dataset metadata from API
// This is computed from all records, not just the current page
export type VehicleMeta = {
  total?: number;           // Total count of ALL vehicles (not max ID)
  countsByCategory?: {
    Cars?: number;          // Normalized from "Car", "Cars"
    Motorcycles?: number;   // Normalized from "Motorcycle", "Motorcycles"
    TukTuks?: number;       // Normalized from "Tuk Tuk", "TukTuks", etc.
  };
  avgPrice?: number;        // Average price across ALL vehicles
  noImageCount?: number;    // Count of vehicles without images
  countsByCondition?: {
    New?: number;           // Normalized from "New", "new"
    Used?: number;          // Normalized from "Used", "used"
    Other?: number;         // Catch-all for other conditions
  };
};

// Helper type for computed filtered metadata (client-side)
export type FilteredVehicleMeta = VehicleMeta;
