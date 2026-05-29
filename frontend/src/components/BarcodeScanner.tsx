import React, { useEffect, useRef, useState } from 'react';
import { BrowserCodeReader, BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library';
import { Keyboard, X } from 'lucide-react';

// Restrict to formats common in pharmaceutical packaging so ZXing doesn't try
// every format on every frame — this significantly improves decode speed.
const PHARMA_HINTS = new Map<DecodeHintType, unknown>([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [
      BarcodeFormat.EAN_13,    // standard medicine outer packaging
      BarcodeFormat.EAN_8,     // small blister packs
      BarcodeFormat.CODE_128,  // dispensing labels, logistics
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_39,   // older pharmacy systems
      BarcodeFormat.QR_CODE,   // modern packaging, GS1 digital links
      BarcodeFormat.DATA_MATRIX, // pharmaceutical serialisation
    ],
  ],
  [DecodeHintType.TRY_HARDER, true],
]);

type BarcodeScannerProps = {
  onDetected: (value: string) => void | Promise<void>;
  onClose: () => void;
};

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onDetected, onClose }) => {
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const keyInputRef = useRef<HTMLInputElement | null>(null);
  // Keep a stable ref to onDetected so the ZXing callback closure never goes stale
  const onDetectedRef = useRef(onDetected);
  useEffect(() => { onDetectedRef.current = onDetected; }, [onDetected]);

  const lastValueRef = useRef('');
  const lastScanAtRef = useRef(0);
  const [error, setError] = useState('');
  const [keyInput, setKeyInput] = useState('');

  const stopScanner = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    readerRef.current = null;
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  async function fireDetected(raw: string) {
    const value = raw.trim();
    if (!value) return;
    const now = Date.now();
    // Debounce: ignore duplicate scans within 1.5 s
    if (now - lastScanAtRef.current < 1500 && value === lastValueRef.current) return;
    lastValueRef.current = value;
    lastScanAtRef.current = now;
    await onDetectedRef.current(value);
  }

  // Auto-focus the keyboard input so USB/Bluetooth scanners type straight into it
  useEffect(() => {
    keyInputRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera not available. Use the scanner input below.');
        return;
      }

      try {
        const devices = await BrowserCodeReader.listVideoInputDevices();
        if (!devices.length) {
          setError('No camera found. Use the scanner input below.');
          return;
        }

        if (cancelled) return;

        const preferredDevice =
          devices.find((d) => /back|rear|environment/i.test(d.label))?.deviceId ??
          devices[0]?.deviceId;

        const reader = new BrowserMultiFormatReader(PHARMA_HINTS as Map<DecodeHintType, any>);
        readerRef.current = reader;

        const videoEl = videoRef.current;
        if (!videoEl || cancelled) return;

        controlsRef.current = await reader.decodeFromVideoDevice(
          preferredDevice,
          videoEl,
          async (result, err) => {
            if (cancelled) return;
            if (result) {
              await fireDetected(result.getText());
              return;
            }
            if (err && !(err instanceof NotFoundException)) {
              setError(err.message || 'Could not read barcode from camera.');
            }
          },
        );
      } catch (e) {
        if (!cancelled) {
          setError('Camera unavailable. Use the scanner input below.');
        }
      }
    };

    void start();
    return () => {
      cancelled = true;
      stopScanner();
    };
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (keyInput.trim()) {
        fireDetected(keyInput);
        setKeyInput('');
      }
    }
  }

  return (
    <div className="space-y-3">
      {/* Camera viewfinder */}
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} className="h-56 w-full object-cover" autoPlay muted playsInline />

        {/* Scan guide line */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-8">
          <div className="h-0.5 w-full bg-[#1A6B5C]/70" />
        </div>

        {/* Corner brackets */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-36 w-52">
            <span className="absolute left-0 top-0 h-5 w-5 rounded-tl border-l-2 border-t-2 border-white/70" />
            <span className="absolute right-0 top-0 h-5 w-5 rounded-tr border-r-2 border-t-2 border-white/70" />
            <span className="absolute bottom-0 left-0 h-5 w-5 rounded-bl border-b-2 border-l-2 border-white/70" />
            <span className="absolute bottom-0 right-0 h-5 w-5 rounded-br border-b-2 border-r-2 border-white/70" />
          </div>
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
          aria-label="Close scanner"
        >
          <X size={16} />
        </button>

        {error ? (
          <div className="absolute inset-x-0 bottom-0 bg-red-900/80 px-3 py-2 text-center text-xs text-white">
            {error}
          </div>
        ) : (
          <p className="pointer-events-none absolute inset-x-0 bottom-0 pb-2 text-center text-[10px] text-white/50">
            Point camera at barcode
          </p>
        )}
      </div>

      {/* Keyboard / USB wand scanner input — auto-focused so scanners type here */}
      <div className="relative">
        <Keyboard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input
          ref={keyInputRef}
          type="text"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="USB scanner or type barcode · press Enter"
          className="w-full rounded-xl border border-[#D6F0E8] bg-white py-2.5 pl-9 pr-4 text-sm text-[#0D4035] placeholder-[#94A3B8] outline-none focus:border-[#1A6B5C] focus:ring-1 focus:ring-[#1A6B5C]"
          autoComplete="off"
        />
      </div>
    </div>
  );
};
