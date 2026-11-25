import React, { useEffect, useRef } from 'react';
import { AeroString, HandData, Particle, PlayMode, ScreenPoint } from '../types';
import { distance2D, pointToSegmentDistance, segmentsIntersect } from '../utils/geometry';
import { soundManager } from '../audio/AudioEngine';

interface CanvasRendererProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  hands: HandData[];
  strings: AeroString[];
  playMode: PlayMode;
  onAddString: (newString: AeroString) => void;
  onUpdateStrings: (updater: (prev: AeroString[]) => AeroString[]) => void;
  onPluck: (stringData: { note: string; freq: number; length: number }) => void;
  currentNoteHover: string | null;
  setCurrentNoteHover: (note: string | null) => void;
}

// Landmark connectivity pairs for hands
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [9, 13], [13, 14], [14, 15], [15, 16],// Ring
  [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [0, 17],                              // Palm base
];

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  videoRef,
  hands,
  strings,
  playMode,
  onAddString,
  onUpdateStrings,
  onPluck,
  setCurrentNoteHover,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draftStartRef = useRef<ScreenPoint | null>(null);
  const previousIndexTipsRef = useRef<Map<string, ScreenPoint>>(new Map());
  const particlesRef = useRef<Particle[]>([]);
  const lastElasticPluckTimeRef = useRef<number>(0);

  // Trigger burst of sparks
  const spawnSparks = (x: number, y: number, color = '#00f2ff', count = 16) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        life: 1.0,
        maxLife: Math.random() * 20 + 20,
        color,
        size: Math.random() * 3 + 2,
      });
    }
  };

  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Sync canvas resolution with display size
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const now = performance.now();

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Mirrored Video Feed
      if (video.readyState >= 2) {
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, width, height);
        ctx.restore();

        // Dark subtle overlay for holographic contrast
        ctx.fillStyle = 'rgba(5, 5, 12, 0.55)';
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Process Hand Interactions and Gestures
      let activePinchPoint: ScreenPoint | null = null;
      const currentIndexTips: Map<string, ScreenPoint> = new Map();

      hands.forEach((hand, hIdx) => {
        const handKey = `${hand.handedness}-${hIdx}`;
        currentIndexTips.set(handKey, hand.indexTip);

        if (hand.isPinching) {
          activePinchPoint = hand.pinchPoint;
        }

        // Check pluck against active strings (using finger tip crossing trajectory)
        const prevTip = previousIndexTipsRef.current.get(handKey);

        if (prevTip) {
          strings.forEach((str) => {
            // Check segment intersection or proximity
            const intersectCheck = segmentsIntersect(prevTip, hand.indexTip, str.start, str.end);
            const proximity = pointToSegmentDistance(hand.indexTip, str.start, str.end);

            const crossed = intersectCheck.intersects;
            const brushed = proximity.distance < 14;

            if (crossed || brushed) {
              // Debounce pluck (at least 90ms between plucks of the same string)
              if (now - str.lastPluckedTime > 90) {
                const contactPoint = intersectCheck.intersection || proximity.projection;
                str.lastPluckedTime = now;
                str.vibrationAmplitude = 1.0;

                // Sound
                soundManager.pluckString(str.frequency, 0.85);
                onPluck({ note: str.noteName, freq: str.frequency, length: str.length });

                // Sparks
                spawnSparks(contactPoint.x, contactPoint.y, str.color, 18);
              }
            }
          });
        }
      });

      // Update previous tips for next frame
      previousIndexTipsRef.current = currentIndexTips;

      // 3. Handle Mode-Specific Mechanics
      if (playMode === 'draw-strings') {
        // Drawing logic
        if (activePinchPoint) {
          const pinchPt = activePinchPoint as ScreenPoint;
          if (!draftStartRef.current) {
            // Pinch started: anchor start point
            draftStartRef.current = pinchPt;
          } else {
            // Dragging: render draft neon line
            const currentDraftEnd = pinchPt;
            const draftLen = distance2D(draftStartRef.current, currentDraftEnd);
            const { freq, noteName } = soundManager.calculateFrequencyFromLength(draftLen);
            setCurrentNoteHover(`${noteName} (${Math.round(freq)} Hz) — ${Math.round(draftLen)}px`);

            // Draw Draft Line
            ctx.save();
            ctx.beginPath();
            ctx.setLineDash([8, 6]);
            ctx.moveTo(draftStartRef.current.x, draftStartRef.current.y);
            ctx.lineTo(currentDraftEnd.x, currentDraftEnd.y);
            ctx.strokeStyle = '#00f2ff';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#00f2ff';
            ctx.shadowBlur = 15;
            ctx.stroke();

            // Reticle badge at drafting tip
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(currentDraftEnd.x, currentDraftEnd.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#00f2ff';
            ctx.fill();

            // Floating note label
            ctx.font = '600 13px "JetBrains Mono", monospace';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(
              `${noteName} [${Math.round(draftLen)}px]`,
              currentDraftEnd.x + 15,
              currentDraftEnd.y - 12
            );
            ctx.restore();
          }
        } else if (draftStartRef.current) {
          // Pinch released: commit string if long enough
          const endPoint = hands.length > 0 ? hands[0].indexTip : null;
          if (endPoint) {
            const finalLength = distance2D(draftStartRef.current, endPoint);
            if (finalLength > 40) {
              const { freq, noteName } = soundManager.calculateFrequencyFromLength(finalLength);
              const newString: AeroString = {
                id: `str-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                start: draftStartRef.current,
                end: endPoint,
                length: finalLength,
                frequency: freq,
                noteName,
                color: '#00f2ff',
                createdAt: Date.now(),
                lastPluckedTime: 0,
                vibrationAmplitude: 0,
                vibrationPhase: 0,
              };
              onAddString(newString);
              // Play initial sample note on create
              soundManager.pluckString(freq, 0.7);
              spawnSparks((draftStartRef.current.x + endPoint.x) / 2, (draftStartRef.current.y + endPoint.y) / 2, '#00f2ff', 24);
            }
          }
          draftStartRef.current = null;
          setCurrentNoteHover(null);
        }
      } else if (playMode === 'elastic-two-hands') {
        // Two-hands elastic string
        if (hands.length >= 2) {
          const h1 = hands[0].indexTip;
          const h2 = hands[1].indexTip;
          const len = distance2D(h1, h2);
          const { freq, noteName } = soundManager.calculateFrequencyFromLength(len, 80, 800);
          setCurrentNoteHover(`${noteName} (${Math.round(freq)} Hz) — Distancia: ${Math.round(len)}px`);

          // Draw vibrant elastic laser beam between hands
          ctx.save();
          const gradient = ctx.createLinearGradient(h1.x, h1.y, h2.x, h2.y);
          gradient.addColorStop(0, '#00f2ff');
          gradient.addColorStop(0.5, '#EF3800');
          gradient.addColorStop(1, '#00f2ff');

          // Core beam
          ctx.beginPath();
          ctx.moveTo(h1.x, h1.y);
          ctx.lineTo(h2.x, h2.y);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 4;
          ctx.shadowColor = '#00f2ff';
          ctx.shadowBlur = 20;
          ctx.stroke();

          // Outer laser aura
          ctx.beginPath();
          ctx.moveTo(h1.x, h1.y);
          ctx.lineTo(h2.x, h2.y);
          ctx.strokeStyle = 'rgba(239, 56, 0, 0.4)';
          ctx.lineWidth = 12;
          ctx.stroke();

          // Center HUD badge
          const midX = (h1.x + h2.x) / 2;
          const midY = (h1.y + h2.y) / 2;

          ctx.fillStyle = 'rgba(13, 37, 96, 0.85)';
          ctx.strokeStyle = '#00f2ff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(midX - 60, midY - 24, 120, 36, 8);
          ctx.fill();
          ctx.stroke();

          ctx.font = 'bold 14px "JetBrains Mono", monospace';
          ctx.fillStyle = '#00f2ff';
          ctx.textAlign = 'center';
          ctx.fillText(`${noteName} • ${Math.round(len)}px`, midX, midY);

          // Pluck check: if any hand's thumb touches index or shakes
          const isTriggered = hands.some((h) => h.isPinching);
          if (isTriggered && now - lastElasticPluckTimeRef.current > 180) {
            lastElasticPluckTimeRef.current = now;
            soundManager.pluckString(freq, 0.9);
            spawnSparks(midX, midY, '#EF3800', 25);
            onPluck({ note: noteName, freq, length: len });
          }
          ctx.restore();
        } else {
          setCurrentNoteHover('Coloca ambas manos frente a la cámara para tensar la cuerda');
        }
      }

      // 4. Render Active Floating Strings with Dynamic Physical Vibration
      strings.forEach((str) => {
        ctx.save();
        const timeSincePluck = now - str.lastPluckedTime;
        const isVibrating = timeSincePluck < 1500;

        const dx = str.end.x - str.start.x;
        const dy = str.end.y - str.start.y;
        const angle = Math.atan2(dy, dx);
        const normalX = -Math.sin(angle);
        const normalY = Math.cos(angle);

        // Calculate damped vibration displacement
        const decay = Math.exp(-timeSincePluck / 320); // damping factor
        const maxDisplacement = isVibrating ? 14 * decay * Math.sin(timeSincePluck * 0.08) : 0;

        ctx.beginPath();
        const segments = 16;
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          // Sine standing wave pattern: 0 at ends, peak at center
          const wave = Math.sin(Math.PI * t);
          const disp = wave * maxDisplacement;
          const px = str.start.x + dx * t + normalX * disp;
          const py = str.start.y + dy * t + normalY * disp;

          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }

        // Glow Layer
        ctx.strokeStyle = isVibrating ? '#f59e0b' : str.color;
        ctx.lineWidth = isVibrating ? 5 : 3.5;
        ctx.shadowColor = isVibrating ? '#f59e0b' : '#00f2ff';
        ctx.shadowBlur = isVibrating ? 24 : 12;
        ctx.stroke();

        // Inner white filament
        ctx.beginPath();
        ctx.moveTo(str.start.x, str.start.y);
        ctx.lineTo(str.end.x, str.end.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // End anchor nodes
        ctx.fillStyle = '#00f2ff';
        ctx.beginPath();
        ctx.arc(str.start.x, str.start.y, 4, 0, Math.PI * 2);
        ctx.arc(str.end.x, str.end.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // String Note Badge
        const midX = (str.start.x + str.end.x) / 2;
        const midY = (str.start.y + str.end.y) / 2;
        ctx.font = '500 11px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(13, 37, 96, 0.85)';
        ctx.beginPath();
        ctx.roundRect(midX - 22, midY - 14, 44, 18, 4);
        ctx.fill();
        ctx.fillStyle = isVibrating ? '#f59e0b' : '#00f2ff';
        ctx.textAlign = 'center';
        ctx.fillText(str.noteName, midX, midY);

        ctx.restore();
      });

      // 5. Render Hands (Futuristic Cyber Skeleton)
      hands.forEach((hand) => {
        ctx.save();
        const screenLandmarks = hand.landmarks.map((lm) => ({
          x: lm.x * width,
          y: lm.y * height,
        }));

        // Draw bone lines
        ctx.strokeStyle = 'rgba(0, 242, 255, 0.35)';
        ctx.lineWidth = 2;
        HAND_CONNECTIONS.forEach(([i, j]) => {
          const p1 = screenLandmarks[i];
          const p2 = screenLandmarks[j];
          if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });

        // Draw joint nodes
        screenLandmarks.forEach((pt, idx) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, idx === 8 ? 6 : 3, 0, Math.PI * 2);
          ctx.fillStyle = idx === 8 ? '#EF3800' : 'rgba(0, 242, 255, 0.8)';
          ctx.fill();
        });

        // Index Fingertip "Pick" Halo
        const indexTip = hand.indexTip;
        ctx.beginPath();
        ctx.arc(indexTip.x, indexTip.y, 10, 0, Math.PI * 2);
        ctx.strokeStyle = '#EF3800';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#EF3800';
        ctx.shadowBlur = 12;
        ctx.stroke();

        // Pinch Reticle Indicator
        if (hand.isPinching) {
          ctx.beginPath();
          ctx.arc(hand.pinchPoint.x, hand.pinchPoint.y, 16, 0, Math.PI * 2);
          ctx.strokeStyle = '#00f2ff';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#00f2ff';
          ctx.shadowBlur = 18;
          ctx.stroke();

          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.fillStyle = '#00f2ff';
          ctx.fillText('PINCH', hand.pinchPoint.x + 20, hand.pinchPoint.y + 4);
        }

        ctx.restore();
      });

      // 6. Render Particle Sparks
      const activeParticles: Particle[] = [];
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // subtle gravity
        p.life -= 1 / p.maxLife;

        if (p.life > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.globalAlpha = p.life;
          ctx.fill();
          ctx.restore();
          activeParticles.push(p);
        }
      });
      particlesRef.current = activeParticles;

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [hands, strings, playMode, onAddString, onUpdateStrings, onPluck, setCurrentNoteHover, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full object-cover z-10 cursor-crosshair"
    />
  );
};
