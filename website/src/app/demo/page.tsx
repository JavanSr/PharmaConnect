'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, Package, Pill, Shield, BarChart3, BookOpen,
  FileBarChart2, Users, ChevronRight, ChevronLeft, X,
  AlertTriangle, CheckCircle2, ArrowRight, TrendingUp, Clock,
  ShoppingCart, Search, Plus, Info, Activity, Wallet,
  ArrowDownUp, Download, Eye, Tag, ScanLine, Compass,
} from 'lucide-react';

// ── Colours matching the real APOTEKH app ────────────────────────────────────
const C = {
  sidebarBg:    '#082B23',
  sidebarText:  'rgba(255,255,255,0.60)',
  sidebarActive:'#1A6B5C',
  topbarBg:     '#ffffff',
  contentBg:    '#EDF7F3',
  primary:      '#1A6B5C',
  primaryDark:  '#0D4035',
  primaryMid:   '#2A9478',
  primaryLight: '#D6F0E8',
  mist:         '#EDF7F3',
  amber:        '#E8A020',
  textMuted:    'rgba(13,64,53,0.55)',
  border:       '#D6F0E8',
};

// ── Types ─────────────────────────────────────────────────────────────────────
type Mode        = 'guided' | 'explore';
type ExplorePage = 'dashboard' | 'dispensing' | 'inventory' | 'inventory-expiry' | 'inventory-receive' | 'compliance' | 'analytics' | 'reports' | 'knowledge' | 'staff';

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV = [
  { label: 'Dashboard',     icon: LayoutDashboard, page: 'dashboard'  as ExplorePage },
  { label: 'Dispensing',    icon: Pill,             page: 'dispensing' as ExplorePage },
  { label: 'Inventory',     icon: Package,          page: 'inventory'  as ExplorePage },
  { label: 'Compliance',    icon: Shield,           page: 'compliance' as ExplorePage },
  { label: 'Analytics',     icon: BarChart3,        page: 'analytics'  as ExplorePage },
  { label: 'Reports',       icon: FileBarChart2,    page: 'reports'    as ExplorePage },
  { label: 'Knowledge Hub', icon: BookOpen,         page: 'knowledge'  as ExplorePage },
  { label: 'Staff Activity',icon: Users,            page: 'staff'      as ExplorePage },
];

const NAV_ACTIVE: Record<ExplorePage, string> = {
  'dashboard': 'Dashboard', 'dispensing': 'Dispensing',
  'inventory': 'Inventory', 'inventory-expiry': 'Inventory', 'inventory-receive': 'Inventory',
  'compliance': 'Compliance', 'analytics': 'Analytics', 'reports': 'Reports',
  'knowledge': 'Knowledge Hub', 'staff': 'Staff Activity',
};

const BREADCRUMB: Record<ExplorePage, string> = {
  'dashboard': 'Dashboard',
  'dispensing': 'Dispensing › New sale',
  'inventory': 'Inventory › Products',
  'inventory-expiry': 'Inventory › Expiry',
  'inventory-receive': 'Inventory › Receive stock',
  'compliance': 'Compliance',
  'analytics': 'Analytics',
  'reports': 'Reports',
  'knowledge': 'Knowledge Hub',
  'staff': 'Staff Activity',
};

// ── Guided steps ──────────────────────────────────────────────────────────────
const STEPS = [
  { nav: 'Dashboard',  label: 'Owner Dashboard',        breadcrumb: 'Dashboard' },
  { nav: 'Inventory',  label: 'Add a product',           breadcrumb: 'Inventory › Add product' },
  { nav: 'Inventory',  label: 'Receive stock',            breadcrumb: 'Inventory › Receive stock' },
  { nav: 'Dispensing', label: 'Start dispensing',         breadcrumb: 'Dispensing › New sale' },
  { nav: 'Dispensing', label: 'Safety check fires',       breadcrumb: 'Dispensing › Drug interaction alert' },
  { nav: 'Dashboard',  label: 'Sale posted live',         breadcrumb: 'Dashboard' },
];

