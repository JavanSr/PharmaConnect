# CODEX_TASKS.md — PharmaConnect Marketing Website

## Context

This task file instructs Codex to build the **public-facing marketing website** for
PharmaConnect System. It is a **separate Next.js app** scaffolded inside
`/website/` at the root of this monorepo. It does NOT touch the existing pharmacy
management app in `/src/`, `/backend/`, or `/prisma/`.

**Founder:** Elihaki M. Y. Javan — Pharmaceutical Technologist, Arusha, Tanzania  
**Primary contact:** elihaki.yusuph@gmail.com · +255 764 591 374  
**Brand primary colour:** `#0EA5E9` (sky-500 — swap this one hex to recolour everything)  
**Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS v3 · Framer Motion · Resend

## Dependency isolation note

Per `CLAUDE.md`, `AGENTS.md`, and `DECISIONS.md`, the public marketing website must not
destabilize the existing pharmacy management app. Website packages are therefore owned in
`/website-dependencies/`, with `/website/node_modules` linked to that folder. Keep source
code in `/website/`, and install or update website-only packages from `/website-dependencies/`.

---

## TASK 0 — Scaffold the project

**Directory:** `/website/`

```bash
cd website
npx create-next-app@14 . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-experimental-app
```

Then install all required dependencies in one pass:

```bash
npm install framer-motion react-hook-form @hookform/resolvers zod \
  resend next-intl contentlayer next-contentlayer \
  lucide-react @vercel/analytics fuse.js \
  recharts next-sitemap clsx tailwind-merge
npm install -D @types/node
```

Add `/website/.env.local` with this exact shape (values to be filled by operator):

```env
RESEND_API_KEY=
RESEND_FROM=hello@pharmaconnect.tz
RESEND_NOTIFY=elihaki.yusuph@gmail.com
INVESTOR_PAGE_PASSWORD=
NEXT_PUBLIC_SITE_URL=https://pharmaconnect.tz
```

**Acceptance:** `npm run dev` starts at `localhost:3000` with the default Next.js
page. No TypeScript errors.

---

## TASK 1 — Brand tokens: Tailwind config + CSS variables

**File:** `website/tailwind.config.ts`

Replace the default theme.extend.colors section with the full brand palette derived
from the primary hex `#0EA5E9`. All palette values MUST be expressed as CSS custom
properties so that the primary can be swapped by changing one variable:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          dark:    'var(--color-primary-dark)',
          mid:     'var(--color-primary-mid)',
          light:   'var(--color-primary-light)',
          lightest:'var(--color-primary-lightest)',
        },
        amber:  '#D97706',
        slate:  '#1E293B',
        mist:   '#F8FAFB',
      },
      fontFamily: {
        serif: ['DM Serif Display', 'Georgia', 'serif'],
        sans:  ['DM Sans', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        tight: '-0.5px',
        display: '-1px',
      },
    },
  },
  plugins: [],
}
export default config
```

**File:** `website/src/app/globals.css`

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Change this ONE value to recolour the entire site */
  --color-primary-raw: 14 165 233;          /* #0EA5E9 as R G B */
  --color-primary:        #0EA5E9;
  --color-primary-dark:   #0A7DB5;          /* darken 20% */
  --color-primary-mid:    #3AB8F0;          /* +15% lightness */
  --color-primary-light:  rgba(14,165,233,0.08);
  --color-primary-lightest: rgba(14,165,233,0.04);
}

body {
  font-family: 'DM Sans', system-ui, sans-serif;
  background-color: #F8FAFB;
  color: #1E293B;
  line-height: 1.75;
}
```

**Acceptance:** All `text-primary`, `bg-primary`, `bg-primary-dark` etc. Tailwind
classes resolve correctly. Fonts load from Google Fonts (check Network tab).

---

## TASK 2 — Logo SVG component

**File:** `website/src/components/Logo.tsx`

Build a pure SVG logo mark + wordmark as a React component.

**Logo mark specification:**
- Pharmacy cross with equal arms. Arm width = W. Arm length = 3W. Total span = 7W.
  Use W=10 so the mark fits in a 70×70 viewBox.
- Four tip nodes: filled circles at the exact terminal of each arm (top/bottom/left/right).
  Node diameter = arm width (10px). Centres at: (35,10), (35,60), (10,35), (60,35).
- Centre node: slightly larger (diameter 14px), white fill, ring stroke in primary.
  Centre at (35,35).
- Cross fill: `var(--color-primary)`. Tip nodes fill: `var(--color-primary)`.
- The cross is drawn as a single path or two overlapping rectangles forming a plus.

**Wordmark:** "PharmaConnect" in DM Serif Display. "Pharma" in `var(--color-primary-dark)`,
"Connect" in `var(--color-primary-mid)`. The two halves run together with no space.

**Props interface:**
```typescript
interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'    // sm=24, md=32, lg=48, xl=64 (mark height)
  variant?: 'full' | 'mark' | 'white'  // full=mark+wordmark, mark=SVG only, white=white version
  className?: string
}
```

**White variant:** all fills become white (for dark backgrounds).

Also export a `LogoFavicon` component: mark-only SVG on a primary colour square
background, suitable for use as favicon `<link rel="icon">`.

**File:** `website/src/app/layout.tsx` — add the favicon via:
```tsx
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```
And write the favicon SVG to `website/public/favicon.svg` (mark-only, primary background).

