import type { LucideIcon } from "lucide-react";

export type SidebarMode = "desktop" | "drawer";

export type SidebarNavigationItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: string;
  children?: SidebarNavigationItem[];
};

export type SidebarNavigationGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: SidebarNavigationItem[];
};
