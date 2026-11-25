import React, { useEffect, useRef } from 'react';
import { AeroString, HandData, Particle, PlayMode, ScreenPoint } from '../types';
import { distance2D, pointToSegmentDistance } from '../utils/geometry';
import { soundManager } from '../audio/AudioEngine';

interface CanvasRendererProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  hands: HandData[];
  strings: AeroString[];
  playMode: PlayMode;
  videoDimming: number; // 0 (clear) to 1 (black)
  onAddString: (newString: AeroString) => void;
  onUpdateStrings: (updater: (prev: AeroString[]) => AeroString[]) => void;
  onPluck: (stringData: { note: string; freq: number; length: number }) => void;
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
  playMode,
  videoDimming,
  onAddString,
  onPluck,
  setCurrentNoteHover,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draftStartRef = useRef<ScreenPoint | null>(null);
  const draftCurrentRef = useRef<ScreenPoint | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastElasticPluckTimeRef = useRef<number>(0);

  // Mouse fallback refs
  const isMouseDownRef = useRef(false);
  const mousePointRef = useRef<ScreenPoint | null>(null);

  // Active string deformation states (stringId -> { pullPoint, maxDisplacement })
  const stringPullsRef = useRef<Map<string, { pullPoint: ScreenPoint; distance: number }>>(new Map());

  const spawnSparks = (x: number, y: number, color = '#00f2ff', count = 20) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        life: 1.0,
        maxLife: Math.random() * 22 + 18,
        color,
        size: Math.random() * 3.5 + 2,
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

      // 1. Draw Real-time Webcam Feed (Mirrored)
      if (video.readyState >= 2) {
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, width, height);
        ctx.restore();

        // Configurable subtle contrast tint so user sees their room crystal-clear
        if (videoDimming > 0) {
          ctx.fillStyle = `rgba(5, 5, 12, ${videoDimming})`;
          ctx.fillRect(0, 0, width, height);
        }
      }

      // Gather all interacting pointers (Hands + Mouse)
      const pointers: { point: ScreenPoint; isPinching: boolean; isPick: boolean }[] = [];

      hands.forEach((hand) => {
        pointers.push({
          point: hand.indexTip,
          isPinching: hand.isPinching,
          isPick: true,
        });
      });

      if (isMouseDownRef.current && mousePointRef.current) {
        pointers.push({
          point: mousePointRef.current,
          isPinching: true,
          isPick: true,
        });
      }

      // 2. Interactive String Bending & Snapping Physics
      strings.forEach((str) => {
        let isBeingPulled = false;
        let activePullPoint: ScreenPoint | null = null;
        let pullDist = 0;

        pointers.forEach((ptr) => {
          if (!ptr.isPick) return;
          const proj = pointToSegmentDistance(ptr.point, str.start, str.end);

          // If finger is within 32px of the string, hook and bend it!
          if (proj.distance < 36) {
            isBeingPulled = true;
            activePullPoint = ptr.point;
            pullDist = proj.distance;
          }
        });

        const prevPull = stringPullsRef.current.get(str.id);

        if (isBeingPulled && activePullPoint) {
          // Tension build-up as finger pulls the string
          stringPullsRef.current.set(str.id, { pullPoint: activePullPoint, distance: pullDist });

          // If pulled past max elasticity threshold (~45px), SNAP!
          if (pullDist > 42 && (!prevPull || prevPull.distance <= 42)) {
            // Snap release!
            stringPullsRef.current.delete(str.id);
            str.lastPluckedTime = now;
            soundManager.pluckString(str.frequency, 0.95);
            onPluck({ note: str.noteName, freq: str.frequency, length: str.length });
            spawnSparks((str.start.x + str.end.x) / 2, (str.start.y + str.end.y) / 2, '#f59e0b', 24);
          }
        } else {
          // If was pulled previously and now released: SNAP!
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

      // 3. Live Drawing & Mapping Mechanics
      if (playMode === 'draw-strings') {
        const pinchingPointer = pointers.find((p) => p.isPinching);

        if (pinchingPointer) {
          const pt = pinchingPointer.point;
          if (!draftStartRef.current) {
            // Anchor point established
            draftStartRef.current = pt;
            draftCurrentRef.current = pt;
          } else {
            // Dragging: Live mapping trail
            draftCurrentRef.current = pt;
            const draftLen = distance2D(draftStartRef.current, pt);
            const { freq, noteName } = soundManager.calculateFrequencyFromLength(draftLen);
            setCurrentNoteHover(`Mapeando Cuerda: ${noteName} (${Math.round(freq)} Hz) — ${Math.round(draftLen)} px`);

            // --- RENDER LIVE MAPPING TRAIL ---
            ctx.save();
            const startPt = draftStartRef.current;

            // Outer cyan aura
            ctx.beginPath();
            ctx.moveTo(startPt.x, startPt.y);
            ctx.lineTo(pt.x, pt.y);
            ctx.strokeStyle = 'rgba(0, 242, 255, 0.35)';
            ctx.lineWidth = 14;
            ctx.stroke();

            // Core electric beam
            ctx.beginPath();
            ctx.moveTo(startPt.x, startPt.y);
            ctx.lineTo(pt.x, pt.y);
            ctx.strokeStyle = '#00f2ff';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#00f2ff';
            ctx.shadowBlur = 18;
            ctx.stroke();

            // Inner white laser core
            ctx.beginPath();
            ctx.moveTo(startPt.x, startPt.y);
            ctx.lineTo(pt.x, pt.y);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.8;
            ctx.stroke();

            // Draw Ruler / Fret Ticks every 45px
            const dx = pt.x - startPt.x;
            const dy = pt.y - startPt.y;
            const angle = Math.atan2(dy, dx);
            const normalX = -Math.sin(angle);
            const normalY = Math.cos(angle);

            const numTicks = Math.floor(draftLen / 45);
            for (let i = 1; i <= numTicks; i++) {
              const tickRatio = (i * 45) / draftLen;
              const tx = startPt.x + dx * tickRatio;
              const ty = startPt.y + dy * tickRatio;

              ctx.beginPath();
              ctx.moveTo(tx - normalX * 6, ty - normalY * 6);
              ctx.lineTo(tx + normalX * 6, ty + normalY * 6);
              ctx.strokeStyle = 'rgba(0, 242, 255, 0.8)';
              ctx.lineWidth = 2;
              ctx.stroke();
            }

            // Start Anchor Ring
            ctx.beginPath();
            ctx.arc(startPt.x, startPt.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#00f2ff';
            ctx.shadowColor = '#00f2ff';
            ctx.shadowBlur = 15;
            ctx.fill();

            // End Finger Reticle & Acoustic Wave Pulse
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 14, 0, Math.PI * 2);
            ctx.strokeStyle = '#EF3800';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#EF3800';
            ctx.shadowBlur = 20;
            ctx.stroke();

            // Dynamic Frequency Ring
            const waveRadius = 14 + (Math.sin(now * 0.02) + 1) * 6;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, waveRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(239, 56, 0, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Floating Holographic HUD Tag
            ctx.fillStyle = 'rgba(13, 37, 96, 0.9)';
            ctx.strokeStyle = '#00f2ff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(pt.x + 20, pt.y - 32, 160, 48, 8);
            ctx.fill();
            ctx.stroke();

            ctx.font = 'bold 13px "JetBrains Mono", monospace';
            ctx.fillStyle = '#00f2ff';
            ctx.fillText(`${noteName} [${Math.round(freq)} Hz]`, pt.x + 30, pt.y - 14);

            ctx.font = '500 11px "JetBrains Mono", monospace';
            ctx.fillStyle = '#f59e0b';
            ctx.fillText(`Largo: ${Math.round(draftLen)} px`, pt.x + 30, pt.y + 4);

            ctx.restore();
          }
        } else if (draftStartRef.current && draftCurrentRef.current) {
          // Pinch released: solidify string into the space!
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
      } else if (playMode === 'elastic-two-hands') {
        // Two-hands elastic string
        if (hands.length >= 2) {
          const h1 = hands[0].indexTip;
          const h2 = hands[1].indexTip;
          const len = distance2D(h1, h2);
          const { freq, noteName } = soundManager.calculateFrequencyFromLength(len, 80, 800);
          setCurrentNoteHover(`${noteName} (${Math.round(freq)} Hz) — Distancia entre manos: ${Math.round(len)} px`);

          ctx.save();
          // Gradient elastic beam
          const gradient = ctx.createLinearGradient(h1.x, h1.y, h2.x, h2.y);
          gradient.addColorStop(0, '#00f2ff');
          gradient.addColorStop(0.5, '#EF3800');
          gradient.addColorStop(1, '#00f2ff');

          ctx.beginPath();
          ctx.moveTo(h1.x, h1.y);
          ctx.lineTo(h2.x, h2.y);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 5;
          ctx.shadowColor = '#00f2ff';
          ctx.shadowBlur = 24;
          ctx.stroke();

          // Outer aura
          ctx.beginPath();
          ctx.moveTo(h1.x, h1.y);
          ctx.lineTo(h2.x, h2.y);
          ctx.strokeStyle = 'rgba(239, 56, 0, 0.35)';
          ctx.lineWidth = 14;
          ctx.stroke();

          // Midpoint Badge
          const midX = (h1.x + h2.x) / 2;
          const midY = (h1.y + h2.y) / 2;

          ctx.fillStyle = 'rgba(13, 37, 96, 0.9)';
          ctx.strokeStyle = '#00f2ff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(midX - 70, midY - 26, 140, 42, 8);
          ctx.fill();
          ctx.stroke();

          ctx.font = 'bold 15px "JetBrains Mono", monospace';
          ctx.fillStyle = '#00f2ff';
          ctx.textAlign = 'center';
          ctx.fillText(noteName, midX, midY - 4);

          ctx.font = '500 11px "JetBrains Mono", monospace';
          ctx.fillStyle = '#f59e0b';
          ctx.fillText(`${Math.round(len)} px • ${Math.round(freq)} Hz`, midX, midY + 11);

          // Pluck trigger: pinch or shake
          const isTriggered = hands.some((h) => h.isPinching);
          if (isTriggered && now - lastElasticPluckTimeRef.current > 180) {
            lastElasticPluckTimeRef.current = now;
            soundManager.pluckString(freq, 0.9);
            spawnSparks(midX, midY, '#EF3800', 25);
            onPluck({ note: noteName, freq, length: len });
          }
          ctx.restore();
        } else {
          setCurrentNoteHover('Coloca ambas manos frente a la cámara para tensar la cuerda láser');
        }
      }

      // 4. Render Active Floating Strings with Dynamic Physical Vibration & Touch Bending
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
          // BENT STRING: Finger is physically pulling the string
          ctx.moveTo(str.start.x, str.start.y);
          ctx.quadraticCurveTo(pullData.pullPoint.x, pullData.pullPoint.y, str.end.x, str.end.y);
          ctx.strokeStyle = '#EF3800';
          ctx.lineWidth = 5;
          ctx.shadowColor = '#EF3800';
          ctx.shadowBlur = 22;
          ctx.stroke();

          // Tension guide line
          ctx.beginPath();
          ctx.moveTo(pullData.pullPoint.x, pullData.pullPoint.y);
          const midX = (str.start.x + str.end.x) / 2;
          const midY = (str.start.y + str.end.y) / 2;
          ctx.lineTo(midX, midY);
          ctx.strokeStyle = 'rgba(239, 56, 0, 0.4)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          // VIBRATING or REST STRING
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

          // White filament
          ctx.beginPath();
          ctx.moveTo(str.start.x, str.start.y);
          ctx.lineTo(str.end.x, str.end.y);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // End Node Rings
        ctx.fillStyle = '#00f2ff';
        ctx.beginPath();
        ctx.arc(str.start.x, str.start.y, 5, 0, Math.PI * 2);
        ctx.arc(str.end.x, str.end.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Note Badge
        const midX = (str.start.x + str.end.x) / 2;
        const midY = (str.start.y + str.end.y) / 2;
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(13, 37, 96, 0.9)';
        ctx.beginPath();
        ctx.roundRect(midX - 25, midY - 14, 50, 20, 6);
        ctx.fill();
        ctx.strokeStyle = isVibrating ? '#f59e0b' : '#00f2ff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = isVibrating ? '#f59e0b' : '#00f2ff';
        ctx.textAlign = 'center';
        ctx.fillText(str.noteName, midX, midY + 1);

        ctx.restore();
      });

      // 5. Render Hands (Cyber Skeleton & Pick Reticle)
      hands.forEach((hand) => {
        ctx.save();
        const screenLandmarks = hand.landmarks.map((lm) => ({
          x: lm.x * width,
          y: lm.y * height,
        }));

        // Skeleton Bones
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

        // Joints
        screenLandmarks.forEach((pt, idx) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, idx === 8 ? 7 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle = idx === 8 ? '#EF3800' : 'rgba(0, 242, 255, 0.9)';
          ctx.shadowColor = idx === 8 ? '#EF3800' : '#00f2ff';
          ctx.shadowBlur = 10;
          ctx.fill();
        });

        // Index Fingertip Pick (Púa) Reticle
        const indexTip = hand.indexTip;
        ctx.beginPath();
        ctx.arc(indexTip.x, indexTip.y, 14, 0, Math.PI * 2);
        ctx.strokeStyle = '#EF3800';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#EF3800';
        ctx.shadowBlur = 16;
        ctx.stroke();

        // Label above pick
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.fillStyle = '#EF3800';
        ctx.fillText('PÚA', indexTip.x - 10, indexTip.y - 18);

        // Pinch Indicator
        if (hand.isPinching) {
          ctx.beginPath();
          ctx.arc(hand.pinchPoint.x, hand.pinchPoint.y, 18, 0, Math.PI * 2);
          ctx.strokeStyle = '#00f2ff';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#00f2ff';
          ctx.shadowBlur = 20;
          ctx.stroke();
        }

        ctx.restore();
      });

      // 6. Particle Sparks
      const activeParticles: Particle[] = [];
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
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
  }, [hands, strings, playMode, videoDimming, onAddString, onPluck, setCurrentNoteHover, videoRef]);

  // Mouse / Touch Event Handlers for Hybrid Interaction
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
