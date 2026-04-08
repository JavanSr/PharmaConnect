import { PrismaClient, StorageCondition } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Expected CSV columns (map from TMDA/MSD export):
// registration_number, generic_name, brand_name, manufacturer,
// dosage_form, strength, unit_of_measure, pack_size,
// drug_class, storage_condition, is_cold_chain, is_essential_medicine

const storageMap: Record<string, StorageCondition> = {
  AMBIENT: StorageCondition.AMBIENT,
  REFRIGERATED: StorageCondition.REFRIGERATED,
  FROZEN: StorageCondition.FROZEN,
};

function asBoolean(value: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'true' || normalized === 'yes' || normalized === '1';
}

function asStorageCondition(value: unknown) {
  return storageMap[String(value ?? '').trim().toUpperCase()] ?? StorageCondition.AMBIENT;
}

function registrationNumberFor(row: Record<string, string>, index: number) {
  return row.registration_number?.trim() || `UNREGISTERED-${index + 1}`;
}

async function main() {
  const csvPath = path.resolve(process.argv[2] || './prisma/drug-catalogue.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  const buffer = fs.readFileSync(csvPath);
  const records = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  let imported = 0;
  let skipped = 0;
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];

    try {
      if (!row.generic_name) throw new Error('generic_name is required');

      const tmdaRegistrationNumber = registrationNumberFor(row, i);
      const packSize = parseInt(row.pack_size, 10) || 1;
      const storageCondition = asStorageCondition(row.storage_condition);
      const isColdChain = asBoolean(row.is_cold_chain);
      const isEssentialMedicine = asBoolean(row.is_essential_medicine);

      await prisma.drugMaster.upsert({
        where: { tmdaRegistrationNumber },
        update: {
          genericName: row.generic_name,
          brandName: row.brand_name || null,
          manufacturer: row.manufacturer || null,
          dosageForm: row.dosage_form || null,
          strength: row.strength || null,
          unitOfMeasure: row.unit_of_measure || 'units',
          packSize,
          drugClass: row.drug_class || null,
          storageCondition,
          isColdChain,
          isEssentialMedicine,
        },
        create: {
          tmdaRegistrationNumber,
          genericName: row.generic_name,
          brandName: row.brand_name || null,
          manufacturer: row.manufacturer || null,
          dosageForm: row.dosage_form || null,
          strength: row.strength || null,
          unitOfMeasure: row.unit_of_measure || 'units',
          packSize,
          drugClass: row.drug_class || null,
          storageCondition,
          isColdChain,
          isEssentialMedicine,
        },
      });

      imported++;
    } catch (err) {
      errors.push({ row: i + 2, error: String(err) });
      skipped++;
    }
  }

  console.log(`Imported: ${imported} | Skipped: ${skipped}`);
  if (errors.length) {
    console.error('Errors:', errors.slice(0, 10));
  }
}

main().finally(() => prisma.$disconnect());
