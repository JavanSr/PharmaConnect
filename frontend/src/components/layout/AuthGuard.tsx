import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { SystemStatusWindow } from '@/components/SystemStatusWindow';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <SystemStatusWindow
        type="loading"
        title="Loading APOTEKH"
        message="Checking your session and preparing the workspace."
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export const RoleGuard: React.FC<{ children: React.ReactNode; roles?: UserRole[] }> = ({ children, roles }) => {
  const user = useAuthStore((state) => state.user);

  if (!roles?.length || user?.role === 'SUPER_ADMIN' || (user?.role && roles.includes(user.role))) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md w-full rounded-2xl border border-outline-variant/40 bg-surface-container-low p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-container">
          <span className="text-xl font-bold text-on-error-container">403</span>
        </div>
        <h1 className="text-title-lg text-on-surface">Access restricted</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Your current role does not have permission to view this page.
          Contact your pharmacy owner if you need access.
        </p>
      </div>
    </div>
  );
};
