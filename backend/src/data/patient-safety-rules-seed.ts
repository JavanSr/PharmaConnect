export type SafetySourceKey =
  | 'WHO_MODEL_FORMULARY_2008'
  | 'WHO_EML_23_2023'
  | 'TANZANIA_STG_2021'
  | 'TANZANIA_STG_ADDENDUM_2023';

export type SafetySourceDocumentSeed = {
  key: SafetySourceKey;
  sourceName: string;
  title: string;
  url: string;
  sourceType: 'WHO_MODEL_FORMULARY' | 'WHO_EML' | 'STG' | 'ADDENDUM';
  trustLevel: 'INTERNATIONAL_FALLBACK' | 'OFFICIAL_SECONDARY';
  importMethod: 'PDF_EXTRACTION' | 'MANUAL_ENTRY';
  issuingAuthority: string;
  documentVersion: string;
  publicationDate?: string;
  effectiveDate?: string;
  notes?: string;
};

type BaseSafetyRuleSeed = {
  sourceKey: SafetySourceKey;
  sourceSection: string;
  sourceUrl?: string;
  reviewStatus?: 'APPROVED' | 'NEEDS_VERIFICATION';
};

export type InteractionRuleSeed = BaseSafetyRuleSeed & {
  drugA: string;
  drugB: string;
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CONTRAINDICATED';
  effectSummary: string;
  management: string;
  requiresPicPin?: boolean;
};

export type ContraindicationRuleSeed = BaseSafetyRuleSeed & {
  drug: string;
  conditionType: 'PREGNANCY' | 'ALLERGY_CLASS' | 'DIAGNOSIS' | 'RENAL' | 'HEPATIC' | 'ELDERLY';
  conditionValue: string;
  severity: 'MODERATE' | 'MAJOR' | 'CONTRAINDICATED';
  message: string;
  requiresPicPin?: boolean;
};

export type WarningRuleSeed = BaseSafetyRuleSeed & {
  drug: string;
  warningType: 'GENERAL' | 'COUNSELLING' | 'MONITORING';
  severity: 'INFO' | 'MODERATE' | 'MAJOR';
  message: string;
};

export type PregnancyFlagRuleSeed = BaseSafetyRuleSeed & {
  drug: string;
  trimester?: string;
  riskLevel: 'CONTRAINDICATED' | 'MAJOR' | 'MODERATE';
  message: string;
};

export type LactationFlagRuleSeed = BaseSafetyRuleSeed & {
  drug: string;
  riskLevel: 'MAJOR' | 'MODERATE' | 'INFO';
  message: string;
};

export type RenalFlagRuleSeed = BaseSafetyRuleSeed & {
  drug: string;
  stage: string;
  severity: 'INFO' | 'MODERATE' | 'MAJOR';
  message: string;
};

export type HepaticFlagRuleSeed = BaseSafetyRuleSeed & {
  drug: string;
  stage: string;
  severity: 'INFO' | 'MODERATE' | 'MAJOR';
  message: string;
};

