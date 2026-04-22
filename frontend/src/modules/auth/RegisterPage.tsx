import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuthStore } from '@/stores/authStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { api } from '@/lib/api';
import { loadMemberships } from '@/lib/pharmacySelection';

const schema = z.object({
  pharmacyName: z.string().min(2, 'Pharmacy name is required'),
  licenceNumber: z.string().min(1, 'Licence number is required'),
  address: z.string().min(5, 'Address is required'),
  region: z.string().min(1, 'Region is required'),
  pharmacyType: z.enum(['RETAIL', 'ADDO', 'WHOLESALE']),
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

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { pharmacyType: 'RETAIL' },
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const { confirmPassword, ...payload } = data;
      const res = await api.post('/auth/register', payload);
      const { user, accessToken, refreshToken, pharmacy } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      if (pharmacy) {
        setPharmacy(pharmacy);
      }

      const memberships = await loadMemberships();
      if (memberships.length > 1) {
        navigate('/select-pharmacy');
        return;
      }

      if (memberships[0]) {
        setPharmacy(memberships[0].pharmacy);
        setDeviceSelectedPharmacyId(memberships[0].pharmacyId);
      } else if (pharmacy) {
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
            alt="PharmaConnect"
            className="h-10 w-auto"
          />
        </div>

        <div className="bg-white rounded-2xl border border-[#D6F0E8] shadow-sm p-8">
          <h1 className="text-xl font-bold text-[#0D4035] mb-1">Create pharmacy account</h1>
          <p className="text-sm text-[#64748B] mb-6">Get started with PharmaConnect — UHI compliant from day one</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-[#DC2626]">{error}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-[#1A6B5C] uppercase tracking-wide mb-3">Pharmacy Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Pharmacy Name" placeholder="Amani Pharmacy" {...register('pharmacyName')} error={errors.pharmacyName?.message} required />
                <Input label="TMDA Licence Number" placeholder="PH-AR-2024-001" {...register('licenceNumber')} error={errors.licenceNumber?.message} required />
                <Select label="Pharmacy Type" options={[{value:'RETAIL',label:'Retail Pharmacy'},{value:'ADDO',label:'ADDO'},{value:'WHOLESALE',label:'Wholesale'}]} {...register('pharmacyType')} error={errors.pharmacyType?.message} required />
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
                <Input label="Password" type="password" placeholder="Min. 8 characters" {...register('password')} error={errors.password?.message} required />
                <Input label="Confirm Password" type="password" placeholder="Repeat password" {...register('confirmPassword')} error={errors.confirmPassword?.message} required />
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
