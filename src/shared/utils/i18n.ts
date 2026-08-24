// Khmer Language Support for Emerald Cash
// ភាសាខ្មែរសម្រាប់ អេមើរ៉ល ឃែស

export type Language = "en" | "km";

export interface Translations {
  [key: string]: string;
  // Common
  settings: string;
  profile: string;
  users: string;
  system: string;
  logout: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  create: string;
  refresh: string;
  loading: string;
  error: string;
  success: string;
  confirm: string;
  close: string;
  back: string;
  next: string;
  search: string;
  filter: string;
  sort: string;
  actions: string;
  status: string;
  available: string;
  location: string;
  assignedTo: string;
  view: string;
  role: string;
  admin: string;
  staff: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  username: string;
  fullName: string;
  avatar: string;
  upload: string;
  change: string;
  remove: string;
  add: string;
  update: string;
  sync: string;
  dashboard: string;
  vehicles: string;
  training: string;
  sms: string;
  lmsStaff: string;
  memberSince: string;
  you: string;
  teamMembers: string;
  createUser: string;
  userManagement: string;
  systemSettings: string;
  darkMode: string;
  lightMode: string;
  language: string;
  khmer: string;
  english: string;
  quickLinks: string;
  account: string;
  preferences: string;
  appearance: string;
  notifications: string;
  security: string;
  general: string;
  advanced: string;
  about: string;
  help: string;
  support: string;
  version: string;
  copyright: string;
  allRightsReserved: string;
  // Validation
  required: string;
  invalidEmail: string;
  invalidPhone: string;
  passwordMismatch: string;
  minLength: string;
  maxLength: string;
  // Errors
  loadError: string;
  saveError: string;
  deleteError: string;
  networkError: string;
  unknownError: string;
  // Success
  saveSuccess: string;
  deleteSuccess: string;
  createSuccess: string;
  updateSuccess: string;
  syncSuccess: string;
  uploadSuccess: string;
  // Confirmations
  confirmDelete: string;
  confirmLogout: string;
  confirmAction: string;
  // Placeholders
  enterUsername: string;
  enterPassword: string;
  enterEmail: string;
  enterPhone: string;
  enterFullName: string;
  searchUsers: string;
  // Descriptions
  settingsDescription: string;
  profileDescription: string;
  usersDescription: string;
  systemDescription: string;
  createUserDescription: string;
  teamMembersDescription: string;
  assetNotFound: string;
  chooseAssetHistory: string;
  stats: string;
  loadingAssets: string;
  loadingAssetDetails: string;
  assetId: string;
  receiverId: string;
  noPendingTransfers: string;
  allTransfersProcessed: string;
  viewMetadata: string;
  events: string;
  for: string;
  // Accessibility
  toggleMenu: string;
  toggleTheme: string;
  toggleLanguage: string;
  goBack: string;
  openSettings: string;
  closeModal: string;
  loadingData: string;
  processing: string;
  // Dashboard
  quickFilters: string;
  filterByCategory: string;
  totalInventory: string;
  allVehicles: string;
  viewCompleteInventory: string;
  sedansSuvsTrucks: string;
  scootersBikes: string;
  threeWheelers: string;
  vehiclesMissingImages: string;
  clickToViewUploadImages: string;
  searchByBrandModel: string;
  matching: string;
  vehiclesByCategory: string;
  distributionAcrossTypes: string;
  conditionDistribution: string;
  newVsUsed: string;
  topBrands: string;
  popularManufacturers: string;
  monthlyTrends: string;
  vehiclesOverTime: string;
  withImages: string;
  withoutImages: string;
  averagePrice: string;
  uniqueBrands: string;
  realTimeInventory: string;
  exportLabel: string;
  loadingCategoryData: string;
  loadingConditionData: string;
  loadingBrandData: string;
  loadingTimelineData: string;
  // SMS
  assets: string;
  asset: string;
  assetInventory: string;
  manageInventory: string;
  addAsset: string;
  newAsset: string;
  createAsset: string;
  editAsset: string;
  updateAsset: string;
  deleteAsset: string;
  deleteAssetConfirm: string;
  assetName: string;
  assetNameRequired: string;
  itemCode: string;
  itemType: string;
  itemTypeRequired: string;
  allStatus: string;
  searchAssets: string;
  noAssetsFound: string;
  noTransfers: string;
  noHistory: string;
  createTransfer: string;
  transferCreated: string;
  acceptTransfer: string;
  rejectTransfer: string;
  rejectReason: string;
  transferAccepted: string;
  transferRejected: string;
  sendReceive: string;
  reviewRequests: string;
  auditTrail: string;
  totalAssets: string;
  inUse: string;
  borrowed: string;
  pending: string;
  history: string;
  from: string;
  to: string;
  sender: string;
  receiver: string;
  remark: string;
  remarkOptional: string;
  selectAsset: string;
  selectSender: string;
  selectReceiver: string;
  pleaseFixErrors: string;
  noAssetsAvailable: string;
  noPendingRequests: string;
  allProcessed: string;
  createNew: string;
  checkAgain: string;
  created: string;
  requested: string;
  oldestRequest: string;
  assetTypes: string;
  transferHistory: string;
  selectAssetViewHistory: string;
  noAssetSelected: string;
  noEventsFound: string;
  uploadImage: string;
  removeImage: string;
  imageOptional: string;
  description: string;
  referenceId: string;
  saveFailed: string;
  viewDetails: string;
  retry: string;
  tryAdjustingFilters: string;
  getStartedAdding: string;
  clearFiltersAdd: string;
  addFirstAsset: string;
  unassigned: string;
  category: string;
  quantity: string;
  backToAssets: string;
  timestamp: string;
  cannotBeUndone: string;
  today: string;
  // Login
  signIn: string;
  usernameLabel: string;
  passwordLabel: string;
  rememberMe: string;
  signingIn: string;
  vehicleManagementSystem: string;
  // Common UI
  noResults: string;
  previous: string;
  nextPage: string;
  pageOf: string;
  cancelAction: string;
  // Vehicle categories
  cars: string;
  motorcycles: string;
  tuktuks: string;
  new: string;
  used: string;
  // Missing keys
  transfers: string;
  grid: string;
  list: string;
  marketPrice: string;
  year: string;
  plate: string;
  color: string;
  taxType: string;
  errorLoadingVehicles: string;
  manageTrackVehicles: string;
  totalVehicles: string;
  allCategories: string;
  visibleColumns: string;
  activeFilters: string;
  condition: string;
  brand: string;
  bodyType: string;
  model: string;
  minPrice: string;
  maxPrice: string;
  imageStatus: string;
  noVehiclesFound: string;
  perPage: string;
  trainingPortal: string;
  masterSkills: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Common
    settings: "Settings",
    profile: "Profile",
    users: "Users",
    system: "System",
    logout: "Logout",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    create: "Create",
    refresh: "Refresh",
    loading: "Loading",
    error: "Error",
    success: "Success",
    confirm: "Confirm",
    close: "Close",
    back: "Back",
    next: "Next",
    search: "Search",
    filter: "Filter",
    sort: "Sort",
    actions: "Actions",
    status: "Status",
    available: "Available",
    location: "Location",
    assignedTo: "Assigned To",
    view: "View",
    role: "Role",
    admin: "Admin",
    staff: "Staff",
    name: "Name",
    email: "Email",
    phone: "Phone",
    password: "Password",
    confirmPassword: "Confirm Password",
    username: "Username",
    fullName: "Full Name",
    avatar: "Avatar",
    upload: "Upload",
    change: "Change",
    remove: "Remove",
    add: "Add",
    update: "Update",
    sync: "Sync",
    dashboard: "Vehicle Valuation",
    vehicles: "Vehicles",
    training: "Training",
    trainingPortal: "Learning Center",
    masterSkills: "Browse lessons, continue training, and track your progress.",
    sms: "Asset Inventory",
    lmsStaff: "LMS Staff",
    memberSince: "Member since",
    you: "You",
    teamMembers: "Team Members",
    createUser: "Create New User",
    userManagement: "User Management",
    systemSettings: "System Settings",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    language: "Language",

    khmer: "Khmer",
    english: "English",

