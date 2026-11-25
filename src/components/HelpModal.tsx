import React from 'react';
import { X, Hand, Music, Zap, Sparkles } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="glass-panel-glow max-w-xl w-full rounded-2xl p-6 relative border border-[#00f2ff]/40 shadow-[0_0_50px_rgba(0,242,255,0.25)] text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#0D2560] border border-[#00f2ff]/40 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#00f2ff]" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-mono tracking-wide text-white">
              ¿Cómo funciona AeroStrings AR?
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Tu cámara lee tus manos y sintetiza cuerdas acústicas en el aire.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4 text-sm font-sans">
          {/* Step 1 */}
          <div className="flex items-start space-x-3 p-3 rounded-xl bg-[#050508]/60 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-[#00f2ff]/20 text-[#00f2ff] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Hand className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white font-mono flex items-center space-x-2">
                <span>1. Dibujar una cuerda (Pellizco)</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Junta las yemas de tu <strong>pulgar e índice</strong> (gesto de pinza). Verás un retículo neón. Arrastra la mano por el aire para fijar el largo deseado y suelta el pellizco para crear la cuerda flotante.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start space-x-3 p-3 rounded-xl bg-[#050508]/60 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-[#EF3800]/20 text-[#EF3800] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white font-mono flex items-center space-x-2">
                <span>2. Rasguear o Puntear (Pluck)</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Extiende tu dedo índice (actúa como una <strong>púa de guitarra</strong> con un halo rojo). Roza o atraviesa cualquier cuerda en pantalla para hacerla vibrar y emitir el sonido acústico.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start space-x-3 p-3 rounded-xl bg-[#050508]/60 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white font-mono flex items-center space-x-2">
                <span>3. Física de Longitud y Tono</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Igual que una cuerda real: <strong>Línea larga = Tono Grave</strong> (bajos potentes) | <strong>Línea corta = Tono Agudo</strong> (solos brillantes).
              </p>
            </div>
          </div>
        </div>

        {/* Footer Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="btn-neon px-5 py-2.5 rounded-xl font-mono text-xs font-bold tracking-wide w-full"
          >
            ¡ENTENDIDO, A TOCAR!
          </button>
        </div>
      </div>
    </div>
  );
};
