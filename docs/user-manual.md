# APOTEKH User Manual

_Last updated: 25 June 2026_

Cloud-based, offline-first Pharmacy Management System and digital health ecosystem for Tanzanian retail pharmacies, ADDOs, wholesale distributors, pharmacy owners, and healthcare partners.

Audience:

- Sales and marketing team: use this manual to demo the platform, answer product questions, and explain the rollout story.
- End users: pharmacists, dispensers, Pharmacists In Charge, owners, cashiers, wholesale staff, and delivery staff.
- Investors and partners: use this manual to understand feature depth, workflow maturity, and Tanzania-specific product differentiation.

Availability note:

- Implemented features are described as current product workflows.
- Items marked "Coming Soon" or "Deferred" are visible in the product or website but are not full operational workflows yet.
- Current subscription pricing is published in the pricing matrix below and in `Settings > Subscription`.

---

## 1. Welcome to APOTEKH

### What is APOTEKH?

APOTEKH is an offline-first pharmacy operating system for Tanzania that connects dispensing, inventory, compliance, safety alerts, analytics, wholesale workflows, and professional learning in one platform.

### Key benefits

- Cloud plus offline operation: continue key inventory and dispensing work during unstable internet, then sync when connectivity returns.
- Pharmacy-specific workflows: batch tracking, expiry monitoring, FEFO support, stock movements, controlled-drug registers, and daily close reporting.
- Patient safety at the counter: drug interaction checks, contraindication alerts, pregnancy, breastfeeding, renal, hepatic, allergy, and NCD-related prompts.
- Regulatory readiness: compliance tracker, TMDA inspection checklist, staff credential tracking, source updates, TMDA Updates, and Tanzania-focused master data.
- Tanzania context: TMDA registration fields, NEMLIT and MSD catalogue references, AWaRe antibiotic flags, NHIF and ADR workflows on the roadmap.
- Growth platform: analytics, forecasting preview, B2B wholesale workflows, Knowledge Hub, CPD tracking, and founder controls.

![APOTEKH Dashboard](screenshots/03-owner-dashboard.png)

### Who uses APOTEKH?

- `OWNER`: manages pharmacy operations, subscription, team, analytics, reports, stock decisions, and business oversight.
- `PHARMACIST_IN_CHARGE`: oversees clinical safety, compliance, staff work, stock corrections, PIC PIN overrides, and dispensing quality.
- `DISPENSER`: handles daily dispensing, stock intake, inventory updates, order preparation, and compliance tasks where allowed.
- `CASHIER`: supports dispensing and reports with limited operational access.
- `WHOLESALE_MANAGER`: manages wholesale dashboard, orders, catalogue, invoices, receivables, and supplier operations.
- `WHOLESALE_COUNTER_STAFF`: supports wholesale order picking, verification, and counter workflow.
- `DELIVERY_STAFF`: supports wholesale delivery confirmation and delivery tasks.
- `SUPER_ADMIN`: founder/platform control role with access to founder dashboards, source updates, and cross-platform administration.

---

## 2. Getting Started

### Sign-up and pharmacy registration

Where to find it: `/register`

Who uses it: new pharmacy owners or administrators.

What it does:

The registration page creates the first pharmacy account and the owner/admin login. The form captures pharmacy details and the first administrator account.

Registration fields include:

- Pharmacy Name
- Pharmacy Type: `RETAIL`, `WHOLESALE`, `RETAIL_WHOLESALE`, or `ADDO`
- Region
- Address
- Owner/Admin first name and last name
- Email address
- Password and confirmation

Typical scenario:

1. Open the registration page.
2. Enter the pharmacy name, region, address, and pharmacy type.
3. Enter owner/admin account details.
4. Submit the form.
5. APOTEKH sends an email verification flow when configured by the backend.

![Registration form](screenshots/01-login.png)

### Email verification

Where to find it:

- `/auth/check-email`
- `/auth/verify-email?token=...`

Who uses it: the registering owner/admin.

What it does:

After registration, the user checks their email and opens the verification link. The verification page validates the token, signs the user in, stores authentication, selects the pharmacy, and moves the user to the 14-day trial confirmation page.

If the link is invalid or expired, the page shows an error and directs the user to register again.

### 14-day trial overview

Where to find it: `/auth/trial-confirmed`, Dashboard trial banner, and `Settings > Subscription`

Who uses it: owners, super admins, and users during onboarding.

What it does:

Every newly registered pharmacy enters a 14-day trial. The trial confirmation screen highlights included capabilities:

- Full dispensing workflow
- Inventory and batch tracking with FEFO support
- Drug interaction and safety alerts
- Analytics and financial reports
- Knowledge Hub and TMDA updates
- Compliance tracker and staff credentials

Trial behavior:

- Trial countdown appears in the app when relevant.
- If a trial ends, access is paused except for allowed subscription and read-only exceptions.
- Owners and super admins can open subscription options and contact the founder for renewal or upgrade.

![Trial confirmed page](screenshots/02-trial-confirmed.png)

### Choosing a subscription tier

Where to find it: `Settings > Subscription`

Who uses it: `OWNER`, `SUPER_ADMIN`

What it does:

The Subscription page shows current tier, billing cycle, trial status, trial countdown, manual payment instructions, payment method setup, and upgrade contact options.

Known tier names in the platform:

- `ADDO`
- `BASIC`
- `STANDARD`
- `PREMIUM`
- `WHOLESALE`
- `ENTERPRISE`

Current pricing:

**Retail tiers:**

| Plan | Monthly price | Annual price | Included scale |
|---|---:|---:|---|
| ADDO | Tsh 15,000 | Tsh 150,000 | 1 outlet, 3 users |
| BASIC | Tsh 39,000 | Tsh 390,000 | 2 outlets, 5 users |
| STANDARD | Tsh 55,000 | Tsh 550,000 | 3 outlets, 10 users |
| PREMIUM | Tsh 75,000 | Tsh 750,000 | 5 outlets, 20 users |

**Wholesale / distributor tiers:**

| Plan | Monthly price | Annual price | Included scale |
|---|---:|---:|---|
| WHOLESALE | Tsh 100,000 | Tsh 1,000,000 | 1 wholesale outlet, 10 users + delivery staff |
| ENTERPRISE | Custom | Custom | 6+ outlets, unlimited users |

Annual billing is 10x the monthly price. Enterprise pricing is negotiated for custom rollout, reporting, and governance needs.

### First login and pharmacy setup

Where to find it:

- `/login`
- `/select-pharmacy`
- `Settings > Profile`
- `Settings > Team`
- `Settings > Subscription`
- `Compliance`
- `Inventory`

What to do after first login:

1. Verify that the correct pharmacy is active.
2. If the user has multiple pharmacy memberships, choose the active outlet in Outlet Selection.
3. Review pharmacy information in `Settings > Profile`.
4. Add team members in `Settings > Team`.
5. Configure dispensing payment methods in `Settings > Subscription`.
6. Add compliance items such as licences, insurance, equipment checks, and staff credentials.
7. Add or import products, then receive stock batches.

Important pharmacy data in the backend includes:

- `licenceNumber`
- `region`
- `pharmacyType`
- `subscriptionTier`
- `billingCycle`
- `status`
- `timezone`, defaulting to `Africa/Nairobi`
- `vfdEnabled`
- `userLimit`

---

## 3. Dashboard & Navigation

### Main dashboard

Where to find it: `Dashboard`

Who uses it: all signed-in users with access to the active pharmacy.

What it does:

The Dashboard gives a daily operating snapshot. It greets the user, shows the date, and provides quick actions for `Dispense` and `Receive Stock`.

Main widgets include:

- Total Products
- Low Stock Items
- Expiring <=30 Days
- Low Stock Alerts
- Recent Movements
- Today's Activity
- Expiry Countdown

Typical scenario:

1. A PIC logs in at the start of the day.
2. They check expiring batches and low-stock alerts.
3. They open Inventory or Receive Stock directly from the dashboard.
4. They review recent stock movements and today's dispensing activity.

![Dashboard](screenshots/03-owner-dashboard.png)

### Sidebar navigation

The main sidebar includes these active and visible sections depending on role:

- `Dashboard`
- `Dispensing`
- `Inventory`
- `Receive Stock`
- `Order Preparation`
- `Compliance`
- `Analytics`
- `Reports`
- `Safety Alerts`
- `Controlled Register`
- `Knowledge Hub`
- `TMDA Updates`
- `Wholesale`
- `Orders`
- `Staff Activity`
- `Sync Conflicts`
- `Settings`

