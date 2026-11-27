import React, { useState } from 'react';
import { BackgroundSettings, InstrumentTimbre, PlayMode, ThereminScale, ThereminState, ThereminTimbre, VirtualBackgroundMode } from '../types';
import { 
  Sparkles, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Layers, 
  Sliders, 
  Info, 
  Activity, 
  Guitar, 
  Zap, 
  Music,
  Camera,
  Sun,
  Disc3,
  Sword,
  Flame,
  MessageSquare,
  RadioTower,
  Waves,
  Image,
  Upload,
  FolderOpen,
  Trash2,
  Check,
  X
} from 'lucide-react';
import { soundManager } from '../audio/AudioEngine';

// Partituras verticales de Star Wars para los bordes de la pantalla
const imperialPhrase1 = [
  { step: '1', name: 'Sol', note: 'Sol', rhythm: '♩', color: 'text-[#EF3800]' },
  { step: '2', name: 'Sol', note: 'Sol', rhythm: '♩', color: 'text-[#EF3800]' },
  { step: '3', name: 'Sol', note: 'Sol', rhythm: '♩', color: 'text-[#EF3800]' },
  { step: '4', name: 'Mib', note: 'Mib', rhythm: '♪', color: 'text-[#00f2ff]' },
  { step: '5', name: 'Sib', note: 'Sib', rhythm: '♪', color: 'text-[#f59e0b]' },
  { step: '6', name: 'Sol', note: 'Sol', rhythm: '♩', color: 'text-[#EF3800]' },
];

const imperialPhrase2 = [
  { step: '7', name: 'Re', note: 'Re', rhythm: '♩', color: 'text-[#00f2ff]' },
  { step: '8', name: 'Re', note: 'Re', rhythm: '♩', color: 'text-[#00f2ff]' },
  { step: '9', name: 'Re', note: 'Re', rhythm: '♩', color: 'text-[#00f2ff]' },
  { step: '10', name: 'Mib4', note: 'Mib', rhythm: '♪', color: 'text-[#f59e0b]' },
  { step: '11', name: 'Sib', note: 'Sib', rhythm: '♪', color: 'text-[#f59e0b]' },
  { step: '12', name: 'Fa#', note: 'Fa#', rhythm: '♩', color: 'text-[#EF3800]' },
  { step: '13', name: 'Mib', note: 'Mib', rhythm: '♪', color: 'text-[#00f2ff]' },
  { step: '14', name: 'Sib', note: 'Sib', rhythm: '♪', color: 'text-[#f59e0b]' },
  { step: '15', name: 'Sol', note: 'Sol', rhythm: '♩', color: 'text-[#EF3800]' },
];

const BACKGROUND_OPTIONS: { mode: VirtualBackgroundMode; emoji: string; title: string; desc: string }[] = [
  {
    mode: 'camera-raw',
    emoji: '📷',
    title: 'Cámara Real (AR Directo)',
    desc: 'Fondo transparente donde se ve tu habitación real con los instrumentos flotantes.',
  },
  {
    mode: 'blur',
    emoji: '🌫️',
    title: 'Desenfoque Bokeh (Meet / Zoom)',
    desc: 'Desenfoca tu habitación con efecto cinematográfico aislando al músico en foco.',
  },
  {
    mode: 'custom-image',
    emoji: '🖼️',
    title: 'Mi Imagen Propia (Subir Foto)',
    desc: 'Sube cualquier imagen desde tu dispositivo (tu sala, estadio, logo o paisaje).',
  },
  {
    mode: 'rock-concert',
    emoji: '🎸',
    title: 'Estadio de Rock (Concierto)',
    desc: 'Focos móviles de estadio, torres de amplificadores y niebla de concierto en vivo.',
  },
  {
    mode: 'cosmic-space',
    emoji: '🌌',
    title: 'Espacio Cósmico (Nebulosa)',
    desc: 'Vía Láctea con 160 estrellas animadas, polvo estelar y nebulosas cósmicas.',
  },
  {
    mode: 'rehearsal-room',
    emoji: '🎙️',
    title: 'Sala de Ensayo (Estudio Acústico)',
    desc: 'Paredes con paneles de madera acústica, lámparas de tungsteno y vúmetros analógicos.',
  },
  {
    mode: 'cyberpunk-city',
    emoji: '🌆',
    title: 'Ciudad Cyberpunk (Neón)',
    desc: 'Rascacielos retrofuturistas de noche, lluvia digital y cuadrícula Tron luminosa.',
  },
  {
    mode: 'zen-nature',
    emoji: '🏞️',
    title: 'Paisaje Zen (Atardecer en Cordillera)',
    desc: 'Sol dorado crepuscular, siluetas de montañas andinas y lago cristalino reflectante.',
  },
];

