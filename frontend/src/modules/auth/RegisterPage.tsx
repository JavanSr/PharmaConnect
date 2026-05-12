import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuthStore } from '@/stores/authStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { api } from '@/lib/api';

const schema = z.object({
  pharmacyName: z.string().min(2, 'Pharmacy name is required'),
  address: z.string().min(5, 'Address is required'),
  region: z.string().min(1, 'Region is required'),
  pharmacyType: z.enum(['RETAIL', 'ADDO', 'WHOLESALE', 'RETAIL_WHOLESALE']),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

type FormData = z.infer<typeof schema>;

const REGIONS = ['Arusha', 'Dar es Salaam', 'Dodoma', 'Geita', 'Iringa', 'Kagera', 'Katavi', 'Kigoma', 'Kilimanjaro', 'Lindi', 'Manyara', 'Mara', 'Mbeya', 'Morogoro', 'Mtwara', 'Mwanza', 'Njombe', 'Pemba', 'Pwani', 'Rukwa', 'Ruvuma', 'Shinyanga', 'Simiyu', 'Singida', 'Songwe', 'Tabora', 'Tanga', 'Zanzibar'];

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);
  const setPharmacy = usePharmacyStore(s => s.setPharmacy);
  const setDeviceSelectedPharmacyId = usePharmacyStore(s => s.setDeviceSelectedPharmacyId);
  const [error, setError] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { pharmacyType: 'RETAIL' },
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const { confirmPassword, ...payload } = data;
      const res = await api.post('/auth/register', payload);
      const result = res.data.data;

      if (result.pending) {
        navigate('/auth/check-email', { state: { email: result.email }, replace: true });
        return;
      }

      // Legacy fallback — should not happen with new backend
      const { user, accessToken, refreshToken, pharmacy } = result;
      setAuth(user, accessToken, refreshToken);
      if (pharmacy) {
        setPharmacy(pharmacy);
        setDeviceSelectedPharmacyId(pharmacy.id);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#EDF7F3] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex justify-center mb-8">
          <img
            src="/brand/pharmaconnect-logo.svg"
            alt="APOTEKH"
            className="h-10 w-auto"
          />
        </div>

        <div className="bg-white rounded-2xl border border-[#D6F0E8] shadow-sm p-8">
          <h1 className="text-xl font-bold text-[#0D4035] mb-1">Create pharmacy account</h1>
          <p className="text-sm text-[#64748B] mb-6">Get started with APOTEKH. TMDA licence details can be added later in compliance.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-[#DC2626]">{error}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-[#1A6B5C] uppercase tracking-wide mb-3">Pharmacy Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Pharmacy Name" placeholder="Amani Pharmacy" {...register('pharmacyName')} error={errors.pharmacyName?.message} required />
                <Select
                  label="Pharmacy Type"
                  options={[
                    { value: 'RETAIL', label: 'Retail pharmacy' },
                    { value: 'WHOLESALE', label: 'Wholesale pharmacy' },
                    { value: 'RETAIL_WHOLESALE', label: 'Retail + wholesale' },
                    { value: 'ADDO', label: 'ADDO' },
                  ]}
                  {...register('pharmacyType')}
                  error={errors.pharmacyType?.message}
                  required
                />
                <Select label="Region" options={REGIONS.map(r => ({value:r,label:r}))} placeholder="Select region" {...register('region')} error={errors.region?.message} required />
                <div className="sm:col-span-2">
                  <Input label="Address" placeholder="Sokoine Road, Arusha Central" {...register('address')} error={errors.address?.message} required />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#1A6B5C] uppercase tracking-wide mb-3">Owner / Administrator Account</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="First Name" placeholder="Mohamed" {...register('firstName')} error={errors.firstName?.message} required />
                <Input label="Last Name" placeholder="Rashid" {...register('lastName')} error={errors.lastName?.message} required />
                <Input label="Email Address" type="email" placeholder="owner@pharmacy.co.tz" {...register('email')} error={errors.email?.message} required />
                <div />
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  {...register('password')}
                  error={errors.password?.message}
                  required
                  autoComplete="new-password"
                  rightIcon={
                    <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
                <Input
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repeat password"
                  {...register('confirmPassword')}
                  error={errors.confirmPassword?.message}
                  required
                  autoComplete="new-password"
                  rightIcon={
                    <button type="button" onClick={() => setShowConfirmPassword(value => !value)} aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}>
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
              </div>
            </div>

            <Button type="submit" className="w-full" loading={isSubmitting} size="lg">
              Create Pharmacy Account
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-[#64748B]">
            Already registered?{' '}
            <Link to="/login" className="text-[#1A6B5C] font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
