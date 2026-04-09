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

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

const DEMO_ACCOUNTS = [
  { label: 'Super Admin', email: 'founder@pharmaconnect.tz' },
  { label: 'Pharmacy Admin', email: 'admin@pharmaconnect.tz' },
  { label: 'Staff', email: 'staff@pharmaconnect.tz' },
  { label: 'Owner', email: 'owner@amani.co.tz' },
  { label: 'Dispenser 2', email: 'dispenser2@amani.co.tz' },
  { label: 'Data Entry Clerk', email: 'clerk@amani.co.tz' },
  { label: 'Wholesale Seller', email: 'seller@amani.co.tz' },
];
const DEMO_PASSWORD = 'Demo123!';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);
  const setPharmacy = usePharmacyStore(s => s.setPharmacy);
  const [showPw, setShowPw] = React.useState(false);
  const [error, setError] = React.useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const res = await api.post('/auth/login', data);
      const { user, accessToken, refreshToken, pharmacy } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      if (pharmacy) setPharmacy(pharmacy);
      navigate('/dashboard');
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
            src="/brand/pharmaconnect-logo.svg"
            alt="PharmaConnect"
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
              placeholder="admin@pharmaconnect.tz"
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

          <div className="mt-5 space-y-2 text-xs text-[#64748B]">
            <p className="font-semibold text-[#0D4035]">Demo accounts</p>
            {DEMO_ACCOUNTS.map(account => (
              <p key={account.email}>
                <span className="font-medium text-[#0D4035]">{account.label}:</span>{' '}
                {account.email} / {DEMO_PASSWORD}
              </p>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-[#64748B]">
            New pharmacy?{' '}
            <Link to="/register" className="text-[#1A6B5C] font-medium hover:underline">
              Register now
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-[#64748B] mt-4">
          Tanzania UHI Mandate compliant · TMDA registered
        </p>
      </div>
    </div>
  );
};
