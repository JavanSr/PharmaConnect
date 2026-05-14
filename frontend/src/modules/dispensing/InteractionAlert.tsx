import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { SafetyAlert } from './types';

const HIGH_SEVERITY = new Set(['CONTRAINDICATED', 'MAJOR']);

export const InteractionAlert: React.FC<{
  title: string;
  alerts: SafetyAlert[];
  emptyMessage?: string;
}> = ({ title, alerts, emptyMessage }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const visibleAlerts = alerts.filter((a) => HIGH_SEVERITY.has(a.severity?.toUpperCase() ?? ''));

  if (visibleAlerts.length === 0) {
    return emptyMessage ? (
      <div className="rounded-2xl border border-dashed border-[#D6F0E8] bg-[#F8FAFC] px-4 py-5 text-sm text-[#64748B]">
        {emptyMessage}
      </div>
    ) : null;
  }

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => {
        const isContraindicated = alert.severity?.toUpperCase() === 'CONTRAINDICATED';
        const isOpen = expanded.has(alert.id);
        const drugLabel = alert.drug
          ? alert.drug
          : [alert.drugA, alert.drugB].filter(Boolean).join(' + ');
        const summary = alert.message || alert.effectSummary || '';

        if (isContraindicated) {
          return (
            <div key={alert.id} className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#DC2626]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#991B1B]">{drugLabel}</p>
                    <Badge variant="danger" size="sm">CONTRAINDICATED</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[#7F1D1D]">{summary}</p>
                  {alert.management && (
                    <p className="mt-1 text-xs text-[#991B1B]">{alert.management}</p>
                  )}
                  {alert.requiresPicPin && (
                    <p className="mt-2 text-xs font-semibold text-[#B91C1C]">
                      Requires PIC PIN to proceed.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        }

        return (
          <div key={alert.id} className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB]">
            <button
              type="button"
              className="flex w-full items-start gap-2 px-4 py-3 text-left"
              onClick={() => toggle(alert.id)}
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#D97706]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#92400E]">{drugLabel}</span>
                  <Badge variant="warning" size="sm">MAJOR</Badge>
                </div>
                <p className="mt-0.5 text-xs text-[#78350F]">{summary}</p>
              </div>
              <span className="shrink-0 text-[#D97706]">
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>
            {isOpen && (
              <div className="border-t border-[#FDE68A] px-4 pb-3 pt-2">
                {alert.management && (
                  <p className="text-xs text-[#92400E]">{alert.management}</p>
                )}
                {(alert.sourceTitle || alert.sourceSection) && (
                  <p className="mt-1.5 text-[11px] text-[#A16207]">
                    {alert.sourceUrl ? (
                      <a
                        href={alert.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2"
                      >
                        {alert.sourceTitle}
                      </a>
                    ) : (
                      alert.sourceTitle
                    )}
                    {alert.sourceSection ? ` · ${alert.sourceSection}` : ''}
                  </p>
                )}
                {alert.requiresPicPin && (
                  <p className="mt-1.5 text-xs font-semibold text-[#B45309]">
                    Requires PIC PIN to proceed.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
