import React, { useEffect, useRef } from 'react';
import { AeroString, DrumPad, HandData, Particle, PlayMode, ScreenPoint, Shockwave } from '../types';
import { distance2D, pointToSegmentDistance } from '../utils/geometry';
import { soundManager } from '../audio/AudioEngine';
import { drumsManager } from '../audio/DrumsEngine';

interface CanvasRendererProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  hands: HandData[];
  strings: AeroString[];
  drumPads: DrumPad[];
  playMode: PlayMode;
  videoDimming: number;
  onAddString: (newString: AeroString) => void;
  onPluck: (stringData: { note: string; freq: number; length: number }) => void;
  onDrumHit: (pad: DrumPad, velocity: number) => void;
  currentNoteHover: string | null;
  setCurrentNoteHover: (note: string | null) => void;
}

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
  drumPads,
  playMode,
  videoDimming,
  onAddString,
  onPluck,
  onDrumHit,
  setCurrentNoteHover,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draftStartRef = useRef<ScreenPoint | null>(null);
  const draftCurrentRef = useRef<ScreenPoint | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);

  // Velocity tracking for hands (to detect strike speed)
  const previousHandTipsRef = useRef<Map<string, { point: ScreenPoint; time: number }>>(new Map());
  const padCooldownsRef = useRef<Map<string, number>>(new Map());

  // Mouse fallback
  const isMouseDownRef = useRef(false);
  const mousePointRef = useRef<ScreenPoint | null>(null);

  // String deformation states
  const stringPullsRef = useRef<Map<string, { pullPoint: ScreenPoint; distance: number }>>(new Map());

  const spawnSparks = (x: number, y: number, color = '#00f2ff', count = 22) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1.0,
        maxLife: Math.random() * 22 + 18,
        color,
        size: Math.random() * 4 + 2,
      });
    }
  };

  const spawnShockwave = (x: number, y: number, radius: number, color = '#00f2ff') => {
    shockwavesRef.current.push({
      x,
      y,
      radius: radius * 0.8,
      maxRadius: radius * 2.2,
      color,
      life: 1.0,
      maxLife: 20,
    });
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

      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const minDim = Math.min(width, height);
      const now = performance.now();

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Mirrored Webcam Feed
      if (video.readyState >= 2) {
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, width, height);
        ctx.restore();

        if (videoDimming > 0) {
          ctx.fillStyle = `rgba(5, 5, 12, ${videoDimming})`;
          ctx.fillRect(0, 0, width, height);
        }
      }

      // Collect interaction pointers (drumstick tips or finger picks)
      const drumsticks: { point: ScreenPoint; velocity: number; handIdx: number }[] = [];

      hands.forEach((hand, hIdx) => {
        const key = `${hand.handedness}-${hIdx}`;
        const prev = previousHandTipsRef.current.get(key);
        let speed = 0.8;

        if (prev) {
          const dt = Math.max(1, now - prev.time);
          const dist = distance2D(hand.indexTip, prev.point);
          // Downward velocity bonus (striking down)
          const vy = (hand.indexTip.y - prev.point.y) / dt;
          speed = Math.min(1.0, Math.max(0.4, (dist / dt) * 0.4 + (vy > 0 ? 0.3 : 0)));
        }

        previousHandTipsRef.current.set(key, { point: hand.indexTip, time: now });
        drumsticks.push({ point: hand.indexTip, velocity: speed, handIdx: hIdx });
      });

      if (isMouseDownRef.current && mousePointRef.current) {
        drumsticks.push({ point: mousePointRef.current, velocity: 0.95, handIdx: 99 });
      }

      // -------------------------------------------------------------
      // MODE: AIR DRUMS (Batería Completa en el Aire)
      // -------------------------------------------------------------
      if (playMode === 'air-drums') {
        // Render Drum Pads
        drumPads.forEach((pad) => {
          const px = pad.relX * width;
          const py = pad.relY * height;
          const pr = pad.relRadius * minDim;
          const timeSinceHit = now - pad.lastHitTime;
          const isHitActive = timeSinceHit < 220;
          const hitIntensity = isHitActive ? Math.exp(-timeSinceHit / 80) : 0;

          ctx.save();

          // 1. Outer Neon Aura
          ctx.beginPath();
          ctx.arc(px, py, pr, 0, Math.PI * 2);
          ctx.fillStyle = isHitActive ? 'rgba(255, 255, 255, 0.4)' : 'rgba(13, 37, 96, 0.45)';
          ctx.fill();

          ctx.strokeStyle = isHitActive ? '#ffffff' : pad.color;
          ctx.lineWidth = isHitActive ? 6 : 3.5;
          ctx.shadowColor = isHitActive ? '#ffffff' : pad.color;
          ctx.shadowBlur = isHitActive ? 30 : 16;
          ctx.stroke();

          // 2. Concentric Tuning Rings
          ctx.beginPath();
          ctx.arc(px, py, pr * 0.75, 0, Math.PI * 2);
          ctx.strokeStyle = pad.color;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.5 + hitIntensity * 0.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(px, py, pr * 0.45, 0, Math.PI * 2);
          ctx.lineWidth = 1;
          ctx.stroke();

          // Center Bullseye Trigger
          ctx.beginPath();
          ctx.arc(px, py, pr * 0.18, 0, Math.PI * 2);
          ctx.fillStyle = isHitActive ? '#ffffff' : pad.color;
          ctx.fill();

          // 3. Holographic Badge (Instrument Name & Key Trigger)
          ctx.globalAlpha = 1.0;
          ctx.font = 'bold 13px "JetBrains Mono", monospace';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 6;
          ctx.fillText(pad.name.toUpperCase(), px, py - 4);

          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.fillStyle = pad.color;
          ctx.fillText(`[ ${pad.keyTrigger} ]`, px, py + 14);

          ctx.restore();

          // Check Strike Colision against Drumsticks
          drumsticks.forEach((stick) => {
            const dist = distance2D(stick.point, { x: px, y: py });

            if (dist < pr) {
              const cooldown = padCooldownsRef.current.get(pad.id) || 0;
              if (now - cooldown > 120) {
                // STRIKE CONFIRMED!
                padCooldownsRef.current.set(pad.id, now);
                pad.lastHitTime = now;
                pad.hitVelocity = stick.velocity;

                // Play Sound
                drumsManager.trigger(pad.type, stick.velocity);
                onDrumHit(pad, stick.velocity);

                // Shockwave & Sparks
                spawnShockwave(px, py, pr, pad.color);
                spawnSparks(stick.point.x, stick.point.y, pad.color, 24);
              }
            }
          });
        });

        // Draw Drumsticks attached to hands
        hands.forEach((hand) => {
          ctx.save();
          const tip = hand.indexTip;
          const wrist = hand.wrist;

          // Glowing Drumstick Shaft
          ctx.beginPath();
          ctx.moveTo(wrist.x, wrist.y);
          ctx.lineTo(tip.x, tip.y);
          ctx.strokeStyle = 'rgba(0, 242, 255, 0.7)';
          ctx.lineWidth = 6;
          ctx.shadowColor = '#00f2ff';
          ctx.shadowBlur = 15;
          ctx.stroke();

          // White Core
          ctx.beginPath();
          ctx.moveTo(wrist.x, wrist.y);
          ctx.lineTo(tip.x, tip.y);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Drumstick Tip (Mallet Head)
          ctx.beginPath();
          ctx.arc(tip.x, tip.y, 14, 0, Math.PI * 2);
          ctx.fillStyle = '#EF3800';
          ctx.shadowColor = '#EF3800';
          ctx.shadowBlur = 20;
          ctx.fill();

          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText('BAQUETA', tip.x, tip.y - 18);

          ctx.restore();
        });
      }

      // -------------------------------------------------------------
      // MODE: STRINGS & AIR HARP MODES
      // -------------------------------------------------------------
      if (playMode !== 'air-drums') {
        const pointers = hands.map((h) => ({ point: h.indexTip, isPinching: h.isPinching, isPick: true }));
        if (isMouseDownRef.current && mousePointRef.current) {
          pointers.push({ point: mousePointRef.current, isPinching: true, isPick: true });
        }

        // String deformation & plucking
        strings.forEach((str) => {
          let isBeingPulled = false;
          let activePullPoint: ScreenPoint | null = null;
          let pullDist = 0;

          pointers.forEach((ptr) => {
            const proj = pointToSegmentDistance(ptr.point, str.start, str.end);
            if (proj.distance < 36) {
              isBeingPulled = true;
              activePullPoint = ptr.point;
              pullDist = proj.distance;
            }
          });

          const prevPull = stringPullsRef.current.get(str.id);

          if (isBeingPulled && activePullPoint) {
            stringPullsRef.current.set(str.id, { pullPoint: activePullPoint, distance: pullDist });
            if (pullDist > 42 && (!prevPull || prevPull.distance <= 42)) {
              stringPullsRef.current.delete(str.id);
              str.lastPluckedTime = now;
              soundManager.pluckString(str.frequency, 0.95);
              onPluck({ note: str.noteName, freq: str.frequency, length: str.length });
              spawnSparks((str.start.x + str.end.x) / 2, (str.start.y + str.end.y) / 2, '#f59e0b', 24);
            }
          } else {
            if (prevPull && prevPull.distance > 8) {
              stringPullsRef.current.delete(str.id);
              if (now - str.lastPluckedTime > 100) {
                str.lastPluckedTime = now;
                soundManager.pluckString(str.frequency, 0.9);
                onPluck({ note: str.noteName, freq: str.frequency, length: str.length });
                spawnSparks(prevPull.pullPoint.x, prevPull.pullPoint.y, '#00f2ff', 20);
              }
            }
          }
        });

        // String drawing logic
        if (playMode === 'draw-strings') {
          const pinchingPointer = pointers.find((p) => p.isPinching);

          if (pinchingPointer) {
            const pt = pinchingPointer.point;
            if (!draftStartRef.current) {
              draftStartRef.current = pt;
              draftCurrentRef.current = pt;
            } else {
              draftCurrentRef.current = pt;
              const draftLen = distance2D(draftStartRef.current, pt);
              const { freq, noteName } = soundManager.calculateFrequencyFromLength(draftLen);
              setCurrentNoteHover(`Mapeando Cuerda: ${noteName} (${Math.round(freq)} Hz) — ${Math.round(draftLen)} px`);

              ctx.save();
              const startPt = draftStartRef.current;

              ctx.beginPath();
              ctx.moveTo(startPt.x, startPt.y);
              ctx.lineTo(pt.x, pt.y);
              ctx.strokeStyle = 'rgba(0, 242, 255, 0.35)';
              ctx.lineWidth = 14;
              ctx.stroke();

              ctx.beginPath();
              ctx.moveTo(startPt.x, startPt.y);
              ctx.lineTo(pt.x, pt.y);
              ctx.strokeStyle = '#00f2ff';
              ctx.lineWidth = 4;
              ctx.shadowColor = '#00f2ff';
              ctx.shadowBlur = 18;
              ctx.stroke();

              ctx.beginPath();
              ctx.moveTo(startPt.x, startPt.y);
              ctx.lineTo(pt.x, pt.y);
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.8;
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(startPt.x, startPt.y, 8, 0, Math.PI * 2);
              ctx.fillStyle = '#00f2ff';
              ctx.fill();

              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 14, 0, Math.PI * 2);
              ctx.strokeStyle = '#EF3800';
              ctx.lineWidth = 3;
              ctx.stroke();

              ctx.restore();
            }
          } else if (draftStartRef.current && draftCurrentRef.current) {
            const startPt = draftStartRef.current;
            const endPt = draftCurrentRef.current;
            const finalLength = distance2D(startPt, endPt);

            if (finalLength > 45) {
              const { freq, noteName } = soundManager.calculateFrequencyFromLength(finalLength);
              const newString: AeroString = {
                id: `str-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                start: startPt,
                end: endPt,
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
              soundManager.pluckString(freq, 0.75);
              spawnSparks((startPt.x + endPt.x) / 2, (startPt.y + endPt.y) / 2, '#00f2ff', 24);
            }

            draftStartRef.current = null;
            draftCurrentRef.current = null;
            setCurrentNoteHover(null);
          }
        }

        // Render Active Strings
        strings.forEach((str) => {
          ctx.save();
          const timeSincePluck = now - str.lastPluckedTime;
          const isVibrating = timeSincePluck < 1600;
          const pullData = stringPullsRef.current.get(str.id);

          const dx = str.end.x - str.start.x;
          const dy = str.end.y - str.start.y;
          const angle = Math.atan2(dy, dx);
          const normalX = -Math.sin(angle);
          const normalY = Math.cos(angle);

          ctx.beginPath();
          if (pullData) {
            ctx.moveTo(str.start.x, str.start.y);
            ctx.quadraticCurveTo(pullData.pullPoint.x, pullData.pullPoint.y, str.end.x, str.end.y);
            ctx.strokeStyle = '#EF3800';
            ctx.lineWidth = 5;
            ctx.shadowColor = '#EF3800';
            ctx.shadowBlur = 22;
            ctx.stroke();
          } else {
            const decay = Math.exp(-timeSincePluck / 320);
            const maxDisplacement = isVibrating ? 15 * decay * Math.sin(timeSincePluck * 0.08) : 0;
            const segments = 16;
            for (let i = 0; i <= segments; i++) {
              const t = i / segments;
              const wave = Math.sin(Math.PI * t);
              const disp = wave * maxDisplacement;
              const px = str.start.x + dx * t + normalX * disp;
              const py = str.start.y + dy * t + normalY * disp;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.strokeStyle = isVibrating ? '#f59e0b' : str.color;
            ctx.lineWidth = isVibrating ? 4.5 : 3.5;
            ctx.shadowColor = isVibrating ? '#f59e0b' : '#00f2ff';
            ctx.shadowBlur = isVibrating ? 24 : 14;
            ctx.stroke();
          }

          // Node Rings & Badge
          ctx.fillStyle = '#00f2ff';
          ctx.beginPath();
          ctx.arc(str.start.x, str.start.y, 5, 0, Math.PI * 2);
          ctx.arc(str.end.x, str.end.y, 5, 0, Math.PI * 2);
          ctx.fill();

          const midX = (str.start.x + str.end.x) / 2;
          const midY = (str.start.y + str.end.y) / 2;
          ctx.font = 'bold 12px "JetBrains Mono", monospace';
          ctx.fillStyle = 'rgba(13, 37, 96, 0.9)';
          ctx.beginPath();
          ctx.roundRect(midX - 25, midY - 14, 50, 20, 6);
          ctx.fill();
          ctx.fillStyle = isVibrating ? '#f59e0b' : '#00f2ff';
          ctx.textAlign = 'center';
          ctx.fillText(str.noteName, midX, midY + 1);

          ctx.restore();
        });
      }

      // -------------------------------------------------------------
      // Hands Skeleton
      // -------------------------------------------------------------
      hands.forEach((hand) => {
        ctx.save();
        const screenLandmarks = hand.landmarks.map((lm) => ({
          x: lm.x * width,
          y: lm.y * height,
        }));

        ctx.strokeStyle = 'rgba(0, 242, 255, 0.45)';
        ctx.lineWidth = 2.5;
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

        screenLandmarks.forEach((pt, idx) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, idx === 8 ? 7 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle = idx === 8 ? '#EF3800' : 'rgba(0, 242, 255, 0.9)';
          ctx.fill();
        });

        ctx.restore();
      });

      // -------------------------------------------------------------
      // Shockwaves Animation (Drum Pad Hits)
      // -------------------------------------------------------------
      const activeShockwaves: Shockwave[] = [];
      shockwavesRef.current.forEach((sw) => {
        sw.life -= 1 / sw.maxLife;
        sw.radius += (sw.maxRadius - sw.radius) * 0.25;

        if (sw.life > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
          ctx.strokeStyle = sw.color;
          ctx.lineWidth = 4 * sw.life;
          ctx.globalAlpha = sw.life;
          ctx.shadowColor = sw.color;
          ctx.shadowBlur = 20;
          ctx.stroke();
          ctx.restore();
          activeShockwaves.push(sw);
        }
      });
      shockwavesRef.current = activeShockwaves;

      // -------------------------------------------------------------
      // Particle Sparks Animation
      // -------------------------------------------------------------
      const activeParticles: Particle[] = [];
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18;
        p.life -= 1 / p.maxLife;

        if (p.life > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
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
  }, [hands, strings, drumPads, playMode, videoDimming, onAddString, onPluck, onDrumHit, setCurrentNoteHover, videoRef]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isMouseDownRef.current = true;
    mousePointRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isMouseDownRef.current) {
      mousePointRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    mousePointRef.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="absolute inset-0 w-full h-full object-cover z-10 cursor-crosshair"
    />
  );
};
