# APOTEKH Claims Library — the only claims marketing may use

Every piece of content, every rep conversation, every caption draws ONLY from
this list. If a claim is not here, it does not get published — add it here first
with a source, get Elihaki's sign-off, then use it.
Last reviewed: 2026-07-08 · Owner: Elihaki

## Banned topics (never appear in any retail-facing content)
EFDMS / TRA / VFD / fiscal receipts (exception: wholesale-audience content may
say "TRA-compliant VAT invoicing") · NHIF or insurance claims · CPD points/credits ·
"open marketplace" · competitor names in negative comparisons · any patient data,
photo, or story identifying a patient · invented numbers or testimonials ·
discounts of any kind.

## Product claims (verified against the codebase)

| # | Claim | Source of truth |
|---|---|---|
| 1 | Works fully offline — dispensing, stock updates, and safety checks run with no internet and sync automatically when connectivity returns | Frontend SW + IndexedDB write queue (CLAUDE.md offline architecture) |
| 2 | Drug interaction checking with 4 severity levels (MINOR → CONTRAINDICATED) on every plan, including ADDO — the Clinical Decision Support Suite is never gated by price | Tier feature matrix, patient-safety module |
| 3 | Contraindication alerts for 8 patient status flags; dose calculator; NCD usage hints | Clinical suite (CLAUDE.md) |
| 4 | No patient names or IDs are ever stored — safety checks run on an anonymous session, by design | Session-based patient safety (CLAUDE.md key decisions) |
| 5 | FEFO enforcement with expiry alerts firing at 30/21/14/7/1 days before expiry | expiry-alerts job thresholds |
| 6 | Stock intake warns live if a received batch expires within 60 days | StockIntakePage expiry gate |
| 7 | Barcode scanning with a phone camera — no extra hardware | Tier matrix |
| 8 | Owner Dashboard: today's revenue, stock, and alerts live on the owner's phone, anywhere | Dashboard rules (Today's Revenue first card) |
| 9 | Daily close report: revenue, transaction count, payment breakdown (cash/mobile money) | dispensing/daily-close |
| 10 | Controlled drugs register ready for inspection | dispensing/controlled-register |
| 11 | TMDA + Pharmacy Council licence tracking with expiry reminders (BASIC and above); DLDM tracker on ADDO | Compliance tracker tiers |
| 12 | Pay inside the app by mobile money — M-Pesa, Tigo Pesa, Airtel Money, Halopesa (STK push); subscription activates automatically in seconds | AzamPay module |
| 13 | 14-day free trial, no payment details required to start | Trial mechanic |
| 14 | Prices: ADDO 15,000 · BASIC 39,000 · STANDARD 55,000 · PREMIUM 75,000 Tsh/month; 3-month = 3×; 6-month = 5.5× (save 8%); annual = 10× (2 months free); Wholesale 100,000 | SUBSCRIPTION_PRICE_TABLE |
| 15 | Reports export to CSV and PDF (expiry, dispensing, stock movement, revenue) | Reports module |
| 16 | English and Swahili interface (key screens) | i18n layer |
| 17 | Order stock from suppliers via WhatsApp with a confirmation link the supplier opens with no account | Supplier Portal (Tier 2) |
| 18 | Every void, edit, and safety override is permanently logged — tamper-proof by design | override_log DB trigger, audit trails |

## Pilot / traction claims
*(EMPTY until the pilot pharmacy interview — Task 1.1. Every entry needs: the
number, the pharmacy's written consent, and the date collected. Placeholder
examples of the FORM they must take, not usable content:)*
- "[Pharmacy name], Dodoma found Tsh ___ of stock expiring within 30 days in
  their first week on APOTEKH" — consent form signed __/__/2026
- "Daily close at [pharmacy] takes _ minutes, down from _" — consent __/__/2026

## Approved framing lines
- Motto, exactly: **"Powering Pharmacies. Protecting Patients."**
- "Built in Tanzania for how Tanzanian pharmacies actually work."
- "Patient safety is never a paid extra."
- "The pharmacy runs even when the network doesn't."
- Naming: "Clinical Decision Support" · "Owner Dashboard" · "Knowledge Hub" ·
  "Patient Ordering Portal" · always "APOTEKH", never "PharmaConnect".
