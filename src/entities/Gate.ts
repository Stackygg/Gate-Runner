// Portails interactifs 3D avec distinction Portails Normaux (Fixes) vs Portails Spéciaux (Améliorables au tir)

import { GAME_CONFIG } from '../config';
import { Renderer } from '../engine/Renderer';
import type { Enemy } from './Enemy';

export type GateType = 
  | 'ADD_SHIPS' 
  | 'MULTIPLY_SHIPS' 
  | 'SUBTRACT_SHIPS' 
  | 'DIVIDE_SHIPS' 
  | 'ADD_FIRERATE' 
  | 'ADD_DAMAGE';

export class Gate {
  public x: number; // Centre X dans le monde
  public y: number; // Centre Y dans le monde
  public width: number;
  public height: number;
  public type: GateType;
  public value: number;
  public rawValue: number;
  public isSpecial: boolean; // Si true : améliorable au tir avec palette Cyan / Vert d'eau & Orange néon
  public isPassed: boolean = false;
  public isBossReward: boolean = false;
  public pairGate?: Gate; // Portail jumeau (choix exclusif : franchir l'un fait disparaître l'autre)
  public assignedBH?: Enemy; // Trou noir spécifiquement associé dont dépend la libération du portail
  
  public hitPulse: number = 1.0;
  public energyPhase: number = 0;

  constructor(
    x: number,
    y: number,
    width: number = GAME_CONFIG.GATE_WIDTH,
    height: number = GAME_CONFIG.GATE_HEIGHT,
    type: GateType = 'ADD_SHIPS',
    value: number = 5,
    isSpecial: boolean = false
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    this.value = value;
    this.rawValue = value;
    this.isSpecial = isSpecial;
  }

  public update(dt: number, scrollSpeed: number, blockedMaxY?: number) {
    this.energyPhase += dt * (this.isSpecial ? 8 : 4);
    if (this.hitPulse > 1.0) {
      this.hitPulse = Math.max(1.0, this.hitPulse - dt * 3);
    }

    const nextY = this.y + scrollSpeed * dt;
    if (blockedMaxY !== undefined) {
      this.y = Math.min(nextY, blockedMaxY);
    } else {
      this.y = nextY;
    }
  }

  // Seuls les portails SPÉCIAUX peuvent être augmentés en tirant dedans
  public onHit(damage: number, upgradeMultiplier: number = 1.0): boolean {
    this.hitPulse = 1.25;

    // Portail normal : absorbe les tirs mais ne monte pas
    if (!this.isSpecial) {
      return false;
    }

    // Portail spécial : améliorable au tir
    const effectivePower = damage * upgradeMultiplier;

    switch (this.type) {
      case 'ADD_SHIPS':
        this.value += Math.max(1, Math.round(effectivePower));
        break;
      case 'MULTIPLY_SHIPS':
        this.rawValue += 0.05 * effectivePower;
        this.value = Math.round(this.rawValue * 10) / 10;
        break;
      case 'SUBTRACT_SHIPS':
        this.value += Math.max(1, Math.round(effectivePower));
        if (this.value >= 0) {
          this.type = 'ADD_SHIPS';
          this.value = Math.max(1, this.value);
        }
        break;
      case 'DIVIDE_SHIPS':
        this.rawValue -= 0.05 * effectivePower;
        if (this.rawValue <= 1.0) {
          this.type = 'MULTIPLY_SHIPS';
          this.rawValue = 1.1;
          this.value = 1.1;
        } else {
          this.value = Math.round(this.rawValue * 10) / 10;
        }
        break;
      case 'ADD_FIRERATE':
        this.value += Math.max(1, Math.round(2 * effectivePower));
        break;
      case 'ADD_DAMAGE':
        this.value += Math.max(1, Math.round(effectivePower));
        break;
    }
    return true;
  }

  public isPositive(): boolean {
    return this.type === 'ADD_SHIPS' || this.type === 'MULTIPLY_SHIPS' || this.type === 'ADD_FIRERATE' || this.type === 'ADD_DAMAGE';
  }

  public getDisplayText(): { title: string; subtitle: string } {
    switch (this.type) {
      case 'ADD_SHIPS':
        return { title: `+${Math.round(this.value)} 🚀`, subtitle: '' };
      case 'MULTIPLY_SHIPS':
        return { title: `x${this.value.toFixed(1)} 🚀`, subtitle: '' };
      case 'SUBTRACT_SHIPS':
        return { title: `-${Math.abs(Math.round(this.value))} 🚀`, subtitle: '' };
      case 'DIVIDE_SHIPS':
        return { title: `÷${this.value.toFixed(1)} 🚀`, subtitle: '' };
      case 'ADD_FIRERATE':
        return { title: `+${Math.round(this.value)}% ⚡`, subtitle: '' };
      case 'ADD_DAMAGE':
        return { title: `+${Math.round(this.value)}% 🎯`, subtitle: '' };
    }
  }

