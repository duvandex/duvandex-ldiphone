import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { X, Camera, Zap, ZapOff, RefreshCcw, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface IMEIScannerProps {
  onResult: (imei: string) => void;
  onClose: () => void;
}

export default function IMEIScanner({ onResult, onClose }: IMEIScannerProps) {
  const [isScannerStarted, setIsScannerStarted] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [cameras, setCameras] = useState<{ id: string, label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "imei-reader-custom";
  const transitionLock = useRef(false);

  const startScanningWithCamera = async (cameraId: string) => {
    if (!scannerRef.current || transitionLock.current) return;
    
    transitionLock.current = true;
    setIsLoading(true);
    
    try {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      // Small pause to let the hardware release
      await new Promise(resolve => setTimeout(resolve, 250));

      await scannerRef.current.start(
        cameraId,
        {
          fps: 24,
          qrbox: { width: 300, height: 140 },
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.CODE_93
          ],
        },
        (decodedText) => {
          const cleaned = decodedText.replace(/\D/g, '');
          if (cleaned.length >= 8) {
            onResult(cleaned);
            // Don't call stopScanner here directly to avoid lock issues
            if (scannerRef.current?.isScanning) {
              scannerRef.current.stop().then(() => onClose()).catch(onClose);
            } else {
              onClose();
            }
          }
        },
        () => {}
      );
      setIsScannerStarted(true);
      setError('');
    } catch (err: any) {
      console.error("Error starting camera", err);
      if (err.toString().includes("already under transition")) {
        // Retry once after a delay if it was a transition lock
        setTimeout(() => {
          transitionLock.current = false;
          startScanningWithCamera(cameraId);
        }, 500);
      } else {
        setError("La cámara está ocupada o no responde. Intenta cerrar otras apps o cambiar de lente.");
      }
    } finally {
      setIsLoading(false);
      transitionLock.current = false;
    }
  };

  useEffect(() => {
    const html5QrCode = new Html5Qrcode(scannerId);
    scannerRef.current = html5QrCode;
    let isMounted = true;

    const init = async () => {
      try {
        // Wait for DOM
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const container = document.getElementById(scannerId);
        if (!container || !isMounted) return;

        const detectedCameras = await Html5Qrcode.getCameras();
        if (detectedCameras && detectedCameras.length > 0 && isMounted) {
          setCameras(detectedCameras);
          const backIdx = detectedCameras.findIndex(c => 
            c.label.toLowerCase().includes('back') || 
            c.label.toLowerCase().includes('trasera') ||
            c.label.toLowerCase().includes('0')
          );
          const initialIdx = backIdx !== -1 ? backIdx : 0;
          setCurrentCameraIndex(initialIdx);
          await startScanningWithCamera(detectedCameras[initialIdx].id);
        } else if (isMounted) {
          setError("No se detectaron cámaras.");
        }
      } catch (err: any) {
        console.error("Scanner init error", err);
        if (isMounted) setError("Error al acceder a la cámara.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    init();
    return () => { 
      isMounted = false;
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const switchCamera = async () => {
    if (cameras.length < 2) return;
    const nextIdx = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIdx);
    await startScanningWithCamera(cameras[nextIdx].id);
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner", err);
      }
    }
    onClose();
  };

  const toggleFlash = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        const newState = !isFlashOn;
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: newState } as any]
        });
        setIsFlashOn(newState);
      } catch (err) {
        console.warn("Flash no soportado en este dispositivo", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-sm border-none shadow-2xl bg-black overflow-hidden rounded-[2.5rem]">
        <div className="relative aspect-square w-full bg-slate-950 overflow-hidden">
          {/* Custom Scanner UI */}
          <div id={scannerId} className="w-full h-full object-cover"></div>
          
          {/* Overlay UI */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            {/* Corner Markers */}
            <div className="relative w-72 h-32 border-2 border-white/20 rounded-2xl overflow-hidden">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-rose-500 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-rose-500 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-rose-500 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-rose-500 rounded-br-lg"></div>
              
              {/* Scan Beam Animation */}
              {isScannerStarted && (
                <div className="absolute inset-x-0 h-0.5 bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-scan-beam"></div>
              )}
            </div>
            
            <p className="mt-6 text-white/60 text-[10px] uppercase font-black tracking-[0.2em] bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
              Encuadra el código de barras
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Iniciando Cámara...</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mb-4">
                <X className="w-8 h-8 text-rose-500" />
              </div>
              <p className="text-white font-bold text-sm leading-relaxed mb-6">{error}</p>
              <Button onClick={onClose} variant="outline" className="text-white border-white/20 rounded-2xl py-6 px-8">
                Cerrar e intentar manual
              </Button>
            </div>
          )}

          {/* Top Bar Controls */}
          <div className="absolute top-6 inset-x-6 flex justify-between items-center z-10">
            <button 
              onClick={onClose}
              className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-90"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex gap-2">
              {cameras.length > 1 && (
                <button 
                  onClick={switchCamera}
                  className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-90"
                >
                  <RefreshCcw className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={toggleFlash}
                className={cn(
                  "w-12 h-12 rounded-2xl backdrop-blur-xl border border-white/10 flex items-center justify-center transition-all active:scale-90",
                  isFlashOn ? "bg-rose-500 text-white shadow-lg shadow-rose-500/40" : "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                {isFlashOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Status / Hints */}
        <div className="bg-white p-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-rose-50 rounded-2xl">
              <Camera className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 uppercase tracking-tight leading-none text-lg">Escáner Activo</h3>
              <p className="text-slate-400 text-xs font-medium mt-1">Busca el código de barras en el equipo</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
             <Button 
               variant="outline" 
               className="w-full h-14 rounded-2xl border-slate-100 font-black uppercase text-[10px] tracking-widest text-slate-400 group"
               onClick={() => window.location.reload()}
             >
               <RefreshCcw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
               Reiniciar Cámara
             </Button>
          </div>
        </div>
      </Card>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan-beam {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan-beam {
          animation: scan-beam 2s ease-in-out infinite alternate;
        }
        #imei-reader-custom video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
      `}} />
    </div>
  );
}
