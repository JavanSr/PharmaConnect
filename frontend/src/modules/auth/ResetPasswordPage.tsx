import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const schema = z.object({
  password: z.string().min(8, 'Use at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm your password'),
}).refine((value) => value.password === value.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
});

type FormData = z.infer<typeof schema>;

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [error, setError] = React.useState('');
  const [complete, setComplete] = React.useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password: data.password });
      setComplete(true);
      window.setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'This reset link is invalid or expired.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#EDF7F3] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <img src="/assets/logo/apotekh-logo.svg" alt="APOTEKH" className="h-10 w-auto" />
        </div>
        <div className="rounded-2xl border border-[#D6F0E8] bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-xl font-bold text-[#0D4035]">Choose a new password</h1>
          <p className="mb-6 text-sm text-[#64748B]">Reset links are single-use and expire after one hour.</p>

          {!token ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-[#DC2626]">
                Missing reset token.
              </div>
              <Link to="/auth/forgot-password" className="block text-center text-sm font-medium text-[#1A6B5C] hover:underline">
                Request a new reset link
              </Link>
            </div>
          ) : complete ? (
            <div className="rounded-xl border border-[#D6F0E8] bg-[#EDF7F3] p-4 text-sm text-[#0D4035]">
              Password reset complete. Redirecting to sign in.
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-[#DC2626]">{error}</div>}
              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
                error={errors.password?.message}
              />
              <Input
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword')}
                error={errors.confirmPassword?.message}
              />
              <Button type="submit" className="w-full" loading={isSubmitting} size="lg">
                Reset password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
