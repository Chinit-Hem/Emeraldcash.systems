
"use client";

import type { SVGProps } from "react";

// Brand color mappings for car brands
const BRAND_COLORS: Record<string, string> = {
  // Japanese
  Toyota: "#EB0A1E",
  Lexus: "#000000",
  Honda: "#CC0000",
  Nissan: "#C3002F",
  Mazda: "#101010",
  Subaru: "#06425C",
  Suzuki: "#E4002B",
  Mitsubishi: "#E60012",
  Acura: "#000000",
  Infiniti: "#01234D",
  Isuzu: "#003DA5",
  Hino: "#E4002B",
  Daihatsu: "#FF6600",
  Mitsuoka: "#C0C0C0",
  
  // German
  BMW: "#0066B1",
  MercedesBenz: "#000000",
  "Mercedes-Benz": "#000000",
  Audi: "#CC0000",
  Volkswagen: "#001E50",
  Porsche: "#D5001C",
  Opel: "#FF6600",
  "smart": "#333333",
  
  // American
  Ford: "#003399",
  Chevrolet: "#FFD700",
  GMC: "#003399",
  Dodge: "#CC0000",
  Jeep: "#000000",
  Ram: "#CC0000",
  Cadillac: "#000000",
  Buick: "#000000",
  Lincoln: "#000000",
  Chrysler: "#000000",
  Tesla: "#E31937",
  Rivian: "#006B54",
  Lucid: "#003366",
  
  // Korean
  Kia: "#C41E3A",
  Hyundai: "#002F6C",
  Genesis: "#000000",
  SsangYong: "#003399",
  
  // Chinese
  BYD: "#003DA5",
  Changan: "#003399",
  Chery: "#FF6600",
  Geely: "#00A3E0",
  GreatWall: "#FF6600",
  GWM: "#FF6600",
  Haval: "#FF6600",
  "Great Wall": "#FF6600",
  GAC: "#003399",
  BAIC: "#003399",
  Foton: "#003399",
  JAC: "#003399",
  JMC: "#003399",
  DFSK: "#003399",
  FAW: "#CC0000",
  ZOTYE: "#003399",
  "ZX AUTO": "#003399",
  HONGQI: "#CC0000",
  CHANGAN: "#003399",
  LEVDEO: "#003399",
  AVATR: "#003399",
  AITO: "#003399",
  XPENG: "#003399",
  NIO: "#003399",
  Li: "#FF6600",
  LiAuto: "#FF6600",
  Xpeng: "#003399",
  Neta: "#003399",
  
  // European (non-German)
  Peugeot: "#000000",
  Renault: "#FFCE00",
  Citroën: "#FF6600",
  Fiat: "#CC0000",
  "FIAT": "#CC0000",
  AlfaRomeo: "#CC0000",
  "Alfa Romeo": "#CC0000",
  Lancia: "#003399",
  Volvo: "#003399",
  Saab: "#004B8D",
  Jaguar: "#CC0000",
  LandRover: "#009900",
  "Land Rover": "#009900",
  Rover: "#004B8D",
  MINI: "#000000",
  "Mini": "#000000",
  RollsRoyce: "#000000",
  "Rolls-Royce": "#000000",
  Bentley: "#000000",
  AstonMartin: "#003399",
  "Aston Martin": "#003399",
  McLaren: "#FF6600",
  Lamborghini: "#DDDB00",
  Ferrari: "#FF0000",
  Maserati: "#003399",
  Lotus: "#FF6600",
  Maybach: "#000000",
  
  // Electric/New brands
  Leapmotor: "#003399",
  DENZA: "#003399",
  AION: "#003399",
  Aiqar: "#003399",
  ORA: "#003399",
  iCar: "#003399",
  IM: "#003399",
  VOYAH: "#003399",
  ZEEKR: "#003399",
  Xiaomi: "#FF6600",
  Bestune: "#003399",
  Forthing: "#003399",
  Soueast: "#003399",
  Skywell: "#003399",
  Seres: "#003399",
  Aiways: "#003399",
  Weltmeister: "#003399",
  Enovate: "#003399",
  
  // Khmer/Cambodian brands mentioned
  MG: "#003399",
  "212": "#CC0000",
  AEOLUS: "#003399",
  Baojun: "#003399",
  BAW: "#003399",
  Changhe: "#003399",
  Daewoo: "#003399",
  Dongfeng: "#003399",
  Everest: "#003399",
  GTV: "#003399",
  Hawtai: "#003399",
  HUMMER: "#CC0000",
  Jetour: "#003399",
  MAXUS: "#003399",
  Smart: "#333333",
  VENUCIA: "#003399",
  WULING: "#003399",
  "Other - ផ្សេងៗ": "#6B7280",
  Other: "#6B7280",
};

