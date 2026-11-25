import { HandData, ScreenPoint, ThereminScale, ThereminState, ThereminTimbre } from '../types';
import { soundManager } from './AudioEngine';

const NOTE_NAMES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const NOTE_NAMES_EN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Minor Pentatonic semitones from A (A, C, D, E, G): 0, 3, 5, 7, 10
const PENTATONIC_SEMITONES = [0, 3, 5, 7, 10];

export class ThereminEngine {
  private primaryOsc: OscillatorNode | null = null;
  private harmonicOsc: OscillatorNode | null = null;
  private harmonicGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayMixGain: GainNode | null = null;
  private masterGain: GainNode | null = null;

  private isInitialized = false;
  private currentTimbre: ThereminTimbre = 'vintage-tube';
  private currentScale: ThereminScale = 'continuous';

  private currentState: ThereminState = {
    isActive: false,
    frequency: 440,
    volume: 0,
    closestNote: 'A4',
    closestNoteEs: 'La4',
    cents: 0,
    pitchRatio: 0.5,
    volumeRatio: 0,
    pitchHandPoint: null,
    volumeHandPoint: null,
  };

  private minFreq = 65.41;  // C2 (profundo y misterioso)
  private maxFreq = 1567.98; // G6 (agudo lírico de theremin)