// ── Root component ────────────────────────────────────────────────────────────
export default function DemoPage() {
  const [mode, setMode]               = useState<Mode>('guided');
  const [step, setStep]               = useState(0);
  const [explorePage, setExplorePage] = useState<ExplorePage>('dashboard');
  const total = STEPS.length;

  const goExplore = (page: ExplorePage = 'dashboard') => {
    setMode('explore');
    setExplorePage(page);
  };

  const activeNavLabel = mode === 'guided' ? STEPS[step].nav : NAV_ACTIVE[explorePage];
  const breadcrumb     = mode === 'guided' ? STEPS[step].breadcrumb : BREADCRUMB[explorePage];

  return (
    <div style={{ fontFamily: 'var(--font-sans, DM Sans, sans-serif)', background: '#f0f4f2', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Demo chrome header ─────────────────────────────────────────── */}
      <header style={{ background: C.primaryDark, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src="/assets/logo/apotekh-logo-white.svg" alt="APOTEKH" style={{ height: 26, width: 'auto' }} />
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)' }} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Interactive demo</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {mode === 'guided' && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Step {step + 1} of {total}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {STEPS.map((_, i) => (
                  <button key={i} onClick={() => setStep(i)} title={STEPS[i].label} style={{
                    width: i === step ? 24 : 8, height: 8, borderRadius: 4, padding: 0, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    background: i === step ? C.amber : i < step ? C.primaryMid : 'rgba(255,255,255,0.2)',
                  }} />
                ))}
              </div>
            </>
          )}
          {mode === 'guided' ? (
            <button onClick={() => goExplore('dashboard')} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              <Compass size={13} /> Explore freely
            </button>
          ) : (
            <button onClick={() => { setMode('guided'); setStep(0); }} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              ← Guided tour
            </button>
          )}
          <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <X size={14} /> Exit
          </Link>
        </div>
      </header>

      {/* ── App frame ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', maxHeight: 'calc(100vh - 52px)' }}>

        {/* Sidebar */}
        <aside style={{ width: 220, background: C.sidebarBg, display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 4px' }}>Pharmacy</p>
            <p style={{ color: 'white', fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.3 }}>BEST CARE<br/>PHARMACY</p>
            <p style={{ color: C.amber, fontSize: 10, margin: '4px 0 0', fontWeight: 600 }}>● STANDARD · Live</p>
          </div>
          <nav style={{ flex: 1, padding: '10px 8px', overflow: 'auto' }}>
            {NAV.map(({ label, icon: Icon, page }) => {
              const active = label === activeNavLabel;
              return (
                <button key={label} onClick={() => goExplore(page)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: active ? C.sidebarActive : 'transparent',
                  color: active ? 'white' : C.sidebarText,
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  marginBottom: 2, transition: 'all 0.15s', textAlign: 'left',
                }}>
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  {label}
                </button>
              );
            })}
          </nav>
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.sidebarActive, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>JM</div>
              <div>
                <p style={{ color: 'white', fontSize: 12, fontWeight: 600, margin: 0 }}>James Mwangi</p>
                <p style={{ color: C.sidebarText, fontSize: 10, margin: 0 }}>Dispenser</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Topbar */}
          <div style={{ height: 56, background: C.topbarBg, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
            <p style={{ color: C.textMuted, fontSize: 11, margin: 0 }}>{breadcrumb}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {mode === 'explore' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FFF7ED', border: '1px solid #FDE68A', borderRadius: 20, padding: '3px 10px' }}>
                  <span style={{ fontSize: 11, color: '#92400E', fontWeight: 600 }}>Demo data · read-only</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 20, padding: '4px 10px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
                <span style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>Online</span>
              </div>
              <div style={{ fontSize: 11, color: C.textMuted }}>Tue 15 Oct 2024 · 09:14</div>
            </div>
          </div>
          {/* Page content */}
          <div style={{ flex: 1, overflow: 'auto', background: C.contentBg }}>
            {mode === 'guided' ? (
              <>
                {step === 0 && <StepDashboardEmpty />}
                {step === 1 && <StepAddProduct />}
                {step === 2 && <StepReceiveStock />}
                {step === 3 && <StepDispensing />}
                {step === 4 && <StepInteractionAlert />}
                {step === 5 && <StepDashboardComplete />}
              </>
            ) : (
              <ExploreContent page={explorePage} onNavigate={setExplorePage} />
            )}
          </div>
        </div>

        {/* Guide panel — guided mode only */}
        {mode === 'guided' && (
          <aside style={{ width: 300, background: 'white', borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
            <div style={{ background: C.primaryDark, padding: '16px 20px' }}>
              <p style={{ color: C.amber, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', margin: '0 0 4px' }}>Step {step + 1} of {total}</p>
              <p style={{ color: 'white', fontSize: 15, fontWeight: 700, margin: 0, lineHeight: 1.4 }}>{STEPS[step].label}</p>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
              {step === 0 && <GuideStep0 />}
              {step === 1 && <GuideStep1 />}
              {step === 2 && <GuideStep2 />}
              {step === 3 && <GuideStep3 />}
              {step === 4 && <GuideStep4 />}
              {step === 5 && <GuideStep5 onExplore={goExplore} />}
            </div>
            <div style={{ padding: '16px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8,
                border: `1px solid ${C.border}`, background: 'white', color: step === 0 ? C.textMuted : C.primary,
                fontSize: 13, fontWeight: 600, cursor: step === 0 ? 'not-allowed' : 'pointer', opacity: step === 0 ? 0.4 : 1,
              }}>
                <ChevronLeft size={15} /> Back
              </button>
              {step < total - 1 ? (
                <button onClick={() => setStep(s => s + 1)} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '9px 14px', borderRadius: 8, border: 'none', background: C.amber, color: 'white',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                  Next <ChevronRight size={15} />
                </button>
              ) : (
                <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                  <button onClick={() => setStep(0)} style={{
                    padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
                    background: 'white', color: C.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}>Restart</button>
                  <Link href="/contact" style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '9px 14px', borderRadius: 8, border: 'none', background: C.primary, color: 'white',
                    fontSize: 13, fontWeight: 700, textDecoration: 'none',
                  }}>
                    Get access <ArrowRight size={15} />
                  </Link>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

// ── Explore mode content router ───────────────────────────────────────────────
function ExploreContent({ page, onNavigate }: { page: ExplorePage; onNavigate: (p: ExplorePage) => void }) {
  switch (page) {
    case 'dashboard':          return <ExploreDashboard />;
    case 'dispensing':         return <ExploreDispensing />;
    case 'inventory':          return <ExploreInventory onNavigate={onNavigate} />;
    case 'inventory-expiry':   return <ExploreInventoryExpiry onNavigate={onNavigate} />;
    case 'inventory-receive':  return <ExploreInventoryReceive onNavigate={onNavigate} />;
    case 'compliance':         return <ExploreCompliance />;
    case 'analytics':          return <ExploreAnalytics />;
    case 'reports':            return <ExploreReports />;
    case 'knowledge':          return <ExploreKnowledge />;
    case 'staff':              return <ExploreStaff />;
    default:                   return <ExploreDashboard />;
  }
}

// ── Shared UI primitives ──────────────────────────────────────────────────────
function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: 'white', borderRadius: 12, border: `1px solid ${C.border}`, padding: '20px 24px', ...style }}>{children}</div>;
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.primaryMid, margin: '0 0 12px' }}>{children}</p>;
}
function StatCard({ label, value, sub, icon: Icon, color, highlight }: { label: string; value: string; sub: string; icon: React.ElementType; color: string; highlight?: boolean }) {
  return (
    <Card style={highlight ? { border: `1.5px solid #86EFAC`, background: '#F0FDF4' } : {}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 11, color: C.textMuted, margin: '0 0 6px' }}>{label}</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: highlight ? '#16A34A' : C.primaryDark, margin: '0 0 4px', fontFamily: 'var(--font-serif, serif)' }}>{value}</p>
          <p style={{ fontSize: 11, color: highlight ? '#16A34A' : C.textMuted, margin: 0 }}>{sub}</p>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: C.mist, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </Card>
  );
}
function EmptyPanel({ message }: { message: string }) {
  return <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: C.textMuted }}>{message}</div>;
}
function Field({ label, value, active, warning }: { label: string; value: string; active?: boolean; warning?: boolean }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 5 }}>{label}</label>
      <div style={{ padding: '8px 12px', borderRadius: 7, fontSize: 13, color: C.primaryDark, background: warning ? '#FFF7ED' : active ? '#F0FDF9' : C.mist, border: `1.5px solid ${warning ? '#FB923C' : active ? C.primary : C.border}`, fontWeight: active ? 500 : 400 }}>{value}</div>
    </div>
  );
}
function SelectField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 5 }}>{label}</label>
      <div style={{ padding: '8px 12px', borderRadius: 7, fontSize: 13, color: C.primaryDark, background: C.mist, border: `1.5px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{value}<ChevronRight size={13} style={{ color: C.textMuted, transform: 'rotate(90deg)' }} /></div>
    </div>
  );
}
function SubNav({ items, active, onSelect }: { items: string[]; active: string; onSelect: (s: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: 'white', border: `1px solid ${C.border}`, borderRadius: 8, padding: 4, width: 'fit-content' }}>
      {items.map(item => (
        <button key={item} onClick={() => onSelect(item)} style={{
          padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
          background: active === item ? C.primary : 'transparent', color: active === item ? 'white' : C.textMuted,
          transition: 'all 0.15s',
        }}>{item}</button>
      ))}
    </div>
  );
}

// ── EXPLORE PAGES ─────────────────────────────────────────────────────────────

function ExploreDashboard() {
  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.primaryDark, margin: '0 0 4px' }}>Good morning, James!</h1>
        <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Tuesday, 15 October 2024</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <StatCard label="Today's Revenue" value="Tsh 10,500" sub="1 sale · updated just now" icon={Wallet} color="#16A34A" highlight />
        <StatCard label="Low Stock Items" value="1" sub="Amoxicillin near reorder" icon={AlertTriangle} color="#D97706" />
        <StatCard label="Expiring ≤30 Days" value="1" sub="Amoxicillin · 45d left" icon={Clock} color="#DC2626" />
        <StatCard label="Total Products" value="2" sub="Amoxicillin, Warfarin" icon={Package} color={C.primary} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark }}>Low Stock Alerts</span>
            <span style={{ fontSize: 12, color: C.primary }}>Manage →</span>
          </div>
          <div style={{ padding: '10px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: C.primaryDark, margin: 0 }}>Amoxicillin 500mg</p>
              <span style={{ fontSize: 10, background: '#FFF7ED', color: '#92400E', border: '1px solid #FDE68A', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>490/500</span>
            </div>
            <div style={{ height: 4, background: C.mist, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: '98%', height: '100%', background: '#D97706', borderRadius: 4 }} />
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark }}>Recent Movements</span>
            <span style={{ fontSize: 12, color: C.primary }}>View all →</span>
          </div>
          {[
            { name: 'Amoxicillin 500mg', user: 'James Mwangi', type: 'DISPENSED', qty: '-10' },
            { name: 'Warfarin 5mg',      user: 'James Mwangi', type: 'DISPENSED', qty: '-30' },
            { name: 'Amoxicillin 500mg', user: 'James Mwangi', type: 'RECEIVED',  qty: '+500' },
          ].map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < 2 ? `1px solid ${C.border}` : 'none' }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 500, color: C.primaryDark, margin: '0 0 1px' }}>{m.name}</p>
                <p style={{ fontSize: 10, color: C.textMuted, margin: 0 }}>{m.user}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 10, background: m.type === 'RECEIVED' ? '#D6F0E8' : '#EFF6FF', color: m.type === 'RECEIVED' ? '#166534' : '#1E40AF', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>{m.type}</span>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.primaryDark, margin: '2px 0 0' }}>{m.qty} units</p>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark, margin: '0 0 12px' }}>Today's Activity</p>
          {[
            { label: 'Dispensed',    value: 2,  bg: '#D6F0E8', color: C.primary },
            { label: 'Received',     value: 1,  bg: C.mist,    color: '#1D9E75' },
            { label: 'Adjustments',  value: 0,  bg: '#FFF7ED', color: '#D97706' },
            { label: 'Total Events', value: 3,  bg: C.mist,    color: '#64748B' },
          ].map(({ label, value, bg, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 10, background: bg, marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: C.primaryDark }}>{label}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color }}>{value}</span>
            </div>
          ))}
        </Card>
      </div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark }}>Expiry Countdown</span>
          <span style={{ fontSize: 12, color: C.primary }}>All expiry →</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#FFF7ED', borderRadius: 10 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark, margin: '0 0 2px' }}>Amoxicillin 500mg</p>
            <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>Batch SH-2024-0891 · 490 units</p>
          </div>
          <span style={{ fontSize: 11, background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', borderRadius: 4, padding: '2px 8px', fontWeight: 700 }}>45d left</span>
        </div>
      </Card>
    </div>
  );
}

function ExploreDispensing() {
  return (
    <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: C.primaryDark, margin: '0 0 16px' }}>New dispensing sale</h1>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '0 12px', height: 40 }}>
            <Search size={14} style={{ color: C.primaryMid }} />
            <span style={{ fontSize: 13, color: C.textMuted }}>Search by name, generic, barcode…</span>
          </div>
          <button style={{ padding: '0 14px', borderRadius: 8, background: 'white', border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <ScanLine size={14} /> Scan
          </button>
        </div>
        <Card style={{ marginBottom: 12 }}>
          <SectionLabel>All products</SectionLabel>
          {[
            { name: 'Amoxicillin 500mg Capsules', generic: 'Amoxicillin', batch: 'SH-2024-0891', expiry: 'Nov 2024', stock: 490, price: 600, fefo: true },
            { name: 'Warfarin 5mg Tablets',       generic: 'Warfarin',    batch: 'WF-2024-0441', expiry: 'Mar 2026', stock: 170, price: 150, fefo: false },
          ].map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: `1px solid ${C.border}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark, margin: 0 }}>{p.name}</p>
                  {p.fefo && <span style={{ fontSize: 9, background: '#FFF7ED', color: '#92400E', border: '1px solid #FDE68A', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>FEFO</span>}
                </div>
                <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>Batch {p.batch} · Exp {p.expiry} · {p.stock} in stock</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.primary }}>Tsh {p.price}/unit</span>
                <button style={{ padding: '6px 12px', borderRadius: 6, background: C.mist, border: `1px solid ${C.border}`, color: C.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Add</button>
              </div>
            </div>
          ))}
        </Card>
        <div style={{ background: '#EDF7F3', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 8 }}>
          <Info size={13} style={{ color: C.primary, flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: C.primary, margin: 0 }}><strong>FEFO active.</strong> Amoxicillin Batch SH-2024-0891 (exp Nov 2024) will be dispensed first due to earliest expiry.</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <ShoppingCart size={15} style={{ color: C.primary }} />
            <SectionLabel>Current sale</SectionLabel>
          </div>
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>No items added yet.</p>
            <p style={{ fontSize: 11, color: C.textMuted, margin: '4px 0 0' }}>Search for a product to begin.</p>
          </div>
        </Card>
        <SelectField label="Payment method" value="Cash" />
        <button style={{ padding: 12, borderRadius: 8, background: C.primaryLight, color: C.textMuted, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'not-allowed' }}>
          Add items to complete sale
        </button>
      </div>
    </div>
  );
}