// Generate initials for brands that don't have specific colors
function getInitials(brand: string): string {
  const specialCases: Record<string, string> = {
    "Mercedes-Benz": "MB",
    "Land Rover": "LR",
    "Rolls-Royce": "RR",
    "Aston Martin": "AM",
    "Alfa Romeo": "AR",
    "Great Wall": "GW",
    "Hongqi": "HQ",
    "SsangYong": "SY",
    "212": "212",
    "MG": "MG",
    "GWM": "GWM",
    "GAC": "GAC",
    "JAC": "JAC",
    "JMC": "JMC",
    "MAXUS": "MX",
    "BYD": "BYD",
    "BAIC": "BAIC",
    "CHANGAN": "CA",
    "LEAPMOTOR": "LM",
    "DENZA": "DZ",
    "AVATR": "AV",
    "AITO": "AI",
    "XPENG": "XP",
    "NIO": "NIO",
    "LI": "LI",
    "ORA": "ORA",
    "ZEEKR": "ZK",
    "IM": "IM",
    "VOYAH": "VY",
    "WULING": "WL",
    "SOUEAST": "SE",
    "FORTHING": "FT",
    "BESTUNE": "BT",
    "AEOLUS": "AE",
    "AION": "AI",
    "AIQAR": "AQ",
    "JETOUR": "JT",
    "VENUCIA": "VN",
    "GTV": "GTV",
    "iCar": "IC",
  };
  
  if (specialCases[brand]) {
    return specialCases[brand];
  }
  
  const words = brand.split(/\s+/);
  if (words.length === 1) {
    return brand.substring(0, 2).toUpperCase();
  }
  return words.map(w => w[0]).join("").substring(0, 2).toUpperCase();
}

function getBrandColor(brand: string): string {
  if (BRAND_COLORS[brand]) {
    return BRAND_COLORS[brand];
  }
  
  const lowerBrand = brand.toLowerCase();
  for (const [key, value] of Object.entries(BRAND_COLORS)) {
    if (key.toLowerCase() === lowerBrand) {
      return value;
    }
  }
  
  let hash = 0;
  for (let i = 0; i < brand.length; i++) {
    hash = brand.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 45%)`;
}

type BrandLogoProps = SVGProps<SVGSVGElement> & {
  brand: string;
  size?: "sm" | "md" | "lg" | "xl";
};

const sizeConfig = {
  sm: { width: 24, height: 24, fontSize: 10 },
  md: { width: 32, height: 32, fontSize: 12 },
  lg: { width: 48, height: 48, fontSize: 18 },
  xl: { width: 64, height: 64, fontSize: 24 },
};

export function getBrandLogoProps(brand: string) {
  const color = getBrandColor(brand);
  return { color, initials: getInitials(brand) };
}

export default function BrandLogo({ brand, size = "md", style, ...props }: BrandLogoProps) {
  const { width, height, fontSize } = sizeConfig[size];
  const { color, initials } = getBrandLogoProps(brand);
  
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={`${brand} logo`}
      width={width}
      height={height}
      style={{ flexShrink: 0, ...style }}
      {...props}
    >
      <circle cx="32" cy="32" r="30" fill={color} opacity="0.1" />
      <circle cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="2" opacity="0.3" />
      <text
        x="32"
        y="38"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color}
        fontSize={fontSize}
        fontWeight="bold"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {initials}
      </text>
    </svg>
  );
}

