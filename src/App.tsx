import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AeroString, DrumPad, HandData, InstrumentTimbre, PlayMode } from './types';
import { handTracker } from './vision/HandTracker';
import { soundManager } from './audio/AudioEngine';
import { drumsManager } from './audio/DrumsEngine';
import { CanvasRenderer } from './components/CanvasRenderer';
import { HUDOverlay } from './components/HUDOverlay';
import { HelpModal } from './components/HelpModal';
import { AACView } from './components/AACView';
import { Sparkles, RefreshCw, ShieldAlert } from 'lucide-react';

const INITIAL_DRUM_PADS: DrumPad[] = [
  { id: 'crash', name: 'Crash Cymbal', shortName: 'Crash', type: 'crash', relX: 0.16, relY: 0.22, relRadius: 0.11, color: '#f59e0b', lastHitTime: 0, hitVelocity: 0, keyTrigger: 'C' },
  { id: 'hihat', name: 'Hi-Hat (Charles)', shortName: 'Hi-Hat', type: 'hihat-closed', relX: 0.20, relY: 0.50, relRadius: 0.10, color: '#00f2ff', lastHitTime: 0, hitVelocity: 0, keyTrigger: 'H' },
  { id: 'snare', name: 'Caja (Snare)', shortName: 'Snare', type: 'snare', relX: 0.36, relY: 0.70, relRadius: 0.12, color: '#EF3800', lastHitTime: 0, hitVelocity: 0, keyTrigger: 'S' },
  { id: 'kick', name: 'Bombo (Kick)', shortName: 'Kick', type: 'kick', relX: 0.50, relY: 0.82, relRadius: 0.13, color: '#00f2ff', lastHitTime: 0, hitVelocity: 0, keyTrigger: 'K' },
  { id: 'tom-high', name: 'Tom Alto (1)', shortName: 'Tom 1', type: 'tom-high', relX: 0.42, relY: 0.36, relRadius: 0.095, color: '#10b981', lastHitTime: 0, hitVelocity: 0, keyTrigger: 'T' },
  { id: 'tom-mid', name: 'Tom Medio (2)', shortName: 'Tom 2', type: 'tom-high', relX: 0.58, relY: 0.36, relRadius: 0.095, color: '#10b981', lastHitTime: 0, hitVelocity: 0, keyTrigger: 'Y' },
  { id: 'tom-low', name: 'Floor Tom', shortName: 'Floor', type: 'tom-low', relX: 0.68, relY: 0.70, relRadius: 0.12, color: '#EF3800', lastHitTime: 0, hitVelocity: 0, keyTrigger: 'F' },
  { id: 'ride', name: 'Ride Cymbal', shortName: 'Ride', type: 'ride', relX: 0.84, relY: 0.25, relRadius: 0.12, color: '#f59e0b', lastHitTime: 0, hitVelocity: 0, keyTrigger: 'R' },
];