**Acceptance:** Logo renders at all four `size` values. White variant clearly visible
on a `bg-primary-dark` background. Mark-only (favicon) variant is square and crisp.

---

## TASK 3 — Global Navigation component

**File:** `website/src/components/Nav.tsx`

Sticky header. Transparent on page top → backdrop-blur + white/90% on scroll
(use a scroll event listener with `useEffect`).

**Desktop layout (≥1024px):**
- Left: `<Logo size="sm" variant="full" />`
- Centre: nav links — Platform | Pricing | Roadmap | About | Blog
  Each link: DM Sans 500, 14px, slate, hover → primary colour, transition 150ms.
- Right: `<LanguageToggle />` + "Get early access" `<Button variant="primary" size="sm">`
  linking to `/contact#waitlist` + "For investors" `<Button variant="ghost" size="sm">`
  linking to `/investors`.

**Mobile layout (<1024px):**
- Left: `<Logo size="sm" variant="mark" />`
- Right: hamburger icon (Lucide `Menu`, 24px)
- Clicking hamburger opens a full-screen overlay (`position: fixed, inset: 0, z-50`)
  with the full nav links stacked vertically, language toggle, and CTAs.
  Close with `X` icon or backdrop click.

Use `next/link` for all navigation. Active link gets `text-primary` treatment.

**Acceptance:** Scroll 100px down — header gains blur. Resize to 360px — hamburger
appears. All links navigate correctly.

---

## TASK 4 — Footer component

**File:** `website/src/components/Footer.tsx`

Four-column grid on desktop, stacked on mobile. Background: slate (`#1E293B`).
All text white or white/60.

```
Col 1: <Logo variant="white" size="sm" />
        Tagline (EN): "The pharmacy-side operating system for better pharmaceutical services"
        Tagline (SW): "Mfumo wa uendeshaji wa maduka ya dawa kwa huduma bora"
        "Arusha, Tanzania · April 2026"

Col 2: Platform
        Links to /platform and all 12 module slugs (use a MODULES constant)

Col 3: Company
        About | Blog | Investors | Partners | Contact

Col 4: Legal
        Privacy Policy | Terms of Service
        "PDPC Registration: pending · April 2026"
        "TRA VFD Integration: in progress"
```

Bottom bar (full-width, border-top white/10):
`© 2026 PharmaConnect System · Elihaki M. Y. Javan ·
 Registered under Tanzania Companies Act Cap 212 (in progress)`

Language toggle: repeat `<LanguageToggle />` in the bottom bar.

---

## TASK 5 — Shared UI primitive components

Create each in `website/src/components/ui/`:

### Button.tsx
```typescript
interface ButtonProps {
  variant: 'primary' | 'ghost' | 'outline' | 'danger'
  size: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  href?: string          // renders as <Link> if provided
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}
```
Primary: primary bg, white text, rounded-lg.
Ghost: transparent bg, primary text, no border.
Outline: white bg, primary border 1.5px, primary text.
Danger: red-600 bg, white text.
All variants: hover state shifts opacity or shade 10%, transition 150ms.
If `href` is provided, wrap in `next/link`.

### Badge.tsx
```typescript
type BadgeVariant = 'phase1'|'phase2'|'phase3'|'phase4'|'coming-soon'|'new'|'warning'|'sponsored'
```
phase1: primary. phase2: amber. phase3: slate. phase4: slate/50.
coming-soon: slate/80. new: green-600. warning: amber. sponsored: amber with lock icon.

### StatCard.tsx
Displays an animated count-up number + label. Uses Framer Motion `useInView` to
trigger the animation when the card scrolls into view.
Props: `value: string | number`, `label: string`, `suffix?: string`.
For values like "USD 243M" or "Jan 2026", animate the number portion only.

### AnimatedSection.tsx
Framer Motion wrapper. Fades in + slides up 24px on scroll into view.
Props: `children`, `delay?: number` (for stagger), `className?: string`.
Use `viewport={{ once: true, margin: '-80px' }}`.

### LanguageToggle.tsx
Two-pill toggle: EN | SW. Active pill gets primary bg + white text.
Integrates with `next-intl` — calls `router.replace` with the alternate locale.

---

## TASK 6 — Data constants (MODULES and PHASES arrays)

**File:** `website/src/lib/data/modules.ts`

Define the full 12-module data structure. This is the single source of truth used
by all module grids, cards, and dynamic routes.

```typescript
export interface Module {
  id: string           // 'M01' – 'M12'
  slug: string         // kebab-case for URL routing
  name: string
  description: string  // one sentence
  phase: 1 | 2 | 3 | 4
  icon: string         // Lucide icon name, e.g. 'Package'
  features: string[]   // full feature list for /platform/[slug]
  howItWorks: string   // paragraph for accordion
  acceptanceCriteria: string[]
  relatedModules: string[]  // array of module slugs
}
```

Populate all 12 modules exactly as defined in the PharmaConnect TOR / roadmap:

| ID  | Slug                     | Name                              | Phase |
|-----|--------------------------|-----------------------------------|-------|
| M01 | inventory                | Inventory Management              | 1     |
| M02 | nhif-claims              | NHIF Claims Processing            | 1     |
| M03 | patient-safety           | Patient Safety                    | 1     |
| M04 | compliance-tracker       | Compliance Tracker                | 1     |
| M05 | knowledge-hub            | Knowledge Hub                     | 1     |
| M06 | cpd-basic                | CPD Basic                         | 1     |
| M07 | analytics                | Analytics & Reporting             | 2     |
| M08 | stock-exchange           | Stock Exchange                    | 2     |
| M09 | b2b-ordering             | B2B Ordering                      | 2     |
| M10 | tmda-integration         | TMDA Integration                  | 3     |
| M11 | gothomis-linkage         | GoT-HoMIS Linkage                 | 3     |
| M12 | ussd-gateway             | USSD Gateway                      | 4     |

Write detailed `features`, `howItWorks`, and `acceptanceCriteria` for each module
drawing from the PharmaConnect TOR. Minimum 5 features per module.

---

## TASK 7 — Root layout and i18n setup

**File:** `website/src/app/layout.tsx`

```tsx
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Analytics } from '@vercel/analytics/react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'PharmaConnect — Better Pharmaceutical Services for Tanzania',
  description: 'The pharmacy-side operating system for Tanzania\'s 14,000+ pharmacies and ADDOs under the 2026 UHI mandate. NHIF claims, patient safety, CPD, and compliance — all in one platform.',
  keywords: 'Tanzania pharmacy software, NHIF claims, UHI compliance, pharmaceutical management, Arusha, East Africa',
  openGraph: {
    type: 'website',
    locale: 'en_TZ',
    url: process.env.NEXT_PUBLIC_SITE_URL,
    siteName: 'PharmaConnect',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', site: '@PharmaConnect' },
}
```

Set up `next-intl` with two locales: `en` (default) and `sw`.

**Files:**
- `website/src/messages/en.json` — all static UI strings in English
- `website/src/messages/sw.json` — all static UI strings in Swahili (translate fully)
- `website/src/i18n.ts` — next-intl config
- `website/next.config.ts` — add next-intl plugin wrapping contentlayer plugin

Key strings to translate (both files must have identical key structure):
- All nav labels, CTAs, section headings
- All hero copy, stat card labels
- All form labels and placeholders
- Footer copy, legal text
- Swahili tagline: "Mfumo wa uendeshaji wa maduka ya dawa kwa huduma bora"

**Acceptance:** Switching to `/sw` renders all static text in Swahili.

---

## TASK 8 — Homepage: Hero section (Section 2)

**File:** `website/src/app/page.tsx` (and extracted sub-components)

Build the hero section per specification:

**Background:** mist (`#F8FAFB`) with diagonal line pattern. Implement as an SVG
`<pattern>` element in a `<defs>` block embedded in the section, or as a CSS
`repeating-linear-gradient`:
```css
background-image: repeating-linear-gradient(
  45deg,
  transparent,
  transparent 27px,
  rgba(var(--color-primary-raw), 0.03) 27px,
  rgba(var(--color-primary-raw), 0.03) 28px
);
```

**Left column content:**
```tsx
<p className="font-mono text-xs text-primary tracking-widest uppercase">
  January 26, 2026 — Tanzania launched universal health insurance
</p>
<h1>  {/* DM Serif Display, 56px desktop / 36px mobile */}
  The operating system for{' '}
  <span className="text-primary">better pharmaceutical services</span>
</h1>
<p>  {/* 18px, slate/70, line-height 1.75 */}
  14,000+ pharmacies and ADDOs across Tanzania must now process NHIF claims...
</p>
<div className="flex gap-3">
  <Button variant="primary" href="/contact#waitlist">Request early access</Button>
  <Button variant="ghost" href="#demo">See how it works →</Button>
</div>
{/* Trust row */}
<div className="trust-strip">
  <span>Seeking institutional partnerships</span>
  Pharmacy Council of Tanzania · TAPHATA · PST
</div>
```

**Right column — App UI Mockup:**
Build as a styled HTML/SVG component (NOT a screenshot). Create
`website/src/components/AppMockup.tsx`.

The mockup shows a simplified dispensing screen in a device frame:
- Rounded rectangle frame: 1.5px border, primary/20 colour, `rotate(2deg)` transform
- Inside: white card bg, 16px padding
- Row 1: "Patient UUID" label + `PC-2026-04721` in JetBrains Mono, primary colour
- Row 2: Amber alert card "⚠ MODERATE interaction detected — Warfarin + Aspirin"
  with pulsing border animation (Framer Motion `animate={{ borderColor: [...] }}`)
- Row 3: Green pill "Member verified" (NHIF status)
- Rows 4-6: Three dispensing line items, each with a "FEFO" orange badge

Animate with Framer Motion: each card slides in from right with stagger (0.1s delay each).
The interaction alert pulses its border once on mount.

**Marquee strip** (below hero, full-bleed primary-dark background):
Continuously scrolling text using CSS animation (`@keyframes marquee`).
Content: "NHIF Claims · Drug Interaction Checking · Expiry Monitoring · CPD Tracking ·
Compliance Alerts · Inventory Management · Patient Safety · TMDA Integration ·
Knowledge Hub · Stock Exchange · B2B Ordering · Analytics ·" (duplicate for seamless loop).

---

## TASK 9 — Homepage: Urgency Numbers section (Section 3)

**File:** Add to `website/src/app/page.tsx`

Full-bleed `bg-primary-dark` section. Four `<StatCard>` components in a horizontal
grid (2-col on mobile, 4-col on desktop):

