import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

const FOUNDER_WHATSAPP = '255764591374';

export const TrialPaywall: React.FC<{ currentTier?: string | null }> = ({ currentTier }) => {
  const message = encodeURIComponent(
    `I would like to upgrade PharmaConnect to ${currentTier || 'STANDARD'}`,
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#082B23]/65 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-[28px] bg-white p-6 shadow-2xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1A6B5C]">
            Trial ended
          </p>
          <h2 className="mt-3 text-3xl font-bold text-[#0D4035]">
            Your 30-day trial has ended
          </h2>
          <p className="mt-3 text-sm text-[#475569]">
            Access is paused until payment is confirmed. You can still open the subscription page to
            review plans and message the founder directly.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#D6F0E8] bg-[#EDF7F3] p-4">
              <p className="text-xs uppercase tracking-wide text-[#64748B]">M-Pesa</p>
              <p className="mt-2 text-sm font-semibold text-[#0D4035]">+255 764 591 374</p>
              <p className="mt-1 text-xs text-[#475569]">Use your pharmacy name as the reference.</p>
            </div>
            <div className="rounded-2xl border border-[#D6F0E8] bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-[#64748B]">Bank transfer</p>
              <p className="mt-2 text-sm font-semibold text-[#0D4035]">Request current bank details via WhatsApp</p>
              <p className="mt-1 text-xs text-[#475569]">
                Access is restored within 24 hours after confirmation.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={`https://wa.me/${FOUNDER_WHATSAPP}?text=${message}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex"
            >
              <Button className="w-full sm:w-auto">Contact founder on WhatsApp</Button>
            </a>
            <Link to="/settings/subscription" className="inline-flex">
              <Button variant="secondary" className="w-full sm:w-auto">Open subscription page</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
