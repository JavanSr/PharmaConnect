import React from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});

type FormData = z.infer<typeof schema>;

export const ForgotPasswordPage: React.FC = () => {
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await api.post('/auth/forgot-password', data);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Could not request a reset link.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#EDF7F3] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <img src="/assets/logo/apotekh-logo.svg" alt="APOTEKH" className="h-10 w-auto" />
        </div>
        <div className="rounded-2xl border border-[#D6F0E8] bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-xl font-bold text-[#0D4035]">Reset password</h1>
          <p className="mb-6 text-sm text-[#64748B]">Enter your account email and we will send a one-hour reset link.</p>

          {submitted ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#D6F0E8] bg-[#EDF7F3] p-4 text-sm text-[#0D4035]">
                If that email is registered, a reset link has been sent.
              </div>
              <Link to="/login" className="block text-center text-sm font-medium text-[#1A6B5C] hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-[#DC2626]">{error}</div>}
              <Input
                label="Email address"
                type="email"
                placeholder="example@email.co.tz"
                autoComplete="email"
                {...register('email')}
                error={errors.email?.message}
              />
              <Button type="submit" className="w-full" loading={isSubmitting} size="lg">
                Send reset link
              </Button>
              <Link to="/login" className="block text-center text-sm font-medium text-[#1A6B5C] hover:underline">
                Back to sign in
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
