import { InstrumentTimbre } from '../types';

export class AudioEngine {
  public ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isUnlocked = false;
  private currentTimbre: InstrumentTimbre = 'acoustic-guitar';
  private onStateChangeListeners: ((state: AudioContextState) => void)[] = [];

  private scaleNotes = [
    { note: 'C2', freq: 65.41 },
    { note: 'Eb2', freq: 77.78 },
    { note: 'F2', freq: 87.31 },
    { note: 'G2', freq: 98.00 },
    { note: 'Bb2', freq: 116.54 },
    { note: 'C3', freq: 130.81 },
    { note: 'Eb3', freq: 155.56 },
    { note: 'F3', freq: 174.61 },
    { note: 'G3', freq: 196.00 },
    { note: 'Bb3', freq: 233.08 },
    { note: 'C4', freq: 261.63 },
    { note: 'Eb4', freq: 311.13 },
    { note: 'F4', freq: 349.23 },
    { note: 'G4', freq: 392.00 },
    { note: 'Bb4', freq: 466.16 },
    { note: 'C5', freq: 523.25 },
    { note: 'Eb5', freq: 622.25 },
    { note: 'F5', freq: 698.46 },
    { note: 'G5', freq: 783.99 },
    { note: 'Bb5', freq: 932.33 },
    { note: 'C6', freq: 1046.50 },
  ];

  constructor() {
    // Listen for global unlock gestures
    if (typeof window !== 'undefined') {
      const unlockHandler = () => {
        this.unlockAudio();
      };
      window.addEventListener('click', unlockHandler, { passive: true });
      window.addEventListener('keydown', unlockHandler, { passive: true });
      window.addEventListener('touchstart', unlockHandler, { passive: true });
    }
  }

  public subscribeStateChange(cb: (state: AudioContextState) => void) {
    this.onStateChangeListeners.push(cb);
    if (this.ctx) {
      cb(this.ctx.state);
    }
  }

