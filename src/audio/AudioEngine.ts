import { InstrumentTimbre } from '../types';

export class AudioEngine {
  public ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isUnlocked = false;
  private currentTimbre: InstrumentTimbre = 'acoustic-guitar';
  private onStateChangeListeners: ((state: AudioContextState) => void)[] = [];
  private distortionCurve: Float32Array | null = null;
  private fuzzCurve: Float32Array | null = null;

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

  public getTimbre(): InstrumentTimbre {
    return this.currentTimbre;
  }

  public silenceAll() {
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(0, now);
      // Restore normal master gain cleanly after 40ms to eliminate all audio trails
      this.masterGain.gain.setValueAtTime(0.85, now + 0.04);
    } catch (e) {
      console.warn('Audio silence error:', e);
    }
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
      case 'distortion-guitar':
        this.playDistortionGuitar(freq, velocity);
        break;
      case 'fuzz-guitar':
        this.playFuzzGuitar(freq, velocity);
        break;
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

  private getDistortionCurve(drive = 45): Float32Array {
    if (this.distortionCurve) return this.distortionCurve;
    const n = 65536;
    const curve = new Float32Array(n);
    const deg = Math.PI / 180;
    for (let i = 0; i < n; ++i) {
      const x = (i * 2) / n - 1;
      const k = drive;
      const y = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      // Asymmetric saturation (tube warmth)
      curve[i] = x >= 0 ? Math.tanh(y * 1.5) : Math.tanh(y * 1.25) * 0.96;
    }
    this.distortionCurve = curve;
    return curve;
  }

