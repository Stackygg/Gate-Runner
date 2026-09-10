// Vaisseau Prototype libéré d'une Prison Spatiale
// Descend vers la flotte du joueur pour améliorer son modèle visuel et ses caractéristiques de combat

import { Renderer } from '../engine/Renderer';

export interface ShipRankInfo {
  rank: number;
  name: string;
  perkName: string;
  description: string;
  color: string;
  glowColor: string;
}

export const SHIP_RANKS: Record<number, ShipRankInfo> = {
  1: {
    rank: 1,
    name: 'SCYTHE INTERCEPTOR',
    perkName: 'Tir Standard',
    description: 'Armement standard de patrouille',
    color: '#00F0FF',
    glowColor: '#00F0FF'
  },
  2: {
    rank: 2,
    name: 'FALCON FIGHTER',
    perkName: '+30% ATTACK',
    description: '+30% de dégâts de tir',
    color: '#00FF88',
    glowColor: '#00FF88'
  },
  3: {
    rank: 3,
    name: 'VALKYRIE CRUSADER',
    perkName: 'PIERCING ATTACK',
    description: 'Tirs perçants traversant les cibles',
    color: '#FFE600',
    glowColor: '#FF8800'
  },
  4: {
    rank: 4,
    name: 'PHANTOM BOMBER',
    perkName: '+50% FIRE RATE',
    description: '+50% cadence de tir et rafales rapides',
    color: '#B026FF',
    glowColor: '#FF00DD'
  },
  5: {
    rank: 5,
    name: 'HYPERION TITAN',
    perkName: '+100% OVERDRIVE',
    description: 'Puissance maximale x2 + Perçage intégral',
    color: '#FFFFFF',
    glowColor: '#00F0FF'
  }
};

export class RescuedShip {
  public x: number;
  public y: number;
  public targetRank: number;
  public isCollected: boolean = false;
  public isDead: boolean = false;
  public radius: number = 24;

  private phase: number = 0;
  private speedY: number = 240;

  constructor(x: number, y: number, targetRank: number = 2) {
    this.x = x;
    this.y = y;
    this.targetRank = Math.min(5, Math.max(2, targetRank));
  }

  public update(dt: number, fleetX: number, fleetY: number): boolean {
    this.phase += dt * 4;

    // Descente fluide avec attraction progressive vers la flotte
    this.y += this.speedY * dt;
    const dx = fleetX - this.x;
    this.x += dx * Math.min(1, 4.0 * dt);

    // Dépassement bas d'écran
    if (this.y > 950) {
      this.isDead = true;
      return false;
    }

    // Détection d'interception par la flotte
    const distY = Math.abs(this.y - fleetY);
    const distX = Math.abs(this.x - fleetX);
    if (distY < 48 && distX < 65) {
      this.isCollected = true;
      this.isDead = true;
      return true; // Déclenche l'évolution de rang !
    }

    return false;
  }

  public draw3D(ctx: CanvasRenderingContext2D, renderer: Renderer) {
    const pt = renderer.project(this.x, this.y);
    if (!pt.isVisible || pt.scale <= 0.05) return;

    const s = pt.scale;
    const rankInfo = SHIP_RANKS[this.targetRank] || SHIP_RANKS[2];
    const r = Math.max(14, this.radius * s);

    ctx.save();
    ctx.translate(pt.x, pt.y);

    // 1. Aura protectrice d'énergie avec pulsation
    const pulse = 1.0 + Math.sin(this.phase) * 0.12;
    const auraRadius = r * 1.5 * pulse;
    const auraGrad = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, auraRadius);
    auraGrad.addColorStop(0, rankInfo.color);
    auraGrad.addColorStop(0.5, rankInfo.glowColor + '88');
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = auraGrad;
    if (Renderer.enableGlow) {
      ctx.shadowColor = rankInfo.glowColor;
      ctx.shadowBlur = 20 * s;
    }
    ctx.beginPath();
    ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Anneau orbital tournant
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1, 2 * s);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.3, r * 0.65, this.phase * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Silhouette miniature du prototype de vaisseau
    ctx.save();
    ctx.scale(s * 0.9, s * 0.9);
    ctx.fillStyle = rankInfo.color;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(12, 10);
    ctx.lineTo(6, 12);
    ctx.lineTo(0, 7);
    ctx.lineTo(-6, 12);
    ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Réacteur miniature
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 10, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Badge flottant au-dessus avec nom et perk
    const badgeW = Math.max(110, 160 * s);
    const badgeH = Math.max(20, 26 * s);
    const badgeY = -r - badgeH - 6 * s;

    ctx.fillStyle = 'rgba(5, 10, 24, 0.88)';
    ctx.strokeStyle = rankInfo.color;
    ctx.lineWidth = Math.max(1, 1.5 * s);
    ctx.beginPath();
    ctx.roundRect(-badgeW / 2, badgeY, badgeW, badgeH, 6 * s);
    ctx.fill();
    ctx.stroke();

    // Texte du badge
    ctx.font = `900 ${Math.max(8, Math.floor(10 * s))}px 'Orbitron', sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`⭐ ${rankInfo.name}`, 0, badgeY + badgeH * 0.35);

    ctx.font = `800 ${Math.max(7, Math.floor(8.5 * s))}px 'Orbitron', sans-serif`;
    ctx.fillStyle = rankInfo.color;
    ctx.fillText(`[ ${rankInfo.perkName} ]`, 0, badgeY + badgeH * 0.75);

    ctx.restore();
  }
}
