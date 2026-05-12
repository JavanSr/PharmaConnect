import { createProductAction } from "@/actions/inventory";
import { ProductForm } from "@/components/forms/product-form";
import { PageHeader } from "@/components/shared/page-header";

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add medicine or product"
        description="Create a new stock item with the operational fields required for the pilot pharmacies."
      />
      <ProductForm action={createProductAction} submitLabel="Create product" />
    </div>
  );
}
