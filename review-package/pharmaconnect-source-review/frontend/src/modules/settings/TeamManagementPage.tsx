import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, UserPlus, Mail, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { SettingsNav } from './SettingsNav';

const ROLE_VARIANT: Record<string, any> = {
  OWNER: 'warning',
  PHARMACIST_IN_CHARGE: 'success',
  DISPENSER: 'info',
  CASHIER: 'info',
  WHOLESALE_MANAGER: 'warning',
  WHOLESALE_COUNTER_STAFF: 'info',
  DELIVERY_STAFF: 'muted',
  SUPER_ADMIN: 'danger',
};

const INVITE_ROLES = [
  { value: 'PHARMACIST_IN_CHARGE', label: 'Pharmacist In-Charge' },
  { value: 'DISPENSER', label: 'Dispenser' },
  { value: 'CASHIER', label: 'Cashier' },
  { value: 'WHOLESALE_MANAGER', label: 'Wholesale Manager' },
  { value: 'WHOLESALE_COUNTER_STAFF', label: 'Wholesale Counter Staff' },
  { value: 'DELIVERY_STAFF', label: 'Delivery Staff' },
];

const DISPENSER_SUPPLIER_WRITE_KEY = 'inventory.dispenser_supplier_write';

export const TeamManagementPage: React.FC = () => {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [changeRoleOpen, setChangeRoleOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('DISPENSER');
  const [inviteFirst, setInviteFirst] = useState('');
  const [inviteLast, setInviteLast] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  const [newRole, setNewRole] = useState('');
  const toast = useNotificationStore(s => s.toast);
  const qc = useQueryClient();
  const { hasRole, user: currentUser } = useAuth();
  const canManage = hasRole(['OWNER', 'SUPER_ADMIN']);
  const canManageOwnerControls = hasRole(['OWNER', 'SUPER_ADMIN']);

  const { data, isLoading } = useQuery({
    queryKey: ['pharmacy-team'],
    queryFn: () => api.get('/settings/team').then(r => r.data),
  });
  const dispenserSupplierSettingQuery = useQuery({
    queryKey: ['settings-config', DISPENSER_SUPPLIER_WRITE_KEY],
    queryFn: () => api.get(`/settings/config/${DISPENSER_SUPPLIER_WRITE_KEY}`).then(r => r.data),
    enabled: canManageOwnerControls,
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
      email: inviteEmail, role: inviteRole, firstName: inviteFirst, lastName: inviteLast,
      password: invitePassword, mustChangePassword: true,
    }),
    onSuccess: () => {
      toast.success('Team member added — share their temporary password with them');
      setInviteOpen(false);
      setInviteEmail(''); setInviteFirst(''); setInviteLast(''); setInviteRole('DISPENSER'); setInvitePassword('');
      qc.invalidateQueries({ queryKey: ['pharmacy-team'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to invite'),
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

  const members: any[] = data?.data || [];

  const openChangeRole = (member: any) => {
    setSelectedUser(member);
    setNewRole(member.role);
    setChangeRoleOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <h1 className="text-xl font-bold text-[#0D4035]">Team Management</h1>
          <SettingsNav />
        </div>
        <div>
          {canManage && (
            <Button leftIcon={<UserPlus size={16} />} onClick={() => setInviteOpen(true)}>
              Invite Member
            </Button>
          )}
        </div>
      </div>

      {canManageOwnerControls && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#0D4035]">Dispenser supplier access</p>
              <p className="mt-1 text-sm text-[#64748B]">
                Choose whether dispensers can add, edit, or remove supplier records. They can still select existing suppliers for stock work.
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Members', value: members.length },
          { label: 'Active', value: members.filter(m => m.isActive).length },
          { label: 'Pharmacists', value: members.filter(m => ['PHARMACIST_IN_CHARGE', 'DISPENSER'].includes(m.role)).length },
          { label: 'Admin Staff', value: members.filter(m => ['OWNER', 'SUPER_ADMIN'].includes(m.role)).length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#D6F0E8] p-4">
            <p className="text-xs text-[#64748B]">{s.label}</p>
            <p className="text-2xl font-bold text-[#0D4035] mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      <Card padding={false}>
        {isLoading ? (
          <div className="p-8 text-center text-[#64748B]">Loading team...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-[#64748B]">No team members found</div>
        ) : (
          <div className="divide-y divide-[#D6F0E8]">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1A6B5C] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {m.firstName?.[0]}{m.lastName?.[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#0D4035]">{m.firstName} {m.lastName}</p>
                      {m.id === currentUser?.id && <span className="text-xs text-[#64748B]">(you)</span>}
                      {!m.isActive && <Badge variant="danger" size="sm">Inactive</Badge>}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Mail size={11} className="text-[#64748B]" />
                      <p className="text-xs text-[#64748B]">{m.email}</p>
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">Joined {format(new Date(m.createdAt), 'dd MMM yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={ROLE_VARIANT[m.role] || 'muted'} size="sm">
                    {m.role.replace(/_/g, ' ')}
                  </Badge>
                  {canManage && m.id !== currentUser?.id && (
                    <button
                      onClick={() => openChangeRole(m)}
                      className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1A6B5C] hover:bg-[#D6F0E8] transition-colors"
                      title="Change role"
                    >
                      <ShieldCheck size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Invite Modal */}
      <Modal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite Team Member"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              onClick={() => inviteMutation.mutate()}
              loading={inviteMutation.isPending}
              disabled={!inviteEmail || !inviteFirst || !inviteLast || invitePassword.length < 8}
            >
              Send Invitation
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name *" value={inviteFirst} onChange={e => setInviteFirst(e.target.value)} />
            <Input label="Last Name *" value={inviteLast} onChange={e => setInviteLast(e.target.value)} />
          </div>
          <Input label="Email *" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
          <Input
            label="Temporary Password *"
            type={showInvitePassword ? 'text' : 'password'}
            value={invitePassword}
            onChange={e => setInvitePassword(e.target.value)}
            placeholder="Min. 8 characters"
            rightIcon={
              <button type="button" onClick={() => setShowInvitePassword(value => !value)} aria-label={showInvitePassword ? 'Hide temporary password' : 'Show temporary password'}>
                {showInvitePassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
          <p className="text-xs text-[#64748B]">The team member will be prompted to change this on first login.</p>
          <Select label="Role" value={inviteRole} onChange={e => setInviteRole(e.target.value)} options={INVITE_ROLES} />
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
        <Select
          label="New Role"
          value={newRole}
          onChange={e => setNewRole(e.target.value)}
          options={[...INVITE_ROLES, { value: 'OWNER', label: 'Owner' }]}
        />
      </Modal>
    </div>
  );
};
