export type DrugSeed = {
  genericName: string;
  brandNames: string[];
  drugClass: string;
  therapeuticCategory: string;
  standardAdultDose: string;
  frequency: string;
  route: string;
  paediatricDoseFormula?: string;
  elderlyDoseNotes?: string;
  pregnancyCategory: string;
  breastfeedingSafety?: string;
  elderlyCaution?: boolean;
  renalCaution?: boolean;
  hepaticCaution?: boolean;
  ncdHints?: string[];
  clinicianReviewed: boolean;
};

export type InteractionSeed = {
  drugA: string;
  drugB: string;
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CONTRAINDICATED';
  effectSummary: string;
  management: string;
  requiresPicPin?: boolean;
};

export type ContraindicationSeed = {
  drug: string;
  conditionType: 'PREGNANCY' | 'ALLERGY_CLASS' | 'DIAGNOSIS' | 'RENAL' | 'HEPATIC' | 'ELDERLY';
  conditionValue: string;
  severity: 'MODERATE' | 'MAJOR' | 'CONTRAINDICATED';
  message: string;
  requiresPicPin?: boolean;
};

export const DRUG_DATABASE_SEED: DrugSeed[] = [
  {
    genericName: 'amoxicillin',
    brandNames: ['amoxil'],
    drugClass: 'ANTIBIOTIC',
    therapeuticCategory: 'INFECTION',
    standardAdultDose: '500 mg',
    frequency: 'Every 8 hours',
    route: 'ORAL',
    paediatricDoseFormula: '25 mg/kg/day divided every 8 hours',
    pregnancyCategory: 'B',
    breastfeedingSafety: 'Compatible',
    ncdHints: ['Review penicillin allergy history before dispensing'],
    clinicianReviewed: true,
  },
  {
    genericName: 'co-trimoxazole',
    brandNames: ['septrin'],
    drugClass: 'ANTIBIOTIC',
    therapeuticCategory: 'INFECTION',
    standardAdultDose: '960 mg',
    frequency: 'Every 12 hours',
    route: 'ORAL',
    paediatricDoseFormula: '8 mg/kg/day trimethoprim component',
    pregnancyCategory: 'D',
    breastfeedingSafety: 'Use with caution in newborn period',
    renalCaution: true,
    clinicianReviewed: true,
  },
  {
    genericName: 'metformin',
    brandNames: ['glucophage'],
    drugClass: 'ANTIDIABETIC',
    therapeuticCategory: 'DIABETES',
    standardAdultDose: '500 mg',
    frequency: 'Every 12 hours with meals',
    route: 'ORAL',
    paediatricDoseFormula: 'Not routinely recommended under specialist supervision',
    pregnancyCategory: 'B',
    breastfeedingSafety: 'Compatible',
    renalCaution: true,
    ncdHints: ['Monitor blood glucose and counsel on meal timing'],
    clinicianReviewed: true,
  },
  {
    genericName: 'glibenclamide',
    brandNames: ['daonil'],
    drugClass: 'ANTIDIABETIC',
    therapeuticCategory: 'DIABETES',
    standardAdultDose: '5 mg',
    frequency: 'Daily with breakfast',
    route: 'ORAL',
    pregnancyCategory: 'C',
    breastfeedingSafety: 'Avoid if possible',
    elderlyCaution: true,
    clinicianReviewed: true,
  },
  {
    genericName: 'enalapril',
    brandNames: ['renitec'],
    drugClass: 'ANTIHYPERTENSIVE',
    therapeuticCategory: 'HYPERTENSION',
    standardAdultDose: '5 mg',
    frequency: 'Daily',
    route: 'ORAL',
    pregnancyCategory: 'D',
    breastfeedingSafety: 'Use with caution',
    renalCaution: true,
    ncdHints: ['Check cough history and potassium-risk medicines'],
    clinicianReviewed: true,
  },
  {
    genericName: 'losartan',
    brandNames: ['cozaar'],
    drugClass: 'ANTIHYPERTENSIVE',
    therapeuticCategory: 'HYPERTENSION',
    standardAdultDose: '50 mg',
    frequency: 'Daily',
    route: 'ORAL',
    pregnancyCategory: 'D',
    breastfeedingSafety: 'Avoid if possible',
    renalCaution: true,
    ncdHints: ['Avoid dual renin-angiotensin blockade'],
    clinicianReviewed: true,
  },
  {
    genericName: 'furosemide',
    brandNames: ['lasix'],
    drugClass: 'DIURETIC',
    therapeuticCategory: 'HEART_FAILURE',
    standardAdultDose: '40 mg',
    frequency: 'Daily or twice daily',
    route: 'ORAL',
    pregnancyCategory: 'C',
    breastfeedingSafety: 'May reduce milk production',
    renalCaution: true,
    ncdHints: ['Monitor dehydration symptoms and potassium'],
    clinicianReviewed: true,
  },
  {
    genericName: 'spironolactone',
    brandNames: ['aldactone'],
    drugClass: 'DIURETIC',
    therapeuticCategory: 'HEART_FAILURE',
    standardAdultDose: '25 mg',
    frequency: 'Daily',
    route: 'ORAL',
    pregnancyCategory: 'C',
    breastfeedingSafety: 'Use with caution',
    renalCaution: true,
    ncdHints: ['Monitor potassium, especially with ACE inhibitors or ARBs'],
    clinicianReviewed: true,
  },
  {
    genericName: 'warfarin',
    brandNames: ['marevan'],
    drugClass: 'ANTICOAGULANT',
    therapeuticCategory: 'CARDIOVASCULAR',
    standardAdultDose: '5 mg',
    frequency: 'Daily, titrated by INR',
    route: 'ORAL',
    pregnancyCategory: 'X',
    breastfeedingSafety: 'Compatible',
    hepaticCaution: true,
    clinicianReviewed: true,
  },
  {
    genericName: 'diclofenac',
    brandNames: ['voltaren'],
    drugClass: 'NSAID',
    therapeuticCategory: 'PAIN',
    standardAdultDose: '50 mg',
    frequency: 'Every 8 to 12 hours',
    route: 'ORAL',
    pregnancyCategory: 'C',
    breastfeedingSafety: 'Use with caution',
    renalCaution: true,
    clinicianReviewed: true,
  },
  {
    genericName: 'ibuprofen',
    brandNames: ['brufen'],
    drugClass: 'NSAID',
    therapeuticCategory: 'PAIN',
    standardAdultDose: '400 mg',
    frequency: 'Every 8 hours',
    route: 'ORAL',
    paediatricDoseFormula: '10 mg/kg/dose every 8 hours',
    pregnancyCategory: 'C',
    breastfeedingSafety: 'Compatible',
    renalCaution: true,
    clinicianReviewed: true,
  },
  {
    genericName: 'prednisolone',
    brandNames: ['predsol'],
    drugClass: 'CORTICOSTEROID',
    therapeuticCategory: 'INFLAMMATION',
    standardAdultDose: '20 mg',
    frequency: 'Daily',
    route: 'ORAL',
    pregnancyCategory: 'C',
    breastfeedingSafety: 'Use with caution',
    clinicianReviewed: true,
  },
  {
    genericName: 'salbutamol',
    brandNames: ['ventolin'],
    drugClass: 'BRONCHODILATOR',
    therapeuticCategory: 'ASTHMA',
    standardAdultDose: '2 puffs',
    frequency: 'Every 4 to 6 hours when needed',
    route: 'INHALATION',
    paediatricDoseFormula: '1 to 2 puffs when needed',
    pregnancyCategory: 'C',
    breastfeedingSafety: 'Compatible',
    ncdHints: ['Assess inhaler technique and frequency of rescue use'],
    clinicianReviewed: true,
  },
  {
    genericName: 'carbamazepine',
    brandNames: ['tegretol'],
    drugClass: 'ANTIEPILEPTIC',
    therapeuticCategory: 'EPILEPSY',
    standardAdultDose: '200 mg',
    frequency: 'Every 12 hours',
    route: 'ORAL',
    pregnancyCategory: 'D',
    breastfeedingSafety: 'Use with caution',
    hepaticCaution: true,
    ncdHints: ['Do not stop abruptly; review interactions carefully'],
    clinicianReviewed: true,
  },
  {
    genericName: 'valproate',
    brandNames: ['epilim'],
    drugClass: 'ANTIEPILEPTIC',
    therapeuticCategory: 'EPILEPSY',
    standardAdultDose: '500 mg',
    frequency: 'Every 12 hours',
    route: 'ORAL',
    pregnancyCategory: 'X',
    breastfeedingSafety: 'Use with caution',
    hepaticCaution: true,
    clinicianReviewed: true,
  },
  {
    genericName: 'rifampicin',
    brandNames: ['rifadin'],
    drugClass: 'ANTITUBERCULOSIS',
    therapeuticCategory: 'TB',
    standardAdultDose: '600 mg',
    frequency: 'Daily',
    route: 'ORAL',
    pregnancyCategory: 'C',
    breastfeedingSafety: 'Compatible',
    hepaticCaution: true,
    ncdHints: ['Strong enzyme inducer; review interaction risk before dispensing'],
    clinicianReviewed: true,
  },
  {
    genericName: 'dolutegravir',
    brandNames: ['tivicay'],
    drugClass: 'ARV',
    therapeuticCategory: 'ARV',
    standardAdultDose: '50 mg',
    frequency: 'Daily',
    route: 'ORAL',
    pregnancyCategory: 'B',
    breastfeedingSafety: 'Compatible',
    ncdHints: ['Separate from polyvalent cations where possible'],
    clinicianReviewed: true,
  },
  {
    genericName: 'artemether-lumefantrine',
    brandNames: ['coartem'],
    drugClass: 'ANTIMALARIAL',
    therapeuticCategory: 'MALARIA',
    standardAdultDose: '4 tablets',
    frequency: 'Twice daily for 3 days',
    route: 'ORAL',
    pregnancyCategory: 'C',
    breastfeedingSafety: 'Compatible',
    clinicianReviewed: true,
  },
  {
    genericName: 'chlorpheniramine',
    brandNames: ['piriton'],
    drugClass: 'ANTIHISTAMINE',
    therapeuticCategory: 'ALLERGY',
    standardAdultDose: '4 mg',
    frequency: 'Every 8 hours',
    route: 'ORAL',
    pregnancyCategory: 'B',
    breastfeedingSafety: 'Use with caution',
    elderlyCaution: true,
    clinicianReviewed: false,
  },
];

