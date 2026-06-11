import {
  MOTORCYCLE_BRAND_OPTIONS,
  TUK_TUK_BRAND_OPTIONS,
  getVehicleModelOptionsForBrand,
} from "@/shared/types/types";

const FEATURED_CAR_BRAND_NAMES = [
  "MG",
  "Leapmotor",
  "IM",
  "Toyota",
  "Lexus",
  "Kia",
  "Ford",
  "Land Rover",
  "Mercedes-Benz",
  "Audi",
  "BMW",
  "BYD",
  "Chevrolet",
  "GAC",
  "Honda",
  "Hyundai",
  "Mazda",
  "Nissan",
  "Porsche",
  "DENZA",
  "Mitsubishi",
  "SsangYong",
  "AVATR",
  "Cadillac",
  "CHANGAN",
  "Jeep",
  "Tesla",
  "Volkswagen",
  "212",
  "AEOLUS",
  "AION",
  "AIQAR",
  "AITO",
  "Alfa Romeo",
  "Aston Martin",
  "BAIC",
  "Baojun",
  "BAW",
  "Bentley",
  "BESTUNE",
  "Buick",
  "Changhe",
  "CHERY",
  "Chrysler",
  "Daewoo",
  "Daihatsu",
  "DFSK",
  "Dodge",
  "Ferrari",
  "FORTHING",
  "Foton",
  "GEELY",
  "GMC",
  "Great Wall",
  "GTV",
  "GWM",
  "Hawtai Motor",
  "HONGQI",
  "HUMMER",
  "iCar",
  "Infiniti",
  "Isuzu",
  "JAC",
  "Jaguar",
  "JETOUR",
  "JMC",
  "KAIYI",
  "Lamborghini",
  "Li",
  "Lotus",
  "Maserati",
  "MAXUS",
  "McLaren",
  "Mini",
  "ORA",
  "Peugeot",
  "Ram",
  "Renault",
  "Rivian",
  "Rolls-Royce",
  "Smart",
  "SOUEAST",
  "Subaru",
  "Suzuki",
  "VENUCIA",
  "Volvo",
  "VOYAH",
  "WULING",
  "Xiaomi",
  "XPENG",
  "ZEEKR",
  "ZOTYE",
  "ZX AUTO",
  "Other - ផ្សេងៗ",
] as const;
const FEATURED_MOTORCYCLE_BRAND_NAMES = [
  ...MOTORCYCLE_BRAND_OPTIONS,
] as const;
const FEATURED_TUKTUK_BRAND_NAMES = [
  "Bajaj",
  "Piaggio",
  "Onion",
] as const;
const MOTORCYCLE_BRAND_NAMES = [
  ...MOTORCYCLE_BRAND_OPTIONS,
  ...FEATURED_MOTORCYCLE_BRAND_NAMES,
  "Royal",
  "KR Motors",
  "CF Moto",
  "Harley-Davidson",
  "Italjet",
  "Peugeot Motocycles",
] as const;
const MOTORCYCLE_ONLY_BRAND_NAMES = [
  "Yamaha",
  "Kawasaki",
  "SYM",
  "Sym",
  "Vespa",
  "GPX",
  "GTR",
  "KTM",
  "Royal Enfield",
  "Royal",
  "Ducati",
  "KR Motor",
  "KR Motors",
  "Calypso",
  "CFMOTO",
  "CF Moto",
  "Keeway",
  "Benelli",
  "Stallion",
  "UMG",
  "Harley Davidson",
  "Harley-Davidson",
  "Husqvarna",
  "HYOSUNG",
  "Hyosung",
  "Italjet Dragster",
  "Italjet",
  "Lambretta",
  "Triumph",
  "YADEA",
  "Yadea",
  "Zontes",
] as const;
const TUKTUK_BRAND_NAMES = [
  ...TUK_TUK_BRAND_OPTIONS,
  ...FEATURED_TUKTUK_BRAND_NAMES,
  "Bajaj RE",
  "ONiON",
  "Onion Mobility",
] as const;
const TUKTUK_ONLY_BRAND_NAMES = [
  "Bajaj",
  "Bajaj RE",
  "Piaggio",
  "Onion",
  "ONiON",
  "Onion Mobility",
] as const;
const TOYOTA_MODEL_NAMES = [
  "Camry",
  "Prius",
  "Raize",
  "Alphard",
  "BZ3X",
  "BZ4x",
  "Corolla",
  "Fortuner",
  "Hiace",
  "Highlander",
  "Hilux Rally",
  "Hilux REVO",
  "Hilux Vigo",
  "Land Cruiser",
  "Land Cruiser PRADO",
  "RAV4",
  "Scion",
  "Sienna",
  "Tacoma",
  "Tundra",
  "Vitz",
  "Yaris",
  "4Runner",
  "Celica",
  "Rush",
  "86",
  "Aristo",
  "Aurion",
  "Avalon",
  "Avenza",
  "Belta",
  "BZ3",
  "bZ5",
  "C-HR",
  "Coaster",
  "Corolla Altis",
  "Corolla CROSS",
  "Corona Avante",
  "Crown",
  "Estima",
  "GR Supra",
  "Granvia",
  "Hiace SBV",
  "Hilux",
  "Hilux Surf",
  "Innova",
  "Matrix",
  "MR2",
  "Prado",
  "Previa",
  "Supra",
  "Vellfire",
  "Veloz",
  "Venza",
  "Vios",
  "Voxy",
  "Wigo",
  "Yaris CROSS",
  "Other - ផ្សេងៗ",
] as const;

