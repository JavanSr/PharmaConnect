
import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BookOpen,
  Camera,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  MessageCircle,
  Pill,
  Plus,
  ScanLine,
  Search,
  ShoppingCart,
  Smartphone,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { api } from '@/lib/api';
import { trackEvent } from '@/lib/telemetry';
import { applyInventoryDeltaToProduct, applyInventoryDeltasToProducts, recordInventoryDelta } from '@/lib/offlineInventory';
import { cacheProducts, getCachedProductById, searchCachedProducts } from '@/lib/offlineProducts';
import { enqueueDispensingSession, registerOfflineSync } from '@/lib/offlineSync';
import {
  LEGACY_DISPENSING_PAYMENT_METHODS,
  type DispensingPaymentMethodOption,
} from '@/modules/settings/paymentMethodConfig';
import { useDebounce } from '@/hooks/useDebounce';
import { usePharmacyRealtimeSync } from '@/hooks/usePharmacyRealtimeSync';
import { useAuthStore } from '@/stores/authStore';
import {
  normalizePatientPhone,
  useDispensingPatientStore,
} from '@/stores/dispensingPatientStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { usePaymentMethodStore } from '@/stores/paymentMethodStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import type { PaymentMethod, Product } from '@/types';
import type { DispensingCartItem, DispensingReceipt, SafetyReviewResponse, SafetySessionPayload, StewardshipIndication } from './types';
import { STEWARDSHIP_INDICATION_OPTIONS } from './types';

const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner').then((module) => ({ default: module.BarcodeScanner })));
const DoseCalculator = lazy(() => import('./DoseCalculator').then((module) => ({ default: module.DoseCalculator })));
const PatientSafetyPanel = lazy(() => import('./PatientSafetyPanel').then((module) => ({ default: module.PatientSafetyPanel })));

const money = (value: number) =>
  `Tsh ${Number(value ?? 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 })}`;

const receiptDate = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const receiptShareText = (
  receipt: DispensingReceipt,
  pharmacyName: string,
) => [
  `${pharmacyName} receipt`,
  `Ref: ${receipt.referenceNumber}`,
  `Date: ${receiptDate(receipt.createdAt)}`,
  ...receipt.lines.map((line) => `${line.quantity} x ${line.productName} - ${money(line.totalAmount)}`),
  `Total: ${money(receipt.totalAmount)}`,
  `Payment: ${receipt.paymentMethod.replace(/_/g, ' ')}`,
  'Thank you.',
].join('\n');

const phoneHrefValue = (phone: string) => {
  const compact = phone.replace(/[^\d+]/g, '');
  if (compact.startsWith('+')) return compact;
  if (compact.startsWith('0')) return `255${compact.slice(1)}`;
  return compact;
};

const isWeakConnectionCheckoutFailure = (error: any) => {
  if (!error.response) return true;
  return [408, 500, 502, 503, 504].includes(error.response.status);
};

