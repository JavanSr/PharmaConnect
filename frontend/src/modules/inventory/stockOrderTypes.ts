import type { Product, Supplier } from '@/types';

export type StockOrderStatus = 'DRAFT' | 'SUBMITTED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
export type StockOrderItemStatus = 'PENDING' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export type StockOrderItem = {
  id: string;
  productId: string | null;
  productName: string;
  genericName: string | null;
  strength: string | null;
  dosageForm: string | null;
  supplierId: string | null;
  supplier?: Pick<Supplier, 'id' | 'name' | 'phone' | 'email'> | null;
  product?: Pick<Product, 'id' | 'name' | 'genericName' | 'brandName' | 'strength' | 'dosageForm'> | null;
  quantityOrdered: number;
  quantityReceived: number;
  expectedUnitCost: number | string | null;
  notes: string | null;
  status: StockOrderItemStatus;
  createdAt: string;
  updatedAt: string;
};

export type StockOrder = {
  id: string;
  orderNumber: string;
  status: StockOrderStatus;
  notes: string | null;
  expectedBy: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
  supplierSummary?: string;
  pharmacy?: { id: string; name: string; address: string; licenceNumber: string };
  createdByUser?: { id: string; firstName: string; lastName: string; email: string };
  items?: StockOrderItem[];
};

export type LowStockSuggestion = {
  id: string;
  name: string;
  genericName: string | null;
  strength: string | null;
  dosageForm: string | null;
  reorderLevel: number;
  currentStock: number;
  lastSupplierId: string | null;
  lastSupplier: Pick<Supplier, 'id' | 'name' | 'phone' | 'email'> | null;
  suggestedOrderQuantity: number;
};

export function statusBadgeVariant(status: StockOrderStatus): 'muted' | 'info' | 'warning' | 'success' | 'danger' {
  if (status === 'DRAFT') return 'muted';
  if (status === 'SUBMITTED') return 'info';
  if (status === 'PARTIALLY_RECEIVED') return 'warning';
  if (status === 'RECEIVED') return 'success';
  return 'danger';
}

export function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

export function groupItemsBySupplier(items: StockOrderItem[]) {
  const groups = new Map<string, { supplier: StockOrderItem['supplier']; items: StockOrderItem[] }>();
  for (const item of items) {
    const key = item.supplierId || 'unassigned';
    if (!groups.has(key)) {
      groups.set(key, { supplier: item.supplier ?? null, items: [] });
    }
    groups.get(key)!.items.push(item);
  }
  return Array.from(groups.entries()).map(([key, group]) => ({
    key,
    supplierName: group.supplier?.name ?? 'No supplier assigned',
    supplier: group.supplier,
    items: group.items,
  }));
}
