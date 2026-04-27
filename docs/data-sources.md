# Tanzania Master Drug And Safety Data Sources

Verified on `2026-04-23`.

## Scope

Phase 1 documents Tanzania-first sources for:

1. registered medicines and products
2. approved product information / SmPC-style safety documents
3. fallback catalog seeding when TMDA bulk product data is not practically available
4. full-list planning for NEMLIT 2021 and the available registered-product universe where source access allows

Phase 1 is documentation-first, but later phases in this repo may already consume source metadata, source documents, or derived seed data. This file should stay compatible with the broader Phase 2-8 skeleton and should not narrow the future import scope unnecessarily.

## Recommended source order for next phases

1. TMDA Approved Product Information portal for product-specific safety enrichment
2. Tanzania NEMLIT 2021 for Tanzania formulary structure and public-facility relevance
3. MSD Tanzania procurement catalogue for structured seed catalog import
4. WHO Model List of Essential Medicines, 23rd list (2023) for non-Tanzania fallback only
5. TMDA Registered Medicinal Products portal for registration verification and TMDA number lookup

## Source assessment

| Source name | URL | Source type | Trust level | Fields available | Update frequency if known | Import method | Notes / limitations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TMDA Approved Product Information | `https://tmda.go.tz/pages/approved-product-information` | Official TMDA HTML listing with linked PDF documents | Highest | Page exposes SmPC and TPAR listings with product name, generic name, and per-record PDF links; PDFs contain product-specific safety text | TMDA page says `Last updated on 12th August, 2024` | Scrape HTML listing plus per-document PDF download | Best Tanzania-first source for safety rules, but it is a selected-document library, not a confirmed complete product register |
| Tanzania NEMLIT 2021 | `https://www.moh.go.tz/storage/app/uploads/public/663/c8f/ceb/663c8fceb418d132695047.pdf` | Official Ministry of Health PDF | Very high | NEMLIT section includes `Name of drug`, `Dosage forms and Strengths`, and `Level`; broader STG/NEMLIT document also contains treatment guidance | Sixth edition published in `2021`; addendum dated `2023-04-12` is separately published | PDF extraction with manual QA | Strong Tanzania-first formulary baseline, but not a regulatory registration list and not a live searchable database |
| MSD Tanzania Price / Procurement Catalogue | `https://www.msd.go.tz/sites/default/files/2024-09/PRICE_CATALOGUE_FY_2024_2025_Final.pdf` | Official MSD catalogue PDF | High | Publicly indexed rows show structured procurement fields such as item number, group, description, unit of measure, and selling price | Usually fiscal-year based; current evaluated catalogue is FY `2024/2025` | PDF extraction and normalization | Most practical structured seed dataset if TMDA bulk register is unavailable; use for broad catalog seeding rather than a narrow sample. It does not prove TMDA registration and does not contain full safety text |
| WHO Model List of Essential Medicines - 23rd list (2023) | `https://www.who.int/publications/i/item/WHO-MHP-HPS-EML-2023.02` | Official WHO publication page with downloadable PDF | High international source, below Tanzania-specific sources for local decisions | Therapeutic-area list, dosage-form guidance, and WHO essential-medicine status | WHO says the model list is updated every two years; evaluated edition published `2023-07-26` | PDF import only for specific fallback gaps | Use only when a medicine is clinically relevant but not yet covered in Tanzania-specific sources; not evidence of TMDA registration |
| TMDA Registered Medicinal Products | `https://www.tmda.go.tz/pages/registered-medicinal-products` and linked RIMS portal `https://imis2.tmda.go.tz/` | Official TMDA registration portal entry point | Highest | TMDA confirms a public route to registered medicines, but the result schema was not fully recoverable from static inspection because the portal is JS-driven | No publication cadence shown on the page | Browser-assisted search / manual lookup for now | Use for TMDA registration verification and for as much registered-product coverage as can be reproduced safely. Bulk export and stable scrape path were not confirmed in Phase 1 |

## Access posture by source

| Source name | Searchable | Downloadable | Scrapeable | Manual-import only | Evidence / comment |
| --- | --- | --- | --- | --- | --- |
| TMDA Approved Product Information | Yes | Yes | Yes | No | TMDA page exposes HTML tables and direct PDF download links for SmPC and TPAR entries |
| Tanzania NEMLIT 2021 | No live search interface confirmed | Yes | Yes, with PDF extraction | No | Structured PDF is downloadable and extractable, but will need manual QA because layout and headings are document-based |
| MSD Tanzania Price / Procurement Catalogue | No public search interface confirmed for the evaluated catalogue PDF | Yes | Yes, with PDF extraction | No | Catalogue artifact is downloadable and fairly structured, but still needs normalization and review |
| WHO Model List of Essential Medicines - 23rd list (2023) | Yes | Yes | Yes | No | WHO publication page and linked PDF are openly accessible |
| TMDA Registered Medicinal Products / RIMS public portal | Yes | Not confirmed | Not confirmed for stable automation | No | TMDA links to the public portal, but the portal loads through client-side application code and Phase 1 did not confirm bulk export or a dependable scrape path |

