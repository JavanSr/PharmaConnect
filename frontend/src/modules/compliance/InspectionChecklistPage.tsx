import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, MinusCircle, ClipboardList, Plus, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAuthStore } from '@/stores/authStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { api } from '@/lib/api';

type ItemStatus = 'PENDING' | 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_APPLICABLE';

interface ChecklistItem {
  category: string;
  item: string;
  status: ItemStatus;
  notes: string | null;
}

const STATUS_META: Record<ItemStatus, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:        { label: 'Pending',         color: 'text-[#64748B] bg-[#EDF7F3]',           icon: <MinusCircle size={16} className="text-[#64748B]" /> },
  COMPLIANT:      { label: 'Compliant',       color: 'text-[#1A6B5C] bg-[#D6F0E8]',           icon: <CheckCircle size={16} className="text-[#1A6B5C]" /> },
  NON_COMPLIANT:  { label: 'Non-Compliant',   color: 'text-[#DC2626] bg-[#FEE2E2]',           icon: <XCircle size={16} className="text-[#DC2626]" /> },
  NOT_APPLICABLE: { label: 'Not Applicable',  color: 'text-[#64748B] bg-gray-100',            icon: <MinusCircle size={16} className="text-[#64748B]" /> },
};

const STATUS_CYCLE: ItemStatus[] = ['PENDING', 'COMPLIANT', 'NON_COMPLIANT', 'NOT_APPLICABLE'];

