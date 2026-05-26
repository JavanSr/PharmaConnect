import React from 'react';
import { Link } from 'react-router-dom';

interface GraceAccessBannerProps {
  /** ISO date string of when grace was activated, or null if not tracked yet */
  graceActivatedAt?: string | null;
}

/**
 * GraceAccessBanner — shown to pharmacies whose subscription has lapsed.
 *
 * APOTEKH never cuts off a pharmacy. When a subscription lapses, the owner
 * retains single-user access to core dispensing permanently. This banner
 * communicates that state without blocking access.
 */
export const GraceAccessBanner: React.FC<GraceAccessBannerProps> = ({ graceActivatedAt }) => {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  const lapseDate = graceActivatedAt
    ? new Date(graceActivatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="relative border-b border-amber-200 bg-amber-50 px-4 py-3">
      <div className="mx-auto flex max-w-screen-xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <span className="mt-0.5 flex-shrink-0 text-amber-500" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </span>

          <div>
            <p className="text-sm font-semibold text-amber-900">
              Subscription lapsed — grace access active
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              {lapseDate
                ? `Your subscription expired on ${lapseDate}. `
                : 'Your subscription has expired. '}
              You are operating on grace access: dispensing works normally, but only you can log in.
              Other staff are locked out until the subscription is renewed.
            </p>
          </div>
        </div>

        <div className="ml-9 flex flex-shrink-0 items-center gap-3 sm:ml-0">
          <Link
            to="/settings/subscription"
            className="inline-flex items-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
          >
            Renew now
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded p-1 text-amber-500 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
            aria-label="Dismiss banner"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