export const INVALID_BRAND_NAMES = new Set(["", "directdb", "test", "unknown", "na", "null", "none", "other"]);

const BRAND_CANONICAL_NAMES: Record<string, string> = {
  baja: "Bajaj",
  bajaj: "Bajaj",
  "bajaj auto": "Bajaj",
  "bajaj re": "Bajaj",
  "cf moto": "CFMOTO",
  cfmoto: "CFMOTO",
  "mercede": "Mercedes-Benz",
  mercedes: "Mercedes-Benz",
  "mercedes benz": "Mercedes-Benz",
  "masda": "Mazda",
  "rang rover": "Land Rover",
  "range rover": "Land Rover",
  "voyah dreamer": "VOYAH",
  xioami: "Xiaomi",
  xiomi: "Xiaomi",
  aiqar: "AIQAR",
  gpx: "GPX",
  gtr: "GTR",
  "gtr spring": "GTR",
  "harley-davidson": "Harley Davidson",
  "harley davidson": "Harley Davidson",
  hyosung: "HYOSUNG",
  "italjet": "Italjet Dragster",
  "italjet dragster": "Italjet Dragster",
  ktm: "KTM",
  "kr motor": "KR Motor",
  "kr motors": "KR Motor",
  krmotor: "KR Motor",
  onion: "Onion",
  "onion mobility": "Onion",
  "onion ev": "Onion",
  royal: "Royal Enfield",
  "royal enfield": "Royal Enfield",
  sym: "SYM",
  umg: "UMG",
  yadea: "YADEA",
  chery: "CHERY",
  geely: "GEELY",
  gwm: "GWM",
  hongqi: "HONGQI",
  maxus: "MAXUS",
  nio: "NIO",
  "li auto": "Li",
  "kamax group": "KAMAX",
  xpeng: "XPENG",
  "zxauto": "ZX AUTO",
  "zx auto": "ZX AUTO",
  zeekr: "ZEEKR",
};

const BRAND_ICON_SLUGS: Record<string, string> = {
  "aston martin": "astonmartin",
  audi: "audi",
  bentley: "bentley",
  bmw: "bmw",
  cadillac: "cadillac",
  chevrolet: "chevrolet",
  chrysler: "chrysler",
  ferrari: "ferrari",
  ford: "ford",
  honda: "honda",
  hyundai: "hyundai",
  infiniti: "infiniti",
  jeep: "jeep",
  kia: "kia",
  ktm: "ktm",
  lamborghini: "lamborghini",
  maserati: "maserati",
  mazda: "mazda",
  mclaren: "mclaren",
  mg: "mg",
  mini: "mini",
  mitsubishi: "mitsubishi",
  nissan: "nissan",
  peugeot: "peugeot",
  porsche: "porsche",
  ram: "ram",
  renault: "renault",
  "rolls-royce": "rollsroyce",
  smart: "smart",
  subaru: "subaru",
  suzuki: "suzuki",
  tesla: "tesla",
  toyota: "toyota",
  volkswagen: "volkswagen",
  volvo: "volvo",
  xiaomi: "xiaomi",
  ducati: "ducati",
  vespa: "vespa",
  husqvarna: "husqvarna",
};

