import { DrumType } from '../types';
import { soundManager } from './AudioEngine';

export class DrumsEngine {
  public trigger(type: DrumType, velocity = 0.9) {
    soundManager.unlockAudio().then(() => {
      const ctx = soundManager.ctx;
      if (!ctx || ctx.state !== 'running') return;

      const clampedVel = Math.max(0.2, Math.min(1.0, velocity));

      switch (type) {
        case 'kick':
          this.playKick(ctx, clampedVel);
          break;
        case 'snare':
          this.playSnare(ctx, clampedVel);
          break;
        case 'hihat-closed':
          this.playHiHat(ctx, clampedVel, 0.06);
          break;
        case 'hihat-open':
          this.playHiHat(ctx, clampedVel, 0.65);
          break;
        case 'tom-high':
          this.playTom(ctx, clampedVel, 180, 110, 0.35);
          break;
        case 'tom-low':
          this.playTom(ctx, clampedVel, 115, 65, 0.55);
          break;
        case 'crash':
          this.playCrash(ctx, clampedVel);
          break;
        case 'ride':
          this.playRide(ctx, clampedVel);
          break;
      }
    });
  }

  /**
   * Powerful punchy Kick Drum (Beater Click + Sub-bass Body)
   */
  private playKick(ctx: AudioContext, velocity: number) {
    const now = ctx.currentTime;

    // Body Oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.08);

    gain.gain.setValueAtTime(velocity * 1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    // Beater Attack Click (Transient)
    const clickBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.01), ctx.sampleRate);
    const clickData = clickBuffer.getChannelData(0);
    for (let i = 0; i < clickData.length; i++) {
      clickData[i] = (Math.random() * 2 - 1) * Math.exp(-8 * (i / clickData.length));
    }
    const clickSource = ctx.createBufferSource();
    clickSource.buffer = clickBuffer;

    const clickFilter = ctx.createBiquadFilter();
    clickFilter.type = 'bandpass';
    clickFilter.frequency.setValueAtTime(2500, now);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(velocity * 0.7, now);

    clickSource.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(ctx.destination);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    clickSource.start(now);
    osc.stop(now + 0.5);
    clickSource.stop(now + 0.02);
  }

  /**
   * Acoustic Snare Drum (Skin Resonance + Snare Wire Noise)
   */
  private playSnare(ctx: AudioContext, velocity: number) {
    const now = ctx.currentTime;

    // 1. Drum Tone
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(170, now + 0.08);

    oscGain.gain.setValueAtTime(velocity * 0.7, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    // 2. Snare Wire Sizzle (Filtered Noise)
    const noiseSamples = Math.floor(ctx.sampleRate * 0.28);
    const noiseBuffer = ctx.createBuffer(1, noiseSamples, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseSamples; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1400, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(velocity * 0.9, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    osc.start(now);
    noiseSource.start(now);
    osc.stop(now + 0.2);
    noiseSource.stop(now + 0.3);
  }

  /**
   * Hi-Hat (Closed / Open metallic cymbal)
   */
  private playHiHat(ctx: AudioContext, velocity: number, duration: number) {
    const now = ctx.currentTime;

    // Metallic Inharmonic Frequencies
    const freqs = [205, 305, 415, 540, 680, 830];
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(9500, now);
    bandpass.Q.setValueAtTime(3.5, now);

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(7000, now);

    const envGain = ctx.createGain();
    envGain.gain.setValueAtTime(velocity * 0.85, now);
    envGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f * 3.2, now);
      osc.connect(bandpass);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    });

    bandpass.connect(highpass);
    highpass.connect(envGain);
    envGain.connect(ctx.destination);
  }

  /**
   * Tom-Tom Drum (Acoustic Pitch Drop)
   */
  private playTom(ctx: AudioContext, velocity: number, startFreq: number, endFreq: number, decay: number) {
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + decay * 0.6);

    gain.gain.setValueAtTime(velocity * 0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + decay + 0.05);
  }

  /**
   * Crash Cymbal (Explosive Metallic Shimmer)
   */
  private playCrash(ctx: AudioContext, velocity: number) {
    const now = ctx.currentTime;
    const duration = 1.9;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(6500, now);
    filter.Q.setValueAtTime(1.2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(velocity * 0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(now);
    source.stop(now + duration + 0.1);
  }

  /**
   * Ride Cymbal (Clear Metallic Bell Ping)
   */
  private playRide(ctx: AudioContext, velocity: number) {
    const now = ctx.currentTime;
    const duration = 1.4;

    // Ping Harmonic Chimes
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(860, now);
    osc2.frequency.setValueAtTime(1420, now);

    const pingGain = ctx.createGain();
    pingGain.gain.setValueAtTime(velocity * 0.8, now);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(pingGain);
    osc2.connect(pingGain);
    pingGain.connect(ctx.destination);

    // Wash Shimmer
    const noiseSamples = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, noiseSamples, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseSamples; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, now);

    const washGain = ctx.createGain();
    washGain.gain.setValueAtTime(velocity * 0.4, now);
    washGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(filter);
    filter.connect(washGain);
    washGain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    noise.start(now);

    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
    noise.stop(now + duration + 0.1);
  }
}

export const drumsManager = new DrumsEngine();
