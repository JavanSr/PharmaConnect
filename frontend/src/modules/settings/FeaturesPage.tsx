import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';
import { SettingsNav } from './SettingsNav';

const FEATURES_CONFIG_KEY = 'features_config';

// ── schema definition ────────────────────────────────────────────────────────

type SubFeature = {
  key: string;
  label: string;
  description: string;
  /** Roles that CAN use this subfeature. Owners/PIC/SUPER_ADMIN always have access. */
  grantableRoles: Array<'DISPENSER' | 'CASHIER'>;
};

type ModuleDefinition = {
  key: string;
  label: string;
  description: string;
  subs?: SubFeature[];
};

const MODULES: ModuleDefinition[] = [
  {
    key: 'dispensing',
    label: 'Dispensing',
    description: 'Point-of-sale dispensing workflow, sale history, and daily close.',
    subs: [
      { key: 'dispensing.discounts', label: 'Apply discounts', description: 'Allow staff to apply discounts at point of sale.', grantableRoles: ['DISPENSER', 'CASHIER'] },
      { key: 'dispensing.voids', label: 'Void sales', description: 'Allow staff to void completed sales.', grantableRoles: ['DISPENSER'] },
      { key: 'dispensing.returns', label: 'Process returns', description: 'Allow staff to process returned medicines.', grantableRoles: ['DISPENSER', 'CASHIER'] },
    ],
  },
  {
    key: 'patient_safety',
    label: 'Patient Safety',
    description: 'Drug interaction checks, contraindication alerts, dosage guidance, NCD hints.',
    subs: [
      { key: 'patient_safety.override', label: 'PIC override', description: 'Allow PIC-level staff to override major alerts with a PIN.', grantableRoles: [] },
    ],
  },
  {
    key: 'inventory',
    label: 'Inventory',
    description: 'Stock management, batch tracking, expiry monitoring.',
    subs: [
      { key: 'inventory.receive_stock', label: 'Receive stock', description: 'Allow staff to add incoming batches.', grantableRoles: ['DISPENSER'] },
      { key: 'inventory.adjust_stock', label: 'Adjust stock', description: 'Allow staff to submit stock adjustment requests.', grantableRoles: ['DISPENSER'] },
    ],
  },
  {
    key: 'compliance',
    label: 'Compliance',
    description: 'Regulatory item tracking, inspection checklists, staff credentials.',
    subs: [
      { key: 'compliance.manage', label: 'Add/edit compliance items', description: 'Allow staff to create or update compliance records.', grantableRoles: ['DISPENSER'] },
    ],
  },
  {
    key: 'analytics',
    label: 'Analytics',
    description: 'Inventory movements, compliance score, expiry risk, forecasting.',
    subs: [
      { key: 'analytics.view', label: 'View analytics', description: 'Allow dispensers and cashiers to see the analytics dashboard.', grantableRoles: ['DISPENSER', 'CASHIER'] },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    description: 'Financial reports, sales summaries, and staff activity.',
    subs: [
      { key: 'reports.financial', label: 'Financial reports', description: 'Allow cashiers to access revenue and financial summaries.', grantableRoles: ['CASHIER'] },
    ],
  },
  {
    key: 'knowledge',
    label: 'Knowledge Hub',
    description: 'Clinical articles, bulletins, and TMDA updates.',
    subs: [],
  },
  {
    key: 'wholesale',
    label: 'Wholesale',
    description: 'B2B catalogue, order management, and delivery workflow.',
    subs: [],
  },
  {
    key: 'controlled_register',
    label: 'Controlled Drugs Register',
    description: 'Schedule I–IV dispensing log and balance audit trail.',
    subs: [],
  },
];

// ── config types ─────────────────────────────────────────────────────────────

type FeaturesConfig = {
  modules: Record<string, boolean>;
  subs: Record<string, boolean>; // true = all grantable roles can use it; false = PIC/Owner only
};

function defaultConfig(): FeaturesConfig {
  const modules: Record<string, boolean> = {};
  const subs: Record<string, boolean> = {};
  for (const m of MODULES) {
    modules[m.key] = true;
    for (const s of m.subs ?? []) {
      subs[s.key] = true;
    }
  }
  return { modules, subs };
}

function parseConfig(raw: unknown): FeaturesConfig {
  const defaults = defaultConfig();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
  const r = raw as Record<string, unknown>;
  return {
    modules: { ...defaults.modules, ...(typeof r.modules === 'object' && r.modules ? r.modules as Record<string, boolean> : {}) },
    subs: { ...defaults.subs, ...(typeof r.subs === 'object' && r.subs ? r.subs as Record<string, boolean> : {}) },
  };
}

// ── component ────────────────────────────────────────────────────────────────

export const FeaturesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useNotificationStore(s => s.toast);
  const [draft, setDraft] = React.useState<FeaturesConfig>(defaultConfig);
  const [dirty, setDirty] = React.useState(false);
  const [expandedModules, setExpandedModules] = React.useState<Set<string>>(new Set());

  const configQuery = useQuery({
    queryKey: ['settings-config', FEATURES_CONFIG_KEY],
    queryFn: () => api.get(`/settings/config/${FEATURES_CONFIG_KEY}`).then(r => r.data),
  });

  React.useEffect(() => {
    if (dirty || !configQuery.data?.data?.value) return;
    setDraft(parseConfig(configQuery.data.data.value));
  }, [configQuery.data, dirty]);

  const saveMutation = useMutation({
    mutationFn: () => api.put(`/settings/config/${FEATURES_CONFIG_KEY}`, { value: draft }).then(r => r.data),
    onSuccess: (data) => {
      setDirty(false);
      queryClient.setQueryData(['settings-config', FEATURES_CONFIG_KEY], data);
      toast.success('Feature settings saved');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Could not save feature settings'),
  });

  const toggleModule = (key: string) => {
    setDirty(true);
    setDraft(prev => ({ ...prev, modules: { ...prev.modules, [key]: !prev.modules[key] } }));
  };

  const toggleSub = (key: string) => {
    setDirty(true);
    setDraft(prev => ({ ...prev, subs: { ...prev.subs, [key]: !prev.subs[key] } }));
  };

  const toggleExpanded = (key: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="space-y-3">
        <h1 className="text-xl font-bold text-[#0D4035]">Features</h1>
        <SettingsNav />
        <p className="text-sm text-[#64748B]">
          Enable or disable modules for your pharmacy. Expand a module to control which staff roles can access specific sub-features.
          Owners and PIC always retain full access regardless of these settings.
        </p>
      </div>

      <div className="space-y-3">
        {MODULES.map(module => {
          const isOn = draft.modules[module.key] ?? true;
          const isExpanded = expandedModules.has(module.key);
          const hasSubs = (module.subs?.length ?? 0) > 0;

          return (
            <Card key={module.key} padding={false}>
              {/* Module header row */}
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-[#0D4035]">{module.label}</p>
                    {!isOn && <Badge variant="muted" size="sm">Disabled</Badge>}
                  </div>
                  <p className="text-xs text-[#64748B] mt-0.5">{module.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {hasSubs && isOn && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(module.key)}
                      className="p-1.5 text-[#64748B] hover:text-[#0D4035] hover:bg-[#EDF7F3] rounded-lg transition-colors"
                      aria-label={isExpanded ? 'Collapse' : 'Expand sub-features'}
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleModule(module.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                      isOn ? 'bg-[#1A6B5C]' : 'bg-[#CBD5E1]'
                    }`}
                    role="switch"
                    aria-checked={isOn}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${isOn ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* Sub-features */}
              {hasSubs && isOn && isExpanded && (
                <div className="border-t border-[#D6F0E8] bg-[#F8FCFA] divide-y divide-[#D6F0E8]">
                  <div className="px-5 py-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Sub-features</span>
                    <span className="text-[11px] text-[#64748B]">ON = staff can use · OFF = owner/PIC only</span>
                  </div>
                  {module.subs!.map(sub => {
                    const subOn = draft.subs[sub.key] ?? true;
                    return (
                      <div key={sub.key} className="flex items-center gap-3 px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#0D4035]">{sub.label}</p>
                          <p className="text-xs text-[#64748B] mt-0.5">{sub.description}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {sub.grantableRoles.map(role => (
                              <span key={role} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${subOn ? 'bg-[#D6F0E8] text-[#1A6B5C]' : 'bg-[#F1F5F9] text-[#94A3B8] line-through'}`}>
                                {role.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleSub(sub.key)}
                          className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                            subOn ? 'bg-[#1A6B5C]' : 'bg-[#CBD5E1]'
                          }`}
                          role="switch"
                          aria-checked={subOn}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${subOn ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1">
        {dirty ? <Badge variant="warning" size="sm">Unsaved changes</Badge> : <span />}
        <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!dirty}>
          Save changes
        </Button>
      </div>
    </div>
  );
};
