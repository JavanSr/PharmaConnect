import React, { useRef, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Package, Shield, Pill, FileCheck, GraduationCap,
  Lock, ChevronLeft, ChevronRight, Settings, LogOut, BarChart3, Repeat2,
  AlertTriangle, ClipboardList, Users,
  Building2, Smartphone, Brain, Database, X, ShieldAlert
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { Badge } from '@/components/ui/Badge';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  locked?: boolean;
  phase?: 2 | 3 | 4;
  roles?: UserRole[]; // if set, only these roles see this item
}

const phase1Nav: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Knowledge Hub', path: '/knowledge', icon: <BookOpen size={18} /> },
  { label: 'TMDA Updates', path: '/tmda-updates', icon: <BookOpen size={18} /> },
  { label: 'Inventory', path: '/inventory', icon: <Package size={18} /> },
  { label: 'Compliance', path: '/compliance', icon: <Shield size={18} />, roles: ['OWNER','PHARMACIST_IN_CHARGE','SUPER_ADMIN'] },
  { label: 'Analytics', path: '/analytics', icon: <BarChart3 size={18} /> },
  { label: 'Dispensing', path: '/dispensing', icon: <Pill size={18} />, roles: ['PHARMACIST_IN_CHARGE','DISPENSER','LOCUM','CASHIER','SUPER_ADMIN'] },
  { label: 'Safety Alerts', path: '/dispensing/alerts', icon: <ShieldAlert size={18} />, roles: ['OWNER','PHARMACIST_IN_CHARGE','SUPER_ADMIN'] },
  { label: 'Controlled Register', path: '/controlled-substances', icon: <Lock size={18} />, roles: ['OWNER','PHARMACIST_IN_CHARGE','LOCUM','SUPER_ADMIN'] },
  { label: 'Wholesale', path: '/wholesale', icon: <Building2 size={18} />, roles: ['OWNER','WHOLESALE_MANAGER','WHOLESALE_COUNTER_STAFF','DELIVERY_STAFF','SUPER_ADMIN'] },
  { label: 'Orders', path: '/wholesale/orders', icon: <ClipboardList size={18} />, roles: ['OWNER','WHOLESALE_MANAGER','WHOLESALE_COUNTER_STAFF','DELIVERY_STAFF','SUPER_ADMIN'] },
  { label: 'Reports', path: '/reports', icon: <BarChart3 size={18} />, roles: ['OWNER','PHARMACIST_IN_CHARGE','ACCOUNTANT','WHOLESALE_MANAGER','SUPER_ADMIN'] },
  { label: 'Attendance', path: '/attendance', icon: <Users size={18} /> },
  { label: 'Sync Conflicts', path: '/inventory/conflicts', icon: <AlertTriangle size={18} />, roles: ['OWNER','PHARMACIST_IN_CHARGE','DATA_ENTRY_CLERK','SUPER_ADMIN'] },
];

const phase2Nav: NavItem[] = [
  { label: 'CPD Tracker', path: '/cpd', icon: <GraduationCap size={18} />, locked: true, phase: 2 },
  { label: 'NHIF Claims', path: '/nhif-claims', icon: <FileCheck size={18} />, locked: true, phase: 2 },
  { label: 'PC-Accredited CPD', path: '/accredited-cpd', icon: <GraduationCap size={18} />, locked: true, phase: 2 },
  { label: 'Stock Exchange', path: '/stock-exchange', icon: <Repeat2 size={18} />, locked: true, phase: 2 },
  { label: 'TMDA Reporting', path: '/controlled-substances-reporting', icon: <FileCheck size={18} />, locked: true, phase: 2 },
  { label: 'ADR Reporting', path: '/pharmacovigilance', icon: <AlertTriangle size={18} />, locked: true, phase: 2 },
];

const phase3Nav: NavItem[] = [
  { label: 'Patient App', path: '/patient-app', icon: <Smartphone size={18} />, locked: true, phase: 3 },
];

const phase4Nav: NavItem[] = [
  { label: 'AI Safety', path: '/ai-safety', icon: <Brain size={18} />, locked: true, phase: 4 },
  { label: 'Data Products', path: '/data-products', icon: <Database size={18} />, locked: true, phase: 4, roles: ['SUPER_ADMIN'] },
];