const getMedicineIndication = (product: Product): string => {
  if (product.description?.trim()) return product.description.trim();

  const g = (product.genericName || product.name || '').toLowerCase();
  const cat = (product.therapeuticCategory || '').toLowerCase();

  // ── Antibiotics ──
  if (g.includes('amoxicillin') && g.includes('clavulan')) return 'Used for bacterial infections resistant to standard antibiotics — sinusitis, chest infections, dental infections, skin infections.';
  if (g.includes('amoxicillin')) return 'Used for bacterial infections — chest infections, ear infections, throat infections, and urinary tract infections (UTI).';
  if (g.includes('metronidazole') || g.includes('flagyl')) return 'Used for bacterial and parasitic infections — abdominal infections, dental infections, and vaginal infections.';
  if (g.includes('ciprofloxacin')) return 'Used for bacterial infections — urinary tract infections, respiratory infections, and skin infections.';
  if (g.includes('cotrimoxazole') || g.includes('trimethoprim')) return 'Used for urinary tract infections, chest infections, and as HIV/AIDS prophylaxis.';
  if (g.includes('doxycycline')) return 'Used for bacterial infections, malaria prevention, and sexually transmitted infections (STIs).';
  if (g.includes('azithromycin')) return 'Used for respiratory infections, throat infections, and sexually transmitted infections (STIs).';
  if (g.includes('erythromycin')) return 'Used for chest infections, skin infections, and whooping cough — alternative for penicillin allergy.';
  if (g.includes('clindamycin')) return 'Used for serious bacterial skin infections, bone infections, and dental infections.';
  if (g.includes('tetracycline')) return 'Used for bacterial skin infections, acne, and sexually transmitted infections.';
  if (g.includes('ampicillin')) return 'Used for bacterial infections — urinary tract infections, respiratory infections, and meningitis.';
  if (g.includes('ceftriaxone')) return 'Used for serious bacterial infections — pneumonia, meningitis, gonorrhoea, and surgical prophylaxis (injection).';
  if (g.includes('cefuroxime') || g.includes('cefalexin') || g.includes('cephalexin')) return 'Used for bacterial infections — skin infections, urinary tract infections, and respiratory infections.';
  if (g.includes('nitrofurantoin')) return 'Used specifically for urinary tract infections (UTI). Not effective for infections elsewhere in the body.';
  if (g.includes('linezolid')) return 'Used for serious drug-resistant bacterial infections — hospital-acquired infections, MRSA.';
  if (g.includes('gentamicin')) return 'Used for serious bacterial infections (injection) — sepsis, urinary infections, and eye infections.';

  // ── Antimalarials ──
  if (g.includes('artemether') || g.includes('lumefantrine') || g.includes('coartem')) return 'Used for the treatment of malaria, including uncomplicated falciparum malaria.';
  if (g.includes('artesunate')) return 'Used for severe malaria — given by injection or suppository in hospital settings.';
  if (g.includes('quinine')) return 'Used for the treatment of severe malaria and malaria in pregnancy.';
  if (g.includes('sulfadoxine') || g.includes('fansidar')) return 'Used for malaria prevention in pregnancy (IPTp) and treatment of uncomplicated malaria.';
  if (g.includes('chloroquine')) return 'Used for malaria prevention and treatment of certain rheumatic conditions.';
  if (g.includes('mefloquine')) return 'Used for malaria prevention in travellers and treatment of chloroquine-resistant malaria.';

  // ── Analgesics / Anti-inflammatory ──
  if (g.includes('paracetamol') || g.includes('acetaminophen')) return 'Used for pain relief and fever — headache, body ache, and high temperature.';
  if (g.includes('ibuprofen')) return 'Used for pain, fever, and inflammation — headache, toothache, and joint or muscle pain.';
  if (g.includes('diclofenac')) return 'Used for pain and inflammation — joint pain, back pain, and muscle pain.';
  if (g.includes('aspirin') && !g.includes('co-')) return 'Used for pain, fever, and inflammation. Low dose used to prevent heart attacks and strokes. Avoid in children.';
  if (g.includes('tramadol')) return 'Used for moderate to severe pain. A controlled opioid medicine — use exactly as directed.';
  if (g.includes('morphine') || g.includes('pethidine') || g.includes('codeine')) return 'Controlled opioid analgesic — used for severe pain under close medical supervision.';
  if (g.includes('naproxen')) return 'Used for pain, inflammation, and fever — arthritis, menstrual cramps, and muscle pain.';
  if (g.includes('meloxicam')) return 'Used for pain and inflammation in arthritis and musculoskeletal conditions.';
  if (g.includes('celecoxib')) return 'Used for pain and inflammation in arthritis — gentler on the stomach than standard NSAIDs.';

  // ── Antihypertensives ──
  if (g.includes('amlodipine') || g.includes('nifedipine')) return 'Used to lower high blood pressure and treat chest pain (angina).';
  if (g.includes('enalapril') || g.includes('lisinopril') || g.includes('captopril') || g.includes('ramipril')) return 'Used to lower high blood pressure and protect the heart and kidneys.';
  if (g.includes('losartan') || g.includes('valsartan') || g.includes('telmisartan')) return 'Used to lower high blood pressure and protect the kidneys, especially in diabetes.';
  if (g.includes('atenolol') || g.includes('metoprolol') || g.includes('propranolol') || g.includes('bisoprolol')) return 'Used to lower high blood pressure, slow a fast heart rate, and protect the heart after a heart attack.';
  if (g.includes('hydrochlorothiazide') || g.includes('indapamide')) return 'Used to lower high blood pressure and reduce fluid retention.';
  if (g.includes('furosemide') || g.includes('frusemide')) return 'Used to remove excess fluid — helps heart failure, high blood pressure, and kidney disease.';
  if (g.includes('spironolactone')) return 'Used for heart failure, high blood pressure, and hormonal conditions (e.g. polycystic ovary syndrome).';
  if (g.includes('methyldopa')) return 'Used to lower high blood pressure — safe for use in pregnancy.';
  if (g.includes('nifedipine')) return 'Used for high blood pressure and chest pain (angina). Extended-release form used in pregnancy-related hypertension.';

  // ── Antidiabetics ──
  if (g.includes('metformin')) return 'Used to control blood sugar in Type 2 diabetes. Usually the first-choice medicine for diabetes.';
  if (g.includes('glibenclamide') || g.includes('glimepiride') || g.includes('glipizide')) return 'Used to stimulate insulin release and lower blood sugar in Type 2 diabetes.';
  if (g.includes('insulin')) return 'Used to control blood sugar in Type 1 and Type 2 diabetes. Injection required — must be stored cold.';
  if (g.includes('sitagliptin') || g.includes('linagliptin') || g.includes('saxagliptin')) return 'Used to lower blood sugar in Type 2 diabetes — works by increasing insulin release after meals.';

  // ── Stomach / GI ──
  if (g.includes('omeprazole') || g.includes('pantoprazole') || g.includes('esomeprazole') || g.includes('rabeprazole')) return 'Used for stomach acid problems — heartburn, ulcers, and acid reflux (GERD).';
  if (g.includes('ranitidine') || g.includes('famotidine') || g.includes('cimetidine')) return 'Used to reduce stomach acid — heartburn, peptic ulcers, and acid reflux.';
  if (g.includes('antacid') || g.includes('magnesium') || g.includes('aluminium hydroxide') || g.includes('aluminum hydroxide')) return 'Used for immediate relief of heartburn and indigestion by neutralising stomach acid.';
  if (g.includes('metoclopramide') || g.includes('domperidone')) return 'Used for nausea, vomiting, and to speed up stomach emptying.';
  if (g.includes('ondansetron')) return 'Used for nausea and vomiting — especially after surgery or chemotherapy.';
  if (g.includes('loperamide')) return 'Used for diarrhoea — slows bowel movements. Do not use in children under 2 years.';
  if (g.includes('oral rehydration') || g.includes('ors') || g.includes('rehydration salt')) return 'Used to replace fluids and salts lost through diarrhoea or vomiting. Mix with clean water before use.';
  if (g.includes('bisacodyl') || g.includes('sennosides') || g.includes('senna')) return 'Used for constipation — stimulates bowel movement.';
  if (g.includes('lactulose')) return 'Used for constipation and liver disease — softens stools and draws fluid into the bowel.';
  if (g.includes('mebeverine') || g.includes('hyoscine butylbromide') || g.includes('buscopan')) return 'Used for stomach cramps and irritable bowel syndrome (IBS) — relieves spasms.';

  // ── Antihistamines / Allergy ──
  if (g.includes('loratadine') || g.includes('cetirizine') || g.includes('fexofenadine') || g.includes('levocetirizine')) return 'Used for allergies — hay fever, itchy skin, hives, and runny nose. Non-drowsy.';
  if (g.includes('chlorphenamine') || g.includes('chlorpheniramine') || g.includes('promethazine') || g.includes('diphenhydramine')) return 'Used for allergies, hay fever, itchy skin, and as a sleep aid. Causes drowsiness.';
  if (g.includes('hydrocortisone') && (g.includes('cream') || g.includes('topical'))) return 'Used topically for skin redness, itching, and mild inflammation.';

  // ── Antifungals ──
  if (g.includes('fluconazole')) return 'Used for fungal infections — vaginal thrush, oral thrush, and systemic fungal infections.';
  if (g.includes('clotrimazole') || g.includes('miconazole')) return 'Used for skin and vaginal fungal infections — athlete\'s foot, ringworm, and vaginal thrush.';
  if (g.includes('nystatin')) return 'Used for oral thrush and intestinal fungal infections. Not absorbed into the blood.';
  if (g.includes('griseofulvin')) return 'Used for fungal infections of the scalp, skin, and nails.';
  if (g.includes('ketoconazole')) return 'Used for fungal skin infections — ringworm, dandruff, and skin candidiasis.';

  // ── Antiparasitics / Deworming ──
  if (g.includes('albendazole') || g.includes('mebendazole')) return 'Used to treat intestinal worms — roundworms, hookworms, and threadworms.';
  if (g.includes('praziquantel')) return 'Used to treat tapeworms and schistosomiasis (bilharzia).';
  if (g.includes('ivermectin')) return 'Used to treat intestinal and skin parasites — strongyloides, onchocerciasis, and scabies.';
  if (g.includes('permethrin') || g.includes('lindane') || g.includes('benzyl benzoate')) return 'Used topically for scabies and head lice.';

  // ── Respiratory ──
  if (g.includes('salbutamol') || g.includes('albuterol')) return 'Used to relieve asthma attacks and breathing difficulty — opens the airways quickly.';
  if (g.includes('beclometasone') || g.includes('budesonide') || g.includes('fluticasone')) return 'Inhaled steroid for asthma and COPD prevention — reduces airway inflammation. Not for acute attacks.';
  if (g.includes('ipratropium') || g.includes('tiotropium')) return 'Used for COPD — opens the airways and reduces mucus production.';
  if (g.includes('theophylline') || g.includes('aminophylline')) return 'Used for asthma and COPD — opens the airways. Requires monitoring of blood levels.';
  if (g.includes('prednisolone') || g.includes('prednisone')) return 'Used for severe inflammation — asthma attacks, allergic reactions, autoimmune conditions, and arthritis.';
  if (g.includes('dexamethasone') || g.includes('betamethasone')) return 'Strong corticosteroid — used for inflammation, severe allergies, lung maturity in preterm birth.';
  if (g.includes('pholcodine') || g.includes('dextromethorphan')) return 'Used for dry, irritating coughs — suppresses the cough reflex.';
  if (g.includes('guaifenesin') || g.includes('bromhexine') || g.includes('ambroxol')) return 'Used for productive coughs with mucus — helps thin and clear chest secretions.';

  // ── HIV / ARVs ──
  if (g.includes('efavirenz') || g.includes('nevirapine') || g.includes('tenofovir') || g.includes('lamivudine') || g.includes('zidovudine') || g.includes('emtricitabine') || g.includes('dolutegravir') || g.includes('lopinavir') || g.includes('ritonavir') || g.includes('atazanavir')) return 'Antiretroviral therapy (ART) for HIV — must be taken daily without missing doses.';

  // ── TB ──
  if (g.includes('rifampicin') || g.includes('rifampin')) return 'Used for tuberculosis (TB) and other mycobacterial infections. Turns body fluids orange-red.';
  if (g.includes('isoniazid')) return 'Used for tuberculosis (TB) treatment and prevention.';
  if (g.includes('pyrazinamide')) return 'Used in the initial phase of tuberculosis (TB) treatment.';
  if (g.includes('ethambutol')) return 'Used in tuberculosis (TB) treatment. Can affect vision — report any visual changes immediately.';

  // ── Cardiovascular ──
  if (g.includes('digoxin')) return 'Used for heart failure and irregular heartbeat (atrial fibrillation). Narrow safety margin — dose must be exact.';
  if (g.includes('warfarin')) return 'Used to prevent blood clots and strokes. Requires regular blood tests (INR). Many drug and food interactions.';
  if (g.includes('aspirin') && g.includes('low')) return 'Low-dose aspirin used to prevent heart attacks and strokes in high-risk patients.';
  if (g.includes('clopidogrel')) return 'Used to prevent blood clots after heart attack or stroke. Often used with low-dose aspirin.';
  if (g.includes('simvastatin') || g.includes('atorvastatin') || g.includes('rosuvastatin')) return 'Used to lower cholesterol and reduce the risk of heart attack and stroke.';
  if (g.includes('nitrate') || g.includes('glyceryl trinitrate') || g.includes('isosorbide')) return 'Used to relieve and prevent chest pain (angina) — relaxes blood vessels.';

  // ── Mental health ──
  if (g.includes('diazepam') || g.includes('lorazepam') || g.includes('clonazepam')) return 'Used for anxiety, seizures, and muscle spasm. Controlled medicine — risk of dependence.';
  if (g.includes('amitriptyline') || g.includes('imipramine') || g.includes('clomipramine')) return 'Used for depression, nerve pain, and bedwetting in children. Takes 2–4 weeks to work.';
  if (g.includes('fluoxetine') || g.includes('sertraline') || g.includes('citalopram') || g.includes('escitalopram')) return 'Used for depression, anxiety, and obsessive-compulsive disorder. Takes 2–4 weeks to work.';
  if (g.includes('haloperidol') || g.includes('chlorpromazine') || g.includes('fluphenazine')) return 'Used for psychosis, schizophrenia, and severe agitation. Controlled medicine.';
  if (g.includes('risperidone') || g.includes('olanzapine') || g.includes('quetiapine')) return 'Used for schizophrenia, bipolar disorder, and severe psychiatric conditions.';
  if (g.includes('phenobarb') || g.includes('phenytoin') || g.includes('carbamazepine') || g.includes('valproate') || g.includes('sodium valproate')) return 'Used for epilepsy — prevents seizures. Do not stop suddenly. Regular blood tests required.';

  // ── Nutritional / Supplements ──
  if (g.includes('folic acid')) return 'Used to prevent neural tube defects in pregnancy and to treat certain types of anaemia.';
  if (g.includes('ferrous') || (g.includes('iron') && !g.includes('irony'))) return 'Used to treat and prevent iron-deficiency anaemia. May cause dark stools and constipation — this is normal.';
  if (g.includes('zinc')) return 'Used as a supplement for diarrhoea management in children, and for immune support.';
  if (g.includes('vitamin a') || g.includes('retinol')) return 'Used to prevent and treat vitamin A deficiency — protects eyesight and immune function.';
  if (g.includes('vitamin b') || g.includes('thiamine') || g.includes('pyridoxine') || g.includes('cyanocobalamin') || g.includes('b12')) return 'Used to treat or prevent B-vitamin deficiency — supports nerve function and energy metabolism.';
  if (g.includes('vitamin c') || g.includes('ascorbic acid')) return 'Used to prevent and treat vitamin C deficiency (scurvy) and support immune function.';
  if (g.includes('vitamin d') || g.includes('cholecalciferol') || g.includes('calciferol')) return 'Used for vitamin D deficiency — supports bone strength and immune function.';
  if (g.includes('calcium') && !g.includes('calci')) return 'Used for calcium deficiency, bone health, and muscle cramps. Also used alongside vitamin D.';
  if (g.includes('multivitamin')) return 'Nutritional supplement — provides a range of vitamins and minerals for general health.';

  // ── Women\'s health / Hormonal ──
  if (g.includes('combined oral contraceptive') || (g.includes('ethinyl') && g.includes('levonorgestrel'))) return 'Combined oral contraceptive pill — prevents pregnancy. Take daily at the same time.';
  if (g.includes('progestogen') || g.includes('norethisterone') || g.includes('medroxyprogesterone') || g.includes('depot') || g.includes('depo-provera')) return 'Hormonal contraceptive — prevents pregnancy. Injection form lasts 2–3 months.';
  if (g.includes('levonorgestrel') && !g.includes('ethinyl')) return 'Emergency contraceptive — take within 72 hours of unprotected sex. Not for regular use.';
  if (g.includes('misoprostol')) return 'Used to prevent and treat postpartum haemorrhage, and as part of medical abortion treatment.';
  if (g.includes('oxytocin')) return 'Used to stimulate labour and prevent/treat postpartum haemorrhage. Hospital use only.';

  // ── Eye / Ear ──
  if (g.includes('chloramphenicol') && g.includes('eye')) return 'Antibiotic eye drops or ointment for bacterial eye infections (conjunctivitis).';
  if (g.includes('timolol') || g.includes('latanoprost') || g.includes('dorzolamide')) return 'Used as eye drops to reduce pressure in the eye and treat glaucoma.';

  // ── Skin ──
  if (g.includes('calamine')) return 'Used topically to soothe itchy skin — chickenpox, insect bites, and mild rashes.';
  if (g.includes('whitfield') || g.includes('benzoic acid')) return 'Used for ringworm and athlete\'s foot skin infections.';

  // ── Category-based fallbacks ──
  if (cat.includes('antibiotic') || cat.includes('antibacterial')) return 'Used for bacterial infections — complete the full prescribed course.';
  if (cat.includes('antihistamine') || cat.includes('anti-allergy') || cat.includes('allergy')) return 'Used for allergies — hay fever, itchy skin, hives, and allergic reactions.';
  if (cat.includes('antifungal')) return 'Used for fungal infections — skin, nails, or mucous membranes.';
  if (cat.includes('analgesic') || cat.includes('pain') || cat.includes('nsaid')) return 'Used for pain relief and fever reduction.';
  if (cat.includes('antihypertensive') || cat.includes('hypertension') || cat.includes('blood pressure')) return 'Used to lower high blood pressure and protect the heart and kidneys.';
  if (cat.includes('antidiabetic') || cat.includes('diabetes') || cat.includes('hypoglycaemic')) return 'Used to control blood sugar levels in diabetes.';
  if (cat.includes('antimalarial') || cat.includes('malaria')) return 'Used for treatment or prevention of malaria.';
  if (cat.includes('antacid') || cat.includes('ulcer') || cat.includes('gastric') || cat.includes('proton pump')) return 'Used for stomach acid problems — heartburn, ulcers, and acid reflux.';
  if (cat.includes('antiretroviral') || cat.includes('arv') || cat.includes('hiv')) return 'Antiretroviral therapy (ART) for HIV — must be taken daily without missing doses.';
  if (cat.includes('tuberculosis') || cat.includes('tb')) return 'Used for tuberculosis (TB) treatment.';
  if (cat.includes('diuretic')) return 'Used to remove excess fluid from the body — supports heart and blood pressure management.';
  if (cat.includes('antiparasitic') || cat.includes('anthelmintic') || cat.includes('deworming')) return 'Used for parasitic infections and intestinal worms.';
  if (cat.includes('antidiarrhoeal') || cat.includes('diarrhoea') || cat.includes('diarrhea')) return 'Used for diarrhoea and loose stools.';
  if (cat.includes('antiemetic') || cat.includes('nausea')) return 'Used for nausea and vomiting.';
  if (cat.includes('bronchodilator') || cat.includes('asthma') || cat.includes('respiratory')) return 'Used for asthma and breathing difficulties.';
  if (cat.includes('corticosteroid') || cat.includes('steroid')) return 'Used for inflammation, allergic reactions, and autoimmune conditions.';
  if (cat.includes('vitamin') || cat.includes('supplement') || cat.includes('mineral')) return 'Nutritional supplement — supports health and corrects deficiency.';
  if (cat.includes('rehydration')) return 'Used to replace fluids and electrolytes lost through diarrhoea or vomiting.';
  if (cat.includes('anticoagulant') || cat.includes('blood thinner')) return 'Used to prevent blood clots. Requires regular monitoring.';
  if (cat.includes('antiepileptic') || cat.includes('seizure')) return 'Used to prevent seizures — do not stop suddenly.';
  if (cat.includes('antipsychotic')) return 'Used for schizophrenia and serious psychiatric conditions.';
  if (cat.includes('antidepressant')) return 'Used for depression and anxiety. Takes several weeks to take full effect.';
  if (cat.includes('cardiovascular') || cat.includes('cardiac')) return 'Used for heart conditions and cardiovascular disease management.';
  if (cat.includes('cholesterol') || cat.includes('lipid') || cat.includes('statin')) return 'Used to lower cholesterol and reduce cardiovascular risk.';
  if (cat.includes('hormonal') || cat.includes('contraceptive')) return 'Hormonal medicine — used for contraception or hormonal regulation.';
  if (cat.includes('oxytocic') || cat.includes('uterotonic')) return 'Used to manage labour and prevent postpartum bleeding.';

  return 'No indication recorded for this medicine. Refer to the package insert or prescriber.';
};

