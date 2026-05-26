// backend/src/data/drug-database-seed.ts
//
// Tanzania NEMLIT 2021 (5th edition) formulary — 200+ drugs.
// AWaRe classification (ACCESS / WATCH / RESERVE / null) follows:
//   - Tanzania NEMLIT 2021 aligned with WHO AWaRe 2021
//   - awarClass applies ONLY to antibacterials (antibiotics)
//   - Antifungals, antivirals, antiparasitics, analgesics, cardiovascular,
//     GI, respiratory, endocrine, vitamins → awarClass: null (always)
//
// Run:  npm run seed:drugs
//       (see backend/package.json → "seed:drugs": "ts-node prisma/drug-database-seed.ts")

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type AwarClass = 'ACCESS' | 'WATCH' | 'RESERVE' | null;

interface DrugSeed {
  genericName: string;
  brandNames: string[];
  category: string;
  standardAdultDose: string;
  commonInteractions: string[];
  pregnancyCategory: string;   // A | B | C | D | X
  controlled: boolean;
  awarClass: AwarClass;
  // awarClass rules:
  //   'ACCESS'  — antibiotic dispensable at all levels incl. ADDO
  //   'WATCH'   — antibiotic restricted to council hospital level+
  //   'RESERVE' — last-resort antibiotic; tertiary only
  //   null      — NOT an antibiotic; AWaRe does not apply
}

// ─────────────────────────────────────────────────────────────────────────────
// ANTIBIOTICS — PENICILLINS
// ─────────────────────────────────────────────────────────────────────────────
// ACCESS: first-line, broad use, low resistance pressure
// WATCH:  extended-spectrum; higher resistance risk
// ─────────────────────────────────────────────────────────────────────────────

