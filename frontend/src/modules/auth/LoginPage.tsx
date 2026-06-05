import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { api } from '@/lib/api';
import { saveOfflineLoginCache, unlockOfflineLogin } from '@/lib/offlineAuth';
import { loadMemberships } from '@/lib/pharmacySelection';
import type { PharmacyMembership } from '@/types';

const schema = z.object({
  email: z.string().min(1, 'Enter your email or phone number'),  // accepts email or phone
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

const showDemoAccounts = import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true';
const DEMO_ACCOUNTS = showDemoAccounts ? [
  { label: 'Super Admin', email: 'founder@pharmaconnect.tz', displayEmail: 'founder@apotekh.co.tz' },
  { label: 'Pharmacy Admin', email: 'admin@pharmaconnect.tz', displayEmail: 'admin@apotekh.co.tz' },
  { label: 'Staff', email: 'staff@pharmaconnect.tz', displayEmail: 'staff@apotekh.co.tz' },
  { label: 'Owner', email: 'owner@amani.co.tz' },
  { label: 'Dispenser 2', email: 'dispenser2@amani.co.tz' },
  { label: 'Clerk Demo', email: 'clerk@amani.co.tz' },
  { label: 'Wholesale Manager', email: 'manager@kwd.co.tz' },
  { label: 'Counter Staff',    email: 'counter@kwd.co.tz' },
] : [];
const DEMO_PASSWORD = showDemoAccounts ? 'Demo123!' : '';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);
  const updateUser = useAuthStore(s => s.updateUser);
  const setPharmacy = usePharmacyStore(s => s.setPharmacy);
  const clearPharmacy = usePharmacyStore(s => s.clearPharmacy);
  const setMemberships = usePharmacyStore(s => s.setMemberships);
  const setDeviceSelectedPharmacyId = usePharmacyStore(s => s.setDeviceSelectedPharmacyId);
  const deviceSelectedPharmacyId = usePharmacyStore(s => s.deviceSelectedPharmacyId);
  const [showPw, setShowPw] = React.useState(false);
  const [error, setError] = React.useState('');

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const fillDemo = (email: string) => {
    setValue('email', email);
    setValue('password', DEMO_PASSWORD);
    setError('');
  };

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const res = await api.post('/auth/login', {
        ...data,
        preferredPharmacyId: deviceSelectedPharmacyId || undefined,
      });
      const { user, accessToken, refreshToken, pharmacy, memberships: loginMemberships } = res.data.data as {
        user: Parameters<typeof setAuth>[0];
        accessToken: string;
        refreshToken: string;
        pharmacy: Parameters<typeof setPharmacy>[0] | null;
        memberships?: PharmacyMembership[];
      };
      // Clear any stale pharmacy context from a previous user's session before
      // applying the new user's data — prevents the old pharmacy bleeding through.
      clearPharmacy();
      setAuth(user, accessToken, refreshToken);
      if (pharmacy) {
        setPharmacy(pharmacy);
      }

      const memberships = Array.isArray(loginMemberships)
        ? loginMemberships
        : await loadMemberships();
      setMemberships(memberships);

      const selectedMembership = memberships.find((membership) => membership.selected) ?? null;
      if (selectedMembership) {
        setPharmacy(selectedMembership.pharmacy);
        setDeviceSelectedPharmacyId(selectedMembership.pharmacyId);
        updateUser({
          pharmacyId: selectedMembership.pharmacyId,
          role: selectedMembership.role,
        });
      }

      if (memberships.length <= 1) {
        const onlyMembership = memberships[0];
        if (onlyMembership) {
          setPharmacy(onlyMembership.pharmacy);
          setDeviceSelectedPharmacyId(onlyMembership.pharmacyId);
        }
        await saveOfflineLoginCache({
          email: data.email,
          password: data.password,
          user: { ...user, pharmacyId: onlyMembership?.pharmacyId ?? user.pharmacyId },
          accessToken,
          refreshToken,
          pharmacy: onlyMembership?.pharmacy ?? pharmacy,
          memberships,
          deviceSelectedPharmacyId: onlyMembership?.pharmacyId ?? deviceSelectedPharmacyId,
        });
        navigate(user?.role === 'SUPER_ADMIN' ? '/founder' : '/dashboard');
        return;
      }

      if (selectedMembership) {
        await saveOfflineLoginCache({
          email: data.email,
          password: data.password,
          user: { ...user, pharmacyId: selectedMembership.pharmacyId, role: selectedMembership.role },
          accessToken,
          refreshToken,
          pharmacy: selectedMembership.pharmacy,
          memberships,
          deviceSelectedPharmacyId: selectedMembership.pharmacyId,
        });
        navigate(user?.role === 'SUPER_ADMIN' ? '/founder' : '/dashboard');
        return;
      }

      await saveOfflineLoginCache({
        email: data.email,
        password: data.password,
        user,
        accessToken,
        refreshToken,
        pharmacy,
        memberships,
        deviceSelectedPharmacyId,
      });
      navigate('/select-pharmacy');
    } catch (err: any) {
      if (!err.response) {
        try {
          const offlineSnapshot = await unlockOfflineLogin(data.email, data.password);
          if (offlineSnapshot) {
            setAuth(offlineSnapshot.user, offlineSnapshot.accessToken, offlineSnapshot.refreshToken);
            if (offlineSnapshot.pharmacy) {
              setPharmacy(offlineSnapshot.pharmacy);
            }
            setMemberships(offlineSnapshot.memberships);
            setDeviceSelectedPharmacyId(offlineSnapshot.deviceSelectedPharmacyId);
            navigate(offlineSnapshot.user?.role === 'SUPER_ADMIN' ? '/founder' : '/dashboard');
            return;
          }
        } catch {
          // Fall through to the regular network error below.
        }

        setError('Cannot reach the backend API. Offline sign-in is available only after a successful online login on this device.');
        return;
      }

      setError(err.response?.data?.error || 'Invalid email or password');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <header className="flex h-10 w-full items-center justify-center bg-surface-container-high px-margin-mobile">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-label-md text-on-surface-variant">Online - syncing</span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-margin-mobile py-stack-md">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-stack-md flex flex-col items-center justify-center text-center">
          <img
            src="/assets/logo/apotekh-logo.svg"
            alt="APOTEKH"
            className="h-9 w-auto"
          />
          <p className="mt-2 text-label-lg text-on-surface-variant">Clinical Stock &amp; Management System</p>
        </div>

        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-5 shadow-sm sm:p-6">
          <h1 className="mb-1 text-title-lg text-on-surface">Welcome back</h1>
          <p className="mb-6 text-body-md text-on-surface-variant">Sign in to your pharmacy account</p>

          {error && (
            <div className="mb-4 rounded-xl border border-error/20 bg-error-container p-3 text-sm text-on-error-container">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email or phone number"
              type="text"
              placeholder="admin@apotekh.co.tz or +255 7XX XXX XXX"
              {...register('email')}
              error={errors.email?.message}
              autoComplete="username"
            />
            <Input
              label="Password"
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              {...register('password')}
              error={errors.password?.message}
              autoComplete="current-password"
              rightIcon={
                <button type="button" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
            <div className="-mt-2 text-right">
              <Link to="/auth/forgot-password" className="text-label-lg text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" loading={isSubmitting} size="lg">
              Sign in
            </Button>
          </form>

          {showDemoAccounts && (
          <div className="mt-5 space-y-1 text-xs text-[#64748B]">
            <p className="font-semibold text-[#0D4035] mb-2">Demo accounts — click to fill</p>
            {DEMO_ACCOUNTS.map(account => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemo(account.email)}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#EDF7F3] transition-colors"
              >
                <span className="font-medium text-[#1A6B5C]">{account.label}</span>
                <span className="ml-1 text-[#64748B]">{account.displayEmail ?? account.email}</span>
              </button>
            ))}
          </div>
          )}

          <p className="mt-6 text-center text-sm text-[#64748B]">
            New pharmacy?{' '}
            <Link to="/register" className="text-[#1A6B5C] font-medium hover:underline">
              Register now
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-outline">
          TMDA-ready pharmacy operations
        </p>
      </div>
      </main>
    </div>
  );
};
