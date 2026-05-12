import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export const TrialBanner: React.FC<{ daysRemaining: number }> = ({ daysRemaining }) => {
  const user = useAuthStore((state) => state.user);
  const canManageSubscription = ['OWNER', 'SUPER_ADMIN'].includes(user?.role || '');
  const tone =
    daysRemaining < 2
      ? 'border-red-200 bg-red-50 text-[#991B1B]'
      : 'border-amber-200 bg-amber-50 text-[#92400E]';

  return (
    <div className={`mx-4 mt-4 rounded-2xl border px-4 py-3 sm:mx-6 ${tone}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">
              Trial: {daysRemaining} day{daysRemaining === 1 ? '' : 's'} remaining
            </p>
            <p className="text-xs opacity-80">
              {canManageSubscription ? 'Upgrade before the trial ends to keep access uninterrupted.' : 'Ask the owner to renew before the trial ends.'}
            </p>
          </div>
        </div>
        {canManageSubscription && (
          <Link to="/settings/subscription" className="text-sm font-semibold underline underline-offset-2">
            View subscription options
          </Link>
        )}
      </div>
    </div>
  );
};