function ExploreInventory({ onNavigate }: { onNavigate: (p: ExplorePage) => void }) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.primaryDark, margin: 0 }}>Products</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ padding: '8px 14px', borderRadius: 8, background: 'white', border: `1px solid ${C.border}`, color: C.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Download size={13} /> Export</button>
          <button style={{ padding: '8px 14px', borderRadius: 8, background: C.primary, border: 'none', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={13} /> Add Product</button>
        </div>
      </div>
      <SubNav items={['Products', 'Expiry', 'Receive Stock']} active="Products" onSelect={s => {
        if (s === 'Expiry') onNavigate('inventory-expiry');
        if (s === 'Receive Stock') onNavigate('inventory-receive');
      }} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 12px', height: 36 }}>
          <Search size={13} style={{ color: C.textMuted }} /><span style={{ fontSize: 13, color: C.textMuted }}>Search products…</span>
        </div>
        <button style={{ padding: '0 14px', borderRadius: 8, background: 'white', border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><Tag size={13} /> Filter</button>
      </div>
      <Card style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['Product', 'Drug Class', 'In Stock', 'Reorder Level', 'Selling Price', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Amoxicillin 500mg Capsules', generic: 'Amoxicillin', cls: 'OTC', stock: 490, reorder: 500, price: 600, status: 'LOW', statusColor: '#D97706', statusBg: '#FFF7ED', statusBorder: '#FDE68A' },
              { name: 'Warfarin 5mg Tablets',       generic: 'Warfarin',    cls: 'PRESCRIPTION', stock: 170, reorder: 50,  price: 150, status: 'OK',  statusColor: '#166534', statusBg: '#F0FDF4', statusBorder: '#86EFAC' },
            ].map((p, i) => (
              <tr key={p.name} style={{ borderBottom: i === 0 ? `1px solid ${C.border}` : 'none' }}>
                <td style={{ padding: '12px 16px' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark, margin: '0 0 2px' }}>{p.name}</p>
                  <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>{p.generic}</p>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, background: C.mist, color: C.primary, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{p.cls}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.primaryDark, margin: '0 0 4px' }}>{p.stock}</p>
                  <div style={{ height: 3, background: C.mist, borderRadius: 4, width: 80 }}>
                    <div style={{ height: '100%', borderRadius: 4, background: p.status === 'LOW' ? '#D97706' : C.primary, width: `${Math.min(100, (p.stock / p.reorder) * 100)}%` }} />
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: C.textMuted }}>{p.reorder}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: C.primaryDark }}>Tsh {p.price}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, background: p.statusBg, color: p.statusColor, border: `1px solid ${p.statusBorder}`, borderRadius: 4, padding: '2px 8px', fontWeight: 700 }}>{p.status === 'LOW' ? 'NEAR REORDER' : 'OK'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function ExploreInventoryExpiry({ onNavigate }: { onNavigate: (p: ExplorePage) => void }) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.primaryDark, margin: 0 }}>Expiry</h1>
      </div>
      <SubNav items={['Products', 'Expiry', 'Receive Stock']} active="Expiry" onSelect={s => {
        if (s === 'Products') onNavigate('inventory');
        if (s === 'Receive Stock') onNavigate('inventory-receive');
      }} />
      <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
        <AlertTriangle size={15} style={{ color: '#DC2626', flexShrink: 0 }} />
        <p style={{ fontSize: 13, fontWeight: 600, color: '#991B1B', margin: 0 }}>1 batch expiring within 30 days — review and prioritise dispensing</p>
      </div>
      <Card style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['Product', 'Batch', 'Stock', 'Expiry Date', 'Days Left', 'Action'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Amoxicillin 500mg', batch: 'SH-2024-0891', stock: 490, expiry: '29 Nov 2024', days: 45, level: 'CAUTION', color: '#92400E', bg: '#FFF7ED', border: '#FDE68A' },
              { name: 'Warfarin 5mg',      batch: 'WF-2024-0441', stock: 170, expiry: '15 Mar 2026', days: 517, level: 'MONITOR', color: '#166534', bg: '#F0FDF4', border: '#86EFAC' },
            ].map((b, i) => (
              <tr key={b.name} style={{ borderBottom: i === 0 ? `1px solid ${C.border}` : 'none' }}>
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: C.primaryDark }}>{b.name}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: C.textMuted, fontFamily: 'monospace' }}>{b.batch}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: C.primaryDark }}>{b.stock} units</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: C.primaryDark }}>{b.expiry}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, background: b.bg, color: b.color, border: `1px solid ${b.border}`, borderRadius: 4, padding: '2px 8px', fontWeight: 700 }}>{b.days}d</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, background: b.bg, color: b.color, border: `1px solid ${b.border}`, borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>{b.level}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function ExploreInventoryReceive({ onNavigate }: { onNavigate: (p: ExplorePage) => void }) {
  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.primaryDark, margin: '0 0 4px' }}>Receive Stock</h1>
        <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Record incoming stock. Batch and expiry are required for FEFO dispensing.</p>
      </div>
      <SubNav items={['Products', 'Expiry', 'Receive Stock']} active="Receive Stock" onSelect={s => {
        if (s === 'Products') onNavigate('inventory');
        if (s === 'Expiry') onNavigate('inventory-expiry');
      }} />
      <StepReceiveStock />
    </div>
  );
}

