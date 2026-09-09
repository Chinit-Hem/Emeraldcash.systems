"use client";

import { usePathname, useSearchParams } from "next/navigation";

export const ERP_SYSTEM_IDS = ["vehicle-management", "learning-center", "asset-inventory", "loan-management", "human-resources"];

export function getSystemForPath(pathname: string): string | null {
  if (/^\/(vms|vehicles|stock[^/]*|cleaned-vehicles)(\/|$)/.test(pathname)) return "vehicle-management";
  if (/^\/(lms|admin\/lms)(\/|$)/.test(pathname)) return "learning-center";
  if (/^\/sms(\/|$)/.test(pathname)) return "asset-inventory";
  if (/^\/loan(\/|$)/.test(pathname)) return "loan-management";
  if (/^\/hr(\/|$)/.test(pathname)) return "human-resources";
  return null;
}

export function useSelectedSystem() {
  const pathname = usePathname() ?? "/home";
  const searchParams = useSearchParams();
  if (["/", "/home", "/system-hub"].includes(pathname)) {
    const selected = searchParams.get("system");
    return selected && ERP_SYSTEM_IDS.includes(selected) ? selected : null;
  }
  return getSystemForPath(pathname);
}
