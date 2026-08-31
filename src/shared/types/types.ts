
export type Role = "System Administrator" | "Branch Manager" | "Loan Operations" | "Loan Specialist" | "Accountant" | "Assistant Accountant" | "Credit / Approver" | "Risk & Compliance" | "Human Resources" | "IT Support" | "Marketing" | "Intern / Read Only" | "Executive Viewer" | "Admin" | "Staff" | "Finance" | "Manager / Approver" | string;

export const STANDARD_ROLES = [
  "System Administrator", "Branch Manager", "Loan Operations", "Loan Specialist",
  "Accountant", "Assistant Accountant", "Credit / Approver", "Risk & Compliance",
  "Human Resources", "IT Support", "Marketing", "Intern / Read Only", "Executive Viewer",
] as const;

export const LEGACY_ROLE_NAMES = ["Admin", "Staff", "Finance", "Manager / Approver"] as const;

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
  | "loans:view"
  | "loans:create"
  | "loans:edit"
  | "loans:approve"
  | "loans:disburse"
  | "loans:repay"
  | "loans:delete"
  | "settings:view"
  | "settings:manage"
  | "reports:view"
  | "reports:manage"
  | "roles:manage";

// Default permissions for system roles
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  "System Administrator": [
    "vehicles:view", "vehicles:create", "vehicles:edit", "vehicles:delete", "sms:view", "sms:create", "sms:edit", "sms:delete", "sms:transfer",
    "users:view", "users:create", "users:edit", "users:delete", "lms:view", "lms:manage", "loans:view", "loans:create", "loans:edit", "loans:approve", "loans:disburse", "loans:repay", "loans:delete",
    "settings:view", "settings:manage", "reports:view", "reports:manage", "roles:manage"
  ],
  "Branch Manager": ["vehicles:view", "sms:view", "lms:view", "loans:view", "loans:approve", "reports:view", "reports:manage"],
  "Loan Specialist": ["loans:view", "loans:create", "loans:edit", "reports:view"],
  Accountant: ["loans:view", "loans:disburse", "loans:repay", "reports:view"],
  "Assistant Accountant": ["loans:view", "reports:view"],
  "Credit / Approver": ["loans:view", "loans:approve", "reports:view", "reports:manage"],
  Admin: [
    "vehicles:view", "vehicles:create", "vehicles:edit", "vehicles:delete",
    "sms:view", "sms:create", "sms:edit", "sms:delete", "sms:transfer",
    "users:view", "users:create", "users:edit", "users:delete",
    "lms:view", "lms:manage",
    "loans:view", "loans:create", "loans:edit", "loans:approve", "loans:disburse", "loans:repay", "loans:delete",
    "settings:view", "settings:manage",
    "reports:view", "reports:manage",
    "roles:manage"
  ],
  Staff: [
    "vehicles:view",           // Can view vehicles (read-only)
    "sms:view",                // Can view SMS assets
    "sms:transfer",            // Can participate in asset transfers
    "sms:create",              // Can upload images / create assets as part of transfer flow
    "users:view",              // Can view users
    "lms:view",                // Can access LMS
    "loans:view", "loans:create", "loans:edit", // Can prepare and submit loan applications
    "reports:view"             // Can view reports
  ],
  Finance: [
    "vehicles:view",           // Same app permissions as Staff
    "sms:view",
    "sms:transfer",
    "sms:create",
    "users:view",
    "lms:view",
    "loans:view", "loans:create", "loans:edit", "loans:approve", "loans:disburse", "loans:repay",
    "reports:view"
  ],
  "Loan Operations": ["loans:view", "loans:create", "loans:edit", "loans:approve", "reports:view"],
  "Manager / Approver": [
    "vehicles:view",
    "sms:view",
    "lms:view",
    "loans:view", "loans:create", "loans:edit", "loans:approve",
    "reports:view", "reports:manage",
  ],
  "Human Resources": ["users:view", "users:create", "users:edit", "lms:view", "settings:view", "reports:view"],
  "IT Support": ["vehicles:view", "sms:view", "users:view", "lms:view", "loans:view", "settings:view", "reports:view"],
  "Risk & Compliance": ["loans:view", "reports:view"],
  Marketing: ["lms:view"],
  "Intern / Read Only": ["lms:view"],
  "Executive Viewer": ["loans:view", "loans:approve", "reports:view", "reports:manage"]
};

// All roles may access the shared LMS, VMS, and SMS areas in read-only mode.
// Role-specific create/edit/delete permissions above remain unchanged.
for (const permissions of Object.values(DEFAULT_ROLE_PERMISSIONS)) {
  for (const permission of ["lms:view", "vehicles:view", "sms:view"] as const) {
    if (!permissions.includes(permission)) permissions.push(permission);
  }
}

