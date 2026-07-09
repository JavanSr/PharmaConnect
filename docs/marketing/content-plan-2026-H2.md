# APOTEKH Content & Marketing Plan — July 2026 → January 2027

**Owner:** Elihaki — remote from Singida (approval, strategy, on-camera, escalations)
**Field:** Dodoma sales rep (street visits, counter demos, trial starts, closes) —
see `hiring/field-rep-advert.md` and `hiring/field-rep-kit.md`
**Executor:** helper AI / assistant (drafting, scheduling, nurture sends, tracking)
**Written:** 2026-07-05 · Reworked 2026-07-08 for the rep-led model · Review: week 8, week 12
**This document is the single source of truth for marketing execution. The executor
follows it literally. Anything not covered here → ask Elihaki, do not improvise.**

---

## 1. Strategy

**The single outcome: 50 paying pharmacies by 5 January 2027.**

Content is not the product here — it is air support for a **two-engine sales motion**:
a field rep walking Dodoma's pharmacy streets (dense, route-based, closes at the
counter), and a national self-serve digital funnel (register → trial → pay in-app,
no human needed). Elihaki runs neither engine day-to-day — he approves, appears
on camera, and decides. Content's only jobs are:

1. **Generate demo bookings** — put proof in front of Dodoma pharmacy owners until
   they ask to see it.
2. **Convert trials** — a 14-day hard-end trial with a scripted WhatsApp nurture
   sequence ending in **self-service payment**: the owner pays inside the app via
   AzamPay STK push and access activates automatically. Content's job is to get
   them to press the button; no founder in the payment loop.
3. **Manufacture proof** — case studies and numbers from live pilots, because a
   pharmacy owner in Dodoma believes another Tanzanian pharmacy owner, not an ad.
4. **Fuel referrals** — every paying pharmacy becomes a content source and a
   referrer.

**The funnel math (work backwards from 50):**

| Stage | Rate assumed | Needed over 26 weeks | Per week |
|---|---|---|---|
| Paying pharmacies | — | 50 | ~2 |
| Trials started | ~40% trial→paid (rep-led close + nurture sequence, hard trial end) | ~125 | ~5 |
| Demos delivered | ~60% demo→trial | ~210 | ~8 |
| Demo bookings (content + outreach + referral) | ~80% show rate | ~260 | ~10 |

Ten demo bookings a week is the number that matters. The rep's street work
produces most of it (8–10 visits/day, ≥3 full demos — see the field kit);
content must reliably produce 4–5 inbound requests/week by week 8, routed to the
rep's calendar (Dodoma) or the self-serve trial (everywhere else). Every weekly
review checks this one number first.

**Positioning (never deviate):** APOTEKH is the pharmacy operating system built in
Tanzania for Tanzanian pharmacies — works offline, protects patients, and shows the
owner their money from anywhere. Motto, exactly: **"Powering Pharmacies. Protecting
Patients."**

