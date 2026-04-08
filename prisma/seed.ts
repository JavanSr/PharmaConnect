import {
  ArticleCategory,
  ComplianceStatus,
  MovementType,
  PrismaClient,
  UserRole,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, addMonths, subDays } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  await prisma.notification.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.complianceItem.deleteMany();
  await prisma.knowledgeArticle.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.pharmacy.deleteMany();

  const pharmacyNames = [
    ["Meru Care Pharmacy", "Arusha City"],
    ["Njiro Community Pharmacy", "Arusha City"],
    ["Clocktower Pharmacy", "Arusha City"],
    ["Sakina Health Pharmacy", "Arusha City"],
    ["Usa River Pharmacy", "Meru"],
    ["Moshono Pharmacy", "Arusha City"],
    ["Kaloleni Care Pharmacy", "Arusha City"],
    ["Levolosi Pharmacy", "Arusha City"],
    ["Kijenge Pharmacy", "Arusha City"],
    ["Olasiti Pharmacy", "Arusha City"],
  ];

  const pharmacies = await Promise.all(
    pharmacyNames.map(([name, district], index) =>
      prisma.pharmacy.create({
        data: {
          name,
          region: "Arusha",
          district,
          address: `Plot ${index + 11}, ${district}, Arusha, Tanzania`,
          phone: `+255 7${80 + index} 000 ${100 + index}`,
          email: `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@pilot.pharmaconnect.tz`,
        },
      }),
    ),
  );

  const primaryPharmacy = pharmacies[0];
  const sharedPassword = await bcrypt.hash("Demo123!", 10);

  const [superAdmin, pharmacyAdmin, staff] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Amina Nnko",
        email: "founder@pharmaconnect.tz",
        passwordHash: sharedPassword,
        role: UserRole.SUPER_ADMIN,
        pharmacyId: primaryPharmacy.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Neema Mushi",
        email: "admin@pharmaconnect.tz",
        passwordHash: sharedPassword,
        role: UserRole.PHARMACY_ADMIN,
        pharmacyId: primaryPharmacy.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Paulo Ole",
        email: "staff@pharmaconnect.tz",
        passwordHash: sharedPassword,
        role: UserRole.STAFF,
        pharmacyId: primaryPharmacy.id,
      },
    }),
  ]);

  const products = await Promise.all([
    prisma.product.create({
      data: {
        pharmacyId: primaryPharmacy.id,
        productName: "Amoxicillin 500mg Capsules",
        genericName: "Amoxicillin",
        brandName: "Moxilin",
        category: "Antibiotics",
        supplier: "Tanzania MedSupply Ltd",
        batchNumber: "AMX-ARU-2401",
        quantity: 84,
        costPrice: 6500,
        sellingPrice: 9000,
        expiryDate: addMonths(new Date(), 7),
        reorderLevel: 40,
      },
    }),
    prisma.product.create({
      data: {
        pharmacyId: primaryPharmacy.id,
        productName: "Paracetamol 500mg Tablets",
        genericName: "Paracetamol",
        brandName: "Panadol",
        category: "Analgesics",
        supplier: "AfriHealth Distribution",
        batchNumber: "PCM-ARU-1972",
        quantity: 28,
        costPrice: 4000,
        sellingPrice: 6500,
        expiryDate: addDays(new Date(), 41),
        reorderLevel: 35,
      },
    }),
    prisma.product.create({
      data: {
        pharmacyId: primaryPharmacy.id,
        productName: "Metformin 500mg Tablets",
        genericName: "Metformin",
        brandName: "GlucoCare",
        category: "Diabetes Care",
        supplier: "Prime Pharma East Africa",
        batchNumber: "MET-ARU-8821",
        quantity: 0,
        costPrice: 9800,
        sellingPrice: 12500,
        expiryDate: addMonths(new Date(), 10),
        reorderLevel: 20,
      },
    }),
    prisma.product.create({
      data: {
        pharmacyId: primaryPharmacy.id,
        productName: "ORS Sachets",
        genericName: "Oral Rehydration Salts",
        brandName: "Rehydra",
        category: "Paediatrics",
        supplier: "Med Access Tanzania",
        batchNumber: "ORS-ARU-5001",
        quantity: 63,
        costPrice: 2500,
        sellingPrice: 4500,
        expiryDate: addDays(new Date(), 18),
        reorderLevel: 25,
      },
    }),
    prisma.product.create({
      data: {
        pharmacyId: primaryPharmacy.id,
        productName: "Cetirizine 10mg Tablets",
        genericName: "Cetirizine",
        brandName: "Zynol",
        category: "Allergy Relief",
        supplier: "Northern Pharma Depot",
        batchNumber: "CTZ-ARU-1172",
        quantity: 52,
        costPrice: 5200,
        sellingPrice: 7600,
        expiryDate: addMonths(new Date(), 5),
        reorderLevel: 18,
      },
    }),
    prisma.product.create({
      data: {
        pharmacyId: primaryPharmacy.id,
        productName: "Salbutamol Inhaler",
        genericName: "Salbutamol",
        brandName: "Ventolin",
        category: "Respiratory",
        supplier: "Prime Pharma East Africa",
        batchNumber: "SAL-ARU-2210",
        quantity: 12,
        costPrice: 16500,
        sellingPrice: 22000,
        expiryDate: addDays(new Date(), 72),
        reorderLevel: 10,
      },
    }),
  ]);

  await prisma.stockMovement.createMany({
    data: [
      {
        productId: products[0].id,
        pharmacyId: primaryPharmacy.id,
        movementType: MovementType.INITIAL,
        quantity: 100,
        note: "Opening stock for pilot onboarding",
        createdById: pharmacyAdmin.id,
      },
      {
        productId: products[0].id,
        pharmacyId: primaryPharmacy.id,
        movementType: MovementType.OUT,
        quantity: 16,
        note: "Dispensed during week one",
        createdById: staff.id,
      },
      {
        productId: products[1].id,
        pharmacyId: primaryPharmacy.id,
        movementType: MovementType.OUT,
        quantity: 7,
        note: "Fever season demand spike",
        createdById: staff.id,
      },
      {
        productId: products[2].id,
        pharmacyId: primaryPharmacy.id,
        movementType: MovementType.OUT,
        quantity: 6,
        note: "Awaiting supplier replenishment",
        createdById: staff.id,
      },
      {
        productId: products[3].id,
        pharmacyId: primaryPharmacy.id,
        movementType: MovementType.IN,
        quantity: 15,
        note: "Emergency restock",
        createdById: pharmacyAdmin.id,
      },
    ],
  });

  await prisma.knowledgeArticle.createMany({
    data: [
      {
        title: "Tanzania Pharmacy Council renewal checklist for pilot pharmacies",
        category: ArticleCategory.REGULATORY_UPDATES,
        summary:
          "A concise renewal prep list covering licenses, staffing, and documentation before inspection season.",
        content:
          "Review your pharmacy license dates, pharmacist registration certificates, premises records, and controlled drug logs at least 30 days before renewal. Store key files in a single compliance folder and assign a responsible team member for weekly follow-up.",
        featured: true,
        published: true,
        createdById: superAdmin.id,
      },
      {
        title: "Reducing expiry losses with weekly shelf-to-system checks",
        category: ArticleCategory.BUSINESS_TIPS,
        summary:
          "A practical weekly routine for comparing shelf stock, near-expiry items, and reorder plans.",
        content:
          "Set one fixed review day each week. Sort products by expiry window, move near-expiry packs to eye-level shelves, and create supplier return or promotion plans early enough to protect margins.",
        featured: false,
        published: true,
        createdById: pharmacyAdmin.id,
      },
      {
        title: "Patient counseling essentials for antibiotics and adherence",
        category: ArticleCategory.PHARMACY_PRACTICE,
        summary: "Key patient-facing advice points to improve adherence and reduce misuse.",
        content:
          "Confirm dose, duration, food instructions, and what to do when a dose is missed. Ask the patient to repeat the instructions back to ensure understanding before dispensing.",
        featured: false,
        published: true,
        createdById: pharmacyAdmin.id,
      },
      {
        title: "Medicine safety briefing: managing look-alike and sound-alike products",
        category: ArticleCategory.MEDICINE_SAFETY,
        summary: "Simple shelf and labeling practices that reduce dispensing errors in busy pharmacies.",
        content:
          "Separate high-risk look-alike items, use tall-man lettering where helpful, and require a second check for concentrated, pediatric, or similarly named products.",
        featured: false,
        published: false,
        createdById: superAdmin.id,
      },
    ],
  });

  await prisma.complianceItem.createMany({
    data: [
      {
        pharmacyId: primaryPharmacy.id,
        title: "Pharmacy premises permit renewal",
        category: "Premises permit",
        authority: "TMDA",
        deadlineDate: addDays(new Date(), 14),
        reminderDate: addDays(new Date(), 7),
        status: ComplianceStatus.PENDING,
        notes: "Confirm fire safety certificate is attached before submission.",
        createdById: pharmacyAdmin.id,
      },
      {
        pharmacyId: primaryPharmacy.id,
        title: "Pharmacist annual registration update",
        category: "Pharmacist registration",
        authority: "Pharmacy Council of Tanzania",
        deadlineDate: addDays(new Date(), 28),
        reminderDate: addDays(new Date(), 21),
        status: ComplianceStatus.PENDING,
        notes: "Upload CPD evidence and payment receipt.",
        createdById: superAdmin.id,
      },
      {
        pharmacyId: primaryPharmacy.id,
        title: "Controlled drug register audit pack",
        category: "Controlled drug documentation",
        authority: "Drugs Control and Enforcement Authority",
        deadlineDate: subDays(new Date(), 3),
        reminderDate: subDays(new Date(), 10),
        status: ComplianceStatus.PENDING,
        notes: "Reconcile the morphine balance before inspection review.",
        createdById: pharmacyAdmin.id,
      },
      {
        pharmacyId: primaryPharmacy.id,
        title: "Quarterly inspection readiness review",
        category: "Inspection readiness",
        authority: "Regional Health Office",
        deadlineDate: addDays(new Date(), 45),
        reminderDate: addDays(new Date(), 30),
        status: ComplianceStatus.PENDING,
        notes: "Check cold-chain records and SOP display boards.",
        createdById: pharmacyAdmin.id,
      },
      {
        pharmacyId: primaryPharmacy.id,
        title: "Current business license filing",
        category: "Pharmacy license",
        authority: "Arusha City Council",
        deadlineDate: subDays(new Date(), 16),
        reminderDate: subDays(new Date(), 24),
        status: ComplianceStatus.COMPLETED,
        notes: "Completed and filed with municipal records.",
        createdById: superAdmin.id,
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: pharmacyAdmin.id,
        type: "inventory",
        title: "Low stock on Paracetamol",
        message:
          "Stock has reached the reorder threshold. Consider replenishment this week.",
      },
      {
        userId: pharmacyAdmin.id,
        type: "compliance",
        title: "Permit renewal due in 14 days",
        message:
          "Premises permit renewal is approaching. Required documents should be reviewed now.",
      },
    ],
  });

  console.log("Seeded PharmaConnect demo data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
