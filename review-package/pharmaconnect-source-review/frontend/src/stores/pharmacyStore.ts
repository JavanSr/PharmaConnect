import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Pharmacy, PharmacyMembership } from '@/types';

interface PharmacyState {
  pharmacy: Pharmacy | null;
  memberships: PharmacyMembership[];
  deviceSelectedPharmacyId: string | null;
  setPharmacy: (pharmacy: Pharmacy) => void;
  setMemberships: (memberships: PharmacyMembership[]) => void;
  setDeviceSelectedPharmacyId: (pharmacyId: string | null) => void;
  clearPharmacy: () => void;
}

export const usePharmacyStore = create<PharmacyState>()(
  persist(
    (set) => ({
      pharmacy: null,
      memberships: [],
      deviceSelectedPharmacyId: null,
      setPharmacy: (pharmacy) => set({ pharmacy }),
      setMemberships: (memberships) => set({ memberships }),
      setDeviceSelectedPharmacyId: (deviceSelectedPharmacyId) => set({ deviceSelectedPharmacyId }),
      clearPharmacy: () => set({ pharmacy: null, memberships: [] }),
    }),
    {
      name: 'pc-pharmacy',
    },
  ),
);
