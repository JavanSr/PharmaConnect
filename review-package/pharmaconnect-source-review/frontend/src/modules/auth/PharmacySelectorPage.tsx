import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useNotificationStore } from '@/stores/notificationStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { loadMemberships, selectMembershipPharmacy } from '@/lib/pharmacySelection';
import type { PharmacyMembership } from '@/types';

export const PharmacySelectorPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useNotificationStore((state) => state.toast);
  const queryClient = useQueryClient();
  const deviceSelectedPharmacyId = usePharmacyStore((state) => state.deviceSelectedPharmacyId);
  const setMemberships = usePharmacyStore((state) => state.setMemberships);
  const setPharmacy = usePharmacyStore((state) => state.setPharmacy);
  const setDeviceSelectedPharmacyId = usePharmacyStore((state) => state.setDeviceSelectedPharmacyId);
  const [selectingId, setSelectingId] = React.useState<string | null>(null);
  const autoSelectionAttempted = React.useRef(false);

  const membershipsQuery = useQuery({
    queryKey: ['me-pharmacies'],
    queryFn: loadMemberships,
  });

  const memberships = membershipsQuery.data ?? [];

  React.useEffect(() => {
    if (!memberships.length) {
      return;
    }

    setMemberships(memberships);

    if (memberships.length === 1) {
      setPharmacy(memberships[0].pharmacy);
      setDeviceSelectedPharmacyId(memberships[0].pharmacyId);
      navigate('/dashboard', { replace: true });
    }
  }, [memberships, navigate, setDeviceSelectedPharmacyId, setMemberships, setPharmacy]);

  React.useEffect(() => {
    if (autoSelectionAttempted.current || !memberships.length || memberships.length <= 1) {
      return;
    }

    if (!deviceSelectedPharmacyId || !memberships.some((membership) => membership.pharmacyId === deviceSelectedPharmacyId)) {
      return;
    }

    autoSelectionAttempted.current = true;
    setSelectingId(deviceSelectedPharmacyId);
    void selectMembershipPharmacy(deviceSelectedPharmacyId)
      .then(async () => {
        await queryClient.invalidateQueries();
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        setSelectingId(null);
        toast.error('Could not restore your saved outlet. Please choose again.');
      });
  }, [deviceSelectedPharmacyId, memberships, navigate, queryClient, toast]);

  const handleSelect = async (membership: PharmacyMembership) => {
    setSelectingId(membership.pharmacyId);
    try {
      await selectMembershipPharmacy(membership.pharmacyId);
      await queryClient.invalidateQueries();
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Could not switch pharmacy');
      setSelectingId(null);
    }
  };

  if (membershipsQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EDF7F3]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#1A6B5C] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#64748B]">Loading your pharmacies...</p>
        </div>
      </div>
    );
  }

  if (membershipsQuery.isError) {
    return (
      <div className="min-h-screen bg-[#EDF7F3] flex items-center justify-center p-4">
        <Card className="w-full max-w-lg" shadow="md">
          <div className="space-y-3 text-center">
            <h1 className="text-xl font-bold text-[#0D4035]">Choose outlet</h1>
            <p className="text-sm text-[#64748B]">We could not load your pharmacy memberships right now.</p>
            <Button onClick={() => membershipsQuery.refetch()}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EDF7F3] px-4 py-10 sm:py-16">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1A6B5C]">Outlet Selection</p>
          <h1 className="mt-2 text-3xl font-bold text-[#0D4035]">Choose the pharmacy you want to work in</h1>
          <p className="mt-3 text-sm text-[#64748B]">
            Your access, analytics tier, and reporting scope all follow the outlet you select here.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {memberships.map((membership) => {
            const isSaved = membership.pharmacyId === deviceSelectedPharmacyId;
            const isSelected = membership.selected;
            const isLoading = selectingId === membership.pharmacyId;

            return (
              <Card
                key={membership.id}
                className={`border-2 transition-all ${isSelected ? 'border-[#1A6B5C] shadow-md' : 'border-[#D6F0E8]'}`}
                shadow="md"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#D6F0E8] text-[#1A6B5C] flex items-center justify-center shrink-0">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-[#0D4035]">{membership.pharmacy.name}</h2>
                        <p className="text-sm text-[#64748B]">{membership.pharmacy.region} • {membership.pharmacy.pharmacyType}</p>
                      </div>
                    </div>
                    {isSaved && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#D6F0E8] px-2.5 py-1 text-xs font-medium text-[#1A6B5C]">
                        <CheckCircle2 size={12} />
                        Saved on this device
                      </span>
                    )}
                  </div>

                  <div className="rounded-2xl bg-[#F7FBF9] border border-[#D6F0E8] px-4 py-3 text-sm text-[#405261]">
                    <p><span className="font-medium text-[#0D4035]">Role:</span> {membership.role.replace(/_/g, ' ')}</p>
                    <p><span className="font-medium text-[#0D4035]">Tier:</span> {membership.pharmacy.subscriptionTier}</p>
                    <p><span className="font-medium text-[#0D4035]">Status:</span> {membership.pharmacy.status}</p>
                  </div>

                  <Button
                    className="w-full justify-center"
                    onClick={() => void handleSelect(membership)}
                    loading={isLoading}
                    rightIcon={<ChevronRight size={16} />}
                  >
                    {isSelected ? 'Continue in this outlet' : 'Work in this outlet'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
