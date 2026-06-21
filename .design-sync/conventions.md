# APOTEKH Design System — Usage Conventions

## Brand identity

**Platform name**: APOTEKH (always uppercase). Never "PharmaConnect" or "APOTEK".

**Tagline**: "Powering Pharmacies. Protecting Patients." — use exactly this wording.

**Primary colour**: `#1A6B5C` (pc-600 teal). Amber `#E8A020` is for the active node only — never use it as a general accent.

## Logo

The `Logo` component renders the APOTEKH wordmark. Always import the component — never reconstruct the logo in HTML/SVG/CSS.

- `variant="full"` — mark + wordmark, for light backgrounds
- `variant="white"` — mark + white wordmark, for dark/teal backgrounds
- `variant="mark"` — icon only (Living Cross SVG)
- Sizes: `sm` (24px) · `md` (32px) · `lg` (48px) · `xl` (64px)

The amber colour in the `H` letter and the right node of the Living Cross must always be present in colour contexts.

## Colour tokens (Tailwind)

| Class | Hex | Use |
|---|---|---|
| `bg-primary` / `text-primary` | #1A6B5C | Buttons, badges, active states |
| `bg-primary-dark` | #0D4035 | Dark sections, footer background |
| `bg-primary-lightest` / `bg-mist` | #EDF7F3 | Page backgrounds, subtle cards |
| `text-slate` | #1E293B | Body text, headings |
| `text-amber` / `bg-amber` | #E8A020 | Active node signal — use sparingly |

## Typography

- **Body / UI**: DM Sans (loaded via Google Fonts as `font-sans`)
- **Display headings (marketing only)**: DM Serif Display (`font-serif`) — not in app UI
- **Code / reference numbers**: JetBrains Mono (`font-mono`)

## Component usage notes

**Button** — always prefer `variant="primary"` for the main CTA and `variant="outline"` for the secondary action. Never use `variant="danger"` for routine actions.

**Badge** — `"primary"` for live features, `"coming-soon"` for unreleased, `"sponsored"` auto-adds a lock icon. Don't use `"amber"` for phase labelling (phase colouring was explicitly removed).

**StatCard** — designed for dark section backgrounds (`bg-primary-dark`). Uses a spring animation (framer-motion) that fires once on scroll-into-view. Always provide `value` as a number when you want the count-up animation.

**PricingCard** — always pair with a `Tier` object from `@/lib/data/pricing`. The `isPopular: true` tier gets a primary border and "Most popular" badge automatically. Pass `billing="monthly"` or `billing="annual"` — the component handles price switching.

**PricingToggle** — self-contained; renders the monthly/annual toggle and all four retail pricing cards. No props required.

**ModuleCard** — pass a `Module` object from `@/lib/data/modules`. Set `mini={true}` for compact grid rows. Coming-soon modules automatically render with a dark overlay.

**FaqAccordion / Footer / Nav** — self-contained; no props required. Nav uses `usePathname()` from Next.js and requires the App Router context to highlight the active link.

## What NOT to do

- Do not add CPD activity tracking, CPD points, or NHIF claims features to any design.
- Do not use per-phase colour coding (amber = phase 2, purple = phase 3, etc.).
- Do not use "PharmaConnect", "Patient Safety Suite", "online storefront", "Owner Remote Dashboard", or "TRA" in UI copy.
- Do not surface EFDMS, TRA, or NHIF in onboarding screens.
- Clinical Decision Support is never tier-gated — show it as available on all tiers.
