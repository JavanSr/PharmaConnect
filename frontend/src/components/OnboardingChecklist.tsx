import React from 'react';
import { useNavigate } from 'react-router-dom';

type OnboardingStep = {
  id: string;
  label: string;
  description: string;
  route: string;
  completed: boolean;
};

export interface OnboardingChecklistProps {
  pharmacyId: string;
  hasProducts: boolean;
  isVerified: boolean;
  onDismiss: () => void;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  pharmacyId,
  hasProducts,
  isVerified,
  onDismiss,
}) => {
  const navigate = useNavigate();

  const steps: OnboardingStep[] = [
    {
      id: 'add-product',
      label: 'Add your first product',
      description: 'Add medicines to your inventory',
      route: '/inventory/products/new',
      completed: hasProducts,
    },
    {
      id: 'payment-methods',
      label: 'Set up payment methods',
      description: 'Configure M-Pesa and other payment options',
      route: '/settings/billing',
      completed: false,
    },
    {
      id: 'invite-team',
      label: 'Invite your team',
      description: 'Add dispensers and staff members',
      route: '/settings/team',
      completed: false,
    },
    {
      id: 'compliance',
      label: 'Configure compliance items',
      description: 'Add your licences and certificates',
      route: '/compliance',
      completed: false,
    },
    {
      id: 'first-sale',
      label: 'Record your first sale',
      description: 'Complete a dispensing transaction',
      route: '/dispensing',
      completed: false,
    },
    {
      id: 'fin-number',
      label: 'Review your FIN number',
      description: 'Enter your TMDA Facility Identification Number',
      route: '/settings/profile',
      completed: isVerified,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const allDone = completedCount === steps.length;

  const handleDismiss = () => {
    try {
      localStorage.setItem(`apotekh_onboarding_dismissed_${pharmacyId}`, 'true');
    } catch {
      /* storage unavailable */
    }
    onDismiss();
  };

  // Auto-dismiss when all steps are complete
  React.useEffect(() => {
    if (allDone) {
      handleDismiss();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  if (allDone) return null;

  return (
    <div className="bg-white border-l-4 border-pc-600 rounded-r-lg shadow-sm p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-pc-800">Getting started with APOTEKH</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {completedCount} of {steps.length} complete
          </p>
        </div>
        {/* Progress bar */}
        <div className="flex-shrink-0 w-24 mt-1">
          <div className="h-1.5 rounded-full bg-pc-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-pc-600 transition-all duration-500"
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <ul className="space-y-1">
        {steps.map((step) => (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => navigate(step.route)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-pc-50 transition-colors group"
            >
              {/* Checkbox icon */}
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {step.completed ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5 text-green-500"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <span className="w-4 h-4 rounded-full border-2 border-gray-300 group-hover:border-pc-500 transition-colors" />
                )}
              </span>

              {/* Label + description */}
              <span className="flex-1 min-w-0">
                <span
                  className={`block text-sm font-medium ${
                    step.completed ? 'text-gray-400 line-through' : 'text-pc-800'
                  }`}
                >
                  {step.label}
                </span>
                {!step.completed && (
                  <span className="block text-xs text-gray-400 truncate">{step.description}</span>
                )}
              </span>

              {/* Arrow */}
              {!step.completed && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4 flex-shrink-0 text-gray-300 group-hover:text-pc-500 transition-colors"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 0 1 0-1.414L10.586 10 7.293 6.707a1 1 0 0 1 1.414-1.414l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
