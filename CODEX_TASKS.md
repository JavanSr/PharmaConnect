# CODEX_TASKS.md — PharmaConnect Marketing Website
## Revised April 2026 — Marketing-Ready Build

---

## Purpose and Scope

Build the **public-facing marketing website** for PharmaConnect System inside the
`/website/` subdirectory. This site is read by pharmacy owners, regulators,
investors, and institutional partners in Tanzania. It must read and feel like a
**confident, launched product** — not a pilot project, not an internal tool, and
not a work in progress.

The existing pharmacy management app lives at the repo root (`/src/`). Do not
touch it. All work in this file is scoped to `/website/`.

---

## LANGUAGE RULES — ENFORCE THROUGHOUT

These rules apply to every string on the site: page copy, button labels, badge
text, metadata descriptions, form labels, email subjects, module descriptions,
article body text, and data constants.

### Banned phrases — never write these

| Banned | Replace with |
|---|---|
| "pilot" / "join the pilot" / "pilot pricing" | "early access" / "join early access" / "launch pricing" |
| "demo" / "demo account" / "demo-ready" | remove entirely or say "see it in action" |
| "MVP" | never use on the public site |
| "current product" (used as a qualifier) | "PharmaConnect" |
| "not active product functionality" | "coming soon" |
| "future availability" | "coming soon" |
| "roadmap item" | "upcoming feature" |
| "Phase 1" / "Phase 2" / "Phase 3" / "Phase 4" (in any user-visible string) | "available now" / "coming soon" — never expose phase numbers to visitors |
| "will be added when ready" | remove or replace with the actual content |
| "in progress" (for company legal status) | "registration underway" or the specific action |
| "is not configured" (API messages) | "service temporarily unavailable" |
| "backbone is reliable" | remove — implies the current build is unreliable |
| "carefully scoped" / "we are deliberately not" | positive framing of what PharmaConnect does do |
| "not a startup idea" | this quote from the founder is fine — it is powerful — keep it |
| "pilot onboarding checklist" (as a feature) | "launch onboarding guide" |
| "priority pilot feedback channel" | "direct access to the founding team" |
| "request standard pilot" / "request premium pilot" | "get started" / "request access" |
| "cap table documents will be added to /public/docs/ when ready" | replace with "Cap table and equity documents available to verified investors on request." |
| "pilot rollout" (partners page) | "deployment and rollout support" |
| "A safe current product should" | "PharmaConnect" |
| "current product keeps patient safety basic" | "PharmaConnect builds patient safety into every dispensing event" |
| "New PharmaConnect pilot waitlist request" (email subject) | "New PharmaConnect early access request" |
| "requested pilot access" (email body) | "requested early access" |
| "pilot support and validation" (FUNGUO row) | "launch support and adoption acceleration" |
| "Pilot validation and pharmacy adoption" (investor focus) | "Arusha launch and pharmacy adoption" |
| "Pilot implementation" (use of funds) | "Launch implementation" |
| "before later roadmap differentiation is expanded" | remove — rewrite the sentence entirely |
| "Adoption matters. The free tier..." | rewrite as a benefit for the pharmacy |

### Tone guidance