  public draw3D(ctx: CanvasRenderingContext2D, renderer: Renderer) {
    if (this.isPassed || this.y < -1100 || this.y > 690) return;

    const pt = renderer.project(this.x, this.y);
    if (!pt.isVisible || pt.scale <= 0.04) return;

    ctx.save();
    if (this.y < -800) {
      ctx.globalAlpha = Math.max(0, Math.min(1, (this.y + 1100) / 300));
    }
    const s = pt.scale * this.hitPulse;
    const isPos = this.isPositive();

    // Palette de couleurs :
    // - Portails Normaux : Bleu roi (#0088FF) pour positif, Rouge (#FF0055) pour négatif
    // - Portails Spéciaux : Bleu Cyan / Bleu Vert (#00FFCC / #00FFAA) pour vaisseaux, Orange néon (#FF7700 / #FFAA00) pour cadence/boost
    let mainColor: string;
    if (this.isSpecial) {
      if (this.type === 'ADD_FIRERATE' || this.type === 'ADD_DAMAGE') {
        mainColor = '#FF8800'; // Orange néon au lieu de jaune
      } else {
        mainColor = '#00FFCC'; // Bleu Cyan / Bleu Vert au lieu de bleu
      }
    } else {
      mainColor = isPos ? '#0088FF' : '#FF0055';
    }
    
    const drawW = this.width * s;
    const drawH = this.height * s;
    const left = pt.x - drawW / 2;
    const top = pt.y - drawH / 2;

    // 1. Fond du portail : opacité adaptée à la distance pour éviter les halos boueux/flous lors des files de portails
    const bgAlpha = Math.min(0.65, 0.20 + s * 0.45);
    ctx.fillStyle = `rgba(4, 10, 24, ${bgAlpha})`;
    ctx.beginPath();
    ctx.roundRect(left, top, drawW, drawH, 10 * s);
    ctx.fill();

    // Champ de force holographique énergétique
    const forcefieldGrad = ctx.createLinearGradient(left, top, left + drawW, top + drawH);
    if (this.isSpecial) {
      if (this.type === 'ADD_FIRERATE' || this.type === 'ADD_DAMAGE') {
        forcefieldGrad.addColorStop(0, 'rgba(255, 120, 0, 0.45)');
        forcefieldGrad.addColorStop(0.5, 'rgba(255, 60, 0, 0.6)');
        forcefieldGrad.addColorStop(1, 'rgba(255, 160, 0, 0.45)');
      } else {
        forcefieldGrad.addColorStop(0, 'rgba(0, 255, 204, 0.45)');
        forcefieldGrad.addColorStop(0.5, 'rgba(0, 180, 255, 0.6)');
        forcefieldGrad.addColorStop(1, 'rgba(0, 255, 170, 0.45)');
      }
    } else {
      if (isPos) {
        forcefieldGrad.addColorStop(0, 'rgba(0, 100, 255, 0.35)');
        forcefieldGrad.addColorStop(0.5, 'rgba(0, 50, 180, 0.5)');
        forcefieldGrad.addColorStop(1, 'rgba(0, 100, 255, 0.35)');
      } else {
        forcefieldGrad.addColorStop(0, 'rgba(255, 0, 85, 0.4)');
        forcefieldGrad.addColorStop(0.5, 'rgba(80, 0, 30, 0.55)');
        forcefieldGrad.addColorStop(1, 'rgba(255, 0, 85, 0.4)');
      }
    }

    ctx.fillStyle = forcefieldGrad;
    // Rendu net et sans bavure : shadowBlur uniquement sur portails spéciaux au premier plan
    if (this.isSpecial && Renderer.enableGlow && s >= 0.45) {
      ctx.shadowColor = mainColor;
      ctx.shadowBlur = 8 * s;
    }
    ctx.beginPath();
    ctx.roundRect(left, top, drawW, drawH, 10 * s);
    ctx.fill();
    if (Renderer.enableGlow) {
      ctx.shadowBlur = 0;
    }

    // 2. Bordures néon & piliers énergétiques
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = Math.max(1.5, (this.isSpecial ? 4.5 : 3.0) * s);
    ctx.stroke();

    // Piliers latéraux du portail 3D
    ctx.fillStyle = this.isSpecial ? '#FFFFFF' : '#88CCFF';
    const pillarW = Math.max(2, (this.isSpecial ? 5 : 3.5) * s);
    ctx.fillRect(left - pillarW, top - 4 * s, pillarW, drawH + 8 * s);
    ctx.fillRect(left + drawW, top - 4 * s, pillarW, drawH + 8 * s);

    // Si spécial : halo scintillant supérieur
    if (this.isSpecial && s > 0.18) {
      ctx.fillStyle = mainColor;
      ctx.font = `900 ${Math.max(7, Math.floor(9 * s))}px 'Orbitron', 'Segoe UI Emoji', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`✨ SPÉCIAL ✨`, pt.x, top - 6 * s);
    }

    // 3. Textes du portail (uniquement si le portail est assez proche pour être lu nettement, sans bouillie de pixels)
    if (s >= 0.14) {
      const info = this.getDisplayText();
      const titleSize = Math.max(9, Math.floor(25 * s));

      ctx.font = `900 ${titleSize}px 'Orbitron', 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.lineWidth = Math.max(1.5, 3 * s);
      ctx.strokeText(info.title, pt.x, pt.y);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(info.title, pt.x, pt.y);

      if (info.subtitle && s > 0.22) {
        const subSize = Math.max(6, Math.floor(10 * s));
        ctx.font = `700 ${subSize}px 'Orbitron', sans-serif`;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.lineWidth = Math.max(1, 2 * s);
        ctx.strokeText(info.subtitle, pt.x, pt.y + 14 * s);

        ctx.fillStyle = mainColor;
        ctx.fillText(info.subtitle, pt.x, pt.y + 14 * s);
      }
    }

    ctx.restore();
  }
}
