import { InstrumentTimbre } from '../types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private isInitialized = false;
  private currentTimbre: InstrumentTimbre = 'acoustic-guitar';
  private scaleNotes = [
    // Frequencies and note names for C Minor Pentatonic across 3 octaves
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
    // Lazy init on first user click or gesture
  }

  public async init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    // Safety master compressor
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(10, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

    // Synthetic Impulse Reverb for spatial air ambiance
    this.reverbConvolver = this.createSyntheticReverb(this.ctx, 1.8, 2.0);

    const dryGain = this.ctx.createGain();
    dryGain.gain.setValueAtTime(0.75, this.ctx.currentTime);

    const wetGain = this.ctx.createGain();
    wetGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

    this.masterGain.connect(dryGain);
    this.masterGain.connect(this.reverbConvolver);
    this.reverbConvolver.connect(wetGain);

    dryGain.connect(this.compressor);
    wetGain.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);

    this.isInitialized = true;
  }

  public setTimbre(timbre: InstrumentTimbre) {
    this.currentTimbre = timbre;
  }

  public setMasterVolume(vol: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Maps a string length (in pixels) to a musical note and frequency.
   * Longer string = lower pitch (bass), shorter string = higher pitch (harp/guitar solo).
   */
  public calculateFrequencyFromLength(lengthPx: number, minPx = 60, maxPx = 750): { freq: number; noteName: string } {
    const clampedLength = Math.max(minPx, Math.min(maxPx, lengthPx));
    // Inverted ratio: 0 (shortest, highest pitch) to 1 (longest, lowest pitch)
    const ratio = (clampedLength - minPx) / (maxPx - minPx);

    // Map into the scaleNotes array from highest note (index 0 reversed) to lowest
    const noteIndex = Math.floor((1 - ratio) * (this.scaleNotes.length - 1));
    const selected = this.scaleNotes[noteIndex] || this.scaleNotes[0];

    return {
      freq: selected.freq,
      noteName: selected.note,
    };
  }

  /**
   * Plucks a string with given frequency and velocity (0..1)
   */
  public pluckString(freq: number, velocity = 0.8) {
    if (!this.ctx || !this.masterGain) {
      this.init().then(() => this.pluckString(freq, velocity));
      return;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    switch (this.currentTimbre) {
      case 'acoustic-guitar':
        this.playKarplusStrong(freq, velocity);
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
   * Karplus-Strong physical plucked string synthesis algorithm.
   * Simulates real acoustic nylon/steel strings.
   */
  private playKarplusStrong(freq: number, velocity: number) {
    if (!this.ctx || !this.masterGain) return;

    const sampleRate = this.ctx.sampleRate;
    const periodSamples = Math.round(sampleRate / freq);
    if (periodSamples <= 0) return;

    // Excitation noise buffer (finger/pick pluck)
    const noiseBuffer = this.ctx.createBuffer(1, periodSamples, sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < periodSamples; i++) {
      // Pinkish shaped noise burst
      output[i] = (Math.random() * 2 - 1) * Math.exp(-3 * (i / periodSamples));
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    // Delay loop for fundamental frequency
    const delayNode = this.ctx.createDelay();
    delayNode.delayTime.setValueAtTime(1 / freq, this.ctx.currentTime);

    // Feedback gain (damping sustain factor)
    const feedbackGain = this.ctx.createGain();
    const sustain = 0.985 - (freq / 4000) * 0.05; // High frequencies decay faster
    feedbackGain.gain.setValueAtTime(Math.max(0.9, Math.min(0.99, sustain)), this.ctx.currentTime);

    // Lowpass filter in the loop (simulates string wood dispersion)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(freq * 6, 8000), this.ctx.currentTime);

    // Envelope gain
    const envGain = this.ctx.createGain();
    envGain.gain.setValueAtTime(velocity * 0.9, this.ctx.currentTime);
    envGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 3.0);

    // Connections
    noiseSource.connect(delayNode);
    delayNode.connect(filter);
    filter.connect(feedbackGain);
    feedbackGain.connect(delayNode); // feedback loop

    filter.connect(envGain);
    envGain.connect(this.masterGain);

    noiseSource.start(this.ctx.currentTime);
    noiseSource.stop(this.ctx.currentTime + (1 / freq));

    // Cleanup after decay
    setTimeout(() => {
      try {
        noiseSource.disconnect();
        delayNode.disconnect();
        filter.disconnect();
        feedbackGain.disconnect();
        envGain.disconnect();
      } catch {
        // ignore
      }
    }, 3200);
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
    osc2.frequency.setValueAtTime(freq * 1.003, now); // slight detune for chorus richness

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 2, now);
    filter.frequency.exponentialRampToValueAtTime(freq * 6, now + 0.04);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.2, now + 1.2);
    filter.Q.setValueAtTime(6, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(velocity * 0.7, now + 0.015);
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
    harmonic2.frequency.setValueAtTime(freq * 3, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(velocity * 0.6, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

    const harmGain = this.ctx.createGain();
    harmGain.gain.setValueAtTime(0.3, now);

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
    gain.gain.linearRampToValueAtTime(velocity * 0.8, now + 0.02);
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
   * Generates a spatial stereo reverb impulse response
   */
  private createSyntheticReverb(ctx: AudioContext, duration: number, decay: number): ConvolverNode {
    const convolver = ctx.createConvolver();
    const rate = ctx.sampleRate;
    const length = rate * duration;
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / rate;
      const factor = Math.exp(-t * decay);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }

    convolver.buffer = impulse;
    return convolver;
  }
}

export const soundManager = new AudioEngine();
