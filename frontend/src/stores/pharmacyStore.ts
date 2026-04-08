import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Pharmacy } from '@/types';

interface PharmacyState {
  pharmacy: Pharmacy | null;
  setPharmacy: (pharmacy: Pharmacy) => void;
  clearPharmacy: () => void;
}

export const usePharmacyStore = create<PharmacyState>()(
  persist(
    (set) => ({
      pharmacy: null,
      setPharmacy: (pharmacy) => set({ pharmacy }),
      clearPharmacy: () => set({ pharmacy: null }),
    }),
    { name: 'pharmaconnect-pharmacy' }
  )
);
