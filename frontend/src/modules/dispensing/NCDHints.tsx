import React, { useState } from 'react';
import { ChevronDown, HeartPulse } from 'lucide-react';

export const NCDHints: React.FC<{ hints: string[] }> = ({ hints }) => {
  const [open, setOpen] = useState(true);

  if (hints.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#D6F0E8] bg-[#F8FAFC]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <HeartPulse size={16} className="text-[#1A6B5C]" />
          <span className="text-sm font-semibold text-[#0D4035]">NCD usage hints</span>
        </div>
        <ChevronDown
          size={16}
          className={`text-[#64748B] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="space-y-2 border-t border-[#D6F0E8] px-4 py-3">
          {hints.map((hint, index) => (
            <div key={`${hint}-${index}`} className="rounded-xl bg-white px-3 py-2 text-xs text-[#475569]">
              {hint}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
