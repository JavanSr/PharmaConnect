import { MovementType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type StockMovementFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  products: Array<{ id: string; name: string; quantity: number }>;
  canReceiveStock: boolean;
};

export function StockMovementForm({ action, products, canReceiveStock }: StockMovementFormProps) {
  return (
    <Card className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-ink)]">Log stock movement</h3>
        <p className="text-sm text-slate-500">
          Record dispensing movements, or receive and adjust stock when your role allows it.
        </p>
      </div>
      <form action={action} className="grid gap-4">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Product</span>
          <Select name="productId" required defaultValue="">
            <option value="" disabled>
              Select a product
            </option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.quantity} in stock)
              </option>
            ))}
          </Select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Movement type</span>
            <Select name="movementType" defaultValue={canReceiveStock ? MovementType.IN : MovementType.OUT} required>
              {canReceiveStock ? <option value={MovementType.IN}>Stock in</option> : null}
              <option value={MovementType.OUT}>Stock out</option>
              {canReceiveStock ? <option value={MovementType.ADJUSTMENT}>Stock adjustment</option> : null}
            </Select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Quantity</span>
            <Input name="quantity" type="number" min="1" defaultValue={1} required />
          </label>
        </div>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Note</span>
          <Textarea
            name="note"
            className="min-h-24"
            placeholder="Optional note, supplier delivery, dispensing reason, or count correction."
          />
        </label>
        <Button type="submit" className="justify-self-start">
          Save movement
        </Button>
      </form>
    </Card>
  );
}
