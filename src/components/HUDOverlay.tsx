import React from 'react';
import { PlayMode, InstrumentTimbre } from '../types';
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
  MessageSquare
} from 'lucide-react';
import { soundManager } from '../audio/AudioEngine';

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
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 md:p-6">
      {/* Top Bar */}
      <header className="flex flex-wrap items-center justify-between w-full pointer-events-auto gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0D2560] to-[#050508] border border-[#00f2ff]/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.3)]">
            {isImperialMode ? (
              <Sword className="w-5 h-5 text-rose-500 animate-pulse" />
            ) : playMode === 'air-drums' ? (
              <Disc3 className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            ) : (
              <Guitar className="w-5 h-5 text-[#00f2ff]" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base md:text-xl font-bold tracking-wider text-slate-100 font-mono">
                {isImperialMode ? (
                  <>IMPERIAL<span className="text-rose-500">CHORD</span> <span className="text-xs px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">SITH</span></>
                ) : playMode === 'air-drums' ? (
                  <>AIR<span className="text-amber-400">DRUMS</span> <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">KIT</span></>
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
                  : playMode === 'air-drums' 
                  ? 'Batería Completa en el Aire (Baquetas Virtuales)' 
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

        {/* Right Tools (Sound Test & Volume) */}
        <div className="flex items-center space-x-2">
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

      {/* Center Note / Drum Hit Display & Interactive Tablatura */}
      {audioState === 'running' && (
        <div className="flex flex-col items-center justify-center my-auto pointer-events-none">
          {/* STAR WARS INTERACTIVE GUIDE HUD */}
          {isImperialMode && (
            <div className="mb-4 glass-panel-glow px-6 py-3 rounded-2xl border-rose-500/50 shadow-[0_0_30px_rgba(239,56,0,0.35)] text-center max-w-xl">
              <div className="text-rose-400 font-bold text-sm mb-1.5 flex items-center justify-center space-x-2 font-mono">
                <Sword className="w-4 h-4 text-rose-500" />
                <span>PARTITURA AÉREA: MARCHA IMPERIAL (STAR WARS)</span>
              </div>
              <div className="text-xs font-mono space-y-1">
                <div className="bg-rose-950/40 px-3 py-1 rounded border border-rose-500/30">
                  <span className="text-rose-300 font-bold">1ª Frase: </span>
                  <span className="text-white tracking-widest">[Sol] [Sol] [Sol] — [Mib] [Sib] [Sol]</span>
                </div>
                <div className="bg-amber-950/30 px-3 py-1 rounded border border-amber-500/30">
                  <span className="text-amber-300 font-bold">2ª Frase: </span>
                  <span className="text-white tracking-widest">[Re] [Re] [Re] — [Mib4] [Sib] [Fa#] • [Mib] [Sib] [Sol]</span>
                </div>
              </div>
            </div>
          )}

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

          {/* STRING PLUCK FEEDBACK */}
          {playMode !== 'air-drums' && playMode !== 'aac-communicator' && lastPlucked && (
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
      <footer className="w-full flex flex-col md:flex-row items-center justify-between gap-3 pointer-events-auto">
        {/* Mode Selector */}
        <div className="glass-panel p-1.5 rounded-2xl flex items-center space-x-1 w-full md:w-auto justify-center overflow-x-auto">
          {/* NON-VERBAL AAC COMMUNICATOR BUTTON */}
          <button
            onClick={() => setPlayMode('aac-communicator')}
            className={`px-3 py-2 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition-all ${
              playMode === 'aac-communicator'
                ? 'bg-emerald-400 text-slate-950 font-bold shadow-[0_0_20px_rgba(16,185,129,0.8)] border border-emerald-300 animate-pulse'
                : 'text-emerald-400 hover:text-white hover:bg-emerald-950/40 border border-emerald-500/30'
            }`}
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

          {/* AIR DRUMS BUTTON */}
          <button
            onClick={() => setPlayMode('air-drums')}
            className={`px-3 py-2 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition-all ${
              playMode === 'air-drums' && !isImperialMode
                ? 'bg-amber-400 text-slate-950 font-bold shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse'
                : 'text-amber-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Disc3 className="w-3.5 h-3.5" />
            <span>🥁 Batería</span>
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
        </div>

        {/* Timbre & Presets Panel (Shown only in strings modes) */}
        {playMode === 'aac-communicator' ? (
          <div className="glass-panel px-4 py-2 rounded-2xl flex items-center space-x-2 text-xs font-mono text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Apunta con el dedo 0.6s sobre cualquier tarjeta para hablar en voz alta</span>
          </div>
        ) : playMode !== 'air-drums' ? (
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
        ) : (
          <div className="glass-panel px-4 py-2 rounded-2xl flex items-center space-x-2 text-xs font-mono text-amber-200/90">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>Mueve tus manos como baquetas o presiona las teclas [K, S, H, C, R, T, F]</span>
          </div>
        )}
      </footer>
    </div>
  );
};