export const SAFETY_SOURCE_DOCUMENTS: SafetySourceDocumentSeed[] = [
  {
    key: 'WHO_MODEL_FORMULARY_2008',
    sourceName: 'WHO Model Formulary',
    title: 'WHO model formulary 2008',
    url: 'https://www.who.int/publications/i/item/9789241547659',
    sourceType: 'WHO_MODEL_FORMULARY',
    trustLevel: 'INTERNATIONAL_FALLBACK',
    importMethod: 'PDF_EXTRACTION',
    issuingAuthority: 'World Health Organization',
    documentVersion: '2008',
    publicationDate: '2010-05-12',
    notes: 'Primary practical fallback for initial interaction, contraindication, and counselling rules.',
  },
  {
    key: 'WHO_EML_23_2023',
    sourceName: 'WHO Essential Medicines List',
    title: 'WHO Model List of Essential Medicines - 23rd list, 2023',
    url: 'https://www.who.int/publications/i/item/WHO-MHP-HPS-EML-2023.02',
    sourceType: 'WHO_EML',
    trustLevel: 'INTERNATIONAL_FALLBACK',
    importMethod: 'PDF_EXTRACTION',
    issuingAuthority: 'World Health Organization',
    documentVersion: '23rd list (2023)',
    publicationDate: '2023-07-26',
    notes: 'Used to anchor essential-medicine safety coverage where WHO formulary guidance is partial.',
  },
  {
    key: 'TANZANIA_STG_2021',
    sourceName: 'Tanzania Standard Treatment Guidelines',
    title: 'Standard Treatment Guidelines and National Essential Medicines List Tanzania Mainland, Sixth Edition, 2021',
    url: 'https://www.moh.go.tz/storage/app/uploads/public/663/c8f/ceb/663c8fceb418d132695047.pdf',
    sourceType: 'STG',
    trustLevel: 'OFFICIAL_SECONDARY',
    importMethod: 'PDF_EXTRACTION',
    issuingAuthority: 'Ministry of Health, United Republic of Tanzania',
    documentVersion: 'Sixth Edition 2021',
    notes: 'Used for Tanzania-specific caution, counselling, and dispensing notes.',
  },
  {
    key: 'TANZANIA_STG_ADDENDUM_2023',
    sourceName: 'Tanzania STG/NEMLIT Addendum',
    title: 'Addendum to Standard Treatment Guideline and National Essential Medicine List (STG/NEMLIT) - Tanzania Mainland',
    url: 'https://www.moh.go.tz/storage/app/uploads/public/643/69a/cd3/64369acd39d8b864795491.pdf',
    sourceType: 'ADDENDUM',
    trustLevel: 'OFFICIAL_SECONDARY',
    importMethod: 'PDF_EXTRACTION',
    issuingAuthority: 'Ministry of Health, United Republic of Tanzania',
    documentVersion: '12 April 2023 addendum',
    publicationDate: '2023-04-12',
    effectiveDate: '2023-04-01',
    notes: 'Relevant for Tanzania-specific availability and use context; not yet heavily used for rule extraction.',
  },
];

