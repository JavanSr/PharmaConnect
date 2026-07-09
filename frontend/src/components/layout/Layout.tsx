import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { differenceInCalendarDays } from 'date-fns';
import { Outlet, useLocation } from 'react-router-dom';
import { api, TRIAL_EXPIRED_EVENT, GRACE_ACCESS_EVENT } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { loadMemberships } from '@/lib/pharmacySelection';
import { TrialBanner } from '@/components/TrialBanner';
import { TrialPaywall } from '@/components/TrialPaywall';
import { GraceAccessBanner } from '@/components/GraceAccessBanner';
import { FinVerificationBanner } from '@/components/FinVerificationBanner';
import { SystemStatusWindow } from '@/components/SystemStatusWindow';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ToastContainer } from '@/components/ui/Toast';

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/analytics': 'Analytics',
  '/forecasting': 'Forecasting',
  '/knowledge': 'Knowledge Hub',
  '/tmda-updates': 'TMDA Updates',
  '/inventory': 'Inventory',
  '/inventory/products': 'Products',
  '/inventory/drug-master': 'Drug Catalogue',
  '/inventory/receive': 'Receive Stock',
  '/inventory/adjust': 'Stock Adjustment',
  '/inventory/expiry': 'Expiry Dashboard',
  '/inventory/reports': 'Reports',
  '/compliance': 'Compliance Tracker',
  '/compliance/items': 'Compliance Items',
  '/compliance/staff': 'Staff Credentials',
  '/compliance/inspection': 'Inspection Checklist',
  '/dispensing': 'Dispensing',
  '/dispensing/returns': 'Dispensing Returns',
  '/dispensing/daily-close': 'Daily Close',
  '/dispensing/controlled-register': 'Controlled Register',
  '/wholesale': 'Wholesale',
  '/wholesale/orders': 'Wholesale Orders',
  '/wholesale/settings': 'Wholesale Settings',
  '/orders': 'Orders',
  '/reports': 'Reports',
  '/staff-activity': 'Staff Activity',
  '/attendance': 'Staff Activity',
  '/cpd': 'CPD Tracker',
  '/cpd/log': 'Log Activity',
  '/settings/profile': 'Profile',
  '/settings/team': 'Team Management',
  '/settings/subscription': 'Subscription',
  '/settings/data-review': 'Data Review',
  '/settings/source-updates': 'Source Updates',
};

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState<boolean>(() => {
    try { return localStorage.getItem('apotekh_sidebar_hidden') === 'true'; } catch { return false; }
  });

  React.useEffect(() => {
    try { localStorage.setItem('apotekh_sidebar_hidden', String(sidebarHidden)); } catch { /* storage unavailable */ }
  }, [sidebarHidden]);
  const location = useLocation();
  const pharmacy = usePharmacyStore((state) => state.pharmacy);
  const pharmacyRef = React.useRef(pharmacy);
  React.useLayoutEffect(() => { pharmacyRef.current = pharmacy; }, [pharmacy]);
  const memberships = usePharmacyStore((state) => state.memberships);
  const setPharmacy = usePharmacyStore((state) => state.setPharmacy);
  const setMemberships = usePharmacyStore((state) => state.setMemberships);
  const [forceTrialExpired, setForceTrialExpired] = React.useState(false);
  const [forceGraceAccess, setForceGraceAccess] = React.useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = React.useState(false);

  const title = routeTitles[location.pathname] || '';
  const user = useAuthStore((state) => state.user);
  const isFounderAccount = user?.role === 'SUPER_ADMIN';
  const isOwner = user?.role === 'OWNER';

  // Sync onboarding dismissed state with localStorage so it survives page reloads
  // even if the backend POST /onboarding/complete fails silently.
  React.useEffect(() => {
    if (!pharmacy?.id || isFounderAccount) return;
    try {
      if (localStorage.getItem(`onboarding_dismissed_${pharmacy.id}`) === 'true') {
        setOnboardingDismissed(true);
      }
    } catch { /* storage unavailable */ }
  }, [pharmacy?.id, isFounderAccount]);

  // Onboarding wizard: shown once to OWNER until they complete or skip it.
  // Uses PharmacySetting key 'onboarding_completed' so it persists across logins.
  const onboardingQuery = useQuery({
    queryKey: ['onboarding-status', pharmacy?.id],
    queryFn: () => api.get('/settings/onboarding/status').then((r) => r.data.data),
    enabled: isOwner && !!pharmacy?.id && !onboardingDismissed,
    staleTime: Infinity,
    retry: false,
  });
  const showOnboarding =
    isOwner &&
    !onboardingDismissed &&
    onboardingQuery.isSuccess &&
    onboardingQuery.data?.completed === false;
  const subscriptionQuery = useQuery({
    queryKey: ['layout-subscription-status'],
    queryFn: () => api.get('/settings/subscription').then((response) => response.data),
    // networkMode: 'offlineFirst' — fire query even when offline so the SW
    // can serve the cached response; don't pause with an infinite spinner.
    networkMode: 'offlineFirst',
    staleTime: 60_000,
    // Don't retry on network failure — the SW cache either has it or doesn't.
    retry: false,
  });
  const membershipsQuery = useQuery({
    queryKey: ['me-pharmacies'],
    queryFn: loadMemberships,
    enabled: memberships.length === 0,
    staleTime: 60_000,
  });

  const subscription = subscriptionQuery.data?.data;
  const effectiveSubscription = subscription ?? pharmacy;
  React.useEffect(() => {
    if (!membershipsQuery.data?.length) {
      return;
    }

    setMemberships(membershipsQuery.data);

    const selectedMembership = membershipsQuery.data.find((membership) => membership.selected) ?? membershipsQuery.data[0];
    if (selectedMembership && selectedMembership.pharmacy.id !== pharmacy?.id) {
      setPharmacy(selectedMembership.pharmacy);
    }
  }, [membershipsQuery.data, pharmacy?.id, setMemberships, setPharmacy]);

  React.useEffect(() => {
    if (!subscription) return;
    const prev = pharmacyRef.current;
    const changed =
      !prev ||
      Object.entries(subscription).some(([key, value]) => (prev as unknown as Record<string, unknown>)[key] !== value);
    if (changed) {
      setPharmacy({ ...(prev ?? {}), ...subscription } as any);
    }
  }, [setPharmacy, subscription]);

  React.useEffect(() => {
    const handleTrialExpired = () => setForceTrialExpired(true);
    window.addEventListener(TRIAL_EXPIRED_EVENT, handleTrialExpired);
    return () => window.removeEventListener(TRIAL_EXPIRED_EVENT, handleTrialExpired);
  }, []);

  React.useEffect(() => {
    const handleGraceAccess = () => setForceGraceAccess(true);
    window.addEventListener(GRACE_ACCESS_EVENT, handleGraceAccess);
    return () => window.removeEventListener(GRACE_ACCESS_EVENT, handleGraceAccess);
  }, []);

  const daysRemaining =
    effectiveSubscription?.trialEndsAt
      ? Math.max(0, differenceInCalendarDays(new Date(effectiveSubscription.trialEndsAt), new Date()))
      : null;
  const trialEndedByDate = effectiveSubscription?.trialEndsAt ? new Date(effectiveSubscription.trialEndsAt) < new Date() : false;
  const isTrialExpired = forceTrialExpired || (effectiveSubscription?.status === 'TRIAL' && (effectiveSubscription?.trialActive === false || trialEndedByDate));

  // Grace access: subscription lapsed on a paid account, or status explicitly GRACE.
  // Never a hard block — owner keeps access, banner shown instead.
  const isSubscriptionLapsed =
    effectiveSubscription?.status === 'ACTIVE' &&
    effectiveSubscription?.trialEndsAt != null &&
    new Date(effectiveSubscription.trialEndsAt) < new Date();
  const isInGrace = forceGraceAccess || effectiveSubscription?.status === 'GRACE' || isSubscriptionLapsed;

  if (!isFounderAccount && subscriptionQuery.isLoading && !effectiveSubscription) {
    return (
      <SystemStatusWindow
        type="loading"
        title="Loading workspace"
        message="Checking subscription, pharmacy access, and workspace data."
      />
    );
  }

  if (!isFounderAccount && subscriptionQuery.isError && !effectiveSubscription) {
    // If offline, the subscription fetch failed because there's no network AND
    // no SW cache yet (very first visit, or SW not yet installed). Show an
    // "offline" message rather than "something is broken".
    if (!navigator.onLine) {
      return (
        <SystemStatusWindow
          type="error"
          title="You're offline"
          message="Connect to the internet to access your workspace. Your data will load automatically once reconnected."
          actionLabel="Try reconnecting"
          onAction={() => window.location.reload()}
        />
      );
    }
    return (
      <SystemStatusWindow
        type="error"
        title="Workspace could not be loaded"
        message="The system could not confirm this pharmacy workspace. Check the connection and reload."
        actionLabel="Reload app"
        onAction={() => window.location.reload()}
      />
    );
  }

  if (!isFounderAccount && isTrialExpired) {
    return (
      <>
        <TrialPaywall currentTier={effectiveSubscription?.subscriptionTier} />
        <ToastContainer />
      </>
    );
  }

  // Grace mode: never block, but show a persistent banner.
  // The full app renders normally - only the banner differs.

  return (
    <div className="flex h-screen bg-background text-on-surface overflow-hidden print:block print:h-auto print:overflow-visible print:bg-white">
      {showOnboarding && (
        <OnboardingWizard onComplete={() => {
          if (pharmacy?.id) {
            try { localStorage.setItem(`onboarding_dismissed_${pharmacy.id}`, 'true'); } catch { /* storage unavailable */ }
          }
          setOnboardingDismissed(true);
        }} />
      )}
      <div className="relative print:hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          inGrace={isInGrace}
          hiddenOnDesktop={sidebarHidden}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:block print:overflow-visible">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          onDesktopToggle={() => setSidebarHidden(h => !h)}
          title={title}
        />
        {!isFounderAccount && daysRemaining != null && daysRemaining >= 0 && effectiveSubscription?.status === 'TRIAL' && effectiveSubscription?.trialActive && daysRemaining < 7 && (
          <TrialBanner daysRemaining={daysRemaining} />
        )}
        {!isFounderAccount && isInGrace && (
          <GraceAccessBanner graceActivatedAt={effectiveSubscription?.graceActivatedAt} />
        )}
        {!isFounderAccount && (
          <FinVerificationBanner />
        )}
        <main className="flex-1 overflow-y-auto px-margin-mobile py-stack-lg sm:px-margin-tablet print:block print:overflow-visible print:p-0">
          <Outlet />
        </main>
      </div>

      <ToastContainer />

      {/* WhatsApp support floating button — only for logged-in non-admin users */}
      {user && !location.pathname.startsWith('/superadmin') && (
        <a
          href="https://wa.me/255764591374?text=Hi%20APOTEKH%20Support%2C%20I%20need%20help"
          target="_blank"
          rel="noopener noreferrer"
          title="Chat with Support"
          aria-label="Chat with Support on WhatsApp"
          className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 print:hidden"
          style={{ backgroundColor: '#25D366' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="24" height="24" aria-hidden="true">
            <path d="M20.52 3.48A11.93 11.93 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.11.55 4.17 1.6 5.98L0 24l6.18-1.57A11.93 11.93 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.22-3.48-8.52zM12 22c-1.85 0-3.67-.5-5.25-1.43l-.38-.22-3.9.99 1.02-3.78-.25-.4A9.93 9.93 0 0 1 2 12C2 6.48 6.48 2 12 2c2.67 0 5.18 1.04 7.07 2.93A9.93 9.93 0 0 1 22 12c0 5.52-4.48 10-10 10zm5.44-7.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17c-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.19-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01s-.52.08-.8.37c-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.7.63.72.23 1.37.2 1.89.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z"/>
          </svg>
        </a>
      )}
    </div>
  );
};
