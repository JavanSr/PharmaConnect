/**
 * Demo data seeder for APOTEKH marketing screenshots.
 *
 * SAFETY: Only modifies data for Amani Pharmacy (PH-AR-2024-001) and
 * KWD Wholesale (WH-AR-2024-001). The founder@pharmaconnect.tz account
 * and its data are NEVER touched.
 *
 * Run via: npm run db:seed:demo  (from backend/)
 */

import {
  PrismaClient,
  Prisma,
  MovementType,
  DosageForm,
  DrugClass,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// ─── Target pharmacy licences (never founder) ─────────────────────────────────
const AMANI_LICENCE = 'PH-AR-2024-001';
const KWD_LICENCE = 'WH-AR-2024-001';
const DEMO_PASSWORD = 'Demo123!';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randDecimal(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function chunk<T>(rows: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size));
  return chunks;
}

// Volume per day — older = lower, recent = higher, weekends = lighter
function dailyVolume(daysBack: number): number {
  const dayOfWeek = new Date(Date.now() - daysBack * 86400000).getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  if (daysBack >= 25) return isWeekend ? randInt(12, 18) : randInt(18, 26);
  if (daysBack >= 15) return isWeekend ? randInt(20, 28) : randInt(28, 38);
  if (daysBack >= 7)  return isWeekend ? randInt(28, 36) : randInt(38, 50);
  return isWeekend ? randInt(36, 45) : randInt(50, 65);
}

// ─── Product catalogue definition ─────────────────────────────────────────────

interface ProductDef {
  name: string;
  genericName: string;
  dosageForm: DosageForm;
  strength: string;
  drugClass: DrugClass;
  sellingPrice: number;
  purchasePrice: number;
  reorderLevel: number;
  therapeuticCategory: string;
  manufacturer?: string;
  storageCondition?: string;
  fastMover?: boolean; // ~70% of sales volume
}