export const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisionReady, setIsVisionReady] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Iniciando sistema de visión computacional...');
  const [cameraError, setCameraError] = useState<{ name: string; message: string; details: string } | null>(null);

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [videoDimming, setVideoDimming] = useState<number>(0.12);

  const [hands, setHands] = useState<HandData[]>([]);
  const [strings, setStrings] = useState<AeroString[]>([]);
  const [drumPads, setDrumPads] = useState<DrumPad[]>(INITIAL_DRUM_PADS);
  const [playMode, setPlayMode] = useState<PlayMode>('air-drums'); // Air drums default!
  const [timbre, setTimbre] = useState<InstrumentTimbre>('acoustic-guitar');
  const [isMuted, setIsMuted] = useState(false);
  const [lastPlucked, setLastPlucked] = useState<{ note: string; freq: number; length: number } | null>(null);
  const [lastDrumHit, setLastDrumHit] = useState<{ name: string; velocity: number } | null>(null);
  const [currentBpm, setCurrentBpm] = useState<number | null>(null);
  const lastHitTimeRef = useRef<number>(0);
  const [hoverInfo, setHoverInfo] = useState<string | null>(null);
  const [fps, setFps] = useState(60);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);
  const [isImperialMode, setIsImperialMode] = useState(false);
  const [audioState, setAudioState] = useState<AudioContextState>('suspended');

  useEffect(() => {
    soundManager.subscribeStateChange((state) => {
      setAudioState(state);
    });
  }, []);

  const handleUnlockAudio = async () => {
    await soundManager.unlockAudio();
    drumsManager.trigger('kick', 0.9);
    setTimeout(() => drumsManager.trigger('snare', 0.85), 180);
    setTimeout(() => drumsManager.trigger('crash', 0.85), 360);
  };

  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(performance.now());
  const streamRef = useRef<MediaStream | null>(null);

  // 1. Request Camera
  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      let stream: MediaStream | null = null;
      try {
        const constraints: MediaStreamConstraints = deviceId
          ? { video: { deviceId: { exact: deviceId } }, audio: false }
          : { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videoInputs);

      if (!deviceId && videoInputs.length > 0) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }

      setCameraError(null);
      setSimulationMode(false);
    } catch (err: unknown) {
      console.error('Error al inicializar cámara:', err);
      const errorObj = err as Error;
      const errName = errorObj.name || 'CameraError';
      let details = 'No se pudo acceder al hardware de video.';

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        details = 'El navegador o macOS ha denegado el permiso de acceso a la cámara. Debes habilitarlo en el candado de la URL o en Ajustes del Sistema de tu Mac.';
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        details = 'La cámara está siendo usada por otra aplicación en tu Mac (FaceTime, Zoom, Google Meet, Teams, Photo Booth, OBS o Discord). Ciérrala e inténtalo de nuevo.';
      }

      setCameraError({
        name: errName,
        message: errorObj.message || 'Permiso denegado',
        details,
      });
    }
  }, []);

  // 2. Initialize App
  useEffect(() => {
    const setupApp = async () => {
      await startCamera();
      const ready = await handTracker.initialize((msg) => setLoadingMsg(msg));
      if (ready) {
        setIsVisionReady(true);
      }
    };

    setupApp();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  const handleSelectDevice = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    await startCamera(deviceId);
  };

  // Keyboard Fallback for Drums
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      const pad = drumPads.find((p) => p.keyTrigger === key);
      if (pad) {
        drumsManager.trigger(pad.type, 0.9);
        setLastDrumHit({ name: pad.name, velocity: 0.9 });
        setDrumPads((prev) =>
          prev.map((p) => (p.id === pad.id ? { ...p, lastHitTime: performance.now(), hitVelocity: 0.9 } : p))
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drumPads]);

  // 3. Detection Loop
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && isVisionReady && !simulationMode) {
        const detected = handTracker.detectHands(video, window.innerWidth, window.innerHeight);
        setHands(detected);

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
  }, [isVisionReady, simulationMode]);

  // 4. Audio Engine Sync
  useEffect(() => {
    soundManager.setTimbre(timbre);
  }, [timbre]);

  useEffect(() => {
    soundManager.setMasterVolume(isMuted ? 0 : 0.7);
  }, [isMuted]);

  const handlePluck = useCallback((info: { note: string; freq: number; length: number }) => {
    setLastPlucked(info);
  }, []);

  const handleDrumHit = useCallback((pad: DrumPad, velocity: number) => {
    const now = performance.now();
    if (lastHitTimeRef.current > 0) {
      const deltaMs = now - lastHitTimeRef.current;
      if (deltaMs > 160 && deltaMs < 2000) {
        const instantBpm = Math.round(60000 / deltaMs);
        setCurrentBpm(instantBpm);
      }
    }
    lastHitTimeRef.current = now;
    setLastDrumHit({ name: pad.name, velocity });
  }, []);

  const loadHarpPreset = useCallback(() => {
    setIsImperialMode(false);
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

  const loadGuitarPreset = useCallback(() => {
    setIsImperialMode(false);
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

  const loadRockPreset = useCallback(() => {
    setIsImperialMode(false);
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Drop D Heavy Rock Strings with punchy low-end and soaring sustain
    const rockNotes = [
      { name: 'D2 (Drop)', freq: 73.42, len: 650, color: '#EF3800' },
      { name: 'A2 (Quinta)', freq: 110.00, len: 560, color: '#f59e0b' },
      { name: 'D3 (Octava)', freq: 146.83, len: 480, color: '#EF3800' },
      { name: 'G3 (Sol)', freq: 196.00, len: 400, color: '#00f2ff' },
      { name: 'B3 (Si)', freq: 246.94, len: 330, color: '#f59e0b' },
      { name: 'E4 (Mi)', freq: 329.63, len: 260, color: '#EF3800' },
    ];

    const startX = w * 0.18;
    const spacing = (w * 0.64) / (rockNotes.length - 1);

    const presetStrings: AeroString[] = rockNotes.map((item, idx) => {
      const x = startX + idx * spacing;
      const topY = h * 0.18 + (h * 0.62 - item.len) / 2;
      return {
        id: `rock-${idx}`,
        start: { x, y: topY },
        end: { x, y: topY + item.len },
        length: item.len,
        frequency: item.freq,
        noteName: item.name,
        color: item.color,
        createdAt: Date.now(),
        lastPluckedTime: 0,
        vibrationAmplitude: 0,
        vibrationPhase: 0,
      };
    });

    setStrings(presetStrings);
    setPlayMode('laser-harp');
    setTimbre('distortion-guitar');
    soundManager.setTimbre('distortion-guitar');
    soundManager.testChord();
  }, []);

  const loadFuzzPreset = useCallback(() => {
    setIsImperialMode(false);
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Heavy Fuzz Riff tuning (Grunge / Stoner Rock Pentatonic)
    const fuzzNotes = [
      { name: 'E2 (Grave)', freq: 82.41, len: 640, color: '#f59e0b' },
      { name: 'G2 (Tercera)', freq: 98.00, len: 570, color: '#00f2ff' },
      { name: 'A2 (Cuarta)', freq: 110.00, len: 510, color: '#EF3800' },
      { name: 'C3 (Sexta)', freq: 130.81, len: 440, color: '#f59e0b' },
      { name: 'D3 (Séptima)', freq: 146.83, len: 380, color: '#00f2ff' },
      { name: 'E3 (Tónica)', freq: 164.81, len: 310, color: '#EF3800' },
    ];

    const startX = w * 0.18;
    const spacing = (w * 0.64) / (fuzzNotes.length - 1);

    const presetStrings: AeroString[] = fuzzNotes.map((item, idx) => {
      const x = startX + idx * spacing;
      const topY = h * 0.18 + (h * 0.62 - item.len) / 2;
      return {
        id: `fuzz-${idx}`,
        start: { x, y: topY },
        end: { x, y: topY + item.len },
        length: item.len,
        frequency: item.freq,
        noteName: item.name,
        color: item.color,
        createdAt: Date.now(),
        lastPluckedTime: 0,
        vibrationAmplitude: 0,
        vibrationPhase: 0,
      };
    });

    setStrings(presetStrings);
    setPlayMode('laser-harp');
    setTimbre('fuzz-guitar');
    soundManager.setTimbre('fuzz-guitar');
    soundManager.testChord();
  }, []);

  const loadImperialMarchPreset = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Imperial March core notes (Sol menor / G minor):
    // 1: G3 (Sol 3) - 196.00 Hz
    // 2: Eb3 (Mi♭ 3) - 155.56 Hz
    // 3: Bb3 (Si♭ 3) - 233.08 Hz
    // 4: D4 (Re 4) - 293.66 Hz
    // 5: Eb4 (Mi♭ 4) - 311.13 Hz
    // 6: F#3 (Fa# 3) - 184.99 Hz
    const imperialNotes = [
      { name: 'Sol (G3)', freq: 196.00, len: 540, color: '#EF3800' },
      { name: 'Mib (Eb3)', freq: 155.56, len: 640, color: '#00f2ff' },
      { name: 'Sib (Bb3)', freq: 233.08, len: 460, color: '#f59e0b' },
      { name: 'Re (D4)', freq: 293.66, len: 370, color: '#00f2ff' },
      { name: 'Mib4 (Eb4)', freq: 311.13, len: 320, color: '#f59e0b' },
      { name: 'Fa# (F#3)', freq: 184.99, len: 580, color: '#EF3800' },
    ];

    const startX = w * 0.18;
    const spacing = (w * 0.64) / (imperialNotes.length - 1);

    const presetStrings: AeroString[] = imperialNotes.map((item, idx) => {
      const x = startX + idx * spacing;
      const topY = h * 0.18 + (h * 0.62 - item.len) / 2;
      return {
        id: `imperial-${idx}`,
        start: { x, y: topY },
        end: { x, y: topY + item.len },
        length: item.len,
        frequency: item.freq,
        noteName: item.name,
        color: item.color,
        createdAt: Date.now(),
        lastPluckedTime: 0,
        vibrationAmplitude: 0,
        vibrationPhase: 0,
      };
    });

    setStrings(presetStrings);
    setPlayMode('laser-harp');
    setIsImperialMode(true);
    setTimbre('electric-lead');
    soundManager.setTimbre('electric-lead');
    soundManager.pluckString(196.00, 0.9);
  }, []);

  const clearStrings = useCallback(() => {
    setStrings([]);
    setLastPlucked(null);
    setIsImperialMode(false);
  }, []);

  return (
    <main
      className="relative w-screen h-screen overflow-hidden bg-[#050508] text-slate-100 cyber-grid"
      onClick={() => soundManager.unlockAudio()}
    >
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted
        className="hidden"
      />

      <CanvasRenderer
        videoRef={videoRef}
        hands={hands}
        strings={strings}
        drumPads={drumPads}
        playMode={playMode}
        videoDimming={videoDimming}
        onAddString={(newStr) => setStrings((prev) => [...prev, newStr])}
        onPluck={handlePluck}
        onDrumHit={handleDrumHit}
        currentNoteHover={hoverInfo}
        setCurrentNoteHover={setHoverInfo}
      />

      {playMode === 'aac-communicator' && (
        <AACView hands={hands} />
      )}

      <HUDOverlay
        playMode={playMode}
        setPlayMode={setPlayMode}
        timbre={timbre}
        setTimbre={setTimbre}
        stringsCount={strings.length}
        onClearStrings={clearStrings}
        onLoadHarpPreset={loadHarpPreset}
        onLoadGuitarPreset={loadGuitarPreset}
        onLoadRockPreset={loadRockPreset}
        onLoadFuzzPreset={loadFuzzPreset}
        onLoadImperialMarchPreset={loadImperialMarchPreset}
        isImperialMode={isImperialMode}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        lastPlucked={lastPlucked}
        lastDrumHit={lastDrumHit}
        currentBpm={currentBpm}
        hoverInfo={hoverInfo}
        handsDetectedCount={hands.length}
        fps={fps}
        onOpenHelp={() => setIsHelpOpen(true)}
        videoDimming={videoDimming}
        setVideoDimming={setVideoDimming}
        videoDevices={videoDevices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={handleSelectDevice}
        audioState={audioState}
        onUnlockAudio={handleUnlockAudio}
      />

      {/* Loading Overlay */}
      {!isVisionReady && !cameraError && (
        <div className="absolute inset-0 z-40 bg-[#050508]/90 backdrop-blur-lg flex flex-col items-center justify-center p-6 text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-2xl bg-[#0D2560] border border-[#00f2ff]/50 flex items-center justify-center shadow-[0_0_30px_rgba(0,242,255,0.4)] animate-pulse">
              <Sparkles className="w-10 h-10 text-[#00f2ff]" />
            </div>
            <div className="absolute -inset-1 rounded-2xl border border-[#00f2ff] animate-ping opacity-25 pointer-events-none"></div>
          </div>
          <h2 className="text-2xl font-bold font-mono tracking-wider text-white mb-2">
            AIR<span className="text-amber-400">DRUMS</span> & AERO<span className="text-[#00f2ff]">STRINGS</span> AR
          </h2>
          <p className="text-sm font-mono text-cyan-300 mb-4 max-w-md">
            {loadingMsg}
          </p>
          <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-cyan-500/20">
            <div className="h-full bg-gradient-to-r from-amber-400 via-[#00f2ff] to-[#EF3800] animate-[shimmer_2s_infinite]"></div>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-6">
            Esperando autorización de cámara web en tu navegador...
          </p>
        </div>
      )}

      {/* Camera Permission / Error Diagnostics Modal */}
      {cameraError && !simulationMode && (
        <div className="absolute inset-0 z-40 bg-[#050508]/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 md:p-8 text-slate-100">
          <div className="glass-panel-glow max-w-xl w-full rounded-2xl p-6 md:p-8 border border-amber-500/40 shadow-[0_0_40px_rgba(245,158,11,0.2)]">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold font-mono text-white">
                  Permiso de Cámara Requerido
                </h2>
                <p className="text-xs text-amber-300 font-mono">
                  Código: <span className="font-bold">{cameraError.name}</span>
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-200 mb-5 leading-relaxed bg-[#050508]/80 p-3.5 rounded-xl border border-slate-800">
              {cameraError.details}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => startCamera()}
                className="btn-neon w-full py-3 rounded-xl font-mono text-xs font-bold flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reintentar Permiso de Cámara</span>
              </button>
              <button
                onClick={() => {
                  setSimulationMode(true);
                  setPlayMode('air-drums');
                }}
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-xs font-mono text-amber-300 border border-amber-500/40 flex items-center justify-center space-x-2 whitespace-nowrap"
              >
                <span>Tocar Batería con Ratón / Teclado 🥁</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </main>
  );
};

export default App;
