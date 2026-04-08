import { createComplianceItemAction } from "@/actions/compliance";
import { ComplianceForm } from "@/components/forms/compliance-form";
import { PageHeader } from "@/components/shared/page-header";

export default function NewCompliancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add compliance item"
        description="Create a deadline for renewal, inspection preparation, or required regulatory documentation."
      />
      <ComplianceForm action={createComplianceItemAction} submitLabel="Create item" />
    </div>
  );
}