const LOCAL_CAR_MAKE_LOGOS: Record<string, string> = {
  acura: "acura.svg",
  "alfa romeo": "alfa romeo.svg",
  "aston martin": "aston martin.svg",
  audi: "audi.svg",
  bentley: "bentley.svg",
  bmw: "bmw.svg",
  buick: "buick.svg",
  cadillac: "cadillac.svg",
  chevrolet: "chevrolet.svg",
  chrysler: "chrysler.svg",
  daewoo: "daewoo.svg",
  dodge: "dodge.svg",
  ferrari: "ferrari.svg",
  fiat: "fiat.svg",
  ford: "ford.svg",
  genesis: "genesis.svg",
  gmc: "gmc.svg",
  honda: "honda.svg",
  hummer: "hummer.svg",
  hyundai: "hyundai.svg",
  infiniti: "infiniti.svg",
  isuzu: "isuzu.svg",
  jaguar: "jaguar.svg",
  jeep: "jeep.svg",
  kia: "kia.svg",
  lamborghini: "lamborghini.svg",
  "land rover": "land rover.svg",
  lexus: "lexus.svg",
  lincoln: "lincoln.svg",
  lotus: "lotus.svg",
  maserati: "maserati.svg",
  maybach: "maybach.svg",
  mazda: "mazda.svg",
  mclaren: "mclaren.svg",
  "mercedes-benz": "mercedes benz.svg",
  "mercedes benz": "mercedes benz.svg",
  mini: "mini.svg",
  mitsubishi: "mitsubishi.svg",
  nissan: "nissan.svg",
  porsche: "porsche.svg",
  ram: "ram.svg",
  "rolls-royce": "rolls royce.svg",
  "rolls royce": "rolls royce.svg",
  smart: "smart.svg",
  subaru: "subaru.svg",
  suzuki: "suzuki.svg",
  tesla: "tesla.svg",
  toyota: "toyota.svg",
  volkswagen: "volkswagen.svg",
  volvo: "volvo.svg",
};

