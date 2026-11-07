import {
  BarChart3,
  Building2,
  CreditCard,
  FileText,
  Home,
  Settings,
  Shield,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
export type CanRead = (resource: string) => boolean;
export const workspaceGroups = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    tabs: [
      { path: "/dashboard", label: "Home", icon: Home, resource: "dashboard" },
    ],
    matches: ["/dashboard"],
  },
  {
    id: "properties",
    label: "Properties",
    icon: Building2,
    tabs: [
      {
        path: "/properties",
        label: "Properties & units",
        icon: Building2,
        resource: "properties",
      },
      {
        path: "/maintenance",
        label: "Maintenance",
        icon: Wrench,
        resource: "expenses",
      },
    ],
    matches: ["/properties", "/units", "/maintenance"],
  },
  {
    id: "leasing",
    label: "Leasing",
    icon: FileText,
    tabs: [
      { path: "/tenants", label: "Tenants", icon: Users, resource: "tenants" },
      {
        path: "/contracts",
        label: "Contracts",
        icon: FileText,
        resource: "contracts",
      },
    ],
    matches: ["/tenants", "/contracts"],
  },
  {
    id: "finance",
    label: "Finance",
    icon: CreditCard,
    tabs: [
      {
        path: "/payments",
        label: "Collections & expenses",
        icon: CreditCard,
        resource: "payments",
      },
      {
        path: "/calculation",
        label: "Meter readings",
        icon: Zap,
        resource: "meters",
      },
    ],
    matches: ["/payments", "/calculation"],
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    tabs: [
      {
        path: "/reports",
        label: "Reports",
        icon: BarChart3,
        resource: "dashboard",
      },
    ],
    matches: ["/reports"],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    tabs: [
      { path: "/settings", label: "Settings", icon: Settings, resource: "" },
    ],
    matches: ["/settings"],
  },
  {
    id: "developer",
    label: "Developer console",
    icon: Shield,
    tabs: [
      {
        path: "/developer",
        label: "Developer console",
        icon: Shield,
        resource: "admin",
      },
    ],
    matches: ["/developer"],
  },
];
export const matchesPath = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(prefix + "/");
export function visibleGroups(can: CanRead, role?: string) {
  return workspaceGroups
    .map((group) => ({
      ...group,
      tabs: group.tabs.filter((tab) =>
        tab.resource === "admin"
          ? role === "super_admin"
          : !tab.resource
            ? true
            : tab.path === "/payments"
              ? can("payments") || can("expenses")
              : can(tab.resource),
      ),
    }))
    .filter((group) => group.tabs.length > 0);
}
