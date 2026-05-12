import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';

export const UnsubscribePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    api.get(`/knowledge/unsubscribe/${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(180deg,#EDF7F3_0%,#F8FAFC_100%)] px-4">
      <div className="max-w-md w-full bg-white rounded-[28px] border border-[#D6F0E8] p-8 text-center shadow-sm">
        {status === 'loading' && (
          <>
            <div className="mx-auto mb-5 h-8 w-8 animate-spin rounded-full border-4 border-[#1A6B5C] border-t-transparent" />
            <p className="text-sm text-[#475569]">Processing your request…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#EDF7F3]">
              <CheckCircle2 size={28} className="text-[#1A6B5C]" />
            </div>
            <h1 className="text-xl font-bold text-[#0D4035]">You're unsubscribed</h1>
            <p className="mt-2 text-sm text-[#475569]">
              You will no longer receive weekly Knowledge Hub digests from APOTEKH.
            </p>
            <Link to="/login" className="mt-6 inline-block text-sm font-medium text-[#1A6B5C] hover:underline">
              Back to platform
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <XCircle size={28} className="text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-[#0D4035]">Link not recognised</h1>
            <p className="mt-2 text-sm text-[#475569]">
              This unsubscribe link may have already been used or has expired. If you continue to receive emails, contact us.
            </p>
            <Link to="/login" className="mt-6 inline-block text-sm font-medium text-[#1A6B5C] hover:underline">
              Back to platform
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
