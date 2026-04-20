import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/stores/authStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { api } from '@/lib/api';

export const ProfilePage: React.FC = () => {
  const user = useAuthStore(s => s.user);
  const pharmacy = usePharmacyStore(s => s.pharmacy);
  const toast = useNotificationStore(s => s.toast);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const pwMutation = useMutation({
    mutationFn: (data: any) => api.post('/settings/change-password', data),
    onSuccess: () => toast.success('Password updated'),
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to update password'),
  });

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-bold text-[#0D4035]">Profile</h1>

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

      <Card header={<span className="text-sm font-semibold text-[#0D4035]">Change Password</span>}>
        <form onSubmit={handleSubmit(d => pwMutation.mutate(d))} className="space-y-4">
          <Input label="Current Password" type="password" {...register('currentPassword', { required: true })} />
          <Input label="New Password" type="password" {...register('newPassword', { required: true, minLength: 8 })} />
          <Input label="Confirm New Password" type="password" {...register('confirmPassword', { required: true })} />
          <Button type="submit" loading={pwMutation.isPending}>Update Password</Button>
        </form>
      </Card>
    </div>
  );
};
