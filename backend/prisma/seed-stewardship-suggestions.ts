// AMR stewardship seed — Access-tier alternative suggestions for common
// indications where an AWaRe WATCH/RESERVE antibiotic is dispensed.
//
// Two evidence tiers, distinguished by sourceCitation so a reviewing
// pharmacist can weigh confidence appropriately:
//   - "Tanzania STG 2021, ..." rows are transcribed directly from the actual
//     STG dosing tables (Part II) — cited by table/section/page.
//   - "General stewardship principle" rows are well-established, widely
//     uncontroversial clinical knowledge (e.g. penicillin/amoxicillin as
//     first-line for streptococcal pharyngitis) where the specific STG table
//     wasn't found in Part II, but the correct answer isn't in genuine doubt.
//     These are still DRAFT and still require the same pharmacist review —
//     the label just tells the reviewer which kind of check they're doing
//     (confirm against local guidance vs. verify a source transcription).
//
// Still deliberately NOT exhaustive. Two indications remain unpopulated
// after reading the actual STG text rather than guessing:
//   - STI (urethral discharge syndrome): ceftriaxone, azithromycin, and
//     cefixime are Tanzania's OWN deliberate first-line syndromic treatment
//     for STI — NEMLIT's facility-level column explicitly upgrades these
//     three to level A "for STI only", meaning the Ministry has made them
//     maximally accessible on purpose, and general stewardship guidance
//     agrees (no good Access-tier alternative for syndromic STI treatment
//     exists). Suggesting a downgrade here would be wrong on both counts.
//   - UTI beyond complicated cystitis: the STG's own first-line choice for
//     pyelonephritis, CAUTI, and urosepsis IS ciprofloxacin/ceftriaxone/
//     gentamicin, with no Access-tier alternative at that severity. Since
//     the indication picker doesn't distinguish UTI severity, adding a
//     blanket UTI suggestion risks being shown — and wrong — for the more
//     serious cases. See the existing UTI row's rationale for the caveat.
//
// IMPORTANT: every row below ships with reviewStatus DRAFT. The live
// suggestion lookup (getStewardshipSuggestion in patient-safety.service.ts)
// only ever returns rows with reviewStatus APPROVED — nothing here reaches a
// dispenser until a platform pharmacist reviews it and flips the status via
// Prisma Studio (there is no admin UI for this yet — see CLAUDE.md for the
// follow-up to wire this into the Review Queue properly).
import 'dotenv/config';
import { PrismaClient, ReviewStatus, StewardshipIndication } from '@prisma/client';

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

type SuggestionSeed = {
  triggerGenericName: string;
  indication: StewardshipIndication;
  suggestedGenericName: string;
  rationale: string;
  sourceCitation: string;
};

