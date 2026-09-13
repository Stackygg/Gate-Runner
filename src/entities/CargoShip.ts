// Vaisseau Cargo d'Iridium (Unité centrale à protéger en mode Arène Défense 360°)

import { GAME_CONFIG } from '../config';
import { Renderer } from '../engine/Renderer';

export class CargoShip {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public hp: number;
  public maxHp: number;
  public hitFlashTimer: number = 0;
  public shieldRotation: number = 0;
  public animationPhase: number = 0;

  constructor(maxHp: number = GAME_CONFIG.CARGO_BASE_HP) {
    this.x = GAME_CONFIG.CARGO_CENTER_X;
    this.y = GAME_CONFIG.CARGO_CENTER_Y;
    this.width = GAME_CONFIG.CARGO_WIDTH;
    this.height = GAME_CONFIG.CARGO_HEIGHT;
    this.hp = maxHp;
    this.maxHp = maxHp;
  }

  public takeDamage(amount: number = 10): number {
    const actual = Math.min(this.hp, amount);
    this.hp -= actual;
    this.hitFlashTimer = 0.25; // 250ms de flash visuel
    return actual;
  }

  public isDestroyed(): boolean {
    return this.hp <= 0;
  }

  public update(dt: number) {
    this.animationPhase += dt * 3;
    this.shieldRotation += dt * 0.8;
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const isHit = this.hitFlashTimer > 0;
    const hpRatio = Math.max(0, Math.min(1, this.hp / this.maxHp));

    // 1. Champ de force / Bouclier holographique défensif
    const shieldRadius = 48 + Math.sin(this.animationPhase * 2) * 2;
    ctx.save();
    ctx.rotate(this.shieldRotation);
    ctx.beginPath();
    ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
    ctx.strokeStyle = isHit ? 'rgba(255, 68, 102, 0.85)' : 'rgba(0, 240, 255, 0.45)';
    ctx.lineWidth = isHit ? 2.5 : 1.5;
    ctx.stroke();

    ctx.fillStyle = isHit ? 'rgba(255, 0, 85, 0.12)' : 'rgba(0, 240, 255, 0.08)';
    ctx.fill();

    // Réticule hexagonal holographique
    ctx.strokeStyle = isHit ? 'rgba(255, 100, 100, 0.4)' : 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const hx = Math.cos(a) * (shieldRadius * 0.9);
      const hy = Math.sin(a) * (shieldRadius * 0.9);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // 2. Flammes de maintien stationnaire des 4 réacteurs
    const flameLen = 8 + Math.sin(this.animationPhase * 6) * 3;
    const thrusters = [
      { x: -18, y: 28 },
      { x: 18, y: 28 },
      { x: -24, y: 0 },
      { x: 24, y: 0 }
    ];

    ctx.fillStyle = '#00F0FF';
    for (const t of thrusters) {
      ctx.beginPath();
      ctx.ellipse(t.x, t.y + 4, 3, flameLen, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Coque principale du cargo
    ctx.fillStyle = isHit ? '#FFFFFF' : '#1e293b';
    ctx.strokeStyle = isHit ? '#FF4466' : '#38bdf8';
    ctx.lineWidth = 2;

    if (Renderer.enableGlow) {
      ctx.shadowColor = isHit ? '#FF0055' : '#00F0FF';
      ctx.shadowBlur = 12;
    }

    // Forme de coque hexagonale blindée
    ctx.beginPath();
    ctx.moveTo(0, -32);     // Nez
    ctx.lineTo(22, -18);    // Flanc avant droit
    ctx.lineTo(26, 16);     // Flanc arrière droit
    ctx.lineTo(16, 30);     // Moteur droit
    ctx.lineTo(-16, 30);    // Moteur gauche
    ctx.lineTo(-26, 16);    // Flanc arrière gauche
    ctx.lineTo(-22, -18);   // Flanc avant gauche
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. Conteneurs d'Iridium (4 capsules d'Iridium lourd luisant)
    const podColors = ['#00F0FF', '#38bdf8', '#0284c7'];
    const pods = [
      { x: -12, y: -10 },
      { x: 12, y: -10 },
      { x: -12, y: 8 },
      { x: 12, y: 8 }
    ];

    for (const p of pods) {
      ctx.fillStyle = isHit ? '#FF88AA' : '#0369a1';
      ctx.fillRect(p.x - 6, p.y - 6, 12, 12);

      // Cœur énergétique d'Iridium
      ctx.fillStyle = isHit ? '#FFFFFF' : '#00F0FF';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x - 6, p.y - 6, 12, 12);
    }

    // 5. Passerelle de commandement centrale
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(0, -14, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Visière lumineuse de la passerelle
    ctx.fillStyle = isHit ? '#FF0055' : '#38bdf8';
    ctx.beginPath();
    ctx.ellipse(0, -16, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 6. Insigne Iridium Convoi
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('IR-01', 0, 22);

    // 7. Barre de santé cybernétique flottante au-dessus du vaisseau
    const barW = 76;
    const barH = 6;
    const barX = -barW / 2;
    const barY = -shieldRadius - 16;

    // Fond de la barre
    ctx.fillStyle = 'rgba(6, 11, 28, 0.85)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 3);
    ctx.fill();
    ctx.stroke();

    // Remplissage PV
    const fillW = Math.max(0, barW * hpRatio);
    let fillGrad = '#00FF88';
    if (hpRatio <= 0.25) fillGrad = '#FF0055';
    else if (hpRatio <= 0.5) fillGrad = '#FFAA00';

    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.roundRect(barX + 1, barY + 1, Math.max(0, fillW - 2), barH - 2, 2);
    ctx.fill();

    // Tag textuel PV
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 7.5px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`CONVOI : ${Math.ceil(this.hp)} / ${this.maxHp} PV`, 0, barY - 3);

    ctx.restore();
  }
}
