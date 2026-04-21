export const PAYMENT_METHOD_CONFIG_KEY = 'payment.methods';

export type PaymentMethodSettingType = 'CASH' | 'MOBILE_MONEY';

export interface PaymentMethodSetting {
  code: string;
  type: PaymentMethodSettingType;
  label: string;
  phoneNumber: string;
  active: boolean;
  note: string;
}

export interface PaymentMethodConfig {
  version: 1;
  methods: PaymentMethodSetting[];
}

const CASH_METHOD: PaymentMethodSetting = {
  code: 'CASH',
  type: 'CASH',
  label: 'Cash',
  phoneNumber: '',
  active: true,
  note: 'Always enabled for offline fallback.',
};

const KNOWN_MOBILE_MONEY_CODES: Record<string, string> = {
  mpesa: 'MPESA',
  'm-pesa': 'MPESA',
  'vodacom mpesa': 'MPESA',
  'vodacom m-pesa': 'MPESA',
  tigopesa: 'TIGOPESA',
  'tigo pesa': 'TIGOPESA',
  airtelmoney: 'AIRTEL_MONEY',
  'airtel money': 'AIRTEL_MONEY',
  halopesa: 'HALOPESA',
  'halo pesa': 'HALOPESA',
};

const sanitizeString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const isPaymentMethodSetting = (value: PaymentMethodSetting | null): value is PaymentMethodSetting => Boolean(value);

const sanitizeCode = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const inferMobileMoneyCode = (label: string, index: number) => {
  const normalized = label.trim().toLowerCase().replace(/\s+/g, ' ');
  const knownCode = KNOWN_MOBILE_MONEY_CODES[normalized] ?? KNOWN_MOBILE_MONEY_CODES[normalized.replace(/\s+/g, '')];
  if (knownCode) {
    return knownCode;
  }

  const generated = sanitizeCode(label);
  if (generated) {
    return generated;
  }

  return `MOBILE_MONEY_${index + 1}`;
};

const normalizeMethod = (method: unknown, index: number): PaymentMethodSetting | null => {
  if (!method || typeof method !== 'object') {
    return null;
  }

  const record = method as Record<string, unknown>;
  const rawType = sanitizeString(record.type).toUpperCase();
  const type: PaymentMethodSettingType =
    rawType === 'CASH' ? 'CASH' : 'MOBILE_MONEY';
  const label = sanitizeString(record.label) || (type === 'CASH' ? 'Cash' : '');
  const code =
    sanitizeCode(sanitizeString(record.code)) ||
    (type === 'CASH' ? 'CASH' : inferMobileMoneyCode(label, index));

  return {
    code: type === 'CASH' ? 'CASH' : code,
    type,
    label: type === 'CASH' ? 'Cash' : label,
    phoneNumber: type === 'MOBILE_MONEY' ? sanitizeString(record.phoneNumber) : '',
    active: type === 'CASH' ? true : record.active !== false,
    note: sanitizeString(record.note),
  };
};

export const normalizePaymentMethodConfig = (value: unknown): PaymentMethodConfig => {
  const methodsValue =
    value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>).methods)
      ? ((value as Record<string, unknown>).methods as unknown[])
      : ([] as unknown[]);

  const seenCodes = new Set<string>(['CASH']);
  const mobileMoneyMethods = methodsValue
    .map((method, index) => normalizeMethod(method, index))
    .filter(isPaymentMethodSetting)
    .filter((method) => method.type === 'MOBILE_MONEY')
    .filter((method) => {
      if (seenCodes.has(method.code)) {
        return false;
      }
      seenCodes.add(method.code);
      return true;
    });

  return {
    version: 1,
    methods: [CASH_METHOD, ...mobileMoneyMethods],
  };
};

export const createMobileMoneyDraft = (index: number): PaymentMethodSetting => ({
  code: `MOBILE_MONEY_${index + 1}`,
  type: 'MOBILE_MONEY',
  label: '',
  phoneNumber: '',
  active: true,
  note: '',
});

export const serializePaymentMethodConfig = (methods: PaymentMethodSetting[]): PaymentMethodConfig => {
  const normalized = normalizePaymentMethodConfig({ methods });

  return {
    version: 1,
    methods: normalized.methods.map((method, index) => {
      if (method.type === 'CASH') {
        return CASH_METHOD;
      }

      const label = method.label.trim();
      return {
        code: inferMobileMoneyCode(label, index),
        type: 'MOBILE_MONEY',
        label,
        phoneNumber: method.phoneNumber.trim(),
        active: method.active,
        note: method.note.trim(),
      };
    }),
  };
};