// Permission labels for UI
export const PERMISSION_LABELS: Record<Permission, string> = {
  "vehicles:view": "View Vehicles",
  "vehicles:create": "Create Vehicles",
  "vehicles:edit": "Edit Vehicles",
  "vehicles:delete": "Delete Vehicles",
  "sms:view": "View Assets",
  "sms:create": "Create Assets",
  "sms:edit": "Edit Assets",
  "sms:delete": "Delete Assets",
  "sms:transfer": "Transfer Assets",
  "users:view": "View Users",
  "users:create": "Create Users",
  "users:edit": "Edit Users",
  "users:delete": "Delete Users",
  "lms:view": "View LMS",
  "lms:manage": "Manage LMS",
  "loans:view": "View Loans",
  "loans:create": "Create Loan Applications",
  "loans:edit": "Edit Loan Applications",
  "loans:approve": "Approve or Reject Loans",
  "loans:disburse": "Disburse Approved Loans",
  "loans:repay": "Record Loan Repayments",
  "loans:delete": "Delete Loan Applications",
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
  "Loans": ["loans:view", "loans:create", "loans:edit", "loans:approve", "loans:disburse", "loans:repay", "loans:delete"] as Permission[],
  "Settings": ["settings:view", "settings:manage"] as Permission[],
  "Reports": ["reports:view", "reports:manage"] as Permission[],
  "System": ["roles:manage"] as Permission[]
};