  public async unlockAudio(): Promise<boolean> {
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioContextClass();
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      // Create master gain
      if (!this.masterGain) {
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }

      this.isUnlocked = this.ctx.state === 'running';
      this.notifyState();
      return this.isUnlocked;
    } catch (e) {
      console.warn('Audio unlock error:', e);
      return false;
    }
  }

  private notifyState() {
    if (this.ctx) {
      const state = this.ctx.state;
      this.onStateChangeListeners.forEach((cb) => cb(state));
    }
  }

  public setTimbre(timbre: InstrumentTimbre) {
    this.currentTimbre = timbre;
  }

  public setMasterVolume(vol: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime, 0.05);
    }
  }

  public calculateFrequencyFromLength(lengthPx: number, minPx = 60, maxPx = 750): { freq: number; noteName: string } {
    const clampedLength = Math.max(minPx, Math.min(maxPx, lengthPx));
    const ratio = (clampedLength - minPx) / (maxPx - minPx);
    const noteIndex = Math.floor((1 - ratio) * (this.scaleNotes.length - 1));
    const selected = this.scaleNotes[noteIndex] || this.scaleNotes[0];

    return {
      freq: selected.freq,
      noteName: selected.note,
    };
  }

  /**
   * Main string pluck trigger. Loud, clear, zero-latency physical synthesis.
   */
  public pluckString(freq: number, velocity = 0.9) {
    // Guarantee AudioContext exists and is running
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') {
      this.unlockAudio().then(() => this.executePluck(freq, velocity));
      return;
    }

    this.executePluck(freq, velocity);
  }

  private executePluck(freq: number, velocity: number) {
    if (!this.ctx || !this.masterGain) return;

    switch (this.currentTimbre) {
      case 'acoustic-guitar':
        this.playAcousticString(freq, velocity);
        break;
      case 'electric-lead':
        this.playElectricSynth(freq, velocity);
        break;
      case 'crystal-harp':
        this.playCrystalHarp(freq, velocity);
        break;
      case 'deep-bass':
        this.playDeepBass(freq, velocity);
        break;
    }
  }

  /**
   * Highly realistic Plucked Acoustic String (Karplus-Strong Hybrid)
   * Combines initial pick transient burst with dual resonant harmonic oscillators
   * and an exponential damping filter sweep.
   */
  private playAcousticString(freq: number, velocity: number) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // 1. Pick Attack Transient (White Noise Burst)
    const attackSamples = Math.floor(this.ctx.sampleRate * 0.012); // 12ms pick impulse
    const attackBuffer = this.ctx.createBuffer(1, attackSamples, this.ctx.sampleRate);
    const attackData = attackBuffer.getChannelData(0);
    for (let i = 0; i < attackSamples; i++) {
      attackData[i] = (Math.random() * 2 - 1) * Math.exp(-6 * (i / attackSamples));
    }

    const attackNode = this.ctx.createBufferSource();
    attackNode.buffer = attackBuffer;

    const attackFilter = this.ctx.createBiquadFilter();
    attackFilter.type = 'bandpass';
    attackFilter.frequency.setValueAtTime(freq * 3, now);
    attackFilter.Q.setValueAtTime(3, now);

    const attackGain = this.ctx.createGain();
    attackGain.gain.setValueAtTime(velocity * 0.6, now);
    attackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    attackNode.connect(attackFilter);
    attackFilter.connect(attackGain);
    attackGain.connect(this.masterGain);

    attackNode.start(now);

    // 2. Fundamental & Second Harmonic String Body Resonators
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc2.type = 'sawtooth';

    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2.002, now); // Octave overtone

    // Lowpass filter simulates the wooden soundboard damping high frequencies first
    const bodyFilter = this.ctx.createBiquadFilter();
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(Math.min(freq * 7, 7500), now);
    bodyFilter.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.5, 200), now + 1.8);
    bodyFilter.Q.setValueAtTime(4.0, now);

    // String amplitude envelope (fast attack, exponential decay)
    const stringGain = this.ctx.createGain();
    stringGain.gain.setValueAtTime(0.0001, now);
    stringGain.gain.linearRampToValueAtTime(velocity * 0.95, now + 0.006);
    // Lower strings sustain longer than high strings (physics of mass/tension)
    const sustainDuration = Math.max(1.2, Math.min(3.5, 400 / freq));
    stringGain.gain.exponentialRampToValueAtTime(0.0001, now + sustainDuration);

    osc1.connect(bodyFilter);
    osc2.connect(bodyFilter);
    bodyFilter.connect(stringGain);
    stringGain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + sustainDuration + 0.1);
    osc2.stop(now + sustainDuration + 0.1);
  }

  /**
   * Electric Lead synthesizer with warmth and slight overdrive
   */
  private playElectricSynth(freq: number, velocity: number) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 1.004, now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3, now);
    filter.frequency.exponentialRampToValueAtTime(freq * 8, now + 0.05);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 1.2);
    filter.Q.setValueAtTime(5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(velocity * 0.8, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2.0);
    osc2.stop(now + 2.0);
  }

  /**
   * Crystal Harp with ethereal bell harmonics
   */
  private playCrystalHarp(freq: number, velocity: number) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const fundamental = this.ctx.createOscillator();
    const harmonic1 = this.ctx.createOscillator();
    const harmonic2 = this.ctx.createOscillator();

    fundamental.type = 'sine';
    harmonic1.type = 'sine';
    harmonic2.type = 'triangle';

    fundamental.frequency.setValueAtTime(freq, now);
    harmonic1.frequency.setValueAtTime(freq * 2, now);
    harmonic2.frequency.setValueAtTime(freq * 3.01, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(velocity * 0.8, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

    const harmGain = this.ctx.createGain();
    harmGain.gain.setValueAtTime(0.4, now);

    harmonic1.connect(harmGain);
    harmonic2.connect(harmGain);
    fundamental.connect(gain);
    harmGain.connect(gain);
    gain.connect(this.masterGain);

    fundamental.start(now);
    harmonic1.start(now);
    harmonic2.start(now);

    fundamental.stop(now + 3.0);
    harmonic1.stop(now + 3.0);
    harmonic2.stop(now + 3.0);
  }

  /**
   * Deep Bass for resonant lower strings
   */
  private playDeepBass(freq: number, velocity: number) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const subFreq = freq > 120 ? freq / 2 : freq;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(subFreq, now);

    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(subFreq / 2, now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(velocity * 0.9, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    subOsc.start(now);
    osc.stop(now + 2.4);
    subOsc.stop(now + 2.4);
  }

  /**
   * Plays a quick 3-note test chord to verify sound immediately
   */
  public testChord() {
    this.unlockAudio().then(() => {
      this.pluckString(196.00, 0.9); // G3
      setTimeout(() => this.pluckString(246.94, 0.85), 120); // B3
      setTimeout(() => this.pluckString(293.66, 0.85), 240); // D4
      setTimeout(() => this.pluckString(392.00, 0.95), 360); // G4
    });
  }
}

export const soundManager = new AudioEngine();
