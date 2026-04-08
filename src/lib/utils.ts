import { ComplianceStatus, type ComplianceItem, type Product } from "@prisma/client";
import { clsx, type ClassValue } from "clsx";
import { addDays, formatDistanceToNowStrict, isBefore, isWithinInterval, startOfDay } from "date-fns";
import { appConfig } from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatMoney(value: number | string) {
  return new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function isLowStock(product: Pick<Product, "quantity" | "reorderLevel">) {
  return product.quantity <= product.reorderLevel;
}

export function isOutOfStock(product: Pick<Product, "quantity">) {
  return product.quantity <= 0;
}

export function isNearExpiry(product: Pick<Product, "expiryDate">, days = appConfig.expiryWarningDays) {
  const today = startOfDay(new Date());
  return isWithinInterval(product.expiryDate, {
    start: today,
    end: addDays(today, days),
  });
}

export function getExpiryTier(
  product: Pick<Product, "expiryDate">,
): "critical" | "warning" | "watch" | "ok" | "expired" {
  const today = startOfDay(new Date());
  const days = Math.ceil((product.expiryDate.getTime() - today.getTime()) / 86400000);

  if (days < 0) return "expired";
  if (days <= 1) return "critical";
  if (days <= 7) return "warning";
  if (days <= 30) return "watch";
  return "ok";
}

export function isExpired(product: Pick<Product, "expiryDate">) {
  return isBefore(product.expiryDate, startOfDay(new Date()));
}

export function getProductHealth(product: Pick<Product, "quantity" | "reorderLevel" | "expiryDate">) {
  if (isOutOfStock(product)) return "out";
  const expiryTier = getExpiryTier(product);
  if (expiryTier !== "ok") return expiryTier;
  if (isLowStock(product)) return "low";
  return "healthy";
}

export function getEffectiveComplianceStatus(
  item: Pick<ComplianceItem, "deadlineDate" | "status">,
): ComplianceStatus {
  if (item.status === ComplianceStatus.COMPLETED) {
    return ComplianceStatus.COMPLETED;
  }

  return isBefore(item.deadlineDate, startOfDay(new Date()))
    ? ComplianceStatus.OVERDUE
    : ComplianceStatus.PENDING;
}

export function getDeadlineLabel(date: Date) {
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

export function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("en-TZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