| Stat       | Label                                              |
|------------|----------------------------------------------------|
| 14,000+    | Pharmacies and ADDOs under the UHI mandate         |
| 187        | Facilities currently using digital NHIF claims     |
| USD 243M   | Tanzania pharmaceutical market (2024, 6.1% CAGR)  |
| Jan 2026   | UHI launch date — the compliance clock is running  |

`<StatCard>` must animate count-up on scroll into view (use `useInView` from
Framer Motion). For string values like "Jan 2026", skip the count-up and just
fade in.

Number typography: DM Serif Display 48px white. Label: DM Sans 13px white/65.
Thin horizontal rule between number and label.

---

## TASK 10 — Homepage: Core Framing Statement (Section 4)

**File:** Add to `website/src/app/page.tsx`

White background section. Full-width centred text block styled as a pull quote:
- Giant opening quotation mark: DM Serif Display 120px, primary colour, `line-height: 0`
- Quote text: DM Serif Display 24px, slate, max-width 800px, centred
- Attribution: DM Sans 14px, slate/50, italic

Quote text verbatim:
> "On January 26, 2026, Tanzania's Universal Health Insurance launch made health coverage
> mandatory for every citizen — forcing 14,000+ accredited pharmacies and ADDOs to process
> NHIF claims. While generic POS systems focus only on sales and inventory, PharmaConnect
> is the pharmacy-side operating system designed for better pharmaceutical services."

Attribution: `— PharmaConnect Strategic Framing, April 2026`

Below the quote: two-column cards (1-col on mobile):
- Left (primary-light bg): "For pharmacy owners" + 3 bullet points
- Right (slate/5 bg): "For pharmacists and technicians" + 3 bullet points

---

## TASK 11 — Module grid components + Phase toggle

**File:** `website/src/components/ModuleCard.tsx`
**File:** `website/src/components/PhaseToggle.tsx`

### ModuleCard
Props: `module: Module`, `isFiltered?: boolean`

Card design:
- White bg, 1px border slate/10, rounded-xl, p-6, hover → shadow-md transition
- Top-right: `<Badge variant={`phase${module.phase}`} />` showing "Phase N"
- Module number: JetBrains Mono, 12px, slate/50 — e.g. "M01"
- Lucide icon: 24px, primary colour. Dynamically import the icon from `lucide-react`
  using `module.icon` string.
- Module name: DM Sans 500, 16px, slate
- Description: DM Sans 400, 14px, slate/65, line-clamp-2
- Phase 1: card is fully clickable → `next/link` to `/platform/${module.slug}`
- Phase 2–4: overlay div `position: absolute inset: 0` with `bg-primary-dark/85 backdrop-blur-sm`
  centered text "Phase N — Coming soon" in white. The base card is still visible beneath.

### PhaseToggle
Props: `activePhase: number | null`, `onChange: (phase: number | null) => void`

Four pills: "All" | "Phase 1" | "Phase 2" | "Phase 3 & 4"
Active pill: primary bg white text. Inactive: transparent, slate/50 text, border.
Clicking "All" shows all 12 modules.

### Homepage Section 5 — Module Grid
```tsx
'use client'
// Phase state managed here
// Filter MODULES array by activePhase
// Render 3-col grid on desktop
// "Full roadmap →" link below grid → /roadmap
```

---

## TASK 12 — Homepage: Patient Safety Centrepiece (Section 6)

**File:** Add to `website/src/app/page.tsx`

Two-column layout, 50/50 split (stacked on mobile).

**Left column — text:**
- Eyebrow: "The founder's original vision" (JetBrains Mono 12px, primary)
- H2: "Patient safety at every dispensing event"
- Body paragraph about no community pharmacy currently checking interactions
- Three feature rows with Lucide icons (`Shield`, `AlertTriangle`, `Lock`):
  1. "Drug interaction checking — MINOR through CONTRAINDICATED severity"
  2. "Contraindication alerts — pregnancy, elderly, renal, allergy"
  3. "Anonymous patient UUID — no names, no national IDs, PDPC-compliant"
- Blockquote: `"I have seen preventable harm happen. PharmaConnect was built to stop it."`
  Attribution: `— Elihaki M. Y. Javan, Founder & Pharmaceutical Technologist`
  Style: left border-l-4 primary, pl-4, italic, DM Serif Display

**Right column — Severity Spectrum SVG diagram:**

Build as `website/src/components/SeveritySpectrum.tsx`. Four horizontal bars:

| Severity        | Colour         | PIN required? |
|-----------------|----------------|---------------|
| MINOR           | `#FCD34D`      | No            |
| MODERATE        | `#D97706`      | No            |
| MAJOR           | `#EF4444`      | Yes           |
| CONTRAINDICATED | `#991B1B`      | Yes           |

Each bar: icon (Lucide `AlertCircle`), severity label (JetBrains Mono), 
description text, optional "PIN required" badge.

Animate: bars slide in from left on scroll into view, 0.1s stagger between each.

---

## TASK 13 — Homepage: NHIF Claims Flow (Section 7)

**File:** Add to `website/src/app/page.tsx`

Background: mist. Header + subhead as specified.

Build `website/src/components/NhifFlow.tsx` — a 5-step horizontal process diagram:

Steps (render as connected cards with arrow connectors between them):
1. **Verify** — Patient presents NHIF card → Member verified via Breeze API (< 3 sec)
2. **Dispense** — Drug dispensed → ICD-10 code suggested
3. **Validate** — Claims scrubber validates all 4 rules
4. **Submit** — Batch submitted via POST /SubmitFolios at end of day
5. **Track** — Status tracked hourly → rejected claims flagged