const founderNav: NavItem[] = [
  { label: 'Founder Dashboard', path: '/founder', icon: <LayoutDashboard size={18} />, roles: ['SUPER_ADMIN'] },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, collapsed, onToggleCollapse }) => {
  const { user, logout } = useAuthStore();
  const { pharmacy } = usePharmacyStore();
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!navRef.current) return;
    const items = Array.from(navRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
    const current = document.activeElement as HTMLElement;
    const idx = items.indexOf(current);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[Math.min(idx + 1, items.length - 1)]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[Math.max(idx - 1, 0)]?.focus();
    }
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavItemEl: React.FC<{ item: NavItem }> = ({ item }) => {
    if (item.locked) {
      return (
        <NavLink
          to={item.path}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-[#EDF7F3] text-[#64748B] opacity-70"
          onClick={() => onClose()}
        >
          {item.icon}
          {!collapsed && (
            <>
              <span className="flex-1 text-sm font-medium truncate">{item.label}</span>
              <Lock size={14} className="shrink-0 opacity-60" />
            </>
          )}
        </NavLink>
      );
    }

    return (
      <NavLink
        to={item.path}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
            isActive
              ? 'bg-[#1A6B5C] text-white'
              : 'text-[#0D4035] hover:bg-[#D6F0E8]'
          }`
        }
        onClick={() => onClose()}
      >
        {item.icon}
        {!collapsed && <span className="flex-1 text-sm font-medium truncate">{item.label}</span>}
      </NavLink>
    );
  };

  const visiblePhase1Nav = phase1Nav.filter((item) => {
    const roleAllowed = !item.roles || (user?.role && item.roles.includes(user.role as UserRole));
    if (!roleAllowed) {
      return false;
    }

    if (item.path === '/cpd') {
      return pharmacy?.subscriptionTier !== 'WHOLESALE' && pharmacy?.subscriptionTier !== 'ADDO';
    }

    return true;
  });

  const SidebarContent = () => (
    <div className="flex h-full min-h-0 flex-col">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-[#D6F0E8] ${collapsed ? 'justify-center' : ''}`}>
        <img
          src="/brand/pharmaconnect-icon.svg"
          alt="PharmaConnect"
          className="w-9 h-9 shrink-0"
        />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#0D4035] leading-tight">PharmaConnect</p>
            <p className="text-xs text-[#64748B] truncate">{pharmacy?.name || 'Loading...'}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav ref={navRef} onKeyDown={handleKeyDown} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-1">
        {visiblePhase1Nav.map(item => <NavItemEl key={item.path} item={item} />)}

        {founderNav
          .filter((item) => !item.roles || (user?.role && item.roles.includes(user.role as UserRole)))
          .map(item => <NavItemEl key={item.path} item={item} />)}

        {!collapsed && (
          <div className="pt-3 pb-1">
            <p className="px-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Coming Soon</p>
          </div>
        )}
        {phase2Nav
          .filter((item) => !item.roles || (user?.role && item.roles.includes(user.role as UserRole)))
          .map(item => <NavItemEl key={item.path} item={item} />)}
        {phase3Nav
          .filter((item) => !item.roles || (user?.role && item.roles.includes(user.role as UserRole)))
          .map(item => <NavItemEl key={item.path} item={item} />)}
        {phase4Nav
          .filter((item) => !item.roles || (user?.role && item.roles.includes(user.role as UserRole)))
          .map(item => <NavItemEl key={item.path} item={item} />)}
      </nav>

      {/* User Footer */}
      <div className="border-t border-[#D6F0E8] p-3 space-y-1">
        <NavLink to="/settings/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#D6F0E8] transition-colors" onClick={onClose}>
          <Settings size={18} className="text-[#64748B] shrink-0" />
          {!collapsed && <span className="text-sm text-[#0D4035]">Settings</span>}
        </NavLink>

        <div className={`flex items-center gap-3 px-3 py-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-[#1A6B5C] text-white flex items-center justify-center text-xs font-bold shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#0D4035] truncate">{user?.firstName} {user?.lastName}</p>
              <Badge variant="info" size="sm">{user?.role?.replace(/_/g, ' ')}</Badge>
            </div>
          )}
          {/* Logout always visible — even when collapsed */}
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 transition-colors shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 h-screen w-64 bg-white border-r border-[#D6F0E8] transform transition-transform duration-300 lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#EDF7F3]">
            <X size={18} className="text-[#64748B]" />
          </button>
        </div>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className={`relative hidden lg:flex h-screen min-h-0 flex-col bg-white border-r border-[#D6F0E8] transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
        <SidebarContent />
        <button
          onClick={onToggleCollapse}
          className="absolute top-16 -right-3 w-6 h-6 bg-white border border-[#D6F0E8] rounded-full flex items-center justify-center shadow-sm hover:bg-[#D6F0E8] z-10"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </div>
    </>
  );
};
