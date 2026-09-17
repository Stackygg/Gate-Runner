// Projectiles de la flotte (portée limitée à ~50% de la distance) et des ennemis en 3D Perspective

import { Renderer } from '../engine/Renderer';

export type ProjectileType = 'laser' | 'plasma' | 'missile' | 'enemy_bullet';

export class Projectile {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public damage: number;
  public type: ProjectileType;
  public radius: number;
  public color: string;
  public isDead: boolean = false;
  public trailTimer: number = 0;
  public isPiercing: boolean = false;
  public pierceCount: number = 0;
  public maxPierces: number = 2;
  public isExplosive: boolean = false;
  public explosionRadius: number = 0;
  public explosionDamagePct: number = 50;
  public isCrit: boolean = false;
  public hitTargets: Set<any> = new Set();

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    type: ProjectileType = 'laser',
    color: string = '#00F0FF'
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.type = type;
    this.color = color;
    this.radius = type === 'plasma' ? 4 : (type === 'missile' ? 3.5 : (type === 'enemy_bullet' ? 4.5 : 3));
  }

  public update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Portée des tirs étendue (360° et standard)
    if (this.y < -1300 || this.y > 1150 || this.x < -150 || this.x > 700) {
      this.isDead = true;
    }
  }

  public draw3D(ctx: CanvasRenderingContext2D, renderer: Renderer) {
    const pt = renderer.project(this.x, this.y);
    if (!pt.isVisible || pt.scale <= 0.05) return;

    ctx.save();
    const s = pt.scale;

    // Fondu d'atténuation en très longue portée (Y < -500) uniquement si on tire vers le haut
    if (this.type !== 'enemy_bullet' && this.y < -500 && this.vy < 0) {
      const alpha = Math.max(0, Math.min(1, (this.y + 800) / 300));
      ctx.globalAlpha = alpha;
    }

    let mainColor = this.color;
    if (this.isCrit) {
      mainColor = '#FFE600';
    } else if (this.isExplosive) {
      mainColor = '#FF5500';
    }

    // Positionnement centré au point projeté (0, 0) pour un tir rond parfait sous tous les angles
    ctx.translate(pt.x, pt.y);

    if (this.type === 'laser') {
      // Tir standard : micro-orbe d'énergie ronde, fine et ultra-lumineuse (suppression des traits/barres)
      const r = Math.max(1.8, (this.isPiercing || this.isCrit ? 3.0 : (this.isExplosive ? 2.8 : 2.4)) * s);

      // Anneau subtil d'énergie pour tirs perçants ou explosifs
      if (this.isPiercing) {
        ctx.strokeStyle = '#FFE600';
        ctx.lineWidth = Math.max(0.75, 1.2 * s);
        ctx.beginPath();
        ctx.arc(0, 0, r + 1.3 * s, 0, Math.PI * 2);
        ctx.stroke();
      } else if (this.isExplosive) {
        ctx.strokeStyle = '#FF6600';
        ctx.lineWidth = Math.max(0.75, 1.2 * s);
        ctx.beginPath();
        ctx.arc(0, 0, r + 1.3 * s, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Orbe principal coloré
      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Cœur blanc pur vif
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.52, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === 'plasma') {
      // Plasma : orbe d'énergie dense mais fine et compacte (sans écraser l'écran)
      const r = Math.max(2.2, (this.isCrit ? 4.0 : 3.3) * s);

      // Fine aura plasma extérieure
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = Math.max(0.75, 1.1 * s);
      ctx.beginPath();
      ctx.arc(0, 0, r + 1.2 * s, 0, Math.PI * 2);
      ctx.stroke();

      // Corps du plasma
      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Cœur surchauffé blanc
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.52, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === 'missile') {
      // Missile : tête cinétique ronde et profilée (plus de trait rectangulaire)
      const r = Math.max(2.0, 3.0 * s);

      if (this.isExplosive) {
        ctx.strokeStyle = '#FF3300';
        ctx.lineWidth = Math.max(0.75, 1.2 * s);
        ctx.beginPath();
        ctx.arc(0, 0, r + 1.5 * s, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Tête d'ogive ronde
      ctx.fillStyle = '#FF7700';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Cœur incandescent
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === 'enemy_bullet') {
      // Tir ennemi : orbe rond ultra-visible avec halo de danger, traînée comète et cœur blanc
      let hostileColor = this.color || '#FF0055';
      if (hostileColor === '#00F0FF' || hostileColor === '#38BDF8' || hostileColor === '#FFFFFF') {
        hostileColor = '#FF0055';
      }

      // Rayon étalonné pour être immédiatement lisible et esquivable sans écraser l'écran
      const r = Math.max(3.8, 6.2 * s);
      const pulse = 1 + 0.12 * Math.sin(Date.now() * 0.012);
      const haloR = r * 1.85 * pulse;

      // 1. Traînée comète directionnelle indiquant nettement la course du tir
      const prevPt = renderer.project(this.x - this.vx * 0.035, this.y - this.vy * 0.035);
      if (prevPt.isVisible) {
        const tdx = prevPt.x - pt.x;
        const tdy = prevPt.y - pt.y;
        const tLen = Math.hypot(tdx, tdy);
        if (tLen > 0.5) {
          const tailLen = Math.min(26, Math.max(8, tLen * 1.6)) * s;
          const tailX = (tdx / tLen) * tailLen;
          const tailY = (tdy / tLen) * tailLen;

          // Traînée externe diffuse
          ctx.strokeStyle = hostileColor;
          ctx.globalAlpha = 0.45;
          ctx.lineWidth = Math.max(2.4, r * 1.4);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(tailX, tailY);
          ctx.stroke();

          // Traînée interne vive
          ctx.strokeStyle = '#FFFFFF';
          ctx.globalAlpha = 0.75;
          ctx.lineWidth = Math.max(1.2, r * 0.6);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(tailX * 0.6, tailY * 0.6);
          ctx.stroke();
        }
      }

      // 2. Halo lumineux diffus (Aura de danger pulsante)
      ctx.fillStyle = hostileColor;
      ctx.globalAlpha = 0.38;
      ctx.beginPath();
      ctx.arc(0, 0, haloR, 0, Math.PI * 2);
      ctx.fill();

      // 3. Contour de contraste sombre (détache le tir de tous les fonds clairs / explosions)
      ctx.strokeStyle = 'rgba(5, 2, 12, 0.85)';
      ctx.lineWidth = Math.max(1.4, 2.0 * s);
      ctx.beginPath();
      ctx.arc(0, 0, r + 0.8 * s, 0, Math.PI * 2);
      ctx.stroke();

      // 4. Orbe principal saturé de couleur hostile
      ctx.fillStyle = hostileColor;
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // 5. Anneau d'énergie vive intermédiaire
      ctx.strokeStyle = '#FFFFFF';
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = Math.max(0.8, 1.2 * s);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
      ctx.stroke();

      // 6. Cœur incandescent blanc pur
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
