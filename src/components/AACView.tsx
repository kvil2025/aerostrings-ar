import React, { useState, useEffect, useRef } from 'react';
import { AACCard, AACCategories, HandData } from '../types';
import { aacManager, SpokenHistoryEntry } from '../aac/AACManager';
import { Volume2, Heart, ShieldAlert, Sparkles, Check, HelpCircle } from 'lucide-react';

interface AACViewProps {
  hands: HandData[];
  onTriggerCard?: (card: AACCard) => void;
}

export const AACView: React.FC<AACViewProps> = ({ hands, onTriggerCard }) => {
  const [selectedCategory, setSelectedCategory] = useState<AACCategories>('quick-answers');
  const [currentPrompt, setCurrentPrompt] = useState<string>('¿Cómo te sientes en este momento?');
  const [lastSpoken, setLastSpoken] = useState<SpokenHistoryEntry | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState<number>(0);
  const [activeFlashes, setActiveFlashes] = useState<{ [cardId: string]: number }>({});

  const hoverStartRef = useRef<{ cardId: string; time: number } | null>(null);
  const lastTriggeredCardRef = useRef<{ cardId: string; time: number } | null>(null);
  const cardElementsRef = useRef<{ [cardId: string]: HTMLDivElement | null }>({});

  const cards = aacManager.getCards(selectedCategory);

  const caregiverQuestions = [
    '¿Cómo te sientes en este momento?',
    '¿Tienes hambre o sed?',
    '¿Sientes algún dolor o molestia?',
    '¿Quieres descansar o cambiar de posición?',
    '¿Estás de acuerdo con esto?',
  ];

  // Subscribe to speech history
  useEffect(() => {
    aacManager.onSpeech((entry) => {
      setLastSpoken(entry);
    });
  }, []);

  // Hand pointer collision & dwell detection
  useEffect(() => {
    const now = performance.now();
    const DWELL_TIME_MS = 650; // Time needed to dwell-select a card

    // Check if any pointer is over any card
    let detectedHoverId: string | null = null;

    if (hands.length > 0) {
      for (const hand of hands) {
        const { indexTip } = hand;
        for (const card of cards) {
          const el = cardElementsRef.current[card.id];
          if (el) {
            const rect = el.getBoundingClientRect();
            // Test if index tip is inside card rect with padding
            if (
              indexTip.x >= rect.left - 10 &&
              indexTip.x <= rect.right + 10 &&
              indexTip.y >= rect.top - 10 &&
              indexTip.y <= rect.bottom + 10
            ) {
              detectedHoverId = card.id;
              break;
            }
          }
        }
        if (detectedHoverId) break;
      }
    }

    if (detectedHoverId) {
      setHoveredCardId(detectedHoverId);

      // Check lock-out cooldown (prevent continuous re-triggering while hand stays)
      if (
        lastTriggeredCardRef.current &&
        lastTriggeredCardRef.current.cardId === detectedHoverId &&
        now - lastTriggeredCardRef.current.time < 2200
      ) {
        setDwellProgress(1.0);
        return;
      }

      if (!hoverStartRef.current || hoverStartRef.current.cardId !== detectedHoverId) {
        hoverStartRef.current = { cardId: detectedHoverId, time: now };
        setDwellProgress(0);
      } else {
        const elapsed = now - hoverStartRef.current.time;
        const progress = Math.min(1.0, elapsed / DWELL_TIME_MS);
        setDwellProgress(progress);

        if (progress >= 1.0) {
          // Trigger card speech!
          const targetCard = cards.find((c) => c.id === detectedHoverId);
          if (targetCard) {
            handleCardSelect(targetCard);
            lastTriggeredCardRef.current = { cardId: detectedHoverId, time: now };
          }
        }
      }
    } else {
      setHoveredCardId(null);
      setDwellProgress(0);
      hoverStartRef.current = null;
      // Clear lockout if hand leaves
      if (lastTriggeredCardRef.current && now - lastTriggeredCardRef.current.time > 800) {
        lastTriggeredCardRef.current = null;
      }
    }
  }, [hands, cards]);

  const handleCardSelect = (card: AACCard) => {
    // Speak card in natural Spanish audio
    const entry = aacManager.speakCard(card);
    setLastSpoken(entry);
    onTriggerCard?.(card);

    // Visual trigger animation
    setActiveFlashes((prev) => ({ ...prev, [card.id]: performance.now() }));
    setTimeout(() => {
      setActiveFlashes((prev) => {
        const next = { ...prev };
        delete next[card.id];
        return next;
      });
    }, 800);
  };

  return (
    <div className="absolute inset-0 pointer-events-auto flex flex-col justify-between p-4 md:p-6 z-20">
      {/* Top Banner: Caregiver Question + Large Spoken Text Display */}
      <div className="w-full flex flex-col items-center gap-3 max-w-4xl mx-auto">
        {/* Caregiver Prompt Bar */}
        <div className="w-full glass-panel-glow px-5 py-2.5 rounded-2xl flex items-center justify-between border border-cyan-500/40 shadow-[0_0_25px_rgba(0,242,255,0.2)]">
          <div className="flex items-center space-x-2.5 text-xs font-mono text-cyan-300">
            <HelpCircle className="w-4 h-4 text-[#00f2ff] flex-shrink-0" />
            <span className="text-slate-400 font-bold hidden sm:inline">PREGUNTA:</span>
            <span className="text-white font-bold text-sm tracking-wide">{currentPrompt}</span>
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto">
            {caregiverQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPrompt(q)}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all whitespace-nowrap ${
                  currentPrompt === q
                    ? 'bg-[#00f2ff] text-slate-950 font-bold'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                P{idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Big Spoken Feedback Banner */}
        {lastSpoken && (
          <div className="w-full glass-panel-glow px-6 py-3 rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_35px_rgba(16,185,129,0.35)] flex items-center justify-between animate-bounce">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">{lastSpoken.card.emoji}</span>
              <div>
                <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center space-x-1">
                  <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                  <span>RESPUESTA HABLADA POR VOZ EN VIVO</span>
                </div>
                <div className="text-lg md:text-2xl font-black font-sans text-white tracking-wide">
                  «{lastSpoken.card.speechText}»
                </div>
              </div>
            </div>

            <button
              onClick={() => handleCardSelect(lastSpoken.card)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-400/40 text-emerald-200 text-xs font-mono flex items-center space-x-1"
              title="Repetir voz"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Repetir</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Interactive AR Cards Grid (Optimized for Hand Pointer & Dwell) */}
      <div className="w-full max-w-5xl mx-auto my-auto grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5 py-4">
        {cards.map((card) => {
          const isHovered = hoveredCardId === card.id;
          const isFlashing = !!activeFlashes[card.id];

          return (
            <div
              key={card.id}
              ref={(el) => (cardElementsRef.current[card.id] = el)}
              onClick={() => handleCardSelect(card)}
              style={{
                borderColor: isHovered || isFlashing ? card.color : 'rgba(255, 255, 255, 0.12)',
                boxShadow:
                  isHovered || isFlashing
                    ? `0 0 35px ${card.color}80, inset 0 0 20px ${card.color}40`
                    : 'none',
              }}
              className={`relative overflow-hidden rounded-3xl p-4 md:p-6 cursor-pointer select-none transition-all duration-150 backdrop-blur-xl bg-[#050508]/85 border-2 flex flex-col justify-between min-h-[130px] md:min-h-[160px] group ${
                isHovered ? 'scale-105 z-10' : 'hover:scale-[1.02]'
              } ${isFlashing ? 'animate-pulse scale-110' : ''}`}
            >
              {/* Dwell Progress Bar Overlay */}
              {isHovered && (
                <div
                  className="absolute bottom-0 left-0 h-1.5 transition-all duration-75"
                  style={{
                    width: `${dwellProgress * 100}%`,
                    backgroundColor: card.color,
                    boxShadow: `0 0 10px ${card.color}`,
                  }}
                />
              )}

              {/* Card Header: Emoji + Audio Indicator */}
              <div className="flex items-center justify-between">
                <span className="text-3xl md:text-5xl group-hover:scale-110 transition-transform">
                  {card.emoji}
                </span>

                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: `${card.color}25`,
                    color: card.color,
                    border: `1px solid ${card.color}50`,
                  }}
                >
                  <Volume2 className="w-4 h-4" />
                </div>
              </div>

              {/* Card Label */}
              <div className="mt-2">
                <div
                  className="text-xl md:text-3xl font-black font-sans tracking-wide"
                  style={{ color: card.color }}
                >
                  {card.label}
                </div>
                <div className="text-[11px] md:text-xs font-mono text-slate-300 mt-1 line-clamp-1">
                  {card.speechText}
                </div>
              </div>

              {/* Finger Target Hint */}
              {isHovered && (
                <div className="absolute top-2 right-2 text-[10px] font-mono text-cyan-300 font-bold bg-black/60 px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <span>SEÑALANDO</span>
                  <div
                    className="w-2 h-2 rounded-full animate-ping"
                    style={{ backgroundColor: card.color }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Category Tabs & Helper Bar */}
      <div className="w-full max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 glass-panel px-4 py-2.5 rounded-2xl">
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
          <Sparkles className="w-4 h-4 text-[#00f2ff]" />
          <span>Señala con tu dedo durante <strong>0.6s</strong> para hablar en voz alta</span>
        </div>

        {/* Categories */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => {
              setSelectedCategory('quick-answers');
              aacManager.setCategory('quick-answers');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition-all ${
              selectedCategory === 'quick-answers'
                ? 'bg-[#10b981] text-slate-950 font-bold shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Respuestas</span>
          </button>

          <button
            onClick={() => {
              setSelectedCategory('vital-needs');
              aacManager.setCategory('vital-needs');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition-all ${
              selectedCategory === 'vital-needs'
                ? 'bg-[#EF3800] text-white font-bold shadow-[0_0_15px_rgba(239,56,0,0.6)]'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Necesidades</span>
          </button>

          <button
            onClick={() => {
              setSelectedCategory('feelings');
              aacManager.setCategory('feelings');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition-all ${
              selectedCategory === 'feelings'
                ? 'bg-[#00f2ff] text-slate-950 font-bold shadow-[0_0_15px_rgba(0,242,255,0.5)]'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Emociones</span>
          </button>
        </div>
      </div>
    </div>
  );
};