**Primary audience:** independent retail pharmacy owners and pharmacists-in-charge
in **Dodoma** (the operating base and current launch focus; Arusha pilot
relationships remain warm leads). Secondary: ADDO operators (ADDO tier), and a
national waitlist for everyone outside the active region (capture, don't chase).
Wholesalers are a real but secondary audience — the pricing page now carries a
featured Wholesale section, so wholesale-targeted content is allowed at low volume
(≈1 piece per fortnight), always routed to the "Discuss wholesale" CTA.

**Primary channel:** WhatsApp (Status, broadcast list, 1:1 nurture). Supporting:
Instagram + Facebook (video/carousels), Google Business Profile + website posts
(search), printed one-pagers (counter-top reality of Tanzanian B2B). LinkedIn only
for credibility posts, monthly.

---

## 2. Guardrails — the executor must NEVER (read before every batch)

These come from product law in `CLAUDE.md`. Violations get content rejected.

- **Never mention EFDMS, TRA, VFD, or fiscal receipts in RETAIL content** — any
  content, caption, reply, or sales conversation aimed at retail pharmacies or
  ADDOs. Invisible by design. **One exception:** wholesale-targeted content may
  reference TRA-compliant VAT invoicing (it's in the approved wholesale pricing
  copy). If unsure which audience a piece serves, leave TRA out.
- **Never mention NHIF or insurance claims.** Not built, deliberately.
- **Never promise CPD points/credits.** Blocked until a Pharmacy Council MOU exists.
- **Wholesale content is allowed but capped** (~1 piece per fortnight), drawn only
  from the approved wholesale copy in `website/src/lib/data/pricing.ts`, CTA =
  "Discuss wholesale" → hand the conversation to Elihaki. Never quote wholesale
  pricing beyond Tsh 100,000/month, never promise the open marketplace.
- **Never state prices other than:** ADDO Tsh 15,000/mo · BASIC Tsh 39,000/mo ·
  STANDARD Tsh 55,000/mo · PREMIUM Tsh 75,000/mo · annual = 10× monthly (2 months
  free). No discounts, no "starting from", no negotiation in writing.
- **Never invent numbers, testimonials, customer names, or claims.** Only facts
  from the Claims Library (Task 0.3). If a claim isn't in the library, don't use it.
- **Never post anything containing patient information** — no prescriptions,
  no patient names, no identifiable people in pharmacy photos without consent.
- **Naming, exactly:** "Clinical Decision Support" (never "Patient Safety Suite"),
  "Owner Dashboard" (never "remote dashboard"), "Knowledge Hub", "Patient Ordering
  Portal" (never "storefront"/"e-commerce"), "APOTEKH" (never "PharmaConnect").
- **Never paraphrase the motto.** "Powering Pharmacies. Protecting Patients." — as is.
- **Website (`website/`) copy is English.** WhatsApp/Instagram/Facebook content may
  be Swahili, English, or mixed — match the register pharmacy staff actually use
  (Swahili-forward with English product terms).
- **Never publish externally without Elihaki's approval** (see Rhythm, §6).
  Drafting is autonomous; publishing is gated.

---

## 3. Phases

### Phase 0 — Foundation (Weeks 1–2) · Goal: everything the machine needs exists

The executor cannot run without assets, access, and a claims library. Nothing in
Phase 1 starts until Phase 0's acceptance criteria all pass.

**Task 0.1 — Channel setup audit**
Inventory what exists and what's missing: WhatsApp Business account (with catalog +
away messages), Instagram business profile, Facebook page, Google Business Profile,
website blog capability, link-in-bio page pointing to the waitlist form.
*Done well =* a checklist in `docs/marketing/channels.md` with, per channel: URL,
login owner, profile photo = correct logo variant (`apotekh-mark-*` from
`website/public/assets/logo/`), bio containing the exact motto + one-line offer +
demo booking link/number. Missing channels flagged for Elihaki to create (executor
never creates accounts).