Coming Soon sidebar items include:

- `CPD Tracker`
- `NHIF Claims`
- `PC-Accredited CPD`
- `Stock Exchange`
- `TMDA Reporting`
- `ADR Reporting`
- `Patient App`
- `AI Safety`
- `Data Products`

Some of these have working pages, while others intentionally show deferred feature pages or waitlist forms.

### Top bar

The top bar includes:

- Back button
- Page title where available
- Active pharmacy outlet selector for users with multiple active memberships (inactive or removed outlets are not shown)
- Connectivity status: `Synced`, `Offline`, or pending sync count with tap-to-retry
- Quick actions: `Dispense` and `Receive`
- Notification bell

### App update banner

When a new version of APOTEKH is available, a dark banner appears at the top of the screen:

> "A new version of APOTEKH is ready — see what's new"

- Tap **see what's new** to expand the list of changes in this release.
- Tap **Update now** to apply the update. The app reloads instantly with the new version.
- Tap the × on the right to dismiss the banner and update later. The update applies automatically on the next page load.

The update banner never applies a new version silently while you are mid-session. You must confirm with **Update now**.

![Top bar — Synced status](screenshots/03-owner-dashboard.png)

### Role-based views

Navigation and API permissions are role-aware.

Examples:

- `SUPER_ADMIN` can access founder controls and platform-level admin views.
- `OWNER` can manage subscription, team, reports, stock, wholesale, and compliance.
- `PHARMACIST_IN_CHARGE` can manage dispensing safety, compliance, stock adjustments, team-related workflows, and reports.
- `DISPENSER` can dispense, receive stock, manage some inventory, submit stock adjustment suggestions, and use assigned workflows.
- `CASHIER` can access dispensing and financial reports where permitted.
- Wholesale roles see wholesale-specific dashboards, orders, picking, and delivery workflows.

---

## 4. Inventory Management

### Inventory dashboard

Where to find it: `Inventory`

Who uses it: `OWNER`, `PHARMACIST_IN_CHARGE`, `DISPENSER`, wholesale inventory roles, `SUPER_ADMIN`

What it does:

The Inventory page summarizes stock health and provides links to all inventory tasks.

Buttons and pages include:

- `Receive Stock`
- `Adjust Stock`
- `Products`
- `Import Catalogue`
- `Drug Catalogue`
- `Batches`
- `Conflicts`

Dashboard cards show:

- Total SKUs
- Total Units
- Low Stock
- Expiring <=30d
- Low Stock Items
- Expiring Soon

![Inventory dashboard](screenshots/05-products-list.png)

### Product catalogue

Where to find it:

- `Inventory > Products`
- `Inventory > Add Product`
- `Inventory > Edit Product`

Who uses it: inventory managers, PICs, dispensers where allowed, owners.

What it does:

Products is the pharmacy's local stock catalogue. It is different from the system-wide Drug Catalogue. Local products are what staff search, receive, and dispense.

Product fields include:

- Generic Name
- Brand / Trade Name
- Product Name
- Manufacturer
- Therapeutic Category
- Drug Class: `OTC`, `PRESCRIPTION`, `CONTROLLED`, `NARCOTIC`
- SKU / Item Code
- Barcode
- TMDA Registration No.
- Description
- Dosage Form
- Strength
- Unit of Measure
- Pack Size
- Storage Condition
- Default Purchase Price
- Selling Price
- Reorder Level
- Minimum Stock

Product list filters:

- Search by name, generic name, barcode, batch number, or SKU.
- Filter by Storage Condition: `Ambient`, `Refrigerated`, `Frozen`.
- Sort by name, stock level, or reorder urgency.
- Toggle `Low Stock Only` to show only items at or below their reorder level.

Typical scenario:

1. Open `Inventory > Products`.
2. Search by name, generic name, barcode, or SKU.
3. Open an existing item or click `Add Product`.
4. Fill required product details.
5. Save, then receive stock batches for that product.

![Products list with filters](screenshots/05-products-list.png)

![Add Product form](screenshots/06-add-product.png)

### Drug Catalogue

Where to find it: `Inventory > Drug Catalogue`

Who uses it: pharmacists, PICs, owners, dispensers creating cleaner products.

What it does:

Drug Catalogue is the system-wide medicine reference list. It is not the pharmacy's current stock list. It helps staff search official/reference product names, generic names, brands, manufacturers, TMDA numbers, storage condition, and NEML status.

Search and filters include:

- Drug name
- Brand
- Manufacturer
- MSD/TMDA number
- Storage condition: Ambient, Refrigerated, Frozen
- `NEML only`

Typical scenario:

1. Search for a medicine in `Drug Catalogue`.
2. Confirm form, strength, pack, storage, registration, and flags.
3. Use the match when creating or receiving a local product.

![Drug Catalogue](screenshots/07-drug-catalogue.png)

### Catalogue import from supplier PDFs

Where to find it: `Inventory > Import Catalogue`

Who uses it: owners, PICs, dispensers managing product setup.

What it does:

Import Catalogue lets a user upload a supplier PDF, extract medicine rows using AI-assisted catalogue import, review the rows, skip duplicates, and save selected products into inventory.

Typical scenario:

1. Open `Inventory > Import Catalogue`.
2. Upload a supplier PDF.
3. Review extracted rows for product name, generic name, brand, strength, dosage form, manufacturer, pack size, and TMDA registration number.
4. Remove bad rows or edit fields.
5. Save products to inventory.

Availability note:

The backend warns if `ANTHROPIC_API_KEY` is not configured. In that case, AI catalogue import may be unavailable.

### Batch management and FEFO

Where to find it:

- `Inventory > Batches`
- `Inventory > Expiry Dashboard`
- `Inventory > Receive Stock`
- Product detail views

Who uses it: PICs, dispensers, inventory managers, owners.

What it does:

APOTEKH tracks stock at batch level. Each batch stores:

- Product
- Batch number
- Expiry date
- Quantity remaining
- Purchase price
- Supplier
- Received date

FEFO means First Expiry, First Out. APOTEKH supports FEFO by making expiry and batch-level quantities visible and by using batch-aware stock movements during dispensing and receiving.

Typical scenario:

1. Open `Inventory > Batches`.
2. Search by product or batch number.
3. Review quantity remaining and expiry status.
4. Use `Expiry Dashboard` to prioritize batches expiring soon.

![Expiry and Batch Tracker](screenshots/08-expiry-tracker.png)

### Stock intake

Where to find it: `Inventory > Receive Stock`

Who uses it: dispensers, PICs, owners, wholesale managers where allowed.

What it does:

Receive Stock records incoming medicines into batches. It supports product search, barcode lookup, system master catalogue matching, supplier selection, batch details, pack-price conversion, selling price update, and offline queueing.

Stock intake methods:

- Search local products.
- Use the system master catalogue to create a local product.
- Scan or manually enter a barcode.
- Add one line or multiple lines to an intake cart.
- Receive all items together.

Barcode behavior:

- Camera scanning uses the device camera when supported.
- Manual barcode entry is available for keyboard scanners or typed codes.
- Barcode lookup checks local mappings, user mappings, GS1-style data where available, and misses.
- If no product is matched, staff can search manually and save a barcode mapping.

Typical scenario:

1. Open `Inventory > Receive Stock`.
2. Select supplier for the receipt, if known.
3. Search or scan the product.
4. Select a local product or create one from master catalogue.
5. Enter batch number, expiry date, quantity, purchase price, and optional selling price. A live profit margin indicator appears below the selling price field — colour-coded green (good margin), amber (low or unusually high), or red (selling below cost).
6. If the batch expiry is within 60 days, a live expiry gate warning fires — review urgency level before proceeding.
7. Add to cart. The intake cart sits in a side panel to the right of the form, so all queued items remain visible without scrolling.
8. Repeat for other products.
9. Click `Receive all` in the cart panel.

![Receive Stock — intake form](screenshots/07-stock-intake.png)

![Receive Stock — barcode scanner](screenshots/08b-barcode-scanner.png)

Offline behavior:

- If offline, batch writes are queued in IndexedDB.
- The top bar shows pending sync count.
- When connection returns, queued writes sync automatically.
- Rejected writes become inventory conflicts where possible.

### Stock adjustments and photo evidence

Where to find it: `Inventory > Adjust Stock`

Who uses it:

- `DISPENSER`: submits stock adjustment suggestions.
- `OWNER`, `PHARMACIST_IN_CHARGE`, `SUPER_ADMIN`: submit and review adjustment requests.

What it does:

Stock adjustments are handled as requests with an approval trail. Dispensers do not directly change stock. They submit a suggestion with product, optional batch, quantity delta, reason, note, and optional photo evidence.

Reasons include:

- Count variance
- Damaged stock
- Expired stock
- Return to supplier
- Found stock / increase
- Other

Typical scenario:

1. A dispenser finds damaged stock.
2. They open `Inventory > Adjust Stock`.
3. They search the product, select a batch if needed, enter a negative quantity delta, choose `DAMAGED`, add a note, and attach a photo.
4. The PIC opens the pending owner review section.
5. The PIC approves, partially approves, or rejects the request.
6. Approved changes apply stock movement and preserve audit context.

![Stock Adjustment](screenshots/10-stock-adjustment.png)

### Expiry dashboard and automatic alerts

Where to find it:

- `Inventory > Expiry Dashboard`
- Dashboard `Expiry Countdown`
- Analytics `Expiry Risk`

Who uses it: owners, PICs, dispensers, compliance users.

What it does:

Expiry views help staff identify batches expiring soon. Dashboard and analytics views highlight 30-day risk; analytics includes wider risk windows such as 1, 7, 30, 60, and 90 days.

Backend jobs include expiry alert generation, low-stock alerts, compliance alerts, and weekly digest jobs.

![Expiry Dashboard](screenshots/08-expiry-tracker.png)

### Order Preparation

Where to find it: `Order Preparation`

Who uses it: `OWNER`, `PHARMACIST_IN_CHARGE`, `DISPENSER`, `WHOLESALE_MANAGER`, `SUPER_ADMIN`

What it does:

Order Preparation is the full stock-ordering workflow -- from identifying what to buy, through getting supplier confirmation, to receiving goods. Orders progress through: Draft, Submitted, Partially Received, Received, Cancelled.

#### Building an order

1. Open `Order Preparation`.
2. Click `New Order`. Give the order a name and optional notes.
3. Add items by searching your inventory or accepting low-stock suggestions.

Each line item shows:

- **Current stock badge** -- the quantity on hand right now, so you order the right amount without switching screens.
- **Urgency colouring** -- lines turn red (critically low / out of stock), amber (low), yellow (getting low), or green (adequate). The colour updates as you edit quantities.
- **Running cost totals** -- the order subtotal updates instantly as you adjust quantities or unit costs. No mental arithmetic required.

#### Inline supplier price comparison

Before finalising quantities, click **Compare Prices** on any line item. A panel slides in showing all catalogued suppliers that carry that product, sorted by unit price. The cheapest option gets a "Cheapest" badge. Supplier contact details (phone, email) are shown so you can reach them directly via WhatsApp or call if needed.

This eliminates the need to leave the order screen to check what Shelys or Metro are charging.

#### Duplicate detection

If you add a product that is already on the current order (e.g. searched twice), the system warns you and highlights the existing line so you can update it rather than create a duplicate entry.

#### Submitting with supplier details

When you are ready to submit:

1. Click **Submit Order**.
2. The confirmation modal shows the full order summary.
3. Optionally enter **Supplier Name**, **Supplier Phone**, and **Supplier Email** in the supplier fields.
4. Click **Confirm & Submit**.

If you provided a supplier phone number, APOTEKH generates a tokenized supplier portal link and opens a pre-filled WhatsApp message to the supplier automatically. The supplier receives the link, opens it in any browser (no account needed), and confirms or adjusts quantities and prices.

#### Export options

After an order is saved or submitted, two export options are available:

- **Export as Text** -- a plain-text order summary you can copy and paste into any message or document.
- **Send via WhatsApp** -- opens WhatsApp with a pre-formatted message containing the order number, pharmacy name, line items, and the portal link (if a supplier portal was generated).

#### Receiving stock

When goods arrive, open the submitted order and click **Receive Items**. For each line: enter batch number, expiry date, quantity received, actual unit cost, and selling price. APOTEKH runs the expiry gate check -- if a batch expires within 60 days, a live warning fires with urgency level (CRITICAL, URGENT, WARNING, CAUTION, or INFO). Batches expiring before they could be sold should not be received.

![Order Preparation](screenshots/19-stock-orders.png)

---

### Tokenized Supplier Portal

Where to find it: Link sent via WhatsApp by APOTEKH when a stock order is submitted with a supplier phone number. No APOTEKH account required.

Who uses it: Supplier / wholesaler staff (external to APOTEKH)

What it does:

The Supplier Portal allows a wholesaler who does not have an APOTEKH account to receive, review, and confirm (or reject) a purchase order directly from a link in WhatsApp -- using any browser on any device.

#### How it works (pharmacy side)

1. When submitting a stock order, enter the supplier's phone number in the confirmation modal.
2. APOTEKH generates a unique 14-day link and opens a pre-filled WhatsApp message.
3. Send the WhatsApp message. The supplier receives it with no further action needed from you.
4. Once the supplier responds, you receive an in-app notification: "[Supplier Name] confirmed your order" or "[Supplier Name] rejected your order."
5. Open the notification to see confirmed quantities, unit prices, any notes, and the estimated delivery date.

#### How it works (supplier side)

The supplier taps the link in WhatsApp and sees a simple webpage showing:

- Your pharmacy name and order number
- Each product with the quantity you requested
- Input fields to enter the quantity they can supply, unit price, and a note per line
- An overall supplier note field and estimated delivery date
- A **Confirm Order** or **Reject Order** button

The supplier does not create an account or log in. The link is valid for 14 days and can only be used once to confirm or reject. If the supplier can only supply some items, they enter a lower quantity -- this records as a partial confirmation.

#### Portal status tracking

Each order portal moves through states: PENDING (link sent, not yet opened), VIEWED (opened), CONFIRMED, PARTIALLY_CONFIRMED, REJECTED, or EXPIRED (link past 14 days).

This is Tier 2 of the three-tier wholesaler integration model: Tier 1 is a wholesaler already on APOTEKH (in-app orders); Tier 2 is this tokenized portal; Tier 3 is direct API/ERP integration (Phase 2).

![Supplier portal — supplier confirmation view](screenshots/27-supplier-portal.png)

![Order Preparation — portal status on submitted order](screenshots/28-order-portal-status.png)

### Sync Conflicts

Where to find it: `Sync Conflicts` or `Inventory > Conflicts`

Who uses it: `OWNER`, `PHARMACIST_IN_CHARGE`, `SUPER_ADMIN`

What it does:

Sync Conflicts shows queued local writes and server conflicts created after offline sync rejection. Staff can review local payloads, server responses, and resolve open conflicts.

---

## 5. Dispensing & Point-of-Sale

### Dispensing screen

Where to find it: `Dispensing`

Who uses it: `PHARMACIST_IN_CHARGE`, `DISPENSER`, `CASHIER`, `SUPER_ADMIN`

What it does:

The Dispensing screen is the main point-of-sale workflow. It combines patient context, medicine search, safety checks, basket management, payment method selection, optional prescription photo, discount controls, and receipt output.

![Dispensing screen](screenshots/09-dispensing.png)

### Step-by-step dispensing flow

1. Open `Dispensing`.
2. Choose walk-in customer or enter patient/customer context.
3. Add optional patient details:
   - Phone
   - Age
   - Weight
   - Diagnoses
   - Allergies
   - Pregnant
   - Breastfeeding
   - Renal impairment
   - Hepatic impairment
4. Search medicine by product name, generic name, barcode, or SKU. Only medicines with stock on hand appear in search results.
5. Select the medicine from the suggestion list. The patient safety panel opens automatically — fill in any relevant clinical flags (pregnant, breastfeeding, renal/hepatic impairment, known allergies, diagnoses) before proceeding.
6. Enter quantity in the quantity dialog, then click `Add to basket`.
7. To view medicine details (brand, strength, form, AWaRe flag, stock level), click the **i** button on any basket item.
8. Add counselling notes if needed.
9. Review patient safety alerts shown in the safety panel. Alerts are grouped into High, Moderate, and Informational.
10. If a safety alert fires, review it and acknowledge to proceed. No PIN is required — the dispenser proceeds at their own professional risk. The override is logged automatically under the dispenser's name.
11. Select payment method.
12. Enter payment reference if the method requires it (e.g. M-Pesa transaction code).
13. Attach a prescription photo if needed and online.
14. Click `Complete dispensing`.
15. Download or review the receipt.

