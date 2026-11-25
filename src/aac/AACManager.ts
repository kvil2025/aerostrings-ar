import { AACCard, AACCategories } from '../types';

export interface SpokenHistoryEntry {
  id: string;
  card: AACCard;
  timestamp: number;
}

export class AACManager {
  private cards: AACCard[] = [
    // 1. Quick Answers (Respuestas a Preguntas)
    {
      id: 'ans-yes',
      category: 'quick-answers',
      emoji: '🟢',
      label: 'SÍ',
      speechText: 'Sí, estoy de acuerdo.',
      color: '#10b981',
      priority: true,
    },
    {
      id: 'ans-no',
      category: 'quick-answers',
      emoji: '🔴',
      label: 'NO',
      speechText: 'No, no quiero eso.',
      color: '#ef4444',
      priority: true,
    },
    {
      id: 'ans-wait',
      category: 'quick-answers',
      emoji: '⏳',
      label: 'ESPERA',
      speechText: 'Por favor, dame un momento.',
      color: '#f59e0b',
    },
    {
      id: 'ans-maybe',
      category: 'quick-answers',
      emoji: '🤔',
      label: 'TAL VEZ',
      speechText: 'Tal vez, no estoy seguro.',
      color: '#00f2ff',
    },
    {
      id: 'ans-agree',
      category: 'quick-answers',
      emoji: '👍',
      label: 'DE ACUERDO',
      speechText: 'Completamente de acuerdo contigo.',
      color: '#34d399',
    },
    {
      id: 'ans-dont-know',
      category: 'quick-answers',
      emoji: '🤷‍♂️',
      label: 'NO SÉ',
      speechText: 'No lo sé todavía.',
      color: '#64748b',
    },

    // 2. Vital Needs (Necesidades Vitales & Asistencia)
    {
      id: 'need-help',
      category: 'vital-needs',
      emoji: '🚨',
      label: '¡AYUDA / DOLOR!',
      speechText: '¡Por favor necesito ayuda urgente, siento dolor!',
      color: '#EF3800',
      priority: true,
    },
    {
      id: 'need-water',
      category: 'vital-needs',
      emoji: '💧',
      label: 'AGUA / SED',
      speechText: 'Tengo mucha sed, por favor dame agua.',
      color: '#00f2ff',
    },
    {
      id: 'need-food',
      category: 'vital-needs',
      emoji: '🍲',
      label: 'COMIDA / HAMBRE',
      speechText: 'Tengo hambre, quisiera comer algo.',
      color: '#f59e0b',
    },
    {
      id: 'need-toilet',
      category: 'vital-needs',
      emoji: '🚻',
      label: 'IR AL BAÑO',
      speechText: 'Necesito ir al baño, por favor ayúdame.',
      color: '#06b6d4',
    },
    {
      id: 'need-med',
      category: 'vital-needs',
      emoji: '💊',
      label: 'MEDICINA',
      speechText: 'Es hora de mi medicina o analgésico.',
      color: '#818cf8',
    },
    {
      id: 'need-rest',
      category: 'vital-needs',
      emoji: '🛏️',
      label: 'DESCANSAR',
      speechText: 'Estoy agotado, por favor ayúdame a recostarme.',
      color: '#38bdf8',
    },

    // 3. Feelings & Status (Emociones & Estado)
    {
      id: 'feel-good',
      category: 'feelings',
      emoji: '😊',
      label: 'ESTOY BIEN',
      speechText: 'Estoy bien, tranquilo y cómodo, gracias.',
      color: '#10b981',
    },
    {
      id: 'feel-thanks',
      category: 'feelings',
      emoji: '💙',
      label: 'GRACIAS',
      speechText: 'Muchas gracias por estar aquí y ayudarme.',
      color: '#00f2ff',
    },
    {
      id: 'feel-cold',
      category: 'feelings',
      emoji: '🥶',
      label: 'TENGO FRÍO',
      speechText: 'Tengo frío, ¿podrías abrigarme un poco?',
      color: '#38bdf8',
    },
    {
      id: 'feel-hot',
      category: 'feelings',
      emoji: '🥵',
      label: 'TENGO CALOR',
      speechText: 'Tengo mucho calor, por favor refresca el lugar.',
      color: '#f97316',
    },
    {
      id: 'feel-love',
      category: 'feelings',
      emoji: '❤️',
      label: 'TE QUIERO',
      speechText: 'Te quiero mucho y aprecio tu compañía.',
      color: '#f43f5e',
    },
    {
      id: 'feel-sleepy',
      category: 'feelings',
      emoji: '😴',
      label: 'SUEÑO',
      speechText: 'Tengo mucho sueño, buenas noches.',
      color: '#a78bfa',
    },
  ];

  private currentCategory: AACCategories = 'quick-answers';
  private speechSynth: SpeechSynthesis | null = null;
  private spanishVoice: SpeechSynthesisVoice | null = null;
  private history: SpokenHistoryEntry[] = [];
  private onSpeechListeners: ((entry: SpokenHistoryEntry) => void)[] = [];
  private isVoiceReady = false;

  public getIsVoiceReady(): boolean {
    return this.isVoiceReady;
  }

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.speechSynth = window.speechSynthesis;
      this.initVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  private initVoices() {
    if (!this.speechSynth) return;
    const voices = this.speechSynth.getVoices();
    // Prioritize natural Spanish voices (Chile, Spain, Mexico, US)
    const esVoice =
      voices.find((v) => v.lang.startsWith('es-CL')) ||
      voices.find((v) => v.lang.startsWith('es-ES') && (v.name.includes('Natural') || v.name.includes('Neural'))) ||
      voices.find((v) => v.lang.startsWith('es-')) ||
      voices.find((v) => v.lang.toLowerCase().includes('spanish'));

    if (esVoice) {
      this.spanishVoice = esVoice;
      this.isVoiceReady = true;
    }
  }

  public getCards(category?: AACCategories): AACCard[] {
    const cat = category || this.currentCategory;
    return this.cards.filter((c) => c.category === cat);
  }

  public setCategory(cat: AACCategories) {
    this.currentCategory = cat;
  }

  public getCurrentCategory(): AACCategories {
    return this.currentCategory;
  }

  public onSpeech(listener: (entry: SpokenHistoryEntry) => void) {
    this.onSpeechListeners.push(listener);
  }

  public speakCard(card: AACCard): SpokenHistoryEntry {
    const entry: SpokenHistoryEntry = {
      id: `speech-${Date.now()}`,
      card,
      timestamp: Date.now(),
    };

    this.history.unshift(entry);
    if (this.history.length > 20) this.history.pop();

    // Solo voz limpia sin ruidos ni acordes sintéticos
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Cancel any ongoing utterance
        const utterance = new SpeechSynthesisUtterance(card.speechText);
        utterance.lang = this.spanishVoice?.lang || 'es-ES';
        if (this.spanishVoice) {
          utterance.voice = this.spanishVoice;
        }
        utterance.rate = 0.95; // Clear, deliberate, natural pacing
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    }

    this.onSpeechListeners.forEach((fn) => fn(entry));
    return entry;
  }

  public getHistory(): SpokenHistoryEntry[] {
    return this.history;
  }
}

export const aacManager = new AACManager();