## Source-specific update strategy

### 1. TMDA Approved Product Information

- Check monthly for:
  - new SmPC or TPAR entries
  - removed or replaced PDF URLs
  - page-level update notices
- Diff both the HTML listing and the linked PDF URLs.
- Treat this as the preferred source for product-specific contraindications, warnings, interactions, and counseling text in later phases.

### 2. Tanzania NEMLIT 2021

- Recheck quarterly on the Ministry of Health site for:
  - revised STG/NEMLIT editions
  - addenda
  - replacement PDF URLs
- Keep the base 2021 edition plus separately tracked addenda rather than overwriting prior content blindly.
- Important addendum already identified:
  - `https://www.moh.go.tz/storage/app/uploads/public/643/69a/cd3/64369acd39d8b864795491.pdf`
  - Dated `2023-04-12`
  - Adjusts selected cardiovascular medicine levels

### 3. MSD Tanzania Price / Procurement Catalogue

- Recheck each fiscal year and when MSD republishes a revised catalogue.
- Diff extracted rows for:
  - new items
  - retired items
  - description changes
  - unit changes
  - price-only changes
- Use MSD's customer portal messaging as confirmation that price catalogues are part of MSD's supported digital service surface, even though the evaluated artifact for Phase 1 is a PDF.
- When Phase 3 imports begin, the target should be the full available public catalogue for the chosen fiscal-year source, not an arbitrarily trimmed subset.

### 4. WHO Model List of Essential Medicines - 23rd list (2023)

- Refresh when WHO publishes the next model list release.
- Treat WHO as a clinical fallback source, not a Tanzania registration source.
- Use only for drugs that are relevant to clinical coverage but missing from Tanzania-first sources.

### 5. TMDA Registered Medicinal Products / RIMS public portal

- Recheck monthly for:
  - any exposed export option
  - portal behavior changes
  - discoverable API/network calls during manual browser review
- Keep this as the authority for registration verification and TMDA registration-number confirmation.
- Where a reproducible capture method is proven later, use it to widen toward the full available public registered-product list rather than a handpicked subset.
- Do not assume bulk importability until Phase 3 proves it with a reproducible capture method.

## Import method: MSD fallback

Decision recorded on `2026-04-23`.

Phase 1 findings:

- TMDA does provide an official public entry point for registered medicinal products.
- TMDA also provides approved product information with downloadable SmPC and TPAR PDFs.
- Phase 1 did not confirm a bulk-downloadable TMDA product register.
- Phase 1 also did not confirm a stable scrapeable result feed for the TMDA registered-medicines portal without browser automation or deeper network inspection.

Decision for Phase 3:

1. Use the MSD procurement catalogue as the initial seed dataset.
2. Import the full available NEMLIT 2021 list and the `2023-04-12` addendum as Tanzania-essential coverage, with manual review where extraction quality is uncertain.
3. Use TMDA Registered Medicinal Products for registration verification, `tmdaRegistrationNumber` enrichment, and broader registered-product coverage where a stable capture path is later confirmed.
4. Use TMDA Approved Product Information as the first-choice safety-document source.
5. Use WHO EML only for fallback clinical coverage where Tanzania-first sources still do not cover a medicine.

## Practical guidance for Phase 2 and Phase 3

- Keep manual entry fallback everywhere relevant.
- Mark uncertain matches for review instead of guessing TMDA numbers, manufacturers, or safety text.
- Preserve the option to ingest the full available NEMLIT list and the full available public registered-product set as later import tooling matures.
- Separate:
  - seed catalog source
  - regulatory verification source
  - safety-document source
- The most practical split from Phase 1 is:
  - MSD = initial structured seed
  - NEMLIT = Tanzania essential-medicine supplement
  - TMDA RIMS = registration verification
  - TMDA Approved Product Information = product-specific safety evidence
  - WHO EML = fallback coverage only

## Open questions for manual review in later phases

- Whether the TMDA RIMS public portal exposes a reproducible network API or export path once inspected in a live browser session
- Whether TMDA Approved Product Information coverage is broad enough for high-volume Tanzania products or remains limited to selected products
- Whether MSD publishes a more structured machine-readable export to authenticated portal users beyond the public PDF catalogue
