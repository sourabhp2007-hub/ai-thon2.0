import { FilePlus2, Files, LayoutDashboard, Library, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  /** Short label for the mobile bottom bar. */
  mobileLabel: string;
  href: string;
  icon: LucideIcon;
  /** Path prefixes that mark this item active. */
  match: string[];
}

export const PRIMARY_NAV: NavItem[] = [
  { label: "Dashboard", mobileLabel: "Dashboard", href: "/dashboard", icon: LayoutDashboard, match: ["/dashboard"] },
  { label: "New Verification", mobileLabel: "Verify", href: "/verify/new", icon: FilePlus2, match: ["/verify"] },
  { label: "Reports", mobileLabel: "Reports", href: "/reports", icon: Files, match: ["/reports"] },
  { label: "Sources", mobileLabel: "Sources", href: "/sources", icon: Library, match: ["/sources"] },
];

export const SETTINGS_NAV: NavItem = {
  label: "Settings",
  mobileLabel: "Settings",
  href: "/settings",
  icon: Settings,
  match: ["/settings"],
};

export function isActive(item: NavItem, pathname: string) {
  return item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}