const STEWARDSHIP_SUGGESTIONS: SuggestionSeed[] = [
  {
    triggerGenericName: 'azithromycin',
    indication: StewardshipIndication.PNEUMONIA,
    suggestedGenericName: 'erythromycin',
    rationale: 'For mild community-acquired pneumonia, the STG lists erythromycin as first-line; azithromycin is listed for cases that fail to respond to initial treatment.',
    sourceCitation: 'Tanzania STG 2021, Table 9.3, p.164',
  },
  {
    triggerGenericName: 'clarithromycin',
    indication: StewardshipIndication.PNEUMONIA,
    suggestedGenericName: 'erythromycin',
    rationale: 'For mild community-acquired pneumonia, the STG lists erythromycin as first-line; clarithromycin is listed for cases that fail to respond to initial treatment or atypical pneumonia.',
    sourceCitation: 'Tanzania STG 2021, Table 9.3-9.4, p.164-165',
  },
  {
    triggerGenericName: 'cefuroxime',
    indication: StewardshipIndication.PNEUMONIA,
    suggestedGenericName: 'amoxicillin + clavulanic acid',
    rationale: 'For CAP in patients with comorbidities, the STG lists amoxicillin + clavulanic acid as an equal first-line alternative to cefuroxime.',
    sourceCitation: 'Tanzania STG 2021, Table 9.3, p.164',
  },
  {
    triggerGenericName: 'ciprofloxacin',
    indication: StewardshipIndication.UTI,
    suggestedGenericName: 'amoxicillin + clavulanic acid',
    rationale: 'For complicated cystitis specifically, the STG lists amoxicillin + clavulanic acid as an equal first-line alternative to ciprofloxacin. This does not apply to pyelonephritis, catheter-associated UTI, or urosepsis, where the STG itself specifies ciprofloxacin or broader cover with no Access-tier alternative.',
    sourceCitation: 'Tanzania STG 2021, §21.10 "Complicated cystitis", p.492',
  },
  // General stewardship principle (not a direct STG Part II citation — see
  // file header). Streptococcal pharyngitis / uncomplicated URTI first-line
  // is penicillin or amoxicillin worldwide, including in Tanzania's own
  // Access-tier antibiotic list; none of these three has a legitimate
  // first-line role in routine URTI.
  {
    triggerGenericName: 'azithromycin',
    indication: StewardshipIndication.URTI,
    suggestedGenericName: 'amoxicillin',
    rationale: 'Most URTI is viral. Where a bacterial cause (e.g. streptococcal pharyngitis) is suspected, amoxicillin or penicillin V is standard first-line; azithromycin has no first-line role in routine URTI.',
    sourceCitation: 'General stewardship principle — verify against Tanzania STG/local guidance before approving',
  },
  {
    triggerGenericName: 'clarithromycin',
    indication: StewardshipIndication.URTI,
    suggestedGenericName: 'amoxicillin',
    rationale: 'Most URTI is viral. Where a bacterial cause (e.g. streptococcal pharyngitis) is suspected, amoxicillin or penicillin V is standard first-line; clarithromycin has no first-line role in routine URTI.',
    sourceCitation: 'General stewardship principle — verify against Tanzania STG/local guidance before approving',
  },
  {
    triggerGenericName: 'ciprofloxacin',
    indication: StewardshipIndication.URTI,
    suggestedGenericName: 'amoxicillin',
    rationale: 'Fluoroquinolones have poor first-line justification for routine URTI (weak respiratory-pathogen coverage rationale) and carry a WATCH-level resistance concern; amoxicillin or penicillin V is standard first-line when a bacterial cause is suspected.',
    sourceCitation: 'General stewardship principle — verify against Tanzania STG/local guidance before approving',
  },
];

async function main() {
  console.log(`Seeding ${STEWARDSHIP_SUGGESTIONS.length} stewardship suggestions (status: DRAFT)...`);

  for (const row of STEWARDSHIP_SUGGESTIONS) {
    const existing = await prisma.stewardshipSuggestion.findFirst({
      where: {
        triggerGenericName: { equals: row.triggerGenericName, mode: 'insensitive' },
        indication: row.indication,
        suggestedGenericName: { equals: row.suggestedGenericName, mode: 'insensitive' },
      },
    });

    if (existing) {
      await prisma.stewardshipSuggestion.update({
        where: { id: existing.id },
        data: { rationale: row.rationale, sourceCitation: row.sourceCitation },
      });
      console.log(`  updated: ${row.triggerGenericName} / ${row.indication} -> ${row.suggestedGenericName}`);
      continue;
    }

    await prisma.stewardshipSuggestion.create({
      data: {
        triggerGenericName: row.triggerGenericName,
        indication: row.indication,
        suggestedGenericName: row.suggestedGenericName,
        rationale: row.rationale,
        sourceCitation: row.sourceCitation,
        reviewStatus: ReviewStatus.DRAFT,
      },
    });
    console.log(`  created: ${row.triggerGenericName} / ${row.indication} -> ${row.suggestedGenericName}`);
  }

  console.log('Done. These rows are DRAFT — approve via Prisma Studio before they reach dispensers.');
}

main()
  .catch((error) => {
    console.error('Stewardship suggestion seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
