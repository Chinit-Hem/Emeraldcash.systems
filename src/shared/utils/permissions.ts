import { DEFAULT_ROLE_PERMISSIONS, type Permission, type Role } from "@/shared/types/types";

export function hasAppPermission(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  const legacyRoleMap: Record<string, string> = {
    
    "loan officer": "Loan Operations", "collateral checker": "Loan Operations", bm: "Manager / Approver", "credit manager": "Manager / Approver",
    accounting: "Finance", "finance manager": "Finance", "it executive (support and systems)": "IT Support", risk: "Risk & Compliance", "risk officer": "Risk & Compliance", "digital marketing": "Marketing", intern: "Intern / Read Only", ceo: "Executive Viewer",
  };
  const normalizedRole = legacyRoleMap[role.toLowerCase()] || role;
  const key = Object.keys(DEFAULT_ROLE_PERMISSIONS).find((candidate) => candidate.toLowerCase() === normalizedRole.toLowerCase());
  return key ? DEFAULT_ROLE_PERMISSIONS[key]?.includes(permission) ?? false : false;
}
