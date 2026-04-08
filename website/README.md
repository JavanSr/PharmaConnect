# PharmaConnect Public Website

This is the isolated public-facing marketing website for PharmaConnect. It lives in
`/website` and must not modify the production pharmacy management app in `/src`,
`/backend`, or `/prisma`.

## Instruction Hierarchy

Follow the root project instructions in this order:

1. Direct user request
2. `../CLAUDE.md`
3. `../AGENTS.md`
4. `../DECISIONS.md`
5. `../CODEX_TASKS.md`

The higher-priority files override the original task file where they differ. In
particular, the website uses the locked Slate Teal brand from `CLAUDE.md`, not the
older sky-blue placeholder.

## Dependencies

Website dependencies are owned in `../website-dependencies`. The local
`website/node_modules` path is a Windows junction to that folder. This keeps website
packages separate from the main app dependency set.

Install from:

```powershell
cd ..\website-dependencies
npm install --legacy-peer-deps
```

If Contentlayer remains incompatible with Next 14, defer the MDX blog task or replace it
only after an explicit review.

## Environment Variables

Copy `.env.example` to `.env.local` and fill:

- `RESEND_API_KEY`: Resend API key for form emails.
- `RESEND_FROM`: verified sender address.
- `RESEND_NOTIFY`: founder/operator notification inbox.
- `INVESTOR_PAGE_PASSWORD`: investor access code.
- `NEXT_PUBLIC_SITE_URL`: deployed website URL.

## Local Development

```powershell
cd "c:\Users\user\OneDrive\Documents\VISUAL CODE\pharmaconnect\website"
npm run dev
```

Open `http://localhost:3000`.

## Build

```powershell
npm run build
```

The build output uses `build-output/` because the original `.next/` directory contained
OneDrive cloud placeholder files that Windows refused to clean.

## Updating Content

- Modules: `src/lib/data/modules.ts`
- Pricing: `src/app/pricing/page.tsx`
- Swahili entry page: `src/app/sw/page.tsx`
- Forms and API routes: `src/components/ContactForm.tsx`, `src/app/api/*`

## Current Gaps

The site builds and runs without the optional marketing dependencies. Full `next-intl`,
Framer Motion animations, Contentlayer runtime integration, Recharts investor charts,
and Lighthouse validation require dependency installation to complete. The isolated npm
install timed out in this workspace, and `next-contentlayer@0.3.4` also has a Next 14
peer conflict that needs explicit review before enabling it.
