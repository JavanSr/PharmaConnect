import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Eye, EyeOff, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { api } from '@/lib/api';
import { SettingsNav } from './SettingsNav';

type PwForm = { currentPassword: string; newPassword: string; confirmPassword: string };
type PinForm = { currentPassword: string; pin: string; confirmPin: string };

export const SecurityPage: React.FC = () => {
  const user = useAuthStore(s => s.user);
  const toast = useNotificationStore(s => s.toast);
  const isPic = ['PHARMACIST_IN_CHARGE', 'OWNER', 'SUPER_ADMIN'].includes(user?.role ?? '');

  const [showPw, setShowPw] = React.useState({ current: false, next: false, confirm: false });
  const [showPin, setShowPin] = React.useState({ pin: false, confirm: false, pw: false });
  const [pinMode, setPinMode] = React.useState<'set' | 'clear' | null>(null);

  // Check if user has a PIN set
  const pinStatusQuery = useQuery({
    queryKey: ['pin-status'],
    queryFn: () => api.get('/settings/profile').then(r => Boolean(r.data.data?.picPinHash)),
    enabled: isPic,
  });
  const hasPinSet = pinStatusQuery.data ?? false;

  const pwForm = useForm<PwForm>({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const pinForm = useForm<PinForm>({
    defaultValues: { currentPassword: '', pin: '', confirmPin: '' },
  });

  const pwMutation = useMutation({
    mutationFn: (d: PwForm) => api.post('/settings/change-password', d),
    onSuccess: () => {
      toast.success('Password updated');
      pwForm.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to update password'),
  });

  const pinMutation = useMutation({
    mutationFn: (d: { currentPassword: string; pin?: string }) =>
      d.pin
        ? api.post('/settings/pin/set', { currentPassword: d.currentPassword, pin: d.pin })
        : api.post('/settings/pin/clear', { currentPassword: d.currentPassword }),
    onSuccess: (_, vars) => {
      toast.success(vars.pin ? 'PIN set successfully' : 'PIN removed');
      pinForm.reset();
      setPinMode(null);
      pinStatusQuery.refetch();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const onPwSubmit = (d: PwForm) => {
    if (d.newPassword !== d.confirmPassword) {
      pwForm.setError('confirmPassword', { message: 'Passwords do not match' });
      return;
    }
    pwMutation.mutate(d);
  };

  const onPinSubmit = (d: PinForm) => {
    if (pinMode === 'set') {
      if (d.pin !== d.confirmPin) {
        pinForm.setError('confirmPin', { message: 'PINs do not match' });
        return;
      }
      pinMutation.mutate({ currentPassword: d.currentPassword, pin: d.pin });
    } else {
      pinMutation.mutate({ currentPassword: d.currentPassword });
    }
  };

  const toggle = (field: keyof typeof showPw) => setShowPw(p => ({ ...p, [field]: !p[field] }));
  const togglePin = (field: keyof typeof showPin) => setShowPin(p => ({ ...p, [field]: !p[field] }));

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-bold text-[#0D4035]">Security</h1>
      <SettingsNav />

      {/* Change Password */}
      <Card header={
        <div className="flex items-center gap-2">
          <Lock size={15} className="text-[#1A6B5C]" />
          <span className="text-sm font-semibold text-[#0D4035]">Change Password</span>
        </div>
      }>
        <form onSubmit={pwForm.handleSubmit(onPwSubmit)} className="space-y-4">
          <Input
            label="Current Password"
            type={showPw.current ? 'text' : 'password'}
            {...pwForm.register('currentPassword', { required: true })}
            rightIcon={
              <button type="button" onClick={() => toggle('current')}>
                {showPw.current ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
          <Input
            label="New Password"
            type={showPw.next ? 'text' : 'password'}
            {...pwForm.register('newPassword', { required: true, minLength: { value: 8, message: 'Minimum 8 characters' } })}
            error={pwForm.formState.errors.newPassword?.message}
            rightIcon={
              <button type="button" onClick={() => toggle('next')}>
                {showPw.next ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
          <Input
            label="Confirm New Password"
            type={showPw.confirm ? 'text' : 'password'}
            {...pwForm.register('confirmPassword', { required: true })}
            error={pwForm.formState.errors.confirmPassword?.message}
            rightIcon={
              <button type="button" onClick={() => toggle('confirm')}>
                {showPw.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
          <Button type="submit" loading={pwMutation.isPending}>Update password</Button>
        </form>
      </Card>

      {/* PIN Management — PIC, OWNER, SUPER_ADMIN */}
      {isPic && (
        <Card header={
          <div className="flex items-center gap-2">
            <KeyRound size={15} className="text-[#1A6B5C]" />
            <span className="text-sm font-semibold text-[#0D4035]">Dispensing PIN</span>
          </div>
        }>
          <p className="text-sm text-[#64748B] mb-4">
            Your 4-digit PIN is used to authorise high-risk clinical decisions at the dispensing counter.
          </p>

          {/* PIN status */}
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-4 text-sm font-medium ${
            hasPinSet
              ? 'bg-[#EDF7F3] border border-[#D6F0E8] text-[#1A6B5C]'
              : 'bg-amber-50 border border-amber-200 text-amber-700'
          }`}>
            <ShieldCheck size={14} />
            {hasPinSet ? 'PIN is set and active' : 'No PIN set — recommended for Pharmacist in Charge'}
          </div>

          {pinMode === null && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setPinMode('set')}>
                {hasPinSet ? 'Change PIN' : 'Set PIN'}
              </Button>
              {hasPinSet && (
                <Button variant="danger" onClick={() => setPinMode('clear')}>Remove PIN</Button>
              )}
            </div>
          )}

          {pinMode !== null && (
            <form onSubmit={pinForm.handleSubmit(onPinSubmit)} className="space-y-4 mt-2">
              <Input
                label="Your account password (to confirm identity)"
                type={showPin.pw ? 'text' : 'password'}
                {...pinForm.register('currentPassword', { required: true })}
                rightIcon={
                  <button type="button" onClick={() => togglePin('pw')}>
                    {showPin.pw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
              {pinMode === 'set' && (
                <>
                  <Input
                    label="New PIN (4 digits)"
                    type={showPin.pin ? 'text' : 'password'}
                    maxLength={4}
                    inputMode="numeric"
                    {...pinForm.register('pin', {
                      required: true,
                      pattern: { value: /^\d{4}$/, message: 'PIN must be exactly 4 digits' },
                    })}
                    error={pinForm.formState.errors.pin?.message}
                    rightIcon={
                      <button type="button" onClick={() => togglePin('pin')}>
                        {showPin.pin ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                  <Input
                    label="Confirm PIN"
                    type={showPin.confirm ? 'text' : 'password'}
                    maxLength={4}
                    inputMode="numeric"
                    {...pinForm.register('confirmPin', { required: true })}
                    error={pinForm.formState.errors.confirmPin?.message}
                    rightIcon={
                      <button type="button" onClick={() => togglePin('confirm')}>
                        {showPin.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                </>
              )}
              <div className="flex gap-2">
                <Button type="submit" loading={pinMutation.isPending} variant={pinMode === 'clear' ? 'danger' : 'primary'}>
                  {pinMode === 'set' ? 'Save PIN' : 'Remove PIN'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setPinMode(null); pinForm.reset(); }}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}
    </div>
  );
};
