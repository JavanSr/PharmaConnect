# APOTEKH

**Powering Pharmacies. Protecting Patients.**

APOTEKH is a pharmacy operating system for Tanzania — built for independent retail pharmacies, ADDOs, and wholesale distributors in East Africa.

> Full project guidance for Claude Code is in [CLAUDE.md](./CLAUDE.md).

---

## Quick start

### Backend

```bash
cd backend
cp .env.example .env          # fill in DATABASE_URL, JWT_SECRET, etc.
npm install
npm run db:migrate            # apply migrations
npm run db:generate           # generate Prisma client
npm run db:seed               # optional: seed demo pharmacy
npm run dev                   # ts-node-dev on port 3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                   # Vite dev server on port 5173
```

Vite proxies `/api` → `http://localhost:3000` in dev mode. No CORS setup needed.

### Website (marketing)

```bash
cd website
npm install
npm run dev                   # Next.js on port 3000 (start backend first or change port)
```

---

## Required environment variables

Copy `backend/.env.example` to `backend/.env`. Minimum for local dev:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `DIRECT_URL` | PostgreSQL direct URL (for Prisma migrations) |
| `JWT_SECRET` | Min 32 chars — access token signing |
| `JWT_REFRESH_SECRET` | Min 32 chars — refresh token signing |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `RESEND_API_KEY` | Email delivery (Resend.com) |

Optional for full feature set:

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | AI catalogue import + agent queries |
| `AZAMPAY_APP_NAME` | AzamPay subscription payments |
| `AZAMPAY_CLIENT_ID` | AzamPay credentials |
| `AZAMPAY_CLIENT_SECRET` | AzamPay credentials |
| `AFRICAS_TALKING_USERNAME` | SMS alerts (Africa's Talking) |
| `AFRICAS_TALKING_API_KEY` | SMS alerts |
| `AFRICAS_TALKING_SENDER_ID` | SMS sender label |

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20 · Express 4 · TypeScript 5 |
| Database | PostgreSQL 15 (Railway / Supabase) |
| ORM | Prisma 5 |
| Frontend | React 18 · Vite 5 · Tailwind CSS · Zustand |
| Offline | Workbox service worker · IndexedDB write queue |
| Payments | AzamPay (M-Pesa / Tigo / Airtel / Halo Pesa) |
| Email | Resend |
| SMS | Africa's Talking |
| AI | Anthropic claude-haiku-4-5 |
| Website | Next.js 14 |

---

## Repository layout

```
pharmaconnect/
├── backend/      Node.js API (port 3000)
├── frontend/     React SPA  (port 5173 in dev)
├── website/      Next.js marketing site
├── docs/         Deployment runbook, user manual
├── scripts/      Pre-deploy check, seed scripts
└── CLAUDE.md     Full developer + AI guidance
```

---

## Testing

```bash
# Backend integration tests (requires live DB)
cd backend && npm test

# Frontend unit tests
cd frontend && npm test

# Frontend e2e (requires dev server running)
cd frontend && npm run test:e2e
```

---

## Pre-deploy gate

Run before every production deploy:

```powershell
.\scripts\pre-deploy-check.ps1 -FrontendApiUrl "https://<railway-url>/api/v1"
```

All six gates must pass: Prisma generate → backend build → backend tests → frontend typecheck → frontend build → website build.

---

## Device testing (East Africa context)

APOTEKH targets low-to-mid-range Android devices common in Tanzania and East Africa. Before any release, verify on:

| Device class | Target | Test method |
|---|---|---|
| Low-end Android | Samsung Galaxy A03 or equivalent (360px viewport, Android 11, Chrome Mobile) | Chrome DevTools → responsive mode → Galaxy A (360×800) |
| Mid-range Android | Tecno Camon, Infinix Hot series (720px, Android 12) | Chrome DevTools → responsive mode |
| Slow connection | 3G equivalent | Chrome DevTools → Network throttling → Slow 3G |
| Offline | No connectivity | Chrome DevTools → Network → Offline; test dispensing + stock read |

Key checks:
- App installs as PWA (Add to Home Screen works)
- Dispensing screen usable at 360px width
- Touch targets are ≥ 44px (buttons, nav items)
- Offline sale recording works and syncs on reconnect
- First load < 5 seconds on Slow 3G
- No horizontal scroll at any viewport width

## Deployment

- **Backend**: Railway (Node.js + PostgreSQL)
- **Frontend + Website**: Vercel
- **Database**: Railway PostgreSQL or Supabase

See [docs/deployment-runbook.md](./docs/deployment-runbook.md) for full deployment instructions.
