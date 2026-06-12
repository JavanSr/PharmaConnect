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
  const location = useLocation();
  const pharmacy = usePharmacyStore((state) => state.pharmacy);
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
    if (!subscription) {
      return;
    }

    const changed =
      !pharmacy ||
      Object.entries(subscription).some(([key, value]) => ((pharmacy as unknown as Record<string, unknown>)[key] !== value));

    if (changed) {
      setPharmacy({ ...(pharmacy ?? {}), ...subscription });
    }
  }, [pharmacy, setPharmacy, subscription]);

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
        <OnboardingWizard onComplete={() => setOnboardingDismissed(true)} />
      )}
      <div className="relative print:hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          inGrace={isInGrace}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:block print:overflow-visible">
        <TopBar onMenuClick={() => setSidebarOpen(true)} title={title} />
        {!isFounderAccount && daysRemaining != null && daysRemaining >= 0 && effectiveSubscription?.status === 'TRIAL' && effectiveSubscription?.trialActive && daysRemaining < 7 && (
          <TrialBanner daysRemaining={daysRemaining} />
        )}
        {!isFounderAccount && isInGrace && (
          <GraceAccessBanner graceActivatedAt={effectiveSubscription?.graceActivatedAt} />
        )}
        <main className="flex-1 overflow-y-auto px-margin-mobile py-stack-lg sm:px-margin-tablet print:block print:overflow-visible print:p-0">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