export const DRUG_INTERACTION_SEED: InteractionSeed[] = [
  { drugA: 'warfarin', drugB: 'diclofenac', severity: 'CONTRAINDICATED', effectSummary: 'Severe bleeding risk rises sharply with concurrent NSAID use.', management: 'Avoid combination and refer for safer analgesic selection.', requiresPicPin: true },
  { drugA: 'warfarin', drugB: 'ibuprofen', severity: 'MAJOR', effectSummary: 'GI bleeding risk and INR instability may increase.', management: 'Prefer paracetamol and review for bleeding symptoms.', requiresPicPin: true },
  { drugA: 'warfarin', drugB: 'co-trimoxazole', severity: 'MAJOR', effectSummary: 'INR may rise significantly with bleeding risk.', management: 'Avoid if possible or ensure urgent INR monitoring.', requiresPicPin: true },
  { drugA: 'enalapril', drugB: 'spironolactone', severity: 'MAJOR', effectSummary: 'Hyperkalaemia risk increases when combined.', management: 'Check potassium risk and consider clinical monitoring.', requiresPicPin: true },
  { drugA: 'losartan', drugB: 'spironolactone', severity: 'MAJOR', effectSummary: 'Potassium may rise dangerously with dual blockade.', management: 'Avoid unsupervised combination; confirm prescriber intent.', requiresPicPin: true },
  { drugA: 'enalapril', drugB: 'diclofenac', severity: 'MODERATE', effectSummary: 'Renal perfusion may worsen and antihypertensive effect may reduce.', management: 'Counsel hydration and prefer alternative analgesic when possible.' },
  { drugA: 'metformin', drugB: 'prednisolone', severity: 'MODERATE', effectSummary: 'Steroids may worsen glycaemic control.', management: 'Counsel glucose monitoring and prescriber follow-up.' },
  { drugA: 'glibenclamide', drugB: 'co-trimoxazole', severity: 'MAJOR', effectSummary: 'Hypoglycaemia risk increases.', management: 'Warn about low glucose symptoms and consider safer antibiotic.' , requiresPicPin: true},
  { drugA: 'rifampicin', drugB: 'warfarin', severity: 'MAJOR', effectSummary: 'Warfarin effect may drop due to enzyme induction.', management: 'Needs INR review and clinician monitoring.', requiresPicPin: true },
  { drugA: 'rifampicin', drugB: 'dolutegravir', severity: 'MODERATE', effectSummary: 'Dolutegravir exposure can fall if dose adjustment is not considered.', management: 'Confirm regimen and counsel follow-up.' },
  { drugA: 'valproate', drugB: 'carbamazepine', severity: 'MODERATE', effectSummary: 'Levels can become unstable with neurotoxicity or loss of seizure control.', management: 'Only continue with clear prescriber plan.' },
  { drugA: 'salbutamol', drugB: 'furosemide', severity: 'MODERATE', effectSummary: 'Potassium depletion risk may increase.', management: 'Review muscle weakness or palpitations and monitor if needed.' },
];

