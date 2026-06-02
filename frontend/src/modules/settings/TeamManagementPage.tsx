import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, UserPlus, Mail, ShieldCheck, UserX, Users } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAuth } from '@/hooks/useAuth';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { api } from '@/lib/api';
import { SettingsNav } from './SettingsNav';

// ── Role display helpers ──────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  PHARMACIST_IN_CHARGE: 'Pharmacist In-Charge',
  DISPENSER: 'Dispenser',
  CASHIER: 'Cashier',
  DATA_ENTRY_CLERK: 'Data Entry Clerk',
  WHOLESALE_MANAGER: 'Wholesale Manager',
  WHOLESALE_COUNTER_STAFF: 'Counter Staff',
  DELIVERY_STAFF: 'Delivery Staff',
  SUPER_ADMIN: 'Super Admin',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  PHARMACIST_IN_CHARGE: 'Full clinical and operational control. Manages compliance, staff credentials, and clinical overrides. Equivalent to Superintendent Pharmacist.',
  DISPENSER: 'Retail dispensing, stock intake, and patient safety checks at the counter.',
  CASHIER: 'Completes payment on a prepared sale. Cannot initiate dispensing or view stock.',
  DATA_ENTRY_CLERK: 'Stock intake and supplier management only. Cannot dispense or view financial data.',
  WHOLESALE_MANAGER: 'Full wholesale operations — orders, invoicing, credit limits, and delivery.',
  WHOLESALE_COUNTER_STAFF: 'Picking, packing, and delivery confirmation. No pricing or financial access.',
  DELIVERY_STAFF: 'Delivery status updates only.',
};

const ROLE_VARIANT: Record<string, any> = {
  OWNER: 'warning',
  PHARMACIST_IN_CHARGE: 'success',
  DISPENSER: 'info',
  CASHIER: 'info',
  DATA_ENTRY_CLERK: 'muted',
  WHOLESALE_MANAGER: 'warning',
  WHOLESALE_COUNTER_STAFF: 'info',
  DELIVERY_STAFF: 'muted',
  SUPER_ADMIN: 'danger',
};

// ── User limits per tier ──────────────────────────────────────────────────────

const TIER_USER_LIMITS: Record<string, number> = {
  ADDO: 3, BASIC: 5, STANDARD: 10, PREMIUM: 20,
  WHOLESALE: 10, ENTERPRISE: Infinity,
};

// ── Role options filtered by pharmacy type ────────────────────────────────────

function getRoleOptions(pharmacyType: string | null | undefined) {
  const isWholesale = pharmacyType === 'WHOLESALE';
  const retail = [
    { value: 'PHARMACIST_IN_CHARGE', label: 'Pharmacist In-Charge' },
    { value: 'DISPENSER', label: 'Dispenser' },
    { value: 'CASHIER', label: 'Cashier' },
    { value: 'DATA_ENTRY_CLERK', label: 'Data Entry Clerk' },
  ];
  const wholesale = [
    { value: 'WHOLESALE_MANAGER', label: 'Wholesale Manager' },
    { value: 'WHOLESALE_COUNTER_STAFF', label: 'Counter Staff' },
    { value: 'DELIVERY_STAFF', label: 'Delivery Staff' },
  ];
  if (isWholesale) return wholesale;
  return retail;
}

// ── Component ─────────────────────────────────────────────────────────────────

const DISPENSER_SUPPLIER_WRITE_KEY = 'inventory.dispenser_supplier_write';

