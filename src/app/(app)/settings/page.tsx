import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { appConfig, roleLabels } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { getAppSettingsData, getPilotNetwork } from "@/lib/data";

export default async function SettingsPage() {
  const user = await requireUser();
  const [settings, pilotNetwork] = await Promise.all([getAppSettingsData(user), getPilotNetwork()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="A light operational settings surface for the MVP, including pilot scope, user roles, and alert defaults."
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">Pharmacy profile</h3>
            <p className="text-sm text-slate-500">Current pharmacy context for the signed-in user.</p>
          </div>
          <div className="grid gap-3 text-sm text-slate-600">
            <p>
              <span className="font-semibold text-[var(--color-ink)]">Name:</span> {settings.pharmacy?.name}
            </p>
            <p>
              <span className="font-semibold text-[var(--color-ink)]">Region:</span> {settings.pharmacy?.region}
            </p>
            <p>
              <span className="font-semibold text-[var(--color-ink)]">District:</span> {settings.pharmacy?.district}
            </p>
            <p>
              <span className="font-semibold text-[var(--color-ink)]">Expiry warning:</span> {settings.expiryWarningDays} days
            </p>
            <p>
              <span className="font-semibold text-[var(--color-ink)]">Support:</span> {appConfig.supportEmail}
            </p>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">Role-aware access</h3>
            <p className="text-sm text-slate-500">MVP permissions are intentionally simple but extendable.</p>
          </div>
          <div className="space-y-3">
            {settings.users.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-2xl bg-[var(--color-soft)] p-4">
                <div>
                  <p className="font-semibold text-[var(--color-ink)]">{member.name}</p>
                  <p className="text-sm text-slate-500">{member.email}</p>
                </div>
                <Badge tone="info">{roleLabels[member.role]}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-ink)]">Arusha pilot network</h3>
          <p className="text-sm text-slate-500">Seeded demo pharmacies representing the initial 10-site pilot footprint.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pilotNetwork.map((pharmacy) => (
            <div key={pharmacy.id} className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-soft)] p-4">
              <p className="font-semibold text-[var(--color-ink)]">{pharmacy.name}</p>
              <p className="mt-1 text-sm text-slate-500">
                {pharmacy.district}, {pharmacy.region}
              </p>
              <p className="mt-2 text-sm text-slate-500">{pharmacy.phone}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