const ANTIBIOTICS_PENICILLINS: DrugSeed[] = [
  {
    genericName: 'Amoxicillin',
    brandNames: ['Amoxil', 'Trimox', 'Amoxipen'],
    category: 'Antibiotic – Penicillin (ACCESS)',
    standardAdultDose: '500 mg orally 8-hourly for 5–7 days',
    commonInteractions: ['warfarin', 'methotrexate', 'probenecid'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'ACCESS',
  },
  {
    genericName: 'Ampicillin',
    brandNames: ['Penbritin', 'Omnipen'],
    category: 'Antibiotic – Penicillin (ACCESS)',
    standardAdultDose: '250–500 mg orally 6-hourly; 500 mg–1 g IV/IM 4–6-hourly',
    commonInteractions: ['warfarin', 'allopurinol', 'oral contraceptives'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'ACCESS',
  },
  {
    genericName: 'Benzylpenicillin',
    brandNames: ['Penicillin G', 'Crystapen'],
    category: 'Antibiotic – Penicillin (ACCESS)',
    standardAdultDose: '1.2–2.4 MU IV/IM 4–6-hourly',
    commonInteractions: ['probenecid', 'methotrexate'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'ACCESS',
  },
  {
    genericName: 'Phenoxymethylpenicillin',
    brandNames: ['Penicillin V', 'V-Cillin'],
    category: 'Antibiotic – Penicillin (ACCESS)',
    standardAdultDose: '250–500 mg orally 6-hourly',
    commonInteractions: ['warfarin', 'methotrexate'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'ACCESS',
  },
  {
    genericName: 'Cloxacillin',
    brandNames: ['Cloxapen', 'Orbenin'],
    category: 'Antibiotic – Penicillinase-resistant Penicillin (ACCESS)',
    standardAdultDose: '250–500 mg orally 6-hourly (taken on empty stomach)',
    commonInteractions: ['warfarin', 'methotrexate'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'ACCESS',
  },
  {
    genericName: 'Flucloxacillin',
    brandNames: ['Flopen', 'Staphlex'],
    category: 'Antibiotic – Penicillinase-resistant Penicillin (ACCESS)',
    standardAdultDose: '250–500 mg orally 6-hourly',
    commonInteractions: ['warfarin'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'ACCESS',
  },
  {
    genericName: 'Amoxicillin-Clavulanate',
    brandNames: ['Augmentin', 'Co-amoxiclav'],
    category: 'Antibiotic – Beta-lactam + Inhibitor (WATCH)',
    standardAdultDose: '625 mg orally 8-hourly or 1 g 12-hourly',
    commonInteractions: ['warfarin', 'methotrexate', 'allopurinol'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'WATCH',
  },
  {
    genericName: 'Piperacillin-Tazobactam',
    brandNames: ['Tazocin', 'Zosyn'],
    category: 'Antibiotic – Beta-lactam + Inhibitor (WATCH)',
    standardAdultDose: '4.5 g IV 8-hourly',
    commonInteractions: ['vancomycin', 'warfarin', 'methotrexate'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'WATCH',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANTIBIOTICS — CEPHALOSPORINS
// 1st generation: closer to ACCESS; 3rd/4th generation: WATCH
// ─────────────────────────────────────────────────────────────────────────────

const ANTIBIOTICS_CEPHALOSPORINS: DrugSeed[] = [
  {
    genericName: 'Cephalexin',
    brandNames: ['Keflex', 'Ceporex'],
    category: 'Antibiotic – 1st Generation Cephalosporin (WATCH)',
    standardAdultDose: '250–500 mg orally 6-hourly',
    commonInteractions: ['warfarin', 'probenecid'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'WATCH', // NEMLIT 2021 classification
  },
  {
    genericName: 'Cefazolin',
    brandNames: ['Kefzol', 'Ancef'],
    category: 'Antibiotic – 1st Generation Cephalosporin (WATCH)',
    standardAdultDose: '1–2 g IV/IM 8-hourly',
    commonInteractions: ['warfarin', 'probenecid'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'WATCH',
  },
  {
    genericName: 'Cefuroxime',
    brandNames: ['Zinacef', 'Zinnat', 'Ceftin'],
    category: 'Antibiotic – 2nd Generation Cephalosporin (WATCH)',
    standardAdultDose: '250–500 mg orally 12-hourly; 750 mg–1.5 g IV 8-hourly',
    commonInteractions: ['warfarin', 'probenecid', 'antacids'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'WATCH',
  },
  {
    genericName: 'Cefixime',
    brandNames: ['Suprax', 'Cefspan'],
    category: 'Antibiotic – 3rd Generation Cephalosporin (WATCH)',
    standardAdultDose: '400 mg orally once daily or 200 mg 12-hourly',
    commonInteractions: ['warfarin', 'carbamazepine'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'WATCH',
  },
  {
    genericName: 'Ceftriaxone',
    brandNames: ['Rocephin', 'Ceftriaxone sodium'],
    category: 'Antibiotic – 3rd Generation Cephalosporin (WATCH)',
    standardAdultDose: '1–2 g IV/IM once daily',
    commonInteractions: ['calcium-containing IV solutions', 'warfarin'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'WATCH',
  },
  {
    genericName: 'Cefotaxime',
    brandNames: ['Claforan', 'Cefotax'],
    category: 'Antibiotic – 3rd Generation Cephalosporin (WATCH)',
    standardAdultDose: '1–2 g IV/IM 6–8-hourly',
    commonInteractions: ['warfarin', 'probenecid'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'WATCH',
  },
  {
    genericName: 'Ceftazidime',
    brandNames: ['Fortaz', 'Tazicef'],
    category: 'Antibiotic – 3rd Generation Cephalosporin (WATCH)',
    standardAdultDose: '1–2 g IV/IM 8–12-hourly',
    commonInteractions: ['vancomycin', 'chloramphenicol'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'WATCH',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANTIBIOTICS — CARBAPENEMS  (RESERVE — last-resort, tertiary only)
// ─────────────────────────────────────────────────────────────────────────────

const ANTIBIOTICS_CARBAPENEMS: DrugSeed[] = [
  {
    genericName: 'Meropenem',
    brandNames: ['Merrem', 'Meronem'],
    category: 'Antibiotic – Carbapenem (RESERVE)',
    standardAdultDose: '500 mg–1 g IV 8-hourly (up to 2 g 8-hourly for severe infection)',
    commonInteractions: ['valproic acid', 'probenecid'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'RESERVE',
  },
  {
    genericName: 'Imipenem-Cilastatin',
    brandNames: ['Primaxin', 'Tienam'],
    category: 'Antibiotic – Carbapenem (RESERVE)',
    standardAdultDose: '500 mg–1 g IV 6–8-hourly',
    commonInteractions: ['valproic acid', 'ganciclovir', 'ciclosporin'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: 'RESERVE',
  },
  {
    genericName: 'Ertapenem',
    brandNames: ['Invanz'],
    category: 'Antibiotic – Carbapenem (RESERVE)',
    standardAdultDose: '1 g IV/IM once daily',
    commonInteractions: ['valproic acid', 'probenecid'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'RESERVE',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANTIBIOTICS — MACROLIDES
// ─────────────────────────────────────────────────────────────────────────────

const ANTIBIOTICS_MACROLIDES: DrugSeed[] = [
  {
    genericName: 'Erythromycin',
    brandNames: ['Erythrocin', 'Erymax', 'Ilosone'],
    category: 'Antibiotic – Macrolide (ACCESS)',
    standardAdultDose: '250–500 mg orally 6-hourly',
    commonInteractions: ['warfarin', 'statins', 'ciclosporin', 'digoxin', 'theophylline'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'ACCESS',
  },
  {
    genericName: 'Azithromycin',
    brandNames: ['Zithromax', 'Azithrocin', 'Sumamed'],
    category: 'Antibiotic – Macrolide (WATCH)',
    standardAdultDose: '500 mg orally on day 1, then 250 mg daily for 4 days',
    commonInteractions: ['warfarin', 'antacids', 'digoxin', 'QT-prolonging drugs'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'WATCH',
  },
  {
    genericName: 'Clarithromycin',
    brandNames: ['Klacid', 'Biaxin'],
    category: 'Antibiotic – Macrolide (WATCH)',
    standardAdultDose: '250–500 mg orally 12-hourly',
    commonInteractions: ['warfarin', 'statins', 'carbamazepine', 'ciclosporin', 'digoxin'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: 'WATCH',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANTIBIOTICS — FLUOROQUINOLONES  (all WATCH in WHO AWaRe / NEMLIT 2021)
// Note: fluoroquinolones are NOT first-line due to resistance risk and
//       broad-spectrum activity — they are WATCH antibiotics even when
//       commonly dispensed in practice.
// ─────────────────────────────────────────────────────────────────────────────

const ANTIBIOTICS_FLUOROQUINOLONES: DrugSeed[] = [
  {
    genericName: 'Ciprofloxacin',
    brandNames: ['Ciprobay', 'Cipro', 'Ciproflox'],
    category: 'Antibiotic – Fluoroquinolone (WATCH)',
    standardAdultDose: '250–750 mg orally 12-hourly; 200–400 mg IV 12-hourly',
    commonInteractions: ['antacids', 'iron', 'warfarin', 'theophylline', 'NSAIDs', 'QT-prolonging drugs'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: 'WATCH',
  },
  {
    genericName: 'Norfloxacin',
    brandNames: ['Noroxin', 'Utinor'],
    category: 'Antibiotic – Fluoroquinolone (WATCH)',
    standardAdultDose: '400 mg orally 12-hourly',
    commonInteractions: ['antacids', 'iron', 'warfarin', 'theophylline'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: 'WATCH',
  },
  {
    genericName: 'Levofloxacin',
    brandNames: ['Tavanic', 'Levaquin'],
    category: 'Antibiotic – Fluoroquinolone (WATCH)',
    standardAdultDose: '250–500 mg orally/IV once daily',
    commonInteractions: ['antacids', 'iron', 'warfarin', 'QT-prolonging drugs', 'NSAIDs'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: 'WATCH',
  },
  {
    genericName: 'Ofloxacin',
    brandNames: ['Tarivid', 'Floxin'],
    category: 'Antibiotic – Fluoroquinolone (WATCH)',
    standardAdultDose: '200–400 mg orally/IV 12-hourly',
    commonInteractions: ['antacids', 'iron', 'warfarin', 'QT-prolonging drugs'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: 'WATCH',
  },
  {
    genericName: 'Moxifloxacin',
    brandNames: ['Avelox', 'Vigamox'],
    category: 'Antibiotic – Fluoroquinolone (WATCH)',
    standardAdultDose: '400 mg orally/IV once daily',
    commonInteractions: ['antacids', 'warfarin', 'QT-prolonging drugs'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: 'WATCH',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANTIBIOTICS — TETRACYCLINES
// ─────────────────────────────────────────────────────────────────────────────

const ANTIBIOTICS_TETRACYCLINES: DrugSeed[] = [
  {
    genericName: 'Doxycycline',
    brandNames: ['Vibramycin', 'Doxylin', 'Doxy'],
    category: 'Antibiotic – Tetracycline (ACCESS)',
    standardAdultDose: '100 mg orally 12-hourly on day 1, then 100 mg once daily',
    commonInteractions: ['antacids', 'iron', 'dairy products', 'warfarin', 'oral contraceptives'],
    pregnancyCategory: 'D',
    controlled: false,
    awarClass: 'ACCESS',
  },
  {
    genericName: 'Tetracycline',
    brandNames: ['Tetracyn', 'Achromycin'],
    category: 'Antibiotic – Tetracycline (ACCESS)',
    standardAdultDose: '250–500 mg orally 6-hourly (on empty stomach)',
    commonInteractions: ['antacids', 'iron', 'dairy products', 'warfarin'],
    pregnancyCategory: 'D',
    controlled: false,
    awarClass: 'ACCESS',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANTIBIOTICS — SULFONAMIDES & TRIMETHOPRIM
// ─────────────────────────────────────────────────────────────────────────────

const ANTIBIOTICS_SULFONAMIDES: DrugSeed[] = [
  {
    genericName: 'Co-trimoxazole',
    brandNames: ['Septrin', 'Bactrim', 'Cotrimoxazole'],
    category: 'Antibiotic – Sulfonamide/Trimethoprim combination (ACCESS)',
    standardAdultDose: '960 mg (2 standard tablets) orally 12-hourly',
    commonInteractions: ['warfarin', 'methotrexate', 'phenytoin', 'ACE inhibitors'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: 'ACCESS',
  },
  {
    genericName: 'Trimethoprim',
    brandNames: ['Monotrim', 'Triprim'],
    category: 'Antibiotic – Diaminopyrimidine (ACCESS)',
    standardAdultDose: '200 mg orally 12-hourly or 100 mg 12-hourly (prophylaxis)',
    commonInteractions: ['warfarin', 'methotrexate', 'phenytoin'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: 'ACCESS',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANTIBIOTICS — NITROIMIDAZOLES
// Note: metronidazole is an antibacterial AND antiprotozoal — it receives
// AWaRe classification because it is an antibiotic.  Purely antiprotozoal
// agents (e.g. diloxanide) do NOT receive AWaRe tags.
// ─────────────────────────────────────────────────────────────────────────────

const ANTIBIOTICS_NITROIMIDAZOLES: DrugSeed[] = [
  {
    genericName: 'Metronidazole',
    brandNames: ['Flagyl', 'Metrogyl'],
    category: 'Antibiotic – Nitroimidazole (ACCESS)',
    standardAdultDose: '400 mg orally 8-hourly; 500 mg IV 8-hourly',
    commonInteractions: ['warfarin', 'alcohol (disulfiram reaction)', 'lithium', 'phenytoin'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'ACCESS',
  },
  {
    genericName: 'Tinidazole',
    brandNames: ['Fasigyn', 'Tindamax'],
    category: 'Antibiotic – Nitroimidazole (ACCESS)',
    standardAdultDose: '2 g orally once (single dose for giardiasis/trichomoniasis)',
    commonInteractions: ['warfarin', 'alcohol', 'lithium'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: 'ACCESS',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANTIBIOTICS — AMINOGLYCOSIDES
// ─────────────────────────────────────────────────────────────────────────────

const ANTIBIOTICS_AMINOGLYCOSIDES: DrugSeed[] = [
  {
    genericName: 'Gentamicin',
    brandNames: ['Garamycin', 'Gentacin'],
    category: 'Antibiotic – Aminoglycoside (WATCH)',
    standardAdultDose: '3–5 mg/kg IV/IM once daily (monitor levels)',
    commonInteractions: ['loop diuretics (nephrotoxicity/ototoxicity)', 'vancomycin', 'NSAIDs', 'amphotericin B'],
    pregnancyCategory: 'D',
    controlled: false,
    awarClass: 'WATCH',
  },
  {
    genericName: 'Amikacin',
    brandNames: ['Amikin', 'Biklin'],
    category: 'Antibiotic – Aminoglycoside (WATCH)',
    standardAdultDose: '15 mg/kg IV/IM once daily (monitor levels)',
    commonInteractions: ['loop diuretics', 'vancomycin', 'NSAIDs', 'amphotericin B'],
    pregnancyCategory: 'D',
    controlled: false,
    awarClass: 'WATCH',
  },
  {
    genericName: 'Streptomycin',
    brandNames: ['Streptomycin sulphate'],
    category: 'Antibiotic – Aminoglycoside / Anti-TB (WATCH)',
    standardAdultDose: '15 mg/kg IM once daily (TB regimens only)',
    commonInteractions: ['loop diuretics', 'other nephrotoxic agents'],
    pregnancyCategory: 'D',
    controlled: false,
    awarClass: 'WATCH',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANTIBIOTICS — LINCOSAMIDES
// ─────────────────────────────────────────────────────────────────────────────

const ANTIBIOTICS_LINCOSAMIDES: DrugSeed[] = [
  {
    genericName: 'Clindamycin',
    brandNames: ['Dalacin C', 'Cleocin'],
    category: 'Antibiotic – Lincosamide (ACCESS)',
    standardAdultDose: '150–450 mg orally 6-hourly; 600 mg–1.2 g IV 6–8-hourly',
    commonInteractions: ['neuromuscular blocking agents', 'kaolin-pectin'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'ACCESS', // NEMLIT 2021; NOTE: WHO AWaRe 2023 reclassified to WATCH
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANTIBIOTICS — OTHER
// ─────────────────────────────────────────────────────────────────────────────

const ANTIBIOTICS_OTHER: DrugSeed[] = [
  {
    genericName: 'Nitrofurantoin',
    brandNames: ['Macrobid', 'Macrodantin', 'Furadantin'],
    category: 'Antibiotic – Nitrofuran (ACCESS)',
    standardAdultDose: '50–100 mg orally 6-hourly with food (7 days for UTI)',
    commonInteractions: ['antacids', 'quinolones (antagonism)', 'probenecid'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: 'ACCESS',
  },
  {
    genericName: 'Chloramphenicol',
    brandNames: ['Chloromycetin', 'Kemicetine'],
    category: 'Antibiotic – Amphenicol (ACCESS)',
    standardAdultDose: '12.5 mg/kg orally/IV 6-hourly (use with caution; reserve for severe infections)',
    commonInteractions: ['warfarin', 'phenytoin', 'ciclosporin', 'bone-marrow suppressants'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: 'ACCESS',
  },
  {
    genericName: 'Vancomycin',
    brandNames: ['Vancocin', 'Vancoled'],
    category: 'Antibiotic – Glycopeptide (RESERVE)',
    standardAdultDose: '15–20 mg/kg IV 8–12-hourly (monitor trough levels)',
    commonInteractions: ['aminoglycosides', 'loop diuretics', 'NSAIDs', 'piperacillin-tazobactam'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: 'RESERVE',
  },
  {
    genericName: 'Linezolid',
    brandNames: ['Zyvox', 'Zyvoxid'],
    category: 'Antibiotic – Oxazolidinone (RESERVE)',
    standardAdultDose: '600 mg orally/IV 12-hourly (max 28 days)',
    commonInteractions: ['SSRIs (serotonin syndrome)', 'MAOIs', 'tyramine-rich foods', 'adrenergic agents'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: 'RESERVE',
  },
  {
    genericName: 'Colistin',
    brandNames: ['Colomycin', 'Polymyxin E'],
    category: 'Antibiotic – Polymyxin (RESERVE)',
    standardAdultDose: '2.5–5 mg/kg/day IV in 2–4 divided doses (renal-dose adjusted)',
    commonInteractions: ['neuromuscular blocking agents', 'aminoglycosides', 'nephrotoxic agents'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: 'RESERVE',
  },
  {
    genericName: 'Rifampicin',
    brandNames: ['Rimactane', 'Rifadin'],
    category: 'Antibiotic – Rifamycin / Anti-TB',
    standardAdultDose: '600 mg orally once daily (in TB regimen; take on empty stomach)',
    commonInteractions: ['oral contraceptives', 'warfarin', 'antiretrovirals', 'statins', 'ciclosporin', 'methadone'],
    pregnancyCategory: 'C',
    controlled: false,
    // Rifampicin is an antibiotic but is used exclusively in TB/leprosy treatment
    // under directly-observed therapy (DOT). WHO AWaRe 2021 does not classify
    // anti-TB agents under the Access/Watch/Reserve framework; they are governed
    // by separate WHO TB guidelines. awarClass remains null.
    awarClass: null,
  },
  {
    genericName: 'Isoniazid',
    brandNames: ['INH', 'Nydrazid'],
    category: 'Antibiotic – Anti-TB',
    standardAdultDose: '5 mg/kg orally once daily (max 300 mg; TB regimen)',
    commonInteractions: ['rifampicin', 'phenytoin', 'carbamazepine', 'alcohol'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null, // Anti-TB — outside AWaRe framework
  },
  {
    genericName: 'Pyrazinamide',
    brandNames: ['Zinamide', 'Tebrazid'],
    category: 'Antibiotic – Anti-TB',
    standardAdultDose: '25 mg/kg orally once daily (TB regimen)',
    commonInteractions: ['probenecid', 'allopurinol (urate elevation)'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null, // Anti-TB — outside AWaRe framework
  },
  {
    genericName: 'Ethambutol',
    brandNames: ['Myambutol', 'Servambutol'],
    category: 'Antibiotic – Anti-TB',
    standardAdultDose: '15 mg/kg orally once daily (TB regimen)',
    commonInteractions: ['antacids (aluminium)', 'other ophthalmotoxic agents'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: null, // Anti-TB — outside AWaRe framework
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANTIFUNGALS — awarClass: null (AWaRe does not apply)
// ─────────────────────────────────────────────────────────────────────────────

const ANTIFUNGALS: DrugSeed[] = [
  {
    genericName: 'Fluconazole',
    brandNames: ['Diflucan', 'Flucomed'],
    category: 'Antifungal – Triazole',
    standardAdultDose: '150 mg single dose (vaginal candidiasis); 200–400 mg daily (systemic)',
    commonInteractions: ['warfarin', 'phenytoin', 'ciclosporin', 'statins', 'QT-prolonging drugs'],
    pregnancyCategory: 'D',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Ketoconazole',
    brandNames: ['Nizoral'],
    category: 'Antifungal – Imidazole',
    standardAdultDose: '200–400 mg orally once daily',
    commonInteractions: ['warfarin', 'statins', 'ciclosporin', 'antacids', 'rifampicin'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Nystatin',
    brandNames: ['Mycostatin', 'Nilstat'],
    category: 'Antifungal – Polyene',
    standardAdultDose: '500,000 IU orally 6-hourly (intestinal); topical as directed',
    commonInteractions: [],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Clotrimazole',
    brandNames: ['Canesten', 'Lotrimin'],
    category: 'Antifungal – Imidazole (topical)',
    standardAdultDose: 'Topical: apply 2–3 times daily; vaginal: 500 mg pessary once',
    commonInteractions: ['warfarin (vaginal formulation)'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Griseofulvin',
    brandNames: ['Grisovin', 'Fulvicin'],
    category: 'Antifungal – Oral',
    standardAdultDose: '500 mg orally once daily (with fatty meal)',
    commonInteractions: ['warfarin', 'oral contraceptives', 'alcohol', 'phenobarbitone'],
    pregnancyCategory: 'X',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Amphotericin B',
    brandNames: ['Fungizone', 'Abelcet'],
    category: 'Antifungal – Polyene (IV)',
    standardAdultDose: '0.5–1 mg/kg IV daily (conventional); liposomal 3–5 mg/kg IV daily',
    commonInteractions: ['aminoglycosides', 'ciclosporin', 'fluconazole', 'digoxin'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: null,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANTIPARASITICS — awarClass: null
// Note: metronidazole (nitroimidazole) IS an antibiotic and IS in AWaRe.
// Agents here are purely antiprotozoal or anthelminthic — no AWaRe.
// ─────────────────────────────────────────────────────────────────────────────

const ANTIPARASITICS: DrugSeed[] = [
  {
    genericName: 'Artemether-Lumefantrine',
    brandNames: ['Coartem', 'Riamet'],
    category: 'Antimalarial – Artemisinin Combination Therapy',
    standardAdultDose: '4 tablets (80/480 mg) at 0, 8, 24, 36, 48, 60 hours (6 doses)',
    commonInteractions: ['QT-prolonging drugs', 'CYP3A4 inducers/inhibitors', 'grapefruit juice'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Artemether',
    brandNames: ['Paluther'],
    category: 'Antimalarial – Artemisinin',
    standardAdultDose: '3.2 mg/kg IM on day 1, then 1.6 mg/kg daily for 4 days',
    commonInteractions: ['QT-prolonging drugs'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Artesunate',
    brandNames: ['Artesun', 'Falcimon'],
    category: 'Antimalarial – Artemisinin (IV/rectal)',
    standardAdultDose: '2.4 mg/kg IV at 0, 12, 24 h then daily (severe malaria)',
    commonInteractions: ['QT-prolonging drugs'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Quinine',
    brandNames: ['Qualaquin', 'Quinine sulphate'],
    category: 'Antimalarial – Quinoline',
    standardAdultDose: '600 mg orally 8-hourly for 7 days (with doxycycline)',
    commonInteractions: ['digoxin', 'warfarin', 'QT-prolonging drugs', 'antacids'],
    pregnancyCategory: 'D',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Sulfadoxine-Pyrimethamine',
    brandNames: ['Fansidar'],
    category: 'Antimalarial – Sulfonamide combination (IPTp)',
    standardAdultDose: '3 tablets (1500/75 mg) as single dose for IPTp in pregnancy',
    commonInteractions: ['folate supplements', 'warfarin', 'methotrexate'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Albendazole',
    brandNames: ['Zentel', 'Eskazole'],
    category: 'Antihelminthic – Benzimidazole',
    standardAdultDose: '400 mg orally as single dose (intestinal worms); 400 mg 12-hourly × 3 days (tissue)',
    commonInteractions: ['dexamethasone', 'praziquantel', 'cimetidine'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Mebendazole',
    brandNames: ['Vermox', 'Mebex'],
    category: 'Antihelminthic – Benzimidazole',
    standardAdultDose: '100 mg orally 12-hourly for 3 days (or 500 mg single dose)',
    commonInteractions: ['cimetidine'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Praziquantel',
    brandNames: ['Biltricide', 'Distocide'],
    category: 'Antihelminthic – Pyrazinoisoquinoline (schistosomiasis)',
    standardAdultDose: '40 mg/kg as single dose (schistosomiasis)',
    commonInteractions: ['rifampicin', 'dexamethasone', 'carbamazepine'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Ivermectin',
    brandNames: ['Mectizan', 'Stromectol'],
    category: 'Antihelminthic – Avermectin',
    standardAdultDose: '150–200 mcg/kg orally as single dose',
    commonInteractions: ['warfarin', 'barbiturates', 'benzodiazepines'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANTIVIRALS — awarClass: null
// ─────────────────────────────────────────────────────────────────────────────

const ANTIVIRALS: DrugSeed[] = [
  {
    genericName: 'Acyclovir',
    brandNames: ['Zovirax', 'Acivir'],
    category: 'Antiviral – Nucleoside Analogue',
    standardAdultDose: '200–800 mg orally 5 times daily (herpes); 5–10 mg/kg IV 8-hourly (severe)',
    commonInteractions: ['probenecid', 'mycophenolate', 'tenofovir'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Tenofovir Disoproxil Fumarate',
    brandNames: ['Viread', 'TDF'],
    category: 'Antiretroviral – Nucleotide RT Inhibitor (NRTI)',
    standardAdultDose: '300 mg orally once daily',
    commonInteractions: ['didanosine', 'NSAIDs', 'acyclovir', 'aminoglycosides'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Lamivudine',
    brandNames: ['Epivir', '3TC'],
    category: 'Antiretroviral – NRTI',
    standardAdultDose: '150 mg orally 12-hourly or 300 mg once daily',
    commonInteractions: ['trimethoprim', 'co-trimoxazole'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Efavirenz',
    brandNames: ['Stocrin', 'Sustiva'],
    category: 'Antiretroviral – NNRTI',
    standardAdultDose: '600 mg orally once daily at bedtime',
    commonInteractions: ['rifampicin', 'oral contraceptives', 'statins', 'warfarin', 'psychotropics'],
    pregnancyCategory: 'D',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Nevirapine',
    brandNames: ['Viramune'],
    category: 'Antiretroviral – NNRTI',
    standardAdultDose: '200 mg orally once daily × 14 days, then 200 mg 12-hourly',
    commonInteractions: ['rifampicin', 'oral contraceptives', 'ketoconazole'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Lopinavir-Ritonavir',
    brandNames: ['Aluvia', 'Kaletra'],
    category: 'Antiretroviral – Protease Inhibitor',
    standardAdultDose: '400/100 mg orally 12-hourly',
    commonInteractions: ['rifampicin', 'statins', 'sildenafil', 'amiodarone', 'midazolam'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANALGESICS & ANTIPYRETICS — awarClass: null
// ─────────────────────────────────────────────────────────────────────────────

const ANALGESICS: DrugSeed[] = [
  {
    genericName: 'Paracetamol',
    brandNames: ['Panadol', 'Calpol', 'Tylenol', 'Hedex'],
    category: 'Analgesic – Antipyretic',
    standardAdultDose: '500 mg–1 g orally/rectally 4–6-hourly (max 4 g/day)',
    commonInteractions: ['warfarin', 'alcohol (hepatotoxicity)', 'isoniazid'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Ibuprofen',
    brandNames: ['Nurofen', 'Brufen', 'Advil'],
    category: 'NSAID – Propionic Acid',
    standardAdultDose: '400–600 mg orally 8-hourly with food (max 2.4 g/day)',
    commonInteractions: ['warfarin', 'aspirin', 'ACE inhibitors', 'lithium', 'methotrexate'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Diclofenac',
    brandNames: ['Voltaren', 'Cataflam', 'Voltarol'],
    category: 'NSAID – Acetic Acid',
    standardAdultDose: '50 mg orally 8-hourly or 75 mg IM 12-hourly',
    commonInteractions: ['warfarin', 'ACE inhibitors', 'lithium', 'methotrexate', 'ciclosporin'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Aspirin',
    brandNames: ['Disprin', 'Aspro', 'Cardiprin'],
    category: 'Analgesic – Salicylate / Antiplatelet',
    standardAdultDose: 'Analgesia: 300–600 mg 4-hourly; Antiplatelet: 75–100 mg once daily',
    commonInteractions: ['warfarin', 'ibuprofen', 'methotrexate', 'valproic acid'],
    pregnancyCategory: 'D',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Morphine',
    brandNames: ['MST Continus', 'Morphine sulphate'],
    category: 'Opioid Analgesic',
    standardAdultDose: '10–30 mg orally 4-hourly; 5–10 mg IV/SC 4-hourly',
    commonInteractions: ['CNS depressants', 'MAOIs', 'alcohol', 'benzodiazepines'],
    pregnancyCategory: 'C',
    controlled: true,
    awarClass: null,
  },
  {
    genericName: 'Tramadol',
    brandNames: ['Tramal', 'Ultram', 'Dolzam'],
    category: 'Opioid Analgesic (weak)',
    standardAdultDose: '50–100 mg orally 4–6-hourly (max 400 mg/day)',
    commonInteractions: ['SSRIs (serotonin syndrome)', 'MAOIs', 'carbamazepine', 'warfarin'],
    pregnancyCategory: 'C',
    controlled: true,
    awarClass: null,
  },
  {
    genericName: 'Codeine',
    brandNames: ['Codeine phosphate', 'Galcodine'],
    category: 'Opioid Analgesic (mild)',
    standardAdultDose: '15–60 mg orally 4-hourly (max 240 mg/day)',
    commonInteractions: ['CNS depressants', 'MAOIs', 'CYP2D6 inhibitors'],
    pregnancyCategory: 'C',
    controlled: true,
    awarClass: null,
  },
  {
    genericName: 'Ketamine',
    brandNames: ['Ketalar', 'Ketaset'],
    category: 'Dissociative Anaesthetic / Analgesic',
    standardAdultDose: '1–2 mg/kg IV induction; 0.5–1 mg/kg IV for analgesia',
    commonInteractions: ['thyroid hormones', 'CNS depressants', 'atropine'],
    pregnancyCategory: 'B',
    controlled: true,
    awarClass: null,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CARDIOVASCULAR — awarClass: null
// ─────────────────────────────────────────────────────────────────────────────

const CARDIOVASCULAR: DrugSeed[] = [
  {
    genericName: 'Amlodipine',
    brandNames: ['Norvasc', 'Istin', 'Amlopin'],
    category: 'Antihypertensive – Calcium Channel Blocker',
    standardAdultDose: '5–10 mg orally once daily',
    commonInteractions: ['ciclosporin', 'simvastatin (>20 mg)', 'tacrolimus'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Enalapril',
    brandNames: ['Vasotec', 'Renitec'],
    category: 'Antihypertensive – ACE Inhibitor',
    standardAdultDose: '5–40 mg orally once daily',
    commonInteractions: ['potassium-sparing diuretics', 'NSAIDs', 'lithium', 'allopurinol'],
    pregnancyCategory: 'D',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Lisinopril',
    brandNames: ['Zestril', 'Prinivil'],
    category: 'Antihypertensive – ACE Inhibitor',
    standardAdultDose: '5–40 mg orally once daily',
    commonInteractions: ['potassium-sparing diuretics', 'NSAIDs', 'lithium'],
    pregnancyCategory: 'D',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Losartan',
    brandNames: ['Cozaar', 'Lozap'],
    category: 'Antihypertensive – ARB',
    standardAdultDose: '50–100 mg orally once daily',
    commonInteractions: ['potassium-sparing diuretics', 'NSAIDs', 'lithium'],
    pregnancyCategory: 'D',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Atenolol',
    brandNames: ['Tenormin'],
    category: 'Antihypertensive – Beta-Blocker',
    standardAdultDose: '25–100 mg orally once daily',
    commonInteractions: ['verapamil', 'diltiazem', 'clonidine', 'NSAIDs'],
    pregnancyCategory: 'D',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Metoprolol',
    brandNames: ['Lopressor', 'Betaloc'],
    category: 'Antihypertensive – Selective Beta-1 Blocker',
    standardAdultDose: '50–100 mg orally 12-hourly',
    commonInteractions: ['verapamil', 'diltiazem', 'antidiabetics', 'MAOIs'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Hydrochlorothiazide',
    brandNames: ['HydroDIURIL', 'Microzide'],
    category: 'Antihypertensive – Thiazide Diuretic',
    standardAdultDose: '12.5–25 mg orally once daily',
    commonInteractions: ['lithium', 'NSAIDs', 'antidiabetics', 'digoxin'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Furosemide',
    brandNames: ['Lasix', 'Frusamide'],
    category: 'Diuretic – Loop',
    standardAdultDose: '20–80 mg orally/IV once or twice daily',
    commonInteractions: ['digoxin', 'lithium', 'aminoglycosides', 'NSAIDs', 'antidiabetics'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Spironolactone',
    brandNames: ['Aldactone'],
    category: 'Diuretic – Potassium-sparing / Aldosterone Antagonist',
    standardAdultDose: '25–200 mg orally once daily',
    commonInteractions: ['ACE inhibitors', 'ARBs', 'NSAIDs', 'digoxin', 'lithium'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Digoxin',
    brandNames: ['Lanoxin'],
    category: 'Cardiac Glycoside – Heart Failure / AF',
    standardAdultDose: '62.5–250 mcg orally once daily (monitor levels)',
    commonInteractions: ['amiodarone', 'verapamil', 'spironolactone', 'erythromycin', 'loop diuretics'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Warfarin',
    brandNames: ['Coumadin', 'Marevan'],
    category: 'Anticoagulant – Vitamin K Antagonist',
    standardAdultDose: '2–10 mg orally once daily (INR-guided)',
    commonInteractions: ['many drugs — always check INR; aspirin, NSAIDs, antibiotics, statins, CYP2C9 modulators'],
    pregnancyCategory: 'X',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Simvastatin',
    brandNames: ['Zocor', 'Simva'],
    category: 'Lipid-lowering – Statin',
    standardAdultDose: '20–40 mg orally once daily at night',
    commonInteractions: ['amlodipine', 'amiodarone', 'clarithromycin', 'ciclosporin', 'warfarin'],
    pregnancyCategory: 'X',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Atorvastatin',
    brandNames: ['Lipitor', 'Sortis'],
    category: 'Lipid-lowering – Statin',
    standardAdultDose: '10–80 mg orally once daily',
    commonInteractions: ['ciclosporin', 'clarithromycin', 'erythromycin', 'warfarin'],
    pregnancyCategory: 'X',
    controlled: false,
    awarClass: null,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// RESPIRATORY — awarClass: null
// ─────────────────────────────────────────────────────────────────────────────

const RESPIRATORY: DrugSeed[] = [
  {
    genericName: 'Salbutamol',
    brandNames: ['Ventolin', 'Salamol', 'Albuterol'],
    category: 'Bronchodilator – Short-acting Beta-2 Agonist',
    standardAdultDose: '100–200 mcg inhaled 4–6-hourly PRN; 2.5 mg nebulised',
    commonInteractions: ['beta-blockers', 'MAOIs', 'digoxin'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Beclomethasone',
    brandNames: ['Becotide', 'Clenil', 'QVAR'],
    category: 'Inhaled Corticosteroid',
    standardAdultDose: '100–400 mcg inhaled 12-hourly',
    commonInteractions: ['ritonavir', 'ketoconazole'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Prednisolone',
    brandNames: ['Deltacortril', 'Prelone'],
    category: 'Corticosteroid – Oral',
    standardAdultDose: '5–60 mg orally once daily (dose depends on indication)',
    commonInteractions: ['NSAIDs', 'warfarin', 'antidiabetics', 'live vaccines', 'rifampicin'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Dexamethasone',
    brandNames: ['Decadron', 'Dexasone'],
    category: 'Corticosteroid – High Potency',
    standardAdultDose: '0.5–9 mg orally/IV daily (dose depends on indication)',
    commonInteractions: ['NSAIDs', 'warfarin', 'antidiabetics', 'live vaccines', 'rifampicin'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Aminophylline',
    brandNames: ['Phyllocontin'],
    category: 'Bronchodilator – Methylxanthine',
    standardAdultDose: '5–6 mg/kg IV over 20 min (loading); 500 mcg/kg/hr infusion',
    commonInteractions: ['erythromycin', 'ciprofloxacin', 'cimetidine', 'rifampicin', 'phenytoin'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Cetirizine',
    brandNames: ['Zyrtec', 'Reactine', 'Zirtek'],
    category: 'Antihistamine – 2nd Generation',
    standardAdultDose: '10 mg orally once daily',
    commonInteractions: ['alcohol', 'CNS depressants'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Chlorphenamine',
    brandNames: ['Piriton', 'Chlor-Trimeton'],
    category: 'Antihistamine – 1st Generation',
    standardAdultDose: '4 mg orally 4–6-hourly (max 24 mg/day)',
    commonInteractions: ['MAOIs', 'alcohol', 'CNS depressants'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: null,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GASTROINTESTINAL — awarClass: null
// ─────────────────────────────────────────────────────────────────────────────

const GASTROINTESTINAL: DrugSeed[] = [
  {
    genericName: 'Omeprazole',
    brandNames: ['Losec', 'Prilosec'],
    category: 'Proton Pump Inhibitor',
    standardAdultDose: '20–40 mg orally once daily (before food)',
    commonInteractions: ['clopidogrel', 'methotrexate', 'warfarin', 'ketoconazole'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Ranitidine',
    brandNames: ['Zantac'],
    category: 'H2-Receptor Antagonist',
    standardAdultDose: '150 mg orally 12-hourly or 300 mg at night',
    commonInteractions: ['warfarin', 'ketoconazole', 'theophylline'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Metoclopramide',
    brandNames: ['Maxolon', 'Reglan', 'Plasil'],
    category: 'Antiemetic – Prokinetic',
    standardAdultDose: '10 mg orally/IV/IM 8-hourly (max 0.5 mg/kg/day)',
    commonInteractions: ['MAOIs', 'antipsychotics', 'opioids', 'CNS depressants'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Ondansetron',
    brandNames: ['Zofran', 'Emeset'],
    category: 'Antiemetic – 5-HT3 Antagonist',
    standardAdultDose: '4–8 mg orally/IV 8-hourly',
    commonInteractions: ['QT-prolonging drugs', 'apomorphine', 'tramadol'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Oral Rehydration Salts',
    brandNames: ['ORS', 'Dioralyte', 'Pedialyte'],
    category: 'Oral Rehydration Therapy',
    standardAdultDose: '200–400 mL after each loose stool',
    commonInteractions: [],
    pregnancyCategory: 'A',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Loperamide',
    brandNames: ['Imodium', 'Lopex'],
    category: 'Antidiarrhoeal – Opioid Receptor Agonist',
    standardAdultDose: '4 mg initially then 2 mg after each loose stool (max 16 mg/day)',
    commonInteractions: ['CNS depressants', 'QT-prolonging drugs'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Bisacodyl',
    brandNames: ['Dulcolax', 'Laxabel'],
    category: 'Laxative – Stimulant',
    standardAdultDose: '5–10 mg orally at night; 10 mg rectally',
    commonInteractions: ['antacids', 'dairy products (enteric coating)'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Zinc Sulphate',
    brandNames: ['Zinc sulphate', 'Zinco'],
    category: 'Micronutrient – Antidiarrhoeal adjunct',
    standardAdultDose: '20 mg (elemental zinc) once daily for 10–14 days (diarrhoea in children)',
    commonInteractions: ['tetracyclines', 'fluoroquinolones', 'iron'],
    pregnancyCategory: 'A',
    controlled: false,
    awarClass: null,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ENDOCRINE — awarClass: null
// ─────────────────────────────────────────────────────────────────────────────

const ENDOCRINE: DrugSeed[] = [
  {
    genericName: 'Metformin',
    brandNames: ['Glucophage', 'Diabex', 'Diaformin'],
    category: 'Antidiabetic – Biguanide',
    standardAdultDose: '500–850 mg orally 8–12-hourly with food (max 3 g/day)',
    commonInteractions: ['alcohol', 'iodinated contrast media', 'cimetidine'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Glibenclamide',
    brandNames: ['Daonil', 'Euglucon'],
    category: 'Antidiabetic – Sulphonylurea',
    standardAdultDose: '2.5–5 mg orally once daily with breakfast (max 15 mg/day)',
    commonInteractions: ['NSAIDs', 'warfarin', 'beta-blockers', 'alcohol', 'fluconazole'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Insulin (Regular)',
    brandNames: ['Actrapid', 'Humulin R'],
    category: 'Antidiabetic – Short-acting Insulin',
    standardAdultDose: 'Individualised; 0.1–0.3 IU/kg SC per dose',
    commonInteractions: ['beta-blockers', 'alcohol', 'ACE inhibitors', 'salicylates'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Insulin Isophane (NPH)',
    brandNames: ['Insulatard', 'Humulin N'],
    category: 'Antidiabetic – Intermediate-acting Insulin',
    standardAdultDose: 'Individualised; typically once or twice daily SC',
    commonInteractions: ['beta-blockers', 'alcohol', 'ACE inhibitors'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Levothyroxine',
    brandNames: ['Eltroxin', 'Synthroid', 'Euthyrox'],
    category: 'Thyroid Hormone',
    standardAdultDose: '50–200 mcg orally once daily (fasting)',
    commonInteractions: ['warfarin', 'antacids', 'calcium', 'iron', 'cholestyramine'],
    pregnancyCategory: 'A',
    controlled: false,
    awarClass: null,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// NEUROLOGICAL / PSYCHIATRIC — awarClass: null
// ─────────────────────────────────────────────────────────────────────────────

const NEUROLOGICAL: DrugSeed[] = [
  {
    genericName: 'Phenytoin',
    brandNames: ['Epanutin', 'Dilantin'],
    category: 'Antiepileptic – Hydantoin',
    standardAdultDose: '100 mg orally 8-hourly; IV 15–20 mg/kg loading (status)',
    commonInteractions: ['warfarin', 'oral contraceptives', 'rifampicin', 'fluconazole', 'isoniazid'],
    pregnancyCategory: 'D',
    controlled: true,
    awarClass: null,
  },
  {
    genericName: 'Carbamazepine',
    brandNames: ['Tegretol', 'Carbatrol'],
    category: 'Antiepileptic / Mood Stabiliser',
    standardAdultDose: '100–400 mg orally 12-hourly',
    commonInteractions: ['many CYP3A4 interactions — warfarin, oral contraceptives, phenytoin, SSRIs'],
    pregnancyCategory: 'D',
    controlled: true,
    awarClass: null,
  },
  {
    genericName: 'Sodium Valproate',
    brandNames: ['Epilim', 'Depakine'],
    category: 'Antiepileptic / Mood Stabiliser',
    standardAdultDose: '600 mg–2.5 g orally daily in 2–3 divided doses',
    commonInteractions: ['lamotrigine', 'carbamazepine', 'aspirin', 'warfarin', 'meropenem'],
    pregnancyCategory: 'D',
    controlled: true,
    awarClass: null,
  },
  {
    genericName: 'Diazepam',
    brandNames: ['Valium', 'Stesolid'],
    category: 'Benzodiazepine – Anxiolytic / Anticonvulsant',
    standardAdultDose: '2–10 mg orally 8–12-hourly; 10 mg IV for seizures',
    commonInteractions: ['CNS depressants', 'alcohol', 'opioids', 'cimetidine'],
    pregnancyCategory: 'D',
    controlled: true,
    awarClass: null,
  },
  {
    genericName: 'Haloperidol',
    brandNames: ['Haldol', 'Serenace'],
    category: 'Antipsychotic – Typical (Butyrophenone)',
    standardAdultDose: '0.5–5 mg orally 12-hourly; 5 mg IM for acute agitation',
    commonInteractions: ['CNS depressants', 'lithium', 'QT-prolonging drugs', 'anticholinergics'],
    pregnancyCategory: 'C',
    controlled: true,
    awarClass: null,
  },
  {
    genericName: 'Chlorpromazine',
    brandNames: ['Largactil', 'Thorazine'],
    category: 'Antipsychotic – Typical (Phenothiazine)',
    standardAdultDose: '25–100 mg orally 8-hourly',
    commonInteractions: ['CNS depressants', 'lithium', 'antihypertensives'],
    pregnancyCategory: 'C',
    controlled: true,
    awarClass: null,
  },
  {
    genericName: 'Amitriptyline',
    brandNames: ['Tryptizol', 'Elavil'],
    category: 'Antidepressant – Tricyclic',
    standardAdultDose: '25–75 mg orally at night (titrate to 150–200 mg if needed)',
    commonInteractions: ['MAOIs', 'SSRIs', 'CNS depressants', 'QT-prolonging drugs', 'anticholinergics'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Fluoxetine',
    brandNames: ['Prozac', 'Sarafem'],
    category: 'Antidepressant – SSRI',
    standardAdultDose: '20 mg orally once daily (morning)',
    commonInteractions: ['MAOIs', 'tramadol', 'lithium', 'warfarin', 'tamoxifen'],
    pregnancyCategory: 'C',
    controlled: false,
    awarClass: null,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// VITAMINS, MINERALS & SUPPLEMENTS — awarClass: null
// ─────────────────────────────────────────────────────────────────────────────

const VITAMINS: DrugSeed[] = [
  {
    genericName: 'Folic Acid',
    brandNames: ['Folvite', 'Folate'],
    category: 'Vitamin – B9',
    standardAdultDose: '5 mg orally once daily (therapeutic); 400 mcg daily (prophylaxis)',
    commonInteractions: ['methotrexate', 'phenytoin', 'sulfonamides'],
    pregnancyCategory: 'A',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Ferrous Sulphate',
    brandNames: ['Feosol', 'Ferograd', 'Iron tablets'],
    category: 'Mineral – Iron Supplement',
    standardAdultDose: '200 mg orally 8-hourly (200 mg = 65 mg elemental iron)',
    commonInteractions: ['tetracyclines', 'fluoroquinolones', 'levothyroxine', 'antacids'],
    pregnancyCategory: 'A',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Vitamin A',
    brandNames: ['Arovit', 'Retinol'],
    category: 'Vitamin – Fat-soluble',
    standardAdultDose: '200,000 IU orally once (supplementation); 50,000–200,000 IU (deficiency)',
    commonInteractions: ['retinoids', 'orlistat'],
    pregnancyCategory: 'A',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Vitamin B12',
    brandNames: ['Cyanocobalamin', 'Cobalamin'],
    category: 'Vitamin – B12',
    standardAdultDose: '1 mg IM/SC every day × 1 week, then weekly × 1 month, then monthly',
    commonInteractions: ['chloramphenicol', 'H2 blockers', 'PPIs', 'metformin'],
    pregnancyCategory: 'A',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Vitamin C (Ascorbic Acid)',
    brandNames: ['Redoxon', 'Ascorbin'],
    category: 'Vitamin – Water-soluble',
    standardAdultDose: '100–250 mg orally once daily',
    commonInteractions: ['warfarin (high doses)', 'iron (enhances absorption)'],
    pregnancyCategory: 'A',
    controlled: false,
    awarClass: null,
  },
  {
    genericName: 'Calcium Carbonate',
    brandNames: ['Caltrate', 'Os-Cal', 'Titralac'],
    category: 'Mineral – Calcium Supplement / Antacid',
    standardAdultDose: '1–2 g elemental calcium orally daily in divided doses',
    commonInteractions: ['tetracyclines', 'fluoroquinolones', 'levothyroxine', 'iron'],
    pregnancyCategory: 'B',
    controlled: false,
    awarClass: null,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMBINED DRUG LIST
// ─────────────────────────────────────────────────────────────────────────────

const ALL_DRUGS: DrugSeed[] = [
  ...ANTIBIOTICS_PENICILLINS,
  ...ANTIBIOTICS_CEPHALOSPORINS,
  ...ANTIBIOTICS_CARBAPENEMS,
  ...ANTIBIOTICS_MACROLIDES,
  ...ANTIBIOTICS_FLUOROQUINOLONES,
  ...ANTIBIOTICS_TETRACYCLINES,
  ...ANTIBIOTICS_SULFONAMIDES,
  ...ANTIBIOTICS_NITROIMIDAZOLES,
  ...ANTIBIOTICS_AMINOGLYCOSIDES,
  ...ANTIBIOTICS_LINCOSAMIDES,
  ...ANTIBIOTICS_OTHER,
  ...ANTIFUNGALS,
  ...ANTIPARASITICS,
  ...ANTIVIRALS,
  ...ANALGESICS,
  ...CARDIOVASCULAR,
  ...RESPIRATORY,
  ...GASTROINTESTINAL,
  ...ENDOCRINE,
  ...NEUROLOGICAL,
  ...VITAMINS,
];

// ─────────────────────────────────────────────────────────────────────────────
// SEED RUNNER
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding ${ALL_DRUGS.length} drugs…`);

  let created = 0;
  let updated = 0;

  for (const drug of ALL_DRUGS) {
    const result = await prisma.drugDatabase.upsert({
      where: { genericName: drug.genericName },
      create: {
        genericName:       drug.genericName,
        brandNames:        drug.brandNames,
        category:          drug.category,
        standardAdultDose: drug.standardAdultDose,
        commonInteractions: drug.commonInteractions,
        pregnancyCategory: drug.pregnancyCategory,
        controlled:        drug.controlled,
        awarClass:         drug.awarClass,
      },
      update: {
        brandNames:        drug.brandNames,
        category:          drug.category,
        standardAdultDose: drug.standardAdultDose,
        commonInteractions: drug.commonInteractions,
        pregnancyCategory: drug.pregnancyCategory,
        controlled:        drug.controlled,
        awarClass:         drug.awarClass,
      },
    });

    // Detect create vs update by checking timestamps (prisma upsert doesn't return isNew)
    if (result.createdAt.getTime() === result.updatedAt?.getTime()) {
      created++;
    } else {
      updated++;
    }
  }

  // Summary by AWaRe class
  const awarSummary = {
    ACCESS:  ALL_DRUGS.filter(d => d.awarClass === 'ACCESS').length,
    WATCH:   ALL_DRUGS.filter(d => d.awarClass === 'WATCH').length,
    RESERVE: ALL_DRUGS.filter(d => d.awarClass === 'RESERVE').length,
    null:    ALL_DRUGS.filter(d => d.awarClass === null).length,
  };

  console.log(`\nDone. ${created} created, ${updated} updated.`);
  console.log('\nAWaRe classification summary (antibiotics only):');
  console.log(`  ACCESS  (first-line):  ${awarSummary.ACCESS} antibiotics`);
  console.log(`  WATCH   (second-line): ${awarSummary.WATCH} antibiotics`);
  console.log(`  RESERVE (last-resort): ${awarSummary.RESERVE} antibiotics`);
  console.log(`  null    (non-antibiotic or anti-TB): ${awarSummary.null} drugs`);
  console.log('\nAWaRe applies ONLY to antibacterials. null is correct for antifungals,');
  console.log('antivirals, antiparasitics, analgesics, cardiovascular, etc.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