On mobile: make this horizontally scrollable (`overflow-x: auto`, `scroll-snap-type: x mandatory`).

Below the flow diagram: amber background callout box:
```
"Target: ≥70% NHIF claims success rate across pilot pharmacies by end of Phase 1"
```
With a visual progress bar set at 0% (showing the target as a marker at 70%).

---

## TASK 14 — Homepage: Pricing section (Section 8)

**File:** `website/src/components/PricingCard.tsx`
**File:** `website/src/lib/data/pricing.ts`

Define pricing tiers in `pricing.ts`:

```typescript
export const TIERS = [
  {
    id: 'free-addo',
    name: 'Free ADDO',
    price: 0,
    currency: 'TZS',
    period: 'month',
    features: ['Basic inventory management', 'Compliance alerts', 'NHIF member verification', 'Offline mode', 'SMS alerts'],
    isPopular: false,
    cta: 'Get started free',
  },
  {
    id: 'addo-plus',
    name: 'ADDO Plus',
    price: 25000,
    // ...
  },
  {
    id: 'standard',
    name: 'Standard Pharmacy',
    price: 67500,  // midpoint of 60k-75k
    isPopular: true,
    // ...
  },
  {
    id: 'premium',
    name: 'Premium Pharmacy',
    price: 107500, // midpoint of 95k-120k
    // ...
  },
  {
    id: 'wholesale',
    name: 'Wholesale Distributor',
    price: 240000, // midpoint of 180k-300k
    // ...
  },
]
```

`<PricingCard>` props: `tier: Tier`, `isPopular?: boolean`

Popular card: 2px primary border, "Most popular" badge top-right.
Price display: DM Serif Display 40px for the number, TZS label small beside it.
Annual option below price: `"TZS X/year — save ~17%"` in slate/50.
Feature list: checkmark icon (Lucide `Check`, primary colour) per item.

Render all 5 cards in a horizontal scroll container on mobile
(`scroll-snap-type: x mandatory`, each card `scroll-snap-align: start`).

Competitor comparison table below pricing:

| Feature              | DukaDawa | Stawi Biz | PharmaConnect |
|----------------------|----------|-----------|---------------|
| NHIF claims          | ✗        | Partial   | ✔ Phase 1     |
| Drug interactions    | ✗        | ✗         | ✔             |
| CPD tracking         | ✗        | ✗         | ✔             |
| Patient safety       | ✗        | ✗         | ✔             |
| Offline-first        | Partial  | ✗         | ✔             |

Style: no borders except bottom rule per row, DukaDawa/Stawi ✗ in red/30, 
PharmaConnect ✔ in primary.

---

## TASK 15 — Homepage: Founder section (Section 9)

**File:** Add to `website/src/app/page.tsx`

Two-column layout. Left: circular photo placeholder (180px diameter, primary-light bg,
"EMJ" initials in primary DM Serif Display 48px, centered). Right: text.

H2: "Built by a pharmacist who has seen the problem firsthand"

Bio text as specified. Four credential badges in a 2×2 grid:
- `<Hospital>` icon: "Pharmacy In-Charge — Lindi Regional Hospital"
- `<Network>` icon: "National Supply Chain Reviewer — JSI/UBAB & GFF"
- `<Users>` icon: "Active TAPHATA Member"
- `<MapPin>` icon: "Field experience — 4+ Tanzanian regions"

Each badge: icon + label in a small pill card (slate/5 bg, border slate/10).

Blockquote below badges:
> "PharmaConnect is not a startup idea. It is the tool I needed and could not find.
> So I decided to build it."

---

## TASK 16 — Homepage: Partners, Knowledge Hub preview, CTA form (Sections 10-12)

### Section 10 — Institutional Partners
Four partner cards in a horizontal row (2-col on mobile):
PC · PST · TAPHATA · NHIF
Each: 80px circular placeholder (slate/10 bg, initials) + name + one-line role.
Note: "NHIF Breeze API accreditation initiated · April 2026"

### Section 11 — Knowledge Hub Preview
Three article preview cards (from MDX seed data, hardcoded initially).
Background: primary-lightest.
Each card: category `<Badge>` + title + 2-line excerpt + reading time + "Read →" link.

### Section 12 — Final CTA / Waitlist form
Background: primary-dark. White text.

Build `website/src/components/ContactForm.tsx` with `variant="pilot"`:
```
Pharmacy name | Owner name | Phone (+255 prefix) | Type (select) | Submit
```

On submit: POST to `/api/waitlist` route (Task 21).
On success: show a green success message "You're on the list — we'll be in touch within 48 hours."
On error: show red error with retry.

Use `react-hook-form` + `zod` for validation:
- pharmacy name: required, min 3
- owner name: required, min 3
- phone: required, regex `/^\+?255[0-9]{9}$/`
- type: required, one of ADDO | Retail | Wholesale

---

## TASK 17 — /platform page and /platform/[module] dynamic routes

**File:** `website/src/app/platform/page.tsx`

Full-page version of the module grid. Show all 12 modules (no default filter).
Phase toggle bar present but defaults to "All".
Phase 2–4 modules show "Coming soon" overlay + inline email capture:
`<input placeholder="Notify me when Phase X launches" />` → POST to `/api/notify`.

