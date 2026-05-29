import React from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';

export const ImpersonationBanner: React.FC = () => {
  const isImpersonating = useAuthStore((s) => s.isImpersonating);
  const impersonationInfo = useAuthStore((s) => s.impersonationInfo);

  if (!isImpersonating) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[9999] flex items-center justify-between gap-3 bg-red-600 px-4 py-2 text-white shadow-lg">
      <div className="flex items-center gap-2">
        <ShieldAlert size={16} />
        <span className="text-sm font-semibold">
          ADMIN VIEW — Reading as {impersonationInfo?.ownerName ?? 'owner'} at {impersonationInfo?.pharmacyName ?? 'pharmacy'}.
          {' '}All write operations are blocked.
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs opacity-80">Session expires in 15 min · tab close ends session</span>
        <button
          onClick={() => window.close()}
          className="rounded-full p-1 hover:bg-red-700"
          title="Close tab"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