export type User = {
  username: string;
  role: Role;
  full_name?: string;
  position?: string;
  department?: string;
  branch?: string;
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

export const CAR_BRAND_OPTIONS = [
  "Toyota",
  "Lexus",
  "Honda",
  "Nissan",
  "Mazda",
  "Mitsubishi",
  "Suzuki",
  "Hyundai",
  "Kia",
  "Ford",
  "Chevrolet",
  "Mercedes-Benz",
  "BMW",
  "Audi",
  "Isuzu",
] as const;

export const MOTORCYCLE_BRAND_OPTIONS = [
  "Honda",
  "Yamaha",
  "Suzuki",
  "Kawasaki",
  "KTM",
  "Ducati",
  "Bajaj",
  "KR Motor",
  "GPX",
  "GTR",
  "Keeway",
  "Benelli",
  "Stallion",
  "BMW",
  "UMG",
  "Calypso",
  "CFMOTO",
  "SYM",
  "Harley Davidson",
  "Husqvarna",
  "HYOSUNG",
  "Italjet Dragster",
  "Lambretta",
  "Peugeot",
  "Piaggio",
  "Royal Enfield",
  "Triumph",
  "Vespa",
  "YADEA",
  "Zontes",
  "Other - ផ្សេងៗ",
] as const;

export const TUK_TUK_BRAND_OPTIONS = [
  "Bajaj",
  "Piaggio",
  "Onion",
] as const;

export const VEHICLE_BRAND_OPTIONS_BY_CATEGORY = {
  Cars: CAR_BRAND_OPTIONS,
  Motorcycles: MOTORCYCLE_BRAND_OPTIONS,
  "Tuk Tuk": TUK_TUK_BRAND_OPTIONS,
  TukTuks: TUK_TUK_BRAND_OPTIONS,
} as const;

export const MOTORCYCLE_MODEL_OPTIONS_BY_BRAND = {
  Honda: [
    "Dream",
    "Wave",
    "Click",
    "Scoopy",
    "PCX",
    "ADV",
    "Air Blade",
    "Winner X",
    "Forza",
    "CB",
    "CBR",
    "CRF",
    "Other - ផ្សេងៗ",
  ],
  Yamaha: [
    "NMAX",
    "XMAX",
    "Aerox",
    "Exciter",
    "Grand Filano",
    "Fino",
    "Mio",
    "QBIX",
    "R15",
    "MT-15",
    "FZ",
    "Other - ផ្សេងៗ",
  ],
  Suzuki: [
    "Smash",
    "Nex",
    "Address",
    "Let's",
    "Hayate",
    "Raider",
    "GSX-R150",
    "GSX-S150",
    "Burgman",
    "V-Strom",
    "Other - ផ្សេងៗ",
  ],
  Kawasaki: [
    "Ninja",
    "Z",
    "KLX",
    "D-Tracker",
    "Versys",
    "W175",
    "Vulcan",
    "Eliminator",
    "Other - ផ្សេងៗ",
  ],
  KTM: [
    "Duke",
    "RC",
    "Adventure",
    "EXC",
    "SX",
    "Other - ផ្សេងៗ",
  ],
  Ducati: [
    "Monster",
    "Scrambler",
    "Panigale",
    "Multistrada",
    "Diavel",
    "Hypermotard",
    "Streetfighter",
    "Other - ផ្សេងៗ",
  ],
  Bajaj: [
    "Pulsar",
    "Dominar",
    "Avenger",
    "CT",
    "Platina",
    "Discover",
    "RE",
    "Qute",
    "Other - ផ្សេងៗ",
  ],
  "KR Motor": [
    "KR",
    "KR EV",
    "Other - ផ្សេងៗ",
  ],
  GPX: [
    "Legend",
    "Demon",
    "Drone",
    "Popz",
    "Rock",
    "Raptor",
    "Other - ផ្សេងៗ",
  ],
  GTR: [
    "Spring",
    "Other - ផ្សេងៗ",
  ],
  Keeway: [
    "RKV",
    "RKF",
    "Superlight",
    "K-Light",
    "TX",
    "Versilia",
    "Sixties",
    "Other - ផ្សេងៗ",
  ],
  Benelli: [
    "TNT",
    "TRK",
    "Leoncino",
    "Imperiale",
    "302S",
    "502C",
    "Other - ផ្សេងៗ",
  ],
  Stallion: [
    "Centaur",
    "Buccaneer",
    "Makina",
    "SMX",
    "Street",
    "Other - ផ្សេងៗ",
  ],
  BMW: [
    "G 310 R",
    "G 310 GS",
    "C 400 X",
    "C 400 GT",
    "F 750 GS",
    "F 850 GS",
    "R 1250 GS",
    "S 1000 RR",
    "Other - ផ្សេងៗ",
  ],
  UMG: [
    "Other - ផ្សេងៗ",
  ],
  Calypso: [
    "Other - ផ្សេងៗ",
  ],
  CFMOTO: [
    "150NK",
    "250NK",
    "300NK",
    "400NK",
    "650NK",
    "450SR",
    "650MT",
    "800MT",
    "Other - ផ្សេងៗ",
  ],
  SYM: [
    "Jet",
    "Fiddle",
    "Cruisym",
    "Maxsym",
    "Wolf",
    "Other - ផ្សេងៗ",
  ],
  "Harley Davidson": [
    "Sportster",
    "Street",
    "Softail",
    "Dyna",
    "Touring",
    "Pan America",
    "Other - ផ្សេងៗ",
  ],
  Husqvarna: [
    "Svartpilen",
    "Vitpilen",
    "Norden",
    "FE",
    "TE",
    "Other - ផ្សេងៗ",
  ],
  HYOSUNG: [
    "GT",
    "GV",
    "GD",
    "Aquila",
    "Other - ផ្សេងៗ",
  ],
  "Italjet Dragster": [
    "Dragster",
    "Other - ផ្សេងៗ",
  ],
  Lambretta: [
    "V50",
    "V125",
    "V200",
    "X125",
    "X300",
    "Other - ផ្សេងៗ",
  ],
  Peugeot: [
    "Django",
    "Kisbee",
    "Speedfight",
    "Tweet",
    "Metropolis",
    "XP400",
    "Other - ផ្សេងៗ",
  ],
  Piaggio: [
    "Liberty",
    "Medley",
    "Beverly",
    "MP3",
    "Zip",
    "Other - ផ្សេងៗ",
  ],
  "Royal Enfield": [
    "Classic",
    "Bullet",
    "Hunter",
    "Meteor",
    "Himalayan",
    "Interceptor",
    "Continental GT",
    "Other - ផ្សេងៗ",
  ],
  Triumph: [
    "Bonneville",
    "Street Twin",
    "Speed Twin",
    "Trident",
    "Tiger",
    "Rocket",
    "Street Triple",
    "Other - ផ្សេងៗ",
  ],
  Vespa: [
    "Sprint",
    "Primavera",
    "GTS",
    "LX",
    "S",
    "Sei Giorni",
    "Other - ផ្សេងៗ",
  ],
  YADEA: [
    "G5",
    "G6",
    "C1S",
    "E8S",
    "VoltGuard",
    "Other - ផ្សេងៗ",
  ],
  Zontes: [
    "155G",
    "155U",
    "310R",
    "310T",
    "350R",
    "350T",
    "Other - ផ្សេងៗ",
  ],
} as const;

function getVehicleOptionKey(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "");
}

export function getVehicleModelOptionsForBrand(brand?: string): readonly string[] {
  const brandKey = getVehicleOptionKey(brand ?? "");
  if (!brandKey) return [];

  const match = Object.entries(MOTORCYCLE_MODEL_OPTIONS_BY_BRAND).find(
    ([name]) => getVehicleOptionKey(name) === brandKey
  );

  return match?.[1] ?? [];
}

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
  // Primary image used by list/card views.
  Image: string;
  // Optional full gallery. Detail/edit screens can use this while older single-image
  // records continue to work through Image.
  Images?: string[];
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
