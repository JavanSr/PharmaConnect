export type TanzaniaMasterCatalogIngredientSeed = {
  name: string;
  strengthText?: string;
  aliases?: string[];
};

export type TanzaniaMasterCatalogProductSeed = {
  msdCode?: string;
  productName: string;
  genericName: string;
  therapeuticClassName: string;
  category: string;
  dosageFormName: string;
  routeName?: string;
  strengthText: string;
  packSizeLabel: string;
  packSizeQuantity?: string;
  packSizeUnit?: string;
  unitPrice?: string;
  storageCondition?: 'AMBIENT' | 'REFRIGERATED' | 'FROZEN';
  sourceUrl: string;
  sourceNotes: string;
  reviewNotes?: string;
  aliases?: string[];
  ingredients: TanzaniaMasterCatalogIngredientSeed[];
};

export const MSD_TANZANIA_MASTER_SOURCE = {
  sourceName: 'Medical Stores Department Tanzania',
  title: 'MSD Price Catalogue FY 2024/2025',
  url: 'https://msd.go.tz/sites/default/files/2024-10/PRICE_CATALOGUE_FY_2024_2025.pdf',
  issuingAuthority: 'Medical Stores Department (MSD), Tanzania',
  documentVersion: 'FY 2024/2025',
  notes:
    'Phase 3 seed source. Structured procurement catalogue used as the initial Tanzania master catalog fallback while TMDA bulk registration export remains unconfirmed.',
} as const;

export const NEMLIT_TANZANIA_MASTER_SOURCE = {
  sourceName: 'Ministry of Health Tanzania',
  title: 'National Essential Medicines List for Tanzania Mainland 2021',
  url: 'https://www.moh.go.tz/storage/app/uploads/public/663/c8f/ceb/663c8fceb418d132695047.pdf',
  issuingAuthority: 'Ministry of Health, United Republic of Tanzania',
  documentVersion: 'Sixth Edition 2021',
  notes:
    'Phase 3 supplementation source. Used to expand the Tanzania master catalog with essential medicines that are not yet present in the initial MSD procurement seed.',
} as const;