  private getFuzzCurve(gain = 350): Float32Array {
    if (this.fuzzCurve) return this.fuzzCurve;
    const n = 65536;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; ++i) {
      const x = (i * 2) / n - 1;
      if (x === 0) {
        curve[i] = 0;
      } else {
        const sign = x > 0 ? 1 : -1;
        const clipped = sign * (1 - Math.exp(-gain * Math.abs(x) * 0.05));
        const octave = 0.08 * Math.sin(x * Math.PI * 3);
        curve[i] = Math.max(-1, Math.min(1, clipped * 0.92 + octave));
      }
    }
    this.fuzzCurve = curve;
    return curve;
  }

  /**
   * Heavy Rock / Metal High-Gain Overdrive Guitar (Marshall / Mesa Boogie stack emulation)
   * Multi-stage distortion: pick attack + asymmetric tube wave shaping + 4x12 cab filter.
   */
  private playDistortionGuitar(freq: number, velocity: number) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // 1. Pick Attack Scrape (Bandpass noise spike)
    const attackSamples = Math.floor(this.ctx.sampleRate * 0.016);
    const attackBuffer = this.ctx.createBuffer(1, attackSamples, this.ctx.sampleRate);
    const attackData = attackBuffer.getChannelData(0);
    for (let i = 0; i < attackSamples; i++) {
      attackData[i] = (Math.random() * 2 - 1) * Math.exp(-5 * (i / attackSamples));
    }
    const attackNode = this.ctx.createBufferSource();
    attackNode.buffer = attackBuffer;

    const attackFilter = this.ctx.createBiquadFilter();
    attackFilter.type = 'bandpass';
    attackFilter.frequency.setValueAtTime(freq * 2.5, now);
    attackFilter.Q.setValueAtTime(4.0, now);

    const attackGain = this.ctx.createGain();
    attackGain.gain.setValueAtTime(velocity * 0.7, now);
    attackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    attackNode.connect(attackFilter);
    attackFilter.connect(attackGain);

    // 2. High-Gain Detuned Dual Sawtooth + Sub Power Resonators
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const oscSub = this.ctx.createOscillator();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    oscSub.type = 'square';

    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 1.005, now); // +8 cents for thick double-tracked guitar wall
    oscSub.frequency.setValueAtTime(freq * 0.5, now); // Sub-octave for heavy chug

    const oscMix = this.ctx.createGain();
    oscMix.gain.setValueAtTime(1.0, now);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.35, now);

    osc1.connect(oscMix);
    osc2.connect(oscMix);
    oscSub.connect(subGain);
    subGain.connect(oscMix);
    attackGain.connect(oscMix);

    // 3. Pre-Drive Screamer Shaping (cuts mud below 180Hz, boosts bite at 2.2kHz)
    const preHighpass = this.ctx.createBiquadFilter();
    preHighpass.type = 'highpass';
    preHighpass.frequency.setValueAtTime(180, now);

    const preMidBoost = this.ctx.createBiquadFilter();
    preMidBoost.type = 'peaking';
    preMidBoost.frequency.setValueAtTime(2200, now);
    preMidBoost.gain.setValueAtTime(6.0, now);
    preMidBoost.Q.setValueAtTime(1.8, now);

    // Drive Gain Stage
    const driveGain = this.ctx.createGain();
    driveGain.gain.setValueAtTime(velocity * 4.5, now);

    // 4. Overdrive WaveShaper (Asymmetric 12AX7 Tube Saturation)
    const shaper = this.ctx.createWaveShaper();
    shaper.curve = this.getDistortionCurve();
    shaper.oversample = '4x';

    // 5. 4x12 Celestion Speaker Cabinet Simulation
    const cabLowpass = this.ctx.createBiquadFilter();
    cabLowpass.type = 'lowpass';
    cabLowpass.frequency.setValueAtTime(4600, now);
    cabLowpass.Q.setValueAtTime(1.2, now);

    const cabThump = this.ctx.createBiquadFilter();
    cabThump.type = 'peaking';
    cabThump.frequency.setValueAtTime(115, now);
    cabThump.gain.setValueAtTime(4.0, now);
    cabThump.Q.setValueAtTime(2.0, now);

    const cabBite = this.ctx.createBiquadFilter();
    cabBite.type = 'peaking';
    cabBite.frequency.setValueAtTime(3100, now);
    cabBite.gain.setValueAtTime(3.0, now);
    cabBite.Q.setValueAtTime(2.2, now);

    // 6. Amp Output Master Envelope
    const ampGain = this.ctx.createGain();
    ampGain.gain.setValueAtTime(0.0001, now);
    ampGain.gain.linearRampToValueAtTime(0.85, now + 0.008);
    const sustainSec = Math.max(2.2, Math.min(4.2, 500 / freq));
    ampGain.gain.exponentialRampToValueAtTime(0.0001, now + sustainSec);

    // Routing
    oscMix.connect(preHighpass);
    preHighpass.connect(preMidBoost);
    preMidBoost.connect(driveGain);
    driveGain.connect(shaper);
    shaper.connect(cabLowpass);
    cabLowpass.connect(cabThump);
    cabThump.connect(cabBite);
    cabBite.connect(ampGain);
    ampGain.connect(this.masterGain);

    attackNode.start(now);
    osc1.start(now);
    osc2.start(now);
    oscSub.start(now);

    osc1.stop(now + sustainSec + 0.1);
    osc2.stop(now + sustainSec + 0.1);
    oscSub.stop(now + sustainSec + 0.1);
  }

  /**
   * Vintage High-Gain Silicon/Germanium Fuzz (Big Muff / Fuzz Face style)
   * Hard-clipped square wave saturation with scooped midrange and endless sustain.
   */
  private playFuzzGuitar(freq: number, velocity: number) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // 1. Raw Vintage Wave Generators: Square core + detuned Sawtooth + Octave Up
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const oscOctave = this.ctx.createOscillator();

    osc1.type = 'square';
    osc2.type = 'sawtooth';
    oscOctave.type = 'sawtooth';

    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 0.996, now); // Thick detune fuzz beating
    oscOctave.frequency.setValueAtTime(freq * 2.002, now); // Upper octave fuzz screech

    const oscMix = this.ctx.createGain();
    oscMix.gain.setValueAtTime(1.0, now);

    const octaveGain = this.ctx.createGain();
    octaveGain.gain.setValueAtTime(0.3, now);

    osc1.connect(oscMix);
    osc2.connect(oscMix);
    oscOctave.connect(octaveGain);
    octaveGain.connect(oscMix);

    // 2. Pre-Fuzz Extreme Gain Multiplier
    const fuzzPreGain = this.ctx.createGain();
    fuzzPreGain.gain.setValueAtTime(velocity * 12.0, now);

    // 3. Fuzz WaveShaper with hard clipping & octave fuzz overtones
    const shaper = this.ctx.createWaveShaper();
    shaper.curve = this.getFuzzCurve();
    shaper.oversample = '4x';

    // 4. Classic Big Muff Tone Stack: Mid Scoop + Low End Thunder
    const midScoop = this.ctx.createBiquadFilter();
    midScoop.type = 'peaking';
    midScoop.frequency.setValueAtTime(950, now);
    midScoop.gain.setValueAtTime(-7.0, now); // Classic scooped mid wall-of-sound
    midScoop.Q.setValueAtTime(1.5, now);

    const lowThick = this.ctx.createBiquadFilter();
    lowThick.type = 'lowshelf';
    lowThick.frequency.setValueAtTime(160, now);
    lowThick.gain.setValueAtTime(5.0, now);

    const cabFilter = this.ctx.createBiquadFilter();
    cabFilter.type = 'lowpass';
    cabFilter.frequency.setValueAtTime(3900, now);
    cabFilter.Q.setValueAtTime(1.4, now);

    // 5. Envelope (Endless Wall of Sound Sustain)
    const fuzzAmp = this.ctx.createGain();
    fuzzAmp.gain.setValueAtTime(0.0001, now);
    fuzzAmp.gain.linearRampToValueAtTime(0.8, now + 0.005);
    const sustainSec = Math.max(2.8, Math.min(4.8, 600 / freq));
    fuzzAmp.gain.exponentialRampToValueAtTime(0.0001, now + sustainSec);

    // Routing
    oscMix.connect(fuzzPreGain);
    fuzzPreGain.connect(shaper);
    shaper.connect(midScoop);
    midScoop.connect(lowThick);
    lowThick.connect(cabFilter);
    cabFilter.connect(fuzzAmp);
    fuzzAmp.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    oscOctave.start(now);

    osc1.stop(now + sustainSec + 0.1);
    osc2.stop(now + sustainSec + 0.1);
    oscOctave.stop(now + sustainSec + 0.1);
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
      if (this.currentTimbre === 'distortion-guitar' || this.currentTimbre === 'fuzz-guitar') {
        // Heavy Rock Power Chord: D2 (73.42) + A2 (110) + D3 (146.83)
        this.pluckString(73.42, 0.95);
        setTimeout(() => this.pluckString(110.00, 0.9), 60);
        setTimeout(() => this.pluckString(146.83, 0.95), 120);
      } else {
        this.pluckString(196.00, 0.9); // G3
        setTimeout(() => this.pluckString(246.94, 0.85), 120); // B3
        setTimeout(() => this.pluckString(293.66, 0.85), 240); // D4
        setTimeout(() => this.pluckString(392.00, 0.95), 360); // G4
      }
    });
  }
}

export const soundManager = new AudioEngine();