interface HUDOverlayProps {
  playMode: PlayMode;
  setPlayMode: (mode: PlayMode) => void;
  timbre: InstrumentTimbre;
  setTimbre: (timbre: InstrumentTimbre) => void;
  stringsCount: number;
  onClearStrings: () => void;
  onLoadHarpPreset: () => void;
  onLoadGuitarPreset: () => void;
  onLoadRockPreset?: () => void;
  onLoadFuzzPreset?: () => void;
  onLoadImperialMarchPreset: () => void;
  isImperialMode: boolean;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  lastPlucked: { note: string; freq: number; length: number } | null;
  lastDrumHit: { name: string; velocity: number } | null;
  currentBpm?: number | null;
  hoverInfo: string | null;
  handsDetectedCount: number;
  fps: number;
  onOpenHelp: () => void;
  videoDimming: number;
  setVideoDimming: (val: number) => void;
  videoDevices: MediaDeviceInfo[];
  selectedDeviceId: string;
  onSelectDevice: (id: string) => void;
  audioState: AudioContextState;
  onUnlockAudio: () => void;
  thereminState?: ThereminState;
  thereminTimbre?: ThereminTimbre;
  setThereminTimbre?: (timbre: ThereminTimbre) => void;
  thereminScale?: ThereminScale;
  setThereminScale?: (scale: ThereminScale) => void;
  backgroundSettings: BackgroundSettings;
  setBackgroundSettings: React.Dispatch<React.SetStateAction<BackgroundSettings>>;
}