**File:** `website/src/app/platform/[module]/page.tsx`

Use `generateStaticParams()` to pre-render all 12 module pages:

```typescript
export async function generateStaticParams() {
  return MODULES.map(m => ({ module: m.slug }))
}
```

Page structure:
1. Breadcrumb: Platform → [Module Name]
2. Module header: phase badge + M-number + icon + name + one-sentence description
3. "What it does" accordion (Framer Motion `AnimatePresence`)
4. Feature list with icons
5. "How it works" accordion
6. "Acceptance criteria" collapsible (collapsed by default, for technical readers)
7. Related modules: linked `<ModuleCard mini>` components
8. CTA: "Join the pilot →" button

Generate `metadata` dynamically for each module page (title, description, og:image).

---

## TASK 18 — /pricing page

**File:** `website/src/app/pricing/page.tsx`

Expand the homepage pricing section into a full page:

1. **Toggle:** Monthly / Annual billing. Annual = monthly × 11 (one month free).
   Manage with `useState`. Pass billing period to `<PricingCard>`.

2. **All five tier cards** with complete feature lists (min 8 features each).

3. **Full feature comparison table:**
   Rows = all major features. Cols = all 5 tiers.
   Use `✔` / `✗` / `Partial` values. Sticky first column on mobile.

4. **FAQ section** — 6 questions from spec. Build as an accordion:
   - `useState` tracks open question index
   - Framer Motion `AnimatePresence` for smooth expand/collapse

5. **Competitor comparison table** (same as homepage but more detailed).

6. **CTA block** → `/contact#waitlist`

---

## TASK 19 — /roadmap page

**File:** `website/src/app/roadmap/page.tsx`
**File:** `website/src/lib/data/phases.ts`

Build natively (no iframe). Import `MODULES` data. Structure:

1. Status badge: "Phase 1 — Pilot active" in primary colour
2. Design principles summary (5 pills/badges):
   Privacy-by-design · Offline-first · USSD-compatible · NHIF from Phase 1 · GoT-HoMIS linkage
3. Strategic framing paragraph (verbatim from TOR)
4. Phase timeline: four phase blocks, each containing its module cards
   Phase 1: primary. Phase 2: amber. Phase 3: slate-600. Phase 4: slate-400.
5. Each phase block: phase number + title + date range + module list
6. Module items: M-number badge + name + status indicator (live/pilot/planned/future)

This replaces the standalone roadmap HTML file without loss of content.

---

## TASK 20 — /about, /blog, /blog/[slug] pages

### /about — `website/src/app/about/page.tsx`
Three sections as specified:
1. Mission & Vision with the UHI strategic framing paragraph
2. Full founder section (expanded from homepage)
   Include "Actively recruiting" table with two roles + equity/contact details
3. Company legal details (Cap 212, PDPC status, BRELA status)

### Blog setup with Contentlayer
**File:** `website/contentlayer.config.ts`

```typescript
import { defineDocumentType, makeSource } from 'contentlayer/source-files'

export const Article = defineDocumentType(() => ({
  name: 'Article',
  filePathPattern: `articles/**/*.mdx`,
  contentType: 'mdx',
  fields: {
    title:       { type: 'string',  required: true },
    date:        { type: 'date',    required: true },
    category:    { type: 'enum', options: ['Regulatory','Clinical','Technical','Opinion'], required: true },
    readingTime: { type: 'number',  required: true },
    author:      { type: 'string',  required: true },
    isSponsored: { type: 'boolean', default: false },
    excerpt:     { type: 'string',  required: true },
  },
  computedFields: {
    slug: { type: 'string', resolve: doc => doc._raw.flattenedPath.replace('articles/', '') },
    url:  { type: 'string', resolve: doc => `/blog/${doc._raw.flattenedPath.replace('articles/', '')}` },
  },
}))
```

### 5 seed articles
Write full MDX content for each in `website/content/articles/`:

1. `uhi-mandate-pharmacy-guide.mdx` — 800 words, category: Regulatory
2. `nhif-breeze-api-pharmacy-owners.mdx` — 600 words, category: Technical
3. `drug-interactions-tanzanian-dispensers.mdx` — 1000 words, category: Clinical
4. `tmda-inspection-readiness-2026.mdx` — 700 words, category: Compliance (add this to enum)
5. `patient-safety-first-vision.mdx` — 500 words, category: Opinion

Each article must have a "## Muhtasari wa Kiswahili" (Swahili Summary) section
at the bottom (minimum 3 sentences).

### /blog — `website/src/app/blog/page.tsx`
- Category filter (client component)
- Client-side search with Fuse.js
- Article grid: `<ArticleCard>` components. Sponsored articles show `<Badge variant="sponsored">` — non-hideable.

### /blog/[slug] — `website/src/app/blog/[slug]/page.tsx`
- Generate static params from all articles
- Render MDX with custom components (callout boxes, code blocks)
- "Share this article" row (copy URL button)
- Related articles sidebar

---

## TASK 21 — /investors and /partners pages

### /investors — `website/src/app/investors/page.tsx`
Gate mechanism:
1. Page first renders a gate form: investor name + email → POST to `/api/investor-access`
2. API route sends the `INVESTOR_PAGE_PASSWORD` via Resend to the submitted email
3. A second form on the same page: "Enter access code" → validates against the password
4. On success: sets a `pharmaconnect_investor_access` cookie (httpOnly, 24h expiry)
5. Middleware checks this cookie to reveal full content

