import {
  MSD_TANZANIA_MASTER_SOURCE,
  NEMLIT_TANZANIA_MASTER_SOURCE,
} from './tanzania-master-catalog-seed';
import { SAFETY_SOURCE_DOCUMENTS } from './patient-safety-rules-seed';

export type MonitoredSourceSeed = {
  sourceName: string;
  title: string;
  url: string;
  documentVersion?: string;
  issuingAuthority?: string;
  notes?: string;
};

export const MONITORED_SOURCE_SEEDS: MonitoredSourceSeed[] = [
  MSD_TANZANIA_MASTER_SOURCE,
  NEMLIT_TANZANIA_MASTER_SOURCE,
  ...SAFETY_SOURCE_DOCUMENTS.map((document) => ({
    sourceName: document.sourceName,
    title: document.title,
    url: document.url,
    documentVersion: document.documentVersion,
    issuingAuthority: document.issuingAuthority,
    notes: document.notes,
  })),
].filter((seed, index, seeds) => {
  return seeds.findIndex((candidate) => candidate.sourceName === seed.sourceName && candidate.title === seed.title) === index;
});
