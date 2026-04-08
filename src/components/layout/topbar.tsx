import { Bell, Building2 } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { roleLabels } from "@/lib/constants";

type TopbarProps = {
  userName: string;
  role: keyof typeof roleLabels;
  pharmacyName?: string | null;
  pharmacyDistrict?: string | null;
};

export function Topbar({ userName, role, pharmacyName, pharmacyDistrict }: TopbarProps) {
  return (
    <div className="flex flex-col gap-4 rounded-[28px] border border-[var(--color-border)] bg-white px-5 py-4 shadow-[0_16px_40px_rgba(9,34,44,0.06)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-soft)] text-[var(--color-accent)]">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">Active pharmacy</p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">{pharmacyName ?? "Pilot workspace"}</h2>
            {pharmacyDistrict ? <Badge tone="info">{pharmacyDistrict}</Badge> : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-soft)] px-4 py-3">
          <Bell className="h-4 w-4 text-[var(--color-accent)]" />
          <div className="text-sm">
            <p className="font-semibold text-[var(--color-ink)]">{userName}</p>
            <p className="text-slate-500">{roleLabels[role]}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <Button variant="secondary" type="submit">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