Full investor content (behind gate):
- Executive summary
- Financial snapshot (revenue targets by phase)
- Unit economics table (LTV:CAC for all 4 tiers)
- Funding targets table (FUNGUO, TEF, i3, HTHA, angel)
- Use of funds donut chart (Recharts `PieChart`)
- Equity structure table
- Document download links (PDFs in `/public/docs/`)
- Founder contact

### /partners — `website/src/app/partners/page.tsx`
Three sections as specified. Partner inquiry form → Resend.

---

## TASK 22 — /contact page

**File:** `website/src/app/contact/page.tsx`

Three tabs (client component, `useState` for active tab):
- "Join the pilot" — `<ContactForm variant="pilot" />`
- "Investor inquiry" — `<ContactForm variant="investor" />`
- "Partnership inquiry" — `<ContactForm variant="partner" />`

Tab styling: underline-style tabs, active = primary underline + primary text.

Below tabs: direct contact details:
```
elihaki.yusuph@gmail.com · +255 764 591 374
Arusha, Tanzania
@PharmaConnect
"We respond within 48 hours"
```

---

## TASK 23 — API routes (Resend integration)

Create these Route Handlers in `website/src/app/api/`:

### `waitlist/route.ts`
- Validates body with Zod schema (pharmacyName, ownerName, phone, type)
- Sends confirmation email to submitter via Resend
- Sends notification email to `process.env.RESEND_NOTIFY`
- Returns `{ success: true }` or error JSON

### `contact/route.ts`
- Accepts `variant: 'investor' | 'partner'` in body
- Validates and routes to appropriate Resend template
- Same dual-email pattern (confirmation + notification)

### `investor-access/route.ts`
- Receives `{ name, email }`
- Sends password from `INVESTOR_PAGE_PASSWORD` env var via Resend
- Returns `{ sent: true }`

### `notify/route.ts`
- Receives `{ email, phase }` for Phase 2–4 module notifications
- Stores in Vercel KV (or flat JSON in `/tmp/` for MVP)

All routes: return proper HTTP status codes. Never expose env vars in responses.

---

## TASK 24 — i18n: Swahili translations

**File:** `website/src/messages/sw.json`

Translate all keys from `en.json` to Swahili. Minimum required translations:

```json
{
  "nav": {
    "platform": "Jukwaa",
    "pricing": "Bei",
    "roadmap": "Ramani ya Bidhaa",
    "about": "Kuhusu",
    "blog": "Makala",
    "getAccess": "Omba ufikiaji wa mapema",
    "investors": "Wawekezaji"
  },
  "hero": {
    "eyebrow": "Januari 26, 2026 — Tanzania ilizindua bima ya afya ya ulimwengu wote",
    "heading": "Mfumo wa uendeshaji wa maduka ya dawa kwa huduma bora",
    "body": "Maduka ya dawa 14,000+ na ADDO Tanzania lazima sasa yashughulikie madai ya NHIF...",
    "cta": "Omba ufikiaji wa mapema",
    "secondary": "Angalia jinsi inavyofanya kazi →"
  }
}
```

Continue for all sections. Every hardcoded English string must have a Swahili equivalent.
Use `useTranslations()` hook from `next-intl` in all components.

---

## TASK 25 — SEO: sitemap, robots, OG image, JSON-LD

### Sitemap — `website/next-sitemap.config.js`
```javascript
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://pharmaconnect.tz',
  generateRobotsTxt: true,
  exclude: ['/investors', '/api/*'],
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/', disallow: ['/investors', '/api/'] }
    ]
  }
}
```

### OG Image — `website/src/app/og-image.png`
Build with `@vercel/og` at `/api/og` route. Static fallback PNG in `/public/og-image.png`.
Dimensions: 1200×630. Content: logo mark + "PharmaConnect" wordmark + tagline + 
primary colour background gradient.

### JSON-LD — add to homepage `<script type="application/ld+json">`
Organization + SoftwareApplication schemas as specified.

### Per-page metadata
Every page must export a `generateMetadata` function or `metadata` object with
unique title, description, and og:image.

---

## TASK 26 — Performance and Lighthouse optimisation

After all pages are built, apply these optimisations:

1. **Dynamic imports** for heavy components:
   ```typescript
   const Recharts = dynamic(() => import('recharts'), { ssr: false })
   const NhifFlow = dynamic(() => import('@/components/NhifFlow'))
   ```

2. **next/image** — every `<img>` tag must be replaced with `next/image` with explicit
   `width` and `height`. No `<img>` tags allowed.

3. **Font optimisation** — convert Google Fonts import to `next/font/google`:
   ```typescript
   import { DM_Serif_Display, DM_Sans, JetBrains_Mono } from 'next/font/google'
   ```
   Remove the `@import` from globals.css.

4. **Bundle analysis** — run `ANALYZE=true npm run build` (add `@next/bundle-analyzer`)
   and confirm JS < 200KB on initial load.

5. **CLS prevention** — all dynamic content must have explicit dimensions set before
   content loads. Use `min-h-[...]` placeholders for loading states.

6. **Framer Motion** — import only used parts:
   ```typescript
   import { motion } from 'framer-motion'  // ✓
   // NOT: import * as Framer from 'framer-motion'  // ✗
   ```

7. **Vercel Analytics** — confirm `<Analytics />` is in root layout and not double-loaded.

