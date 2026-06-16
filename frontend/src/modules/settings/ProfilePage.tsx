import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/stores/authStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { SettingsNav } from './SettingsNav';

export const ProfilePage: React.FC = () => {
  const user = useAuthStore(s => s.user);
  const pharmacy = usePharmacyStore(s => s.pharmacy);
  const memberships = usePharmacyStore(s => s.memberships);
  const canManageSubscription = ['OWNER', 'SUPER_ADMIN'].includes(user?.role || '');

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-bold text-[#0D4035]">Profile</h1>
      <SettingsNav />

      <Card header={<span className="text-sm font-semibold text-[#0D4035]">Account Information</span>}>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-[#1A6B5C] text-white flex items-center justify-center text-xl font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <p className="text-base font-semibold text-[#0D4035]">{user?.firstName} {user?.lastName}</p>
            <p className="text-sm text-[#64748B]">{user?.email}</p>
            <Badge variant="info" className="mt-1">{user?.role?.replace(/_/g, ' ')}</Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'First Name', value: user?.firstName },
            { label: 'Last Name', value: user?.lastName },
            { label: 'Email', value: user?.email },
            { label: 'PC Registration', value: user?.pcRegistrationNumber || '—' },
            { label: 'Pharmacy', value: pharmacy?.name || '—' },
            { label: 'Region', value: pharmacy?.region || '—' },
          ].map(f => (
            <div key={f.label}>
              <p className="text-xs text-[#64748B] mb-0.5">{f.label}</p>
              <p className="text-sm font-medium text-[#0D4035]">{f.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {memberships.length > 1 && (
        <Card header={<span className="text-sm font-semibold text-[#0D4035]">Your Pharmacies</span>} padding={false}>
          <div className="divide-y divide-[#D6F0E8]">
            {memberships.map(m => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-[#0D4035]">{m.pharmacy?.name ?? m.pharmacyId}</p>
                  <p className="text-xs text-[#64748B]">{m.pharmacy?.region ?? ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="info" size="sm">{m.role.replace(/_/g, ' ')}</Badge>
                  {m.pharmacyId === pharmacy?.id && <Badge variant="success" size="sm">Active</Badge>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {canManageSubscription && (
        <Card header={<span className="text-sm font-semibold text-[#0D4035]">Subscription</span>}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[#0D4035]">
                {pharmacy?.subscriptionTier || 'STANDARD'} plan
              </p>
              <p className="text-sm text-[#64748B]">
                Review trial status, pricing, and upgrade options.
              </p>
            </div>
            <Link to="/settings/subscription">
              <Button variant="secondary">Manage subscription</Button>
            </Link>
          </div>
        </Card>
      )}

      <div className="rounded-2xl border border-[#D6F0E8] bg-[#EDF7F3] px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#0D4035]">Password & Security</p>
          <p className="text-xs text-[#64748B] mt-0.5">Change your password or manage your dispensing PIN.</p>
        </div>
        <Link to="/settings/security">
          <Button variant="secondary" size="sm">Security settings</Button>
        </Link>
      </div>
    </div>
  );
};