function ExploreCompliance() {
  const [tab, setTab] = useState<'licences' | 'checklist'>('licences');
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [checked,  setChecked]  = useState<string[]>(['cold-chain','labels','fefo','ovd']);

  const licences = [
    {
      title: 'PC Premises Registration',
      subtitle: 'Pharmacy Council — Premises',
      number: 'PC-PR-2024-0318',
      issued: '14 Nov 2023',
      expires: '14 Nov 2024',
      days: 30,
      status: 'CAUTION',
      color: '#D97706', bg: '#FFF7ED', border: '#FDE68A',
      docs: ['Premises renewal form (PC-PR-01)', 'Floor plan (A4)', 'PC inspection fee receipt', 'Public health clearance certificate'],
      uploaded: ['Premises renewal form (PC-PR-01)', 'Floor plan (A4)'],
    },
    {
      title: 'PC Provider Registration',
      subtitle: 'Pharmacy Council — Superintendent Pharmacist',
      number: 'PC-2024-7821',
      issued: '02 Dec 2023',
      expires: '02 Dec 2024',
      days: 48,
      status: 'INFO',
      color: C.primary, bg: C.mist, border: C.border,
      docs: ['CPD points proof (≥15 pts)', 'PC provider renewal form', 'National ID copy'],
      uploaded: ['CPD points proof (≥15 pts)', 'PC provider renewal form', 'National ID copy'],
    },
  ];

  const checklistItems = [
    { id: 'cold-chain',  label: 'Cold chain temperature log up to date (last 7 days)', category: 'Storage' },
    { id: 'labels',      label: 'All dispensed products labelled with dose, patient name, and dispensing date', category: 'Dispensing' },
    { id: 'fefo',        label: 'Batch rotation (FEFO) enforced in shelves — earliest expiry at front', category: 'Storage' },
    { id: 'ovd',         label: 'Overage / void / damaged register updated this week', category: 'Records' },
    { id: 'controlled',  label: 'Controlled drugs register complete with running balance', category: 'Records' },
    { id: 'pic-present', label: 'Pharmacist-in-Charge physically present during opening hours', category: 'Staffing' },
    { id: 'display',     label: 'Licence certificates displayed at pharmacy entrance', category: 'Premises' },
    { id: 'waste',       label: 'Pharmaceutical waste segregated and awaiting licensed disposal', category: 'Waste' },
  ];

  const checklistByCategory = checklistItems.reduce<Record<string, typeof checklistItems>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const readyCount = checklistItems.filter(i => checked.includes(i.id)).length;
  const readyPct   = Math.round((readyCount / checklistItems.length) * 100);

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.primaryDark, margin: '0 0 4px' }}>Compliance</h1>
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Pharmacy Council registrations, inspection readiness, and document tracking — all in one place.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 11, color: C.textMuted, margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inspection readiness</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: readyPct >= 80 ? '#166534' : '#D97706', margin: 0 }}>{readyPct}%</p>
        </div>
      </div>

      {/* Alert */}
      <div style={{ background: '#FFF7ED', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <AlertTriangle size={14} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 13, color: '#92400E', margin: 0 }}>
          <strong>2 PC registrations renewing within 60 days.</strong> PC Premises Registration requires 2 more documents. Upload before the renewal deadline or risk a compliance gap.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'white', border: `1px solid ${C.border}`, borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {([['licences', 'Licences & Documents'], ['checklist', 'Inspection Checklist']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: tab === key ? C.primary : 'transparent',
            color: tab === key ? 'white' : C.textMuted,
            transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {/* Licences tab */}
      {tab === 'licences' && (
        <div style={{ display: 'grid', gap: 14 }}>
          {licences.map(lic => {
            const userUploaded = uploaded.filter(u => u.startsWith(lic.number));
            const allUploaded  = lic.uploaded.concat(userUploaded.map(u => u.replace(lic.number + ':', '')));
            const missing      = lic.docs.filter(d => !allUploaded.includes(d));
            return (
              <Card key={lic.number}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  {/* Status stripe */}
                  <div style={{ width: 4, borderRadius: 4, alignSelf: 'stretch', background: lic.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.primaryDark, margin: 0 }}>{lic.title}</p>
                      <span style={{ fontSize: 10, background: lic.bg, color: lic.color, border: `1px solid ${lic.border}`, borderRadius: 4, padding: '2px 8px', fontWeight: 700 }}>{lic.status}</span>
                    </div>
                    <p style={{ fontSize: 11, color: C.textMuted, margin: '0 0 8px' }}>{(lic as any).subtitle}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 24px', marginBottom: 12 }}>
                      <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Licence No: <strong style={{ color: C.primaryDark }}>{lic.number}</strong></p>
                      <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Issued: <strong style={{ color: C.primaryDark }}>{lic.issued}</strong></p>
                      <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Expires: <strong style={{ color: lic.color }}>{lic.expires}</strong></p>
                      <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Days remaining: <strong style={{ color: lic.color }}>{lic.days}</strong></p>
                    </div>
                    {/* Document checklist */}
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
                        Documents — {allUploaded.filter(d => lic.docs.includes(d)).length}/{lic.docs.length} uploaded
                      </p>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {lic.docs.map(doc => {
                          const done = allUploaded.includes(doc);
                          return (
                            <div key={doc} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${done ? C.primary : C.border}`, background: done ? C.primary : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {done && <CheckCircle2 size={11} style={{ color: 'white' }} />}
                              </div>
                              <span style={{ fontSize: 12, color: done ? C.primaryDark : C.textMuted, fontWeight: done ? 500 : 400 }}>{doc}</span>
                              {!done && (
                                <button
                                  onClick={() => setUploaded(u => [...u, `${lic.number}:${doc}`])}
                                  style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 6, background: '#FFF7ED', border: '1px solid #FDE68A', color: '#D97706', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Upload
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {missing.filter(d => !userUploaded.map(u => u.replace(lic.number + ':', '')).includes(d)).length === 0 && (
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, color: '#166534', fontSize: 12, fontWeight: 600 }}>
                        <CheckCircle2 size={14} /> All documents uploaded — ready for submission
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Inspection checklist tab */}
      {tab === 'checklist' && (
        <div style={{ display: 'grid', gap: 14 }}>
          {/* Progress bar */}
          <Card style={{ background: readyPct >= 80 ? '#F0FDF4' : '#FFF7ED', border: `1px solid ${readyPct >= 80 ? '#86EFAC' : '#FDE68A'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: readyPct >= 80 ? '#166534' : '#92400E', margin: 0 }}>
                {readyPct >= 80 ? '✓ Ready for inspection' : '⚠ Inspection gaps found'}
              </p>
              <p style={{ fontSize: 13, fontWeight: 700, color: readyPct >= 80 ? '#166534' : '#D97706', margin: 0 }}>{readyCount}/{checklistItems.length} items ready</p>
            </div>
            <div style={{ height: 8, background: readyPct >= 80 ? '#DCFCE7' : '#FEF3C7', borderRadius: 8 }}>
              <div style={{ height: '100%', borderRadius: 8, background: readyPct >= 80 ? '#16A34A' : '#D97706', width: `${readyPct}%`, transition: 'width 0.3s' }} />
            </div>
          </Card>

          {Object.entries(checklistByCategory).map(([category, items]) => (
            <Card key={category}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>{category}</p>
              <div style={{ display: 'grid', gap: 10 }}>
                {items.map(item => {
                  const done = checked.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => setChecked(c => done ? c.filter(x => x !== item.id) : [...c, item.id])}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: done ? C.mist : 'white', border: `1px solid ${done ? C.border : '#E2E8F0'}`, transition: 'all 0.15s' }}
                    >
                      <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${done ? C.primary : '#CBD5E1'}`, background: done ? C.primary : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        {done && <CheckCircle2 size={12} style={{ color: 'white' }} />}
                      </div>
                      <span style={{ fontSize: 13, color: done ? C.primaryDark : C.textMuted, fontWeight: done ? 500 : 400, lineHeight: 1.4 }}>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
          <p style={{ fontSize: 11, color: C.textMuted, textAlign: 'center', margin: 0 }}>
            APOTEKH pre-populates this checklist from PC inspection guidelines and your live data. Tick items off as you verify them.
          </p>
        </div>
      )}
    </div>
  );
}

function ExploreAnalytics() {
  const bars = [
    { day: 'Mon', rev: 0 }, { day: 'Tue', rev: 10500 },
  ];
  const maxRev = 10500;
  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.primaryDark, margin: '0 0 4px' }}>Analytics</h1>
        <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Week of 14–20 Oct 2024 · STANDARD tier</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <StatCard label="Revenue this week" value="Tsh 10,500" sub="vs Tsh 0 last week" icon={TrendingUp} color="#16A34A" highlight />
        <StatCard label="Transactions" value="1" sub="1 sale this week" icon={Activity} color={C.primary} />
        <StatCard label="Items dispensed" value="40" sub="2 products · 1 patient" icon={Pill} color={C.primary} />
        <StatCard label="Safety overrides" value="1" sub="CONTRAINDICATED · logged" icon={AlertTriangle} color="#DC2626" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <SectionLabel>Revenue — this week</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 120, paddingTop: 8 }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
              const bar = bars.find(b => b.day === day);
              const h = bar ? (bar.rev / maxRev) * 100 : 0;
              return (
                <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: '100%', background: h > 0 ? C.primary : C.mist, borderRadius: '4px 4px 0 0', height: `${Math.max(h, 4)}%`, minHeight: 4, transition: 'height 0.3s', position: 'relative' }}>
                    {h > 0 && <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: C.primary, fontWeight: 700, whiteSpace: 'nowrap' }}>10.5k</div>}
                  </div>
                  <span style={{ fontSize: 10, color: C.textMuted }}>{day}</span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <SectionLabel>Top Products by Revenue</SectionLabel>
          {[
            { name: 'Amoxicillin 500mg', rev: 6000, pct: 57 },
            { name: 'Warfarin 5mg',      rev: 4500, pct: 43 },
          ].map(p => (
            <div key={p.name} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark }}>{p.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>Tsh {p.rev.toLocaleString()}</span>
              </div>
              <div style={{ height: 6, background: C.mist, borderRadius: 4 }}>
                <div style={{ height: '100%', background: C.primary, borderRadius: 4, width: `${p.pct}%` }} />
              </div>
              <p style={{ fontSize: 11, color: C.textMuted, margin: '4px 0 0' }}>{p.pct}% of revenue</p>
            </div>
          ))}
        </Card>
      </div>
      <Card>
        <SectionLabel>Safety Impact</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'Interaction alerts fired', value: '1', sub: 'CONTRAINDICATED: Amoxicillin + Warfarin' },
            { label: 'Overrides by dispenser', value: '1', sub: 'James Mwangi · 15 Oct 09:18' },
            { label: 'Alerts blocked (no override)', value: '0', sub: 'Dispenser removed item from cart' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 28, fontWeight: 700, color: C.primaryDark, margin: '0 0 4px', fontFamily: 'var(--font-serif, serif)' }}>{value}</p>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.primaryDark, margin: '0 0 4px' }}>{label}</p>
              <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>{sub}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ExploreReports() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.primaryDark, margin: '0 0 4px' }}>Reports</h1>
      </div>
      {/* Daily Close */}
      <Card style={{ marginBottom: 16, background: '#F0FDF4', border: '1.5px solid #86EFAC' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <SectionLabel>Daily Close — 15 Oct 2024</SectionLabel>
            <p style={{ fontSize: 11, color: C.textMuted, margin: '-8px 0 0' }}>Closed by system · 23:59</p>
          </div>
          <button style={{ padding: '7px 14px', borderRadius: 8, background: 'white', border: `1px solid ${C.border}`, color: C.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><Download size={13} /> Export PDF</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Total Revenue', value: 'Tsh 10,500', highlight: true },
            { label: 'Transactions', value: '1' },
            { label: 'Cash', value: 'Tsh 10,500' },
            { label: 'Mobile Money', value: 'Tsh 0' },
          ].map(({ label, value, highlight }) => (
            <div key={label} style={{ textAlign: 'center', padding: '12px', background: 'white', borderRadius: 8 }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: highlight ? '#16A34A' : C.primaryDark, margin: '0 0 4px', fontFamily: 'var(--font-serif, serif)' }}>{value}</p>
              <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </Card>
      {/* Report types */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { label: 'Sales Report', sub: 'Revenue, top products, payment methods', icon: TrendingUp },
          { label: 'Stock Movement', sub: 'Received, dispensed, adjusted', icon: ArrowDownUp },
          { label: 'Voids & Returns', sub: 'Cancelled sales and returned items', icon: X },
          { label: 'Safety Impact', sub: 'Alerts fired, overrides, interactions', icon: AlertTriangle },
          { label: 'Inventory Report', sub: 'Stock levels, valuation, slow movers', icon: Package },
          { label: 'Controlled Register', sub: 'Narcotics & controlled drug log', icon: Eye },
        ].map(({ label, sub, icon: Icon }) => (
          <Card key={label} style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: C.mist, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} style={{ color: C.primary }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark, margin: '0 0 2px' }}>{label}</p>
                <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>{sub}</p>
              </div>
              <ChevronRight size={15} style={{ color: C.textMuted }} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

const TMDA_UPDATE_CONTENT = {
  tag: 'TMDA UPDATE',
  title: 'TMDA Essential Medicines List 2024 — Revised Antibiotic Schedules',
  sub: 'Updated classification for macrolides and fluoroquinolones under AWaRe WATCH category.',
  updated: '1 week ago',
  readingTime: '4 min read',
  urgent: false,
  body: [
    {
      type: 'lead',
      text: 'TMDA has issued Circular No. TMDA/CIR/2024/047 revising the scheduling of several antibiotic classes under the WHO AWaRe framework. Pharmacies must comply by 1 January 2025.',
    },
    {
      type: 'heading', text: 'What changed',
    },
    {
      type: 'text',
      text: 'The following antibiotics have moved from ACCESS to WATCH category, meaning they now require a valid prescription and cannot be dispensed over the counter at retail pharmacies and ADDOs:',
    },
    {
      type: 'table',
      headers: ['Medicine', 'Previous', 'New', 'Effective'],
      rows: [
        ['Azithromycin (all strengths)', 'ACCESS', 'WATCH', '1 Jan 2025'],
        ['Ciprofloxacin 250mg / 500mg', 'ACCESS', 'WATCH', '1 Jan 2025'],
        ['Levofloxacin 250mg–750mg',    'ACCESS', 'WATCH', '1 Jan 2025'],
        ['Clarithromycin 250mg',        'OTC',    'WATCH', '1 Jan 2025'],
      ],
    },
    {
      type: 'heading', text: 'What this means for your pharmacy',
    },
    {
      type: 'text',
      text: 'From 1 January 2025, APOTEKH will automatically flag any dispensing of these products without a recorded prescription. The system will prompt your dispenser to either upload a prescription or document an exemption.',
    },
    {
      type: 'callout',
      label: 'APOTEKH will handle this automatically',
      text: 'Your drug catalogue, patient safety alerts, and dispensing checks will be updated to reflect the new schedule on the effective date. No manual configuration needed.',
    },
    {
      type: 'heading', text: 'RESERVE antibiotics — no change',
    },
    {
      type: 'text',
      text: 'Carbapenems, polymyxins, and other last-resort antibiotics remain under the RESERVE classification. Dispensing requires specialist prescription and is flagged in real time in APOTEKH with a mandatory override log.',
    },
    {
      type: 'heading', text: 'Action required before 1 January 2025',
    },
    {
      type: 'checklist',
      items: [
        'Review your current stock of Azithromycin, Ciprofloxacin, and Levofloxacin',
        'Update your prescription collection workflow for these products',
        'Brief your dispensing staff — they will see updated alerts from APOTEKH automatically',
        'Contact your TMDA regional officer if you hold bulk OTC stock of affected products',
      ],
    },
    {
      type: 'source',
      text: 'Source: TMDA Circular TMDA/CIR/2024/047 · October 2024 · Verified by APOTEKH Editorial Team',
    },
  ],
};

function KnowledgeArticleView({ article, onBack }: { article: typeof TMDA_UPDATE_CONTENT; onBack: () => void }) {
  return (
    <div style={{ padding: 24 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: C.primary, fontSize: 13, fontWeight: 600, padding: '0 0 16px', marginBottom: 4 }}>
        <ChevronLeft size={15} /> Back to Knowledge Hub
      </button>

      <div style={{ maxWidth: 720 }}>
        {/* Article meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 10, background: '#FFF7ED', color: '#D97706', border: '1px solid #FDE68A', borderRadius: 4, padding: '3px 9px', fontWeight: 700, letterSpacing: '0.05em' }}>
            {article.tag}
          </span>
          <span style={{ fontSize: 11, color: C.textMuted }}>{article.updated}</span>
          <span style={{ fontSize: 11, color: C.textMuted }}>·</span>
          <span style={{ fontSize: 11, color: C.textMuted }}>{article.readingTime}</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.primaryDark, margin: '0 0 8px', lineHeight: 1.3 }}>{article.title}</h1>
        <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 24px' }}>Published by APOTEKH Editorial Team · Verified against TMDA source document</p>
        <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, marginBottom: 24 }} />

        {/* Body */}
        {article.body.map((block, i) => {
          if (block.type === 'lead') return (
            <p key={i} style={{ fontSize: 15, color: C.primaryDark, lineHeight: 1.65, fontWeight: 500, margin: '0 0 20px', borderLeft: `3px solid ${C.primary}`, paddingLeft: 16 }}>{block.text}</p>
          );
          if (block.type === 'heading') return (
            <h2 key={i} style={{ fontSize: 15, fontWeight: 700, color: C.primaryDark, margin: '24px 0 10px' }}>{block.text}</h2>
          );
          if (block.type === 'text') return (
            <p key={i} style={{ fontSize: 14, color: C.primaryDark, lineHeight: 1.65, margin: '0 0 16px' }}>{block.text}</p>
          );
          if (block.type === 'table' && block.headers && block.rows) return (
            <div key={i} style={{ overflowX: 'auto', marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.mist }}>
                    {block.headers.map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: C.primaryDark, borderBottom: `1px solid ${C.border}`, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows!.map((row, ri) => (
                    <tr key={ri} style={{ background: ri % 2 === 0 ? 'white' : '#F8FAFB' }}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{ padding: '8px 12px', color: ci === 1 ? '#64748B' : ci === 2 ? '#D97706' : C.primaryDark, fontWeight: ci === 2 ? 700 : 400, borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          if (block.type === 'callout') return (
            <div key={i} style={{ background: C.mist, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.primary}`, borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>✓ {block.label}</p>
              <p style={{ fontSize: 13, color: C.primaryDark, margin: 0, lineHeight: 1.5 }}>{block.text}</p>
            </div>
          );
          if (block.type === 'checklist' && block.items) return (
            <div key={i} style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
              {block.items.map((item, ii) => (
                <div key={ii} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <CheckCircle2 size={11} style={{ color: 'white' }} />
                  </div>
                  <span style={{ fontSize: 13, color: C.primaryDark, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          );
          if (block.type === 'source') return (
            <p key={i} style={{ fontSize: 11, color: C.textMuted, borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 24 }}>{block.text}</p>
          );
          return null;
        })}
      </div>
    </div>
  );
}

function ExploreKnowledge() {
  const [openArticle, setOpenArticle] = useState<typeof TMDA_UPDATE_CONTENT | null>(null);

  if (openArticle) return <KnowledgeArticleView article={openArticle} onBack={() => setOpenArticle(null)} />;

  const articles = [
    { tag: 'DRUG SAFETY', title: 'Amoxicillin–Warfarin Interaction: Clinical Evidence and Management', sub: 'Co-administration increases anticoagulant effect. INR monitoring and dose adjustment recommended.', updated: '2 days ago', urgent: true, tmda: false },
    { tag: 'TMDA UPDATE', title: TMDA_UPDATE_CONTENT.title, sub: TMDA_UPDATE_CONTENT.sub, updated: '1 week ago', urgent: false, tmda: true },
    { tag: 'BEST PRACTICE', title: 'FEFO Dispensing: How to Prioritise Batches to Minimise Expiry Loss', sub: 'Step-by-step guide to FEFO batch management for retail pharmacy dispensers.', updated: '2 weeks ago', urgent: false, tmda: false },
    { tag: 'COMPLIANCE', title: 'PC Premises Registration Renewal — Required Documents Checklist', sub: 'Full list of documents required for annual renewal submission to the Pharmacy Council.', updated: '1 month ago', urgent: false, tmda: false },
    { tag: 'CLINICAL', title: 'AWaRe Classification: ACCESS, WATCH, and RESERVE Antibiotics in Tanzania', sub: 'WHO AWaRe system guide for antibiotic stewardship in outpatient and ADDO settings.', updated: '2 months ago', urgent: false, tmda: false },
  ];

  const tagColor = (tag: string, urgent: boolean) => {
    if (urgent)         return { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' };
    if (tag === 'TMDA UPDATE') return { bg: '#FFF7ED', color: '#D97706', border: '#FDE68A' };
    return { bg: C.mist, color: C.primary, border: C.border };
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.primaryDark, margin: '0 0 4px' }}>Knowledge Hub</h1>
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>TMDA updates, drug safety alerts, clinical references, and dispensing best practices — curated for Tanzania.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 12px', height: 36, width: 200 }}>
          <Search size={13} style={{ color: C.textMuted }} /><span style={{ fontSize: 13, color: C.textMuted }}>Search…</span>
        </div>
      </div>

      {/* TMDA update banner */}
      <div
        onClick={() => setOpenArticle(TMDA_UPDATE_CONTENT)}
        style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 12, padding: '14px 18px', marginBottom: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'box-shadow 0.15s' }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FFF7ED', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <AlertTriangle size={18} style={{ color: '#D97706' }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>New TMDA Regulatory Update</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark, margin: '0 0 2px' }}>{TMDA_UPDATE_CONTENT.title}</p>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Effective 1 January 2025 · Action required before year-end</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#D97706', color: 'white', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
          Read update <ChevronRight size={13} />
        </div>
      </div>

      {/* Article list */}
      <div style={{ display: 'grid', gap: 10 }}>
        {articles.map(a => {
          const tc = tagColor(a.tag, a.urgent);
          return (
            <Card
              key={a.title}
              style={{ cursor: 'pointer', borderColor: a.tmda ? '#FDE68A' : C.border }}
              onClick={a.tmda ? () => setOpenArticle(TMDA_UPDATE_CONTENT) : undefined}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 9, background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, borderRadius: 4, padding: '2px 7px', fontWeight: 700, letterSpacing: '0.05em' }}>{a.tag}</span>
                    <span style={{ fontSize: 11, color: C.textMuted }}>{a.updated}</span>
                    {a.tmda && <span style={{ fontSize: 10, background: '#FFF7ED', color: '#D97706', border: '1px solid #FDE68A', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>ACTION REQUIRED</span>}
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.primaryDark, margin: '0 0 4px' }}>{a.title}</p>
                  <p style={{ fontSize: 12, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>{a.sub}</p>
                </div>
                <ChevronRight size={15} style={{ color: a.tmda ? '#D97706' : C.textMuted, flexShrink: 0, marginTop: 4 }} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ExploreStaff() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.primaryDark, margin: '0 0 4px' }}>Staff Activity</h1>
        <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Operational activity derived from logins and dispensing events · 15 Oct 2024</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
        {/* Staff member */}
        <Card>
          <SectionLabel>On duty today</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: `1px solid ${C.border}` }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.sidebarActive, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>JM</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark, margin: '0 0 2px' }}>James Mwangi</p>
              <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>Dispenser</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
                <span style={{ fontSize: 10, color: '#166534', fontWeight: 600 }}>Active · logged in 08:45</span>
              </div>
            </div>
          </div>
        </Card>
        {/* Activity log */}
        <Card>
          <SectionLabel>Activity log — James Mwangi</SectionLabel>
          <div style={{ display: 'grid', gap: 0 }}>
            {[
              { time: '09:18', type: 'SALE', color: C.primary, bg: C.mist, desc: 'Completed Sale #0001 — Tsh 10,500 · Cash · 2 products', detail: 'Amoxicillin 500mg ×10 + Warfarin 5mg ×30', alert: '⚠ 1 safety override logged (CONTRAINDICATED)' },
              { time: '08:47', type: 'STOCK IN', color: '#1D9E75', bg: '#EDF7F3', desc: 'Received stock — Amoxicillin 500mg Capsules', detail: '500 units · Batch SH-2024-0891 · Shelys Pharma · Exp 29 Nov 2024', alert: null },
              { time: '08:45', type: 'LOGIN', color: '#64748B', bg: '#F8FAFC', desc: 'Logged in to BEST CARE PHARMACY', detail: 'Session started · STANDARD plan · Online', alert: null },
            ].map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: i < 2 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ textAlign: 'right', flexShrink: 0, width: 44 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: C.primaryDark, margin: 0 }}>{e.time}</p>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, background: e.bg, color: e.color, borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>{e.type}</span>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark, margin: 0 }}>{e.desc}</p>
                  </div>
                  <p style={{ fontSize: 12, color: C.textMuted, margin: '0 0 4px' }}>{e.detail}</p>
                  {e.alert && <p style={{ fontSize: 11, color: '#DC2626', margin: 0, fontWeight: 600 }}>{e.alert}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Guided step screens (same as before) ──────────────────────────────────────

function StepDashboardEmpty() {
  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.primaryDark, margin: '0 0 4px' }}>Good morning, James!</h1>
        <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Tuesday, 15 October 2024</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <StatCard label="Today's Revenue" value="Tsh 0" sub="No sales yet" icon={TrendingUp} color={C.primary} />
        <StatCard label="Low Stock Items" value="0" sub="All products stocked" icon={AlertTriangle} color="#D97706" />
        <StatCard label="Expiring ≤30 Days" value="0" sub="No batches near expiry" icon={Clock} color="#DC2626" />
        <StatCard label="Total Products" value="0" sub="Add your first product" icon={Package} color={C.primary} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark }}>Low Stock Alerts</span>
            <span style={{ fontSize: 12, color: C.primary }}>Manage →</span>
          </div>
          <EmptyPanel message="No low-stock products right now" />
        </Card>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark }}>Recent Movements</span>
            <span style={{ fontSize: 12, color: C.primary }}>View all →</span>
          </div>
          <EmptyPanel message="No movements recorded yet" />
        </Card>
        <Card>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark, margin: '0 0 12px' }}>Today's Activity</p>
          <EmptyPanel message="No activity recorded today yet." />
        </Card>
      </div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark }}>Expiry Countdown</span>
          <span style={{ fontSize: 12, color: C.primary }}>All expiry →</span>
        </div>
        <EmptyPanel message="No batches expiring within 30 days" />
      </Card>
    </div>
  );
}

