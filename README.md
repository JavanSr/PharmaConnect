# PharmaConnect MVP

PharmaConnect is a production-minded Phase 1 MVP for Tanzania's pharmacy sector, designed for an initial 10-pharmacy pilot in Arusha. The app ships with fully active inventory, knowledge, and compliance workflows, while Phase 2 modules are visible in-product as polished "Coming Soon" experiences.

## Chosen stack

- Frontend: Next.js 16 App Router with React 19 and TypeScript
- Styling: Tailwind CSS 4 with a lightweight custom design system
- Data layer: Prisma ORM
- Database for local MVP: SQLite
- Production path: Prisma schema is structured so the datasource can be moved to PostgreSQL or Supabase later with minimal application-layer change
- Auth: Secure cookie session using `jose` plus bcrypt password verification

## Architecture summary

- `src/app/(auth)` contains the login experience.
- `src/app/(app)` contains authenticated application routes.
- `src/actions` holds server actions for auth and CRUD workflows.
- `src/lib` contains authentication, permissions, data queries, Prisma client setup, and business logic helpers.
- `src/components` contains the app shell, shared UI primitives, dashboard widgets, forms, and coming-soon experiences.
- `prisma/schema.prisma` defines the core MVP data model.
- `prisma/seed.ts` loads realistic pilot demo data.

## Phase structure

### Phase 1 active

- Inventory Management
- Knowledge Hub
- Regulatory Compliance Tracker

### Phase 2 visible but not active

- Analytics Dashboard
- Patient Management
- Drug Safety Checker

## Core schema

### Users

- `id`
- `name`
- `email`
- `passwordHash`
- `role`
- `pharmacyId`
- `createdAt`

### Pharmacies

- `id`
- `name`
- `region`
- `district`
- `address`
- `phone`
- `email`
- `createdAt`

### Products / Inventory

- `id`
- `pharmacyId`
- `productName`
- `genericName`
- `brandName`
- `category`
- `supplier`
- `batchNumber`
- `quantity`
- `costPrice`
- `sellingPrice`
- `expiryDate`
- `reorderLevel`
- `createdAt`
- `updatedAt`
- `isArchived`

### Stock Movements

- `id`
- `productId`
- `pharmacyId`
- `movementType`
- `quantity`
- `note`
- `createdById`
- `createdAt`

### Knowledge Articles

- `id`
- `title`
- `category`
- `summary`
- `content`
- `featured`
- `published`
- `createdById`
- `createdAt`
- `updatedAt`

### Compliance Items

- `id`
- `pharmacyId`
- `title`
- `category`
- `authority`
- `deadlineDate`
- `reminderDate`
- `status`
- `notes`
- `createdById`
- `createdAt`
- `updatedAt`

### Notifications

- `id`
- `userId`
- `type`
- `title`
- `message`
- `readStatus`
- `createdAt`

## Folder structure

```text
pharmaconnect/
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
├─ src/
│  ├─ actions/
│  ├─ app/
│  │  ├─ (auth)/login
│  │  └─ (app)/
│  │     ├─ dashboard
│  │     ├─ inventory
│  │     ├─ knowledge-hub
│  │     ├─ compliance
│  │     ├─ analytics
│  │     ├─ patients
│  │     ├─ drug-safety
│  │     └─ settings
│  ├─ components/
│  │  ├─ compliance
│  │  ├─ dashboard
│  │  ├─ forms
│  │  ├─ layout
│  │  ├─ shared
│  │  └─ ui
│  └─ lib/
│     ├─ auth.ts
│     ├─ constants.ts
│     ├─ data.ts
│     ├─ permissions.ts
│     ├─ prisma.ts
│     └─ utils.ts
├─ .env.example
└─ package.json
```

## MVP business logic

- Low stock alert when `quantity <= reorderLevel`
- Near-expiry alert using `EXPIRY_WARNING_DAYS`
- Out-of-stock detection when `quantity <= 0`
- Effective compliance status is calculated so past-deadline items become `OVERDUE` unless completed
- Dashboard summaries are based on live stored data
- Knowledge articles support publish/unpublish and featured state

## Demo credentials

- Super Admin: `founder@pharmaconnect.tz` / `Demo123!`
- Pharmacy Admin: `admin@pharmaconnect.tz` / `Demo123!`
- Staff: `staff@pharmaconnect.tz` / `Demo123!`
- Owner: `owner@amani.co.tz` / `Demo123!`
- Dispenser 2: `dispenser2@amani.co.tz` / `Demo123!`
- Data Entry Clerk: `clerk@amani.co.tz` / `Demo123!`
- Wholesale Seller: `seller@amani.co.tz` / `Demo123!`

## Local setup

1. Install dependencies:
   `npm install`
2. Copy environment variables if needed:
   `.env.example` to `.env`
3. Generate Prisma client, create the database, and seed demo data:
   `npm run db:setup`
4. Start the app:
   `npm run dev`
5. Open:
   `http://localhost:5173`

## Verification

- `npm run lint` passes
- `npm run build` passes

Note: in this workspace, OneDrive can occasionally place malformed reparse points inside `node_modules`, which required repairing two third-party dependency references during setup. The application source itself builds successfully after that repair.

## Phase 2 plug-in points

### Analytics Dashboard

- Add a sales and dispensing fact table
- Extend `src/lib/data.ts` with aggregation queries
- Replace `/analytics` placeholder with chart components and KPI tiles

### Patient Management

- Add `Patient`, `Prescription`, `RefillReminder`, and `Visit` models
- Plug a patient workspace into the existing authenticated shell
- Reuse notification patterns for refill reminders

### Drug Safety Checker

- Add medicine interaction reference tables or external service integration
- Introduce patient allergies, contraindications, and medicatcion profile data
- Hook alerts into inventory dispensing and patient-management flows

## Future production hardening

- Switch datasource from SQLite to PostgreSQL or Supabase
- Add audit logging beyond stock movements
- Add pharmacy switching for network-wide super admin workflows
- Add background jobs for reminders and notifications
- Add email/SMS integrations for compliance and patient follow-up