export const TANZANIA_MASTER_CATALOG_SEED: TanzaniaMasterCatalogProductSeed[] = [
  {
    msdCode: '10010473',
    productName: 'PARACETAMOL 500MG TABLETS',
    genericName: 'Paracetamol',
    therapeuticClassName: 'Anti-pyretics, Analgesics and NSAIDs',
    category: 'A23-Anti-pyretics, Analgesics and NSAIDs',
    dosageFormName: 'Tablet',
    routeName: 'Oral',
    strengthText: '500MG',
    packSizeLabel: '100TB',
    packSizeQuantity: '100',
    packSizeUnit: 'TB',
    unitPrice: '2829.40',
    sourceUrl: MSD_TANZANIA_MASTER_SOURCE.url,
    sourceNotes:
      'MSD catalogue row 280 lists PARACETAMOL 500MG TABLETS, pack 100TB, selling price 2,829.40.',
    reviewNotes: 'TMDA registration number and NEMLIT essential-medicine flag still need verification.',
    ingredients: [{ name: 'Paracetamol', strengthText: '500MG' }],
  },
  {
    msdCode: '10010040',
    productName: 'AMOXICILLIN 250MG CAPSULES',
    genericName: 'Amoxicillin',
    therapeuticClassName: 'Antibiotic',
    category: 'A9-Antibiotic',
    dosageFormName: 'Capsule',
    routeName: 'Oral',
    strengthText: '250MG',
    packSizeLabel: '100CP',
    packSizeQuantity: '100',
    packSizeUnit: 'CP',
    unitPrice: '4575.00',
    sourceUrl: MSD_TANZANIA_MASTER_SOURCE.url,
    sourceNotes:
      'MSD catalogue row 69 lists AMOXICILLIN 250MG CAPSULES, pack 100CP, selling price 4,575.00.',
    reviewNotes: 'Imported from MSD only; TMDA registration metadata is still pending verification.',
    aliases: ['Amoxycillin 250mg capsules'],
    ingredients: [{ name: 'Amoxicillin', strengthText: '250MG', aliases: ['Amoxycillin'] }],
  },
  {
    msdCode: '10010065',
    productName: 'AZITHROMYCIN 500MG TABLETS',
    genericName: 'Azithromycin',
    therapeuticClassName: 'Antibiotic',
    category: 'A9-Antibiotic',
    dosageFormName: 'Tablet',
    routeName: 'Oral',
    strengthText: '500MG',
    packSizeLabel: '3TB',
    packSizeQuantity: '3',
    packSizeUnit: 'TB',
    unitPrice: '1241.46',
    sourceUrl: MSD_TANZANIA_MASTER_SOURCE.url,
    sourceNotes:
      'MSD catalogue row 73 lists AZITHROMYCIN 500MG TABLETS, pack 3TB, selling price 1,241.46.',
    reviewNotes: 'TMDA registration number and essential-medicine status still need confirmation.',
    ingredients: [{ name: 'Azithromycin', strengthText: '500MG' }],
  },
  {
    msdCode: '10010170',
    productName: 'CO-TRIMOXAZOLE 480MG TABLETS',
    genericName: 'Co-trimoxazole',
    therapeuticClassName: 'Antibiotic',
    category: 'A9-Antibiotic',
    dosageFormName: 'Tablet',
    routeName: 'Oral',
    strengthText: '480MG',
    packSizeLabel: '100TB',
    packSizeQuantity: '100',
    packSizeUnit: 'TB',
    unitPrice: '3792.60',
    sourceUrl: MSD_TANZANIA_MASTER_SOURCE.url,
    sourceNotes:
      'MSD catalogue row 87 lists CO-TRIMOXAZOLE 480MG TABLETS, pack 100TB, selling price 3,792.60.',
    reviewNotes:
      'Imported as a high-confidence catalog row. Ingredient ratio decomposition can be refined in a later enrichment pass.',
    aliases: ['Cotrimoxazole 480mg tablets'],
    ingredients: [{ name: 'Co-trimoxazole', strengthText: '480MG', aliases: ['Cotrimoxazole'] }],
  },
  {
    msdCode: '10010400',
    productName: 'METFORMIN 500MG TABLETS',
    genericName: 'Metformin',
    therapeuticClassName: 'Anti-diabetic Medicines',
    category: 'A12-Anti-Diabetic Medicines',
    dosageFormName: 'Tablet',
    routeName: 'Oral',
    strengthText: '500MG',
    packSizeLabel: '100TB',
    packSizeQuantity: '100',
    packSizeUnit: 'TB',
    unitPrice: '3660.00',
    sourceUrl: MSD_TANZANIA_MASTER_SOURCE.url,
    sourceNotes:
      'MSD catalogue row 143 lists METFORMIN 500MG TABLETS, pack 100TB, selling price 3,660.00.',
    reviewNotes: 'TMDA registration number and NEMLIT flag still need verification.',
    ingredients: [{ name: 'Metformin', strengthText: '500MG' }],
  },
  {
    msdCode: '10010032',
    productName: 'AMLODIPINE 5MG TABLETS',
    genericName: 'Amlodipine',
    therapeuticClassName: 'Cardio-vascular',
    category: 'A30-Cardio-vascular',
    dosageFormName: 'Tablet',
    routeName: 'Oral',
    strengthText: '5MG',
    packSizeLabel: '30TB',
    packSizeQuantity: '30',
    packSizeUnit: 'TB',
    unitPrice: '1116.47',
    sourceUrl: MSD_TANZANIA_MASTER_SOURCE.url,
    sourceNotes:
      'MSD catalogue row 320 lists AMLODIPINE 5MG TABLETS, pack 30TB, selling price 1,116.47.',
    reviewNotes: 'Imported from MSD only; route and registration details should be confirmed against TMDA records.',
    aliases: ['Amlodopine 5mg tablets'],
    ingredients: [{ name: 'Amlodipine', strengthText: '5MG', aliases: ['Amlodopine'] }],
  },
  {
    msdCode: '10010379',
    productName: 'LOSARTAN 50MG TABLETS',
    genericName: 'Losartan',
    therapeuticClassName: 'Cardio-vascular',
    category: 'A30-Cardio-vascular',
    dosageFormName: 'Tablet',
    routeName: 'Oral',
    strengthText: '50MG',
    packSizeLabel: '30TB',
    packSizeQuantity: '30',
    packSizeUnit: 'TB',
    unitPrice: '2242.15',
    sourceUrl: MSD_TANZANIA_MASTER_SOURCE.url,
    sourceNotes:
      'MSD catalogue row 347 lists LOSARTAN 50MG TABLETS, pack 30TB, selling price 2,242.15.',
    reviewNotes: 'TMDA registration number and essential-medicine status still need verification.',
    ingredients: [{ name: 'Losartan', strengthText: '50MG' }],
  },
  {
    msdCode: '10080027',
    productName: 'SALBUTAMOL 200MCG INHALER',
    genericName: 'Salbutamol',
    therapeuticClassName: 'Anti-Asthmatic and Cough Medicine',
    category: 'A8-Anti-Asthmatic and Cough Medicine',
    dosageFormName: 'Inhaler',
    routeName: 'Inhalation',
    strengthText: '200MCG',
    packSizeLabel: '1BT',
    packSizeQuantity: '1',
    packSizeUnit: 'BT',
    sourceUrl: MSD_TANZANIA_MASTER_SOURCE.url,
    sourceNotes:
      'MSD catalogue row 65 lists SALBUTAMOL 200MCG INHALER, pack 1BT; selling price was listed as TBD.',
    reviewNotes: 'Price and TMDA registration metadata still need verification.',
    ingredients: [{ name: 'Salbutamol', strengthText: '200MCG' }],
  },
  {
    msdCode: '10060081',
    productName: 'CEFTRIAXONE 1G POWDER FOR INJECTION',
    genericName: 'Ceftriaxone',
    therapeuticClassName: 'Antibiotic',
    category: 'A9-Antibiotic',
    dosageFormName: 'Powder for injection',
    routeName: 'Injection',
    strengthText: '1G',
    packSizeLabel: '1VL',
    packSizeQuantity: '1',
    packSizeUnit: 'VL',
    unitPrice: '985.60',
    sourceUrl: MSD_TANZANIA_MASTER_SOURCE.url,
    sourceNotes:
      'MSD catalogue row 112 lists CEFTRIAXONE 1G POWDER FOR INJECTION, pack 1VL, selling price 985.60.',
    reviewNotes: 'The exact approved route(s) should still be verified in TMDA product information.',
    ingredients: [{ name: 'Ceftriaxone', strengthText: '1G' }],
  },
  {
    msdCode: '10010043',
    productName: 'AMOXICILLIN TRIHYDRATE 500MG + CLAVULANIC POTASSIUM 125MG TABLETS',
    genericName: 'Amoxicillin + Clavulanic acid',
    therapeuticClassName: 'Antibiotic',
    category: 'A9-Antibiotic',
    dosageFormName: 'Tablet',
    routeName: 'Oral',
    strengthText: '500MG/125MG',
    packSizeLabel: '14TB',
    packSizeQuantity: '14',
    packSizeUnit: 'TB',
    unitPrice: '4639.80',
    sourceUrl: MSD_TANZANIA_MASTER_SOURCE.url,
    sourceNotes:
      'MSD catalogue row 71 lists AMOXICILLIN TRIHYDRATE 500MG + CLAVULANIC POTASSIUM 125MG TABLETS, pack 14TB, selling price 4,639.80.',
    reviewNotes: 'Combination-product salts are catalogued from MSD wording and still need TMDA registration verification.',
    aliases: ['Amoxycillin trihydrate 500mg + clavulanic potassium 125mg tablets'],
    ingredients: [
      { name: 'Amoxicillin trihydrate', strengthText: '500MG', aliases: ['Amoxycillin trihydrate'] },
      { name: 'Clavulanic potassium', strengthText: '125MG' },
    ],
  },
  {
    msdCode: '10010397',
    productName: 'METFORMIN 500MG + GLIMEPIRIDE 2MG TABLETS',
    genericName: 'Metformin + Glimepiride',
    therapeuticClassName: 'Anti-diabetic Medicines',
    category: 'A12-Anti-Diabetic Medicines',
    dosageFormName: 'Tablet',
    routeName: 'Oral',
    strengthText: '500MG/2MG',
    packSizeLabel: '30TB',
    packSizeQuantity: '30',
    packSizeUnit: 'TB',
    unitPrice: '3862.32',
    sourceUrl: MSD_TANZANIA_MASTER_SOURCE.url,
    sourceNotes:
      'MSD catalogue row 141 lists METFORMIN 500MG + GLIMEPIRIDE 2MG TABLETS, pack 30TB, selling price 3,862.32.',
    reviewNotes: 'Imported from MSD only; TMDA registration metadata still needs verification.',
    aliases: ['Metformin 500mg + glimepiride 2mg tablets'],
    ingredients: [
      { name: 'Metformin', strengthText: '500MG' },
      { name: 'Glimepiride', strengthText: '2MG' },
    ],
  },
  {
    msdCode: '10080025',
    productName: 'SALBUTAMOL 2.5MG + IPRATROPIUM 500MCG INHALATION SOLUTION',
    genericName: 'Salbutamol + Ipratropium',
    therapeuticClassName: 'Anti-Asthmatic and Cough Medicine',
    category: 'A8-Anti-Asthmatic and Cough Medicine',
    dosageFormName: 'Inhalation solution',
    routeName: 'Inhalation',
    strengthText: '2.5MG/500MCG',
    packSizeLabel: '10BT',
    packSizeQuantity: '10',
    packSizeUnit: 'BT',
    unitPrice: '13919.40',
    sourceUrl: MSD_TANZANIA_MASTER_SOURCE.url,
    sourceNotes:
      'MSD catalogue row 64 lists SALBUTAMOL 2.5MG + IPRATROPIUM 500MCG INHALATION SOLUTION, pack 10BT, selling price 13,919.40.',
    reviewNotes: 'Combination inhalation product imported from MSD only; TMDA registration metadata is still pending verification.',
    ingredients: [
      { name: 'Salbutamol', strengthText: '2.5MG' },
      { name: 'Ipratropium', strengthText: '500MCG' },
    ],
  },
  {
    msdCode: '10010445',
    productName: 'NIFEDIPINE 10MG TABLETS',
    genericName: 'Nifedipine',
    therapeuticClassName: 'Anti-Angina Medicines',
    category: 'A6-Anti-Angina Medicines',
    dosageFormName: 'Tablet',
    routeName: 'Oral',
    strengthText: '10MG',
    packSizeLabel: '100TB',
    packSizeQuantity: '100',
    packSizeUnit: 'TB',
    unitPrice: '9752.40',
    sourceUrl: MSD_TANZANIA_MASTER_SOURCE.url,
    sourceNotes:
      'MSD catalogue row 44 lists NIFEDIPINE 10MG TABLETS, pack 100TB, selling price 9,752.40.',
    reviewNotes: 'Imported from MSD only; registration and essential-medicine verification still need a TMDA/NEMLIT pass.',
    ingredients: [{ name: 'Nifedipine', strengthText: '10MG' }],
  },
];