![Dispensing — basket with medicine info panel](screenshots/12b-dispensing-info-panel.png)

Current payment methods include:

- `CASH`
- `MPESA`
- `TIGOPESA`
- `AIRTEL_MONEY`
- `HALOPESA`
- `INSURANCE`

Owners can configure mobile money payment details from `Settings > Subscription`.

### Batch picking and FEFO

Dispensing is stock-aware and batch-aware in the backend. The app prevents dispensing more units than available. Product and batch records preserve stock movement history, and FEFO support is available through batch expiry views and backend stock allocation.

If staff need to inspect batch-level stock before dispensing, use `Inventory > Batches` or the product detail view.

### Offline dispensing

Offline dispensing is supported for core checkout without prescription photo upload.

What works offline:

- Add products to basket using cached/searchable product data already available to the browser.
- Complete a dispensing session.
- Queue the transaction locally.
- Apply local inventory deltas so stock shown on the device reflects the queued sale.
- Sync automatically when connection returns.

What does not work offline:

- Prescription photo upload requires a network connection before checkout.
- Server-only safety checks may be unavailable if not already fetched.
- Fresh product search depends on cached reads and available local data.

What happens when the device reconnects:

1. The queued dispensing session is posted to `/dispensing/sync-batch`.
2. If accepted, local inventory deltas for that session are removed.
3. If a conflict is detected, the transaction is marked for review and visible through conflict workflows where applicable.
4. The pending sync count decreases.

![Top bar — sync status](screenshots/03-owner-dashboard.png)

### Payment methods

Where to configure: `Settings > Subscription`

Who uses it: `OWNER`, `SUPER_ADMIN`

Cash always stays enabled as the fallback method. Mobile money methods can include name, phone number, active status, and cashier note. Dispensing uses cached payment methods if the server is temporarily unavailable.

Typical scenario:

1. Owner opens `Settings > Subscription`.
2. Scrolls to `Dispensing payment methods`.
3. Adds M-Pesa or another mobile money option.
4. Enters number and cashier note.
5. Saves payment methods.
6. Dispensers see the option on the Dispensing screen.

### Discounts

Who can apply: `OWNER`, `PHARMACIST_IN_CHARGE`, `SUPER_ADMIN`

Discount controls appear in the basket and payment area only for permitted roles. Discount is selected from a preset percentage dropdown (5%, 10%, 15%, 20%, 25%, 50%) or entered as a custom Tsh amount. The Tsh amount is calculated automatically from the subtotal when a preset percentage is chosen. A reason is required and selected from a dropdown (Staff discount, Loyalty customer, Near expiry, Damaged packaging, Promotion, Manual override, Other).

### Daily close and shift reports

Where to find it: `Dispensing > Daily Close`

Who uses it: cashiers, owners, PICs, managers.

What it does:

Daily Close summarizes dispensing activity for the day or shift so teams can reconcile sales, payment methods, and records.

### Returns, refunds, and voids

Where to find it: `Dispensing > Returns`

Who uses it: `OWNER`, `PHARMACIST_IN_CHARGE`, `SUPER_ADMIN`

What it does:

Returns and void actions let authorized staff reverse or adjust completed dispensing events. This is role-restricted because it affects sales and stock audit history.

Typical scenario:

1. Open `Dispensing > Returns`.
2. Search or select a dispensing event.
3. Review event details.
4. Record return or void reason.
5. Confirm the action.

---

## 6. Patient Safety & Clinical Decision Support

### Patient safety panel

Where to find it: `Dispensing`

Who uses it: pharmacists, PICs, dispensers, owners.

What it does:

Patient Safety reviews the current basket and patient context before checkout. It checks:

- Drug-drug interactions
- Contraindications
- Precaution alerts
- Required patient inputs
- NCD hints
- Dose support
- Counselling suggestions

Availability:

- Available to all retail pharmacy tiers: `ADDO`, `BASIC`, `STANDARD`, `PREMIUM`, and `ENTERPRISE`. Clinical Decision Support is never tier-gated.
- Not shown for wholesale-only roles (`WHOLESALE`), as wholesale does not include retail dispensing.

![Patient safety panel — summary counts and alert list](screenshots/12c-dispensing-safety-panel.png)

### Severity levels

The app summarizes alert severity as:

- **High** — drug-drug interactions classified MAJOR or SEVERE, or contraindications that are absolute. Shown as full alert strips with red border and background.
- **Moderate** — interactions or precautions that are significant but not absolute. Shown as condensed rows with amber styling.
- **Informational** — counselling prompts, NCD hints, dose reminders, AWaRe flags. Shown as text only.

### Clinical override model

APOTEKH uses a **dispenser-proceeds-at-own-risk** model. No PIN is required to proceed past a safety alert at any severity level.

How it works:

1. When a drug interaction, contraindication, or AWaRe RESERVE alert fires, the safety panel shows a clear warning.
2. The dispenser reviews the alert details and makes a professional decision.
3. To proceed, they acknowledge the alert and continue to checkout.
4. The override is logged automatically against the dispenser's account: who, which drug, what alert level, what time.

The override log is immutable — it cannot be deleted by any role, including SUPER_ADMIN. This is by design: the warning is the protection; the log is the accountability.

Where to review: `Safety Alerts`

![Safety panel — interaction alert with override log](screenshots/14-safety-alerts.png)

### Contraindication checks

The patient safety session can consider:

- Pregnancy
- Breastfeeding/lactation
- Renal impairment
- Hepatic impairment
- Allergies
- Diagnoses
- Age
- Weight

When the safety rules need missing data, the UI shows rule-triggered patient checks and asks the dispenser to capture the relevant flags.

### AI-powered counselling suggestions

The patient safety panel can show counselling suggestions based on the safety review and patient flags.

Backend support includes an `AiCounsellingCache` table. Suggestions may be generated from rule templates or cached so repeat counselling guidance is faster and more consistent.

The UI displays a `Cached` badge when cached suggestions are used.

### NCD hints

NCD hints are shown when drug and diagnosis context suggests chronic disease considerations. They help the pharmacy team remember counselling, adherence, and referral prompts during dispensing.

### Dose calculator

Where to find it: `Dispensing`

What it does:

The dose calculator is off by default and can be enabled when needed. It supports:

- Adult dose input
- Age in years
- Weight in kg
- Recommended mg/kg text
- Clark's method
- Young's method
- Weight-based working

If a pediatric patient is detected without weight, the calculator prompts staff to add weight before using dose support.

![Dispensing — Dose calculator](screenshots/09-dispensing.png)

### AWaRe antibiotic flags

Where to find it: `Dispensing` medicine search and basket lines.

What it does:

The system flags `WATCH` and `RESERVE` antibiotics using WHO AWaRe / Tanzania NEMLIT context.

- `WATCH antibiotic`: warning badge
- `RESERVE antibiotic`: danger badge
- `ACCESS` antibiotics and non-antibiotics do not show the badge

This is informational only. It does not block dispensing or require PIC PIN by itself.

### Controlled drugs register

Where to find it: `Controlled Register`

Who uses it: `OWNER`, `PHARMACIST_IN_CHARGE`, `SUPER_ADMIN`

What it does:

The Controlled Register is generated from completed dispensing events. It highlights controlled and narcotic lines with:

- Reference number
- Medicine
- Drug class
- Quantity
- Batch
- Dispensed by
- Timestamp
- Payment method

![Controlled Register](screenshots/13-controlled-register.png)

---

## 7. Patient Management

### Patient context during dispensing

Where to find it: `Dispensing`

Who uses it: dispensers, pharmacists, PICs.

What it does:

The current dispensing screen supports session-level patient/customer context for safer dispensing. Staff can record name or label, phone, age, weight, diagnoses, allergies, pregnancy, breastfeeding, renal impairment, and hepatic impairment.

The screen also supports session shortcuts and phone-based matching from the local dispensing patient store.

### Patient profiles

Backend support exists for patient profiles with:

- First name
- Last name
- Date of birth
- Gender
- Phone
- NHIF number
- Allergies
- Chronic conditions
- Notes

Current product note:

The main sidebar routes `/patients/new` and `/patients/:id` redirect to `Patient Records`, which is currently a deferred page. For demos, present patient management as partly implemented in dispensing context and planned as a fuller patient records module.

### Prescription photos and history