export const SAFETY_INTERACTION_RULES: InteractionRuleSeed[] = [
  {
    drugA: 'warfarin',
    drugB: 'diclofenac',
    severity: 'CONTRAINDICATED',
    effectSummary: 'Severe bleeding risk rises sharply with concurrent NSAID use.',
    management: 'Avoid combination and refer for safer analgesic selection.',
    requiresPicPin: true,
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Oral anticoagulants and NSAID precautions',
  },
  {
    drugA: 'warfarin',
    drugB: 'ibuprofen',
    severity: 'MAJOR',
    effectSummary: 'GI bleeding risk and INR instability may increase.',
    management: 'Prefer paracetamol and review for bleeding symptoms.',
    requiresPicPin: true,
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Oral anticoagulants and NSAID precautions',
  },
  {
    drugA: 'warfarin',
    drugB: 'co-trimoxazole',
    severity: 'MAJOR',
    effectSummary: 'INR may rise significantly with bleeding risk.',
    management: 'Avoid if possible or ensure urgent INR monitoring.',
    requiresPicPin: true,
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Warfarin interaction precautions',
  },
  {
    drugA: 'enalapril',
    drugB: 'spironolactone',
    severity: 'MAJOR',
    effectSummary: 'Hyperkalaemia risk increases when combined.',
    management: 'Check potassium risk and consider clinical monitoring.',
    requiresPicPin: true,
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'ACE inhibitor and potassium-sparing diuretic precautions',
  },
  {
    drugA: 'losartan',
    drugB: 'spironolactone',
    severity: 'MAJOR',
    effectSummary: 'Potassium may rise dangerously with dual blockade.',
    management: 'Avoid unsupervised combination; confirm prescriber intent.',
    requiresPicPin: true,
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Renin-angiotensin system blockers and potassium-sparing diuretic precautions',
  },
  {
    drugA: 'enalapril',
    drugB: 'diclofenac',
    severity: 'MODERATE',
    effectSummary: 'Renal perfusion may worsen and antihypertensive effect may reduce.',
    management: 'Counsel hydration and prefer alternative analgesic when possible.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'ACE inhibitor and NSAID precautions',
  },
  {
    drugA: 'metformin',
    drugB: 'prednisolone',
    severity: 'MODERATE',
    effectSummary: 'Steroids may worsen glycaemic control.',
    management: 'Counsel glucose monitoring and prescriber follow-up.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Antidiabetic medicines and corticosteroid precautions',
  },
  {
    drugA: 'glibenclamide',
    drugB: 'co-trimoxazole',
    severity: 'MAJOR',
    effectSummary: 'Hypoglycaemia risk increases.',
    management: 'Warn about low glucose symptoms and consider safer antibiotic.',
    requiresPicPin: true,
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Sulfonylurea interaction precautions',
  },
  {
    drugA: 'rifampicin',
    drugB: 'warfarin',
    severity: 'MAJOR',
    effectSummary: 'Warfarin effect may drop due to enzyme induction.',
    management: 'Needs INR review and clinician monitoring.',
    requiresPicPin: true,
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Rifampicin enzyme-induction interactions',
  },
  {
    drugA: 'rifampicin',
    drugB: 'dolutegravir',
    severity: 'MODERATE',
    effectSummary: 'Dolutegravir exposure can fall if dose adjustment is not considered.',
    management: 'Confirm regimen and counsel follow-up.',
    sourceKey: 'TANZANIA_STG_2021',
    sourceSection: 'HIV and tuberculosis co-treatment cautions',
  },
  {
    drugA: 'valproate',
    drugB: 'carbamazepine',
    severity: 'MODERATE',
    effectSummary: 'Levels can become unstable with neurotoxicity or loss of seizure control.',
    management: 'Only continue with clear prescriber plan.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Antiepileptic interaction precautions',
  },
  {
    drugA: 'salbutamol',
    drugB: 'furosemide',
    severity: 'MODERATE',
    effectSummary: 'Potassium depletion risk may increase.',
    management: 'Review muscle weakness or palpitations and monitor if needed.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Beta-agonist and diuretic precautions',
  },
];