export const HUDOverlay: React.FC<HUDOverlayProps> = ({
  playMode,
  setPlayMode,
  timbre,
  setTimbre,
  stringsCount,
  onClearStrings,
  onLoadHarpPreset,
  onLoadGuitarPreset,
  onLoadRockPreset,
  onLoadFuzzPreset,
  onLoadImperialMarchPreset,
  isImperialMode,
  isMuted,
  setIsMuted,
  lastPlucked,
  lastDrumHit,
  currentBpm,
  hoverInfo,
  handsDetectedCount,
  fps,
  onOpenHelp,
  videoDimming,
  setVideoDimming,
  videoDevices,
  selectedDeviceId,
  onSelectDevice,
  audioState,
  onUnlockAudio,
  thereminState,
  thereminTimbre,
  setThereminTimbre,
  thereminScale,
  setThereminScale,
  backgroundSettings,
  setBackgroundSettings,
}) => {
  const [isBgModalOpen, setIsBgModalOpen] = useState(false);
  return (
    <div className="absolute inset-0 pointer-events-none z-40 flex flex-col justify-between p-3 md:p-6">
      {/* Top Bar */}
      <header className="flex flex-wrap items-center justify-between w-full pointer-events-auto gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0D2560] to-[#050508] border border-[#00f2ff]/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.3)]">
            {isImperialMode ? (
              <Sword className="w-5 h-5 text-rose-500 animate-pulse" />
            ) : playMode === 'theremin' ? (
              <RadioTower className="w-5 h-5 text-[#00f2ff] animate-pulse" />
            ) : (
              <Guitar className="w-5 h-5 text-[#00f2ff]" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base md:text-xl font-bold tracking-wider text-slate-100 font-mono">
                {isImperialMode ? (
                  <>IMPERIAL<span className="text-rose-500">CHORD</span> <span className="text-xs px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">SITH</span></>
                ) : playMode === 'theremin' ? (
                  <>THEREMIN<span className="text-[#00f2ff]">AR</span> <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">1920 ETHERWAVE</span></>
                ) : (
                  <>AERO<span className="text-[#00f2ff]">STRINGS</span> <span className="text-xs px-1.5 py-0.5 rounded bg-[#EF3800]/20 text-[#EF3800] border border-[#EF3800]/40">AR</span></>
                )}
              </h1>
            </div>
            <p className="text-xs text-slate-300 font-mono flex items-center space-x-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>
                {isImperialMode
                  ? 'Marcha Imperial Star Wars (Sol Menor) • Notas Listas'
                  : playMode === 'theremin'
                  ? 'Theremin Sin Contacto • Tono en Mano Derecha y Volumen en Mano Izquierda'
                  : 'Cuerdas Holográficas & Síntesis Karplus-Strong'}
              </span>
            </p>
          </div>
        </div>

        {/* Center / Camera & Telemetry Control */}
        <div className="flex items-center space-x-3 glass-panel px-3 py-1.5 rounded-xl text-xs font-mono">
          {videoDevices.length > 1 && (
            <div className="flex items-center space-x-1.5 border-r border-slate-700 pr-3">
              <Camera className="w-3.5 h-3.5 text-[#00f2ff]" />
              <select
                value={selectedDeviceId}
                onChange={(e) => onSelectDevice(e.target.value)}
                className="bg-[#050508] border border-cyan-500/30 text-xs font-mono text-cyan-300 rounded px-1.5 py-0.5 outline-none max-w-[140px] truncate"
              >
                {videoDevices.map((dev, idx) => (
                  <option key={dev.deviceId} value={dev.deviceId}>
                    {dev.label || `Cámara ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center space-x-1.5" title="Claridad del fondo de la cámara">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] text-slate-300">Fondo:</span>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={videoDimming}
              onChange={(e) => setVideoDimming(parseFloat(e.target.value))}
              className="w-16 accent-[#00f2ff] cursor-pointer"
            />
          </div>

          <div className="hidden sm:block w-px h-3.5 bg-slate-700"></div>

          <div className="hidden sm:flex items-center space-x-1.5 text-slate-300">
            <Activity className="w-3.5 h-3.5 text-[#00f2ff]" />
            <span>FPS: <strong className="text-[#00f2ff]">{fps}</strong></span>
          </div>

          <div className="w-px h-3.5 bg-slate-700"></div>

          <div className="flex items-center space-x-1.5 text-slate-300">
            <span>Manos: <strong className={handsDetectedCount > 0 ? "text-emerald-400" : "text-amber-400"}>{handsDetectedCount}</strong></span>
          </div>
        </div>

        {/* Right Tools (Sound Test & Volume & Virtual Background) */}
        <div className="flex items-center space-x-2">
          {/* Virtual Stage / Background Selector Button (Meet & Zoom style) */}
          <button
            onClick={() => setIsBgModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0D2560] to-[#050508] hover:from-[#133280] hover:to-[#0a0a14] border border-[#00f2ff]/50 text-cyan-200 text-xs font-mono flex items-center space-x-1.5 transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] hover:scale-105 cursor-pointer"
            title="Cambiar fondo de pantalla y escenario musical (Estilo Zoom/Meet)"
          >
            <Image className="w-3.5 h-3.5 text-[#00f2ff]" />
            <span className="hidden sm:inline">Escenario:</span>
            <span className="font-bold text-[#00f2ff]">
              {backgroundSettings.mode === 'camera-raw'
                ? '📷 Real'
                : backgroundSettings.mode === 'blur'
                ? '🌫️ Blur'
                : backgroundSettings.mode === 'custom-image'
                ? '🖼️ Foto'
                : backgroundSettings.mode === 'rock-concert'
                ? '🎸 Rock'
                : backgroundSettings.mode === 'cosmic-space'
                ? '🌌 Espacio'
                : backgroundSettings.mode === 'rehearsal-room'
                ? '🎙️ Estudio'
                : backgroundSettings.mode === 'cyberpunk-city'
                ? '🌆 Neón'
                : '🏞️ Zen'}
            </span>
          </button>

          <button
            onClick={() => soundManager.testChord()}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 text-xs font-mono flex items-center space-x-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)]"
            title="Probar sonido ahora mismo"
          >
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Probar Audio 🎵</span>
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="btn-neon p-2.5 rounded-xl flex items-center justify-center"
            title={isMuted ? "Activar sonido" : "Silenciar"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#00f2ff]" />}
          </button>

          <button
            onClick={onOpenHelp}
            className="btn-neon p-2.5 rounded-xl flex items-center justify-center"
            title="Instrucciones interactivas"
          >
            <Info className="w-4 h-4 text-[#00f2ff]" />
          </button>
        </div>
      </header>

      {/* Prominent Audio Unlock Banner */}
      {audioState !== 'running' && (
        <div className="my-auto mx-auto pointer-events-auto">
          <button
            onClick={onUnlockAudio}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#00f2ff] via-[#EF3800] to-[#00f2ff] bg-[length:200%_auto] animate-[pulse_2s_infinite] text-slate-950 font-bold font-mono text-base md:text-lg flex items-center space-x-3 shadow-[0_0_40px_rgba(0,242,255,0.6)] hover:scale-105 transition-transform"
          >
            <Volume2 className="w-6 h-6 animate-bounce" />
            <span>🔊 HAZ CLIC AQUÍ PARA ACTIVAR EL SONIDO</span>
          </button>
          <p className="text-center text-xs font-mono text-cyan-300 mt-2 bg-black/60 px-3 py-1 rounded-full">
            (Los navegadores requieren 1 clic para permitir reproducir audio)
          </p>
        </div>
      )}

      {/* STAR WARS VERTICAL SCORE DISPLAYS (DISPUESTOS EN LOS BORDES LATERALES) */}
      {isImperialMode && audioState === 'running' && (
        <>
          {/* BORDE IZQUIERDO: 1ª FRASE (INTRO & RITMO IMPERIAL) */}
          <div className="fixed left-2 sm:left-4 top-24 bottom-24 z-20 pointer-events-none flex flex-col justify-center max-w-[125px] sm:max-w-[160px] animate-in fade-in slide-in-from-left duration-300">
            <div className="glass-panel-glow p-2 sm:p-2.5 rounded-2xl border-rose-500/40 shadow-[0_0_25px_rgba(239,56,0,0.25)] bg-[#050508]/90 backdrop-blur-md flex flex-col">
              {/* Header */}
              <div className="border-b border-rose-500/30 pb-1.5 mb-2 flex items-center space-x-1 text-rose-400 font-mono text-[11px] sm:text-xs font-bold">
                <Sword className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="truncate">1ª FRASE</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 ml-auto font-mono">G-min</span>
              </div>

              {/* Lista Vertical de Notas con feedback visual */}
              <div className="space-y-1 sm:space-y-1.5 font-mono text-[10px] sm:text-xs">
                {imperialPhrase1.map((step, idx) => {
                  const isCurrent = lastPlucked?.note.toLowerCase().includes(step.note.toLowerCase().slice(0, 3));
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between px-2 py-1 rounded transition-all duration-150 ${
                        isCurrent
                          ? 'bg-rose-600/50 border border-rose-400 text-white font-bold shadow-[0_0_12px_rgba(225,29,72,0.8)] scale-105'
                          : 'bg-black/50 border border-rose-500/20 text-slate-300'
                      }`}
                    >
                      <span className="text-slate-400 text-[9px] mr-1">{step.step}.</span>
                      <span className={`font-bold ${isCurrent ? 'text-white' : step.color}`}>
                        {step.name}
                      </span>
                      <span className="text-[9px] text-slate-400 ml-1">{step.rhythm}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 pt-1 border-t border-rose-500/20 text-[9px] text-slate-400 font-mono text-center">
                Ritmo: ♩♩♩ ♪♪♩
              </div>
            </div>
          </div>

          {/* BORDE DERECHO: 2ª FRASE (DESARROLLO & CLÍMAX) */}
          <div className="fixed right-2 sm:right-4 top-24 bottom-24 z-20 pointer-events-none flex flex-col justify-center max-w-[125px] sm:max-w-[160px] animate-in fade-in slide-in-from-right duration-300">
            <div className="glass-panel-glow p-2 sm:p-2.5 rounded-2xl border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.25)] bg-[#050508]/90 backdrop-blur-md flex flex-col">
              {/* Header */}
              <div className="border-b border-amber-500/30 pb-1.5 mb-2 flex items-center space-x-1 text-amber-400 font-mono text-[11px] sm:text-xs font-bold">
                <Sword className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">2ª FRASE</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 ml-auto font-mono">CLÍMAX</span>
              </div>

              {/* Lista Vertical de Notas con feedback visual */}
              <div className="space-y-1 sm:space-y-1.5 font-mono text-[10px] sm:text-xs">
                {imperialPhrase2.map((step, idx) => {
                  const isCurrent = lastPlucked?.note.toLowerCase().includes(step.note.toLowerCase().slice(0, 3));
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between px-2 py-0.5 sm:py-1 rounded transition-all duration-150 ${
                        isCurrent
                          ? 'bg-amber-500/50 border border-amber-300 text-white font-bold shadow-[0_0_12px_rgba(245,158,11,0.8)] scale-105'
                          : 'bg-black/50 border border-amber-500/20 text-slate-300'
                      }`}
                    >
                      <span className="text-slate-400 text-[9px] mr-1">{step.step}.</span>
                      <span className={`font-bold ${isCurrent ? 'text-white' : step.color}`}>
                        {step.name}
                      </span>
                      <span className="text-[9px] text-slate-400 ml-1">{step.rhythm}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-1.5 pt-1 border-t border-amber-500/20 text-[9px] text-slate-400 font-mono text-center">
                Clímax & Cierre
              </div>
            </div>
          </div>
        </>
      )}

      {/* Center Note / Drum Hit Display & Feedback */}
      {audioState === 'running' && (
        <div className="flex flex-col items-center justify-center my-auto pointer-events-none">
          {/* DRUM HIT FEEDBACK */}
          {playMode === 'air-drums' && lastDrumHit && (
            <div className="glass-panel-glow px-6 py-3 rounded-2xl flex items-center space-x-4 animate-bounce border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
              <div className="text-2xl md:text-3xl font-black text-amber-400 font-mono tracking-wider">
                🥁 {lastDrumHit.name.toUpperCase()}
              </div>
              <div className="text-left font-mono text-xs text-slate-300 border-l border-amber-500/40 pl-3">
                <div>Fuerza: <span className="text-emerald-400 font-bold">{Math.round(lastDrumHit.velocity * 100)}%</span></div>
                <div>Tu Tempo: <span className="text-amber-300 font-bold">{currentBpm ? `${currentBpm} BPM` : 'Marcando...'}</span></div>
              </div>
            </div>
          )}

          {/* THEREMIN REAL-TIME STROBOSCOPIC TUNER HUD */}
          {playMode === 'theremin' && thereminState?.isActive && (
            <div className="glass-panel-glow px-6 py-3 rounded-2xl flex items-center space-x-5 border-cyan-500/60 shadow-[0_0_35px_rgba(0,242,255,0.4)] animate-in fade-in duration-200">
              <div className="text-center font-mono">
                <div className="text-3xl md:text-4xl font-black text-white tracking-wider flex items-center justify-center space-x-2">
                  <span>{thereminState.closestNoteEs}</span>
                  <span className="text-cyan-400 text-xl font-medium">({thereminState.closestNote})</span>
                </div>
                <div className="text-xs text-slate-300 flex items-center justify-center space-x-2 mt-1">
                  <span className="text-cyan-300 font-bold">{Math.round(thereminState.frequency)} Hz</span>
                  <span>•</span>
                  <span className={Math.abs(thereminState.cents) < 12 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {thereminState.cents > 0 ? `+${thereminState.cents}¢` : `${thereminState.cents}¢`}
                  </span>
                  {Math.abs(thereminState.cents) < 10 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      AFINADO
                    </span>
                  )}
                </div>
              </div>

              <div className="border-l border-cyan-500/40 pl-4 font-mono text-xs text-slate-300 space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 text-[11px]">Volumen:</span>
                  <strong className="text-amber-400">{Math.round(thereminState.volume * 100)}%</strong>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 text-[11px]">Pitch:</span>
                  <div className="w-24 h-2 bg-black/60 rounded-full overflow-hidden border border-cyan-500/40">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-[#EF3800] transition-all duration-75"
                      style={{ width: `${thereminState.pitchRatio * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STRING PLUCK FEEDBACK */}
          {playMode !== 'air-drums' && playMode !== 'aac-communicator' && playMode !== 'theremin' && lastPlucked && (
            <div className={`glass-panel-glow px-6 py-3 rounded-2xl flex items-center space-x-4 animate-bounce ${
              timbre === 'distortion-guitar'
                ? 'border-[#EF3800]/70 shadow-[0_0_30px_rgba(239,56,0,0.5)] bg-black/80'
                : timbre === 'fuzz-guitar'
                ? 'border-amber-400/70 shadow-[0_0_30px_rgba(245,158,11,0.5)] bg-black/80'
                : ''
            }`}>
              <div
                className="text-3xl font-black font-mono tracking-wider"
                style={{
                  color:
                    timbre === 'distortion-guitar'
                      ? '#EF3800'
                      : timbre === 'fuzz-guitar'
                      ? '#f59e0b'
                      : '#00f2ff',
                }}
              >
                {lastPlucked.note}
              </div>
              <div className="text-left font-mono text-xs text-slate-300 border-l border-cyan-500/30 pl-3">
                <div className="flex items-center space-x-1.5">
                  {timbre === 'distortion-guitar' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#EF3800]/30 text-[#EF3800] font-bold border border-[#EF3800]/40 flex items-center space-x-1">
                      <Flame className="w-3 h-3" />
                      <span>DISTORSIÓN</span>
                    </span>
                  )}
                  {timbre === 'fuzz-guitar' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40 flex items-center space-x-1">
                      <Zap className="w-3 h-3" />
                      <span>FUZZ</span>
                    </span>
                  )}
                  <div>Frecuencia: <span className="text-emerald-400 font-bold">{Math.round(lastPlucked.freq)} Hz</span></div>
                </div>
                <div>Longitud de cuerda: <span className="text-amber-400 font-bold">{Math.round(lastPlucked.length)} px</span></div>
              </div>
            </div>
          )}

          {hoverInfo && (
            <div className="mt-4 px-5 py-2 rounded-full bg-[#050508]/90 border border-[#00f2ff] text-xs font-mono text-[#00f2ff] shadow-[0_0_20px_rgba(0,242,255,0.4)] flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#00f2ff] animate-ping"></span>
              <span>{hoverInfo}</span>
            </div>
          )}
        </div>
      )}

      {/* Bottom Control Dock */}
      {playMode === 'aac-communicator' ? (
        <footer className="w-full flex items-center justify-between gap-3 pointer-events-auto z-40 px-2 sm:px-6">
          <div className="glass-panel px-4 py-2 rounded-xl flex items-center space-x-2.5 text-xs font-mono text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold text-white tracking-wide">MODO VOZ AÉREA (AAC) ACTIVO</span>
            <span className="text-slate-400 hidden md:inline">| Apunta con tu dedo a tarjetas o categorías</span>
          </div>

          <button
            onClick={() => setPlayMode('laser-harp')}
            className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/50 text-cyan-200 text-xs font-mono font-bold flex items-center space-x-2 transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] hover:scale-105 cursor-pointer"
          >
            <Guitar className="w-4 h-4 text-cyan-300" />
            <span>Volver a Instrumentos 🎵</span>
          </button>
        </footer>
      ) : (
        <footer className="w-full flex flex-col md:flex-row items-center justify-between gap-3 pointer-events-auto">
          {/* Mode Selector */}
          <div className="glass-panel p-1.5 rounded-2xl flex items-center space-x-1 w-full md:w-auto justify-center overflow-x-auto">
            {/* NON-VERBAL AAC COMMUNICATOR BUTTON */}
            <button
              onClick={() => setPlayMode('aac-communicator')}
              className="px-3 py-2 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition-all text-emerald-400 hover:text-white hover:bg-emerald-950/40 border border-emerald-500/30"
              title="Módulo Accesible para personas no verbales que solo pueden mover las manos"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>🗣️ VOZ AÉREA (AAC)</span>
            </button>

            {/* ROCK DISTORTION PRESET BUTTON */}
            {onLoadRockPreset && (
              <button
                onClick={onLoadRockPreset}
                className={`px-3 py-2 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition-all ${
                  timbre === 'distortion-guitar'
                    ? 'bg-[#EF3800] text-white font-bold shadow-[0_0_20px_rgba(239,56,0,0.8)] border border-orange-400 animate-pulse'
                    : 'text-[#EF3800] hover:text-white hover:bg-orange-950/40 border border-[#EF3800]/30'
                }`}
                title="Guitarra Heavy Rock con Distorsión (Drop D)"
              >
                <Flame className="w-4 h-4 text-[#EF3800]" />
                <span>🎸 DISTORSIÓN</span>
              </button>
            )}

            {/* FUZZ HEAVY PRESET BUTTON */}
            {onLoadFuzzPreset && (
              <button
                onClick={onLoadFuzzPreset}
                className={`px-3 py-2 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition-all ${
                  timbre === 'fuzz-guitar'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-[0_0_20px_rgba(245,158,11,0.8)] border border-amber-300 animate-pulse'
                    : 'text-amber-400 hover:text-white hover:bg-amber-950/40 border border-amber-500/30'
                }`}
                title="Guitarra Fuzz Pesado Vintage (Big Muff)"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>⚡ FUZZ</span>
              </button>
            )}

            {/* STAR WARS PRESET BUTTON */}
            <button
              onClick={onLoadImperialMarchPreset}
              className={`px-3 py-2 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition-all ${
                isImperialMode
                  ? 'bg-rose-600 text-white font-bold shadow-[0_0_20px_rgba(225,29,72,0.8)] border border-rose-400 animate-pulse'
                  : 'text-rose-400 hover:text-white hover:bg-rose-950/40 border border-rose-500/30'
              }`}
            >
              <Sword className="w-3.5 h-3.5" />
              <span>⚔️ MARCHA</span>
            </button>

            {/* GUITAR CLEAN / STRINGS BUTTON */}
            <button
              onClick={onLoadGuitarPreset}
              className={`px-3 py-2 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition-all ${
                playMode === 'laser-harp' && timbre === 'acoustic-guitar' && !isImperialMode
                  ? 'bg-[#00f2ff] text-slate-950 font-bold shadow-[0_0_15px_rgba(0,242,255,0.6)]'
                  : 'text-cyan-300 hover:text-white hover:bg-white/5'
              }`}
              title="Guitarra Acústica Limpia (E-A-D-G-B-E)"
            >
              <Guitar className="w-3.5 h-3.5" />
              <span>🎸 Cuerdas</span>
            </button>

            <button
              onClick={() => setPlayMode('draw-strings')}
              className={`px-3 py-2 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition-all ${
                playMode === 'draw-strings' && !isImperialMode
                  ? 'bg-[#00f2ff] text-slate-950 font-bold shadow-[0_0_15px_rgba(0,242,255,0.5)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Dibujar</span>
            </button>

            <button
              onClick={() => setPlayMode('elastic-two-hands')}
              className={`px-3 py-2 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition-all ${
                playMode === 'elastic-two-hands' && !isImperialMode
                  ? 'bg-[#00f2ff] text-slate-950 font-bold shadow-[0_0_15px_rgba(0,242,255,0.5)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>2-Manos</span>
            </button>

            <button
              onClick={() => {
                setPlayMode('laser-harp');
                onLoadHarpPreset();
              }}
              className={`px-3 py-2 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition-all ${
                playMode === 'laser-harp' && !isImperialMode
                  ? 'bg-[#00f2ff] text-slate-950 font-bold shadow-[0_0_15px_rgba(0,242,255,0.5)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Arpa</span>
            </button>

            {/* THEREMIN AR BUTTON */}
            <button
              onClick={() => setPlayMode('theremin')}
              className={`px-3 py-2 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition-all cursor-pointer ${
                playMode === 'theremin'
                  ? 'bg-[#00f2ff] text-slate-950 font-bold shadow-[0_0_20px_rgba(0,242,255,0.8)] border border-cyan-300 animate-pulse'
                  : 'text-[#00f2ff] hover:text-white hover:bg-cyan-950/40 border border-cyan-500/30'
              }`}
              title="Theremin Clásico Sin Contacto (Léon Theremin 1920)"
            >
              <RadioTower className="w-3.5 h-3.5" />
              <span>🛸 THEREMIN</span>
            </button>
          </div>

          {/* Timbre & Presets Panel (Shown only in strings & theremin modes) */}
          {playMode === 'theremin' ? (
            <div className="glass-panel px-3 py-2 rounded-2xl flex items-center space-x-3 w-full md:w-auto justify-center overflow-x-auto">
              <div className="flex items-center space-x-1.5 border-r border-slate-700/60 pr-3">
                <RadioTower className="w-3.5 h-3.5 text-[#00f2ff]" />
                <span className="text-[11px] text-cyan-300 font-mono">Timbre:</span>
                <select
                  value={thereminTimbre || 'vintage-tube'}
                  onChange={(e) => setThereminTimbre?.(e.target.value as ThereminTimbre)}
                  className="bg-[#050508] border border-cyan-500/30 text-xs font-mono text-cyan-300 rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-[#00f2ff]"
                >
                  <option value="vintage-tube">📻 Vintage Tube (Moog)</option>
                  <option value="classic-sine">✨ Classic Sine (1920)</option>
                  <option value="cosmic-scifi">🛸 Cosmic Sci-Fi (Alien Delay)</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <Waves className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] text-amber-300 font-mono">Escala:</span>
                <select
                  value={thereminScale || 'continuous'}
                  onChange={(e) => setThereminScale?.(e.target.value as ThereminScale)}
                  className="bg-[#050508] border border-amber-500/30 text-xs font-mono text-amber-300 rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-amber-400"
                >
                  <option value="continuous">〰️ Glissando Libre (Puro)</option>
                  <option value="chromatic">🎹 Cromático (12 Semitonos)</option>
                  <option value="pentatonic">🎶 Pentatónica Menor</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="glass-panel px-3 py-2 rounded-2xl flex items-center space-x-2.5 w-full md:w-auto justify-center overflow-x-auto">
            <div className="flex items-center space-x-1.5 border-r border-slate-700/60 pr-2.5">
              <Sliders className="w-3.5 h-3.5 text-[#00f2ff]" />
              <select
                value={timbre}
                onChange={(e) => setTimbre(e.target.value as InstrumentTimbre)}
                className="bg-[#050508] border border-cyan-500/30 text-xs font-mono text-cyan-300 rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-[#00f2ff]"
              >
                <option value="distortion-guitar">🎸 Guitarra con Distorsión (High-Gain)</option>
                <option value="fuzz-guitar">⚡ Guitarra con Fuzz (Big Muff)</option>
                <option value="acoustic-guitar">Guitarra Acústica (Karplus)</option>
                <option value="electric-lead">Sintetizador Eléctrico (Sith)</option>
                <option value="crystal-harp">Arpa de Cristal</option>
                <option value="deep-bass">Bajo Profundo (Imperial)</option>
              </select>
            </div>

            <div className="flex items-center space-x-1.5">
              {onLoadRockPreset && (
                <button
                  onClick={onLoadRockPreset}
                  className="px-2 py-1 text-xs font-mono rounded-lg bg-[#EF3800]/25 hover:bg-[#EF3800]/40 border border-[#EF3800]/40 text-orange-200 flex items-center space-x-1 transition-all"
                  title="Cargar 6 cuerdas Drop D con Distorsión"
                >
                  <Flame className="w-3 h-3 text-[#EF3800]" />
                  <span>Rock</span>
                </button>
              )}
              {onLoadFuzzPreset && (
                <button
                  onClick={onLoadFuzzPreset}
                  className="px-2 py-1 text-xs font-mono rounded-lg bg-amber-500/25 hover:bg-amber-500/40 border border-amber-500/40 text-amber-200 flex items-center space-x-1 transition-all"
                  title="Cargar afinación Fuzz Pesado"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Fuzz</span>
                </button>
              )}
              <button
                onClick={onLoadGuitarPreset}
                className="px-2 py-1 text-xs font-mono rounded-lg bg-[#0D2560]/50 hover:bg-[#0D2560] border border-cyan-500/30 text-cyan-200 flex items-center space-x-1 transition-all"
                title="Cargar 6 cuerdas de afinación de guitarra (E-A-D-G-B-E)"
              >
                <Layers className="w-3 h-3 text-[#00f2ff]" />
                <span>Limpia</span>
              </button>
              <button
                onClick={onLoadHarpPreset}
                className="px-2 py-1 text-xs font-mono rounded-lg bg-[#0D2560]/50 hover:bg-[#0D2560] border border-cyan-500/30 text-cyan-200 flex items-center space-x-1 transition-all"
                title="Cargar Arpa Pentatónica"
              >
                <Music className="w-3 h-3 text-[#00f2ff]" />
                <span>Arpa</span>
              </button>
              <button
                onClick={onClearStrings}
                className="px-2 py-1 text-xs font-mono rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 flex items-center space-x-1 transition-all"
                title="Limpiar todas las cuerdas"
              >
                <RotateCcw className="w-3 h-3 text-rose-400" />
                <span>Limpiar {stringsCount > 0 ? `(${stringsCount})` : ''}</span>
              </button>
            </div>
          </div>
          )}
      </footer>
      )}

      {/* VIRTUAL STAGE & BACKGROUND SELECTOR MODAL (ZOOM & MEET STYLE) */}
      {isBgModalOpen && (
        <div className="fixed inset-0 z-50 pointer-events-auto bg-[#050508]/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5">
          <div className="glass-panel-glow max-w-2xl w-full rounded-3xl p-5 sm:p-6 border border-cyan-500/40 shadow-[0_0_50px_rgba(0,242,255,0.25)] flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#0D2560] border border-cyan-400/50 flex items-center justify-center text-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.4)]">
                  <Image className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold font-mono text-white tracking-wider flex items-center space-x-2">
                    <span>FONDOS & ESCENARIOS VIRTUALES</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">MEET / ZOOM</span>
                  </h2>
                  <p className="text-xs font-mono text-cyan-300/80">
                    Modifica el entorno visual de tu concierto, ensayo o sesión musical
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsBgModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Custom Image Upload Banner (visible if custom-image is selected or user wants to upload) */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              backgroundSettings.mode === 'custom-image'
                ? 'bg-[#0D2560]/40 border-cyan-400 shadow-[0_0_25px_rgba(0,242,255,0.2)]'
                : 'bg-black/30 border-white/10'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  {backgroundSettings.customImageUrl ? (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-cyan-400/50 shrink-0 bg-black">
                      <img
                        src={backgroundSettings.customImageUrl}
                        alt="Custom Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl border border-dashed border-cyan-400/40 flex items-center justify-center shrink-0 bg-cyan-950/20 text-cyan-400">
                      <FolderOpen className="w-6 h-6" />
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-bold font-mono text-white flex items-center space-x-2">
                      <span>Tu Imagen de Escenario</span>
                      {backgroundSettings.customImageUrl && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Cargada
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                      {backgroundSettings.customImageUrl
                        ? 'Imagen activa lista para tu interpretación musical'
                        : 'Sube un JPG, PNG o WebP desde tu celular, tablet o computador'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <label className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,242,255,0.4)] transition-all hover:scale-105">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{backgroundSettings.customImageUrl ? 'Cambiar Foto' : 'Subir Imagen'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const result = event.target?.result as string;
                            if (result) {
                              setBackgroundSettings((prev) => ({
                                ...prev,
                                mode: 'custom-image',
                                customImageUrl: result,
                              }));
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  {backgroundSettings.customImageUrl && (
                    <button
                      onClick={() =>
                        setBackgroundSettings((prev) => ({
                          ...prev,
                          mode: prev.mode === 'custom-image' ? 'rock-concert' : prev.mode,
                          customImageUrl: null,
                        }))
                      }
                      className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 cursor-pointer transition-all"
                      title="Eliminar imagen personalizada"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Stages Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {BACKGROUND_OPTIONS.map((opt) => {
                const isSelected = backgroundSettings.mode === opt.mode;
                return (
                  <button
                    key={opt.mode}
                    onClick={() => setBackgroundSettings((prev) => ({ ...prev, mode: opt.mode }))}
                    className={`relative p-3.5 rounded-2xl border text-left font-mono transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-500/15 border-[#00f2ff] shadow-[0_0_20px_rgba(0,242,255,0.4)] scale-[1.01]'
                        : 'bg-[#050508]/70 hover:bg-[#0D2560]/30 border-white/10 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-2xl">{opt.emoji}</span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00f2ff] text-slate-950 flex items-center space-x-1">
                          <Check className="w-3 h-3" />
                          <span>ACTIVO</span>
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{opt.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Settings Sliders */}
            <div className="border-t border-cyan-500/20 pt-3 flex flex-col gap-2.5 font-mono text-xs">
              {/* Performer Presence Slider */}
              {backgroundSettings.mode !== 'camera-raw' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-black/50 p-2.5 rounded-xl border border-white/5">
                  <div className="flex items-center space-x-2">
                    <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-white font-bold">Presencia del Músico en el Escenario:</span>
                      <span className="text-cyan-300 ml-1.5 font-bold">
                        {Math.round(backgroundSettings.userPresence * 100)}%
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={backgroundSettings.userPresence}
                    onChange={(e) =>
                      setBackgroundSettings((prev) => ({
                        ...prev,
                        userPresence: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full sm:w-44 accent-[#00f2ff] cursor-pointer"
                  />
                </div>
              )}

              {/* Blur Intensity Slider (Only in blur mode) */}
              {backgroundSettings.mode === 'blur' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-black/50 p-2.5 rounded-xl border border-white/5">
                  <div>
                    <span className="text-white font-bold">Intensidad de Desenfoque (Bokeh):</span>
                    <span className="text-cyan-300 ml-1.5 font-bold">{backgroundSettings.blurAmount}px</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="30"
                    step="2"
                    value={backgroundSettings.blurAmount}
                    onChange={(e) =>
                      setBackgroundSettings((prev) => ({
                        ...prev,
                        blurAmount: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full sm:w-44 accent-amber-400 cursor-pointer"
                  />
                </div>
              )}

              {/* Reactive Lighting Toggle */}
              {backgroundSettings.mode !== 'camera-raw' && backgroundSettings.mode !== 'blur' && (
                <div className="flex items-center justify-between bg-black/50 p-2.5 rounded-xl border border-white/5">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-white font-bold">Luces Reactivas a las Notas:</span>
                      <p className="text-[10px] text-slate-400">
                        Los focos de concierto, estrellas y vúmetros bailan al tocar
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setBackgroundSettings((prev) => ({
                        ...prev,
                        reactiveLighting: !prev.reactiveLighting,
                      }))
                    }
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      backgroundSettings.reactiveLighting
                        ? 'bg-emerald-400 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {backgroundSettings.reactiveLighting ? 'ACTIVADO' : 'DESACTIVADO'}
                  </button>
                </div>
              )}
            </div>

            {/* Footer Done Button */}
            <div className="flex justify-end pt-1">
              <button
                onClick={() => setIsBgModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-xs shadow-[0_0_20px_rgba(0,242,255,0.5)] cursor-pointer"
              >
                Listo / Volver a Tocar 🎵
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