Where to find it: `Dispensing`

What it does:

During checkout, staff can attach a prescription photo using the device camera or image upload. Supported image types include PNG, JPEG, and WebP. Prescription photos require network connection because the file must upload during checkout.

Backend support stores prescription metadata linked to pharmacy, optional patient, dispensing event, reference number, photo path, and creator.

![Dispensing basket](screenshots/09-dispensing.png)

### NHIF claims

Where to find it: `NHIF Claims`

Status: Coming Soon / Deferred

What it does:

NHIF Claims is visible in the product roadmap and sidebar. The current page is a deferred placeholder. Backend schema support exists for claims and claim items, but the full claim submission workflow is not yet live.

Planned workflow:

1. Select patient/member.
2. Verify NHIF details.
3. Add claim items and ICD code where required.
4. Scrub missing or invalid fields.
5. Submit claim.
6. Track status: draft, submitted, approved, rejected, paid, or resubmitted.

---

## 8. Compliance & Regulatory

### Compliance dashboard

Where to find it: `Compliance`

Who uses it: `OWNER`, `PHARMACIST_IN_CHARGE`, `DISPENSER`, `SUPER_ADMIN`, and selected wholesale roles.

What it does:

Compliance Tracker turns licences, insurance, equipment checks, safety obligations, record keeping, and staff credentials into visible dated tasks.

The dashboard shows:

- Health Score
- Status breakdown: `GREEN`, `AMBER`, `RED`, `EXPIRED`
- Urgent Attention Required
- Links to Staff Credentials, Inspection Checklist, and Add Item

Offline behavior:

The compliance dashboard caches a local IndexedDB snapshot. If live data is unavailable, it can show an offline snapshot with the last synced time.

![Compliance Tracker](screenshots/15-compliance.png)

### Compliance items

Where to find it:

- `Compliance > All items`
- `Compliance > Add Item`
- `Compliance > Item Detail`

Categories include:

- `LICENCE`
- `INSURANCE`
- `EQUIPMENT`
- `STAFF_CREDENTIAL`
- `SAFETY`
- `RECORD_KEEPING`
- `OTHER`

Typical scenario:

1. Open `Compliance`.
2. Click `Add Item`.
3. Enter title, category, issuing body, expiry/due dates, renewal date, and notes.
4. Upload supporting documents where required.
5. Track status from dashboard.

### Inspection checklist generator

Where to find it: `Compliance > Inspection Checklist`

Who uses it: `OWNER`, `PHARMACIST_IN_CHARGE`, `SUPER_ADMIN`

What it does:

The TMDA Inspection Checklist page generates inspection readiness checklists from backend templates. Items can be marked:

- Pending
- Compliant
- Non-Compliant
- Not Applicable

Non-compliant items require a note. The page calculates a readiness score and supports printing or PDF download when a PDF URL exists.

Typical scenario:

1. Open `Compliance > Inspection Checklist`.
2. Click `New Checklist`.
3. Review categories and items.
4. Click each item to cycle status.
5. Add notes for non-compliant findings.
6. Print or download the checklist for inspection preparation.

![TMDA Inspection Checklist](screenshots/16-inspection-checklist.png)

### Staff credentials

Where to find it: `Compliance > Staff Credentials`

Who uses it: owners, PICs, compliance managers.

What it does:

Staff Credentials tracks professional registrations, certificates, and renewal evidence.

Fields include:

- Credential Name
- Credential Number
- Issuing Body
- Issued At
- Expires At
- Notes

![Staff Credentials](screenshots/17-staff-credentials.png)

### Pharmacovigilance

Where to find it: `ADR Reporting` / `/pharmacovigilance`

Status: Coming Soon / Deferred

What it does:

The current page is a deferred placeholder for Adverse Drug Reaction Reporting. The schema exists for future ADR reports, including suspected drug, brand, batch, reaction, onset, outcome, patient age/sex, seriousness, status, TMDA reference number, and submitted timestamp.

Planned use:

1. PIC opens ADR Reporting.
2. Enters suspected medicine and reaction details.
3. Saves draft.
4. Submits to TMDA when electronic integration is ready.
5. Tracks TMDA reference and submission status.

### Cold chain monitoring

Status: schema-ready, no full UI/API yet.

What it does:

Products can carry cold chain fields such as `coldChainRequired`, `storageCondition`, and Drug Catalogue flags. Backend schema includes a `ColdChainLog` table for future temperature logs with product, storage unit, temperature, excursion flag, notes, and timestamp.

For current demos, describe cold chain as a data-ready compliance feature with product-level flags already visible and temperature-log workflow planned.

---

## 9. Forecasting & Analytics

### Analytics

Where to find it: `Analytics`

Who uses it: `OWNER`, `PHARMACIST_IN_CHARGE`, `DISPENSER`, `CASHIER`, `WHOLESALE_MANAGER`, `SUPER_ADMIN` depending on permissions.

What it does:

Analytics provides operational snapshots from inventory, movements, compliance, and active modules.

Widgets include:

- Total Stock Value
- Units Dispensed
- Low / Out of Stock
- Compliance Score
- Stock Movements
- Compliance Breakdown
- Top Dispensed Products
- Expiry Risk
- Storage Conditions
- Multi-outlet Compare for Enterprise where available

![Analytics](screenshots/04-analytics.png)

### Reports

Where to find it: `Reports`

Who uses it: `OWNER`, `PHARMACIST_IN_CHARGE`, `CASHIER`, `WHOLESALE_MANAGER`, `SUPER_ADMIN`

What it does:

Reports is a tabbed reporting workspace covering sales, profitability, inventory, safety, and compliance. All tabs with date ranges support CSV and PDF export where available.

Wholesale pharmacies see a separate wholesale-specific view with demand insights and receivables aging instead of the retail tabs.

**Retail report tabs:**

| Tab | Who can see it | What it shows |
|---|---|---|
| Sales | OWNER, PIC, SUPER_ADMIN | Revenue, sales count, items sold, average basket, time-series bar chart, top products by volume, payment method breakdown. Period presets: Today, Last 7d, Last 30d, Last 90d, This year, Custom. |
| Profit | OWNER, SUPER_ADMIN | Gross profit, COGS, margin %, period-over-period comparison. Chart toggles between profit waterfall and margin % trend. Per-product breakdown (top profit products and lowest-margin products) unlocks at PREMIUM. Requires STANDARD or above — returns a tier-gate prompt on lower tiers. |
| Expiry | All permitted roles | Batches expiring within a selected threshold (1d, 7d, 14d, 21d, 30d, 90d), urgency-coded (CRITICAL → MONITOR). Export CSV or PDF. |
| Dispensing | All permitted roles | Top products by revenue with bar chart and table. Total revenue and transaction count for the selected period. Export CSV or PDF. |
| Payments | All permitted roles | Revenue split by payment method (Cash, M-Pesa, Tigo Pesa, etc.) as pie chart and list with transaction counts. |
| Stock movement | All permitted roles | All stock movements (RECEIVED, DISPENSED, ADJUSTED, DAMAGED, EXPIRED_REMOVED) for the period with staff attribution. Export CSV or PDF. |
| Voids & returns | All permitted roles | Voided transactions with amount, reason, staff member, and date. Export CSV or PDF. |
| Safety | All permitted roles | Total alerts, overrides, allergy flags, and contraindicated events for the last 30 days. |

**Wholesale report view:**
- Revenue and order counts: last 30 days vs previous 30 days
- Fulfillment rate
- Top 10 products by revenue (bar chart)
- Receivables aging by bucket

![Reports](screenshots/17-reports.png)

### Forecasting

Where to find it: `Forecasting`, linked from `Analytics`

Who uses it: owners, PICs, managers, investors during demos.

What it does:

Forecasting is an early preview based on deterministic methods, not opaque AI claims. It uses available stock movement history.

Forecasting views include:

- Stockout forecast
- Seasonality, Premium and above
- Dead stock ranking, Premium and above
- Regional demand insights status

Forecasting warning:

The UI states that forecasting engines are still being calibrated and figures are indicative only.

Typical scenario:

1. Open `Analytics`.
2. Click `Open forecasting workspace`.
3. Review stockout forecast by current stock, average daily demand, lead time, estimated stockout date, and at-risk value.
4. For Premium/Enterprise, review seasonality and dead-stock ranking.

![Forecasting](screenshots/23-forecasting.png)

### Feature telemetry

What it does:

The backend includes feature telemetry support to understand product usage patterns and improve rollout decisions. This is primarily a platform improvement feature rather than an end-user workflow.

For investor demos, position telemetry as a product learning loop that helps APOTEKH see which workflows create adoption and where training may be needed.

---

## 10. Wholesale & B2B Operations

### Wholesale dashboard

Where to find it: `Wholesale`

Who uses it: `OWNER`, `WHOLESALE_MANAGER`, `WHOLESALE_COUNTER_STAFF`, `DELIVERY_STAFF`, `SUPER_ADMIN` depending on workflow.

What it does:

Wholesale Dashboard supports B2B distributor operations and hybrid retail/wholesale pharmacies.

Dashboard cards include:

- Catalogue lines
- Orders in view
- VAT invoices
- Open receivables
- Demand insights
- Receivables aging
- Open orders
- EFDMS invoice queue
- Credit controls

![Wholesale Dashboard](screenshots/25-wholesale-dashboard.png)

### Wholesale orders

Where to find it: `Orders` or `Wholesale > Orders`

What it does:

Wholesale Orders manages B2B order status, delivery scheduling, picking, verification, and delivery confirmation.

Common order statuses include:

- `DRAFT`
- `SUBMITTED`
- `CONFIRMED`
- `PACKED`
- `DISPATCHED`
- `DELIVERED`
- `COMPLETED`
- `DISPUTED`
- `CANCELLED`

Typical scenario:

1. Wholesale manager opens `Orders`.
2. Reviews submitted or open orders.
3. Assigns or reviews picking work.
4. Counter staff pick and verify quantities.
5. Delivery staff confirm delivery.
6. Invoice and receivables data update.

### Supplier management and purchase orders

Where to find it:

- `Inventory > Suppliers` through inventory workflows
- Wholesale supplier and purchase-order backend workflows
- `Order Preparation` for retail restocking

What it does:

Supplier records support stock intake, order preparation, wholesale purchase orders, and reorder planning. Owners can configure whether dispensers are allowed to add, edit, or remove supplier records from `Settings > Team`.

### Credit limits, invoices, and receivables

Who uses it: `OWNER`, `WHOLESALE_MANAGER`, `SUPER_ADMIN`

What it does:

Wholesale operations include:

- Client credit limits
- Outstanding balances
- Payment terms
- Blocked orders
- VAT invoices
- EFDMS status fields
- Receivables aging buckets

For investor demos, this shows APOTEKH is not only retail POS. It supports distributor-grade B2B controls.

---

## 11. Knowledge Hub & Professional Development

### Knowledge Hub

Where to find it: `Knowledge Hub`

Who uses it: all pharmacy users and sales teams during demos.

What it does:

Knowledge Hub provides searchable pharmacy content:

- Articles
- Bulletins
- Publications
- Weekly digest subscription

Article categories include:

- `DRUG_SAFETY`
- `REGULATORY`
- `CLINICAL`
- `BUSINESS`
- `TECHNOLOGY`
- `CPD`
- `GENERAL`

Typical scenario:

1. Open `Knowledge Hub`.
2. Search articles by topic.
3. Filter by category.
4. Open an article.
5. Review bulletins or publications.
6. Subscribe to weekly digest.

![Knowledge Hub](screenshots/16-knowledge-hub.png)

### TMDA Updates

Where to find it: `TMDA Updates`

Who uses it: PICs, owners, compliance-focused staff.

What it does:

TMDA Updates is a dedicated regulatory update area. Use it in demos to show that APOTEKH treats regulatory information as a daily pharmacy workflow, not a separate spreadsheet or WhatsApp thread.

### CPD Tracker

Where to find it: `CPD Tracker` or `/cpd`

Status: Coming Soon / Phase 2

What it does:

CPD Tracker is a planned Phase 2 feature for recording professional learning activities and CPD points. The current page is a placeholder. Full CPD tracking, premium courses, and certificate verification will be released in a future update.

![CPD Tracker — Coming Soon](screenshots/22-cpd-tracker.png)

### PC-Accredited CPD

Where to find it: `PC-Accredited CPD`

Status: Coming Soon / Deferred

What it does:

The current page is a deferred placeholder for accredited CPD recognition. The internal CPD Tracker exists, but official accreditation is not presented as fully live.

---

## 12. Team & Pharmacy Management

### Profile

Where to find it: `Settings > Profile`

Who uses it: all users.

What it does:

Profile shows account and pharmacy information:

- First Name
- Last Name
- Email
- PC Registration
- Pharmacy
- Region
- Current role
- Memberships, if the user belongs to multiple pharmacies
- Password change form

### Team Management

Where to find it: `Settings > Team`

Who uses it: `OWNER`, `PHARMACIST_IN_CHARGE`, `SUPER_ADMIN`

What it does:

Team Management lets authorized users view team members, invite staff, assign roles, and update role assignments.

Invite roles include:

- Pharmacist In-Charge
- Dispenser
- Cashier
- Wholesale Manager
- Wholesale Counter Staff
- Delivery Staff

Typical scenario:

1. Open `Settings > Team`.
2. Click `Invite Member`.
3. Enter first name, last name, email, temporary password, and role.
4. Share temporary password securely with the new staff member.
5. Staff member is prompted to change password on first login.

![Team Management](screenshots/20-settings-team.png)

### PIC PIN

The PIC PIN is used for clinical override workflows. The backend verifies PIC PINs against active PIC/owner/super-admin users with stored PIN hashes and applies rate limiting. If a pharmacy uses patient safety overrides, PIC PIN setup should be completed during onboarding.

### Dispenser supplier access

Where to find it: `Settings > Team`

Who uses it: `OWNER`, `SUPER_ADMIN`

What it does:

Owners can choose whether dispensers can add, edit, or remove supplier records. Dispensers can still select existing suppliers for stock work.

### My Locations

Where to find it: `Settings > My Locations`

Who uses it: `OWNER`

What it does:

My Locations shows all pharmacy outlets under the owner's account. Each card shows the outlet name, region, type, and current status (Active, Trial, Pending activation, Grace period).

#### Adding a new outlet

ADDO owners can add additional ADDO locations at Tsh 15,000/month per location. Non-ADDO owners are directed to upgrade their subscription tier to increase the outlet limit.

Typical scenario (ADDO):

1. Open `Settings > My Locations`.
2. Click **+ Add location**.
3. Enter the outlet name, region, address, and optional licence number.
4. Enter the M-Pesa phone number to be charged.
5. Click **Add location**.
6. A PIN prompt arrives on the entered phone. Enter the PIN to confirm.
7. The new outlet appears in the list with **Pending activation** status.
8. Once payment is confirmed, the outlet becomes Active and appears in the outlet switcher.

If the STK push does not arrive, a payment reference is shown — use it to pay manually and contact the APOTEKH team.

#### Removing an outlet

Owners can remove an outlet they no longer need. All data is preserved and can be restored by the APOTEKH team on request.

Typical scenario:

1. Open `Settings > My Locations`.
2. Click the trash icon on the outlet to remove.

   Note: The trash icon does not appear on the currently active outlet. Switch to a different outlet first, then remove the unwanted one.

3. A confirmation panel appears with the outlet name and a reminder that data is kept.
4. Click **Yes, remove** to confirm. The outlet is deactivated and removed from the outlet switcher immediately.

Important rules:

- You cannot remove the last remaining outlet on your account.
- You cannot remove the outlet you are currently logged into. Switch outlets first.
- Removed outlets stop appearing in the outlet switcher and in My Locations after removal.

### Pharmacy memberships and multi-pharmacy support

Where to find it:

- `/select-pharmacy`
- Top bar outlet selector
- `Settings > Profile`
- `Settings > My Locations`

What it does:

Users can belong to multiple pharmacies through pharmacy memberships. The active outlet controls access, tier, analytics, and reporting scope. The outlet switcher in the top bar shows only active outlets — pending-activation and removed outlets do not appear in the switcher.

Typical scenario:

1. A user logs in.
2. If they belong to multiple pharmacies, they choose an outlet.
3. The device remembers the selected outlet.
4. The top bar lets them switch outlets later.

### Payment method configuration

Where to find it: `Settings > Subscription`

Who uses it: `OWNER`, `SUPER_ADMIN`

What it does:

Owners configure mobile money methods for dispensing. Cash always remains enabled.

![Subscription settings](screenshots/21-settings-subscription.png)

---

## 13. Offline Mode Deep Dive

### How offline mode works