  /**
   * Initializes audio graph inside the unlocked AudioContext
   */
  public async initAudio(): Promise<boolean> {
    if (this.isInitialized && this.primaryOsc) return true;

    await soundManager.unlockAudio();
    const ctx = soundManager.ctx;
    if (!ctx) return false;

    try {
      const now = ctx.currentTime;

      // Master Theremin Gain
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.75, now);
      this.masterGain.connect(ctx.destination);

      // Voice Gain (controlled by left volume hand)
      this.voiceGain = ctx.createGain();
      this.voiceGain.gain.setValueAtTime(0, now);

      // Warm Biquad Filter (simulates wooden body and tube heterodyning)
      this.filterNode = ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(2600, now);
      this.filterNode.Q.setValueAtTime(2.2, now);

      // Cosmic Delay / Space Reverb Loop
      this.delayNode = ctx.createDelay(1.0);
      this.delayNode.delayTime.setValueAtTime(0.24, now);

      this.delayFeedback = ctx.createGain();
      this.delayFeedback.gain.setValueAtTime(0.35, now);

      this.delayMixGain = ctx.createGain();
      this.delayMixGain.gain.setValueAtTime(0.3, now);

      // Primary Oscillator (Sine fundamental)
      this.primaryOsc = ctx.createOscillator();
      this.primaryOsc.type = 'sine';
      this.primaryOsc.frequency.setValueAtTime(440, now);

      // Harmonic Oscillator (Triangle / warm overtones)
      this.harmonicOsc = ctx.createOscillator();
      this.harmonicOsc.type = 'triangle';
      this.harmonicOsc.frequency.setValueAtTime(440, now);

      this.harmonicGain = ctx.createGain();
      this.harmonicGain.gain.setValueAtTime(0.25, now);

      // Wire Primary Voice
      this.primaryOsc.connect(this.voiceGain);
      this.harmonicOsc.connect(this.harmonicGain);
      this.harmonicGain.connect(this.voiceGain);

      // Voice -> Filter -> Master
      this.voiceGain.connect(this.filterNode);
      this.filterNode.connect(this.masterGain);

      // Filter -> Delay Loop -> Master
      this.filterNode.connect(this.delayNode);
      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      this.delayNode.connect(this.delayMixGain);
      this.delayMixGain.connect(this.masterGain);

      // Start Oscillators
      this.primaryOsc.start(now);
      this.harmonicOsc.start(now);

      this.isInitialized = true;
      this.applyTimbre();
      return true;
    } catch (e) {
      console.warn('Theremin audio init error:', e);
      return false;
    }
  }

  public setTimbre(timbre: ThereminTimbre) {
    this.currentTimbre = timbre;
    this.applyTimbre();
  }

  public getTimbre(): ThereminTimbre {
    return this.currentTimbre;
  }

  public setScale(scale: ThereminScale) {
    this.currentScale = scale;
  }

  public getScale(): ThereminScale {
    return this.currentScale;
  }

  private applyTimbre() {
    if (!this.primaryOsc || !this.harmonicOsc || !this.harmonicGain || !this.delayMixGain || !soundManager.ctx) return;
    const now = soundManager.ctx.currentTime;

    switch (this.currentTimbre) {
      case 'classic-sine':
        // Pure classic 1920s Clara Rockmore Theremin: pure sine, zero delay
        this.primaryOsc.type = 'sine';
        this.harmonicGain.gain.setTargetAtTime(0.0, now, 0.05);
        this.delayMixGain.gain.setTargetAtTime(0.0, now, 0.05);
        if (this.filterNode) this.filterNode.frequency.setTargetAtTime(3500, now, 0.05);
        break;

      case 'vintage-tube':
        // Warm Moog Etherwave: Sine + Triangle 2nd harmonic, subtle space
        this.primaryOsc.type = 'sine';
        this.harmonicOsc.type = 'triangle';
        this.harmonicGain.gain.setTargetAtTime(0.28, now, 0.05);
        this.delayMixGain.gain.setTargetAtTime(0.22, now, 0.05);
        if (this.filterNode) this.filterNode.frequency.setTargetAtTime(2600, now, 0.05);
        break;

      case 'cosmic-scifi':
        // 1950s Sci-Fi Alien Theremin: rich harmonics, high resonance & cosmic delay
        this.primaryOsc.type = 'sine';
        this.harmonicOsc.type = 'sawtooth';
        this.harmonicGain.gain.setTargetAtTime(0.22, now, 0.05);
        this.delayMixGain.gain.setTargetAtTime(0.48, now, 0.05);
        if (this.filterNode) {
          this.filterNode.frequency.setTargetAtTime(2200, now, 0.05);
          this.filterNode.Q.setTargetAtTime(3.8, now, 0.05);
        }
        break;
    }
  }

  /**
   * Updates Theremin based on live camera hand landmarks
   */
  public update(hands: HandData[], width: number, height: number): ThereminState {
    if (!this.isInitialized) {
      this.initAudio();
    }

    const ctx = soundManager.ctx;
    if (!ctx) return this.currentState;
    const now = ctx.currentTime;

    // Zero hands in frame -> fade to silence
    if (hands.length === 0) {
      if (this.voiceGain) {
        this.voiceGain.gain.setTargetAtTime(0, now, 0.06);
      }
      this.currentState = {
        ...this.currentState,
        isActive: false,
        volume: 0,
        volumeRatio: 0,
        pitchHandPoint: null,
        volumeHandPoint: null,
      };
      return this.currentState;
    }

    let pitchHandPoint: ScreenPoint | null = null;
    let volumeHandPoint: ScreenPoint | null = null;
    let rawPitchRatio = 0.5;
    let rawVolRatio = 0;

    if (hands.length >= 2) {
      // Canon 2-Hands Theremin Setup:
      // Right-side hand = Pitch Antenna (approaching right edge increases pitch)
      // Left-side hand = Volume Loop (raising hand from bottom loop increases volume)
      const sortedByX = [...hands].sort((a, b) => a.palmCenter.x - b.palmCenter.x);
      const leftHand = sortedByX[0];
      const rightHand = sortedByX[sortedByX.length - 1];

      pitchHandPoint = rightHand.indexTip;
      volumeHandPoint = leftHand.palmCenter;

      // Pitch calculation: distance to right pitch rod (rod is at X = width * 0.90)
      // Hand X ranges from width * 0.25 to width * 0.88
      const minPitchX = width * 0.22;
      const maxPitchX = width * 0.88;
      rawPitchRatio = Math.max(0, Math.min(1, (pitchHandPoint.x - minPitchX) / (maxPitchX - minPitchX)));

      // Volume calculation: distance above left volume loop (loop is at Y = height * 0.80)
      // Raising hand towards height * 0.18 increases volume
      const loopY = height * 0.80;
      const topVolY = height * 0.18;
      const heightAboveLoop = loopY - volumeHandPoint.y;
      const maxVolHeight = loopY - topVolY;
      rawVolRatio = Math.max(0, Math.min(1, heightAboveLoop / maxVolHeight));

      // If hand is below the loop or pinching, mute cleanly
      if (volumeHandPoint.y > loopY || leftHand.isPinching) {
        rawVolRatio = 0;
      }
    } else {
      // Intuitive 1-Hand Setup:
      // X = Pitch, Y = Volume
      const singleHand = hands[0];
      pitchHandPoint = singleHand.indexTip;
      volumeHandPoint = singleHand.wrist;

      const minPitchX = width * 0.15;
      const maxPitchX = width * 0.85;
      rawPitchRatio = Math.max(0, Math.min(1, (pitchHandPoint.x - minPitchX) / (maxPitchX - minPitchX)));

      // Y: Top = 1.0 (loud), Bottom = 0.0 (silent)
      const topY = height * 0.15;
      const bottomY = height * 0.85;
      rawVolRatio = Math.max(0, Math.min(1, (bottomY - pitchHandPoint.y) / (bottomY - topY)));
      if (singleHand.isPinching) {
        rawVolRatio = 0;
      }
    }

    // Exponential pitch mapping
    let targetFreq = this.minFreq * Math.pow(this.maxFreq / this.minFreq, rawPitchRatio);

    // Apply Musical Scale Quantize if requested
    if (this.currentScale === 'chromatic') {
      const midi = 12 * Math.log2(targetFreq / 440) + 69;
      const nearestMidi = Math.round(midi);
      targetFreq = 440 * Math.pow(2, (nearestMidi - 69) / 12);
    } else if (this.currentScale === 'pentatonic') {
      const midi = 12 * Math.log2(targetFreq / 440) + 69;
      const octaveBase = Math.floor(midi / 12) * 12;
      const semitone = ((Math.round(midi) % 12) + 12) % 12;
      // Find closest pentatonic semitone
      let closestSemi = PENTATONIC_SEMITONES[0];
      let minDiff = 999;
      for (const s of PENTATONIC_SEMITONES) {
        const diff = Math.abs(s - semitone);
        if (diff < minDiff) {
          minDiff = diff;
          closestSemi = s;
        }
      }
      const nearestPentatonicMidi = octaveBase + closestSemi;
      targetFreq = 440 * Math.pow(2, (nearestPentatonicMidi - 69) / 12);
    }

    // Perceptual exponential volume curve (squared)
    const targetVol = Math.pow(rawVolRatio, 1.8) * 0.9;

    // Update Web Audio nodes smoothly with targetAtTime (zero clicks, organic glissando)
    if (this.primaryOsc && this.harmonicOsc && this.voiceGain && this.masterGain) {
      this.masterGain.gain.setValueAtTime(0.75, now);
      // 32ms smoothing provides immediate response while retaining natural hand vibrato
      this.primaryOsc.frequency.setTargetAtTime(targetFreq, now, 0.032);
      this.harmonicOsc.frequency.setTargetAtTime(targetFreq, now, 0.032);
      this.voiceGain.gain.setTargetAtTime(targetVol, now, 0.04);
    }

    // Calculate nearest musical note and cents deviation
    const noteInfo = this.calculateNoteInfo(targetFreq);

    this.currentState = {
      isActive: targetVol > 0.01,
      frequency: targetFreq,
      volume: targetVol,
      closestNote: noteInfo.note,
      closestNoteEs: noteInfo.noteEs,
      cents: noteInfo.cents,
      pitchRatio: rawPitchRatio,
      volumeRatio: rawVolRatio,
      pitchHandPoint,
      volumeHandPoint,
    };

    return this.currentState;
  }

  /**
   * Calculates pitch notes and microtonal cents
   */
  private calculateNoteInfo(freq: number) {
    const midi = 12 * Math.log2(freq / 440) + 69;
    const roundedMidi = Math.round(midi);
    const cents = Math.round((midi - roundedMidi) * 100);
    const noteIndex = ((roundedMidi % 12) + 12) % 12;
    const octave = Math.floor(roundedMidi / 12) - 1;
    return {
      note: `${NOTE_NAMES_EN[noteIndex]}${octave}`,
      noteEs: `${NOTE_NAMES[noteIndex]}${octave}`,
      cents,
    };
  }

  /**
   * Cleanly mutes sound when leaving Theremin mode (Strict Isolation)
   */
  public stop() {
    if (soundManager.ctx) {
      const now = soundManager.ctx.currentTime;
      if (this.voiceGain) {
        this.voiceGain.gain.cancelScheduledValues(now);
        this.voiceGain.gain.setValueAtTime(0, now);
      }
      if (this.masterGain) {
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(0, now);
      }
    }
    this.currentState = {
      ...this.currentState,
      isActive: false,
      volume: 0,
      volumeRatio: 0,
      pitchHandPoint: null,
      volumeHandPoint: null,
    };
  }

  public getState(): ThereminState {
    return this.currentState;
  }
}

export const thereminEngine = new ThereminEngine();