type CartWarning = { text: string; severity: 'high' | 'moderate' };

const getCartWarnings = (product: Product): CartWarning[] => {
  const all: CartWarning[] = [];
  const g = (product.genericName || product.name || '').toLowerCase();

  // Controlled drug — always highest priority
  if (product.drugClass === 'CONTROLLED' || product.drugClass === 'NARCOTIC' ||
    g.includes('tramadol') || g.includes('morphine') || g.includes('pethidine') ||
    g.includes('fentanyl') || g.includes('codeine') || g.includes('diazepam') ||
    g.includes('lorazepam') || g.includes('midazolam')) {
    all.push({ severity: 'high', text: 'Controlled medicine — prescription required' });
  }

  // Allergy risks
  if (g.includes('amoxicillin') || g.includes('ampicillin') || g.includes('cloxacillin') ||
    g.includes('benzylpenicillin') || g.includes('phenoxymethyl') || g.includes('piperacillin')) {
    all.push({ severity: 'high', text: 'Penicillin allergy — check before dispensing' });
  }
  if (g.includes('ceftriaxone') || g.includes('cefuroxime') || g.includes('cefalexin') || g.includes('cephalexin')) {
    all.push({ severity: 'moderate', text: 'Possible cross-sensitivity with penicillin allergy' });
  }
  if (g.includes('sulfonamide') || g.includes('cotrimoxazole') || g.includes('sulfamethoxazole')) {
    all.push({ severity: 'high', text: 'Sulfa allergy risk — Stevens-Johnson risk if allergic' });
  }
  if (g.includes('aspirin') || g.includes('ibuprofen') || g.includes('diclofenac') ||
    g.includes('naproxen') || g.includes('meloxicam') || g.includes('celecoxib')) {
    all.push({ severity: 'moderate', text: 'Avoid in aspirin-sensitive asthma' });
  }

  // Pregnancy
  const pregCat = product.pregnancyCategory?.toUpperCase();
  if (pregCat === 'X') {
    all.push({ severity: 'high', text: 'Contraindicated in pregnancy (Cat X)' });
  } else if (pregCat === 'D') {
    all.push({ severity: 'high', text: 'Avoid in pregnancy — foetal risk (Cat D)' });
  } else if (pregCat === 'C') {
    all.push({ severity: 'moderate', text: 'Use with caution in pregnancy (Cat C)' });
  } else {
    if (g.includes('doxycycline') || g.includes('tetracycline') ||
      g.includes('ciprofloxacin') || g.includes('metronidazole') ||
      g.includes('trimethoprim') || g.includes('cotrimoxazole')) {
      all.push({ severity: 'high', text: 'Avoid in pregnancy' });
    }
    if (g.includes('ibuprofen') || g.includes('diclofenac') ||
      g.includes('naproxen') || g.includes('meloxicam')) {
      all.push({ severity: 'high', text: 'Avoid in pregnancy >20 weeks' });
    }
    if (g.includes('warfarin')) all.push({ severity: 'high', text: 'Contraindicated in pregnancy' });
    if (g.includes('sodium valproate') || g.includes('valproate') ||
      g.includes('carbamazepine') || g.includes('phenytoin')) {
      all.push({ severity: 'high', text: 'High birth defect risk — caution in women of childbearing age' });
    }
    if (g.includes('misoprostol') || g.includes('oxytocin')) {
      all.push({ severity: 'high', text: 'Uterotonic — confirm indication before dispensing' });
    }
    if (g.includes('atenolol') || g.includes('metoprolol') || g.includes('propranolol')) {
      all.push({ severity: 'moderate', text: 'Caution in pregnancy — methyldopa preferred' });
    }
  }

  // Breastfeeding
  if (product.breastfeedingSafety) {
    const bs = product.breastfeedingSafety.toLowerCase();
    if (bs.includes('avoid') || bs.includes('contraindicated') || bs.includes('unsafe')) {
      all.push({ severity: 'high', text: 'Avoid while breastfeeding' });
    } else if (bs.includes('caution') || bs.includes('monitor')) {
      all.push({ severity: 'moderate', text: 'Caution while breastfeeding' });
    }
  } else {
    if (g.includes('doxycycline') || g.includes('tetracycline') || g.includes('chloramphenicol')) {
      all.push({ severity: 'high', text: 'Avoid while breastfeeding' });
    }
    if (g.includes('codeine') || g.includes('morphine')) {
      all.push({ severity: 'high', text: 'Avoid while breastfeeding — infant sedation risk' });
    }
    if (g.includes('ciprofloxacin') || g.includes('metronidazole')) {
      all.push({ severity: 'moderate', text: 'Caution while breastfeeding' });
    }
  }

  // Renal impairment
  if (g.includes('metformin')) {
    all.push({ severity: 'high', text: 'Contraindicated in severe kidney disease' });
  } else if (g.includes('nitrofurantoin') || g.includes('gentamicin') || g.includes('amikacin')) {
    all.push({ severity: 'high', text: 'Avoid in kidney disease' });
  } else if (product.renalCaution || g.includes('enalapril') || g.includes('lisinopril') ||
    g.includes('captopril') || g.includes('ramipril') || g.includes('losartan') || g.includes('valsartan')) {
    all.push({ severity: 'moderate', text: 'Caution in kidney disease — dose adjustment may be needed' });
  }

  // Hepatic impairment
  if (g.includes('isoniazid') || g.includes('rifampicin') || g.includes('pyrazinamide')) {
    all.push({ severity: 'high', text: 'Hepatotoxic — caution in liver disease' });
  } else if (g.includes('sodium valproate') || g.includes('valproate')) {
    all.push({ severity: 'high', text: 'Contraindicated in significant liver disease' });
  } else if (product.hepaticCaution || g.includes('paracetamol') || g.includes('ketoconazole') || g.includes('fluconazole')) {
    all.push({ severity: 'moderate', text: 'Caution in liver disease' });
  }

  // Duration limits
  if (g.includes('paracetamol') || g.includes('acetaminophen')) {
    all.push({ severity: 'moderate', text: 'Max 4g/day · avoid with alcohol' });
  }
  if (g.includes('ibuprofen') || g.includes('diclofenac') || g.includes('naproxen') || g.includes('meloxicam')) {
    all.push({ severity: 'moderate', text: 'Do not use >7 days without clinical review' });
  }
  if (g.includes('xylometazoline') || g.includes('oxymetazoline') || g.includes('nasal decongestant')) {
    all.push({ severity: 'moderate', text: 'Do not use >3 days — causes rebound congestion' });
  }
  if (g.includes('loperamide')) {
    all.push({ severity: 'moderate', text: 'Do not use >2 days in children under 12' });
  }

  // Elderly fall risk
  if (product.elderlyCaution || g.includes('diazepam') || g.includes('lorazepam') ||
    g.includes('nitrazepam') || g.includes('promethazine') ||
    g.includes('chlorphenamine') || g.includes('diphenhydramine')) {
    all.push({ severity: 'moderate', text: 'Fall risk in elderly — use with caution' });
  }

  // Deduplicate, sort high before moderate, return top 2
  const seen = new Set<string>();
  const unique = all.filter((w) => {
    if (seen.has(w.text)) return false;
    seen.add(w.text);
    return true;
  });
  return unique.sort((a, b) => (a.severity === 'high' ? 0 : 1) - (b.severity === 'high' ? 0 : 1)).slice(0, 2);
};

type SessionShortcut = {
  label: string;
  ageYears?: number;
  weightKg?: number;
  diagnoses: string[];
  allergies: string[];
  pregnant: boolean;
  breastfeeding: boolean;
  renalImpairment: boolean;
  hepaticImpairment: boolean;
};

type CheckoutPayload = {
  paymentMethod: PaymentMethod;
  paymentRef?: string;
  discountAmount?: number;
  discountReason?: string;
  safetyContext?: SafetySessionPayload;
  override?: { reason: string; pic_pin: string };
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    indication?: StewardshipIndication;
  }>;
};

const WALK_IN_LABEL = 'Walk-in customer';

const drugMeaning = (product: Product): string => {
  if (product.therapeuticCategory) {
    return product.therapeuticCategory;
  }

  return product.drugClass.replace(/_/g, ' ').toLowerCase();
};

const normalizeSearchText = (value?: string | number | null) =>
  String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const searchTokens = (value: string) => normalizeSearchText(value).split(' ').filter(Boolean);

const valueMatchesTokenPrefix = (value: string | number | null | undefined, token: string) => {
  const normalized = normalizeSearchText(value);
  if (!normalized) {
    return false;
  }

  return normalized.startsWith(token) || normalized.split(' ').some((word) => word.startsWith(token));
};

const productMatchesSearch = (product: Product, search: string) => {
  const tokens = searchTokens(search);
  if (tokens.length === 0) {
    return true;
  }

  const values = [
    product.genericName,
    product.brandName,
  ];

  return tokens.every((token) => values.some((value) => valueMatchesTokenPrefix(value, token)));
};