export const SAFETY_CONTRAINDICATION_RULES: ContraindicationRuleSeed[] = [
  {
    drug: 'warfarin',
    conditionType: 'PREGNANCY',
    conditionValue: 'PREGNANT',
    severity: 'CONTRAINDICATED',
    message: 'Warfarin is contraindicated in pregnancy because of fetal harm risk.',
    requiresPicPin: true,
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Oral anticoagulants',
  },
  {
    drug: 'valproate',
    conditionType: 'PREGNANCY',
    conditionValue: 'PREGNANT',
    severity: 'CONTRAINDICATED',
    message: 'Valproate has a high teratogenic risk in pregnancy.',
    requiresPicPin: true,
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Antiepileptic medicines in pregnancy',
  },
  {
    drug: 'enalapril',
    conditionType: 'PREGNANCY',
    conditionValue: 'PREGNANT',
    severity: 'MAJOR',
    message: 'ACE inhibitors are unsafe in pregnancy and should be avoided.',
    requiresPicPin: true,
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'ACE inhibitors',
  },
  {
    drug: 'losartan',
    conditionType: 'PREGNANCY',
    conditionValue: 'PREGNANT',
    severity: 'MAJOR',
    message: 'ARBs are unsafe in pregnancy and should be avoided.',
    requiresPicPin: true,
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Angiotensin-II receptor antagonists',
  },
  {
    drug: 'co-trimoxazole',
    conditionType: 'PREGNANCY',
    conditionValue: 'PREGNANT',
    severity: 'MAJOR',
    message: 'Use in pregnancy needs caution because of folate antagonism.',
    requiresPicPin: true,
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Sulfonamides and folate antagonists in pregnancy',
  },
  {
    drug: 'diclofenac',
    conditionType: 'DIAGNOSIS',
    conditionValue: 'peptic ulcer disease',
    severity: 'MAJOR',
    message: 'NSAIDs may worsen peptic ulcer disease and bleeding risk.',
    requiresPicPin: true,
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'NSAID gastrointestinal precautions',
  },
  {
    drug: 'ibuprofen',
    conditionType: 'DIAGNOSIS',
    conditionValue: 'heart failure',
    severity: 'MAJOR',
    message: 'NSAIDs may worsen fluid retention in heart failure.',
    requiresPicPin: true,
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'NSAID cardiovascular precautions',
  },
  {
    drug: 'metformin',
    conditionType: 'RENAL',
    conditionValue: 'SEVERE_IMPAIRMENT',
    severity: 'MAJOR',
    message: 'Metformin should be avoided in severe renal impairment because of lactic acidosis risk.',
    requiresPicPin: true,
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Biguanides',
  },
  {
    drug: 'carbamazepine',
    conditionType: 'HEPATIC',
    conditionValue: 'IMPAIRMENT',
    severity: 'MAJOR',
    message: 'Carbamazepine needs caution in hepatic impairment.',
    requiresPicPin: true,
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Antiepileptic precautions',
  },
  {
    drug: 'amoxicillin',
    conditionType: 'ALLERGY_CLASS',
    conditionValue: 'PENICILLIN',
    severity: 'CONTRAINDICATED',
    message: 'Penicillin allergy reported. Avoid amoxicillin.',
    requiresPicPin: true,
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Penicillin hypersensitivity',
  },
  {
    drug: 'chlorpheniramine',
    conditionType: 'ELDERLY',
    conditionValue: 'TRUE',
    severity: 'MODERATE',
    message: 'Sedating antihistamines may cause confusion or falls in older adults.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Sedating antihistamines in older adults',
  },
];

export const SAFETY_WARNING_RULES: WarningRuleSeed[] = [
  {
    drug: 'warfarin',
    warningType: 'MONITORING',
    severity: 'MAJOR',
    message: 'Counsel on bleeding symptoms and verify that INR monitoring arrangements are in place.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Oral anticoagulants',
  },
  {
    drug: 'diclofenac',
    warningType: 'COUNSELLING',
    severity: 'MODERATE',
    message: 'Use the lowest effective dose for the shortest period and stop if black stools or vomiting blood occur.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'NSAID gastrointestinal precautions',
  },
  {
    drug: 'dolutegravir',
    warningType: 'COUNSELLING',
    severity: 'MODERATE',
    message: 'Separate dolutegravir from antacids or iron/calcium products unless specifically advised otherwise.',
    sourceKey: 'TANZANIA_STG_2021',
    sourceSection: 'Antiretroviral counselling notes',
  },
  {
    drug: 'rifampicin',
    warningType: 'GENERAL',
    severity: 'MODERATE',
    message: 'Rifampicin can change the effect of many medicines, so review the full treatment list before dispensing.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Rifampicin interactions',
  },
  {
    drug: 'salbutamol',
    warningType: 'COUNSELLING',
    severity: 'INFO',
    message: 'Check inhaler technique and escalate review if rescue use becomes frequent.',
    sourceKey: 'TANZANIA_STG_2021',
    sourceSection: 'Asthma management counselling',
  },
];

