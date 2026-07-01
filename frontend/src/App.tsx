import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthGuard, RoleGuard } from '@/components/layout/AuthGuard';
import { ErrorBoundary, PageErrorBoundary } from '@/components/ErrorBoundary';
import { SystemStatusWindow } from '@/components/SystemStatusWindow';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useHeartbeat } from '@/hooks/useHeartbeat';
import { ImpersonationBanner } from '@/modules/admin/ImpersonationBanner';
import { UpdateBanner } from '@/components/UpdateBanner';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAuthStore } from '@/stores/authStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { api } from '@/lib/api';
import { cacheProducts, getProductCacheTimestamp, markProductCatalogSynced } from '@/lib/offlineProducts';
import type { UserRole } from '@/types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Fire queries even when navigator.onLine is false so the service worker
      // can intercept the fetch and serve from its API cache.
      // Without this, React Query pauses all queries offline and the app shows
      // infinite loading spinners even though the SW has cached every response.
      networkMode: 'offlineFirst',
      // Don't retry when offline — the SW will serve from cache on the first
      // attempt. Extra retries just add 2× the wait time for no benefit.
      retry: (failureCount, error: unknown) => {
        if (!navigator.onLine) return false;
        const code = (error as { code?: string } | null)?.code;
        if (code === 'OFFLINE_QUEUED' || code === 'ERR_NETWORK') return false;
        return failureCount < 1;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Same reasoning — don't pause mutations; api.ts interceptor queues them
      // in IndexedDB when offline and the user gets a toast confirmation.
      networkMode: 'offlineFirst',
    },
  },
});

