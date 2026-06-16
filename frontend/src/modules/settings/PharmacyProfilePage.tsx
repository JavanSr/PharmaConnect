import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Clock, MapPin, Phone, Save } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useNotificationStore } from '@/stores/notificationStore';
import { api } from '@/lib/api';
import { SettingsNav } from './SettingsNav';

const REGIONS = [
  'Arusha', 'Dar es Salaam', 'Dodoma', 'Geita', 'Iringa', 'Kagera', 'Katavi',
  'Kigoma', 'Kilimanjaro', 'Lindi', 'Manyara', 'Mara', 'Mbeya', 'Mjini Magharibi',
  'Morogoro', 'Mtwara', 'Mwanza', 'Njombe', 'Pemba North', 'Pemba South',
  'Pwani', 'Rukwa', 'Ruvuma', 'Shinyanga', 'Simiyu', 'Singida', 'Songwe',
  'Tabora', 'Tanga', 'Unguja North', 'Unguja South',
];

type ProfileForm = {
  address: string;
  region: string;
  licenceNumber: string;
  phone: string;
  hours: string;
};

export const PharmacyProfilePage: React.FC = () => {
  const toast = useNotificationStore(s => s.toast);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['pharmacy-profile'],
    queryFn: () => api.get('/settings/pharmacy-profile').then(r => r.data.data),
  });

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<ProfileForm>({
    defaultValues: { address: '', region: '', licenceNumber: '', phone: '', hours: '' },
  });

  React.useEffect(() => {
    if (data) {
      reset({
        address: data.address ?? '',
        region: data.region ?? '',
        licenceNumber: data.licenceNumber ?? '',
        phone: data.phone ?? '',
        hours: data.hours ?? '',
      });
    }
  }, [data, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: ProfileForm) => api.patch('/settings/pharmacy-profile', values),
    onSuccess: () => {
      toast.success('Pharmacy profile updated');
      qc.invalidateQueries({ queryKey: ['pharmacy-profile'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to save'),
  });

  if (isLoading) {
    return (
      <div className="space-y-5 max-w-2xl">
        <h1 className="text-xl font-bold text-[#0D4035]">Pharmacy Profile</h1>
        <SettingsNav />
        <div className="h-48 animate-pulse rounded-2xl bg-[#D6F0E8]" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-bold text-[#0D4035]">Pharmacy Profile</h1>
      <SettingsNav />

      {/* Read-only identity */}
      <Card header={<span className="text-sm font-semibold text-[#0D4035]">Pharmacy Identity</span>}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-[#1A6B5C] flex items-center justify-center">
            <Building2 size={22} className="text-white" />
          </div>
          <div>
            <p className="text-base font-bold text-[#0D4035]">{data?.name}</p>
            <p className="text-sm text-[#64748B]">{data?.region}</p>
          </div>
        </div>
        <p className="text-xs text-[#64748B] bg-[#EDF7F3] rounded-xl px-3 py-2">
          To change your pharmacy name, contact APOTEKH support.
        </p>
      </Card>

      {/* Editable fields */}
      <Card header={<span className="text-sm font-semibold text-[#0D4035]">Contact & Location</span>}>
        <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-4">
          <Input
            label="PC Registration Number"
            placeholder="e.g. PC/2025/XXXXX"
            leftIcon={<Building2 size={15} />}
            {...register('licenceNumber')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              placeholder="e.g. 0754 000 000"
              leftIcon={<Phone size={15} />}
              {...register('phone')}
            />
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Region</label>
              <select
                {...register('region')}
                className="w-full rounded-xl border border-[#D6F0E8] bg-white px-3 py-2.5 text-sm text-[#0D4035] focus:outline-none focus:ring-2 focus:ring-[#1A6B5C]"
              >
                {REGIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          <Input
            label="Address"
            placeholder="Street, area, town"
            leftIcon={<MapPin size={15} />}
            {...register('address')}
          />
          <Input
            label="Operating Hours"
            placeholder="e.g. Mon–Sat 8:00am–8:00pm, Sun 9:00am–2:00pm"
            leftIcon={<Clock size={15} />}
            {...register('hours')}
          />
          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              leftIcon={<Save size={15} />}
              loading={saveMutation.isPending}
              disabled={!isDirty}
            >
              Save changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
