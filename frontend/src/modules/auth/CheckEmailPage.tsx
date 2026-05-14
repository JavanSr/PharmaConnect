import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Mail, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

export const CheckEmailPage: React.FC = () => {
  const location = useLocation();
  const email: string = (location.state as any)?.email ?? '';
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const continueAfterVerification = () => {
    window.location.replace('/dashboard');
  };

  useEffect(() => {
    const isVerified = () => {
      try {
        const raw = window.localStorage.getItem('pc-email-verified');
        if (!raw) return false;
        const parsed = JSON.parse(raw) as { email?: string; at?: number };
        const recent = parsed.at ? Date.now() - parsed.at < 10 * 60 * 1000 : true;
        return recent && (!email || parsed.email?.toLowerCase() === email.toLowerCase());
      } catch {
        return false;
      }
    };

    const maybeContinue = () => {
      if (isVerified()) {
        continueAfterVerification();
      }
    };

    maybeContinue();
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'pc-email-verified') {
        maybeContinue();
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', maybeContinue);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', maybeContinue);
    };
  }, [email]);

  const handleResend = async () => {
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/resend-verification', { email });
      setResent(true);
    } catch {
      setError('Could not resend. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EDF7F3] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src="/assets/logo/apotekh-logo.svg" alt="APOTEKH" className="h-10 w-auto" />
        </div>

        <div className="bg-white rounded-2xl border border-[#D6F0E8] shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#D6F0E8] flex items-center justify-center mx-auto mb-5">
            <Mail size={28} className="text-[#1A6B5C]" />
          </div>

          <h1 className="text-xl font-bold text-[#0D4035] mb-2">Check your email</h1>
          <p className="text-sm text-[#64748B] mb-1">We sent a verification link to</p>
          <p className="text-sm font-semibold text-[#0D4035] mb-6 break-all">{email || 'your email address'}</p>

          <div className="bg-[#EDF7F3] rounded-xl p-4 text-left mb-6 space-y-2">
            <p className="text-sm text-[#374151]">
              <span className="font-semibold text-[#1A6B5C]">1.</span> Open the email from APOTEKH
            </p>
            <p className="text-sm text-[#374151]">
              <span className="font-semibold text-[#1A6B5C]">2.</span> Click <strong>Verify my email address</strong>
            </p>
            <p className="text-sm text-[#374151]">
              <span className="font-semibold text-[#1A6B5C]">3.</span> Your 14-day trial starts immediately
            </p>
          </div>

          {resent ? (
            <div className="flex items-center justify-center gap-2 text-sm text-[#1A6B5C] mb-4">
              <CheckCircle size={16} />
              <span>New link sent. Check your inbox.</span>
            </div>
          ) : (
            <>
              {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResend}
                loading={loading}
                className="w-full mb-3"
              >
                <RefreshCw size={14} className="mr-2" />
                Resend verification email
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={continueAfterVerification}
                className="w-full mb-3"
              >
                I verified my email
              </Button>
            </>
          )}

          <p className="text-xs text-[#94A3B8]">
            Wrong email?{' '}
            <Link to="/register" className="text-[#1A6B5C] hover:underline">Go back and register again</Link>
          </p>
        </div>

        <p className="text-center text-xs text-[#64748B] mt-4">
          Link expires in 24 hours
        </p>
      </div>
    </div>
  );
};
