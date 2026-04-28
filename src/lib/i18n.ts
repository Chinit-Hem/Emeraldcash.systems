// Khmer Language Support for Emerald Cash VMS
// ភាសាខ្មែរសម្រាប់ Emerald Cash VMS

export type Language = "en" | "km";

export interface Translations {
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
    dashboard: "Dashboard",
    vehicles: "Vehicles",
    training: "Training",
    trainingPortal: "Training Portal",
    masterSkills: "Master new skills",
    sms: "Stock Management",
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
    manageInventory: "Manage SMS equipment and resources",
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
    reviewRequests: "Review Requests",
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
    dashboard: "ផ្ទាំងគ្រប់គ្រង",
    vehicles: "យានយន្ត",
    training: "ការបណ្តុះបណ្តាល",
    trainingPortal: "ផ្ទាំងបណ្តុះបណ្តាល",
    masterSkills: "រៀនជំនាញថ្មីៗ",
    sms: "គ្រប់គ្រងស្តុក",
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
    manageInventory: "គ្រប់គ្រងឧបករណ៍ SMS និងធនធាន",
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
    reviewRequests: "ពិនិត្យសំណើ",
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
    topBrands: "ម៉ាកល្បី",
    popularManufacturers: "ក្រុមហ៊ុនផលិតពេញនិយមបំផុត",
    monthlyTrends: "របាក់រំពីរាប់ខែ",
    vehiclesOverTime: "យានយន្តបានបន្ថែមតាមពេលវេលា",
    withImages: "មានរូបភាព",
    withoutImages: "គ្មានរូបភាព",
    averagePrice: "តម្លៃមធ្យម",
    uniqueBrands: "ម៉ាកពិសេស",
    realTimeInventory: "វិភាគស្តុកយានយន្តពេលវេលាពិត",
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
    model: "ម៉ូដែល",
    minPrice: "តម្លៃអប្បបរមា",
    maxPrice: "តម្លៃអតិបរមា",
    imageStatus: "ស្ថានភាពរូបភាព",
    noVehiclesFound: "រកមិនឃើញយានយន្ត",
    perPage: "ក្នុងមួយទំព័រ",
  },
};

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
