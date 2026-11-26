import React, { useState, useEffect, useRef } from 'react';
import { AACCard, AACCategories, AACVoiceModel, HandData, PlayMode } from '../types';
import { aacManager, SpokenHistoryEntry } from '../aac/AACManager';
import { Volume2, Heart, ShieldAlert, Sparkles, Check, HelpCircle, Users, Guitar, RadioTower } from 'lucide-react';

interface AACViewProps {
  hands: HandData[];
  onTriggerCard?: (card: AACCard) => void;
  onExit?: () => void;
  onSelectMode?: (mode: PlayMode) => void;
}

export const AACView: React.FC<AACViewProps> = ({ hands, onTriggerCard, onExit, onSelectMode }) => {
  const [selectedCategory, setSelectedCategory] = useState<AACCategories>('quick-answers');
  const [currentPrompt, setCurrentPrompt] = useState<string>('¿Cómo te sientes en este momento?');
  const [lastSpoken, setLastSpoken] = useState<SpokenHistoryEntry | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState<number>(0);
  const [activeFlashes, setActiveFlashes] = useState<{ [cardId: string]: number }>({});

  // Voice model selection state
  const [voiceModel, setVoiceModel] = useState<AACVoiceModel>(aacManager.getVoiceModel());
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>(aacManager.getAvailableVoices());
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(aacManager.getSelectedVoice()?.voiceURI || '');

  // Category air-hover dwell state
  const [hoveredCat, setHoveredCat] = useState<AACCategories | null>(null);
  const [catDwellProgress, setCatDwellProgress] = useState<number>(0);

  // Return to instruments air-hover dwell state
  const [hoveredExit, setHoveredExit] = useState<'instruments' | 'theremin' | null>(null);
  const [exitDwellProgress, setExitDwellProgress] = useState<number>(0);

  const hoverStartRef = useRef<{ cardId: string; time: number } | null>(null);
  const lastTriggeredCardRef = useRef<{ cardId: string; time: number } | null>(null);
  const cardElementsRef = useRef<{ [cardId: string]: HTMLDivElement | null }>({});
  const categoryRefs = useRef<{ [key in AACCategories]?: HTMLButtonElement | null }>({});
  const catHoverStartRef = useRef<{ cat: AACCategories; time: number } | null>(null);

  const exitBtnTopRef = useRef<HTMLButtonElement | null>(null);
  const exitBtnBottomRef = useRef<HTMLButtonElement | null>(null);
  const thereminBtnRef = useRef<HTMLButtonElement | null>(null);
  const exitHoverStartRef = useRef<{ target: 'instruments' | 'theremin'; time: number } | null>(null);

  const cards = aacManager.getCards(selectedCategory);

  const caregiverQuestions = [
    '¿Cómo te sientes en este momento?',
    '¿Tienes hambre o sed?',
    '¿Sientes algún dolor o molestia?',
    '¿Quieres descansar o cambiar de posición?',
    '¿Estás de acuerdo con esto?',
  ];

  // Subscribe to speech history and voice updates
  useEffect(() => {
    aacManager.onSpeech((entry) => {
      setLastSpoken(entry);
    });

    aacManager.onVoicesUpdate(() => {
      setAvailableVoices(aacManager.getAvailableVoices());
      setSelectedVoiceURI(aacManager.getSelectedVoice()?.voiceURI || '');
    });
  }, []);

  const handleExit = () => {
    aacManager.cancelSpeech();
    if (onSelectMode) {
      onSelectMode('laser-harp');
    } else if (onExit) {
      onExit();
    }
  };

  const handleSelectTheremin = () => {
    aacManager.cancelSpeech();
    if (onSelectMode) {
      onSelectMode('theremin');
    }
  };

  const switchCategory = (cat: AACCategories) => {
    setSelectedCategory(cat);
    aacManager.setCategory(cat);
    setHoveredCardId(null);
    setDwellProgress(0);
    hoverStartRef.current = null;
  };

  // Hand pointer collision & dwell detection for categories, exit buttons & cards
  useEffect(() => {
    const now = performance.now();
    const CARD_DWELL_MS = 650; // Time needed to dwell-select a card
    const CAT_DWELL_MS = 450;  // Quick dwell to change category
    const EXIT_DWELL_MS = 500; // Quick dwell to return to instruments

    let detectedExit: 'instruments' | 'theremin' | null = null;
    let detectedCat: AACCategories | null = null;
    let detectedHoverId: string | null = null;

    if (hands.length > 0) {
      for (const hand of hands) {
        const { indexTip } = hand;

        // 1. Test Return / Exit Buttons
        const exitButtons = [exitBtnTopRef.current, exitBtnBottomRef.current].filter(Boolean);
        for (const btn of exitButtons) {
          if (btn) {
            const rect = btn.getBoundingClientRect();
            if (
              indexTip.x >= rect.left - 10 &&
              indexTip.x <= rect.right + 10 &&
              indexTip.y >= rect.top - 10 &&
              indexTip.y <= rect.bottom + 10
            ) {
              detectedExit = 'instruments';
              break;
            }
          }
        }
        if (detectedExit) break;

        if (thereminBtnRef.current) {
          const rect = thereminBtnRef.current.getBoundingClientRect();
          if (
            indexTip.x >= rect.left - 10 &&
            indexTip.x <= rect.right + 10 &&
            indexTip.y >= rect.top - 10 &&
            indexTip.y <= rect.bottom + 10
          ) {
            detectedExit = 'theremin';
            break;
          }
        }

        // 2. Test Category Tabs
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

        // 3. Test Cards
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

    // Process Exit Button Dwell
    if (detectedExit) {
      setHoveredExit(detectedExit);
      setHoveredCat(null);
      setHoveredCardId(null);
      setDwellProgress(0);
      hoverStartRef.current = null;
      catHoverStartRef.current = null;

      if (!exitHoverStartRef.current || exitHoverStartRef.current.target !== detectedExit) {
        exitHoverStartRef.current = { target: detectedExit, time: now };
        setExitDwellProgress(0);
      } else {
        const elapsed = now - exitHoverStartRef.current.time;
        const progress = Math.min(1.0, elapsed / EXIT_DWELL_MS);
        setExitDwellProgress(progress);

        if (progress >= 1.0) {
          if (detectedExit === 'instruments') {
            handleExit();
          } else {
            handleSelectTheremin();
          }
          exitHoverStartRef.current = null;
          setExitDwellProgress(0);
        }
      }
      return;
    } else {
      setHoveredExit(null);
      setExitDwellProgress(0);
      exitHoverStartRef.current = null;
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
        now - lastTriggeredCardRef.current.time < 1800
      ) {
        setDwellProgress(0);
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
          const matchedCard = cards.find((c) => c.id === detectedHoverId);
          if (matchedCard) {
            handleCardSelect(matchedCard);
            lastTriggeredCardRef.current = { cardId: matchedCard.id, time: now };
          }
          hoverStartRef.current = null;
          setDwellProgress(0);
        }
      }
    } else {
      setHoveredCardId(null);
      setDwellProgress(0);
      hoverStartRef.current = null;
      if (lastTriggeredCardRef.current && now - lastTriggeredCardRef.current.time > 1800) {
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
    <div className="absolute inset-0 pointer-events-auto flex flex-col justify-between p-3 sm:p-5 z-30 pb-4 md:pb-6 overflow-y-auto">
      {/* Top Section: Navigation + Prompt + Live Speech Banner + Category Selector */}
      <div className="w-full flex flex-col items-center gap-2 max-w-5xl mx-auto">
        {/* Top Header Row with Prompt Bar & Quick Exit Buttons */}
        <div className="w-full flex flex-wrap items-center justify-between gap-2">
          {/* Caregiver Prompt Bar */}
          <div className="flex-1 min-w-[260px] glass-panel-glow px-4 py-2 rounded-2xl flex items-center justify-between border border-cyan-500/40 shadow-[0_0_25px_rgba(0,242,255,0.2)]">
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

          {/* Top Quick Return Button */}
          <button
            ref={exitBtnTopRef}
            onClick={handleExit}
            className="relative overflow-hidden px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-xs sm:text-sm flex items-center space-x-2 shadow-[0_0_25px_rgba(0,242,255,0.6)] cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0"
            title="Volver a los instrumentos musicales"
          >
            {hoveredExit === 'instruments' && (
              <div
                className="absolute bottom-0 left-0 h-1.5 bg-white transition-all duration-75"
                style={{ width: `${exitDwellProgress * 100}%` }}
              />
            )}
            <Guitar className="w-4 h-4 text-slate-950" />
            <span>Volver a Instrumentos 🎵</span>
          </button>
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

        {/* Independent Voice Model Selector Strip */}
        <div className="w-full glass-panel px-3 py-1.5 rounded-xl flex items-center justify-between text-xs font-mono border border-emerald-500/30 gap-2 overflow-x-auto shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <div className="flex items-center space-x-1.5 text-emerald-400 shrink-0">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold text-white tracking-wide">MODELO DE VOZ:</span>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={() => {
                aacManager.setVoiceModel('female-natural');
                setVoiceModel('female-natural');
                aacManager.previewVoice();
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center space-x-1 transition-all cursor-pointer ${
                voiceModel === 'female-natural'
                  ? 'bg-emerald-400 text-slate-950 font-bold shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                  : 'bg-white/5 hover:bg-white/10 text-emerald-300'
              }`}
              title="Voz femenina natural, clara y suave"
            >
              <span>👩 Femenina</span>
            </button>

            <button
              onClick={() => {
                aacManager.setVoiceModel('male-calm');
                setVoiceModel('male-calm');
                aacManager.previewVoice();
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center space-x-1 transition-all cursor-pointer ${
                voiceModel === 'male-calm'
                  ? 'bg-emerald-400 text-slate-950 font-bold shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                  : 'bg-white/5 hover:bg-white/10 text-emerald-300'
              }`}
              title="Voz masculina serena y comprensiva"
            >
              <span>👨 Masculina</span>
            </button>

            <button
              onClick={() => {
                aacManager.setVoiceModel('neutral-clear');
                setVoiceModel('neutral-clear');
                aacManager.previewVoice();
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center space-x-1 transition-all cursor-pointer ${
                voiceModel === 'neutral-clear'
                  ? 'bg-emerald-400 text-slate-950 font-bold shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                  : 'bg-white/5 hover:bg-white/10 text-emerald-300'
              }`}
              title="Voz neutra directa"
            >
              <span>🧑 Neutra</span>
            </button>

            {availableVoices.length > 0 && (
              <select
                value={selectedVoiceURI}
                onChange={(e) => {
                  const uri = e.target.value;
                  setSelectedVoiceURI(uri);
                  aacManager.setSelectedVoiceURI(uri);
                  setVoiceModel('system-custom');
                  aacManager.previewVoice();
                }}
                className="bg-[#050508] border border-emerald-500/40 text-[10px] font-mono text-emerald-300 rounded-lg px-2 py-1 outline-none cursor-pointer max-w-[130px] sm:max-w-[180px] truncate"
                title="Voces en español instaladas en tu dispositivo"
              >
                {availableVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => aacManager.previewVoice()}
              className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 text-[10px] font-mono flex items-center space-x-1 cursor-pointer shrink-0 border border-emerald-500/30"
              title="Probar voz seleccionada"
            >
              <Volume2 className="w-3 h-3" />
              <span>Probar</span>
            </button>
          </div>
        </div>

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

      {/* Bottom Control Dock Inside AACView */}
      <footer className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 p-2 sm:p-3 rounded-2xl bg-[#050508]/90 backdrop-blur-xl border border-white/15 shadow-[0_0_30px_rgba(0,0,0,0.8)] pointer-events-auto">
        <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400">
          <Sparkles className="w-3.5 h-3.5 text-[#00f2ff] animate-pulse shrink-0" />
          <span className="text-[11px] text-slate-300">Apunta con el dedo índice 0.5s para seleccionar cualquier opción</span>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <button
            ref={exitBtnBottomRef}
            onClick={handleExit}
            className="relative overflow-hidden flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-xs flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(0,242,255,0.5)] cursor-pointer transition-all hover:scale-105 active:scale-95"
            title="Volver a tocar instrumentos musicales"
          >
            {hoveredExit === 'instruments' && (
              <div
                className="absolute bottom-0 left-0 h-1.5 bg-white transition-all duration-75"
                style={{ width: `${exitDwellProgress * 100}%` }}
              />
            )}
            <Guitar className="w-4 h-4 text-slate-950 shrink-0" />
            <span>Volver a Instrumentos 🎵</span>
          </button>

          <button
            ref={thereminBtnRef}
            onClick={handleSelectTheremin}
            className="relative overflow-hidden flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-[#0D2560]/80 hover:bg-[#0D2560] border border-cyan-400/40 text-cyan-200 font-bold font-mono text-xs flex items-center justify-center space-x-1.5 shadow-[0_0_15px_rgba(0,242,255,0.25)] cursor-pointer transition-all hover:scale-105 active:scale-95"
            title="Ir directo al Theremin AR"
          >
            {hoveredExit === 'theremin' && (
              <div
                className="absolute bottom-0 left-0 h-1.5 bg-cyan-400 transition-all duration-75"
                style={{ width: `${exitDwellProgress * 100}%` }}
              />
            )}
            <RadioTower className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>🛸 Theremin</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
