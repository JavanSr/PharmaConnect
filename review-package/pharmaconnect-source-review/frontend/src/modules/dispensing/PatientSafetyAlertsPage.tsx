import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

type OverrideLogEntry = {
  id: string;
  alertType: string;
  reason: string;
  createdAt: string;
  user: { firstName: string; lastName: string; role: string };
  picUser: { firstName: string; lastName: string };
};

function alertTypeVariant(t: string): 'danger' | 'warning' | 'info' {
  if (t.includes('MAJOR') || t.includes('CONTRAINDIC')) return 'danger';
  if (t.includes('MODERATE') || t.includes('INTERACT')) return 'warning';
  return 'info';
}

export const PatientSafetyAlertsPage: React.FC = () => {
  const [page, setPage] = React.useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['patient-safety-override-log', page],
    queryFn: () => api.get('/patient-safety/override-log', { params: { page, limit: 30 } }).then(r => r.data),
    staleTime: 30_000,
  });

  const logs: OverrideLogEntry[] = data?.data ?? [];
  const totalPages: number = data?.totalPages ?? 1;

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-[#0D4035]">Safety Alert History</h1>
        <p className="text-sm text-[#64748B] mt-1">
          All PIC-override events for this pharmacy. Every override is an immutable record.
        </p>
      </div>

      <Card padding={false}>
        {isLoading && (
          <div className="px-5 py-8 text-sm text-[#64748B]">Loading alert history…</div>
        )}
        {isError && (
          <div className="px-5 py-8 text-sm text-[#DC2626]">Could not load alert history.</div>
        )}
        {!isLoading && !isError && logs.length === 0 && (
          <div className="px-5 py-10 text-center">
            <ShieldAlert size={32} className="text-[#D6F0E8] mx-auto mb-3" />
            <p className="text-sm text-[#64748B]">No PIC overrides recorded for this pharmacy yet.</p>
          </div>
        )}
        {logs.length > 0 && (
          <div className="divide-y divide-[#D6F0E8]">
            {logs.map(entry => (
              <div key={entry.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant={alertTypeVariant(entry.alertType)} size="sm">{entry.alertType}</Badge>
                      <span className="text-xs text-[#64748B]">
                        {new Date(entry.createdAt).toLocaleString('en-TZ', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p className="text-sm text-[#0D4035] leading-snug">{entry.reason}</p>
                    <p className="text-xs text-[#64748B] mt-1.5">
                      Dispenser: {entry.user.firstName} {entry.user.lastName} ({entry.user.role.replace(/_/g, ' ')})
                      {' · '}
                      PIC: {entry.picUser.firstName} {entry.picUser.lastName}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-[#64748B]">Page {page} of {totalPages}</span>
          <Button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
};

const Button: React.FC<{ disabled?: boolean; onClick?: () => void; children: React.ReactNode }> = ({ disabled, onClick, children }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="px-4 py-2 rounded-xl border border-[#D6F0E8] text-sm font-medium text-[#0D4035] hover:bg-[#EDF7F3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
    {children}
  </button>
);