const AwarDot: React.FC<{ awarClass?: Product['awarClass'] }> = ({ awarClass }) => {
  if (!awarClass) {
    return null;
  }

  const colorClass =
    awarClass === 'ACCESS'
      ? 'bg-aware-access'
      : awarClass === 'WATCH'
        ? 'bg-aware-watch'
        : 'bg-aware-reserve';

  return (
    <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${colorClass}`} />
  );
};

// Optional, non-blocking AMR stewardship indication picker — only rendered for
// AWaRe WATCH/RESERVE antibiotics. Leaving it blank is the default and does not
// affect checkout in any way; it just means no indication was recorded.
const IndicationPicker: React.FC<{
  value: StewardshipIndication | undefined;
  onChange: (value: StewardshipIndication | undefined) => void;
}> = ({ value, onChange }) => (
  <select
    value={value ?? ''}
    onChange={(e) => onChange((e.target.value || undefined) as StewardshipIndication | undefined)}
    className="h-7 rounded-md border border-[#E2EDE8] bg-white px-2 text-[11px] text-[#374151] outline-none focus:border-[#1A6B5C]"
  >
    <option value="">Indication? (optional)</option>
    {STEWARDSHIP_INDICATION_OPTIONS.map((opt) => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

// Non-blocking "did you mean" suggestion — fetched only once an indication is
// selected. Renders nothing while loading or when no reviewed alternative
// exists, so the common case (no match, or indication left blank) has zero
// visual footprint.
const StewardshipHint: React.FC<{ genericName: string; indication: StewardshipIndication }> = ({ genericName, indication }) => {
  const [dismissed, setDismissed] = useState(false);
  const { data } = useQuery({
    queryKey: ['stewardship-suggestion', genericName, indication],
    queryFn: () =>
      api
        .get('/patient-safety/stewardship-suggestion', { params: { genericName, indication } })
        .then((r) => r.data.data as { suggestedGenericName: string; rationale: string; sourceCitation: string } | null),
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    setDismissed(false);
  }, [genericName, indication]);

  if (!data || dismissed) {
    return null;
  }

  return (
    <div className="mt-1.5 flex items-start gap-2 rounded-lg bg-[#EDF7F3] px-2.5 py-1.5 text-[11px] text-[#145748]">
      <span className="flex-1">
        Consider <span className="font-semibold">{data.suggestedGenericName}</span> (Access) — {data.rationale} Per {data.sourceCitation}.
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-[#1A6B5C] hover:text-[#0D4035]"
        aria-label="Dismiss suggestion"
      >
        <X size={12} />
      </button>
    </div>
  );
};

interface StockoutAlternative {
  suggestedGenericName: string;
  rationale: string;
  sourceCitation: string;
  products: Array<{ id: string; name: string; currentStock: number }>;
}

// Shown when a search match has zero stock. Reviewed, in-stock alternatives
// only — see getStockoutAlternatives() on the backend. Renders nothing while
// loading or when no reviewed alternative exists, so most out-of-stock
// searches show just the "out of stock" line with no extra noise.
const StockoutAlternatives: React.FC<{ genericName: string; onPick: (productId: string) => void }> = ({ genericName, onPick }) => {
  const { data } = useQuery({
    queryKey: ['stockout-alternatives', genericName],
    queryFn: () =>
      api
        .get('/inventory/products/stockout-alternatives', { params: { genericName } })
        .then((r) => r.data.data as StockoutAlternative[]),
    staleTime: 60_000,
  });

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-[#F0F5F3] bg-[#F7FBF8] px-4 py-2.5">
      {data.map((alt) => (
        <div key={alt.suggestedGenericName} className="mb-1.5 last:mb-0">
          <p className="text-[11px] text-[#516965]">
            Consider <span className="font-semibold text-[#0D4035]">{alt.suggestedGenericName}</span> — {alt.rationale}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {alt.products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick(p.id)}
                className="rounded-full border border-[#AFDFD3] bg-white px-2.5 py-1 text-[11px] font-medium text-[#1A6B5C] hover:bg-[#EDF7F3]"
              >
                {p.name} · {p.currentStock} in stock
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const DispensingScreen: React.FC = () => {
  usePharmacyRealtimeSync();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useNotificationStore((state) => state.toast);
  const pharmacy = usePharmacyStore((state) => state.pharmacy);
  const user = useAuthStore((state) => state.user);
  const weightInputRef = useRef<HTMLInputElement>(null);
  const prefetchedProductRef = useRef<{ product: Product; fetchedAt: number; productId: string } | null>(null);
  const allProductsRef = useRef<Product[]>([]);
  const pharmacyPatientProfiles = useDispensingPatientStore(
    (state) => state.profilesByPharmacy[pharmacy?.id ?? 'default'] ?? [],
  );
  const upsertPatientProfile = useDispensingPatientStore((state) => state.upsertProfile);
  const cachedPaymentMethods = usePaymentMethodStore(
    (state) => state.methodsByPharmacy[pharmacy?.id ?? 'default'] ?? LEGACY_DISPENSING_PAYMENT_METHODS,
  );
  const cachePaymentMethods = usePaymentMethodStore((state) => state.setMethods);

  const [drugSearch, setDrugSearch] = useState('');
  const [showDrugDropdown, setShowDrugDropdown] = useState(false);
  const [showMedicineScanner, setShowMedicineScanner] = useState(false);
  const [scanUnknownBarcode, setScanUnknownBarcode] = useState<string | null>(null);
  const [selectedDrug, setSelectedDrug] = useState<Product | null>(null);
  const [quantityRaw, setQuantityRaw] = useState('1');
  const quantity = Math.max(1, parseInt(quantityRaw, 10) || 1);
  const [cartItems, setCartItems] = useState<DispensingCartItem[]>([]);
  const [expandedInfo, setExpandedInfo] = useState<Set<string>>(new Set());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentRef, setPaymentRef] = useState('');
  const [prescriptionPhoto, setPrescriptionPhoto] = useState<File | null>(null);
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountType, setDiscountType] = useState<'none' | '5' | '10' | '15' | '20' | '25' | '50' | 'custom'>('none');
  const [discountReason, setDiscountReason] = useState('');
  const [receipt, setReceipt] = useState<DispensingReceipt | null>(null);
  const [receiptContact, setReceiptContact] = useState<{ name: string; phone: string }>({ name: WALK_IN_LABEL, phone: '' });
  const [expandedHints, setExpandedHints] = useState<Set<string>>(new Set());

  const [showPatientPanel, setShowPatientPanel] = useState(false);
  const [patientLabel, setPatientLabel] = useState(WALK_IN_LABEL);
  const [patientPhone, setPatientPhone] = useState('');
  const [ageYears, setAgeYears] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [diagnosesText, setDiagnosesText] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [pregnant, setPregnant] = useState(false);
  const [breastfeeding, setBreastfeeding] = useState(false);
  const [renalImpairment, setRenalImpairment] = useState(false);
  const [hepaticImpairment, setHepaticImpairment] = useState(false);
  const [sessionShortcuts, setSessionShortcuts] = useState<SessionShortcut[]>([]);
  const [safetyStatus, setSafetyStatus] = useState<{
    review: SafetyReviewResponse | null;
    requiresOverride: boolean;
    overrideDraft?: { reason: string; pic_pin: string };
  }>({ review: null, requiresOverride: false });

  const immediateDrugSearch = useDebounce(drugSearch.trim(), 100);
  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.quantity, 0),
    [cartItems],
  );
  const receiptMessage = useMemo(
    () => (receipt ? receiptShareText(receipt, pharmacy?.name ?? 'APOTEKH') : ''),
    [pharmacy?.name, receipt],
  );
  const receiptPhoneHref = useMemo(
    () => phoneHrefValue(receiptContact.phone),
    [receiptContact.phone],
  );
  const productAlertMap = useMemo(() => {
    const map = new Map<string, Array<{ severity: string; text: string }>>();
    const review = safetyStatus.review;
    if (!review) return map;

    const LOW_SEVERITY = new Set(['MODERATE', 'MINOR', 'INFO']);
    const nameToProduct = new Map<string, string>();
    for (const resolved of review.resolvedDrugs) {
      if (resolved.sourceType === 'product') {
        nameToProduct.set(resolved.genericName.toLowerCase(), resolved.source);
      }
    }

    const allAlerts = [...review.interactions, ...review.contraindications, ...review.precautions];
    for (const alert of allAlerts) {
      const sev = alert.severity?.toUpperCase() ?? '';
      if (!LOW_SEVERITY.has(sev)) continue;
      const text = alert.message || alert.effectSummary || '';
      const names = [alert.drug, alert.drugA, alert.drugB].filter(Boolean) as string[];
      for (const name of names) {
        const productId = nameToProduct.get(name.toLowerCase());
        if (productId) {
          if (!map.has(productId)) map.set(productId, []);
          map.get(productId)!.push({ severity: sev, text });
        }
      }
    }
    return map;
  }, [safetyStatus.review]);

  const parsedDiscount = Number(discountAmount || 0);
  const totalDue = Math.max(0, cartTotal - (Number.isFinite(parsedDiscount) ? parsedDiscount : 0));
  const canApplyDiscount = ['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'].includes(user?.role || '');
  const normalizedPatientPhone = useMemo(() => normalizePatientPhone(patientPhone), [patientPhone]);
  const patientNameInputValue = patientLabel === WALK_IN_LABEL ? '' : patientLabel;
  const safetyEnabled = !['WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF', 'DELIVERY_STAFF', 'WHOLESALE_SELLER'].includes(user?.role || '');

  const sessionPayload = useMemo<SafetySessionPayload>(
    () => ({
      pregnant,
      breastfeeding,
      ageYears: ageYears ? Number(ageYears) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
      allergies: allergiesText.split(',').map((value) => value.trim()).filter(Boolean),
      diagnoses: diagnosesText.split(',').map((value) => value.trim()).filter(Boolean),
      renalImpairment,
      hepaticImpairment,
    }),
    [
      ageYears,
      allergiesText,
      breastfeeding,
      diagnosesText,
      hepaticImpairment,
      pregnant,
      renalImpairment,
      weightKg,
    ],
  );

  // Pre-load ALL pharmacy products once on mount and keep them in memory.
  // Every keystroke then filters the in-memory list synchronously — zero network round-trips.
  // The query refreshes in the background every 5 minutes so stock levels stay current.
  const [allProductsLoaded, setAllProductsLoaded] = useState(false);
  const [stockSnapshotVersion, setStockSnapshotVersion] = useState(0);
  const { isFetching: isProductSuggestionsFetching } = useQuery({
    queryKey: ['dispensing-products-cache', pharmacy?.id],
    queryFn: async () => {
      try {
        const response = await api
          .get('/inventory/products/offline-cache', {
            params: { limit: 1000 },
            timeout: 15_000,
          })
          .then((r) => r.data);
        if (Array.isArray(response.data)) {
          const withDeltas = await applyInventoryDeltasToProducts(response.data);
          allProductsRef.current = withDeltas;
          void cacheProducts(withDeltas, { catalogSnapshot: true });
          setAllProductsLoaded(true);
          return withDeltas;
        }
        return [];
      } catch {
        // Network unavailable — fall back to IndexedDB snapshot
        const cached = await searchCachedProducts('', 1000);
        const withDeltas = await applyInventoryDeltasToProducts(cached);
        allProductsRef.current = withDeltas;
        setAllProductsLoaded(cached.length > 0);
        return withDeltas;
      }
    },
    enabled: Boolean(pharmacy?.id && user),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    networkMode: 'offlineFirst',
  });

  // 5-second live stock-level sync — only fetches {id, currentStock, nextExpiryDate},
  // not the full product catalogue. Merges into allProductsRef so the local filter
  // always reflects what another device just dispensed or received.
  useQuery({
    queryKey: ['dispensing-stock-snapshot', pharmacy?.id],
    queryFn: async () => {
      const res = await api.get('/inventory/products/stock-snapshot').then((r) => r.data.data as Array<{ id: string; currentStock: number; nextExpiryDate: string | null }>);
      if (allProductsRef.current.length > 0) {
        const byId = new Map(res.map((s) => [s.id, s]));
        allProductsRef.current = allProductsRef.current.map((p) => {
          const snap = byId.get(p.id);
          if (!snap) return { ...p, currentStock: 0 };
          return {
            ...p,
            currentStock: snap.currentStock,
            nextExpiringBatch: snap.nextExpiryDate
              ? { expiryDate: snap.nextExpiryDate, quantityRemaining: snap.currentStock } as any
              : null,
          };
        });
        setStockSnapshotVersion((v) => v + 1);
      }
      return res;
    },
    enabled: Boolean(pharmacy?.id && user && allProductsLoaded),
    staleTime: 0,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    networkMode: 'offlineFirst',
  });

  const paymentMethodsQuery = useQuery({
    queryKey: ['dispensing-payment-methods', pharmacy?.id],
    queryFn: () => api.get('/dispensing/payment-methods').then((response) => response.data),
    enabled: Boolean(pharmacy?.id && user),
    staleTime: 60_000,
  });

  // Synchronous local filter — no network, no async, instant on every keystroke
  const visibleProducts = useMemo(() => {
    const pool = allProductsRef.current;
    if (pool.length === 0) return [];
    const q = immediateDrugSearch.trim();
    return pool
      .filter((product) => !q || productMatchesSearch(product, q))
      .filter((product) => (product.currentStock ?? 0) > 0)
      .filter((product) => {
        const batch = product.nextExpiringBatch;
        if (!batch?.expiryDate) return true;
        const daysLeft = Math.ceil((new Date(batch.expiryDate).getTime() - Date.now()) / 86_400_000);
        if (daysLeft > 0) return true;
        const allStockExpired = batch.quantityRemaining >= (product.currentStock ?? 0);
        return !allStockExpired;
      })
      .slice(0, 12);
    // allProductsLoaded → startup fetch landed; stockSnapshotVersion → 5s live sync updated stock
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediateDrugSearch, allProductsLoaded, stockSnapshotVersion]);

  // Products that match the search but have zero stock — hidden from
  // visibleProducts above. Surfaced separately with "out of stock" styling
  // plus any reviewed, in-stock alternative, instead of just disappearing
  // from the search with no explanation.
  const outOfStockMatches = useMemo(() => {
    if (visibleProducts.length > 0) return [];
    const pool = allProductsRef.current;
    const q = immediateDrugSearch.trim();
    if (!q || pool.length === 0) return [];
    return pool
      .filter((product) => productMatchesSearch(product, q))
      .filter((product) => (product.currentStock ?? 0) === 0)
      .slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediateDrugSearch, allProductsLoaded, stockSnapshotVersion, visibleProducts.length]);
  const serverPaymentMethods = (paymentMethodsQuery.data?.data?.methods ?? []) as DispensingPaymentMethodOption[];
  const availablePaymentMethods =
    serverPaymentMethods.length > 0
      ? serverPaymentMethods
      : cachedPaymentMethods.length > 0
        ? cachedPaymentMethods
        : LEGACY_DISPENSING_PAYMENT_METHODS;
  const paymentOptions = availablePaymentMethods.map((method) => ({
    value: method.code,
    label: method.label,
  }));
  const selectedPaymentOption = availablePaymentMethods.find((method) => method.code === paymentMethod) ?? availablePaymentMethods[0];
  const sessionMatches = useMemo(
    () =>
      patientNameInputValue.trim().length < 2
        ? []
        : sessionShortcuts.filter((shortcut) =>
            shortcut.label.toLowerCase().includes(patientNameInputValue.trim().toLowerCase()),
          ),
    [patientNameInputValue, sessionShortcuts],
  );
  const phoneMatches = useMemo(
    () =>
      normalizedPatientPhone.length < 3
        ? []
        : pharmacyPatientProfiles.filter((profile) => profile.normalizedPhone.includes(normalizedPatientPhone)),
    [normalizedPatientPhone, pharmacyPatientProfiles],
  );
  const numericAgeYears = ageYears ? Number(ageYears) : undefined;
  const numericWeightKg = weightKg ? Number(weightKg) : undefined;
  const isPaediatricPatient = typeof numericAgeYears === 'number' && numericAgeYears >= 0 && numericAgeYears < 12;
  const paediatricWeightRequired = cartItems.length > 0 && isPaediatricPatient && !numericWeightKg;

  const resetPatientProfile = () => {
    setPatientLabel(WALK_IN_LABEL);
    setPatientPhone('');
    setAgeYears('');
    setWeightKg('');
    setDiagnosesText('');
    setAllergiesText('');
    setPregnant(false);
    setBreastfeeding(false);
    setRenalImpairment(false);
    setHepaticImpairment(false);
    setShowPatientPanel(false);
  };

  const applyPatientProfile = (profile: {
    phone?: string;
    name: string;
    ageYears?: number;
    weightKg?: number;
    diagnoses: string[];
    allergies: string[];
    pregnant: boolean;
    breastfeeding: boolean;
    renalImpairment: boolean;
    hepaticImpairment: boolean;
  }) => {
    setPatientLabel(profile.name);
    setPatientPhone(profile.phone ?? '');
    setAgeYears(profile.ageYears ? String(profile.ageYears) : '');
    setWeightKg(profile.weightKg ? String(profile.weightKg) : '');
    setDiagnosesText(profile.diagnoses.join(', '));
    setAllergiesText(profile.allergies.join(', '));
    setPregnant(profile.pregnant);
    setBreastfeeding(profile.breastfeeding);
    setRenalImpairment(profile.renalImpairment);
    setHepaticImpairment(profile.hepaticImpairment);
  };

  useEffect(() => {
    setReceipt(null);
  }, [cartItems, paymentMethod, paymentRef]);
  useEffect(() => {
    if (cartItems.length === 0) {
      setSafetyStatus({ review: null, requiresOverride: false });
    }
  }, [cartItems.length]);
  useEffect(() => {
    if (pharmacy?.id && serverPaymentMethods.length > 0) {
      cachePaymentMethods(pharmacy.id, serverPaymentMethods);
    }
  }, [cachePaymentMethods, pharmacy?.id, serverPaymentMethods]);
  useEffect(() => {
    if (!availablePaymentMethods.some((method) => method.code === paymentMethod)) {
      setPaymentMethod('CASH');
    }
  }, [availablePaymentMethods, paymentMethod]);

  const buildCheckoutPayload = (): CheckoutPayload => ({
    paymentMethod,
    paymentRef: paymentRef.trim() || undefined,
    discountAmount: canApplyDiscount && parsedDiscount > 0 ? parsedDiscount : undefined,
    discountReason: canApplyDiscount && discountReason.trim() ? discountReason.trim() : undefined,
    safetyContext: safetyEnabled ? sessionPayload : undefined,
    override: safetyStatus.requiresOverride ? safetyStatus.overrideDraft : undefined,
    items: cartItems.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      indication: item.indication,
    })),
  });

  const queueOfflineDispensing = async (checkoutPayload: CheckoutPayload) => {
    if (prescriptionPhoto) {
      toast.warning('You are offline — prescription photo will not be uploaded. Complete the sale and reattach the photo once connected.');
    }

    const localTimestamp = new Date().toISOString();
    const localSessionId = `disp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await enqueueDispensingSession({
      localSessionId,
      localTimestamp,
      checkout: checkoutPayload,
    });
    await Promise.all(
      cartItems.map((item) =>
        recordInventoryDelta({
          productId: item.product.id,
          quantityDelta: -item.quantity,
          sourceId: localSessionId,
          createdAt: localTimestamp,
        }),
      ),
    );
    await registerOfflineSync('dispensing-session-queue');

    return {
      data: {
        id: localSessionId,
        referenceNumber: `OFF-${localSessionId.slice(-8).toUpperCase()}`,
        paymentMethod,
        paymentRef: paymentRef.trim() || undefined,
        subtotalAmount: cartTotal,
        discountAmount: canApplyDiscount && parsedDiscount > 0 ? parsedDiscount : 0,
        totalAmount: totalDue,
        status: 'QUEUED',
        vfdStatus: 'PENDING_SYNC',
        createdAt: localTimestamp,
        itemCount: cartItems.length,
        queuedOffline: true,
        lines: cartItems.map((item) => ({
          productId: item.product.id,
          productName: item.product.brandName || item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalAmount: item.lineTotal,
        })),
      },
    };
  };

  const checkoutMutation = useMutation({
    networkMode: 'always',
    mutationFn: async () => {
      const checkoutPayload = buildCheckoutPayload();

      if (!navigator.onLine) {
        return queueOfflineDispensing(checkoutPayload);
      }

      try {
        if (prescriptionPhoto) {
          const formData = new FormData();
          formData.append('checkout', JSON.stringify(checkoutPayload));
          formData.append('prescriptionPhoto', prescriptionPhoto);
          return await api.post('/dispensing/checkout', formData).then((response) => response.data);
        }

        return await api.post('/dispensing/checkout', checkoutPayload).then((response) => response.data);
      } catch (error: any) {
        if (isWeakConnectionCheckoutFailure(error)) {
          return queueOfflineDispensing(checkoutPayload);
        }
        throw error;
      }
    },
    onSuccess: (response) => {
      setReceiptContact({
        name: patientLabel,
        phone: patientPhone.trim(),
      });
      setReceipt(response.data);
      setCartItems([]);
      setPaymentRef('');
      setPrescriptionPhoto(null);
      setDiscountAmount('');
      setDiscountType('none');
      setDiscountReason('');
      setDiscountAmount('');
      setDiscountReason('');
      setSelectedDrug(null);
      setDrugSearch('');
      resetPatientProfile();
      if (response.data?.queuedOffline) {
        toast.success('Dispensing saved offline and queued for sync');
      } else {
        toast.success('Dispensing completed');
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard-stock'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dispensing-products'] });
    },
    onError: (error: any) => {
      const serverReview = error.response?.data?.review;
      if (serverReview) {
        setSafetyStatus((current) => ({ ...current, review: serverReview, requiresOverride: true }));
      }
      toast.error(error.local ? error.message : error.response?.data?.error || 'Checkout failed');
    },
  });

  const addToCart = async (drugOverride?: Product, qtyOverride?: number) => {
    const drug = drugOverride ?? selectedDrug;
    const qty  = qtyOverride  ?? quantity;

    if (!drug) {
      toast.error('Select a medicine first');
      return;
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      toast.error('Quantity must be a positive number');
      return;
    }

    let latestSelectedDrug = drug;
    const prefetch = prefetchedProductRef.current;
    const PREFETCH_TTL = 30_000;
    if (prefetch && prefetch.productId === drug.id && Date.now() - prefetch.fetchedAt < PREFETCH_TTL) {
      latestSelectedDrug = prefetch.product;
      setSelectedDrug(latestSelectedDrug);
    } else {
      try {
        const response = await api.get(`/inventory/products/${drug.id}`);
        if (response.data?.data && !Array.isArray(response.data.data)) {
          latestSelectedDrug = await applyInventoryDeltaToProduct(response.data.data as Product);
          setSelectedDrug(latestSelectedDrug);
        }
      } catch {
        const fromCache = !navigator.onLine ? await getCachedProductById(drug.id) : null;
        latestSelectedDrug = await applyInventoryDeltaToProduct(fromCache ?? latestSelectedDrug);
        if (fromCache && !drugOverride) setSelectedDrug(latestSelectedDrug);
      }
    }

    if (!latestSelectedDrug.sellingPrice) {
      toast.error('This product has no selling price set. Update it in Inventory first.');
      return;
    }

    const currentStock = latestSelectedDrug.currentStock ?? 0;
    const existingQuantity = cartItems
      .filter((item) => item.product.id === latestSelectedDrug.id)
      .reduce((sum, item) => sum + item.quantity, 0);

    if (qty + existingQuantity > currentStock) {
      toast.error(`Only ${currentStock} units available`);
      return;
    }

    const unitPrice = Number(latestSelectedDrug.sellingPrice ?? 0);
    const lineTotal = Number((unitPrice * qty).toFixed(2));
    const lineId = latestSelectedDrug.id;

    setCartItems((items) => {
      const existing = items.find((item) => item.id === lineId);
      if (!existing) {
        return [
          ...items,
          {
            id: lineId,
            product: latestSelectedDrug,
            quantity: qty,
            unitPrice,
            lineTotal,
          },
        ];
      }

      const quantityTotal = existing.quantity + qty;
      return items.map((item) =>
        item.id === lineId
          ? {
              ...item,
              quantity: quantityTotal,
              lineTotal: Number((quantityTotal * item.unitPrice).toFixed(2)),
            }
          : item,
      );
    });

    setSelectedDrug(null);
    setDrugSearch('');
    setQuantityRaw('1');
    toast.success('Medicine added to cart');
  };

  const saveSessionShortcut = () => {
    if (!patientNameInputValue.trim()) {
      toast.error('Enter a session label first');
      return;
    }

    const shortcut: SessionShortcut = {
      label: patientNameInputValue.trim(),
      ageYears: ageYears ? Number(ageYears) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
      diagnoses: sessionPayload.diagnoses || [],
      allergies: sessionPayload.allergies || [],
      pregnant,
      breastfeeding,
      renalImpairment,
      hepaticImpairment,
    };

    setSessionShortcuts((current) => [
      shortcut,
      ...current.filter((item) => item.label.toLowerCase() !== shortcut.label.toLowerCase()),
    ]);
    toast.success('Session shortcut saved for this browser session');
  };

  const applySessionShortcut = (shortcut: SessionShortcut) => {
    applyPatientProfile({
      ...shortcut,
      name: shortcut.label,
    });
  };

  const handleSearchOrRegister = () => {
    if (!normalizedPatientPhone) {
      toast.error('Enter a phone number first');
      return;
    }

    const existingProfile = pharmacyPatientProfiles.find(
      (profile) => profile.normalizedPhone === normalizedPatientPhone,
    );

    if (existingProfile) {
      applyPatientProfile({
        ...existingProfile,
        phone: existingProfile.phone,
      });
      toast.success(`Loaded ${existingProfile.name} from local patient cache`);
      return;
    }

    const trimmedName = patientNameInputValue.trim();
    if (!trimmedName) {
      toast.error('Enter a patient name to register this phone number');
      return;
    }

    const pharmacyId = pharmacy?.id ?? 'default';
    upsertPatientProfile(pharmacyId, {
      phone: patientPhone.trim(),
      normalizedPhone: normalizedPatientPhone,
      name: trimmedName,
      ageYears: ageYears ? Number(ageYears) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
      diagnoses: sessionPayload.diagnoses || [],
      allergies: sessionPayload.allergies || [],
      pregnant,
      breastfeeding,
      renalImpairment,
      hepaticImpairment,
      updatedAt: new Date().toISOString(),
    });
    toast.success('Patient saved locally for this pharmacy');
  };

  const handleMedicineBarcodeDetected = async (barcode: string) => {
    setShowMedicineScanner(false);

    // Try pharmacy inventory first (barcode exact match)
    let product: Product | undefined;
    try {
      const response = await api
        .get('/inventory/products/suggestions', { params: { barcode, limit: 1 } })
        .then((r) => r.data);
      product = Array.isArray(response.data) ? response.data[0] as Product | undefined : undefined;
    } catch {
      if (!navigator.onLine) {
        const cached = await searchCachedProducts(barcode, 1);
        product = cached[0];
      }
    }

    if (product) {
      setSelectedDrug(await applyInventoryDeltaToProduct(product));
      setDrugSearch('');
      setShowDrugDropdown(false);
      setScanUnknownBarcode(null);
      return;
    }

    // Not found in inventory — show "record it?" prompt
    setScanUnknownBarcode(barcode);
    setSelectedDrug(null);
    setDrugSearch('');
    setShowDrugDropdown(false);
  };

  return (
    <div className="space-y-stack-lg">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-title-lg font-semibold text-on-surface">Dispensing</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Add products, review session-only safety guidance, then complete payment with FEFO stock allocation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'].includes(user?.role || '') && (
            <Link to="/dispensing/daily-close">
              <Button variant="secondary" size="sm">Daily close</Button>
            </Link>
          )}
          <Badge variant={safetyEnabled ? 'success' : 'muted'} size="sm">
            {safetyEnabled ? 'Safety enabled' : 'Basic retail flow'}
          </Badge>
        </div>
      </div>

      {receipt && (
        <Card className="border-[#1A6B5C]/20 bg-[#EDF7F3]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-[#1A6B5C]" />
                <p className="text-title-md text-on-surface">Dispensing complete</p>
              </div>
              <p className="mt-2 text-sm text-[#475569]">
                Reference {receipt.referenceNumber} | {receiptDate(receipt.createdAt)}
              </p>
                <p className="mt-1 text-sm text-[#475569]">
                  {receipt.itemCount} item{receipt.itemCount === 1 ? '' : 's'} | {money(receipt.totalAmount)} | {receipt.paymentMethod.replace(/_/g, ' ')}
                </p>
                {receipt.prescriptionPhotoPath && (
                  <p className="mt-1 text-xs font-medium text-[#1A6B5C]">Prescription photo attached</p>
                )}
              </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<MessageCircle size={14} />}
                onClick={() => {
                  window.open(`https://wa.me/${receiptPhoneHref ? receiptPhoneHref : ''}?text=${encodeURIComponent(receiptMessage)}`, '_blank', 'noopener,noreferrer');
                }}
              >
                WhatsApp receipt
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Smartphone size={14} />}
                onClick={() => {
                  window.location.href = `sms:${receiptPhoneHref}?&body=${encodeURIComponent(receiptMessage)}`;
                }}
              >
                SMS receipt
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const [{ downloadReceiptPdf }, { api: apiClient }] = await Promise.all([
                    import('@/lib/receiptPdf'),
                    import('@/lib/api'),
                  ]);
                  // Load receipt settings for footer / PC reg no visibility
                  let footerText: string | undefined;
                  let showPcRegNo: boolean | undefined;
                  try {
                    const cfg = await apiClient.get('/settings/config/receipt.settings');
                    const s = cfg.data?.data?.value;
                    footerText = s?.footerText;
                    showPcRegNo = s?.showPcRegNo;
                  } catch {
                    // use defaults
                  }
                  downloadReceiptPdf({
                    referenceNumber: receipt.referenceNumber,
                    pharmacyName: pharmacy?.name ?? 'APOTEKH',
                    pharmacyAddress: pharmacy?.address ?? 'Address not set',
                    pharmacyLicence: pharmacy?.licenceNumber ?? 'Licence not set',
                    totalAmount: receipt.totalAmount,
                    paymentMethod: receipt.paymentMethod,
                    pharmacyFooterText: footerText ?? 'Thank you for your visit. Please take your medicines as directed.',
                    showPcRegNo: showPcRegNo ?? true,
                    items: receipt.lines.map((line) => ({
                      name: line.productName,
                      strength: line.strength ?? undefined,
                      quantity: line.quantity,
                      unitPrice: line.unitPrice,
                      lineTotal: line.totalAmount,
                      dose: line.dose,
                    })),
                    createdAt: receipt.createdAt,
                    dispensedBy: user ? `${user.firstName} ${user.lastName}` : 'APOTEKH user',
                  });
                }}
              >
                Download receipt
              </Button>
              <Button size="sm" onClick={() => setReceipt(null)}>New dispensing</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_420px]">
        <div className="space-y-stack-md">
          {/* Patient bar — collapsed by default, expands on toggle */}
          <div className="hidden">
            {/* Bar */}
            <button
              type="button"
              onClick={() => setShowPatientPanel((v) => !v)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 hover:bg-[#EDF7F3] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <UserRound size={15} className={patientLabel === WALK_IN_LABEL ? 'text-[#94A3B8]' : 'text-[#1A6B5C]'} />
                <span className={`text-sm font-medium ${patientLabel === WALK_IN_LABEL ? 'text-[#64748B]' : 'text-[#0D4035]'}`}>
                  {patientLabel === WALK_IN_LABEL ? 'Walk-in' : patientLabel}
                </span>
                {patientPhone && patientLabel !== WALK_IN_LABEL && (
                  <span className="text-xs text-[#94A3B8]">{patientPhone}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {patientLabel !== WALK_IN_LABEL && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); resetPatientProfile(); setShowPatientPanel(false); }}
                    className="rounded-full p-0.5 text-[#94A3B8] hover:text-[#DC2626] transition-colors"
                    aria-label="Reset to walk-in"
                  >
                    <X size={13} />
                  </button>
                )}
                <span className="text-xs text-[#94A3B8]">
                  {showPatientPanel ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </span>
              </div>
            </button>

            {/* Expandable panel */}
            {showPatientPanel && (
              <div className="border-t border-[#D6F0E8] px-4 py-4 space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[180px]">
                    <Input
                      label="Phone number"
                      value={patientPhone}
                      onChange={(event) => setPatientPhone(event.target.value)}
                      placeholder="Search or register by phone"
                    />
                  </div>
                  <Button onClick={handleSearchOrRegister}>Search/Register</Button>
                  <Button variant="ghost" onClick={resetPatientProfile}>Use walk-in</Button>
                </div>

                {phoneMatches.length > 0 && (
                  <div className="space-y-2">
                    {phoneMatches.map((profile) => (
                      <button
                        key={profile.normalizedPhone}
                        type="button"
                        onClick={() => { applyPatientProfile({ ...profile, phone: profile.phone }); setShowPatientPanel(false); }}
                        className="flex w-full items-center justify-between rounded-2xl border border-[#D6F0E8] bg-[#F8FAFC] px-4 py-3 text-left hover:bg-[#EDF7F3]"
                      >
                        <span>
                          <span className="block text-sm font-semibold text-[#0D4035]">{profile.name}</span>
                          <span className="mt-0.5 block text-xs text-[#64748B]">{profile.phone}</span>
                        </span>
                        <Badge variant="info" size="sm">Load</Badge>
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <Input
                    label="Patient name / label"
                    value={patientNameInputValue}
                    onChange={(event) => setPatientLabel(event.target.value || WALK_IN_LABEL)}
                    placeholder="Patient Fullname"
                  />
                  {sessionMatches.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-2xl border border-[#D6F0E8] bg-white shadow-lg">
                      {sessionMatches.map((shortcut) => (
                        <button
                          key={shortcut.label}
                          type="button"
                          onClick={() => { applySessionShortcut(shortcut); setShowPatientPanel(false); }}
                          className="block w-full border-b border-[#D6F0E8] px-4 py-3 text-left text-sm text-[#0D4035] last:border-b-0 hover:bg-[#EDF7F3]"
                        >
                          {shortcut.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Age (years)"
                    type="number"
                    min="0"
                    value={ageYears}
                    onChange={(event) => setAgeYears(event.target.value)}
                    placeholder="Optional"
                  />
                  <Input
                    ref={weightInputRef}
                    label="Weight (kg)"
                    type="number"
                    min="0"
                    value={weightKg}
                    onChange={(event) => setWeightKg(event.target.value)}
                    placeholder="Optional"
                  />
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={saveSessionShortcut}>Save shortcut</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowPatientPanel(false)}>Done</Button>
                </div>
              </div>
            )}
          </div>

          <Card
            header={
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Pill size={16} className="text-[#1A6B5C]" />
                  <span className="text-sm font-semibold text-[#0D4035]">Medicine entry</span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {selectedDrug && (
                    <Badge variant="success" size="sm">
                      {money(Number(selectedDrug.sellingPrice ?? 0))}
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPatientPanel((value) => !value)}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#D6F0E8] bg-white px-3 py-1.5 text-xs font-medium text-[#64748B] transition-colors hover:bg-[#EDF7F3] hover:text-[#0D4035]"
                  >
                    <UserRound size={14} className={patientLabel === WALK_IN_LABEL ? 'text-[#94A3B8]' : 'text-[#1A6B5C]'} />
                    <span className="truncate">{patientLabel === WALK_IN_LABEL ? 'Walk-in' : patientLabel}</span>
                    {patientPhone && patientLabel !== WALK_IN_LABEL && (
                      <span className="hidden text-[#94A3B8] sm:inline">{patientPhone}</span>
                    )}
                    {showPatientPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {patientLabel !== WALK_IN_LABEL && (
                    <button
                      type="button"
                      onClick={resetPatientProfile}
                      className="rounded-full p-1 text-[#94A3B8] transition-colors hover:bg-red-50 hover:text-[#DC2626]"
                      aria-label="Reset to walk-in"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            }
          >
            {showPatientPanel && (
              <div className="mb-4 rounded-2xl border border-[#D6F0E8] bg-[#F8FAFC] px-4 py-4 space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[180px]">
                    <Input
                      label="Phone number"
                      value={patientPhone}
                      onChange={(event) => setPatientPhone(event.target.value)}
                      placeholder="Search or register by phone"
                    />
                  </div>
                  <Button onClick={handleSearchOrRegister}>Search/Register</Button>
                  <Button variant="ghost" onClick={resetPatientProfile}>Use walk-in</Button>
                </div>

                {phoneMatches.length > 0 && (
                  <div className="space-y-2">
                    {phoneMatches.map((profile) => (
                      <button
                        key={profile.normalizedPhone}
                        type="button"
                        onClick={() => { applyPatientProfile({ ...profile, phone: profile.phone }); setShowPatientPanel(false); }}
                        className="flex w-full items-center justify-between rounded-2xl border border-[#D6F0E8] bg-white px-4 py-3 text-left hover:bg-[#EDF7F3]"
                      >
                        <span>
                          <span className="block text-sm font-semibold text-[#0D4035]">{profile.name}</span>
                          <span className="mt-0.5 block text-xs text-[#64748B]">{profile.phone}</span>
                        </span>
                        <Badge variant="info" size="sm">Load</Badge>
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <Input
                    label="Patient name / label"
                    value={patientNameInputValue}
                    onChange={(event) => setPatientLabel(event.target.value || WALK_IN_LABEL)}
                    placeholder="Patient Fullname"
                  />
                  {sessionMatches.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-2xl border border-[#D6F0E8] bg-white shadow-lg">
                      {sessionMatches.map((shortcut) => (
                        <button
                          key={shortcut.label}
                          type="button"
                          onClick={() => { applySessionShortcut(shortcut); setShowPatientPanel(false); }}
                          className="block w-full border-b border-[#D6F0E8] px-4 py-3 text-left text-sm text-[#0D4035] last:border-b-0 hover:bg-[#EDF7F3]"
                        >
                          {shortcut.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Age (years)"
                    type="number"
                    min="0"
                    value={ageYears}
                    onChange={(event) => setAgeYears(event.target.value)}
                    placeholder="Optional"
                  />
                  <Input
                    ref={weightInputRef}
                    label="Weight (kg)"
                    type="number"
                    min="0"
                    value={weightKg}
                    onChange={(event) => setWeightKg(event.target.value)}
                    placeholder="Optional"
                  />
                </div>

                {/* Clinical safety flags */}
                <div className="rounded-xl border border-[#D6F0E8] bg-white px-3 py-3 space-y-3">
                  <p className="text-xs font-semibold text-[#0D4035]">Patient safety flags</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Pregnant', checked: pregnant, onChange: setPregnant },
                      { label: 'Breastfeeding', checked: breastfeeding, onChange: setBreastfeeding },
                      { label: 'Renal impairment', checked: renalImpairment, onChange: setRenalImpairment },
                      { label: 'Hepatic impairment', checked: hepaticImpairment, onChange: setHepaticImpairment },
                    ].map(({ label, checked, onChange }) => (
                      <label key={label} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => onChange(e.target.checked)}
                          className="h-4 w-4 rounded border-[#AFDFD3] text-[#1A6B5C] accent-[#1A6B5C]"
                        />
                        <span className="text-sm text-[#374151]">{label}</span>
                      </label>
                    ))}
                  </div>
                  <Input
                    label="Known allergies"
                    value={allergiesText}
                    onChange={(event) => setAllergiesText(event.target.value)}
                    placeholder="e.g. Penicillin, Sulfa drugs"
                  />
                  <Input
                    label="Diagnoses / conditions"
                    value={diagnosesText}
                    onChange={(event) => setDiagnosesText(event.target.value)}
                    placeholder="e.g. Hypertension, Type 2 Diabetes"
                  />
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={saveSessionShortcut}>Save shortcut</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowPatientPanel(false)}>Done</Button>
                </div>
              </div>
            )}

            <div className="relative">
              <Input
                label="Medicine"
                value={selectedDrug ? selectedDrug.genericName || selectedDrug.name : drugSearch}
                onChange={(event) => {
                  setDrugSearch(event.target.value);
                  setSelectedDrug(null);
                  setShowDrugDropdown(true);
                }}
                onKeyDown={(event) => {
                  // USB barcode scanners type the barcode then press Enter.
                  // If the current value looks like a barcode (8-14 digits), treat Enter as a scan.
                  if (event.key === 'Enter' && !selectedDrug) {
                    const val = drugSearch.trim();
                    if (/^\d{8,14}$/.test(val)) {
                      event.preventDefault();
                      setShowDrugDropdown(false);
                      void handleMedicineBarcodeDetected(val);
                    }
                  }
                }}
                onFocus={() => setShowDrugDropdown(true)}
                placeholder="Search generic or brand name"
                leftIcon={<Search size={16} />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowMedicineScanner((value) => !value)}
                    className="rounded-lg p-1 text-[#64748B] hover:bg-[#EDF7F3] hover:text-[#0D4035]"
                    aria-label={showMedicineScanner ? 'Hide barcode scanner' : 'Scan barcode'}
                    title={showMedicineScanner ? 'Hide barcode scanner' : 'Scan barcode'}
                  >
                    <ScanLine size={16} />
                  </button>
                }
              />
              {showMedicineScanner && (
                <div className="mt-3">
                  <Suspense fallback={<div className="rounded-2xl bg-black/80 h-64 flex items-center justify-center text-sm text-white">Starting camera…</div>}>
                    <BarcodeScanner onDetected={handleMedicineBarcodeDetected} onClose={() => setShowMedicineScanner(false)} />
                  </Suspense>
                </div>
              )}
              {scanUnknownBarcode && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-amber-900">Barcode not in your inventory</p>
                    <p className="text-xs text-amber-700 font-mono mt-0.5">{scanUnknownBarcode}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setScanUnknownBarcode(null)}
                      className="text-xs text-amber-700 underline underline-offset-2"
                    >
                      Dismiss
                    </button>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/inventory/products/new?barcode=${encodeURIComponent(scanUnknownBarcode)}`)}
                    >
                      Record it
                    </Button>
                  </div>
                </div>
              )}
              {showDrugDropdown && !selectedDrug && immediateDrugSearch.length > 0 && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-[#D6F0E8] bg-white shadow-lg">
                  {isProductSuggestionsFetching && visibleProducts.length === 0 && (
                    <div className="px-4 py-3 text-sm text-[#64748B]">Searching...</div>
                  )}
                  {visibleProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          setSelectedDrug(product);
                          setDrugSearch('');
                          setShowDrugDropdown(false);
                          prefetchedProductRef.current = null;
                          api.get(`/inventory/products/${product.id}`)
                            .then(async (r) => {
                              if (r.data?.data && !Array.isArray(r.data.data)) {
                                const fresh = await applyInventoryDeltaToProduct(r.data.data as Product);
                                prefetchedProductRef.current = { product: fresh, fetchedAt: Date.now(), productId: product.id };
                                setSelectedDrug(fresh);
                              }
                            })
                            .catch(() => {});
                        }}
                        className="block w-full border-b border-[#D6F0E8] px-4 py-3 text-left last:border-b-0 hover:bg-[#EDF7F3]"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="flex items-center gap-2 text-sm font-semibold text-[#0D4035]">
                            <AwarDot awarClass={product.awarClass} />
                            {product.genericName || product.name}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-[#64748B]">
                          {[product.name, product.strength, `Stock: ${product.currentStock ?? 0}`].filter(Boolean).join(' | ')}
                        </p>
                        <p className="mt-1 text-xs font-medium text-[#1A6B5C]">
                          {drugMeaning(product)}
                        </p>
                      </button>
                    ))}
                  {allProductsLoaded && visibleProducts.length === 0 && !isProductSuggestionsFetching && (
                    outOfStockMatches.length > 0 ? (
                      <div>
                        {outOfStockMatches.map((product) => (
                          <div key={product.id} className="border-b border-[#D6F0E8] last:border-b-0">
                            <div className="px-4 py-2.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-[#0D4035]">{product.genericName || product.name}</p>
                                <span className="rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-semibold text-[#DC2626]">
                                  Out of stock
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs text-[#64748B]">{[product.name, product.strength].filter(Boolean).join(' | ')}</p>
                            </div>
                            <StockoutAlternatives
                              genericName={product.genericName || product.name}
                              onPick={(productId) => {
                                api.get(`/inventory/products/${productId}`).then(async (r) => {
                                  if (r.data?.data && !Array.isArray(r.data.data)) {
                                    const fresh = await applyInventoryDeltaToProduct(r.data.data as Product);
                                    setSelectedDrug(fresh);
                                    setDrugSearch('');
                                    setShowDrugDropdown(false);
                                  }
                                }).catch(() => toast.error('Could not load that product'));
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-sm text-[#64748B]">No matching medicine found</div>
                    )
                  )}
                </div>
              )}
            </div>

            {selectedDrug && (
              <div className="mt-4 rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                    <AwarDot awarClass={selectedDrug.awarClass} />
                    {selectedDrug.genericName || selectedDrug.name}
                  </p>
                </div>
                <p className="mt-1 text-label-md text-on-surface-variant">
                  {[selectedDrug.strength, selectedDrug.dosageForm, selectedDrug.tmdaRegistrationNumber].filter(Boolean).join(' | ')}
                </p>
                <p className="mt-1 text-label-md font-medium text-primary">
                  {drugMeaning(selectedDrug)}
                </p>
                <p className="mt-1 text-label-md text-primary">
                  {selectedDrug.currentStock ?? 0} units available
                </p>
              </div>
            )}

            <div className="mt-4">
              <Input
                label="Quantity"
                type="number"
                min="1"
                value={quantityRaw}
                onChange={(event) => setQuantityRaw(event.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button leftIcon={<Plus size={16} />} onClick={() => void addToCart()} disabled={!selectedDrug}>
                Add to basket
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedDrug(null);
                  setDrugSearch('');
                  setQuantityRaw('1');
                }}
              >
                Clear line
              </Button>
            </div>
          </Card>

          <Suspense fallback={null}>
            <DoseCalculator
              patientAgeYears={ageYears}
              patientWeightKg={weightKg}
              pediatricWeightRequired={paediatricWeightRequired}
              onRequestWeight={() => weightInputRef.current?.focus()}
            />
          </Suspense>
        </div>

        <div className="space-y-stack-md">
          {cartItems.length > 0 && (
            <Suspense fallback={null}>
              <PatientSafetyPanel
                enabled={safetyEnabled}
                cartItems={cartItems}
                sessionPayload={sessionPayload}
                onStatusChange={setSafetyStatus}
              />
            </Suspense>
          )}

          <Card
            padding={false}
            header={
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-[#1A6B5C]" />
                  <span className="text-sm font-semibold text-[#0D4035]">Basket</span>
                </div>
                <Badge variant={cartItems.length > 0 ? 'success' : 'muted'} size="sm">
                  {cartItems.length} item{cartItems.length === 1 ? '' : 's'}
                </Badge>
              </div>
            }
          >
            {cartItems.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[#64748B]">
                No medicines in the basket yet.
              </div>
            ) : (
              <div className="divide-y divide-[#D6F0E8]">
                {cartItems.map((item) => {
                  const itemAlerts = productAlertMap.get(item.product.id) ?? [];
                  const isModerate = itemAlerts.some((a) => a.severity === 'MODERATE');
                  const isMinor = !isModerate && itemAlerts.length > 0;
                  const isHintExpanded = expandedHints.has(item.id);
                  const topAlertText = itemAlerts[0]?.text ?? '';

                  const isInfoExpanded = expandedInfo.has(item.id);
                  const p = item.product;
                  const fefo = p.nextExpiringBatch;
                  const fefoExpiryDays = fefo?.expiryDate
                    ? Math.ceil((new Date(fefo.expiryDate).getTime() - Date.now()) / 86_400_000)
                    : null;
                  const fefoUrgent = fefoExpiryDays !== null && fefoExpiryDays <= 30;
                  const isExpired = fefoExpiryDays !== null && fefoExpiryDays <= 0;

                  return (
                    <div key={item.id} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="flex items-center gap-2 text-sm font-bold text-[#0D4035]">
                              <AwarDot awarClass={p.awarClass} />
                              {p.genericName || p.name}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedInfo((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(item.id)) {
                                    next.delete(item.id);
                                  } else {
                                    next.add(item.id);
                                    trackEvent('medicine_info_view', 'USED', { productId: item.product.id });
                                  }
                                  return next;
                                })
                              }
                              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[#1A6B5C] hover:text-[#0D4035]"
                              title="About this medicine"
                            >
                              <Info size={13} />
                            </button>
                            {(p.awarClass === 'WATCH' || p.awarClass === 'RESERVE') && (
                              <IndicationPicker
                                value={item.indication}
                                onChange={(indication) =>
                                  setCartItems((current) =>
                                    current.map((cartItem) =>
                                      cartItem.id === item.id ? { ...cartItem, indication } : cartItem,
                                    ),
                                  )
                                }
                              />
                            )}
                            {(isModerate || isMinor) && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedHints((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(item.id)) next.delete(item.id);
                                    else next.add(item.id);
                                    return next;
                                  })
                                }
                                className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold leading-none ${
                                  isModerate
                                    ? 'bg-[#FEF3C7] text-[#92400E] ring-1 ring-[#FDE68A]'
                                    : 'bg-[#D6F0E8] text-[#1A6B5C] ring-1 ring-[#AFDFD3]'
                                }`}
                                title={topAlertText}
                              >
                                {isModerate ? '!' : 'i'}
                              </button>
                            )}
                          </div>
                          {(p.awarClass === 'WATCH' || p.awarClass === 'RESERVE') && item.indication && (p.genericName || p.name) && (
                            <StewardshipHint genericName={p.genericName || p.name} indication={item.indication} />
                          )}
                          {isInfoExpanded && (
                            <div className="mt-2 rounded-lg bg-[#EDF7F3] px-3 py-2.5 text-xs text-[#374151] space-y-1.5">
                              {/* Plain-language indication */}
                              <p className="text-[#0D4035]">{getMedicineIndication(p)}</p>
                              {/* Active ingredient line (when brand name is displayed) */}
                              {p.genericName && p.genericName !== p.name && (
                                <p className="text-[#475569]">
                                  Active ingredient: {p.genericName}{p.strength ? ` ${p.strength}` : ''}
                                </p>
                              )}
                              {/* Standard adult dose */}
                              {p.standardAdultDose && (
                                <p className="text-[#374151]"><span className="font-semibold">Usual adult dose:</span> {p.standardAdultDose}</p>
                              )}
                              {/* Pregnancy safety */}
                              {p.pregnancyCategory && (
                                <p className={`font-medium ${['D','X'].includes(p.pregnancyCategory.toUpperCase()) ? 'text-[#DC2626]' : 'text-[#92400E]'}`}>
                                  Pregnancy category {p.pregnancyCategory.toUpperCase()}
                                  {p.pregnancyCategory.toUpperCase() === 'X' && ' — contraindicated in pregnancy'}
                                  {p.pregnancyCategory.toUpperCase() === 'D' && ' — evidence of foetal risk; use only if benefit outweighs risk'}
                                  {p.pregnancyCategory.toUpperCase() === 'C' && ' — risk cannot be ruled out; use with caution'}
                                  {p.pregnancyCategory.toUpperCase() === 'B' && ' — no evidence of foetal risk in animal studies'}
                                  {p.pregnancyCategory.toUpperCase() === 'A' && ' — adequate studies show no risk to the foetus'}
                                </p>
                              )}
                              {/* Breastfeeding safety */}
                              {p.breastfeedingSafety && (
                                <p className="text-[#374151]"><span className="font-semibold">Breastfeeding:</span> {p.breastfeedingSafety}</p>
                              )}
                              {/* AWaRe antibiotic stewardship — plain language */}
                              {p.awarClass === 'RESERVE' && (
                                <p className="font-semibold text-[#DC2626]">⚠ AWaRe RESERVE — last-resort antibiotic. Only for serious infections where other antibiotics have failed.</p>
                              )}
                              {p.awarClass === 'WATCH' && (
                                <p className="text-[#92400E]">AWaRe WATCH — use with care, avoid unnecessary prescribing.</p>
                              )}
                              {/* Key counselling points */}
                              {['SYRUP', 'SUSPENSION', 'DROPS', 'SOLUTION'].includes(p.dosageForm) && (
                                <p className="font-medium text-[#1A6B5C]">➤ Counsel: shake well before each use.</p>
                              )}
                              {(p.drugClass as string) === 'ANTIBIOTIC' && (
                                <p className="font-medium text-[#1A6B5C]">➤ Counsel: complete the full course even if feeling better.</p>
                              )}
                              {(p.coldChainRequired || p.isColdChain) && (
                                <p className="font-semibold text-[#1E40AF]">❄ Cold chain — must be stored in refrigerator.</p>
                              )}
                              {/* Knowledge Hub link */}
                              <Link
                                to={`/knowledge?q=${encodeURIComponent(p.genericName || p.name)}`}
                                className="mt-1 inline-flex items-center gap-1 text-[#1A6B5C] hover:underline font-medium"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <BookOpen size={11} />
                                More details in Knowledge Hub
                                <ExternalLink size={10} />
                              </Link>
                            </div>
                          )}
                          {isHintExpanded && topAlertText && (
                            <p className={`mt-0.5 text-xs ${isModerate ? 'text-[#92400E]' : 'text-[#475569]'}`}>
                              {topAlertText}
                            </p>
                          )}
                          {isExpired && (
                            <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-2 py-1 text-xs font-semibold text-[#DC2626]">
                              <AlertTriangle size={11} />
                              EXPIRED — remove this item before dispensing
                            </div>
                          )}
                          {/* Static medicine warnings — contraindications and key cautions */}
                          {(() => {
                            const warnings = getCartWarnings(p);
                            if (warnings.length === 0) return null;
                            return (
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                {warnings.map((w, idx) => (
                                  <span
                                    key={idx}
                                    className={`text-[10px] font-medium ${
                                      w.severity === 'high' ? 'text-[#B91C1C]' : 'text-[#92400E]'
                                    }`}
                                  >
                                    {w.severity === 'high' ? '▲' : '●'} {w.text}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                          <p className="mt-0.5 text-xs text-[#64748B]">
                            {item.quantity} × {money(item.unitPrice)}
                            {!isExpired && fefoUrgent && fefoExpiryDays !== null && (
                              <span className="ml-2 font-semibold text-[#B45309]">· Exp {fefoExpiryDays}d</span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold text-[#0D4035]">{money(item.lineTotal)}</p>
                          <button
                            type="button"
                            onClick={() => setCartItems((current) => current.filter((cartItem) => cartItem.id !== item.id))}
                            className="mt-1 inline-flex items-center gap-1 text-xs text-[#DC2626] hover:underline"
                          >
                            <Trash2 size={11} />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-4 rounded-b-2xl border-t-2 border-[#D6F0E8] bg-[#F8FAFC] px-5 py-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748B]">Subtotal</span>
                <span className="text-sm font-semibold text-[#0D4035]">{money(cartTotal)}</span>
              </div>

              {canApplyDiscount && (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select
                      label="Discount"
                      value={discountType}
                      onChange={(event) => {
                        const val = event.target.value as typeof discountType;
                        setDiscountType(val);
                        if (val === 'none') {
                          setDiscountAmount('');
                        } else if (val === 'custom') {
                          setDiscountAmount('');
                        } else {
                          const pct = parseInt(val, 10);
                          setDiscountAmount(String(Math.round(cartTotal * pct / 100)));
                        }
                      }}
                      options={[
                        { value: 'none',   label: 'No discount' },
                        { value: '5',      label: '5%' },
                        { value: '10',     label: '10%' },
                        { value: '15',     label: '15%' },
                        { value: '20',     label: '20%' },
                        { value: '25',     label: '25%' },
                        { value: '50',     label: '50%' },
                        { value: 'custom', label: 'Custom amount' },
                      ]}
                    />
                    <Select
                      label="Discount reason"
                      value={discountReason}
                      onChange={(event) => setDiscountReason(event.target.value)}
                      options={[
                        { value: '',                  label: 'Select reason…' },
                        { value: 'Staff discount',    label: 'Staff discount' },
                        { value: 'Loyalty customer',  label: 'Loyalty customer' },
                        { value: 'Near expiry',       label: 'Near expiry' },
                        { value: 'Damaged packaging', label: 'Damaged packaging' },
                        { value: 'Promotion',         label: 'Promotion' },
                        { value: 'Manual override',   label: 'Manual override' },
                        { value: 'Other',             label: 'Other' },
                      ]}
                    />
                  </div>
                  {discountType === 'custom' && (
                    <Input
                      label="Custom discount amount (Tsh)"
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={(event) => setDiscountAmount(event.target.value)}
                      placeholder="0"
                    />
                  )}
                  {parsedDiscount > 0 && (
                    <p className="text-xs text-[#1A6B5C]">
                      Discount: {money(parsedDiscount)} off
                      {cartTotal > 0 ? ` (${Math.round((parsedDiscount / cartTotal) * 100)}%)` : ''}
                    </p>
                  )}
                </div>
              )}

              <Select
                label="Payment method"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                options={paymentOptions}
              />

              {selectedPaymentOption && selectedPaymentOption.code !== 'CASH' && (
                <div className="rounded-2xl border border-[#D6F0E8] bg-white px-4 py-3 text-sm text-[#475569]">
                  <p className="font-semibold text-[#0D4035]">{selectedPaymentOption.label}</p>
                  {selectedPaymentOption.phoneNumber && (
                    <p className="mt-1">Pay to: {selectedPaymentOption.phoneNumber}</p>
                  )}
                  {selectedPaymentOption.note && (
                    <p className="mt-1">{selectedPaymentOption.note}</p>
                  )}
                  {paymentMethodsQuery.isError && selectedPaymentOption.source !== 'legacy' && (
                    <p className="mt-1 text-xs text-[#92400E]">
                      Using the last cached payment settings while offline or when the server is unavailable.
                    </p>
                  )}
                </div>
              )}

                {selectedPaymentOption?.requiresReference && (
                  <Input
                    label="Payment reference"
                    value={paymentRef}
                    onChange={(event) => setPaymentRef(event.target.value)}
                    placeholder="Transaction reference"
                  />
                )}

                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-[#374151]">
                    <Camera size={15} className="text-[#1A6B5C]" />
                    Prescription photo (optional)
                  </label>
                  <input
                    aria-label="Prescription photo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    capture="environment"
                    onChange={(event) => setPrescriptionPhoto(event.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-[#0D4035] file:mr-4 file:rounded-xl file:border-0 file:bg-[#EDF7F3] file:px-4 file:py-2 file:font-medium file:text-[#1A6B5C] hover:file:bg-[#D6F0E8]"
                  />
                  <p className="mt-2 text-xs text-[#64748B]">
                    Use the phone camera or upload an image if you want to keep the original prescription with this sale.
                  </p>
                  {prescriptionPhoto && (
                    <div className="mt-2 flex items-center justify-between rounded-2xl border border-[#D6F0E8] bg-white px-3 py-2 text-sm text-[#0D4035]">
                      <span className="truncate">{prescriptionPhoto.name}</span>
                      <Button size="sm" variant="ghost" onClick={() => setPrescriptionPhoto(null)}>
                        Clear
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-[#EDF7F3] px-4 py-3">
                  <span className="text-sm font-semibold text-[#1A6B5C]">Total due</span>
                  <span className="text-2xl font-bold tracking-tight text-[#0D4035]">{money(totalDue)}</span>
                </div>

              {safetyStatus.requiresOverride && (
                <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs text-[#92400E]">
                  Acknowledge the high-risk alert in the safety panel above before completing this dispensing.
                </div>
              )}

              {cartItems.some((item) => {
                const days = item.product.nextExpiringBatch?.expiryDate
                  ? Math.ceil((new Date(item.product.nextExpiringBatch.expiryDate).getTime() - Date.now()) / 86_400_000)
                  : null;
                return days !== null && days <= 0;
              }) && (
                <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs font-semibold text-[#DC2626]">
                  Remove expired medicines from the basket before completing this dispensing.
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                leftIcon={<CheckCircle size={18} />}
                loading={checkoutMutation.isPending}
                disabled={
                  cartItems.length === 0 ||
                  (parsedDiscount > 0 && (!canApplyDiscount || !discountReason.trim())) ||
                  safetyStatus.requiresOverride ||
                  cartItems.some((item) => {
                    const days = item.product.nextExpiringBatch?.expiryDate
                      ? Math.ceil((new Date(item.product.nextExpiringBatch.expiryDate).getTime() - Date.now()) / 86_400_000)
                      : null;
                    return days !== null && days <= 0;
                  })
                }
                onClick={() => checkoutMutation.mutate()}
              >
                Complete dispensing
              </Button>
            </div>
          </Card>

          {receipt?.safetyReview && receipt.safetyReview.requiresPicPin && (
            <div className="flex items-start gap-2 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs text-[#92400E]">
              <AlertTriangle size={14} className="mt-0.5 text-[#D97706]" />
              <p>
                This dispensing included a documented PIC override. The override record is preserved in the permanent audit log.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
