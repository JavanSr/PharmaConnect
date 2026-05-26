// frontend/src/modules/dispensing/DispensingDrugItem.tsx
//
// Example showing how to integrate AwareBadge into the dispensing drug search
// result row and the active dispensing item list.
//
// INTEGRATION POINTS:
//   1. Drug search results list    — show badge next to drug name in results
//   2. Active dispensing item list — show badge next to selected drug name
//
// The backend must include `awarClass` in drug lookup responses.
// (Add awarClass to the SELECT in the drug-lookup endpoint if not already present.)

import { AwareBadge } from '../../components/AwareBadge';

// ── Example: search result row ───────────────────────────────────────────────

interface DrugSearchResult {
  id: string;
  genericName: string;
  brandNames: string[];
  category: string;
  awarClass: 'ACCESS' | 'WATCH' | 'RESERVE' | null;
  // ... other fields
}

export function DrugSearchResultRow({
  drug,
  onSelect,
}: {
  drug: DrugSearchResult;
  onSelect: (drug: DrugSearchResult) => void;
}) {
  return (
    <button
      onClick={() => onSelect(drug)}
      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium text-gray-900">{drug.genericName}</span>

        {/* AWaRe badge — renders nothing for ACCESS or null drugs */}
        <AwareBadge awarClass={drug.awarClass} />
      </div>

      <div className="text-xs text-gray-500 mt-0.5">
        {drug.brandNames.slice(0, 2).join(', ')}
        {drug.brandNames.length > 2 && ` +${drug.brandNames.length - 2} more`}
      </div>
      <div className="text-xs text-gray-400">{drug.category}</div>
    </button>
  );
}

// ── Example: active dispensing item (drug already added to the bill) ─────────

interface DispensingItem {
  lineId: string;
  drugId: string;
  genericName: string;
  awarClass: 'ACCESS' | 'WATCH' | 'RESERVE' | null;
  quantity: number;
  unitPrice: number;
  // ... other fields
}

export function ActiveDispensingItem({
  item,
  onRemove,
}: {
  item: DispensingItem;
  onRemove: (lineId: string) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 truncate">{item.genericName}</span>

          {/* AWaRe badge — renders nothing for ACCESS or null drugs */}
          <AwareBadge awarClass={item.awarClass} />
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          Qty: {item.quantity} · Tsh {item.unitPrice.toLocaleString()}
        </div>
      </div>
      <button
        onClick={() => onRemove(item.lineId)}
        className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
      >
        Remove
      </button>
    </div>
  );
}
