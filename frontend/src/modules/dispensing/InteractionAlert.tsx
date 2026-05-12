import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { SafetyAlert } from './types';

const severityTone: Record<string, { badge: 'danger' | 'warning' | 'info'; border: string; icon: string }> = {
  CONTRAINDICATED: {
    badge: 'danger',
    border: 'border-[#FECACA] bg-[#FEF2F2]',
    icon: 'text-[#DC2626]',
  },
  MAJOR: {
    badge: 'warning',
    border: 'border-[#FDE68A] bg-[#FFFBEB]',
    icon: 'text-[#D97706]',
  },
  MODERATE: {
    badge: 'warning',
    border: 'border-[#FDE68A] bg-[#FFFBEB]',
    icon: 'text-[#D97706]',
  },
  MINOR: {
    badge: 'info',
    border: 'border-[#BFDBFE] bg-[#EFF6FF]',
    icon: 'text-[#2563EB]',
  },
  INFO: {
    badge: 'info',
    border: 'border-[#BFDBFE] bg-[#EFF6FF]',
    icon: 'text-[#2563EB]',
  },
};

export const InteractionAlert: React.FC<{
  title: string;
  alerts: SafetyAlert[];
  emptyMessage?: string;
}> = ({ title, alerts, emptyMessage }) => {
  if (alerts.length === 0) {
    return emptyMessage ? (
      <div className="rounded-2xl border border-dashed border-[#D6F0E8] bg-[#F8FAFC] px-4 py-5 text-sm text-[#64748B]">
        {emptyMessage}
      </div>
    ) : null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert size={16} className="text-[#0D4035]" />
        <h3 className="text-sm font-semibold text-[#0D4035]">{title}</h3>
      </div>

      {alerts.map((alert) => {
        const tone = severityTone[alert.severity] ?? severityTone.MINOR;
        return (
          <div key={alert.id} className={`rounded-2xl border px-4 py-3 ${tone.border}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0D4035]">
                  {alert.drug ? alert.drug : `${alert.drugA} + ${alert.drugB}`}
                </p>
                <p className="mt-1 text-xs text-[#475569]">
                  {alert.message || alert.effectSummary}
                </p>
                {alert.management && (
                  <p className="mt-2 text-xs text-[#0D4035]">
                    Management: {alert.management}
                  </p>
                )}
                {(alert.sourceTitle || alert.sourceSection) && (
                  <p className="mt-2 text-[11px] text-[#64748B]">
                    Source:{' '}
                    {alert.sourceUrl ? (
                      <a
                        href={alert.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[#1A6B5C] underline underline-offset-2"
                      >
                        {alert.sourceTitle || 'Reference'}
                      </a>
                    ) : (
                      <span className="font-medium text-[#1A6B5C]">
                        {alert.sourceTitle || 'Reference'}
                      </span>
                    )}
                    {alert.sourceSection ? ` • ${alert.sourceSection}` : ''}
                  </p>
                )}
                {alert.requiresPicPin && (
                  <p className="mt-2 text-xs font-semibold text-[#B45309]">
                    PIC PIN override required before dispensing.
                  </p>
                )}
              </div>
              <div className="shrink-0 space-y-2 text-right">
                <Badge variant={tone.badge} size="sm">
                  {alert.severity}
                </Badge>
                {alert.requiresPicPin && (
                  <div className="flex items-center justify-end gap-1 text-[11px] font-medium text-[#B45309]">
                    <AlertTriangle size={12} className={tone.icon} />
                    Override
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
