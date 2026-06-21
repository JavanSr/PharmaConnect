import React from 'react';
import { StatCard } from 'pharmaconnect-website';

export function KeyMetrics() {
  return (
    <div style={{ background: '#0D4035', padding: '40px 32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <StatCard value={120} label="Pharmacies running APOTEKH across Tanzania" suffix="+" />
        <StatCard value={47000} label="Prescriptions dispensed with safety checks" suffix="+" />
        <StatCard value={99} label="Platform uptime over the past 12 months" suffix="%" />
      </div>
    </div>
  );
}

export function SingleCard() {
  return (
    <div style={{ background: '#0D4035', padding: '32px', maxWidth: '280px' }}>
      <StatCard value={14} label="Days free trial — no card required" suffix="-day" />
    </div>
  );
}
