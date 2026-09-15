// Entité Stargate : Porte des Étoiles Circulaire avec Chevrons, Vortex Énergétique & Glyphe Grec de Destination

import { Renderer } from '../engine/Renderer';

export class Stargate {
  public x: number;
  public y: number;
  public radius: number = 130;
  public destinationGreek: string;
  public destinationSectorName: string;

  public openProgress: number = 0; // 0 à 1 (déploiement de l'horizon des événements)
  public rotationAngle: number = 0;
  public chevronCount: number = 9;
  public chevronGlows: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  public isFullyOpen: boolean = false;
  public isEngulfing: boolean = false;
  public engulfTimer: number = 0;
  public vortexPhase: number = 0;

  // Particules d'énergie du vortex
  private vortexParticles: { angle: number; dist: number; speed: number; size: number; color: string }[] = [];

  constructor(
    x: number,
    y: number,
    destinationGreek: string,
    destinationSectorName: string
  ) {
    this.x = x;
    this.y = y;
    this.destinationGreek = destinationGreek;
    this.destinationSectorName = destinationSectorName;

    // Initialisation des micro-particules du vortex
    for (let i = 0; i < 48; i++) {
      this.vortexParticles.push({
        angle: Math.random() * Math.PI * 2,
        dist: 0.15 + Math.random() * 0.82,
        speed: 1.2 + Math.random() * 2.4,
        size: 1.5 + Math.random() * 2.5,
        color: Math.random() < 0.6 ? '#00F0FF' : (Math.random() < 0.85 ? '#7928CA' : '#FFFFFF')
      });
    }
  }

  public update(dt: number) {
    this.vortexPhase += dt * 3.5;
    this.rotationAngle += dt * 0.45;

    // Déploiement progressif de la porte à l'apparition (1.2s)
    if (this.openProgress < 1) {
      this.openProgress = Math.min(1, this.openProgress + dt * 1.2);
      // Allumage séquentiel des 9 chevrons
      const activeChevrons = Math.floor(this.openProgress * this.chevronCount);
      for (let i = 0; i < this.chevronCount; i++) {
        if (i <= activeChevrons) {
          this.chevronGlows[i] = Math.min(1, (this.chevronGlows[i] || 0) + dt * 4);
        }
      }
      if (this.openProgress >= 1) {
        this.isFullyOpen = true;
      }
    } else {
      // Effet de pulsation continue des chevrons
      for (let i = 0; i < this.chevronCount; i++) {
        this.chevronGlows[i] = 0.8 + Math.sin(this.vortexPhase * 2 + i) * 0.2;
      }
    }

    // Mise à jour des particules du vortex qui spiralent vers le centre
    for (const p of this.vortexParticles) {
      p.angle += p.speed * dt;
      p.dist -= dt * 0.12;
      if (p.dist <= 0.08) {
        p.dist = 0.95;
        p.angle = Math.random() * Math.PI * 2;
      }
    }

    if (this.isEngulfing) {
      this.engulfTimer += dt;
    }
  }

  public startEngulfing() {
    this.isEngulfing = true;
    this.engulfTimer = 0;
  }

  public draw3D(ctx: CanvasRenderingContext2D, renderer: Renderer) {
    const pt = renderer.project(this.x, this.y);
    if (!pt.isVisible || pt.scale <= 0.04) return;

    const s = pt.scale;
    const r = this.radius * s;
    if (r <= 5) return;

    ctx.save();
    ctx.translate(pt.x, pt.y);

    // 1. Halo cosmique d'hyperpropulsion en arrière-plan
    const haloGrad = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.8);
    haloGrad.addColorStop(0, `rgba(0, 240, 255, ${0.45 * this.openProgress})`);
    haloGrad.addColorStop(0.5, `rgba(121, 40, 202, ${0.28 * this.openProgress})`);
    haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 2. Horizon des événements (Le vortex bleu / eau quantique)
    if (this.openProgress > 0) {
      const vortexR = (r - 18 * s) * this.openProgress;

      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, vortexR, 0, Math.PI * 2);
      ctx.clip();

      // Fond stellaire sombre du vortex
      const vortexBg = ctx.createRadialGradient(0, 0, 5 * s, 0, 0, vortexR);
      vortexBg.addColorStop(0, '#020617');
      vortexBg.addColorStop(0.4, '#082f49');
      vortexBg.addColorStop(0.8, '#0369a1');
      vortexBg.addColorStop(1, '#38bdf8');
      ctx.fillStyle = vortexBg;
      ctx.fillRect(-vortexR, -vortexR, vortexR * 2, vortexR * 2);