export const TeamManagementPage: React.FC = () => {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [changeRoleOpen, setChangeRoleOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('DISPENSER');
  const [inviteFirst, setInviteFirst] = useState('');
  const [inviteLast, setInviteLast] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  const [newRole, setNewRole] = useState('');

  const toast = useNotificationStore(s => s.toast);
  const qc = useQueryClient();
  const { hasRole, user: currentUser } = useAuth();
  const pharmacy = usePharmacyStore(s => s.pharmacy);
  const canManage = hasRole(['OWNER', 'SUPER_ADMIN']);

  const roleOptions = getRoleOptions(pharmacy?.pharmacyType);
  const userLimit = TIER_USER_LIMITS[pharmacy?.subscriptionTier ?? ''] ?? 5;

  const { data, isLoading } = useQuery({
    queryKey: ['pharmacy-team'],
    queryFn: () => api.get('/settings/team').then(r => r.data),
  });

  const dispenserSupplierSettingQuery = useQuery({
    queryKey: ['settings-config', DISPENSER_SUPPLIER_WRITE_KEY],
    queryFn: () => api.get(`/settings/config/${DISPENSER_SUPPLIER_WRITE_KEY}`).then(r => r.data),
    enabled: canManage,
  });

  const dispenserSupplierEnabled = (() => {
    const value = dispenserSupplierSettingQuery.data?.data?.value;
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>).enabled !== false
      : true;
  })();

  const dispenserSupplierMutation = useMutation({
    mutationFn: (enabled: boolean) => api.put(`/settings/config/${DISPENSER_SUPPLIER_WRITE_KEY}`, { value: { enabled } }),
    onSuccess: () => {
      toast.success('Dispenser supplier access updated');
      qc.invalidateQueries({ queryKey: ['settings-config', DISPENSER_SUPPLIER_WRITE_KEY] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Could not update supplier access'),
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.post('/settings/team/invite', {
      email: inviteEmail, role: inviteRole,
      firstName: inviteFirst, lastName: inviteLast,
      password: invitePassword, mustChangePassword: true,
      ...(invitePhone ? { phone: invitePhone } : {}),
    }),
    onSuccess: () => {
      toast.success(`${inviteFirst} added — share their temporary password with them`);
      setInviteOpen(false);
      setInviteEmail(''); setInviteFirst(''); setInviteLast('');
      setInviteRole('DISPENSER'); setInvitePassword(''); setInvitePhone('');
      qc.invalidateQueries({ queryKey: ['pharmacy-team'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to add member'),
  });

  const changeRoleMutation = useMutation({
    mutationFn: () => api.patch(`/settings/team/${selectedUser.id}/role`, { role: newRole }),
    onSuccess: () => {
      toast.success('Role updated');
      setChangeRoleOpen(false);
      qc.invalidateQueries({ queryKey: ['pharmacy-team'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to update role'),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => api.patch(`/settings/team/${selectedUser.id}/deactivate`),
    onSuccess: () => {
      toast.success(`${selectedUser.firstName}'s access has been removed`);
      setDeactivateOpen(false);
      qc.invalidateQueries({ queryKey: ['pharmacy-team'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to remove access'),
  });

  const members: any[] = data?.data || [];
  const activeMembers = members.filter(m => m.isActive);
  const atLimit = activeMembers.length >= userLimit;

  const openChangeRole = (member: any) => {
    setSelectedUser(member);
    setNewRole(member.role);
    setChangeRoleOpen(true);
  };

  const openDeactivate = (member: any) => {
    setSelectedUser(member);
    setDeactivateOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <h1 className="text-xl font-bold text-[#0D4035]">Team Management</h1>
          <SettingsNav />
        </div>
        {canManage && (
          <Button
            leftIcon={<UserPlus size={16} />}
            onClick={() => setInviteOpen(true)}
            disabled={atLimit}
            title={atLimit ? `Your plan allows ${userLimit} users. Upgrade to add more.` : undefined}
          >
            Add Member
          </Button>
        )}
      </div>

      {/* User limit banner */}
      {canManage && (
        <div className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm ${
          atLimit
            ? 'bg-amber-50 border border-amber-200 text-amber-800'
            : 'bg-[#EDF7F3] border border-[#D6F0E8] text-[#1A6B5C]'
        }`}>
          <div className="flex items-center gap-2">
            <Users size={15} />
            <span>
              <span className="font-semibold">{activeMembers.length} of {userLimit === Infinity ? 'unlimited' : userLimit}</span> users on your {pharmacy?.subscriptionTier ?? ''} plan
            </span>
          </div>
          {atLimit && (
            <a href="/settings/subscription" className="text-xs font-semibold underline">
              Upgrade plan
            </a>
          )}
        </div>
      )}

      {/* Dispenser supplier access toggle */}
      {canManage && pharmacy?.pharmacyType !== 'WHOLESALE' && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#0D4035]">Dispenser supplier access</p>
              <p className="mt-1 text-sm text-[#64748B]">
                Allow dispensers to add, edit, or remove supplier records. They can always select existing suppliers for stock work.
              </p>
            </div>
            <Button
              variant={dispenserSupplierEnabled ? 'secondary' : 'ghost'}
              loading={dispenserSupplierMutation.isPending || dispenserSupplierSettingQuery.isLoading}
              onClick={() => dispenserSupplierMutation.mutate(!dispenserSupplierEnabled)}
            >
              {dispenserSupplierEnabled ? 'Allowed' : 'Blocked'}
            </Button>
          </div>
        </Card>
      )}

      {/* Member list */}
      <Card padding={false}>
        {isLoading ? (
          <div className="p-8 text-center text-[#64748B]">Loading team...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center">
            <UserPlus size={32} className="mx-auto mb-3 text-[#D6F0E8]" />
            <p className="text-sm font-medium text-[#0D4035]">No team members yet</p>
            <p className="text-xs text-[#64748B] mt-1">Add your first staff member using the button above.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F0F7F4]">
            {members.map(m => (
              <div key={m.id} className={`flex items-center justify-between px-5 py-4 ${!m.isActive ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1A6B5C] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {m.firstName?.[0]}{m.lastName?.[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-[#0D4035]">{m.firstName} {m.lastName}</p>
                      {m.id === currentUser?.id && <span className="text-xs text-[#94A3B8]">(you)</span>}
                      {!m.isActive && <Badge variant="danger" size="sm">Inactive</Badge>}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Mail size={10} className="text-[#94A3B8]" />
                      <p className="text-xs text-[#64748B]">{m.email}</p>
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      {m.lastLogin
                        ? `Last active ${formatDistanceToNow(new Date(m.lastLogin), { addSuffix: true })}`
                        : 'Never logged in'}
                      {' · '}Added {format(new Date(m.createdAt), 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={ROLE_VARIANT[m.role] || 'muted'} size="sm">
                    {ROLE_LABELS[m.role] ?? m.role.replace(/_/g, ' ')}
                  </Badge>
                  {canManage && m.id !== currentUser?.id && m.isActive && (
                    <>
                      <button
                        onClick={() => openChangeRole(m)}
                        className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1A6B5C] hover:bg-[#D6F0E8] transition-colors"
                        title="Change role"
                      >
                        <ShieldCheck size={15} />
                      </button>
                      <button
                        onClick={() => openDeactivate(m)}
                        className="p-1.5 rounded-lg text-[#64748B] hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remove access"
                      >
                        <UserX size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Member Modal */}
      <Modal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Add Team Member"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              onClick={() => inviteMutation.mutate()}
              loading={inviteMutation.isPending}
              disabled={!inviteEmail || !inviteFirst || !inviteLast || invitePassword.length < 8}
            >
              Add to Team
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name *" value={inviteFirst} onChange={e => setInviteFirst(e.target.value)} />
            <Input label="Last Name *" value={inviteLast} onChange={e => setInviteLast(e.target.value)} />
          </div>
          <div>
            <Input label="Email address *" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            <p className="mt-1 text-xs text-[#64748B]">This is what they will use to log in. Must be unique.</p>
          </div>
          <Input label="Phone number (optional)" type="tel" placeholder="+255 7XX XXX XXX" value={invitePhone} onChange={e => setInvitePhone(e.target.value)} hint="If provided, they can also log in using their phone number." />
          <Input
            label="Temporary Password *"
            type={showInvitePassword ? 'text' : 'password'}
            value={invitePassword}
            onChange={e => setInvitePassword(e.target.value)}
            placeholder="Min. 8 characters"
            rightIcon={
              <button type="button" onClick={() => setShowInvitePassword(v => !v)}>
                {showInvitePassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
          <p className="text-xs text-[#64748B]">
            Share this password with the team member directly. They will be prompted to change it on first login.
          </p>

          <div>
            <Select
              label="Role *"
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              options={roleOptions}
            />
            {ROLE_DESCRIPTIONS[inviteRole] && (
              <p className="mt-2 rounded-lg bg-[#EDF7F3] px-3 py-2 text-xs text-[#1A6B5C]">
                {ROLE_DESCRIPTIONS[inviteRole]}
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* Change Role Modal */}
      <Modal
        isOpen={changeRoleOpen}
        onClose={() => setChangeRoleOpen(false)}
        title={`Change Role — ${selectedUser?.firstName} ${selectedUser?.lastName}`}
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setChangeRoleOpen(false)}>Cancel</Button>
            <Button
              onClick={() => changeRoleMutation.mutate()}
              loading={changeRoleMutation.isPending}
              disabled={newRole === selectedUser?.role}
            >
              Update Role
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Select
            label="New Role"
            value={newRole}
            onChange={e => setNewRole(e.target.value)}
            options={[...roleOptions, { value: 'OWNER', label: 'Owner' }]}
          />
          {ROLE_DESCRIPTIONS[newRole] && (
            <p className="rounded-lg bg-[#EDF7F3] px-3 py-2 text-xs text-[#1A6B5C]">
              {ROLE_DESCRIPTIONS[newRole]}
            </p>
          )}
        </div>
      </Modal>

      {/* Deactivate Modal */}
      <Modal
        isOpen={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        title="Remove Access"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setDeactivateOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => deactivateMutation.mutate()}
              loading={deactivateMutation.isPending}
            >
              Remove Access
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[#374151]">
          Remove access for <span className="font-semibold">{selectedUser?.firstName} {selectedUser?.lastName}</span>?
          They will not be able to log in until their access is restored. Their activity history is preserved.
        </p>
      </Modal>
    </div>
  );
};
