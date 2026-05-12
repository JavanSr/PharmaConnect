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
import { loadMemberships } from '@/lib/pharmacySelection';
import type { PharmacyMembership } from '@/types';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

const isDev = import.meta.env.DEV;
const DEMO_ACCOUNTS = isDev ? [
  { label: 'Super Admin', email: 'founder@pharmaconnect.tz', displayEmail: 'founder@apotekh.co.tz' },
  { label: 'Pharmacy Admin', email: 'admin@pharmaconnect.tz', displayEmail: 'admin@apotekh.co.tz' },
  { label: 'Staff', email: 'staff@pharmaconnect.tz', displayEmail: 'staff@apotekh.co.tz' },
  { label: 'Owner', email: 'owner@amani.co.tz' },
  { label: 'Dispenser 2', email: 'dispenser2@amani.co.tz' },
  { label: 'Clerk Demo', email: 'clerk@amani.co.tz' },
  { label: 'Wholesale Seller', email: 'seller@amani.co.tz' },
] : [];
const DEMO_PASSWORD = isDev ? 'Demo123!' : '';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);
  const updateUser = useAuthStore(s => s.updateUser);
  const setPharmacy = usePharmacyStore(s => s.setPharmacy);
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
        navigate('/dashboard');
        return;
      }

      if (selectedMembership) {
        navigate('/dashboard');
        return;
      }

      navigate('/select-pharmacy');
    } catch (err: any) {
      if (!err.response) {
        setError('Cannot reach the backend API. Start the backend server and try again.');
        return;
      }

      setError(err.response?.data?.error || 'Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen bg-[#EDF7F3] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/assets/logo/apotekh-logo.svg"
            alt="APOTEKH"
            className="h-10 w-auto"
          />
        </div>

        <div className="bg-white rounded-2xl border border-[#D6F0E8] shadow-sm p-8">
          <h1 className="text-xl font-bold text-[#0D4035] mb-1">Welcome back</h1>
          <p className="text-sm text-[#64748B] mb-6">Sign in to your pharmacy account</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-[#DC2626]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="admin@apotekh.co.tz"
              {...register('email')}
              error={errors.email?.message}
              autoComplete="email"
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

            <Button type="submit" className="w-full" loading={isSubmitting} size="lg">
              Sign in
            </Button>
          </form>

          {isDev && (
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

        <p className="text-center text-xs text-[#64748B] mt-4">
          TMDA-ready pharmacy operations
        </p>
      </div>
    </div>
  );
};
