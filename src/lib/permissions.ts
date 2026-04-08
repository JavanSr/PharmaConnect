import { UserRole } from "@prisma/client";

export function canManageInventory(role: UserRole) {
  return role === UserRole.SUPER_ADMIN || role === UserRole.PHARMACY_ADMIN;
}

export function canReceiveStock(role: UserRole) {
  return role === UserRole.SUPER_ADMIN || role === UserRole.PHARMACY_ADMIN;
}

export function canDispenseStock(role: UserRole) {
  return role === UserRole.SUPER_ADMIN || role === UserRole.PHARMACY_ADMIN || role === UserRole.STAFF;
}

export function canManageArticles(role: UserRole) {
  return role === UserRole.SUPER_ADMIN || role === UserRole.PHARMACY_ADMIN;
}

export function canManageCompliance(role: UserRole) {
  return role === UserRole.SUPER_ADMIN || role === UserRole.PHARMACY_ADMIN;
}