    quickLinks: "Quick Links",
    account: "Account",
    preferences: "Preferences",
    appearance: "Appearance",
    notifications: "Notifications",
    security: "Security",
    general: "General",
    advanced: "Advanced",
    about: "About",
    help: "Help",
    support: "Support",
    version: "Version",
    copyright: "Copyright",
    allRightsReserved: "All rights reserved",
    // Validation
    required: "This field is required",
    invalidEmail: "Please enter a valid email",
    invalidPhone: "Please enter a valid phone number",
    passwordMismatch: "Passwords do not match",
    minLength: "Must be at least {min} characters",
    maxLength: "Must be at most {max} characters",
    // Errors
    loadError: "Failed to load data",
    saveError: "Failed to save changes",
    deleteError: "Failed to delete",
    networkError: "Network error. Please check your connection",
    unknownError: "An unknown error occurred",
    // Success
    saveSuccess: "Changes saved successfully",
    deleteSuccess: "Deleted successfully",
    createSuccess: "Created successfully",
    updateSuccess: "Updated successfully",
    syncSuccess: "Synced successfully",
    uploadSuccess: "Uploaded successfully",
    // Confirmations
    confirmDelete: "Are you sure you want to delete?",
    confirmLogout: "Are you sure you want to logout?",
    confirmAction: "Are you sure you want to proceed?",
    // Placeholders
    enterUsername: "Enter username",
    enterPassword: "Enter password",
    enterEmail: "Enter email address",
    enterPhone: "Enter phone number",
    enterFullName: "Enter full name",
    searchUsers: "Search users...",
    // Descriptions
    settingsDescription: "Manage your account, users, and system preferences",
    profileDescription: "View and manage your profile information",
    usersDescription: "Manage team members and their permissions",
    systemDescription: "Configure system-wide settings",
    createUserDescription: "Add a new team member to the system",
    teamMembersDescription: "users in system",
    chooseAssetHistory: "Choose an asset to view history...",
    stats: "Stats",
    assetNotFound: "Asset not found",
    // Accessibility
    toggleMenu: "Toggle menu",
    toggleTheme: "Toggle dark mode",
    toggleLanguage: "Toggle language",
    goBack: "Go back",
    openSettings: "Open settings",
    closeModal: "Close modal",
    loadingData: "Loading data...",
    processing: "Processing...",
    // SMS
    assets: "Assets",
    asset: "Asset",
    assetInventory: "Asset Inventory",
    manageInventory: "Track SMS stock, assignments, locations, and transfer status.",
    addAsset: "Add Asset",
    newAsset: "New Asset",
    createAsset: "Create Asset",
    editAsset: "Edit Asset",
    updateAsset: "Update Asset",
    deleteAsset: "Delete Asset",
    deleteAssetConfirm: "Delete this asset?",
    assetName: "Asset Name",
    assetNameRequired: "Asset name is required",
    itemCode: "Item Code",
    itemType: "Type",
    itemTypeRequired: "Type is required",
    allStatus: "All Status",
    searchAssets: "Search assets by name or description...",
    noAssetsFound: "No assets found",
    noTransfers: "No transfers for this asset.",
    noHistory: "No history events available.",
    createTransfer: "Create Transfer",
    transferCreated: "Transfer created successfully!",
    acceptTransfer: "Accept Transfer",
    rejectTransfer: "Reject Transfer",
    rejectReason: "Reason (optional)",
    transferAccepted: "accepted",
    transferRejected: "rejected",
    sendReceive: "Send & receive",
    reviewRequests: "Transfer Requests",
    auditTrail: "Complete transfer history and audit logs",
    totalAssets: "Total Assets",
    inUse: "In Use",
    borrowed: "Borrowed",
    pending: "Pending",
    history: "History",
    from: "From",
    to: "To",
    sender: "Sender",
    receiver: "Receiver",
    remark: "Remark",
    remarkOptional: "Remark (Optional)",
    selectAsset: "Select an asset",
    selectSender: "Select sender",
    selectReceiver: "Select receiver",
    pleaseFixErrors: "Please fix the errors below.",
    noAssetsAvailable: "No assets available",
    noPendingRequests: "No Pending Requests",
    allProcessed: "All SMS asset transfers are processed and approved.",
    createNew: "Create New Transfer",
    checkAgain: "Check Again",
    created: "Created",
    requested: "Requested",
    oldestRequest: "Oldest Request",
    assetTypes: "Asset Types",
    transferHistory: "Transfer History",
    selectAssetViewHistory: "Choose an asset from the sidebar to view its complete audit trail",
    noAssetSelected: "No asset selected",
    noEventsFound: "No events found for this asset",
    uploadImage: "Upload Image",
    removeImage: "Remove",
    imageOptional: "Image (Optional)",
    description: "Description",
    referenceId: "Reference ID",
    saveFailed: "Save failed",
    viewDetails: "View details",
    retry: "Retry",
    tryAdjustingFilters: "Try adjusting your search or filters",
    getStartedAdding: "Get started by adding your first asset.",
    clearFiltersAdd: "Clear Filters & Add Asset",
    addFirstAsset: "Add First Asset",
    unassigned: "Unassigned",
    category: "Category",
    quantity: "Quantity",
    backToAssets: "Back to Assets",
    timestamp: "Timestamp",
    cannotBeUndone: "This cannot be undone.",
    today: "today",
    // Login
    signIn: "Sign In",
    usernameLabel: "Username",
    passwordLabel: "Password",
    rememberMe: "Remember me",
    signingIn: "Signing in...",
    vehicleManagementSystem: "Vehicle Management System",
    // Common UI
    noResults: "No results",
    previous: "Previous",
    nextPage: "Next",
    pageOf: "Page",
    cancelAction: "Cancel",
    loadingAssets: "Loading assets...",
    loadingAssetDetails: "Loading asset details...",
    assetId: "Asset ID",
    receiverId: "Receiver ID",
    noPendingTransfers: "No Pending Transfers",
    allTransfersProcessed: "Great! All transfers are processed.",
    viewMetadata: "View metadata",
    events: "events",
    for: "for",
    quickFilters: "Quick Filters",
    filterByCategory: "Filter vehicles by category",
    totalInventory: "Total Inventory",
    allVehicles: "All Vehicles",
    viewCompleteInventory: "View complete inventory",
    sedansSuvsTrucks: "Sedans, SUVs, Trucks",
    scootersBikes: "Scooters, Bikes",
    threeWheelers: "Three-wheelers",
    vehiclesMissingImages: "vehicles missing images",
    clickToViewUploadImages: "Click to view and upload images",
    searchByBrandModel: "Search by brand, model, category, plate number, or year...",
    matching: "matching",
    vehiclesByCategory: "Vehicles by Category",
    distributionAcrossTypes: "Distribution across vehicle types",
    conditionDistribution: "Condition Distribution",
    newVsUsed: "New vs used vehicles",
    topBrands: "Top Brands",
    popularManufacturers: "Most popular manufacturers",
    monthlyTrends: "Monthly Trends",
    vehiclesOverTime: "Vehicles added over time",
    withImages: "With Images",
    withoutImages: "Without Images",
    averagePrice: "Average Price",
    uniqueBrands: "Unique Brands",
    realTimeInventory: "Real-time inventory analytics",
    exportLabel: "Export",
    loadingCategoryData: "Loading category data...",
    loadingConditionData: "Loading condition data...",
    loadingBrandData: "Loading brand data...",
    loadingTimelineData: "Loading timeline data...",
    // Vehicle categories
    cars: "Cars",
    motorcycles: "Motorcycles",
    tuktuks: "TukTuks",
    new: "New",
    used: "Used",
    // Missing keys
    transfers: "Transfers",
    grid: "Grid",
    list: "List",
    marketPrice: "Market Price",
    year: "Year",
    plate: "Plate",
    color: "Color",
    taxType: "Tax Type",
    errorLoadingVehicles: "Error Loading Vehicles",
    manageTrackVehicles: "Manage and track your vehicle inventory",
    totalVehicles: "Total Vehicles",
    allCategories: "All Categories",
    visibleColumns: "Visible Columns",
    activeFilters: "Active Filters",
    condition: "Condition",
    brand: "Brand",
    bodyType: "Body Type",
    model: "Model",
    minPrice: "Min Price",
    maxPrice: "Max Price",
    imageStatus: "Image Status",
    noVehiclesFound: "No vehicles found",
    perPage: "per page",
  },
  km: {
    // Common
    settings: "ការកំណត់",
    profile: "ប្រវត្តិរូប",
    users: "អ្នកប្រើប្រាស់",
    system: "ប្រព័ន្ធ",
    logout: "ចាកចេញ",
    save: "រក្សាទុក",
    cancel: "បោះបង់",
    delete: "លុប",
    edit: "កែប្រែ",
    create: "បង្កើត",
    refresh: "ធ្វើឱ្យថ្មី",
    loading: "កំពុងផ្ទុក",
    error: "កំហុស",
    success: "ជោគជ័យ",
    confirm: "បញ្ជាក់",
    close: "បិទ",
    back: "ត្រឡប់ក្រោយ",
    next: "បន្ទាប់",
    search: "ស្វែងរក",
    filter: "តម្រង",
    sort: "តម្រៀប",
    actions: "សកម្មភាព",
    status: "ស្ថានភាព",
    available: "ទំនេរ",
    location: "ទីតាំង",
    assignedTo: "ចំណាត់ថ្នាក់ឱ្យ",
    view: "មើល",
    role: "តួនាទី",
    admin: "អ្នកគ្រប់គ្រង",
    staff: "បុគ្គលិក",
    name: "ឈ្មោះ",
    email: "អ៊ីមែល",
    phone: "ទូរស័ព្ទ",
    password: "ពាក្យសម្ងាត់",
    confirmPassword: "បញ្ជាក់ពាក្យសម្ងាត់",
    username: "ឈ្មោះអ្នកប្រើ",
    fullName: "ឈ្មោះពេញ",
    avatar: "រូបតំណាង",
    upload: "ផ្ទុកឡើង",
    change: "ផ្លាស់ប្តូរ",
    remove: "យកចេញ",
    add: "បន្ថែម",
    update: "ធ្វើឱ្យទាន់សម័យ",
    sync: "សមកាលកម្ម",
    dashboard: "វាយតម្លៃយានយន្ត",
    vehicles: "យានយន្ត",
    training: "ការបណ្តុះបណ្តាល",
    trainingPortal: "មជ្ឈមណ្ឌលសិក្សា",
    masterSkills: "មើលមេរៀន បន្តការបណ្តុះបណ្តាល និងតាមដានវឌ្ឍនភាពរបស់អ្នក។",
    sms: "បញ្ជីទ្រព្យសម្បត្តិ",
    lmsStaff: "បុគ្គលិក LMS",
    memberSince: "សមាជិកតាំងពី",
    you: "អ្នក",
    teamMembers: "សមាជិកក្រុម",
    createUser: "បង្កើតអ្នកប្រើប្រាស់ថ្មី",
    userManagement: "ការគ្រប់គ្រងអ្នកប្រើប្រាស់",
    systemSettings: "ការកំណត់ប្រព័ន្ធ",
    darkMode: "របៀបងងឹត",
    lightMode: "របៀបភ្លឺ",
    language: "ភាសា",
    khmer: "ខ្មែរ",
    english: "អង់គ្លេស",
    quickLinks: "តំណភ្ជាប់លឿន",
    account: "គណនី",
    preferences: "ចំណូលចិត្ត",
    appearance: "រូបរាង",
    notifications: "ការជូនដំណឹង",
    security: "សុវត្ថិភាព",
    general: "ទូទៅ",
    advanced: "កម្រិតខ្ពស់",
    about: "អំពី",
    help: "ជំនួយ",
    support: "គាំទ្រ",
    version: "ជំនាន់",
    copyright: "រក្សាសិទ្ធិ",
    allRightsReserved: "រក្សាសិទ្ធិគ្រប់យ៉ាង",
    // Validation
    required: "វាលនេះត្រូវបានទាមទារ",
    invalidEmail: "សូមបញ្ចូលអ៊ីមែលត្រឹមត្រូវ",
    invalidPhone: "សូមបញ្ចូលលេខទូរស័ព្ទត្រឹមត្រូវ",
    passwordMismatch: "ពាក្យសម្ងាត់មិនត្រូវគ្នា",
    minLength: "ត្រូវតែមានយ៉ាងហោចណាស់ {min} តួអក្សរ",
    maxLength: "ត្រូវតែមានច្រើនបំផុត {max} តួអក្សរ",
    // Errors
    loadError: "បរាជ័យក្នុងការផ្ទុកទិន្នន័យ",
    saveError: "បរាជ័យក្នុងការរក្សាទុកការផ្លាស់ប្តូរ",
    deleteError: "បរាជ័យក្នុងការលុប",
    networkError: "កំហុសបណ្តាញ។ សូមពិនិត្យមើលការតភ្ជាប់របស់អ្នក",
    unknownError: "មានកំហុសមិនស្គាល់បានកើតឡើង",
    // Success
    saveSuccess: "បានរក្សាទុកការផ្លាស់ប្តូរដោយជោគជ័យ",
    deleteSuccess: "បានលុបដោយជោគជ័យ",
    createSuccess: "បានបង្កើតដោយជោគជ័យ",
    updateSuccess: "បានធ្វើឱ្យទាន់សម័យដោយជោគជ័យ",
    syncSuccess: "បានសមកាលកម្មដោយជោគជ័យ",
    uploadSuccess: "បានផ្ទុកឡើងដោយជោគជ័យ",
    // Confirmations
    confirmDelete: "តើអ្នកប្រាកដជាចង់លុបឬទេ?",
    confirmLogout: "តើអ្នកប្រាកដជាចង់ចាកចេញឬទេ?",
    confirmAction: "តើអ្នកប្រាកដជាចង់បន្តឬទេ?",
    // Placeholders
    enterUsername: "បញ្ចូលឈ្មោះអ្នកប្រើ",
    enterPassword: "បញ្ចូលពាក្យសម្ងាត់",
    enterEmail: "បញ្ចូលអាសយដ្ឋានអ៊ីមែល",
    enterPhone: "បញ្ចូលលេខទូរស័ព្ទ",
    enterFullName: "បញ្ចូលឈ្មោះពេញ",
    searchUsers: "ស្វែងរកអ្នកប្រើប្រាស់...",
    // Descriptions
    settingsDescription: "គ្រប់គ្រងគណនីរបស់អ្នក អ្នកប្រើប្រាស់ និងចំណូលចិត្តប្រព័ន្ធ",
    profileDescription: "មើល និងគ្រប់គ្រងព័ត៌មានប្រវត្តិរូបរបស់អ្នក",
    usersDescription: "គ្រប់គ្រងសមាជិកក្រុម និងការអនុញ្ញាតរបស់ពួកគេ",
    systemDescription: "កំណត់រចនាសម្ព័ន្ធការកំណត់ទូទាំងប្រព័ន្ធ",
    createUserDescription: "បន្ថែមសមាជិកក្រុមថ្មីទៅប្រព័ន្ធ",
    teamMembersDescription: "អ្នកប្រើប្រាស់ក្នុងប្រព័ន្ធ",
    assetNotFound: "រកមិនឃើញទ្រព្យសម្បត្តិ",
    chooseAssetHistory: "ជ្រើសរើសទ្រព្យសម្បត្តិដើម្បីមើលប្រវត្តិ...",
    stats: "ស្ថិតិ",
    // Accessibility
    toggleMenu: "បិទ/បើកម៉ឺនុយ",
    toggleTheme: "បិទ/បើករបៀបងងឹត",
    toggleLanguage: "បិទ/បើកភាសា",
    goBack: "ត្រឡប់ក្រោយ",
    openSettings: "បើកការកំណត់",
    closeModal: "បិទផ្ទាំង",
    loadingData: "កំពុងផ្ទុកទិន្នន័យ...",
    processing: "កំពុងដំណើរការ...",
    // SMS
    assets: "ទ្រព្យសម្បត្តិ",
    asset: "ទ្រព្យសម្បត្តិ",
    assetInventory: "បញ្ជីទ្រព្យសម្បត្តិ",
    manageInventory: "តាមដានស្តុក SMS ការចាត់តាំង ទីតាំង និងស្ថានភាពផ្ទេរ។",
    addAsset: "បន្ថែមទ្រព្យសម្បត្តិ",
    newAsset: "ទ្រព្យសម្បត្តិថ្មី",
    createAsset: "បង្កើតទ្រព្យសម្បត្តិ",
    editAsset: "កែប្រែទ្រព្យសម្បត្តិ",
    updateAsset: "ធ្វើឱ្យទាន់សម័យទ្រព្យសម្បត្តិ",
    deleteAsset: "លុបទ្រព្យសម្បត្តិ",
    deleteAssetConfirm: "លុបទ្រព្យសម្បត្តិនេះ?",
    assetName: "ឈ្មោះទ្រព្យសម្បត្តិ",
    assetNameRequired: "ឈ្មោះទ្រព្យសម្បត្តិត្រូវបានទាមទារ",
    itemCode: "កូដទំនិញ",
    itemType: "ប្រភេទ",
    itemTypeRequired: "ប្រភេទត្រូវបានទាមទារ",
    allStatus: "ស្ថានភាពទាំងអស់",
    searchAssets: "ស្វែងរកទ្រព្យសម្បត្តិតាមឈ្មោះ ឬសេចក្តីពិពណ៌នា...",
    noAssetsFound: "រកមិនឃើញទ្រព្យសម្បត្តិ",
    noTransfers: "គ្មានការផ្ទេរសម្រាប់ទ្រព្យសម្បត្តិនេះទេ។",
    noHistory: "គ្មានប្រវត្តិព្រឹត្តិការណ៍ទេ។",
    createTransfer: "បង្កើតការផ្ទេរ",
    transferCreated: "បានបង្កើតការផ្ទេរដោយជោគជ័យ!",
    acceptTransfer: "ទទួលយកការផ្ទេរ",
    rejectTransfer: "បដិសេធការផ្ទេរ",
    rejectReason: "មូលហេតុ (មិនបាច់)",
    transferAccepted: "បានទទួលយក",
    transferRejected: "បានបដិសេធ",
    sendReceive: "ផ្ញើ និងទទួល",
    reviewRequests: "សំណើផ្ទេរ",
    auditTrail: "ប្រវត្តិការផ្ទេរពេញលេញ និងកំណត់ហេតុត្រួតពិនិត្យ",
    totalAssets: "ទ្រព្យសម្បត្តិសរុប",
    inUse: "កំពុងប្រើ",
    borrowed: "ខ្ចី",
    pending: "កំពុងរង់ចាំ",
    history: "ប្រវត្តិ",
    from: "ពី",
    to: "ទៅ",
    sender: "អ្នកផ្ញើ",
    receiver: "អ្នកទទួល",
    remark: "កំណត់សម្គាល់",
    remarkOptional: "កំណត់សម្គាល់ (មិនបាច់)",
    selectAsset: "ជ្រើសរើសទ្រព្យសម្បត្តិ",
    selectSender: "ជ្រើសរើសអ្នកផ្ញើ",
    selectReceiver: "ជ្រើសរើសអ្នកទទួល",
    pleaseFixErrors: "សូមកែកំហុសខាងក្រោម។",
    noAssetsAvailable: "គ្មានទ្រព្យសម្បត្តិទេ",
    noPendingRequests: "គ្មានសំណើកំពុងរង់ចាំ",
    allProcessed: "ការផ្ទេរទ្រព្យសម្បត្តិ SMS ទាំងអស់ត្រូវបានដំណើរការ និងអនុម័ត។",
    createNew: "បង្កើតការផ្ទេរថ្មី",
    checkAgain: "ពិនិត្យម្តងទៀត",
    created: "បានបង្កើត",
    requested: "បានស្នើសុំ",
    oldestRequest: "សំណើចាស់បំផុត",
    assetTypes: "ប្រភេទទ្រព្យសម្បត្តិ",
    transferHistory: "ប្រវត្តិការផ្ទេរ",
    selectAssetViewHistory: "ជ្រើសរើសទ្រព្យសម្បត្តិពីផ្នែកខាងចុងដើម្បីមើលប្រវត្តិត្រួតពិនិត្យពេញលេញ",
    noAssetSelected: "មិនបានជ្រើសរើសទ្រព្យសម្បត្តិ",
    noEventsFound: "គ្មានព្រឹត្តិការណ៍សម្រាប់ទ្រព្យសម្បត្តិនេះទេ",
    uploadImage: "ផ្ទុករូបភាពឡើង",
    removeImage: "យកចេញ",
    imageOptional: "រូបភាព (មិនបាច់)",
    description: "សេចក្តីពិពណ៌នា",
    referenceId: "លេខសម្គាល់យោង",
    saveFailed: "រក្សាទុកបរាជ័យ",
    viewDetails: "មើលព័ត៌មានលម្អិត",
    retry: "ព្យាយាមម្តងទៀត",
    tryAdjustingFilters: "ព្យាយាមកែតម្រង ឬសំណួរស្វែងរករបស់អ្នក",
    getStartedAdding: "ចាប់ផ្តើមដោយការបន្ថែមទ្រព្យសម្បត្តិដំបូងរបស់អ្នក។",
    clearFiltersAdd: "សម្អាតតម្រង និងបន្ថែមទ្រព្យសម្បត្តិ",
    addFirstAsset: "បន្ថែមទ្រព្យសម្បត្តិដំបូង",
    unassigned: "មិនបានចំណាត់ថ្នាក់",
    category: "ប្រភេទ",
    quantity: "បរិមាណ",
    backToAssets: "ត្រឡប់ទៅទ្រព្យសម្បត្តិ",
    timestamp: "សម្ពន្ធមេតា",
    cannotBeUndone: "សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។",
    today: "ថ្ងៃនេះ",
    // Login
    signIn: "ចូល",
    usernameLabel: "ឈ្មោះអ្នកប្រើ",
    passwordLabel: "ពាក្យសម្ងាត់",
    rememberMe: "ចងចាំខ្ញុំ",
    signingIn: "កំពុងចូល...",
    vehicleManagementSystem: "ប្រព័ន្ធគ្រប់គ្រងយានយន្ត",
    // Common UI
    noResults: "គ្មានលទ្ធផល",
    previous: "មុន",
    nextPage: "បន្ទាប់",
    pageOf: "ទំព័រ",
    cancelAction: "បោះបង់",
    loadingAssets: "កំពុងផ្ទុកទ្រព្យសម្បត្តិ...",
    loadingAssetDetails: "កំពុងផ្ទុកព័ត៌មានលម្អិតទ្រព្យសម្បត្តិ...",
    assetId: "លេខសម្គាល់ទ្រព្យសម្បត្តិ",
    receiverId: "លេខសម្គាល់អ្នកទទួល",
    noPendingTransfers: "គ្មានការផ្ទេរកំពុងរង់ចាំ",
    allTransfersProcessed: "អស្ចារ្យ! ការផ្ទេរទាំងអស់ត្រូវបានដំណើរការ។",
    viewMetadata: "មើលទិន្នន័យមេតាដា",
    events: "ព្រឹត្តិការណ៍",
    for: "សម្រាប់",
    quickFilters: "តម្រងរហ័ស",
    filterByCategory: "តម្រងយានយន្តតាមប្រភេទ",
    totalInventory: "បញ្ជីទំនិញសរុប",
    allVehicles: "យានយន្តទាំងអស់",
    viewCompleteInventory: "មើលបញ្ជីទំនិញពេញលេញ",
    sedansSuvsTrucks: "រថយន្តសេដាន់ SUV និងឡានដឹកទំនិញ",
    scootersBikes: "ស្គូទឺ និងកង់",
    threeWheelers: "រថយន្តបីកង់",
    vehiclesMissingImages: "យានយន្តខ្វះរូបភាព",
    clickToViewUploadImages: "ចុចដើម្បីមើល និងផ្ទុករូបភាពឡើង",
    searchByBrandModel: "ស្វែងរកតាមម៉ាក ម៉ូដែល ប្រភេទ លេខស្លាក ឬឆ្នាំ...",
    matching: "ដែលត្រូវគ្នា",
    vehiclesByCategory: "យានយន្តតាមប្រភេទ",
    distributionAcrossTypes: "ការចែកចាយតាមប្រភេទយានយន្ត",
    conditionDistribution: "ការចែកចាយតាមស្ថានភាព",
    newVsUsed: "យានយន្តថ្មី ទៅនឹងបានប្រើ",
    topBrands: "ម៉ាកពេញនិយម",
    popularManufacturers: "ក្រុមហ៊ុនផលិតពេញនិយមបំផុត",
    monthlyTrends: "និន្នាការប្រចាំខែ",
    vehiclesOverTime: "យានយន្តដែលបានបន្ថែមតាមពេលវេលា",
    withImages: "មានរូបភាព",
    withoutImages: "គ្មានរូបភាព",
    averagePrice: "តម្លៃមធ្យម",
    uniqueBrands: "ចំនួនម៉ាក",
    realTimeInventory: "វិភាគទិន្នន័យយានយន្តជាពេលវេលាពិត",
    exportLabel: "នាំចេញ",
    loadingCategoryData: "កំពុងផ្ទុកទិន្នន័យប្រភេទ...",
    loadingConditionData: "កំពុងផ្ទុកទិន្នន័យស្ថានភាព...",
    loadingBrandData: "កំពុងផ្ទុកទិន្នន័យម៉ាក...",
    loadingTimelineData: "កំពុងផ្ទុកទិន្នន័យប្រវត្តិ...",
    // Vehicle categories
    cars: "រថយន្ត",
    motorcycles: "ម៉ូតូ",
    tuktuks: "កង់បី",
    new: "ថ្មី",
    used: "បានប្រើ",
    // Missing keys
    transfers: "ការផ្ទេរ",
    grid: "ក្រឡាចត្រង្គ",
    list: "បញ្ជី",
    marketPrice: "តម្លៃទីផ្សារ",
    year: "ឆ្នាំ",
    plate: "ស្លាក",
    color: "ពណ៌",
    taxType: "ប្រភេទពន្ធ",
    errorLoadingVehicles: "កំហុសក្នុងការផ្ទុកយានយន្ត",
    manageTrackVehicles: "គ្រប់គ្រង និងតាមដានបញ្ជីយានយន្តរបស់អ្នក",
    totalVehicles: "យានយន្តសរុប",
    allCategories: "ប្រភេទទាំងអស់",
    visibleColumns: "ជួរឈរដែលមើលឃើញ",
    activeFilters: "តម្រងសកម្ម",
    condition: "ស្ថានភាព",
    brand: "ម៉ាក",
    bodyType: "ប្រភេទតួ",
    model: "ម៉ូដែល",
    minPrice: "តម្លៃអប្បបរមា",
    maxPrice: "តម្លៃអតិបរមា",
    imageStatus: "ស្ថានភាពរូបភាព",
    noVehiclesFound: "រកមិនឃើញយានយន្ត",
    perPage: "ក្នុងមួយទំព័រ",
  },
};

