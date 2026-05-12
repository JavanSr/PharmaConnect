import Link from "next/link";
import { ArrowRightLeft, Plus } from "lucide-react";
import { archiveProductAction, createStockMovementAction } from "@/actions/inventory";
import { StockMovementForm } from "@/components/forms/stock-movement-form";
import { EmptyState } from "@/components/shared/empty-state";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { inventoryCategories } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { getInventoryData } from "@/lib/data";
import { canDispenseStock, canManageInventory, canReceiveStock } from "@/lib/permissions";
import { formatLongDate, formatMoney, getProductHealth } from "@/lib/utils";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const canManage = canManageInventory(user.role);
  const canReceiveMovement = canReceiveStock(user.role);
  const canLogMovement = canReceiveMovement || canDispenseStock(user.role);
  const data = await getInventoryData(user, params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory management"
        description="Track medicines, stock position, expiry windows, and movement history for the active pharmacy."
        actions={
          canManage ? (
            <Link href="/inventory/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add product
              </Button>
            </Link>
          ) : undefined
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total items" value={data.summary.totalItems} helper="Active products currently tracked" />
        <MetricCard label="Low stock" value={data.summary.lowStockItems} helper="Products at or below reorder level" />
        <MetricCard label="Expiring soon" value={data.summary.expiringSoon} helper="Within the configured expiry warning window" />
        <MetricCard label="Out of stock" value={data.summary.outOfStock} helper="Items needing immediate replenishment" />
      </section>

      <Card>
        <form className="grid gap-4 lg:grid-cols-[1.3fr_180px_220px_auto]">
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search by product, generic name, supplier, or batch" />
          <Select name="status" defaultValue={params.status ?? "all"}>
            <option value="all">All statuses</option>
            <option value="low">Low stock</option>
            <option value="expiring">Expiring soon</option>
            <option value="out">Out of stock</option>
          </Select>
          <Select name="category" defaultValue={params.category ?? ""}>
            <option value="">All categories</option>
            {inventoryCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            Apply filters
          </Button>
        </form>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden p-0">
          {data.products.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No matching products"
                description="Adjust the filters or add the first medicine to start stock tracking."
                actionLabel={canManage ? "Add product" : undefined}
                actionHref={canManage ? "/inventory/new" : undefined}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--color-soft)] text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-medium">Product</th>
                    <th className="px-5 py-4 font-medium">Stock</th>
                    <th className="px-5 py-4 font-medium">Pricing</th>
                    <th className="px-5 py-4 font-medium">Expiry</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                    <th className="px-5 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((product) => (
                    <tr key={product.id} className="border-t border-[var(--color-border)]">
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-1">
                          <p className="font-semibold text-[var(--color-ink)]">{product.productName}</p>
                          <p className="text-slate-500">
                            {product.genericName || product.brandName || product.category}
                          </p>
                          <p className="text-xs text-slate-400">
                            {product.batchNumber} • {product.supplier}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-[var(--color-ink)]">{product.quantity}</p>
                        <p className="text-slate-500">Reorder at {product.reorderLevel}</p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-[var(--color-ink)]">{formatMoney(product.sellingPrice)}</p>
                        <p className="text-slate-500">Cost {formatMoney(product.costPrice)}</p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-[var(--color-ink)]">{formatLongDate(product.expiryDate)}</p>
                        <p className="text-slate-500">Updated {formatLongDate(product.updatedAt)}</p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <StatusBadge status={getProductHealth(product)} />
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          {canManage ? (
                            <>
                              <Link href={`/inventory/${product.id}/edit`}>
                                <Button variant="secondary">Edit</Button>
                              </Link>
                              <form action={archiveProductAction.bind(null, product.id)}>
                                <Button type="submit" variant="ghost">
                                  Archive
                                </Button>
                              </form>
                            </>
                          ) : (
                            <span className="text-slate-400">View only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          {canLogMovement ? (
            <StockMovementForm
              action={createStockMovementAction}
              products={data.productOptions}
              canReceiveStock={canReceiveMovement}
            />
          ) : null}

          <Card className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-soft)] text-[var(--color-accent)]">
                <ArrowRightLeft className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-ink)]">Recent movement log</h3>
                <p className="text-sm text-slate-500">Latest inventory events for audit visibility.</p>
              </div>
            </div>
            <div className="space-y-3">
              {data.movements.map((movement) => (
                <div key={movement.id} className="rounded-3xl bg-[var(--color-soft)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[var(--color-ink)]">{movement.product.productName}</p>
                    <StatusBadge status={movement.movementType} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Qty {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity} by {movement.createdBy.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{formatLongDate(movement.createdAt)}</p>
                  {movement.note ? <p className="mt-2 text-sm text-slate-500">{movement.note}</p> : null}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