export const SAFETY_PREGNANCY_FLAGS: PregnancyFlagRuleSeed[] = [
  {
    drug: 'warfarin',
    trimester: 'ALL',
    riskLevel: 'CONTRAINDICATED',
    message: 'Avoid warfarin in pregnancy unless a specialist has documented a clear exception.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Oral anticoagulants',
  },
  {
    drug: 'valproate',
    trimester: 'ALL',
    riskLevel: 'CONTRAINDICATED',
    message: 'Avoid valproate in pregnancy because of major fetal risk unless a specialist plan is documented.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Antiepileptic medicines in pregnancy',
  },
  {
    drug: 'enalapril',
    trimester: 'SECOND_THIRD',
    riskLevel: 'MAJOR',
    message: 'Avoid enalapril in the second and third trimesters and confirm an alternative has been arranged.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'ACE inhibitors',
  },
  {
    drug: 'losartan',
    trimester: 'SECOND_THIRD',
    riskLevel: 'MAJOR',
    message: 'Avoid losartan in pregnancy and refer for an alternative when pregnancy is reported.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Angiotensin-II receptor antagonists',
  },
  {
    drug: 'co-trimoxazole',
    trimester: 'FIRST_TRIMESTER',
    riskLevel: 'MODERATE',
    message: 'Use only with careful clinical review in early pregnancy because of folate antagonism concerns.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Sulfonamides and folate antagonists in pregnancy',
  },
];

export const SAFETY_LACTATION_FLAGS: LactationFlagRuleSeed[] = [
  {
    drug: 'glibenclamide',
    riskLevel: 'MAJOR',
    message: 'Avoid glibenclamide during breastfeeding if safer alternatives are available.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Sulfonylureas during breastfeeding',
  },
  {
    drug: 'furosemide',
    riskLevel: 'MODERATE',
    message: 'Furosemide may reduce milk production, so check feeding history and clinical need.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Diuretics during breastfeeding',
  },
  {
    drug: 'valproate',
    riskLevel: 'MODERATE',
    message: 'Breastfeeding may continue with specialist review and infant observation when valproate is necessary.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Antiepileptics during breastfeeding',
  },
];

export const SAFETY_RENAL_FLAGS: RenalFlagRuleSeed[] = [
  {
    drug: 'metformin',
    stage: 'SEVERE_IMPAIRMENT',
    severity: 'MAJOR',
    message: 'Avoid metformin in severe renal impairment because of lactic acidosis risk.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Biguanides',
  },
  {
    drug: 'diclofenac',
    stage: 'ANY_IMPAIRMENT',
    severity: 'MAJOR',
    message: 'Avoid or minimise diclofenac in renal impairment because kidney injury can worsen.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'NSAID renal precautions',
  },
  {
    drug: 'ibuprofen',
    stage: 'ANY_IMPAIRMENT',
    severity: 'MODERATE',
    message: 'Use ibuprofen cautiously in renal impairment and review hydration status.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'NSAID renal precautions',
  },
  {
    drug: 'spironolactone',
    stage: 'ANY_IMPAIRMENT',
    severity: 'MAJOR',
    message: 'Spironolactone can raise potassium dangerously in renal impairment.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Potassium-sparing diuretics',
  },
];

export const SAFETY_HEPATIC_FLAGS: HepaticFlagRuleSeed[] = [
  {
    drug: 'warfarin',
    stage: 'IMPAIRMENT',
    severity: 'MODERATE',
    message: 'Hepatic impairment can change warfarin response, so bleeding history and monitoring plans need review.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Oral anticoagulants',
  },
  {
    drug: 'carbamazepine',
    stage: 'IMPAIRMENT',
    severity: 'MAJOR',
    message: 'Use carbamazepine cautiously in hepatic impairment and refer if liver disease is active or worsening.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Antiepileptic precautions',
  },
  {
    drug: 'valproate',
    stage: 'IMPAIRMENT',
    severity: 'MAJOR',
    message: 'Valproate is high risk in hepatic impairment and should only continue with specialist direction.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Valproate hepatic precautions',
  },
  {
    drug: 'rifampicin',
    stage: 'IMPAIRMENT',
    severity: 'MAJOR',
    message: 'Rifampicin needs caution in hepatic impairment and symptoms of hepatitis should trigger urgent review.',
    sourceKey: 'WHO_MODEL_FORMULARY_2008',
    sourceSection: 'Rifampicin hepatic precautions',
  },
];
