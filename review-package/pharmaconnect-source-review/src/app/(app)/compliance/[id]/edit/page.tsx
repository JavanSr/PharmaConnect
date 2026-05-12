import { notFound } from "next/navigation";
import { updateComplianceItemAction } from "@/actions/compliance";
import { ComplianceForm } from "@/components/forms/compliance-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/auth";
import { getComplianceItemById } from "@/lib/data";

export default async function EditCompliancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const item = await getComplianceItemById(user, id);

  if (!item) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit compliance item" description="Adjust renewal timing, reminder dates, and inspection notes." />
      <ComplianceForm action={updateComplianceItemAction.bind(null, item.id)} item={item} submitLabel="Save item" />
    </div>
  );
}
