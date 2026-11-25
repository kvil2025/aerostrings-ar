import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { HandData, ScreenPoint, Point3D } from '../types';

export class HandTracker {
  private handLandmarker: HandLandmarker | null = null;
  private isModelLoading = false;
  private isReady = false;
  private lastVideoTime = -1;

  public async initialize(onProgress?: (msg: string) => void): Promise<boolean> {
    if (this.isReady) return true;
    if (this.isModelLoading) return false;

    this.isModelLoading = true;
    try {
      onProgress?.('Cargando acelerador WebAssembly de Google MediaPipe...');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
      );

      onProgress?.('Descargando modelo neuronal de detección de manos...');
      try {
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.65,
          minHandPresenceConfidence: 0.65,
          minTrackingConfidence: 0.6,
        });
      } catch (gpuErr) {
        console.warn('Fallo GPU delegate, reintentando con CPU...', gpuErr);
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });
      }

      this.isReady = true;
      this.isModelLoading = false;
      onProgress?.('Sistema de visión listo');
      return true;
    } catch (err) {
      console.error('Error inicializando MediaPipe HandLandmarker:', err);
      this.isModelLoading = false;
      return false;
    }
  }

  public detectHands(video: HTMLVideoElement, width: number, height: number): HandData[] {
    if (!this.handLandmarker || !this.isReady) return [];
    if (video.readyState < 2) return [];

    let results: HandLandmarkerResult | null = null;
    const nowInMs = performance.now();
    if (video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = video.currentTime;
      results = this.handLandmarker.detectForVideo(video, nowInMs);
    }

    if (!results || !results.landmarks || results.landmarks.length === 0) {
      return [];
    }

    const hands: HandData[] = [];

    for (let h = 0; h < results.landmarks.length; h++) {
      const landmarks3D: Point3D[] = results.landmarks[h].map((lm) => ({
        // Note: We mirror X because webcams are mirrored for natural UX
        x: 1 - lm.x,
        y: lm.y,
        z: lm.z,
      }));

      const toScreen = (pt: Point3D): ScreenPoint => ({
        x: pt.x * width,
        y: pt.y * height,
      });

      const thumbTip3D = landmarks3D[4];
      const indexTip3D = landmarks3D[8];
      const wrist3D = landmarks3D[0];
      const middleMcp3D = landmarks3D[9];

      // Euclidean distance in normalized 3D space between thumb & index tips
      const pinchDist = Math.hypot(
        thumbTip3D.x - indexTip3D.x,
        thumbTip3D.y - indexTip3D.y,
        thumbTip3D.z - indexTip3D.z
      );

      // Pinch threshold: < 0.055 is a pinch
      const isPinching = pinchDist < 0.055;

      const thumbTip = toScreen(thumbTip3D);
      const indexTip = toScreen(indexTip3D);
      const pinchPoint: ScreenPoint = {
        x: (thumbTip.x + indexTip.x) / 2,
        y: (thumbTip.y + indexTip.y) / 2,
      };

      const wrist = toScreen(wrist3D);
      const palmCenter = toScreen(middleMcp3D);

      const handednessStr = results.handednesses?.[h]?.[0]?.categoryName === 'Left' ? 'Right' : 'Left'; // Invert due to mirroring

      hands.push({
        landmarks: landmarks3D,
        handedness: handednessStr as 'Left' | 'Right',
        isPinching,
        pinchPoint,
        indexTip,
        thumbTip,
        wrist,
        palmCenter,
      });
    }

    return hands;
  }
}

export const handTracker = new HandTracker();
