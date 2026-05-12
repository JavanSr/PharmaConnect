import React, { useEffect, useRef, useState } from 'react';
import { BrowserCodeReader, BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';
import { Camera, CameraOff, ScanLine } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type BarcodeScannerProps = {
  label?: string;
  placeholder?: string;
  onDetected: (value: string) => void | Promise<void>;
};

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  label = 'Barcode scanner',
  placeholder = 'Scan or enter barcode',
  onDetected,
}) => {
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastValueRef = useRef<string>('');
  const lastScanAtRef = useRef<number>(0);

  const [manualValue, setManualValue] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [scannerError, setScannerError] = useState('');

  const stopScanner = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    readerRef.current = null;
  };

  useEffect(() => stopScanner, []);

  const handleDetected = async (rawValue: string) => {
    const value = rawValue.trim();
    if (!value) return;

    const now = Date.now();
    const withinCooldown = now - lastScanAtRef.current < 1500;
    if (withinCooldown && value === lastValueRef.current) {
      return;
    }

    lastValueRef.current = value;
    lastScanAtRef.current = now;
    setManualValue('');
    await onDetected(value);
  };

  const startScanner = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError('Camera scanning is not supported on this device. Use manual barcode entry instead.');
      return;
    }

    setScannerError('');
    setIsStarting(true);

    try {
      const devices = await BrowserCodeReader.listVideoInputDevices();
      if (!devices.length) {
        throw new Error('No camera found for barcode scanning.');
      }

      const preferredDevice =
        devices.find((device) => /back|rear|environment/i.test(device.label))?.deviceId ||
        devices[0]?.deviceId;

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      controlsRef.current = await reader.decodeFromVideoDevice(
        preferredDevice,
        videoRef.current ?? undefined,
        async (result, error) => {
          if (result) {
            await handleDetected(result.getText());
            return;
          }

          if (error && !(error instanceof NotFoundException)) {
            setScannerError(error.message || 'Unable to decode barcode from camera feed.');
          }
        }
      );

      setIsScannerOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start the barcode scanner.';
      setScannerError(message);
      setIsScannerOpen(false);
      stopScanner();
    } finally {
      setIsStarting(false);
    }
  };

  const submitManual = async () => {
    const value = manualValue.trim();
    if (!value) return;
    await handleDetected(value);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-[#D6F0E8] bg-[#F8FAFC] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#0D4035]">{label}</p>
          <p className="text-xs text-[#64748B]">
            Continuous scan mode for camera devices, with manual entry as fallback.
          </p>
        </div>
        <Button
          type="button"
          variant={isScannerOpen ? 'ghost' : 'secondary'}
          leftIcon={isScannerOpen ? <CameraOff size={16} /> : <Camera size={16} />}
          loading={isStarting}
          onClick={() => {
            if (isScannerOpen) {
              stopScanner();
              setIsScannerOpen(false);
              return;
            }

            void startScanner();
          }}
        >
          {isScannerOpen ? 'Stop camera' : 'Start camera'}
        </Button>
      </div>

      {isScannerOpen && (
        <div className="overflow-hidden rounded-2xl border border-[#D6F0E8] bg-black">
          <video ref={videoRef} className="h-64 w-full object-cover" muted playsInline />
        </div>
      )}

      <Input
        label="Manual barcode entry"
        value={manualValue}
        onChange={(event) => setManualValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void submitManual();
          }
        }}
        placeholder={placeholder}
        leftIcon={<ScanLine size={16} />}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[#64748B]">
          Barcode scanners that type and press Enter will also work here.
        </p>
        <Button type="button" variant="secondary" onClick={() => void submitManual()}>
          Record barcode
        </Button>
      </div>

      {scannerError && (
        <p className="text-xs text-[#DC2626]">{scannerError}</p>
      )}
    </div>
  );
};
