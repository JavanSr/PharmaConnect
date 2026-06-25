import React, { useEffect, useState } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';

type ReleaseInfo = {
  version: string;
  date: string;
  notes: string[];
};

export const UpdateBanner: React.FC = () => {
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [release, setRelease] = useState<ReleaseInfo | null>(null);

  useEffect(() => {
    const handler = () => {
      setShow(true);
      // Fetch release notes from the new SW's cached copy of release.json
      fetch('/release.json', { cache: 'no-store' })
        .then((r) => r.json())
        .then((data: ReleaseInfo) => setRelease(data))
        .catch(() => {/* show banner without notes */});
    };
    window.addEventListener('sw-update-waiting', handler);
    return () => window.removeEventListener('sw-update-waiting', handler);
  }, []);

  if (!show) return null;

  const handleUpdate = () => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    });
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-[#0D4035] shadow-lg print:hidden">
      <div className="flex items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles size={15} className="shrink-0 text-[#E8A020]" />
          <span className="text-sm text-white/90">
            APOTEKH {release?.version ? `v${release.version}` : 'update'} is ready
            {release?.notes?.length ? ' — ' : ''}
            {release?.notes?.length ? (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="underline underline-offset-2 text-white/80 hover:text-white transition-colors"
              >
                {expanded ? 'hide' : "see what's new"}
              </button>
            ) : null}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            onClick={handleUpdate}
            className="flex items-center gap-1.5 rounded-lg bg-[#E8A020] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#d4911a] transition-colors"
          >
            <RefreshCw size={13} />
            Update now
          </button>
          <button
            onClick={() => setShow(false)}
            aria-label="Dismiss update banner"
            className="text-white/50 hover:text-white/90 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {expanded && release?.notes?.length && (
        <div className="border-t border-white/10 px-4 pb-3 pt-2">
          <ul className="space-y-1">
            {release.notes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/80">
                <span className="mt-0.5 shrink-0 text-[#E8A020]">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
