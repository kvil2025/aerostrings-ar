import { BackgroundSettings } from '../types';

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  baseAlpha: number;
  twinkleSpeed: number;
}

interface RainDrop {
  x: number;
  y: number;
  length: number;
  speed: number;
  alpha: number;
}

export class VirtualStageRenderer {
  private stars: Star[] = [];
  private rainDrops: RainDrop[] = [];
  private spotlightAngle = 0;
  private vuMeterLevel = 0.2;
  private isInitialized = false;

  // Custom User Image Cache
  private cachedCustomImage: HTMLImageElement | null = null;
  private currentCustomImageUrl: string | null = null;

  constructor() {
    this.initParticles();
  }

  private initParticles() {
    if (this.isInitialized) return;

    // 150 Stars for Cosmic Space
    this.stars = Array.from({ length: 160 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2.2 + 0.6,
      speed: Math.random() * 0.0003 + 0.0001,
      baseAlpha: Math.random() * 0.6 + 0.4,
      twinkleSpeed: Math.random() * 3 + 1.5,
    }));

    // 80 Rain drops for Cyberpunk City
    this.rainDrops = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random(),
      length: Math.random() * 24 + 12,
      speed: Math.random() * 0.015 + 0.008,
      alpha: Math.random() * 0.5 + 0.2,
    }));

    this.isInitialized = true;
  }

  /**
   * Main render function called from CanvasRenderer loop
   * @param ctx 2D rendering context
   * @param width canvas width
   * @param height canvas height
   * @param video HTMLVideoElement
   * @param settings Virtual background configuration
   * @param audioReactiveEnergy 0 to 1 intensity based on plucks or Theremin volume
   * @param now performance.now()
   */
  public renderBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    video: HTMLVideoElement,
    settings: BackgroundSettings,
    audioReactiveEnergy: number,
    now: number
  ) {
    const { mode, userPresence, blurAmount, reactiveLighting } = settings;
    const energy = reactiveLighting ? audioReactiveEnergy : 0.15;

    // 1. Draw Virtual Stage / Backdrop
    switch (mode) {
      case 'camera-raw':
        // Pure raw webcam video
        this.drawMirroredVideo(ctx, video, width, height, 1.0, 0);
        return;

      case 'blur':
        // Google Meet / Zoom style blur
        this.renderBlurMode(ctx, video, width, height, blurAmount || 16);
        return;

      case 'custom-image':
        this.renderCustomImageMode(ctx, width, height, settings.customImageUrl, energy, now);
        break;

      case 'rock-concert':
        this.renderRockConcert(ctx, width, height, energy, now);
        break;

      case 'cosmic-space':
        this.renderCosmicSpace(ctx, width, height, energy, now);
        break;

      case 'rehearsal-room':
        this.renderRehearsalStudio(ctx, width, height, energy, now);
        break;

      case 'cyberpunk-city':
        this.renderCyberpunkCity(ctx, width, height, energy, now);
        break;

      case 'zen-nature':
        this.renderZenNature(ctx, width, height, energy, now);
        break;
    }

    // 2. Composite User on the Stage (Performer Presence)
    if (userPresence > 0.02 && video.readyState >= 2) {
      this.drawPerformerOverStage(ctx, video, width, height, userPresence, mode, energy);
    }
  }

  /**
   * 1. Google Meet / Zoom Background Blur Mode
   */
  private renderBlurMode(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    width: number,
    height: number,
    blurPx: number
  ) {
    if (video.readyState < 2) return;

    ctx.save();
    // Heavy Gaussian blur for background
    ctx.filter = `blur(${blurPx}px) brightness(0.85) saturate(1.15)`;
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    // Subtle dark cinematic vignette
    const vignette = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.25,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.75
    );
    vignette.addColorStop(0, 'rgba(5, 5, 12, 0.05)');
    vignette.addColorStop(1, 'rgba(5, 5, 12, 0.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * Custom User Uploaded Background Image Mode
   */
  private renderCustomImageMode(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    customImageUrl: string | null | undefined,
    energy: number,
    now: number
  ) {
    if (!customImageUrl) {
      // Fallback si aún no sube imagen: elegante escenario oscuro de estudio con grid
      ctx.fillStyle = '#060812';
      ctx.fillRect(0, 0, width, height);

      // Guía suave en el centro
      ctx.fillStyle = 'rgba(0, 242, 255, 0.2)';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('📁 Sube tu imagen en [🖼️ Escenario] para proyectarla aquí', width / 2, height / 2);
      return;
    }

    // Cargar o usar imagen en caché
    if (this.currentCustomImageUrl !== customImageUrl) {
      this.currentCustomImageUrl = customImageUrl;
      const img = new window.Image();
      img.src = customImageUrl;
      img.onload = () => {
        this.cachedCustomImage = img;
      };
    }

    if (this.cachedCustomImage && this.cachedCustomImage.complete && this.cachedCustomImage.naturalWidth > 0) {
      const img = this.cachedCustomImage;

      // Calcular aspecto "cover" (llenar pantalla completa sin deformar)
      const canvasAspect = width / height;
      const imgAspect = img.naturalWidth / img.naturalHeight;

      let drawWidth = width;
      let drawHeight = height;
      let offsetX = 0;
      let offsetY = 0;

      if (imgAspect > canvasAspect) {
        // La imagen es más ancha que la pantalla
        drawHeight = height;
        drawWidth = height * imgAspect;
        offsetX = (width - drawWidth) / 2;
      } else {
        // La imagen es más alta que la pantalla
        drawWidth = width;
        drawHeight = width / imgAspect;
        offsetY = (height - drawHeight) / 2;
      }

      ctx.save();
      // Dibujar imagen con escala 'cover'
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      // Viñeta y halo de escenario musical sutil sobre la imagen
      const stageGlow = ctx.createRadialGradient(
        width / 2,
        height * 0.45,
        Math.min(width, height) * 0.2,
        width / 2,
        height * 0.5,
        Math.max(width, height) * 0.75
      );
      stageGlow.addColorStop(0, `rgba(0, 242, 255, ${0.03 + energy * 0.08})`);
      stageGlow.addColorStop(0.7, 'rgba(5, 5, 12, 0.3)');
      stageGlow.addColorStop(1, 'rgba(5, 5, 12, 0.7)');
      ctx.fillStyle = stageGlow;
      ctx.fillRect(0, 0, width, height);

      // Pulso de luz reactiva suave en los bordes si hay música
      if (energy > 0.3) {
        ctx.strokeStyle = `rgba(0, 242, 255, ${(energy - 0.3) * 0.35})`;
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, width, height);
      }

      ctx.restore();
    } else {
      // Estado mientras carga la imagen
      ctx.fillStyle = '#060812';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#00f2ff';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Cargando tu imagen de escenario...', width / 2, height / 2);
    }
  }

  /**
   * 2. Live Rock Concert Stadium Stage
   */
  private renderRockConcert(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    energy: number,
    now: number
  ) {
    // Stage Floor (Dark reflective oak planks with perspective)
    const horizonY = height * 0.55;

    // Dark stadium background atmosphere
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#020205');
    bgGrad.addColorStop(0.55, '#070914');
    bgGrad.addColorStop(1, '#050508');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Wall of Marshall / Mesa Boogie Speaker Cabinets at Horizon
    const ampY = horizonY - 45;
    const ampHeight = 70;
    const numAmps = 10;
    const ampWidth = width / numAmps;

    for (let i = 0; i < numAmps; i++) {
      const ax = i * ampWidth;
      ctx.fillStyle = '#0f1118';
      ctx.fillRect(ax + 2, ampY, ampWidth - 4, ampHeight);

      // Gold / white border piping
      ctx.strokeStyle = '#333845';
      ctx.lineWidth = 1;
      ctx.strokeRect(ax + 4, ampY + 4, ampWidth - 8, ampHeight - 8);

      // Vintage grill cloth mesh pattern
      ctx.fillStyle = '#161924';
      ctx.fillRect(ax + 6, ampY + 16, ampWidth - 12, ampHeight - 22);

      // Glowing power switch LED (red/amber)
      ctx.fillStyle = i % 2 === 0 ? '#ef4444' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(ax + ampWidth - 14, ampY + 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Reflective Stage Floor with perspective planks
    ctx.save();
    const floorGrad = ctx.createLinearGradient(0, horizonY, 0, height);
    floorGrad.addColorStop(0, '#090b14');
    floorGrad.addColorStop(1, '#020205');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, horizonY, width, height - horizonY);

    // Perspective floor lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = -width * 0.5; x <= width * 1.5; x += width * 0.1) {
      ctx.beginPath();
      ctx.moveTo(width / 2, horizonY);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    ctx.restore();

    // 6 Intelligent Moving Head Concert Spotlights
    this.spotlightAngle = (now * 0.001) % (Math.PI * 2);
    const numLights = 6;
    const colors = [
      '#00f2ff', // Cyan
      '#EF3800', // Crimson Rock
      '#f59e0b', // Amber Gold
      '#3b82f6', // Royal Blue
      '#10b981', // Emerald
      '#EF3800', // Fire Orange
    ];

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < numLights; i++) {
      const sourceX = (width / (numLights + 1)) * (i + 1);
      const sourceY = 10;

      // Oscillating sweep angle
      const phaseOffset = i * 0.85;
      const sweepAngle = Math.sin(this.spotlightAngle + phaseOffset) * 0.65;
      const targetX = width / 2 + Math.tan(sweepAngle) * (height * 0.85);
      const targetY = height * 0.95;

      const beamColor = colors[i % colors.length];
      const intensity = 0.2 + energy * 0.65;

      // Volumetric Cone Gradient
      const coneGrad = ctx.createLinearGradient(sourceX, sourceY, targetX, targetY);
      coneGrad.addColorStop(0, `${beamColor}cc`);
      coneGrad.addColorStop(0.3, `${beamColor}55`);
      coneGrad.addColorStop(1, `${beamColor}00`);

      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(sourceX - 6, sourceY);
      ctx.lineTo(targetX - 75 - energy * 40, targetY);
      ctx.lineTo(targetX + 75 + energy * 40, targetY);
      ctx.lineTo(sourceX + 6, sourceY);
      ctx.closePath();
      ctx.fill();

      // Spotlight lens flare fixture
      ctx.beginPath();
      ctx.arc(sourceX, sourceY, 12 + energy * 8, 0, Math.PI * 2);
      ctx.fillStyle = `${beamColor}dd`;
      ctx.fill();
    }
    ctx.restore();

    // Stage Fog Volumetric Mist
    const fogGrad = ctx.createLinearGradient(0, height - 120, 0, height);
    fogGrad.addColorStop(0, 'transparent');
    fogGrad.addColorStop(1, 'rgba(0, 242, 255, 0.08)');
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, height - 120, width, 120);
  }

  /**
   * 3. Cosmic Deep Space Nebula
   */
  private renderCosmicSpace(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    energy: number,
    now: number
  ) {
    // Deep Space Gradient
    ctx.fillStyle = '#020208';
    ctx.fillRect(0, 0, width, height);

    // Glowing Galactic Nebula Clouds (multi-stop radial blends)
    const t = now * 0.0004;
    const neb1X = width * (0.35 + Math.sin(t) * 0.1);
    const neb1Y = height * (0.4 + Math.cos(t * 0.8) * 0.1);
    const rad1 = Math.max(width, height) * (0.45 + energy * 0.15);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Cyan Space Cloud
    const g1 = ctx.createRadialGradient(neb1X, neb1Y, 10, neb1X, neb1Y, rad1);
    g1.addColorStop(0, 'rgba(0, 242, 255, 0.35)');
    g1.addColorStop(0.5, 'rgba(13, 37, 96, 0.22)');
    g1.addColorStop(1, 'transparent');
    ctx.fillStyle = g1;
    ctx.beginPath();
    ctx.arc(neb1X, neb1Y, rad1, 0, Math.PI * 2);
    ctx.fill();

    // Orange-Crimson Star Cloud
    const neb2X = width * (0.75 - Math.sin(t * 0.7) * 0.1);
    const neb2Y = height * (0.65 + Math.cos(t * 0.9) * 0.08);
    const rad2 = Math.max(width, height) * (0.4 + energy * 0.12);

    const g2 = ctx.createRadialGradient(neb2X, neb2Y, 10, neb2X, neb2Y, rad2);
    g2.addColorStop(0, 'rgba(239, 56, 0, 0.28)');
    g2.addColorStop(0.45, 'rgba(245, 158, 11, 0.16)');
    g2.addColorStop(1, 'transparent');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(neb2X, neb2Y, rad2, 0, Math.PI * 2);
    ctx.fill();

    // 160 Twinkling & Drifting Stars
    ctx.restore();
    ctx.save();
    for (const s of this.stars) {
      s.y = (s.y + s.speed) % 1;
      const sx = s.x * width;
      const sy = s.y * height;
      const twinkle = (Math.sin(now * 0.003 * s.twinkleSpeed) + 1) * 0.5;
      const alpha = s.baseAlpha * (0.6 + twinkle * 0.4) + energy * 0.25;

      ctx.beginPath();
      ctx.arc(sx, sy, s.size * (1 + energy * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, alpha)})`;
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * 4. Acoustic Rehearsal Studio / Wooden Recording Room
   */
  private renderRehearsalStudio(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    energy: number,
    now: number
  ) {
    // Warm dark studio wall
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(0, 0, width, height);

    // Acoustic Wood Slat Paneling on back wall
    const slatWidth = 18;
    const gap = 8;
    const totalSlats = Math.ceil(width / (slatWidth + gap));

    ctx.save();
    for (let i = 0; i < totalSlats; i++) {
      const sx = i * (slatWidth + gap);
      // Realistic wood tone gradient
      const woodGrad = ctx.createLinearGradient(sx, 0, sx + slatWidth, 0);
      woodGrad.addColorStop(0, '#29211a');
      woodGrad.addColorStop(0.5, '#443528');
      woodGrad.addColorStop(1, '#1f1914');
      ctx.fillStyle = woodGrad;
      ctx.fillRect(sx, 0, slatWidth, height * 0.78);

      // Slat shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(sx + slatWidth, 0, gap, height * 0.78);
    }
    ctx.restore();

    // Studio Hardwood Parquet Floor
    const floorY = height * 0.76;
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, height);
    floorGrad.addColorStop(0, '#1c140e');
    floorGrad.addColorStop(1, '#0c0805');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, width, height - floorY);

    // Warm Tungsten Hanging Pendant Lamps
    const numLamps = 4;
    for (let i = 1; i <= numLamps; i++) {
      const lx = (width / (numLamps + 1)) * i;
      const ly = height * 0.22;

      // Cord
      ctx.strokeStyle = '#3a332a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, ly);
      ctx.stroke();

      // Brass fixture shade
      ctx.fillStyle = '#854d0e';
      ctx.beginPath();
      ctx.moveTo(lx - 16, ly + 14);
      ctx.lineTo(lx + 16, ly + 14);
      ctx.lineTo(lx + 10, ly);
      ctx.lineTo(lx - 10, ly);
      ctx.closePath();
      ctx.fill();

      // Filament bulb
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(lx, ly + 18, 7, 0, Math.PI * 2);
      ctx.fill();

      // Warm Golden Light Pool on the floor & wall
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const rad = height * 0.45;
      const glow = ctx.createRadialGradient(lx, ly + 18, 5, lx, ly + 18, rad);
      glow.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      glow.addColorStop(0.4, 'rgba(245, 158, 11, 0.18)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lx, ly + 18, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Studio Analog Rack VU Meters in lower corner
    this.vuMeterLevel = Math.max(0.15, this.vuMeterLevel * 0.9 + energy * 0.2);
    const vuX = width - 110;
    const vuY = height * 0.62;

    ctx.fillStyle = '#1c1917';
    ctx.fillRect(vuX - 8, vuY - 8, 100, 56);
    ctx.strokeStyle = '#44403c';
    ctx.strokeRect(vuX - 8, vuY - 8, 100, 56);

    // Warm backlit meter face
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(vuX, vuY, 84, 40);

    // Meter scale arc
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(vuX + 42, vuY + 45, 34, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // Bouncing needle
    const needleAngle = Math.PI * 1.2 + this.vuMeterLevel * (Math.PI * 0.6);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(vuX + 42, vuY + 42);
    ctx.lineTo(vuX + 42 + Math.cos(needleAngle) * 32, vuY + 42 + Math.sin(needleAngle) * 32);
    ctx.stroke();

    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.fillStyle = '#78350f';
    ctx.fillText('VU METER', vuX + 24, vuY + 12);
  }

  /**
   * 5. Cyberpunk Neon City
   */
  private renderCyberpunkCity(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    energy: number,
    now: number
  ) {
    // Night sky
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#05030a');
    sky.addColorStop(0.6, '#110924');
    sky.addColorStop(1, '#07040d');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Silhouettes of Futuristic Skyscrapers
    const horizonY = height * 0.68;
    const numBuildings = 14;
    const bWidth = width / numBuildings;

    for (let i = 0; i < numBuildings; i++) {
      const bx = i * bWidth;
      // Deterministic heights based on index
      const hRatio = 0.25 + (((i * 7 + 3) % 9) / 9) * 0.35;
      const bHeight = height * hRatio;
      const by = horizonY - bHeight;

      ctx.fillStyle = '#0a0614';
      ctx.fillRect(bx, by, bWidth + 1, bHeight + 20);

      // Neon antenna spire on tall towers
      if (i % 3 === 0) {
        ctx.strokeStyle = '#00f2ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx + bWidth / 2, by);
        ctx.lineTo(bx + bWidth / 2, by - 24);
        ctx.stroke();

        ctx.fillStyle = '#00f2ff';
        ctx.beginPath();
        ctx.arc(bx + bWidth / 2, by - 24, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Lit windows
      const rows = 12;
      const cols = 3;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((i * 13 + r * 7 + c * 3) % 4 === 0) {
            ctx.fillStyle = (i + r) % 2 === 0 ? 'rgba(0, 242, 255, 0.6)' : 'rgba(239, 56, 0, 0.55)';
            ctx.fillRect(bx + 4 + c * 6, by + 12 + r * 14, 3, 5);
          }
        }
      }
    }

    // Glowing Tron Horizon Grid
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.35)';
    ctx.lineWidth = 1.5;
    for (let y = horizonY; y <= height; y += (height - horizonY) / 10) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (let x = -width * 0.3; x <= width * 1.3; x += width * 0.08) {
      ctx.beginPath();
      ctx.moveTo(width / 2, horizonY);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    ctx.restore();

    // Cyberpunk Neon Rain with motion blur
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.45)';
    ctx.lineWidth = 1.2;
    for (const drop of this.rainDrops) {
      drop.y = (drop.y + drop.speed) % 1;
      const rx = drop.x * width;
      const ry = drop.y * height;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 3, ry + drop.length);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * 6. Zen Nature Sunset & Andean Mountain Lake
   */
  private renderZenNature(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    energy: number,
    now: number
  ) {
    const horizonY = height * 0.62;

    // Atmospheric Sunset Sky Gradient
    const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
    sky.addColorStop(0, '#1e1b4b'); // Deep twilight purple
    sky.addColorStop(0.45, '#701a75'); // Magenta dusk
    sky.addColorStop(0.75, '#ea580c'); // Radiant Sunset Orange
    sky.addColorStop(1, '#fbbf24'); // Golden Horizon
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, horizonY);

    // Glowing Golden Setting Sun
    const sunX = width * 0.5;
    const sunY = horizonY - 20;
    const sunRadius = Math.min(width, height) * 0.12;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, sunRadius * 2.5);
    sunGlow.addColorStop(0, '#fffbeb');
    sunGlow.addColorStop(0.3, '#f59e0b');
    sunGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius * 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Silhouettes of Distant Mountains (2 layers)
    // Layer 1: Far peaks
    ctx.fillStyle = '#4a044e';
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(0, horizonY - height * 0.18);
    ctx.lineTo(width * 0.22, horizonY - height * 0.32);
    ctx.lineTo(width * 0.45, horizonY - height * 0.16);
    ctx.lineTo(width * 0.72, horizonY - height * 0.36);
    ctx.lineTo(width, horizonY - height * 0.2);
    ctx.lineTo(width, horizonY);
    ctx.closePath();
    ctx.fill();

    // Layer 2: Near peaks
    ctx.fillStyle = '#1c0a2a';
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(0, horizonY - height * 0.1);
    ctx.lineTo(width * 0.35, horizonY - height * 0.22);
    ctx.lineTo(width * 0.58, horizonY - height * 0.12);
    ctx.lineTo(width * 0.85, horizonY - height * 0.26);
    ctx.lineTo(width, horizonY - height * 0.14);
    ctx.lineTo(width, horizonY);
    ctx.closePath();
    ctx.fill();

    // Reflective Mountain Lake with gentle water ripples
    const lake = ctx.createLinearGradient(0, horizonY, 0, height);
    lake.addColorStop(0, '#fbbf24');
    lake.addColorStop(0.15, '#c2410c');
    lake.addColorStop(0.5, '#4a044e');
    lake.addColorStop(1, '#0f051d');
    ctx.fillStyle = lake;
    ctx.fillRect(0, horizonY, width, height - horizonY);

    // Ripple lines on water
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.25)';
    ctx.lineWidth = 1;
    for (let r = 1; r <= 8; r++) {
      const ry = horizonY + r * ((height - horizonY) / 9);
      const waveOffset = Math.sin(now * 0.002 + r) * 20;
      ctx.beginPath();
      ctx.moveTo(width * 0.3 + waveOffset, ry);
      ctx.lineTo(width * 0.7 + waveOffset, ry);
      ctx.stroke();
    }
  }

  /**
   * Seamlessly blends the live performer / hands over the virtual stage
   */
  private drawPerformerOverStage(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    width: number,
    height: number,
    presence: number,
    mode: string,
    energy: number
  ) {
    ctx.save();
    ctx.globalAlpha = Math.min(1.0, presence);

    // Subtle edge contrast enhancement
    if (mode === 'rock-concert' || mode === 'cyberpunk-city') {
      ctx.filter = `contrast(1.15) brightness(${0.9 + energy * 0.2})`;
    } else if (mode === 'cosmic-space') {
      ctx.filter = 'contrast(1.1) brightness(0.95)';
    }

    // Mirrored video draw
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    // Soft spotlight vignette on the performer
    ctx.save();
    const vignette = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.2,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.75
    );
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, 'rgba(5, 5, 12, 0.45)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  /**
   * Helper to draw clean mirrored webcam
   */
  private drawMirroredVideo(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    width: number,
    height: number,
    alpha: number,
    dimming: number
  ) {
    if (video.readyState < 2) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    if (dimming > 0) {
      ctx.fillStyle = `rgba(5, 5, 12, ${dimming})`;
      ctx.fillRect(0, 0, width, height);
    }
  }
}

export const virtualStageRenderer = new VirtualStageRenderer();
