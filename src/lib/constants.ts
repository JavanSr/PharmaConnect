import type { LucideIcon } from "lucide-react";
import {
  BookOpenText,
  Gauge,
  LayoutDashboard,
  Package2,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { ArticleCategory, UserRole } from "@prisma/client";

export const appConfig = {
  name: "PharmaConnect",
  region: "Arusha Pilot, Tanzania",
  supportEmail: "hello@pharmaconnect.tz",
  expiryWarningDays: Number(process.env.EXPIRY_WARNING_DAYS ?? 60),
};

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  comingSoon?: boolean;
};

export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Inventory", href: "/inventory", icon: Package2 },
  { title: "Knowledge Hub", href: "/knowledge-hub", icon: BookOpenText },
  { title: "Compliance Tracker", href: "/compliance", icon: ShieldCheck },
  { title: "Analytics", href: "/analytics", icon: Gauge },
  { title: "Patient Management", href: "/patients", icon: UserRound, comingSoon: true },
  { title: "Drug Safety Checker", href: "/drug-safety", icon: Stethoscope, comingSoon: true },
  { title: "Settings", href: "/settings", icon: Settings },
];

export const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  PHARMACY_ADMIN: "Pharmacy Admin",
  STAFF: "Pharmacist / Staff",
};

export const articleCategoryLabels: Record<ArticleCategory, string> = {
  REGULATORY_UPDATES: "Regulatory updates",
  PHARMACY_PRACTICE: "Pharmacy practice",
  MEDICINE_SAFETY: "Medicine safety",
  BUSINESS_TIPS: "Business tips",
};

export const articleCategoryOptions = Object.entries(articleCategoryLabels).map(([value, label]) => ({
  value,
  label,
}));

export const complianceCategoryOptions = [
  "Pharmacy license",
  "Pharmacist registration",
  "Premises permit",
  "Inspection readiness",
  "Controlled drug documentation",
];

export const inventoryCategories = [
  "Analgesics",
  "Antibiotics",
  "Allergy Relief",
  "Diabetes Care",
  "Paediatrics",
  "Respiratory",
  "Supplements",
  "General Medicines",
];

export const comingSoonModules = [
  {
    title: "Patient Management",
    href: "/patients",
    description:
      "Patient Management will support medication history, refill workflows, and stronger continuity of care.",
  },
  {
    title: "Drug Safety Checker",
    href: "/drug-safety",
    description:
      "Drug Safety Checker will improve patient protection through interaction, allergy, and contraindication alerts.",
  },
];