const extraEnglishToKhmer: Record<string, string> = {
  // App shell and navigation
  "Connection Error": "កំហុសការតភ្ជាប់",
  "Connection timed out. Please check your network and try again.": "ការតភ្ជាប់អស់ពេល។ សូមពិនិត្យបណ្តាញរបស់អ្នក ហើយព្យាយាមម្តងទៀត។",
  "Connection failed. Please check your network and try again.": "ការតភ្ជាប់បរាជ័យ។ សូមពិនិត្យបណ្តាញរបស់អ្នក ហើយព្យាយាមម្តងទៀត។",
  "Navigation menu": "ម៉ឺនុយរុករក",
  "Open navigation menu": "បើកម៉ឺនុយរុករក",
  "Main navigation": "ការរុករកចម្បង",
  "Primary navigation": "ការរុករកចម្បង",
  "Open menu": "បើកម៉ឺនុយ",
  "Go back": "ត្រឡប់ក្រោយ",
  "VMS PRO": "VMS PRO",
  "EmeraldCash": "អេមើរ៉ល ឃែស",
  "Emerald Cash": "អេមើរ៉ល ឃែស",
  "Emerald Cash VMS": "ប្រព័ន្ធ អេមើរ៉ល ឃែស",
  "Vehicle Management": "ការគ្រប់គ្រងយានយន្ត",
  "Vehicle Management System by Emerald Cash": "ប្រព័ន្ធគ្រប់គ្រងយានយន្តដោយ អេមើរ៉ល ឃែស",
  "Emerald Cash Systems": "ប្រព័ន្ធ អេមើរ៉ល ឃែស",

  // Login and account
  "Login failed": "ការចូលបរាជ័យ",
  "Login successful! Verifying session...": "បានចូលដោយជោគជ័យ! កំពុងផ្ទៀងផ្ទាត់សម័យ...",
  "Session verification failed": "ការផ្ទៀងផ្ទាត់សម័យបរាជ័យ",
  "Preparing login...": "កំពុងរៀបចំការចូល...",
  "Show password": "បង្ហាញពាក្យសម្ងាត់",
  "Hide password": "លាក់ពាក្យសម្ងាត់",
  "Debug Info (tap to expand)": "ព័ត៌មានបំបាត់កំហុស (ចុចដើម្បីពង្រីក)",
  "Debug info copied to clipboard!": "បានចម្លងព័ត៌មានបំបាត់កំហុសទៅក្ដារតម្បៀតខ្ទាស់!",
  "Clipboard API is not available in this browser.": "Clipboard API មិនអាចប្រើបាននៅក្នុងកម្មវិធីរុករកនេះទេ។",
  "Copy to clipboard": "ចម្លងទៅក្ដារតម្បៀតខ្ទាស់",
  "Change Password": "ប្តូរពាក្យសម្ងាត់",
  "Update your password for security": "ធ្វើបច្ចុប្បន្នភាពពាក្យសម្ងាត់របស់អ្នកដើម្បីសុវត្ថិភាព",
  "Password changed successfully": "បានប្តូរពាក្យសម្ងាត់ដោយជោគជ័យ",
  "Closing...": "កំពុងបិទ...",
  "Profile": "ប្រវត្តិរូប",
  "Current": "បច្ចុប្បន្ន",
  "Current: Khmer": "បច្ចុប្បន្ន៖ ខ្មែរ",
  "Current: English": "បច្ចុប្បន្ន៖ អង់គ្លេស",
  "No users found": "រកមិនឃើញអ្នកប្រើប្រាស់",
  "Add your first user above": "បន្ថែមអ្នកប្រើប្រាស់ដំបូងរបស់អ្នកនៅខាងលើ",
  "Manage LMS Staff": "គ្រប់គ្រងបុគ្គលិក LMS",
  "Theme and language preferences": "ចំណូលចិត្តរូបរាង និងភាសា",
  "Toggle dark theme": "បិទ/បើករូបរាងងងឹត",
  "System Information": "ព័ត៌មានប្រព័ន្ធ",
  "Version and details": "ជំនាន់ និងព័ត៌មានលម្អិត",
  "Platform": "វេទិកា",
  "Version": "ជំនាន់",
  "All rights reserved": "រក្សាសិទ្ធិគ្រប់យ៉ាង",
  "Application Error": "កំហុសកម្មវិធី",
  "Try Again": "ព្យាយាមម្តងទៀត",
  "Go Back": "ត្រឡប់ក្រោយ",
  "Unknown": "មិនស្គាល់",
  "Unknown error": "កំហុសមិនស្គាល់",
  "Access denied": "គ្មានសិទ្ធិចូលប្រើ",
  "Database error": "កំហុសមូលដ្ឋានទិន្នន័យ",
  "User not found": "រកមិនឃើញអ្នកប្រើប្រាស់",
  "Form Errors": "កំហុសទម្រង់",
  "ID": "លេខសម្គាល់",
  "ID:": "លេខសម្គាល់៖",
  "Error ID:": "លេខសម្គាល់កំហុស៖",
  "N/A": "មិនមាន",

  // Dashboard
  "Failed to load dashboard data": "បរាជ័យក្នុងការផ្ទុកទិន្នន័យផ្ទាំងគ្រប់គ្រង",
  "Failed to load vehicles": "បរាជ័យក្នុងការផ្ទុកយានយន្ត",
  "Loading chart...": "កំពុងផ្ទុកគំនូសតាង...",
  "With Images": "មានរូបភាព",
  "Without Images": "គ្មានរូបភាព",
  "Avg Price": "តម្លៃមធ្យម",
  "Unique Brands (sample)": "ចំនួនម៉ាក (គំរូ)",
  "Real-time inventory analytics": "វិភាគទិន្នន័យយានយន្តជាពេលវេលាពិត",
  "Show": "បង្ហាញ",
  "Show:": "បង្ហាញ៖",
  "Showing all": "បង្ហាញទាំងអស់",
  "of": "នៃ",
  "vehicles": "យានយន្ត",
  "Filters": "តម្រង",
  "Reset": "កំណត់ឡើងវិញ",
  "All Colors": "ពណ៌ទាំងអស់",
  "No data available": "គ្មានទិន្នន័យ",
  "Total Staff": "បុគ្គលិកសរុប",
  "Categories": "ប្រភេទ",
  "Completion": "ការបញ្ចប់",
  "Details": "ព័ត៌មានលម្អិត",
  "Last Activity": "សកម្មភាពចុងក្រោយ",
  "Last sync:": "សមកាលកម្មចុងក្រោយ៖",
  "Never": "មិនដែល",
  "More": "ច្រើនទៀត",
  "Less": "តិចជាង",
  "No Images": "គ្មានរូបភាព",
  "No Image": "គ្មានរូបភាព",
  "Avg Price:": "តម្លៃមធ្យម៖",
  "Brand Chart": "គំនូសតាងម៉ាក",
  "Category Chart": "គំនូសតាងប្រភេទ",
  "Condition Chart": "គំនូសតាងស្ថានភាព",
  "Monthly Trends Chart": "គំនូសតាងនិន្នាការប្រចាំខែ",
  "D.O.C. 40%": "D.O.C. 40%",
  "D.O.C. 40%:": "D.O.C. 40%៖",

  // Vehicles
  "Vehicle Inventory": "បញ្ជីយានយន្ត",
  "Manage and track all your vehicles in one place": "គ្រប់គ្រង និងតាមដានយានយន្តទាំងអស់នៅកន្លែងតែមួយ",
  "Add Vehicle": "បន្ថែមយានយន្ត",
  "Edit Vehicle": "កែប្រែយានយន្ត",
  "Delete Vehicle": "លុបយានយន្ត",
  "Refreshing data...": "កំពុងធ្វើឱ្យទិន្នន័យថ្មី...",
  "All Categories": "ប្រភេទទាំងអស់",
  "All Conditions": "ស្ថានភាពទាំងអស់",
  "All Tax Types": "ប្រភេទពន្ធទាំងអស់",
  "Cars": "រថយន្ត",
  "Motorcycles": "ម៉ូតូ",
  "TukTuks": "កង់បី",
  "Tuk Tuk": "កង់បី",
  "Certified Pre-Owned": "បានប្រើប្រាស់មានការបញ្ជាក់",
  "Other": "ផ្សេងៗ",
  "VAT": "VAT",
  "Non-VAT": "មិនមែន VAT",
  "Exempt": "លើកលែង",
  "Group: None": "ដាក់ក្រុម៖ គ្មាន",
  "Group: Category": "ដាក់ក្រុម៖ ប្រភេទ",
  "Group: Brand": "ដាក់ក្រុម៖ ម៉ាក",
  "Group: Year": "ដាក់ក្រុម៖ ឆ្នាំ",
  "Group: Condition": "ដាក់ក្រុម៖ ស្ថានភាព",
  "Group: Color": "ដាក់ក្រុម៖ ពណ៌",
  "Columns": "ជួរឈរ",
  "More Filters": "តម្រងបន្ថែម",
  "Visible Columns": "ជួរឈរដែលមើលឃើញ",
  "Active Filters": "តម្រងសកម្ម",
  "No Image Only": "តែគ្មានរូបភាព",
  "No Image Filter": "តម្រងគ្មានរូបភាព",
  "Image": "រូបភាព",
  "Brand": "ម៉ាក",
  "Model": "ម៉ូដែល",
  "Category": "ប្រភេទ",
  "Year": "ឆ្នាំ",
  "Plate": "ស្លាកលេខ",
  "Plate #": "ស្លាកលេខ",
  "Plate Number": "លេខស្លាក",
  "Market Price": "តម្លៃទីផ្សារ",
  "Tax Type": "ប្រភេទពន្ធ",
  "Body Type": "ប្រភេទតួ",
  "Color": "ពណ៌",
  "Condition": "ស្ថានភាព",
  "Price New ($)": "តម្លៃថ្មី ($)",
  "Price 40% ($)": "តម្លៃ 40% ($)",
  "Price 70% ($)": "តម្លៃ 70% ($)",
  "Price 40%": "តម្លៃ 40%",
  "Price 70%": "តម្លៃ 70%",
  "Price": "តម្លៃ",
  "PriceNew": "តម្លៃថ្មី",
  "priceNew": "តម្លៃថ្មី",
  "TaxType": "ប្រភេទពន្ធ",
  "taxType": "ប្រភេទពន្ធ",
  "BodyType": "ប្រភេទតួ",
  "bodyType": "ប្រភេទតួ",
  "DOC 40%": "DOC 40%",
  "DOC 70%": "DOC 70%",
  "DOC 40% (Auto)": "DOC 40% (ស្វ័យប្រវត្តិ)",
  "Vehicles 70% (Auto)": "យានយន្ត 70% (ស្វ័យប្រវត្តិ)",
  "Vehicles 70%": "យានយន្ត 70%",
  "Down payment": "ប្រាក់កក់",
  "Installment": "បង់រំលស់",
  "Full vehicle value": "តម្លៃយានយន្តពេញ",
  "Vehicle Details": "ព័ត៌មានលម្អិតយានយន្ត",
  "Vehicle ID": "លេខសម្គាល់យានយន្ត",
  "Vehicle": "យានយន្ត",
  "All": "ទាំងអស់",
  "All Vehicles": "យានយន្តទាំងអស់",
  "Tuk Tuks": "កង់បី",
  "Basic Information": "ព័ត៌មានមូលដ្ឋាន",
  "Specifications": "លក្ខណៈសម្បត្តិ",
  "Pricing": "តម្លៃ",
  "Additional Information": "ព័ត៌មានបន្ថែម",
  "No additional information provided.": "មិនបានផ្តល់ព័ត៌មានបន្ថែមទេ។",
  "Standard tax documentation": "ឯកសារពន្ធស្តង់ដារ",
  "Vehicle with license plate registration": "យានយន្តដែលមានការចុះបញ្ជីស្លាកលេខ",
  "Regular vehicle registration": "ការចុះបញ្ជីយានយន្តធម្មតា",
  "High-end vehicle taxes": "ពន្ធសម្រាប់យានយន្តប្រណិត",
  "Business/commercial vehicles": "យានយន្តអាជីវកម្ម/ពាណិជ្ជកម្ម",
  "Core information used in search, records, and vehicle display.": "ព័ត៌មានសំខាន់ដែលប្រើសម្រាប់ស្វែងរក កំណត់ត្រា និងការបង្ហាញយានយន្ត។",
  "40% and 70% values are recalculated automatically when the new price changes.": "តម្លៃ 40% និង 70% ត្រូវបានគណនាឡើងវិញស្វ័យប្រវត្តិ ពេលតម្លៃថ្មីផ្លាស់ប្តូរ។",
  "Operational classification for tax and condition reporting.": "ការចាត់ថ្នាក់ប្រតិបត្តិការសម្រាប់របាយការណ៍ពន្ធ និងស្ថានភាព។",
  "Optional internal description for this vehicle record.": "សេចក្តីពិពណ៌នាផ្ទៃក្នុងជាជម្រើសសម្រាប់កំណត់ត្រាយានយន្តនេះ។",
  "Information": "ព័ត៌មាន",
  "Added": "បានបន្ថែម",
  "Added Time": "ពេលបានបន្ថែម",
  "Manage this vehicle": "គ្រប់គ្រងយានយន្តនេះ",
  "Back to List": "ត្រឡប់ទៅបញ្ជី",
  "Click to Enlarge": "ចុចដើម្បីពង្រីក",
  "No image available": "គ្មានរូបភាព",
  "No image selected": "មិនទាន់ជ្រើសរើសរូបភាព",
  "View image": "មើលរូបភាព",
  "Vehicle image": "រូបភាពយានយន្ត",
  "Image preview": "មើលរូបភាពជាមុន",
  "Image viewer": "កម្មវិធីមើលរូបភាព",
  "Close image viewer": "បិទកម្មវិធីមើលរូបភាព",
  "Open image": "បើករូបភាព",
  "Next image": "រូបភាពបន្ទាប់",
  "Previous image": "រូបភាពមុន",
  "Compressed preview": "មើលរូបភាពដែលបានបង្ហាប់ជាមុន",
  "Preview": "មើលជាមុន",
  "No image": "គ្មានរូបភាព",
  "No Plate": "គ្មានស្លាកលេខ",
  "Select category": "ជ្រើសរើសប្រភេទ",
  "Select condition": "ជ្រើសរើសស្ថានភាព",
  "Filter by category": "តម្រងតាមប្រភេទ",
  "Filter by condition": "តម្រងតាមស្ថានភាព",
  "Filter by tax type": "តម្រងតាមប្រភេទពន្ធ",
  "Group vehicles by": "ដាក់ក្រុមយានយន្តតាម",
  "Refresh data": "ធ្វើឱ្យទិន្នន័យថ្មី",
  "Search vehicles...": "ស្វែងរកយានយន្ត...",
  "Loading vehicles...": "កំពុងផ្ទុកយានយន្ត...",
  "Loading Vehicles": "កំពុងផ្ទុកយានយន្ត",
  "Items per page": "ចំនួនក្នុងមួយទំព័រ",
  "Showing": "បង្ហាញ",
  "Prev": "មុន",
  "Next page": "ទំព័របន្ទាប់",
  "Previous page": "ទំព័រមុន",
  "Back to Vehicles": "ត្រឡប់ទៅយានយន្ត",
  "Add New Vehicle": "បន្ថែមយានយន្តថ្មី",
  "Save Vehicle": "រក្សាទុកយានយន្ត",
  "Save Changes": "រក្សាទុកការផ្លាស់ប្តូរ",
  "Updating...": "កំពុងធ្វើបច្ចុប្បន្នភាព...",
  "Saving...": "កំពុងរក្សាទុក...",
  "Deleting...": "កំពុងលុប...",
  "Creating...": "កំពុងបង្កើត...",
  "Processing image...": "កំពុងដំណើរការរូបភាព...",
  "Processing Image...": "កំពុងដំណើរការរូបភាព...",
  "You have unsaved changes": "អ្នកមានការផ្លាស់ប្តូរដែលមិនទាន់រក្សាទុក",
  "Drag & drop, click to upload, paste URL, or Ctrl+V to paste image": "អូស និងទម្លាក់ ចុចដើម្បីផ្ទុកឡើង បិទភ្ជាប់ URL ឬ Ctrl+V ដើម្បីបិទភ្ជាប់រូបភាព",
  "Drag & drop, click to upload, paste image URL, or Ctrl+V to paste image": "អូស និងទម្លាក់ ចុចដើម្បីផ្ទុកឡើង បិទភ្ជាប់ URL រូបភាព ឬ Ctrl+V ដើម្បីបិទភ្ជាប់រូបភាព",
  "Type or select color": "វាយ ឬជ្រើសរើសពណ៌",
  "Type or select tax type": "វាយ ឬជ្រើសរើសប្រភេទពន្ធ",
  "e.g. Toyota": "ឧ. តូយ៉ូតា",
  "e.g. Camry": "ឧ. កាមរី",
  "e.g. 2023": "ឧ. ២០២៣",
  "e.g. 2022": "ឧ. ២០២២",
  "e.g. PP-1234": "ឧ. PP-1234",
  "e.g. New, Used": "ឧ. ថ្មី, បានប្រើ",
  "e.g. New, Used, Excellent": "ឧ. ថ្មី, បានប្រើ, ល្អឥតខ្ចោះ",
  "e.g. Sedan, SUV": "ឧ. សេដាន, SUV",
  "e.g. Sedan, SUV, Truck": "ឧ. សេដាន, SUV, រថយន្តដឹក",
  "Enter market price": "បញ្ចូលតម្លៃទីផ្សារ",
  "Enter vehicle description...": "បញ្ចូលសេចក្តីពិពណ៌នាយានយន្ត...",
  "Additional details...": "ព័ត៌មានបន្ថែម...",
  "Error Loading Vehicle": "កំហុសក្នុងការផ្ទុកយានយន្ត",
  "Vehicle Not Found": "រកមិនឃើញយានយន្ត",
  "The vehicle you&apos;re looking for doesn&apos;t exist or has been removed.": "យានយន្តដែលអ្នកកំពុងរកមិនមាន ឬត្រូវបានដកចេញហើយ។",
  "The vehicle you're looking for doesn't exist or has been removed.": "យានយន្តដែលអ្នកកំពុងរកមិនមាន ឬត្រូវបានដកចេញហើយ។",
  "Auto-calculated": "គណនាស្វ័យប្រវត្តិ",
  "Only Admin users can delete vehicles. Please contact an administrator if you need to remove this vehicle.": "មានតែអ្នកគ្រប់គ្រងប៉ុណ្ណោះអាចលុបយានយន្តបាន។ សូមទាក់ទងអ្នកគ្រប់គ្រង ប្រសិនបើអ្នកត្រូវការលុបយានយន្តនេះ។",
  "Brand is required": "ត្រូវការម៉ាក",
  "Model is required": "ត្រូវការម៉ូដែល",
  "Category is required": "ត្រូវការប្រភេទ",
  "Price must be a positive number": "តម្លៃត្រូវតែជាចំនួនវិជ្ជមាន",
  "Good": "ល្អ",
  "Fair": "មធ្យម",
  "Poor": "ខ្សោយ",
  "Excellent": "ល្អឥតខ្ចោះ",
  "Unknown Color": "ពណ៌មិនស្គាល់",
  "No color": "គ្មានពណ៌",
  "Not specified": "មិនបានបញ្ជាក់",
  "White": "ស",
  "Black": "ខ្មៅ",
  "Silver": "ប្រាក់",
  "Gray": "ប្រផេះ",
  "Grey": "ប្រផេះ",
  "Green": "បៃតង",
  "Yellow": "លឿង",
  "Brown": "ត្នោត",
  "Beige": "បន៍ត្នោតខ្ចី",
  "Gold": "មាស",
  "Navy": "ខៀវចាស់",
  "Navy Blue": "ខៀវចាស់",
  "Maroon": "ក្រហមចាស់",
  "Champagne": "សាំប៉ាញ",
  "Bronze": "សំរិទ្ធ",
  "Copper": "ទង់ដែង",
  "Cream": "ក្រែម",
  "Ivory": "ភ្លុក",
  "Pearl": "គុជខ្យង",
  "Pearl White": "សគុជខ្យង",
  "Metallic": "មេតាលិក",
  "Metallic Silver": "ប្រាក់មេតាលិក",
  "Metallic Gray": "ប្រផេះមេតាលិក",
  "Metallic Grey": "ប្រផេះមេតាលិក",
  "Gunmetal": "ប្រផេះដែក",
  "Dark Blue": "ខៀវចាស់",
  "Light Blue": "ខៀវស្រាល",
  "Dark Gray": "ប្រផេះចាស់",
  "Dark Grey": "ប្រផេះចាស់",
  "Light Gray": "ប្រផេះស្រាល",
  "Light Grey": "ប្រផេះស្រាល",
  "Silver Gray": "ប្រផេះប្រាក់",
  "Silver Grey": "ប្រផេះប្រាក់",
  "Black / White": "ខ្មៅ / ស",
  "White / Black": "ស / ខ្មៅ",
  "Blue / Black": "ខៀវ / ខ្មៅ",
  "Black / Blue": "ខ្មៅ / ខៀវ",
  "Red / Black": "ក្រហម / ខ្មៅ",
  "Black / Red": "ខ្មៅ / ក្រហម",

  // Stock
  "Stock Management": "គ្រប់គ្រងស្តុក",
  "+ New Adjustment": "+ កែតម្រូវថ្មី",
  "Return Stock": "ត្រឡប់ស្តុក",
  "Return stock": "ត្រឡប់ស្តុក",
  "Total Items": "ទំនិញសរុប",
  "Total Quantity": "បរិមាណសរុប",
  "Low Stock Alerts": "ការជូនដំណឹងស្តុកទាប",
  "Adjust Stock": "កែតម្រូវស្តុក",
  "Model Key": "កូដម៉ូដែល",
  "Model Key (e.g., toyota_camry_2023_new_white)": "កូដម៉ូដែល (ឧ. toyota_camry_2023_new_white)",
  "Action": "សកម្មភាព",
  "Adjust (+/-)": "កែតម្រូវ (+/-)",
  "Quantity Change": "បរិមាណផ្លាស់ប្តូរ",
  "Quantity (+ to add, - to remove)": "បរិមាណ (+ ដើម្បីបន្ថែម, - ដើម្បីដក)",
  "Minimum Stock Level": "កម្រិតស្តុកអប្បបរមា",
  "Min Stock Level (optional)": "កម្រិតស្តុកអប្បបរមា (មិនបាច់)",
  "Reason (Optional)": "មូលហេតុ (មិនបាច់)",
  "Current Stock": "ស្តុកបច្ចុប្បន្ន",
  "No stock items found. Use the form to create/adjust.": "រកមិនឃើញទំនិញក្នុងស្តុក។ ប្រើទម្រង់ដើម្បីបង្កើត ឬកែតម្រូវ។",
  "Adjusting...": "កំពុងកែតម្រូវ...",
  "Returned to inventory": "បានត្រឡប់ទៅស្តុក",
  "Manual adjustment": "ការកែតម្រូវដោយដៃ",
  "Quick adjust failed": "កែតម្រូវរហ័សបរាជ័យ",
  "Manual adjustment failed": "កែតម្រូវដោយដៃបរាជ័យ",
  "Return failed": "ការត្រឡប់បរាជ័យ",
  "Available": "ទំនេរ",
  "Reserved": "បានកក់",
  "KB": "KB",
  "Adjustment reason for audit trail...": "មូលហេតុកែតម្រូវសម្រាប់កំណត់ហេតុត្រួតពិនិត្យ...",
  "+10 or -5": "+10 ឬ -5",

  // SMS assets and transfers
  "Manage SMS equipment and resources": "គ្រប់គ្រងឧបករណ៍ SMS និងធនធាន",
  "Track SMS stock, assignments, locations, and transfer status.": "តាមដានស្តុក SMS ការចាត់តាំង ទីតាំង និងស្ថានភាពផ្ទេរ។",
  "Track SMS assets, assignments, locations, and transfer status.": "តាមដានទ្រព្យសម្បត្តិ SMS ការចាត់តាំង ទីតាំង និងស្ថានភាពផ្ទេរ។",
  "Transfers": "ការផ្ទេរ",
  "Move": "ផ្ទេរ",
  "Move Asset": "ផ្ទេរទ្រព្យសម្បត្តិ",
  "Send & receive": "ផ្ញើ និងទទួល",
  "Pending": "កំពុងរង់ចាំ",
  "Pending Transfers": "ការផ្ទេរកំពុងរង់ចាំ",
  "Review Requests": "ពិនិត្យសំណើ",
  "Transfer Requests": "សំណើផ្ទេរ",
  "Review pending SMS asset handovers and return requests.": "ពិនិត្យសំណើប្រគល់ទ្រព្យសម្បត្តិ SMS និងសំណើផ្ញើត្រឡប់ដែលកំពុងរង់ចាំ។",
  "Approve pending SMS asset handovers and return requests.": "អនុម័តសំណើប្រគល់ទ្រព្យសម្បត្តិ SMS និងសំណើត្រឡប់ដែលកំពុងរង់ចាំ។",
  "No Pending Transfer Requests": "គ្មានសំណើផ្ទេរកំពុងរង់ចាំ",
  "No Pending Review Requests": "គ្មានសំណើរង់ចាំពិនិត្យ",
  "All SMS asset handovers and return requests are processed.": "ការប្រគល់ទ្រព្យសម្បត្តិ SMS និងសំណើផ្ញើត្រឡប់ទាំងអស់ត្រូវបានដំណើរការ។",
  "Pending Review": "រង់ចាំពិនិត្យ",
  "Create New Transfer": "បង្កើតការផ្ទេរថ្មី",
  "Check Again": "ពិនិត្យម្តងទៀត",
  "SMS Movement": "ចលនាទ្រព្យសម្បត្តិ SMS",
  "Asset Movement": "ចលនាទ្រព្យសម្បត្តិ",
  "Movement type": "ប្រភេទចលនា",
  "People and location": "អ្នកពាក់ព័ន្ធ និងទីតាំង",
  "Proof and notes": "ភស្តុតាង និងកំណត់សម្គាល់",
  "Send stock to someone or send it back through the same approval flow.": "ផ្ញើស្តុកទៅអ្នកណាម្នាក់ ឬផ្ញើត្រឡប់វិញតាមលំហូរអនុម័តដូចគ្នា។",
  "Send an asset to someone or send an assigned asset back to a selected user.": "ផ្ញើទ្រព្យសម្បត្តិទៅអ្នកណាម្នាក់ ឬផ្ញើទ្រព្យសម្បត្តិដែលបានចាត់តាំងត្រឡប់ទៅអ្នកប្រើដែលបានជ្រើសរើស។",
  "Send SMS assets, record handovers, and request returns through approval.": "ផ្ញើ ឬស្នើត្រឡប់ទ្រព្យសម្បត្តិ SMS តាមលំហូរអនុម័ត។",
  "Send Asset": "ផ្ញើចេញ",
  "Return Asset": "ស្នើត្រឡប់",
  "Create Transfer Request": "បង្កើតសំណើផ្ទេរ",
  "Create Return Request": "បង្កើតសំណើត្រឡប់",
  "Return request sent.": "បានផ្ញើសំណើត្រឡប់។",
  "Send To": "ផ្ញើទៅ",
  "Send Back": "ផ្ញើត្រឡប់",
  "Send assigned asset back to a selected user": "ផ្ញើទ្រព្យសម្បត្តិដែលបានចាត់តាំងត្រឡប់ទៅអ្នកប្រើដែលបានជ្រើសរើស",
  "Send From": "ផ្ញើពី",
  "Send From *": "ផ្ញើពី *",
  "Send Back From": "ផ្ញើត្រឡប់ពី",
  "Send Back From *": "ផ្ញើត្រឡប់ពី *",
  "Send Back To": "ផ្ញើត្រឡប់ទៅ",
  "Send Back To *": "ផ្ញើត្រឡប់ទៅ *",
  "Select send back receiver": "ជ្រើសរើសអ្នកទទួលការផ្ញើត្រឡប់",
  "Send To Location": "ទីតាំងផ្ញើទៅ",
  "Send To Location *": "ទីតាំងផ្ញើទៅ *",
  "Send Back Location": "ទីតាំងផ្ញើត្រឡប់",
  "Send Back Location *": "ទីតាំងផ្ញើត្រឡប់ *",
  "Send Back Note": "កំណត់សម្គាល់ផ្ញើត្រឡប់",
  "Send Back Image": "រូបភាពផ្ញើត្រឡប់",
  "Upload send back photo": "ផ្ទុករូបថតផ្ញើត្រឡប់",
  "Stock": "ស្តុក",
  "Transfer request sent.": "បានផ្ញើសំណើផ្ទេរ។",
  "Send back request sent.": "បានផ្ញើសំណើផ្ញើត្រឡប់។",
  "New asset created and transfer request sent.": "បានបង្កើតទ្រព្យសម្បត្តិថ្មី និងផ្ញើសំណើផ្ទេរ។",
  "Please select an assigned asset to send back.": "សូមជ្រើសរើសទ្រព្យសម្បត្តិដែលបានចាត់តាំងដើម្បីផ្ញើត្រឡប់។",
  "Please select who is sending this asset back.": "សូមជ្រើសរើសអ្នកដែលផ្ញើទ្រព្យសម្បត្តិនេះត្រឡប់។",
  "Please select who this asset is going back to.": "សូមជ្រើសរើសអ្នកដែលទ្រព្យសម្បត្តិនេះត្រូវផ្ញើត្រឡប់ទៅ។",
  "No assigned assets are available to send back.": "គ្មានទ្រព្យសម្បត្តិដែលបានចាត់តាំងសម្រាប់ផ្ញើត្រឡប់ទេ។",
  "Select an assigned asset to send back": "ជ្រើសរើសទ្រព្យសម្បត្តិដែលបានចាត់តាំងដើម្បីផ្ញើត្រឡប់",
  "Select asset to send back": "ជ្រើសរើសទ្រព្យសម្បត្តិដើម្បីផ្ញើត្រឡប់",
  "Select or enter sender username": "ជ្រើសរើស ឬបញ្ចូលឈ្មោះអ្នកផ្ញើ",
  "Select or enter returning username": "ជ្រើសរើស ឬបញ្ចូលឈ្មោះអ្នកត្រឡប់",
  "Select or enter receiver": "ជ្រើសរើស ឬបញ្ចូលឈ្មោះអ្នកទទួល",
  "Select or enter send back receiver": "ជ្រើសរើស ឬបញ្ចូលអ្នកទទួលការត្រឡប់",
  "No matching assets": "គ្មានទ្រព្យសម្បត្តិដែលត្រូវគ្នា",
  "Select person": "ជ្រើសរើសមនុស្ស",
  "Assigned to": "ចាត់តាំងឱ្យ",
  "Return": "ត្រឡប់",
  "Return to Stock": "ត្រឡប់ទៅស្តុក",
  "Upload photo and note": "ផ្ទុករូបថត និងកំណត់សម្គាល់",
  "Return an assigned asset with a note and optional photo.": "ត្រឡប់ទ្រព្យសម្បត្តិដែលបានចាត់តាំង ជាមួយកំណត់សម្គាល់ និងរូបថតជាជម្រើស។",
  "Return request": "សំណើត្រឡប់",
  "Return request sent for admin approval.": "បានផ្ញើសំណើត្រឡប់សម្រាប់ការអនុម័តពីអ្នកគ្រប់គ្រង។",
  "Return Review": "ការពិនិត្យការត្រឡប់",
  "Returning Person": "អ្នកត្រឡប់",
  "Returning Person *": "អ្នកត្រឡប់ *",
  "Select returning person": "ជ្រើសរើសអ្នកត្រឡប់",
  "Enter returning username": "បញ្ចូលឈ្មោះអ្នកប្រើដែលត្រឡប់",
  "Please select who is returning this asset.": "សូមជ្រើសរើសអ្នកដែលត្រឡប់ទ្រព្យសម្បត្តិនេះ។",
  "Accept Return": "ទទួលយកការត្រឡប់",
  "Accept Transfer": "ទទួលយកការផ្ទេរ",
  "Reject Transfer": "បដិសេធការផ្ទេរ",
  "Reject": "បដិសេធ",
  "Send Return Back": "ផ្ញើសំណើត្រឡប់វិញ",
  "Destination": "គោលដៅ",
  "The asset will stay assigned.": "ទ្រព្យសម្បត្តិនឹងនៅតែបានចាត់តាំង។",
  "Waiting for an admin to review this return request.": "កំពុងរង់ចាំអ្នកគ្រប់គ្រងពិនិត្យសំណើត្រឡប់នេះ។",
  "Waiting for": "កំពុងរង់ចាំ",
  "or an admin to review this transfer.": "ឬអ្នកគ្រប់គ្រងពិនិត្យការផ្ទេរនេះ។",
  "Confirm returning": "បញ្ជាក់ការត្រឡប់",
  "Confirm accepting transfer": "បញ្ជាក់ការទទួលយកការផ្ទេរ",
  "Send this return request back to": "ផ្ញើសំណើត្រឡប់នេះត្រឡប់ទៅ",
  "Reject transfer from": "បដិសេធការផ្ទេរពី",
  "Message from sender": "សារពីអ្នកផ្ញើ",
  "Requested": "បានស្នើ",
  "Reason (optional)": "មូលហេតុ (មិនបាច់)",
  "back to inventory?": "ត្រឡប់ទៅបញ្ជីទ្រព្យសម្បត្តិវិញឬ?",
  "Back to SMS": "ត្រឡប់ទៅ SMS",
  "Back to SMS Dashboard": "ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រង SMS",
  "Transfer Inbox": "ប្រអប់ការផ្ទេរ",
  "New Transfer": "ការផ្ទេរថ្មី",
  "Mark read": "សម្គាល់ថាបានអាន",
  "unread notification": "ការជូនដំណឹងមិនទាន់អាន",
  "unread notifications": "ការជូនដំណឹងមិនទាន់អាន",
  "Out": "បានចេញ",
  "Sent Out": "បានផ្ញើចេញ",
  "Not Returned": "មិនទាន់ត្រឡប់",
  "Overdue Return": "លើសកំណត់ត្រឡប់",
  "Asset": "ទ្រព្យសម្បត្តិ",
  "Asset *": "ទ្រព្យសម្បត្តិ *",
  "Assets": "ទ្រព្យសម្បត្តិ",
  "Asset Name": "ឈ្មោះទ្រព្យសម្បត្តិ",
  "Asset Name *": "ឈ្មោះទ្រព្យសម្បត្តិ *",
  "Asset Code": "កូដទ្រព្យសម្បត្តិ",
  "Asset name": "ឈ្មោះទ្រព្យសម្បត្តិ",
  "Asset code": "កូដទ្រព្យសម្បត្តិ",
  "Update SMS asset details": "កែប្រែព័ត៌មានទ្រព្យសម្បត្តិ SMS",
  "Create an SMS asset record": "បង្កើតកំណត់ត្រាទ្រព្យសម្បត្តិ SMS",
  "Required Asset Info": "ព័ត៌មានទ្រព្យសម្បត្តិចាំបាច់",
  "Name, code, type, and quantity define the inventory record.": "ឈ្មោះ កូដ ប្រភេទ និងចំនួន ជាព័ត៌មានសំខាន់សម្រាប់កំណត់ត្រាទ្រព្យសម្បត្តិ។",
  "Code": "កូដ",
  "Type": "ប្រភេទ",
  "Type *": "ប្រភេទ *",
  "Asset type": "ប្រភេទទ្រព្យសម្បត្តិ",
  "Asset Type": "ប្រភេទទ្រព្យសម្បត្តិ",
  "Asset Type *": "ប្រភេទទ្រព្យសម្បត្តិ *",
  "Select or type an asset type...": "ជ្រើសរើស ឬបញ្ចូលប្រភេទទ្រព្យសម្បត្តិ...",
  "Type / Category": "ប្រភេទ / ក្រុម",
  "Electronics": "អេឡិចត្រូនិក",
  "Furniture": "គ្រឿងសង្ហារឹម",
  "Tool": "ឧបករណ៍",
  "Office Supply": "សម្ភារការិយាល័យ",
  "Classification & Location": "ការចាត់ក្រុម និងទីតាំង",
  "Group assets by category and inventory location.": "ដាក់ក្រុមទ្រព្យសម្បត្តិតាមប្រភេទ និងទីតាំងក្នុងបញ្ជី។",
  "Group & Location": "ក្រុម និងទីតាំង",
  "Group": "ក្រុម",
  "Asset group": "ក្រុមទ្រព្យសម្បត្តិ",
  "e.g. Vehicle documents, Hard cards, Office equipment": "ឧ. ឯកសាររថយន្ត, កាតរឹង, ឧបករណ៍ការិយាល័យ",
  "Group assets by team, document type, or inventory location.": "ដាក់ក្រុមទ្រព្យសម្បត្តិតាមក្រុមការងារ ប្រភេទឯកសារ ឬទីតាំងក្នុងបញ្ជី។",
  "Receiver": "អ្នកទទួល",
  "Receiver *": "អ្នកទទួល *",
  "Receiver is required": "ត្រូវការអ្នកទទួល",
  "Status": "ស្ថានភាព",
  "Status & Assignment": "ស្ថានភាព និងការចាត់តាំង",
  "Keep new assets Available unless they are already assigned or sent out.": "រក្សាទ្រព្យសម្បត្តិថ្មីជា “ទំនេរ” លុះត្រាតែបានចាត់តាំង ឬផ្ញើចេញរួចហើយ។",
  "Assigned": "បានចាត់តាំង",
  "Assigned To": "ចាត់តាំងឱ្យ",
  "Optional for available assets": "មិនបាច់បញ្ចូលសម្រាប់ទ្រព្យសម្បត្តិទំនេរ",
  "Select or enter assignee": "ជ្រើសរើស ឬបញ្ចូលអ្នកទទួលការចាត់តាំង",
  "Actions": "សកម្មភាព",
  "Qty": "ចំនួន",
  "Item Code": "កូដទំនិញ",
  "Use a short unique code for labels, audits, and search.": "ប្រើកូដខ្លីមិនស្ទួន សម្រាប់ស្លាក ការត្រួតពិនិត្យ និងការស្វែងរក។",
  "Generate": "បង្កើតកូដ",
  "Generate asset code": "បង្កើតកូដទ្រព្យសម្បត្តិ",
  "Image (Optional)": "រូបភាព (មិនបាច់)",
  "Media": "រូបភាព និងឯកសារ",
  "Use a clear photo of the actual asset and attach a document link if needed.": "ប្រើរូបថតច្បាស់នៃទ្រព្យសម្បត្តិពិត និងភ្ជាប់តំណឯកសារបើចាំបាច់។",
  "Upload Image": "ផ្ទុករូបភាព",
  "Upload asset image": "ផ្ទុករូបភាពទ្រព្យសម្បត្តិ",
  "PNG, JPG up to 10MB": "PNG, JPG រហូតដល់ 10MB",
  "Use a clear photo of the actual asset. PNG, JPG, or WebP up to 10MB.": "ប្រើរូបថតច្បាស់នៃទ្រព្យសម្បត្តិពិត។ PNG, JPG ឬ WebP រហូតដល់ 10MB។",
  "Reference ID": "លេខសម្គាល់យោង",
  "Document URL": "URL ឯកសារ",
  "Notes & References": "កំណត់សម្គាល់ និងឯកសារយោង",
  "Optional details for purchasing, audit, or handover records.": "ព័ត៌មានបន្ថែមសម្រាប់ការទិញ ការត្រួតពិនិត្យ ឬកំណត់ត្រាប្រគល់ទ្រព្យសម្បត្តិ។",
  "View details": "មើលព័ត៌មានលម្អិត",
  "View asset details": "មើលព័ត៌មានលម្អិតទ្រព្យសម្បត្តិ",
  "Asset preview": "មើលទ្រព្យសម្បត្តិជាមុន",
  "Last Movement": "ចលនាចុងក្រោយ",
  "No movement": "គ្មានចលនា",
  "No item code": "គ្មានកូដទំនិញ",
  "Not set": "មិនទាន់កំណត់",
  "Updated": "បានធ្វើបច្ចុប្បន្នភាព",
  "Created By": "បង្កើតដោយ",
  "Copy asset ID": "ចម្លងលេខសម្គាល់ទ្រព្យសម្បត្តិ",
  "Image unavailable": "មិនអាចបង្ហាញរូបភាពបាន",
  "No location": "គ្មានទីតាំង",
  "Unassigned": "មិនទាន់ចាត់តាំង",
  "Asset details": "ព័ត៌មានលម្អិតទ្រព្យសម្បត្តិ",
  "Return proof": "ភស្តុតាងត្រឡប់",
  "Copy JSON": "ចម្លង JSON",
  "Latest Update": "បច្ចុប្បន្នភាពចុងក្រោយ",
  "Newest Added": "បានបន្ថែមថ្មីបំផុត",
  "All inventory": "ទ្រព្យសម្បត្តិទាំងអស់",
  "Ready in inventory": "រួចរាល់ក្នុងបញ្ជីទ្រព្យសម្បត្តិ",
  "Currently in use": "កំពុងប្រើប្រាស់",
  "Needs follow-up": "ត្រូវតាមដានបន្ត",
  "Waiting approval": "កំពុងរង់ចាំការអនុម័ត",
  "Search assets": "ស្វែងរកទ្រព្យសម្បត្តិ",
  "Search name, code, location, assigned person...": "ស្វែងរកតាមឈ្មោះ កូដ ទីតាំង ឬអ្នកដែលបានចាត់តាំង...",
  "Search assets by name, code, location, assigned person...": "ស្វែងរកទ្រព្យសម្បត្តិតាមឈ្មោះ កូដ ទីតាំង ឬអ្នកទទួល...",
  "Filter by asset status": "តម្រងតាមស្ថានភាពទ្រព្យសម្បត្តិ",
  "Filter by type": "តម្រងតាមប្រភេទ",
  "Filter by creator": "តម្រងតាមអ្នកបង្កើត",
  "All Status": "ស្ថានភាពទាំងអស់",
  "Sort assets": "តម្រៀបទ្រព្យសម្បត្តិ",
  "Assets per page": "ចំនួនទ្រព្យសម្បត្តិក្នុងមួយទំព័រ",
  "More filters": "តម្រងបន្ថែម",
  "Active": "សកម្ម",
  "Type...": "ប្រភេទ...",
  "Category...": "ប្រភេទក្រុម...",
  "Location...": "ទីតាំង...",
  "Created by...": "បង្កើតដោយ...",
  "Clear Filters": "សម្អាតតម្រង",
  "Assigned to...": "ចាត់តាំងឱ្យ...",
  "Clear Filters & Add Asset": "សម្អាតតម្រង និងបន្ថែមទ្រព្យសម្បត្តិ",
  "Add First Asset": "បន្ថែមទ្រព្យសម្បត្តិដំបូង",
  "No SMS assets are available yet.": "មិនទាន់មានទ្រព្យសម្បត្តិ SMS ទេ។",
  "Get started by adding your first asset.": "ចាប់ផ្តើមដោយបន្ថែមទ្រព្យសម្បត្តិដំបូងរបស់អ្នក។",
  "New Asset": "ទ្រព្យសម្បត្តិថ្មី",
  "Failed to load assets": "បរាជ័យក្នុងការផ្ទុកទ្រព្យសម្បត្តិ",
  "Failed to fetch assets": "បរាជ័យក្នុងការទាញយកទ្រព្យសម្បត្តិ",
  "No assets found": "រកមិនឃើញទ្រព្យសម្បត្តិ",
  "Try adjusting your search or filters": "សូមកែសម្រួលពាក្យស្វែងរក ឬតម្រង",
  "Failed to load returnable assets": "បរាជ័យក្នុងការផ្ទុកទ្រព្យសម្បត្តិដែលអាចត្រឡប់បាន",
  "Failed to create transfer": "បរាជ័យក្នុងការបង្កើតសំណើផ្ទេរ",
  "Failed to create new asset": "បរាជ័យក្នុងការបង្កើតទ្រព្យសម្បត្តិថ្មី",
  "Asset name is required": "ត្រូវការឈ្មោះទ្រព្យសម្បត្តិ",
  "Name must be at least 2 characters": "ឈ្មោះត្រូវមានយ៉ាងហោចណាស់ 2 តួអក្សរ",
  "Name too long (max 255 characters)": "ឈ្មោះវែងពេក (អតិបរមា 255 តួអក្សរ)",
  "Type is required": "ត្រូវការប្រភេទ",
  "Type too long (max 64 characters)": "ប្រភេទវែងពេក (អតិបរមា 64 តួអក្សរ)",
  "Quantity is required": "ត្រូវការចំនួន",
  "Quantity must be at least 1": "ចំនួនត្រូវមានយ៉ាងហោចណាស់ 1",
  "Quantity too high (max 999)": "ចំនួនខ្ពស់ពេក (អតិបរមា 999)",
  "Assigned to is required when the asset is not available": "ត្រូវការអ្នកទទួលការចាត់តាំង នៅពេលទ្រព្យសម្បត្តិមិនមែនទំនេរ",
  "Item code too long (max 64 characters)": "កូដទ្រព្យសម្បត្តិវែងពេក (អតិបរមា 64 តួអក្សរ)",
  "Category too long (max 64 characters)": "ប្រភេទក្រុមវែងពេក (អតិបរមា 64 តួអក្សរ)",
  "Location too long (max 128 characters)": "ទីតាំងវែងពេក (អតិបរមា 128 តួអក្សរ)",
  "Assigned to too long (max 128 characters)": "អ្នកទទួលការចាត់តាំងវែងពេក (អតិបរមា 128 តួអក្សរ)",
  "Description too long (max 1000 characters)": "សេចក្តីពិពណ៌នាវែងពេក (អតិបរមា 1000 តួអក្សរ)",
  "Reference ID too long (max 128 characters)": "លេខសម្គាល់យោងវែងពេក (អតិបរមា 128 តួអក្សរ)",
  "Document URL too long (max 512 characters)": "URL ឯកសារវែងពេក (អតិបរមា 512 តួអក្សរ)",
  "File too large (max 10MB)": "ឯកសារធំពេក (អតិបរមា 10MB)",
  "Upload failed": "ផ្ទុកឡើងបរាជ័យ",
  "Please fix the errors below.": "សូមកែតម្រូវកំហុសខាងក្រោម។",
  "Save failed": "រក្សាទុកបរាជ័យ",
  "Update failed": "កែប្រែបរាជ័យ",
  "Update Asset": "ធ្វើឱ្យទាន់សម័យទ្រព្យសម្បត្តិ",
  "Create Asset": "បង្កើតទ្រព្យសម្បត្តិ",
  "Delete this asset?": "លុបទ្រព្យសម្បត្តិនេះឬ?",
  "Delete failed": "លុបបរាជ័យ",
  "Returned from asset inventory": "បានត្រឡប់ពីបញ្ជីទ្រព្យសម្បត្តិ",
  "Image upload failed": "ផ្ទុករូបភាពបរាជ័យ",
  "Please select an asset to return.": "សូមជ្រើសរើសទ្រព្យសម្បត្តិដើម្បីត្រឡប់។",
  "Returned to stock": "បានត្រឡប់ទៅស្តុក",
  "Asset returned to stock successfully.": "បានត្រឡប់ទ្រព្យសម្បត្តិទៅស្តុកដោយជោគជ័យ។",
  "Loading asset...": "កំពុងផ្ទុកទ្រព្យសម្បត្តិ...",
  "Route": "ផ្លូវ",
  "No transfers for this asset.": "គ្មានការផ្ទេរសម្រាប់ទ្រព្យសម្បត្តិនេះទេ។",
  "No history events available.": "គ្មានប្រវត្តិព្រឹត្តិការណ៍ទេ។",
  "Return Location": "ទីតាំងត្រឡប់",
  "Return Note": "កំណត់សម្គាល់ត្រឡប់",
  "Return Image": "រូបភាពត្រឡប់",
  "Select asset to return": "ជ្រើសរើសទ្រព្យសម្បត្តិដើម្បីត្រឡប់",
  "Select an assigned asset": "ជ្រើសរើសទ្រព្យសម្បត្តិដែលបានចាត់តាំង",
  "No assigned assets are available to return.": "គ្មានទ្រព្យសម្បត្តិដែលបានចាត់តាំងសម្រាប់ត្រឡប់ទេ។",
  "e.g. Stock Room, Warehouse A": "ឧ. បន្ទប់ស្តុក, ឃ្លាំង A",
  "Example: Returned by staff after monthly check. Charger included.": "ឧទាហរណ៍៖ បុគ្គលិកបានត្រឡប់ក្រោយពិនិត្យប្រចាំខែ។ មានឆ្នាំងសាករួម។",
  "Upload return photo": "ផ្ទុករូបថតត្រឡប់",
  "JPG, PNG, WebP, or GIF": "JPG, PNG, WebP ឬ GIF",
  "No file chosen": "មិនទាន់បានជ្រើសឯកសារ",
  "Remove return image": "យករូបភាពត្រឡប់ចេញ",
  "Returning...": "កំពុងត្រឡប់...",
  "Additional details about this asset...": "ព័ត៌មានបន្ថែមអំពីទ្រព្យសម្បត្តិនេះ...",
  "e.g. DELL-XPS-13-2024": "ឧ. DELL-XPS-13-2024",
  "e.g. Laptop, Desk Chair": "ឧ. កុំព្យូទ័រយួរដៃ, កៅអីតុ",
  "e.g. Office Laptop Dell XPS": "ឧ. កុំព្យូទ័រយួរដៃការិយាល័យ Dell XPS",
  "e.g. Phnom Penh Office": "ឧ. ការិយាល័យភ្នំពេញ",
  "e.g. PO-2024-001": "ឧ. PO-2024-001",
  "e.g. Warehouse A, Office Building": "ឧ. ឃ្លាំង A, អាគារការិយាល័យ",
  "Enter sender username": "បញ្ចូលឈ្មោះអ្នកផ្ញើ",
  "Enter receiver username": "បញ្ចូលឈ្មោះអ្នកទទួល",
  "Enter rejection reason...": "បញ្ចូលមូលហេតុបដិសេធ...",
  "Message to receiver": "សារទៅអ្នកទទួល",
  "Message to receiver (Optional)": "សារទៅអ្នកទទួល (មិនបាច់)",
  "Example: Please accept this projector for the Sen Sok meeting room...": "ឧទាហរណ៍៖ សូមទទួលយកម៉ាស៊ីនបញ្ចាំងនេះសម្រាប់បន្ទប់ប្រជុំសែនសុខ...",
  "Select an asset or enter asset ID": "ជ្រើសរើសទ្រព្យសម្បត្តិ ឬបញ្ចូលលេខសម្គាល់ទ្រព្យសម្បត្តិ",
  "Transfer Image": "រូបភាពផ្ទេរ",
  "Transfer Image (Optional)": "រូបភាពផ្ទេរ (មិនបាច់)",
  "Upload transfer photo": "ផ្ទុកឡើងរូបថតផ្ទេរ",
  "Signed in as": "បានចូលជា",
  "Status:": "ស្ថានភាព៖",
  "Assigned:": "បានចាត់តាំង៖",

  // LMS and training
  "Training Portal": "ផ្ទាំងបណ្តុះបណ្តាល",
  "Learning Center": "មជ្ឈមណ្ឌលសិក្សា",
  "Browse lessons, continue training, and track your progress.": "មើលមេរៀន បន្តការបណ្តុះបណ្តាល និងតាមដានវឌ្ឍនភាពរបស់អ្នក។",
  "Master vehicle valuation skills": "រៀនជំនាញវាយតម្លៃយានយន្ត",
  "Valuation": "ការវាយតម្លៃ",
  "System Training": "ការបណ្តុះបណ្តាលប្រព័ន្ធ",
  "Customer Service": "សេវាអតិថិជន",
  "Compliance": "ការអនុលោមតាមច្បាប់",
  "Introduction to Emerald Cloud System": "ការណែនាំអំពីប្រព័ន្ធអេមើរ៉ល ក្លោដ",
  "Emerald Cloud": "អេមើរ៉ល ក្លោដ",
  "Introduction to Vehicle Valuation": "ការណែនាំអំពីការវាយតម្លៃយានយន្ត",
  "VMS Platform Overview": "ទិដ្ឋភាពទូទៅនៃវេទិកា VMS",
  "Advanced Pricing Strategies": "យុទ្ធសាស្ត្រកំណត់តម្លៃកម្រិតខ្ពស់",
  "Class Demo": "ការបង្ហាញសាកល្បង",
  "Demo Class": "ថ្នាក់សាកល្បង",
  "Vehicle Valuation 101": "មូលដ្ឋានគ្រឹះនៃការវាយតម្លៃរថយន្ត",
  "Vehicle Valuation Basics": "មូលដ្ឋានគ្រឹះនៃការវាយតម្លៃរថយន្ត",
  "Emerald Cloud System": "ប្រព័ន្ធអេមើរ៉ល ក្លោដ",
  "How to become an outstanding employee": "របៀបក្លាយជាបុគ្គលិកឆ្នើម",
  "Learn vehicle valuation techniques and pricing strategies": "រៀនបច្ចេកទេសវាយតម្លៃយានយន្ត និងយុទ្ធសាស្ត្រកំណត់តម្លៃ",
  "How to use the VMS platform effectively": "របៀបប្រើវេទិកា VMS ឱ្យមានប្រសិទ្ធភាព",
  "Best practices for customer interactions": "ការអនុវត្តល្អបំផុតសម្រាប់ការទំនាក់ទំនងជាមួយអតិថិជន",
  "Legal requirements and documentation standards": "តម្រូវការផ្លូវច្បាប់ និងស្តង់ដារឯកសារ",
  "Learn the basics of vehicle valuation and pricing": "រៀនមូលដ្ឋាននៃការវាយតម្លៃ និងកំណត់តម្លៃយានយន្ត",
  "Deep dive into pricing models and depreciation": "សិក្សាជ្រាលជ្រៅអំពីគំរូកំណត់តម្លៃ និងការរំលោះតម្លៃ",
  "Getting started with the Vehicle Management System": "ចាប់ផ្តើមប្រើប្រព័ន្ធគ្រប់គ្រងយានយន្ត",
  "Learning": "ការរៀន",
  "Lessons": "មេរៀន",
  "Progress": "វឌ្ឍនភាព",
  "My Progress": "វឌ្ឍនភាពរបស់ខ្ញុំ",
  "Awards": "ពានរង្វាន់",
  "Achievements": "សមិទ្ធផល",
  "My Process": "ដំណើរការរបស់ខ្ញុំ",
  "Your Progress": "វឌ្ឍនភាពរបស់អ្នក",
  "Completion Rate": "អត្រាបញ្ចប់",
  "Continue Learning": "បន្តរៀន",
  "Pick up where you left off": "បន្តពីកន្លែងដែលអ្នកបានឈប់",
  "Resume": "បន្ត",
  "Training Categories": "ប្រភេទបណ្តុះបណ្តាល",
  "lessons": "មេរៀន",
  "Start": "ចាប់ផ្តើម",
  "Review": "ពិនិត្យឡើងវិញ",
  "Done": "រួចរាល់",
  "Unlocked": "បានដោះសោ",
  "Overall": "សរុប",
  "Completed": "បានបញ្ចប់",
  "In Progress": "កំពុងដំណើរការ",
  "Locked": "ជាប់សោ",
  "Overall Completion": "ការបញ្ចប់សរុប",
  "Staff Progress": "វឌ្ឍនភាពបុគ្គលិក",
  "No staff data available": "គ្មានទិន្នន័យបុគ្គលិក",
  "Loading users...": "កំពុងផ្ទុកអ្នកប្រើប្រាស់...",
  "Go to Settings to sync users with LMS staff": "ទៅការកំណត់ ដើម្បីសមកាលកម្មអ្នកប្រើប្រាស់ជាមួយបុគ្គលិក LMS",
  "LMS Only": "តែ LMS",
  "Settings Only": "តែការកំណត់",
  "Sync from Settings": "សមកាលកម្មពីការកំណត់",
  "First Steps": "ជំហានដំបូង",
  "Complete your first lesson": "បញ្ចប់មេរៀនដំបូងរបស់អ្នក",
  "Category Master": "អ្នកជំនាញប្រភេទ",
  "Complete all lessons in a category": "បញ្ចប់មេរៀនទាំងអស់ក្នុងប្រភេទមួយ",
  "Training Graduate": "អ្នកបញ្ចប់ការបណ្តុះបណ្តាល",
  "Complete all training lessons": "បញ្ចប់មេរៀនបណ្តុះបណ្តាលទាំងអស់",
  "My Training Process": "ដំណើរការបណ្តុះបណ្តាលរបស់ខ្ញុំ",
  "Track your personal learning journey": "តាមដានដំណើររៀនផ្ទាល់ខ្លួនរបស់អ្នក",
  "Category Progress": "វឌ្ឍនភាពប្រភេទ",
  "Recent Activity": "សកម្មភាពថ្មីៗ",
  "No completed lessons yet. Start learning to see your progress!": "មិនទាន់មានមេរៀនបានបញ្ចប់ទេ។ ចាប់ផ្តើមរៀនដើម្បីមើលវឌ្ឍនភាពរបស់អ្នក!",
  "Admin Controls": "ការគ្រប់គ្រងអ្នកគ្រប់គ្រង",
  "Manage Categories": "គ្រប់គ្រងប្រភេទ",
  "Manage Lessons": "គ្រប់គ្រងមេរៀន",
  "Manage Staff": "គ្រប់គ្រងបុគ្គលិក",
  "Staff Tracking": "តាមដានបុគ្គលិក",
  "Track staff learning process and LMS completion": "តាមដានដំណើរការរៀន និងការបញ្ចប់ LMS របស់បុគ្គលិក",
  "Settings accounts": "គណនីក្នុងការកំណត់",
  "Synced to LMS": "បានសមកាលកម្មទៅ LMS",
  "Not Synced": "មិនទាន់សមកាលកម្ម",
  "Not Started": "មិនទាន់ចាប់ផ្តើម",
  "Need follow-up": "ត្រូវតាមដាន",
  "Need Follow-up": "ត្រូវតាមដាន",
  "Started learning": "បានចាប់ផ្តើមរៀន",
  "Finished all lessons": "បានបញ្ចប់មេរៀនទាំងអស់",
  "Staff Learning Process": "ដំណើរការរៀនរបស់បុគ្គលិក",
  "Monitor who has started, who is progressing, and who needs follow-up.": "តាមដានអ្នកដែលបានចាប់ផ្តើម អ្នកកំពុងរៀន និងអ្នកដែលត្រូវតាមដានបន្ត។",
  "Started or ready to complete": "បានចាប់ផ្តើម ឬរួចរាល់ដើម្បីបញ្ចប់",
  "Finished all assigned lessons": "បានបញ្ចប់មេរៀនដែលបានចាត់តាំងទាំងអស់",
  "Latest learning activity": "សកម្មភាពរៀនចុងក្រោយ",
  "No lesson activity": "មិនទាន់មានសកម្មភាពមេរៀន",
  "No learning activity yet.": "មិនទាន់មានសកម្មភាពរៀនទេ។",
  "Not synced to LMS": "មិនទាន់សមកាលកម្មទៅ LMS",
  "Not started learning": "មិនទាន់ចាប់ផ្តើមរៀន",
  "Low completion progress": "វឌ្ឍនភាពបញ្ចប់នៅទាប",
  "Everyone is on track.": "បុគ្គលិកទាំងអស់កំពុងដំណើរការល្អ។",
  "Search name, email, phone, or lesson...": "ស្វែងរកឈ្មោះ អ៊ីមែល ទូរស័ព្ទ ឬមេរៀន...",
  "Search staff": "ស្វែងរកបុគ្គលិក",
  "Filter by status": "តម្រងតាមស្ថានភាព",
  "Filter by role": "តម្រងតាមតួនាទី",
  "All Roles": "តួនាទីទាំងអស់",
  "Sort staff": "តម្រៀបបុគ្គលិក",
  "Progress High": "វឌ្ឍនភាពខ្ពស់",
  "Progress Low": "វឌ្ឍនភាពទាប",
  "Sync Staff to LMS": "សមកាលកម្មបុគ្គលិកទៅ LMS",
  "Staff Progress Table": "តារាងវឌ្ឍនភាពបុគ្គលិក",
  "Last Lesson": "មេរៀនចុងក្រោយ",
  "No Staff Found": "រកមិនឃើញបុគ្គលិក",
  "No staff accounts match the current filters": "គ្មានគណនីបុគ្គលិកត្រូវនឹងតម្រងបច្ចុប្បន្ន",
  "View Details": "មើលព័ត៌មានលម្អិត",
  "Latest Watch": "ការមើលចុងក្រោយ",
  "Overall progress": "វឌ្ឍនភាពសរុប",
  "Contact": "ទំនាក់ទំនង",
  "Learning Activity": "សកម្មភាពរៀន",
  "Last activity": "សកម្មភាពចុងក្រោយ",
  "Last lesson": "មេរៀនចុងក្រោយ",
  "Watched videos": "វីដេអូបានមើល",
  "No email": "គ្មានអ៊ីមែល",
  "No phone": "គ្មានលេខទូរស័ព្ទ",
  "Close staff tracking details": "បិទព័ត៌មានតាមដានបុគ្គលិក",
  "Go to Settings": "ទៅការកំណត់",
  "No Training Content Yet": "មិនទាន់មានមាតិកាបណ្តុះបណ្តាល",
  "The training portal is ready, but no courses have been added.": "ផ្ទាំងបណ្តុះបណ្តាលរួចរាល់ហើយ ប៉ុន្តែមិនទាន់មានវគ្គសិក្សាត្រូវបានបន្ថែមទេ។",
  "Open Content Manager": "បើកគ្រប់គ្រងមាតិកា",
  "Admin: create categories and lessons in Content Manager.": "អ្នកគ្រប់គ្រង៖ បង្កើតប្រភេទ និងមេរៀននៅក្នុងគ្រប់គ្រងមាតិកា។",
  "Training Content": "មាតិកាបណ្តុះបណ្តាល",
  "Loading Training Content": "កំពុងផ្ទុកមាតិកាបណ្តុះបណ្តាល",
  "Your LMS data will appear here as soon as it finishes loading.": "ទិន្នន័យ LMS របស់អ្នកនឹងបង្ហាញនៅទីនេះ បន្ទាប់ពីផ្ទុករួច។",
  "No Categories Found": "រកមិនឃើញប្រភេទ",
  "No Lessons Available": "មិនមានមេរៀនអាចរៀនបាន",
  "Try adjusting your search query": "សូមកែសម្រួលពាក្យស្វែងរករបស់អ្នក",
  "No published lessons are available yet.": "មិនទាន់មានមេរៀនដែលបានផ្សព្វផ្សាយទេ។",
  "Search categories...": "ស្វែងរកប្រភេទ...",
  "No lessons": "គ្មានមេរៀន",
  "No category progress yet.": "មិនទាន់មានវឌ្ឍនភាពប្រភេទទេ។",
  "Loading recent activity...": "កំពុងផ្ទុកសកម្មភាពថ្មីៗ...",
  "No completed lessons yet. Start learning to see your progress.": "មិនទាន់មានមេរៀនបានបញ្ចប់ទេ។ ចាប់ផ្តើមរៀនដើម្បីមើលវឌ្ឍនភាពរបស់អ្នក។",
  "Contact your administrator to set up training modules.": "សូមទាក់ទងអ្នកគ្រប់គ្រងរបស់អ្នកដើម្បីរៀបចំម៉ូឌុលបណ្តុះបណ្តាល។",
  "Loading course...": "កំពុងផ្ទុកវគ្គសិក្សា...",
  "Back to Dashboard": "ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រង",
  "No lessons available in this category": "គ្មានមេរៀនក្នុងប្រភេទនេះទេ",
  "Loading lesson...": "កំពុងផ្ទុកមេរៀន...",
  "Lesson not found": "រកមិនឃើញមេរៀន",
  "Training Course": "វគ្គបណ្តុះបណ្តាល",
  "Test": "តេស្ត",
  "Course Content": "មាតិកាវគ្គសិក្សា",
  "Course Progress": "វឌ្ឍនភាពវគ្គសិក្សា",
  "lessons completed": "មេរៀនបានបញ្ចប់",
  "Back to course": "ត្រឡប់ទៅវគ្គសិក្សា",
  "Mark Complete": "សម្គាល់ថាបញ្ចប់",
  "Mark as Complete": "សម្គាល់ថាបញ្ចប់",
  "Mark lesson complete": "សម្គាល់មេរៀនថាបញ្ចប់",
  "Complete this lesson": "បញ្ចប់មេរៀននេះ",
  "You watched enough of this lesson. Mark it complete to unlock the next lesson.": "អ្នកបានមើលមេរៀននេះគ្រប់គ្រាន់ហើយ។ សម្គាល់ថាបញ្ចប់ ដើម្បីដោះសោមេរៀនបន្ទាប់។",
  "Lesson Details": "ព័ត៌មានមេរៀន",
  "Lesson Progress": "វឌ្ឍនភាពមេរៀន",
  "Instruction Progress": "វឌ្ឍនភាពការណែនាំ",
  "Follow along with the video": "អនុវត្តតាមវីដេអូ",
  "No instructions available for this lesson": "គ្មានការណែនាំសម្រាប់មេរៀននេះទេ",
  "First watch: seek and speed protected": "មើលលើកដំបូង៖ ការរំកិល និងល្បឿនត្រូវបានការពារ",
  "Replay: seek and speed unlocked": "ចាក់ឡើងវិញ៖ អាចរំកិល និងប្តូរល្បឿនបាន",
  "Replay unlocked": "បានដោះសោការចាក់ឡើងវិញ",
  "Finished the lesson?": "បានបញ្ចប់មេរៀនហើយឬនៅ?",
  "Lesson Locked": "មេរៀនជាប់សោ",
  "Please complete previous lessons first.": "សូមបញ្ចប់មេរៀនមុនៗជាមុនសិន។",
  "Go to Available Lesson": "ទៅមេរៀនដែលអាចរៀនបាន",
  "Loading secure player...": "កំពុងផ្ទុកកម្មវិធីចាក់វីដេអូសុវត្ថិភាព...",
  "Video player unavailable": "កម្មវិធីចាក់វីដេអូមិនអាចប្រើបាន",
  "The embedded video player cannot load due to browser or network restrictions.": "កម្មវិធីចាក់វីដេអូដែលបានបង្កប់មិនអាចផ្ទុកបាន ដោយសារការកំណត់របស់កម្មវិធីរុករក ឬបណ្ដាញ។",
  "Open video on YouTube": "បើកវីដេអូនៅលើ YouTube",
  "In this video": "ក្នុងវីដេអូនេះ",
  "Restart": "ចាប់ផ្តើមឡើងវិញ",
  "Restart video": "ចាប់ផ្តើមវីដេអូឡើងវិញ",
  "Toggle fullscreen": "បិទ/បើកពេញអេក្រង់",
  "Hide instructions": "លាក់ការណែនាំ",
  "Show instructions": "បង្ហាញការណែនាំ",
  "Next Step": "ជំហានបន្ទាប់",
  "Playback speed above 1.25x is not allowed. Speed reset to 1x.": "មិនអនុញ្ញាតឱ្យប្រើល្បឿនចាក់លើស 1.25x ទេ។ ល្បឿនត្រូវបានកំណត់ត្រឡប់ទៅ 1x។",
  "Video paused because the tab is no longer active.": "វីដេអូត្រូវបានផ្អាក ព្រោះផ្ទាំងនេះលែងសកម្ម។",
  "Higher playback speeds unlock after you finish watching this lesson.": "ល្បឿនចាក់ខ្ពស់នឹងដោះសោ បន្ទាប់ពីអ្នកមើលមេរៀននេះចប់។",
  "Speeds above 1.25x unlock after completing": "ល្បឿនលើស 1.25x នឹងដោះសោបន្ទាប់ពីបញ្ចប់",
  "Unable to mark this lesson complete. Please try again.": "មិនអាចសម្គាល់មេរៀននេះថាបញ្ចប់បានទេ។ សូមព្យាយាមម្តងទៀត។",
  "Watched": "បានមើល",
  "Watching": "កំពុងមើល",
  "Refresh LMS data": "ធ្វើឱ្យទិន្នន័យ LMS ថ្មី",
  "Loading": "កំពុងផ្ទុក",
  "Not started": "មិនទាន់ចាប់ផ្តើម",
  "Playback speed": "ល្បឿនចាក់វីដេអូ",
  "Play video": "ចាក់វីដេអូ",
  "Pause video": "ផ្អាកវីដេអូ",
  "Step-by-Step Instructions": "ការណែនាំជាជំហានៗ",
  "Markdown formatting supported. Each line becomes a step.": "គាំទ្រទ្រង់ទ្រាយ Markdown។ បន្ទាត់នីមួយៗក្លាយជាជំហានមួយ។",
  "1. First step&#10;2. Second step&#10;3. Third step...": "1. ជំហានទីមួយ&#10;2. ជំហានទីពីរ&#10;3. ជំហានទីបី...",
  "Create users and sync to LMS": "បង្កើតអ្នកប្រើប្រាស់ និងសមកាលកម្មទៅ LMS",
  "Admin Access Required": "ត្រូវការសិទ្ធិអ្នកគ្រប់គ្រង",
  "Default Admin Credentials:": "គណនីអ្នកគ្រប់គ្រងលំនាំដើម៖",
  "No Users Found": "រកមិនឃើញអ្នកប្រើប្រាស់",
  "Create your first user to get started": "បង្កើតអ្នកប្រើប្រាស់ដំបូងដើម្បីចាប់ផ្តើម",
  "Edit Profile": "កែប្រែប្រវត្តិរូប",
  "Create and edit training categories": "បង្កើត និងកែប្រែប្រភេទបណ្តុះបណ្តាល",
  "Training groups and order": "ក្រុមបណ្តុះបណ្តាល និងលំដាប់",
  "Videos, visibility, and category placement": "វីដេអូ ការបង្ហាញ និងការដាក់ក្នុងប្រភេទ",
  "Category Name": "ឈ្មោះប្រភេទ",
  "Add New Category": "បន្ថែមប្រភេទថ្មី",
  "Brief description of this category...": "សេចក្តីពិពណ៌នាសង្ខេបអំពីប្រភេទនេះ...",
  "Brief description of what this category covers": "សេចក្តីពិពណ៌នាសង្ខេបអំពីអ្វីដែលប្រភេទនេះគ្របដណ្ដប់",
  "e.g., Vehicle Basics": "ឧ. មូលដ្ឋានយានយន្ត",
  "e.g., Vehicle Valuation": "ឧ. ការវាយតម្លៃយានយន្ត",
  "e.g., Learn vehicle valuation techniques and pricing strategies...": "ឧ. រៀនបច្ចេកទេសវាយតម្លៃយានយន្ត និងយុទ្ធសាស្ត្រកំណត់តម្លៃ...",
  "Icon": "រូបតំណាង",
  "Select an icon to represent this category": "ជ្រើសរើសរូបតំណាងសម្រាប់តំណាងប្រភេទនេះ",
  "Select a color theme for this category": "ជ្រើសរើសពណ៌សម្រាប់ប្រភេទនេះ",
  "Position in the category list (0 = first)": "ទីតាំងក្នុងបញ្ជីប្រភេទ (0 = ដំបូង)",
  "Category Color": "ពណ៌ប្រភេទ",
  "New category colors rotate automatically.": "ពណ៌ប្រភេទថ្មីនឹងប្តូរតាមលំដាប់ដោយស្វ័យប្រវត្តិ។",
  "Existing category color is preserved.": "ពណ៌ប្រភេទដែលមានស្រាប់នឹងរក្សាទុកដដែល។",
  "Category Order": "លំដាប់ប្រភេទ",
  "New categories are placed at the end of the category list.": "ប្រភេទថ្មីនឹងត្រូវដាក់នៅចុងបញ្ជីប្រភេទ។",
  "Failed to repair category order": "បរាជ័យក្នុងការកែលំដាប់ប្រភេទ",
  "Order": "លំដាប់",
  "No description": "គ្មានសេចក្តីពិពណ៌នា",
  "No Categories Yet": "មិនទាន់មានប្រភេទ",
  "Create your first category to get started": "បង្កើតប្រភេទដំបូងដើម្បីចាប់ផ្តើម",
  "Create and organize training content": "បង្កើត និងរៀបចំមាតិកាបណ្តុះបណ្តាល",
  "Create YouTube lessons, set visibility, and organize training by category.": "បង្កើតមេរៀន YouTube កំណត់ការបង្ហាញ និងរៀបចំតាមប្រភេទបណ្តុះបណ្តាល។",
  "Filter by category:": "តម្រងតាមប្រភេទ៖",
  "Filter lessons by category": "តម្រងមេរៀនតាមប្រភេទ",
  "Lesson Title": "ចំណងជើងមេរៀន",
  "Lesson title": "ចំណងជើងមេរៀន",
  "Lesson description": "សេចក្តីពិពណ៌នាមេរៀន",
  "Lesson category": "ប្រភេទមេរៀន",
  "Lesson Info": "ព័ត៌មានមេរៀន",
  "Name the lesson and place it in the correct training category.": "ដាក់ឈ្មោះមេរៀន និងជ្រើសប្រភេទបណ្តុះបណ្តាលឱ្យត្រឹមត្រូវ។",
  "Add New Lesson": "បន្ថែមមេរៀនថ្មី",
  "New Lesson": "បន្ថែមមេរៀនថ្មី",
  "Edit Lesson": "កែប្រែមេរៀន",
  "Update Lesson": "រក្សាទុកការកែប្រែ",
  "Build the lesson, connect the video, then publish it to the right audience.": "រៀបចំមេរៀន ភ្ជាប់វីដេអូ ហើយផ្សព្វផ្សាយទៅក្រុមអ្នកមើលឱ្យត្រឹមត្រូវ។",
  "Close lesson form": "បិទទម្រង់មេរៀន",
  "Brief description of this lesson...": "សេចក្តីពិពណ៌នាសង្ខេបអំពីមេរៀននេះ...",
  "Brief overview of the lesson content": "ទិដ្ឋភាពសង្ខេបនៃមាតិកាមេរៀន",
  "Brief description of the lesson content...": "សេចក្តីពិពណ៌នាសង្ខេបនៃមាតិកាមេរៀន...",
  "Enter a descriptive title for the lesson": "បញ្ចូលចំណងជើងពិពណ៌នាសម្រាប់មេរៀន",
  "e.g. Introduction to Vehicle Valuation": "ឧ. ការណែនាំអំពីការវាយតម្លៃយានយន្ត",
  "e.g., Introduction to Vehicle Valuation": "ឧ. ការណែនាំអំពីការវាយតម្លៃយានយន្ត",
  "e.g., 8": "ឧ. 8",
  "Lesson duration:": "រយៈពេលមេរៀន៖",
  "Duration": "រយៈពេល",
  "Auto from video": "យកពីវីដេអូដោយស្វ័យប្រវត្តិ",
  "Video preview": "មើលវីដេអូជាមុន",
  "Paste a YouTube link. Duration is detected automatically before saving.": "បិទភ្ជាប់តំណ YouTube។ រយៈពេលនឹងត្រូវរកឃើញដោយស្វ័យប្រវត្តិ មុនពេលរក្សាទុក។",
  "Visible to": "បង្ហាញដល់",
  "Visible To": "បង្ហាញដល់",
  "Access & Publishing": "ការចូលមើល និងការផ្សព្វផ្សាយ",
  "Choose who can see this lesson and where it appears in the category.": "ជ្រើសអ្នកដែលអាចមើលមេរៀននេះ និងកំណត់ទីតាំងបង្ហាញក្នុងប្រភេទ។",
  "Admin can always view every lesson.": "អ្នកគ្រប់គ្រងអាចមើលមេរៀនទាំងអស់ជានិច្ច។",
  "Admin can always view every lesson. Accounting can also view normal Staff lessons.": "អ្នកគ្រប់គ្រងអាចមើលមេរៀនទាំងអស់ជានិច្ច។ គណនេយ្យក៏អាចមើលមេរៀនបុគ្គលិកធម្មតាបានដែរ។",
  "No categories available": "គ្មានប្រភេទ",
  "Create a category first": "សូមបង្កើតប្រភេទជាមុន",
  "Please create a category first before adding lessons.": "សូមបង្កើតប្រភេទជាមុន មុនពេលបន្ថែមមេរៀន។",
  "Order in Category": "លំដាប់ក្នុងប្រភេទ",
  "Position within the category (0 = first)": "ទីតាំងក្នុងប្រភេទ (0 = ដំបូង)",
  "Position in Category": "ទីតាំងក្នុងប្រភេទ",
  "Position in category": "ទីតាំងក្នុងប្រភេទ",
  "Lower numbers appear first.": "លេខតូចនឹងបង្ហាញមុន។",
  "Lesson Order": "លំដាប់មេរៀន",
  "Automatic": "ស្វ័យប្រវត្តិ",
  "New lessons are placed at the end of the selected category.": "មេរៀនថ្មីនឹងត្រូវដាក់នៅចុងប្រភេទដែលបានជ្រើស។",
  "Published": "បានផ្សព្វផ្សាយ",
  "Staff can see this lesson when their role matches visibility.": "បុគ្គលិកអាចមើលមេរៀននេះ ពេលតួនាទីត្រូវនឹងការបង្ហាញ។",
  "Duration (minutes)": "រយៈពេល (នាទី)",
  "YouTube URL": "URL YouTube",
  "Active (visible to staff)": "សកម្ម (បង្ហាញឱ្យបុគ្គលិក)",
  "No Lessons Yet": "មិនទាន់មានមេរៀន",
  "Create your first lesson to get started": "បង្កើតមេរៀនដំបូងដើម្បីចាប់ផ្តើម",
  "No lessons in this category yet": "មិនទាន់មានមេរៀនក្នុងប្រភេទនេះទេ",
  "Video": "វីដេអូ",
  "Valid YouTube URL": "URL YouTube ត្រឹមត្រូវ",
  "YouTube thumbnail preview": "មើលរូបភាពតូច YouTube ជាមុន",
  "All staff": "បុគ្គលិកទាំងអស់",
  "Staff only": "តែបុគ្គលិក",
  "Accounting": "គណនេយ្យ",
  "Accounting only": "តែគណនេយ្យ",
  "Are you sure you want to delete this lesson?": "តើអ្នកប្រាកដជាចង់លុបមេរៀននេះឬទេ?",
  "Waiting for YouTube URL.": "កំពុងរង់ចាំ URL YouTube។",
  "Enter a valid YouTube URL to detect duration.": "បញ្ចូល URL YouTube ត្រឹមត្រូវ ដើម្បីរករយៈពេល។",
  "Reading duration from YouTube...": "កំពុងអានរយៈពេលពី YouTube...",
  "Could not read this video's duration.": "មិនអាចអានរយៈពេលវីដេអូនេះបានទេ។",
  "Could not load YouTube metadata. Check your connection and try again.": "មិនអាចផ្ទុកព័ត៌មាន YouTube បានទេ។ សូមពិនិត្យការតភ្ជាប់ ហើយព្យាយាមម្តងទៀត។",
  "Lesson title is required": "ត្រូវការចំណងជើងមេរៀន",
  "Please select a category": "សូមជ្រើសរើសប្រភេទ",
  "YouTube URL is required": "ត្រូវការ URL YouTube",
  "Please enter a valid YouTube URL": "សូមបញ្ចូល URL YouTube ត្រឹមត្រូវ",
  "Please wait for the video duration to load": "សូមរង់ចាំឱ្យរយៈពេលវីដេអូផ្ទុករួច",
  "Video duration must load automatically before saving": "រយៈពេលវីដេអូត្រូវផ្ទុកដោយស្វ័យប្រវត្តិ មុនពេលរក្សាទុក",
  "Select at least one role for lesson visibility": "សូមជ្រើសយ៉ាងហោចណាស់មួយតួនាទីសម្រាប់ការបង្ហាញមេរៀន",
  "Branch Location": "ទីតាំងសាខា",
  "Phone Number": "លេខទូរស័ព្ទ",
  "Optional: Staff member's email address": "ជាជម្រើស៖ អាសយដ្ឋានអ៊ីមែលរបស់បុគ្គលិក",
  "Optional: Which branch they work at": "ជាជម្រើស៖ សាខាដែលពួកគេធ្វើការ",
  "Optional: Contact phone number": "ជាជម្រើស៖ លេខទូរស័ព្ទទំនាក់ទំនង",
  "Enter the staff member's full name": "បញ្ចូលឈ្មោះពេញរបស់បុគ្គលិក",
  "Minimum 8 characters": "យ៉ាងហោចណាស់ 8 តួអក្សរ",
  "e.g. John Doe": "ឧ. John Doe",
  "e.g. user@example.com": "ឧ. user@example.com",
  "e.g. employee01": "ឧ. employee01",
  "e.g. +1 234 567 890": "ឧ. +1 234 567 890",
  "hem chinit": "ហែម ជិនិត",
  "hem.chinit@example.com": "hem.chinit@example.com",
  "Phnom Penh": "ភ្នំពេញ",

  // Loan management
  "Loan management": "ការគ្រប់គ្រងប្រាក់កម្ចី",
  "Portfolio overview": "ទិដ្ឋភាពទូទៅនៃផលប័ត្រ",
  "Monitor lending performance and take action from one workspace.": "តាមដានប្រសិទ្ធភាពការផ្តល់ប្រាក់កម្ចី និងអនុវត្តសកម្មភាពពីកន្លែងតែមួយ។",
  "Loan portfolio": "ផលប័ត្រប្រាក់កម្ចី",
  "Loans": "ប្រាក់កម្ចី",
  "New loan": "បង្កើតប្រាក់កម្ចីថ្មី",
  "Save loan": "រក្សាទុកប្រាក់កម្ចី",
  "Create a loan": "បង្កើតប្រាក់កម្ចី",
  "Edit loan": "កែប្រែប្រាក់កម្ចី",
  "Create Loan": "បង្កើតប្រាក់កម្ចី",
  "Search, filter, create, and manage every loan in one place.": "ស្វែងរក ត្រង បង្កើត និងគ្រប់គ្រងប្រាក់កម្ចីទាំងអស់ពីកន្លែងតែមួយ។",
  "Find a loan": "ស្វែងរកប្រាក់កម្ចី",
  "Use a keyword or narrow results by status and loan type.": "ប្រើពាក្យគន្លឹះ ឬបង្រួមលទ្ធផលតាមស្ថានភាព និងប្រភេទប្រាក់កម្ចី។",
  "Search by loan number or customer": "ស្វែងរកតាមលេខប្រាក់កម្ចី ឬអតិថិជន",
  "All statuses": "ស្ថានភាពទាំងអស់",
  "All loan types": "ប្រភេទប្រាក់កម្ចីទាំងអស់",
  "No grouping": "មិនដាក់ជាក្រុម",
  "Group by status": "ដាក់ជាក្រុមតាមស្ថានភាព",
  "Group by loan type": "ដាក់ជាក្រុមតាមប្រភេទប្រាក់កម្ចី",
  "Back to summary": "ត្រឡប់ទៅទិដ្ឋភាពសង្ខេប",
  "Import": "នាំចូល",
  "Export": "នាំចេញ",
  "Number": "លេខ",
  "Customer": "អតិថិជន",
  "Loan Amount": "ចំនួនប្រាក់កម្ចី",
  "Loan Amount KHR": "ចំនួនប្រាក់កម្ចី (រៀល)",
  "Loan Term": "រយៈពេលប្រាក់កម្ចី",
  "Loan Range": "ប្រភេទប្រាក់កម្ចី",
  "Loan Type": "ប្រភេទប្រាក់កម្ចី",
  "Transaction No": "លេខប្រតិបត្តិការ",
  "Contract Date": "កាលបរិច្ឆេទកិច្ចសន្យា",
  "Contract End Date": "កាលបរិច្ឆេទបញ្ចប់កិច្ចសន្យា",
  "First Pay Date": "កាលបរិច្ឆេទបង់ដំបូង",
  "First Amount C-TR": "ចំនួនទឹកប្រាក់ដំបូង C-TR",
  "Formula": "រូបមន្ត",
  "Rate (%)": "អត្រា (%)",
  "Rate KHR": "អត្រា (រៀល)",
  "Annually": "ប្រចាំឆ្នាំ",
  "Months": "ខែ",
  "Payback": "ការសងប្រាក់",
  "Monthly": "ប្រចាំខែ",
  "Weekly": "ប្រចាំសប្តាហ៍",
  "Daily": "ប្រចាំថ្ងៃ",
  "Portfolio": "ផលប័ត្រ",
  "Disbursements": "ការបើកប្រាក់",
  "Repayments": "ការសងប្រាក់",
  "Outstanding": "សមតុល្យនៅសល់",
  "ARREARS": "បំណុលហួសកំណត់",
  "Collateral position": "ស្ថានភាពទ្រព្យបញ្ចាំ",
  "Security held across the active portfolio.": "ទ្រព្យបញ្ចាំសម្រាប់ផលប័ត្រដែលកំពុងសកម្ម។",
  "Collateral records": "កំណត់ត្រាទ្រព្យបញ្ចាំ",
  "Declared value": "តម្លៃដែលបានប្រកាស",
  "Market value": "តម្លៃទីផ្សារ",
  "View all loans": "មើលប្រាក់កម្ចីទាំងអស់",
  "Revenue performance": "ប្រសិទ្ធភាពចំណូល",
  "Monthly repayment trend for the selected period.": "និន្នាការសងប្រាក់ប្រចាំខែសម្រាប់រយៈពេលដែលបានជ្រើសរើស។",
  "Recent monthly trend": "និន្នាការប្រចាំខែថ្មីៗ",
  "No revenue data yet.": "មិនទាន់មានទិន្នន័យចំណូលទេ។",
  "All Time": "គ្រប់ពេលវេលា",
  "Today": "ថ្ងៃនេះ",
  "This Week": "សប្តាហ៍នេះ",
  "This Month": "ខែនេះ",
  "This Quarter": "ត្រីមាសនេះ",
  "This Year": "ឆ្នាំនេះ",
  "Yesterday": "ម្សិលមិញ",
  "Last Week": "សប្តាហ៍មុន",
  "Last Month": "ខែមុន",
  "Last Quarter": "ត្រីមាសមុន",
  "Last Year": "ឆ្នាំមុន",
  "Custom Filter": "តម្រងផ្ទាល់ខ្លួន",
  "Date Filter": "តម្រងកាលបរិច្ឆេទ",
  "Apply": "អនុវត្ត",
  "Discard": "បោះបង់",
  "Draft": "ព្រាង",
  "Waiting": "កំពុងរង់ចាំ",
  "Approved": "បានអនុម័ត",
  "Due Soon": "ជិតដល់កំណត់",
  "Overdue": "ហួសកំណត់",
  "Closed": "បានបិទ",
  "Rejected": "បានបដិសេធ",
  "Defaulted": "មិនបានសង",
  "Schedules": "កាលវិភាគសងប្រាក់",
  "Loan Informations": "ព័ត៌មានប្រាក់កម្ចី",
  "Collaterals": "ទ្រព្យបញ្ចាំ",
  "Approvals": "ការអនុម័ត",
  "Contacts": "ទំនាក់ទំនង",
  "Other Info": "ព័ត៌មានផ្សេងទៀត",
  "No schedule items yet.": "មិនទាន់មានកាលវិភាគសងប្រាក់ទេ។",
  "No loans found yet.": "មិនទាន់មានប្រាក់កម្ចីទេ។",
  "Loading loans...": "កំពុងផ្ទុកប្រាក់កម្ចី...",
  "Deleting…": "កំពុងលុប…",
  "Loan saved successfully.": "បានរក្សាទុកប្រាក់កម្ចីដោយជោគជ័យ។",
  "Loan deleted successfully.": "បានលុបប្រាក់កម្ចីដោយជោគជ័យ។",
  "Delete this loan?": "លុបប្រាក់កម្ចីនេះឬ?",

  // Shared UI
  "Only administrators can manage roles.": "មានតែអ្នកគ្រប់គ្រងប៉ុណ្ណោះអាចគ្រប់គ្រងតួនាទីបាន។",
  "Role Management": "ការគ្រប់គ្រងតួនាទី",
  "vs last month": "ធៀបនឹងខែមុន",
  "Failed to load image": "បរាជ័យក្នុងការផ្ទុករូបភាព",
  "Close alert": "បិទការជូនដំណឹង",
  "Close notification": "បិទការជូនដំណឹង",
  "Close staff details": "បិទព័ត៌មានលម្អិតបុគ្គលិក",
  "Clear": "សម្អាត",
  "Clear search": "សម្អាតការស្វែងរក",
  "Exporting...": "កំពុងនាំចេញ...",
  "Deleting": "កំពុងលុប",
  "Own": "ផ្ទាល់ខ្លួន",
  "Did you mean?": "តើអ្នកចង់សំដៅដល់នេះឬ?",
  "Very Similar": "ស្រដៀងខ្លាំង",
  "Similar": "ស្រដៀង",
  "Maybe": "ប្រហែលជា",
  "Possible match": "អាចត្រូវគ្នា",
  "Click a suggestion to search for that vehicle instead.": "ចុចលើសំណើដើម្បីស្វែងរកយានយន្តនោះជំនួស។",
  "Loading...": "កំពុងផ្ទុក...",
  "Processing...": "កំពុងដំណើរការ...",
  "Error": "កំហុស",
  "Success": "ជោគជ័យ",
  "Cancel": "បោះបង់",
  "Save": "រក្សាទុក",
  "Delete": "លុប",
  "Edit": "កែប្រែ",
  "View": "មើល",
  "Next": "បន្ទាប់",
  "Previous": "មុន",
  "Search": "ស្វែងរក",
  "Refresh": "ធ្វើឱ្យថ្មី",
  "Retry": "ព្យាយាមម្តងទៀត",
  "Change password": "ប្តូរពាក្យសម្ងាត់",
  "Current Password": "ពាក្យសម្ងាត់បច្ចុប្បន្ន",
  "New Password": "ពាក្យសម្ងាត់ថ្មី",
  "Confirm New Password": "បញ្ជាក់ពាក្យសម្ងាត់ថ្មី",
  "Confirm new password": "បញ្ជាក់ពាក្យសម្ងាត់ថ្មី",
  "Enter current password": "បញ្ចូលពាក្យសម្ងាត់បច្ចុប្បន្ន",
  "Enter new password (min 8 characters)": "បញ្ចូលពាក្យសម្ងាត់ថ្មី (យ៉ាងហោចណាស់ 8 តួអក្សរ)",
  "Description": "សេចក្តីពិពណ៌នា",
  "Location": "ទីតាំង",
  "Quantity": "បរិមាណ",
  "Name": "ឈ្មោះ",
  "Username": "ឈ្មោះអ្នកប្រើ",
  "Password": "ពាក្យសម្ងាត់",
  "Confirm Password": "បញ្ជាក់ពាក្យសម្ងាត់",
  "Email": "អ៊ីមែល",
  "Phone": "ទូរស័ព្ទ",
  "Role": "តួនាទី",
  "Admin": "អ្នកគ្រប់គ្រង",
  "Staff": "បុគ្គលិក",
  "Full Name": "ឈ្មោះពេញ",
  "New": "ថ្មី",
  "Used": "បានប្រើ",
  "Award": "រង្វាន់",
  "Book": "សៀវភៅ",
  "BookOpen": "បើកសៀវភៅ",
  "Calculator": "ម៉ាស៊ីនគិតលេខ",
  "Document": "ឯកសារ",
  "FileText": "អត្ថបទឯកសារ",
  "HelpCircle": "ជំនួយ",
  "Monitor": "ម៉ូនីទ័រ",
  "Shield": "ខែល",
  "Blue": "ខៀវ",
  "Cyan": "ខៀវស្រាល",
  "Emerald": "បៃតងមរកត",
  "Indigo": "ខៀវជាំ",
  "Orange": "ទឹកក្រូច",
  "Pink": "ផ្កាឈូក",
  "Purple": "ស្វាយ",
  "Red": "ក្រហម",
  "Amber": "លឿងទុំ",
  "Cambodia Flag": "ទង់ជាតិកម្ពុជា",
  "Create Role": "បង្កើតតួនាទី",
  "Delete role": "លុបតួនាទី",
  "Brief description of this role's responsibilities": "សេចក្តីពិពណ៌នាសង្ខេបអំពីការទទួលខុសត្រូវរបស់តួនាទីនេះ",
  "e.g., Manager, Supervisor, Viewer": "ឧ. អ្នកគ្រប់គ្រង, អ្នកត្រួតពិនិត្យ, អ្នកមើល",

  // Coverage sweep for remaining visible labels, help text, and dialogs
  "40% Price": "តម្លៃ 40%",
  "70% Price": "តម្លៃ 70%",
  "New Price": "តម្លៃថ្មី",
  "New Price *": "តម្លៃថ្មី *",
  "Max Year": "ឆ្នាំអតិបរមា",
  "Min Year": "ឆ្នាំអប្បបរមា",
  "Notes": "កំណត់សម្គាល់",
  "Pricing Information": "ព័ត៌មានតម្លៃ",
  "Ready": "រួចរាល់",
  "Ready:": "រួចរាល់៖",
  "Ready to complete": "រួចរាល់សម្រាប់បញ្ចប់",
  "Refreshing...": "កំពុងធ្វើឱ្យថ្មី...",
  "Reload": "ផ្ទុកឡើងវិញ",
  "Reload Page": "ផ្ទុកទំព័រឡើងវិញ",
  "Repeat password": "បញ្ចូលពាក្យសម្ងាត់ម្តងទៀត",
  "Retry loading the original image": "ព្យាយាមផ្ទុករូបភាពដើមម្តងទៀត",
  "Search all fields: brand, model, plate, color, year, price, condition...": "ស្វែងរកគ្រប់វាល៖ ម៉ាក ម៉ូដែល ស្លាកលេខ ពណ៌ ឆ្នាំ តម្លៃ ស្ថានភាព...",
  "Search by name, email, branch, or role...": "ស្វែងរកតាមឈ្មោះ អ៊ីមែល សាខា ឬតួនាទី...",
  "Search categories... (Cmd/Ctrl+K)": "ស្វែងរកប្រភេទ... (Cmd/Ctrl+K)",
  "Search name, code, location...": "ស្វែងរកឈ្មោះ កូដ ទីតាំង...",
  "Search users by name, email, or phone...": "ស្វែងរកអ្នកប្រើប្រាស់តាមឈ្មោះ អ៊ីមែល ឬទូរស័ព្ទ...",
  "Search vehicles (Brand, Model, Category, Plate...)...": "ស្វែងរកយានយន្ត (ម៉ាក ម៉ូដែល ប្រភេទ ស្លាកលេខ...)...",
  "Select a category...": "ជ្រើសរើសប្រភេទ...",
  "Select All": "ជ្រើសរើសទាំងអស់",
  "Select color": "ជ្រើសរើសពណ៌",
  "Select or type a type...": "ជ្រើសរើស ឬវាយប្រភេទ...",
  "Select tax type": "ជ្រើសរើសប្រភេទពន្ធ",
  "Select the staff member's role": "ជ្រើសរើសតួនាទីរបស់បុគ្គលិក",
  "Select the training category": "ជ្រើសរើសប្រភេទបណ្តុះបណ្តាល",
  "Select theme": "ជ្រើសរើសរូបរាង",
  "Send an SMS asset to another user, with an optional photo and receiver note.": "ផ្ញើទ្រព្យសម្បត្តិ SMS ទៅអ្នកប្រើផ្សេង ជាមួយរូបថត និងកំណត់សម្គាល់អ្នកទទួលជាជម្រើស។",
  "Something went wrong in this section. You can try again or navigate elsewhere.": "មានអ្វីមួយខុសក្នុងផ្នែកនេះ។ អ្នកអាចព្យាយាមម្តងទៀត ឬទៅកន្លែងផ្សេង។",
  "Standard": "ស្តង់ដារ",
  "Start Learning": "ចាប់ផ្តើមរៀន",
  "Step Content": "មាតិកាជំហាន",
  "Supports standard, unlisted, and embed URLs": "គាំទ្រ URL ស្តង់ដារ មិនបង្ហាញសាធារណៈ និងបង្កប់",
  "Synced": "បានសមកាលកម្ម",
  "Syncing...": "កំពុងសមកាលកម្ម...",
  "Tax": "ពន្ធ",
  "Technical Specifications": "លក្ខណៈបច្ចេកទេស",
  "Theme mode": "របៀបរូបរាង",
  "This action cannot be undone": "សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ",
  "Transfer proof": "ភស្តុតាងផ្ទេរ",
  "Trending": "កំពុងពេញនិយម",
  "TrendingUp": "និន្នាការកើនឡើង",
  "Type to search...": "វាយដើម្បីស្វែងរក...",
  "UK Flag": "ទង់ជាតិអង់គ្លេស",
  "Updated:": "បានធ្វើបច្ចុប្បន្នភាព៖",
  "Upload one or more clear vehicle photos. The first photo is used in lists.": "ផ្ទុករូបថតយានយន្តច្បាស់មួយ ឬច្រើន។ រូបទីមួយនឹងត្រូវប្រើក្នុងបញ្ជី។",
  "Video ID:": "លេខសម្គាល់វីដេអូ៖",
  "Video progress": "វឌ្ឍនភាពវីដេអូ",
  "You cannot delete your own account": "អ្នកមិនអាចលុបគណនីខ្លួនឯងបានទេ",
  "You cannot delete your own LMS staff record": "អ្នកមិនអាចលុបកំណត់ត្រាបុគ្គលិក LMS ផ្ទាល់ខ្លួនបានទេ",
  "Delete LMS staff record": "លុបកំណត់ត្រាបុគ្គលិក LMS",
  "Remove transfer image": "យករូបភាពផ្ទេរចេញ",
  "Failed to refresh data": "បរាជ័យក្នុងការធ្វើឱ្យទិន្នន័យថ្មី",
  "Invalid image format. Please upload a valid image file.": "ទ្រង់ទ្រាយរូបភាពមិនត្រឹមត្រូវ។ សូមផ្ទុកឯកសាររូបភាពត្រឹមត្រូវ។",
  "Quantity must be positive": "បរិមាណត្រូវតែជាចំនួនវិជ្ជមាន",
  "All Staff": "បុគ្គលិកទាំងអស់",
  "All Selected": "បានជ្រើសរើសទាំងអស់",
  "All Cleared": "បានសម្អាតទាំងអស់",
  "All car types": "ប្រភេទរថយន្តទាំងអស់",
  "All motorcycle types": "ប្រភេទម៉ូតូទាំងអស់",
  "All tuk tuk types": "ប្រភេទកង់បីទាំងអស់",
  "All-time": "គ្រប់ពេល",
  "All-time Totals": "សរុបគ្រប់ពេល",
  "Apply Filters": "អនុវត្តតម្រង",
  "Advanced Filters": "តម្រងកម្រិតខ្ពស់",
  "Filtered": "បានតម្រង",
  "Filtered view": "ទិដ្ឋភាពបានតម្រង",
  "Grouped by": "ដាក់ក្រុមតាម",
  "Sorted by": "តម្រៀបតាម",
  "Minimal": "តិចតួច",
  "Viewer": "អ្នកមើល",
  "price40": "តម្លៃ 40%",
  "price70": "តម្លៃ 70%",
  "Your VMS data will appear here as soon as it finishes loading.": "ទិន្នន័យ VMS របស់អ្នកនឹងបង្ហាញទីនេះភ្លាមៗបន្ទាប់ពីផ្ទុករួច។",
  "Audit": "សវនកម្ម",
  "Audit Logs": "កំណត់ហេតុសវនកម្ម",
  "Back to Stock": "ត្រឡប់ទៅស្តុក",
  "Branch": "សាខា",
  "Brand / Model": "ម៉ាក / ម៉ូដែល",
  "Buses": "រថយន្តក្រុង",
  "Cambodia Market Price": "តម្លៃទីផ្សារកម្ពុជា",
  "Category name is required": "ត្រូវការឈ្មោះប្រភេទ",
  "Certificate": "វិញ្ញាបនបត្រ",
  "Change Photo": "ប្តូររូបថត",
  "Changes will sync with LMS staff automatically": "ការផ្លាស់ប្តូរនឹងសមកាលកម្មជាមួយបុគ្គលិក LMS ដោយស្វ័យប្រវត្តិ",
  "Chart failed to load": "គំនូសតាងផ្ទុកបរាជ័យ",
  "Cleaned Vehicles": "យានយន្តដែលបានសម្អាត",
  "Click error to replay": "ចុចកំហុសដើម្បីចាក់ឡើងវិញ",
  "Click to upload or drag & drop": "ចុចដើម្បីផ្ទុកឡើង ឬអូសនិងទម្លាក់",
  "Click to view": "ចុចដើម្បីមើល",
  "Completed Lessons": "មេរៀនដែលបានបញ្ចប់",
  "Confirm Logout": "បញ្ជាក់ការចាកចេញ",
  "Confirm Permanent Deletion": "បញ្ជាក់ការលុបជាអចិន្ត្រៃយ៍",
  "Copied": "បានចម្លង",
  "Copy Error Details": "ចម្លងព័ត៌មានលម្អិតកំហុស",
  "Copy link": "ចម្លងតំណ",
  "Create a staff member for training tracking": "បង្កើតបុគ្គលិកសម្រាប់តាមដានការបណ្តុះបណ្តាល",
  "Create a training category for organizing lessons": "បង្កើតប្រភេទបណ្តុះបណ្តាលសម្រាប់រៀបចំមេរៀន",
  "Create a training lesson with YouTube video": "បង្កើតមេរៀនបណ្តុះបណ្តាលជាមួយវីដេអូ YouTube",
  "Create and manage custom roles with granular permissions": "បង្កើត និងគ្រប់គ្រងតួនាទីផ្ទាល់ខ្លួនជាមួយសិទ្ធិលម្អិត",
  "Create Lesson": "បង្កើតមេរៀន",
  "Create New Role": "បង្កើតតួនាទីថ្មី",
  "Create Transfer + Stock": "បង្កើតការផ្ទេរ + ស្តុក",
  "Create User": "បង្កើតអ្នកប្រើប្រាស់",
  "Created by": "បង្កើតដោយ",
  "Critical Error": "កំហុសធ្ងន់ធ្ងរ",
  "Current Status": "ស្ថានភាពបច្ចុប្បន្ន",
  "Custom Role": "តួនាទីផ្ទាល់ខ្លួន",
  "Danger Zone": "តំបន់គ្រោះថ្នាក់",
  "Dark": "ងងឹត",
  "Light": "ភ្លឺ",
  "Date": "កាលបរិច្ឆេទ",
  "Date Range": "ចន្លោះកាលបរិច្ឆេទ",
  "Time": "ពេលវេលា",
  "asc": "ឡើង",
  "desc": "ចុះ",
  "Delete user": "លុបអ្នកប្រើប្រាស់",
  "Development Mode - Error Details:": "របៀបអភិវឌ្ឍន៍ - ព័ត៌មានលម្អិតកំហុស៖",
  "Dismiss": "បិទ",
  "Drop an image file or a direct image URL.": "ទម្លាក់ឯកសាររូបភាព ឬ URL រូបភាពផ្ទាល់។",
  "Enter a descriptive name for the category": "បញ្ចូលឈ្មោះពិពណ៌នាសម្រាប់ប្រភេទ",
  "Enter the staff member&apos;s full name": "បញ្ចូលឈ្មោះពេញរបស់បុគ្គលិក",
  "Error details copied! Paste in message to developer.": "បានចម្លងព័ត៌មានលម្អិតកំហុស! បិទភ្ជាប់ក្នុងសារទៅអ្នកអភិវឌ្ឍន៍។",
  "© 2024 Emerald Cash": "© 2024 អេមើរ៉ល ឃែស",
  "© 2024 Emerald Cash - All rights reserved": "© 2024 អេមើរ៉ល ឃែស - រក្សាសិទ្ធិគ្រប់យ៉ាង",
  "© 2025 Emerald Cash": "© 2025 អេមើរ៉ល ឃែស",
  "© 2024 Emerald Cash VMS - All rights reserved": "© 2024 ប្រព័ន្ធ អេមើរ៉ល ឃែស - រក្សាសិទ្ធិគ្រប់យ៉ាង",
  "© 2024 Emerald Cash VMS - រក្សាសិទ្ធិគ្រប់យ៉ាង": "© 2024 ប្រព័ន្ធ អេមើរ៉ល ឃែស - រក្សាសិទ្ធិគ្រប់យ៉ាង",
  "© 2024 Emerald Cash Systems - All rights reserved": "© 2024 ប្រព័ន្ធ អេមើរ៉ល ឃែស - រក្សាសិទ្ធិគ្រប់យ៉ាង",
};

