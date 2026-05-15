export interface Tier {
  id: string;
  name: string;
  price: number | null;
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
    price: 20_000,
    annualPrice: 200_000,
    currency: "Tsh",
    period: "month",
    trialDays: 14,
    features: [
      "1 outlet · 3 users · 14-day trial",
      "FEFO inventory · expiry alerts (5 thresholds) · bulk Excel import",
      "Basic POS & dispensing · customer database · sales reports",
      "Owner Dashboard - live revenue + stock from any device",
      "Barcode scanning (EAN-13 via phone camera) · offline-first sync",
      "DLDM compliance tracker · document storage · inspection checklist",
      "TMDA bulletins & recall feed · SMS/WhatsApp notifications",
      "Full Clinical Decision Support Suite",
    ],
    isPopular: false,
    cta: "Start 14-day trial",
  },
  {
    id: "basic",
    name: "Basic",
    price: 39_000,
    annualPrice: 390_000,
    currency: "Tsh",
    period: "month",
    trialDays: 14,
    features: [
      "Up to 2 outlets · 5 users · 14-day trial",
      "Multi-outlet Owner Dashboard - live revenue + stock from any device",
      "Multi-outlet consolidated dashboard",
      "Receipts, proformas, PDF export · discount management",
      "Roles & permissions · void/reissue workflow with audit trail",
      "Full pharmacy compliance tracker (TMDA + PC licence types)",
    ],
    isPopular: false,
    cta: "Start 14-day trial",
  },
  {
    id: "standard",
    name: "Standard",
    price: 55_000,
    annualPrice: 550_000,
    currency: "Tsh",
    period: "month",
    trialDays: 14,
    features: [
      "Up to 3 outlets · 10 users · 14-day trial",
      "Accounting module · customer purchase history & loyalty",
      "Multi-shop consolidated reporting",
      "Patient Ordering Portal (optional, customer-facing)",
      "Basic marketing campaigns",
      "Knowledge Hub full access",
    ],
    isPopular: true,
    cta: "Start 14-day trial",
  },
  {
    id: "premium",
    name: "Premium",
    price: 75_000,
    annualPrice: 750_000,
    currency: "Tsh",
    period: "month",
    trialDays: 14,
    features: [
      "Up to 5 outlets · 20 users · 14-day trial",
      "Predictive low-stock alerts (7–14 days) · demand forecasting (top 50 products)",
      "Seasonal demand patterns (12-month rolling) · dead stock risk scoring",
      "Revenue trend projection · peak hour & staffing analysis",
      "Peer benchmarking (anonymized, opt-in) · push notifications",
      "Custom landing page (on request) · custom domain · dedicated support",
      "Full Knowledge Hub including courses · advanced compliance reporting",
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
    id: "hybrid",
    name: "Hybrid",
    price: 100_000,
    tagline: "Retail + wholesale under one owner",
    features: [
      "Same owner, one subscription — retail and wholesale combined",
      "Unified Owner Dashboard for both operations",
      "All Standard retail features included",
      "Full wholesale operations included",
    ],
    cta: "Discuss hybrid",
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
