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
  gpx: "GPX",
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
  xpeng: "XPENG",
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
  piaggio: "piaggio",
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
  yamaha: "yamaha",
  ducati: "ducati",
  vespa: "vespa",
  "harley davidson": "harleydavidson",
  "harley-davidson": "harleydavidson",
  husqvarna: "husqvarna",
  "royal enfield": "royalenfield",
  triumph: "triumph",
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
  daihatsu: "daihatsu.svg",
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
  aion: "/assets/brand-logos/custom/aion.png",
  baja: "/assets/brand-logos/custom/bajaj.png",
  bajaj: "/assets/brand-logos/custom/bajaj.png",
  "bajaj auto": "/assets/brand-logos/custom/bajaj.png",
  "bajaj re": "/assets/brand-logos/custom/bajaj.png",
  bestune: "/assets/brand-logos/custom/bestune.jpg",
  calypso: "/assets/brand-logos/custom/calypso.svg",
  changhe: "/assets/brand-logos/custom/changhe.jpg",
  "cf moto": "/assets/brand-logos/custom/cfmoto.png",
  cfmoto: "/assets/brand-logos/custom/cfmoto.png",
  daihatsu: "/assets/brand-logos/custom/daihatsu.jpg",
  dfsk: "/assets/brand-logos/custom/dfsk.jpg",
  foton: "/assets/brand-logos/custom/foton.png",
  "great wall": "/assets/brand-logos/custom/great-wall.png",
  gpx: "/assets/brand-logos/custom/gpx.png",
  icar: "/assets/brand-logos/custom/icar.png",
  kawasaki: "/assets/brand-logos/custom/kawasaki.png",
  "kr motor": "/assets/brand-logos/custom/kr-motor.png",
  "kr motors": "/assets/brand-logos/custom/kr-motor.png",
  leapmotor: "/assets/brand-logos/custom/leapmotor.png",
  maxus: "/assets/brand-logos/custom/maxus.jpg",
  onion: "/assets/brand-logos/custom/onion.png",
  "onion mobility": "/assets/brand-logos/custom/onion.png",
  piaggio: "/assets/brand-logos/custom/piaggio.png",
  royal: "/assets/brand-logos/custom/royal-enfield.svg",
  "royal enfield": "/assets/brand-logos/custom/royal-enfield.svg",
  ssangyong: "/assets/brand-logos/custom/ssangyong.png",
  soueast: "/assets/brand-logos/custom/soueast.png",
  vespa: "/assets/brand-logos/custom/vespa.webp",
  voyah: "/assets/brand-logos/custom/voyah.png",
  zotye: "/assets/brand-logos/custom/zotye.jpg",
};

const BRAND_LOGO_DOMAINS: Record<string, string> = {
  "212": "212auto.com",
  aeolus: "www.dongfeng-global.com",
  aion: "www.aion.com",
  aiqar: "www.icarglobal.com",
  aito: "aito.auto",
  avatr: "www.avatr.com",
  baic: "www.baicglobal.com",
  bajaj: "www.bajajauto.com",
  baojun: "www.sgmw.com.cn",
  baw: "www.baw.com.cn",
  bestune: "www.faw-bestune.com",
  byd: "www.byd.com",
  changan: "www.globalchangan.com",
  changhe: "www.changheauto.com",
  chery: "www.cheryinternational.com",
  "cf moto": "www.cfmoto.com",
  cfmoto: "www.cfmoto.com",
  calypso: "calypsomotors.com",
  denza: "www.denza.com",
  dfsk: "www.dfsk.com",
  ducati: "www.ducati.com",
  forthing: "www.dongfengforthing.com",
  foton: "www.foton-global.com",
  gac: "www.gac-motor.com",
  geely: "global.geely.com",
  gpx: "www.gpxthailand.com",
  "great wall": "www.gwm-global.com",
  gtv: "www.gtvmotor.com",
  gwm: "www.gwm-global.com",
  "hawtai motor": "www.hawtaimotor.com",
  hongqi: "www.hongqi-auto.com",
  icar: "www.icarglobal.com",
  im: "www.immotors.com",
  jac: "jacen.jac.com.cn",
  jetour: "www.jetourglobal.com",
  jmc: "www.jmc.com.cn",
  kaiyi: "www.kaiyiglobal.com",
  kawasaki: "www.kawasaki.com",
  ktm: "www.ktm.com",
  "kr motor": "www.krmotors.com",
  "kr motors": "www.krmotors.com",
  leapmotor: "en.leapmotor.com",
  li: "www.lixiang.com",
  maxus: "www.maxusmotors.com",
  nio: "www.nio.com",
  ora: "www.gwm-global.com/ora",
  peugeot: "www.peugeot.com",
  piaggio: "www.piaggio.com",
  renault: "www.renault.com",
  rivian: "rivian.com",
  royal: "www.royalenfield.com",
  "royal enfield": "www.royalenfield.com",
  "ssangyong": "www.kg-mobility.com",
  soueast: "www.soueast-motor.com",
  sym: "www.sym-global.com",
  "benelli": "www.benelli.com",
  "harley davidson": "www.harley-davidson.com",
  "harley-davidson": "www.harley-davidson.com",
  husqvarna: "www.husqvarna-motorcycles.com",
  hyosung: "www.hyosungmotorsusa.com",
  "italjet": "www.italjet.com",
  "italjet dragster": "www.italjet.com",
  keeway: "www.keeway.com",
  lambretta: "www.lambretta.com",
  "peugeot motocycles": "www.peugeot-motocycles.com",
  stallion: "www.stallionsmotor.com",
  triumph: "www.triumphmotorcycles.com",
  umg: "umg.com.kh",
  venucia: "www.venucia.com",
  vespa: "www.vespa.com",
  voyah: "www.voyah.com",
  wuling: "www.wuling.com",
  xpeng: "www.xpeng.com",
  yamaha: "www.yamaha-motor.com",
  yadea: "www.yadea.com",
  zeekr: "www.zeekrglobal.com",
  zontes: "www.zontes.com",
  zotye: "www.zotye.com",
  "zx auto": "www.zxauto.com.cn",
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

function getBrandFaviconUrl(brand: string): string | null {
  const domain = getBrandRecordValue(BRAND_LOGO_DOMAINS, brand);
  return domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : null;
}

export function getBrandLogoSources(brand: string): string[] {
  const simpleIconSlug = getBrandIconSlug(brand);
  const sources = [
    getLocalBrandLogoPath(brand),
    getLocalCarMakeLogoPath(brand),
    simpleIconSlug ? `https://cdn.simpleicons.org/${simpleIconSlug}` : null,
    getBrandFaviconUrl(brand),
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
