import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Copy, Pill } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useNotificationStore } from '@/stores/notificationStore';
import { api } from '@/lib/api';

export const PatientProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const toast = useNotificationStore(s => s.toast);

  const { data: patientData } = useQuery({ queryKey: ['patient', id], queryFn: () => api.get(`/patients/${id}`).then(r => r.data) });
  const { data: historyData } = useQuery({ queryKey: ['patient-history', id], queryFn: () => api.get(`/patients/${id}/history`).then(r => r.data), enabled: !!id });

  const patient = patientData?.data;
  const history = historyData?.data || [];

  const copyId = () => { navigator.clipboard.writeText(id || ''); toast.success('Patient ID copied'); };

  if (!patient) return <div className="p-8 text-center text-[#64748B]">Loading patient...</div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link to="/dispensing" className="p-2 rounded-xl hover:bg-[#D6F0E8] text-[#64748B]"><ArrowLeft size={18} /></Link>
        <h1 className="text-xl font-bold text-[#0D4035] flex-1">Patient Profile</h1>
        <Link to="/dispensing">
          <Button leftIcon={<Pill size={16} />}>Dispense for Patient</Button>
        </Link>
      </div>

      <Card>
        <div className="flex items-center gap-3 p-1 bg-[#EDF7F3] rounded-xl mb-4">
          <p className="text-xs font-mono text-[#64748B] flex-1 truncate">{patient.id}</p>
          <button onClick={copyId} className="p-1.5 hover:bg-white rounded-lg transition-colors"><Copy size={14} className="text-[#64748B]" /></button>
        </div>

        {patient.chronicConditions?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Chronic Conditions</p>
            <div className="flex flex-wrap gap-2">
              {patient.chronicConditions.map((c: string) => <Badge key={c} variant="warning">{c}</Badge>)}
            </div>
          </div>
        )}

        {Object.entries(patient.allergyFlags || {}).filter(([, v]) => v).length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Allergies</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(patient.allergyFlags).filter(([, v]) => v).map(([k]) => (
                <Badge key={k} variant="danger">⚠ {k}</Badge>
              ))}
            </div>
          </div>
        )}

        {patient.activeMedications?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Current Medications</p>
            <div className="flex flex-wrap gap-2">
              {patient.activeMedications.map((m: string) => <Badge key={m} variant="info">{m}</Badge>)}
            </div>
          </div>
        )}
      </Card>

      <Card header={<span className="text-sm font-semibold text-[#0D4035]">Dispensing History</span>} padding={false}>
        {history.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B]">No dispensing history yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#D6F0E8]">
                  {['Date', 'Drug', 'Qty', 'Diagnosis', 'Dispenser'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6F0E8]">
                {history.map((e: any) => (
                  <tr key={e.id} className={`hover:bg-[#EDF7F3] ${e.isVoided ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-3 text-sm text-[#64748B]">{format(new Date(e.dispensedAt), 'dd MMM yyyy')}</td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-[#0D4035]">{e.drug?.genericName || '—'}</p>
                      {e.dose && <p className="text-xs text-[#64748B]">{e.dose}</p>}
                    </td>
                    <td className="px-5 py-3 text-sm text-[#0D4035]">{e.quantity}</td>
                    <td className="px-5 py-3 text-sm text-[#64748B]">{e.icdCode || '—'}</td>
                    <td className="px-5 py-3 text-sm text-[#64748B]">{e.dispensedBy ? `${e.dispensedBy.firstName} ${e.dispensedBy.lastName}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
