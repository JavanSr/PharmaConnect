import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CachedDispensingPatientProfile = {
  phone: string;
  normalizedPhone: string;
  name: string;
  ageYears?: number;
  weightKg?: number;
  diagnoses: string[];
  allergies: string[];
  pregnant: boolean;
  breastfeeding: boolean;
  renalImpairment: boolean;
  hepaticImpairment: boolean;
  updatedAt: string;
};

type ProfilesByPharmacy = Record<string, CachedDispensingPatientProfile[]>;

interface DispensingPatientState {
  profilesByPharmacy: ProfilesByPharmacy;
  upsertProfile: (pharmacyId: string, profile: CachedDispensingPatientProfile) => void;
}

export function normalizePatientPhone(value: string) {
  return value.replace(/\D/g, '');
}

export const useDispensingPatientStore = create<DispensingPatientState>()(
  persist(
    (set) => ({
      profilesByPharmacy: {},
      upsertProfile: (pharmacyId, profile) =>
        set((state) => {
          const existingProfiles = state.profilesByPharmacy[pharmacyId] ?? [];
          const nextProfiles = [
            profile,
            ...existingProfiles.filter((item) => item.normalizedPhone !== profile.normalizedPhone),
          ].slice(0, 100);

          return {
            profilesByPharmacy: {
              ...state.profilesByPharmacy,
              [pharmacyId]: nextProfiles,
            },
          };
        }),
    }),
    {
      name: 'pc-dispensing-patients',
    },
  ),
);
