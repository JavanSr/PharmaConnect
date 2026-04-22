import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { LoginPage } from '@/modules/auth/LoginPage';
import { PharmacySelectorPage } from '@/modules/auth/PharmacySelectorPage';
import { RegisterPage } from '@/modules/auth/RegisterPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const DashboardPage = lazy(() => import('@/modules/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
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
const DailyClose = lazy(() => import('@/modules/dispensing/DailyClose').then(m => ({ default: m.DailyClose })));
const NhifClaimsPage = lazy(() => import('@/modules/deferred/NhifClaimsPage').then(m => ({ default: m.NhifClaimsPage })));
const PrescriptionManagementPage = lazy(() => import('@/modules/deferred/PrescriptionManagementPage').then(m => ({ default: m.PrescriptionManagementPage })));
const SymptomCheckerPage = lazy(() => import('@/modules/deferred/SymptomCheckerPage').then(m => ({ default: m.SymptomCheckerPage })));
const PatientRecordsPage = lazy(() => import('@/modules/deferred/PatientRecordsPage').then(m => ({ default: m.PatientRecordsPage })));
const AccreditedCpdPage = lazy(() => import('@/modules/deferred/AccreditedCpdPage').then(m => ({ default: m.AccreditedCpdPage })));
const ControlledSubstancesPage = lazy(() => import('@/modules/deferred/ControlledSubstancesPage').then(m => ({ default: m.ControlledSubstancesPage })));
const CpdDashboardPage = lazy(() => import('@/modules/cpd/CpdDashboardPage').then(m => ({ default: m.CpdDashboardPage })));
const LogActivityPage = lazy(() => import('@/modules/cpd/LogActivityPage').then(m => ({ default: m.LogActivityPage })));
const CourseDetailPage = lazy(() => import('@/modules/cpd/CourseDetailPage').then(m => ({ default: m.CourseDetailPage })));
const WholesaleDashboardPage = lazy(() => import('@/modules/wholesale/WholesaleDashboardPage').then(m => ({ default: m.WholesaleDashboardPage })));
const OrdersPage = lazy(() => import('@/modules/orders/OrdersPage').then(m => ({ default: m.OrdersPage })));
const ReportsPage = lazy(() => import('@/modules/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const AttendancePage = lazy(() => import('@/modules/reports/AttendancePage').then(m => ({ default: m.AttendancePage })));
const ProfilePage = lazy(() => import('@/modules/settings/ProfilePage').then(m => ({ default: m.ProfilePage })));
const TeamManagementPage = lazy(() => import('@/modules/settings/TeamManagementPage').then(m => ({ default: m.TeamManagementPage })));
const SubscriptionPage = lazy(() => import('@/modules/settings/SubscriptionPage').then(m => ({ default: m.SubscriptionPage })));

const PageLoader = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1A6B5C] border-t-transparent" />
  </div>
);

const OfflineSyncBootstrap: React.FC = () => {
  useOfflineSync(true);
  return null;
};

