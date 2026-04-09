import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useNotificationStore } from '@/stores/notificationStore';
import { api } from '@/lib/api';

const POINT_MAP: Record<string, number> = { READING: 1, WEBINAR: 2, CONFERENCE: 5, WORKSHOP: 3, SELF_STUDY: 1 };

const schema = z.object({
  activityType: z.enum(['READING', 'WEBINAR', 'CONFERENCE', 'WORKSHOP', 'SELF_STUDY']),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  activityDate: z.string().min(1, 'Date is required'),
  pointsClaimed: z.coerce.number().int().min(1).max(10),
});
type FormData = z.infer<typeof schema>;

export const LogActivityPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useNotificationStore(s => s.toast);
  const qc = useQueryClient();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { activityType: 'READING', pointsClaimed: 1, activityDate: new Date().toISOString().split('T')[0] },
  });

  const activityType = watch('activityType');
  React.useEffect(() => { setValue('pointsClaimed', POINT_MAP[activityType] ?? 1); }, [activityType, setValue]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.post('/cpd/activities', { ...data, activityDate: new Date(data.activityDate).toISOString() }),
    onSuccess: () => {
      toast.success('CPD activity logged!');
      qc.invalidateQueries({ queryKey: ['cpd-summary'] });
      navigate('/cpd');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to log activity'),
  });

  return (
    <div className="max-w-lg space-y-5">
      <h1 className="text-xl font-bold text-[#0D4035]">Log CPD Activity</h1>

      <Card>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <Select
            label="Activity Type"
            options={[
              { value: 'READING', label: 'Reading (1 point)' },
              { value: 'WEBINAR', label: 'Webinar (2 points)' },
              { value: 'CONFERENCE', label: 'Conference (5 points)' },
              { value: 'WORKSHOP', label: 'Workshop (3 points)' },
              { value: 'SELF_STUDY', label: 'Self Study (1 point)' },
            ]}
            {...register('activityType')}
            error={errors.activityType?.message}
            required
          />

          <Input
            label="Activity Title"
            placeholder="e.g. Tanzania UHI Mandate — PharmaConnect Guide"
            {...register('title')}
            error={errors.title?.message}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Activity Date" type="date" {...register('activityDate')} error={errors.activityDate?.message} required />
            <Input label="Points Claimed" type="number" min="1" max="10" {...register('pointsClaimed')} error={errors.pointsClaimed?.message} required />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate('/cpd')}>Cancel</Button>
            <Button type="submit" loading={mutation.isPending} className="flex-1">Log Activity</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
