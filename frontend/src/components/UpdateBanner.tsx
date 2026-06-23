import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

export const UpdateBanner: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = () => setShow(true);
    window.addEventListener('sw-update-waiting', handler);
    return () => window.removeEventListener('sw-update-waiting', handler);
  }, []);

  if (!show) return null;

  const handleUpdate = () => {
    // Tell the waiting SW to skip waiting and activate.
    // controllerchange in main.tsx then reloads the page.
    navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between gap-4 bg-[#0D4035] px-4 py-2.5 shadow-lg print:hidden">
      <span className="text-sm text-white/90">
        A new version of APOTEKH is available — finish what you're doing, then update.
      </span>
      <div className="flex items-center gap-3 shrink-0">
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
          className="text-white/50 hover:text-white/90 text-xl leading-none px-1 transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  );
};