const DashboardPage = lazy(() => import('@/modules/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const Layout = lazy(() => import('@/components/layout/Layout').then(m => ({ default: m.Layout })));
const LoginPage = lazy(() => import('@/modules/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import('@/modules/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/modules/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const PharmacySelectorPage = lazy(() => import('@/modules/auth/PharmacySelectorPage').then(m => ({ default: m.PharmacySelectorPage })));
const RegisterPage = lazy(() => import('@/modules/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const CheckEmailPage = lazy(() => import('@/modules/auth/CheckEmailPage').then(m => ({ default: m.CheckEmailPage })));
const VerifyEmailPage = lazy(() => import('@/modules/auth/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })));
const TrialConfirmPage = lazy(() => import('@/modules/auth/TrialConfirmPage').then(m => ({ default: m.TrialConfirmPage })));
const AnalyticsPage = lazy(() => import('@/modules/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const ForecastingPage = lazy(() => import('@/modules/analytics/ForecastingPage').then(m => ({ default: m.ForecastingPage })));
const KnowledgeFeedPage = lazy(() => import('@/modules/knowledge/KnowledgeFeedPage').then(m => ({ default: m.KnowledgeFeedPage })));
const ArticlePage = lazy(() => import('@/modules/knowledge/ArticlePage').then(m => ({ default: m.ArticlePage })));
const CertificateVerifyPage = lazy(() => import('@/modules/knowledge/CertificateVerifyPage').then(m => ({ default: m.CertificateVerifyPage })));
const InventoryDashboardPage = lazy(() => import('@/modules/inventory/InventoryDashboardPage').then(m => ({ default: m.InventoryDashboardPage })));
const ProductsListPage = lazy(() => import('@/modules/inventory/ProductsListPage').then(m => ({ default: m.ProductsListPage })));
const ProductFormPage = lazy(() => import('@/modules/inventory/ProductFormPage').then(m => ({ default: m.ProductFormPage })));
const DrugCataloguePage = lazy(() => import('@/modules/inventory/DrugCataloguePage').then(m => ({ default: m.DrugCataloguePage })));
const StockIntakePage = lazy(() => import('@/modules/inventory/StockIntakePage').then(m => ({ default: m.StockIntakePage })));
const CatalogueImportPage = lazy(() => import('@/modules/inventory/CatalogueImportPage').then(m => ({ default: m.CatalogueImportPage })));
const StockOrderListPage = lazy(() => import('@/modules/inventory/StockOrderListPage').then(m => ({ default: m.StockOrderListPage })));
const StockOrderPreparePage = lazy(() => import('@/modules/inventory/StockOrderPreparePage').then(m => ({ default: m.StockOrderPreparePage })));
const StockOrderViewPage = lazy(() => import('@/modules/inventory/StockOrderViewPage').then(m => ({ default: m.StockOrderViewPage })));
const StockAdjustPage = lazy(() => import('@/modules/inventory/StockAdjustPage').then(m => ({ default: m.StockAdjustPage })));
const BatchManagerPage = lazy(() => import('@/modules/inventory/BatchManagerPage').then(m => ({ default: m.BatchManagerPage })));
const ExpiryDashboardPage = lazy(() => import('@/modules/inventory/ExpiryDashboardPage').then(m => ({ default: m.ExpiryDashboardPage })));
const InventoryConflictsPage = lazy(() => import('@/modules/inventory/InventoryConflictsPage').then(m => ({ default: m.InventoryConflictsPage })));
const ComplianceDashboardPage = lazy(() => import('@/modules/compliance/ComplianceDashboardPage').then(m => ({ default: m.ComplianceDashboardPage })));
const ComplianceListPage = lazy(() => import('@/modules/compliance/ComplianceListPage').then(m => ({ default: m.ComplianceListPage })));
const ComplianceItemDetailPage = lazy(() => import('@/modules/compliance/ComplianceItemDetailPage').then(m => ({ default: m.ComplianceItemDetailPage })));
const ComplianceItemFormPage = lazy(() => import('@/modules/compliance/ComplianceItemFormPage').then(m => ({ default: m.ComplianceItemFormPage })));
const InspectionChecklistPage = lazy(() => import('@/modules/compliance/InspectionChecklistPage').then(m => ({ default: m.InspectionChecklistPage })));
const StaffCredentialsPage = lazy(() => import('@/modules/compliance/StaffCredentialsPage').then(m => ({ default: m.StaffCredentialsPage })));
const DispensingScreen = lazy(() => import('@/modules/dispensing/DispensingScreen').then(m => ({ default: m.DispensingScreen })));
const DispensingReturnsPage = lazy(() => import('@/modules/dispensing/DispensingReturnsPage').then(m => ({ default: m.DispensingReturnsPage })));
const PatientSafetyAlertsPage = lazy(() => import('@/modules/dispensing/PatientSafetyAlertsPage').then(m => ({ default: m.PatientSafetyAlertsPage })));
const DailyClose = lazy(() => import('@/modules/dispensing/DailyClose').then(m => ({ default: m.DailyClose })));
const NhifClaimsPage = lazy(() => import('@/modules/deferred/NhifClaimsPage').then(m => ({ default: m.NhifClaimsPage })));
const PrescriptionManagementPage = lazy(() => import('@/modules/deferred/PrescriptionManagementPage').then(m => ({ default: m.PrescriptionManagementPage })));
const SymptomCheckerPage = lazy(() => import('@/modules/deferred/SymptomCheckerPage').then(m => ({ default: m.SymptomCheckerPage })));
const PatientRecordsPage = lazy(() => import('@/modules/deferred/PatientRecordsPage').then(m => ({ default: m.PatientRecordsPage })));
const AccreditedCpdPage = lazy(() => import('@/modules/deferred/AccreditedCpdPage').then(m => ({ default: m.AccreditedCpdPage })));
const ControlledSubstancesPage = lazy(() => import('@/modules/deferred/ControlledSubstancesPage').then(m => ({ default: m.ControlledSubstancesPage })));
const PharmacovigilancePage = lazy(() => import('@/modules/deferred/PharmacovigilancePage').then(m => ({ default: m.PharmacovigilancePage })));
const UnsubscribePage = lazy(() => import('@/modules/knowledge/UnsubscribePage').then(m => ({ default: m.UnsubscribePage })));
const ControlledDrugsRegisterPage = lazy(() => import('@/modules/dispensing/ControlledDrugsRegisterPage').then(m => ({ default: m.ControlledDrugsRegisterPage })));
const TmdaUpdatesPage = lazy(() => import('@/modules/knowledge/TmdaUpdatesPage').then(m => ({ default: m.TmdaUpdatesPage })));
const CpdDashboardPage = lazy(() => import('@/modules/cpd/CpdDashboardPage').then(m => ({ default: m.CpdDashboardPage })));
const LogActivityPage = lazy(() => import('@/modules/cpd/LogActivityPage').then(m => ({ default: m.LogActivityPage })));
const CourseDetailPage = lazy(() => import('@/modules/cpd/CourseDetailPage').then(m => ({ default: m.CourseDetailPage })));
const WholesaleDashboardPage = lazy(() => import('@/modules/wholesale/WholesaleDashboardPage').then(m => ({ default: m.WholesaleDashboardPage })));
const WholesaleSettingsPage = lazy(() => import('@/modules/wholesale/WholesaleSettingsPage').then(m => ({ default: m.WholesaleSettingsPage })));
const WholesaleInvoicesPage = lazy(() => import('@/modules/wholesale/WholesaleInvoicesPage').then(m => ({ default: m.WholesaleInvoicesPage })));
const ManualOrderPage = lazy(() => import('@/modules/wholesale/ManualOrderPage').then(m => ({ default: m.ManualOrderPage })));
const DeliveryManifestsPage = lazy(() => import('@/modules/wholesale/DeliveryManifestsPage').then(m => ({ default: m.DeliveryManifestsPage })));
const ReturnsPage = lazy(() => import('@/modules/wholesale/ReturnsPage').then(m => ({ default: m.ReturnsPage })));
const PurchaseOrdersPage = lazy(() => import('@/modules/wholesale/PurchaseOrdersPage').then(m => ({ default: m.PurchaseOrdersPage })));
const ClientPricingPage = lazy(() => import('@/modules/wholesale/ClientPricingPage').then(m => ({ default: m.ClientPricingPage })));
const BuyerOrderPage = lazy(() => import('@/modules/wholesale/BuyerOrderPage').then(m => ({ default: m.BuyerOrderPage })));
const WholesaleSchemesPage = lazy(() => import('@/modules/wholesale/WholesaleSchemesPage').then(m => ({ default: m.WholesaleSchemesPage })));
const WholesaleCollectionsPage = lazy(() => import('@/modules/wholesale/WholesaleCollectionsPage').then(m => ({ default: m.WholesaleCollectionsPage })));
const OrdersPage = lazy(() => import('@/modules/orders/OrdersPage').then(m => ({ default: m.OrdersPage })));
const ReportsPage = lazy(() => import('@/modules/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const StaffActivityPage = lazy(() => import('@/modules/reports/StaffActivityPage').then(m => ({ default: m.StaffActivityPage })));
const ProfilePage = lazy(() => import('@/modules/settings/ProfilePage').then(m => ({ default: m.ProfilePage })));
const SecurityPage = lazy(() => import('@/modules/settings/SecurityPage').then(m => ({ default: m.SecurityPage })));
const PharmacyProfilePage = lazy(() => import('@/modules/settings/PharmacyProfilePage').then(m => ({ default: m.PharmacyProfilePage })));
const NotificationsSettingsPage = lazy(() => import('@/modules/settings/NotificationsSettingsPage').then(m => ({ default: m.NotificationsSettingsPage })));
const PrintingReceiptsPage = lazy(() => import('@/modules/settings/PrintingReceiptsPage').then(m => ({ default: m.PrintingReceiptsPage })));
const TeamManagementPage = lazy(() => import('@/modules/settings/TeamManagementPage').then(m => ({ default: m.TeamManagementPage })));
const SubscriptionPage = lazy(() => import('@/modules/settings/SubscriptionPage').then(m => ({ default: m.SubscriptionPage })));
const DataReviewPage = lazy(() => import('@/modules/settings/DataReviewPage').then(m => ({ default: m.DataReviewPage })));
const SourceUpdatesPage = lazy(() => import('@/modules/settings/SourceUpdatesPage').then(m => ({ default: m.SourceUpdatesPage })));
const FeaturesPage = lazy(() => import('@/modules/settings/FeaturesPage').then(m => ({ default: m.FeaturesPage })));
const MyOutletsPage = lazy(() => import('@/modules/settings/MyOutletsPage').then(m => ({ default: m.MyOutletsPage })));
const FounderDashboardPage = lazy(() => import('@/modules/founder/FounderDashboardPage').then(m => ({ default: m.FounderDashboardPage })));
const AdminShell = lazy(() => import('@/modules/admin/AdminShell').then(m => ({ default: m.AdminShell })));
const AdminAuthGuard = lazy(() => import('@/modules/admin/AdminAuthGuard').then(m => ({ default: m.AdminAuthGuard })));
const AdminDashboardPage = lazy(() => import('@/modules/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminPharmaciesPage = lazy(() => import('@/modules/admin/AdminPharmaciesPage').then(m => ({ default: m.AdminPharmaciesPage })));
const AdminPharmacyDetailPage = lazy(() => import('@/modules/admin/AdminPharmacyDetailPage').then(m => ({ default: m.AdminPharmacyDetailPage })));
const AdminAuditPage = lazy(() => import('@/modules/admin/AdminAuditPage').then(m => ({ default: m.AdminAuditPage })));
const AdminFeatureFlagsPage = lazy(() => import('@/modules/admin/AdminFeatureFlagsPage').then(m => ({ default: m.AdminFeatureFlagsPage })));
const AdminMessagesPage = lazy(() => import('@/modules/admin/AdminMessagesPage').then(m => ({ default: m.AdminMessagesPage })));
const AdminKnowledgePage = lazy(() => import('@/modules/admin/AdminKnowledgePage').then(m => ({ default: m.AdminKnowledgePage })));
const WholesalerDiscoveryPage = lazy(() => import('@/modules/inventory/WholesalerDiscoveryPage').then(m => ({ default: m.WholesalerDiscoveryPage })));
const WholesalerCataloguePage = lazy(() => import('@/modules/inventory/WholesalerCataloguePage').then(m => ({ default: m.WholesalerCataloguePage })));
const MedicinePriceComparisonPage = lazy(() => import('@/modules/inventory/MedicinePriceComparisonPage').then(m => ({ default: m.MedicinePriceComparisonPage })));
const WholesalerCSVUploadPage = lazy(() => import('@/modules/inventory/WholesalerCSVUploadPage').then(m => ({ default: m.WholesalerCSVUploadPage })));
const HelpPage = lazy(() => import('@/modules/help/HelpPage').then(m => ({ default: m.HelpPage })));

const PageLoader = () => (
  <SystemStatusWindow
    type="loading"
    title="Loading"
    message="Preparing this screen."
  />
);

const page = (node: React.ReactNode, roles?: UserRole[]) => (
  <RoleGuard roles={roles}>
    <PageErrorBoundary>
      <Suspense fallback={<PageLoader />}>{node}</Suspense>
    </PageErrorBoundary>
  </RoleGuard>
);

// Blocks pure WHOLESALE pharmacies from retail-only routes.
const WholesaleBlockedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pharmacy = usePharmacyStore((state) => state.pharmacy);
  const user = useAuthStore((state) => state.user);
  if (pharmacy?.pharmacyType === 'WHOLESALE' && user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/wholesale" replace />;
  }
  return <>{children}</>;
};

const retailPage = (node: React.ReactNode, roles?: UserRole[]) => (
  <WholesaleBlockedRoute>
    {page(node, roles)}
  </WholesaleBlockedRoute>
);

const OfflineSyncBootstrap: React.FC = () => {
  const { lastWarning } = useOfflineSync(true);
  const toast = useNotificationStore((state) => state.toast);
  useHeartbeat();

  React.useEffect(() => {
    if (lastWarning) {
      toast.warning(lastWarning, 8000);
    }
  }, [lastWarning, toast]);

  return null;
};

const PRODUCT_CACHE_REFRESH_MS = 60 * 60 * 1000; // 1 hour
const PRODUCT_CACHE_PAGE_LIMIT = 1000;
const PRODUCT_CACHE_MAX_PAGES = 5;

const ProductCacheWarmer: React.FC = () => {
  const pharmacy = usePharmacyStore((state) => state.pharmacy);
  const isWarmingRef = React.useRef(false);

  React.useEffect(() => {
    if (!pharmacy?.id) return;
    let warmTimer: number | undefined;

    const warm = async () => {
      if (isWarmingRef.current || !navigator.onLine) return;
      const lastSynced = await getProductCacheTimestamp();
      if (lastSynced && Date.now() - new Date(lastSynced).getTime() < PRODUCT_CACHE_REFRESH_MS) return;
      isWarmingRef.current = true;
      try {
        let page = 1;
        let cachedCount = 0;
        while (page <= PRODUCT_CACHE_MAX_PAGES) {
          const response = await api.get('/inventory/products/offline-cache', {
            params: { page, limit: PRODUCT_CACHE_PAGE_LIMIT },
            timeout: 10_000,
          });
          const products = response.data?.data ?? [];
          if (!Array.isArray(products) || products.length === 0) break;
          await cacheProducts(products);
          cachedCount += products.length;
          if (products.length < PRODUCT_CACHE_PAGE_LIMIT) break;
          page += 1;
        }
        if (cachedCount > 0) {
          await markProductCatalogSynced();
        }
      } catch {
        // best-effort — never block the app
      } finally {
        isWarmingRef.current = false;
      }
    };

    const scheduleWarm = () => {
      if (warmTimer) {
        window.clearTimeout(warmTimer);
      }
      warmTimer = window.setTimeout(() => {
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(() => void warm(), { timeout: 10_000 });
          return;
        }
        void warm();
      }, 15_000);
    };

    scheduleWarm();
    window.addEventListener('online', scheduleWarm);
    return () => {
      if (warmTimer) {
        window.clearTimeout(warmTimer);
      }
      window.removeEventListener('online', scheduleWarm);
    };
  }, [pharmacy?.id]);

  return null;
};

const AuthenticatedOfflineSyncBootstrap: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return isAuthenticated ? (
    <>
      <OfflineSyncBootstrap />
      <ProductCacheWarmer />
    </>
  ) : null;
};

// Reads ?impersonation_token=... from the URL on mount and activates impersonation mode.
const ImpersonationBootstrap: React.FC = () => {
  const setImpersonation = useAuthStore((s) => s.setImpersonation);
  const setPharmacy = usePharmacyStore((s) => s.setPharmacy);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('impersonation_token');
    const ownerName = params.get('impersonation_name') ?? 'Owner';
    const pharmacyName = params.get('impersonation_pharmacy') ?? 'Pharmacy';

    if (token) {
      setImpersonation(token, { ownerName, pharmacyName });
      // Decode pharmacy context from the JWT payload
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.pharmacyId) {
          // Fetch pharmacy info to populate the store
          import('@/lib/api').then(({ api }) => {
            api.get('/me/pharmacy').then((r) => {
              if (r.data?.data) setPharmacy(r.data.data);
            }).catch(() => {});
          });
        }
      } catch {}
      // Clean URL so token doesn't sit in history
      const clean = new URL(window.location.href);
      clean.searchParams.delete('impersonation_token');
      clean.searchParams.delete('impersonation_name');
      clean.searchParams.delete('impersonation_pharmacy');
      window.history.replaceState({}, '', clean.pathname + (clean.search !== '?' ? clean.search : ''));
    }
  }, []);

  return null;
};

export const App: React.FC = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <UpdateBanner />
    <AuthenticatedOfflineSyncBootstrap />
    <ImpersonationBootstrap />
    <ImpersonationBanner />
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
        <Route path="/auth/forgot-password" element={<Suspense fallback={<PageLoader />}><ForgotPasswordPage /></Suspense>} />
        <Route path="/auth/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPasswordPage /></Suspense>} />
        <Route path="/register" element={<Suspense fallback={<PageLoader />}><RegisterPage /></Suspense>} />
        <Route path="/auth/check-email" element={<Suspense fallback={<PageLoader />}><CheckEmailPage /></Suspense>} />
        <Route path="/auth/verify-email" element={<Suspense fallback={<PageLoader />}><VerifyEmailPage /></Suspense>} />
        <Route path="/auth/trial-confirmed" element={<AuthGuard><Suspense fallback={<PageLoader />}><TrialConfirmPage /></Suspense></AuthGuard>} />
        <Route path="/select-pharmacy" element={<AuthGuard><Suspense fallback={<PageLoader />}><PharmacySelectorPage /></Suspense></AuthGuard>} />
        {/* Deferred "coming soon" pages — require login; placeholder content only */}
        <Route path="/nhif-claims" element={<AuthGuard><Suspense fallback={<PageLoader />}><NhifClaimsPage /></Suspense></AuthGuard>} />
        <Route path="/prescriptions" element={<AuthGuard><Suspense fallback={<PageLoader />}><PrescriptionManagementPage /></Suspense></AuthGuard>} />
        <Route path="/symptom-checker" element={<AuthGuard><Suspense fallback={<PageLoader />}><SymptomCheckerPage /></Suspense></AuthGuard>} />
        <Route path="/patient-records" element={<AuthGuard><Suspense fallback={<PageLoader />}><PatientRecordsPage /></Suspense></AuthGuard>} />
        <Route path="/accredited-cpd" element={<AuthGuard><Suspense fallback={<PageLoader />}><AccreditedCpdPage /></Suspense></AuthGuard>} />
        <Route path="/controlled-substances" element={<AuthGuard><Suspense fallback={<PageLoader />}><ControlledSubstancesPage /></Suspense></AuthGuard>} />
        <Route path="/controlled-substances-reporting" element={<Navigate to="/controlled-substances" replace />} />
        <Route path="/pharmacovigilance" element={<AuthGuard><Suspense fallback={<PageLoader />}><PharmacovigilancePage /></Suspense></AuthGuard>} />
        <Route path="/unsubscribe/:token" element={<Suspense fallback={<PageLoader />}><UnsubscribePage /></Suspense>} />
        <Route path="/verify/:certificateId" element={<Suspense fallback={<PageLoader />}><CertificateVerifyPage /></Suspense>} />

        <Route element={<AuthGuard><PageErrorBoundary><Suspense fallback={<PageLoader />}><Layout /></Suspense></PageErrorBoundary></AuthGuard>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={page(<DashboardPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'CASHIER', 'DATA_ENTRY_CLERK', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF', 'SUPER_ADMIN'])} />
          <Route path="/analytics" element={page(<AnalyticsPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'WHOLESALE_MANAGER'])} />
          <Route path="/forecasting" element={page(<ForecastingPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'WHOLESALE_MANAGER'])} />
          <Route path="/knowledge" element={<WholesaleBlockedRoute><PageErrorBoundary><Suspense fallback={<PageLoader />}><KnowledgeFeedPage /></Suspense></PageErrorBoundary></WholesaleBlockedRoute>} />
          <Route path="/tmda-updates" element={<WholesaleBlockedRoute><PageErrorBoundary><Suspense fallback={<PageLoader />}><TmdaUpdatesPage /></Suspense></PageErrorBoundary></WholesaleBlockedRoute>} />
          <Route path="/knowledge/:slug" element={<WholesaleBlockedRoute><PageErrorBoundary><Suspense fallback={<PageLoader />}><ArticlePage /></Suspense></PageErrorBoundary></WholesaleBlockedRoute>} />
          {/* DATA_ENTRY_CLERK: stock intake + supplier management (all tiers) */}
          <Route path="/inventory" element={page(<InventoryDashboardPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF'])} />
          <Route path="/inventory/products" element={page(<ProductsListPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF'])} />
          <Route path="/inventory/products/new" element={page(<ProductFormPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'WHOLESALE_MANAGER'])} />
          <Route path="/inventory/products/:id" element={page(<ProductFormPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'WHOLESALE_MANAGER'])} />
          <Route path="/inventory/drug-master" element={page(<DrugCataloguePage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF'])} />
          <Route path="/inventory/receive" element={page(<StockIntakePage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF'])} />
          <Route path="/inventory/stock-orders" element={page(<StockOrderListPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF'])} />
          <Route path="/inventory/stock-orders/new" element={page(<StockOrderPreparePage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'WHOLESALE_MANAGER'])} />
          <Route path="/inventory/stock-orders/:id/edit" element={page(<StockOrderPreparePage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'WHOLESALE_MANAGER'])} />
          <Route path="/inventory/stock-orders/:id" element={page(<StockOrderViewPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF'])} />
          {/* Supplier discovery: DATA_ENTRY_CLERK has supplier management access */}
          <Route path="/inventory/wholesalers" element={page(<WholesalerDiscoveryPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'WHOLESALE_MANAGER'])} />
          <Route path="/inventory/wholesaler/:wholesalerId" element={page(<WholesalerCataloguePage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'WHOLESALE_MANAGER'])} />
          <Route path="/inventory/price-comparison" element={page(<MedicinePriceComparisonPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'WHOLESALE_MANAGER'])} />
          <Route path="/inventory/upload-wholesalers" element={page(<WholesalerCSVUploadPage />, ['SUPER_ADMIN'])} />
          <Route path="/inventory/adjust" element={page(<StockAdjustPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF'])} />
          <Route path="/inventory/batches" element={page(<BatchManagerPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF'])} />
          <Route path="/inventory/expiry" element={page(<ExpiryDashboardPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF'])} />
          <Route path="/inventory/conflicts" element={page(<InventoryConflictsPage />, ['OWNER', 'PHARMACIST_IN_CHARGE'])} />
          <Route path="/inventory/import-catalogue" element={page(<CatalogueImportPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER'])} />
          <Route path="/compliance" element={retailPage(<ComplianceDashboardPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF'])} />
          <Route path="/compliance/items" element={retailPage(<ComplianceListPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF'])} />
          <Route path="/compliance/items/new" element={retailPage(<ComplianceItemFormPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF'])} />
          <Route path="/compliance/items/:id" element={retailPage(<ComplianceItemDetailPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF'])} />
          <Route path="/compliance/items/:id/edit" element={retailPage(<ComplianceItemFormPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF'])} />
          <Route path="/compliance/staff" element={retailPage(<StaffCredentialsPage />, ['OWNER', 'PHARMACIST_IN_CHARGE'])} />
          <Route path="/compliance/inspection" element={retailPage(<InspectionChecklistPage />, ['OWNER', 'PHARMACIST_IN_CHARGE'])} />
          <Route path="/dispensing" element={retailPage(<DispensingScreen />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'CASHIER'])} />
          <Route path="/dispensing/returns" element={retailPage(<DispensingReturnsPage />, ['OWNER', 'PHARMACIST_IN_CHARGE'])} />
          <Route path="/dispensing/alerts" element={retailPage(<PatientSafetyAlertsPage />, ['OWNER', 'PHARMACIST_IN_CHARGE'])} />
          <Route path="/dispensing/daily-close" element={retailPage(<DailyClose />, ['OWNER', 'PHARMACIST_IN_CHARGE'])} />
          <Route path="/dispensing/controlled-register" element={retailPage(<ControlledDrugsRegisterPage />, ['OWNER', 'PHARMACIST_IN_CHARGE'])} />
          <Route path="/wholesale" element={page(<WholesaleDashboardPage />, ['OWNER', 'WHOLESALE_MANAGER'])} />
          <Route path="/wholesale/orders" element={page(<OrdersPage />, ['OWNER', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF', 'DELIVERY_STAFF'])} />
          <Route path="/wholesale/buy" element={page(<BuyerOrderPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'WHOLESALE_MANAGER'])} />
          <Route path="/wholesale/invoices" element={page(<WholesaleInvoicesPage />, ['OWNER', 'WHOLESALE_MANAGER'])} />
          <Route path="/wholesale/manual-order" element={page(<ManualOrderPage />, ['OWNER', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'])} />
          <Route path="/wholesale/manifests" element={page(<DeliveryManifestsPage />, ['OWNER', 'WHOLESALE_MANAGER', 'DELIVERY_STAFF', 'SUPER_ADMIN'])} />
          <Route path="/wholesale/returns" element={page(<ReturnsPage />, ['OWNER', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'])} />
          <Route path="/wholesale/purchase-orders" element={page(<PurchaseOrdersPage />, ['OWNER', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'])} />
          <Route path="/wholesale/client-pricing" element={page(<ClientPricingPage />, ['OWNER', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'])} />
          <Route path="/wholesale/schemes" element={page(<WholesaleSchemesPage />, ['OWNER', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'])} />
          <Route path="/wholesale/collections" element={page(<WholesaleCollectionsPage />, ['OWNER', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'])} />
          <Route path="/wholesale/settings" element={page(<WholesaleSettingsPage />, ['OWNER', 'WHOLESALE_MANAGER'])} />
          <Route path="/b2b" element={<Navigate to="/wholesale/orders" replace />} />
          <Route path="/orders" element={<Navigate to="/wholesale/orders" replace />} />
          <Route path="/reports" element={page(<ReportsPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'CASHIER', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'])} />
          <Route path="/staff-activity" element={retailPage(<StaffActivityPage />, ['OWNER', 'PHARMACIST_IN_CHARGE'])} />
          <Route path="/attendance" element={<Navigate to="/staff-activity" replace />} />
          <Route path="/patients/new" element={<Navigate to="/patient-records" replace />} />
          <Route path="/patients/:id" element={<Navigate to="/patient-records" replace />} />
          <Route path="/nhif" element={<Navigate to="/nhif-claims" replace />} />
          <Route path="/nhif/claims" element={<Navigate to="/nhif-claims" replace />} />
          <Route path="/nhif/claims/:id" element={<Navigate to="/nhif-claims" replace />} />
          <Route path="/cpd" element={page(<CpdDashboardPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER'])} />
          <Route path="/cpd/log" element={page(<LogActivityPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER'])} />
          <Route path="/cpd/courses/:slug" element={page(<CourseDetailPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER'])} />
          <Route path="/settings" element={<Navigate to="/settings/profile" replace />} />
          <Route path="/settings/profile" element={<PageErrorBoundary><Suspense fallback={<PageLoader />}><ProfilePage /></Suspense></PageErrorBoundary>} />
          <Route path="/settings/team" element={page(<TeamManagementPage />, ['OWNER', 'PHARMACIST_IN_CHARGE'])} />
          <Route path="/settings/subscription" element={page(<SubscriptionPage />, ['OWNER'])} />
          <Route path="/settings/security" element={<PageErrorBoundary><Suspense fallback={<PageLoader />}><SecurityPage /></Suspense></PageErrorBoundary>} />
          <Route path="/settings/pharmacy-profile" element={page(<PharmacyProfilePage />, ['OWNER', 'SUPER_ADMIN'])} />
          <Route path="/settings/notifications" element={<PageErrorBoundary><Suspense fallback={<PageLoader />}><NotificationsSettingsPage /></Suspense></PageErrorBoundary>} />
          <Route path="/settings/printing" element={page(<PrintingReceiptsPage />, ['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'])} />
          <Route path="/settings/data-review" element={page(<DataReviewPage />, ['SUPER_ADMIN'])} />
          <Route path="/settings/source-updates" element={page(<SourceUpdatesPage />, ['SUPER_ADMIN'])} />
          <Route path="/settings/features" element={page(<FeaturesPage />, ['OWNER', 'PHARMACIST_IN_CHARGE'])} />
          <Route path="/settings/my-locations" element={page(<MyOutletsPage />, ['OWNER'])} />
          <Route path="/help" element={page(<HelpPage />)} />
          <Route path="/founder" element={<Navigate to="/superadmin/founder" replace />} />
        </Route>

        {/* ── Super-admin panel — completely separate layout ─────────────────── */}
        <Route element={<Suspense fallback={<PageLoader />}><AdminAuthGuard /></Suspense>}>
          <Route element={<Suspense fallback={<PageLoader />}><AdminShell /></Suspense>}>
            <Route path="/superadmin" element={<Suspense fallback={<PageLoader />}><AdminDashboardPage /></Suspense>} />
            <Route path="/superadmin/pharmacies" element={<Suspense fallback={<PageLoader />}><AdminPharmaciesPage /></Suspense>} />
            <Route path="/superadmin/pharmacies/:id" element={<Suspense fallback={<PageLoader />}><AdminPharmacyDetailPage /></Suspense>} />
            <Route path="/superadmin/audit" element={<Suspense fallback={<PageLoader />}><AdminAuditPage /></Suspense>} />
            <Route path="/superadmin/feature-flags" element={<Suspense fallback={<PageLoader />}><AdminFeatureFlagsPage /></Suspense>} />
            <Route path="/superadmin/messages" element={<Suspense fallback={<PageLoader />}><AdminMessagesPage /></Suspense>} />
            <Route path="/superadmin/founder" element={<Suspense fallback={<PageLoader />}><FounderDashboardPage /></Suspense>} />
            <Route path="/superadmin/knowledge" element={<Suspense fallback={<PageLoader />}><AdminKnowledgePage /></Suspense>} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
