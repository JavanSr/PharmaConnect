import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePharmacyStore } from '@/stores/pharmacyStore';

export const WholesaleSettingsPage: React.FC = () => {
  const pharmacy = usePharmacyStore((state) => state.pharmacy);

  return (
    <div className="space-y-6">
      <Card>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#1A6B5C]">Wholesale Settings</p>
          <h2 className="text-2xl font-semibold text-[#0D4035]">Wholesale controls stay separate, data stays shared.</h2>
          <p className="max-w-3xl text-sm text-[#4B5563]">
            This outlet is using the same login, team directory, subscriptions, and product records as the retail workspace. Wholesale-only controls live here so order operations can evolve without duplicating core platform data.
          </p>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold text-[#0D4035]">Current outlet</p>
          <p className="mt-2 text-lg font-semibold text-[#0D4035]">{pharmacy?.name ?? 'Active wholesale outlet'}</p>
          <p className="mt-1 text-sm text-[#64748B]">{pharmacy?.subscriptionTier ?? 'WHOLESALE'} tier</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-[#0D4035]">Shared team controls</p>
          <p className="mt-2 text-sm text-[#64748B]">Invite and manage wholesale staff from the shared team directory so audit trails remain unified.</p>
          <Link to="/settings/team" className="mt-4 inline-block">
            <Button variant="secondary" size="sm">Open team settings</Button>
          </Link>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-[#0D4035]">Shared subscription</p>
          <p className="mt-2 text-sm text-[#64748B]">Wholesale billing, hybrid enablement, and outlet tier changes still come from the main subscription workspace.</p>
          <Link to="/settings/subscription" className="mt-4 inline-block">
            <Button variant="secondary" size="sm">Open subscription</Button>
          </Link>
        </Card>
      </div>

      <Card header={<h3 className="text-lg font-semibold text-[#0D4035]">Wholesale operations scope</h3>}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#D6F0E8] bg-[#F7FCFA] p-4">
            <p className="text-sm font-semibold text-[#0D4035]">Managed here</p>
            <ul className="mt-3 space-y-2 text-sm text-[#4B5563]">
              <li>Catalogue pricing and buyer-facing order rules</li>
              <li>Credit exposure, payment terms, and receivables aging</li>
              <li>Delivery scheduling and invoice follow-up</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-[#D6F0E8] bg-[#F7FCFA] p-4">
            <p className="text-sm font-semibold text-[#0D4035]">Shared platform services</p>
            <ul className="mt-3 space-y-2 text-sm text-[#4B5563]">
              <li>Auth, role checks, and multi-outlet selection</li>
              <li>Products, users, and marketplace data</li>
              <li>Audit logs, sync, and subscription entitlements</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};