const PRODUCTS: ProductDef[] = [
  // Analgesics
  { name: 'Paracetamol 500mg Tablets', genericName: 'Paracetamol', dosageForm: DosageForm.TABLET, strength: '500mg', drugClass: DrugClass.OTC, sellingPrice: 500, purchasePrice: 250, reorderLevel: 200, therapeuticCategory: 'Analgesics', manufacturer: 'Shelys Pharma Ltd', fastMover: true },
  { name: 'Paracetamol Syrup 125mg/5ml', genericName: 'Paracetamol', dosageForm: DosageForm.SYRUP, strength: '125mg/5ml', drugClass: DrugClass.OTC, sellingPrice: 3500, purchasePrice: 1800, reorderLevel: 50, therapeuticCategory: 'Analgesics', manufacturer: 'Shelys Pharma Ltd', fastMover: true },
  { name: 'Ibuprofen 400mg Tablets', genericName: 'Ibuprofen', dosageForm: DosageForm.TABLET, strength: '400mg', drugClass: DrugClass.OTC, sellingPrice: 800, purchasePrice: 400, reorderLevel: 100, therapeuticCategory: 'Analgesics', manufacturer: 'Beta Healthcare', fastMover: true },
  { name: 'Diclofenac 50mg Tablets', genericName: 'Diclofenac Sodium', dosageForm: DosageForm.TABLET, strength: '50mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 1200, purchasePrice: 600, reorderLevel: 80, therapeuticCategory: 'Analgesics', manufacturer: 'Interchem EA' },
  { name: 'Diclofenac 75mg/3ml Injection', genericName: 'Diclofenac Sodium', dosageForm: DosageForm.INJECTION, strength: '75mg/3ml', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 2500, purchasePrice: 1200, reorderLevel: 20, therapeuticCategory: 'Analgesics', manufacturer: 'Zenufa Laboratories' },
  { name: 'Tramadol 50mg Capsules', genericName: 'Tramadol HCl', dosageForm: DosageForm.CAPSULE, strength: '50mg', drugClass: DrugClass.CONTROLLED, sellingPrice: 2000, purchasePrice: 1000, reorderLevel: 30, therapeuticCategory: 'Analgesics', manufacturer: 'Dawa Industries' },
  { name: 'Codeine Phosphate 30mg Tablets', genericName: 'Codeine Phosphate', dosageForm: DosageForm.TABLET, strength: '30mg', drugClass: DrugClass.CONTROLLED, sellingPrice: 3000, purchasePrice: 1500, reorderLevel: 20, therapeuticCategory: 'Analgesics', manufacturer: 'MSD Tanzania' },
  { name: 'Meloxicam 15mg Tablets', genericName: 'Meloxicam', dosageForm: DosageForm.TABLET, strength: '15mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 1800, purchasePrice: 900, reorderLevel: 40, therapeuticCategory: 'Analgesics', manufacturer: 'Beta Healthcare' },
  { name: 'Naproxen 500mg Tablets', genericName: 'Naproxen', dosageForm: DosageForm.TABLET, strength: '500mg', drugClass: DrugClass.OTC, sellingPrice: 1500, purchasePrice: 750, reorderLevel: 50, therapeuticCategory: 'Analgesics', manufacturer: 'Shelys Pharma Ltd' },

  // Antibiotics
  { name: 'Amoxicillin 500mg Capsules', genericName: 'Amoxicillin', dosageForm: DosageForm.CAPSULE, strength: '500mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 1500, purchasePrice: 700, reorderLevel: 150, therapeuticCategory: 'Antibiotics', manufacturer: 'Shelys Pharma Ltd', fastMover: true },
  { name: 'Amoxicillin 125mg/5ml Syrup', genericName: 'Amoxicillin', dosageForm: DosageForm.SYRUP, strength: '125mg/5ml', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 4500, purchasePrice: 2200, reorderLevel: 60, therapeuticCategory: 'Antibiotics', manufacturer: 'Shelys Pharma Ltd', fastMover: true },
  { name: 'Ampicillin 500mg Capsules', genericName: 'Ampicillin', dosageForm: DosageForm.CAPSULE, strength: '500mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 1200, purchasePrice: 600, reorderLevel: 50, therapeuticCategory: 'Antibiotics', manufacturer: 'Zenufa Laboratories' },
  { name: 'Ciprofloxacin 500mg Tablets', genericName: 'Ciprofloxacin', dosageForm: DosageForm.TABLET, strength: '500mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 2000, purchasePrice: 1000, reorderLevel: 80, therapeuticCategory: 'Antibiotics', manufacturer: 'Beta Healthcare' },
  { name: 'Metronidazole 400mg Tablets', genericName: 'Metronidazole', dosageForm: DosageForm.TABLET, strength: '400mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 800, purchasePrice: 400, reorderLevel: 120, therapeuticCategory: 'Antibiotics', manufacturer: 'Shelys Pharma Ltd', fastMover: true },
  { name: 'Metronidazole 200mg/5ml Syrup', genericName: 'Metronidazole', dosageForm: DosageForm.SYRUP, strength: '200mg/5ml', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 3500, purchasePrice: 1700, reorderLevel: 40, therapeuticCategory: 'Antibiotics', manufacturer: 'Zenufa Laboratories' },
  { name: 'Azithromycin 500mg Tablets', genericName: 'Azithromycin', dosageForm: DosageForm.TABLET, strength: '500mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 5000, purchasePrice: 2500, reorderLevel: 60, therapeuticCategory: 'Antibiotics', manufacturer: 'Interchem EA' },
  { name: 'Erythromycin 500mg Tablets', genericName: 'Erythromycin', dosageForm: DosageForm.TABLET, strength: '500mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 2500, purchasePrice: 1200, reorderLevel: 40, therapeuticCategory: 'Antibiotics', manufacturer: 'Dawa Industries' },
  { name: 'Doxycycline 100mg Capsules', genericName: 'Doxycycline', dosageForm: DosageForm.CAPSULE, strength: '100mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 1800, purchasePrice: 900, reorderLevel: 50, therapeuticCategory: 'Antibiotics', manufacturer: 'Beta Healthcare' },
  { name: 'Co-trimoxazole 480mg Tablets', genericName: 'Co-trimoxazole', dosageForm: DosageForm.TABLET, strength: '480mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 600, purchasePrice: 300, reorderLevel: 100, therapeuticCategory: 'Antibiotics', manufacturer: 'Shelys Pharma Ltd' },
  { name: 'Cloxacillin 500mg Capsules', genericName: 'Cloxacillin', dosageForm: DosageForm.CAPSULE, strength: '500mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 2000, purchasePrice: 1000, reorderLevel: 30, therapeuticCategory: 'Antibiotics', manufacturer: 'Zenufa Laboratories' },
  { name: 'Clindamycin 300mg Capsules', genericName: 'Clindamycin', dosageForm: DosageForm.CAPSULE, strength: '300mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 4000, purchasePrice: 2000, reorderLevel: 25, therapeuticCategory: 'Antibiotics', manufacturer: 'Interchem EA' },
  { name: 'Gentamicin 80mg/2ml Injection', genericName: 'Gentamicin', dosageForm: DosageForm.INJECTION, strength: '80mg/2ml', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 3500, purchasePrice: 1800, reorderLevel: 20, therapeuticCategory: 'Antibiotics', manufacturer: 'MSD Tanzania' },
  { name: 'Ceftriaxone 1g Injection', genericName: 'Ceftriaxone', dosageForm: DosageForm.INJECTION, strength: '1g', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 8000, purchasePrice: 4000, reorderLevel: 20, therapeuticCategory: 'Antibiotics', manufacturer: 'Beta Healthcare' },

  // Antimalarials
  { name: 'Coartem 20/120mg Tablets', genericName: 'Artemether/Lumefantrine', dosageForm: DosageForm.TABLET, strength: '20/120mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 15000, purchasePrice: 8000, reorderLevel: 80, therapeuticCategory: 'Antimalarials', manufacturer: 'Novartis/MSD', fastMover: true },
  { name: 'Artesunate 50mg Tablets', genericName: 'Artesunate', dosageForm: DosageForm.TABLET, strength: '50mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 5000, purchasePrice: 2500, reorderLevel: 40, therapeuticCategory: 'Antimalarials', manufacturer: 'Zenufa Laboratories', fastMover: true },
  { name: 'Quinine 300mg Tablets', genericName: 'Quinine Sulphate', dosageForm: DosageForm.TABLET, strength: '300mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 3000, purchasePrice: 1500, reorderLevel: 30, therapeuticCategory: 'Antimalarials', manufacturer: 'Shelys Pharma Ltd' },
  { name: 'Chloroquine 250mg Tablets', genericName: 'Chloroquine Phosphate', dosageForm: DosageForm.TABLET, strength: '250mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 2000, purchasePrice: 1000, reorderLevel: 25, therapeuticCategory: 'Antimalarials', manufacturer: 'Dawa Industries' },
  { name: 'SP Fansidar Tablets', genericName: 'Sulfadoxine/Pyrimethamine', dosageForm: DosageForm.TABLET, strength: '500/25mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 2500, purchasePrice: 1200, reorderLevel: 40, therapeuticCategory: 'Antimalarials', manufacturer: 'Roche/Interchem' },
  { name: 'DHA-PPQ 320/40mg Tablets', genericName: 'Dihydroartemisinin/Piperaquine', dosageForm: DosageForm.TABLET, strength: '320/40mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 18000, purchasePrice: 10000, reorderLevel: 20, therapeuticCategory: 'Antimalarials', manufacturer: 'Beta Healthcare' },
  { name: 'Rapid Malaria Test (RDT)', genericName: 'Malaria Antigen RDT', dosageForm: DosageForm.OTHER, strength: 'N/A', drugClass: DrugClass.OTC, sellingPrice: 5000, purchasePrice: 2500, reorderLevel: 50, therapeuticCategory: 'Diagnostics', manufacturer: 'SD Biosensor', fastMover: true },

  // Gastrointestinal
  { name: 'ORS Sachets (WHO Formula)', genericName: 'Oral Rehydration Salts', dosageForm: DosageForm.POWDER, strength: '13.5g/sachet', drugClass: DrugClass.OTC, sellingPrice: 500, purchasePrice: 200, reorderLevel: 200, therapeuticCategory: 'Gastrointestinal', manufacturer: 'MSD Tanzania', fastMover: true },
  { name: 'Omeprazole 20mg Capsules', genericName: 'Omeprazole', dosageForm: DosageForm.CAPSULE, strength: '20mg', drugClass: DrugClass.OTC, sellingPrice: 1500, purchasePrice: 750, reorderLevel: 100, therapeuticCategory: 'Gastrointestinal', manufacturer: 'Beta Healthcare', fastMover: true },
  { name: 'Ranitidine 150mg Tablets', genericName: 'Ranitidine', dosageForm: DosageForm.TABLET, strength: '150mg', drugClass: DrugClass.OTC, sellingPrice: 1000, purchasePrice: 500, reorderLevel: 60, therapeuticCategory: 'Gastrointestinal', manufacturer: 'Shelys Pharma Ltd' },
  { name: 'Metoclopramide 10mg Tablets', genericName: 'Metoclopramide', dosageForm: DosageForm.TABLET, strength: '10mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 800, purchasePrice: 400, reorderLevel: 50, therapeuticCategory: 'Gastrointestinal', manufacturer: 'Zenufa Laboratories' },
  { name: 'Loperamide 2mg Capsules', genericName: 'Loperamide', dosageForm: DosageForm.CAPSULE, strength: '2mg', drugClass: DrugClass.OTC, sellingPrice: 700, purchasePrice: 350, reorderLevel: 60, therapeuticCategory: 'Gastrointestinal', manufacturer: 'Interchem EA' },
  { name: 'Senna 7.5mg Tablets', genericName: 'Sennosides', dosageForm: DosageForm.TABLET, strength: '7.5mg', drugClass: DrugClass.OTC, sellingPrice: 500, purchasePrice: 250, reorderLevel: 40, therapeuticCategory: 'Gastrointestinal', manufacturer: 'Dawa Industries' },
  { name: 'Bisacodyl 5mg Tablets', genericName: 'Bisacodyl', dosageForm: DosageForm.TABLET, strength: '5mg', drugClass: DrugClass.OTC, sellingPrice: 600, purchasePrice: 300, reorderLevel: 40, therapeuticCategory: 'Gastrointestinal', manufacturer: 'Beta Healthcare' },
  { name: 'Domperidone 10mg Tablets', genericName: 'Domperidone', dosageForm: DosageForm.TABLET, strength: '10mg', drugClass: DrugClass.OTC, sellingPrice: 1200, purchasePrice: 600, reorderLevel: 40, therapeuticCategory: 'Gastrointestinal', manufacturer: 'Shelys Pharma Ltd' },
  { name: 'Zinc Sulphate 20mg Syrup', genericName: 'Zinc Sulphate', dosageForm: DosageForm.SYRUP, strength: '20mg/5ml', drugClass: DrugClass.OTC, sellingPrice: 3000, purchasePrice: 1500, reorderLevel: 50, therapeuticCategory: 'Gastrointestinal', manufacturer: 'MSD Tanzania', fastMover: true },

  // Cardiovascular
  { name: 'Atenolol 50mg Tablets', genericName: 'Atenolol', dosageForm: DosageForm.TABLET, strength: '50mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 1000, purchasePrice: 500, reorderLevel: 80, therapeuticCategory: 'Cardiovascular', manufacturer: 'Shelys Pharma Ltd' },
  { name: 'Amlodipine 5mg Tablets', genericName: 'Amlodipine', dosageForm: DosageForm.TABLET, strength: '5mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 1500, purchasePrice: 750, reorderLevel: 80, therapeuticCategory: 'Cardiovascular', manufacturer: 'Beta Healthcare', fastMover: true },
  { name: 'Amlodipine 10mg Tablets', genericName: 'Amlodipine', dosageForm: DosageForm.TABLET, strength: '10mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 2000, purchasePrice: 1000, reorderLevel: 60, therapeuticCategory: 'Cardiovascular', manufacturer: 'Beta Healthcare' },
  { name: 'Lisinopril 10mg Tablets', genericName: 'Lisinopril', dosageForm: DosageForm.TABLET, strength: '10mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 1800, purchasePrice: 900, reorderLevel: 60, therapeuticCategory: 'Cardiovascular', manufacturer: 'Interchem EA', fastMover: true },
  { name: 'Losartan 50mg Tablets', genericName: 'Losartan Potassium', dosageForm: DosageForm.TABLET, strength: '50mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 2500, purchasePrice: 1200, reorderLevel: 50, therapeuticCategory: 'Cardiovascular', manufacturer: 'Zenufa Laboratories' },
  { name: 'Furosemide 40mg Tablets', genericName: 'Furosemide', dosageForm: DosageForm.TABLET, strength: '40mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 800, purchasePrice: 400, reorderLevel: 50, therapeuticCategory: 'Cardiovascular', manufacturer: 'Shelys Pharma Ltd' },
  { name: 'Hydrochlorothiazide 25mg Tablets', genericName: 'Hydrochlorothiazide', dosageForm: DosageForm.TABLET, strength: '25mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 600, purchasePrice: 300, reorderLevel: 50, therapeuticCategory: 'Cardiovascular', manufacturer: 'Dawa Industries' },
  { name: 'Atorvastatin 20mg Tablets', genericName: 'Atorvastatin', dosageForm: DosageForm.TABLET, strength: '20mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 3000, purchasePrice: 1500, reorderLevel: 50, therapeuticCategory: 'Cardiovascular', manufacturer: 'Beta Healthcare', fastMover: true },
  { name: 'Simvastatin 20mg Tablets', genericName: 'Simvastatin', dosageForm: DosageForm.TABLET, strength: '20mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 2500, purchasePrice: 1200, reorderLevel: 40, therapeuticCategory: 'Cardiovascular', manufacturer: 'Interchem EA' },
  { name: 'Nifedipine 10mg Capsules', genericName: 'Nifedipine', dosageForm: DosageForm.CAPSULE, strength: '10mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 1500, purchasePrice: 750, reorderLevel: 30, therapeuticCategory: 'Cardiovascular', manufacturer: 'Shelys Pharma Ltd' },
  { name: 'Propranolol 40mg Tablets', genericName: 'Propranolol', dosageForm: DosageForm.TABLET, strength: '40mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 1200, purchasePrice: 600, reorderLevel: 30, therapeuticCategory: 'Cardiovascular', manufacturer: 'Zenufa Laboratories' },
  { name: 'Digoxin 0.25mg Tablets', genericName: 'Digoxin', dosageForm: DosageForm.TABLET, strength: '0.25mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 2000, purchasePrice: 1000, reorderLevel: 20, therapeuticCategory: 'Cardiovascular', manufacturer: 'MSD Tanzania' },
  { name: 'Warfarin 5mg Tablets', genericName: 'Warfarin', dosageForm: DosageForm.TABLET, strength: '5mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 2500, purchasePrice: 1200, reorderLevel: 15, therapeuticCategory: 'Cardiovascular', manufacturer: 'Dawa Industries' },
  { name: 'Captopril 25mg Tablets', genericName: 'Captopril', dosageForm: DosageForm.TABLET, strength: '25mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 1000, purchasePrice: 500, reorderLevel: 40, therapeuticCategory: 'Cardiovascular', manufacturer: 'Beta Healthcare' },

  // Diabetes/Endocrine
  { name: 'Metformin 500mg Tablets', genericName: 'Metformin HCl', dosageForm: DosageForm.TABLET, strength: '500mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 800, purchasePrice: 400, reorderLevel: 100, therapeuticCategory: 'Diabetes', manufacturer: 'Shelys Pharma Ltd', fastMover: true },
  { name: 'Metformin 850mg Tablets', genericName: 'Metformin HCl', dosageForm: DosageForm.TABLET, strength: '850mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 1200, purchasePrice: 600, reorderLevel: 60, therapeuticCategory: 'Diabetes', manufacturer: 'Shelys Pharma Ltd' },
  { name: 'Glibenclamide 5mg Tablets', genericName: 'Glibenclamide', dosageForm: DosageForm.TABLET, strength: '5mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 600, purchasePrice: 300, reorderLevel: 60, therapeuticCategory: 'Diabetes', manufacturer: 'Zenufa Laboratories' },
  { name: 'Glimepiride 2mg Tablets', genericName: 'Glimepiride', dosageForm: DosageForm.TABLET, strength: '2mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 2500, purchasePrice: 1200, reorderLevel: 30, therapeuticCategory: 'Diabetes', manufacturer: 'Interchem EA' },
  { name: 'Insulin Regular 100IU/ml', genericName: 'Insulin (Regular)', dosageForm: DosageForm.INJECTION, strength: '100IU/ml', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 15000, purchasePrice: 8000, reorderLevel: 15, therapeuticCategory: 'Diabetes', manufacturer: 'Novo Nordisk/MSD', storageCondition: 'REFRIGERATED' },
  { name: 'Insulin NPH 100IU/ml', genericName: 'Insulin (NPH)', dosageForm: DosageForm.INJECTION, strength: '100IU/ml', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 15000, purchasePrice: 8000, reorderLevel: 15, therapeuticCategory: 'Diabetes', manufacturer: 'Novo Nordisk/MSD', storageCondition: 'REFRIGERATED' },
  { name: 'Prednisolone 5mg Tablets', genericName: 'Prednisolone', dosageForm: DosageForm.TABLET, strength: '5mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 500, purchasePrice: 250, reorderLevel: 60, therapeuticCategory: 'Endocrine', manufacturer: 'Shelys Pharma Ltd' },
  { name: 'Levothyroxine 50mcg Tablets', genericName: 'Levothyroxine', dosageForm: DosageForm.TABLET, strength: '50mcg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 1500, purchasePrice: 750, reorderLevel: 30, therapeuticCategory: 'Endocrine', manufacturer: 'Beta Healthcare' },

  // Respiratory
  { name: 'Salbutamol 100mcg Inhaler', genericName: 'Salbutamol', dosageForm: DosageForm.INHALER, strength: '100mcg/dose', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 12000, purchasePrice: 6000, reorderLevel: 30, therapeuticCategory: 'Respiratory', manufacturer: 'GSK/Interchem', fastMover: true },
  { name: 'Salbutamol 2mg Tablets', genericName: 'Salbutamol', dosageForm: DosageForm.TABLET, strength: '2mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 800, purchasePrice: 400, reorderLevel: 50, therapeuticCategory: 'Respiratory', manufacturer: 'Shelys Pharma Ltd' },
  { name: 'Beclomethasone 100mcg Inhaler', genericName: 'Beclomethasone', dosageForm: DosageForm.INHALER, strength: '100mcg/dose', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 18000, purchasePrice: 9500, reorderLevel: 15, therapeuticCategory: 'Respiratory', manufacturer: 'GSK/MSD' },
  { name: 'Theophylline 200mg Tablets', genericName: 'Theophylline', dosageForm: DosageForm.TABLET, strength: '200mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 1500, purchasePrice: 750, reorderLevel: 30, therapeuticCategory: 'Respiratory', manufacturer: 'Zenufa Laboratories' },
  { name: 'Bromhexine 8mg Tablets', genericName: 'Bromhexine', dosageForm: DosageForm.TABLET, strength: '8mg', drugClass: DrugClass.OTC, sellingPrice: 800, purchasePrice: 400, reorderLevel: 40, therapeuticCategory: 'Respiratory', manufacturer: 'Dawa Industries' },
  { name: 'Cetirizine 10mg Tablets', genericName: 'Cetirizine', dosageForm: DosageForm.TABLET, strength: '10mg', drugClass: DrugClass.OTC, sellingPrice: 1000, purchasePrice: 500, reorderLevel: 60, therapeuticCategory: 'Antihistamines', manufacturer: 'Beta Healthcare', fastMover: true },
  { name: 'Loratadine 10mg Tablets', genericName: 'Loratadine', dosageForm: DosageForm.TABLET, strength: '10mg', drugClass: DrugClass.OTC, sellingPrice: 1200, purchasePrice: 600, reorderLevel: 50, therapeuticCategory: 'Antihistamines', manufacturer: 'Interchem EA' },
  { name: 'Chlorphenamine 4mg Tablets', genericName: 'Chlorphenamine', dosageForm: DosageForm.TABLET, strength: '4mg', drugClass: DrugClass.OTC, sellingPrice: 400, purchasePrice: 200, reorderLevel: 80, therapeuticCategory: 'Antihistamines', manufacturer: 'Shelys Pharma Ltd', fastMover: true },

  // Vitamins & Supplements
  { name: 'Vitamin C 500mg Tablets', genericName: 'Ascorbic Acid', dosageForm: DosageForm.TABLET, strength: '500mg', drugClass: DrugClass.OTC, sellingPrice: 800, purchasePrice: 400, reorderLevel: 100, therapeuticCategory: 'Vitamins', manufacturer: 'Dawa Industries', fastMover: true },
  { name: 'Ferrous Sulphate 200mg Tablets', genericName: 'Ferrous Sulphate', dosageForm: DosageForm.TABLET, strength: '200mg', drugClass: DrugClass.OTC, sellingPrice: 600, purchasePrice: 300, reorderLevel: 100, therapeuticCategory: 'Vitamins', manufacturer: 'Shelys Pharma Ltd', fastMover: true },
  { name: 'Folic Acid 5mg Tablets', genericName: 'Folic Acid', dosageForm: DosageForm.TABLET, strength: '5mg', drugClass: DrugClass.OTC, sellingPrice: 400, purchasePrice: 200, reorderLevel: 80, therapeuticCategory: 'Vitamins', manufacturer: 'Beta Healthcare', fastMover: true },
  { name: 'Zinc Sulphate 20mg Tablets', genericName: 'Zinc Sulphate', dosageForm: DosageForm.TABLET, strength: '20mg', drugClass: DrugClass.OTC, sellingPrice: 500, purchasePrice: 250, reorderLevel: 60, therapeuticCategory: 'Vitamins', manufacturer: 'MSD Tanzania' },
  { name: 'Multivitamin Tablets', genericName: 'Multivitamin', dosageForm: DosageForm.TABLET, strength: 'Standard', drugClass: DrugClass.OTC, sellingPrice: 1500, purchasePrice: 750, reorderLevel: 80, therapeuticCategory: 'Vitamins', manufacturer: 'Interchem EA', fastMover: true },
  { name: 'Calcium + Vitamin D3 Tablets', genericName: 'Calcium Carbonate + Cholecalciferol', dosageForm: DosageForm.TABLET, strength: '1250mg + 400IU', drugClass: DrugClass.OTC, sellingPrice: 2000, purchasePrice: 1000, reorderLevel: 40, therapeuticCategory: 'Vitamins', manufacturer: 'Zenufa Laboratories' },
  { name: 'Vitamin A 200,000 IU Capsules', genericName: 'Retinol Palmitate', dosageForm: DosageForm.CAPSULE, strength: '200,000 IU', drugClass: DrugClass.OTC, sellingPrice: 1000, purchasePrice: 500, reorderLevel: 30, therapeuticCategory: 'Vitamins', manufacturer: 'MSD Tanzania' },

  // Dermatology
  { name: 'Hydrocortisone 1% Cream', genericName: 'Hydrocortisone', dosageForm: DosageForm.CREAM, strength: '1%', drugClass: DrugClass.OTC, sellingPrice: 3500, purchasePrice: 1800, reorderLevel: 30, therapeuticCategory: 'Dermatology', manufacturer: 'Shelys Pharma Ltd', fastMover: true },
  { name: 'Betamethasone 0.1% Cream', genericName: 'Betamethasone', dosageForm: DosageForm.CREAM, strength: '0.1%', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 4500, purchasePrice: 2200, reorderLevel: 20, therapeuticCategory: 'Dermatology', manufacturer: 'Beta Healthcare' },
  { name: 'Clotrimazole 1% Cream', genericName: 'Clotrimazole', dosageForm: DosageForm.CREAM, strength: '1%', drugClass: DrugClass.OTC, sellingPrice: 4000, purchasePrice: 2000, reorderLevel: 30, therapeuticCategory: 'Dermatology', manufacturer: 'Interchem EA', fastMover: true },
  { name: 'Miconazole 2% Cream', genericName: 'Miconazole', dosageForm: DosageForm.CREAM, strength: '2%', drugClass: DrugClass.OTC, sellingPrice: 4500, purchasePrice: 2200, reorderLevel: 20, therapeuticCategory: 'Dermatology', manufacturer: 'Zenufa Laboratories' },
  { name: 'Gentian Violet 0.5% Solution', genericName: 'Crystal Violet', dosageForm: DosageForm.SOLUTION, strength: '0.5%', drugClass: DrugClass.OTC, sellingPrice: 2000, purchasePrice: 1000, reorderLevel: 20, therapeuticCategory: 'Dermatology', manufacturer: 'Dawa Industries' },
  { name: 'Silver Sulfadiazine 1% Cream', genericName: 'Silver Sulfadiazine', dosageForm: DosageForm.CREAM, strength: '1%', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 8000, purchasePrice: 4000, reorderLevel: 10, therapeuticCategory: 'Dermatology', manufacturer: 'MSD Tanzania' },

  // Eye/Ear
  { name: 'Chloramphenicol 0.5% Eye Drops', genericName: 'Chloramphenicol', dosageForm: DosageForm.DROPS, strength: '0.5%', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 3500, purchasePrice: 1800, reorderLevel: 25, therapeuticCategory: 'Ophthalmology', manufacturer: 'Beta Healthcare', fastMover: true },
  { name: 'Chloramphenicol 1% Eye Ointment', genericName: 'Chloramphenicol', dosageForm: DosageForm.OINTMENT, strength: '1%', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 4000, purchasePrice: 2000, reorderLevel: 20, therapeuticCategory: 'Ophthalmology', manufacturer: 'Interchem EA' },
  { name: 'Ciprofloxacin 0.3% Eye Drops', genericName: 'Ciprofloxacin', dosageForm: DosageForm.DROPS, strength: '0.3%', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 5000, purchasePrice: 2500, reorderLevel: 15, therapeuticCategory: 'Ophthalmology', manufacturer: 'Shelys Pharma Ltd' },
  { name: 'Prednisolone 1% Eye Drops', genericName: 'Prednisolone Acetate', dosageForm: DosageForm.DROPS, strength: '1%', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 6000, purchasePrice: 3000, reorderLevel: 10, therapeuticCategory: 'Ophthalmology', manufacturer: 'Beta Healthcare' },
  { name: 'Timolol 0.5% Eye Drops', genericName: 'Timolol Maleate', dosageForm: DosageForm.DROPS, strength: '0.5%', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 7000, purchasePrice: 3500, reorderLevel: 10, therapeuticCategory: 'Ophthalmology', manufacturer: 'MSD Tanzania' },

  // Obstetrics
  { name: 'Misoprostol 200mcg Tablets', genericName: 'Misoprostol', dosageForm: DosageForm.TABLET, strength: '200mcg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 5000, purchasePrice: 2500, reorderLevel: 20, therapeuticCategory: 'Obstetrics', manufacturer: 'MSD Tanzania' },
  { name: 'Magnesium Sulphate 50% 10ml', genericName: 'Magnesium Sulphate', dosageForm: DosageForm.INJECTION, strength: '50% 10ml', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 6000, purchasePrice: 3000, reorderLevel: 15, therapeuticCategory: 'Obstetrics', manufacturer: 'Zenufa Laboratories' },
  { name: 'Combined OCP 30mcg/150mcg', genericName: 'Ethinylestradiol/Levonorgestrel', dosageForm: DosageForm.TABLET, strength: '30/150mcg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 2000, purchasePrice: 1000, reorderLevel: 50, therapeuticCategory: 'Contraception', manufacturer: 'Beta Healthcare', fastMover: true },
  { name: 'Emergency Contraceptive 1.5mg', genericName: 'Levonorgestrel', dosageForm: DosageForm.TABLET, strength: '1.5mg', drugClass: DrugClass.OTC, sellingPrice: 5000, purchasePrice: 2500, reorderLevel: 30, therapeuticCategory: 'Contraception', manufacturer: 'Interchem EA', fastMover: true },
  { name: 'Fluconazole 150mg Capsules', genericName: 'Fluconazole', dosageForm: DosageForm.CAPSULE, strength: '150mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 4000, purchasePrice: 2000, reorderLevel: 30, therapeuticCategory: 'Antifungals', manufacturer: 'Shelys Pharma Ltd', fastMover: true },

  // Neurology/Psychiatry
  { name: 'Diazepam 5mg Tablets', genericName: 'Diazepam', dosageForm: DosageForm.TABLET, strength: '5mg', drugClass: DrugClass.CONTROLLED, sellingPrice: 1500, purchasePrice: 750, reorderLevel: 25, therapeuticCategory: 'Neurology', manufacturer: 'Shelys Pharma Ltd' },
  { name: 'Phenobarbitone 30mg Tablets', genericName: 'Phenobarbital', dosageForm: DosageForm.TABLET, strength: '30mg', drugClass: DrugClass.CONTROLLED, sellingPrice: 1000, purchasePrice: 500, reorderLevel: 30, therapeuticCategory: 'Neurology', manufacturer: 'Zenufa Laboratories' },
  { name: 'Carbamazepine 200mg Tablets', genericName: 'Carbamazepine', dosageForm: DosageForm.TABLET, strength: '200mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 2000, purchasePrice: 1000, reorderLevel: 30, therapeuticCategory: 'Neurology', manufacturer: 'Beta Healthcare' },
  { name: 'Phenytoin 100mg Capsules', genericName: 'Phenytoin', dosageForm: DosageForm.CAPSULE, strength: '100mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 1500, purchasePrice: 750, reorderLevel: 20, therapeuticCategory: 'Neurology', manufacturer: 'Dawa Industries' },
  { name: 'Amitriptyline 25mg Tablets', genericName: 'Amitriptyline', dosageForm: DosageForm.TABLET, strength: '25mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 1200, purchasePrice: 600, reorderLevel: 25, therapeuticCategory: 'Psychiatry', manufacturer: 'Interchem EA' },
  { name: 'Haloperidol 5mg Tablets', genericName: 'Haloperidol', dosageForm: DosageForm.TABLET, strength: '5mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 1800, purchasePrice: 900, reorderLevel: 20, therapeuticCategory: 'Psychiatry', manufacturer: 'Shelys Pharma Ltd' },
  { name: 'Chlorpromazine 100mg Tablets', genericName: 'Chlorpromazine', dosageForm: DosageForm.TABLET, strength: '100mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 1500, purchasePrice: 750, reorderLevel: 15, therapeuticCategory: 'Psychiatry', manufacturer: 'Zenufa Laboratories' },

  // HIV/Infectious Disease
  { name: 'TDF/3TC/EFV 300/300/600mg', genericName: 'Tenofovir/Lamivudine/Efavirenz', dosageForm: DosageForm.TABLET, strength: '300/300/600mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 35000, purchasePrice: 18000, reorderLevel: 20, therapeuticCategory: 'HIV/ARV', manufacturer: 'MSD Tanzania' },
  { name: 'AZT/3TC 300/150mg Tablets', genericName: 'Zidovudine/Lamivudine', dosageForm: DosageForm.TABLET, strength: '300/150mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 25000, purchasePrice: 13000, reorderLevel: 15, therapeuticCategory: 'HIV/ARV', manufacturer: 'MSD Tanzania' },
  { name: 'Co-trimoxazole 960mg Tablets', genericName: 'Co-trimoxazole (high dose)', dosageForm: DosageForm.TABLET, strength: '960mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 1200, purchasePrice: 600, reorderLevel: 40, therapeuticCategory: 'HIV/ARV', manufacturer: 'Shelys Pharma Ltd' },

  // Antiparasitics
  { name: 'Mebendazole 100mg Tablets', genericName: 'Mebendazole', dosageForm: DosageForm.TABLET, strength: '100mg', drugClass: DrugClass.OTC, sellingPrice: 1000, purchasePrice: 500, reorderLevel: 60, therapeuticCategory: 'Antiparasitics', manufacturer: 'Beta Healthcare', fastMover: true },
  { name: 'Albendazole 400mg Tablets', genericName: 'Albendazole', dosageForm: DosageForm.TABLET, strength: '400mg', drugClass: DrugClass.OTC, sellingPrice: 1500, purchasePrice: 750, reorderLevel: 50, therapeuticCategory: 'Antiparasitics', manufacturer: 'Interchem EA', fastMover: true },
  { name: 'Praziquantel 600mg Tablets', genericName: 'Praziquantel', dosageForm: DosageForm.TABLET, strength: '600mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 5000, purchasePrice: 2500, reorderLevel: 20, therapeuticCategory: 'Antiparasitics', manufacturer: 'Zenufa Laboratories' },
  { name: 'Ivermectin 3mg Tablets', genericName: 'Ivermectin', dosageForm: DosageForm.TABLET, strength: '3mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 3000, purchasePrice: 1500, reorderLevel: 20, therapeuticCategory: 'Antiparasitics', manufacturer: 'MSD Tanzania' },

  // Wound Care & Misc
  { name: 'Povidone Iodine 10% Solution', genericName: 'Povidone Iodine', dosageForm: DosageForm.SOLUTION, strength: '10%', drugClass: DrugClass.OTC, sellingPrice: 5000, purchasePrice: 2500, reorderLevel: 20, therapeuticCategory: 'Wound Care', manufacturer: 'Shelys Pharma Ltd', fastMover: true },
  { name: 'Hydrogen Peroxide 3% Solution', genericName: 'Hydrogen Peroxide', dosageForm: DosageForm.SOLUTION, strength: '3%', drugClass: DrugClass.OTC, sellingPrice: 2000, purchasePrice: 1000, reorderLevel: 15, therapeuticCategory: 'Wound Care', manufacturer: 'Dawa Industries' },
  { name: 'Normal Saline 0.9% 500ml', genericName: 'Sodium Chloride', dosageForm: DosageForm.SOLUTION, strength: '0.9%', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 4000, purchasePrice: 2000, reorderLevel: 20, therapeuticCategory: 'IV Fluids', manufacturer: 'Beta Healthcare' },
  { name: 'Dextrose 5% 500ml', genericName: 'Dextrose', dosageForm: DosageForm.SOLUTION, strength: '5%', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 4500, purchasePrice: 2200, reorderLevel: 15, therapeuticCategory: 'IV Fluids', manufacturer: 'Zenufa Laboratories' },
  { name: 'Gloves Examination (M) 100pcs', genericName: 'Latex Examination Gloves', dosageForm: DosageForm.OTHER, strength: 'Medium', drugClass: DrugClass.OTC, sellingPrice: 8000, purchasePrice: 4000, reorderLevel: 10, therapeuticCategory: 'Consumables', manufacturer: 'Various', fastMover: true },
  { name: 'Syringes 5ml with Needle 100pcs', genericName: 'Disposable Syringes', dosageForm: DosageForm.OTHER, strength: '5ml', drugClass: DrugClass.OTC, sellingPrice: 6000, purchasePrice: 3000, reorderLevel: 10, therapeuticCategory: 'Consumables', manufacturer: 'Various' },
  { name: 'Blood Glucose Test Strips 50pcs', genericName: 'Glucose Test Strips', dosageForm: DosageForm.OTHER, strength: '50 strips', drugClass: DrugClass.OTC, sellingPrice: 18000, purchasePrice: 9000, reorderLevel: 10, therapeuticCategory: 'Diagnostics', manufacturer: 'Roche/SD', fastMover: true },
  { name: 'Pregnancy Test Kit', genericName: 'hCG Pregnancy Test', dosageForm: DosageForm.OTHER, strength: 'Standard', drugClass: DrugClass.OTC, sellingPrice: 3000, purchasePrice: 1500, reorderLevel: 20, therapeuticCategory: 'Diagnostics', manufacturer: 'Various', fastMover: true },

  // TB
  { name: 'Rifampicin 150mg Capsules', genericName: 'Rifampicin', dosageForm: DosageForm.CAPSULE, strength: '150mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 3000, purchasePrice: 1500, reorderLevel: 20, therapeuticCategory: 'Tuberculosis', manufacturer: 'MSD Tanzania' },
  { name: 'Isoniazid 100mg Tablets', genericName: 'Isoniazid', dosageForm: DosageForm.TABLET, strength: '100mg', drugClass: DrugClass.PRESCRIPTION, sellingPrice: 1500, purchasePrice: 750, reorderLevel: 20, therapeuticCategory: 'Tuberculosis', manufacturer: 'Shelys Pharma Ltd' },
];

// ─── Supplier definitions ──────────────────────────────────────────────────────

const SUPPLIERS = [
  { name: 'Shelys Pharma Ltd', contactName: 'Emmanuel Mwangi', phone: '0754123456', email: 'orders@shelys.co.tz', address: 'Dar es Salaam, Plot 24 Ubungo Industrial Area' },
  { name: 'Beta Healthcare Tanzania Ltd', contactName: 'Grace Kimaro', phone: '0762345678', email: 'sales@betahealthcare.co.tz', address: 'Dar es Salaam, Mikocheni' },
  { name: 'Interchem (EA) Ltd', contactName: 'David Ochieng', phone: '0755456789', email: 'orders@interchem-ea.com', address: 'Arusha, Moshi Road Industrial' },
  { name: 'Zenufa Laboratories', contactName: 'Amina Juma', phone: '0768567890', email: 'commercial@zenufa.co.tz', address: 'Dar es Salaam, Msasani' },
  { name: 'Medical Stores Department', contactName: 'John Mollel', phone: '0271234567', email: 'orders@msd.go.tz', address: 'Dar es Salaam, MSD Headquarters' },
  { name: 'Dawa Industries Ltd', contactName: 'Peter Mgaya', phone: '0754789012', email: 'sales@dawaindustries.co.tz', address: 'Dar es Salaam, Ubungo' },
  { name: 'Metro Pharma Distribution', contactName: 'Sarah Mushi', phone: '0758901234', email: 'metro.pharma@gmail.com', address: 'Arusha, Kaloleni' },
  { name: 'Lakeview Medical Supplies', contactName: 'Joseph Kimani', phone: '0762012345', email: 'lakeview.meds@gmail.com', address: 'Mwanza, Isamilo' },
];

// ─── Main seeder ──────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 APOTEKH demo data seeder starting...\n');

  // Resolve pharmacy IDs
  const amani = await prisma.pharmacy.findUnique({ where: { licenceNumber: AMANI_LICENCE } });
  const kwd = await prisma.pharmacy.findUnique({ where: { licenceNumber: KWD_LICENCE } });

  if (!amani) throw new Error(`Amani pharmacy (${AMANI_LICENCE}) not found — run db:seed first`);
  if (!kwd) throw new Error(`KWD pharmacy (${KWD_LICENCE}) not found — run db:seed first`);

  console.log(`✓ Amani Pharmacy: ${amani.id}`);
  console.log(`✓ KWD Wholesale:  ${kwd.id}`);

  // Resolve demo users
  const ownerUser = await prisma.user.findUnique({ where: { email: 'owner@amani.co.tz' } });
  const dispenserUser = await prisma.user.findUnique({ where: { email: 'staff@pharmaconnect.tz' } });
  const picUser = await prisma.user.findUnique({ where: { email: 'admin@pharmaconnect.tz' } });

  if (!ownerUser || !dispenserUser || !picUser) {
    throw new Error('Demo users not found — run db:seed first');
  }

  // ── Step 1: Delete all operational data for demo pharmacies ──────────────────
  console.log('\n🗑  Clearing existing operational data...');
  await clearPharmacyData(amani.id);
  await clearPharmacyData(kwd.id);
  console.log('✓ Operational data cleared');

  // ── Step 2: Hash demo password ───────────────────────────────────────────────
  const hashedPw = await bcrypt.hash(DEMO_PASSWORD, 12);

  // Reset demo user passwords
  await Promise.all([
    prisma.user.update({ where: { email: 'owner@amani.co.tz' }, data: { password: hashedPw } }),
    prisma.user.update({ where: { email: 'admin@pharmaconnect.tz' }, data: { password: hashedPw } }),
    prisma.user.update({ where: { email: 'staff@pharmaconnect.tz' }, data: { password: hashedPw } }),
    prisma.user.update({ where: { email: 'dispenser2@amani.co.tz' }, data: { password: hashedPw } }),
    prisma.user.update({ where: { email: 'clerk@amani.co.tz' }, data: { password: hashedPw } }),
    prisma.user.update({ where: { email: 'manager@kwd.co.tz' }, data: { password: hashedPw } }),
    prisma.user.update({ where: { email: 'counter@kwd.co.tz' }, data: { password: hashedPw } }),
  ]);

  // ── Step 3: Seed suppliers ───────────────────────────────────────────────────
  console.log('\n🏪 Seeding suppliers...');
  const supplierIds = SUPPLIERS.map(() => randomUUID());
  await prisma.supplier.createMany({
    data: SUPPLIERS.map((s, index) => ({
      id: supplierIds[index],
      pharmacyId: amani.id,
      name: s.name,
      contactName: s.contactName,
      phone: s.phone,
      email: s.email,
      address: s.address,
      isApotekNetworkWholesaler: false,
    })),
  });
  console.log(`✓ ${supplierIds.length} suppliers created`);

  // ── Step 4: Seed products + batches ─────────────────────────────────────────
  console.log('\n💊 Seeding products and batches...');

  interface CreatedProduct {
    id: string;
    def: ProductDef;
    batchId: string;
    batchQtyRemaining: number;
    currentStock: number;
  }

  const createdProducts: CreatedProduct[] = [];

  const productRows: Prisma.ProductCreateManyInput[] = [];
  const batchRows: Prisma.BatchCreateManyInput[] = [];

  for (const def of PRODUCTS) {
    const suppId = pick(supplierIds);
    const productId = randomUUID();
    const primaryBatchId = randomUUID();

    productRows.push({
      id: productId,
      pharmacyId: amani.id,
      name: def.name,
      genericName: def.genericName,
      dosageForm: def.dosageForm,
      strength: def.strength,
      drugClass: def.drugClass,
      sellingPrice: def.sellingPrice,
      reorderLevel: def.reorderLevel,
      therapeuticCategory: def.therapeuticCategory,
      manufacturer: def.manufacturer ?? 'Various',
      storageCondition: def.storageCondition ?? 'AMBIENT',
      unitOfMeasure: 'unit',
      lastSupplierId: suppId,
      isActive: true,
      retailStock: true,
    });

    // Batch 1 — primary batch (good stock, expires 12–24 months out)
    const primaryQty = def.fastMover ? randInt(150, 300) : randInt(40, 120);
    batchRows.push({
      id: primaryBatchId,
      productId,
      pharmacyId: amani.id,
      batchNumber: `B-${new Date().getFullYear()}-${randInt(1000, 9999)}`,
      expiryDate: daysFromNow(randInt(365, 730)),
      quantityRemaining: primaryQty,
      purchasePrice: def.purchasePrice,
      supplierId: suppId,
      receivedAt: daysAgo(randInt(20, 60)),
    });

    // Batch 2 — older batch, nearly depleted (realistic stock rotation)
    const oldBatchQty = randInt(5, 30);
    batchRows.push({
      id: randomUUID(),
      productId,
      pharmacyId: amani.id,
      batchNumber: `B-${new Date().getFullYear() - 1}-${randInt(1000, 9999)}`,
      expiryDate: daysFromNow(randInt(30, 180)),
      quantityRemaining: oldBatchQty,
      purchasePrice: Math.floor(def.purchasePrice * 0.9),
      supplierId: suppId,
      receivedAt: daysAgo(randInt(90, 180)),
    });

    // Some fast-movers have a 3rd batch nearly expiring (triggers expiry alert)
    if (def.fastMover && Math.random() < 0.3) {
      batchRows.push({
        id: randomUUID(),
        productId,
        pharmacyId: amani.id,
        batchNumber: `B-NEAR-${randInt(1000, 9999)}`,
        expiryDate: daysFromNow(randInt(8, 28)),
        quantityRemaining: randInt(20, 60),
        purchasePrice: Math.floor(def.purchasePrice * 0.85),
        supplierId: suppId,
        receivedAt: daysAgo(randInt(120, 200)),
      });
    }

    createdProducts.push({
      id: productId,
      def,
      batchId: primaryBatchId,
      batchQtyRemaining: primaryQty,
      currentStock: primaryQty + oldBatchQty,
    });
  }

  await prisma.$transaction(async tx => {
    await tx.product.createMany({ data: productRows });
    await tx.batch.createMany({ data: batchRows });
  }, { timeout: 120_000 });

  console.log(`✓ ${createdProducts.length} products + batches created`);

  // ── Step 5: Seed dispensing transactions (31 days) ───────────────────────────
  console.log('\n💰 Seeding dispensing transactions (31 days)...');

    // Payment method distribution: cash 60%, mpesa 30%, airtel 7%, tigo 3%
  const paymentMethods: string[] = [
    'CASH', 'CASH', 'CASH', 'CASH', 'CASH', 'CASH',
    'MPESA', 'MPESA', 'MPESA',
    'AIRTEL_MONEY',
    'TIGOPESA',
  ];

  const dispensers = [dispenserUser, picUser];
  let totalTransactions = 0;

  // Stock tracking (to keep quantities realistic)
  const stockRemaining = new Map<string, number>();
  for (const p of createdProducts) {
    stockRemaining.set(p.id, p.currentStock);
  }

  // Fast movers for weighted selection
  const fastMovers = createdProducts.filter(p => p.def.fastMover);
  const slowMovers = createdProducts.filter(p => !p.def.fastMover);
  const productById = new Map(createdProducts.map(p => [p.id, p]));
  const transactionRows: Prisma.DispensingTransactionCreateManyInput[] = [];
  const movementRows: Prisma.StockMovementCreateManyInput[] = [];

  for (let daysBack = 31; daysBack >= 0; daysBack--) {
    const volume = dailyVolume(daysBack);
    const txDate = new Date();
    txDate.setDate(txDate.getDate() - daysBack);
    txDate.setHours(0, 0, 0, 0);

    for (let t = 0; t < volume; t++) {
      // 70% chance of fast mover
      const pool = Math.random() < 0.7 ? fastMovers : slowMovers;
      const itemCount = randInt(1, 4);
      const items: Array<{ productId: string; name: string; qty: number; unitPrice: number; totalPrice: number }> = [];
      let totalAmount = 0;

      for (let i = 0; i < itemCount; i++) {
        const product = pick(pool);
        const remaining = stockRemaining.get(product.id) ?? 0;
        if (remaining < 2) continue;

        const qty = Math.min(randInt(1, 6), remaining - 1);
        const unitPrice = product.def.sellingPrice;
        const lineTotal = qty * unitPrice;

        items.push({
          productId: product.id,
          name: product.def.name,
          qty,
          unitPrice,
          totalPrice: lineTotal,
        });
        totalAmount += lineTotal;
        stockRemaining.set(product.id, remaining - qty);
      }

      if (items.length === 0) continue;

      const txHour = 8 + Math.floor(t * (10 / volume)); // spread across business hours
      const txTime = new Date(txDate);
      txTime.setHours(txHour, randInt(0, 59), 0, 0);

      const paymentMethod = pick(paymentMethods);
      const dispenser = pick(dispensers);
      const sessionId = `SESS-${txTime.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
      const refNum = `RX-${txTime.getFullYear()}${String(txTime.getMonth() + 1).padStart(2, '0')}${String(txTime.getDate()).padStart(2, '0')}-${String(totalTransactions + 1).padStart(4, '0')}`;

      transactionRows.push({
        pharmacyId: amani.id,
        localSessionId: sessionId,
        referenceNumber: refNum,
        status: 'COMPLETED',
        createdBy: dispenser.id,
        createdAt: txTime,
        payload: {
          items: items.map(item => ({
            productId: item.productId,
            productName: item.name,
            quantity: item.qty,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
          totalAmount,
          paymentMethod,
          patientAge: randInt(2, 75),
          notes: null,
        },
      });

      // Create stock movements for each item
      for (const item of items) {
        movementRows.push({
          pharmacyId: amani.id,
          productId: item.productId,
          batchId: productById.get(item.productId)?.batchId,
          userId: dispenser.id,
          type: MovementType.DISPENSED,
          quantity: -item.qty,
          createdAt: txTime,
        });
      }

      totalTransactions++;
    }
  }

  await prisma.$transaction(async tx => {
    for (const rows of chunk(transactionRows, 200)) {
      await tx.dispensingTransaction.createMany({ data: rows });
    }
    for (const rows of chunk(movementRows, 500)) {
      await tx.stockMovement.createMany({ data: rows });
    }
  }, { timeout: 240_000 });

  console.log(`✓ ${totalTransactions} dispensing transactions created`);

  // ── Step 6: Seed stock orders ────────────────────────────────────────────────
  console.log('\n📦 Seeding stock orders...');

  // Order 1: submitted 8 days ago — partially received
  const order1Id = randomUUID();
  const order2Id = randomUUID();
  const order1Products = fastMovers.slice(0, 6);
  const vitaminProducts = createdProducts.filter(p => p.def.therapeuticCategory === 'Vitamins').slice(0, 5);

  await prisma.$transaction(async tx => {
    await tx.stockOrder.create({
      data: {
        id: order1Id,
        pharmacyId: amani.id,
        orderNumber: 'SO-2026-001',
        status: 'SUBMITTED',
        notes: 'Monthly restocking — antimalarials and antibiotics',
        createdBy: ownerUser.id,
        createdAt: daysAgo(8),
        submittedAt: daysAgo(8),
        expectedBy: daysFromNow(5),
      },
    });

    await tx.stockOrderItem.createMany({
      data: order1Products.map(p => ({
        stockOrderId: order1Id,
        productId: p.id,
        productName: p.def.name,
        genericName: p.def.genericName,
        strength: p.def.strength,
        quantityOrdered: randInt(50, 200),
        expectedUnitCost: p.def.purchasePrice,
        status: 'PENDING',
      })),
    });

    await tx.stockOrder.create({
      data: {
        id: order2Id,
        pharmacyId: amani.id,
        orderNumber: 'SO-2026-002',
        status: 'DRAFT',
        notes: 'Vitamins and supplements restock',
        createdBy: ownerUser.id,
        createdAt: daysAgo(2),
      },
    });

    await tx.stockOrderItem.createMany({
      data: vitaminProducts.map(p => ({
        stockOrderId: order2Id,
        productId: p.id,
        productName: p.def.name,
        genericName: p.def.genericName,
        strength: p.def.strength,
        quantityOrdered: randInt(30, 100),
        expectedUnitCost: p.def.purchasePrice,
        status: 'PENDING',
      })),
    });
  }, { timeout: 120_000 });

  console.log('✓ 2 stock orders created');

  // ── Step 7: Seed notifications ───────────────────────────────────────────────
  console.log('\n🔔 Seeding notifications...');

  const expiringProducts = createdProducts.filter(p => p.def.fastMover).slice(0, 4);
  const lowStockProducts = createdProducts.filter(p => p.def.fastMover).slice(4, 8);

  await prisma.notification.createMany({
    data: [
      ...expiringProducts.map(p => ({
        pharmacyId: amani.id,
        userId: ownerUser.id,
        type: 'EXPIRY_ALERT',
        title: 'Expiry Alert',
        body: `${p.def.name} — a batch expires within 21 days. Begin FEFO dispensing.`,
        isRead: false,
        metadata: { productId: p.id, urgency: 'CAUTION', daysRemaining: randInt(8, 21) },
        createdAt: daysAgo(randInt(0, 3)),
      })),
      ...lowStockProducts.map(p => ({
        pharmacyId: amani.id,
        userId: ownerUser.id,
        type: 'LOW_STOCK_ALERT',
        title: 'Low Stock',
        body: `${p.def.name} is below reorder level. Consider placing an order.`,
        isRead: false,
        metadata: { productId: p.id, currentStock: randInt(5, 15), reorderLevel: p.def.reorderLevel },
        createdAt: daysAgo(randInt(0, 2)),
      })),
    ],
  });

  console.log('✓ 8 notifications created');

  // ── Step 8: Seed KWD wholesale stock ─────────────────────────────────────────
  console.log('\n🏭 Seeding KWD wholesale data...');
  await seedKWDWholesale(kwd.id);
  console.log('✓ KWD wholesale seeded');

  // ── Summary ──────────────────────────────────────────────────────────────────
  const txCount = await prisma.dispensingTransaction.count({ where: { pharmacyId: amani.id } });
  const prodCount = await prisma.product.count({ where: { pharmacyId: amani.id } });
  const batchCount = await prisma.batch.count({ where: { pharmacyId: amani.id } });

  console.log('\n✅ Seeding complete!');
  console.log(`   Products:      ${prodCount}`);
  console.log(`   Batches:       ${batchCount}`);
  console.log(`   Transactions:  ${txCount}`);
  console.log(`   Date range:    31 days of activity`);
}

// ─── Clear pharmacy data (FK-safe order) ─────────────────────────────────────

async function clearPharmacyData(pharmacyId: string) {
  // Layer 1: Telemetry & caches
  await prisma.featureTelemetry.deleteMany({ where: { pharmacyId } });
  await prisma.aiCounsellingCache.deleteMany({ where: { pharmacyId } });
  await prisma.barcodeScanTelemetry.deleteMany({ where: { pharmacyId } });
  await prisma.coldChainLog.deleteMany({ where: { pharmacyId } });
  await prisma.productBarcodeMapping.deleteMany({ where: { pharmacyId } });
  await prisma.adverseReactionReport.deleteMany({ where: { pharmacyId } });

  // Layer 2: Safety & audit. OverrideLog is immutable by DB trigger, so keep it.
  await prisma.safetyEvent.deleteMany({ where: { pharmacyId } });
  await prisma.notification.deleteMany({ where: { pharmacyId } });
  await prisma.syncConflict.deleteMany({ where: { pharmacyId } });

  // Layer 3: Dispensing records
  await prisma.dispensingTransaction.deleteMany({ where: { pharmacyId } });
  await prisma.prescription.deleteMany({ where: { pharmacyId } });
  await prisma.stockAdjustmentSuggestion.deleteMany({ where: { pharmacyId } });

  // Layer 4: Stock orders (portal line items cascade via stock_order_item_id)
  const stockOrders = await prisma.stockOrder.findMany({ where: { pharmacyId }, select: { id: true } });
  const orderIds = stockOrders.map(o => o.id);
  if (orderIds.length > 0) {
    // SupplierPortalToken cascades to SupplierPortalLineItem via ON DELETE CASCADE
    await prisma.supplierPortalToken.deleteMany({ where: { stockOrderId: { in: orderIds } } }).catch(() => {});
    await prisma.stockOrderItem.deleteMany({ where: { stockOrderId: { in: orderIds } } });
    await prisma.stockOrder.deleteMany({ where: { pharmacyId } });
  }

  // Layer 5: Stock movements & batches
  await prisma.stockMovement.deleteMany({ where: { pharmacyId } });
  await prisma.batch.deleteMany({ where: { pharmacyId } });

  // Layer 6: Supplier catalogues
  const suppliers = await prisma.supplier.findMany({ where: { pharmacyId }, select: { id: true } });
  const supplierIds = suppliers.map(s => s.id);
  if (supplierIds.length > 0) {
    const catalogues = await prisma.supplierCatalogue.findMany({ where: { wholesalerId: { in: supplierIds } }, select: { id: true } });
    const catIds = catalogues.map(c => c.id);
    if (catIds.length > 0) {
      await prisma.supplierCatalogueItem.deleteMany({ where: { catalogueId: { in: catIds } } });
      await prisma.supplierCatalogue.deleteMany({ where: { id: { in: catIds } } });
    }
  }

  // Layer 7: Products
  await prisma.product.deleteMany({ where: { pharmacyId } });

  // Layer 8: Suppliers
  await prisma.supplier.deleteMany({ where: { pharmacyId } });

  // Layer 9: Compliance
  const compItems = await prisma.complianceItem.findMany({ where: { pharmacyId }, select: { id: true } });
  const compItemIds = compItems.map(c => c.id);
  if (compItemIds.length > 0) {
    await prisma.complianceDocument.deleteMany({ where: { complianceItemId: { in: compItemIds } } });
  }
  await prisma.complianceAlert.deleteMany({ where: { pharmacyId } });
  await prisma.staffCredential.deleteMany({ where: { pharmacyId } });
  await prisma.inspectionChecklist.deleteMany({ where: { pharmacyId } });
  await prisma.complianceItem.deleteMany({ where: { pharmacyId } });

  // Layer 10: Settings (non-critical, leave for next run if fails)
  await prisma.pharmacySetting.deleteMany({ where: { pharmacyId } }).catch(() => {});
}

// ─── KWD Wholesale seeder ─────────────────────────────────────────────────────

async function seedKWDWholesale(kwdId: string) {
  const managerUser = await prisma.user.findUnique({ where: { email: 'manager@kwd.co.tz' } });
  if (!managerUser) throw new Error('KWD manager user not found');

  // Create suppliers for KWD
  const kwdSuppliers = await Promise.all([
    prisma.supplier.create({
      data: { pharmacyId: kwdId, name: 'Shelys Pharma Ltd', contactName: 'Emmanuel Mwangi', phone: '0754123456', email: 'orders@shelys.co.tz', isApotekNetworkWholesaler: false },
    }),
    prisma.supplier.create({
      data: { pharmacyId: kwdId, name: 'Zenufa Laboratories', contactName: 'Amina Juma', phone: '0768567890', email: 'commercial@zenufa.co.tz', isApotekNetworkWholesaler: false },
    }),
  ]);

  // Create wholesale products
  const wholesaleProducts = [
    { name: 'Paracetamol 500mg (Bulk 1000)', genericName: 'Paracetamol', dosageForm: DosageForm.TABLET, strength: '500mg', sellingPrice: 350000, purchasePrice: 200000 },
    { name: 'Amoxicillin 500mg (Bulk 500)', genericName: 'Amoxicillin', dosageForm: DosageForm.CAPSULE, strength: '500mg', sellingPrice: 600000, purchasePrice: 350000 },
    { name: 'Coartem ALu (Bulk 100 packs)', genericName: 'Artemether/Lumefantrine', dosageForm: DosageForm.TABLET, strength: '20/120mg', sellingPrice: 1200000, purchasePrice: 750000 },
    { name: 'ORS Sachets (Carton of 200)', genericName: 'Oral Rehydration Salts', dosageForm: DosageForm.POWDER, strength: '13.5g', sellingPrice: 80000, purchasePrice: 45000 },
    { name: 'Metronidazole 400mg (Bulk 500)', genericName: 'Metronidazole', dosageForm: DosageForm.TABLET, strength: '400mg', sellingPrice: 320000, purchasePrice: 180000 },
    { name: 'Vitamin C 500mg (Bulk 1000)', genericName: 'Ascorbic Acid', dosageForm: DosageForm.TABLET, strength: '500mg', sellingPrice: 600000, purchasePrice: 380000 },
    { name: 'Ferrous Sulphate 200mg (Bulk 1000)', genericName: 'Ferrous Sulphate', dosageForm: DosageForm.TABLET, strength: '200mg', sellingPrice: 480000, purchasePrice: 280000 },
    { name: 'Salbutamol Inhaler (Carton 30)', genericName: 'Salbutamol', dosageForm: DosageForm.INHALER, strength: '100mcg', sellingPrice: 270000, purchasePrice: 160000 },
  ];

  for (const wp of wholesaleProducts) {
    const prod = await prisma.product.create({
      data: {
        pharmacyId: kwdId,
        name: wp.name,
        genericName: wp.genericName,
        dosageForm: wp.dosageForm,
        strength: wp.strength,
        drugClass: DrugClass.OTC,
        sellingPrice: wp.sellingPrice,
        reorderLevel: 10,
        unitOfMeasure: 'carton',
        isActive: true,
        wholesaleStock: true,
        retailStock: false,
        lastSupplierId: kwdSuppliers[0].id,
      },
    });

    await prisma.batch.create({
      data: {
        productId: prod.id,
        pharmacyId: kwdId,
        batchNumber: `KWD-${new Date().getFullYear()}-${randInt(1000, 9999)}`,
        expiryDate: daysFromNow(randInt(180, 540)),
        quantityRemaining: randInt(20, 80),
        purchasePrice: wp.purchasePrice,
        supplierId: kwdSuppliers[0].id,
        receivedAt: daysAgo(randInt(5, 30)),
      },
    });
  }

  // Seed a stock order for KWD
  const kwdOrder = await prisma.stockOrder.create({
    data: {
      pharmacyId: kwdId,
      orderNumber: 'KWD-SO-2026-001',
      status: 'SUBMITTED',
      notes: 'Quarterly stock replenishment',
      createdBy: managerUser.id,
      createdAt: daysAgo(5),
      submittedAt: daysAgo(5),
      expectedBy: daysFromNow(10),
    },
  });

  const kwdProds = await prisma.product.findMany({ where: { pharmacyId: kwdId }, take: 4 });
  for (const p of kwdProds) {
    await prisma.stockOrderItem.create({
      data: {
        stockOrderId: kwdOrder.id,
        productId: p.id,
        productName: p.name,
        quantityOrdered: randInt(50, 200),
        status: 'PENDING',
      },
    });
  }
}

// ─── Run ──────────────────────────────────────────────────────────────────────

main()
  .catch(e => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