export const DRUG_CONTRAINDICATION_SEED: ContraindicationSeed[] = [
  { drug: 'warfarin', conditionType: 'PREGNANCY', conditionValue: 'PREGNANT', severity: 'CONTRAINDICATED', message: 'Warfarin is contraindicated in pregnancy because of fetal harm risk.', requiresPicPin: true },
  { drug: 'valproate', conditionType: 'PREGNANCY', conditionValue: 'PREGNANT', severity: 'CONTRAINDICATED', message: 'Valproate has a high teratogenic risk in pregnancy.', requiresPicPin: true },
  { drug: 'enalapril', conditionType: 'PREGNANCY', conditionValue: 'PREGNANT', severity: 'MAJOR', message: 'ACE inhibitors are unsafe in pregnancy and should be avoided.', requiresPicPin: true },
  { drug: 'losartan', conditionType: 'PREGNANCY', conditionValue: 'PREGNANT', severity: 'MAJOR', message: 'ARBs are unsafe in pregnancy and should be avoided.', requiresPicPin: true },
  { drug: 'co-trimoxazole', conditionType: 'PREGNANCY', conditionValue: 'PREGNANT', severity: 'MAJOR', message: 'Use in pregnancy needs caution because of folate antagonism.', requiresPicPin: true },
  { drug: 'diclofenac', conditionType: 'DIAGNOSIS', conditionValue: 'peptic ulcer disease', severity: 'MAJOR', message: 'NSAIDs may worsen peptic ulcer disease and bleeding risk.', requiresPicPin: true },
  { drug: 'ibuprofen', conditionType: 'DIAGNOSIS', conditionValue: 'heart failure', severity: 'MAJOR', message: 'NSAIDs may worsen fluid retention in heart failure.', requiresPicPin: true },
  { drug: 'metformin', conditionType: 'RENAL', conditionValue: 'SEVERE_IMPAIRMENT', severity: 'MAJOR', message: 'Metformin should be avoided in severe renal impairment because of lactic acidosis risk.', requiresPicPin: true },
  { drug: 'carbamazepine', conditionType: 'HEPATIC', conditionValue: 'IMPAIRMENT', severity: 'MAJOR', message: 'Carbamazepine needs caution in hepatic impairment.', requiresPicPin: true },
  { drug: 'amoxicillin', conditionType: 'ALLERGY_CLASS', conditionValue: 'PENICILLIN', severity: 'CONTRAINDICATED', message: 'Penicillin allergy reported. Avoid amoxicillin.', requiresPicPin: true },
  { drug: 'chlorpheniramine', conditionType: 'ELDERLY', conditionValue: 'TRUE', severity: 'MODERATE', message: 'Sedating antihistamines may cause confusion or falls in older adults.' },
];

export const DIAGNOSIS_DRUG_MAP: Record<string, string[]> = {
  hypertension: ['enalapril', 'losartan', 'furosemide', 'spironolactone'],
  diabetes: ['metformin', 'glibenclamide'],
  epilepsy: ['carbamazepine', 'valproate'],
  asthma: ['salbutamol', 'prednisolone'],
  malaria: ['artemether-lumefantrine'],
  tuberculosis: ['rifampicin'],
  hiv: ['dolutegravir'],
  peptic: ['amoxicillin'],
  infection: ['amoxicillin', 'co-trimoxazole'],
};