const LOCAL_BRAND_LOGOS: Record<string, string> = {
  "212": "/assets/brand-logos/custom/212.png",
  aeolus: "/assets/brand-logos/custom/aeolus.png",
  aiqar: "/assets/brand-logos/custom/aiqar.png",
  aion: "/assets/brand-logos/custom/aion-clean.png",
  aito: "/assets/brand-logos/custom/aito.png",
  avatr: "/assets/brand-logos/custom/avatr.png",
  baja: "/assets/brand-logos/custom/bajaj-clean.png",
  bajaj: "/assets/brand-logos/custom/bajaj-clean.png",
  "bajaj auto": "/assets/brand-logos/custom/bajaj-clean.png",
  "bajaj re": "/assets/brand-logos/custom/bajaj-clean.png",
  baic: "/assets/brand-logos/custom/baic.png",
  baojun: "/assets/brand-logos/custom/baojun.png",
  bmw: "/assets/brand-logos/custom/bmw-clean.png",
  baw: "/assets/brand-logos/custom/baw.png",
  benelli: "/assets/brand-logos/custom/benelli.png",
  bestune: "/assets/brand-logos/custom/bestune.jpg",
  byd: "/assets/brand-logos/custom/byd.png",
  calypso: "/assets/brand-logos/custom/calypso.svg",
  changan: "/assets/brand-logos/custom/changan.png",
  changhe: "/assets/brand-logos/custom/changhe.jpg",
  "cf moto": "/assets/brand-logos/custom/cfmoto.png",
  cfmoto: "/assets/brand-logos/custom/cfmoto.png",
  chevrolet: "/assets/brand-logos/custom/chevrolet.png",
  chery: "/assets/brand-logos/custom/chery.png",
  daihatsu: "/assets/brand-logos/custom/daihatsu.jpg",
  denza: "/assets/brand-logos/custom/denza.png",
  dfsk: "/assets/brand-logos/custom/dfsk.jpg",
  forthing: "/assets/brand-logos/custom/forthing.png",
  foton: "/assets/brand-logos/custom/foton.png",
  gac: "/assets/brand-logos/custom/gac.png",
  geely: "/assets/brand-logos/custom/geely.png",
  "great wall": "/assets/brand-logos/custom/great-wall-full.png",
  gpx: "/assets/brand-logos/custom/gpx.png",
  gtr: "/assets/brand-logos/custom/gtr-spring.svg",
  "gtr spring": "/assets/brand-logos/custom/gtr-spring.svg",
  gtv: "/assets/brand-logos/custom/gtv.png",
  gwm: "/assets/brand-logos/custom/gwm.png",
  "harley davidson": "/assets/brand-logos/custom/harley-davidson.png",
  "harley-davidson": "/assets/brand-logos/custom/harley-davidson.png",
  hawtai: "/assets/brand-logos/custom/hawtai-motor-symbol.png",
  "hawtai motor": "/assets/brand-logos/custom/hawtai-motor-symbol.png",
  hongqi: "/assets/brand-logos/custom/hongqi.png",
  hyosung: "/assets/brand-logos/custom/hyosung.png",
  icar: "/assets/brand-logos/custom/icar.png",
  im: "/assets/brand-logos/custom/im.png",
  italjet: "/assets/brand-logos/custom/italjet.png",
  "italjet dragster": "/assets/brand-logos/custom/italjet.png",
  jac: "/assets/brand-logos/custom/jac.png",
  jetour: "/assets/brand-logos/custom/jetour.png",
  jmc: "/assets/brand-logos/custom/jmc.png",
  kaiyi: "/assets/brand-logos/custom/kaiyi.ico",
  kamax: "/assets/brand-logos/custom/kamax.png",
  "kamax group": "/assets/brand-logos/custom/kamax.png",
  kawasaki: "/assets/brand-logos/custom/kawasaki-icon.png",
  keeway: "/assets/brand-logos/custom/keeway.png",
  "kr motor": "/assets/brand-logos/custom/kr-motor.png",
  "kr motors": "/assets/brand-logos/custom/kr-motor.png",
  lambretta: "/assets/brand-logos/custom/lambretta.png",
  leapmotor: "/assets/brand-logos/custom/leapmotor.png",
  li: "/assets/brand-logos/custom/li.png",
  "li auto": "/assets/brand-logos/custom/li.png",
  maxus: "/assets/brand-logos/custom/maxus.jpg",
  onion: "/assets/brand-logos/custom/onion-clean.png",
  "onion mobility": "/assets/brand-logos/custom/onion-clean.png",
  ora: "/assets/brand-logos/custom/ora-clean.png",
  piaggio: "/assets/brand-logos/custom/piaggio-clean.png",
  rivian: "/assets/brand-logos/custom/rivian.png",
  royal: "/assets/brand-logos/custom/royal-enfield.svg",
  "royal enfield": "/assets/brand-logos/custom/royal-enfield.svg",
  ssangyong: "/assets/brand-logos/custom/ssangyong.png",
  stallion: "/assets/brand-logos/custom/stallion.png",
  smart: "/assets/brand-logos/custom/smart.svg",
  soueast: "/assets/brand-logos/custom/soueast.png",
  subaru: "/assets/brand-logos/custom/subaru.png",
  sym: "/assets/brand-logos/custom/sym.png",
  triumph: "/assets/brand-logos/custom/triumph.png",
  umg: "/assets/brand-logos/custom/umg.png",
  venucia: "/assets/brand-logos/custom/venucia.ico",
  vespa: "/assets/brand-logos/custom/vespa-clean.png",
  voyah: "/assets/brand-logos/custom/voyah-icon.png",
  wuling: "/assets/brand-logos/custom/wuling.png",
  xpeng: "/assets/brand-logos/custom/xpeng.png",
  yadea: "/assets/brand-logos/custom/yadea.png",
  yamaha: "/assets/brand-logos/custom/yamaha.png",
  zeekr: "/assets/brand-logos/custom/zeekr.png",
  zontes: "/assets/brand-logos/custom/zontes.png",
  zotye: "/assets/brand-logos/custom/zotye-clean.svg",
  "zx auto": "/assets/brand-logos/custom/zx-auto-clean.svg",
  zxauto: "/assets/brand-logos/custom/zx-auto-clean.svg",
};

