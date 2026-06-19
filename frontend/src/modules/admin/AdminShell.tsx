import React from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Building2, ClipboardList,
  ToggleLeft, MessageSquare, LogOut, Telescope, Menu, ChevronLeft, ChevronRight,
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

  const [sidebarHidden, setSidebarHidden] = React.useState<boolean>(() => {
    try { return localStorage.getItem('apotekh_admin_sidebar_hidden') === 'true'; } catch { return false; }
  });
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    try { return localStorage.getItem('apotekh_admin_sidebar_collapsed') === 'true'; } catch { return false; }
  });

  React.useEffect(() => {
    try { localStorage.setItem('apotekh_admin_sidebar_hidden', String(sidebarHidden)); } catch {}
  }, [sidebarHidden]);

  React.useEffect(() => {
    try { localStorage.setItem('apotekh_admin_sidebar_collapsed', String(collapsed)); } catch {}
  }, [collapsed]);

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    clearAuth();
    clearPharmacy();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#082B23]">
      {/* Sidebar */}
      {!sidebarHidden && (
        <aside className={`relative flex shrink-0 flex-col bg-[#082B23] border-r border-[#0D4035] transition-all duration-300 ${collapsed ? 'w-14' : 'w-56'}`}>
          {/* Logo + collapse toggle */}
          <div className={`flex h-14 items-center border-b border-[#0D4035] ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
            {collapsed ? (
              <button
                onClick={() => setCollapsed(false)}
                title="Expand sidebar"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8A020] text-white hover:bg-amber-500 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tracking-widest uppercase">
                    <span className="text-[#7ECFB4]">APOTEK</span><span className="text-[#E8A020]">H</span>
                  </span>
                  <span className="rounded bg-[#B45309] px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide">
                    Admin
                  </span>
                </div>
                <button
                  onClick={() => setCollapsed(true)}
                  title="Collapse sidebar"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8A020] text-white hover:bg-amber-500 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
              </>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    collapsed ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'bg-[#1A6B5C] text-white'
                      : 'text-[#7ECFB4] hover:bg-[#0D4035] hover:text-white'
                  }`
                }
              >
                {item.icon}
                {!collapsed && item.label}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          {!collapsed && (
            <div className="border-t border-[#0D4035] px-3 py-3 space-y-1">
              <p className="text-xs text-[#2A9478] truncate">{user?.email}</p>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[#7ECFB4] hover:bg-[#0D4035] hover:text-white transition-colors"
              >
                <LogOut size={13} />
                Sign out
              </button>
            </div>
          )}
          {collapsed && (
            <div className="border-t border-[#0D4035] px-2 py-3 flex justify-center">
              <button
                onClick={handleLogout}
                title="Sign out"
                className="rounded-lg p-1.5 text-[#2A9478] hover:bg-[#0D4035] hover:text-white transition-colors"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}

        </aside>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[#f5faf8]">
        {/* Top bar */}
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[#D6F0E8] bg-white px-4">
          <button
            onClick={() => setSidebarHidden(h => !h)}
            className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#EDF7F3] hover:text-[#1A6B5C] transition-colors"
            title={sidebarHidden ? 'Show sidebar' : 'Hide sidebar'}
          >
            <Menu size={18} />
          </button>
          <span className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">
            APOTEKH Platform Admin
          </span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
