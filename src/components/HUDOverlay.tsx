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
  Music 
} from 'lucide-react';

interface HUDOverlayProps {
  playMode: PlayMode;
  setPlayMode: (mode: PlayMode) => void;
  timbre: InstrumentTimbre;
  setTimbre: (timbre: InstrumentTimbre) => void;
  stringsCount: number;
  onClearStrings: () => void;
  onLoadHarpPreset: () => void;
  onLoadGuitarPreset: () => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  lastPlucked: { note: string; freq: number; length: number } | null;
  hoverInfo: string | null;
  handsDetectedCount: number;
  fps: number;
  onOpenHelp: () => void;
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
  isMuted,
  setIsMuted,
  lastPlucked,
  hoverInfo,
  handsDetectedCount,
  fps,
  onOpenHelp,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 md:p-6">
      {/* Top Bar */}
      <header className="flex items-center justify-between w-full pointer-events-auto">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0D2560] to-[#050508] border border-[#00f2ff]/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.3)]">
            <Guitar className="w-5 h-5 text-[#00f2ff]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg md:text-xl font-bold tracking-wider text-slate-100 font-mono">
                AERO<span className="text-[#00f2ff]">STRINGS</span> <span className="text-xs px-1.5 py-0.5 rounded bg-[#EF3800]/20 text-[#EF3800] border border-[#EF3800]/40">AR</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-mono flex items-center space-x-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Cuerdas Aéreas & Síntesis Karplus-Strong</span>
            </p>
          </div>
        </div>

        {/* Center / Status Telemetry */}
        <div className="hidden md:flex items-center space-x-4 glass-panel px-4 py-2 rounded-xl text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Activity className="w-3.5 h-3.5 text-[#00f2ff]" />
            <span>FPS: <strong className="text-[#00f2ff]">{fps}</strong></span>
          </div>
          <div className="w-px h-3.5 bg-slate-700"></div>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <span>Manos: <strong className={handsDetectedCount > 0 ? "text-emerald-400" : "text-amber-400"}>{handsDetectedCount}</strong></span>
          </div>
          <div className="w-px h-3.5 bg-slate-700"></div>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <span>Cuerdas: <strong className="text-[#00f2ff]">{stringsCount}</strong></span>
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center space-x-2">
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
            title="Cómo usar la aplicación"
          >
            <Info className="w-4 h-4 text-[#00f2ff]" />
          </button>
        </div>
      </header>

      {/* Center Note Display (When plucked or dragging) */}
      <div className="flex flex-col items-center justify-center my-auto pointer-events-none">
        {lastPlucked && (
          <div className="glass-panel-glow px-6 py-3 rounded-2xl flex items-center space-x-4 animate-bounce">
            <div className="text-3xl font-black text-[#00f2ff] font-mono tracking-wider">
              {lastPlucked.note}
            </div>
            <div className="text-left font-mono text-xs text-slate-300 border-l border-cyan-500/30 pl-3">
              <div>Frecuencia: <span className="text-emerald-400 font-bold">{Math.round(lastPlucked.freq)} Hz</span></div>
              <div>Longitud: <span className="text-amber-400 font-bold">{Math.round(lastPlucked.length)} px</span></div>
            </div>
          </div>
        )}

        {hoverInfo && (
          <div className="mt-4 px-4 py-1.5 rounded-full bg-[#050508]/80 border border-[#00f2ff]/40 text-xs font-mono text-[#00f2ff] shadow-[0_0_12px_rgba(0,242,255,0.3)]">
            {hoverInfo}
          </div>
        )}
      </div>

      {/* Bottom Control Dock */}
      <footer className="w-full flex flex-col md:flex-row items-center justify-between gap-4 pointer-events-auto">
        {/* Mode Selector */}
        <div className="glass-panel p-1.5 rounded-2xl flex items-center space-x-1 w-full md:w-auto justify-center">
          <button
            onClick={() => setPlayMode('draw-strings')}
            className={`px-3 py-2 rounded-xl text-xs font-mono flex items-center space-x-2 transition-all ${
              playMode === 'draw-strings'
                ? 'bg-[#00f2ff] text-slate-950 font-bold shadow-[0_0_15px_rgba(0,242,255,0.5)]'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dibujar Cuerdas</span>
          </button>

          <button
            onClick={() => setPlayMode('elastic-two-hands')}
            className={`px-3 py-2 rounded-xl text-xs font-mono flex items-center space-x-2 transition-all ${
              playMode === 'elastic-two-hands'
                ? 'bg-[#00f2ff] text-slate-950 font-bold shadow-[0_0_15px_rgba(0,242,255,0.5)]'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Cuerda Elástica 2-Manos</span>
          </button>

          <button
            onClick={() => {
              setPlayMode('laser-harp');
              onLoadHarpPreset();
            }}
            className={`px-3 py-2 rounded-xl text-xs font-mono flex items-center space-x-2 transition-all ${
              playMode === 'laser-harp'
                ? 'bg-[#00f2ff] text-slate-950 font-bold shadow-[0_0_15px_rgba(0,242,255,0.5)]'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Arpa Láser</span>
          </button>
        </div>

        {/* Timbre & Presets Panel */}
        <div className="glass-panel px-3 py-2 rounded-2xl flex items-center space-x-3 w-full md:w-auto justify-center overflow-x-auto">
          {/* Instrument Selector */}
          <div className="flex items-center space-x-1.5 border-r border-slate-700/60 pr-3">
            <Sliders className="w-3.5 h-3.5 text-[#00f2ff]" />
            <select
              value={timbre}
              onChange={(e) => setTimbre(e.target.value as InstrumentTimbre)}
              className="bg-[#050508] border border-cyan-500/30 text-xs font-mono text-cyan-300 rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-[#00f2ff]"
            >
              <option value="acoustic-guitar">Guitarra Acústica (Karplus)</option>
              <option value="electric-lead">Sintetizador Eléctrico</option>
              <option value="crystal-harp">Arpa de Cristal</option>
              <option value="deep-bass">Bajo Profundo</option>
            </select>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={onLoadGuitarPreset}
              className="px-2.5 py-1 text-xs font-mono rounded-lg bg-[#0D2560]/50 hover:bg-[#0D2560] border border-cyan-500/30 text-cyan-200 flex items-center space-x-1 transition-all"
              title="Cargar 6 cuerdas de afinación de guitarra (E-A-D-G-B-E)"
            >
              <Layers className="w-3 h-3 text-[#00f2ff]" />
              <span>Guitarra (6)</span>
            </button>
            <button
              onClick={onLoadHarpPreset}
              className="px-2.5 py-1 text-xs font-mono rounded-lg bg-[#0D2560]/50 hover:bg-[#0D2560] border border-cyan-500/30 text-cyan-200 flex items-center space-x-1 transition-all"
              title="Cargar Arpa Pentatónica de 7 cuerdas"
            >
              <Music className="w-3 h-3 text-[#00f2ff]" />
              <span>Arpa (7)</span>
            </button>
            <button
              onClick={onClearStrings}
              className="px-2.5 py-1 text-xs font-mono rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 flex items-center space-x-1 transition-all"
              title="Limpiar todas las cuerdas"
            >
              <RotateCcw className="w-3 h-3 text-rose-400" />
              <span>Limpiar</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
