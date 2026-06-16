import React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bell, Mail, Smartphone } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useNotificationStore } from '@/stores/notificationStore';
import { api } from '@/lib/api';
import { SettingsNav } from './SettingsNav';

const ALERT_TYPES = [
  {
    key: 'EXPIRY_ALERT',
    label: 'Expiry alerts',
    description: 'When medicines are approaching or past their expiry date',
    icon: '💊',
  },
  {
    key: 'LOW_STOCK',
    label: 'Low stock alerts',
    description: 'When a product falls below its reorder threshold',
    icon: '📦',
  },
  {
    key: 'COMPLIANCE_ALERT',
    label: 'Compliance deadlines',
    description: 'Upcoming licence renewals and regulatory deadlines',
    icon: '📋',
  },
  {
    key: 'OVERRIDE_LOG',
    label: 'Clinical override logged',
    description: 'When a dispenser proceeds past a high-risk safety alert',
    icon: '⚠️',
  },
  {
    key: 'SUBSCRIPTION_ACTIVATED',
    label: 'Payment confirmed',
    description: 'When a subscription payment is processed successfully',
    icon: '✅',
  },
  {
    key: 'TRIAL_EXPIRY',
    label: 'Trial ending',
    description: 'Reminder before your free trial expires',
    icon: '⏳',
  },
  {
    key: 'SUPPLIER_PORTAL_RESPONSE',
    label: 'Supplier order responses',
    description: 'When a supplier confirms or rejects a stock order',
    icon: '🚚',
  },
] as const;

type AlertType = typeof ALERT_TYPES[number]['key'];

type Pref = {
  inAppEnabled: boolean;
  emailEnabled: boolean;
};

export const NotificationsSettingsPage: React.FC = () => {
  const toast = useNotificationStore(s => s.toast);
  const [prefs, setPrefs] = React.useState<Partial<Record<AlertType, Pref>>>({});
  const [saving, setSaving] = React.useState<string | null>(null);

  // Load all preferences in parallel
  const queries = ALERT_TYPES.map(a =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ['notif-pref', a.key],
      queryFn: () =>
        api.get(`/notifications/preferences/${a.key}`).then(r => r.data.data),
      select: (d: any) => ({
        inAppEnabled: d?.inAppEnabled ?? true,
        emailEnabled: d?.emailEnabled ?? true,
      }),
    })
  );

  React.useEffect(() => {
    const loaded: Partial<Record<AlertType, Pref>> = {};
    ALERT_TYPES.forEach((a, i) => {
      if (queries[i].data) {
        loaded[a.key] = queries[i].data as Pref;
      }
    });
    setPrefs(loaded);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries.map(q => q.dataUpdatedAt).join(',')]);

  const updatePref = async (alertType: AlertType, field: 'inAppEnabled' | 'emailEnabled', value: boolean) => {
    setSaving(alertType);
    const current = prefs[alertType] ?? { inAppEnabled: true, emailEnabled: true };
    const next = { ...current, [field]: value };
    try {
      await api.put(`/notifications/preferences/${alertType}`, next);
      setPrefs(p => ({ ...p, [alertType]: next }));
      toast.success('Preference saved');
    } catch {
      toast.error('Failed to save preference');
    } finally {
      setSaving(null);
    }
  };

  const allLoading = queries.every(q => q.isLoading);

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-bold text-[#0D4035]">Notification Preferences</h1>
      <SettingsNav />

      <div className="flex items-center gap-2 rounded-xl bg-[#EDF7F3] border border-[#D6F0E8] px-4 py-3 text-sm text-[#1A6B5C]">
        <Bell size={15} />
        <span>In-app notifications are always delivered. Email can be turned off per type.</span>
      </div>

      <Card padding={false}>
        {/* Header row */}
        <div className="flex items-center justify-end gap-6 px-5 py-3 border-b border-[#D6F0E8]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] w-20 justify-center">
            <Smartphone size={13} /> In-app
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] w-20 justify-center">
            <Mail size={13} /> Email
          </div>
        </div>

        <div className="divide-y divide-[#D6F0E8]">
          {ALERT_TYPES.map(a => {
            const pref = prefs[a.key] ?? { inAppEnabled: true, emailEnabled: true };
            const isSaving = saving === a.key;

            return (
              <div key={a.key} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0D4035] flex items-center gap-2">
                    <span>{a.icon}</span>
                    {a.label}
                  </p>
                  <p className="text-xs text-[#64748B] mt-0.5">{a.description}</p>
                </div>

                {/* In-app toggle — always on, greyed out */}
                <div className="w-20 flex justify-center">
                  <div className="w-9 h-5 rounded-full bg-[#1A6B5C] opacity-40 cursor-not-allowed relative">
                    <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
                  </div>
                </div>

                {/* Email toggle */}
                <div className="w-20 flex justify-center">
                  <button
                    type="button"
                    disabled={isSaving || allLoading}
                    onClick={() => updatePref(a.key, 'emailEnabled', !pref.emailEnabled)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      pref.emailEnabled ? 'bg-[#1A6B5C]' : 'bg-[#CBD5E1]'
                    } ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
                    aria-label={`${pref.emailEnabled ? 'Disable' : 'Enable'} email for ${a.label}`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                        pref.emailEnabled ? 'left-4' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
