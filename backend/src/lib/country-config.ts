// Country and regulatory configuration
// Each entry covers one supported market. Add new countries here before launch,
// not via code changes scattered across the codebase.

export type CountryCode = 'TZ' | 'KE' | 'UG' | 'RW';

export type CurrencyConfig = {
  code: string;        // ISO 4217
  symbol: string;      // Display symbol
  name: string;
  decimalPlaces: 0 | 2;
  locale: string;      // Intl locale for number formatting
};

export type RegulatoryConfig = {
  authorityName: string;          // e.g. "TFDA", "PPB"
  authorityAbbrev: string;        // e.g. "TFDA"
  licenceNumberLabel: string;     // Label shown in UI
  facilityIdLabel: string;        // e.g. "FIN" (Tanzania), "PPB No." (Kenya)
  controlledDrugsRegisterRequired: boolean;
  prescriptionRetentionDays: number;
  dispensingLogExportFormat: 'csv' | 'pdf';
};

export type CountryConfig = {
  code: CountryCode;
  name: string;
  currency: CurrencyConfig;
  regulatory: RegulatoryConfig;
  timezone: string;
  mobileMoneyProviders: string[];
  dateFormat: string;             // Intl dateStyle or pattern
};

const COUNTRIES: Record<CountryCode, CountryConfig> = {
  TZ: {
    code: 'TZ',
    name: 'Tanzania',
    currency: {
      code: 'TZS',
      symbol: 'Tsh',
      name: 'Tanzanian Shilling',
      decimalPlaces: 0,
      locale: 'en-TZ',
    },
    regulatory: {
      authorityName: 'Tanzania Food and Drugs Authority',
      authorityAbbrev: 'TFDA',
      licenceNumberLabel: 'Pharmacy Licence Number',
      facilityIdLabel: 'FIN (Facility Identification Number)',
      controlledDrugsRegisterRequired: true,
      prescriptionRetentionDays: 365 * 3, // 3 years
      dispensingLogExportFormat: 'csv',
    },
    timezone: 'Africa/Dar_es_Salaam',
    mobileMoneyProviders: ['MPESA', 'TIGOPESA', 'AIRTEL_MONEY', 'HALOPESA'],
    dateFormat: 'DD/MM/YYYY',
  },
  KE: {
    code: 'KE',
    name: 'Kenya',
    currency: {
      code: 'KES',
      symbol: 'KSh',
      name: 'Kenyan Shilling',
      decimalPlaces: 2,
      locale: 'en-KE',
    },
    regulatory: {
      authorityName: 'Pharmacy and Poisons Board',
      authorityAbbrev: 'PPB',
      licenceNumberLabel: 'PPB Licence Number',
      facilityIdLabel: 'PPB Registration Number',
      controlledDrugsRegisterRequired: true,
      prescriptionRetentionDays: 365 * 5, // 5 years
      dispensingLogExportFormat: 'csv',
    },
    timezone: 'Africa/Nairobi',
    mobileMoneyProviders: ['MPESA'], // Safaricom M-Pesa (different API from TZ)
    dateFormat: 'DD/MM/YYYY',
  },
  UG: {
    code: 'UG',
    name: 'Uganda',
    currency: {
      code: 'UGX',
      symbol: 'USh',
      name: 'Ugandan Shilling',
      decimalPlaces: 0,
      locale: 'en-UG',
    },
    regulatory: {
      authorityName: 'National Drug Authority',
      authorityAbbrev: 'NDA',
      licenceNumberLabel: 'NDA Licence Number',
      facilityIdLabel: 'NDA Registration Number',
      controlledDrugsRegisterRequired: true,
      prescriptionRetentionDays: 365 * 3,
      dispensingLogExportFormat: 'csv',
    },
    timezone: 'Africa/Kampala',
    mobileMoneyProviders: ['AIRTEL_MONEY', 'MPESA'],
    dateFormat: 'DD/MM/YYYY',
  },
  RW: {
    code: 'RW',
    name: 'Rwanda',
    currency: {
      code: 'RWF',
      symbol: 'RF',
      name: 'Rwandan Franc',
      decimalPlaces: 0,
      locale: 'en-RW',
    },
    regulatory: {
      authorityName: 'Rwanda Food and Drugs Authority',
      authorityAbbrev: 'FDA Rwanda',
      licenceNumberLabel: 'FDA Licence Number',
      facilityIdLabel: 'FDA Registration Number',
      controlledDrugsRegisterRequired: true,
      prescriptionRetentionDays: 365 * 3,
      dispensingLogExportFormat: 'csv',
    },
    timezone: 'Africa/Kigali',
    mobileMoneyProviders: ['MPESA', 'AIRTEL_MONEY'],
    dateFormat: 'DD/MM/YYYY',
  },
};

export function getCountryConfig(code: CountryCode = 'TZ'): CountryConfig {
  return COUNTRIES[code] ?? COUNTRIES['TZ'];
}

export function formatCurrencyServer(amount: number, countryCode: CountryCode = 'TZ'): string {
  const config = getCountryConfig(countryCode);
  const formatted = new Intl.NumberFormat(config.currency.locale, {
    maximumFractionDigits: config.currency.decimalPlaces,
    minimumFractionDigits: 0,
  }).format(amount);
  return `${config.currency.symbol} ${formatted}`;
}

// Tanzania is the only active market in Phase 1. This function is the single
// point to expand: add countryCode to the Pharmacy model and call getCountryConfig(pharmacy.countryCode).
export const ACTIVE_COUNTRY: CountryCode = 'TZ';