- Write as if PharmaConnect is **open and serving pharmacies today** in Arusha.
- Available features are described with present tense ("PharmaConnect checks drug
  interactions at the point of dispensing", not "will check").
- Features not yet available are described as "coming soon" — confident and brief.
  Never qualify them with internal phase labels.
- The UHI mandate is an **opportunity** PharmaConnect is already addressing, not a
  problem that may or may not be solved.
- Never apologise for what the product does not yet do. The "coming soon" overlay on
  unavailable module cards should feel exciting, not cautious.

---

## CURRENT STATE (what already exists in /website/)

Before building anything, understand what is already there:

### Data layer — complete, needs language fixes only
- `src/lib/data/modules.ts` — 12 modules, all data correct. Fix: remove phrases like
  "in the current product", "not attempting to become", "reserved for carefully scoped".
  Rewrite howItWorks and acceptanceCriteria fields to be present-tense and positive.
- `src/lib/data/articles.ts` — 5 articles. Fix: remove "A safe current product should",
  "The current product keeps patient safety basic". Replace with PharmaConnect as subject.
- `src/lib/data/pricing.ts` — 5 tiers. Fix: rename CTAs from "Request standard pilot"
  to "Get started", update feature strings (see banned list above).
- `src/lib/server/submissions.ts` — functional. Fix: email subjects only.

### API routes — functional, needs copy fixes
- `api/waitlist` — Fix email subject line only.
- `api/contact` — Good.
- `api/investor-access` — Fix error message: "not configured" → "service temporarily unavailable".
- `api/investor-verify` — Fix error message same as above.
- `api/notify` — No changes needed.

### UI components — some stubs need rebuilding
- `ui/Button.tsx` — Keep as-is.
- `ui/Badge.tsx` — Fix: sponsored variant renders string `"LOCK "` — replace with
  Lucide `<Lock size={10} className="mr-1" />`.
- `ui/StatCard.tsx` — Keep layout; add count-up animation (see Task 6).
- `ui/AnimatedSection.tsx` — **Stub. Rebuild entirely** (see Task 6). Currently does
  nothing — it is just a `<section>` wrapper. The `delay` prop is accepted but ignored.

### Pages — all built, all have language issues, 7 reference missing components
Pages that reference components that do not yet exist (build these components first):
- `platform/page.tsx` → needs `@/components/PlatformGrid`
- `platform/[module]/page.tsx` → needs `@/components/ModuleCard`
- `pricing/page.tsx` → needs `@/components/PricingToggle`
- `blog/page.tsx` → needs `@/components/BlogSearch`
- `contact/page.tsx` → needs `@/components/ContactTabs`
- `partners/page.tsx` → needs `@/components/ContactForm`
- `investors/page.tsx` → needs `@/components/InvestorGate`

### What does not exist yet (must be built from scratch)
- Root homepage: `src/app/page.tsx`
- Root layout: `src/app/layout.tsx` + `src/app/globals.css`
- Logo SVG component
- Nav component
- Footer component
- The 7 missing components above
- `tailwind.config.ts` with brand tokens
- `next.config.ts` / `next.config.js`

---

## TECH STACK

```
Framework:  Next.js 14, App Router, TypeScript
Styling:    Tailwind CSS v3 with CSS custom properties for brand tokens
Animation:  Framer Motion (scroll reveals, hero stagger, count-up)
Forms:      React Hook Form + Zod
Email:      Resend API (already integrated in API routes)
Icons:      Lucide React only
Analytics:  Vercel Analytics
Fonts:      DM Serif Display + DM Sans + JetBrains Mono (Google Fonts via next/font)
Hosting:    Vercel
```

Do **not** add: Contentlayer, MDX, next-intl, Recharts, Fuse.js, @vercel/og,
next-sitemap, or @next/bundle-analyzer. These are not needed for this build.

---

## ENVIRONMENT VARIABLES

`website/.env.local`:
```env
RESEND_API_KEY=
RESEND_FROM=hello@pharmaconnect.tz
RESEND_NOTIFY=elihaki.yusuph@gmail.com
INVESTOR_PAGE_PASSWORD=
NEXT_PUBLIC_SITE_URL=https://pharmaconnect.tz
```

---

## BRAND TOKENS

Source of truth: `CLAUDE.md` — Slate Teal colour system. Do not invent colours.
Do not introduce per-phase colour coding (no amber for one state, purple for another).
All interactive and status colours come from the teal scale only.

### Colour palette — Slate Teal

| Token       | Hex       | CSS variable            | Use                              |
|-------------|-----------|-------------------------|----------------------------------|
| pc-50       | #EDF7F3   | --color-pc-50           | Page background (replaces mist)  |
| pc-100      | #D6F0E8   | --color-pc-100          | Borders, dividers, card borders  |
| pc-200      | #AFDFD3   | --color-pc-200          | Hover backgrounds                |
| pc-500      | #2A9478   | --color-pc-500          | Secondary accents, mid teal      |
| pc-600      | #1A6B5C   | --color-pc-600          | **Primary brand teal** — main CTA colour, links, icons |
| pc-700      | #145748   | --color-pc-700          | Hover states on teal elements    |
| pc-800      | #0D4035   | --color-pc-800          | Dark teal — headings, dark sections, footer |
| pc-900      | #082B23   | --color-pc-900          | Darkest — rarely used            |

Secondary (fixed, not derived from teal):
| Token       | Hex       | CSS variable            | Use                              |
|-------------|-----------|-------------------------|----------------------------------|
| Amber       | #D97706   | --color-amber           | Warnings, urgency callouts only  |
| Ink         | #0D4035   | --color-ink             | Body text (same as pc-800)       |
| Surface     | #EDF7F3   | --color-surface         | Page background (same as pc-50)  |

**Mapping to Tailwind token names used throughout this file:**
- `primary` → pc-600 (`#1A6B5C`)
- `primary-dark` → pc-800 (`#0D4035`)
- `primary-mid` → pc-500 (`#2A9478`)
- `primary-light` → pc-100 at 60% opacity
- `primary-lightest` → pc-50 (`#EDF7F3`)
- `slate` → pc-800 (`#0D4035`) — used for body text and dark backgrounds
- `mist` → pc-50 (`#EDF7F3`) — used for page and section backgrounds

### Logo background gradient
The logo mark sits on a gradient background: `#2A9478` → `#0D4035` (top to bottom).
This applies to the favicon square and any full-colour logo lockup on dark backgrounds.

### Typography
- Display (H1, H2): DM Serif Display, weight regular, letter-spacing -0.5px
- Body headings (H3, H4, nav): DM Sans weight 500
- Body text: DM Sans weight 400, line-height 1.75
- Code/data labels: JetBrains Mono weight 400

---

## BUILD ORDER — FOLLOW THIS SEQUENCE EXACTLY

---

### TASK 1 — Project config files

**File:** `website/next.config.ts`
```typescript
import type { NextConfig } from 'next'

const config: NextConfig = {
  images: { formats: ['image/avif', 'image/webp'] },
  experimental: {},
}

export default config
```

**File:** `website/tailwind.config.ts`
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Full Slate Teal scale — source of truth: CLAUDE.md
        pc: {
          50:  '#EDF7F3',
          100: '#D6F0E8',
          200: '#AFDFD3',
          500: '#2A9478',
          600: '#1A6B5C',
          700: '#145748',
          800: '#0D4035',
          900: '#082B23',
        },
        // Semantic aliases used throughout components
        primary: {
          DEFAULT:  '#1A6B5C',   // pc-600
          dark:     '#0D4035',   // pc-800
          mid:      '#2A9478',   // pc-500
          light:    '#D6F0E8',   // pc-100
          lightest: '#EDF7F3',   // pc-50
        },
        amber:   '#D97706',
        ink:     '#0D4035',      // pc-800 — body text
        surface: '#EDF7F3',      // pc-50  — page background
        mist:    '#EDF7F3',      // alias for surface, used in existing components
        slate:   '#0D4035',      // alias for ink, used in existing components
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans:  ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:  ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
```

**File:** `website/src/app/globals.css`

Remove the Geist font references. Use the Slate Teal palette from CLAUDE.md exactly.
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Slate Teal scale — source of truth: CLAUDE.md */
  --color-pc-50:   #EDF7F3;
  --color-pc-100:  #D6F0E8;
  --color-pc-200:  #AFDFD3;
  --color-pc-500:  #2A9478;
  --color-pc-600:  #1A6B5C;
  --color-pc-700:  #145748;
  --color-pc-800:  #0D4035;
  --color-pc-900:  #082B23;

  /* Semantic tokens */
  --color-primary:          #1A6B5C;   /* pc-600 */
  --color-primary-dark:     #0D4035;   /* pc-800 */
  --color-primary-mid:      #2A9478;   /* pc-500 */
  --color-primary-light:    #D6F0E8;   /* pc-100 */
  --color-primary-lightest: #EDF7F3;   /* pc-50  */
  --color-amber:            #D97706;
  --color-ink:              #0D4035;
  --color-surface:          #EDF7F3;

  /* Logo gradient stops */
  --logo-gradient-start: #2A9478;
  --logo-gradient-end:   #0D4035;
}

html { scroll-behavior: smooth; }

body {
  font-family: 'DM Sans', system-ui, sans-serif;
  background-color: #EDF7F3;
  color: #0D4035;
  line-height: 1.75;
  -webkit-font-smoothing: antialiased;
}

@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

.hero-pattern {
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 27px,
    rgba(26, 107, 92, 0.04) 27px,
    rgba(26, 107, 92, 0.04) 28px
  );
}
```

**Acceptance:** `npm run build` compiles without TypeScript errors. Tailwind
`text-primary`, `bg-primary-dark`, `bg-surface`, `font-serif`, `font-mono` all resolve.
Page background is `#EDF7F3` (pc-50), not white or sky blue.

---

### TASK 2 — Fonts

**File:** `website/src/lib/fonts.ts`
```typescript
import { DM_Serif_Display, DM_Sans, JetBrains_Mono } from 'next/font/google'

export const dmSerif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

export const dmSans = DM_Sans({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const jetbrainsMono = JetBrains_Mono({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})
```

Delete `website/src/app/fonts/GeistVF.woff` and `GeistMonoVF.woff`. These are the
wrong fonts and add unnecessary weight.

---

### TASK 3 — Logo SVG component

**File:** `website/src/components/Logo.tsx`

Build a pure SVG pharmacy cross logo + wordmark with no external images.

**Mark construction — Nexus Cross (exact geometry from CLAUDE.md):**

Canvas: 100×100 viewBox.

```
Vertical bar:   x=43.3  y=6.7   width=13.3  height=86.6  rx=1.7
Horizontal bar: x=6.7   y=43.3  width=86.6  height=13.3  rx=1.7
Tip nodes (circles r=6.7):
  top:    cx=50   cy=13.3
  bottom: cx=50   cy=86.7
  left:   cx=13.3 cy=50
  right:  cx=86.7 cy=50
Hollow centre ring:
  cx=50 cy=50 r=9.2
  fill="none"
  stroke="rgba(255,255,255,0.35)"
  stroke-width="2"
```

The cross bars and tip nodes are filled with the brand teal (`#1A6B5C` or white for
the white variant). The hollow centre ring has no fill — it is a stroke only.

**Background gradient (for favicon and full-colour lockup):**
Linear gradient top→bottom: `#2A9478` → `#0D4035`
Apply as a `<linearGradient>` element on the favicon square background rect.
Do NOT apply the gradient to the mark itself on white/light backgrounds — use the
flat `#1A6B5C` fill there instead.

**Wordmark:** "PharmaConnect" in DM Serif Display, weight 400, letter-spacing -0.5px,
set beside the mark.
- "Pharma" fill: `#0D4035` (pc-800 / primary-dark)
- "Connect" fill: `#2A9478` (pc-500 / primary-mid)
No space between the two words. They run together as one word.

**Props:**
```typescript
interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'  // mark heights: 24 / 32 / 48 / 64
  variant?: 'full' | 'mark' | 'white'
  className?: string
}
```

**White variant:** cross bars, tip nodes, and wordmark all become white. The hollow
centre ring stroke becomes `rgba(255,255,255,0.35)` (same as on the gradient bg).
Used on dark backgrounds (footer, CTA sections, marquee strip).

**Favicon:** Write a standalone SVG to `website/public/favicon.svg`.
- 512×512 canvas (scales to any size)
- Square background rect: gradient fill `#2A9478` → `#0D4035`, rx=80 for slight rounding
- Nexus Cross mark centred in white (all fills white, centre ring stroke `rgba(255,255,255,0.35)`)
- No wordmark on favicon
Add `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` to layout.tsx.

---

### TASK 4 — Root layout

**File:** `website/src/app/layout.tsx`

```tsx
import './globals.css'
import { dmSerif, dmSans, jetbrainsMono } from '@/lib/fonts'
import { Analytics } from '@vercel/analytics/react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export const metadata = {
  title: {
    default: 'PharmaConnect — Better Pharmaceutical Services for Tanzania',
    template: '%s — PharmaConnect',
  },
  description:
    'The pharmacy-side platform for Tanzania\'s 14,000+ pharmacies and ADDOs. NHIF claims, patient safety, compliance, and CPD — live in Arusha.',
  keywords: 'Tanzania pharmacy software, NHIF claims, UHI, pharmaceutical management, Arusha',
  openGraph: {
    type: 'website',
    locale: 'en_TZ',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pharmaconnect.tz',
    siteName: 'PharmaConnect',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PharmaConnect' }],
  },
  twitter: { card: 'summary_large_image', site: '@PharmaConnect' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSerif.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body>
        <Nav />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  )
}
```

---

### TASK 5 — Nav component

**File:** `website/src/components/Nav.tsx`

**Behaviour:** Transparent on page top. On scroll past 60px: adds
`backdrop-blur-md bg-white/90 shadow-sm` transition.

**Desktop (≥1024px):**
```
[Logo full]     Platform  Pricing  Roadmap  About  Blog     [Get early access ▸]  [Investors]
```
- All nav links: DM Sans 500, 14px, slate, hover → primary, 150ms transition.
- "Get early access": `<Button variant="primary" size="sm" href="/contact#waitlist">`
- "Investors": `<Button variant="ghost" size="sm" href="/investors">`

**Mobile (<1024px):**
- Show logo mark only + hamburger (`<Menu>` icon from Lucide).
- Hamburger opens full-screen overlay (fixed, inset-0, z-50, white bg).
- Overlay: nav links stacked, both CTA buttons, close `<X>` icon.
- Body scroll locked while overlay is open (`overflow-hidden` on `<body>`).

Use `next/link` for all links. Active route gets `text-primary`.

---

### TASK 6 — Rebuild AnimatedSection + fix StatCard

**File:** `website/src/components/ui/AnimatedSection.tsx`

The current file is a non-functional stub. Replace it entirely:

```tsx
'use client'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedSectionProps {
  children: React.ReactNode
  delay?: number
  className?: string
  direction?: 'up' | 'left' | 'none'
}

export default function AnimatedSection({
  children,
  delay = 0,
  className,
  direction = 'up',
}: AnimatedSectionProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  const initial = {
    opacity: 0,
    y: direction === 'up' ? 24 : 0,
    x: direction === 'left' ? -32 : 0,
  }

  return (
    <motion.section
      ref={ref}
      initial={initial}
      animate={isInView ? { opacity: 1, y: 0, x: 0 } : initial}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(className)}
    >
      {children}
    </motion.section>
  )
}
```

**File:** `website/src/components/ui/StatCard.tsx`

Add count-up animation. Use `framer-motion` `useInView` + a simple incrementing
effect. For non-numeric values (e.g. "Jan 2026"), skip count-up and just fade in.

```tsx
'use client'
import { useInView, useMotionValue, useSpring } from 'framer-motion'
import { useEffect, useRef } from 'react'

interface StatCardProps {
  value: string | number
  label: string
  suffix?: string
}

export default function StatCard({ value, label, suffix = '' }: StatCardProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, ''))
  const isNumeric = !isNaN(numericValue) && typeof value === 'number'

  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { duration: 1500, bounce: 0 })

  useEffect(() => {
    if (isInView && isNumeric) motionValue.set(numericValue)
  }, [isInView, isNumeric, numericValue, motionValue])

  return (
    <div ref={ref} className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="font-serif text-4xl leading-none text-white md:text-5xl">
        {isNumeric ? (
          <motion.span>{spring}</motion.span>
        ) : (
          <span>{value}</span>
        )}
        {suffix}
      </div>
      <div className="my-4 h-px bg-white/15" />
      <p className="text-sm leading-relaxed text-white/70">{label}</p>
    </div>
  )
}
```

**File:** `website/src/components/ui/Badge.tsx`

Fix the sponsored variant — replace the `"LOCK "` string with a real icon:

```tsx
import { Lock } from 'lucide-react'
// In the component body, replace:
// {variant === 'sponsored' ? "LOCK " : null}
// with:
{variant === 'sponsored' ? <Lock size={10} className="mr-1 flex-shrink-0" /> : null}
```

---

### TASK 7 — Footer component

**File:** `website/src/components/Footer.tsx`

Background: pc-800 (`#0D4035`). All text white or white/60.

Four-column grid (desktop), stacked 2-col on tablet, single column on mobile.

```
Col 1: <Logo variant="white" size="sm" />
        "The pharmacy-side platform for better pharmaceutical services in Tanzania."
        "Arusha, Tanzania · 2026"
        elihaki.yusuph@gmail.com

Col 2: Platform
        → /platform (all modules)
        → /platform/dashboard
        → /platform/inventory
        → /platform/dispensing
        → /platform/compliance-tracker
        → /platform/knowledge-hub
        → /platform/cpd-tracker
        "More coming soon →"

Col 3: Company
        → /about
        → /blog
        → /investors
        → /partners
        → /contact

Col 4: Legal
        → Privacy Policy (/privacy)
        → Terms of Service (/terms)
        "PDPC Registration: registration underway"
        "Tanzania Companies Act Cap 212: registration underway"
```

Bottom bar (full-width, border-top white/10, text-xs white/40):
"© 2026 PharmaConnect System · Elihaki M. Y. Javan · Tanzania"

---

### TASK 8 — Rebuild modules data to match CLAUDE.md exactly

**IMPORTANT:** The existing `src/lib/data/modules.ts` was scaffolded before CLAUDE.md
was consulted. The actual module list is different. Rewrite this file entirely to match
the authoritative module list from `CLAUDE.md`.

**Correct module list — source: CLAUDE.md:**

| Slug              | Name               | Available? |
|-------------------|--------------------|------------|
| dashboard         | Dashboard          | Yes        |
| knowledge-hub     | Knowledge Hub      | Yes        |
| inventory         | Inventory          | Yes        |
| compliance-tracker| Compliance Tracker | Yes        |
| analytics         | Analytics          | Yes        |
| dispensing        | Dispensing         | Yes        |
| cpd-tracker       | CPD Tracker        | Yes        |
| nhif-claims       | NHIF Claims        | No — coming soon |
| stock-exchange    | Stock Exchange     | No — coming soon |
| b2b-platform      | B2B Platform       | No — coming soon |
| patient-app       | Patient App        | No — coming soon |
| ai-safety         | AI Safety          | No — coming soon |
| data-products     | Data Products      | No — coming soon |

**Module interface** (unchanged):
```typescript
export interface Module {
  id: string           // 'M01'–'M13'
  slug: string
  name: string
  description: string  // present-tense, no phase numbers, no "planned" qualifier
  available: boolean   // true = live now, false = coming soon
  icon: string         // Lucide icon name
  features: string[]   // min 5, present-tense positive statements
  howItWorks: string   // paragraph, present-tense
  acceptanceCriteria: string[]
  relatedModules: string[]
}
```

**Replace `phase: 1|2|3|4` with `available: boolean`** throughout the file.
This removes all phase-number exposure from the data layer. The `available` flag is
the only distinction the marketing site needs.

Write confident, present-tense descriptions for all 13 modules. For the unavailable
ones, write them as if describing what the feature does — not as promises or plans.
Do not use "will", "planned", "future", or "coming" in the description field.

**Fix language in all `howItWorks` and `acceptanceCriteria` fields:**
- Remove any phrase containing "in the current product"
- Remove "without attempting to become a full learning management platform"
- Remove "No full CPD marketplace is introduced"
- Remove "No logistics platform is introduced"
- Remove "Does not become a payments platform"
- Remove "Clearly separates planned and live functionality"
- Rewrite all of the above as positive, present-tense statements of what the module does

**`src/lib/data/articles.ts`** — specific fixes:

Article 1 (UHI mandate guide):
- Remove: "A safe current product should reduce paperwork, not add a new burden."
  Replace with: "PharmaConnect reduces paperwork without adding new burden."
- Remove: "Inventory hygiene matters because claim readiness is weakened..."
  Rewrite as active advice: "Tracking stock by batch and expiry strengthens NHIF
  claim readiness and protects patients through FEFO dispensing."

Article 4 (TMDA inspection):
- Remove: "The current product should keep this simple..."
  Replace with: "PharmaConnect keeps compliance visible at all times:..."
- Remove: "Future regulator integrations should be approached carefully and only
  after pharmacy workflows are stable." — delete this sentence entirely.

Article 5 (patient safety vision):
- Remove: "That is why the current product keeps patient safety basic but present"
  Replace with: "That is why PharmaConnect builds patient safety into every
  dispensing event from day one."

**`src/lib/data/pricing.ts`** — specific fixes:

- Free ADDO features: Remove "Pilot onboarding checklist"
  → Replace with: "Getting started guide"
- ADDO Plus features: Remove "Priority pilot feedback channel"
  → Replace with: "Direct access to the founding team"
- Standard features: Remove "Pilot implementation support"
  → Replace with: "Launch implementation support"
- Standard CTA: Change "Request standard pilot" → "Get started"
- Premium CTA: Change "Request premium pilot" → "Request access"
- Wholesale features: Remove "Pricing structured according to wholesale level" as
  a feature — it is not a feature. Replace with: "Custom pricing for your
  distribution scale"

**`src/lib/server/submissions.ts`** — email subjects:

- Waitlist email subject: Change "New PharmaConnect pilot waitlist request"
  → "New PharmaConnect early access request"
- Waitlist email body: Change "requested pilot access for" → "requested early access for"

---

### TASK 9 — Fix language in existing page files

**`src/app/platform/page.tsx`** — rewrite the subheading:

Change:
```
"Core pharmacy workflows are shown as available now. Other modules are visible for
future availability and are not active product functionality yet."
```
To:
```
"Seven modules live in Arusha today. More coming soon as PharmaConnect expands
across Tanzania."
```

**`src/app/platform/[module]/page.tsx`** — two fixes:

1. Badge text: Change `"Future availability"` → `"Coming soon"`
2. Notice block for unavailable modules: Replace:
   ```
   "This module is planned for future availability and is not active in the current product."
   ```
   With:
   ```
   "This feature is coming soon. Join early access to be among the first pharmacies
   to receive it."
   ```
3. CTA button: Change `"Join the pilot"` → `"Get early access"`

**`src/app/pricing/page.tsx`** — four fixes:

1. Metadata description: Change `"Pilot pricing direction for PharmaConnect pharmacy teams."`
   → `"Transparent pricing for Tanzania's pharmacies and ADDOs — from free to enterprise."`
2. Page subheading: Change `"Pilot pricing is structured to keep daily pharmacy operations
   adoptable before later roadmap differentiation is expanded."`
   → `"Built for Tanzania's pharmaceutical reality — from single-room ADDOs to
   wholesale distributors."`
3. FAQ answer "Why is there a free ADDO tier?": Change `"Adoption matters. The free tier
   supports essential workflows while pharmacies evaluate the pilot."` → `"Every ADDO in
   Tanzania deserves access to the tools that help them serve patients better. The
   free tier covers the essentials — inventory, compliance alerts, and NHIF
   member verification — at no cost."`
4. FAQ answer "Do prices include implementation?": Remove "final commercial packaging
   is being validated." Rewrite: `"Launch implementation support is included for
   early access partners. Contact us to discuss your pharmacy's needs."`
5. FAQ answer "Are future modules included?": Remove "Future modules remain roadmap
   items until the current pharmacy operations backbone is reliable." Rewrite:
   `"Upcoming modules will be rolled out over time. Your subscription tier determines
   which new modules you receive automatically."`
6. Final CTA heading: Change `"Ready to join the pilot?"` → `"Ready to get started?"`
7. Final CTA button: Change `"Join the pilot"` → `"Get early access"`

**`src/app/contact/page.tsx`** — metadata fix:

Change description: `"Contact PharmaConnect for pilot, investor, or partner inquiries."`
→ `"Get in touch with PharmaConnect — early access requests, investor inquiries, and
institutional partnerships."`

**`src/app/investors/page.tsx`** — two fixes:

1. The investor brief summary card "Current focus": Change `"Pilot validation and
   pharmacy adoption"` → `"Arusha launch and pharmacy adoption"`
2. The funding targets table: Change `"Pilot support and validation"` (FUNGUO purpose)
   → `"Launch support and adoption acceleration"`
3. The use of funds table: Change `"Pilot implementation"` → `"Launch implementation"`
4. The equity card: Remove the sentence `"Cap table documents will be added to
   /public/docs/ when ready."` → Replace with:
   `"Cap table and equity documents are available to verified investors on request.
   Contact: elihaki.yusuph@gmail.com"`

**`src/app/about/page.tsx`** — three fixes:

1. Metadata description: Change `"About PharmaConnect and its founder."` → `"Elihaki
   M. Y. Javan — Pharmaceutical Technologist and founder of PharmaConnect, the
   pharmacy-side platform built for Tanzania's 14,000+ pharmacies and ADDOs."`
2. Recruiting table: Change `"Advisor equity or pilot terms"` → `"Advisor equity or
   early-stage partnership terms"`
3. Legal section: Change three `"in progress"` instances to `"registration underway"`.
   Change `"TRA VFD integration: in progress for compliant dispensing workflows."` →
   `"TRA VFD integration: underway for compliant digital dispensing."`

**`src/app/roadmap/page.tsx`** — fix the group descriptions:

Change the group descriptions from:
- `"Core pharmacy workflows already positioned for the current product."`
  → `"Six modules live in Arusha — inventory, NHIF claims, patient safety,
  compliance, Knowledge Hub, and CPD."`
- `"Roadmap modules that should not be treated as active product functionality yet."`
  → `"More modules are coming soon — analytics, supply chain, and government system
  integration are all on the way."`

**`src/app/partners/page.tsx`** — fix the third partner card:

Change `"Pilot rollout, low-resource deployment support, and pharmacy onboarding."`
→ `"Deployment support, low-resource implementation, and pharmacy onboarding
across Tanzania."`

---

### TASK 10 — ModuleCard component

**File:** `website/src/components/ModuleCard.tsx`

This component is referenced by `platform/[module]/page.tsx` for related modules.
Also used in the homepage module grid (Task 12).

```typescript
interface ModuleCardProps {
  module: Module
  mini?: boolean   // compact version used in related-modules section
}
```

**Full card (mini=false):**
- White bg, 1px border slate/10, rounded-xl, p-6, cursor-pointer
- Hover: shadow-md, border-primary/30, 150ms transition
- Top-right corner: status badge. Available modules = primary colour badge labelled
  "Available now". Unavailable modules = slate/60 badge labelled "Coming soon".
  Never show phase numbers on any badge.
- Module number: JetBrains Mono 12px, slate/40 (e.g. "M01")
- Lucide icon: 24px, primary colour. Dynamically import by `module.icon` string.
- Module name: DM Sans 500 16px slate
- Description: DM Sans 400 14px slate/65, line-clamp-2
- Available modules (`module.available === true`): entire card is a `<Link href={/platform/${module.slug}}>`.
- Unavailable modules (`module.available === false`): card has an overlay `div` (`absolute inset-0 rounded-xl`)
  with `bg-primary-dark/85 backdrop-blur-sm` and centred text "Coming soon" in white
  DM Sans 500 14px. The overlay must never show a phase number — only "Coming soon".

**Mini card (mini=true):**
- Compact: mist bg, rounded-lg, p-4, no overlay
- Module number + name + description (line-clamp-1)
- "Available now" or "Coming soon" badge inline with name — no phase numbers

---

### TASK 11 — PlatformGrid component

**File:** `website/src/components/PlatformGrid.tsx`

`'use client'` — manages filter state.

Props: `modules: Module[]`

Filter bar (3 pills): "All" | "Available now" | "Coming soon"
Filter logic: "Available now" shows `module.available === true`. "Coming soon" shows
`module.available === false`. No phase numbers anywhere in this component.
Active pill: primary bg white text. Inactive: pc-50 bg slate/50 text, 1px border.
"All" selected by default.

Module grid below: 3-col desktop, 2-col tablet, 1-col mobile.
Renders `<ModuleCard module={m} />` for each filtered module.

Do not use any phase numbers in the filter labels or anywhere else in this component.

---

### TASK 12 — PricingCard + PricingToggle components

**File:** `website/src/components/PricingCard.tsx`

Props: `tier: Tier`, `billing: 'monthly' | 'annual'`

Card design:
- White bg, rounded-2xl, p-6, border-2 slate/10
- isPopular: border-2 primary, relative — with "Most popular" badge pinned top-right
  (`absolute -top-3 right-4`), primary bg, white text, rounded-full px-3 py-1 text-xs.
- Tier name: DM Sans 500 16px slate
- Price: DM Serif Display 40px slate. Show monthly or annual price based on `billing`
  prop. Annual = monthly × 11 (one month free). Null price → "Custom pricing".
- Price suffix: "/month" or "/year" in DM Sans 14px slate/50
- Annual note below price: when annual selected, show "Save ~9% vs monthly" in
  primary text 12px.
- Feature list: Lucide `<Check size={16} className="text-primary flex-shrink-0" />`
  + feature text, slate/70 14px.
- CTA: `<Button variant={isPopular ? 'primary' : 'outline'} href="/contact#waitlist">`
  using `tier.cta` as the label.

**File:** `website/src/components/PricingToggle.tsx`

`'use client'` — manages billing state + renders all 5 `<PricingCard>` components.

Billing toggle: two-pill (`Monthly` / `Annual`). Annual shows "Save ~9%" badge.

Cards in a horizontal scroll container on mobile (`overflow-x-auto snap-x snap-mandatory`),
each card `snap-align-start min-w-[280px]`.

On desktop: horizontal flex or 5-col grid. The Standard Pharmacy card (isPopular=true)
renders slightly taller or with a visible ring.

---

### TASK 13 — BlogSearch component

**File:** `website/src/components/BlogSearch.tsx`

`'use client'`

Props: `articles: Article[]`

State: `query: string`, `activeCategory: string | null`

**Filter bar:** Category pills — "All" | "Regulatory" | "Clinical" | "Technical"
| "Opinion" | "Compliance". Same pill style as PlatformGrid.

**Search input:** Plain text `<input>` with a Lucide `<Search size={16}>` icon
inset-left. Filters `articles` client-side using:
```typescript
articles.filter(a =>
  (!activeCategory || a.category === activeCategory) &&
  (!query || a.title.toLowerCase().includes(query.toLowerCase()) ||
   a.excerpt.toLowerCase().includes(query.toLowerCase()))
)
```
No Fuse.js needed for 5 articles.

**Article grid:** 3-col desktop, 2-col tablet, 1-col mobile.
Each card:
- Category `<Badge>`. Sponsored articles: `<Badge variant="sponsored">SPONSORED</Badge>`
  — this badge **must always be visible and cannot be hidden** by any CSS or prop.
- Title: DM Sans 500 16px slate, line-clamp-2
- Excerpt: 14px slate/65, line-clamp-2
- Meta row: date + reading time in slate/40 12px
- "Read →" link to `/blog/${article.slug}` in primary colour

---

### TASK 14 — ContactForm + ContactTabs + InvestorGate components

**File:** `website/src/components/ContactForm.tsx`

`'use client'`

Props: `variant: 'pilot' | 'investor' | 'partner'`

Uses `react-hook-form` + `zod` for client-side validation. Submits to the
appropriate API route on success.

**variant="pilot"** — submits to `/api/waitlist`:
Fields: pharmacy name (min 3), owner name (min 3), phone (`+?255[0-9]{9}`),
pharmacy type (select: ADDO / Retail Pharmacy / Wholesale Distributor).
Submit label: "Request early access →"

**variant="investor"** — submits to `/api/contact` with `variant: "investor"`:
Fields: name (min 3), email (valid), organisation, message (min 10).
Submit label: "Send inquiry →"

**variant="partner"** — submits to `/api/contact` with `variant: "partner"`:
Fields: name (min 3), email (valid), organisation, partnership type (select:
Regulatory / Professional Body / Implementation / Technology / Other), message.
Submit label: "Send partnership inquiry →"

All variants:
- On success: replace form with a green success card: "Your message was received.
  We respond within 48 hours." No "pilot" language in the success message.
- On API error: red inline error with "Something went wrong. Email us directly:
  elihaki.yusuph@gmail.com"
- Inputs: consistent styling — white bg, 1px border slate/20, rounded-lg, h-11 px-3,
  focus ring in primary/50, text slate.
- Submit button: full-width, `<Button variant="primary" size="lg" type="submit">`.

**File:** `website/src/components/ContactTabs.tsx`

`'use client'`

Three tabs: "Get early access" | "Investor inquiry" | "Partnership inquiry"
Tab style: underline-based. Active: primary 2px underline + primary text weight 500.
Inactive: slate/50, no underline. Tab bar has border-bottom slate/10.

Renders `<ContactForm variant={...} />` below the tab bar based on active tab.

Default active: "Get early access" (since the page link from homepage CTA
includes `#waitlist`).

**File:** `website/src/components/InvestorGate.tsx`

`'use client'`

Two-step flow:

Step 1 — Request code:
Form: name + email → POST `/api/investor-access`.
On success: show step 2 with a success message: "Check your inbox — we sent the
access code to {email}."
Button label: "Request access code"

Step 2 — Enter code:
Input: 6-char code → POST `/api/investor-verify`.
On success: `window.location.reload()` (the page will re-read the cookie and
show the investor brief).
On error: "That code is incorrect. Check your inbox or request a new code."
Button label: "Unlock investor brief"

No "configured" or "not configured" error surfaces to the user. If the API
returns 503, show: "Investor access is temporarily unavailable. Contact:
elihaki.yusuph@gmail.com"

---

### TASK 15 — Homepage: layout shell + hero section

**File:** `website/src/app/page.tsx`

This is the most important file on the site. Structure it as a series of
`<AnimatedSection>` blocks, each clearly commented.

**Background pattern for hero:**
```css
/* In globals.css, add: */
.hero-pattern {
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 27px,
    rgba(14, 165, 233, 0.03) 27px,
    rgba(14, 165, 233, 0.03) 28px
  );
}
```

**Hero section — left column:**
```tsx
<p className="font-mono text-xs tracking-widest text-primary uppercase">
  January 26, 2026 — Tanzania launched universal health insurance
</p>
<h1 className="mt-4 font-serif text-5xl lg:text-6xl text-slate tracking-tight">
  The operating system for{' '}
  <span className="text-primary">better pharmaceutical services</span>
</h1>
<p className="mt-6 text-lg text-slate/70 max-w-xl leading-relaxed">
  14,000+ pharmacies and ADDOs across Tanzania must now process NHIF claims.
  PharmaConnect turns this compliance requirement into higher-quality care,
  fewer medication errors, and professional growth.
</p>
<div className="mt-8 flex flex-wrap gap-3">
  <Button variant="primary" href="/contact#waitlist">Request early access</Button>
  <Button variant="ghost" href="#how-it-works">See how it works →</Button>
</div>
<div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate/40">
  <span className="font-medium uppercase tracking-wider">Seeking partnerships with:</span>
  <span>Pharmacy Council of Tanzania</span>
  <span>·</span>
  <span>TAPHATA</span>
  <span>·</span>
  <span>PST</span>
</div>
```

**Hero section — right column (AppMockup):**

Build `website/src/components/AppMockup.tsx`.
An animated HTML mockup of the PharmaConnect dispensing screen — NOT a screenshot.

The mockup shows:
- Patient UUID: "PC-2026-04721" in JetBrains Mono, primary colour
- NHIF status: green pill "Member verified"
- Drug interaction alert (amber card): "⚠ MODERATE interaction — Warfarin + Aspirin"
  This card pulses its border-color once on mount using Framer Motion:
  `animate={{ borderColor: ['#D97706', '#FCD34D', '#D97706'] }} transition={{ duration: 1.5, times: [0,0.5,1] }}`
- Three dispensing line items, each with a small "FEFO" orange pill badge

Device frame: white bg, rounded-2xl, 1.5px border slate/15, `rotate(2deg)`,
drop-shadow-xl. No screenshots.

Framer Motion stagger: cards slide in from right (x: 40 → 0) with 0.1s delays.

**Marquee strip (below hero):**
Full-bleed `bg-primary-dark` strip. White text. CSS marquee animation.
Content (duplicate for seamless loop):
`"NHIF Claims · Drug Interaction Checking · Expiry Monitoring · CPD Tracking ·
Compliance Alerts · Inventory Management · Patient Safety · TMDA Integration ·
Knowledge Hub · Stock Exchange · B2B Ordering · Analytics ·"`

Use the `@keyframes marquee` defined in globals.css.

---

### TASK 16 — Homepage: stats, framing, modules, patient safety

**Section 3 — Urgency Numbers (Why now):**

Background: `bg-primary-dark`. Four `<StatCard>` components in a 4-col grid.
Stats:
- `value={14000}` suffix="+" label="Pharmacies and ADDOs serving Tanzania"
- `value={187}` label="Facilities using digital NHIF claims today"
- `value="USD 243M"` label="Tanzania pharmaceutical market — 6.1% CAGR"
- `value="Jan 2026"` label="UHI launch date — claims processing is mandatory now"

**Section 4 — Core framing statement:**

White background. Large opening quotation mark in primary (120px, DM Serif
Display, line-height 0, opacity 20%). Quote text centred, max-w-3xl, DM Serif
Display 24px slate. Attribution: DM Sans 14px, slate/50, italic.

Quote:
> "On January 26, 2026, Tanzania's Universal Health Insurance launch made health
> coverage mandatory for every citizen — forcing 14,000+ pharmacies and ADDOs to
> process NHIF claims. While generic POS systems focus only on sales and inventory,
> PharmaConnect is the pharmacy-side platform designed for better pharmaceutical
> services."
> — PharmaConnect, April 2026

Below quote: two-column cards:
- Left (primary-lightest bg): "For pharmacy owners" + 3 bullet points:
  "Remote visibility into every branch", "Compliance protection before every deadline",
  "Profitability analytics across your portfolio"
- Right (slate/5 bg): "For pharmacists and dispensers" + 3 bullet points:
  "Patient safety alerts at the dispensing moment", "Drug interaction checking before
  medicine leaves the counter", "CPD tracking built into daily work"

**Section 5 — Module overview:**

Header: "Everything a pharmacy needs to operate, protect, and grow"
Subhead: "Seven modules available now. More to come soon."

Render `<PlatformGrid modules={MODULES} />` (the same component used on /platform).

Below grid: "Explore the full platform →" link to `/platform`.

**Section 6 — Patient safety:**

Two-column, 50/50. Left: text. Right: `<SeveritySpectrum />`.

Left column:
- Eyebrow: "The founder's original vision" (JetBrains Mono 12px primary)
- H2: "Patient safety at every dispensing event"
- Body: "No community pharmacy in Tanzania currently checks drug interactions at
  the point of dispensing. PharmaConnect changes this — checking interactions,
  contraindications, and allergy flags before medicine leaves the counter."
- Three feature rows with Lucide icons:
  - `<Shield>` "Drug interaction checking — MINOR through CONTRAINDICATED"
  - `<AlertTriangle>` "Contraindication alerts — pregnancy, renal, elderly, allergy"
  - `<Lock>` "Anonymous patient UUID — no names, no national IDs, PDPC-compliant"
- Blockquote:
  > "I have seen preventable harm happen. PharmaConnect was built to stop it."
  > — Elihaki M. Y. Javan, Founder & Pharmaceutical Technologist
  Style: left border-l-4 primary, pl-4, italic, DM Serif Display 18px.

Build `website/src/components/SeveritySpectrum.tsx`:
Four horizontal bars stacked, each slides in from left on scroll (AnimatedSection
with direction="left" and stagger delays):

| Bar | Colour | Label | PIN? |
|-----|--------|-------|------|
| MINOR | `#FCD34D` | Counselling recommended | No |
| MODERATE | `#D97706` | Pharmacist review required | No |
| MAJOR | `#EF4444` | Pharmacist PIN required | Yes |
| CONTRAINDICATED | `#991B1B` | Dispensing blocked | Yes |

Each bar: severity label (JetBrains Mono 11px) + description + optional "PIN
required" badge (slate bg, white text). Lucide `<AlertCircle>` icon per bar.

---

### TASK 17 — Homepage: NHIF flow, pricing preview, founder, partners, CTA

**Section 7 — NHIF Claims Flow:**

Build `website/src/components/NhifFlow.tsx`.
Five-step horizontal process. Steps connected by arrow chevrons between them.
On mobile: `overflow-x-auto snap-x` horizontal scroll.

Steps:
1. **Verify** — Patient presents NHIF card → member verified in < 3 seconds
2. **Dispense** — Medicine selected → ICD-10 code auto-suggested
3. **Validate** — Claims scrubber checks all 4 required fields
4. **Submit** — Batch submitted end-of-day via NHIF Breeze API
5. **Track** — Status tracked; rejected claims flagged with correction guidance

Below flow: amber background callout:
"Target: ≥70% NHIF claims acceptance rate across early access pharmacies."
With a visual progress bar, target marker at 70%.

**Section 8 — Pricing preview:**

Header: "Priced for Tanzania's pharmaceutical reality"
Subhead: "Competitive with DukaDawa and Stawi Biz. Superior in clinical depth."

Render `<PricingToggle />`. Below it: "Full pricing details →" → /pricing.

Competitor comparison table (no box borders, only bottom rules per row):
| Feature | DukaDawa | Stawi Biz | PharmaConnect |
|---|---|---|---|
| NHIF claims | ✗ | Partial | ✔ |
| Drug interactions | ✗ | ✗ | ✔ |
| CPD tracking | ✗ | ✗ | ✔ |
| Patient safety | ✗ | ✗ | ✔ |
| Offline-first | Partial | ✗ | ✔ |

PharmaConnect ✔ values: primary colour bold. Competitor ✗: slate/30.

**Section 9 — Founder:**

Two columns. Left: 180px circular photo placeholder (primary-lightest bg, "EMJ"
initials in DM Serif Display 48px primary, centred — will be replaced with photo).
Right: text.

H2: "Built by a pharmacist who has seen the problem firsthand"
Bio: "Elihaki M. Y. Javan is a Pharmaceutical Technologist based in Arusha, Tanzania.
Pharmacy In-Charge at Lindi Regional Hospital. Supply chain reviewer for JSI/UBAB
and GFF programmes under MOH and PO-RALG. Active TAPHATA member. Field experience
across Arusha, Dar es Salaam, Lindi, and rural Tanzania. Every feature in
PharmaConnect maps to a real problem encountered in practice."

Four credential badges (2×2 grid):
- `<CrosshairIcon>` "Pharmacy In-Charge — Lindi Regional Hospital"
- `<Network>` "National Supply Chain Reviewer — JSI/UBAB & GFF"
- `<Users>` "Active TAPHATA Member"
- `<MapPin>` "Field experience — 4+ Tanzanian regions"

Blockquote: "PharmaConnect is not a startup idea. It is the tool I needed and
could not find. So I decided to build it."
— Elihaki M. Y. Javan, Founder

**Section 10 — Institutional partners:**

Heading: "Seeking partnerships with Tanzania's pharmaceutical institutions"
Subheading: "Conversations initiated. MOUs in progress."

Four partner cards in a row (2-col mobile):
- Pharmacy Council of Tanzania — "Regulatory accreditation and compliance standards"
- PST — "Pharmaceutical Society of Tanzania — professional membership body"
- TAPHATA — "Tanzania Pharmaceutical Health Technologies Association"
- NHIF — "National Health Insurance Fund — Breeze API accreditation underway"

Note below: "NHIF Breeze API accreditation process initiated — April 2026"

**Section 11 — Knowledge Hub preview:**

Background: primary-lightest. Three article cards (first three from ARTICLES array).
"Visit the Knowledge Hub →" → /blog.

**Section 12 — Final CTA:**

Background: primary-dark. White text. Full-bleed.

H2: "Tanzania's pharmacies need this. Now."
Subhead: "Join the Arusha early access programme — first 20 pharmacies at no charge."

Render `<ContactForm variant="pilot" />` inline.
Below form: "Or contact directly: elihaki.yusuph@gmail.com · +255 764 591 374 · @PharmaConnect"

---

### TASK 18 — SEO: sitemap, robots, JSON-LD

**File:** `website/src/app/sitemap.ts` (Next.js 14 native — no package needed)

```typescript
import { MetadataRoute } from 'next'
import { MODULES } from '@/lib/data/modules'
import { ARTICLES } from '@/lib/data/articles'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pharmaconnect.tz'
  const staticRoutes = ['', '/platform', '/pricing', '/roadmap', '/about', '/blog', '/partners', '/contact']
  return [
    ...staticRoutes.map(r => ({ url: `${base}${r}`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: r === '' ? 1 : 0.8 })),
    ...MODULES.map(m => ({ url: `${base}/platform/${m.slug}`, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...ARTICLES.map(a => ({ url: `${base}/blog/${a.slug}`, changeFrequency: 'monthly' as const, priority: 0.7 })),
  ]
}
```

**File:** `website/src/app/robots.ts`

```typescript
import { MetadataRoute } from 'next'
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/investors', '/api/'] },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pharmaconnect.tz'}/sitemap.xml`,
  }
}
```

**JSON-LD for homepage** — add to `page.tsx` as a `<Script>` in the page's `<head>`:

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "PharmaConnect",
  "applicationCategory": "HealthApplication",
  "operatingSystem": "Web, Android",
  "description": "Pharmacy-side platform for Tanzania's 14,000+ pharmacies and ADDOs",
  "offers": [
    { "@type": "Offer", "price": "0", "priceCurrency": "TZS" },
    { "@type": "Offer", "price": "25000", "priceCurrency": "TZS" },
    { "@type": "Offer", "price": "70000", "priceCurrency": "TZS" }
  ],
  "author": {
    "@type": "Person",
    "name": "Elihaki M. Y. Javan",
    "jobTitle": "Pharmaceutical Technologist",
    "worksFor": { "@type": "Organization", "name": "PharmaConnect System" }
  }
}
```

