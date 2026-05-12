export interface Tier {
  id: string;
  name: string;
  price: number | null;
  annualPrice: number | null;
  currency: "TZS";
  period: "month";
  features: string[];
  isPopular: boolean;
  cta: string;
}

export const TIERS: Tier[] = [
  {
    id: "addo",
    name: "ADDO",
    price: 20_000,
    annualPrice: 200_000,
    currency: "TZS",
    period: "month",
    features: [
      "1 outlet, 3 users",
      "Owner dashboard, POS, safety suite, barcode scanning",
      "DLDM-approved ADDO catalogue",
      "B2B ordering from registered wholesalers",
      "Offline-first core workflows",
    ],
    isPopular: false,
    cta: "Start 14-day trial",
  },
  {
    id: "essential",
    name: "Essential",
    price: 35_000,
    annualPrice: 350_000,
    currency: "TZS",
    period: "month",
    features: [
      "1 outlet, 4 users",
      "Full licensed retail pharmacy catalogue",
      "Prescription photo capture",
      "Controlled drugs register",
      "CPD course access and activity log",
    ],
    isPopular: false,
    cta: "Start 14-day trial",
  },
  {
    id: "standard",
    name: "Standard",
    price: 55_000,
    annualPrice: 550_000,
    currency: "TZS",
    period: "month",
    features: [
      "Up to 3 outlets, 7 users",
      "Margin tracking and top-selling SKUs",
      "Weekly revenue trends",
      "Single-metric multi-outlet comparison",
      "CPD points tracker",
    ],
    isPopular: true,
    cta: "Get started",
  },
  {
    id: "premium",
    name: "Premium",
    price: 75_000,
    annualPrice: 750_000,
    currency: "TZS",
    period: "month",
    features: [
      "Up to 5 outlets, 12 users",
      "7-day stockout prediction",
      "12-month demand forecasting",
      "Dead stock risk scoring",
      "Opt-in peer benchmarking",
    ],
    isPopular: false,
    cta: "Request access",
  },
  {
    id: "wholesale",
    name: "Wholesale",
    price: 100_000,
    annualPrice: 1_000_000,
    currency: "TZS",
    period: "month",
    features: [
      "1 wholesale outlet, 10+ users",
      "Wholesale catalogue and tiered client pricing",
      "Credit limit management",
      "Delivery scheduling and driver assignment",
      "Receivables aging and demand intelligence",
    ],
    isPopular: false,
    cta: "Discuss wholesale",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    annualPrice: null,
    currency: "TZS",
    period: "month",
    features: [
      "Unlimited outlets",
      "Unlimited users",
      "Negotiated rollout and support",
      "Custom reporting and governance",
    ],
    isPopular: false,
    cta: "Contact sales",
  },
];
