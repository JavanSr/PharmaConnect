import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';

export const LogActivityPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useNotificationStore((state) => state.toast);
  const [form, setForm] = useState({
    activityType: 'READING',
    title: '',
    provider: '',
    activityDate: new Date().toISOString().slice(0, 10),
    pointsClaimed: '1',
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: () => api.post('/cpd/activities', {
      ...form,
      pointsClaimed: Number(form.pointsClaimed),
      activityDate: new Date(form.activityDate).toISOString(),
    }),
    onSuccess: () => {
      toast.success('CPD activity logged');
      queryClient.invalidateQueries({ queryKey: ['cpd-summary'] });
      queryClient.invalidateQueries({ queryKey: ['cpd-activities'] });
      navigate('/cpd');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Could not log activity');
    },
  });

  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-[#0D4035]">Log CPD Activity</h1>
          <p className="text-sm text-[#64748B]">This remains an internal APOTEKH learning record until accredited workflows go live.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          <label className="space-y-2 text-sm text-[#0D4035]">
            <span>Activity type</span>
            <select className="h-10 w-full rounded-xl border border-[#D6F0E8] px-3" value={form.activityType} onChange={(event) => setForm((current) => ({ ...current, activityType: event.target.value }))}>
              {['READING', 'WORKSHOP', 'CONFERENCE', 'ONLINE_COURSE', 'MENTORING', 'AUDIT', 'OTHER'].map((type) => (
                <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </label>
          <Input label="Provider" value={form.provider} onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value }))} />
          <Input label="Date" type="date" value={form.activityDate} onChange={(event) => setForm((current) => ({ ...current, activityDate: event.target.value }))} />
          <Input label="Points claimed" type="number" value={form.pointsClaimed} onChange={(event) => setForm((current) => ({ ...current, pointsClaimed: event.target.value }))} />
          <Input label="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </div>
        <div className="flex gap-3">
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>Save activity</Button>
          <Button variant="ghost" onClick={() => navigate('/cpd')}>Cancel</Button>
        </div>
      </div>
    </Card>
  );
};
