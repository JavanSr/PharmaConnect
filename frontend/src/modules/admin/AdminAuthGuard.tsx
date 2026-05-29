import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export const AdminAuthGuard: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f1f18]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2A9478] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f1f18] text-white">
        <div className="text-center space-y-3">
          <p className="text-4xl font-bold text-[#2A9478]">403</p>
          <p className="text-lg font-semibold">Super-admin access required</p>
          <a href="/dashboard" className="block text-sm text-[#7ECFB4] hover:underline">
            Back to app
          </a>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
