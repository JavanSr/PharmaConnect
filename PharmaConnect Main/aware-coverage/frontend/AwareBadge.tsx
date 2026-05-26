// frontend/src/components/AwareBadge.tsx
//
// Inline badge shown next to WATCH and RESERVE antibiotics in the dispensing UI.
// ACCESS antibiotics and non-antibiotic drugs render nothing — null by design.
//
// AWaRe (Access / Watch / Reserve) is a WHO antibiotic stewardship framework.
// It applies ONLY to antibacterials. Non-antibiotic drugs pass awarClass={null}
// and this component renders nothing.

import { useState } from 'react';

type AwarClass = 'ACCESS' | 'WATCH' | 'RESERVE' | null | undefined;

interface AwareBadgeProps {
  awarClass: AwarClass;
}

const CONFIG = {
  WATCH: {
    label: 'WATCH antibiotic',
    badgeClass:
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ' +
      'bg-amber-100 text-amber-800 border border-amber-300',
    tooltipText:
      'This antibiotic is classified as WATCH under WHO AWaRe / Tanzania NEMLIT 2021. ' +
      'Dispensing requires a valid prescription from an authorised facility.',
  },
  RESERVE: {
    label: 'RESERVE antibiotic',
    badgeClass:
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ' +
      'bg-red-100 text-red-700 border border-red-300',
    tooltipText:
      'This antibiotic is classified as RESERVE under WHO AWaRe / Tanzania NEMLIT 2021. ' +
      'Dispensing requires a valid prescription from an authorised facility.',
  },
} as const;

export function AwareBadge({ awarClass }: AwareBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // ACCESS drugs and non-antibiotics (null) render nothing
  if (!awarClass || awarClass === 'ACCESS') return null;

  const config = CONFIG[awarClass];

  return (
    <span className="relative inline-flex items-center">
      <span
        className={config.badgeClass}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        tabIndex={0}
        role="img"
        aria-label={config.tooltipText}
      >
        {awarClass === 'RESERVE' && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )}
        {awarClass === 'WATCH' && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )}
        {config.label}
      </span>

      {showTooltip && (
        <span
          role="tooltip"
          className={
            'absolute left-0 top-full mt-1 z-50 w-64 rounded-lg border ' +
            'bg-gray-900 text-white text-xs p-3 shadow-lg leading-relaxed'
          }
        >
          {config.tooltipText}
        </span>
      )}
    </span>
  );
}
