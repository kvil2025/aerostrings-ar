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
}

export interface AeroString {
  id: string;
  start: ScreenPoint;
  end: ScreenPoint;
  length: number; // in pixels
  frequency: number; // in Hz
  noteName: string;
  color: string;
  createdAt: number;
  lastPluckedTime: number;
  vibrationAmplitude: number; // 0 to 1 decay
  vibrationPhase: number;
}

export type PlayMode = 'draw-strings' | 'elastic-two-hands' | 'laser-harp';

export type InstrumentTimbre = 'acoustic-guitar' | 'electric-lead' | 'crystal-harp' | 'deep-bass';

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
