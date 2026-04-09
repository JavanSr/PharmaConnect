import { notFound } from "next/navigation";
import { updateProductAction } from "@/actions/inventory";
import { ProductForm } from "@/components/forms/product-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/auth";
import { getProductById } from "@/lib/data";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const product = await getProductById(user, id);

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit inventory item" description="Update stock details, pricing, supplier information, and alert thresholds." />
      <ProductForm action={updateProductAction.bind(null, product.id)} product={product} submitLabel="Save changes" />
    </div>
  );
}
