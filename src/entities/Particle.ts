// Système de particules et textes flottants en 3D Perspective

import { Renderer } from '../engine/Renderer';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type?: 'circle' | 'spark' | 'ring' | 'gem';
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  fontSize: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];

  public update(dt: number, magnetX?: number, magnetY?: number, magnetRadius?: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Attraction magnétique fluide des gemmes vers le vaisseau
      if (p.type === 'gem' && magnetRadius && magnetRadius > 0 && magnetX !== undefined && magnetY !== undefined) {
        const dx = magnetX - p.x;
        const dy = magnetY - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= magnetRadius && dist > 5) {
          const pullSpeed = (1 - dist / magnetRadius) * 900 + 200;
          p.vx += (dx / dist) * pullSpeed * dt;
          p.vy += (dy / dist) * pullSpeed * dt;
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y += t.vy * dt;
      t.life -= dt;
      t.alpha = Math.max(0, t.life / t.maxLife);

      if (t.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  public draw3D(ctx: CanvasRenderingContext2D, renderer: Renderer) {
    // 1. Particules 3D
    ctx.save();
    for (const p of this.particles) {
      const pt = renderer.project(p.x, p.y);
      if (!pt.isVisible) continue;

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;

      const pSize = Math.max(1, p.size * pt.scale);

      if (p.type === 'ring') {
        const radius = pSize * (2 - p.alpha);
        ctx.lineWidth = Math.max(1, 3 * pt.scale);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'gem') {
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y - pSize);
        ctx.lineTo(pt.x + pSize * 0.8, pt.y);
        ctx.lineTo(pt.x, pt.y + pSize);
        ctx.lineTo(pt.x - pSize * 0.8, pt.y);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // 2. Textes flottants 3D (Rendu net et réactif sans shadowBlur lourd)
    for (const t of this.floatingTexts) {
      const pt = renderer.project(t.x, t.y);
      if (!pt.isVisible) continue;

      ctx.save();
      ctx.globalAlpha = t.alpha;
      const fSize = Math.max(9, Math.floor(t.fontSize * pt.scale));
      ctx.font = `900 ${fSize}px 'Orbitron', 'Outfit', sans-serif`;
      ctx.textAlign = 'center';

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(1.5, 2.5 * pt.scale);
      ctx.strokeText(t.text, pt.x, pt.y);

      ctx.fillStyle = t.color;
      ctx.fillText(t.text, pt.x, pt.y);
      ctx.restore();
    }
  }

  public spawnExplosion(x: number, y: number, color: string = '#00F0FF', count: number = 18) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 240;
      const life = 0.3 + Math.random() * 0.4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        color,
        alpha: 1,
        life,
        maxLife: life,
        type: 'spark'
      });
    }

    if (count >= 10) {
      this.particles.push({
        x,
        y,
        vx: 0,
        vy: 0,
        size: 15,
        color,
        alpha: 1,
        life: 0.35,
        maxLife: 0.35,
        type: 'ring'
      });
    }
  }

  public spawnGateHitSpark(x: number, y: number, color: string) {
    for (let i = 0; i < 4; i++) {
      const angle = (Math.random() - 0.5) * Math.PI;
      const speed = 80 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.sin(angle) * speed,
        vy: Math.cos(angle) * speed,
        size: 3,
        color,
        alpha: 1,
        life: 0.25,
        maxLife: 0.25,
        type: 'spark'
      });
    }
  }

  public spawnFloatingText(x: number, y: number, text: string, color: string = '#00F0FF', size: number = 20) {
    this.floatingTexts.push({
      x,
      y,
      vy: -110,
      text,
      color,
      fontSize: size,
      alpha: 1,
      life: 0.8,
      maxLife: 0.8
    });
  }

  public spawnGems(x: number, y: number, count: number = 3) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5,
        color: '#FFE600',
        alpha: 1,
        life: 0.6,
        maxLife: 0.6,
        type: 'gem'
      });
    }
  }

  public clear() {
    this.particles = [];
    this.floatingTexts = [];
  }
}