Run Lighthouse via `npx lighthouse http://localhost:3000 --output=json` and confirm
≥95 on Performance, Accessibility, Best Practices, SEO.

---

## TASK 27 — vercel.json and deployment config

**File:** `website/vercel.json`
```json
{
  "regions": ["cdg1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "no-store" }]
    }
  ],
  "rewrites": [
    { "source": "/sitemap.xml", "destination": "/api/sitemap" }
  ]
}
```

Note: cdg1 is Paris — closest Vercel region to East Africa. If a Nairobi or Johannesburg
region becomes available, update accordingly.

---

## TASK 28 — README.md for /website/

Write a `website/README.md` covering:

1. Project overview and relationship to the main PharmaConnect app
2. Environment variables (all from `.env.local` with descriptions)
3. Local development: `npm run dev`
4. Build: `npm run build`
5. Deployment to Vercel (one-click deploy badge if possible)
6. Changing the primary colour (one-line instruction)
7. Adding a new blog article (MDX frontmatter guide)
8. Updating pricing / modules (point to `src/lib/data/`)
9. Adding a Swahili translation (point to `src/messages/sw.json`)
10. Investor page password rotation

---

## ACCEPTANCE CHECKLIST (run before marking complete)

```
[ ] Logo mark renders without pixellation at 16px, 32px, 64px, 256px (SVG throughout)
[ ] "Pharma" renders in primary-dark, "Connect" in primary-mid
[ ] Language toggle switches all static copy to Swahili
[ ] All 12 module sub-pages exist at /platform/[slug]
[ ] Phase 2–4 module cards show "Coming soon" overlay
[ ] /investors page is inaccessible without the access code
[ ] All contact forms submit and send emails via Resend to RESEND_NOTIFY
[ ] Sponsored articles show amber SPONSORED badge (non-hideable)
[ ] Urgency stat cards animate count-up on scroll into view
[ ] Site fully functional at 360px width (Android minimum)
[ ] All images use next/image with explicit width and height
[ ] No <img> tags in production build
[ ] Lighthouse ≥95 all four categories on /
[ ] Core Web Vitals: LCP < 2.5s, CLS < 0.1, FID < 100ms
[ ] PDPC registration notice appears in footer legal column
[ ] Marquee strip scrolls continuously without jank
[ ] App UI mockup on homepage animates on load (stagger slide-in)
[ ] NHIF flow diagram is horizontally scrollable on mobile
[ ] Pricing cards snap-scroll on mobile
[ ] Competitor comparison table renders correctly on mobile
[ ] Annual/monthly toggle on /pricing updates all prices
[ ] FAQ accordion on /pricing expands/collapses smoothly
[ ] /roadmap renders all 4 phases with correct module assignments
[ ] Blog search works client-side (Fuse.js)
[ ] Each article has a Swahili summary section
[ ] JSON-LD structured data present on homepage (validate with Google Rich Results Test)
[ ] robots.txt disallows /investors and /api/
[ ] Sitemap includes all static and dynamic routes
[ ] vercel.json security headers are present
[ ] No TypeScript errors (tsc --noEmit passes)
[ ] No ESLint errors (npm run lint passes)
```

---

## FILE TREE (expected output)

```
website/
├── content/
│   └── articles/
│       ├── uhi-mandate-pharmacy-guide.mdx
│       ├── nhif-breeze-api-pharmacy-owners.mdx
│       ├── drug-interactions-tanzanian-dispensers.mdx
│       ├── tmda-inspection-readiness-2026.mdx
│       └── patient-safety-first-vision.mdx
├── public/
│   ├── favicon.svg
│   ├── og-image.png
│   └── docs/           ← PDFs go here when available
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── waitlist/route.ts
│   │   │   ├── contact/route.ts
│   │   │   ├── investor-access/route.ts
│   │   │   ├── notify/route.ts
│   │   │   └── og/route.tsx
│   │   ├── (marketing)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                  ← Homepage
│   │   │   ├── platform/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [module]/page.tsx
│   │   │   ├── pricing/page.tsx
│   │   │   ├── roadmap/page.tsx
│   │   │   ├── about/page.tsx
│   │   │   ├── blog/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── investors/page.tsx
│   │   │   ├── partners/page.tsx
│   │   │   └── contact/page.tsx
│   │   ├── globals.css
│   │   └── layout.tsx                    ← Root layout
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── StatCard.tsx
│   │   │   └── AnimatedSection.tsx
│   │   ├── Logo.tsx
│   │   ├── Nav.tsx
│   │   ├── Footer.tsx
│   │   ├── ModuleCard.tsx
│   │   ├── PhaseToggle.tsx
│   │   ├── PricingCard.tsx
│   │   ├── ArticleCard.tsx
│   │   ├── ContactForm.tsx
│   │   ├── LanguageToggle.tsx
│   │   ├── AppMockup.tsx
│   │   ├── SeveritySpectrum.tsx
│   │   └── NhifFlow.tsx
│   ├── lib/
│   │   └── data/
│   │       ├── modules.ts
│   │       ├── phases.ts
│   │       └── pricing.ts
│   └── messages/
│       ├── en.json
│       └── sw.json
├── .env.local              ← never commit
├── contentlayer.config.ts
├── next.config.ts
├── next-sitemap.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
└── README.md
```

---

*Generated: April 2026 — PharmaConnect System · Arusha, Tanzania*
