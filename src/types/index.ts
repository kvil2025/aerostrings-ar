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

export type PlayMode = 'theremin' | 'laser-harp' | 'draw-strings' | 'elastic-two-hands' | 'aac-communicator';

export type VirtualBackgroundMode =
  | 'camera-raw'     // Cámara web real (AR directo)
  | 'blur'           // Desenfoque cinemático tipo Google Meet / Zoom
  | 'custom-image'   // Imagen personalizada subida por el usuario
  | 'rock-concert'   // Estadio de Rock con focos móviles y torres de amplificadores
  | 'cosmic-space'   // Espacio profundo con nebulosas y estrellas animadas
  | 'rehearsal-room' // Sala de ensayo / Estudio con paneles de madera acústica
  | 'cyberpunk-city' // Ciudad Cyberpunk nocturna con neones y lluvia digital
  | 'zen-nature';    // Paisaje Zen con cordillera y lago al atardecer

export interface BackgroundSettings {
  mode: VirtualBackgroundMode;
  userPresence: number; // 0 a 1 (opacidad de la cámara web sobre el fondo)
  blurAmount: number;   // 0 a 30px para modo desenfoque
  reactiveLighting: boolean; // Si los focos/estrellas reaccionan a la música
  customImageUrl?: string | null; // URL base64 o blob de imagen personalizada
}

export type ThereminTimbre = 'classic-sine' | 'vintage-tube' | 'cosmic-scifi';
export type ThereminScale = 'continuous' | 'chromatic' | 'pentatonic';

export type AACVoiceModel = 'female-natural' | 'male-calm' | 'neutral-clear' | 'system-custom';

export interface ThereminState {
  isActive: boolean;
  frequency: number;
  volume: number;
  closestNote: string;
  closestNoteEs: string;
  cents: number;
  pitchRatio: number; // 0 to 1
  volumeRatio: number; // 0 to 1
  pitchHandPoint?: ScreenPoint | null;
  volumeHandPoint?: ScreenPoint | null;
}

export type AACCategories = 'quick-answers' | 'vital-needs' | 'feelings' | 'actions';

export interface AACCard {
  id: string;
  category: AACCategories;
  emoji: string;
  label: string;
  speechText: string;
  color: string;
  priority?: boolean;
}

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
