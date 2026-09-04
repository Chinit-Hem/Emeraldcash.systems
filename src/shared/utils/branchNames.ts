import type { Language } from "@/shared/utils/i18n";

export function normalizeCompanyBranch(value: string) {
  const normalized = value.normalize("NFKC").toLocaleLowerCase().replace(/[\s\u200B-\u200D\uFEFF_-]+/gu, "");
  if (normalized === "ss" || normalized.includes("sensok") || normalized.includes("សែនសុខ")) return "sen-sok";
  if (normalized === "bkk" || normalized.includes("boeungkengkang") || normalized.includes("បឹងកេងកង")) return "bkk";
  return normalized;
}

export function companyBranchName(value: string, language: Language) {
  const branch = normalizeCompanyBranch(value);
  if (branch === "sen-sok") return language === "km" ? "សាខាសែន សុខ" : "Sen Sok Branch";
  if (branch === "bkk") return language === "km" ? "សាខាបឹងកេងកង" : "Boeung Keng Kang";
  return value.trim();
}

export function companyBranchListName(value: string, language: Language) {
  return value.split(/[,;|\n]+/u).map((branch) => companyBranchName(branch, language)).filter(Boolean).join(", ");
}

export const COMPANY_BRANCH_OPTIONS = ["Sen Sok Branch", "Boeung Keng Kang"] as const;
