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
    id: "free-addo",
    name: "Free ADDO",
    price: 0,
    annualPrice: 0,
    currency: "TZS",
    period: "month",
    features: [
      "Basic inventory management",
      "Compliance alerts",
      "NHIF member verification",
      "Offline mode",
      "SMS-ready reminders",
      "Knowledge Hub access",
      "Basic expiry indicators",
      "Pilot onboarding checklist",
    ],
    isPopular: false,
    cta: "Get started free",
  },
  {
    id: "addo-plus",
    name: "ADDO Plus",
    price: 25000,
    annualPrice: 250000,
    currency: "TZS",
    period: "month",
    features: [
      "Everything in Free ADDO",
      "Batch and FEFO stock control",
      "Basic NHIF claim preparation",
      "Patient safety flags",
      "CPD Basic records",
      "Inspection readiness checklist",
      "Offline claim queue visibility",
      "Priority pilot feedback channel",
    ],
    isPopular: false,
    cta: "Choose ADDO Plus",
  },
  {
    id: "standard",
    name: "Standard Pharmacy",
    price: 70000,
    annualPrice: 700000,
    currency: "TZS",
    period: "month",
    features: [
      "Everything in ADDO Plus",
      "Full available inventory workflows",
      "NHIF claim validation checks",
      "Interaction and allergy alerts",
      "Compliance dashboard",
      "CPD and staff evidence tracking",
      "Audit-friendly activity history",
      "Pilot implementation support",
    ],
    isPopular: true,
    cta: "Request standard pilot",
  },
  {
    id: "premium",
    name: "Premium Pharmacy",
    price: 100000,
    annualPrice: 1000000,
    currency: "TZS",
    period: "month",
    features: [
      "Everything in Standard",
      "Multi-user role workflows",
      "Advanced compliance reminders",
      "Expanded safety review views",
      "Enhanced inventory monitoring",
      "Operational export support",
      "Founder feedback sessions",
      "Priority rollout support",
    ],
    isPopular: false,
    cta: "Request premium pilot",
  },
  {
    id: "wholesale",
    name: "Wholesale Distributor",
    price: null,
    annualPrice: null,
    currency: "TZS",
    period: "month",
    features: [
      "Wholesale stock visibility",
      "Batch and expiry management",
      "Supplier-facing inventory reports",
      "Compliance evidence support",
      "Audit trail exports",
      "Role-based team access",
      "Implementation planning",
      "Pricing structured according to wholesale level",
    ],
    isPopular: false,
    cta: "Discuss wholesale level",
  },
];
