import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const UNITS = [
  { name: 'Tablet',      symbol: 'tab',     normalizedName: 'tablet',      description: 'Solid oral dosage form' },
  { name: 'Capsule',     symbol: 'cap',     normalizedName: 'capsule',     description: 'Solid oral dosage form in a shell' },
  { name: 'Strip',       symbol: 'strip',   normalizedName: 'strip',       description: 'Blister strip of tablets or capsules' },
  { name: 'Bottle',      symbol: 'btl',     normalizedName: 'bottle',      description: 'Liquid preparation in a bottle' },
  { name: 'Sachet',      symbol: 'sachet',  normalizedName: 'sachet',      description: 'Single-dose powder or granule packet' },
  { name: 'Vial',        symbol: 'vial',    normalizedName: 'vial',        description: 'Injectable solution in a sealed vial' },
  { name: 'Ampoule',     symbol: 'amp',     normalizedName: 'ampoule',     description: 'Sealed glass ampule for injections' },
  { name: 'Tube',        symbol: 'tube',    normalizedName: 'tube',        description: 'Cream, gel, or ointment tube' },
  { name: 'Inhaler',     symbol: 'inhaler', normalizedName: 'inhaler',     description: 'Metered-dose or dry powder inhaler' },
  { name: 'Suppository', symbol: 'supp',    normalizedName: 'suppository', description: 'Rectal or vaginal suppository' },
  { name: 'Patch',       symbol: 'patch',   normalizedName: 'patch',       description: 'Transdermal patch' },
  { name: 'Pack',        symbol: 'pack',    normalizedName: 'pack',        description: 'Generic packaged unit' },
  { name: 'Box',         symbol: 'box',     normalizedName: 'box',         description: 'Box of products' },
  { name: 'Piece',       symbol: 'pcs',     normalizedName: 'piece',       description: 'Individual item or piece' },
  { name: 'Millilitre',  symbol: 'ml',      normalizedName: 'millilitre',  description: 'Volume in millilitres' },
  { name: 'Litre',       symbol: 'L',       normalizedName: 'litre',       description: 'Volume in litres' },
  { name: 'Gram',        symbol: 'g',       normalizedName: 'gram',        description: 'Weight in grams' },
  { name: 'Kilogram',    symbol: 'kg',      normalizedName: 'kilogram',    description: 'Weight in kilograms' },
  { name: 'Milligram',   symbol: 'mg',      normalizedName: 'milligram',   description: 'Weight in milligrams' },
  { name: 'Unit',        symbol: 'unit',    normalizedName: 'unit',        description: 'Generic unit when no specific form applies' },
];

async function main() {
  console.log('Seeding units of measure…');
  let created = 0;
  let skipped = 0;

  for (const uom of UNITS) {
    const existing = await prisma.unitOfMeasure.findUnique({ where: { normalizedName: uom.normalizedName } });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.unitOfMeasure.create({ data: uom });
    created++;
  }

  console.log(`Done — ${created} created, ${skipped} already existed.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
