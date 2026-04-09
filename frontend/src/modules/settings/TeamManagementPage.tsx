import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Mail, ShieldCheck } from 'lucide-react';
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

const ROLE_VARIANT: Record<string, any> = {
  OWNER: 'warning',
  PHARMACIST_IN_CHARGE: 'success',
  DISPENSER: 'info',
  DATA_ENTRY_CLERK: 'muted',
  WHOLESALE_ADMIN: 'purple',
  WHOLESALE_SELLER: 'info',
  SUPER_ADMIN: 'danger',
};

const INVITE_ROLES = [
  { value: 'PHARMACIST_IN_CHARGE', label: 'Pharmacist In-Charge' },
  { value: 'DISPENSER', label: 'Dispenser' },
  { value: 'DATA_ENTRY_CLERK', label: 'Data Entry Clerk' },
  { value: 'WHOLESALE_ADMIN', label: 'Wholesale Admin' },
  { value: 'WHOLESALE_SELLER', label: 'Wholesale Seller' },
];

export const TeamManagementPage: React.FC = () => {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [changeRoleOpen, setChangeRoleOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('DISPENSER');
  const [inviteFirst, setInviteFirst] = useState('');
  const [inviteLast, setInviteLast] = useState('');
  const [newRole, setNewRole] = useState('');
  const toast = useNotificationStore(s => s.toast);
  const qc = useQueryClient();
  const { hasRole, user: currentUser } = useAuth();
  const canManage = hasRole(['OWNER', 'SUPER_ADMIN']);

  const { data, isLoading } = useQuery({
    queryKey: ['pharmacy-team'],
    queryFn: () => api.get('/auth/pharmacy/users').then(r => r.data),
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.post('/auth/pharmacy/users', {
      email: inviteEmail, role: inviteRole, firstName: inviteFirst, lastName: inviteLast,
    }),
    onSuccess: () => {
      toast.success('Team member invited — they can now log in');
      setInviteOpen(false);
      setInviteEmail(''); setInviteFirst(''); setInviteLast(''); setInviteRole('DISPENSER');
      qc.invalidateQueries({ queryKey: ['pharmacy-team'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to invite'),
  });

  const changeRoleMutation = useMutation({
    mutationFn: () => api.put(`/auth/pharmacy/users/${selectedUser.id}/role`, { role: newRole }),
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
        <h1 className="text-xl font-bold text-[#0D4035]">Team Management</h1>
        {canManage && (
          <Button leftIcon={<UserPlus size={16} />} onClick={() => setInviteOpen(true)}>
            Invite Member
          </Button>
        )}
      </div>

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
              disabled={!inviteEmail || !inviteFirst || !inviteLast}
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