---

### TASK 19 — Static OG image

Create `website/public/og-image.png` — 1200×630px.

Design it as an SVG first, then export/save as PNG:
- Dark teal background (#0D4035 — pc-800)
- Logo mark (white variant) top-left
- "PharmaConnect" wordmark (white) 48px
- Tagline: "Better pharmaceutical services for Tanzania" white/80 24px
- Bottom: "pharmaconnect.tz" in JetBrains Mono white/60 16px

If SVG-to-PNG export is not available, create a minimal HTML file and render it.
The `/api/og/route.ts` already exists and can be used for dynamic OG images on
blog articles. For the site-wide fallback, the static PNG is sufficient.

---

### TASK 20 — Performance and final checks

1. All `<img>` tags must be `<Image>` from `next/image` with explicit `width` and
   `height`. Zero raw `<img>` elements in production.

2. Dynamic imports for heavy client components:
   ```typescript
   const AppMockup = dynamic(() => import('@/components/AppMockup'), { ssr: false })
   const NhifFlow  = dynamic(() => import('@/components/NhifFlow'))
   ```

3. `framer-motion` imports must use named exports only:
   ```typescript
   import { motion, useInView, useSpring } from 'framer-motion'  // ✓
   ```

4. Run `npm run build` in `/website/`. Fix all TypeScript errors. Fix all missing
   module errors. The build must complete with zero errors.

5. Run `npm run lint`. Fix all lint errors.

6. Confirm `favicon.svg` renders correctly in browser tab at 16×16 and 32×32.

---

## FULL ACCEPTANCE CHECKLIST

```
LANGUAGE
[ ] Zero instances of "pilot" in any user-visible string
[ ] Zero instances of "demo" in any user-visible string
[ ] Zero instances of "MVP" anywhere on the site
[ ] Zero instances of "not active product functionality" or "future availability"
[ ] Zero instances of "current product" as a qualifier in body copy
[ ] Zero instances of "in progress" in legal/status copy (replaced with "underway")
[ ] Zero instances of "will be added when ready"
[ ] Unavailable module card overlays say "Coming soon" with no phase number
[ ] Pricing CTAs say "Get started" or "Request access" — not "Request pilot"
[ ] Waitlist form CTA says "Request early access" — not "Join the pilot"
[ ] Email subjects sent via Resend say "early access" not "pilot waitlist"
[ ] Investor page equity section has no /public/docs/ TODO note

FUNCTIONALITY
[ ] npm run build completes with zero errors
[ ] npm run lint passes with zero errors
[ ] All 7 previously missing components exist and are importable
[ ] Homepage renders all 12+ sections
[ ] Nav renders Logo, all links, CTAs, and mobile hamburger
[ ] Footer renders 4-column layout with correct links
[ ] /platform shows all 12 module cards with "Available now" / "Coming soon" filter
[ ] /platform/[slug] renders for all 12 slugs via generateStaticParams
[ ] /pricing shows all 5 tiers with monthly/annual toggle
[ ] /roadmap groups modules correctly into "Available now" and "Coming soon" — no phase numbers visible
[ ] /about shows founder bio, credentials, recruiting section
[ ] /blog shows article grid with category filter and search
[ ] /blog/[slug] renders all 5 articles with related articles sidebar
[ ] /investors shows gate when no cookie, brief when cookie is set
[ ] /partners shows 3 partner types + ContactForm
[ ] /contact shows 3-tab ContactForm with correct variants
[ ] All ContactForm variants submit and return success message
[ ] Resend emails sent on waitlist, investor, and partner submissions
[ ] Investor gate: code sent via email, cookie set on verify
[ ] AnimatedSection actually animates (Framer Motion, not a stub)
[ ] StatCard count-up fires on scroll into view
[ ] Severity spectrum bars animate in from left on scroll
[ ] AppMockup hero cards stagger in on page load
[ ] Interaction alert pulses border-color once on mount
[ ] Marquee strip scrolls continuously without jank
[ ] Unavailable module card overlays show "Coming soon" text with no phase number
[ ] Sponsored badge shows Lucide <Lock> icon not string "LOCK "

SEO AND PERFORMANCE
[ ] /sitemap.xml returns all static + dynamic routes
[ ] /robots.txt disallows /investors and /api/
[ ] JSON-LD Organisation + SoftwareApplication on homepage
[ ] All pages have unique <title> and <meta description>
[ ] og:image meta tag present on all pages using /og-image.png
[ ] Favicon.svg renders at 16px and 32px without pixellation
[ ] Logo SVG renders at 24px, 32px, 48px, 64px without blur
[ ] DM Serif Display loads for all H1/H2 elements
[ ] JetBrains Mono loads for eyebrow labels and module IDs
[ ] Zero raw <img> tags — all images via next/image
[ ] No Geist font files or references remain

MOBILE
[ ] Site fully usable at 360px viewport width
[ ] Pricing cards snap-scroll on mobile
[ ] NHIF flow is horizontally scrollable on mobile
[ ] Nav hamburger opens full-screen overlay on mobile
[ ] All touch targets ≥ 44px height
```

---

## FILE TREE (expected after this build completes)

```
website/
├── content/
│   └── articles/          ← (content exists, leave as-is)
├── public/
│   ├── favicon.svg        ← NEW
│   └── og-image.png       ← NEW
├── src/
│   ├── app/
│   │   ├── api/           ← Already built, language fixes only
│   │   ├── about/         ← Already built, language fixes only
│   │   ├── blog/          ← Already built, language fixes only
│   │   ├── contact/       ← Already built, language fixes only
│   │   ├── investors/     ← Already built, language fixes only
│   │   ├── partners/      ← Already built, language fixes only
│   │   ├── platform/      ← Already built, language fixes only
│   │   ├── pricing/       ← Already built, language fixes only
│   │   ├── roadmap/       ← Already built, language fixes only
│   │   ├── globals.css    ← REPLACE (remove Geist refs)
│   │   ├── layout.tsx     ← NEW
│   │   ├── page.tsx       ← NEW (homepage, most important file)
│   │   ├── sitemap.ts     ← NEW
│   │   └── robots.ts      ← NEW
│   ├── components/
│   │   ├── ui/
│   │   │   ├── AnimatedSection.tsx  ← REBUILD (stub → real animation)
│   │   │   ├── Badge.tsx            ← FIX (Lock icon)
│   │   │   ├── Button.tsx           ← Keep as-is
│   │   │   └── StatCard.tsx         ← ADD count-up animation
│   │   ├── AppMockup.tsx      ← NEW
│   │   ├── ContactForm.tsx    ← NEW
│   │   ├── ContactTabs.tsx    ← NEW
│   │   ├── Footer.tsx         ← NEW
│   │   ├── InvestorGate.tsx   ← NEW
│   │   ├── Logo.tsx           ← NEW
│   │   ├── ModuleCard.tsx     ← NEW
│   │   ├── Nav.tsx            ← NEW
│   │   ├── NhifFlow.tsx       ← NEW
│   │   ├── PlatformGrid.tsx   ← NEW
│   │   ├── PricingCard.tsx    ← NEW
│   │   ├── PricingToggle.tsx  ← NEW
│   │   ├── BlogSearch.tsx     ← NEW
│   │   └── SeveritySpectrum.tsx ← NEW
│   └── lib/
│       ├── data/
│       │   ├── articles.ts  ← Language fixes only
│       │   ├── modules.ts   ← Language fixes only
│       │   └── pricing.ts   ← Language fixes only
│       ├── fonts.ts         ← NEW
│       ├── server/
│       │   └── submissions.ts ← Email subject fix only
│       └── utils.ts         ← Keep as-is (cn function)
├── next.config.ts           ← NEW
└── tailwind.config.ts       ← NEW
```

---

*PharmaConnect System · Arusha, Tanzania · April 2026*
*Founder: Elihaki M. Y. Javan · elihaki.yusuph@gmail.com*
