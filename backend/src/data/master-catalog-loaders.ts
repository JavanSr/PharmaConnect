import { spawnSync } from 'node:child_process';
import path from 'node:path';
import {
  TANZANIA_MASTER_CATALOG_SEED,
  type TanzaniaMasterCatalogProductSeed,
} from './tanzania-master-catalog-seed';

export type MasterCatalogSourceKey = 'MSD' | 'NEMLIT';

export function normalizeMasterCatalogFingerprint(records: TanzaniaMasterCatalogProductSeed[]) {
  return JSON.stringify(
    records
      .map((record) => ({
        productName: record.productName,
        genericName: record.genericName,
        dosageFormName: record.dosageFormName,
        strengthText: record.strengthText,
        packSizeLabel: record.packSizeLabel,
        sourceUrl: record.sourceUrl,
      }))
      .sort((left, right) => {
        const leftKey = [
          left.genericName.toLowerCase(),
          left.productName.toLowerCase(),
          left.dosageFormName.toLowerCase(),
          left.strengthText.toLowerCase(),
        ].join(':');
        const rightKey = [
          right.genericName.toLowerCase(),
          right.productName.toLowerCase(),
          right.dosageFormName.toLowerCase(),
          right.strengthText.toLowerCase(),
        ].join(':');
        return leftKey.localeCompare(rightKey);
      }),
  );
}

export function loadNemlitCatalogSeed(): TanzaniaMasterCatalogProductSeed[] {
  const scriptPath = path.resolve(__dirname, '../../scripts/extract_nemlit_master_catalog.py');
  const result = spawnSync('python', [scriptPath], {
    cwd: path.resolve(__dirname, '../..'),
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.trim() || 'Unknown NEMLIT parser error.';
    throw new Error(`NEMLIT parser failed: ${stderr}`);
  }

  const output = result.stdout?.trim();
  if (!output) {
    throw new Error('NEMLIT parser returned no output.');
  }

  return JSON.parse(output) as TanzaniaMasterCatalogProductSeed[];
}

export function loadMasterCatalogSeedForSource(sourceKey: MasterCatalogSourceKey): TanzaniaMasterCatalogProductSeed[] {
  if (sourceKey === 'MSD') {
    return TANZANIA_MASTER_CATALOG_SEED;
  }

  return loadNemlitCatalogSeed();
}

export function loadMasterCatalogSeedBySource(): Record<MasterCatalogSourceKey, TanzaniaMasterCatalogProductSeed[]> {
  return {
    MSD: loadMasterCatalogSeedForSource('MSD'),
    NEMLIT: loadMasterCatalogSeedForSource('NEMLIT'),
  };
}