**Task 0.2 — Pharmacy prospect list**
Build a spreadsheet of **Dodoma** retail pharmacies (plus the warm Arusha pilot
contacts as a separate tab): name, area, owner/PIC name if known, phone, source
(TMDA/PC public register, Google Maps, Elihaki's contacts), warm/cold, status
column (NOT_CONTACTED → CONTACTED → DEMO_BOOKED → DEMO_DONE →
TRIAL → PAYING → LOST).
*Done well =* ≥150 rows, ≥80% with a phone number, no duplicates, saved where both
Elihaki and executor can edit. This sheet is the pipeline — every metric in §6
reads from it.

**Task 0.3 — Claims Library (the anti-hallucination file)**
One page, `docs/marketing/claims-library.md`, listing every claim content may use,
each with its source: what the product verifiably does (offline dispensing, FEFO
expiry alerts at 30/21/14/7/1 days, drug interaction checking with 4 severity
levels, Owner Dashboard with today's revenue, daily close, controlled drugs
register, 14-day free trial, prices, **pay by mobile money inside the app —
M-Pesa/Tigo Pesa/Airtel STK push, instant activation**, Swahili language toggle),
plus real pilot numbers once Task 1.1 produces them.
*Done well =* every line traceable to product truth or a named pilot pharmacy's
consented data; explicitly lists the banned topics from §2 at the top; Elihaki has
signed off in writing.

**Task 0.4 — Message house**
For each of the three audiences (owner, PIC, ADDO operator): the one pain we lead
with, the 2-sentence pitch, three proof points from the Claims Library, and the
single CTA ("Book a 20-minute demo at your counter — WhatsApp [number]").
Owner leads with money (expiry losses, visibility from anywhere); PIC leads with
safety + inspection readiness (TMDA licence tracking, controlled register); ADDO
leads with simplicity + price (Tsh 15,000, works on a phone, offline).
*Done well =* fits on one page; a stranger could pitch APOTEKH from it; zero
guardrail violations; approved by Elihaki.

**Task 0.5 — Templates pack**
Reusable skeletons the executor fills weekly: WhatsApp Status template (image +
1-line hook), broadcast message template (≤6 lines, one CTA), 30–60s video script
template (hook ≤3s → pain → product moment on screen → CTA), carousel template
(5 slides: pain / agitate / product / proof / CTA), one-pager print layout per
tier (A5, price, 5 bullets, WhatsApp number, QR to website).
*Done well =* each template has a filled example that passed Elihaki's approval;
brand colours from CLAUDE.md (`pc-600 #1A6B5C` primary, correct logo files, DM Sans);
no template mentions a banned topic.

**Task 0.6 — Trial nurture sequence (written once, used ~125 times)**
Seven WhatsApp messages, exact copy, bilingual where natural:
Day 0 welcome + setup link · Day 2 "did stock intake go OK?" check · Day 5 Owner
Dashboard spotlight ("open this every morning") · Day 8 safety-catch story +
feature tip · Day 11 value recap + pricing + annual option, with the **in-app
payment path spelled out** (Settings → Subscription → enter M-Pesa number →
approve the STK push on your phone → active in seconds) · Day 13 "trial ends
tomorrow — pay in the app in under a minute, or want a 10-minute call first?" ·
Day 15 (if lapsed) grace-mode note + door left open. Payment is self-service via
AzamPay — the sequence sells the button-press, it never asks them to send money
to a person.
*Done well =* every message ≤5 lines, exactly one question or CTA each, prices
correct, no banned topics, tone = helpful local colleague not corporate SaaS;
Elihaki approved verbatim copy. Executor sends these manually per trial start date
and logs each send in the prospect sheet.

**Task 0.7 — Weekly new-premises scan** (recurring, executor, Mondays)
New pharmacies are the easiest close in the market — no incumbent system, no
migration pain. Every Monday: check the Pharmacy Council public premises register
and social media for newly registered/opening pharmacies and ADDOs (nationwide);
add each to the prospect sheet (source = "new-premises scan"); Dodoma ones go to
the rep's route, out-of-region ones get the self-serve WhatsApp opener.
*Done well =* ≥5 new rows/week with phone numbers; every Dodoma entry has a
scheduled first visit; zero duplicates against existing rows.

**Status note (2026-07-08):** Task 0.3 (Claims Library — `claims-library.md`),
Task 0.6 (nurture sequence — `trial-nurture-sequence.md`), the prospect sheet
template (`prospect-sheet-template.csv`), and the rep's message house (inside
`hiring/field-rep-kit.md`, covering Task 0.4) are drafted and await Elihaki's
sign-off. Remaining in Phase 0: channel setup (0.1 — needs account access),
filling the prospect sheet (0.2), and the visual templates pack (0.5).

### Phase 1 — Proof & presence (Weeks 3–8) · Goal: 4–5 inbound demo requests/week by week 8

