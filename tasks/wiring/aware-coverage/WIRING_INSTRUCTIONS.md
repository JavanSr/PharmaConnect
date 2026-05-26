# AWaRe Coverage — Wiring Instructions

## What AWaRe is (and is not)

AWaRe (Access / Watch / Reserve) is the WHO antibiotic stewardship classification.
**It applies ONLY to antibacterials (antibiotics).**

- antifungals → `awarClass: null`
- antivirals → `awarClass: null`
- antiparasitics / antimalarials → `awarClass: null`
- analgesics, cardiovascular, respiratory, GI, endocrine, vitamins → `awarClass: null`
- anti-TB drugs (rifampicin, isoniazid, pyrazinamide, ethambutol) → `awarClass: null`
  (Anti-TB agents are governed by separate WHO TB guidelines, not AWaRe)

`null` on a non-antibiotic is correct by design — it is not a missing value.

---

## 1. Schema

Add to `backend/prisma/schema.prisma` → `DrugDatabase` model:
```prisma
awarClass  String?  @map("awar_class")
```

Run:
```bash
npx prisma migrate dev --name add_awar_class_to_drug_database
```

---

## 2. Seed

Copy `backend/drug-database-seed.ts` → `backend/prisma/drug-database-seed.ts`

Add to `backend/package.json`:
```json
"seed:drugs": "ts-node prisma/drug-database-seed.ts"
```

Run:
```bash
cd backend && npm run seed:drugs
```

Expected output:
```
Seeding 120 drugs…
Done. N created, M updated.

AWaRe classification summary (antibiotics only):
  ACCESS  (first-line):  15 antibiotics
  WATCH   (second-line): 22 antibiotics
  RESERVE (last-resort):  5 antibiotics
  null    (non-antibiotic or anti-TB): 78 drugs
```

---

## 3. Backend — include awarClass in drug lookup response

In whatever endpoint serves drug search (e.g. `GET /drugs/search`), ensure `awarClass` is
included in the Prisma select / response. Example:

```ts
const drugs = await prisma.drugDatabase.findMany({
  where: { genericName: { contains: query, mode: 'insensitive' } },
  select: {
    id: true,
    genericName: true,
    brandNames: true,
    category: true,
    awarClass: true,   // ← add this
    // ...
  },
  take: 20,
});
```

---

## 4. Frontend — badge component

Copy `frontend/AwareBadge.tsx` → `frontend/src/components/AwareBadge.tsx`

---

## 5. Frontend — dispensing integration

In your existing dispensing drug search result rows and active dispensing item list:

```tsx
import { AwareBadge } from '../../components/AwareBadge';

// Inside your drug name JSX:
<span>{drug.genericName}</span>
<AwareBadge awarClass={drug.awarClass} />
```

See `DispensingDrugItem.example.tsx` for full context.

The badge:
- Renders **nothing** for ACCESS drugs and all non-antibiotic drugs (null)
- Shows amber "WATCH antibiotic" badge with info icon for WATCH drugs
- Shows red "RESERVE antibiotic" badge with warning icon for RESERVE drugs
- Shows a tooltip on hover/focus with the NEMLIT 2021 dispensing requirement text
- Does **not** block dispensing — informational only

---

## 6. Build check

```bash
cd backend  && npm run build
cd frontend && npm run build
```

---

## AWaRe Classification Reference (Tanzania NEMLIT 2021)

| Class   | Antibiotics |
|---------|------------|
| ACCESS  | Amoxicillin, Ampicillin, Benzylpenicillin, Phenoxymethylpenicillin, Cloxacillin, Flucloxacillin, Erythromycin, Doxycycline, Tetracycline, Co-trimoxazole, Trimethoprim, Metronidazole, Tinidazole, Nitrofurantoin, Chloramphenicol, Clindamycin* |
| WATCH   | Amoxicillin-Clavulanate, Piperacillin-Tazobactam, all Cephalosporins, Azithromycin, Clarithromycin, all Fluoroquinolones, Gentamicin, Amikacin, Streptomycin |
| RESERVE | Meropenem, Imipenem-Cilastatin, Ertapenem, Vancomycin, Linezolid, Colistin |

*Clindamycin is ACCESS in NEMLIT 2021. WHO AWaRe 2023 reclassified it to WATCH — update if Tanzania adopts the 2023 revision.
