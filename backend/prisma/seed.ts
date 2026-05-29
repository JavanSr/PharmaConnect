import { PrismaClient, type PharmacyMembershipRole, type UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

function toMembershipRole(role: UserRole): PharmacyMembershipRole {
  switch (role) {
    case 'OWNER':                   return 'OWNER';
    case 'PHARMACIST_IN_CHARGE':    return 'PHARMACIST_IN_CHARGE';
    case 'DISPENSER':               return 'DISPENSER';
    case 'WHOLESALE_SELLER':        return 'OWNER';
    case 'WHOLESALE_MANAGER':       return 'OWNER';
    case 'WHOLESALE_COUNTER_STAFF': return 'DISPENSER';
    default:                        return 'DISPENSER';
  }
}

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding APOTEKH database...');
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

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
    update: {
      subscriptionTier: 'ENTERPRISE',
      billingCycle: 'ANNUAL',
      status: 'ACTIVE',
      trialActive: false,
      trialEndsAt: oneYearFromNow,
      subscriptionUpdatedAt: new Date(),
      userLimit: 999,
      isActive: true,
    },
    create: {
      name: 'Amani Pharmacy',
      licenceNumber: 'PH-AR-2024-001',
      address: 'Sokoine Road, Arusha Central',
      region: 'Arusha',
      pharmacyType: 'RETAIL',
      subscriptionTier: 'ENTERPRISE',
      billingCycle: 'ANNUAL',
      status: 'ACTIVE',
      trialActive: false,
      trialEndsAt: oneYearFromNow,
      subscriptionUpdatedAt: new Date(),
      userLimit: 999,
      isActive: true,
    },
  });
  console.log('Created demo pharmacy:', pharmacy.name);

  // Demo users for the pharmacy
  const demoUsers = [
    { email: 'admin@pharmaconnect.tz',  firstName: 'Admin',   lastName: 'Demo',    role: 'PHARMACIST_IN_CHARGE' as const },
    { email: 'owner@amani.co.tz',       firstName: 'Mohamed', lastName: 'Rashid',  role: 'OWNER'                as const },
    { email: 'staff@pharmaconnect.tz',  firstName: 'Staff',   lastName: 'Demo',    role: 'DISPENSER'            as const },
    { email: 'dispenser2@amani.co.tz',  firstName: 'Amina',   lastName: 'Hassan',  role: 'DISPENSER'            as const },
    { email: 'clerk@amani.co.tz',       firstName: 'Clerk',   lastName: 'Demo',    role: 'DISPENSER'            as const },
    { email: 'seller@amani.co.tz',      firstName: 'Seller',  lastName: 'Demo',    role: 'WHOLESALE_SELLER'     as const },
  ];

  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { password: await bcrypt.hash('Demo123!', 12) },
      create: {
        email: u.email,
        password: await bcrypt.hash('Demo123!', 12),
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        pharmacyId: pharmacy.id,
      },
    });

    await prisma.pharmacyMembership.upsert({
      where: { userId_pharmacyId: { userId: user.id, pharmacyId: pharmacy.id } },
      update: { active: true },
      create: {
        userId: user.id,
        pharmacyId: pharmacy.id,
        role: toMembershipRole(u.role),
        active: true,
        validFrom: new Date(),
        createdBy: user.id,
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
          { type: 'heading', attrs: { level: 2 }, content: [{ text: 'Implementation in APOTEKH' }] },
          { type: 'paragraph', content: [{ text: 'APOTEKH automatically surfaces the earliest-expiring batch when dispensing. Always select the highlighted batch unless clinical circumstances require otherwise.' }] },
        ],
      },
    },
    {
      slug: 'tanzania-uhi-mandate-guide',
      title: 'Tanzania UHI Mandate: What Pharmacies Must Know',
      summary: 'The Universal Health Insurance mandate requirements and how APOTEKH keeps your pharmacy compliant.',
      category: 'REGULATORY' as const,
      tags: ['uhi', 'nhif', 'regulatory', 'compliance'],
      readingTimeMinutes: 6,
      isPublished: true,
      publishedAt: new Date('2026-02-01'),
      body: {
        content: [
          { type: 'paragraph', content: [{ text: "Tanzania's Universal Health Insurance (UHI) mandate requires pharmacies to maintain digital dispensing records linked to patient identifiers. This guide explains what is required and how APOTEKH addresses each requirement." }] },
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

  // Founder membership to demo pharmacy (needed to log in and test)
  await prisma.pharmacyMembership.upsert({
    where: { userId_pharmacyId: { userId: superAdmin.id, pharmacyId: pharmacy.id } },
    update: { active: true },
    create: {
      userId: superAdmin.id,
      pharmacyId: pharmacy.id,
      role: 'OWNER',
      active: true,
      validFrom: new Date(),
      createdBy: superAdmin.id,
    },
  });
  console.log('Ensured founder membership in demo pharmacy');

  // Seed 100 units of every drug in the master catalogue for founder testing
  const drugProducts = await prisma.drugProduct.findMany({
    take: 300,
    orderBy: { productName: 'asc' },
    select: { id: true, productName: true, genericName: true },
  });

  if (drugProducts.length > 0) {
    console.log(`Seeding stock for ${drugProducts.length} drugs...`);
    let created = 0;
    for (const drug of drugProducts) {
      let product = await prisma.product.findFirst({
        where: { pharmacyId: pharmacy.id, drugMasterId: drug.id },
        select: { id: true },
      });
      if (!product) {
        product = await prisma.product.create({
          data: {
            pharmacyId: pharmacy.id,
            name: drug.productName,
            genericName: drug.genericName ?? undefined,
            drugMasterId: drug.id,
            sellingPrice: 2000,
            reorderLevel: 10,
            isActive: true,
          },
          select: { id: true },
        });
        created++;
      }
      const existingBatch = await prisma.batch.findFirst({
        where: { productId: product.id, batchNumber: 'SEED-001' },
        select: { id: true },
      });
      if (!existingBatch) {
        await prisma.batch.create({
          data: {
            productId: product.id,
            pharmacyId: pharmacy.id,
            batchNumber: 'SEED-001',
            expiryDate: new Date('2027-12-31'),
            quantityRemaining: 100,
            purchasePrice: 1500,
          },
        });
      }
    }
    console.log(`Created ${created} new products, ensured 100-unit batches for all`);
  } else {
    console.log('No drugs in master catalogue yet — run drug database import first');
  }

  // ─── Wholesale demo pharmacy ──────────────────────────────────────────────────

  const wholesale = await prisma.pharmacy.upsert({
    where: { licenceNumber: 'WH-AR-2024-001' },
    update: {
      subscriptionTier: 'WHOLESALE',
      status: 'ACTIVE',
      trialActive: false,
      trialEndsAt: oneYearFromNow,
      isActive: true,
    },
    create: {
      name: 'Kilimanjaro Wholesale Distributors',
      licenceNumber: 'WH-AR-2024-001',
      address: 'Moshi Road, Industrial Area, Arusha',
      region: 'Arusha',
      pharmacyType: 'WHOLESALE',
      subscriptionTier: 'WHOLESALE',
      billingCycle: 'MONTHLY',
      status: 'ACTIVE',
      trialActive: false,
      trialEndsAt: oneYearFromNow,
      subscriptionUpdatedAt: new Date(),
      userLimit: 20,
      isActive: true,
    },
  });
  console.log('Created wholesale pharmacy:', wholesale.name);

  const wholesaleUsers = [
    { email: 'manager@kwd.co.tz', firstName: 'Farida',  lastName: 'Omari',  role: 'WHOLESALE_MANAGER'       as const },
    { email: 'counter@kwd.co.tz', firstName: 'Hassan',  lastName: 'Mwangi', role: 'WHOLESALE_COUNTER_STAFF' as const },
  ];

  for (const u of wholesaleUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { password: await bcrypt.hash('Demo123!', 12) },
      create: {
        email: u.email,
        password: await bcrypt.hash('Demo123!', 12),
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        pharmacyId: wholesale.id,
      },
    });

    await prisma.pharmacyMembership.upsert({
      where: { userId_pharmacyId: { userId: user.id, pharmacyId: wholesale.id } },
      update: { active: true },
      create: {
        userId: user.id,
        pharmacyId: wholesale.id,
        role: toMembershipRole(u.role),
        active: true,
        validFrom: new Date(),
        createdBy: user.id,
      },
    });
    console.log('Created wholesale user:', u.email);
  }

  // Founder gets membership on wholesale pharmacy too
  await prisma.pharmacyMembership.upsert({
    where: { userId_pharmacyId: { userId: superAdmin.id, pharmacyId: wholesale.id } },
    update: { active: true },
    create: {
      userId: superAdmin.id,
      pharmacyId: wholesale.id,
      role: 'OWNER',
      active: true,
      validFrom: new Date(),
      createdBy: superAdmin.id,
    },
  });
  console.log('Ensured founder membership in wholesale pharmacy');

  // Seed products into wholesale inventory
  const wholesaleDrugs = await prisma.drugProduct.findMany({
    where: { genericName: { in: ['Amoxicillin', 'Paracetamol', 'Metformin', 'Atenolol', 'Artemether', 'Metronidazole', 'Cotrimoxazole', 'Ibuprofen', 'Zinc Sulfate', 'Omeprazole', 'Amlodipine', 'Diclofenac', 'Ciprofloxacin', 'Doxycycline', 'Salbutamol'] } },
    take: 20,
    orderBy: { productName: 'asc' },
    select: { id: true, productName: true, genericName: true, dosageFormName: true, strengthText: true },
  });

  const fallbackDrugs = [
    { productName: 'Amoxicillin 500mg Capsules',     genericName: 'Amoxicillin',   dosageFormName: 'CAPSULE', strengthText: '500mg',  drugMasterId: undefined },
    { productName: 'Paracetamol 500mg Tablets',      genericName: 'Paracetamol',   dosageFormName: 'TABLET',  strengthText: '500mg',  drugMasterId: undefined },
    { productName: 'Metformin 500mg Tablets',        genericName: 'Metformin',     dosageFormName: 'TABLET',  strengthText: '500mg',  drugMasterId: undefined },
    { productName: 'Atenolol 50mg Tablets',          genericName: 'Atenolol',      dosageFormName: 'TABLET',  strengthText: '50mg',   drugMasterId: undefined },
    { productName: 'Metronidazole 200mg Tablets',    genericName: 'Metronidazole', dosageFormName: 'TABLET',  strengthText: '200mg',  drugMasterId: undefined },
    { productName: 'Ciprofloxacin 500mg Tablets',    genericName: 'Ciprofloxacin', dosageFormName: 'TABLET',  strengthText: '500mg',  drugMasterId: undefined },
    { productName: 'Ibuprofen 400mg Tablets',        genericName: 'Ibuprofen',     dosageFormName: 'TABLET',  strengthText: '400mg',  drugMasterId: undefined },
    { productName: 'Omeprazole 20mg Capsules',       genericName: 'Omeprazole',    dosageFormName: 'CAPSULE', strengthText: '20mg',   drugMasterId: undefined },
    { productName: 'Doxycycline 100mg Capsules',     genericName: 'Doxycycline',   dosageFormName: 'CAPSULE', strengthText: '100mg',  drugMasterId: undefined },
    { productName: 'Salbutamol Inhaler 100mcg/dose', genericName: 'Salbutamol',    dosageFormName: 'INHALER', strengthText: '100mcg', drugMasterId: undefined },
  ];

  const drugsToSeed = wholesaleDrugs.length >= 5
    ? wholesaleDrugs.map(d => ({ productName: d.productName, genericName: d.genericName ?? '', dosageFormName: d.dosageFormName ?? 'TABLET', strengthText: d.strengthText ?? null, drugMasterId: d.id }))
    : fallbackDrugs;

  const basePrices: Record<string, number> = {
    Amoxicillin: 120, Paracetamol: 35, Metformin: 80, Atenolol: 65,
    Artemether: 180, Metronidazole: 45, Cotrimoxazole: 40, Ibuprofen: 55,
    'Zinc Sulfate': 50, Omeprazole: 90, Amlodipine: 70, Diclofenac: 60,
    Ciprofloxacin: 150, Doxycycline: 130, Salbutamol: 4500,
  };

  const wholesaleProducts: { id: string; basePrice: number }[] = [];

  for (const drug of drugsToSeed) {
    let product = await prisma.product.findFirst({
      where: { pharmacyId: wholesale.id, name: drug.productName },
      select: { id: true },
    });
    if (!product) {
      product = await prisma.product.create({
        data: {
          pharmacyId: wholesale.id,
          name: drug.productName,
          genericName: drug.genericName || undefined,
          drugMasterId: drug.drugMasterId || undefined,
          strength: drug.strengthText || undefined,
          sellingPrice: null,
          reorderLevel: 50,
          isActive: true,
        },
        select: { id: true },
      });
    }

    const existingBatch = await prisma.batch.findFirst({
      where: { productId: product.id, batchNumber: 'WH-SEED-001' },
      select: { id: true },
    });
    if (!existingBatch) {
      const basePrice = basePrices[drug.genericName] ?? 80;
      await prisma.batch.create({
        data: {
          productId: product.id,
          pharmacyId: wholesale.id,
          batchNumber: 'WH-SEED-001',
          expiryDate: new Date('2027-12-31'),
          quantityRemaining: 500,
          purchasePrice: Math.round(basePrice * 0.7),
        },
      });
    }

    wholesaleProducts.push({ id: product.id, basePrice: basePrices[drug.genericName] ?? 80 });
  }
  console.log(`Seeded ${wholesaleProducts.length} products into wholesale pharmacy`);

  // Create wholesale catalogue if not already there
  const existingCat = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "wholesale_catalogues"
    WHERE "pharmacy_id" = ${wholesale.id} AND "is_active" = true
    LIMIT 1
  `;

  if (existingCat.length === 0 && wholesaleProducts.length > 0) {
    const catRows = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "wholesale_catalogues" ("id", "pharmacy_id", "title", "description")
      VALUES (gen_random_uuid()::text, ${wholesale.id}, 'Main Catalogue', 'Standard product list — minimum order 100 units per line')
      RETURNING id
    `;
    const catalogueId = catRows[0]?.id;

    if (catalogueId) {
      for (const p of wholesaleProducts) {
        const tierPrices = JSON.stringify({
          ADDO:     Math.round(p.basePrice * 1.10),
          STANDARD: Math.round(p.basePrice * 0.97),
          PREMIUM:  Math.round(p.basePrice * 0.95),
        });
        await prisma.$executeRaw`
          INSERT INTO "wholesale_catalogue_pricing" (
            "id", "catalogue_id", "product_id", "price",
            "tier_prices", "min_order_quantity", "max_order_quantity"
          )
          VALUES (
            gen_random_uuid()::text, ${catalogueId}, ${p.id},
            ${p.basePrice}, ${tierPrices}::jsonb, 100, NULL
          )
          ON CONFLICT DO NOTHING
        `;
      }
      console.log(`Created wholesale catalogue with ${wholesaleProducts.length} items`);
    }
  } else {
    console.log('Wholesale catalogue already exists — skipping');
  }

  console.log('\nSeed complete. Login with any demo account using password: Demo123!');
  console.log('  Retail  → owner@amani.co.tz / admin@pharmaconnect.tz / staff@pharmaconnect.tz');
  console.log('  Wholesale seller → manager@kwd.co.tz (WHOLESALE_MANAGER)');
  console.log('  Wholesale counter → counter@kwd.co.tz (WHOLESALE_COUNTER_STAFF)');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
