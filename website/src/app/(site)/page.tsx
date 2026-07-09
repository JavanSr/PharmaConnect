'use client';

import { useState, useEffect } from 'react';
import ProofStrip from '@/components/ProofStrip';
import { TIERS, WHOLESALE_TIERS } from '@/lib/data/pricing';

// ── DATA ──────────────────────────────────────────────────────────────────────

const TABS = [
  {
    id: 'dispensing', label: 'Dispensing',
    headline: 'Safe dispensing at every counter',
    body: 'Every sale runs through a controlled flow — product selection, drug interaction checking, FEFO guidance, and payment — without double entry or skipped safety steps.',
    items: [
      'Drug interaction checking — MINOR through CONTRAINDICATED',
      'FEFO guidance on every product selection',
      'Barcode scan to select and verify in one tap',
      'Anonymous session — no patient names or IDs stored',
      'Dispensing receipt generated automatically',
    ],
  },
  {
    id: 'inventory', label: 'Inventory',
    headline: 'Batch-level control from intake to sale',
    body: 'Every product tracked by batch, expiry, and supplier. Alerts at five expiry windows. FEFO enforced at every sale. All adjustments stay fully auditable.',
    items: [
      'Batch and expiry tracked from intake to dispensing',
      'Expiry alerts from 90 days out down to 1 day, with urgency levels',
      'Low-stock and near-expiry banners always visible',
      'QR and barcode scanning on intake',
      'Offline-ready — all changes sync when reconnected',
    ],
  },
  {
    id: 'safety', label: 'Patient Safety',
    headline: 'Clinical checks built into every sale',
    body: 'APOTEKH checks interactions, contraindications, and allergy flags before medicine leaves the counter — on every tier, at no extra cost.',
    items: [
      'MINOR, MODERATE, MAJOR, CONTRAINDICATED severity levels',
      '8 contraindication flags including pregnancy and renal failure',
      'Dose range checking for paediatrics and adults',
      'Alternative medicine suggestions and therapeutic equivalence matching',
      'Every override acknowledged and logged — who, what drug, what time',
      'Never tier-gated — full Clinical Decision Support on every plan',
    ],
  },
  {
    id: 'compliance', label: 'Compliance',
    headline: 'Every deadline visible before it becomes a crisis',
    body: 'TMDA licences, PC registrations, and inspection dates — tracked with clear status labels, early reminders, and evidence upload in one place.',
    items: [
      'TMDA and Pharmacy Council licence tracking built in',
      'Clear status labels for valid, attention-needed, and overdue items',
      'Configurable reminders before every deadline',
      'Evidence attachment and non-editable audit trail',
      'Inspection checklist to stay TMDA-ready year-round',
    ],
  },
  {
    id: 'analytics', label: 'Analytics',
    headline: 'Manage your pharmacy from anywhere',
    body: "Sales trends, stock movement, and compliance summaries on any device. Owners see every branch in one account — no separate logins, no WhatsApp reports.",
    items: [
      'Daily and monthly sales performance',
      'Stock movement and dead-stock scoring',
      'Compliance status summary across all branches',
      'Multi-branch visibility in one account',
      'Exportable reports for management review',
    ],
  },
];

const FAQS = [
  {
    q: 'Does APOTEKH work without internet?',
    a: 'Yes. APOTEKH is offline-first — dispensing, stock updates, and safety checks all work without a connection. Data syncs automatically the moment connectivity returns. You never lose a sale or a record because of network problems.',
  },
  {
    q: 'Which devices does it support?',
    a: 'APOTEKH runs in any modern browser on desktop, tablet, or Android phone. A dedicated Android app is in active development for faster offline use at the dispensing counter.',
  },
  {
    q: 'What support do I get?',
    a: 'All plans include email support at support@apotekh.co.tz with responses within 24 hours on business days. You can also reach us via WhatsApp for urgent issues. Premium and Enterprise accounts get priority response. We are based in Tanzania — we understand your context, your regulations, and your operating environment.',
  },
  {
    q: 'How does the QR and barcode scanner work?',
    a: 'Use any phone camera or USB barcode reader. Scan a product during stock intake to auto-fill batch details, or scan at the dispensing counter to select and verify a medicine instantly. No separate hardware purchase required.',
  },
  {
    q: 'Is my data safe?',
    a: 'Yes. Your data is encrypted in transit and at rest, stored on servers within Africa, and never shared with third parties. We follow PDPC data protection guidance for Tanzania. No patient personal data is stored — dispensing sessions are anonymous by design.',
  },
  {
    q: 'Can I manage multiple pharmacy branches?',
    a: 'Yes - ADDO includes a single-outlet Owner Dashboard. Basic (2 outlets) through Premium (5 outlets) add multi-outlet Owner Dashboard visibility with live revenue, stock levels, and compliance status. Enterprise supports unlimited outlets.',
  },
  {
    q: 'How does pricing work?',
    a: 'Retail subscriptions start at Tsh 15,000/month for ADDOs and scale to Tsh 75,000/month for Premium. All plans include a 14-day free trial. Annual billing gives two months free — you pay for 10, get 12.',
  },
  {
    q: 'Is the drug interaction checker available on all plans?',
    a: 'Yes — Clinical Decision Support (drug interaction checking, contraindication alerts, dose calculations) is never tier-gated. Every pharmacy on every plan gets the full suite. Override permissions are role-based.',
  },
];

const fmt = (n: number) => 'Tsh ' + n.toLocaleString();

