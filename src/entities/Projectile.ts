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
    this.radius = type === 'plasma' ? 8 : (type === 'missile' ? 6 : 4);
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

    if (this.isCrit) {
      ctx.fillStyle = '#FFE600';
    } else if (this.isExplosive) {
      ctx.fillStyle = '#FF5500';
    } else {
      ctx.fillStyle = this.color;
    }

    // Calcul de l'angle pour orienter le tir dans sa direction réelle
    const angle = Math.atan2(this.vy, this.vx);
    const rot = angle + Math.PI / 2;

    ctx.translate(pt.x, pt.y);
    if (Math.abs(rot) > 0.01) {
      ctx.rotate(rot);
    }

    if (this.type === 'laser') {
      const beamW = Math.max(2, (this.isPiercing || this.isCrit ? 8 : (this.isExplosive ? 7 : 5)) * s);
      const beamH = Math.max(6, (this.isPiercing || this.isCrit ? 34 : (this.isExplosive ? 28 : 24)) * s);
      ctx.fillRect(-beamW / 2, -beamH, beamW, beamH);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-beamW * 0.25, -beamH * 0.9, beamW * 0.5, beamH * 0.8);
      if (this.isPiercing) {
        ctx.strokeStyle = '#FFE600';
        ctx.lineWidth = Math.max(1, 1.5 * s);
        ctx.strokeRect(-beamW * 0.7, -beamH * 1.05, beamW * 1.4, beamH * 1.1);
      }
      if (this.isExplosive) {
        ctx.strokeStyle = '#FF6600';
        ctx.lineWidth = Math.max(1, 1.5 * s);
        ctx.strokeRect(-beamW * 0.9, -beamH * 1.1, beamW * 1.8, beamH * 1.2);
      }
    } else if (this.type === 'plasma') {
      const r = Math.max(3, (this.isCrit ? 9 : 7) * s);
      ctx.beginPath();
      ctx.arc(0, -r, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, -r, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'missile') {
      const w = Math.max(3, 6 * s);
      const h = Math.max(8, 18 * s);
      ctx.fillRect(-w / 2, -h, w, h);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-w * 0.3, -h * 0.9, w * 0.6, h * 0.4);
      if (this.isExplosive) {
        const r = Math.max(4, 9 * s);
        ctx.strokeStyle = '#FF3300';
        ctx.lineWidth = Math.max(1, 2 * s);
        ctx.beginPath();
        ctx.arc(0, -r, r * 1.6, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (this.type === 'enemy_bullet') {
      const r = Math.max(3, 6 * s);
      ctx.fillStyle = this.color || '#FF0055';
      ctx.beginPath();
      ctx.arc(0, -r, r, 0, Math.PI * 2);
      ctx.fill();

      // Coeur blanc lumineux
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, -r, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
