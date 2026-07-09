export interface Tier {
  id: string;
  name: string;
  /** One-line positioning used on tier cards */
  desc: string;
  outlets: number;
  users: number;
  price: number | null;
  /** 3 months, paid upfront — 3× monthly (no discount, commitment-lite) */
  quarterlyPrice: number | null;
  /** 6 months, paid upfront — 5.5× monthly (~8% off) */
  semiAnnualPrice: number | null;
  /** 12 months, paid upfront — 10× monthly (2 months free) */
  annualPrice: number | null;
  currency: "Tsh";
  period: "month";
  features: string[];
  isPopular: boolean;
  cta: string;
  trialDays: number;
}

export interface WholesaleTier {
  id: string;
  name: string;
  price: number | null;
  tagline: string;
  problems?: string[];
  features: string[];
  cta: string;
}

/** Retail tiers — shown in the main pricing toggle */
export const TIERS: Tier[] = [
  {
    id: "addo",
    name: "ADDO",
    desc: "For ADDOs and small pharmacies starting with digital operations.",
    outlets: 1,
    users: 3,
    price: 15_000,
    quarterlyPrice: 45_000,
    semiAnnualPrice: 82_500,
    annualPrice: 150_000,
    currency: "Tsh",
    period: "month",
    trialDays: 14,
    features: [
      "FEFO inventory · expiry alerts (5 thresholds) · bulk Excel import",
      "Basic POS & dispensing · customer database · sales reports",
      "Owner Dashboard - live revenue + stock from any device",
      "Barcode scanning (EAN-13 via phone camera) · offline-first sync",
      "DLDM compliance tracker · document storage · inspection checklist",
      "TMDA bulletins & recall feed · SMS/WhatsApp notifications",
      "Full Clinical Decision Support Suite",
      "Covers 1 outlet · 3 staff accounts",
    ],
    isPopular: false,
    cta: "Start 14-day trial",
  },
  {
    id: "basic",
    name: "Basic",
    desc: "For growing pharmacies that need visibility, roles, and full compliance.",
    outlets: 2,
    users: 5,
    price: 39_000,
    quarterlyPrice: 117_000,
    semiAnnualPrice: 214_500,
    annualPrice: 390_000,
    currency: "Tsh",
    period: "month",
    trialDays: 14,
    features: [
      "Everything in ADDO, plus:",
      "Multi-outlet Owner Dashboard - live revenue + stock from any device",
      "Receipts, proformas, PDF export · discount management",
      "Roles & permissions · void/reissue workflow with audit trail",
      "Full pharmacy compliance tracker (TMDA + PC licence types)",
      "Room to grow: a second outlet and up to 5 staff at no extra cost",
    ],
    isPopular: false,
    cta: "Start 14-day trial",
  },
  {
    id: "standard",
    name: "Standard",
    desc: "For pharmacies that want full operations, reporting, and patient access.",
    outlets: 3,
    users: 10,
    price: 55_000,
    quarterlyPrice: 165_000,
    semiAnnualPrice: 302_500,
    annualPrice: 550_000,
    currency: "Tsh",
    period: "month",
    trialDays: 14,
    features: [
      "Everything in Basic, plus:",
      "Accounting module · customer purchase history & loyalty",
      "Multi-shop consolidated reporting",
      "Patient Ordering Portal (optional, customer-facing)",
      "Basic marketing campaigns",
      "Knowledge Hub full access",
      "Room to grow: up to 3 outlets · 10 staff accounts",
    ],
    isPopular: true,
    cta: "Start 14-day trial",
  },
  {
    id: "premium",
    name: "Premium",
    desc: "For high-performing pharmacies that want full intelligence and growth tools.",
    outlets: 5,
    users: 20,
    price: 75_000,
    quarterlyPrice: 225_000,
    semiAnnualPrice: 412_500,
    annualPrice: 750_000,
    currency: "Tsh",
    period: "month",
    trialDays: 14,
    features: [
      "Everything in Standard, plus:",
      "Predictive low-stock alerts (7–14 days) · demand forecasting (top 50 products)",
      "Seasonal demand patterns (12-month rolling) · dead stock risk scoring",
      "Revenue trend projection · peak hour & staffing analysis",
      "Peer benchmarking (anonymized, opt-in) · push notifications",
      "Full Knowledge Hub including courses · advanced compliance reporting",
      "Dedicated support",
      "Room to grow: up to 5 outlets · 20 staff accounts",
    ],
    isPopular: false,
    cta: "Start 14-day trial",
  },
];

/** Wholesale / distributor tiers — shown separately, not in the retail toggle */
export const WHOLESALE_TIERS: WholesaleTier[] = [
  {
    id: "wholesale",
    name: "Wholesale",
    price: 100_000,
    tagline: "Replace WhatsApp orders and handwritten receipts with a structured, TRA-compliant wholesale workflow.",
    problems: [
      "Retailers ordering via WhatsApp with no formal record",
      "Disputes over quantities ordered vs delivered",
      "No visibility on outstanding receivables per buyer",
      "Handwritten receipts that don't satisfy TRA",
      "Delivery coordination done by phone — wrong quantities, wrong addresses",
    ],
    features: [
      "Order inbox — receive structured orders from APOTEKH retail network",
      "Product catalogue with tiered pricing per client",
      "Credit limits per buyer with outstanding balance tracking",
      "Receivables dashboard — who owes what, how long overdue",
      "VAT-compliant invoice generation (automatic on order confirmation)",
      "Delivery scheduling + driver assignment per order",
      "Demand intelligence — top moving products across buyer network",
      "Low stock alerts based on incoming order trends",
    ],
    cta: "Discuss wholesale",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    tagline: "Chains, hospital pharmacies, NGO networks",
    features: [
      "6+ outlets · Unlimited users",
      "All Premium retail features",
      "Custom reporting and governance",
      "Dedicated implementation support + negotiated contract",
    ],
    cta: "Contact sales",
  },
];