export const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <OfflineSyncBootstrap />
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/select-pharmacy" element={<AuthGuard><PharmacySelectorPage /></AuthGuard>} />
        <Route path="/nhif-claims" element={<Suspense fallback={<PageLoader />}><NhifClaimsPage /></Suspense>} />
        <Route path="/prescriptions" element={<Suspense fallback={<PageLoader />}><PrescriptionManagementPage /></Suspense>} />
        <Route path="/symptom-checker" element={<Suspense fallback={<PageLoader />}><SymptomCheckerPage /></Suspense>} />
        <Route path="/patient-records" element={<Suspense fallback={<PageLoader />}><PatientRecordsPage /></Suspense>} />
        <Route path="/accredited-cpd" element={<Suspense fallback={<PageLoader />}><AccreditedCpdPage /></Suspense>} />
        <Route path="/controlled-substances" element={<Suspense fallback={<PageLoader />}><ControlledSubstancesPage /></Suspense>} />
        <Route path="/verify/:certificateId" element={<Suspense fallback={<PageLoader />}><CertificateVerifyPage /></Suspense>} />

        <Route element={<AuthGuard><Layout /></AuthGuard>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
          <Route path="/analytics" element={<Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>} />
          <Route path="/forecasting" element={<Suspense fallback={<PageLoader />}><ForecastingPage /></Suspense>} />
          <Route path="/knowledge" element={<Suspense fallback={<PageLoader />}><KnowledgeFeedPage /></Suspense>} />
          <Route path="/knowledge/:slug" element={<Suspense fallback={<PageLoader />}><ArticlePage /></Suspense>} />
          <Route path="/inventory" element={<Suspense fallback={<PageLoader />}><InventoryDashboardPage /></Suspense>} />
          <Route path="/inventory/products" element={<Suspense fallback={<PageLoader />}><ProductsListPage /></Suspense>} />
          <Route path="/inventory/products/new" element={<Suspense fallback={<PageLoader />}><ProductFormPage /></Suspense>} />
          <Route path="/inventory/products/:id" element={<Suspense fallback={<PageLoader />}><ProductFormPage /></Suspense>} />
          <Route path="/inventory/drug-master" element={<Suspense fallback={<PageLoader />}><DrugCataloguePage /></Suspense>} />
          <Route path="/inventory/receive" element={<Suspense fallback={<PageLoader />}><StockIntakePage /></Suspense>} />
          <Route path="/inventory/adjust" element={<Suspense fallback={<PageLoader />}><StockAdjustPage /></Suspense>} />
          <Route path="/inventory/batches" element={<Suspense fallback={<PageLoader />}><BatchManagerPage /></Suspense>} />
          <Route path="/inventory/expiry" element={<Suspense fallback={<PageLoader />}><ExpiryDashboardPage /></Suspense>} />
          <Route path="/inventory/conflicts" element={<Suspense fallback={<PageLoader />}><InventoryConflictsPage /></Suspense>} />
          <Route path="/compliance" element={<Suspense fallback={<PageLoader />}><ComplianceDashboardPage /></Suspense>} />
          <Route path="/compliance/items" element={<Suspense fallback={<PageLoader />}><ComplianceListPage /></Suspense>} />
          <Route path="/compliance/items/new" element={<Suspense fallback={<PageLoader />}><ComplianceItemFormPage /></Suspense>} />
          <Route path="/compliance/items/:id" element={<Suspense fallback={<PageLoader />}><ComplianceItemDetailPage /></Suspense>} />
          <Route path="/compliance/items/:id/edit" element={<Suspense fallback={<PageLoader />}><ComplianceItemFormPage /></Suspense>} />
          <Route path="/compliance/staff" element={<Suspense fallback={<PageLoader />}><StaffCredentialsPage /></Suspense>} />
          <Route path="/compliance/inspection" element={<Suspense fallback={<PageLoader />}><InspectionChecklistPage /></Suspense>} />
          <Route path="/dispensing" element={<Suspense fallback={<PageLoader />}><DispensingScreen /></Suspense>} />
          <Route path="/dispensing/daily-close" element={<Suspense fallback={<PageLoader />}><DailyClose /></Suspense>} />
          <Route path="/wholesale" element={<Suspense fallback={<PageLoader />}><WholesaleDashboardPage /></Suspense>} />
          <Route path="/b2b" element={<Navigate to="/orders" replace />} />
          <Route path="/orders" element={<Suspense fallback={<PageLoader />}><OrdersPage /></Suspense>} />
          <Route path="/reports" element={<Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>} />
          <Route path="/attendance" element={<Suspense fallback={<PageLoader />}><AttendancePage /></Suspense>} />
          <Route path="/patients/new" element={<Navigate to="/patient-records" replace />} />
          <Route path="/patients/:id" element={<Navigate to="/patient-records" replace />} />
          <Route path="/nhif" element={<Navigate to="/nhif-claims" replace />} />
          <Route path="/nhif/claims" element={<Navigate to="/nhif-claims" replace />} />
          <Route path="/nhif/claims/:id" element={<Navigate to="/nhif-claims" replace />} />
          <Route path="/cpd" element={<Suspense fallback={<PageLoader />}><CpdDashboardPage /></Suspense>} />
          <Route path="/cpd/log" element={<Suspense fallback={<PageLoader />}><LogActivityPage /></Suspense>} />
          <Route path="/cpd/courses/:slug" element={<Suspense fallback={<PageLoader />}><CourseDetailPage /></Suspense>} />
          <Route path="/settings/profile" element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} />
          <Route path="/settings/team" element={<Suspense fallback={<PageLoader />}><TeamManagementPage /></Suspense>} />
          <Route path="/settings/subscription" element={<Suspense fallback={<PageLoader />}><SubscriptionPage /></Suspense>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);
