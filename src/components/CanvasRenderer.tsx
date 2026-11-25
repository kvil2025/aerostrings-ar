import React, { useEffect, useRef } from 'react';
import { AeroString, HandData, Particle, PlayMode, ScreenPoint, Shockwave, ThereminState } from '../types';
import { distance2D, pointToSegmentDistance } from '../utils/geometry';
import { soundManager } from '../audio/AudioEngine';

interface CanvasRendererProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  hands: HandData[];
  strings: AeroString[];
  playMode: PlayMode;
  videoDimming: number;
  onAddString: (newString: AeroString) => void;
  onPluck: (stringData: { note: string; freq: number; length: number }) => void;
  currentNoteHover: string | null;
  setCurrentNoteHover: (note: string | null) => void;
  thereminState?: ThereminState;
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
  thereminState,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draftStartRef = useRef<ScreenPoint | null>(null);
  const draftCurrentRef = useRef<ScreenPoint | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);

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

      // -------------------------------------------------------------
      // MODE: AAC NON-VERBAL COMMUNICATOR LASER POINTER
      // -------------------------------------------------------------
      if (playMode === 'aac-communicator') {
        hands.forEach((hand) => {
          const tip = hand.indexTip;
          ctx.save();
          ctx.beginPath();
          ctx.arc(tip.x, tip.y, 16, 0, Math.PI * 2);
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 20;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(tip.x - 22, tip.y);
          ctx.lineTo(tip.x + 22, tip.y);
          ctx.moveTo(tip.x, tip.y - 22);
          ctx.lineTo(tip.x, tip.y + 22);
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.fillStyle = '#10b981';
          ctx.textAlign = 'center';
          ctx.fillText('PUNTERO', tip.x, tip.y - 26);
          ctx.restore();
        });
      }

      // -------------------------------------------------------------
      // MODE: THEREMIN (Antenas de Tono & Volumen + Campo Electromagnético)
      // -------------------------------------------------------------
      if (playMode === 'theremin') {
        const pitchRodX = width * 0.90;
        const pitchRodTop = height * 0.12;
        const pitchRodBottom = height * 0.88;

        const volLoopX = width * 0.14;
        const volLoopY = height * 0.80;

        // 1. Right Pitch Rod Antenna (Antena Vertical de Tono)
        ctx.save();
        // Base plate
        ctx.beginPath();
        ctx.ellipse(pitchRodX, pitchRodBottom + 8, 32, 10, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#050508';
        ctx.strokeStyle = '#00f2ff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00f2ff';
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.stroke();

        // Chrome / Cyan Rod
        ctx.beginPath();
        ctx.moveTo(pitchRodX, pitchRodBottom);
        ctx.lineTo(pitchRodX, pitchRodTop);
        ctx.strokeStyle = '#00f2ff';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#00f2ff';
        ctx.shadowBlur = 22;
        ctx.stroke();

        // Top Emitter Sphere
        ctx.beginPath();
        ctx.arc(pitchRodX, pitchRodTop, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00f2ff';
        ctx.shadowBlur = 28;
        ctx.fill();

        // Pitch scale markers along the rod
        const pitchMarkers = [
          { note: 'Sol 6 (G6)', ratio: 1.0 },
          { note: 'Do 6 (C6)', ratio: 0.85 },
          { note: 'La 5 (A5)', ratio: 0.74 },
          { note: 'Do 5 (C5)', ratio: 0.60 },
          { note: 'La 4 (A4 • 440Hz)', ratio: 0.50 },
          { note: 'Do 4 (C4)', ratio: 0.36 },
          { note: 'La 3 (A3)', ratio: 0.25 },
          { note: 'Do 3 (C3)', ratio: 0.12 },
          { note: 'Do 2 (C2)', ratio: 0.0 },
        ];

        pitchMarkers.forEach((m) => {
          const my = pitchRodBottom - m.ratio * (pitchRodBottom - pitchRodTop);
          ctx.beginPath();
          ctx.moveTo(pitchRodX - 8, my);
          ctx.lineTo(pitchRodX + 8, my);
          ctx.strokeStyle = 'rgba(0, 242, 255, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillStyle = 'rgba(0, 242, 255, 0.85)';
          ctx.textAlign = 'right';
          ctx.fillText(m.note, pitchRodX - 12, my + 3);
        });

        // 2. Left Volume Loop Antenna (Bucle Horizontal de Volumen)
        // Base plate
        ctx.beginPath();
        ctx.ellipse(volLoopX, volLoopY + 28, 26, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#050508';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.stroke();

        // Support pole
        ctx.beginPath();
        ctx.moveTo(volLoopX, volLoopY + 28);
        ctx.lineTo(volLoopX, volLoopY);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 12;
        ctx.stroke();

        // Curved Loop
        ctx.beginPath();
        ctx.ellipse(volLoopX, volLoopY, 52, 22, 0, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 20;
        ctx.stroke();

        // Volume elevation scale rings extending upwards
        for (let vi = 1; vi <= 4; vi++) {
          const vRatio = vi * 0.25;
          const vy = volLoopY - vRatio * (volLoopY - height * 0.18);
          ctx.beginPath();
          ctx.ellipse(volLoopX, vy, 36 - vi * 4, 12 - vi * 1.5, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(245, 158, 11, ${0.15 + vi * 0.08})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillStyle = 'rgba(245, 158, 11, 0.7)';
          ctx.textAlign = 'left';
          ctx.fillText(`${vi * 25}% VOL`, volLoopX + 44, vy + 3);
        }
        ctx.restore();

        // 3. Dynamic Interactive Field & Hand Resonance
        if (thereminState && thereminState.isActive) {
          const { pitchHandPoint, volumeHandPoint, frequency, volume, closestNote, closestNoteEs, cents } = thereminState;

          // Resonance waves around Pitch Hand
          if (pitchHandPoint) {
            ctx.save();
            const wavelength = Math.max(16, Math.min(60, 4800 / frequency));
            const numRings = 4;
            const phase = (now * 0.06) % wavelength;

            for (let i = 0; i < numRings; i++) {
              const r = phase + i * wavelength;
              const alpha = Math.max(0, (1 - r / (numRings * wavelength)) * volume);
              ctx.beginPath();
              ctx.arc(pitchHandPoint.x, pitchHandPoint.y, r, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(0, 242, 255, ${alpha * 0.8})`;
              ctx.lineWidth = 2.5;
              ctx.shadowColor = '#00f2ff';
              ctx.shadowBlur = 16;
              ctx.stroke();
            }

            // Beam from Hand to Pitch Rod
            ctx.beginPath();
            ctx.moveTo(pitchHandPoint.x, pitchHandPoint.y);
            ctx.lineTo(pitchRodX, pitchHandPoint.y);
            ctx.strokeStyle = `rgba(0, 242, 255, ${volume * 0.65})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Floating Holographic Tuner Badge
            const badgeY = pitchHandPoint.y - 48;
            ctx.beginPath();
            ctx.roundRect(pitchHandPoint.x - 70, badgeY - 24, 140, 48, 12);
            ctx.fillStyle = 'rgba(5, 5, 8, 0.85)';
            ctx.strokeStyle = Math.abs(cents) < 12 ? '#10b981' : '#00f2ff';
            ctx.lineWidth = 2;
            ctx.shadowColor = Math.abs(cents) < 12 ? '#10b981' : '#00f2ff';
            ctx.shadowBlur = 20;
            ctx.fill();
            ctx.stroke();

            // Note Text
            ctx.font = 'bold 16px "JetBrains Mono", monospace';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(`${closestNoteEs} (${closestNote})`, pitchHandPoint.x, badgeY - 4);

            // Frequency + Cents
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.fillStyle = Math.abs(cents) < 12 ? '#10b981' : '#f59e0b';
            const centsStr = cents > 0 ? `+${cents}¢` : `${cents}¢`;
            ctx.fillText(`${Math.round(frequency)} Hz • ${centsStr}`, pitchHandPoint.x, badgeY + 14);

            ctx.restore();
          }

          // Resonance glow around Volume Hand
          if (volumeHandPoint) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(volumeHandPoint.x, volumeHandPoint.y);
            ctx.lineTo(volLoopX, volLoopY);
            ctx.strokeStyle = `rgba(245, 158, 11, ${volume * 0.7})`;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 18;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(volumeHandPoint.x, volumeHandPoint.y, 18, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(245, 158, 11, ${volume * 0.4})`;
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();

            // Volume label
            ctx.font = 'bold 11px "JetBrains Mono", monospace';
            ctx.fillStyle = '#f59e0b';
            ctx.textAlign = 'center';
            ctx.fillText(`VOL ${Math.round(volume * 100)}%`, volumeHandPoint.x, volumeHandPoint.y - 25);
            ctx.restore();
          }
        }
      }

      // -------------------------------------------------------------
      // MODE: STRINGS & AIR HARP MODES
      // -------------------------------------------------------------
      if (playMode !== 'air-drums' && playMode !== 'aac-communicator' && playMode !== 'theremin') {
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
              spawnSparks((str.start.x + str.end.x) / 2, (str.start.y + str.end.y) / 2, str.color || '#f59e0b', 24);
            }
          } else {
            if (prevPull && prevPull.distance > 8) {
              stringPullsRef.current.delete(str.id);
              if (now - str.lastPluckedTime > 100) {
                str.lastPluckedTime = now;
                soundManager.pluckString(str.frequency, 0.9);
                onPluck({ note: str.noteName, freq: str.frequency, length: str.length });
                spawnSparks(prevPull.pullPoint.x, prevPull.pullPoint.y, str.color || '#00f2ff', 24);
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
            const decay = Math.exp(-timeSincePluck / 450);
            const segments = 40;
            const baseAmp = isVibrating ? 24 * decay : 0;
            const omega = 0.052;
            const tMs = timeSincePluck;

            // Traveling wave pulse that echoes back and forth between string endpoints
            const bounceCycle = (tMs * 0.003) % 2;
            const pulsePos = bounceCycle < 1 ? bounceCycle : 2 - bounceCycle;

            // 1. Glowing Wave Aura Envelope (Motion blur standing wave boundary)
            if (isVibrating && baseAmp > 2) {
              ctx.save();
              ctx.beginPath();
              for (let i = 0; i <= segments; i++) {
                const u = i / segments;
                const envDisp = Math.sin(Math.PI * u) * baseAmp * 0.85;
                const ex = str.start.x + dx * u + normalX * envDisp;
                const ey = str.start.y + dy * u + normalY * envDisp;
                if (i === 0) ctx.moveTo(ex, ey);
                else ctx.lineTo(ex, ey);
              }
              for (let i = segments; i >= 0; i--) {
                const u = i / segments;
                const envDisp = -Math.sin(Math.PI * u) * baseAmp * 0.85;
                const ex = str.start.x + dx * u + normalX * envDisp;
                const ey = str.start.y + dy * u + normalY * envDisp;
                ctx.lineTo(ex, ey);
              }
              ctx.closePath();
              ctx.fillStyle = isVibrating ? 'rgba(245, 158, 11, 0.12)' : 'rgba(0, 242, 255, 0.08)';
              ctx.fill();
              ctx.restore();
            }

            // 2. Physical Multi-Harmonic Undulating Wave
            ctx.beginPath();
            for (let i = 0; i <= segments; i++) {
              const u = i / segments;
              let disp = 0;

              if (isVibrating) {
                // Standing wave harmonics (fundamental, octave S-curve, third and fourth ripples)
                const h1 = Math.sin(Math.PI * u) * Math.sin(tMs * omega);
                const h2 = 0.58 * Math.sin(2 * Math.PI * u) * Math.sin(tMs * omega * 2.02 + 0.45);
                const h3 = 0.35 * Math.sin(3 * Math.PI * u) * Math.sin(tMs * omega * 3.04 + 0.9);
                const h4 = 0.20 * Math.sin(4 * Math.PI * u) * Math.sin(tMs * omega * 4.08 + 1.3);

                // Traveling ripple packet along the string length
                const distToPulse = Math.abs(u - pulsePos);
                const ripple = Math.exp(-distToPulse * distToPulse * 45) * Math.sin(u * 12 * Math.PI - tMs * 0.08) * 0.45;

                disp = (h1 + h2 + h3 + h4 + ripple) * baseAmp;
              }

              const px = str.start.x + dx * u + normalX * disp;
              const py = str.start.y + dy * u + normalY * disp;
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
  }, [hands, strings, playMode, videoDimming, onAddString, onPluck, setCurrentNoteHover, videoRef, thereminState]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isMouseDownRef.current = true;
    const pt = { x: e.clientX, y: e.clientY };
    mousePointRef.current = pt;
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

  // Touch handlers for iPad / iPhone mobile touch interaction
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      isMouseDownRef.current = true;
      mousePointRef.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      mousePointRef.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
  };

  const handleTouchEnd = () => {
    isMouseDownRef.current = false;
    mousePointRef.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="absolute inset-0 w-full h-full object-cover z-10 cursor-crosshair touch-none"
    />
  );
};
