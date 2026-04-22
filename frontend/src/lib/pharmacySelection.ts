import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import type { PharmacyMembership } from '@/types';

type MembershipListResponse = {
  data: PharmacyMembership[];
};

type SelectionResponse = {
  data: {
    accessToken: string;
    refreshToken: string;
    pharmacy: PharmacyMembership['pharmacy'];
  };
};

export async function loadMemberships(): Promise<PharmacyMembership[]> {
  const response = await api.get<MembershipListResponse>('/me/pharmacies');
  const memberships = response.data.data;
  usePharmacyStore.getState().setMemberships(memberships);
  return memberships;
}

export async function selectMembershipPharmacy(pharmacyId: string): Promise<PharmacyMembership | null> {
  const memberships = usePharmacyStore.getState().memberships;
  const selectedMembership = memberships.find((membership) => membership.pharmacyId === pharmacyId) ?? null;
  const response = await api.post<SelectionResponse>(`/me/pharmacies/${pharmacyId}/select`);

  useAuthStore.getState().setTokens(response.data.data.accessToken, response.data.data.refreshToken);
  useAuthStore.getState().updateUser({
    pharmacyId,
    ...(selectedMembership ? { role: selectedMembership.role } : {}),
  });

  usePharmacyStore.getState().setPharmacy(response.data.data.pharmacy);
  usePharmacyStore.getState().setDeviceSelectedPharmacyId(pharmacyId);
  usePharmacyStore.getState().setMemberships(
    memberships.map((membership) => ({
      ...membership,
      selected: membership.pharmacyId === pharmacyId,
    })),
  );

  return selectedMembership;
}
