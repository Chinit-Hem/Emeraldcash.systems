import type { Role } from "@/shared/types/types";

export type Permission = "read" | "create" | "update" | "delete" | "admin";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  Admin: ["read", "create", "update", "delete", "admin"],
  Staff: ["read", "create", "update"],
  "Loan Operations": ["read", "create", "update"],
  "Manager / Approver": ["read", "create", "update"],
  Finance: ["read", "create", "update"],
  "Human Resources": ["read", "create", "update"],
  "IT Support": ["read", "update"],
  "Risk & Compliance": ["read"],
  Marketing: ["read"],
  "Intern / Read Only": ["read"],
  "Executive Viewer": ["read"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canDelete(role: Role): boolean {
  return hasPermission(role, "delete");
}

export function canModify(role: Role): boolean {
  return hasPermission(role, "update");
}

export function isAdmin(role: Role): boolean {
  return role === "Admin";
}

export function requireAdmin(session: { role: Role } | null): boolean {
  if (!session || session.role !== "Admin") {
    return false;
  }
  return true;
}
