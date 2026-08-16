export type DrugSeed = {
  genericName: string;
  brandNames: string[];
  drugClass: string;
  therapeuticCategory: string;
  /** WHO AWaRe 2023 — global reference classification, not the primary badge. */
  awarClass?: 'ACCESS' | 'WATCH' | 'RESERVE' | null;
  /** Tanzania STG/NEMLIT 2021 §6.2.1-6.2.3 — primary classification for the dispensing badge. */
  tanzaniaAwareClass?: 'ACCESS' | 'WATCH' | 'RESERVE' | null;
  /** Listed in Tanzania's STG/NEMLIT at all, independent of AWaRe grouping. */
  nemlitListed?: boolean;
  /** NEMLIT prescribing-level code (A-S) — facility tier, unrelated to AWaRe. */
  nemlitFacilityLevel?: string | null;
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

// Sourced from the WHO AWaRe classification of antibiotics for evaluation and
// monitoring of use, 2023 (WHO-MHP-HPS-EML-2023.04), cross-checked against the
// 23rd WHO Model List of Essential Medicines. Generic names are normalized to
// match getAwarClass()'s input normalization: "/" and "+" both become " + "
// (true multi-drug combinations); internal hyphens in a single compound's INN
// name (e.g. "fusidic-acid", "cefpodoxime-proxetil") become a plain space.
// A few common Tanzanian-market spelling/trade aliases are added alongside the
// official INN spelling (e.g. "cephalexin" next to "cefalexin") so real
// dispensed-product names still resolve correctly.
const ACCESS_AWARE_ANTIBIOTICS = new Set([
  'amikacin',
  'amoxicillin',
  'amoxicillin + clavulanic acid',
  'ampicillin',
  'ampicillin + sulbactam',
  'azidocillin',
  'bacampicillin',
  'benzathine benzylpenicillin',
  'benzylpenicillin',
  'brodimoprim',
  'cefacetrile',
  'cefadroxil',
  'cefalexin',
  'cephalexin',
  'cefaloridine',
  'cefalotin',
  'cefapirin',
  'cefatrizine',
  'cefazedone',
  'cefazolin',
  'cefradine',
  'cefroxadine',
  'ceftezole',
  'chloramphenicol',
  'clindamycin',
  'clometocillin',
  'cloxacillin',
  'co-trimoxazole',
  'dicloxacillin',
  'doxycycline',
  'epicillin',
  'flucloxacillin',
  'furazidin',
  'gentamicin',
  'hetacillin',
  'mecillinam',
  'metampicillin',
  'meticillin',
  'metronidazole',
  'nafcillin',
  'nifurtoinol',
  'nitrofurantoin',
  'ornidazole',
  'oxacillin',
  'penamecillin',
  'phenoxymethylpenicillin',
  'pivampicillin',
  'pivmecillinam',
  'procaine benzylpenicillin',
  'propicillin',
  'secnidazole',
  'spectinomycin',
  'sulbactam',
  'sulfadiazine',
  'sulfadiazine + tetroxoprim',
  'sulfadiazine + trimethoprim',
  'sulfadimethoxine',
  'sulfadimidine',
  'sulfadimidine + trimethoprim',
  'sulfafurazole',
  'sulfaisodimidine',
  'sulfalene',
  'sulfamazone',
  'sulfamerazine',
  'sulfamerazine + trimethoprim',
  'sulfamethizole',
  'sulfamethoxazole',
  'sulfamethoxazole + trimethoprim',
  'sulfamethoxypyridazine',
  'sulfametomidine',
  'sulfametoxydiazine',
  'sulfametrole + trimethoprim',
  'sulfamoxole',
  'sulfamoxole + trimethoprim',
  'sulfanilamide',
  'sulfaperin',
  'sulfaphenazole',
  'sulfapyridine',
  'sulfathiazole',
  'sulfathiourea',
  'sultamicillin',
  'talampicillin',
  'tetracycline',
  'thiamphenicol',
  'tinidazole',
  'trimethoprim',
]);

const WATCH_AWARE_ANTIBIOTICS = new Set([
  'arbekacin',
  'aspoxicillin',
  'azithromycin',
  'azlocillin',
  'bekanamycin',
  'biapenem',
  'carbenicillin',
  'carindacillin',
  'cefaclor',
  'cefamandole',
  'cefbuperazone',
  'cefcapene pivoxil',
  'cefdinir',
  'cefditoren pivoxil',
  'cefepime',
  'cefetamet pivoxil',
  'cefixime',
  'cefmenoxime',
  'cefmetazole',
  'cefminox',
  'cefodizime',
  'cefonicid',
  'cefoperazone',
  'ceforanide',
  'cefoselis',
  'cefotaxime',
  'cefotetan',
  'cefotiam',
  'cefoxitin',
  'cefozopran',
  'cefpiramide',
  'cefpirome',
  'cefpodoxime proxetil',
  'cefprozil',
  'cefsulodin',
  'ceftazidime',
  'cefteram pivoxil',
  'ceftibuten',
  'ceftizoxime',
  'ceftriaxone',
  'cefuroxime',
  'chlortetracycline',
  'cinoxacin',
  'ciprofloxacin',
  'clarithromycin',
  'clofoctol',
  'clomocycline',
  'delafloxacin',
  'demeclocycline',
  'dibekacin',
  'dirithromycin',
  'doripenem',
  'enoxacin',
  'ertapenem',
  'erythromycin',
  'fidaxomicin',
  'fleroxacin',
  'flomoxef',
  'flumequine',
  'flurithromycin',
  'fosfomycin',
  'fusidic acid',
  'garenoxacin',
  'gatifloxacin',
  'gemifloxacin',
  'grepafloxacin',
  'imipenem + cilastatin',
  'isepamicin',
  'josamycin',
  'kanamycin',
  'lascufloxacin',
  'latamoxef',
  'levofloxacin',
  'levonadifloxacin',
  'lincomycin',
  'lomefloxacin',
  'loracarbef',
  'lymecycline',
  'meropenem',
  'metacycline',
  'mezlocillin',
  'micronomicin',
  'midecamycin',
  'minocycline',
  'miocamycin',
  'moxifloxacin',
  'nemonoxacin',
  'neomycin',
  'netilmicin',
  'norfloxacin',
  'ofloxacin',
  'oleandomycin',
  'oxolinic acid',
  'oxytetracycline',
  'panipenem',
  'pazufloxacin',
  'pefloxacin',
  'penimepicycline',
  'pheneticillin',
  'pipemidic acid',
  'piperacillin',
  'piperacillin + tazobactam',
  'piromidic acid',
  'pristinamycin',
  'prulifloxacin',
  'ribostamycin',
  'rifabutin',
  'rifampicin',
  'rifamycin',
  'rifaximin',
  'rokitamycin',
  'rolitetracycline',
  'rosoxacin',
  'roxithromycin',
  'rufloxacin',
  'sarecycline',
  'sisomicin',
  'sitafloxacin',
  'solithromycin',
  'sparfloxacin',
  'spiramycin',
  'streptoduocin',
  'streptomycin',
  'sulbenicillin',
  'tazobactam',
  'tebipenem',
  'teicoplanin',
  'telithromycin',
  'temafloxacin',
  'temocillin',
  'ticarcillin',
  'tobramycin',
  'tosufloxacin',
  'troleandomycin',
  'trovafloxacin',
  'vancomycin',
]);

const RESERVE_AWARE_ANTIBIOTICS = new Set([
  'aztreonam',
  'carumonam',
  'cefiderocol',
  'ceftaroline fosamil',
  'ceftazidime + avibactam',
  'ceftobiprole medocaril',
  'ceftolozane + tazobactam',
  'colistin',
  'dalbavancin',
  'dalfopristin + quinupristin',
  'daptomycin',
  'eravacycline',
  'faropenem',
  'iclaprim',
  'imipenem + cilastatin + relebactam',
  'lefamulin',
  'linezolid',
  'meropenem + vaborbactam',
  'omadacycline',
  'oritavancin',
  'plazomicin',
  'polymyxin b',
  'tedizolid',
  'telavancin',
  'tigecycline',
]);

function getAwarClass(genericName: string): DrugSeed['awarClass'] {
  const normalized = genericName.trim().toLowerCase();
  // Only "/" and "+" mark a true multi-drug combination (matches the Set
  // entries above); a hyphen is just part of a single compound's name
  // (e.g. "fusidic-acid", "cefpodoxime-proxetil") and becomes a plain space.
  const canonical = normalized.replace(/\s*[/+]\s*/g, ' + ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  const matches = (antibiotic: string) => canonical === antibiotic || canonical.startsWith(`${antibiotic} `);
  if ([...ACCESS_AWARE_ANTIBIOTICS].some(matches)) {
    return 'ACCESS';
  }
  if ([...WATCH_AWARE_ANTIBIOTICS].some(matches)) {
    return 'WATCH';
  }
  if ([...RESERVE_AWARE_ANTIBIOTICS].some(matches)) {
    return 'RESERVE';
  }
  return null;
}

// Tanzania STG/NEMLIT 2021, §6.2.1-6.2.3 "Access/Watch/Reserve Group
// Antibiotics" (National Essential Medicines List, Part I, chapter 6.2,
// pp. 8-9 of that chapter). This is Tanzania's own national classification,
// which does not always match the WHO 2023 global list above — see
// getPrimaryAwareClass() for how the two are reconciled. Scope note: this
// covers only the document's own explicitly-labeled AWaRe groups (6.2.1-
// 6.2.3); §6.2.4 "Antituberculosis" and §6.2.5 "Reserved Second-line MDR-TB"
// are a separate national TB-program reservation concept, not AWaRe, and are
// intentionally excluded here.
const TANZANIA_ACCESS_ANTIBIOTICS = new Set([
  'ampicillin',
  'ampicillin + cloxacillin',
  'amoxicillin',
  'amoxicillin + clavulanic acid',
  'benzathine benzylpenicillin',
  'benzylpenicillin',
  'cephalexin',
  'cloxacillin',
  'doxycycline',
  'erythromycin',
  'flucloxacillin + amoxicillin',
  'flucloxacillin',
  'metronidazole',
  'nitrofurantoin',
  'phenoxymethylpenicillin',
  'tetracycline',
  'oxytetracycline',
]);

const TANZANIA_WATCH_ANTIBIOTICS = new Set([
  'ampicillin + sulbactam',
  'azithromycin',
  'clarithromycin',
  'chloramphenicol',
  'ceftriaxone',
  'ceftriaxone + sulbactam',
  'ciprofloxacin',
  'gentamicin',
  'piperacillin + tazobactam',
  'sulfamethoxazole + trimethoprim',
  'ceftazidime',
  'cefixime',
  'cefuroxime',
]);

const TANZANIA_RESERVE_ANTIBIOTICS = new Set([
  'amikacin',
  'cefepime',
  'clindamycin',
  'colistin',
  'meropenem',
  'vancomycin',
]);

function getTanzaniaAwareClass(genericName: string): DrugSeed['tanzaniaAwareClass'] {
  const normalized = genericName.trim().toLowerCase();
  const canonical = normalized.replace(/\s*[/+]\s*/g, ' + ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  const matches = (antibiotic: string) => canonical === antibiotic || canonical.startsWith(`${antibiotic} `);
  if ([...TANZANIA_ACCESS_ANTIBIOTICS].some(matches)) {
    return 'ACCESS';
  }
  if ([...TANZANIA_WATCH_ANTIBIOTICS].some(matches)) {
    return 'WATCH';
  }
  if ([...TANZANIA_RESERVE_ANTIBIOTICS].some(matches)) {
    return 'RESERVE';
  }
  return null;
}

/** True if the Tanzania STG/NEMLIT 2021 §6.2 antibacterial chapter lists this drug at all. */
function isNemlitListedAntibiotic(genericName: string): boolean {
  return getTanzaniaAwareClass(genericName) !== null;
}

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

const CORE_DRUG_DATABASE_SEED: DrugSeed[] = [
  {
    genericName: 'paracetamol',
    brandNames: ['panadol'],
    drugClass: 'ANALGESIC',
    therapeuticCategory: 'PAIN',
    standardAdultDose: '1000 mg',
    frequency: 'Every 6 hours when needed',
    route: 'ORAL',
    paediatricDoseFormula: '15 mg/kg/dose every 6 hours',
    pregnancyCategory: 'B',
    breastfeedingSafety: 'Compatible',
    clinicianReviewed: true,
  },
  {
    genericName: 'amoxicillin',
    brandNames: ['amoxil'],
    drugClass: 'ANTIBIOTIC',
    therapeuticCategory: 'INFECTION',
    awarClass: 'ACCESS',
    tanzaniaAwareClass: 'ACCESS',
    nemlitListed: true,
    standardAdultDose: '500 mg',
    frequency: 'Every 8 hours',
    route: 'ORAL',
    paediatricDoseFormula: '25-50 mg/kg/day divided every 8 hours',
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
    // WHO classifies sulfamethoxazole+trimethoprim as Access; Tanzania's own
    // STG/NEMLIT 2021 classifies it as Watch. Tanzania's classification is
    // primary — see enrichProductsWithAwarClass() in inventory.service.ts.
    awarClass: 'ACCESS',
    tanzaniaAwareClass: 'WATCH',
    nemlitListed: true,
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

const SUPPLEMENTAL_FORMULARY_GROUPS: Array<{
  drugClass: string;
  therapeuticCategory: string;
  names: string[];
}> = [
  {
    drugClass: 'ANTIBIOTIC',
    therapeuticCategory: 'INFECTION',
    names: [
      'ampicillin', 'amoxicillin + clavulanic acid', 'cloxacillin', 'benzylpenicillin', 'benzathine benzylpenicillin',
      'procaine benzylpenicillin', 'flucloxacillin', 'phenoxymethylpenicillin', 'ceftriaxone', 'cefixime',
      'cefotaxime', 'ceftazidime', 'cephalexin', 'cefuroxime', 'azithromycin', 'erythromycin', 'clarithromycin', 'ciprofloxacin',
      'levofloxacin', 'doxycycline', 'tetracycline', 'nitrofurantoin', 'clindamycin', 'metronidazole',
      'tinidazole', 'gentamicin', 'amikacin', 'chloramphenicol', 'piperacillin + tazobactam', 'linezolid',
      'meropenem', 'imipenem + cilastatin', 'vancomycin', 'colistin',
    ],
  },
  {
    drugClass: 'CARDIOVASCULAR',
    therapeuticCategory: 'CARDIOVASCULAR',
    names: [
      'amlodipine', 'nifedipine', 'atenolol', 'bisoprolol', 'propranolol', 'carvedilol', 'hydrochlorothiazide',
      'indapamide', 'bendroflumethiazide', 'methyldopa', 'hydralazine', 'lisinopril', 'captopril', 'ramipril',
      'valsartan', 'telmisartan', 'irbesartan', 'diltiazem', 'verapamil', 'isosorbide dinitrate', 'nitroglycerin',
      'atorvastatin', 'simvastatin', 'pravastatin', 'clopidogrel',
    ],
  },
  {
    drugClass: 'GASTROINTESTINAL',
    therapeuticCategory: 'GASTROINTESTINAL',
    names: [
      'omeprazole', 'esomeprazole', 'pantoprazole', 'lansoprazole', 'famotidine', 'cimetidine', 'sucralfate',
      'aluminium hydroxide', 'magnesium trisilicate', 'domperidone', 'metoclopramide', 'ondansetron',
      'hyoscine butylbromide', 'loperamide', 'lactulose', 'bisacodyl', 'senna', 'glycerin suppository',
      'oral rehydration salts', 'zinc sulfate',
    ],
  },
  {
    drugClass: 'ENDOCRINE',
    therapeuticCategory: 'ENDOCRINE',
    names: [
      'insulin soluble', 'insulin isophane', 'insulin premix 70/30', 'gliclazide', 'glimepiride', 'pioglitazone',
      'sitagliptin', 'levothyroxine', 'carbimazole', 'propylthiouracil', 'hydrocortisone', 'dexamethasone',
      'methylprednisolone', 'calcium carbonate', 'vitamin d3',
    ],
  },
  {
    drugClass: 'RESPIRATORY',
    therapeuticCategory: 'RESPIRATORY',
    names: [
      'beclometasone inhaler', 'budesonide inhaler', 'ipratropium bromide', 'aminophylline', 'theophylline',
      'montelukast', 'cetirizine', 'loratadine', 'fexofenadine', 'promethazine', 'dextromethorphan',
      'guaifenesin', 'bromhexine', 'xylometazoline', 'oxymetazoline',
    ],
  },
  {
    drugClass: 'ANALGESIC',
    therapeuticCategory: 'PAIN',
    names: [
      'aspirin', 'naproxen', 'ketoprofen', 'piroxicam', 'meloxicam', 'celecoxib', 'tramadol', 'codeine',
      'morphine', 'pethidine', 'diclofenac gel', 'capsaicin cream', 'allopurinol', 'colchicine', 'baclofen',
    ],
  },
  {
    drugClass: 'NEUROLOGY',
    therapeuticCategory: 'NEUROLOGY',
    names: [
      'phenytoin', 'phenobarbital', 'lamotrigine', 'levetiracetam', 'gabapentin', 'pregabalin', 'amitriptyline',
      'nortriptyline', 'fluoxetine', 'sertraline', 'diazepam', 'lorazepam', 'haloperidol', 'chlorpromazine',
      'risperidone', 'olanzapine', 'quetiapine', 'trihexyphenidyl', 'donepezil', 'memantine',
    ],
  },
  {
    drugClass: 'ANTI-INFECTIVE',
    therapeuticCategory: 'INFECTIOUS_DISEASE',
    names: [
      'acyclovir', 'fluconazole', 'ketoconazole', 'clotrimazole', 'miconazole', 'nystatin', 'albendazole',
      'mebendazole', 'praziquantel', 'ivermectin', 'artesunate', 'quinine', 'atovaquone-proguanil',
      'tenofovir', 'lamivudine',
    ],
  },
  {
    drugClass: 'DERMATOLOGY',
    therapeuticCategory: 'DERMATOLOGY',
    names: [
      'hydrocortisone cream', 'betamethasone cream', 'clobetasol cream', 'mupirocin ointment', 'fusidic acid cream',
      'benzyl benzoate', 'permethrin', 'calamine lotion', 'silver sulfadiazine', 'zinc oxide', 'salicylic acid',
      'coal tar shampoo', 'ketoconazole shampoo', 'terbinafine cream', 'clindamycin gel',
    ],
  },
  {
    drugClass: 'OPHTHALMIC',
    therapeuticCategory: 'EYE_EAR_NOSE',
    names: [
      'chloramphenicol eye drops', 'ciprofloxacin eye drops', 'tetracycline eye ointment', 'timolol eye drops',
      'latanoprost eye drops', 'artificial tears', 'sodium cromoglycate eye drops', 'gentamicin ear drops',
      'ciprofloxacin ear drops', 'acetic acid ear drops',
    ],
  },
  {
    drugClass: 'WOMENS_HEALTH',
    therapeuticCategory: 'OBGYN',
    names: [
      'ferrous sulfate', 'folic acid', 'combined oral contraceptive', 'progesterone-only pill', 'medroxyprogesterone injection',
      'levonorgestrel emergency contraception', 'misoprostol', 'oxytocin', 'tranexamic acid', 'methylergometrine',
    ],
  },
  {
    drugClass: 'VITAMIN',
    therapeuticCategory: 'SUPPLEMENTS',
    names: [
      'vitamin a', 'vitamin b complex', 'vitamin c', 'vitamin e', 'zinc gluconate', 'magnesium sulfate',
      'potassium chloride', 'multivitamin syrup', 'oral nutrition supplement', 'calcium with vitamin d',
      'sodium bicarbonate', 'activated charcoal', 'povidone iodine', 'hydrogen peroxide', 'normal saline',
      'ringer lactate', 'dextrose 5 percent', 'dextrose saline', 'water for injection', 'lignocaine',
      'lignocaine with adrenaline', 'adrenaline', 'atropine', 'furosemide injection', 'ceftriaxone injection',
    ],
  },
];

const SUPPLEMENTAL_FORMULARY_SEED: DrugSeed[] = SUPPLEMENTAL_FORMULARY_GROUPS.flatMap((group) =>
  group.names.map((genericName) => ({
    genericName,
    brandNames: [],
    drugClass: group.drugClass,
    therapeuticCategory: group.therapeuticCategory,
    awarClass: getAwarClass(genericName),
    tanzaniaAwareClass: getTanzaniaAwareClass(genericName),
    nemlitListed: isNemlitListedAntibiotic(genericName),
    standardAdultDose: 'See standard Tanzanian formulary guidance',
    frequency: 'Use standard dosing guidance',
    route: genericName.includes('cream') || genericName.includes('gel') || genericName.includes('ointment') || genericName.includes('lotion') || genericName.includes('shampoo')
      ? 'TOPICAL'
      : genericName.includes('drops')
        ? 'TOPICAL'
        : genericName.includes('injection') || genericName.includes('water for injection')
          ? 'INJECTION'
          : genericName.includes('inhaler')
            ? 'INHALATION'
            : 'ORAL',
    pregnancyCategory: 'NA',
    clinicianReviewed: false,
  })),
);

// Tanzania STG/NEMLIT 2021, Part I (National Essential Medicines List),
// chapters 1-28 — full catalogue extraction beyond the antibacterial section
// already covered above. Mechanical bulk extraction from the source PDF table
// (name | dosage form & strength | prescribing-level code); NOT clinically
// reviewed per-drug — clinicianReviewed is deliberately false throughout, same
// convention as SUPPLEMENTAL_FORMULARY_SEED. Dosing regimens are not part of
// NEMLIT Part I (that lives in the disease-based Part II STG) so
// standardAdultDose/frequency are placeholders pending that follow-on pass.
// Route is inferred from the formulation text (best-effort, not authoritative).
const NEMLIT_FULL_CATALOGUE_GROUPS: Array<{
  drugClass: string;
  therapeuticCategory: string;
  entries: Array<{ genericName: string; nemlitFacilityLevel: string; route: string }>;
}> = [
  // Ch.1 — Anaesthetics, Preoperative Medicines and Medical Gases
  {
    drugClass: 'ANAESTHETIC',
    therapeuticCategory: 'ANAESTHESIA',
    entries: [
      { genericName: 'atracurium', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'bupivacaine', nemlitFacilityLevel: 'C', route: 'INJECTION' },
      { genericName: 'calcium chloride', nemlitFacilityLevel: 'D', route: 'INJECTION' },
      { genericName: 'clonidine', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'dexmedetomidine', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'ephedrine', nemlitFacilityLevel: 'B', route: 'INJECTION' },
      { genericName: 'etomidate', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'flumazenil', nemlitFacilityLevel: 'A', route: 'INJECTION' },
      { genericName: 'glycopyrrolate', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'halothane', nemlitFacilityLevel: 'B', route: 'INHALATION' },
      { genericName: 'isoflurane', nemlitFacilityLevel: 'B', route: 'INHALATION' },
      { genericName: 'ketamine', nemlitFacilityLevel: 'B', route: 'INJECTION' },
      { genericName: 'labetalol', nemlitFacilityLevel: 'C', route: 'INJECTION' },
      { genericName: 'lidocaine', nemlitFacilityLevel: 'A', route: 'INJECTION' },
      { genericName: 'lidocaine in dextrose', nemlitFacilityLevel: 'B', route: 'INJECTION' },
      { genericName: 'lidoocaine + epinephrine (adrenaline)', nemlitFacilityLevel: 'A', route: 'INJECTION' },
      { genericName: 'lipid', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'metaraminol', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'midazolam', nemlitFacilityLevel: 'D', route: 'INJECTION' },
      { genericName: 'neostigmine', nemlitFacilityLevel: 'B', route: 'INJECTION' },
      { genericName: 'nitrous oxide', nemlitFacilityLevel: 'C', route: 'INHALATION' },
      { genericName: 'noradrenaline', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'oxygen', nemlitFacilityLevel: 'B', route: 'INHALATION' },
      { genericName: 'pancuronium', nemlitFacilityLevel: 'C', route: 'INJECTION' },
      { genericName: 'phenylephrine', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'propofol', nemlitFacilityLevel: 'D', route: 'INJECTION' },
      { genericName: 'rocuronium', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'sevoflurane', nemlitFacilityLevel: 'S', route: 'INHALATION' },
      { genericName: 'sodium citrate', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'sugammadex', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'suxamethonium', nemlitFacilityLevel: 'C', route: 'INJECTION' },
      { genericName: 'thiopental', nemlitFacilityLevel: 'C', route: 'INJECTION' },
      { genericName: 'tizanidine', nemlitFacilityLevel: 'S', route: 'ORAL' },
    ],
  },
  // Ch.2 — Medicines for Pain and Palliative Care
  {
    drugClass: 'ANALGESIC',
    therapeuticCategory: 'PAIN_PALLIATIVE_CARE',
    entries: [
      { genericName: 'acetylsalicylic acid', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'dexketoprofen', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'fentanyl', nemlitFacilityLevel: 'S', route: 'TOPICAL' },
      { genericName: 'hyoscine butyl bromide', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'imipramine', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'mefenamic acid', nemlitFacilityLevel: 'B', route: 'ORAL' },
      { genericName: 'methadone', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'naloxone', nemlitFacilityLevel: 'B', route: 'INJECTION' },
      { genericName: 'sulfasalazine tablets 500mg', nemlitFacilityLevel: 'D', route: 'ORAL' },
    ],
  },
  // Ch.3 — Anti-allergies and Medicines Used in Anaphylaxis
  {
    drugClass: 'ANTIALLERGIC',
    therapeuticCategory: 'ALLERGY_ANAPHYLAXIS',
    entries: [
      { genericName: 'betahistine', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'bethametasone', nemlitFacilityLevel: 'D', route: 'INJECTION' },
      { genericName: 'cetirizine oral', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'desloratadine', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'epinephrine (adrenaline)', nemlitFacilityLevel: 'A', route: 'INJECTION' },
    ],
  },
  // Ch.4 — Antidotes and Other Substances Used in Poisonings
  {
    drugClass: 'ANTIDOTE',
    therapeuticCategory: 'POISONING',
    entries: [
      { genericName: 'acetylcysteine', nemlitFacilityLevel: 'C', route: 'INJECTION' },
      { genericName: 'calcium gluconate', nemlitFacilityLevel: 'A', route: 'INJECTION' },
      { genericName: 'charcoal, activated', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'd penicillamine', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'deferoxamine', nemlitFacilityLevel: 'D', route: 'INJECTION' },
      { genericName: 'dimercaprol injectable 50mg + ml in 2ml', nemlitFacilityLevel: 'D', route: 'INJECTION' },
      { genericName: 'ethylenediaminetetra acetic acid (edta)', nemlitFacilityLevel: 'D', route: 'INJECTION' },
      { genericName: 'pralidoxime', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'sodium bicarbonate 8.4%', nemlitFacilityLevel: 'C', route: 'INJECTION' },
      { genericName: 'succimer', nemlitFacilityLevel: 'D', route: 'ORAL' },
    ],
  },
  // Ch.5 — Anticonvulsants and Antiepileptics
  {
    drugClass: 'ANTICONVULSANT',
    therapeuticCategory: 'EPILEPSY',
    entries: [
      { genericName: 'clonazepam', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'injection 5mg + ml in', nemlitFacilityLevel: 'A', route: 'INJECTION' },
      { genericName: 'sodium valproate', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'tablet ( as s odium) 30mg, 100mg', nemlitFacilityLevel: 'A', route: 'ORAL' },
    ],
  },
  // Ch.6 — Anti-Infective Medicines (non-antibacterial)
  {
    drugClass: 'ANTIBIOTIC',
    therapeuticCategory: 'INFECTION',
    entries: [
      { genericName: 'amphotericin', nemlitFacilityLevel: 'B', route: 'ORAL' },
      { genericName: 'ampicilin + cloxacillin', nemlitFacilityLevel: 'B', route: 'INJECTION' },
      { genericName: 'ampicillin + sulbactum', nemlitFacilityLevel: 'C', route: 'INJECTION' },
      { genericName: 'artemether', nemlitFacilityLevel: 'B', route: 'INJECTION' },
      { genericName: 'artemether + lumefantrine (alu)', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'atazanavir + ritonavir', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'bedaquiline', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'benzathine benzyl penicillin', nemlitFacilityLevel: 'A', route: 'INJECTION' },
      { genericName: 'benzyl penicillin', nemlitFacilityLevel: 'A', route: 'INJECTION' },
      { genericName: 'capromycine', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'cefepime', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'ceftriaxone+sulbactam', nemlitFacilityLevel: 'D', route: 'INJECTION' },
      { genericName: 'chloramphenicol oily', nemlitFacilityLevel: 'B', route: 'INJECTION' },
      { genericName: 'clofazimine', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'clotrimazole clotrimazole vaginal', nemlitFacilityLevel: 'A', route: 'TOPICAL' },
      { genericName: 'dapsone', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'dapsone dapsone', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'darunavir', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'delamanide', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'dihydroartemisinin+piperaquine (dpq)', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'ethambutol', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'ethambutol+isoniazide', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'ethionamide', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'flucloxacillin + amoxicillin', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'fluconazole iv', nemlitFacilityLevel: 'C', route: 'INJECTION' },
      { genericName: 'flucytosine isotonic', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'griseofulvin', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'injection (as phosphate) 150mg + ml in 2ml ampule', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'injection (i.v) 5mg + ml in 100ml bottle;', nemlitFacilityLevel: 'B', route: 'INJECTION' },
      { genericName: 'injection 500mg + vial', nemlitFacilityLevel: 'D', route: 'INJECTION' },
      { genericName: 'intestinal anthelminthics albendazole', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'isoniazid', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'itraconazole', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'kanamycin', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'lamivudine (3tc) oral', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'lopinavir + ritonavir (lpv + r)', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'miconazole miconazole oral', nemlitFacilityLevel: 'C', route: 'TOPICAL' },
      { genericName: 'moxifloxacin', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'nd 250mg am oxicillin + 62.5mg cl avulanic acid + 5ml;', nemlitFacilityLevel: 'B', route: 'ORAL' },
      { genericName: 'nevirapine (nvp) oral', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'oral', nemlitFacilityLevel: 'D', route: 'INJECTION' },
      { genericName: 'oxytetracycline eye', nemlitFacilityLevel: 'A', route: 'TOPICAL' },
      { genericName: 'powder for', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'primaquine', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'pyrazinamide', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'pyridoxine', nemlitFacilityLevel: 'B', route: 'ORAL' },
      { genericName: 'pyrimethamine 25mg', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'ribavirin', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'rifampicin+isoniazid', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'rifampicin+isoniazid+pyrazinamid e+ethambutol', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'ritonavir oral', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'sofosbuvir', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'sulfadiazine 500mg', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'sulfadoxine + pyrimethamine', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'sulfamethoxazole + triemethoprim', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'sulphamethoxazole + trimetoprim', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'tablet + capsule 150mg, 200mg', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'tablet 250mg, 500mg', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'tenofovir + emtricitabine', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'tenofovir + emtricitabine + efavirenz', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'tenofovir + lamivudine + dolutegravir', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'tenofovir + lamivudine + efavirenz', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'tenofovir disoproxil fumarate (tdf)', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'terbinafine', nemlitFacilityLevel: 'C', route: 'TOPICAL' },
      { genericName: 'tuberculosis (mdr tb) cycloserine', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'valganciclovir', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'zidovudine + lamivudine', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'zidovudine + lamivudine + nevirapine', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'zidovuine (azt)', nemlitFacilityLevel: 'A', route: 'ORAL' },
    ],
  },
  // Ch.7 — Antimigraine Medicines
  {
    drugClass: 'ANTIMIGRAINE',
    therapeuticCategory: 'MIGRAINE',
    entries: [
      { genericName: 'ergotamine tartarate', nemlitFacilityLevel: 'C', route: 'ORAL' },
    ],
  },
  // Ch.8 — Antineoplastics, Immunosuppressives and Immunomodulators
  {
    drugClass: 'ONCOLOGY',
    therapeuticCategory: 'CANCER_IMMUNOSUPPRESSION',
    entries: [
      { genericName: 'abiraterone acetate', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'actinomycin', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'alfuzocin', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'anastrazole', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'antithymocite globulin (atg) (rabbit + horse)', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'azacitadine', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'azathioprine', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'bicalutamide', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'bleomycin', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'bortezomib', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'capecitabine', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'carboplatin', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'chlorambucil', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'cisplatin', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'cyclophosphamide', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'cyclosporine', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'dacarbazine', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'danazol', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'docetaxel concentrate for', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'doxorubicin', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'dutasteride', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'etoposide', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'everolimus', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'febuxostat', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'filgrastim', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'finasteride', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'folinic acid', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'gemcitabine', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'goserelin', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'hydroxychloroquine', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'hydroxyurea', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'ifosfamide', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'imatinib', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'injection: 250mg; 500mg; 000mg;', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'irinotecan', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'lenalidomide', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'leucovorin', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'mesna', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'methotrexate', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'mycophenolate mofetil', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'mycophenolate sodium', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'oxaliplatin', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'paclitaxel', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'rituximab', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'sirolimus', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'tacrolimus', nemlitFacilityLevel: 'S', route: 'TOPICAL' },
      { genericName: 'tamoxifen', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'tamsulosin', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'temozolomide', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'thalidomide', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'trastuzumab', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'vinblastine', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'vincristine', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'zolendronic acid', nemlitFacilityLevel: 'S', route: 'INJECTION' },
    ],
  },
  // Ch.9 — Hormones and Antihormones
  {
    drugClass: 'HORMONE',
    therapeuticCategory: 'ENDOCRINE',
    entries: [
      { genericName: 'betamethasone', nemlitFacilityLevel: 'C', route: 'INJECTION' },
      { genericName: 'clomiphene', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'dydrogestrone 10mg', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'ethinylestradiol desogestrel', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'ethinylestradiol levonorgestrel', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'ethinyloestradiol', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'ethinyloestradiol + norgestrel', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'etonorgestrel implant 68mg', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'implant 75mg', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'injection (as sodium phosphate) 10mg + ml', nemlitFacilityLevel: 'B', route: 'INJECTION' },
      { genericName: 'iodized oil', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'levonorgestrel', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'medroxyprogesterone', nemlitFacilityLevel: 'A', route: 'INJECTION' },
      { genericName: 'methylprednisolone 1000 mg', nemlitFacilityLevel: 'D', route: 'INJECTION' },
      { genericName: 'metyrapone', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'norethisterone', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'potassium iodide', nemlitFacilityLevel: 'B', route: 'ORAL' },
      { genericName: 'testosterone', nemlitFacilityLevel: 'S', route: 'TOPICAL' },
      { genericName: 'triamcinolone', nemlitFacilityLevel: 'S', route: 'TOPICAL' },
    ],
  },
  // Ch.10 — Antiparkinsonism Medicines and Antiprolactinaemia
  {
    drugClass: 'ANTIPARKINSON',
    therapeuticCategory: 'NEUROLOGICAL',
    entries: [
      { genericName: 'benzhexol', nemlitFacilityLevel: 'B', route: 'ORAL' },
      { genericName: 'bromocriptine', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'cabergoline', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'levodopa + carbidopa', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'selegiline', nemlitFacilityLevel: 'S', route: 'ORAL' },
    ],
  },
  // Ch.11 — Medicines Affecting the Blood
  {
    drugClass: 'HAEMATOLOGIC',
    therapeuticCategory: 'BLOOD_DISORDERS',
    entries: [
      { genericName: 'albumin', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'anti rabies immunoglobulin', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'anti tetanus immunoglobulin', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'desmopressin (move to anti diuretics)', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'eltrombopag', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'erythropoietin 2000 unit + ml; 4000 units + ml', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'etamsylate', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'factor ix concentrate factor ix concentrate500 iu', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'factor viii concentrate factor viii concentrate 500iu', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'ferrous 200mg ( sulfate or as fumarate)', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'ferrous salts oral', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'folic acid folic acid', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'fresh frozen plasma (ffp) fresh frozen plasma (ffp) bags', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'human immunoglobulin g', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'hydroxocobalamin (vitamin b 12)', nemlitFacilityLevel: 'C', route: 'INJECTION' },
      { genericName: 'low molecular weight heparin', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'phytomenadione (vit k1)', nemlitFacilityLevel: 'B', route: 'INJECTION' },
      { genericName: 'platelets platelets', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'polygeline polygeline iv', nemlitFacilityLevel: 'S', route: 'TOPICAL' },
      { genericName: 'protamine sulfate', nemlitFacilityLevel: 'B', route: 'INJECTION' },
      { genericName: 'red blood cells. packed red blood cells.', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'rivaroxaban', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'unfractionated heparin sodium', nemlitFacilityLevel: 'B', route: 'INJECTION' },
      { genericName: 'whole blood whole blood', nemlitFacilityLevel: 'B', route: 'ORAL' },
    ],
  },
  // Ch.13 — Cardiovascular Medicines
  {
    drugClass: 'CARDIOVASCULAR',
    therapeuticCategory: 'CARDIOVASCULAR',
    entries: [
      { genericName: 'adenosine', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'alteplase', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'amiodarone', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'bendrofluazide', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'candesartan', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'digoxin', nemlitFacilityLevel: 'D', route: 'INJECTION' },
      { genericName: 'dobutamine', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'dopamine', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'doxazosin', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'eplerenone', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'esmolol', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'fenofibrate', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'glyceryl trinitrate', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'injection 1mg + ml', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'ivabradine', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'mannitol injectable', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'metolazone', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'metoprolol', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'nimodipine', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'prasugrel', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'rosuvastatin', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'streptokinase', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'tablet 0.25mg', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'ticagrelor', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'torsemide', nemlitFacilityLevel: 'S', route: 'ORAL' },
    ],
  },
  // Ch.14 — Dermatological Medicines
  {
    drugClass: 'DERMATOLOGICAL',
    therapeuticCategory: 'SKIN',
    entries: [
      { genericName: 'all trans retinoic acid (atra)', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'antiacid mixture antiacid mixture containing magnesium trisilicate + aluminium hydroxide and simethicone', nemlitFacilityLevel: 'B', route: 'ORAL' },
      { genericName: 'benzoic acid compound (whitfield ointment)', nemlitFacilityLevel: 'A', route: 'TOPICAL' },
      { genericName: 'benzoyl peroxide', nemlitFacilityLevel: 'A', route: 'TOPICAL' },
      { genericName: 'bismuth subgallate', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'calamine', nemlitFacilityLevel: 'A', route: 'TOPICAL' },
      { genericName: 'cholestyramine cholestyramine', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'clobetasol propionate', nemlitFacilityLevel: 'D', route: 'TOPICAL' },
      { genericName: 'coal tar', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'doxylamine', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'fludrocortisone tablets 0.1 mg (as acetate)', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'fusidic acid', nemlitFacilityLevel: 'C', route: 'TOPICAL' },
      { genericName: 'gentian violet 1%, aqueous', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'hydrocortisone hydrocortisone', nemlitFacilityLevel: 'A', route: 'TOPICAL' },
      { genericName: 'inflixmab', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'isotretinoin 0.05%', nemlitFacilityLevel: 'S', route: 'TOPICAL' },
      { genericName: 'lindane', nemlitFacilityLevel: 'C', route: 'TOPICAL' },
      { genericName: 'mebeverine', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'mesalazine', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'mometasone furoate', nemlitFacilityLevel: 'S', route: 'TOPICAL' },
      { genericName: 'mupirocin', nemlitFacilityLevel: 'C', route: 'TOPICAL' },
      { genericName: 'octreotide', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'pancreatic supplement enzyme', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'podophyllin', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'potassium permanganate potassium permanganate', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'salicylic acid topical', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'silver nitrate pencil silver nitrate pencil', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'silver sulfadiazine 1%', nemlitFacilityLevel: 'A', route: 'TOPICAL' },
      { genericName: 'sunscreen protecting factor (spf 30+) sun screen', nemlitFacilityLevel: 'C', route: 'TOPICAL' },
      { genericName: 'terlipressin 0.12mg + ml', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'tretinoin', nemlitFacilityLevel: 'S', route: 'TOPICAL' },
      { genericName: 'ursodeoxycholic acid', nemlitFacilityLevel: 'S', route: 'ORAL' },
    ],
  },
  // Ch.15 — Gastro-Intestinal Medicines
  {
    drugClass: 'GASTROINTESTINAL',
    therapeuticCategory: 'GI',
    entries: [
      { genericName: 'oral rehydration salts (ors) low osmolality', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'zinc', nemlitFacilityLevel: 'A', route: 'ORAL' },
    ],
  },
  // Ch.16 — Insulin and Medicines Used for Diabetes and Related Disorders
  {
    drugClass: 'ANTIDIABETIC',
    therapeuticCategory: 'DIABETES',
    entries: [
      { genericName: 'empagliflozin', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'glucagon', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'insulin rapid acting;', nemlitFacilityLevel: 'A', route: 'INJECTION' },
      { genericName: 'intermediate acting;', nemlitFacilityLevel: 'A', route: 'INJECTION' },
      { genericName: 'long acting;', nemlitFacilityLevel: 'A', route: 'INJECTION' },
      { genericName: 'phenoxybenzamine', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'pioglitazone 15mg', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'pre mixed insulin;', nemlitFacilityLevel: 'S', route: 'INJECTION' },
    ],
  },
  // Ch.17 — Immunologicals
  {
    drugClass: 'IMMUNOLOGICAL',
    therapeuticCategory: 'IMMUNIZATION',
    entries: [
      { genericName: 'anti d immunoglobulin', nemlitFacilityLevel: 'C', route: 'INJECTION' },
      { genericName: 'antirabies immune globulin', nemlitFacilityLevel: 'A', route: 'INJECTION' },
      { genericName: 'bcg vaccine', nemlitFacilityLevel: 'A', route: 'INJECTION' },
      { genericName: 'central african type)', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'diphtheria antitoxin', nemlitFacilityLevel: 'A', route: 'INJECTION' },
      { genericName: 'dpt hepb hib vaccine diphtheria, tetanus, pertussis, hepatitis b and haemophilus influenza vaccine in vials of 10 doses', nemlitFacilityLevel: 'A', route: 'INJECTION' },
      { genericName: 'hepatitis', nemlitFacilityLevel: 'B', route: 'ORAL' },
      { genericName: 'human diploid cell rabies freeze dried rabies vaccine human diploid cell rabies freeze dried rabies vaccine', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'inactivated polio vaccine (ipv) inactivated polio vaccine (ipv)', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'injection 10mcg + ml, 20mcg + ml, 40mcg + ml', nemlitFacilityLevel: 'B', route: 'INJECTION' },
      { genericName: 'iu + ml,250 iu + 2.5ml', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'l ornithine l aspartate', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'l per dose', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'local anaesthetic + astringent and anti inflammatory suppositories + ointment (zinc oxide 25mg + bismuth oxide+ bismuth subgallate 59 mg + balsam peru)', nemlitFacilityLevel: 'B', route: 'TOPICAL' },
      { genericName: 'measles rubella vaccine measles rubella vaccine', nemlitFacilityLevel: 'A', route: 'INJECTION' },
      { genericName: 'meningitis vaccine', nemlitFacilityLevel: 'C', route: 'INJECTION' },
      { genericName: 'oral poliomyelitis vaccine (opv) oral poliomyelitis vaccine (live attenuated) oral', nemlitFacilityLevel: 'A', route: 'INJECTION' },
      { genericName: 'pneumococcal conjugate vaccine (pcv13) pneumococcal conjugate vaccine (pcv13) 4 doses', nemlitFacilityLevel: 'A', route: 'INJECTION' },
      { genericName: 'pneumococcal polysaccharide vaccine (ppsv 23)', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'rota vaccine rota vaccine oral', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'tetanus (toxoid) vaccine tetanus (toxoid) vaccine', nemlitFacilityLevel: 'A', route: 'INJECTION' },
      { genericName: 'yellow fever vaccine 0.5ml dose', nemlitFacilityLevel: 'C', route: 'ORAL' },
    ],
  },
  // Ch.18 — Muscle Relaxants (Peripherally-Acting) and Cholinesterase Inhibitors
  {
    drugClass: 'MUSCLE_RELAXANT',
    therapeuticCategory: 'NEUROMUSCULAR',
    entries: [
      { genericName: 'acetazolamide', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'acetylcholine', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'amethocaine eye', nemlitFacilityLevel: 'A', route: 'TOPICAL' },
      { genericName: 'betaxolol', nemlitFacilityLevel: 'D', route: 'TOPICAL' },
      { genericName: 'chlorhexidine', nemlitFacilityLevel: 'S', route: 'TOPICAL' },
      { genericName: 'd dorzolamide', nemlitFacilityLevel: 'S', route: 'TOPICAL' },
      { genericName: 'dexamethasone +gentamicin', nemlitFacilityLevel: 'C', route: 'TOPICAL' },
      { genericName: 'dexamethasone eye', nemlitFacilityLevel: 'D', route: 'TOPICAL' },
      { genericName: 'dexamethasone+chloramphenicol', nemlitFacilityLevel: 'C', route: 'TOPICAL' },
      { genericName: 'econazole', nemlitFacilityLevel: 'S', route: 'TOPICAL' },
      { genericName: 'hydroxypropylmethylcellulose', nemlitFacilityLevel: 'C', route: 'TOPICAL' },
      { genericName: 'iodine eye', nemlitFacilityLevel: 'A', route: 'TOPICAL' },
      { genericName: 'latanoprost', nemlitFacilityLevel: 'D', route: 'TOPICAL' },
      { genericName: 'methylprednisolone acetate', nemlitFacilityLevel: 'D', route: 'INJECTION' },
      { genericName: 'natamycin', nemlitFacilityLevel: 'S', route: 'TOPICAL' },
      { genericName: 'ofloxacin', nemlitFacilityLevel: 'D', route: 'TOPICAL' },
      { genericName: 'oxytetracycline t eye', nemlitFacilityLevel: 'A', route: 'TOPICAL' },
      { genericName: 'pilocarpine hydrochloride', nemlitFacilityLevel: 'C', route: 'TOPICAL' },
      { genericName: 'prednisolone eye', nemlitFacilityLevel: 'D', route: 'TOPICAL' },
      { genericName: 'prostamide bimatroprost', nemlitFacilityLevel: 'D', route: 'TOPICAL' },
      { genericName: 'sodium cromoglycate', nemlitFacilityLevel: 'C', route: 'TOPICAL' },
      { genericName: 'tetracaine eye', nemlitFacilityLevel: 'C', route: 'TOPICAL' },
      { genericName: 'timolol', nemlitFacilityLevel: 'C', route: 'TOPICAL' },
      { genericName: 'triamcinolone acetatonide', nemlitFacilityLevel: 'S', route: 'INJECTION' },
    ],
  },
  // Ch.19 — Ophthalmological Preparations
  {
    drugClass: 'OPHTHALMOLOGICAL',
    therapeuticCategory: 'EYE',
    entries: [
      { genericName: 'cyclopentolate', nemlitFacilityLevel: 'C', route: 'TOPICAL' },
      { genericName: 'fluoro uracil 1% eye', nemlitFacilityLevel: 'D', route: 'TOPICAL' },
      { genericName: 'ganciclovir', nemlitFacilityLevel: 'S', route: 'TOPICAL' },
      { genericName: 'mitomycin c 5mg + vial, 10 mg + vial', nemlitFacilityLevel: 'D', route: 'INJECTION' },
      { genericName: 'silicon oil 1000 cs, 1500 cs, 5000 cs', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'tropicamide', nemlitFacilityLevel: 'S', route: 'TOPICAL' },
      { genericName: 'tropicamide with cyclopentolate', nemlitFacilityLevel: 'C', route: 'TOPICAL' },
    ],
  },
  // Ch.20 — Oxytocics and Antioxytocics
  {
    drugClass: 'OXYTOCIC',
    therapeuticCategory: 'OBSTETRIC',
    entries: [
      { genericName: 'b salbutamol', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'dicyclomine', nemlitFacilityLevel: 'B', route: 'INJECTION' },
      { genericName: 'ergometrine', nemlitFacilityLevel: 'C', route: 'INJECTION' },
    ],
  },
  // Ch.21 — Dialysis Solution and Other Related Medicines
  {
    drugClass: 'DIALYSIS',
    therapeuticCategory: 'RENAL',
    entries: [
      { genericName: 'intraperitoneal dialysis', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'iron sucrose', nemlitFacilityLevel: 'D', route: 'INJECTION' },
    ],
  },
  // Ch.22 — Psychotherapeutic and Related Medicines
  {
    drugClass: 'PSYCHOTHERAPEUTIC',
    therapeuticCategory: 'MENTAL_HEALTH',
    entries: [
      { genericName: 'buprenorphine sublingual tablets2mg', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'citalopram', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'fluphenazine', nemlitFacilityLevel: 'C', route: 'INJECTION' },
      { genericName: 'methadone oral', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'naltrexone', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'oxybutynin', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'zuclopenthixol', nemlitFacilityLevel: 'S', route: 'INJECTION' },
    ],
  },
  // Ch.23 — Medicines Acting on Respiratory Tract
  {
    drugClass: 'RESPIRATORY',
    therapeuticCategory: 'RESPIRATORY',
    entries: [
      { genericName: 'budesonide', nemlitFacilityLevel: 'B', route: 'INHALATION' },
      { genericName: 'cough', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'fluticasone propionate nasal', nemlitFacilityLevel: 'D', route: 'TOPICAL' },
      { genericName: 'montelucast', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'nebulizer', nemlitFacilityLevel: 'B', route: 'INJECTION' },
      { genericName: 'salfolinl', nemlitFacilityLevel: 'C', route: 'INHALATION' },
      { genericName: 'tiotropium inhalation1.25mcg + actuation; 2.5mcg + actuation', nemlitFacilityLevel: 'S', route: 'INHALATION' },
    ],
  },
  // Ch.24 — Solutions, Correcting Water Electrolyte and Acid-Base Disturbances
  {
    drugClass: 'ELECTROLYTE',
    therapeuticCategory: 'FLUID_ELECTROLYTE',
    entries: [
      { genericName: 'dextrose 10%; dextrose 10%; 500ml', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'dextrose 25%, dextrose 25%, 50ml, 100ml', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'dextrose 5%; dextrose 5%; 500ml, 1000ml', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'dextrose 50%, dextrose 50%; 50ml, 100ml', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'polystyrene sulfonate', nemlitFacilityLevel: 'D', route: 'ORAL' },
      { genericName: 'sodium chloride', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'sodium chloride + dextrose 0.9% + 5%', nemlitFacilityLevel: 'B', route: 'INJECTION' },
      // compound sodium lactate ("Ringer's solution") and water for injection
      // are already covered by 'ringer lactate' / 'water for injection' in
      // SUPPLEMENTAL_FORMULARY_GROUPS above — not duplicated here.
    ],
  },
  // Ch.25 — Vitamins/Minerals
  {
    drugClass: 'VITAMIN_MINERAL',
    therapeuticCategory: 'NUTRITION',
    entries: [
      { genericName: 'ascorbic acid (vitamin c)', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'calcium with amino acids', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'calcium with vitamins', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'ergocalciferol (vitamin d)', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'glucosamine +chondrotin sulphate', nemlitFacilityLevel: 'S', route: 'ORAL' },
      { genericName: 'iron with amino acid', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'iron with vitamins', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'nicotinamide (vitamin b3)', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'pyridoxine (vitamin b6)', nemlitFacilityLevel: 'B', route: 'ORAL' },
      { genericName: 'retinol (vitamin a)', nemlitFacilityLevel: 'A', route: 'TOPICAL' },
      { genericName: 'sodium hyaluronate 1%', nemlitFacilityLevel: 'S', route: 'INJECTION' },
      { genericName: 'syrup (contains nicotinamide 15mg, riboflavin 1mg, thiamine 1mg + 5ml)', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'thiamine (vitamin b1)', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'vitamin b complex vitamin b complex', nemlitFacilityLevel: 'A', route: 'ORAL' },
    ],
  },
  // Ch.26 — Medicines Used in Ear, Nose & Throat Diseases
  {
    drugClass: 'ENT',
    therapeuticCategory: 'EAR_NOSE_THROAT',
    entries: [
      { genericName: 'betamethasone ear', nemlitFacilityLevel: 'A', route: 'TOPICAL' },
      { genericName: 'chlorhexidine gluconate', nemlitFacilityLevel: 'B', route: 'TOPICAL' },
      { genericName: 'ciprofloxacin ear', nemlitFacilityLevel: 'C', route: 'TOPICAL' },
      { genericName: 'clotrimazole ear', nemlitFacilityLevel: 'C', route: 'TOPICAL' },
      { genericName: 'ephedrine nasal', nemlitFacilityLevel: 'B', route: 'TOPICAL' },
      { genericName: 'lidocaine + beclometasone + clo trimazole + chloramphenicol ear drop', nemlitFacilityLevel: 'D', route: 'TOPICAL' },
      { genericName: 'mometasone nasal', nemlitFacilityLevel: 'S', route: 'TOPICAL' },
      { genericName: 'normal saline nasal drop 0.9%', nemlitFacilityLevel: 'A', route: 'TOPICAL' },
      { genericName: 'potassium permanganate', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'xylometazoline nasal', nemlitFacilityLevel: 'S', route: 'TOPICAL' },
    ],
  },
  // Ch.27 — Disinfectants and Antiseptics
  {
    drugClass: 'ANTISEPTIC',
    therapeuticCategory: 'INFECTION_CONTROL',
    entries: [
      { genericName: 'chlorhexidine + cetrimide', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'chloroxylenol', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'cresol saponated', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'formaldehyde', nemlitFacilityLevel: 'B', route: 'ORAL' },
      { genericName: 'glutaraldehyde activated', nemlitFacilityLevel: 'C', route: 'ORAL' },
      { genericName: 'methylated spirit', nemlitFacilityLevel: 'A', route: 'ORAL' },
      { genericName: 'sodium dichloroisocyanurate', nemlitFacilityLevel: 'A', route: 'ORAL' },
    ],
  },
  // Ch.28 — Miscellaneous
  {
    drugClass: 'OTHER',
    therapeuticCategory: 'MISCELLANEOUS',
    entries: [
      { genericName: 'sildenafil tabet 50mg', nemlitFacilityLevel: 'S', route: 'ORAL' },
    ],
  },
];

const NEMLIT_FULL_CATALOGUE_SEED: DrugSeed[] = NEMLIT_FULL_CATALOGUE_GROUPS.flatMap((group) =>
  group.entries.map((entry) => ({
    genericName: entry.genericName,
    brandNames: [],
    drugClass: group.drugClass,
    therapeuticCategory: group.therapeuticCategory,
    awarClass: getAwarClass(entry.genericName),
    tanzaniaAwareClass: getTanzaniaAwareClass(entry.genericName),
    nemlitListed: true,
    nemlitFacilityLevel: entry.nemlitFacilityLevel,
    standardAdultDose: 'See standard Tanzanian formulary guidance',
    frequency: 'Use standard dosing guidance',
    route: entry.route,
    pregnancyCategory: 'NA',
    clinicianReviewed: false,
  })),
);

export const DRUG_DATABASE_SEED: DrugSeed[] = [
  ...CORE_DRUG_DATABASE_SEED,
  ...SUPPLEMENTAL_FORMULARY_SEED,
  ...NEMLIT_FULL_CATALOGUE_SEED,
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