APOTEKH uses a service worker, browser cache, and IndexedDB to keep key workflows usable during unstable connectivity.

Main pieces:

- Service worker caches the app shell.
- GET API reads are cached with a network-first strategy.
- Writes are handled by the app-level IndexedDB queue.
- Connectivity status appears in the top bar.
- Queued writes sync when the browser comes back online.

### IndexedDB storage

Main offline database:

- Database: `pharmaconnect-offline`
- Store: `writeQueue`
- Store: `inventoryDeltas`
- Retention: 7 days

Compliance cache database:

- Database: `pharmaconnect-compliance-cache`
- Store: `dashboard`

### 7-day local buffer

Offline writes and inventory deltas expire after 7 days. If they are not synced within that period, they are purged and the app shows a warning such as queued writes expired after 7 days and were removed.

Sales demo wording:

"APOTEKH is designed for real pharmacy connectivity conditions. It keeps work moving locally for up to 7 days and syncs automatically when internet returns."

### What can be queued offline?

Current queued workflows include:

- Stock intake batches
- Dispensing sessions without prescription photo upload
- General inventory writes that use the offline write queue

### What happens on reconnect?

1. Browser fires online event.
2. `useOfflineSync` starts flush automatically.
3. Expired writes (older than 7 days) are purged.
4. Writes are submitted in created order.
5. Successful writes are removed from queue.
6. Permanently rejected writes (server 4xx responses) are dropped and logged as conflicts where possible.
7. Remaining network-error writes keep their last error and attempt count.
8. Pending sync count updates in the top bar.

### Pending sync pill

The top bar shows a **pending sync** pill when there are queued writes waiting to reach the server.

- **Tap the pill** to manually trigger a sync retry immediately.
- If the sync succeeds, the pill disappears and a success toast shows how many items were synced.
- If the sync fails and items remain stuck, a **×** button appears next to the pill. Tap × to force-clear all stuck items. Use this only if the items are no longer needed (for example, a write from a deleted outlet that cannot succeed).
- Writes that fail 10 or more times are automatically dropped to prevent the queue from blocking indefinitely.

### Conflict resolution

Where to find it: `Sync Conflicts`

What it does:

Conflicts preserve the local payload and server payload so a PIC, owner, or super admin can review what happened and decide how to resolve it.

Typical conflict scenario:

1. A stock batch is queued offline.
2. The server later rejects it because data is invalid or stale.
3. APOTEKH logs an offline sync conflict.
4. The manager opens `Sync Conflicts`.
5. They review and resolve it.

### Offline limitations

- Offline mode is not a full local copy of the cloud database.
- Fresh server-only data may not be available until the device reconnects.
- Prescription photos require online checkout.
- Safety checks depend on server responses and cached state.
- Staff should sync as soon as connectivity is available.

---

## 14. Subscription & Billing

### Plans

Where to find it: `Settings > Subscription`

Who uses it: `OWNER`, `SUPER_ADMIN`, sales team.

Known plan/tier names:

- `ADDO`
- `BASIC`
- `STANDARD`
- `PREMIUM`
- `WHOLESALE`
- `ENTERPRISE`

Current pricing:

**Retail tiers:**

| Plan | Monthly price | Annual price | Included scale |
|---|---:|---:|---|
| ADDO | Tsh 15,000 | Tsh 150,000 | 1 outlet, 3 users |
| BASIC | Tsh 39,000 | Tsh 390,000 | 2 outlets, 5 users |
| STANDARD | Tsh 55,000 | Tsh 550,000 | 3 outlets, 10 users |
| PREMIUM | Tsh 75,000 | Tsh 750,000 | 5 outlets, 20 users |

**Wholesale / distributor tiers:**

| Plan | Monthly price | Annual price | Included scale |
|---|---:|---:|---|
| WHOLESALE | Tsh 100,000 | Tsh 1,000,000 | 1 wholesale outlet, 10 users + delivery staff |
| ENTERPRISE | Custom | Custom | 6+ outlets, unlimited users |

Annual billing is 10x the monthly price. Enterprise pricing is negotiated for custom rollout, reporting, and governance needs.

### Billing cycle

The platform supports:

- `MONTHLY`
- `ANNUAL`

Subscription records include:

- Current tier
- Billing cycle
- Trial status
- Trial countdown
- Account status: `TRIAL`, `ACTIVE`, `SUSPENDED`, `CANCELLED`

### Paying via M-Pesa STK push (recommended)

Where to find it: `Settings > Subscription` or the trial paywall when a trial ends.

Who uses it: `OWNER`

What it does:

When an owner selects a plan and enters their M-Pesa (or Tigo/Airtel) phone number, APOTEKH sends a payment request directly to that phone. The owner enters their mobile money PIN on the phone to approve. No manual reference copying or bank transfer needed.

Typical scenario:

1. Open `Settings > Subscription` or the upgrade prompt when the trial ends.
2. Select the desired plan (ADDO, BASIC, STANDARD, PREMIUM, WHOLESALE).
3. Choose billing cycle: Monthly or Annual.
4. Enter the M-Pesa phone number to charge.
5. Click **Subscribe / Pay now**.
6. A PIN prompt appears on the phone within a few seconds.
7. Enter the M-Pesa PIN to approve.
8. The subscription activates automatically. An in-app notification confirms activation.

If the PIN prompt does not arrive within 30 seconds:

- Confirm the phone number is correct and the SIM is active.
- Check that mobile data is on (STK push requires network on the SIM).
- Contact the APOTEKH team via the fallback reference shown on screen.

### Manual payment fallback

If the STK push is unavailable, the subscription page shows a payment reference code (format: `APTK-...`). Send the exact amount to the APOTEKH payment number using that reference, then contact the team to confirm. Access is restored within 24 hours of confirmation.

### Upgrading and downgrading

Where to find it: `Settings > Subscription`

Who uses it: `OWNER`, `SUPER_ADMIN`

Current flow:

1. Owner reviews current tier and available plan names.
2. Owner contacts the APOTEKH team or founder through the listed contact flow.
3. APOTEKH confirms the selected current plan or enterprise quote.
4. Team updates subscription status/tier.

### Platform Admin shell (SUPER_ADMIN)

Where to find it: Automatically on login as `SUPER_ADMIN`. Direct URL: `/superadmin`.

Who uses it: `SUPER_ADMIN` only

What it does:

The Platform Admin shell is a separate dark-themed administration environment that is entirely distinct from the pharmacy-side UI. When the founder logs in, they land at `/superadmin` -- not inside any pharmacy layout. The sidebar shows "Platform Admin" identity with no pharmacy-specific navigation.

The admin shell navigation includes:

- **Dashboard** (`/superadmin`) -- platform-level metrics: total pharmacies, active pharmacies, total users, total dispensings, subscription tier breakdown, platform activity.
- **Founder Hub** (`/superadmin/founder`) -- payment queue (pending M-Pesa/bank confirmations), new pharmacy registrations, trial extension controls, suspend/reactivate controls, owner verification, and recent PIC override activity.
- **Pharmacies** (`/superadmin/pharmacies`) -- full list of all registered pharmacies with drill-down to individual pharmacy data.
- **Audit Log** (`/superadmin/audit`) -- platform-wide audit trail of all sensitive actions.
- **Feature Flags** (`/superadmin/feature-flags`) -- enable or disable experimental features per pharmacy or globally.
- **Messages** (`/superadmin/messages`) -- broadcast messages to pharmacy owners.

The old `/founder` URL redirects automatically to `/superadmin/founder`. Any link or bookmark using `/founder` continues to work.

If the SUPER_ADMIN navigates directly into a pharmacy route (e.g. `/dashboard`), the sidebar switches to a dark "Platform Admin" identity view with a single button back to `/superadmin`. No pharmacy navigation items are shown.

![Founder Dashboard](screenshots/25-founder-dashboard.png)

---

## 15. Frequently Asked Questions

### Is APOTEKH only a point-of-sale system?

No. It includes POS-style dispensing, but it also covers inventory, batch tracking, expiry risk, compliance, safety checks, Knowledge Hub, CPD, analytics, wholesale operations, and offline sync.

### Can the pharmacy work without internet?

Yes, for supported workflows. Stock intake and core dispensing can be queued locally for up to 7 days. The app syncs automatically when internet returns.

### Can prescription photos be captured offline?

No. Prescription photos require online checkout because the image file must upload to the backend.

### Does APOTEKH choose the clinical decision for the pharmacist?

