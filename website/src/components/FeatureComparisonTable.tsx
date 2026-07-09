import { Fragment } from "react";
import { Check, Minus } from "lucide-react";

// Rows follow the tier feature matrix in CLAUDE.md — keep the two in sync.
// value: true = included, false = not included, string = qualified inclusion.
type Cell = boolean | string;

interface Row {
  feature: string;
  values: [Cell, Cell, Cell, Cell]; // ADDO, Basic, Standard, Premium
}

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: "Capacity",
    rows: [
      { feature: "Outlets", values: ["1", "2", "3", "5"] },
      { feature: "Users", values: ["3", "5", "10", "20"] },
      { feature: "Free trial", values: ["14 days", "14 days", "14 days", "14 days"] },
    ],
  },
  {
    title: "Every plan",
    rows: [
      { feature: "Clinical Decision Support Suite (never gated by price)", values: [true, true, true, true] },
      { feature: "Offline-first dispensing, inventory & sync", values: [true, true, true, true] },
      { feature: "FEFO enforcement + expiry alerts (5 thresholds)", values: [true, true, true, true] },
      { feature: "Barcode scanning via phone camera", values: [true, true, true, true] },
      { feature: "Owner Dashboard — live revenue & stock", values: ["Single outlet", "Multi-outlet", "Multi-outlet", "Multi-outlet"] },
      { feature: "SMS / WhatsApp notifications", values: [true, true, true, true] },
    ],
  },
  {
    title: "Operations",
    rows: [
      { feature: "Discount management", values: [false, true, true, true] },
      { feature: "Void / reissue with audit trail", values: [false, true, true, true] },
      { feature: "Roles & permissions", values: [false, true, true, true] },
      { feature: "Compliance tracker", values: ["DLDM", "TMDA + PC", "TMDA + PC", "TMDA + PC"] },
      { feature: "Accounting module", values: [false, false, true, true] },
      { feature: "Customer purchase history", values: [false, false, true, true] },
      { feature: "Patient Ordering Portal", values: [false, false, true, true] },
      { feature: "Multi-shop consolidated reporting", values: [false, false, true, true] },
    ],
  },
  {
    title: "Intelligence",
    rows: [
      { feature: "Knowledge Hub", values: ["Read-only", "Read-only", "Full", "Full + courses"] },
      { feature: "Demand forecasting & stockout risk", values: [false, false, false, true] },
      { feature: "Dead stock risk scoring", values: [false, false, false, true] },
      { feature: "Revenue trend projections", values: [false, false, false, true] },
      { feature: "Peer benchmarking (anonymised, opt-in)", values: [false, false, false, true] },
    ],
  },
];

const TIER_HEADERS = ["ADDO", "Basic", "Standard", "Premium"];

function CellValue({ value }: { value: Cell }) {
  if (value === true) return <Check aria-label="Included" className="mx-auto text-primary" size={16} />;
  if (value === false) return <Minus aria-label="Not included" className="mx-auto text-slate/25" size={16} />;
  return <span className="text-xs font-medium text-slate/70">{value}</span>;
}

export default function FeatureComparisonTable() {
  return (
    <section className="mt-16">
      <h2 className="text-2xl font-semibold text-slate">Compare plans in detail</h2>
      <p className="mt-2 text-sm text-slate/60">
        Patient safety is never a paid extra — the full Clinical Decision Support Suite ships
        with every plan, including ADDO.
      </p>
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate/10 bg-white shadow-sm">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate/10">
              <th className="sticky left-0 bg-white px-4 py-3 text-sm font-semibold text-slate">
                Feature
              </th>
              {TIER_HEADERS.map((name) => (
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate" key={name}>
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((group) => (
              <Fragment key={group.title}>
                <tr className="border-b border-slate/10 bg-mist/60">
                  <td
                    className="sticky left-0 bg-mist/60 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
                    colSpan={5}
                  >
                    {group.title}
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr className="border-b border-slate/5 last:border-0" key={row.feature}>
                    <td className="sticky left-0 bg-white px-4 py-2.5 text-sm text-slate/75">
                      {row.feature}
                    </td>
                    {row.values.map((value, i) => (
                      <td className="px-4 py-2.5 text-center" key={`${row.feature}-${TIER_HEADERS[i]}`}>
                        <CellValue value={value} />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