      // Ondulations concentriques d'eau quantique (ripples)
      for (let w = 1; w <= 4; w++) {
        const rippleR = ((this.vortexPhase * 25 + w * 28) % vortexR);
        const alpha = Math.max(0, 1 - rippleR / vortexR) * 0.35;
        ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
        ctx.lineWidth = Math.max(1, 2.5 * s);
        ctx.beginPath();
        ctx.arc(0, 0, rippleR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Particules spiralantes
      for (const p of this.vortexParticles) {
        const px = Math.cos(p.angle) * vortexR * p.dist;
        const py = Math.sin(p.angle) * vortexR * p.dist;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, p.size * s, 0, Math.PI * 2);
        ctx.fill();
      }

      // Singularité centrale (trou de ver)
      const singR = vortexR * 0.28;
      const singGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, singR);
      singGrad.addColorStop(0, '#FFFFFF');
      singGrad.addColorStop(0.4, '#00F0FF');
      singGrad.addColorStop(0.9, '#1e1b4b');
      singGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = singGrad;
      ctx.beginPath();
      ctx.arc(0, 0, singR, 0, Math.PI * 2);
      ctx.fill();

      // 3. Glyphe Grec Holographique Géant flottant au centre de la singularité
      const glyphScale = 1.0 + Math.sin(this.vortexPhase * 2) * 0.08;
      const fontSize = Math.max(24, Math.floor(62 * s * glyphScale));
      ctx.font = `900 ${fontSize}px 'Orbitron', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Lueur néon
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 20 * s;

      // Double contour pour lisibilité extrême
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = Math.max(3, 6 * s);
      ctx.strokeText(this.destinationGreek, 0, 0);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(this.destinationGreek, 0, 0);
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    // 4. Anneau Métallique Interne (Glyphes & Gravures rotatives)
    ctx.save();
    ctx.rotate(this.rotationAngle);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = Math.max(2, 4 * s);
    ctx.beginPath();
    ctx.arc(0, 0, r - 12 * s, 0, Math.PI * 2);
    ctx.stroke();

    // Crans gravés sur l'anneau intérieur
    const notchCount = 36;
    for (let n = 0; n < notchCount; n++) {
      const a = (n * Math.PI * 2) / notchCount;
      const inR = r - 16 * s;
      const outR = r - 10 * s;
      ctx.strokeStyle = (n % 4 === 0) ? '#00F0FF' : 'rgba(148, 163, 184, 0.5)';
      ctx.lineWidth = Math.max(1, 1.8 * s);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inR, Math.sin(a) * inR);
      ctx.lineTo(Math.cos(a) * outR, Math.sin(a) * outR);
      ctx.stroke();
    }
    ctx.restore();

    // 5. Anneau Métallique Principal Extérieur (Blindage Naquadah lourd)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = Math.max(4, 10 * s);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = Math.max(1.5, 2.5 * s);
    ctx.beginPath();
    ctx.arc(0, 0, r + 4 * s, 0, Math.PI * 2);
    ctx.stroke();

    // 6. Les 9 Chevrons de Verrouillage Stargate (V en coin qui s'illuminent en orange/cyan)
    for (let c = 0; c < this.chevronCount; c++) {
      const angle = (c * Math.PI * 2) / this.chevronCount - Math.PI / 2;
      const glow = this.chevronGlows[c] || 0;

      ctx.save();
      ctx.rotate(angle);

      // Support métallique du chevron
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = Math.max(1, 2 * s);
      ctx.beginPath();
      ctx.moveTo(-10 * s, r - 8 * s);
      ctx.lineTo(-14 * s, r + 14 * s);
      ctx.lineTo(0, r + 22 * s);
      ctx.lineTo(14 * s, r + 14 * s);
      ctx.lineTo(10 * s, r - 8 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cœur lumineux du Chevron (Prisme énergétique)
      if (glow > 0) {
        ctx.fillStyle = (glow > 0.8) ? '#FFFFFF' : '#FF9900';
        ctx.shadowColor = (c % 2 === 0) ? '#FF7700' : '#00F0FF';
        ctx.shadowBlur = (12 * glow) * s;

        ctx.beginPath();
        ctx.moveTo(-6 * s, r + 2 * s);
        ctx.lineTo(-8 * s, r + 12 * s);
        ctx.lineTo(0, r + 18 * s);
        ctx.lineTo(8 * s, r + 12 * s);
        ctx.lineTo(6 * s, r + 2 * s);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }

    // 7. Bannière holographique épurée au-dessus de la Stargate : Nom du secteur
    const sectorTitle = `Secteur ${this.destinationSectorName.charAt(0).toUpperCase() + this.destinationSectorName.slice(1)}`;
    const fontSize = Math.max(11, Math.floor(14 * s));
    ctx.font = `800 ${fontSize}px 'Orbitron', sans-serif`;
    const textWidth = ctx.measureText(sectorTitle).width;
    const bannerW = Math.max(120, textWidth + 36 * s);
    const bannerH = Math.max(22, 28 * s);
    const bannerY = -r - bannerH - 12 * s;

    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = Math.max(1.5, 2 * s);
    ctx.beginPath();
    ctx.roundRect(-bannerW / 2, bannerY, bannerW, bannerH, 6 * s);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#00F0FF';
    if (Renderer.enableGlow) {
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 8 * s;
    }
    ctx.fillText(sectorTitle, 0, bannerY + bannerH / 2);
    ctx.shadowBlur = 0;

    ctx.restore();
  }
}
