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
    <div className="max-w-3xl rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B45309]">403</p>
      <h1 className="mt-2 text-2xl font-semibold text-[#0D4035]">Access is restricted</h1>
      <p className="mt-2 text-sm text-[#4B5563]">
        Your current role does not have access to this workspace.
      </p>
    </div>
  );
};
