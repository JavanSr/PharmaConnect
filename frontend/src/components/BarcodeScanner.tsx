import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, X, Zap } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type BarcodeScannerProps = {
  onDetected: (value: string) => void | Promise<void>;
  onClose: () => void;
};

// ── Native BarcodeDetector (Chrome Android, Edge, Samsung Browser) ─────────────
// Uses hardware acceleration — 10× faster than ZXing on supported devices.

declare class BarcodeDetector {
  constructor(options?: { formats: string[] });
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue: string; format: string }>>;
  static getSupportedFormats(): Promise<string[]>;
}

const NATIVE_FORMATS = [
  'ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e',
  'code_39', 'data_matrix', 'qr_code',
];

const hasNativeDetector = (): boolean =>
  typeof window !== 'undefined' && 'BarcodeDetector' in window;

// ── ZXing fallback — lazy loaded only when native API unavailable ──────────────

async function loadZXing() {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ]);

  // Minimum format set — no QR/DataMatrix in fallback (too slow without hardware)
  const hints = new Map<unknown, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_39,
    ]],
    // TRY_HARDER deliberately omitted — kills frame rate with no benefit on clear barcodes
  ]);

  return new BrowserMultiFormatReader(hints as Map<any, any>);
}

// ── Component ─────────────────────────────────────────────────────────────────

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onDetected, onClose }) => {
  const videoRef      = useRef<HTMLVideoElement | null>(null);
  const keyInputRef   = useRef<HTMLInputElement | null>(null);
  const onDetectedRef = useRef(onDetected);
  useEffect(() => { onDetectedRef.current = onDetected; }, [onDetected]);

  const lastValueRef  = useRef('');
  const lastScanAtRef = useRef(0);
  const rafRef        = useRef<number>(0);
  const streamRef     = useRef<MediaStream | null>(null);
  const zxingStopRef  = useRef<(() => void) | null>(null);

  const [error,       setError]       = useState('');
  const [keyInput,    setKeyInput]    = useState('');
  const [usingNative, setUsingNative] = useState(false);

  // Auto-focus keyboard input so USB/Bluetooth scanners type straight into it
  useEffect(() => { keyInputRef.current?.focus(); }, []);

  // Deduplicate rapid identical scans within 1.5 s
  async function fireDetected(raw: string) {
    const value = raw.trim();
    if (!value) return;
    const now = Date.now();
    if (now - lastScanAtRef.current < 1500 && value === lastValueRef.current) return;
    lastValueRef.current  = value;
    lastScanAtRef.current = now;
    await onDetectedRef.current(value);
  }

  useEffect(() => {
    let cancelled = false;
    const video = videoRef.current;
    if (!video) return;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera not available — use the input below.');
        return;
      }

      // ── Native BarcodeDetector path (fast — Chrome Android, Edge) ─────────
      if (hasNativeDetector()) {
        setUsingNative(true);

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          });
        } catch {
          if (!cancelled) setError('Camera permission denied — use the input below.');
          return;
        }

        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        video.srcObject = stream;
        await video.play().catch(() => {});
        if (cancelled) return;

        let supportedFormats = NATIVE_FORMATS;
        try { supportedFormats = await BarcodeDetector.getSupportedFormats(); } catch { /* use defaults */ }

        const detector = new BarcodeDetector({
          formats: NATIVE_FORMATS.filter(f => supportedFormats.includes(f)),
        });

        const tick = async () => {
          if (cancelled) return;
          try {
            if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
              const results = await detector.detect(video);
              if (results.length > 0) await fireDetected(results[0].rawValue);
            }
          } catch { /* frame not ready — skip */ }
          rafRef.current = requestAnimationFrame(() => { void tick(); });
        };
        rafRef.current = requestAnimationFrame(() => { void tick(); });
        return;
      }

      // ── ZXing fallback (iOS Safari, Firefox, older browsers) ─────────────
      // decodeFromConstraints lets ZXing own the stream lifecycle entirely —
      // avoids the double-srcObject conflict of passing a pre-acquired stream.
      try {
        const reader = await loadZXing();
        if (cancelled) return;

        const { NotFoundException } = await import('@zxing/library');

        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: 'environment' },
              width:      { ideal: 1280 },
              height:     { ideal: 720 },
            },
          },
          video,
          async (result, err) => {
            if (cancelled) return;
            if (result) { await fireDetected(result.getText()); return; }
            // NotFoundException fires on every frame with no barcode — not an error
            if (err && !(err instanceof NotFoundException)) {
              console.warn('[BarcodeScanner]', err);
            }
          },
        );

        // Capture ZXing-owned stream so cleanup can stop tracks
        if (video.srcObject instanceof MediaStream) {
          streamRef.current = video.srcObject;
        }
        zxingStopRef.current = () => controls.stop();
      } catch (e) {
        console.error('[BarcodeScanner init]', e);
        if (!cancelled) setError('Scanner unavailable — use the input below.');
      }
    };

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      zxingStopRef.current?.();
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, []);

  const handleClose = () => {
    cancelAnimationFrame(rafRef.current);
    zxingStopRef.current?.();
    streamRef.current?.getTracks().forEach(t => t.stop());
    onClose();
  };

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (keyInput.trim()) {
        void fireDetected(keyInput);
        setKeyInput('');
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} className="h-56 w-full object-cover" autoPlay muted playsInline />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-8">
          <div className="h-0.5 w-full bg-[#1A6B5C]/70" />
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-36 w-52">
            <span className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-white/70 rounded-tl" />
            <span className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-white/70 rounded-tr" />
            <span className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-white/70 rounded-bl" />
            <span className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-white/70 rounded-br" />
          </div>
        </div>
        <button type="button" onClick={handleClose}
          className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
          aria-label="Close scanner">
          <X size={16} />
        </button>
        {error ? (
          <div className="absolute inset-x-0 bottom-0 bg-red-900/80 px-3 py-2 text-center text-xs text-white">{error}</div>
        ) : (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 pb-2">
            {usingNative && <Zap size={10} className="text-[#7ECFB4]" />}
            <p className="text-[10px] text-white/50">{usingNative ? 'Fast scan active' : 'Point camera at barcode'}</p>
          </div>
        )}
      </div>
      <div className="relative">
        <Keyboard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input
          ref={keyInputRef}
          type="text"
          value={keyInput}
          onChange={e => setKeyInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="USB scanner or type barcode - press Enter"
          autoComplete="off"
          className="block w-full rounded-xl border border-[#D6F0E8] bg-white py-2.5 pl-10 pr-4 text-sm text-[#0D4035] transition-colors placeholder:text-[#94A3B8] focus:border-[#1A6B5C] focus:outline-none focus:ring-1 focus:ring-[#1A6B5C]"
        />
      </div>
    </div>
  );
};