function StepAddProduct() {
  return (
    <div style={{ padding: 24, maxWidth: 720, display: 'grid', gap: 14 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.primaryDark, margin: '0 0 4px' }}>Add Product</h1>
        <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Search the TMDA master catalogue to pre-fill clinical details, then set your pricing and stock levels.</p>
      </div>
      <Card>
        <SectionLabel>Search Master Catalogue</SectionLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.mist, border: `1.5px solid ${C.primary}`, borderRadius: 8, padding: '0 12px', height: 40, marginBottom: 8 }}>
          <Search size={14} style={{ color: C.primaryMid, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: C.primary, flex: 1 }}>Amoxicillin</span>
          <div style={{ width: 2, height: 16, background: C.primary }} />
        </div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '10px 14px', background: '#F0FDF9', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark, margin: '0 0 2px' }}>Amoxicillin <span style={{ color: C.textMuted, fontWeight: 400 }}>· 500mg · CAPSULE</span></p>
                <p style={{ fontSize: 11, color: C.primary, margin: 0 }}>TZ-TMDA-AM500-001 · Shelys Pharmaceuticals</p>
              </div>
              <span style={{ fontSize: 10, background: C.primaryLight, color: C.primary, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>NEML</span>
            </div>
          </div>
          <div style={{ padding: '10px 14px' }}>
            <p style={{ fontSize: 13, fontWeight: 400, color: C.textMuted, margin: 0 }}>Amoxicillin <span style={{ color: C.textMuted }}>· 250mg · CAPSULE</span></p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.primaryLight, borderRadius: 10, padding: '10px 14px' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark, margin: '0 0 1px' }}>Amoxicillin · 500mg · CAPSULE</p>
            <p style={{ fontSize: 11, color: C.primary, margin: 0 }}>Shelys Pharmaceuticals · TZ-TMDA-AM500-001</p>
          </div>
          <span style={{ fontSize: 11, color: C.textMuted, cursor: 'pointer' }}>Clear</span>
        </div>
      </Card>
      <Card>
        <SectionLabel>Basic Information</SectionLabel>
        <p style={{ fontSize: 11, color: C.textMuted, margin: '-6px 0 12px', fontStyle: 'italic' }}>Catalog-linked fields are pre-filled and locked. Only pricing and stock details can be edited.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Generic Name *" value="Amoxicillin" />
          <Field label="Brand / Trade Name" value="Amoxil" />
          <Field label="Product Name *" value="Amoxicillin 500mg Capsules" />
          <Field label="Manufacturer" value="Shelys Pharmaceuticals" />
          <Field label="Therapeutic Category" value="Antibiotic" />
          <Field label="Drug Class" value="OTC" />
          <Field label="TMDA Registration No." value="TZ-TMDA-AM500-001" />
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <SectionLabel>Dosage &amp; Packaging</SectionLabel>
          <div style={{ display: 'grid', gap: 10 }}>
            <Field label="Dosage Form" value="CAPSULE" />
            <Field label="Strength" value="500mg" />
            <Field label="Dispensing Unit" value="Capsule" />
            <Field label="Pack Size" value="30" />
          </div>
        </Card>
        <div style={{ display: 'grid', gap: 14 }}>
          <Card>
            <SectionLabel>Pricing</SectionLabel>
            <div style={{ display: 'grid', gap: 10 }}>
              <Field label="Purchase Price (Tsh)" value="350" />
              <Field label="Selling Price (Tsh)" value="600" active />
            </div>
            <p style={{ fontSize: 11, color: C.primary, margin: '8px 0 0' }}>Margin: Tsh 250 (71%)</p>
          </Card>
          <Card>
            <SectionLabel>Stock Thresholds</SectionLabel>
            <div style={{ display: 'grid', gap: 10 }}>
              <Field label="Reorder Level" value="100 capsules" active />
              <Field label="Minimum Stock" value="20 capsules" />
            </div>
          </Card>
        </div>
      </div>
      <Card>
        <SectionLabel>Current Stock on Hand</SectionLabel>
        <p style={{ fontSize: 11, color: C.textMuted, margin: '-6px 0 12px' }}>How many units do you have right now?</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Quantity on Hand" value="500 capsules" active />
          <Field label="Batch / Lot Number" value="SH-2024-0891" />
          <Field label="Expiry Date" value="29 Nov 2024" warning />
          <Field label="Purchase Price per Unit (Tsh)" value="350" />
        </div>
      </Card>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button style={{ padding: '10px 16px', borderRadius: 8, background: 'white', color: C.primary, border: `1px solid ${C.border}`, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
        <button style={{ padding: '10px 20px', borderRadius: 8, background: C.primary, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Create Product
        </button>
      </div>
    </div>
  );
}

function StepReceiveStock() {
  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ background: '#FFF7ED', border: '1.5px solid #FB923C', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <AlertTriangle size={16} style={{ color: '#EA580C', flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#9A3412', margin: '0 0 2px' }}>CAUTION — Expiry in 45 days</p>
          <p style={{ fontSize: 12, color: '#9A3412', margin: 0, opacity: 0.85 }}>Only receive if you can dispense the full batch before 29 Nov 2024. FEFO will prioritise this batch automatically.</p>
        </div>
      </div>
      <Card>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <SelectField label="Supplier" value="SHELYS PHARMA LTD" />
            <Field label="Product *" value="Amoxicillin 500mg Capsules" active />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Batch / Lot Number *" value="SH-2024-0891" />
            <Field label="Expiry Date *" value="29 Nov 2024" warning />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <Field label="Quantity Received *" value="500" active />
            <SelectField label="Price Mode" value="Per unit (capsule)" />
            <Field label="Pack Size" value="30" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Purchase Price (Tsh) *" value="350" />
            <Field label="Selling Price (Tsh)" value="600" active />
          </div>
          <p style={{ fontSize: 11, color: C.primary, margin: '-4px 0 0', fontWeight: 600 }}>Margin: Tsh 250 per capsule (71%)</p>
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button style={{ padding: '10px 20px', borderRadius: 8, background: C.primary, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Add to intake</button>
            <button style={{ padding: '10px 16px', borderRadius: 8, background: 'white', color: C.textMuted, border: `1px solid ${C.border}`, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function StepDispensing() {
  return (
    <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
      <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: `1.5px solid ${C.primary}`, borderRadius: 8, padding: '0 12px', height: 40 }}>
            <Search size={14} style={{ color: C.primaryMid }} />
            <span style={{ fontSize: 13, color: C.primary }}>Warfarin 5mg...</span>
            <div style={{ width: 2, height: 16, background: C.primary }} />
          </div>
          <button style={{ padding: '0 16px', borderRadius: 8, background: C.primary, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Add
          </button>
        </div>
        <Card style={{ marginBottom: 12 }}>
          <SectionLabel>Search results</SectionLabel>
          {[{ name: 'Warfarin 5mg Tablets', batch: 'WF-2024-0441', expiry: 'Mar 2026', stock: 200, price: 150 }].map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: `1px solid ${C.border}` }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark, margin: '0 0 2px' }}>{p.name}</p>
                <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>Batch {p.batch} · Exp {p.expiry} · {p.stock} in stock</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.primary }}>Tsh {p.price}/tab</span>
                <button style={{ padding: '6px 12px', borderRadius: 6, background: C.mist, border: `1px solid ${C.border}`, color: C.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Add to cart</button>
              </div>
            </div>
          ))}
        </Card>
        <div style={{ background: '#EDF7F3', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 8 }}>
          <Info size={13} style={{ color: C.primary, flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: C.primary, margin: 0 }}><strong>FEFO active.</strong> Amoxicillin Batch SH-2024-0891 (exp 29 Nov) will be dispensed first.</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <ShoppingCart size={15} style={{ color: C.primary }} />
            <SectionLabel>Sale · 2 items</SectionLabel>
          </div>
          {[
            { name: 'Amoxicillin 500mg', qty: 10, unit: 'caps', price: 6000, batch: 'SH-2024-0891' },
            { name: 'Warfarin 5mg',      qty: 30, unit: 'tabs', price: 4500, batch: 'WF-2024-0441' },
          ].map(item => (
            <div key={item.name} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark, margin: '0 0 2px' }}>{item.name}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.primary, margin: 0 }}>Tsh {item.price.toLocaleString()}</p>
              </div>
              <p style={{ fontSize: 11, color: C.textMuted, margin: '0 0 6px' }}>{item.qty} {item.unit} x Batch {item.batch}</p>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark }}>Total</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.primaryDark, fontFamily: 'var(--font-serif, serif)' }}>Tsh 10,500</span>
          </div>
        </Card>
        <SelectField label="Payment method" value="Cash" />
        <button style={{ padding: 12, borderRadius: 8, background: C.amber, color: 'white', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
          Review &amp; complete sale
        </button>
      </div>
    </div>
  );
}

function StepInteractionAlert() {
  return (
    <div style={{ padding: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <div style={{ maxWidth: 600, width: '100%' }}>
        <div style={{ background: '#FEF2F2', border: '2px solid #F87171', borderRadius: 14, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={18} style={{ color: '#DC2626' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', background: '#DC2626', color: 'white', padding: '2px 8px', borderRadius: 4 }}>CONTRAINDICATED</span>
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#991B1B', margin: '0 0 4px' }}>Amoxicillin 500mg + Warfarin 5mg</p>
              <p style={{ fontSize: 13, color: '#991B1B', margin: 0, lineHeight: 1.5, opacity: 0.9 }}>
                Amoxicillin may potentiate the anticoagulant effect of Warfarin, significantly increasing the risk of bleeding. Concomitant use requires close monitoring or therapeutic substitution.
              </p>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #FECACA', paddingTop: 12 }}>
            <p style={{ fontSize: 11, color: '#991B1B', margin: 0, fontWeight: 600 }}>Severity: CONTRAINDICATED · Source: TMDA drug safety database · Alert ID: DSA-0041</p>
          </div>
        </div>
        <Card>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark, margin: '0 0 6px' }}>How would you like to proceed?</p>
          <p style={{ fontSize: 12, color: C.textMuted, margin: '0 0 16px', lineHeight: 1.5 }}>
            You may acknowledge and continue — no PIN required. Your decision will be permanently logged against your account: name, alert, drug, and timestamp.
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            <button style={{ width: '100%', padding: 11, borderRadius: 8, background: '#DC2626', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <CheckCircle2 size={15} /> Acknowledge risk and continue — logged
            </button>
            <button style={{ width: '100%', padding: 11, borderRadius: 8, background: 'white', color: C.primary, border: `1px solid ${C.border}`, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Go back and remove Warfarin
            </button>
          </div>
          <p style={{ fontSize: 11, color: C.textMuted, margin: '12px 0 0', textAlign: 'center' }}>
            Override log: James Mwangi · Amoxicillin + Warfarin · CONTRAINDICATED · 15 Oct 2024 09:18
          </p>
        </Card>
      </div>
    </div>
  );
}

function StepDashboardComplete() {
  return <ExploreDashboard />;
}

// ── Guide panels ──────────────────────────────────────────────────────────────
function GuideItem({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.primary, flexShrink: 0, marginTop: 6 }} />
      <p style={{ fontSize: 13, color: '#444', margin: 0, lineHeight: 1.6 }}>{children}</p>
    </div>
  );
}
function GuideSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.primaryMid, margin: '0 0 8px' }}>{label}</p>
      {children}
    </div>
  );
}

function GuideStep0() {
  return (
    <>
      <GuideSection label="What you're looking at">
        <GuideItem>This is the <strong>Owner Dashboard</strong> — the first screen after login at BEST CARE PHARMACY.</GuideItem>
        <GuideItem>Four summary cards: today's revenue, low stock, expiring batches, and total products. All update in real time as your dispensers work.</GuideItem>
        <GuideItem>Below: Low Stock Alerts with progress bars, Recent Movements, Today's Activity counts, and the Expiry Countdown.</GuideItem>
        <GuideItem>The pharmacy is new — no products, no sales yet. Let's change that.</GuideItem>
      </GuideSection>
      <GuideSection label="What to do next">
        <GuideItem>Click <strong>Next</strong> to add your first medicine from the TMDA master catalogue.</GuideItem>
      </GuideSection>
      <div style={{ background: C.mist, borderRadius: 8, padding: '10px 12px' }}>
        <p style={{ fontSize: 12, color: C.primary, margin: 0, lineHeight: 1.5 }}>After the tour, click <strong>Explore freely</strong> in the header to navigate the whole system.</p>
      </div>
    </>
  );
}
function GuideStep1() {
  return (
    <>
      <GuideSection label="What you're looking at">
        <GuideItem>The <strong>Add Product</strong> form — notice the top section: <strong>Search Master Catalogue</strong>.</GuideItem>
        <GuideItem>Type a drug name and APOTEKH searches the <strong>TMDA master drug registry</strong> in real time. No manual entry of clinical details.</GuideItem>
        <GuideItem>Once you select a result, the generic name, strength, dosage form, manufacturer, and TMDA registration number <strong>auto-fill and lock</strong>.</GuideItem>
      </GuideSection>
      <GuideSection label="Why this matters">
        <GuideItem>Your dispensers cannot accidentally enter the wrong strength or drug class — the clinical record is pre-verified.</GuideItem>
        <GuideItem>You only fill in <strong>your</strong> data: selling price, purchase price, reorder level, and current stock on hand.</GuideItem>
        <GuideItem>The live margin calculation (Tsh 250 · 71%) updates as you type.</GuideItem>
      </GuideSection>
    </>
  );
}
function GuideStep2() {
  return (
    <>
      <GuideSection label="What you're looking at">
        <GuideItem>A stock intake for <strong>500 capsules of Amoxicillin 500mg</strong> from Shelys Pharma Ltd.</GuideItem>
        <GuideItem>The expiry date is <strong>29 November 2024 — only 45 days away</strong>. APOTEKH flagged it immediately.</GuideItem>
      </GuideSection>
      <GuideSection label="Why this matters">
        <GuideItem><strong>CAUTION fires at 60 days or less.</strong> The dispenser sees the warning before accepting the stock.</GuideItem>
        <GuideItem>Once received, APOTEKH enforces <strong>FEFO</strong> — this batch will always be dispensed before any later-arriving stock.</GuideItem>
      </GuideSection>
      <div style={{ background: '#FFF7ED', border: '1px solid #FCD34D', borderRadius: 8, padding: '10px 12px' }}>
        <p style={{ fontSize: 12, color: '#92400E', margin: 0, lineHeight: 1.5 }}>No other pharmacy system in Tanzania shows this warning at intake.</p>
      </div>
    </>
  );
}
function GuideStep3() {
  return (
    <>
      <GuideSection label="What you're looking at">
        <GuideItem>A <strong>dispensing sale in progress</strong>. Two medicines added: Amoxicillin and Warfarin.</GuideItem>
        <GuideItem>The <strong>FEFO hint</strong> confirms Amoxicillin Batch SH-2024-0891 (expiring soonest) will be dispensed first.</GuideItem>
        <GuideItem>Total: <strong>Tsh 10,500</strong>. Payment: Cash.</GuideItem>
      </GuideSection>
      <GuideSection label="What happens next">
        <GuideItem>Before this sale completes, APOTEKH runs a <strong>drug interaction check</strong> on every combination in the cart.</GuideItem>
        <GuideItem>Click <strong>Next</strong> to see what fires.</GuideItem>
      </GuideSection>
    </>
  );
}
function GuideStep4() {
  return (
    <>
      <GuideSection label="What just happened">
        <GuideItem>APOTEKH detected a <strong>CONTRAINDICATED interaction</strong> between Amoxicillin and Warfarin before the medicine left the counter.</GuideItem>
        <GuideItem>Amoxicillin can potentiate Warfarin's anticoagulant effect — <strong>significant bleeding risk</strong>.</GuideItem>
      </GuideSection>
      <GuideSection label="The override model">
        <GuideItem>No PIN required. No escalation. <strong>The dispenser decides.</strong></GuideItem>
        <GuideItem>If they proceed, the decision is <strong>permanently logged</strong>: their name, the drugs, the alert severity, and the timestamp.</GuideItem>
        <GuideItem>The log cannot be edited or deleted — not even by the owner or APOTEKH.</GuideItem>
      </GuideSection>
      <div style={{ background: '#FEF2F2', border: '1px solid #F87171', borderRadius: 8, padding: '10px 12px' }}>
        <p style={{ fontSize: 12, color: '#991B1B', margin: 0, lineHeight: 1.5 }}>This check runs on <strong>every tier</strong> — ADDO through Premium. Never gated by price.</p>
      </div>
    </>
  );
}
function GuideStep5({ onExplore }: { onExplore: (p: ExplorePage) => void }) {
  return (
    <>
      <GuideSection label="What just happened">
        <GuideItem>The sale completed. <strong>Receipt #0001 generated</strong> and stock updated automatically.</GuideItem>
        <GuideItem>The dashboard updated in real time — <strong>Tsh 10,500</strong> posted the moment the sale closed.</GuideItem>
        <GuideItem>The drug interaction override is permanently attached to this transaction.</GuideItem>
      </GuideSection>
      <GuideSection label="What the owner sees">
        <GuideItem>From their phone, from home, from anywhere — <strong>live revenue, the override log, and the dispenser's name</strong>.</GuideItem>
        <GuideItem>No WhatsApp summary at end of day. No waiting for a report. It was live the moment it happened.</GuideItem>
      </GuideSection>
      <div style={{ background: C.mist, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
        <p style={{ fontSize: 12, color: C.primary, margin: 0, lineHeight: 1.5 }}>That is APOTEKH — from empty inventory to first sale with safety checks.</p>
      </div>
      <div style={{ background: C.primaryDark, borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
        <p style={{ color: 'white', fontSize: 12, fontWeight: 600, margin: '0 0 6px' }}>Want to explore the full system?</p>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: '0 0 10px' }}>Click any nav item — Compliance, Analytics, Reports, Knowledge Hub, Staff Activity — all have real demo data.</p>
        <button onClick={() => onExplore('analytics')} style={{ width: '100%', padding: '8px', borderRadius: 6, background: C.amber, border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          Explore freely
        </button>
      </div>
      <p style={{ fontSize: 13, color: '#444', lineHeight: 1.6 }}>
        Ready to set up <strong>your pharmacy</strong>? Your first 14 days are free — no card required.
      </p>
    </>
  );
}
