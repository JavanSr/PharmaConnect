import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DispensingPaymentMethodOption } from '@/modules/settings/paymentMethodConfig';
import { LEGACY_DISPENSING_PAYMENT_METHODS } from '@/modules/settings/paymentMethodConfig';

interface PaymentMethodState {
  methodsByPharmacy: Record<string, DispensingPaymentMethodOption[]>;
  setMethods: (pharmacyId: string, methods: DispensingPaymentMethodOption[]) => void;
  getMethods: (pharmacyId: string) => DispensingPaymentMethodOption[];
}

export const usePaymentMethodStore = create<PaymentMethodState>()(
  persist(
    (set, get) => ({
      methodsByPharmacy: {},
      setMethods: (pharmacyId, methods) =>
        set((state) => ({
          methodsByPharmacy: {
            ...state.methodsByPharmacy,
            [pharmacyId]: methods,
          },
        })),
      getMethods: (pharmacyId) => get().methodsByPharmacy[pharmacyId] ?? LEGACY_DISPENSING_PAYMENT_METHODS,
    }),
    {
      name: 'pc-payment-methods',
    },
  ),
);
