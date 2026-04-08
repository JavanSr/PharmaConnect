import { ComplianceStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({
  status,
}: {
  status: string | ComplianceStatus;
}) {
  const normalized = String(status).toLowerCase();

  if (normalized === "critical") {
    return (
      <Badge tone="danger" className="animate-pulse bg-red-100 text-red-700">
        CRITICAL
      </Badge>
    );
  }

  if (normalized === "warning") {
    return <Badge tone="warning">WARNING</Badge>;
  }

  if (normalized === "watch") {
    return <Badge tone="info">WATCH</Badge>;
  }

  if (normalized.includes("completed") || normalized.includes("published") || normalized.includes("healthy")) {
    return <Badge tone="success">{labelize(status)}</Badge>;
  }

  if (normalized.includes("overdue") || normalized.includes("expired") || normalized.includes("out")) {
    return <Badge tone="danger">{labelize(status)}</Badge>;
  }

  if (normalized.includes("low") || normalized.includes("expiring") || normalized.includes("draft")) {
    return <Badge tone="warning">{labelize(status)}</Badge>;
  }

  return <Badge tone="info">{labelize(status)}</Badge>;
}

function labelize(value: string | ComplianceStatus) {
  return String(value).replaceAll("_", " ");
}
