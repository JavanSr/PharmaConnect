import type { ReactNode } from "react";
import { Product } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { inventoryCategories } from "@/lib/constants";

type ProductFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  product?: Product | null;
  submitLabel: string;
};

export function ProductForm({ action, product, submitLabel }: ProductFormProps) {
  return (
    <Card>
      <form action={action} className="grid gap-5 lg:grid-cols-2">
        <Field label="Product name">
          <Input name="productName" defaultValue={product?.productName ?? ""} required />
        </Field>
        <Field label="Generic name">
          <Input name="genericName" defaultValue={product?.genericName ?? ""} />
        </Field>
        <Field label="Brand name">
          <Input name="brandName" defaultValue={product?.brandName ?? ""} />
        </Field>
        <Field label="Category">
          <Select name="category" defaultValue={product?.category ?? inventoryCategories[0]} required>
            {inventoryCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Supplier">
          <Input name="supplier" defaultValue={product?.supplier ?? ""} required />
        </Field>
        <Field label="Batch number">
          <Input name="batchNumber" defaultValue={product?.batchNumber ?? ""} required />
        </Field>
        <Field label="Quantity in stock">
          <Input name="quantity" type="number" min="0" defaultValue={product?.quantity ?? 0} required />
        </Field>
        <Field label="Reorder level">
          <Input
            name="reorderLevel"
            type="number"
            min="0"
            defaultValue={product?.reorderLevel ?? 10}
            required
          />
        </Field>
        <Field label="Cost price (TZS)">
          <Input
            name="costPrice"
            type="number"
            min="0"
            step="100"
            defaultValue={product?.costPrice ?? 0}
            required
          />
        </Field>
        <Field label="Selling price (TZS)">
          <Input
            name="sellingPrice"
            type="number"
            min="0"
            step="100"
            defaultValue={product?.sellingPrice ?? 0}
            required
          />
        </Field>
        <Field label="Expiry date">
          <Input
            name="expiryDate"
            type="date"
            defaultValue={product?.expiryDate ? product.expiryDate.toISOString().slice(0, 10) : ""}
            required
          />
        </Field>
        <div className="rounded-3xl bg-[var(--color-soft)] p-5">
          <p className="text-sm font-semibold text-[var(--color-ink)]">Inventory note</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This MVP uses batch-level stock counts with low-stock and expiry alerts to keep operations lightweight for the
            Arusha pilot.
          </p>
        </div>
        <div className="lg:col-span-2 flex items-center justify-end gap-3">
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
