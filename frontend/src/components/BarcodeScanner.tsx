import React, { useEffect, useRef, useState } from 'react';
import { BrowserCodeReader, BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';
import { X } from 'lucide-react';

type BarcodeScannerProps = {
  onDetected: (value: string) => void | Promise<void>;
  onClose: () => void;
};

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onDetected, onClose }) => {
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastValueRef = useRef<string>('');
  const lastScanAtRef = useRef<number>(0);
  const [error, setError] = useState('');

  const stopScanner = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    readerRef.current = null;
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera not supported on this device.');
        return;
      }

      try {
        const devices = await BrowserCodeReader.listVideoInputDevices();
        if (!devices.length) throw new Error('No camera found on this device.');

        const preferredDevice =
          devices.find((d) => /back|rear|environment/i.test(d.label))?.deviceId ??
          devices[0]?.deviceId;

        const reader = new BrowserMultiFormatReader();
        if (cancelled) return;
        readerRef.current = reader;

        controlsRef.current = await reader.decodeFromVideoDevice(
          preferredDevice,
          videoRef.current ?? undefined,
          async (result, err) => {
            if (cancelled) return;
            if (result) {
              const value = result.getText().trim();
              if (!value) return;
              const now = Date.now();
              if (now - lastScanAtRef.current < 1500 && value === lastValueRef.current) return;
              lastValueRef.current = value;
              lastScanAtRef.current = now;
              await onDetected(value);
              return;
            }
            if (err && !(err instanceof NotFoundException)) {
              setError(err.message || 'Could not read barcode from camera.');
            }
          },
        );
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not start camera.');
        }
      }
    };

    void start();
    return () => {
      cancelled = true;
      stopScanner();
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      {/* Camera feed — autoPlay is required or the video stays black */}
      <video ref={videoRef} className="h-64 w-full object-cover" autoPlay muted playsInline />

      {/* Scan guide line */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-8">
        <div className="h-0.5 w-full bg-[#1A6B5C]/70" />
      </div>

      {/* Corner brackets */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-40 w-56">
          <span className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-white/70 rounded-tl" />
          <span className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-white/70 rounded-tr" />
          <span className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-white/70 rounded-bl" />
          <span className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-white/70 rounded-br" />
        </div>
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={handleClose}
        className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
        aria-label="Close scanner"
      >
        <X size={16} />
      </button>

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-x-0 bottom-0 bg-red-900/80 px-3 py-2 text-center text-xs text-white">
          {error}
        </div>
      )}

      <p className="absolute inset-x-0 bottom-0 pb-2 text-center text-[10px] text-white/50 pointer-events-none">
        {!error && 'Point camera at barcode'}
      </p>
    </div>
  );
};
