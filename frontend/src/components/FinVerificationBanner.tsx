import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';

export const FinVerificationBanner: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const pharmacy = usePharmacyStore((s) => s.pharmacy);

  if (!pharmacy || pharmacy.isVerified || user?.role === 'SUPER_ADMIN') return null;

  return (
    <div className="flex items-center justify-between gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm">
      <div className="flex items-center gap-2 text-amber-800">
        <ShieldAlert size={15} className="shrink-0 text-amber-600" />
        <span>
          Your pharmacy is <strong>unverified</strong> — enter your TMDA Facility Identification Number (FIN) to unlock wholesale B2B ordering and confirm your regulatory status.
        </span>
      </div>
      {(user?.role === 'OWNER' || user?.role === 'PHARMACIST_IN_CHARGE') && (
        <Link
          to="/settings/pharmacy-profile"
          className="shrink-0 text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900"
        >
          Enter FIN
        </Link>
      )}
    </div>
  );
};
