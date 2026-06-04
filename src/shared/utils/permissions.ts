import { DEFAULT_ROLE_PERMISSIONS, type Permission, type Role } from "@/shared/types/types";

export function hasAppPermission(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  return DEFAULT_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