function normalizeBrandName(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function getBrandAssetKey(value: string): string {
  return normalizeBrandName(value).toLocaleLowerCase("en-US");
}

export function getBrandKey(value: string): string {
  return getBrandAssetKey(value).replace(/[^a-z0-9]+/g, "");
}

function brandNameMatchesList(brandName: string, brandNames: readonly string[]): boolean {
  const brandKey = getBrandKey(getCanonicalBrandName(brandName));
  if (!brandKey) return false;

  return brandNames.some((candidate) => getBrandKey(getCanonicalBrandName(candidate)) === brandKey);
}

export function isBrandAllowedForCategory(brandName: string, category: string | undefined): boolean {
  if (!category) return true;
  if (category === "Motorcycles") return brandNameMatchesList(brandName, MOTORCYCLE_BRAND_NAMES);
  if (category === "TukTuks") return brandNameMatchesList(brandName, TUKTUK_BRAND_NAMES);
  if (category === "Cars") {
    return (
      !brandNameMatchesList(brandName, MOTORCYCLE_ONLY_BRAND_NAMES) &&
      !brandNameMatchesList(brandName, TUKTUK_ONLY_BRAND_NAMES)
    );
  }

  return true;
}

function getUniqueBrandNames(brandNames: readonly string[]): string[] {
  const uniqueBrands = new Map<string, string>();

  brandNames.forEach((brandName) => {
    const normalizedBrandName = getCanonicalBrandName(brandName);
    const brandKey = getBrandKey(normalizedBrandName);
    if (!brandKey || uniqueBrands.has(brandKey)) return;
    uniqueBrands.set(brandKey, normalizedBrandName);
  });

  return Array.from(uniqueBrands.values());
}

export function getFeaturedBrandNamesForCategory(category: string | undefined): string[] {
  if (category === "Cars") return getUniqueBrandNames(FEATURED_CAR_BRAND_NAMES);
  if (category === "Motorcycles") return getUniqueBrandNames(FEATURED_MOTORCYCLE_BRAND_NAMES);
  if (category === "TukTuks") return getUniqueBrandNames(FEATURED_TUKTUK_BRAND_NAMES);

  return getUniqueBrandNames([
    ...FEATURED_CAR_BRAND_NAMES,
    ...FEATURED_MOTORCYCLE_BRAND_NAMES,
    ...FEATURED_TUKTUK_BRAND_NAMES,
  ]);
}

function getBrandRecordValue(record: Record<string, string>, brand: string): string | null {
  const assetKey = getBrandAssetKey(brand);
  const compactKey = getBrandKey(brand);

  return (
    record[assetKey] ??
    record[compactKey] ??
    Object.entries(record).find(([key]) => getBrandKey(key) === compactKey)?.[1] ??
    null
  );
}

export function getCanonicalBrandName(brand: unknown): string {
  const normalizedBrandName = normalizeBrandName(brand);
  if (!normalizedBrandName) return "";

  return getBrandRecordValue(BRAND_CANONICAL_NAMES, normalizedBrandName) ?? normalizedBrandName;
}

export function brandMatchesFilter(brand: unknown, filterValue: string): boolean {
  const brandName = normalizeBrandName(brand);
  const filterName = normalizeBrandName(filterValue);
  if (!brandName || !filterName) return false;

  const brandKey = getBrandKey(getCanonicalBrandName(brandName));
  const filterKey = getBrandKey(getCanonicalBrandName(filterName));
  if (brandKey && filterKey && brandKey === filterKey) return true;

  return getBrandAssetKey(brandName).includes(getBrandAssetKey(filterName));
}

export function normalizeModelName(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function getModelKey(value: string): string {
  return normalizeModelName(value).toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "");
}

export function getModelFilterValue(modelLabel: string): string {
  return getModelKey(modelLabel).startsWith("other") ? "Other" : normalizeModelName(modelLabel);
}

export function getFeaturedModelNamesForBrand(brand: string, category: string | undefined): readonly string[] {
  if (category === "Motorcycles") {
    return getVehicleModelOptionsForBrand(getCanonicalBrandName(brand));
  }

  return getBrandKey(getCanonicalBrandName(brand)) === getBrandKey("Toyota") ? TOYOTA_MODEL_NAMES : [];
}

function getBrandIconSlug(brand: string): string | null {
  return getBrandRecordValue(BRAND_ICON_SLUGS, brand);
}

function getLocalBrandLogoPath(brand: string): string | null {
  return getBrandRecordValue(LOCAL_BRAND_LOGOS, brand);
}

function getLocalCarMakeLogoPath(brand: string): string | null {
  const filename = getBrandRecordValue(LOCAL_CAR_MAKE_LOGOS, brand);
  return filename ? `/assets/brand-logos/car-makes/${encodeURIComponent(filename)}` : null;
}

export function getBrandLogoSources(brand: string): string[] {
  const simpleIconSlug = getBrandIconSlug(brand);
  // Website favicons are intentionally excluded because they often show site,
  // campaign, or placeholder icons instead of the vehicle brand mark.
  const sources = [
    getLocalBrandLogoPath(brand),
    getLocalCarMakeLogoPath(brand),
    simpleIconSlug ? `https://cdn.simpleicons.org/${simpleIconSlug}` : null,
  ];

  return Array.from(new Set(sources.filter((source): source is string => Boolean(source))));
}

export function getBrandFallbackLabel(brand: string): string {
  const cleanedBrand = getCanonicalBrandName(brand)
    .replace(/Other\s*-\s*/i, "")
    .replace(/[^a-z0-9\s]/gi, " ")
    .trim();
  const words = cleanedBrand.split(/\s+/).filter(Boolean);

  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();

  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}
