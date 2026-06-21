import React from 'react';
import { PricingCard } from 'pharmaconnect-website';
import type { Tier } from '@/lib/data/pricing';

const STANDARD: Tier = {
  id: 'standard', name: 'Standard', price: 55_000, annualPrice: 550_000,
  currency: 'Tsh', period: 'month', trialDays: 14, isPopular: true,
  cta: 'Start 14-day trial',
  features: [
    'Up to 3 outlets · 10 users · 14-day trial',
    'Accounting module · customer purchase history & loyalty',
    'Multi-shop consolidated reporting',
    'Patient Ordering Portal (optional, customer-facing)',
    'Basic marketing campaigns',
    'Knowledge Hub full access',
  ],
};

const PREMIUM: Tier = {
  id: 'premium', name: 'Premium', price: 75_000, annualPrice: 750_000,
  currency: 'Tsh', period: 'month', trialDays: 14, isPopular: false,
  cta: 'Start 14-day trial',
  features: [
    'Up to 5 outlets · 20 users · 14-day trial',
    'Predictive low-stock alerts (7–14 days) · demand forecasting',
    'Seasonal demand patterns · dead stock risk scoring',
    'Revenue trend projection · peak hour analysis',
    'Peer benchmarking (anonymized, opt-in)',
    'Full Knowledge Hub including courses',
  ],
};

const ADDO: Tier = {
  id: 'addo', name: 'ADDO', price: 15_000, annualPrice: 150_000,
  currency: 'Tsh', period: 'month', trialDays: 14, isPopular: false,
  cta: 'Start 14-day trial',
  features: [
    '1 outlet · 3 users · 14-day trial',
    'FEFO inventory · expiry alerts · bulk Excel import',
    'Basic POS & dispensing · customer database',
    'DLDM compliance tracker · document storage',
    'Full Clinical Decision Support Suite',
  ],
};

export function PopularCard() {
  return (
    <div style={{ padding: '32px', background: '#F7FAF9', maxWidth: '360px' }}>
      <PricingCard tier={STANDARD} billing="monthly" />
    </div>
  );
}

export function AnnualBilling() {
  return (
    <div style={{ padding: '32px', background: '#F7FAF9', maxWidth: '360px' }}>
      <PricingCard tier={STANDARD} billing="annual" />
    </div>
  );
}

export function TierComparison() {
  return (
    <div style={{ display: 'flex', gap: '20px', padding: '32px', background: '#F7FAF9', overflowX: 'auto' }}>
      <PricingCard tier={ADDO} billing="monthly" />
      <PricingCard tier={STANDARD} billing="monthly" />
      <PricingCard tier={PREMIUM} billing="monthly" />
    </div>
  );
}