**Task 1.1 — Pilot case study #1 (the cornerstone asset)**
Interview the strongest current pilot pharmacy. Capture: before-state (how they
tracked stock/expiry), 2–3 concrete numbers (e.g. "found Tsh X of stock expiring
within 30 days in the first week", "daily close takes N minutes"), one quote, one
photo at the counter (with written consent), permission note stored.
*Done well =* 400–600 word written story + a 5-slide carousel + a 45s video cut of
the owner speaking; every number consented and added to the Claims Library; the
pharmacy agreed in writing to be named.

**Task 1.2 — Launch the publishing rhythm** (recurring, weekly)
Weekly output, every week from week 3: 5 WhatsApp Status posts (Mon–Fri), 1
broadcast to the opt-in list (Fri), 2 short videos (IG/FB/Status), 2 carousels or
graphics, all drawn from the four pillars in rotation:
(a) Owner's money — expiry, dead stock, voids, revenue visibility;
(b) Patient safety — interaction catches, dose checks (anonymised, from Claims Library);
(c) Inspection-ready — licence tracking, controlled register, FEFO;
(d) Built-here — founder building in public, local proof, pilot stories.
*Done well (each week) =* all pieces drafted by Monday 10:00 for approval, published
on schedule after approval, each with one CTA, logged in the content log (date,
piece, pillar, channel, link, result).

**Task 1.3 — Demo-booking machine**
A frictionless path from any content to a booked demo: WhatsApp click-to-chat link
with a pre-filled message ("Nataka demo ya APOTEKH"), an away-message auto-reply
with 3 booking slots convention, and a one-line qualification script (pharmacy
name + area + role). Executor confirms bookings into Elihaki's calendar and the
prospect sheet.
*Done well =* from a Status view to a confirmed calendar slot in ≤3 messages;
every booking appears in the sheet with source attributed (which post/channel);
Elihaki never schedules manually.

**Task 1.4 — Print run**
Produce the A5 one-pagers (from Task 0.5) for BASIC and ADDO tiers; Elihaki carries
them to demos and leaves them at counters.
*Done well =* PDF print-ready files delivered; prices and WhatsApp number correct;
QR code tested on a low-end Android phone; Elihaki has physical copies.

**Task 1.5 — Google Business Profile + 2 website posts**
GBP filled completely (category: software company; services; photos; posts monthly).
Two 600-word posts on the website targeting "pharmacy software Tanzania" and
"pharmacy management system Dodoma" — plain English, product truths only,
waitlist CTA.
*Done well =* GBP verified and complete; posts live on `website/` (English, no
banned topics, motto exact), each internally linked to the waitlist form; titles
match the target phrases.

**Week 8 checkpoint (Elihaki + executor, 30 min):** inbound demo requests/week,
demo→trial rate, trial→paid rate, best-performing pillar and channel. Decide what
Phase 2 doubles down on. If inbound < 3/week: diagnose (reach problem vs message
problem) using the content log before changing anything.

### Phase 2 — Scale what converts (Weeks 9–16) · Goal: repeatable 10 demo bookings/week; ≥20 paying by week 16

**Task 2.1 — Double the winning channel**
Take the best performer from the week 8 checkpoint and 2× its volume; cut the worst
performer entirely. *Done well =* documented decision (what, why, evidence) in the
content log; new weekly quota reflected in Task 1.2's rhythm.

**Task 2.2 — Case studies #2 and #3**
Same spec as Task 1.1, from newly paying pharmacies — ideally one BASIC-tier shop
and one ADDO, so every prospect sees themselves. *Done well =* same criteria as 1.1;
at least one is video-led.

**Task 2.3 — Referral engine**
Simple, manual, honest: every paying pharmacy gets a personal WhatsApp ask from
Elihaki at day 30 ("which pharmacist friend should see this?") plus a shareable
referral card (image with the referrer's pharmacy name if they consent). Executor
tracks referrals in the sheet with a REFERRED_BY column.
*Done well =* the ask script + card template approved; ≥50% of paying pharmacies
asked within their first 45 days; every referral attributed. (No discount
incentives — prices are fixed; the incentive is recognition and goodwill.)

**Task 2.4 — Objection library**
From real demo/trial conversations Elihaki reports weekly, maintain a Q→A document:
"What if internet goes off?" / "My staff will resist" / "I already use a notebook" /
"Is my data safe?" / price objections. Each answer ≤4 lines, guardrail-clean, with
the content pillar it should feed.
*Done well =* ≥12 objections with approved answers by week 12; each objection has
spawned at least one content piece; the executor uses these verbatim in WhatsApp
replies.

**Task 2.5 — National waitlist capture**
Content occasionally reaches beyond Dodoma. Standard reply for out-of-region
interest: warm thanks + waitlist signup + "we onboard region by region — you'll be
first to know." *Done well =* scripted reply approved; out-of-region leads logged
separately, never promised dates, never onboarded ahead of Dodoma capacity.
(Since payment and onboarding are self-service, a motivated out-of-region
pharmacy CAN sign up — don't block them; just don't promise field support.)

**Week 12 hard checkpoint:** if paying < 15, the 50/6-month target is at risk —
Elihaki decides: extend timeline, add a second demo-giver, or narrow to the
highest-converting tier. The executor prepares the numbers; the decision is human.

### Phase 3 — Conversion sprint (Weeks 17–26) · Goal: close the gap to 50

**Task 3.1 — Annual push**
Campaign to paying monthly subscribers and closing trials: annual = 10× monthly,
2 months free, framed as "lock your price for the year." One broadcast, one
carousel, one line added to Day-11 nurture message.
*Done well =* copy approved; offer stated exactly (no invented urgency or fake
deadlines); upgrades tracked in the sheet.

**Task 3.2 — Trial win-back**
Every lapsed trial (grace-mode or expired) gets one personal re-engagement from
Elihaki's script: what changed since they left (new case studies, features), one
question about why they lapsed, one clear re-activation path.
*Done well =* 100% of lapsed trials contacted once (only once — no pestering);
reasons logged; ≥3 reactivations.

**Task 3.3 — December front-load**
Tanzanian December = holidays + retail rush; pharmacy owners have no time for
demos after ~10 Dec but big end-of-year stock pain. Front-load demo pushes into
Oct–Nov; December content shifts to "start January right" waitlist building and
year-end stock-take content (expiry checks before New Year).
*Done well =* November has the year's highest demo count; a January demo calendar
is pre-booked before 20 Dec.

**Task 3.4 — Proof wall**
Compile all consented quotes, numbers, and photos into a single "wall of proof"
page on the website + a WhatsApp-shareable album. *Done well =* ≥8 distinct
pharmacies represented; every item consented; page loads fast on 3G.

---

## 4. Inputs needed (Elihaki provides)

| Input | Needed by | Notes |
|---|---|---|
| WhatsApp Business number dedicated to APOTEKH | Week 1 | Separate from personal |
| Channel logins for executor (or a posting workflow) | Week 1 | Executor drafts; who presses "post"? Decide once |
| Pilot pharmacy consent + interview time | Week 3 | Cornerstone for Task 1.1 |
| Phone capable of decent vertical video (+ Tsh ~150k for tripod/mic, optional) | Week 3 | Owner-quote videos convert best |
| ~Tsh 100–200k/month optional boost budget | Week 5+ | Only boost proven organic winners; never cold ads |
| 30 min/week approval + 15 min/week metrics review | Always | This is the minimum human time that keeps the machine safe |
| Weekly demo-conversation notes (voice note is fine) | Weeks 3+ | Feeds the objection library — the highest-leverage input |

## 5. Risks and bottlenecks

1. **Single-rep dependency.** One person now carries the whole field engine. If
   the rep underperforms or quits, the funnel dies for weeks. Mitigations: verify
   activity weekly against admin-dashboard trial data (not the sheet alone); keep
   the field kit good enough that a replacement is productive in days; decide
   continue/replace at day 60 on data. If the rep is beating targets by week 12,
   plan rep #2 for the next town instead of stretching Dodoma's.
2. **Cheap-AI drift.** A simpler model will eventually invent a claim, quote a
   wrong price, or mention EFDMS. Mitigation is structural: Claims Library +
   guardrails §2 + human approval gate on everything external. Never remove the gate.
3. **Testimonial/consent gaps.** Using a pharmacy's name or numbers without written
   consent burns trust in a small market. No consent, no publish — ever.
4. **Trial-to-paid leakage.** The hard 14-day end only works if the nurture
   sequence actually fires. The executor logs every send; a missed Day-11 message
   is a lost sale, treat it like one.
5. **Seasonality.** December kills demos (Task 3.3 exists for this). Also watch
   TMDA inspection season chatter — inspection-readiness content spikes then.
6. **Price talk in DMs.** Owners will negotiate. The line is scripted: prices are
   fixed; annual gives 2 months free; that's the only lever. Executor never
   freelances a discount.
7. **Content outrunning product truth.** If a feature changes, the Claims Library
   must change the same week — it is versioned in the repo for exactly this reason.

## 6. Rhythm

**Daily (executor, ~45 min):**
- Morning: publish today's approved Status/post; check WhatsApp inbox; move any
  demo requests → booked slots → sheet.
- Send today's due nurture messages (check trial start dates in the sheet).
- Log everything touched in the content log / prospect sheet.

**Weekly:**
- **Mon:** executor drafts the full week's content batch → Elihaki approves/edits
  (30 min) → schedule.
- **Tue–Sat:** publish per schedule; rep walks routes and sends the 18:00 daily
  WhatsApp report; executor confirms tomorrow's inbound-demo appointments each
  evening and updates the sheet from the rep's report.
- **Fri:** metrics snapshot in the sheet — demo requests (by source), demos done,
  trials started, nurtures sent, paying total, best post. One line of commentary max.
- **Elihaki weekly voice note:** demo objections + wins → executor updates
  objection library and next week's angles.

**Monthly (60 min, Elihaki + executor):**
- Review funnel vs the §1 table. Paying count vs straight-line (≈8/month needed).
- Kill one thing that isn't working; double one thing that is.
- One new case study or proof asset shipped.
- Re-read §2 guardrails aloud. (Yes, really — drift is gradual.)

**The one question that governs everything:** *"Did we book 10 demos this week?"*
If yes, keep the machine running. If no, fix reach or message — nothing else
matters until that number is back.
