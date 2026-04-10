import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { LoginPage } from '@/modules/auth/LoginPage';
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

// Lazy-load all pages to keep initial bundle small
const DashboardPage         = lazy(() => import('@/modules/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const AnalyticsPage         = lazy(() => import('@/modules/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const KnowledgeFeedPage     = lazy(() => import('@/modules/knowledge/KnowledgeFeedPage').then(m => ({ default: m.KnowledgeFeedPage })));
const ArticlePage           = lazy(() => import('@/modules/knowledge/ArticlePage').then(m => ({ default: m.ArticlePage })));
const InventoryDashboardPage = lazy(() => import('@/modules/inventory/InventoryDashboardPage').then(m => ({ default: m.InventoryDashboardPage })));
const ProductsListPage      = lazy(() => import('@/modules/inventory/ProductsListPage').then(m => ({ default: m.ProductsListPage })));
const ProductFormPage       = lazy(() => import('@/modules/inventory/ProductFormPage').then(m => ({ default: m.ProductFormPage })));
const DrugCataloguePage     = lazy(() => import('@/modules/inventory/DrugCataloguePage').then(m => ({ default: m.DrugCataloguePage })));
const StockIntakePage       = lazy(() => import('@/modules/inventory/StockIntakePage').then(m => ({ default: m.StockIntakePage })));
const StockAdjustPage       = lazy(() => import('@/modules/inventory/StockAdjustPage').then(m => ({ default: m.StockAdjustPage })));
const BatchManagerPage      = lazy(() => import('@/modules/inventory/BatchManagerPage').then(m => ({ default: m.BatchManagerPage })));
const ExpiryDashboardPage   = lazy(() => import('@/modules/inventory/ExpiryDashboardPage').then(m => ({ default: m.ExpiryDashboardPage })));
const ComplianceDashboardPage = lazy(() => import('@/modules/compliance/ComplianceDashboardPage').then(m => ({ default: m.ComplianceDashboardPage })));
const ComplianceListPage    = lazy(() => import('@/modules/compliance/ComplianceListPage').then(m => ({ default: m.ComplianceListPage })));
const ComplianceItemDetailPage = lazy(() => import('@/modules/compliance/ComplianceItemDetailPage').then(m => ({ default: m.ComplianceItemDetailPage })));
const ComplianceItemFormPage = lazy(() => import('@/modules/compliance/ComplianceItemFormPage').then(m => ({ default: m.ComplianceItemFormPage })));
const InspectionChecklistPage = lazy(() => import('@/modules/compliance/InspectionChecklistPage').then(m => ({ default: m.InspectionChecklistPage })));
const DispensingScreenPage  = lazy(() => import('@/modules/patient-safety/DispensingScreenPage').then(m => ({ default: m.DispensingScreenPage })));
const NewPatientPage        = lazy(() => import('@/modules/patient-safety/NewPatientPage').then(m => ({ default: m.NewPatientPage })));
const PatientProfilePage    = lazy(() => import('@/modules/patient-safety/PatientProfilePage').then(m => ({ default: m.PatientProfilePage })));
const NhifDashboardPage     = lazy(() => import('@/modules/nhif/NhifDashboardPage').then(m => ({ default: m.NhifDashboardPage })));
const ClaimsListPage        = lazy(() => import('@/modules/nhif/ClaimsListPage').then(m => ({ default: m.ClaimsListPage })));
const NhifClaimDetailPage   = lazy(() => import('@/modules/nhif/NhifClaimDetailPage').then(m => ({ default: m.NhifClaimDetailPage })));
const CpdDashboardPage      = lazy(() => import('@/modules/cpd/CpdDashboardPage').then(m => ({ default: m.CpdDashboardPage })));
const LogActivityPage       = lazy(() => import('@/modules/cpd/LogActivityPage').then(m => ({ default: m.LogActivityPage })));
const ProfilePage           = lazy(() => import('@/modules/settings/ProfilePage').then(m => ({ default: m.ProfilePage })));
const TeamManagementPage    = lazy(() => import('@/modules/settings/TeamManagementPage').then(m => ({ default: m.TeamManagementPage })));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-[#1A6B5C] border-t-transparent rounded-full animate-spin" />
  </div>
);

export const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected */}
        <Route element={<AuthGuard><Layout /></AuthGuard>}>
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
          <Route path="/analytics" element={<Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>} />

          <Route path="/knowledge"       element={<Suspense fallback={<PageLoader />}><KnowledgeFeedPage /></Suspense>} />
          <Route path="/knowledge/:slug" element={<Suspense fallback={<PageLoader />}><ArticlePage /></Suspense>} />

          <Route path="/inventory"              element={<Suspense fallback={<PageLoader />}><InventoryDashboardPage /></Suspense>} />
          <Route path="/inventory/products"     element={<Suspense fallback={<PageLoader />}><ProductsListPage /></Suspense>} />
          <Route path="/inventory/products/new" element={<Suspense fallback={<PageLoader />}><ProductFormPage /></Suspense>} />
          <Route path="/inventory/products/:id" element={<Suspense fallback={<PageLoader />}><ProductFormPage /></Suspense>} />
          <Route path="/inventory/drug-master"  element={<Suspense fallback={<PageLoader />}><DrugCataloguePage /></Suspense>} />
          <Route path="/inventory/receive"      element={<Suspense fallback={<PageLoader />}><StockIntakePage /></Suspense>} />
          <Route path="/inventory/adjust"       element={<Suspense fallback={<PageLoader />}><StockAdjustPage /></Suspense>} />
          <Route path="/inventory/batches"      element={<Suspense fallback={<PageLoader />}><BatchManagerPage /></Suspense>} />
          <Route path="/inventory/expiry"       element={<Suspense fallback={<PageLoader />}><ExpiryDashboardPage /></Suspense>} />

          <Route path="/compliance"              element={<Suspense fallback={<PageLoader />}><ComplianceDashboardPage /></Suspense>} />
          <Route path="/compliance/items"        element={<Suspense fallback={<PageLoader />}><ComplianceListPage /></Suspense>} />
          <Route path="/compliance/items/new"    element={<Suspense fallback={<PageLoader />}><ComplianceItemFormPage /></Suspense>} />
          <Route path="/compliance/items/:id"    element={<Suspense fallback={<PageLoader />}><ComplianceItemDetailPage /></Suspense>} />
          <Route path="/compliance/items/:id/edit" element={<Suspense fallback={<PageLoader />}><ComplianceItemFormPage /></Suspense>} />
          <Route path="/compliance/inspection"   element={<Suspense fallback={<PageLoader />}><InspectionChecklistPage /></Suspense>} />

          <Route path="/dispensing"          element={<Suspense fallback={<PageLoader />}><DispensingScreenPage /></Suspense>} />
          <Route path="/patients/new"        element={<Suspense fallback={<PageLoader />}><NewPatientPage /></Suspense>} />
          <Route path="/patients/:id"        element={<Suspense fallback={<PageLoader />}><PatientProfilePage /></Suspense>} />

          <Route path="/nhif"               element={<Suspense fallback={<PageLoader />}><NhifDashboardPage /></Suspense>} />
          <Route path="/nhif/claims"        element={<Suspense fallback={<PageLoader />}><ClaimsListPage /></Suspense>} />
          <Route path="/nhif/claims/:id"    element={<Suspense fallback={<PageLoader />}><NhifClaimDetailPage /></Suspense>} />

          <Route path="/cpd"     element={<Suspense fallback={<PageLoader />}><CpdDashboardPage /></Suspense>} />
          <Route path="/cpd/log" element={<Suspense fallback={<PageLoader />}><LogActivityPage /></Suspense>} />

          <Route path="/settings/profile" element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} />
          <Route path="/settings/team"    element={<Suspense fallback={<PageLoader />}><TeamManagementPage /></Suspense>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);
