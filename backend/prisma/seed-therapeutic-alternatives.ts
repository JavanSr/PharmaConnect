// Stockout alternatives — general medicine substitution, triggered by "this
// drug has zero stock right now" at the dispensing counter. Distinct from
// stewardship-suggestions.ts (antibiotic AWaRe downgrades, indication-based).
//
// Deliberately a SMALL set. Same therapeutic category does not mean safely
// interchangeable — going through the full core drug list, most pairs were
// excluded on purpose, not by oversight:
//   - metformin / glibenclamide: different diabetes-drug classes with
//     different hypoglycaemia and renal risk profiles; not a casual swap.
//   - carbamazepine / valproate: switching anticonvulsants is a specialist
//     decision (seizure-type-specific, major side-effect differences), not
//     a counter-side substitution.
//   - furosemide / spironolactone: often used TOGETHER, not as alternatives
//     to each other — different mechanism, different clinical purpose.
//   - rifampicin, dolutegravir, artemether-lumefantrine: single-purpose
//     drugs inside standardised national programmes (TB/DOTS, HIV/ART,
//     malaria treatment guidelines). Ad-hoc substitution at the pharmacy
//     counter is never appropriate — these are intentionally excluded.
//   - warfarin: no safe casual substitute; switching anticoagulants requires
//     clinical oversight (INR monitoring), not a stockout swap.
//
// What's left is a handful of pairs a pharmacist would genuinely offer a
// customer today: NSAID-for-NSAID, paracetamol as the safer default
// alongside either NSAID, and the standard ACE-inhibitor/ARB swap.
//
// IMPORTANT: every row ships as DRAFT — the live lookup only returns
// APPROVED rows. Approve via Prisma Studio.
import 'dotenv/config';
import { PrismaClient, ReviewStatus } from '@prisma/client';

function createPrismaClient(url?: string) {
  return new PrismaClient({
    datasources: {
      db: {
        url: url || process.env.DATABASE_URL,
      },
    },
  });
}

const prisma = createPrismaClient(process.env.DIRECT_URL || process.env.DATABASE_URL);

type AlternativeSeed = {
  triggerGenericName: string;
  suggestedGenericName: string;
  therapeuticCategory: string;
  rationale: string;
  sourceCitation: string;
};

const GENERAL_CITATION = 'General therapeutic-class principle — not drug-specific STG guidance; verify against patient contraindications (GI, renal, pregnancy, allergy) before dispensing.';

const THERAPEUTIC_ALTERNATIVES: AlternativeSeed[] = [
  {
    triggerGenericName: 'diclofenac',
    suggestedGenericName: 'ibuprofen',
    therapeuticCategory: 'ANALGESIC',
    rationale: 'Both NSAIDs for pain and inflammation. Same precautions apply to both — avoid in peptic ulcer disease, significant renal impairment, or known NSAID hypersensitivity.',
    sourceCitation: GENERAL_CITATION,
  },
  {
    triggerGenericName: 'ibuprofen',
    suggestedGenericName: 'diclofenac',
    therapeuticCategory: 'ANALGESIC',
    rationale: 'Both NSAIDs for pain and inflammation. Same precautions apply to both — avoid in peptic ulcer disease, significant renal impairment, or known NSAID hypersensitivity.',
    sourceCitation: GENERAL_CITATION,
  },
  {
    triggerGenericName: 'ibuprofen',
    suggestedGenericName: 'paracetamol',
    therapeuticCategory: 'ANALGESIC',
    rationale: 'Paracetamol is the safer default analgesic/antipyretic where NSAID precautions apply — peptic ulcer disease, renal impairment, or pregnancy (especially third trimester).',
    sourceCitation: GENERAL_CITATION,
  },
  {
    triggerGenericName: 'diclofenac',
    suggestedGenericName: 'paracetamol',
    therapeuticCategory: 'ANALGESIC',
    rationale: 'Paracetamol is the safer default analgesic/antipyretic where NSAID precautions apply — peptic ulcer disease, renal impairment, or pregnancy (especially third trimester).',
    sourceCitation: GENERAL_CITATION,
  },
  {
    triggerGenericName: 'paracetamol',
    suggestedGenericName: 'ibuprofen',
    therapeuticCategory: 'ANALGESIC',
    rationale: 'Alternative analgesic/antipyretic. NSAID — avoid in peptic ulcer disease, significant renal impairment, or pregnancy (especially third trimester), unlike paracetamol.',
    sourceCitation: GENERAL_CITATION,
  },
  {
    triggerGenericName: 'paracetamol',
    suggestedGenericName: 'diclofenac',
    therapeuticCategory: 'ANALGESIC',
    rationale: 'Alternative analgesic/antipyretic. NSAID — avoid in peptic ulcer disease, significant renal impairment, or pregnancy (especially third trimester), unlike paracetamol.',
    sourceCitation: GENERAL_CITATION,
  },
  {
    triggerGenericName: 'enalapril',
    suggestedGenericName: 'losartan',
    therapeuticCategory: 'ANTIHYPERTENSIVE',
    rationale: 'Standard ACE-inhibitor-to-ARB substitution — both first-line antihypertensives. Losartan is preferred when the patient has an ACE-inhibitor cough.',
    sourceCitation: GENERAL_CITATION,
  },
  {
    triggerGenericName: 'losartan',
    suggestedGenericName: 'enalapril',
    therapeuticCategory: 'ANTIHYPERTENSIVE',
    rationale: 'Standard ARB-to-ACE-inhibitor substitution — both first-line antihypertensives. Avoid in patients with a known ACE-inhibitor cough history.',
    sourceCitation: GENERAL_CITATION,
  },
];

async function main() {
  console.log(`Seeding ${THERAPEUTIC_ALTERNATIVES.length} therapeutic alternatives (status: DRAFT)...`);

  for (const row of THERAPEUTIC_ALTERNATIVES) {
    const existing = await prisma.therapeuticAlternative.findFirst({
      where: {
        triggerGenericName: { equals: row.triggerGenericName, mode: 'insensitive' },
        suggestedGenericName: { equals: row.suggestedGenericName, mode: 'insensitive' },
      },
    });

    if (existing) {
      await prisma.therapeuticAlternative.update({
        where: { id: existing.id },
        data: { rationale: row.rationale, sourceCitation: row.sourceCitation, therapeuticCategory: row.therapeuticCategory },
      });
      console.log(`  updated: ${row.triggerGenericName} -> ${row.suggestedGenericName}`);
      continue;
    }

    await prisma.therapeuticAlternative.create({
      data: {
        triggerGenericName: row.triggerGenericName,
        suggestedGenericName: row.suggestedGenericName,
        therapeuticCategory: row.therapeuticCategory,
        rationale: row.rationale,
        sourceCitation: row.sourceCitation,
        reviewStatus: ReviewStatus.DRAFT,
      },
    });
    console.log(`  created: ${row.triggerGenericName} -> ${row.suggestedGenericName}`);
  }

  console.log('Done. These rows are DRAFT — approve via Prisma Studio before they reach dispensers.');
}

main()
  .catch((error) => {
    console.error('Therapeutic alternatives seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
