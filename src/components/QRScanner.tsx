import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
}

let instanceCounter = 0;

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const idRef = useRef(`qr-${++instanceCounter}`);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startedRef = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const scannedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const scanner = new Html5Qrcode(idRef.current);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
        (decodedText) => {
          if (scannedRef.current) return;
          scannedRef.current = true;
          onScan(decodedText);
        },
        () => {}
      )
      .then(() => setIsStarting(false))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes('permission')) {
          setCameraError(
            'Camera access is needed for QR scanning. Please enable camera permission in your browser settings, or paste the URI manually.'
          );
        } else if (msg.toLowerCase().includes('no cameras')) {
          setCameraError('No camera found on this device. Please paste the URI manually.');
        } else {
          setCameraError('Unable to start camera. Please paste the URI manually.');
          onError?.(msg);
        }
        setIsStarting(false);
      });

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
      scannerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (cameraError) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-black/5 rounded-2xl text-center">
        <span className="text-4xl" aria-hidden>📷</span>
        <p className="text-sm text-[#8e8e93]">{cameraError}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {isStarting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl z-10">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
      <div
        id={idRef.current}
        className="w-full rounded-2xl overflow-hidden bg-black"
      />
      {!isStarting && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="relative w-56 h-56">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-500 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-500 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-500 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-500 rounded-br-lg" />
            <div className="absolute left-1 right-1 h-0.5 bg-blue-500/60 top-1/2 animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
}
