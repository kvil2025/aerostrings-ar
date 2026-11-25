import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AeroString, HandData, InstrumentTimbre, PlayMode } from './types';
import { handTracker } from './vision/HandTracker';
import { soundManager } from './audio/AudioEngine';
import { CanvasRenderer } from './components/CanvasRenderer';
import { HUDOverlay } from './components/HUDOverlay';
import { HelpModal } from './components/HelpModal';
import { Camera, AlertCircle, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisionReady, setIsVisionReady] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Iniciando sistema de visión computacional...');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [videoDimming, setVideoDimming] = useState<number>(0.12); // Default crystal clear camera view

  const [hands, setHands] = useState<HandData[]>([]);
  const [strings, setStrings] = useState<AeroString[]>([]);
  const [playMode, setPlayMode] = useState<PlayMode>('draw-strings');
  const [timbre, setTimbre] = useState<InstrumentTimbre>('acoustic-guitar');
  const [isMuted, setIsMuted] = useState(false);
  const [lastPlucked, setLastPlucked] = useState<{ note: string; freq: number; length: number } | null>(null);
  const [hoverInfo, setHoverInfo] = useState<string | null>(null);
  const [fps, setFps] = useState(60);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // FPS calculation refs
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(performance.now());
  const streamRef = useRef<MediaStream | null>(null);

  // 1. Start Camera with specified deviceId
  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Enumerate cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videoInputs);

      if (!deviceId && videoInputs.length > 0) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }

      setCameraError(null);
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      setCameraError(
        err instanceof Error
          ? `Acceso a la cámara denegado: ${err.message}`
          : 'No se pudo acceder a la cámara web. Asegúrate de otorgar permisos.'
      );
    }
  }, []);

  // 2. Initialize App
  useEffect(() => {
    const setupApp = async () => {
      await startCamera();

      // Initialize MediaPipe Hand Tracker
      const ready = await handTracker.initialize((msg) => setLoadingMsg(msg));
      if (ready) {
        setIsVisionReady(true);
      } else {
        setCameraError('No se pudo cargar el modelo neuronal de detección de manos.');
      }
    };

    setupApp();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // Handle camera switch
  const handleSelectDevice = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    await startCamera(deviceId);
  };

  // 3. Detection Loop (Runs every animation frame)
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && isVisionReady) {
        const detected = handTracker.detectHands(video, window.innerWidth, window.innerHeight);
        setHands(detected);

        // Calculate FPS
        frameCountRef.current++;
        const now = performance.now();
        if (now - lastFpsUpdateRef.current >= 1000) {
          setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsUpdateRef.current)));
          frameCountRef.current = 0;
          lastFpsUpdateRef.current = now;
        }
      }

      animId = requestAnimationFrame(loop);
    };

    if (isVisionReady) {
      animId = requestAnimationFrame(loop);
    }

    return () => cancelAnimationFrame(animId);
  }, [isVisionReady]);

  // 4. Audio Engine Sync
  useEffect(() => {
    soundManager.setTimbre(timbre);
  }, [timbre]);

  useEffect(() => {
    soundManager.setMasterVolume(isMuted ? 0 : 0.7);
  }, [isMuted]);

  // Pluck Handler
  const handlePluck = useCallback((info: { note: string; freq: number; length: number }) => {
    setLastPlucked(info);
  }, []);

  // Preset: Laser Harp (7 pentatonic vertical strings)
  const loadHarpPreset = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const notes = [
      { name: 'C3', freq: 130.81, len: 650 },
      { name: 'Eb3', freq: 155.56, len: 580 },
      { name: 'F3', freq: 174.61, len: 520 },
      { name: 'G3', freq: 196.00, len: 460 },
      { name: 'Bb3', freq: 233.08, len: 400 },
      { name: 'C4', freq: 261.63, len: 340 },
      { name: 'Eb4', freq: 311.13, len: 280 },
    ];

    const startX = w * 0.22;
    const spacing = (w * 0.56) / (notes.length - 1);

    const presetStrings: AeroString[] = notes.map((item, idx) => {
      const x = startX + idx * spacing;
      const topY = h * 0.18 + (h * 0.6 - item.len) / 2;
      return {
        id: `harp-${idx}`,
        start: { x, y: topY },
        end: { x, y: topY + item.len },
        length: item.len,
        frequency: item.freq,
        noteName: item.name,
        color: '#00f2ff',
        createdAt: Date.now(),
        lastPluckedTime: 0,
        vibrationAmplitude: 0,
        vibrationPhase: 0,
      };
    });

    setStrings(presetStrings);
  }, []);

  // Preset: Standard 6-String Guitar (E2, A2, D3, G3, B3, E4)
  const loadGuitarPreset = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const guitarNotes = [
      { name: 'E2', freq: 82.41, len: 620 },
      { name: 'A2', freq: 110.00, len: 520 },
      { name: 'D3', freq: 146.83, len: 440 },
      { name: 'G3', freq: 196.00, len: 360 },
      { name: 'B3', freq: 246.94, len: 290 },
      { name: 'E4', freq: 329.63, len: 220 },
    ];

    const startY = h * 0.22;
    const spacing = (h * 0.55) / (guitarNotes.length - 1);

    const presetStrings: AeroString[] = guitarNotes.map((item, idx) => {
      const y = startY + idx * spacing;
      const leftX = (w - item.len) / 2;
      return {
        id: `guitar-${idx}`,
        start: { x: leftX, y },
        end: { x: leftX + item.len, y },
        length: item.len,
        frequency: item.freq,
        noteName: item.name,
        color: '#00f2ff',
        createdAt: Date.now(),
        lastPluckedTime: 0,
        vibrationAmplitude: 0,
        vibrationPhase: 0,
      };
    });

    setStrings(presetStrings);
  }, []);

  const clearStrings = useCallback(() => {
    setStrings([]);
    setLastPlucked(null);
  }, []);

  return (
    <main
      className="relative w-screen h-screen overflow-hidden bg-[#050508] text-slate-100 cyber-grid"
      onClick={() => soundManager.init()}
    >
      {/* Hidden processing video */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted
        className="hidden"
      />

      {/* Main Interactive Hologram AR Canvas */}
      <CanvasRenderer
        videoRef={videoRef}
        hands={hands}
        strings={strings}
        playMode={playMode}
        videoDimming={videoDimming}
        onAddString={(newStr) => setStrings((prev) => [...prev, newStr])}
        onUpdateStrings={setStrings}
        onPluck={handlePluck}
        currentNoteHover={hoverInfo}
        setCurrentNoteHover={setHoverInfo}
      />

      {/* Futuristic HUD Interface */}
      <HUDOverlay
        playMode={playMode}
        setPlayMode={setPlayMode}
        timbre={timbre}
        setTimbre={setTimbre}
        stringsCount={strings.length}
        onClearStrings={clearStrings}
        onLoadHarpPreset={loadHarpPreset}
        onLoadGuitarPreset={loadGuitarPreset}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        lastPlucked={lastPlucked}
        hoverInfo={hoverInfo}
        handsDetectedCount={hands.length}
        fps={fps}
        onOpenHelp={() => setIsHelpOpen(true)}
        videoDimming={videoDimming}
        setVideoDimming={setVideoDimming}
        videoDevices={videoDevices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={handleSelectDevice}
      />

      {/* Loading Screen Overlay */}
      {!isVisionReady && !cameraError && (
        <div className="absolute inset-0 z-40 bg-[#050508]/90 backdrop-blur-lg flex flex-col items-center justify-center p-6 text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-2xl bg-[#0D2560] border border-[#00f2ff]/50 flex items-center justify-center shadow-[0_0_30px_rgba(0,242,255,0.4)] animate-pulse">
              <Sparkles className="w-10 h-10 text-[#00f2ff]" />
            </div>
            <div className="absolute -inset-1 rounded-2xl border border-[#00f2ff] animate-ping opacity-25 pointer-events-none"></div>
          </div>
          <h2 className="text-2xl font-bold font-mono tracking-wider text-white mb-2">
            AERO<span className="text-[#00f2ff]">STRINGS</span> AR
          </h2>
          <p className="text-sm font-mono text-cyan-300 mb-4 max-w-md">
            {loadingMsg}
          </p>
          <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-cyan-500/20">
            <div className="h-full bg-gradient-to-r from-[#00f2ff] to-[#EF3800] animate-[shimmer_2s_infinite]"></div>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-6">
            Por favor, concede permisos de cámara web cuando el navegador lo solicite.
          </p>
        </div>
      )}

      {/* Camera / Permission Error Overlay */}
      {cameraError && (
        <div className="absolute inset-0 z-40 bg-[#050508]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/50 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold font-mono text-white mb-2">Acceso a Cámara Requerido</h2>
          <p className="text-sm text-slate-300 max-w-md mb-6">{cameraError}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-neon px-5 py-2.5 rounded-xl font-mono text-xs flex items-center space-x-2"
          >
            <Camera className="w-4 h-4" />
            <span>Reintentar Permisos</span>
          </button>
        </div>
      )}

      {/* Help & Tutorial Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </main>
  );
};

export default App;
