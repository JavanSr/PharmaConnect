import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { differenceInCalendarDays } from 'date-fns';
import { Outlet, useLocation } from 'react-router-dom';
import { api } from '@/lib/api';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { loadMemberships } from '@/lib/pharmacySelection';
import { TrialBanner } from '@/components/TrialBanner';
import { TrialPaywall } from '@/components/TrialPaywall';
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
  '/dispensing/daily-close': 'Daily Close',
  '/controlled-substances': 'Controlled Register',
  '/wholesale': 'Wholesale',
  '/wholesale/orders': 'Wholesale Orders',
  '/wholesale/settings': 'Wholesale Settings',
  '/orders': 'Orders',
  '/reports': 'Reports',
  '/attendance': 'Attendance',
  '/cpd': 'CPD Tracker',
  '/cpd/log': 'Log Activity',
  '/settings/profile': 'Profile',
  '/settings/team': 'Team Management',
  '/settings/subscription': 'Subscription',
};

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const pharmacy = usePharmacyStore((state) => state.pharmacy);
  const setPharmacy = usePharmacyStore((state) => state.setPharmacy);
  const setMemberships = usePharmacyStore((state) => state.setMemberships);

  const title = routeTitles[location.pathname] || '';
  const subscriptionQuery = useQuery({
    queryKey: ['layout-subscription-status'],
    queryFn: () => api.get('/settings/subscription').then((response) => response.data),
  });
  const membershipsQuery = useQuery({
    queryKey: ['me-pharmacies'],
    queryFn: loadMemberships,
    staleTime: 60_000,
  });

  const subscription = subscriptionQuery.data?.data;
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

  const daysRemaining =
    subscription?.trialEndsAt
      ? Math.max(0, differenceInCalendarDays(new Date(subscription.trialEndsAt), new Date()))
      : null;
  const isTrialExpired = subscription?.status === 'TRIAL' && subscription?.trialActive === false;

  return (
    <div className="flex h-screen bg-[#EDF7F3] overflow-hidden print:block print:h-auto print:overflow-visible print:bg-white">
      <div className="relative print:hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:block print:overflow-visible">
        <TopBar onMenuClick={() => setSidebarOpen(true)} title={title} />
        {daysRemaining != null && daysRemaining >= 0 && subscription?.status === 'TRIAL' && subscription?.trialActive && daysRemaining < 7 && (
          <TrialBanner daysRemaining={daysRemaining} />
        )}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 print:block print:overflow-visible print:p-0">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
      {isTrialExpired && location.pathname !== '/settings/subscription' && (
        <TrialPaywall currentTier={subscription?.subscriptionTier} />
      )}
    </div>
  );
};
