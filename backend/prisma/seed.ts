import { PrismaClient, UserRole, PharmacyType, SubscriptionTier, StorageCondition, ComplianceType, ComplianceStatus, InteractionSeverity, PregnancyCategory, ArticleStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PASSWORD = 'Demo123!';

async function main() {
  console.log('🌱 Starting seed...');

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  await prisma.drugMaster.deleteMany();
  await prisma.cpdActivity.deleteMany();
  await prisma.interactionAlertLog.deleteMany();
  await prisma.claimScrubResult.deleteMany();
  await prisma.nhifClaim.deleteMany();
  await prisma.claimBatch.deleteMany();
  await prisma.dispensingEvent.deleteMany();
  await prisma.prescriptionRecord.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.drugInteraction.deleteMany();
  await prisma.drugContraindication.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.complianceDocument.deleteMany();
  await prisma.complianceAlert.deleteMany();
  await prisma.complianceItem.deleteMany();
  await prisma.staffCredential.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.article.deleteMany();
  await prisma.subscriber.deleteMany();
  await prisma.iCD10Code.deleteMany();
  await prisma.drugDatabase.deleteMany();
  await prisma.session.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.pharmacy.deleteMany();
  await prisma.cpdRequirement.deleteMany();

  const hash = await bcrypt.hash(PASSWORD, 12);

  // DrugMaster catalogue (system-wide NEML seed)
  const drugMasterData = [
    // Analgesics / Antipyretics
    { genericName: 'Paracetamol', dosageForm: 'Tablet', strength: '500mg', drugClass: 'Analgesic / Antipyretic', unitOfMeasure: 'tablets', packSize: 1000, tmdaRegistrationNumber: 'TZ-TMDA-0003-2019', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Ibuprofen', dosageForm: 'Tablet', strength: '400mg', drugClass: 'Anti-inflammatory (NSAID)', unitOfMeasure: 'tablets', packSize: 500, tmdaRegistrationNumber: 'TZ-TMDA-0004-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Aspirin', dosageForm: 'Tablet', strength: '75mg', drugClass: 'Analgesic / Antipyretic', unitOfMeasure: 'tablets', packSize: 28, tmdaRegistrationNumber: 'TZ-TMDA-0041-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Diclofenac', dosageForm: 'Tablet', strength: '50mg', drugClass: 'Anti-inflammatory (NSAID)', unitOfMeasure: 'tablets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0051-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Tramadol', dosageForm: 'Capsule', strength: '50mg', drugClass: 'Analgesic', unitOfMeasure: 'capsules', packSize: 20, tmdaRegistrationNumber: 'TZ-TMDA-0048-2021', storageCondition: 'AMBIENT', isEssentialMedicine: false },
    { genericName: 'Morphine', dosageForm: 'Injection', strength: '10mg/ml', drugClass: 'Opioid Analgesic', unitOfMeasure: 'ampoules', packSize: 10, tmdaRegistrationNumber: 'TZ-TMDA-0047-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },

    // Antibiotics
    { genericName: 'Amoxicillin', dosageForm: 'Capsule', strength: '500mg', drugClass: 'Antibiotic', unitOfMeasure: 'capsules', packSize: 1000, tmdaRegistrationNumber: 'TZ-TMDA-0001-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Amoxicillin', dosageForm: 'Syrup', strength: '250mg/5ml', drugClass: 'Antibiotic', unitOfMeasure: 'bottles', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0001-2020-S', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Amoxicillin + Clavulanate', dosageForm: 'Tablet', strength: '500mg/125mg', drugClass: 'Antibiotic', unitOfMeasure: 'tablets', packSize: 14, tmdaRegistrationNumber: 'TZ-TMDA-0052-2022', storageCondition: 'AMBIENT', isEssentialMedicine: false },
    { genericName: 'Cotrimoxazole', dosageForm: 'Tablet', strength: '480mg', drugClass: 'Antibiotic', unitOfMeasure: 'tablets', packSize: 1000, tmdaRegistrationNumber: 'TZ-TMDA-0005-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Metronidazole', dosageForm: 'Tablet', strength: '400mg', drugClass: 'Antibiotic', unitOfMeasure: 'tablets', packSize: 1000, tmdaRegistrationNumber: 'TZ-TMDA-0002-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Doxycycline', dosageForm: 'Capsule', strength: '100mg', drugClass: 'Antibiotic', unitOfMeasure: 'capsules', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0018-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Ciprofloxacin', dosageForm: 'Tablet', strength: '500mg', drugClass: 'Antibiotic', unitOfMeasure: 'tablets', packSize: 10, tmdaRegistrationNumber: 'TZ-TMDA-0019-2022', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Erythromycin', dosageForm: 'Tablet', strength: '250mg', drugClass: 'Antibiotic', unitOfMeasure: 'tablets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0020-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Azithromycin', dosageForm: 'Tablet', strength: '500mg', drugClass: 'Antibiotic', unitOfMeasure: 'tablets', packSize: 3, tmdaRegistrationNumber: 'TZ-TMDA-0053-2022', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Cloxacillin', dosageForm: 'Capsule', strength: '500mg', drugClass: 'Antibiotic', unitOfMeasure: 'capsules', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0054-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },

    // Antimalarials
    { genericName: 'Artemether + Lumefantrine', dosageForm: 'Tablet', strength: '20mg/120mg', drugClass: 'Antimalarial', unitOfMeasure: 'tablets', packSize: 24, tmdaRegistrationNumber: 'TZ-TMDA-0006-2022', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Artemether + Lumefantrine', dosageForm: 'Tablet', strength: '40mg/240mg', drugClass: 'Antimalarial', unitOfMeasure: 'tablets', packSize: 24, tmdaRegistrationNumber: 'TZ-TMDA-0006-2022-B', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Quinine', dosageForm: 'Tablet', strength: '300mg', drugClass: 'Antimalarial', unitOfMeasure: 'tablets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0055-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Sulfadoxine + Pyrimethamine', dosageForm: 'Tablet', strength: '500mg/25mg', drugClass: 'Antimalarial', unitOfMeasure: 'tablets', packSize: 3, tmdaRegistrationNumber: 'TZ-TMDA-0056-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },

    // Antifungals
    { genericName: 'Fluconazole', dosageForm: 'Capsule', strength: '150mg', drugClass: 'Antifungal', unitOfMeasure: 'capsules', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0021-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Clotrimazole', dosageForm: 'Vaginal Tablet', strength: '100mg', drugClass: 'Antifungal', unitOfMeasure: 'tablets', packSize: 6, tmdaRegistrationNumber: 'TZ-TMDA-0022-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Clotrimazole', dosageForm: 'Cream', strength: '1%', drugClass: 'Antifungal', unitOfMeasure: 'tubes', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0022-2021-C', storageCondition: 'AMBIENT', isEssentialMedicine: false },
    { genericName: 'Griseofulvin', dosageForm: 'Tablet', strength: '500mg', drugClass: 'Antifungal', unitOfMeasure: 'tablets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0057-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },

    // Antihypertensives / Cardiovascular
    { genericName: 'Amlodipine', dosageForm: 'Tablet', strength: '5mg', drugClass: 'Antihypertensive', unitOfMeasure: 'tablets', packSize: 30, tmdaRegistrationNumber: 'TZ-TMDA-0007-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Amlodipine', dosageForm: 'Tablet', strength: '10mg', drugClass: 'Antihypertensive', unitOfMeasure: 'tablets', packSize: 30, tmdaRegistrationNumber: 'TZ-TMDA-0007-2021-B', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Atenolol', dosageForm: 'Tablet', strength: '50mg', drugClass: 'Antihypertensive', unitOfMeasure: 'tablets', packSize: 28, tmdaRegistrationNumber: 'TZ-TMDA-0008-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Enalapril', dosageForm: 'Tablet', strength: '5mg', drugClass: 'Antihypertensive', unitOfMeasure: 'tablets', packSize: 28, tmdaRegistrationNumber: 'TZ-TMDA-0037-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Losartan', dosageForm: 'Tablet', strength: '50mg', drugClass: 'Antihypertensive', unitOfMeasure: 'tablets', packSize: 28, tmdaRegistrationNumber: 'TZ-TMDA-0038-2022', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Furosemide', dosageForm: 'Tablet', strength: '40mg', drugClass: 'Antihypertensive', unitOfMeasure: 'tablets', packSize: 28, tmdaRegistrationNumber: 'TZ-TMDA-0039-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Hydrochlorothiazide', dosageForm: 'Tablet', strength: '25mg', drugClass: 'Antihypertensive', unitOfMeasure: 'tablets', packSize: 28, tmdaRegistrationNumber: 'TZ-TMDA-0045-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Spironolactone', dosageForm: 'Tablet', strength: '25mg', drugClass: 'Antihypertensive', unitOfMeasure: 'tablets', packSize: 30, tmdaRegistrationNumber: 'TZ-TMDA-0040-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Nifedipine', dosageForm: 'Capsule', strength: '10mg', drugClass: 'Antihypertensive', unitOfMeasure: 'capsules', packSize: 30, tmdaRegistrationNumber: 'TZ-TMDA-0046-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Warfarin', dosageForm: 'Tablet', strength: '5mg', drugClass: 'Anticoagulant', unitOfMeasure: 'tablets', packSize: 28, tmdaRegistrationNumber: 'TZ-TMDA-0042-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Simvastatin', dosageForm: 'Tablet', strength: '20mg', drugClass: 'Antihypertensive', unitOfMeasure: 'tablets', packSize: 28, tmdaRegistrationNumber: 'TZ-TMDA-0058-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },

    // Diabetes
    { genericName: 'Metformin', dosageForm: 'Tablet', strength: '500mg', drugClass: 'Antidiabetic', unitOfMeasure: 'tablets', packSize: 60, tmdaRegistrationNumber: 'TZ-TMDA-0009-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Metformin', dosageForm: 'Tablet', strength: '850mg', drugClass: 'Antidiabetic', unitOfMeasure: 'tablets', packSize: 60, tmdaRegistrationNumber: 'TZ-TMDA-0009-2021-B', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Glibenclamide', dosageForm: 'Tablet', strength: '5mg', drugClass: 'Antidiabetic', unitOfMeasure: 'tablets', packSize: 30, tmdaRegistrationNumber: 'TZ-TMDA-0010-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Insulin Regular', dosageForm: 'Injection', strength: '100IU/ml', drugClass: 'Antidiabetic', unitOfMeasure: 'vials', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0043-2022', storageCondition: 'REFRIGERATED', isColdChain: true, isEssentialMedicine: true },
    { genericName: 'Insulin NPH', dosageForm: 'Injection', strength: '100IU/ml', drugClass: 'Antidiabetic', unitOfMeasure: 'vials', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0044-2022', storageCondition: 'REFRIGERATED', isColdChain: true, isEssentialMedicine: true },
    { genericName: 'Glimepiride', dosageForm: 'Tablet', strength: '2mg', drugClass: 'Antidiabetic', unitOfMeasure: 'tablets', packSize: 30, tmdaRegistrationNumber: 'TZ-TMDA-0059-2022', storageCondition: 'AMBIENT', isEssentialMedicine: false },

    // Respiratory
    { genericName: 'Salbutamol', dosageForm: 'Inhaler', strength: '100mcg', drugClass: 'Bronchodilator', unitOfMeasure: 'inhalers', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0028-2022', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Beclomethasone', dosageForm: 'Inhaler', strength: '100mcg', drugClass: 'Corticosteroid', unitOfMeasure: 'inhalers', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0029-2022', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Salbutamol', dosageForm: 'Tablet', strength: '4mg', drugClass: 'Bronchodilator', unitOfMeasure: 'tablets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0028-2022-T', storageCondition: 'AMBIENT', isEssentialMedicine: false },

    // Gastrointestinal
    { genericName: 'Omeprazole', dosageForm: 'Capsule', strength: '20mg', drugClass: 'Antacid / GI', unitOfMeasure: 'capsules', packSize: 28, tmdaRegistrationNumber: 'TZ-TMDA-0011-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Ranitidine', dosageForm: 'Tablet', strength: '150mg', drugClass: 'Antacid / GI', unitOfMeasure: 'tablets', packSize: 60, tmdaRegistrationNumber: 'TZ-TMDA-0012-2019', storageCondition: 'AMBIENT', isEssentialMedicine: false },
    { genericName: 'ORS', brandName: 'Oral Rehydration Salts', dosageForm: 'Sachet', strength: 'Standard WHO', drugClass: 'Antacid / GI', unitOfMeasure: 'sachets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0013-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Mebendazole', dosageForm: 'Tablet', strength: '500mg', drugClass: 'Antiparasitic', unitOfMeasure: 'tablets', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0060-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Albendazole', dosageForm: 'Tablet', strength: '400mg', drugClass: 'Antiparasitic', unitOfMeasure: 'tablets', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0050-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },

    // Corticosteroids
    { genericName: 'Prednisolone', dosageForm: 'Tablet', strength: '5mg', drugClass: 'Corticosteroid', unitOfMeasure: 'tablets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0030-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Dexamethasone', dosageForm: 'Injection', strength: '4mg/ml', drugClass: 'Corticosteroid', unitOfMeasure: 'vials', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0031-2022', storageCondition: 'REFRIGERATED', isEssentialMedicine: true },
    { genericName: 'Hydrocortisone', dosageForm: 'Cream', strength: '1%', drugClass: 'Corticosteroid', unitOfMeasure: 'tubes', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0023-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Betamethasone', dosageForm: 'Cream', strength: '0.1%', drugClass: 'Corticosteroid', unitOfMeasure: 'tubes', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0024-2021', storageCondition: 'AMBIENT', isEssentialMedicine: false },

    // Eye / ENT
    { genericName: 'Gentamicin', dosageForm: 'Eye Drops', strength: '0.3%', drugClass: 'Antibiotic', unitOfMeasure: 'bottles', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0025-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Chloramphenicol', dosageForm: 'Eye Drops', strength: '0.5%', drugClass: 'Antibiotic', unitOfMeasure: 'bottles', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0026-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Tetracycline', dosageForm: 'Eye Ointment', strength: '1%', drugClass: 'Antibiotic', unitOfMeasure: 'tubes', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0027-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },

    // Neurological / Psychiatric
    { genericName: 'Diazepam', dosageForm: 'Tablet', strength: '5mg', drugClass: 'Anticonvulsant', unitOfMeasure: 'tablets', packSize: 30, tmdaRegistrationNumber: 'TZ-TMDA-0032-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Phenobarbitone', dosageForm: 'Tablet', strength: '30mg', drugClass: 'Anticonvulsant', unitOfMeasure: 'tablets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0033-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Carbamazepine', dosageForm: 'Tablet', strength: '200mg', drugClass: 'Anticonvulsant', unitOfMeasure: 'tablets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0034-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Haloperidol', dosageForm: 'Tablet', strength: '5mg', drugClass: 'Antipsychotic', unitOfMeasure: 'tablets', packSize: 30, tmdaRegistrationNumber: 'TZ-TMDA-0035-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Chlorpromazine', dosageForm: 'Tablet', strength: '100mg', drugClass: 'Antipsychotic', unitOfMeasure: 'tablets', packSize: 50, tmdaRegistrationNumber: 'TZ-TMDA-0036-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },

    // Vitamins / Supplements
    { genericName: 'Zinc Sulfate', dosageForm: 'Tablet', strength: '20mg', drugClass: 'Vitamin / Supplement', unitOfMeasure: 'tablets', packSize: 10, tmdaRegistrationNumber: 'TZ-TMDA-0014-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Vitamin A', dosageForm: 'Capsule', strength: '200000IU', drugClass: 'Vitamin / Supplement', unitOfMeasure: 'capsules', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0015-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Ferrous Sulfate', dosageForm: 'Tablet', strength: '200mg', drugClass: 'Vitamin / Supplement', unitOfMeasure: 'tablets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0016-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Folic Acid', dosageForm: 'Tablet', strength: '5mg', drugClass: 'Vitamin / Supplement', unitOfMeasure: 'tablets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0017-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Multivitamins', dosageForm: 'Tablet', strength: 'Standard', drugClass: 'Vitamin / Supplement', unitOfMeasure: 'tablets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0049-2020', storageCondition: 'AMBIENT', isEssentialMedicine: false },
    { genericName: 'Vitamin B Complex', dosageForm: 'Tablet', strength: 'Standard', drugClass: 'Vitamin / Supplement', unitOfMeasure: 'tablets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0061-2020', storageCondition: 'AMBIENT', isEssentialMedicine: false },
    { genericName: 'Vitamin C', dosageForm: 'Tablet', strength: '500mg', drugClass: 'Vitamin / Supplement', unitOfMeasure: 'tablets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0062-2020', storageCondition: 'AMBIENT', isEssentialMedicine: false },

    // Antiretrovirals
    { genericName: 'Tenofovir + Lamivudine + Dolutegravir', brandName: 'TLD', dosageForm: 'Tablet', strength: '300mg/300mg/50mg', drugClass: 'Antiretroviral', unitOfMeasure: 'tablets', packSize: 30, tmdaRegistrationNumber: 'TZ-TMDA-0063-2022', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Efavirenz + Tenofovir + Emtricitabine', dosageForm: 'Tablet', strength: '600mg/300mg/200mg', drugClass: 'Antiretroviral', unitOfMeasure: 'tablets', packSize: 30, tmdaRegistrationNumber: 'TZ-TMDA-0064-2022', storageCondition: 'AMBIENT', isEssentialMedicine: true },

    // Contraceptives
    { genericName: 'Levonorgestrel + Ethinyl Estradiol', brandName: 'Lo-Femenal', dosageForm: 'Tablet', strength: '0.15mg/0.03mg', drugClass: 'Contraceptive', unitOfMeasure: 'tablets', packSize: 21, tmdaRegistrationNumber: 'TZ-TMDA-0065-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Medroxyprogesterone Acetate', brandName: 'Depo-Provera', dosageForm: 'Injection', strength: '150mg/ml', drugClass: 'Contraceptive', unitOfMeasure: 'vials', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0066-2021', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Levonorgestrel', brandName: 'Postinor', dosageForm: 'Tablet', strength: '1.5mg', drugClass: 'Contraceptive', unitOfMeasure: 'tablets', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0067-2021', storageCondition: 'AMBIENT', isEssentialMedicine: false },

    // Antihistamines
    { genericName: 'Cetirizine', dosageForm: 'Tablet', strength: '10mg', drugClass: 'Antihistamine', unitOfMeasure: 'tablets', packSize: 10, tmdaRegistrationNumber: 'TZ-TMDA-0068-2021', storageCondition: 'AMBIENT', isEssentialMedicine: false },
    { genericName: 'Loratadine', dosageForm: 'Tablet', strength: '10mg', drugClass: 'Antihistamine', unitOfMeasure: 'tablets', packSize: 10, tmdaRegistrationNumber: 'TZ-TMDA-0069-2021', storageCondition: 'AMBIENT', isEssentialMedicine: false },
    { genericName: 'Chlorphenamine', dosageForm: 'Tablet', strength: '4mg', drugClass: 'Antihistamine', unitOfMeasure: 'tablets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0070-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },

    // Skin
    { genericName: 'Benzyl Benzoate', dosageForm: 'Lotion', strength: '25%', drugClass: 'Antiparasitic', unitOfMeasure: 'bottles', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0071-2020', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Calamine', dosageForm: 'Lotion', strength: 'Standard', drugClass: 'Antihistamine', unitOfMeasure: 'bottles', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0072-2020', storageCondition: 'AMBIENT', isEssentialMedicine: false },

    // Diagnostics / OTC
    { genericName: 'Malaria RDT', dosageForm: 'Test Kit', strength: 'N/A', drugClass: 'Diagnostic Agent', unitOfMeasure: 'kits', packSize: 25, tmdaRegistrationNumber: 'TZ-TMDA-0073-2022', storageCondition: 'AMBIENT', isEssentialMedicine: true },
    { genericName: 'Blood Glucose Test Strips', dosageForm: 'Test Strip', strength: 'N/A', drugClass: 'Diagnostic Agent', unitOfMeasure: 'strips', packSize: 50, tmdaRegistrationNumber: 'TZ-TMDA-0074-2022', storageCondition: 'AMBIENT', isEssentialMedicine: false },
    { genericName: 'Pregnancy Test', dosageForm: 'Test Kit', strength: 'N/A', drugClass: 'Diagnostic Agent', unitOfMeasure: 'kits', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0075-2022', storageCondition: 'AMBIENT', isEssentialMedicine: false },
  ] as const;

  await prisma.drugMaster.createMany({
    data: drugMasterData.map((drug) => ({
      ...drug,
      storageCondition: StorageCondition[drug.storageCondition],
    })),
  });
  console.log(`✅ ${drugMasterData.length} DrugMaster entries seeded`);

  // ── Pharmacy ─────────────────────────────────────────────────────────────────
  const pharmacy = await prisma.pharmacy.create({
    data: {
      name: 'Amani Pharmacy',
      licenceNumber: 'PH-AR-2024-001',
      address: 'Sokoine Road, Arusha Central',
      region: 'Arusha',
      pharmacyType: PharmacyType.RETAIL,
      subscriptionTier: SubscriptionTier.STANDARD,
    },
  });
  console.log('✅ Pharmacy created:', pharmacy.name);

  // ── Users ─────────────────────────────────────────────────────────────────────
  const superAdmin = await prisma.user.create({
    data: { email: 'founder@pharmaconnect.tz', passwordHash: hash, firstName: 'Amina', lastName: 'Nnko', role: UserRole.SUPER_ADMIN, isActive: true },
  });
  const owner = await prisma.user.create({
    data: { email: 'owner@amani.co.tz', passwordHash: hash, firstName: 'Mohamed', lastName: 'Rashid', role: UserRole.OWNER, pharmacyId: pharmacy.id, isActive: true },
  });
  const pic = await prisma.user.create({
    data: { email: 'admin@pharmaconnect.tz', passwordHash: hash, firstName: 'Neema', lastName: 'Mushi', role: UserRole.PHARMACIST_IN_CHARGE, pharmacyId: pharmacy.id, pcRegistrationNumber: 'PC-TZ-2019-4521', isActive: true },
  });
  const dispenser1 = await prisma.user.create({
    data: { email: 'staff@pharmaconnect.tz', passwordHash: hash, firstName: 'Paulo', lastName: 'Ole', role: UserRole.DISPENSER, pharmacyId: pharmacy.id, isActive: true },
  });
  const dispenser2 = await prisma.user.create({
    data: { email: 'dispenser2@amani.co.tz', passwordHash: hash, firstName: 'Grace', lastName: 'Kimaro', role: UserRole.DISPENSER, pharmacyId: pharmacy.id, isActive: true },
  });
  await prisma.user.create({
    data: { email: 'clerk@amani.co.tz', passwordHash: hash, firstName: 'Peter', lastName: 'Massawe', role: UserRole.DATA_ENTRY_CLERK, pharmacyId: pharmacy.id, isActive: true },
  });
  await prisma.user.create({
    data: { email: 'seller@amani.co.tz', passwordHash: hash, firstName: 'Amina', lastName: 'Juma', role: UserRole.WHOLESALE_SELLER, pharmacyId: pharmacy.id, isActive: true },
  });
  console.log('✅ Users created');

  // Update pharmacy ownerId
  await prisma.pharmacy.update({ where: { id: pharmacy.id }, data: { ownerId: owner.id } });

  // ── Suppliers ─────────────────────────────────────────────────────────────────
  const [sup1, sup2, sup3] = await Promise.all([
    prisma.supplier.create({ data: { name: 'Shelys Pharmaceuticals Ltd', contactPerson: 'Sales Manager', phone: '+255222123456', email: 'sales@shelys.co.tz', address: 'Msasani, Dar es Salaam', pharmacyId: pharmacy.id } }),
    prisma.supplier.create({ data: { name: 'Zenufa Laboratories Ltd', contactPerson: 'Commercial Director', phone: '+255222654321', email: 'orders@zenufa.co.tz', address: 'Mikocheni, Dar es Salaam', pharmacyId: pharmacy.id } }),
    prisma.supplier.create({ data: { name: 'Cipla Quality Chemical Industries', contactPerson: 'Regional Manager', phone: '+256414123456', email: 'ea@ciplaqualchem.com', address: 'Kampala Industrial Area, Uganda', pharmacyId: pharmacy.id } }),
  ]);
  console.log('✅ Suppliers created');

  // ── Products (50 NEML items) ──────────────────────────────────────────────────
  const productData = [
    { name: 'Amoxicillin 500mg Capsules', genericName: 'Amoxicillin', dosageForm: 'Capsule', strength: '500mg', unitOfMeasure: 'capsules', packSize: 1000, tmdaRegistrationNumber: 'TZ-TMDA-0001-2020', reorderLevel: 50, storageCondition: StorageCondition.AMBIENT },
    { name: 'Metronidazole 400mg Tablets', genericName: 'Metronidazole', dosageForm: 'Tablet', strength: '400mg', unitOfMeasure: 'tablets', packSize: 1000, tmdaRegistrationNumber: 'TZ-TMDA-0002-2020', reorderLevel: 50, storageCondition: StorageCondition.AMBIENT },
    { name: 'Paracetamol 500mg Tablets', genericName: 'Paracetamol', dosageForm: 'Tablet', strength: '500mg', unitOfMeasure: 'tablets', packSize: 1000, tmdaRegistrationNumber: 'TZ-TMDA-0003-2019', reorderLevel: 100, storageCondition: StorageCondition.AMBIENT },
    { name: 'Ibuprofen 400mg Tablets', genericName: 'Ibuprofen', dosageForm: 'Tablet', strength: '400mg', unitOfMeasure: 'tablets', packSize: 500, tmdaRegistrationNumber: 'TZ-TMDA-0004-2021', reorderLevel: 50, storageCondition: StorageCondition.AMBIENT },
    { name: 'Cotrimoxazole 480mg Tablets', genericName: 'Cotrimoxazole', dosageForm: 'Tablet', strength: '480mg', unitOfMeasure: 'tablets', packSize: 1000, tmdaRegistrationNumber: 'TZ-TMDA-0005-2020', reorderLevel: 50, storageCondition: StorageCondition.AMBIENT },
    { name: 'Artemether+Lumefantrine 20/120mg Tablets', genericName: 'Artemether+Lumefantrine', dosageForm: 'Tablet', strength: '20/120mg', unitOfMeasure: 'tablets', packSize: 24, tmdaRegistrationNumber: 'TZ-TMDA-0006-2022', reorderLevel: 30, storageCondition: StorageCondition.AMBIENT },
    { name: 'Amlodipine 5mg Tablets', genericName: 'Amlodipine', dosageForm: 'Tablet', strength: '5mg', unitOfMeasure: 'tablets', packSize: 30, tmdaRegistrationNumber: 'TZ-TMDA-0007-2021', reorderLevel: 20, storageCondition: StorageCondition.AMBIENT },
    { name: 'Atenolol 50mg Tablets', genericName: 'Atenolol', dosageForm: 'Tablet', strength: '50mg', unitOfMeasure: 'tablets', packSize: 28, tmdaRegistrationNumber: 'TZ-TMDA-0008-2020', reorderLevel: 20, storageCondition: StorageCondition.AMBIENT },
    { name: 'Metformin 500mg Tablets', genericName: 'Metformin', dosageForm: 'Tablet', strength: '500mg', unitOfMeasure: 'tablets', packSize: 60, tmdaRegistrationNumber: 'TZ-TMDA-0009-2021', reorderLevel: 30, storageCondition: StorageCondition.AMBIENT },
    { name: 'Glibenclamide 5mg Tablets', genericName: 'Glibenclamide', dosageForm: 'Tablet', strength: '5mg', unitOfMeasure: 'tablets', packSize: 30, tmdaRegistrationNumber: 'TZ-TMDA-0010-2021', reorderLevel: 20, storageCondition: StorageCondition.AMBIENT },
    { name: 'Omeprazole 20mg Capsules', genericName: 'Omeprazole', dosageForm: 'Capsule', strength: '20mg', unitOfMeasure: 'capsules', packSize: 28, tmdaRegistrationNumber: 'TZ-TMDA-0011-2020', reorderLevel: 30, storageCondition: StorageCondition.AMBIENT },
    { name: 'Ranitidine 150mg Tablets', genericName: 'Ranitidine', dosageForm: 'Tablet', strength: '150mg', unitOfMeasure: 'tablets', packSize: 60, tmdaRegistrationNumber: 'TZ-TMDA-0012-2019', reorderLevel: 20, storageCondition: StorageCondition.AMBIENT },
    { name: 'Oral Rehydration Salts Sachets', genericName: 'ORS', dosageForm: 'Sachet', strength: 'Standard', unitOfMeasure: 'sachets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0013-2020', reorderLevel: 50, storageCondition: StorageCondition.AMBIENT },
    { name: 'Zinc Sulfate 20mg Tablets', genericName: 'Zinc Sulfate', dosageForm: 'Tablet', strength: '20mg', unitOfMeasure: 'tablets', packSize: 10, tmdaRegistrationNumber: 'TZ-TMDA-0014-2021', reorderLevel: 30, storageCondition: StorageCondition.AMBIENT },
    { name: 'Vitamin A 200000IU Capsules', genericName: 'Vitamin A', dosageForm: 'Capsule', strength: '200000IU', unitOfMeasure: 'capsules', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0015-2020', reorderLevel: 20, storageCondition: StorageCondition.AMBIENT },
    { name: 'Ferrous Sulfate 200mg Tablets', genericName: 'Ferrous Sulfate', dosageForm: 'Tablet', strength: '200mg', unitOfMeasure: 'tablets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0016-2021', reorderLevel: 30, storageCondition: StorageCondition.AMBIENT },
    { name: 'Folic Acid 5mg Tablets', genericName: 'Folic Acid', dosageForm: 'Tablet', strength: '5mg', unitOfMeasure: 'tablets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0017-2020', reorderLevel: 20, storageCondition: StorageCondition.AMBIENT },
    { name: 'Doxycycline 100mg Capsules', genericName: 'Doxycycline', dosageForm: 'Capsule', strength: '100mg', unitOfMeasure: 'capsules', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0018-2021', reorderLevel: 20, storageCondition: StorageCondition.AMBIENT },
    { name: 'Ciprofloxacin 500mg Tablets', genericName: 'Ciprofloxacin', dosageForm: 'Tablet', strength: '500mg', unitOfMeasure: 'tablets', packSize: 10, tmdaRegistrationNumber: 'TZ-TMDA-0019-2022', reorderLevel: 20, storageCondition: StorageCondition.AMBIENT },
    { name: 'Erythromycin 250mg Tablets', genericName: 'Erythromycin', dosageForm: 'Tablet', strength: '250mg', unitOfMeasure: 'tablets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0020-2020', reorderLevel: 20, storageCondition: StorageCondition.AMBIENT },
    { name: 'Fluconazole 150mg Capsules', genericName: 'Fluconazole', dosageForm: 'Capsule', strength: '150mg', unitOfMeasure: 'capsules', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0021-2021', reorderLevel: 10, storageCondition: StorageCondition.AMBIENT },
    { name: 'Clotrimazole Vaginal Tablets 100mg', genericName: 'Clotrimazole', dosageForm: 'Vaginal Tablet', strength: '100mg', unitOfMeasure: 'tablets', packSize: 6, tmdaRegistrationNumber: 'TZ-TMDA-0022-2021', reorderLevel: 10, storageCondition: StorageCondition.AMBIENT },
    { name: 'Hydrocortisone 1% Cream 30g', genericName: 'Hydrocortisone', dosageForm: 'Cream', strength: '1%', unitOfMeasure: 'tubes', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0023-2020', reorderLevel: 10, storageCondition: StorageCondition.AMBIENT },
    { name: 'Betamethasone 0.1% Cream', genericName: 'Betamethasone', dosageForm: 'Cream', strength: '0.1%', unitOfMeasure: 'tubes', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0024-2021', reorderLevel: 10, storageCondition: StorageCondition.AMBIENT },
    { name: 'Gentamicin Eye Drops 0.3%', genericName: 'Gentamicin', dosageForm: 'Eye Drops', strength: '0.3%', unitOfMeasure: 'bottles', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0025-2021', reorderLevel: 10, storageCondition: StorageCondition.AMBIENT },
    { name: 'Chloramphenicol Eye Drops 0.5%', genericName: 'Chloramphenicol', dosageForm: 'Eye Drops', strength: '0.5%', unitOfMeasure: 'bottles', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0026-2020', reorderLevel: 10, storageCondition: StorageCondition.AMBIENT },
    { name: 'Tetracycline Eye Ointment', genericName: 'Tetracycline', dosageForm: 'Eye Ointment', strength: '1%', unitOfMeasure: 'tubes', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0027-2020', reorderLevel: 10, storageCondition: StorageCondition.AMBIENT },
    { name: 'Salbutamol 100mcg Inhaler', genericName: 'Salbutamol', dosageForm: 'Inhaler', strength: '100mcg', unitOfMeasure: 'inhalers', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0028-2022', reorderLevel: 5, storageCondition: StorageCondition.AMBIENT },
    { name: 'Beclomethasone 100mcg Inhaler', genericName: 'Beclomethasone', dosageForm: 'Inhaler', strength: '100mcg', unitOfMeasure: 'inhalers', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0029-2022', reorderLevel: 5, storageCondition: StorageCondition.AMBIENT },
    { name: 'Prednisolone 5mg Tablets', genericName: 'Prednisolone', dosageForm: 'Tablet', strength: '5mg', unitOfMeasure: 'tablets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0030-2021', reorderLevel: 20, storageCondition: StorageCondition.AMBIENT },
    { name: 'Dexamethasone 4mg/ml Injection', genericName: 'Dexamethasone', dosageForm: 'Injection', strength: '4mg/ml', unitOfMeasure: 'vials', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0031-2022', reorderLevel: 10, storageCondition: StorageCondition.REFRIGERATED },
    { name: 'Diazepam 5mg Tablets', genericName: 'Diazepam', dosageForm: 'Tablet', strength: '5mg', unitOfMeasure: 'tablets', packSize: 30, tmdaRegistrationNumber: 'TZ-TMDA-0032-2020', reorderLevel: 10, storageCondition: StorageCondition.AMBIENT },
    { name: 'Phenobarbitone 30mg Tablets', genericName: 'Phenobarbitone', dosageForm: 'Tablet', strength: '30mg', unitOfMeasure: 'tablets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0033-2020', reorderLevel: 20, storageCondition: StorageCondition.AMBIENT },
    { name: 'Carbamazepine 200mg Tablets', genericName: 'Carbamazepine', dosageForm: 'Tablet', strength: '200mg', unitOfMeasure: 'tablets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0034-2021', reorderLevel: 20, storageCondition: StorageCondition.AMBIENT },
    { name: 'Haloperidol 5mg Tablets', genericName: 'Haloperidol', dosageForm: 'Tablet', strength: '5mg', unitOfMeasure: 'tablets', packSize: 30, tmdaRegistrationNumber: 'TZ-TMDA-0035-2021', reorderLevel: 10, storageCondition: StorageCondition.AMBIENT },
    { name: 'Chlorpromazine 100mg Tablets', genericName: 'Chlorpromazine', dosageForm: 'Tablet', strength: '100mg', unitOfMeasure: 'tablets', packSize: 50, tmdaRegistrationNumber: 'TZ-TMDA-0036-2020', reorderLevel: 10, storageCondition: StorageCondition.AMBIENT },
    { name: 'Enalapril 5mg Tablets', genericName: 'Enalapril', dosageForm: 'Tablet', strength: '5mg', unitOfMeasure: 'tablets', packSize: 28, tmdaRegistrationNumber: 'TZ-TMDA-0037-2021', reorderLevel: 20, storageCondition: StorageCondition.AMBIENT },
    { name: 'Losartan 50mg Tablets', genericName: 'Losartan', dosageForm: 'Tablet', strength: '50mg', unitOfMeasure: 'tablets', packSize: 28, tmdaRegistrationNumber: 'TZ-TMDA-0038-2022', reorderLevel: 20, storageCondition: StorageCondition.AMBIENT },
    { name: 'Furosemide 40mg Tablets', genericName: 'Furosemide', dosageForm: 'Tablet', strength: '40mg', unitOfMeasure: 'tablets', packSize: 28, tmdaRegistrationNumber: 'TZ-TMDA-0039-2021', reorderLevel: 20, storageCondition: StorageCondition.AMBIENT },
    { name: 'Spironolactone 25mg Tablets', genericName: 'Spironolactone', dosageForm: 'Tablet', strength: '25mg', unitOfMeasure: 'tablets', packSize: 30, tmdaRegistrationNumber: 'TZ-TMDA-0040-2021', reorderLevel: 15, storageCondition: StorageCondition.AMBIENT },
    { name: 'Aspirin 75mg Tablets', genericName: 'Aspirin', dosageForm: 'Tablet', strength: '75mg', unitOfMeasure: 'tablets', packSize: 28, tmdaRegistrationNumber: 'TZ-TMDA-0041-2020', reorderLevel: 20, storageCondition: StorageCondition.AMBIENT },
    { name: 'Warfarin 5mg Tablets', genericName: 'Warfarin', dosageForm: 'Tablet', strength: '5mg', unitOfMeasure: 'tablets', packSize: 28, tmdaRegistrationNumber: 'TZ-TMDA-0042-2020', reorderLevel: 10, storageCondition: StorageCondition.AMBIENT },
    { name: 'Insulin Regular 100IU/ml Injection', genericName: 'Insulin Regular', dosageForm: 'Injection', strength: '100IU/ml', unitOfMeasure: 'vials', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0043-2022', reorderLevel: 5, isColdChain: true, storageCondition: StorageCondition.REFRIGERATED },
    { name: 'Insulin NPH 100IU/ml Injection', genericName: 'Insulin NPH', dosageForm: 'Injection', strength: '100IU/ml', unitOfMeasure: 'vials', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0044-2022', reorderLevel: 5, isColdChain: true, storageCondition: StorageCondition.REFRIGERATED },
    { name: 'Hydrochlorothiazide 25mg Tablets', genericName: 'Hydrochlorothiazide', dosageForm: 'Tablet', strength: '25mg', unitOfMeasure: 'tablets', packSize: 28, tmdaRegistrationNumber: 'TZ-TMDA-0045-2020', reorderLevel: 20, storageCondition: StorageCondition.AMBIENT },
    { name: 'Nifedipine 10mg Capsules', genericName: 'Nifedipine', dosageForm: 'Capsule', strength: '10mg', unitOfMeasure: 'capsules', packSize: 30, tmdaRegistrationNumber: 'TZ-TMDA-0046-2021', reorderLevel: 10, storageCondition: StorageCondition.AMBIENT },
    { name: 'Morphine 10mg/ml Injection', genericName: 'Morphine', dosageForm: 'Injection', strength: '10mg/ml', unitOfMeasure: 'ampoules', packSize: 10, tmdaRegistrationNumber: 'TZ-TMDA-0047-2020', reorderLevel: 5, storageCondition: StorageCondition.AMBIENT },
    { name: 'Tramadol 50mg Capsules', genericName: 'Tramadol', dosageForm: 'Capsule', strength: '50mg', unitOfMeasure: 'capsules', packSize: 20, tmdaRegistrationNumber: 'TZ-TMDA-0048-2021', reorderLevel: 10, storageCondition: StorageCondition.AMBIENT },
    { name: 'Multivitamins Tablets', genericName: 'Multivitamins', dosageForm: 'Tablet', strength: 'Standard', unitOfMeasure: 'tablets', packSize: 100, tmdaRegistrationNumber: 'TZ-TMDA-0049-2020', reorderLevel: 30, storageCondition: StorageCondition.AMBIENT },
    { name: 'Albendazole 400mg Tablets', genericName: 'Albendazole', dosageForm: 'Tablet', strength: '400mg', unitOfMeasure: 'tablets', packSize: 1, tmdaRegistrationNumber: 'TZ-TMDA-0050-2021', reorderLevel: 20, storageCondition: StorageCondition.AMBIENT },
  ];

  const products: any[] = [];
  for (const p of productData) {
    const product = await prisma.product.create({
      data: { ...p, pharmacyId: pharmacy.id, isActive: true },
    });
    products.push(product);
  }
  console.log(`✅ ${products.length} products created`);

  // ── Batches (10 for first 10 products) ───────────────────────────────────────
  const today = new Date();
  const days = (n: number) => new Date(today.getTime() + n * 24 * 60 * 60 * 1000);
  const batchData = [
    { idx: 0, batchNumber: 'BATCH-2024-0001', expiryDate: days(20), qty: 150, price: 1200, supplierId: sup1.id },  // <30 days
    { idx: 1, batchNumber: 'BATCH-2024-0002', expiryDate: days(25), qty: 200, price: 800, supplierId: sup1.id },   // <30 days
    { idx: 2, batchNumber: 'BATCH-2024-0003', expiryDate: days(45), qty: 300, price: 500, supplierId: sup2.id },
    { idx: 3, batchNumber: 'BATCH-2024-0004', expiryDate: days(60), qty: 180, price: 1500, supplierId: sup2.id },
    { idx: 4, batchNumber: 'BATCH-2024-0005', expiryDate: days(75), qty: 120, price: 900, supplierId: sup1.id },
    { idx: 5, batchNumber: 'BATCH-2024-0006', expiryDate: days(120), qty: 80, price: 3500, supplierId: sup3.id },
    { idx: 6, batchNumber: 'BATCH-2024-0007', expiryDate: days(180), qty: 60, price: 2200, supplierId: sup1.id },
    { idx: 7, batchNumber: 'BATCH-2024-0008', expiryDate: days(240), qty: 90, price: 1800, supplierId: sup2.id },
    { idx: 8, batchNumber: 'BATCH-2024-0009', expiryDate: days(300), qty: 40, price: 8500, supplierId: sup1.id },
    { idx: 9, batchNumber: 'BATCH-2024-0010', expiryDate: days(365), qty: 30, price: 9000, supplierId: sup3.id },
  ];

  const batches: any[] = [];
  for (const b of batchData) {
    const batch = await prisma.batch.create({
      data: {
        productId: products[b.idx].id,
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        quantityRemaining: b.qty,
        purchasePrice: b.price,
        supplierId: b.supplierId,
        pharmacyId: pharmacy.id,
        receivedAt: new Date(),
      },
    });
    batches.push(batch);
    // Create RECEIVED movement
    await prisma.stockMovement.create({
      data: {
        productId: products[b.idx].id,
        batchId: batch.id,
        type: 'RECEIVED',
        quantity: b.qty,
        previousBalance: 0,
        newBalance: b.qty,
        userId: pic.id,
        pharmacyId: pharmacy.id,
        referenceNumber: b.batchNumber,
      },
    });
  }
  console.log('✅ Batches and stock movements created');

  // ── Compliance Items ──────────────────────────────────────────────────────────
  const complianceItems = [
    { type: ComplianceType.TMDA_PREMISE, name: 'TMDA Premises Licence', issuingBody: 'Tanzania Medicines and Medical Devices Authority', licenceNumber: 'TMDA-PH-AR-2024-001', issueDate: new Date('2024-01-01'), expiryDate: new Date('2026-12-31'), status: ComplianceStatus.GREEN },
    { type: ComplianceType.PC_IN_CHARGE, name: 'Pharmacist In-Charge Certificate', issuingBody: 'Pharmacy Council Tanzania', licenceNumber: 'PC-IC-AR-2024-045', issueDate: new Date('2024-01-01'), expiryDate: new Date('2026-06-30'), status: ComplianceStatus.GREEN },
    { type: ComplianceType.PC_TECHNOLOGIST, name: 'Pharmaceutical Technologist Certificate', issuingBody: 'Pharmacy Council Tanzania', licenceNumber: 'PC-PT-AR-2023-112', issueDate: new Date('2023-08-01'), expiryDate: new Date('2026-08-31'), status: ComplianceStatus.GREEN },
    { type: ComplianceType.DLDM_CERT, name: 'DLDM Drug/Substance Handling Certificate', issuingBody: 'Drug Control and Enforcement Authority', licenceNumber: 'DCEA-DLDM-2024-789', issueDate: new Date('2024-04-20'), expiryDate: days(15), status: ComplianceStatus.AMBER },
    { type: ComplianceType.COLD_CHAIN, name: 'Cold Chain Certification', issuingBody: 'Tanzania Medicines and Medical Devices Authority', licenceNumber: 'TMDA-CC-AR-2024-033', issueDate: new Date('2024-03-01'), expiryDate: new Date('2026-09-30'), status: ComplianceStatus.GREEN },
    { type: ComplianceType.NARCOTICS, name: 'Controlled Drug/Narcotics Licence', issuingBody: 'Drug Control and Enforcement Authority', licenceNumber: 'DCEA-NL-AR-2024-056', issueDate: new Date('2024-04-10'), expiryDate: days(5), status: ComplianceStatus.RED },
    { type: ComplianceType.BUSINESS_LICENCE, name: 'Business Licence (City Council)', issuingBody: 'Arusha City Council', licenceNumber: 'ACC-BL-2025-4321', issueDate: new Date('2025-01-01'), expiryDate: new Date('2026-12-31'), status: ComplianceStatus.GREEN },
    { type: ComplianceType.CUSTOM, name: 'Council Premises Approval', issuingBody: 'Arusha City Council', licenceNumber: 'ACC-PA-2025-1234', issueDate: new Date('2025-03-01'), expiryDate: new Date('2027-03-31'), status: ComplianceStatus.GREEN },
  ];
  for (const item of complianceItems) {
    await prisma.complianceItem.create({ data: { ...item, pharmacyId: pharmacy.id, assignedStaffId: pic.id } });
  }
  console.log('✅ Compliance items created');

  // ── DrugDatabase ──────────────────────────────────────────────────────────────
  const drugDbData = [
    { genericName: 'Warfarin', brandNames: ['Coumadin', 'Marevan'], drugClass: 'Anticoagulant', atcCode: 'B01AA03', isOTC: false },
    { genericName: 'Aspirin', brandNames: ['Disprin', 'Ecotrin'], drugClass: 'NSAID/Antiplatelet', atcCode: 'N02BA01', isOTC: true },
    { genericName: 'Ibuprofen', brandNames: ['Brufen', 'Nurofen'], drugClass: 'NSAID', atcCode: 'M01AE01', isOTC: true },
    { genericName: 'Metformin', brandNames: ['Glucophage'], drugClass: 'Biguanide', atcCode: 'A10BA02', isOTC: false },
    { genericName: 'Ciprofloxacin', brandNames: ['Ciprobay', 'Ciproxin'], drugClass: 'Fluoroquinolone', atcCode: 'J01MA02', isOTC: false },
    { genericName: 'Carbamazepine', brandNames: ['Tegretol'], drugClass: 'Anticonvulsant', atcCode: 'N03AF01', isOTC: false },
    { genericName: 'Fluconazole', brandNames: ['Diflucan'], drugClass: 'Antifungal', atcCode: 'J02AC01', isOTC: false },
    { genericName: 'Haloperidol', brandNames: ['Haldol', 'Serenace'], drugClass: 'Antipsychotic', atcCode: 'N05AD01', isOTC: false },
    { genericName: 'Doxycycline', brandNames: ['Vibramycin', 'Doryx'], drugClass: 'Tetracycline antibiotic', atcCode: 'J01AA02', isOTC: false },
    { genericName: 'Metronidazole', brandNames: ['Flagyl', 'Metrogyl'], drugClass: 'Antiprotozoal/antibiotic', atcCode: 'P01AB01', isOTC: false },
    { genericName: 'Erythromycin', brandNames: ['Erythroped', 'Ilosone'], drugClass: 'Macrolide antibiotic', atcCode: 'J01FA01', isOTC: false },
    { genericName: 'Diazepam', brandNames: ['Valium', 'Ducene'], drugClass: 'Benzodiazepine', atcCode: 'N05BA01', isOTC: false },
    { genericName: 'Chlorpromazine', brandNames: ['Largactil', 'Thorazine'], drugClass: 'Phenothiazine antipsychotic', atcCode: 'N05AA01', isOTC: false },
    { genericName: 'Furosemide', brandNames: ['Lasix', 'Frusid'], drugClass: 'Loop diuretic', atcCode: 'C03CA01', isOTC: false },
    { genericName: 'Spironolactone', brandNames: ['Aldactone'], drugClass: 'Potassium-sparing diuretic', atcCode: 'C03DA01', isOTC: false },
    { genericName: 'Losartan', brandNames: ['Cozaar', 'Hyzaar'], drugClass: 'ARB', atcCode: 'C09CA01', isOTC: false },
    { genericName: 'Prednisolone', brandNames: ['Deltacortril'], drugClass: 'Corticosteroid', atcCode: 'H02AB06', isOTC: false },
    { genericName: 'Paracetamol', brandNames: ['Panadol', 'Calpol'], drugClass: 'Analgesic/Antipyretic', atcCode: 'N02BE01', isOTC: true },
    { genericName: 'Morphine', brandNames: ['MST Continus', 'Sevredol'], drugClass: 'Opioid analgesic', atcCode: 'N02AA01', isOTC: false, isControlled: true },
    { genericName: 'Tramadol', brandNames: ['Ultram', 'Tramal'], drugClass: 'Opioid analgesic', atcCode: 'N02AX02', isOTC: false },
    { genericName: 'Phenobarbitone', brandNames: ['Luminal'], drugClass: 'Barbiturate anticonvulsant', atcCode: 'N03AA02', isOTC: false, isControlled: true },
    { genericName: 'Ferrous Sulfate', brandNames: ['Feosol'], drugClass: 'Iron supplement', atcCode: 'B03AA07', isOTC: true },
    { genericName: 'Insulin Regular', brandNames: ['Actrapid', 'Humulin R'], drugClass: 'Short-acting insulin', atcCode: 'A10AB01', isOTC: false },
    { genericName: 'Dexamethasone', brandNames: ['Decadron'], drugClass: 'Corticosteroid', atcCode: 'H02AB02', isOTC: false },
    { genericName: 'Methotrexate', brandNames: ['Methofar', 'Maxtrex'], drugClass: 'Antimetabolite', atcCode: 'L01BA01', isOTC: false },
  ];

  const drugs: { [key: string]: any } = {};
  for (const d of drugDbData) {
    const drug = await prisma.drugDatabase.create({ data: { ...d, standardDosing: {} } });
    drugs[d.genericName] = drug;
  }
  console.log('✅ Drug database created');

  // ── Drug Interactions ─────────────────────────────────────────────────────────
  const interactions = [
    { a: 'Warfarin', b: 'Aspirin', severity: InteractionSeverity.MAJOR, description: 'Increased bleeding risk', clinicalConsequence: 'Significant increase in anticoagulation effect and bleeding risk', management: 'Avoid combination; if necessary, monitor INR closely' },
    { a: 'Warfarin', b: 'Ibuprofen', severity: InteractionSeverity.MAJOR, description: 'NSAIDs increase anticoagulant effect', clinicalConsequence: 'Increased bleeding, GI ulceration, altered INR', management: 'Avoid NSAIDs in patients on warfarin; use paracetamol for pain' },
    { a: 'Metformin', b: 'Ciprofloxacin', severity: InteractionSeverity.MODERATE, description: 'Fluoroquinolones may affect blood glucose', clinicalConsequence: 'Potential hypoglycaemia or hyperglycaemia', management: 'Monitor blood glucose closely during ciprofloxacin course' },
    { a: 'Carbamazepine', b: 'Doxycycline', severity: InteractionSeverity.MODERATE, description: 'Carbamazepine reduces doxycycline levels', clinicalConsequence: 'Reduced doxycycline effectiveness — treatment failure risk', management: 'Increase doxycycline dose or choose alternative antibiotic' },
    { a: 'Fluconazole', b: 'Carbamazepine', severity: InteractionSeverity.MODERATE, description: 'Fluconazole inhibits CYP3A4, increases carbamazepine levels', clinicalConsequence: 'Carbamazepine toxicity: dizziness, ataxia, diplopia', management: 'Monitor carbamazepine levels; reduce dose if needed' },
    { a: 'Haloperidol', b: 'Diazepam', severity: InteractionSeverity.MODERATE, description: 'Enhanced CNS depression', clinicalConsequence: 'Excessive sedation, respiratory depression risk', management: 'Use lowest effective doses; monitor respiratory function' },
    { a: 'Metronidazole', b: 'Warfarin', severity: InteractionSeverity.MAJOR, description: 'Metronidazole significantly increases warfarin effect', clinicalConsequence: 'Markedly elevated INR, severe bleeding risk', management: 'Reduce warfarin dose by 25-50%, monitor INR daily' },
    { a: 'Erythromycin', b: 'Carbamazepine', severity: InteractionSeverity.MAJOR, description: 'Erythromycin inhibits carbamazepine metabolism — toxic levels', clinicalConsequence: 'Carbamazepine toxicity with potential seizures, cardiac effects', management: 'Contraindicated; choose alternative antibiotic' },
    { a: 'Aspirin', b: 'Ibuprofen', severity: InteractionSeverity.MODERATE, description: 'Ibuprofen blocks aspirin antiplatelet effect', clinicalConsequence: 'Loss of cardioprotective effect of aspirin', management: 'Take aspirin at least 2 hours before ibuprofen' },
    { a: 'Ciprofloxacin', b: 'Ferrous Sulfate', severity: InteractionSeverity.MODERATE, description: 'Iron chelates ciprofloxacin reducing absorption', clinicalConsequence: 'Up to 90% reduction in ciprofloxacin bioavailability', management: 'Separate doses by at least 2 hours; take ciprofloxacin first' },
    { a: 'Dexamethasone', b: 'Insulin Regular', severity: InteractionSeverity.MODERATE, description: 'Corticosteroids antagonise insulin effect', clinicalConsequence: 'Hyperglycaemia, loss of diabetic control', management: 'Monitor blood glucose; increase insulin dose as needed' },
    { a: 'Haloperidol', b: 'Chlorpromazine', severity: InteractionSeverity.MODERATE, description: 'Additive QT prolongation risk', clinicalConsequence: 'Increased risk of Torsades de Pointes, ventricular arrhythmias', management: 'Avoid combination; if necessary, obtain baseline ECG' },
    { a: 'Furosemide', b: 'Spironolactone', severity: InteractionSeverity.MINOR, description: 'Monitor for electrolyte imbalance', clinicalConsequence: 'Risk of hypokalaemia or hyperkalaemia depending on individual factors', management: 'Monitor electrolytes regularly; adjust doses accordingly' },
    { a: 'Losartan', b: 'Spironolactone', severity: InteractionSeverity.MODERATE, description: 'Hyperkalaemia risk', clinicalConsequence: 'Dangerous hyperkalaemia especially in renal impairment', management: 'Monitor serum potassium; avoid in severe renal impairment' },
    { a: 'Prednisolone', b: 'Aspirin', severity: InteractionSeverity.MODERATE, description: 'Increased GI bleeding risk', clinicalConsequence: 'Higher incidence of peptic ulcer and GI bleeding', management: 'Use PPI prophylaxis; consider alternative analgesic' },
    { a: 'Carbamazepine', b: 'Paracetamol', severity: InteractionSeverity.MODERATE, description: 'Carbamazepine increases paracetamol hepatotoxicity risk', clinicalConsequence: 'Formation of hepatotoxic metabolites at normal doses', management: 'Keep paracetamol to minimum effective dose; avoid prolonged use' },
    { a: 'Morphine', b: 'Diazepam', severity: InteractionSeverity.CONTRAINDICATED, description: 'Respiratory depression risk — do not combine without monitoring', clinicalConsequence: 'Life-threatening respiratory depression and death', management: 'If combination unavoidable, use lowest doses with resuscitation equipment available' },
    { a: 'Tramadol', b: 'Carbamazepine', severity: InteractionSeverity.MAJOR, description: 'Seizure risk — carbamazepine reduces tramadol efficacy', clinicalConsequence: 'Increased seizure risk; reduced analgesic effect of tramadol', management: 'Avoid combination; choose alternative analgesic' },
    { a: 'Phenobarbitone', b: 'Doxycycline', severity: InteractionSeverity.MODERATE, description: 'Phenobarbitone reduces doxycycline effectiveness', clinicalConsequence: 'Subtherapeutic doxycycline levels — treatment failure', management: 'Consider alternative antibiotic or double the doxycycline dose' },
    { a: 'Amlodipine', b: 'Ciprofloxacin', severity: InteractionSeverity.MINOR, description: 'Mild CYP3A4 interaction', clinicalConsequence: 'Slightly increased amlodipine levels; minimal clinical significance', management: 'Monitor blood pressure; no dose adjustment usually needed' },
  ];
  for (const i of interactions) {
    if (drugs[i.a] && drugs[i.b]) {
      await prisma.drugInteraction.create({
        data: { drugAId: drugs[i.a].id, drugBId: drugs[i.b].id, severity: i.severity, description: i.description, clinicalConsequence: i.clinicalConsequence, management: i.management },
      });
    }
  }
  console.log('✅ Drug interactions created');

  // ── Drug Contraindications ────────────────────────────────────────────────────
  if (drugs['Ibuprofen']) {
    await prisma.drugContraindication.create({ data: { drugId: drugs['Ibuprofen'].id, condition: 'Renal impairment, late pregnancy, peptic ulcer', pregnancyCategory: PregnancyCategory.C, breastfeedingSafe: false, renalFlag: true, hepaticFlag: false, elderlyFlag: true } });
  }
  if (drugs['Doxycycline']) {
    await prisma.drugContraindication.create({ data: { drugId: drugs['Doxycycline'].id, condition: 'Pregnancy (bone/teeth development), breastfeeding, children <8 years', pregnancyCategory: PregnancyCategory.D, breastfeedingSafe: false } });
  }
  if (drugs['Methotrexate']) {
    await prisma.drugContraindication.create({ data: { drugId: drugs['Methotrexate'].id, condition: 'Pregnancy — teratogenic. Severe renal/hepatic impairment', pregnancyCategory: PregnancyCategory.X, breastfeedingSafe: false, renalFlag: true, hepaticFlag: true } });
  }
  console.log('✅ Drug contraindications created');

  // ── Patients ─────────────────────────────────────────────────────────────────
  const p1 = await prisma.patient.create({ data: { pharmacyId: pharmacy.id, chronicConditions: ['Hypertension', 'Diabetes Type 2'], allergyFlags: { penicillin: true }, activeMedications: ['Metformin 500mg', 'Atenolol 50mg'], optInStatus: true, optInTimestamp: new Date(), optInMethod: 'VERBAL' } });
  const p2 = await prisma.patient.create({ data: { pharmacyId: pharmacy.id, chronicConditions: ['Malaria'], allergyFlags: {}, activeMedications: [], optInStatus: true, optInTimestamp: new Date(), optInMethod: 'DIGITAL' } });
  const p3 = await prisma.patient.create({ data: { pharmacyId: pharmacy.id, chronicConditions: ['Epilepsy'], allergyFlags: { sulfonamides: true }, activeMedications: ['Carbamazepine 200mg'], optInStatus: true, optInTimestamp: new Date(), optInMethod: 'VERBAL' } });
  console.log('✅ Patients created');

  // ── Dispensing Events ─────────────────────────────────────────────────────────
  if (drugs['Metformin']) {
    await prisma.dispensingEvent.create({ data: { patientId: p1.id, drugId: drugs['Metformin'].id, batchId: batches[8].id, quantity: 60, dose: '500mg twice daily', icdCode: 'E11.9', counsellingNotes: 'Take with food. Monitor blood glucose.', dispensedByUserId: dispenser1.id, pharmacyId: pharmacy.id, dispensedAt: new Date(Date.now() - 25 * 86400000) } });
  }
  if (drugs['Atenolol']) {
    await prisma.dispensingEvent.create({ data: { patientId: p1.id, drugId: drugs['Atenolol'].id, quantity: 28, dose: '50mg once daily', icdCode: 'I10', counsellingNotes: 'Take in the morning. Do not stop suddenly.', dispensedByUserId: dispenser1.id, pharmacyId: pharmacy.id, dispensedAt: new Date(Date.now() - 20 * 86400000) } });
  }
  if (drugs['Aspirin']) {
    await prisma.dispensingEvent.create({ data: { patientId: p1.id, drugId: drugs['Aspirin'].id, quantity: 28, dose: '75mg once daily', icdCode: 'I10', counsellingNotes: 'Take after food.', dispensedByUserId: dispenser2.id, pharmacyId: pharmacy.id, dispensedAt: new Date(Date.now() - 15 * 86400000) } });
  }
  const alevent = await prisma.dispensingEvent.create({ data: { patientId: p2.id, drugId: drugs['Artemether+Lumefantrine'] ? Object.values(drugs)[5].id : drugs['Metronidazole'].id, quantity: 24, dose: 'AL regimen as directed', icdCode: 'B54', counsellingNotes: 'Complete full course.', dispensedByUserId: dispenser1.id, pharmacyId: pharmacy.id, dispensedAt: new Date(Date.now() - 5 * 86400000) } });
  if (drugs['Carbamazepine']) {
    await prisma.dispensingEvent.create({ data: { patientId: p3.id, drugId: drugs['Carbamazepine'].id, quantity: 100, dose: '200mg twice daily', icdCode: 'G40.9', counsellingNotes: 'Avoid alcohol. Regular blood levels needed.', dispensedByUserId: dispenser2.id, pharmacyId: pharmacy.id, dispensedAt: new Date(Date.now() - 30 * 86400000) } });
  }
  console.log('✅ Dispensing events created');

  // ── Knowledge Articles ────────────────────────────────────────────────────────
  const makeBody = (paragraphs: string[]) => ({
    type: 'doc',
    content: paragraphs.map(text => ({
      type: 'paragraph',
      content: [{ type: 'text', text }],
    })),
  });

  await prisma.article.create({ data: { title: 'Tanzania UHI Mandate 2026: What Every Pharmacy Must Know', slug: 'tanzania-uhi-mandate-2026', body: makeBody(['Tanzania\'s Universal Health Insurance (UHI) mandate takes effect on January 26, 2026, requiring all pharmacies and ADDOs to integrate with NHIF and the new national health information systems.', 'Pharmacies must ensure their premises are registered with TMDA, their staff credentials are current, and their systems can process NHIF Breeze API claims in real time. Non-compliance may result in licence suspension.', 'PharmaConnect\'s Compliance Tracker module automatically monitors your readiness with a live health score and sends alerts 90 days before any critical deadline, giving you time to act.', 'Key action items: update your TMDA premise licence, ensure your Pharmacist In-Charge is registered on the PC portal, and configure your NHIF credentials in PharmaConnect Settings.', 'The UHI mandate represents Tanzania\'s largest expansion of pharmaceutical access. Pharmacies that comply early will gain a competitive advantage as more patients access subsidised medicines.']) , category: 'REGULATORY_UPDATES', tags: ['UHI', 'NHIF', 'TMDA', 'Compliance', 'Regulation'], status: ArticleStatus.PUBLISHED, publishedAt: new Date('2026-01-15'), authorId: pic.id, readingTimeMinutes: 8 } });
  await prisma.article.create({ data: { title: 'FEFO Stock Rotation: Preventing Losses and Patient Harm', slug: 'fefo-stock-rotation', body: makeBody(['First-Expiry-First-Out (FEFO) is the gold standard for pharmaceutical stock management. Unlike retail FIFO, medicines must be dispensed in order of expiry date to prevent administering expired or near-expiry products.', 'Studies show that Tanzanian community pharmacies lose between 5-12% of their stock value annually to expired medicines that were not dispensed in correct rotation order.', 'PharmaConnect enforces FEFO automatically at the point of dispensing. The system selects the batch with the earliest expiry date when a medicine is dispensed, with no manual checking required.', 'The Expiry Dashboard gives you a 30/60/90-day view of upcoming expirations. For near-expiry stock, consider patient counselling to ensure medicines are used within their valid period.', 'Regular physical stock counts at least quarterly, combined with PharmaConnect\'s automated alerts, create a robust system for minimising losses and protecting patients.']) , category: 'PHARMACY_PRACTICE', tags: ['Inventory', 'FEFO', 'Stock Management', 'Patient Safety'], status: ArticleStatus.PUBLISHED, publishedAt: new Date('2026-02-01'), authorId: pic.id, readingTimeMinutes: 5 } });
  await prisma.article.create({ data: { title: 'Managing Diabetes in the Community Pharmacy Setting', slug: 'diabetes-community-pharmacy', body: makeBody(['Community pharmacists are on the frontline of diabetes management in Tanzania, where an estimated 1.3 million adults live with the condition, many undiagnosed.', 'The pharmacist\'s role includes medication counselling for oral antidiabetics and insulins, monitoring for drug interactions (especially with fluoroquinolones and corticosteroids), and referring patients showing signs of poor glycaemic control.', 'Cold chain maintenance is critical for insulin storage. Insulin Regular and NPH must be stored at 2-8°C in the refrigerator and never frozen. In-use vials can be kept at room temperature for up to 28 days.', 'PharmaConnect\'s patient safety module flags interactions such as Ciprofloxacin + Metformin and Dexamethasone + Insulin automatically, reducing the risk of adverse outcomes in diabetic patients.']) , category: 'MEDICINE_SAFETY', tags: ['Diabetes', 'Insulin', 'Drug Interactions', 'Patient Safety'], status: ArticleStatus.DRAFT, authorId: pic.id, readingTimeMinutes: 12 } });
  await prisma.article.create({ data: { title: 'PharmaConnect Platform Guide: Getting Started in 10 Minutes', slug: 'pharmaconnect-getting-started', body: makeBody(['Welcome to PharmaConnect — Tanzania\'s pharmacy operating system built for the UHI era. This guide walks you through setting up your pharmacy and dispensing your first medicine in under 10 minutes.', 'Step 1: Complete your pharmacy profile in Settings > Pharmacy. Add your TMDA licence number, pharmacy type, and subscription tier. This information is used for NHIF claims submission.', 'Step 2: Import your product catalogue using the CSV template in Inventory > Products > Import. The template includes columns for all required fields including TMDA registration numbers.', 'Step 3: Receive your first stock batch using the Receive Stock screen. Scan the product barcode or search by name, enter the batch number, expiry date, and quantity received.']) , category: 'BUSINESS_TIPS', tags: ['Getting Started', 'Tutorial', 'PharmaConnect'], status: ArticleStatus.PUBLISHED, publishedAt: new Date('2026-01-10'), isSponsored: true, sponsorName: 'PharmaConnect Ltd', authorId: pic.id, readingTimeMinutes: 3 } });
  await prisma.article.create({ data: { title: 'Antimicrobial Stewardship: Reducing Resistance in Tanzania', slug: 'antimicrobial-stewardship-tanzania', body: makeBody(['Antimicrobial resistance (AMR) is a growing threat in Tanzania, with studies showing inappropriate antibiotic prescribing in up to 60% of pharmacy dispensing events for common infections.', 'As pharmacists, we are gatekeepers of antibiotic access. The WHO\'s 5-year AMR action plan for Tanzania identifies community pharmacies as key intervention points for stewardship programmes.', 'Practical stewardship actions: verify prescription authenticity before dispensing controlled antibiotics, counsel patients on completing their full course, and report unusual resistance patterns to TMDA.', 'PharmaConnect\'s drug interaction checker includes antibiotic-specific alerts, particularly for fluoroquinolones (ciprofloxacin-iron interaction, ciprofloxacin-metformin glucose effects) that are commonly missed.', 'The Pharmacy Council CPD programme includes antimicrobial stewardship as a required competency area. Logging relevant reading and training activities in your CPD tracker helps maintain your professional development record.']) , category: 'MEDICINE_SAFETY', tags: ['AMR', 'Antibiotics', 'Stewardship', 'Public Health'], status: ArticleStatus.PUBLISHED, publishedAt: new Date('2026-03-01'), authorId: pic.id, readingTimeMinutes: 7 } });
  console.log('✅ Knowledge articles created');

  // ── ICD-10 Codes ──────────────────────────────────────────────────────────────
  const icd10Data = [
    ['J06.9','Acute upper respiratory infection, unspecified','Respiratory'],['A09','Diarrhoea and gastroenteritis of infectious origin','Infectious'],['B54','Malaria, unspecified','Parasitic'],['J18.9','Pneumonia, unspecified organism','Respiratory'],['A01.0','Typhoid fever','Infectious'],['K29.7','Gastritis, unspecified','Digestive'],['R51','Headache','Symptoms'],['J00','Acute nasopharyngitis [common cold]','Respiratory'],['R50.9','Fever, unspecified','Symptoms'],['E11.9','Type 2 diabetes mellitus without complications','Endocrine'],['I10','Essential (primary) hypertension','Cardiovascular'],['J45.9','Asthma, unspecified','Respiratory'],['G40.9','Epilepsy, unspecified','Neurological'],['K21.0','GORD with oesophagitis','Digestive'],['A06.0','Acute amoebic dysentery','Infectious'],['B20','Human immunodeficiency virus [HIV] disease','Infectious'],['A15.0','Tuberculosis of lung','Respiratory'],['N39.0','Urinary tract infection, site not specified','Genitourinary'],['K92.1','Melaena','Digestive'],['R05','Cough','Symptoms'],['R11','Nausea and vomiting','Symptoms'],['J20.9','Acute bronchitis, unspecified','Respiratory'],['L30.9','Dermatitis, unspecified','Skin'],['H10.9','Conjunctivitis, unspecified','Eye'],['H66.9','Otitis media, unspecified','Ear'],['J03.9','Acute tonsillitis, unspecified','Respiratory'],['R10.4','Other and unspecified abdominal pain','Symptoms'],['I25.9','Chronic ischaemic heart disease, unspecified','Cardiovascular'],['I50.9','Heart failure, unspecified','Cardiovascular'],['M54.5','Low back pain','Musculoskeletal'],['B37.9','Candidiasis, unspecified','Infectious'],['N39.9','Urinary tract disorder, unspecified','Genitourinary'],['N76.0','Acute vaginitis','Genitourinary'],['O80','Single spontaneous delivery','Obstetric'],['Z34.9','Supervision of normal pregnancy, unspecified','Obstetric'],['J32.9','Chronic sinusitis, unspecified','Respiratory'],['G43.9','Migraine, unspecified','Neurological'],['F32.9','Major depressive disorder, unspecified','Mental'],['F41.9','Anxiety disorder, unspecified','Mental'],['E46','Unspecified protein-energy malnutrition','Nutritional'],['D50.9','Iron deficiency anaemia, unspecified','Blood'],['E55.9','Vitamin D deficiency, unspecified','Nutritional'],['K26.9','Duodenal ulcer, unspecified','Digestive'],['K25.9','Gastric ulcer, unspecified as acute or chronic','Digestive'],['K59.0','Constipation','Digestive'],['K58.9','Irritable bowel syndrome without diarrhoea','Digestive'],['N18.9','Chronic kidney disease, unspecified','Genitourinary'],['J44.9','Chronic obstructive pulmonary disease, unspecified','Respiratory'],['I20.9','Angina pectoris, unspecified','Cardiovascular'],['I48.9','Atrial fibrillation and flutter, unspecified','Cardiovascular'],['L03.9','Cellulitis, unspecified','Skin'],['L70.0','Acne vulgaris','Skin'],['L23.9','Allergic contact dermatitis, unspecified','Skin'],['B35.9','Dermatophytosis, unspecified','Skin'],['H26.9','Cataract, unspecified','Eye'],['G62.9','Polyneuropathy, unspecified','Neurological'],['G47.0','Insomnia','Neurological'],['R03.0','Elevated blood-pressure reading, without diagnosis of hypertension','Cardiovascular'],['R63.4','Abnormal weight loss','Symptoms'],['R73.0','Abnormal glucose','Endocrine'],['Z79.4','Long-term (current) use of insulin','Status'],['Z79.1','Long-term (current) use of anticoagulants','Status'],['B02.9','Zoster without complications','Infectious'],['B05.9','Measles without complication','Infectious'],['A87.9','Viral meningitis, unspecified','Neurological'],['G00.9','Bacterial meningitis, unspecified','Neurological'],['A41.9','Sepsis, unspecified organism','Infectious'],['E10.9','Type 1 diabetes mellitus without complications','Endocrine'],['I11.9','Hypertensive heart disease without heart failure','Cardiovascular'],['K70.9','Alcoholic liver disease, unspecified','Digestive'],['B18.1','Chronic viral hepatitis B without delta-agent','Infectious'],['B18.2','Chronic viral hepatitis C','Infectious'],['N40','Benign prostatic hyperplasia','Genitourinary'],['N93.9','Abnormal uterine bleeding, unspecified','Genitourinary'],['O14.9','Pre-eclampsia, unspecified','Obstetric'],['J96.9','Respiratory failure, unspecified','Respiratory'],['T36.9','Poisoning by systemic antibiotics, unspecified','Injury'],['Z23','Encounter for immunization','Preventive'],['Z00.0','Encounter for general examination without complaint','Preventive'],['P07.1','Low birth weight, unspecified','Perinatal'],['C34.9','Malignant neoplasm of bronchus and lung, unspecified','Neoplasm'],['N17.9','Acute kidney failure, unspecified','Genitourinary'],['R57.9','Shock, unspecified','Symptoms'],['I63.9','Cerebral infarction, unspecified','Cardiovascular'],['I73.9','Peripheral vascular disease, unspecified','Cardiovascular'],['E14.9','Unspecified diabetes mellitus without complications','Endocrine'],['M79.3','Panniculitis, unspecified','Musculoskeletal'],['T65.9','Toxic effects of other and unspecified substances','Injury'],['B08.3','Erythema infectiosum [fifth disease]','Infectious'],['K57.3','Diverticulosis of large intestine without perforation','Digestive'],['I84.9','Haemorrhoids, unspecified','Digestive'],['H52.1','Myopia','Eye'],['H52.0','Hypermetropia','Eye'],['B06.9','Rubella without complication','Infectious'],['I64','Stroke, not specified as haemorrhage or infarction','Cardiovascular'],['A74.9','Chlamydial infection, unspecified','Infectious'],['O14.9-pre','Pre-eclampsia, unspecified trimester','Obstetric'],
  ];
  for (const [code, description, category] of icd10Data) {
    try {
      await prisma.iCD10Code.create({ data: { code, description, category } });
    } catch { /* skip duplicates */ }
  }
  console.log('✅ ICD-10 codes created');

  // ── CPD Requirement ───────────────────────────────────────────────────────────
  await prisma.cpdRequirement.upsert({ where: { renewalYear: 2026 }, update: {}, create: { renewalYear: 2026, requiredPoints: 20, country: 'TZ' } });

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📧 Login credentials (password: Demo123!):');
  console.log('   Super Admin:      founder@pharmaconnect.tz');
  console.log('   Pharmacy Admin:   admin@pharmaconnect.tz');
  console.log('   Staff:            staff@pharmaconnect.tz');
  console.log('   Owner:            owner@amani.co.tz');
  console.log('   Dispenser 2:      dispenser2@amani.co.tz');
  console.log('   Data Entry Clerk: clerk@amani.co.tz');
  console.log('   Wholesale Seller: seller@amani.co.tz');
}

main()
  .catch(e => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
