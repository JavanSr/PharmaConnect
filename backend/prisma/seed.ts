import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding PharmaConnect database...');

  // Super admin (no pharmacy)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'founder@pharmaconnect.tz' },
    update: {},
    create: {
      email: 'founder@pharmaconnect.tz',
      password: await bcrypt.hash('Demo123!', 12),
      firstName: 'Javan',
      lastName: 'Elihaki',
      role: 'SUPER_ADMIN',
    },
  });
  console.log('Created super admin:', superAdmin.email);

  // Demo pharmacy
  const pharmacy = await prisma.pharmacy.upsert({
    where: { licenceNumber: 'PH-AR-2024-001' },
    update: {},
    create: {
      name: 'Amani Pharmacy',
      licenceNumber: 'PH-AR-2024-001',
      address: 'Sokoine Road, Arusha Central',
      region: 'Arusha',
      pharmacyType: 'RETAIL',
    },
  });
  console.log('Created demo pharmacy:', pharmacy.name);

  // Demo users for the pharmacy
  const demoUsers = [
    { email: 'admin@pharmaconnect.tz',  firstName: 'Admin',   lastName: 'Demo',    role: 'PHARMACIST_IN_CHARGE' as const },
    { email: 'owner@amani.co.tz',       firstName: 'Mohamed', lastName: 'Rashid',  role: 'OWNER'                as const },
    { email: 'staff@pharmaconnect.tz',  firstName: 'Staff',   lastName: 'Demo',    role: 'DISPENSER'            as const },
    { email: 'dispenser2@amani.co.tz',  firstName: 'Amina',   lastName: 'Hassan',  role: 'DISPENSER'            as const },
    { email: 'clerk@amani.co.tz',       firstName: 'Clerk',   lastName: 'Demo',    role: 'DATA_ENTRY_CLERK'     as const },
    { email: 'seller@amani.co.tz',      firstName: 'Seller',  lastName: 'Demo',    role: 'WHOLESALE_SELLER'     as const },
  ];

  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        password: await bcrypt.hash('Demo123!', 12),
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        pharmacyId: pharmacy.id,
      },
    });
    console.log('Created user:', u.email);
  }

  // Sample compliance items
  const complianceItems = [
    { title: 'TMDA Retail Pharmacy Licence', category: 'LICENCE' as const, dueDate: new Date('2025-12-31') },
    { title: 'Pharmacist-in-Charge Certificate', category: 'STAFF_CREDENTIAL' as const, dueDate: new Date('2026-06-30') },
    { title: 'Fire Extinguisher Inspection', category: 'SAFETY' as const, dueDate: new Date('2025-09-30') },
    { title: 'Business Licence (BRELA)', category: 'LICENCE' as const, dueDate: new Date('2025-12-31') },
    { title: 'Narcotics Register', category: 'RECORD_KEEPING' as const },
  ];

  for (const item of complianceItems) {
    await prisma.complianceItem.create({
      data: { ...item, pharmacyId: pharmacy.id },
    }).catch(() => {}); // ignore duplicate errors on re-seed
  }
  console.log('Created compliance items');

  // Sample knowledge articles
  const articles = [
    {
      slug: 'fefo-dispensing-guide',
      title: 'FEFO Dispensing: First Expired, First Out',
      summary: 'Why FEFO matters for patient safety and how to implement it correctly in your pharmacy.',
      category: 'CLINICAL' as const,
      tags: ['dispensing', 'fefo', 'patient-safety'],
      readingTimeMinutes: 4,
      isPublished: true,
      publishedAt: new Date('2026-01-15'),
      body: {
        content: [
          { type: 'paragraph', content: [{ text: 'FEFO (First Expired, First Out) is a critical dispensing principle that ensures patients receive medicines with the longest remaining shelf life. This reduces waste and prevents harm from expired medications.' }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ text: 'Why FEFO matters' }] },
          { type: 'paragraph', content: [{ text: 'Dispensing expired or near-expired medicines exposes patients to reduced efficacy and potential harm. TMDA regulations require pharmacies to maintain FEFO practices.' }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ text: 'Implementation in PharmaConnect' }] },
          { type: 'paragraph', content: [{ text: 'PharmaConnect automatically surfaces the earliest-expiring batch when dispensing. Always select the highlighted batch unless clinical circumstances require otherwise.' }] },
        ],
      },
    },
    {
      slug: 'tanzania-uhi-mandate-guide',
      title: 'Tanzania UHI Mandate: What Pharmacies Must Know',
      summary: 'The Universal Health Insurance mandate requirements and how PharmaConnect keeps your pharmacy compliant.',
      category: 'REGULATORY' as const,
      tags: ['uhi', 'nhif', 'regulatory', 'compliance'],
      readingTimeMinutes: 6,
      isPublished: true,
      publishedAt: new Date('2026-02-01'),
      body: {
        content: [
          { type: 'paragraph', content: [{ text: "Tanzania's Universal Health Insurance (UHI) mandate requires pharmacies to maintain digital dispensing records linked to patient identifiers. This guide explains what is required and how PharmaConnect addresses each requirement." }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ text: 'Key requirements' }] },
          { type: 'paragraph', content: [{ text: 'Pharmacies must record patient NHIF numbers at point of dispensing, maintain batch-level stock records, and submit claims electronically to NHIF within specified timeframes.' }] },
        ],
      },
    },
    {
      slug: 'drug-interaction-basics',
      title: 'Drug Interaction Basics for Dispensers',
      summary: 'Common drug interactions every dispenser should recognise and how to counsel patients effectively.',
      category: 'DRUG_SAFETY' as const,
      tags: ['drug-interactions', 'patient-safety', 'cpd'],
      readingTimeMinutes: 8,
      isPublished: true,
      publishedAt: new Date('2026-02-20'),
      body: {
        content: [
          { type: 'paragraph', content: [{ text: 'Drug interactions occur when one medicine affects the activity of another when taken simultaneously. As a dispenser, recognising potential interactions is a core patient safety responsibility.' }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ text: 'The most common interaction categories' }] },
          { type: 'paragraph', content: [{ text: 'Pharmacokinetic interactions affect absorption, distribution, metabolism or excretion. Pharmacodynamic interactions affect how drugs act at their target sites. Both types can increase toxicity or reduce efficacy.' }] },
        ],
      },
    },
  ];

  for (const article of articles) {
    await prisma.article.upsert({
      where: { slug: article.slug },
      update: {},
      create: article,
    });
    console.log('Created article:', article.title);
  }

  console.log('\nSeed complete. Login with any demo account using password: Demo123!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