export const InspectionChecklistPage: React.FC = () => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<{ idx: number; text: string } | null>(null);
  const toast = useNotificationStore(s => s.toast);
  const user = useAuthStore(s => s.user);
  const pharmacy = usePharmacyStore(s => s.pharmacy);
  const qc = useQueryClient();

  const canGenerate = ['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'].includes(user?.role ?? '');

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['inspection-checklists'],
    queryFn: () => api.get('/compliance/inspection-checklists').then(r => r.data),
  });

  const { data: checklistData, isLoading: clLoading } = useQuery({
    queryKey: ['inspection-checklist', activeId],
    queryFn: () => api.get(`/compliance/inspection-checklists/${activeId}`).then(r => r.data),
    enabled: !!activeId,
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post('/compliance/inspection-checklists'),
    onSuccess: (res) => {
      toast.success('New inspection checklist generated');
      qc.invalidateQueries({ queryKey: ['inspection-checklists'] });
      setActiveId(res.data.data.id);
    },
    onError: () => toast.error('Failed to generate checklist'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemIndex, status, notes }: { itemIndex: number; status: string; notes?: string }) =>
      api.put(`/compliance/inspection-checklists/${activeId}/items`, { itemIndex, status, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspection-checklist', activeId] });
    },
    onError: () => toast.error('Failed to update item'),
  });

  const checklists = listData?.data ?? [];
  const checklist = checklistData?.data;
  const items: ChecklistItem[] = checklist?.items ?? [];
  const pharmacyName = pharmacy?.name ?? 'PharmaConnect Pharmacy';

  // Group items by category
  const grouped = items.reduce<Record<string, { item: ChecklistItem; idx: number }[]>>((acc, item, idx) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push({ item, idx });
    return acc;
  }, {});

  // Score
  const compliant = items.filter(i => i.status === 'COMPLIANT').length;
  const applicable = items.filter(i => i.status !== 'NOT_APPLICABLE').length;
  const scorePercent = applicable > 0 ? Math.round((compliant / applicable) * 100) : 0;

  const cycleStatus = (idx: number, current: ItemStatus) => {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
    if (next === 'NON_COMPLIANT') {
      // Prompt for notes
      setEditingNote({ idx, text: items[idx].notes ?? '' });
    } else {
      updateMutation.mutate({ itemIndex: idx, status: next });
    }
  };

  const saveNote = () => {
    if (!editingNote) return;
    updateMutation.mutate({
      itemIndex: editingNote.idx,
      status: 'NON_COMPLIANT',
      notes: editingNote.text,
    });
    setEditingNote(null);
  };

  return (
    <div className="inspection-print-page space-y-5">
      <style>
        {`
          @media print {
            html,
            body,
            #root {
              height: auto !important;
              overflow: visible !important;
              background: #ffffff !important;
            }

            .inspection-print-page {
              display: block !important;
              height: auto !important;
              overflow: visible !important;
              background: #ffffff !important;
            }

            nav, aside, header, .no-print {
              display: none !important;
            }

            body {
              font-size: 12px;
            }

            .inspection-print-card {
              break-inside: avoid;
            }

            .inspection-print-title {
              display: block !important;
            }

            @page {
              margin: 20mm;
            }
          }
        `}
      </style>

      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <h1 className="text-xl font-bold text-[#0D4035]">TMDA Inspection Checklist</h1>
        {canGenerate && (
          <Button leftIcon={<Plus size={16} />} onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>
            New Checklist
          </Button>
        )}
      </div>

      {/* Checklist selector */}
      {checklists.length > 0 && (
        <div className="flex gap-2 flex-wrap no-print">
          {checklists.slice(0, 5).map((cl: any) => (
            <button
              key={cl.id}
              onClick={() => setActiveId(cl.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                activeId === cl.id
                  ? 'bg-[#1A6B5C] text-white border-[#1A6B5C]'
                  : 'bg-white text-[#64748B] border-[#D6F0E8] hover:bg-[#EDF7F3]'
              }`}
            >
              {format(new Date(cl.generatedAt), 'dd MMM yyyy')}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!listLoading && checklists.length === 0 && (
        <Card>
          <div className="py-12 text-center">
            <ClipboardList size={48} className="text-[#D6F0E8] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#0D4035] mb-1">No checklists yet</p>
            <p className="text-xs text-[#64748B] mb-4">
              Generate your first TMDA inspection readiness checklist to get started
            </p>
            {canGenerate && (
              <Button onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>
                Generate Checklist
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Active checklist */}
      {activeId && checklist && (
        <>
          <div className="hidden print:block inspection-print-title mb-4">
            <h1 className="text-lg font-bold text-[#0D4035]">Inspection Checklist - {pharmacyName}</h1>
            <p className="text-sm text-gray-500">Printed: {format(new Date(), 'dd MMM yyyy HH:mm')}</p>
          </div>

          {/* Score bar */}
          <Card className="inspection-print-card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-[#0D4035]">Readiness Score</p>
                <p className="text-xs text-[#64748B]">
                  {compliant} of {applicable} applicable items compliant
                  {' · '}Generated {format(new Date(checklist.generatedAt), 'dd MMM yyyy')}
                </p>
              </div>
              <span className={`text-2xl font-bold ${scorePercent >= 80 ? 'text-[#1A6B5C]' : scorePercent >= 60 ? 'text-[#D97706]' : 'text-[#DC2626]'}`}>
                {scorePercent}%
              </span>
            </div>
            <div className="w-full h-2 bg-[#D6F0E8] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${scorePercent >= 80 ? 'bg-[#1A6B5C]' : scorePercent >= 60 ? 'bg-[#D97706]' : 'bg-[#DC2626]'}`}
                style={{ width: `${scorePercent}%` }}
              />
            </div>
            <div className="flex gap-4 mt-3 flex-wrap">
              {(['COMPLIANT', 'NON_COMPLIANT', 'NOT_APPLICABLE', 'PENDING'] as ItemStatus[]).map(s => {
                const count = items.filter(i => i.status === s).length;
                const m = STATUS_META[s];
                return (
                  <div key={s} className="flex items-center gap-1.5">
                    {m.icon}
                    <span className="text-xs text-[#64748B]">{count} {m.label}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Instructions */}
          <p className="text-xs text-[#64748B] px-1 no-print">
            Click any item to cycle its status: <strong>Pending → Compliant → Non-Compliant → Not Applicable</strong>. Non-compliant items require a note.
          </p>

          {/* Items by category */}
          {clLoading ? (
            <div className="text-center py-8 text-[#64748B]">Loading checklist...</div>
          ) : (
            Object.entries(grouped).map(([category, entries]) => (
              <Card key={category} className="inspection-print-card" header={
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#0D4035]">{category}</span>
                  <div className="flex gap-1">
                    {entries.map(({ item: itm }) => (
                      <span key={itm.item} className={`w-2 h-2 rounded-full ${
                        itm.status === 'COMPLIANT' ? 'bg-[#1A6B5C]' :
                        itm.status === 'NON_COMPLIANT' ? 'bg-[#DC2626]' :
                        itm.status === 'NOT_APPLICABLE' ? 'bg-gray-300' : 'bg-[#D6F0E8]'
                      }`} />
                    ))}
                  </div>
                </div>
              } padding={false}>
                <div className="divide-y divide-[#D6F0E8]">
                  {entries.map(({ item: itm, idx }) => {
                    const meta = STATUS_META[itm.status];
                    return (
                      <div key={idx}>
                        <button
                          type="button"
                          onClick={() => cycleStatus(idx, itm.status)}
                          className="w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-[#EDF7F3] transition-colors"
                        >
                          <div className="mt-0.5 shrink-0">{meta.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#0D4035]">{itm.item}</p>
                            {itm.notes && (
                              <p className="text-xs text-[#DC2626] mt-0.5 italic">Note: {itm.notes}</p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${meta.color}`}>
                            {meta.label}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))
          )}

          {/* Export report */}
          <div className="flex justify-end no-print">
            <Button
              className="no-print"
              variant="secondary"
              leftIcon={<Download size={16} />}
              onClick={() => window.print()}
            >
              Export PDF Report
            </Button>
          </div>
        </>
      )}

      {/* Note modal for NON_COMPLIANT */}
      {editingNote !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl border border-[#D6F0E8] shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-semibold text-[#0D4035]">Non-Compliance Note Required</h3>
            <p className="text-sm text-[#64748B]">Describe the issue and any corrective action planned.</p>
            <textarea
              rows={4}
              value={editingNote.text}
              onChange={e => setEditingNote(n => n ? { ...n, text: e.target.value } : null)}
              placeholder="e.g. Temperature log not completed for last 3 days. Will train staff immediately."
              className="w-full px-3 py-2 text-sm border border-[#D6F0E8] rounded-xl focus:outline-none focus:border-[#DC2626] resize-none"
            />
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setEditingNote(null)}>Cancel</Button>
              <Button
                variant="danger"
                disabled={!editingNote.text.trim()}
                loading={updateMutation.isPending}
                onClick={saveNote}
              >
                Mark Non-Compliant
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
