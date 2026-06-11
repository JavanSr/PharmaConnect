import React from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Building2, ClipboardList,
  ToggleLeft, MessageSquare, LogOut, Telescope,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { api } from '@/lib/api';

const NAV_ITEMS = [
  { label: 'Dashboard',     path: '/superadmin',              icon: <LayoutDashboard size={16} />, end: true },
  { label: 'Founder Hub',   path: '/superadmin/founder',      icon: <Telescope size={16} /> },
  { label: 'Pharmacies',    path: '/superadmin/pharmacies',   icon: <Building2 size={16} /> },
  { label: 'Audit Log',     path: '/superadmin/audit',        icon: <ClipboardList size={16} /> },
  { label: 'Feature Flags', path: '/superadmin/feature-flags', icon: <ToggleLeft size={16} /> },
  { label: 'Messages',      path: '/superadmin/messages',     icon: <MessageSquare size={16} /> },
];

export const AdminShell: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const clearPharmacy = usePharmacyStore((s) => s.clearPharmacy);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    clearAuth();
    clearPharmacy();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f1f18]">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col bg-[#0f1f18] border-r border-[#1a3328]">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 px-4 border-b border-[#1a3328]">
          <span className="text-sm font-bold tracking-widest text-[#7ECFB4] uppercase">APOTEKH</span>
          <span className="rounded bg-[#B45309] px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide">
            Admin
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1A6B5C] text-white'
                    : 'text-[#7ECFB4] hover:bg-[#1a3328] hover:text-white'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-[#1a3328] px-3 py-3 space-y-1">
          <p className="text-xs text-[#4B7B6A] truncate">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[#7ECFB4] hover:bg-[#1a3328] hover:text-white transition-colors"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-[#f5faf8]">
        <div className="mx-auto max-w-7xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
