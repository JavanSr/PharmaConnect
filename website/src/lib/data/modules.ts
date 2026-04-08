export interface Module {
  id: string;
  slug: string;
  name: string;
  description: string;
  phase: 1 | 2 | 3 | 4;
  icon: string;
  features: string[];
  howItWorks: string;
  acceptanceCriteria: string[];
  relatedModules: string[];
}

export const MODULES: Module[] = [
  {
    id: "M01",
    slug: "inventory",
    name: "Inventory Management",
    description:
      "Batch-aware stock control with FEFO dispensing, expiry alerts, and immutable movements.",
    phase: 1,
    icon: "Package",
    features: [
      "Batch and expiry tracking for every product line",
      "FEFO prompts during dispensing",
      "Stock movement history that cannot be silently edited",
      "Low-stock and near-expiry status indicators",
      "Offline-ready stock adjustments for core workflows",
    ],
    howItWorks:
      "Inventory is organized around products, batches, expiry dates, and movement records so pharmacy teams can dispense the safest stock first while preserving an audit trail.",
    acceptanceCriteria: [
      "Every stock change creates a movement record",
      "Expired stock cannot be selected without an explicit warning",
      "FEFO recommendations are visible during dispensing",
      "Core stock lookups remain usable offline",
      "Expiry alerts cover 90, 60, 30, 7, and 1 day windows",
    ],
    relatedModules: ["nhif-claims", "compliance-tracker", "patient-safety"],
  },
  {
    id: "M02",
    slug: "nhif-claims",
    name: "NHIF Claims Processing",
    description:
      "Claim preparation, member verification, ICD-10 validation, and offline claim queueing.",
    phase: 1,
    icon: "FileCheck",
    features: [
      "NHIF member verification workflow",
      "ICD-10 diagnosis validation before submission",
      "Claim readiness checks for missing fields",
      "Offline queue for claims that cannot submit immediately",
      "Claim status tracking for pharmacy operators",
    ],
    howItWorks:
      "Claim data is checked before submission so incomplete or invalid claims are blocked early, then queued safely when connectivity is unavailable.",
    acceptanceCriteria: [
      "Invalid diagnosis codes block claim submission",
      "Missing member details are highlighted before submission",
      "Offline submissions enter a visible queue",
      "Claim status is auditable",
      "Patient UUID is never joined to personal identity data",
    ],
    relatedModules: ["inventory", "compliance-tracker", "patient-safety"],
  },
  {
    id: "M03",
    slug: "patient-safety",
    name: "Patient Safety",
    description:
      "Basic drug interaction, allergy, chronic condition, and active medication checks.",
    phase: 1,
    icon: "Shield",
    features: [
      "Interaction alerts during dispensing",
      "Allergy flag checks against selected medicines",
      "Chronic condition warning support",
      "Active medication context for safer dispensing",
      "Pharmacist PIN override for clinically justified decisions",
    ],
    howItWorks:
      "Safety checks run at the dispensing moment using the internal patient UUID and clinical flags, without storing patient names, phone numbers, or national IDs.",
    acceptanceCriteria: [
      "Moderate and severe safety alerts are visually distinct",
      "Severe overrides require pharmacist authorization",
      "Last 10 prescription records can be surfaced where available",
      "Safety checks do not require personal identity joins",
      "Common interactions resolve in under 500ms",
    ],
    relatedModules: ["inventory", "nhif-claims", "knowledge-hub"],
  },
  {
    id: "M04",
    slug: "compliance-tracker",
    name: "Compliance Tracker",
    description:
      "Operational reminders for regulatory, inspection, licensing, and audit readiness.",
    phase: 1,
    icon: "Bell",
    features: [
      "Regulatory task reminders",
      "In-app compliance status indicators",
      "SMS-ready alert pathway",
      "Inspection readiness checklist support",
      "Non-editable audit event history",
    ],
    howItWorks:
      "Compliance work is broken into visible dated obligations so pharmacy teams can see what is green, amber, or red before an inspection or deadline.",
    acceptanceCriteria: [
      "Alerts are not silently dropped",
      "Overdue items show a red status",
      "Upcoming items show amber status",
      "Completed items remain auditable",
      "Core reminder views remain available offline",
    ],
    relatedModules: ["inventory", "nhif-claims", "cpd-basic"],
  },
  {
    id: "M05",
    slug: "knowledge-hub",
    name: "Knowledge Hub",
    description:
      "Practical regulatory and clinical guidance for pharmacy teams in Tanzania.",
    phase: 1,
    icon: "BookOpen",
    features: [
      "Regulatory guidance articles",
      "Clinical dispensing references",
      "Searchable knowledge categories",
      "Short summaries for key materials",
      "Sponsored article labeling where applicable",
    ],
    howItWorks:
      "The hub gives pharmacy staff short, useful references tied to daily operations rather than long generic documentation.",
    acceptanceCriteria: [
      "Sponsored content is clearly marked",
      "Clinical content is separated from opinion content",
      "Articles are readable on mobile",
      "Important articles include short operational summaries",
      "Search returns useful results without a server round trip",
    ],
    relatedModules: ["patient-safety", "cpd-basic", "compliance-tracker"],
  },
  {
    id: "M06",
    slug: "cpd-basic",
    name: "CPD Basic",
    description:
      "Simple continuing professional development tracking for pharmacy professionals.",
    phase: 1,
    icon: "GraduationCap",
    features: [
      "CPD activity recording",
      "Completion status tracking",
      "Basic certificate metadata capture",
      "Compliance-linked reminders",
      "Mobile-friendly learning history",
    ],
    howItWorks:
      "CPD Basic records evidence of professional learning without attempting to become a full learning management platform in the current product.",
    acceptanceCriteria: [
      "Users can record completed CPD activities",
      "Records include date, title, and evidence fields",
      "CPD status is visible in compliance context",
      "No full CPD marketplace is introduced in the current product",
      "Records remain readable offline where cached",
    ],
    relatedModules: ["knowledge-hub", "compliance-tracker", "patient-safety"],
  },
  {
    id: "M07",
    slug: "analytics",
    name: "Analytics & Reporting",
    description: "Planned reporting for operational visibility after current workflows mature.",
    phase: 2,
    icon: "BarChart",
    features: [
      "Operational dashboards",
      "Inventory trend reports",
      "Claims success monitoring",
      "Compliance trend summaries",
      "Exportable management reports",
    ],
    howItWorks:
      "Analytics will summarize operational data after the compliance-critical transaction and inventory foundations are stable.",
    acceptanceCriteria: [
      "Does not expose patient identity",
      "Separates operational metrics from clinical records",
      "Supports low-bandwidth views",
      "Uses existing audited events",
      "Ships only after current workflow reliability",
    ],
    relatedModules: ["inventory", "nhif-claims", "compliance-tracker"],
  },
  {
    id: "M08",
    slug: "stock-exchange",
    name: "Stock Exchange",
    description: "Planned inventory exchange for pharmacy-to-pharmacy stock visibility.",
    phase: 2,
    icon: "Repeat",
    features: [
      "Surplus stock listing",
      "Need-based stock requests",
      "Expiry-aware stock discovery",
      "Pharmacy-to-pharmacy coordination",
      "Controlled visibility settings",
    ],
    howItWorks:
      "The exchange is planned as a future coordination layer for pharmacies after internal batch tracking is reliable.",
    acceptanceCriteria: [
      "Only non-patient stock data is shared",
      "Listings include expiry context",
      "Participation is opt-in",
      "Inventory audit trail remains intact",
      "No logistics platform is introduced in the current product",
    ],
    relatedModules: ["inventory", "b2b-ordering", "analytics"],
  },
  {
    id: "M09",
    slug: "b2b-ordering",
    name: "B2B Ordering",
    description: "Planned ordering workflow between pharmacies and suppliers.",
    phase: 2,
    icon: "ShoppingCart",
    features: [
      "Supplier catalog discovery",
      "Draft purchase orders",
      "Order status tracking",
      "Batch receipt support",
      "Low-stock reorder prompts",
    ],
    howItWorks:
      "B2B Ordering will connect stock needs to supplier workflows after the inventory backbone is in place.",
    acceptanceCriteria: [
      "Does not become a payments platform",
      "Preserves batch receipt tracking",
      "Order records are auditable",
      "Supports intermittent connectivity",
      "Clearly separates planned and live functionality",
    ],
    relatedModules: ["inventory", "stock-exchange", "analytics"],
  },
  {
    id: "M10",
    slug: "tmda-integration",
    name: "TMDA Integration",
    description: "Planned integration path for regulator-aligned product and inspection workflows.",
    phase: 3,
    icon: "Building",
    features: [
      "Product registration checks",
      "Inspection readiness context",
      "Regulatory reference linkage",
      "Compliance evidence packaging",
      "Controlled regulator reporting pathways",
    ],
    howItWorks:
      "TMDA integration is positioned as a future regulatory connection after current pharmacy operations are stable.",
    acceptanceCriteria: [
      "Does not bypass pharmacy review",
      "Uses explicit consent for external reporting",
      "Keeps audit logs non-editable",
      "Avoids patient identity exposure",
      "Requires explicit approval before implementation",
    ],
    relatedModules: ["compliance-tracker", "inventory", "knowledge-hub"],
  },
  {
    id: "M11",
    slug: "gothomis-linkage",
    name: "GoT-HoMIS Linkage",
    description: "Planned linkage path for public health system interoperability.",
    phase: 3,
    icon: "Network",
    features: [
      "Referral record context",
      "MRN-aware prescription linkage",
      "Interoperability readiness checks",
      "Facility-level exchange controls",
      "Audit trail for exchanged records",
    ],
    howItWorks:
      "GoT-HoMIS linkage will be evaluated as a controlled interoperability layer, keeping MRNs confined to prescription records.",
    acceptanceCriteria: [
      "MRN remains only in prescription records",
      "Patient UUID is never joined with personal identity",
      "Exchange events are auditable",
      "Offline conflict handling is defined",
      "Requires explicit approval before implementation",
    ],
    relatedModules: ["nhif-claims", "patient-safety", "compliance-tracker"],
  },
  {
    id: "M12",
    slug: "ussd-gateway",
    name: "USSD Gateway",
    description: "Future low-connectivity access path for selected non-sensitive workflows.",
    phase: 4,
    icon: "Phone",
    features: [
      "Low-bandwidth workflow access",
      "Status checks for selected tasks",
      "Basic reminders",
      "Role-limited interactions",
      "No sensitive patient identity exposure",
    ],
    howItWorks:
      "The gateway is reserved for carefully scoped workflows that can work safely on basic phones and poor connectivity.",
    acceptanceCriteria: [
      "No patient personal identity is exposed",
      "Role-based access is enforced",
      "Only approved workflows are available",
      "Audit events are retained",
      "Requires explicit approval before implementation",
    ],
    relatedModules: ["compliance-tracker", "inventory", "cpd-basic"],
  },
];
