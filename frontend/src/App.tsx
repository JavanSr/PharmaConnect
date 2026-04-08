import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initApiInterceptors } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Layout } from '@/components/layout/Layout';
import { ComingSoonGate } from '@/components/ComingSoonGate';

// Auth pages
import { LoginPage } from '@/modules/auth/LoginPage';
import { RegisterPage } from '@/modules/auth/RegisterPage';

// Lazy loaded pages
const DashboardPage = React.lazy(() => import('@/modules/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const AnalyticsPage = React.lazy(() => import('@/modules/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const InventoryDashboard = React.lazy(() => import('@/modules/inventory/InventoryDashboardPage').then(m => ({ default: m.InventoryDashboardPage })));
const ProductsListPage = React.lazy(() => import('@/modules/inventory/ProductsListPage').then(m => ({ default: m.ProductsListPage })));
const StockIntakePage = React.lazy(() => import('@/modules/inventory/StockIntakePage').then(m => ({ default: m.StockIntakePage })));
const ExpiryDashboardPage = React.lazy(() => import('@/modules/inventory/ExpiryDashboardPage').then(m => ({ default: m.ExpiryDashboardPage })));
const ProductFormPage = React.lazy(() => import('@/modules/inventory/ProductFormPage').then(m => ({ default: m.ProductFormPage })));
const DrugCataloguePage = React.lazy(() => import('@/modules/inventory/DrugCataloguePage').then(m => ({ default: m.DrugCataloguePage })));
const StockAdjustPage = React.lazy(() => import('@/modules/inventory/StockAdjustPage').then(m => ({ default: m.StockAdjustPage })));
const BatchManagerPage = React.lazy(() => import('@/modules/inventory/BatchManagerPage').then(m => ({ default: m.BatchManagerPage })));
const ComplianceDashboardPage = React.lazy(() => import('@/modules/compliance/ComplianceDashboardPage').then(m => ({ default: m.ComplianceDashboardPage })));
const ComplianceListPage = React.lazy(() => import('@/modules/compliance/ComplianceListPage').then(m => ({ default: m.ComplianceListPage })));
const ComplianceItemDetailPage = React.lazy(() => import('@/modules/compliance/ComplianceItemDetailPage').then(m => ({ default: m.ComplianceItemDetailPage })));
const ComplianceItemFormPage = React.lazy(() => import('@/modules/compliance/ComplianceItemFormPage').then(m => ({ default: m.ComplianceItemFormPage })));
const InspectionChecklistPage = React.lazy(() => import('@/modules/compliance/InspectionChecklistPage').then(m => ({ default: m.InspectionChecklistPage })));
const DispensingScreenPage = React.lazy(() => import('@/modules/patient-safety/DispensingScreenPage').then(m => ({ default: m.DispensingScreenPage })));
const NewPatientPage = React.lazy(() => import('@/modules/patient-safety/NewPatientPage').then(m => ({ default: m.NewPatientPage })));
const PatientProfilePage = React.lazy(() => import('@/modules/patient-safety/PatientProfilePage').then(m => ({ default: m.PatientProfilePage })));
const CpdDashboardPage = React.lazy(() => import('@/modules/cpd/CpdDashboardPage').then(m => ({ default: m.CpdDashboardPage })));
const LogActivityPage = React.lazy(() => import('@/modules/cpd/LogActivityPage').then(m => ({ default: m.LogActivityPage })));
const KnowledgeFeedPage = React.lazy(() => import('@/modules/knowledge/KnowledgeFeedPage').then(m => ({ default: m.KnowledgeFeedPage })));
const ArticlePage = React.lazy(() => import('@/modules/knowledge/ArticlePage').then(m => ({ default: m.ArticlePage })));
const ProfilePage = React.lazy(() => import('@/modules/settings/ProfilePage').then(m => ({ default: m.ProfilePage })));
const TeamManagementPage = React.lazy(() => import('@/modules/settings/TeamManagementPage').then(m => ({ default: m.TeamManagementPage })));

// Initialize API interceptors
const store = useAuthStore.getState;
initApiInterceptors(
  () => ({ accessToken: store().accessToken, refreshToken: store().refreshToken, clearAuth: store().clearAuth }),
  (token) => store().setAccessToken(token)
);

const Suspense: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <React.Suspense fallback={
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-3 border-[#1A6B5C] border-t-transparent rounded-full animate-spin" />
    </div>
  }>
    {children}
  </React.Suspense>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected */}
        <Route element={<AuthGuard><Layout /></AuthGuard>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<Suspense><DashboardPage /></Suspense>} />
          <Route path="/analytics" element={<Suspense><AnalyticsPage /></Suspense>} />

          {/* Knowledge Hub */}
          <Route path="/knowledge" element={<Suspense><KnowledgeFeedPage /></Suspense>} />
          <Route path="/knowledge/:slug" element={<Suspense><ArticlePage /></Suspense>} />

          {/* Inventory */}
          <Route path="/inventory" element={<Suspense><InventoryDashboard /></Suspense>} />
          <Route path="/inventory/products" element={<Suspense><ProductsListPage /></Suspense>} />
          <Route path="/inventory/products/new" element={<Suspense><ProductFormPage /></Suspense>} />
          <Route path="/inventory/products/:id/edit" element={<Suspense><ProductFormPage /></Suspense>} />
          <Route path="/inventory/drug-master" element={<Suspense><DrugCataloguePage /></Suspense>} />
          <Route path="/inventory/receive" element={<Suspense><StockIntakePage /></Suspense>} />
          <Route path="/inventory/expiry" element={<Suspense><ExpiryDashboardPage /></Suspense>} />
          <Route path="/inventory/adjust" element={<Suspense><StockAdjustPage /></Suspense>} />
          <Route path="/inventory/batches" element={<Suspense><BatchManagerPage /></Suspense>} />

          {/* Compliance */}
          <Route path="/compliance" element={<Suspense><ComplianceDashboardPage /></Suspense>} />
          <Route path="/compliance/items" element={<Suspense><ComplianceListPage /></Suspense>} />
          <Route path="/compliance/items/new" element={<Suspense><ComplianceItemFormPage /></Suspense>} />
          <Route path="/compliance/items/:id/edit" element={<Suspense><ComplianceItemFormPage /></Suspense>} />
          <Route path="/compliance/items/:id" element={<Suspense><ComplianceItemDetailPage /></Suspense>} />
          <Route path="/compliance/inspection" element={<Suspense><InspectionChecklistPage /></Suspense>} />

          {/* Dispensing / Patient Safety */}
          <Route path="/dispensing" element={<Suspense><DispensingScreenPage /></Suspense>} />
          <Route path="/dispensing/patient/new" element={<Suspense><NewPatientPage /></Suspense>} />
          <Route path="/dispensing/patient/:id" element={<Suspense><PatientProfilePage /></Suspense>} />

          {/* NHIF */}
          <Route path="/nhif" element={
            <ComingSoonGate
              phase={2}
              moduleName="NHIF Claims"
              description="NHIF Claims processing is pending a formal data integration agreement with the National Health Insurance Fund. This module will be activated once the API partnership is confirmed."
              features={[
                'Real-time member eligibility verification',
                'ICD-10 coded claim submission',
                'Automated claim scrubbing and validation',
                'Offline claim queue with auto-sync',
                'Rejection analysis and resubmission',
                'Monthly folio reporting',
              ]}
              estimatedPhase="Pending NHIF API Agreement"
            />
          } />
          <Route path="/nhif/claims" element={<Navigate to="/nhif" replace />} />
          <Route path="/nhif/claims/:id" element={<Navigate to="/nhif" replace />} />

          {/* CPD */}
          <Route path="/cpd" element={<Suspense><CpdDashboardPage /></Suspense>} />
          <Route path="/cpd/log" element={<Suspense><LogActivityPage /></Suspense>} />

          {/* Settings */}
          <Route path="/settings/profile" element={<Suspense><ProfilePage /></Suspense>} />
          <Route path="/settings/team" element={<Suspense><TeamManagementPage /></Suspense>} />

          {/* Phase 2 — Coming Soon */}
          <Route path="/stock-exchange" element={<ComingSoonGate phase={2} moduleName="Stock Exchange" description="Buy and sell near-expiry stock with other pharmacies in your region." features={['Near-expiry stock marketplace', 'Peer-to-peer transfers', 'Automated pricing suggestions', 'TMDA-compliant transfer records']} estimatedPhase="Phase 2 — Professional Services" />} />
          <Route path="/cpd/courses" element={<ComingSoonGate phase={2} moduleName="CPD Courses" description="Structured online courses for professional development and licence renewal." features={['Accredited online courses', 'Video lectures from specialists', 'Assessment and certification', 'Automatic CPD point logging']} estimatedPhase="Phase 2 — Professional Services" />} />
          <Route path="/patients/full-safety" element={<ComingSoonGate phase={2} moduleName="Advanced Patient Safety" description="Clinical decision support and patient risk scoring." features={['AI-powered risk stratification', 'Medication reconciliation', 'Patient adherence tracking', 'Refill reminders']} estimatedPhase="Phase 2 — Professional Services" />} />

          {/* Phase 3 — Future */}
          <Route path="/b2b" element={<ComingSoonGate phase={3} moduleName="B2B Platform" description="Connect directly with wholesalers and manufacturers for better pricing." features={['Direct wholesale ordering', 'Price comparison engine', 'Automated reorder triggers', 'Supplier performance ratings']} estimatedPhase="Phase 3 — Ecosystem" />} />
          <Route path="/patient-app" element={<ComingSoonGate phase={3} moduleName="Patient App" description="Mobile app for patients to manage their prescriptions and health records." features={['Prescription tracking', 'Refill reminders', 'Medicine information', 'Find nearby pharmacies']} estimatedPhase="Phase 3 — Ecosystem" />} />
          <Route path="/compliance/advanced" element={<ComingSoonGate phase={3} moduleName="Advanced Compliance" description="Automated regulatory reporting and audit preparation." features={['Automated TMDA reporting', 'Narcotics register digitisation', 'Inspection readiness score', 'Legal document management']} estimatedPhase="Phase 3 — Ecosystem" />} />

          {/* Phase 4 — Future */}
          <Route path="/ai-safety" element={<ComingSoonGate phase={4} moduleName="AI Safety Engine" description="Machine learning models trained on Tanzania NEML data for advanced clinical decision support." features={['Predictive interaction checking', 'Dosage optimisation AI', 'Resistance pattern detection', 'Real-time pharmacovigilance']} estimatedPhase="Phase 4 — Regional Scale" />} />
          <Route path="/data-products" element={<ComingSoonGate phase={4} moduleName="Data Products" description="Aggregate pharmacy data products for public health research and supply chain optimisation." features={['Anonymised dispensing datasets', 'Regional demand forecasting API', 'Public health dashboard', 'Research partnership portal']} estimatedPhase="Phase 4 — Regional Scale" />} />
          <Route path="/expansion" element={<ComingSoonGate phase={4} moduleName="Regional Expansion" description="Multi-country rollout with localisation for East African markets." features={['Kenya, Uganda, Rwanda support', 'Multi-currency payments', 'Regional regulatory frameworks', 'Cross-border transfer compliance']} estimatedPhase="Phase 4 — Regional Scale" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
