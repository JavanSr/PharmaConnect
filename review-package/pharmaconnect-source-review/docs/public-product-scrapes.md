# Public Product Source Scrapes

Generated with:

```bash
cd backend
npm run scrape:public-products
```

Current outputs:

- `backend/data/public-source-scrapes/public-product-scrape-latest.json`
- `backend/data/public-source-scrapes/public-product-scrape-latest.csv`

Import/cross-link into the reviewable master catalog with:

```bash
cd backend
npm run import:public-products
```

## Current Snapshot

The latest run captured 731 reviewable records:

- TMDA Approved Medicines Product Information: 593 selected SmPC/TPAR product rows.
- Umoja Pharmaceuticals public product pages: 101 public shop rows.
- Unichem Tanzania Product List PDF: 31 manufacturer product rows.
- Vital International public product page: 4 low-confidence public product names.
- Global Pharma Group and Bariki Pharma Group: profile evidence only; no structured public product list found.
- Infinicare: fetch failed during this run due DNS resolution.

## Use Rules

- Do not treat scraped commercial rows as TMDA verification.
- Use TMDA Approved Product Information rows as high-trust selected product evidence, but not a complete registered-product universe.
- Use Umoja/Unichem/Vital rows for onboarding suggestions, aliases, and brand-generic matching candidates.
- Keep all imported rows in review before promotion to the trusted master catalog.
- Do not import captured public shop prices automatically; static pages can place unrelated recommendation prices near product cards.

## Next Step

Build a review/import step that matches these rows against `drug_products`, `brands`, `manufacturers`, and `product_aliases` with confidence scores before promotion.

## Import Result

Latest import on `2026-04-24`:

- Source records: 731.
- Importable records: 729.
- New catalog candidates created: 603.
- Existing catalog candidates updated/cross-linked: 126.
- Alias/search rows added: 1,871.
- Review queue rows added: 608.

Rows remain marked by source confidence, for example `TMDA_PRODUCT_INFO_LISTED`, `MANUFACTURER_LIST_UNVERIFIED`, `COMMERCIAL_SOURCE_UNVERIFIED`, or `LOW_CONFIDENCE_NON_MEDICINE_REVIEW`.
