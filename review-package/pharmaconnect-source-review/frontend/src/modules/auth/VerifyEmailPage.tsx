import React, { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { api } from '@/lib/api';

type State = 'verifying' | 'success' | 'error';

export const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);
  const setPharmacy = usePharmacyStore(s => s.setPharmacy);
  const setDeviceSelectedPharmacyId = usePharmacyStore(s => s.setDeviceSelectedPharmacyId);

  const [state, setState] = React.useState<State>('verifying');
  const [errorMsg, setErrorMsg] = React.useState('');
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const token = params.get('token');
    if (!token) {
      setState('error');
      setErrorMsg('No verification token found in this link.');
      return;
    }

    api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(res => {
        const { user, accessToken, refreshToken, pharmacy } = res.data.data;
        setAuth(user, accessToken, refreshToken);
        window.localStorage.setItem('pc-email-verified', JSON.stringify({ email: user.email, at: Date.now() }));
        if (pharmacy) {
          setPharmacy(pharmacy);
          setDeviceSelectedPharmacyId(pharmacy.id);
        }
        setState('success');
        setTimeout(() => navigate('/auth/trial-confirmed', { replace: true }), 1500);
      })
      .catch(err => {
        setState('error');
        setErrorMsg(err.response?.data?.error ?? 'Verification failed. The link may have expired.');
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#EDF7F3] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src="/brand/pharmaconnect-logo.svg" alt="PharmaConnect" className="h-10 w-auto" />
        </div>

        <div className="bg-white rounded-2xl border border-[#D6F0E8] shadow-sm p-10 text-center">
          {state === 'verifying' && (
            <>
              <Loader2 size={40} className="text-[#1A6B5C] animate-spin mx-auto mb-4" />
              <p className="text-sm font-semibold text-[#0D4035]">Verifying your email…</p>
            </>
          )}

          {state === 'success' && (
            <>
              <CheckCircle size={48} className="text-[#1A6B5C] mx-auto mb-4" />
              <h1 className="text-xl font-bold text-[#0D4035] mb-2">Email verified!</h1>
              <p className="text-sm text-[#64748B]">Taking you to your account…</p>
            </>
          )}

          {state === 'error' && (
            <>
              <XCircle size={48} className="text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-[#0D4035] mb-2">Link invalid or expired</h1>
              <p className="text-sm text-[#64748B] mb-6">{errorMsg}</p>
              <a
                href="/register"
                className="inline-block text-sm text-[#1A6B5C] font-medium hover:underline"
              >
                Register again →
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
