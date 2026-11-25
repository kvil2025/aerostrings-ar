export interface Point3D {
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized
  z: number; // relative depth
}

export interface ScreenPoint {
  x: number; // pixel coords
  y: number; // pixel coords
}

export interface HandData {
  landmarks: Point3D[];
  handedness: 'Left' | 'Right';
  isPinching: boolean;
  pinchPoint: ScreenPoint;
  indexTip: ScreenPoint;
  thumbTip: ScreenPoint;
  wrist: ScreenPoint;
  palmCenter: ScreenPoint;
  velocity?: ScreenPoint;
}

export interface AeroString {
  id: string;
  start: ScreenPoint;
  end: ScreenPoint;
  pathPoints?: ScreenPoint[];
  length: number; // in pixels
  frequency: number; // in Hz
  noteName: string;
  color: string;
  createdAt: number;
  lastPluckedTime: number;
  vibrationAmplitude: number; // 0 to 1 decay
  vibrationPhase: number;
  pullPoint?: ScreenPoint | null;
  pullDisplacement?: number;
}

export type PlayMode = 'air-drums' | 'draw-strings' | 'elastic-two-hands' | 'laser-harp';

export type InstrumentTimbre = 
  | 'distortion-guitar'
  | 'fuzz-guitar'
  | 'acoustic-guitar' 
  | 'electric-lead' 
  | 'crystal-harp' 
  | 'deep-bass';

export type DrumType = 
  | 'kick' 
  | 'snare' 
  | 'hihat-closed' 
  | 'hihat-open' 
  | 'tom-high' 
  | 'tom-low' 
  | 'crash' 
  | 'ride';

export interface DrumPad {
  id: string;
  name: string;
  shortName: string;
  type: DrumType;
  relX: number; // 0..1
  relY: number; // 0..1
  relRadius: number; // 0..1 relative to min dimension
  color: string;
  lastHitTime: number;
  hitVelocity: number;
  keyTrigger: string;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  life: number; // 1 down to 0
  maxLife: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 1 down to 0
  maxLife: number;
  color: string;
  size: number;
}