// ── HELPERS ───────────────────────────────────────────────────────────────────

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <circle cx="7" cy="7" r="7" fill="#1A6B5C" opacity={0.12} />
      <path d="M4 7l2 2 4-4" stroke="#1A6B5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── HERO ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section style={{
      background: 'linear-gradient(135deg, #0D4035 0%, #1A6B5C 60%, #2A9478 100%)',
      padding: '88px 32px 80px', overflow: 'hidden', position: 'relative',
    }}>
      {/* Subtle dot-grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.07,
        backgroundImage: 'radial-gradient(circle, #7ECFB4 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ maxWidth: 680 }}>
          <p className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7ECFB4', marginBottom: 20, animation: 'fadeUp 700ms ease both 0ms' }}>
            Built for Tanzania · Phase 1 Live
          </p>
          <h1 className="serif" style={{
            fontSize: 'clamp(40px,5vw,68px)', lineHeight: 1.05, letterSpacing: '-0.02em',
            color: 'white', margin: '0 0 24px', animation: 'fadeUp 700ms ease both 100ms',
          }}>
            The operating system<br />
            <span style={{ color: '#7ECFB4' }}>for pharmacies</span>
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.78, color: 'rgba(255,255,255,0.80)', marginBottom: 36, maxWidth: 560, animation: 'fadeUp 700ms ease both 420ms' }}>
            Tanzania&apos;s pharmacies need more than a point-of-sale system. APOTEKH gives them inventory control,
            patient safety checks, regulatory compliance, and analytics — in one platform built for how pharmacies actually work.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20, animation: 'fadeUp 700ms ease both 560ms' }}>
            <a href="https://app.apotekh.co.tz/register" className="cta-primary" style={{
              background: '#7ECFB4', color: '#0D4035',
              boxShadow: '0 4px 20px rgba(126,207,180,0.35)', fontSize: 15,
            }}>
              Start free trial — 14 days free
            </a>
            <a href="/demo" className="cta-outline" style={{ borderColor: 'rgba(255,255,255,0.4)', color: 'rgba(255,255,255,0.9)' }}>
              Book a demo →
            </a>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', animation: 'fadeUp 600ms ease both 700ms' }}>No credit card required &nbsp;&middot;&nbsp; Cancel anytime &nbsp;&middot;&nbsp; Clinical Decision Support on every plan</p>
        </div>
      </div>
    </section>
  );
}

// ── MARQUEE ───────────────────────────────────────────────────────────────────

function Marquee() {
  const t = 'Drug Interaction Checking · Expiry Monitoring · Barcode Scanning · Compliance Alerts · Inventory Management · Patient Safety · Offline-First · FEFO Enforcement · M-Pesa Payments · Multi-Branch Dashboard · TMDA Compliance · ';
  return (
    <div style={{ background: '#0D4035', padding: '12px 0', overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="marquee-track" style={{ display: 'flex', whiteSpace: 'nowrap', width: 'max-content' }}>
        {[0, 1, 2, 3].map(i => (
          <span key={i} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', paddingRight: 64, flexShrink: 0 }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

// ── FEATURE TABS ──────────────────────────────────────────────────────────────

function TabPanel({ id }: { id: string }) {
  const wrap: React.CSSProperties = { background: '#F7FBF8', borderRadius: 16, border: '1px solid #E2EDE8', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 };
  const hdr = (label: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span className="mono" style={{ fontSize: 11, color: '#516965' }}>{label} · Live view</span>
      <span style={{ background: '#EDF7F3', color: '#1A6B5C', fontSize: 11, fontWeight: 600, borderRadius: 999, padding: '3px 10px' }}>● Active</span>
    </div>
  );

  if (id === 'dispensing') return (
    <div style={wrap}>
      {hdr('Dispensing')}
      <div style={{ border: '1px solid #E2EDE8', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, background: 'white' }}>
        <span style={{ fontSize: 14, color: '#516965', opacity: 0.45, fontFamily: 'system-ui' }}>⌘</span>
        <span style={{ fontSize: 12, color: '#516965', opacity: 0.5 }}>Search or scan a product…</span>
      </div>
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E2EDE8', overflow: 'hidden' }}>
        {[{ n: 'Amoxicillin 500mg', q: '×2', p: '3,150' }, { n: 'Paracetamol 500mg', q: '×1', p: '350' }].map(({ n, q, p }) => (
          <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #E2EDE8', fontSize: 12 }}>
            <span style={{ color: '#0D4035', fontWeight: 500 }}>{n}</span>
            <div style={{ display: 'flex', gap: 14 }}><span style={{ color: '#516965', fontSize: 11 }}>{q}</span><span style={{ color: '#0D4035' }}>{p}</span></div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#0D4035' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'white', letterSpacing: '0.08em' }}>TOTAL · Tsh</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>3,500</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
        {['Cash', 'M-Pesa', 'Tigo Pesa'].map(p => (
          <button key={p} style={{ padding: '7px', borderRadius: 8, border: '1px solid #E2EDE8', fontSize: 11, fontWeight: 600, color: '#0D4035', background: 'white', cursor: 'pointer' }}>{p}</button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: '#EDF7F3', border: '1px solid #D6F0E8' }}>
        <Check /><span style={{ fontSize: 12, color: '#145748' }}>No interactions detected · Safe to dispense</span>
      </div>
    </div>
  );

  if (id === 'inventory') return (
    <div style={wrap}>
      {hdr('Inventory')}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E2EDE8', overflow: 'hidden' }}>
        <div style={{ padding: '8px 14px', borderBottom: '1px solid #E2EDE8', background: '#EDF7F3' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1A6B5C', margin: 0 }}>Expiry alerts — next 30 days</p>
        </div>
        {[{ n: 'Amoxicillin Batch 241', d: '3 days', w: true }, { n: 'Ibuprofen Batch 189', d: '8 days', w: true }, { n: 'ORS WHO Batch 202', d: '20 days', w: false }].map(({ n, d, w }, i) => (
          <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: i < 2 ? '1px solid #E2EDE8' : 'none', fontSize: 12 }}>
            <span style={{ color: '#0D4035' }}>{n}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: w ? '#1A6B5C' : '#516965' }}>{d}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#516965', margin: 0 }}>Stock vs par</p>
      {[{ name: 'Amoxicillin 500mg', pct: 20, stock: '80/400', low: true }, { name: 'Metformin 500mg', pct: 90, stock: '180/200', low: false }, { name: 'Paracetamol 500mg', pct: 60, stock: '240/400', low: false }].map(({ name, pct, stock, low }) => (
        <div key={name}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: '#0D4035' }}>{name}</span>
            <span style={{ fontSize: 10, color: '#516965' }}>{stock}</span>
          </div>
          <div style={{ height: 5, borderRadius: 999, background: '#EDF7F3' }}><div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: low ? '#7ECFB4' : '#1A6B5C' }} /></div>
        </div>
      ))}
    </div>
  );

  if (id === 'safety') return (
    <div style={wrap}>
      {hdr('Patient Safety')}
      <div style={{ background: '#EDF7F3', border: '1.5px solid #1A6B5C', borderRadius: 12, padding: '12px 14px' }}>
        <p className="mono" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#0D4035', margin: '0 0 4px' }}>MAJOR INTERACTION</p>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#0D4035', margin: '0 0 4px' }}>Ibuprofen 400mg + Warfarin 5mg</p>
        <p style={{ fontSize: 11, color: '#1A6B5C', margin: '0 0 10px', opacity: 0.85 }}>Increased bleeding risk — acknowledge to proceed; the override is logged</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'white', border: '1px solid #AFDFD3' }}>
          <span style={{ fontSize: 10, color: '#516965', fontWeight: 500 }}>→ Alternative:</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#1A6B5C' }}>Paracetamol 500mg — therapeutically equivalent</span>
        </div>
      </div>
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E2EDE8', overflow: 'hidden' }}>
        {[{ n: 'Amoxicillin 500mg', s: 'Safe', c: '#1A6B5C' }, { n: 'Metformin 850mg', s: 'Safe', c: '#1A6B5C' }, { n: 'Paracetamol 500mg', s: 'Safe', c: '#1A6B5C' }].map(({ n, s, c }, i) => (
          <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: i < 2 ? '1px solid #E2EDE8' : 'none', fontSize: 12 }}>
            <span style={{ color: '#0D4035' }}>{n}</span><span style={{ color: c, fontWeight: 600, fontSize: 11 }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (id === 'compliance') return (
    <div style={wrap}>
      {hdr('Compliance')}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#0D4035', margin: 0 }}>Compliance year</p>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#1A6B5C', background: '#EDF7F3', padding: '2px 8px', borderRadius: 999 }}>2026</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 3 }}>
        {[{ m: 'Jan' }, { m: 'Feb' }, { m: 'Mar', d: 'r' }, { m: 'Apr', d: 'r' }, { m: 'May', cur: true }, { m: 'Jun', d: 'a' }, { m: 'Jul' }, { m: 'Aug' }, { m: 'Sep', d: 'r' }, { m: 'Oct' }, { m: 'Nov', d: 'r' }, { m: 'Dec' }].map(({ m, d, cur }) => (
          <div key={m} style={{ textAlign: 'center', padding: '4px 2px', borderRadius: 5, background: cur ? '#D6F0E8' : 'transparent' }}>
            <p style={{ fontSize: 9, fontWeight: cur ? 700 : 400, color: cur ? '#145748' : '#516965', margin: 0 }}>{m}</p>
            {d ? <div style={{ width: 4, height: 4, borderRadius: '50%', margin: '2px auto 0', background: d === 'r' ? '#1A6B5C' : '#7ECFB4' }} /> : <div style={{ height: 6 }} />}
          </div>
        ))}
      </div>
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E2EDE8', overflow: 'hidden' }}>
        {[{ c: '#1A6B5C', l: 'TMDA Premises Licence', d: 'Mar 2027' }, { c: '#7ECFB4', l: 'Annual fire inspection', d: '18 days' }, { c: '#145748', l: 'Refrigerator log', d: 'Today' }, { c: '#1A6B5C', l: 'PC Registration', d: 'Jun 2026' }].map(({ c, l, d }, i) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: i < 3 ? '1px solid #E2EDE8' : 'none', fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }} /><span style={{ color: '#0D4035' }}>{l}</span></div>
            <span style={{ color: '#516965', fontSize: 11 }}>{d}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={wrap}>
      {hdr('Analytics')}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E2EDE8', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #E2EDE8' }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#516965', margin: 0 }}>Revenue · last 30 days</p>
        </div>
        <div style={{ padding: '14px 14px 8px' }}>
          <p className="serif" style={{ fontSize: 22, color: '#0D4035', margin: '0 0 10px' }}>Tsh 1,240,000</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
            {[45, 60, 52, 70, 65, 80, 58, 75, 82, 90, 78, 85, 95, 88, 92, 100].map((h, i) => (
              <div key={i} style={{ flex: 1, borderRadius: 3, background: i === 15 ? '#1A6B5C' : '#D6F0E8', height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E2EDE8', overflow: 'hidden' }}>
        <div style={{ padding: '8px 14px', borderBottom: '1px solid #E2EDE8' }}><p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#516965', margin: 0 }}>Top medicines</p></div>
        {[{ n: 'Amoxicillin 500mg', v: 'Tsh 284,000' }, { n: 'Paracetamol 500mg', v: 'Tsh 197,000' }, { n: 'Metformin 500mg', v: 'Tsh 143,000' }].map(({ n, v }, i) => (
          <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: i < 2 ? '1px solid #E2EDE8' : 'none', fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 10, color: '#516965', minWidth: 14 }}>{i + 1}.</span><span style={{ color: '#0D4035' }}>{n}</span></div>
            <span style={{ color: '#1A6B5C', fontWeight: 600, fontSize: 11 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureTabs() {
  const [a, setA] = useState(0);
  const tab = TABS[a];
  return (
    <section id="features" className="reveal" style={{ background: 'white', padding: '88px 32px', borderBottom: '1px solid #E2EDE8' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <p className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1A6B5C', marginBottom: 12 }}>What it does</p>
        <h2 className="serif" style={{ fontSize: 'clamp(32px,4vw,48px)', color: '#0D4035', margin: '0 0 40px', lineHeight: 1.1 }}>
          Built for every part of pharmacy work
        </h2>
        <div style={{ display: 'flex', borderBottom: '2px solid #E2EDE8', marginBottom: 48, gap: 4, flexWrap: 'wrap' }}>
          {TABS.map((t, i) => (
            <button key={t.id} className={`tab-btn${i === a ? ' active' : ''}`} onClick={() => setA(i)}>{t.label}</button>
          ))}
        </div>
        <div className="mob-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start' }}>
          <div>
            <h3 className="serif" style={{ fontSize: 32, color: '#0D4035', margin: '0 0 16px', lineHeight: 1.15 }}>{tab.headline}</h3>
            <p style={{ fontSize: 15, lineHeight: 1.78, color: '#516965', marginBottom: 28 }}>{tab.body}</p>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 12 }}>
              {tab.items.map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#0D4035' }}>
                  <Check />{item}
                </li>
              ))}
            </ul>
          </div>
          <TabPanel id={tab.id} />
        </div>
      </div>
    </section>
  );
}

// ── HOW IT WORKS ──────────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section className="reveal" style={{ background: 'white', padding: '88px 32px', borderTop: '1px solid #E2EDE8' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <h2 className="serif" style={{ fontSize: 'clamp(28px,3.5vw,44px)', color: '#0D4035', margin: '0 0 8px', lineHeight: 1.1 }}>How it works</h2>
        <p style={{ fontSize: 15, color: '#516965', marginBottom: 52 }}>From sign-up to daily operations in three steps.</p>
        <div className="mob-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 48 }}>
          {[
            { n: 1, c: '#1A6B5C', title: 'Set up your pharmacy', body: 'Register, load your products from the catalogue or by scanning, and build your team. Most pharmacies are running within the same day — no training workshop required.' },
            { n: 2, c: '#1A6B5C', title: 'Work smarter at the counter', body: 'Dispensing, drug interaction checks, and stock updates happen in one controlled flow. Scan a product, confirm safety, complete the sale. No separate tools, no double entry.' },
            { n: 3, c: '#2A9478', title: 'Manage from anywhere', body: 'Compliance deadlines, inventory levels, and sales performance update in real-time. See everything across your branches from a phone or laptop — in Dodoma or wherever you are.' },
          ].map(({ n, c, title, body }) => (
            <div key={n}>
              <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, background: n === 1 ? '#EDF7F3' : n === 2 ? '#D6F0E8' : '#EDF7F3' }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: c }}>{n}</span>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0D4035', margin: '0 0 10px' }}>{title}</h3>
              <p style={{ fontSize: 14, color: '#516965', lineHeight: 1.78, margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── DASHBOARD SCREENS ─────────────────────────────────────────────────────────

function DashboardScreens() {
  return (
    <section className="reveal" style={{ background: '#F7FBF8', padding: '88px 32px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ maxWidth: 600, marginBottom: 48 }}>
          <p className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1A6B5C', marginBottom: 12 }}>Inside APOTEKH</p>
          <h2 className="serif" style={{ fontSize: 'clamp(28px,3.5vw,44px)', color: '#0D4035', margin: '0 0 16px', lineHeight: 1.1 }}>Built for the pharmacy counter</h2>
          <p style={{ fontSize: 15, color: '#516965', lineHeight: 1.78 }}>One platform connecting dispensing, stock, compliance, and management — from any device, online or off.</p>
        </div>
        <div className="dashboard-mockup" style={{ border: '1px solid #E2EDE8', borderRadius: 16, overflowX: 'auto', boxShadow: '0 24px 64px rgba(13,64,53,0.12)', background: 'white' }}>
          {/* Browser chrome */}
          <div style={{ background: '#0D4035', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 760 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['#ff5f57', '#ffbd2e', '#28c840'].map(c => <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.8, display: 'block' }} />)}
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <span className="mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.08)', padding: '3px 20px', borderRadius: 6 }}>app.apotekh.co.tz / dashboard</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '196px 1fr', minHeight: 460, minWidth: 760 }}>
            {/* Sidebar */}
            <div style={{ background: '#0D4035', padding: '16px 12px', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ marginBottom: 20, padding: '0 4px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/logo/apotekh-logo-white.svg" alt="APOTEKH" style={{ height: 22, display: 'block' }} />
              </div>
              {([['Dashboard', true], ['Dispensing', false], ['Inventory', false], ['Compliance', false], ['Analytics', false], ['Knowledge Hub', false], ['Reports', false], ['Settings', false]] as [string, boolean][]).map(([l, active]) => (
                <div key={l} style={{
                  padding: '8px 12px', borderRadius: 8, marginBottom: 2, fontSize: 12,
                  fontWeight: active ? 600 : 400, background: active ? 'rgba(255,255,255,0.13)' : 'transparent',
                  color: active ? 'white' : 'rgba(255,255,255,0.42)',
                }}>{l}</div>
              ))}
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2A9478', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>EJ</div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'white', lineHeight: 1.2, margin: 0 }}>Elihaki Javan</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Owner · All branches</p>
                </div>
              </div>
            </div>
            {/* Main */}
            <div style={{ padding: 24, background: 'white', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#516965', marginBottom: 4 }}>ALL BRANCHES · DODOMA</p>
                  <h3 className="serif" style={{ fontSize: 24, color: '#0D4035', margin: 0, lineHeight: 1 }}>Today, 12 May</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="live-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#2A9478', display: 'block' }} />
                  <span style={{ fontSize: 11, color: '#516965' }}>Live · synced 2s ago</span>
                </div>
              </div>
              {/* 4 stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { l: 'SALES TODAY', v: 'Tsh 412,500', b: '+18%', bc: '#1A6B5C' },
                  { l: 'ITEMS DISPENSED', v: '142', b: '+9', bc: '#1A6B5C' },
                  { l: 'COMPLIANCE', v: 'All clear', b: '3/3 branches', bc: '#1A6B5C' },
                  { l: 'EXPIRING ≤30D', v: '4 batches', b: 'Review', bc: '#1A6B5C' },
                ].map(({ l, v, b, bc }) => (
                  <div key={l} style={{ border: '1px solid #E2EDE8', borderRadius: 10, padding: '12px 14px' }}>
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#516965', margin: '0 0 6px' }}>{l}</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#0D4035', margin: '0 0 4px', lineHeight: 1 }}>{v}</p>
                    <p style={{ fontSize: 10, fontWeight: 600, color: bc, margin: 0 }}>{b}</p>
                  </div>
                ))}
              </div>
              {/* Chart + Activity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
                <div style={{ border: '1px solid #E2EDE8', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #E2EDE8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#516965', margin: 0 }}>Dispensing trend · last 14 days</p>
                    <p style={{ fontSize: 10, color: '#516965', margin: 0 }}>Tsh · thousands</p>
                  </div>
                  <div style={{ padding: '14px 14px 8px' }}>
                    <svg viewBox="0 0 380 90" style={{ width: '100%', height: 90, display: 'block' }}>
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1A6B5C" stopOpacity={0.18} />
                          <stop offset="100%" stopColor="#1A6B5C" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <path className="chart-area" d="M0,82 L29,70 L58,78 L87,58 L116,45 L145,54 L174,36 L203,27 L232,18 L261,23 L290,10 L319,5 L348,13 L380,20 L380,90 L0,90 Z" fill="url(#chartGrad)" />
                      <polyline className="chart-line" points="0,82 29,70 58,78 87,58 116,45 145,54 174,36 203,27 232,18 261,23 290,10 319,5 348,13 380,20" fill="none" stroke="#1A6B5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 9, color: '#516965' }}>Apr 25</span>
                      <span style={{ fontSize: 9, color: '#516965' }}>May 1</span>
                      <span style={{ fontSize: 9, color: '#516965' }}>May 12</span>
                    </div>
                  </div>
                </div>
                <div style={{ border: '1px solid #E2EDE8', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #E2EDE8', background: '#F7FBF8' }}>
                    <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#516965', margin: 0 }}>Live activity</p>
                  </div>
                  {[
                    { t: '14:02', who: 'Asha M.', act: 'Dispensed Amoxicillin 500mg × 21', tag: 'M-Pesa', tBg: 'rgba(26,107,92,0.1)', tC: '#1A6B5C' },
                    { t: '14:01', who: 'System', act: 'Re-order: Paracetamol 500mg below par', tag: 'Stock', tBg: 'rgba(26,107,92,0.1)', tC: '#1A6B5C' },
                    { t: '14:01', who: 'Juma K.', act: 'Closed cash drawer · Tsh 412,500', tag: 'Daily', tBg: 'rgba(81,105,101,0.1)', tC: '#516965' },
                    { t: '13:58', who: 'Asha M.', act: 'Acknowledged MAJOR interaction alert — override logged', tag: 'Safety', tBg: 'rgba(126,207,180,0.16)', tC: '#145748' },
                  ].map(({ t, who, act, tag, tBg, tC }, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '9px 14px', borderBottom: i < 3 ? '1px solid #E2EDE8' : 'none', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 9, color: '#516965', flexShrink: 0, marginTop: 1 }}>{t}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#0D4035' }}>{who} </span>
                        <span style={{ fontSize: 11, color: '#516965' }}>{act}</span>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, flexShrink: 0, background: tBg, color: tC, whiteSpace: 'nowrap' }}>{tag}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── OWNER REVENUE SECTION ─────────────────────────────────────────────────────

function OwnerRevenue() {
  return (
    <section className="reveal" style={{ background: 'linear-gradient(135deg, #0D4035 0%, #082B23 100%)', padding: '88px 32px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle, #7ECFB4 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <p className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Full visibility. Complete accountability.</p>
        <h2 className="serif" style={{ fontSize: 'clamp(32px,4.5vw,58px)', color: 'white', lineHeight: 1.05, margin: '0 0 24px' }}>
          Nothing moves<br />without you knowing.
        </h2>
        <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, maxWidth: 620, margin: '0 auto 48px' }}>
          Every sale, every void, every stock adjustment posts to your Owner Dashboard the moment it happens. You do not wait for a report. You do not ask the counter team. Every shilling is accounted for — before anyone tells you.
        </p>
        <div className="mob-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
          {[
            { val: 'Live', label: 'Revenue posted to your dashboard the moment a sale completes' },
            { val: "Locked", label: "Dispensers see their own screen — not the daily takings" },
            { val: 'Permanent', label: 'Every void and edit is logged — no transaction disappears quietly' },
          ].map(({ val, label }) => (
            <div key={val} style={{ padding: '32px 24px', background: 'rgba(255,255,255,0.04)' }}>
              <p className="serif" style={{ fontSize: 38, color: '#7ECFB4', margin: '0 0 10px' }}>{val}</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── SAFETY CHECKS ─────────────────────────────────────────────────────────────

function SafetyChecks() {
  return (
    <section className="reveal" style={{ background: 'white', padding: '88px 32px', borderTop: '1px solid #E2EDE8' }}>
      <div className="mob-stack" style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}>
        <div>
          <p className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1A6B5C', marginBottom: 12 }}>Patient safety</p>
          <h2 className="serif" style={{ fontSize: 'clamp(28px,3.5vw,44px)', color: '#0D4035', margin: '0 0 20px', lineHeight: 1.1 }}>Safety checks at every dispensing event</h2>
          <p style={{ fontSize: 15, color: '#516965', lineHeight: 1.8, marginBottom: 28 }}>
            No community pharmacy in Tanzania currently checks drug interactions at the point of dispensing. APOTEKH changes this — checking interactions, contraindications, and allergy flags before medicine leaves the counter.
          </p>
          <ul style={{ listStyle: 'none', display: 'grid', gap: 14, padding: 0 }}>
            {[
              'Drug interaction checking — MINOR through CONTRAINDICATED',
              'Contraindication alerts — pregnancy, renal, elderly, allergy',
              'Anonymous session — no patient names or national IDs stored',
            ].map(item => (
              <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#0D4035' }}>
                <Check />{item}
              </li>
            ))}
          </ul>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {[
            { level: 'MINOR', desc: 'Counselling recommended', bg: '#F0FDF4', border: '#86EFAC', text: '#166534', badgeBg: null, badge: null },
            { level: 'MODERATE', desc: 'Review and counsel before proceeding', bg: '#FFFBEB', border: '#FCD34D', text: '#92400E', badgeBg: null, badge: null },
            { level: 'MAJOR', desc: 'Acknowledge risk to proceed — override logged', bg: '#FFF7ED', border: '#FB923C', text: '#9A3412', badgeBg: '#EA580C', badge: 'Logged override' },
            { level: 'CONTRAINDICATED', desc: 'Acknowledge highest severity to proceed — override logged', bg: '#FEF2F2', border: '#F87171', text: '#991B1B', badgeBg: '#DC2626', badge: 'Logged override' },
          ].map(({ level, desc, bg, border, text, badgeBg, badge }) => (
            <div key={level} style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 12, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: text, margin: '0 0 5px' }}>{level}</p>
                <p style={{ fontSize: 15, fontWeight: 500, color: text, margin: 0 }}>{desc}</p>
              </div>
              {badge && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: badgeBg ?? text, color: 'white', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 12 }}>{badge}</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── ROLES ─────────────────────────────────────────────────────────────────────

function RoleSection() {
  const [tab, setTab] = useState(0);
  const roles = [
    {
      label: 'Owner',
      headline: 'Your whole business, in your pocket.',
      features: ["See today's revenue before your dispenser reports it", "Every sale posted live — nothing adjustable after the fact", 'Live sales and stock across all outlets', 'Compliance status before every deadline', 'Staff access controls without being on site', 'Profitability analytics across your portfolio'],
      stat: { eye: 'OWNER · IN NUMBERS', val: '5 branches.\n1 login.', sub: "Revenue visible to you before anyone closes the till." },
    },
    {
      label: 'Pharmacist-in-Charge',
      headline: 'Stay inspection-ready every day.',
      features: ['Licence & registration tracker', 'Inspection checklist', 'Controlled drugs register', 'Staff credential vault', 'Drug interaction oversight before every sale', 'Clinical override — acknowledged and logged'],
      stat: { eye: 'PHARMACIST-IN-CHARGE · IN NUMBERS', val: '0', sub: 'inspection pack rebuilds — it is always live' },
    },
    {
      label: 'Dispensers',
      headline: 'Fast, guided, impossible to get wrong.',
      features: ['Barcode scan to select and verify instantly', 'FEFO-guided product selection every time', 'Drug interaction check on every dispense', 'Offline-ready during network outages', 'Dispensing receipt generated automatically', 'Anonymous session — no patient data stored'],
      stat: { eye: 'COUNTER TEAM · IN NUMBERS', val: '< 30s', sub: 'from scan to verified dispensing receipt' },
    },
  ];
  const r = roles[tab];
  return (
    <section className="reveal" style={{ background: '#F7FBF8', padding: '88px 32px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <p className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1A6B5C', marginBottom: 12 }}>For every role behind the counter</p>
        <h2 className="serif" style={{ fontSize: 'clamp(32px,4vw,54px)', color: '#0D4035', margin: '0 0 32px', lineHeight: 1.05 }}>
          One platform. Three jobs.<br />Each made simple.
        </h2>
        <div style={{ display: 'flex', gap: 10, marginBottom: 36, flexWrap: 'wrap' }}>
          {roles.map((ro, i) => (
            <button key={ro.label} onClick={() => setTab(i)} style={{
              padding: '10px 22px', borderRadius: 999, fontSize: 14, fontWeight: 500,
              border: `1px solid ${i === tab ? 'transparent' : '#E2EDE8'}`, cursor: 'pointer',
              transition: 'all 150ms', background: i === tab ? '#0D4035' : 'white',
              color: i === tab ? 'white' : '#0D4035',
            }}>
              {ro.label}
            </button>
          ))}
        </div>
        <div className="mob-stack" style={{ background: 'white', border: '1px solid #E2EDE8', borderRadius: 20, padding: 40, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <h3 className="serif" style={{ fontSize: 'clamp(22px,3vw,34px)', color: '#0D4035', margin: '0 0 24px', lineHeight: 1.1 }}>{r.headline}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {r.features.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#516965' }}>
                  <Check />{f}
                </div>
              ))}
            </div>
          </div>
          <div style={{
            borderRadius: 16, overflow: 'hidden', position: 'relative', minHeight: 220,
            background: tab === 0
              ? 'linear-gradient(135deg, #0D4035 0%, #1A6B5C 100%)'
              : tab === 1
              ? 'linear-gradient(135deg, #082B23 0%, #0D4035 100%)'
              : 'linear-gradient(135deg, #145748 0%, #2A9478 100%)',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 28,
          }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(circle, #7ECFB4 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>{r.stat.eye}</p>
              <p className="serif" style={{ fontSize: 42, color: 'white', lineHeight: 1.05, marginBottom: 8, whiteSpace: 'pre-line' }}>{r.stat.val}</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{r.stat.sub}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── PRICING ───────────────────────────────────────────────────────────────────

type CardTier = {
  id: string; name: string; price: number | null;
  quarterlyPrice?: number | null; semiAnnualPrice?: number | null; annualPrice?: number | null;
  isPopular?: boolean; desc?: string; features: string[]; outlets?: number; users?: number;
};

const BILL_CYCLES = {
  monthly: { months: 1, billedLabel: null as string | null },
  quarterly: { months: 3, billedLabel: '/3 months' },
  semiannual: { months: 6, billedLabel: '/6 months' },
  annual: { months: 12, billedLabel: '/year' },
};

function TierCard({ tier, bill, wide }: { tier: CardTier; bill: string; wide?: boolean }) {
  const monthly = tier.price ?? 0;
  const totals: Record<string, number> = {
    monthly,
    quarterly: tier.quarterlyPrice ?? monthly * 3,
    semiannual: tier.semiAnnualPrice ?? Math.round(monthly * 5.5),
    annual: tier.annualPrice ?? monthly * 10,
  };
  const cycle = BILL_CYCLES[bill as keyof typeof BILL_CYCLES] ?? BILL_CYCLES.monthly;
  const total = totals[bill] ?? monthly;
  const price = Math.round(total / cycle.months);
  const popular = tier.isPopular ?? false;
  return (
    <div className="card-stagger" style={{
      border: popular ? '2px solid #1A6B5C' : '1px solid #E2EDE8',
      borderRadius: 16, padding: wide ? 28 : 24, position: 'relative',
      background: popular ? '#EDF7F3' : 'white',
      boxShadow: popular ? '0 8px 30px rgba(26,107,92,0.12)' : 'none',
    }}>
      {popular && <div className="tape" style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', borderRadius: 999, padding: '3px 12px', fontSize: 10, whiteSpace: 'nowrap' }}>Most popular</div>}
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#516965', marginBottom: 8 }}>{tier.name}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
        <p className="serif" style={{ fontSize: 28, color: '#0D4035', lineHeight: 1 }}>{fmt(price)}</p>
        <span style={{ fontSize: 12, color: '#516965' }}>/mo</span>
      </div>
      {cycle.billedLabel && <p style={{ fontSize: 11, color: '#2A9478', marginBottom: 6 }}>Billed Tsh {total.toLocaleString()} {cycle.billedLabel}</p>}
      {tier.outlets ? <p style={{ fontSize: 12, color: '#516965', marginBottom: 6 }}>Includes {tier.outlets > 1 ? `up to ${tier.outlets} outlets` : '1 outlet'} · {tier.users} staff</p> : null}
      <p style={{ fontSize: 12, color: '#516965', lineHeight: 1.65, marginBottom: 18, minHeight: 44 }}>{tier.desc}</p>
      <a href="https://app.apotekh.co.tz/register" style={{
        display: 'block', textAlign: 'center', padding: '13px 16px', borderRadius: 8, marginBottom: 20,
        background: popular ? '#1A6B5C' : 'white',
        border: popular ? 'none' : '2px solid #1A6B5C',
        color: popular ? 'white' : '#1A6B5C',
        fontSize: 14, fontWeight: 700, minHeight: 44,
      }}>Start free trial</a>
      <ul style={{ listStyle: 'none', display: 'grid', gap: 9 }}>
        {tier.features.map(f => <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#0D4035' }}><Check />{f}</li>)}
      </ul>
    </div>
  );
}


function PricingSection() {
  const [bill, setBill] = useState('monthly');
  const [cat, setCat] = useState('retail');
  return (
    <section id="pricing" className="reveal" style={{ background: 'white', padding: '88px 32px', borderTop: '1px solid #E2EDE8' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <p className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1A6B5C', marginBottom: 12 }}>Pricing</p>
        <h2 className="serif" style={{ fontSize: 'clamp(28px,3.5vw,44px)', color: '#0D4035', margin: '0 0 12px', lineHeight: 1.1 }}>Priced for Tanzania&apos;s pharmaceutical reality</h2>
        <p style={{ fontSize: 15, color: '#516965', marginBottom: 28, maxWidth: 500 }}>14-day free trial on every plan. No credit card required.</p>

        <div style={{ display: 'inline-flex', border: '1px solid #E2EDE8', borderRadius: 12, padding: 4, marginBottom: 36, background: '#F7FBF8' }}>
          {([['retail', 'For retail pharmacies'], ['wholesale', 'For Wholesale & Enterprise']] as [string, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setCat(k)} style={{
              padding: '10px 24px', borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: 'pointer',
              transition: 'all 150ms', background: cat === k ? '#0D4035' : 'transparent',
              color: cat === k ? 'white' : '#516965', border: 'none', fontFamily: 'inherit',
            }}>
              {l}
            </button>
          ))}
        </div>

        {cat === 'retail' && (
          <>
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: 'inline-flex', border: '1px solid #E2EDE8', borderRadius: 999, padding: 4, background: '#F7FBF8' }}>
                {([
                  ['monthly', 'Monthly', null],
                  ['quarterly', '3 months', null],
                  ['semiannual', '6 months', 'Save 8%'],
                  ['annual', 'Annual', '2 months free'],
                ] as [string, string, string | null][]).map(([b, label, badge]) => (
                  <button key={b} className={`billing-btn${bill === b ? ' active' : ''}`} onClick={() => setBill(b)}>
                    {label}
                    {badge && <span style={{
                      marginLeft: 8, fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '2px 8px',
                      background: bill === b ? 'rgba(255,255,255,0.2)' : '#EDF7F3',
                      color: bill === b ? 'white' : '#1A6B5C',
                    }}>{badge}</span>}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 20 }}>
              {TIERS.map(tier => <TierCard key={tier.id} tier={tier} bill={bill} />)}
            </div>
          </>
        )}

        {cat === 'wholesale' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, maxWidth: 880, marginBottom: 16 }}>
              <TierCard tier={{ ...WHOLESALE_TIERS[0], desc: WHOLESALE_TIERS[0].tagline }} bill="monthly" wide />
              <div className="card-stagger" style={{ border: '1px solid #0D4035', borderRadius: 16, padding: 28, position: 'relative', background: '#0D4035' }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>ENTERPRISE</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                  <p className="serif" style={{ fontSize: 28, color: 'white', lineHeight: 1 }}>Custom</p>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, marginBottom: 18, minHeight: 44 }}>For 6+ outlet chains, hospital pharmacies, and large distributors. Priced on account size.</p>
                <a href="/contact" style={{ display: 'block', textAlign: 'center', padding: '10px', borderRadius: 8, marginBottom: 20, background: 'white', border: 'none', color: '#0D4035', fontSize: 13, fontWeight: 600 }}>Contact us →</a>
                <ul style={{ listStyle: 'none', display: 'grid', gap: 9 }}>
                  {['All Premium features included', 'Unlimited outlets and users', 'Custom analytics and reporting', 'Dedicated onboarding and support', 'SLA-backed uptime guarantee', 'Negotiated pricing'].map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                        <circle cx="7" cy="7" r="7" fill="rgba(255,255,255,0.15)" />
                        <path d="M4 7l2 2 4-4" stroke="#7ECFB4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#516965' }}>
              Looking for retail pharmacy plans? <button onClick={() => setCat('retail')} style={{ background: 'none', border: 'none', color: '#1A6B5C', fontWeight: 600, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>See retail plans →</button>
            </p>
          </>
        )}
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

function FAQ() {
  const [open, setOpen] = useState<Set<number>>(new Set([0, 1]));
  const toggle = (i: number) =>
    setOpen((prev) => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });
  return (
    <section id="faq" className="reveal" style={{ background: '#F7FBF8', padding: '88px 32px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <h2 className="serif" style={{ fontSize: 'clamp(28px,3.5vw,44px)', color: '#0D4035', margin: '0 0 40px', lineHeight: 1.1 }}>Common questions</h2>
        {FAQS.map((f, i) => (
          <div key={i} className="faq-item">
            <button className="faq-btn" onClick={() => toggle(i)}>
              <span>{f.q}</span>
              <span style={{ color: '#1A6B5C', fontSize: 20, transform: open.has(i) ? 'rotate(45deg)' : 'none', transition: 'transform 200ms', flexShrink: 0, lineHeight: 1 }}>+</span>
            </button>
            {open.has(i) && <p style={{ fontSize: 14, lineHeight: 1.85, color: '#516965', paddingBottom: 20 }}>{f.a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── FINAL CTA ─────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="reveal" style={{ background: '#0D4035', padding: '96px 32px', color: 'white' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <p className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7ECFB4', marginBottom: 16 }}>Start today</p>
        <h2 className="serif" style={{ fontSize: 'clamp(32px,5vw,52px)', color: 'white', margin: '0 0 20px', lineHeight: 1.05 }}>
          Tanzania&apos;s pharmacies<br />deserve better tools.
        </h2>
        <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.65)', maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.7 }}>
          14-day free trial on every plan. No credit card. No setup fee.<br />Your pharmacy running on APOTEKH in minutes.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="https://app.apotekh.co.tz/register" className="cta-primary" style={{ background: 'white', color: '#0D4035', padding: '15px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.25)', fontSize: 15 }}>
            Start free trial — 14 days free
          </a>
          <a href="/demo" className="cta-outline" style={{ padding: '14px 36px', borderColor: 'rgba(255,255,255,0.55)', color: 'rgba(255,255,255,0.9)' }}>
            Book a demo →
          </a>
        </div>
        <p style={{ marginTop: 24, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
          Wholesale or Enterprise? <a href="mailto:support@apotekh.co.tz?subject=Wholesale%20inquiry" style={{ color: '#7ECFB4', fontWeight: 600 }}>Contact us directly →</a>
        </p>
        <p style={{ marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.28)' }}>
          support@apotekh.co.tz &nbsp;·&nbsp; Tanzania, East Africa
        </p>
      </div>
    </section>
  );
}

// ── PAGE ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<Element>('.reveal'));
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }),
      { threshold: 0, rootMargin: '0px 0px 120px 0px' },
    );
    els.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 120) {
        el.classList.add('in');
      } else {
        io.observe(el);
      }
    });
    return () => io.disconnect();
  }, []);

  return (
    <div style={{ overflowX: 'hidden' }}>
      <Hero />
      <Marquee />
      <ProofStrip />
      <HowItWorks />
      <FeatureTabs />
      <DashboardScreens />
      <OwnerRevenue />
      <SafetyChecks />
      <RoleSection />
      <PricingSection />
      <FAQ />
      <FinalCTA />
    </div>
  );
}
