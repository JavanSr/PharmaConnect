import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export const PAYMENT_METHOD_CONFIG_KEY = 'payment.methods';

const LEGACY_PAYMENT_METHOD_CONFIG = {
  version: 1,
  methods: [
    {
      code: 'CASH',
      type: 'CASH',
      label: 'Cash',
      phoneNumber: '',
      active: true,
      note: 'Always enabled for offline fallback.',
    },
    {
      code: 'MPESA',
      type: 'MOBILE_MONEY',
      label: 'M-Pesa',
      phoneNumber: '',
      active: true,
      note: '',
    },
    {
      code: 'TIGOPESA',
      type: 'MOBILE_MONEY',
      label: 'Tigo Pesa',
      phoneNumber: '',
      active: true,
      note: '',
    },
    {
      code: 'AIRTEL_MONEY',
      type: 'MOBILE_MONEY',
      label: 'Airtel Money',
      phoneNumber: '',
      active: true,
      note: '',
    },
  ],
} satisfies Prisma.InputJsonObject;

export async function ensurePaymentMethodConfig(pharmacyId: string, createdBy: string) {
  const existing = await prisma.pharmacySetting.findUnique({
    where: {
      pharmacyId_key: {
        pharmacyId,
        key: PAYMENT_METHOD_CONFIG_KEY,
      },
    },
    select: {
      id: true,
      key: true,
      value: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.pharmacySetting.create({
    data: {
      pharmacyId,
      key: PAYMENT_METHOD_CONFIG_KEY,
      createdBy,
      value: LEGACY_PAYMENT_METHOD_CONFIG,
    },
    select: {
      id: true,
      key: true,
      value: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