const normalizedEnglishToKhmer = createNormalizedMap({
  ...Object.fromEntries(
    Object.keys(translations.en).map((key) => [translations.en[key], translations.km[key]])
  ),
  ...extraEnglishToKhmer,
});
const normalizedEnglishToKhmerCaseless = createCaseInsensitiveMap(normalizedEnglishToKhmer);

const normalizedKhmerToEnglish = createNormalizedMap(
  Object.fromEntries(
    Object.entries(normalizedEnglishToKhmer).map(([english, khmer]) => [khmer, english])
  )
);

function normalizePhrase(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function createNormalizedMap(entries: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(entries)
      .filter(([source, target]) => source.trim() && target.trim())
      .map(([source, target]) => [normalizePhrase(source), target])
  );
}

function createCaseInsensitiveMap(entries: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(entries).map(([source, target]) => [source.toLocaleLowerCase("en-US"), target])
  );
}

function lookupTranslation(core: string, lang: Language): string | null {
  if (lang === "km") {
    return normalizedEnglishToKhmer[core] ?? normalizedEnglishToKhmerCaseless[core.toLocaleLowerCase("en-US")] ?? null;
  }

  return normalizedKhmerToEnglish[core] ?? null;
}

function preserveOuterWhitespace(source: string, translated: string): string {
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

function translateDynamicPhrase(core: string, lang: Language): string | null {
  if (lang === "km") {
    const decoratedMatch = core.match(/^([^\p{L}\p{N}"']+)\s*(.+)$/u);
    if (decoratedMatch) {
      const translatedRest = translatePhrase(decoratedMatch[2], lang);
      if (translatedRest !== decoratedMatch[2]) return `${decoratedMatch[1]} ${translatedRest}`.replace(/\s+/g, " ").trim();
    }

    const slashParts = core.split(/\s+\/\s+/);
    if (slashParts.length > 1) {
      const translatedParts = slashParts.map((part) => translatePhrase(part, lang));
      if (translatedParts.some((part, index) => part !== slashParts[index])) return translatedParts.join(" / ");
    }

    const requiredMatch = core.match(/^(.+?)\s+\*$/);
    if (requiredMatch) {
      const translatedBase = lookupTranslation(requiredMatch[1], lang);
      if (translatedBase) return `${translatedBase} *`;
    }

    const quotedMatch = core.match(/^["“](.+)["”]$/);
    if (quotedMatch) {
      const translatedBase = translatePhrase(quotedMatch[1], lang);
      if (translatedBase !== quotedMatch[1]) return `"${translatedBase}"`;
    }

    const autoMatch = core.match(/^(.+?)\s+\(Auto\)$/i);
    if (autoMatch) {
      const translatedBase = translatePhrase(autoMatch[1], lang);
      if (translatedBase !== autoMatch[1]) return `${translatedBase} (ស្វ័យប្រវត្តិ)`;
    }

    const optionalMatch = core.match(/^(.+?)\s+\((optional)\)$/i);
    if (optionalMatch) {
      const translatedBase = translatePhrase(optionalMatch[1], lang);
      if (translatedBase !== optionalMatch[1]) return `${translatedBase} (មិនបាច់)`;
    }

    const loadingMatch = core.match(/^Loading\s+(.+?)(\.\.\.)?$/i);
    if (loadingMatch) {
      return `កំពុងផ្ទុក${translatePhrase(loadingMatch[1], lang)}${loadingMatch[2] ?? ""}`;
    }

    const failedToLoadMatch = core.match(/^Failed to load\s+(.+)$/i);
    if (failedToLoadMatch) {
      return `បរាជ័យក្នុងការផ្ទុក${translatePhrase(failedToLoadMatch[1], lang)}`;
    }

    const failedToFetchMatch = core.match(/^Failed to fetch\s+(.+)$/i);
    if (failedToFetchMatch) {
      return `បរាជ័យក្នុងការទាញយក${translatePhrase(failedToFetchMatch[1], lang)}`;
    }

    const notFoundMatch = core.match(/^(.+?)\s+not found$/i);
    if (notFoundMatch) return `រកមិនឃើញ${translatePhrase(notFoundMatch[1], lang)}`;

    const noAvailableMatch = core.match(/^No\s+(.+?)\s+available$/i);
    if (noAvailableMatch) return `គ្មាន${translatePhrase(noAvailableMatch[1], lang)}ទេ`;

    const noFoundMatch = core.match(/^No\s+(.+?)\s+found$/i);
    if (noFoundMatch) return `រកមិនឃើញ${translatePhrase(noFoundMatch[1], lang)}`;

    const noYetMatch = core.match(/^No\s+(.+?)\s+yet$/i);
    if (noYetMatch) return `មិនទាន់មាន${translatePhrase(noYetMatch[1], lang)}`;

    const verbObjectMatch = core.match(/^(Add|Edit|Delete|Create|Manage|Select|Enter|Open|Close|Remove|Upload|Filter by|Search|Back to|Go to|Clear|Save)\s+(.+?)$/i);
    if (verbObjectMatch) {
      const translatedVerb = lookupTranslation(verbObjectMatch[1], lang);
      const translatedObject = translatePhrase(verbObjectMatch[2], lang);
      if (translatedVerb && translatedObject !== verbObjectMatch[2]) return `${translatedVerb} ${translatedObject}`;
    }

    const egMatch = core.match(/^(e\.g\.|Example:)\s+(.+)$/i);
    if (egMatch) return `${egMatch[1].toLowerCase().startsWith("example") ? "ឧទាហរណ៍៖" : "ឧ."} ${egMatch[2]}`;

    const percentCompleteMatch = core.match(/^%\s+(complete|latest)$/i);
    if (percentCompleteMatch) return percentCompleteMatch[1].toLowerCase() === "complete" ? "% បានបញ្ចប់" : "% ចុងក្រោយ";

    const numericCompletedMatch = core.match(/^(\d+)%\s+completed$/i);
    if (numericCompletedMatch) return `${numericCompletedMatch[1]}% បានបញ្ចប់`;

    const completeUnlocksMatch = core.match(/^Complete unlocks at\s+(\d+)%$/i);
    if (completeUnlocksMatch) return `ការបញ្ចប់នឹងដោះសោនៅ ${completeUnlocksMatch[1]}%`;

    const watchToUnlockMatch = core.match(/^Watch\s+(\d+)%\s+to unlock completion\.?$/i);
    if (watchToUnlockMatch) return `មើល ${watchToUnlockMatch[1]}% ដើម្បីដោះសោការបញ្ចប់`;

    const watchMoreToUnlockMatch = core.match(/^Watch\s+(\d+)%\s+more\s+to unlock completion\.?$/i);
    if (watchMoreToUnlockMatch) return `មើលបន្ថែម ${watchMoreToUnlockMatch[1]}% ដើម្បីដោះសោការបញ្ចប់`;

    const watchedMoreToUnlockMatch = core.match(/^Watched\s+(\d+)%\.\s+Watch\s+(\d+)%\s+more\s+to unlock completion\.?$/i);
    if (watchedMoreToUnlockMatch) return `បានមើល ${watchedMoreToUnlockMatch[1]}%។ មើលបន្ថែម ${watchedMoreToUnlockMatch[2]}% ដើម្បីដោះសោការបញ្ចប់។`;

    const watchAtLeastMatch = core.match(/^Watch at least\s+(\d+)%\s+to unlock completion\.?$/i);
    if (watchAtLeastMatch) return `មើលយ៉ាងហោចណាស់ ${watchAtLeastMatch[1]}% ដើម្បីដោះសោការបញ្ចប់។`;

    const pleaseWatchAtLeastMatch = core.match(/^Please watch at least\s+(\d+)%\s+before completing this lesson\.?$/i);
    if (pleaseWatchAtLeastMatch) return `សូមមើលយ៉ាងហោចណាស់ ${pleaseWatchAtLeastMatch[1]}% មុនពេលបញ្ចប់មេរៀននេះ។`;

    const watchedPercentMatch = core.match(/^(.+?)\s+•\s+(\d+)%\s+watched$/i);
    if (watchedPercentMatch) {
      return `${translatePhrase(watchedPercentMatch[1], lang)} • បានមើល ${watchedPercentMatch[2]}%`;
    }

    const standaloneWatchedPercentMatch = core.match(/^(\d+)%\s+watched$/i);
    if (standaloneWatchedPercentMatch) return `បានមើល ${standaloneWatchedPercentMatch[1]}%`;

    const watchedLabelPercentMatch = core.match(/^Watched\s+(\d+)%$/i);
    if (watchedLabelPercentMatch) return `បានមើល ${watchedLabelPercentMatch[1]}%`;

    const percentCompleteLowerMatch = core.match(/^(\d+)%\s+complete$/i);
    if (percentCompleteLowerMatch) return `${percentCompleteLowerMatch[1]}% បានបញ្ចប់`;

    const durationMatch = core.match(/^(.+?)\s+•\s+(\d+)\s+min$/i);
    if (durationMatch) {
      return `${translatePhrase(durationMatch[1], lang)} • ${durationMatch[2]} នាទី`;
    }

    const minutesMatch = core.match(/^(\d+)\s+(min|minutes?)$/i);
    if (minutesMatch) return `${minutesMatch[1]} នាទី`;

    const detectedYoutubeDurationMatch = core.match(/^Detected\s+(.+?)\s+from YouTube\.?$/i);
    if (detectedYoutubeDurationMatch) return `បានរកឃើញរយៈពេល ${translatePhrase(detectedYoutubeDurationMatch[1], lang)} ពី YouTube។`;

    const activeCountMatch = core.match(/^(\d+)\s+active$/i);
    if (activeCountMatch) return `${activeCountMatch[1]} សកម្ម`;

    const availableCountMatch = core.match(/^(\d+)\s+available$/i);
    if (availableCountMatch) return `${availableCountMatch[1]} អាចប្រើបាន`;

    const thisWeekMatch = core.match(/^([+-]?\d+)\s+this week$/i);
    if (thisWeekMatch) return `${thisWeekMatch[1]} សប្តាហ៍នេះ`;

    const notSyncedCountMatch = core.match(/^(\d+)\s+not synced$/i);
    if (notSyncedCountMatch) return `${notSyncedCountMatch[1]} មិនទាន់សមកាលកម្ម`;

    const syncedStaffMatch = core.match(/^(\d+)\s+synced staff$/i);
    if (syncedStaffMatch) return `${syncedStaffMatch[1]} បុគ្គលិកបានសមកាលកម្ម`;

    const needFollowUpCountMatch = core.match(/^(\d+)\s+need follow-up$/i);
    if (needFollowUpCountMatch) return `${needFollowUpCountMatch[1]} ត្រូវតាមដាន`;

    const showingStaffAccountsMatch = core.match(/^Showing\s+(\d+)\s+of\s+(\d+)\s+staff accounts$/i);
    if (showingStaffAccountsMatch) return `បង្ហាញ ${showingStaffAccountsMatch[1]} នៃ ${showingStaffAccountsMatch[2]} គណនីបុគ្គលិក`;

    const syncStaffToLmsMatch = core.match(/^Sync Staff to LMS\s+\((\d+)\)$/i);
    if (syncStaffToLmsMatch) return `សមកាលកម្មបុគ្គលិកទៅ LMS (${syncStaffToLmsMatch[1]})`;

    const lessonsCompletedCountMatch = core.match(/^(\d+)\s+of\s+(\d+)\s+lessons completed$/i);
    if (lessonsCompletedCountMatch) return `${lessonsCompletedCountMatch[1]} នៃ ${lessonsCompletedCountMatch[2]} មេរៀនបានបញ្ចប់`;

    const lessonProgressMatch = core.match(/^(\d+)\s+of\s+(\d+)\s+(lessons?|staff-lessons)$/i);
    if (lessonProgressMatch) {
      return `${lessonProgressMatch[1]} នៃ ${lessonProgressMatch[2]} ${lessonProgressMatch[3].toLowerCase().startsWith("staff") ? "មេរៀនបុគ្គលិក" : "មេរៀន"}`;
    }

    const slashLessonProgressMatch = core.match(/^(\d+)\s*\/\s*(\d+)\s+(lessons?|staff-lessons)$/i);
    if (slashLessonProgressMatch) {
      return `${slashLessonProgressMatch[1]} / ${slashLessonProgressMatch[2]} ${slashLessonProgressMatch[3].toLowerCase().startsWith("staff") ? "មេរៀនបុគ្គលិក" : "មេរៀន"}`;
    }

    const coursePositionMatch = core.match(/^Course\s+(\d+)\s*\/\s*(\d+)$/i);
    if (coursePositionMatch) return `វគ្គ ${coursePositionMatch[1]} / ${coursePositionMatch[2]}`;

    const lessonPositionMatch = core.match(/^Lesson\s+(\d+)\s+of\s+(\d+)$/i);
    if (lessonPositionMatch) return `មេរៀន ${lessonPositionMatch[1]} នៃ ${lessonPositionMatch[2]}`;

    const stepPositionMatch = core.match(/^Step\s+(\d+)\s+of\s+(\d+)$/i);
    if (stepPositionMatch) return `ជំហាន ${stepPositionMatch[1]} នៃ ${stepPositionMatch[2]}`;

    const lessonCountMatch = core.match(/^(\d+)\s+lessons?$/i);
    if (lessonCountMatch) return `${lessonCountMatch[1]} មេរៀន`;

    const completeLessonMatch = core.match(/^Complete:\s+(.+)$/i);
    if (completeLessonMatch) return `បញ្ចប់៖ ${translatePhrase(completeLessonMatch[1], lang)}`;

    const testNameMatch = core.match(/^test\s*([0-9]+)$/i);
    if (testNameMatch) return `តេស្ត${testNameMatch[1]}`;

    const unreadMatch = core.match(/^(\d+)\s+unread notifications?$/i);
    if (unreadMatch) return `${unreadMatch[1]} ការជូនដំណឹងមិនទាន់អាន`;

    const pageMatch = core.match(/^Page\s+(\d+)\s+of\s+(\d+)$/i);
    if (pageMatch) return `ទំព័រ ${pageMatch[1]} នៃ ${pageMatch[2]}`;

    const qtyMatch = core.match(/^Qty\s+(.+)$/i);
    if (qtyMatch) return `ចំនួន ${qtyMatch[1]}`;

    const categoryOrderMatch = core.match(/^Category Order:\s+(\d+)$/i);
    if (categoryOrderMatch) return `លំដាប់ប្រភេទ៖ ${categoryOrderMatch[1]}`;

    const orderNumberMatch = core.match(/^Order:\s+(\d+)$/i);
    if (orderNumberMatch) return `លំដាប់៖ ${orderNumberMatch[1]}`;

    const lastLabelMatch = core.match(/^Last:\s+(.+)$/i);
    if (lastLabelMatch) return `ចុងក្រោយ៖ ${translatePhrase(lastLabelMatch[1], lang)}`;

    const latestPercentMatch = core.match(/^(\d+)%\s+latest$/i);
    if (latestPercentMatch) return `${latestPercentMatch[1]}% ចុងក្រោយ`;

    const roleLabelMatch = core.match(/^Role:\s+(.+)$/i);
    if (roleLabelMatch) return `តួនាទី៖ ${translatePhrase(roleLabelMatch[1], lang)}`;

    const emailLabelMatch = core.match(/^Email:\s+(.+)$/i);
    if (emailLabelMatch) return `អ៊ីមែល៖ ${emailLabelMatch[1]}`;

    const phoneLabelMatch = core.match(/^Phone:\s+(.+)$/i);
    if (phoneLabelMatch) return `ទូរស័ព្ទ៖ ${translatePhrase(phoneLabelMatch[1], lang)}`;

    const lastActivityLabelMatch = core.match(/^Last activity:\s+(.+)$/i);
    if (lastActivityLabelMatch) return `សកម្មភាពចុងក្រោយ៖ ${translatePhrase(lastActivityLabelMatch[1], lang)}`;

    const lastLessonLabelMatch = core.match(/^Last lesson:\s+(.+)$/i);
    if (lastLessonLabelMatch) return `មេរៀនចុងក្រោយ៖ ${translatePhrase(lastLessonLabelMatch[1], lang)}`;

    const watchedVideosLabelMatch = core.match(/^Watched videos:\s+(\d+)$/i);
    if (watchedVideosLabelMatch) return `វីដេអូបានមើល៖ ${watchedVideosLabelMatch[1]}`;

    const assetsPageSizeMatch = core.match(/^(\d+)\s*\/\s*page$/i);
    if (assetsPageSizeMatch) return `${assetsPageSizeMatch[1]} ក្នុងមួយទំព័រ`;

    const borrowedOutMatch = core.match(/^(\d+)\s+borrowed\s+\/\s+(\d+)\s+out$/i);
    if (borrowedOutMatch) return `${borrowedOutMatch[1]} បានខ្ចី / ${borrowedOutMatch[2]} បានចេញ`;

    const movementRecordsMatch = core.match(/^(\d+)\s+movement records?$/i);
    if (movementRecordsMatch) return `${movementRecordsMatch[1]} កំណត់ត្រាចលនា`;

    const auditTransferEventsMatch = core.match(/^(\d+)\s+audit and transfer events?$/i);
    if (auditTransferEventsMatch) return `${auditTransferEventsMatch[1]} ព្រឹត្តិការណ៍ត្រួតពិនិត្យ និងផ្ទេរ`;

    const currentStockMatch = core.match(/^Current Stock\s+\((.+)\)$/i);
    if (currentStockMatch) return `ស្តុកបច្ចុប្បន្ន (${currentStockMatch[1]})`;

    const showingVehiclesMatch = core.match(/^Showing\s+(.+)\s+of\s+(.+)\s+vehicles$/i);
    if (showingVehiclesMatch) return `បង្ហាញ ${showingVehiclesMatch[1]} នៃ ${showingVehiclesMatch[2]} យានយន្ត`;

    const showingAllVehiclesMatch = core.match(/^Showing\s+all\s+(.+)\s+vehicles$/i);
    if (showingAllVehiclesMatch) return `បង្ហាញយានយន្តទាំងអស់ ${showingAllVehiclesMatch[1]}`;

    const suggestionsMatch = core.match(/^Showing suggestions for "(.+)"$/i);
    if (suggestionsMatch) return `បង្ហាញសំណើសម្រាប់ "${suggestionsMatch[1]}"`;

    const signedInMatch = core.match(/^Signed in as\s+(.+)$/i);
    if (signedInMatch) return `បានចូលជា ${signedInMatch[1]}`;

    const editEntityMatch = core.match(/^Edit\s+(.+)$/i);
    if (editEntityMatch) return `កែប្រែ ${editEntityMatch[1]}`;

    const viewLargerMatch = core.match(/^View\s+(.+)\s+larger$/i);
    if (viewLargerMatch) return `មើល ${viewLargerMatch[1]} ឱ្យធំ`;

    const returnToStockMatch = core.match(/^Return\s+(.+)\s+to stock\?$/i);
    if (returnToStockMatch) return `ត្រឡប់ ${returnToStockMatch[1]} ទៅស្តុកឬ?`;

    const fetchAssetsErrorMatch = core.match(/^Failed to fetch assets:\s+(.+)$/i);
    if (fetchAssetsErrorMatch) return `បរាជ័យក្នុងការទាញយកទ្រព្យសម្បត្តិ៖ ${fetchAssetsErrorMatch[1]}`;

    const stockAvailabilityMatch = core.match(/^(.+)\s+•\s+Available:\s+(.+)\s+•\s+Reserved:\s+(.+)$/i);
    if (stockAvailabilityMatch) {
      return `${stockAvailabilityMatch[1]} • ទំនេរ៖ ${stockAvailabilityMatch[2]} • បានកក់៖ ${stockAvailabilityMatch[3]}`;
    }

    const statusAssignedMatch = core.match(/^Status:\s+(.+)\s+\|\s+Assigned:\s+(.+)$/i);
    if (statusAssignedMatch) {
      return `ស្ថានភាព៖ ${translatePhrase(statusAssignedMatch[1], lang)} | បានចាត់តាំង៖ ${translatePhrase(statusAssignedMatch[2], lang)}`;
    }
  }

  if (lang === "en") {
    const unreadMatch = core.match(/^(\d+)\s+ការជូនដំណឹងមិនទាន់អាន$/);
    if (unreadMatch) return `${unreadMatch[1]} unread notifications`;

    const pageMatch = core.match(/^ទំព័រ\s+(\d+)\s+នៃ\s+(\d+)$/);
    if (pageMatch) return `Page ${pageMatch[1]} of ${pageMatch[2]}`;
  }

  return null;
}

export function translatePhrase(text: string, lang: Language): string {
  if (!text.trim()) return text;

  const core = normalizePhrase(text);
  const direct = lookupTranslation(core, lang);
  if (direct) return preserveOuterWhitespace(text, direct);

  const punctuationMatch = core.match(/^(.+?)([:：])$/);
  if (punctuationMatch) {
    const base = lookupTranslation(normalizePhrase(punctuationMatch[1]), lang);
    if (base) return preserveOuterWhitespace(text, `${base}${punctuationMatch[2]}`);
  }

  const dynamic = translateDynamicPhrase(core, lang);
  if (dynamic) return preserveOuterWhitespace(text, dynamic);

  return text;
}

// Hook for using translations
export function useTranslation(lang: Language) {
  return {
    t: translations[lang],
    lang,
  };
}

// Format translation with variables
export function formatTranslation(
  text: string,
  vars: Record<string, string | number>
): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(`{${key}}`, String(value));
  }
  return result;
}
