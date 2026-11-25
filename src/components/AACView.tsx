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

  // Category air-hover dwell state
  const [hoveredCat, setHoveredCat] = useState<AACCategories | null>(null);
  const [catDwellProgress, setCatDwellProgress] = useState<number>(0);

  const hoverStartRef = useRef<{ cardId: string; time: number } | null>(null);
  const lastTriggeredCardRef = useRef<{ cardId: string; time: number } | null>(null);
  const cardElementsRef = useRef<{ [cardId: string]: HTMLDivElement | null }>({});
  const categoryRefs = useRef<{ [key in AACCategories]?: HTMLButtonElement | null }>({});
  const catHoverStartRef = useRef<{ cat: AACCategories; time: number } | null>(null);

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

  const switchCategory = (cat: AACCategories) => {
    setSelectedCategory(cat);
    aacManager.setCategory(cat);
    setHoveredCardId(null);
    setDwellProgress(0);
    hoverStartRef.current = null;
  };

  // Hand pointer collision & dwell detection for both categories & cards
  useEffect(() => {
    const now = performance.now();
    const CARD_DWELL_MS = 650; // Time needed to dwell-select a card
    const CAT_DWELL_MS = 450;  // Quick dwell to change category

    let detectedCat: AACCategories | null = null;
    let detectedHoverId: string | null = null;

    if (hands.length > 0) {
      for (const hand of hands) {
        const { indexTip } = hand;

        // 1. Test Category Tabs
        for (const cat of ['quick-answers', 'vital-needs', 'feelings'] as AACCategories[]) {
          const el = categoryRefs.current[cat];
          if (el) {
            const rect = el.getBoundingClientRect();
            if (
              indexTip.x >= rect.left - 6 &&
              indexTip.x <= rect.right + 6 &&
              indexTip.y >= rect.top - 6 &&
              indexTip.y <= rect.bottom + 6
            ) {
              detectedCat = cat;
              break;
            }
          }
        }
        if (detectedCat) break;

        // 2. Test Cards
        for (const card of cards) {
          const el = cardElementsRef.current[card.id];
          if (el) {
            const rect = el.getBoundingClientRect();
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

    // Process Category Dwell
    if (detectedCat) {
      setHoveredCat(detectedCat);
      setHoveredCardId(null);
      setDwellProgress(0);
      hoverStartRef.current = null;

      if (!catHoverStartRef.current || catHoverStartRef.current.cat !== detectedCat) {
        catHoverStartRef.current = { cat: detectedCat, time: now };
        setCatDwellProgress(0);
      } else {
        const elapsed = now - catHoverStartRef.current.time;
        const progress = Math.min(1.0, elapsed / CAT_DWELL_MS);
        setCatDwellProgress(progress);

        if (progress >= 1.0) {
          if (selectedCategory !== detectedCat) {
            switchCategory(detectedCat);
          }
          catHoverStartRef.current = null;
          setCatDwellProgress(0);
        }
      }
      return;
    } else {
      setHoveredCat(null);
      setCatDwellProgress(0);
      catHoverStartRef.current = null;
    }

    // Process Card Dwell
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
        const progress = Math.min(1.0, elapsed / CARD_DWELL_MS);
        setDwellProgress(progress);

        if (progress >= 1.0) {
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
      if (lastTriggeredCardRef.current && now - lastTriggeredCardRef.current.time > 800) {
        lastTriggeredCardRef.current = null;
      }
    }
  }, [hands, cards, selectedCategory]);

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
    <div className="absolute inset-0 pointer-events-auto flex flex-col justify-between p-3 sm:p-5 z-30 pb-20">
      {/* Top Section: Prompt + Live Speech Banner + Prominent Category Selector */}
      <div className="w-full flex flex-col items-center gap-2.5 max-w-4xl mx-auto">
        {/* Caregiver Prompt Bar */}
        <div className="w-full glass-panel-glow px-4 py-2 rounded-2xl flex items-center justify-between border border-cyan-500/40 shadow-[0_0_25px_rgba(0,242,255,0.2)]">
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-300">
            <HelpCircle className="w-4 h-4 text-[#00f2ff] flex-shrink-0" />
            <span className="text-slate-400 font-bold hidden sm:inline">PREGUNTA:</span>
            <span className="text-white font-bold text-sm tracking-wide truncate max-w-xs sm:max-w-md">{currentPrompt}</span>
          </div>

          <div className="flex items-center space-x-1 overflow-x-auto">
            {caregiverQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPrompt(q)}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all whitespace-nowrap cursor-pointer ${
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
          <div className="w-full glass-panel-glow px-5 py-2.5 rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_35px_rgba(16,185,129,0.35)] flex items-center justify-between animate-bounce">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">{lastSpoken.card.emoji}</span>
              <div>
                <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center space-x-1">
                  <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                  <span>RESPUESTA HABLADA EN VIVO</span>
                </div>
                <div className="text-base sm:text-xl font-black font-sans text-white tracking-wide">
                  «{lastSpoken.card.speechText}»
                </div>
              </div>
            </div>

            <button
              onClick={() => handleCardSelect(lastSpoken.card)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-400/40 text-emerald-200 text-xs font-mono flex items-center space-x-1 cursor-pointer"
              title="Repetir voz"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Repetir</span>
            </button>
          </div>
        )}

        {/* PROMINENT CATEGORY NAVIGATION TABS (TOUCH & AIR POINTER) */}
        <div className="w-full flex items-center justify-center gap-2 sm:gap-3 p-1.5 rounded-2xl bg-[#050508]/90 backdrop-blur-xl border border-white/15 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          {/* TAB 1: QUICK ANSWERS */}
          <button
            ref={(el) => (categoryRefs.current['quick-answers'] = el)}
            onClick={() => switchCategory('quick-answers')}
            className={`relative overflow-hidden flex-1 max-w-[240px] py-2 sm:py-2.5 px-3 rounded-xl font-mono text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all duration-200 cursor-pointer ${
              selectedCategory === 'quick-answers'
                ? 'bg-[#10b981] text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.7)] scale-105 border border-emerald-300'
                : 'bg-white/5 hover:bg-white/10 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {hoveredCat === 'quick-answers' && (
              <div
                className="absolute bottom-0 left-0 h-1.5 bg-emerald-300 transition-all duration-75"
                style={{ width: `${catDwellProgress * 100}%` }}
              />
            )}
            <Check className="w-4 h-4 shrink-0" />
            <span className="truncate">💬 RESPUESTAS</span>
          </button>

          {/* TAB 2: VITAL NEEDS */}
          <button
            ref={(el) => (categoryRefs.current['vital-needs'] = el)}
            onClick={() => switchCategory('vital-needs')}
            className={`relative overflow-hidden flex-1 max-w-[240px] py-2 sm:py-2.5 px-3 rounded-xl font-mono text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all duration-200 cursor-pointer ${
              selectedCategory === 'vital-needs'
                ? 'bg-[#EF3800] text-white shadow-[0_0_20px_rgba(239,56,0,0.8)] scale-105 border border-orange-400 animate-pulse'
                : 'bg-white/5 hover:bg-white/10 text-[#EF3800] border border-[#EF3800]/40'
            }`}
          >
            {hoveredCat === 'vital-needs' && (
              <div
                className="absolute bottom-0 left-0 h-1.5 bg-orange-300 transition-all duration-75"
                style={{ width: `${catDwellProgress * 100}%` }}
              />
            )}
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="truncate">🚨 NECESIDADES</span>
          </button>

          {/* TAB 3: FEELINGS & EMOTIONS */}
          <button
            ref={(el) => (categoryRefs.current['feelings'] = el)}
            onClick={() => switchCategory('feelings')}
            className={`relative overflow-hidden flex-1 max-w-[240px] py-2 sm:py-2.5 px-3 rounded-xl font-mono text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all duration-200 cursor-pointer ${
              selectedCategory === 'feelings'
                ? 'bg-[#00f2ff] text-slate-950 shadow-[0_0_20px_rgba(0,242,255,0.7)] scale-105 border border-cyan-300'
                : 'bg-white/5 hover:bg-white/10 text-[#00f2ff] border border-cyan-500/30'
            }`}
          >
            {hoveredCat === 'feelings' && (
              <div
                className="absolute bottom-0 left-0 h-1.5 bg-cyan-300 transition-all duration-75"
                style={{ width: `${catDwellProgress * 100}%` }}
              />
            )}
            <Heart className="w-4 h-4 shrink-0" />
            <span className="truncate">❤️ EMOCIONES</span>
          </button>
        </div>
      </div>

      {/* Main Interactive AR Cards Grid (Optimized for Hand Pointer & Dwell) */}
      <div className="w-full max-w-5xl mx-auto my-auto grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 py-2">
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
              className={`relative overflow-hidden rounded-3xl p-3 sm:p-5 cursor-pointer select-none transition-all duration-150 backdrop-blur-xl bg-[#050508]/85 border-2 flex flex-col justify-between min-h-[120px] sm:min-h-[150px] group ${
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
                <span className="text-3xl sm:text-5xl group-hover:scale-110 transition-transform">
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
                  className="text-lg sm:text-2xl font-black font-sans tracking-wide"
                  style={{ color: card.color }}
                >
                  {card.label}
                </div>
                <div className="text-[11px] sm:text-xs font-mono text-slate-300 mt-1 line-clamp-1">
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

      {/* Helper Guidance */}
      <div className="w-full max-w-xl mx-auto text-center pointer-events-none">
        <div className="inline-flex items-center space-x-2 px-4 py-1 rounded-full bg-black/60 border border-white/10 text-[11px] font-mono text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-[#00f2ff]" />
          <span>Apunta con el dedo índice 0.5s para seleccionar cualquier tarjeta o categoría</span>
        </div>
      </div>
    </div>
  );
};
