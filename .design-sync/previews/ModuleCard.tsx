import React from 'react';
import { ModuleCard } from 'pharmaconnect-website';
import type { Module } from '@/lib/data/modules';

const DASHBOARD: Module = {
  id: 'M01', slug: 'dashboard', name: 'Dashboard', available: true, icon: 'LayoutDashboard',
  description: 'A live operating view that keeps pharmacy teams aligned on sales, compliance, and daily priorities.',
  features: ['Daily workload cards', 'Branch-level status updates', 'Mobile-ready layouts'],
  howItWorks: '', acceptanceCriteria: [], relatedModules: [],
};

const INVENTORY: Module = {
  id: 'M03', slug: 'inventory', name: 'Inventory', available: true, icon: 'Package',
  description: 'Batch-aware stock control that keeps expiry, FEFO, and pharmacy availability tightly managed.',
  features: ['Batch and expiry tracking', 'FEFO prompts', 'Low-stock alerts'],
  howItWorks: '', acceptanceCriteria: [], relatedModules: [],
};

const DISPENSING: Module = {
  id: 'M06', slug: 'dispensing', name: 'Dispensing', available: true, icon: 'Pill',
  description: 'A pharmacy-first workflow that connects product selection, safety checks, and transaction completion.',
  features: ['Drug interaction checks', 'FEFO guidance', 'Payment capture'],
  howItWorks: '', acceptanceCriteria: [], relatedModules: [],
};

const CPD: Module = {
  id: 'M07', slug: 'cpd-tracker', name: 'CPD Tracker', available: false, icon: 'GraduationCap',
  description: 'Professional learning records that connect staff growth with compliance and daily practice.',
  features: ['CPD activity recording', 'Completion status', 'Certificate management'],
  howItWorks: '', acceptanceCriteria: [], relatedModules: [],
};

export function FullCards() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '24px', background: '#F7FAF9' }}>
      <ModuleCard module={DASHBOARD} />
      <ModuleCard module={INVENTORY} />
      <ModuleCard module={CPD} />
    </div>
  );
}

export function MiniCards() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', padding: '24px', background: '#F7FAF9', maxWidth: '560px' }}>
      <ModuleCard module={DASHBOARD} mini />
      <ModuleCard module={INVENTORY} mini />
      <ModuleCard module={DISPENSING} mini />
      <ModuleCard module={CPD} mini />
    </div>
  );
}