No. APOTEKH surfaces alerts, counselling prompts, and safety context. The pharmacist or PIC remains responsible for the professional decision. The dispenser acknowledges the alert and proceeds at their own professional risk — no PIC PIN is required at any severity level. The override is logged automatically under the dispenser's name and cannot be deleted.

### What is the difference between Products and Drug Catalogue?

Products are your pharmacy's local stock items. Drug Catalogue is the system-wide reference list used for cleaner names, TMDA/NEMLIT context, storage flags, and product matching.

### What is FEFO?

FEFO means First Expiry, First Out. It helps staff use batches with the earliest expiry first, reducing waste and patient risk.

### Can a dispenser change stock directly?

Dispensers can perform allowed stock work, but stock adjustment corrections are handled through suggestions and approval. Owners, PICs, or super admins review and approve changes.

### Are NHIF claims live?

NHIF Claims is visible in the roadmap and has backend schema support, but the current user-facing page is deferred. Treat it as Coming Soon until the full claims workflow is released.

### Is ADR reporting live?

No. ADR Reporting / Pharmacovigilance currently shows a Coming Soon page. The schema is ready, but TMDA electronic reporting integration is required before submission is live.

### Does APOTEKH support wholesale distributors?

Yes. Wholesale workflows include a wholesale dashboard, catalogue lines, B2B orders, invoices, receivables, credit controls, demand insights, picking, verification, and delivery confirmation.

### Does APOTEKH track CPD?

CPD tracking is a planned Phase 2 feature. The current sidebar shows a Coming Soon placeholder. PC-Accredited CPD is a separate deferred feature requiring a Pharmacy Council MOU.

### Can owners manage multiple pharmacies?

Yes. Users can have multiple pharmacy memberships and switch the active outlet using the outlet selector in the top bar. The active outlet controls role, tier, analytics, and reporting scope. Only active outlets appear in the switcher — pending-activation and removed outlets are filtered out.

### How do I pay for a subscription?

APOTEKH uses M-Pesa STK push. Select your plan, enter your M-Pesa number, and click Subscribe. A PIN prompt arrives on your phone. Enter your PIN to confirm — no manual transfer or reference copying needed. The subscription activates immediately after the PIN is approved.

### What if I don't receive the M-Pesa PIN prompt?

Check that the phone number is correct and the SIM has mobile data active. If the prompt still doesn't arrive, a payment reference code is shown on screen — use it to send the payment manually, then contact the APOTEKH team to confirm.

### Can I add more outlets?

ADDO owners can add unlimited ADDO locations from `Settings > My Locations`. Each additional outlet costs Tsh 15,000/month and is charged via M-Pesa STK push at the time of adding. Non-ADDO pharmacies increase their outlet allowance by upgrading their subscription tier.

### Can I remove an outlet I no longer need?

Yes. Go to `Settings > My Locations`, click the trash icon on the outlet, and confirm. All data is preserved and can be restored by the APOTEKH team on request. You cannot remove the outlet you are currently logged into — switch to another outlet first.

### What should sales staff say about pricing?

Use the current pricing matrix: ADDO Tsh 15,000/month, BASIC Tsh 39,000/month, STANDARD Tsh 55,000/month, PREMIUM Tsh 75,000/month, WHOLESALE Tsh 100,000/month, and ENTERPRISE custom. Annual billing is 10x monthly pricing.

### What makes APOTEKH Tanzania-specific?

It includes Tanzanian regions, pharmacy licence context, TMDA registration fields, NEMLIT and MSD catalogue orientation, AWaRe antibiotic flags, Africa/Nairobi timezone defaults, NHIF roadmap, TMDA updates, ADR roadmap, and compliance workflows designed around pharmacy inspection readiness.

### What should investors notice?

APOTEKH is deeper than a generic POS. It combines regulated pharmacy operations, offline-first resilience, clinical safety, Tanzania-specific master data, B2B wholesale workflows, professional learning, compliance evidence, and founder-level platform controls.

---

## Appendix A: Quick Demo Script for Sales

1. Start at the public website and explain the product promise.
2. Log in and show the Dashboard — Today's Revenue card, Low Stock, and Expiry Countdown.
3. Open Inventory: show products list with low-stock filter, expiry dashboard, and batch manager.
4. Open Receive Stock: demonstrate camera barcode scanner and the live expiry gate warning when entering a near-expiry batch.
5. Open Order Preparation: create an order, show urgency colouring and cost totals, click Compare Prices on a line item to show inline supplier price comparison, then submit with a supplier phone number to generate the WhatsApp supplier portal link.
6. Open Dispensing: search a medicine, select it from suggestions (note instant pre-fetch), add to basket, click the **i** button on a basket item to show the medicine info panel.
7. Add a second medicine that interacts with the first — show the safety panel firing a High alert, acknowledge it, and proceed to checkout.
8. Show Safety Alerts page with the override log entry just created.
9. Show Controlled Register.
10. Open Compliance and generate or review inspection checklist.
11. Open Analytics and Forecasting.
12. Open Wholesale dashboard for B2B depth — catalogue, orders, receivables aging.
13. Open Knowledge Hub and Staff Activity (OWNER/PIC view).
14. Open Settings for team, subscription, and payment method configuration. Show `Settings > My Locations` — demonstrate adding an outlet (STK push payment flow) and removing one (trash icon + confirm panel).
15. Open `Settings > Subscription` — show the M-Pesa STK push checkout: select plan, enter number, explain the PIN prompt flow.
16. Mention offline mode and show top bar sync status — tap the pending sync pill to demonstrate manual retry.
17. For investor demos, finish with Platform Admin shell at `/superadmin` — Founder Hub, payment queue, platform metrics.

## Appendix B: Screenshot Checklist

**Getting started**
- `01-login.png` — Login / registration page
- `02-trial-confirmed.png` — 14-day trial confirmation screen with feature list

**Inventory**
- `04-inventory-dashboard.png` — Inventory dashboard (Total SKUs, Low Stock, Expiring cards)
- `05-products-list.png` — Products list with storage/low-stock filters applied
- `06-add-product.png` — Add Product form (all fields visible)
- `07-drug-catalogue.png` — Drug Catalogue search results
- `08-receive-stock.png` — Receive Stock — intake cart with expiry gate warning
- `08b-barcode-scanner.png` — Receive Stock — camera barcode scanner active
- `09-batch-manager.png` — Batch Manager with expiry and quantity columns
- `10-stock-adjustment.png` — Stock Adjustment — dispenser suggestion pending approval
- `11-order-preparation.png` — Order Preparation — order draft with urgency colouring and cost total
- `27-supplier-portal.png` — Supplier Portal — external confirmation page as seen by supplier
- `28-order-portal-status.png` — Order Preparation — submitted order showing portal status badge

**Dashboard**
- `03-dashboard.png` — Main dashboard with Today's Revenue, Low Stock, and Expiry widgets

**Dispensing**
- `12-dispensing.png` — Dispensing screen — medicine search and basket
- `12b-dispensing-info-panel.png` — Dispensing — basket item expanded with medicine info panel (i button)
- `12c-dispensing-safety-panel.png` — Dispensing — patient safety panel with High alert and override acknowledgement

**Clinical safety**
- `13-safety-alerts.png` — Safety Alerts history page — override log entries
- `14-controlled-register.png` — Controlled Register — controlled drug dispensing lines

**Compliance**
- `15-compliance.png` — Compliance Tracker dashboard with Health Score
- `16-inspection-checklist.png` — TMDA Inspection Checklist — items with status and readiness score
- `17-staff-credentials.png` — Staff Credentials — credential list with expiry dates

**Analytics & reports**
- `18-analytics.png` — Analytics — stock value, dispensing counts, expiry risk
- `19-forecasting.png` — Forecasting workspace — stockout forecast table
- `26-reports.png` — Reports — revenue summary and payment breakdown

**Wholesale**
- `20-wholesale-dashboard.png` — Wholesale Dashboard — catalogue, orders, receivables cards

**Knowledge & CPD**
- `21-knowledge-hub.png` — Knowledge Hub — article list with category filter
- `22-cpd-tracker.png` — CPD Tracker — Coming Soon placeholder

**Team & settings**
- `23-team-management.png` — Team Management — member list and invite form
- `24-subscription.png` — Subscription page — current tier, trial countdown, payment methods

**Founder / admin**
- `25-founder-dashboard.png` — Platform Admin shell — Founder Hub with payment queue
