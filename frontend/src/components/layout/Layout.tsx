import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ToastContainer } from '@/components/ui/Toast';

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/analytics': 'Analytics',
  '/knowledge': 'Knowledge Hub',
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
  '/nhif': 'NHIF Claims',
  '/nhif/claims': 'Claims',
  '/nhif/batches': 'Batch Manager',
  '/cpd': 'CPD Tracker',
  '/cpd/log': 'Log Activity',
  '/settings/profile': 'Profile',
  '/settings/team': 'Team Management',
};

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const title = routeTitles[location.pathname] || '';

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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 print:block print:overflow-visible print:p-0">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
