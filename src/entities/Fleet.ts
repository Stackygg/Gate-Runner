// Gestion de la Flotte avec limite de 20 (standard) ou 100 vaisseaux (Fun 5x20) et Tiers V1 à V10

import { GAME_CONFIG, ShipSkin } from '../config';
import { Renderer } from '../engine/Renderer';
import { Projectile } from './Projectile';

export interface ShipUnit {
  id: number;
  x: number;
  y: number;
  targetOffsetX: number;
  targetOffsetY: number;
  tilt: number;
  tier: number;       // 1 = V1, 2 = V2, ..., 10 = V10
}

interface TierVisualTheme {
  primary: string;
  secondary: string;
  glow: string;
  flame: string;
  dark: string;
}

const TIER_THEMES: Record<number, TierVisualTheme> = {
  1: { primary: '#00F0FF', secondary: '#0070FF', glow: '#00F0FF', flame: '#00F0FF', dark: '#050a18' },
  2: { primary: '#FFE600', secondary: '#FF8800', glow: '#FFE600', flame: '#FFE600', dark: '#1a1200' },
  3: { primary: '#FF007A', secondary: '#FF0033', glow: '#FF007A', flame: '#FF007A', dark: '#1a000e' },
  4: { primary: '#B026FF', secondary: '#7700FF', glow: '#B026FF', flame: '#B026FF', dark: '#11001a' },
  5: { primary: '#00FF88', secondary: '#00CC44', glow: '#00FF88', flame: '#00FF88', dark: '#001a0a' },
  6: { primary: '#FF7700', secondary: '#FF3300', glow: '#FF7700', flame: '#FF7700', dark: '#1a0700' },
  7: { primary: '#FF1144', secondary: '#990022', glow: '#FF1144', flame: '#FF1144', dark: '#1a0005' },
  8: { primary: '#00E5FF', secondary: '#0088FF', glow: '#00E5FF', flame: '#00E5FF', dark: '#00111a' },
  9: { primary: '#9D00FF', secondary: '#FF00DD', glow: '#9D00FF', flame: '#9D00FF', dark: '#14001a' },
  10: { primary: '#FFFFFF', secondary: '#FFE600', glow: '#00F0FF', flame: '#FFFFFF', dark: '#0a0a14' }
};

export class Fleet {
  public shipCount: number = 1; // Nombre total de points de puissance / santé de la flotte
  public centerX: number = GAME_CONFIG.WORLD_WIDTH / 2;
  public centerY: number = GAME_CONFIG.PLAYER_BASE_Y;
  public ships: ShipUnit[] = [];
  public maxFleetSize: number = 20; // 20 en classique/escorte, 40 en Raid (Armada)
  
  public fireRate: number = GAME_CONFIG.BASE_FIRE_RATE;
  public bulletDamage: number = GAME_CONFIG.BASE_BULLET_DAMAGE;
  public activeSkin: ShipSkin;
  
  // Système d'Augmentation de Vaisseaux (Rangs 1 à 5)
  public evolutionRank: number = 1;
  
  // Effets Spéciaux d'Équipement
  public energyShieldHp: number = 0;
  public maxEnergyShieldHp: number = 0;
  public leaderExtraShots: number = 0;
  public piercingExtraTargets: number = 0;
  public hasExplosiveMissile: boolean = false;
  public explosiveMissileDamageMult: number = 2.0;
  public missileTimer: number = 0;
  public explosiveRadius: number = 0;
  public explosiveDamagePct: number = 50;
  public leaderFireRateBonus: number = 0;
  public dodgeChance: number = 0;
  public magnetRadius: number = 0;
  public critChance: number = 0;

  private shootTimer: number = 0;
  private lastMoveX: number = GAME_CONFIG.WORLD_WIDTH / 2;
  private bankAngle: number = 0;
  private nextShipId: number = 1;
  private animationPhase: number = 0;

  constructor(initialSize: number, activeSkin: ShipSkin, fireRateBonus: number = 1.0, damageBonus: number = 1.0, maxFleetSize: number = 20) {
    this.shipCount = Math.max(1, initialSize);
    this.activeSkin = activeSkin;
    this.maxFleetSize = maxFleetSize;
    this.fireRate = GAME_CONFIG.BASE_FIRE_RATE * activeSkin.statBonus.fireRateMultiplier * fireRateBonus;
    this.bulletDamage = GAME_CONFIG.BASE_BULLET_DAMAGE * activeSkin.statBonus.damageMultiplier * damageBonus;
    this.rebuildFormation();
  }

  public setEquippedSpecialEffects(fx: {
    leaderExtraShots?: number;
    piercingExtraTargets?: number;
    hasExplosiveMissile?: boolean;
    explosiveMissileDamageMult?: number;
    explosiveRadius?: number;
    explosiveDamagePct?: number;
    energyShieldHp?: number;
    leaderFireRateBonus?: number;
    fleetFireRateBonus?: number;
    dodgeChance?: number;
    magnetRadius?: number;
    critChance?: number;
  }) {
    this.leaderExtraShots = fx.leaderExtraShots || 0;
    this.piercingExtraTargets = fx.piercingExtraTargets || 0;
    this.hasExplosiveMissile = !!fx.hasExplosiveMissile;
    this.explosiveMissileDamageMult = fx.explosiveMissileDamageMult || 2.0;
    this.explosiveRadius = fx.explosiveRadius || 0;
    this.explosiveDamagePct = fx.explosiveDamagePct || 50;
    this.energyShieldHp = fx.energyShieldHp || 0;
    this.maxEnergyShieldHp = fx.energyShieldHp || 0;
    this.leaderFireRateBonus = fx.fleetFireRateBonus || fx.leaderFireRateBonus || 0;
    this.dodgeChance = fx.dodgeChance || 0;
    this.magnetRadius = fx.magnetRadius || 0;
    this.critChance = fx.critChance || 0;
  }

  // Évolution de Rang suite à la libération d'un vaisseau d'une Prison
  public evolveToRank(rank: number): boolean {
    const target = Math.min(5, Math.max(1, rank));
    if (target > this.evolutionRank) {
      this.evolutionRank = target;
      return true;
    }
    return false;
  }

  public get evolutionDamageMultiplier(): number {
    switch (this.evolutionRank) {
      case 2: return 1.30; // Falcon : +30% attack
      case 3: return 1.30; // Valkyrie : +30% attack + Piercing
      case 4: return 1.30; // Phantom : +30% attack + 50% cadence + Piercing
      case 5: return 2.00; // Hyperion Titan : +100% attack (x2) + Overdrive
      default: return 1.00;
    }
  }

  public get evolutionFireRateMultiplier(): number {
    switch (this.evolutionRank) {
      case 4: return 1.25; // Phantom : +25% fire rate
      case 5: return 1.35; // Hyperion Titan : +35% fire rate
      default: return 1.00;
    }
  }

  public get isPiercingUnlocked(): boolean {
    return this.evolutionRank >= 3;
  }

  // Reconstruction de la formation avec support V1 à V10
  public rebuildFormation() {
    const maxShips = this.maxFleetSize; // 20 ou 100
    const maxTier = 10;
    const maxCapacity = maxShips * maxTier;
    this.shipCount = Math.max(0, Math.min(maxCapacity, this.shipCount));

    if (this.shipCount === 0) {
      this.ships = [];
      return;
    }

    const tierSpecs: { tier: number }[] = [];

    if (this.shipCount <= maxShips) {
      // De 1 à maxShips : uniquement des V1
      for (let i = 0; i < this.shipCount; i++) {
        tierSpecs.push({ tier: 1 });
      }
    } else {
      // Au-delà de maxShips : fusion progressive jusqu'au Tier V10
      const totalPoints = Math.min(this.shipCount, maxCapacity);
      const baseTier = Math.min(maxTier - 1, Math.floor((totalPoints - 1) / maxShips));
      const higherTierCount = totalPoints - baseTier * maxShips;
      const baseTierCount = maxShips - higherTierCount;

      for (let i = 0; i < higherTierCount; i++) {
        tierSpecs.push({ tier: Math.min(10, baseTier + 1) });
      }
      for (let i = 0; i < baseTierCount; i++) {
        tierSpecs.push({ tier: Math.min(10, baseTier) });
      }
    }

    // Synchroniser la liste des vaisseaux avec tierSpecs
    while (this.ships.length < tierSpecs.length) {
      this.ships.push({
        id: this.nextShipId++,
        x: this.centerX,
        y: this.centerY,
        targetOffsetX: 0,
        targetOffsetY: 0,
        tilt: 0,
        tier: 1
      });
    }
    while (this.ships.length > tierSpecs.length) {
      this.ships.pop();
    }

    for (let i = 0; i < tierSpecs.length; i++) {
      this.ships[i].tier = tierSpecs[i].tier;
    }

    const count = this.ships.length;
    if (count === 0) return;

    // Formation en Triangle / Chevron aérodynamique (organique, en pointe de flèche)
    const isRaid = maxShips >= 40;
    const rowSpacingY = isRaid ? 21 : 28;
    const colSpacingX = isRaid ? 22 : 26;
    const vShapeCurve = isRaid ? 3.0 : 4.0;

    this.ships[0].targetOffsetX = 0;
    this.ships[0].targetOffsetY = 0;

    let placed = 1;
    let row = 1;

    while (placed < count) {
      const rowCap = 1 + row * 2;
      const needed = Math.min(rowCap, count - placed);
      const halfSpread = (needed - 1) / 2;

      for (let i = 0; i < needed; i++) {
        const idx = placed + i;
        const colPos = i - halfSpread;
        this.ships[idx].targetOffsetX = colPos * colSpacingX;
        this.ships[idx].targetOffsetY = row * rowSpacingY + Math.abs(colPos) * vShapeCurve;
      }

      placed += needed;
      row++;
    }
  }

  public getTierSummary(): string {
    const tierCounts: Record<number, number> = {};
    for (const ship of this.ships) {
      tierCounts[ship.tier] = (tierCounts[ship.tier] || 0) + 1;
    }
    const parts: string[] = [];
    for (let t = 10; t >= 1; t--) {
      if (tierCounts[t]) {
        parts.push(`${tierCounts[t]}x V${t}`);
      }
    }
    return parts.join(' + ') || `${this.shipCount}x V1`;
  }

  public takeDamage(amount: number = 1): number {
    // 1. Esquive Warp dimensionnelle
    if (this.dodgeChance > 0 && Math.random() * 100 < this.dodgeChance) {
      return -1; // Code -1 : esquivé
    }

    // 2. Absorption par le Bouclier d'Énergie du vaisseau amiral
    if (this.energyShieldHp > 0) {
      this.energyShieldHp = Math.max(0, this.energyShieldHp - 1);
      return -2; // Code -2 : bouclier a absorbé l'impact
    }

    // 3. Perte normale de vaisseaux de la formation
    const actual = Math.min(this.shipCount, amount);
    this.shipCount -= actual;
    this.rebuildFormation();
    return actual;
  }

  public isDefeated(): boolean {
    return this.shipCount <= 0;
  }

  public addShips(amount: number) {
    this.shipCount += amount;
    this.rebuildFormation();
  }

  public multiplyShips(multiplier: number) {
    this.shipCount = Math.max(1, Math.round(this.shipCount * multiplier));
    this.rebuildFormation();
  }

  public update(dt: number, targetX: number): Projectile[] {
    const spawnedProjectiles: Projectile[] = [];
    if (this.shipCount <= 0 || this.ships.length === 0) return spawnedProjectiles;

    const deltaX = targetX - this.lastMoveX;
    this.lastMoveX = targetX;
    const targetTilt = Math.max(-0.45, Math.min(0.45, deltaX * 0.08));
    this.bankAngle += (targetTilt - this.bankAngle) * Math.min(1, 15 * dt);

    this.centerX = targetX;

    for (let i = 0; i < this.ships.length; i++) {
      const ship = this.ships[i];
      const targetShipX = this.centerX + ship.targetOffsetX;
      const targetShipY = this.centerY + ship.targetOffsetY;

      ship.x += (targetShipX - ship.x) * Math.min(1, 20 * dt);
      ship.y += (targetShipY - ship.y) * Math.min(1, 20 * dt);
      ship.tilt = this.bankAngle;
    }

    this.animationPhase += dt * 4;
    this.shootTimer += dt;
    const effectiveFireRate = this.fireRate * this.evolutionFireRateMultiplier * (1 + (this.leaderFireRateBonus * 0.4) / 100);
    const fireInterval = 1.0 / effectiveFireRate;

    if (this.shootTimer >= fireInterval) {
      this.shootTimer = 0;
      
      // Point de convergence exact des tirs : vers la zone d'apparition des ennemis à l'horizon (Y = -1000)
      const targetConvergenceY = -1000;
      const getConvergeVx = (spawnX: number, spawnY: number, bulletVy: number): number => {
        const flightTime = Math.max(0.1, (spawnY - targetConvergenceY) / Math.abs(bulletVy));
        return -(spawnX - this.centerX) / flightTime;
      };

      for (let sIdx = 0; sIdx < this.ships.length; sIdx++) {
        const ship = this.ships[sIdx];
        const isLeader = (sIdx === 0);
        const t = Math.min(10, Math.max(1, ship.tier));
        const theme = TIER_THEMES[t] || TIER_THEMES[1];
        
        // Règle stricte des dégâts : Dégâts de base * Multiplicateur d'évolution (x1.3 Falcon, x2.0 Hyperion) * Tier V1-V10
        const totalTierDamage = (this.bulletDamage * this.evolutionDamageMultiplier) * t;

        const newlySpawned: Projectile[] = [];

        if (t === 1) {
          // V1 : 1 tir convergent vers le point d'apparition des ennemis
          const sx = ship.x;
          const sy = ship.y - 15;
          const vy = -GAME_CONFIG.BASE_BULLET_SPEED;
          const vx = getConvergeVx(sx, sy, vy);
          newlySpawned.push(
            new Projectile(sx, sy, vx, vy, totalTierDamage, 'laser', this.activeSkin.primaryColor)
          );
        } else if (t === 2) {
          // V2 : 2 tirs laser convergents
          const singleDmg = totalTierDamage / 2;
          const vy = -GAME_CONFIG.BASE_BULLET_SPEED;
          const sx1 = ship.x - 6;
          const sy1 = ship.y - 16;
          const sx2 = ship.x + 6;
          const sy2 = ship.y - 16;
          newlySpawned.push(
            new Projectile(sx1, sy1, getConvergeVx(sx1, sy1, vy), vy, singleDmg, 'laser', theme.primary),
            new Projectile(sx2, sy2, getConvergeVx(sx2, sy2, vy), vy, singleDmg, 'laser', theme.primary)
          );
        } else if (t === 3) {
          // V3 : 3 tirs plasma convergents
          const singleDmg = totalTierDamage / 3;
          const vySide = -GAME_CONFIG.BASE_BULLET_SPEED;
          const vyMid = -GAME_CONFIG.BASE_BULLET_SPEED * 1.05;
          const sx1 = ship.x - 8;
          const sy1 = ship.y - 17;
          const sx2 = ship.x;
          const sy2 = ship.y - 19;
          const sx3 = ship.x + 8;
          const sy3 = ship.y - 17;
          newlySpawned.push(
            new Projectile(sx1, sy1, getConvergeVx(sx1, sy1, vySide), vySide, singleDmg, 'plasma', theme.primary),
            new Projectile(sx2, sy2, getConvergeVx(sx2, sy2, vyMid), vyMid, singleDmg, 'plasma', theme.secondary),
            new Projectile(sx3, sy3, getConvergeVx(sx3, sy3, vySide), vySide, singleDmg, 'plasma', theme.primary)
          );
        } else if (t <= 5) {
          // V4 à V5 : Double laser lourd surchargé (condensé & net)
          const singleDmg = totalTierDamage / 2;
          const vy = -GAME_CONFIG.BASE_BULLET_SPEED * 1.05;
          const sx1 = ship.x - 7;
          const sy1 = ship.y - 18;
          const sx2 = ship.x + 7;
          const sy2 = ship.y - 18;
          newlySpawned.push(
            new Projectile(sx1, sy1, getConvergeVx(sx1, sy1, vy), vy, singleDmg, 'plasma', theme.primary),
            new Projectile(sx2, sy2, getConvergeVx(sx2, sy2, vy), vy, singleDmg, 'plasma', theme.secondary)
          );
        } else {
          // V6 à V10 : Rayon Quantum Central Lourd + 2 Tirs d'Ailes (3 tirs par vaisseau max, zéro lag)
          const coreDmg = totalTierDamage * 0.60;
          const wingDmg = totalTierDamage * 0.20;
          const vyCore = -GAME_CONFIG.BASE_BULLET_SPEED * 1.15;
          const vyWing = -GAME_CONFIG.BASE_BULLET_SPEED * 1.05;

          // Rayon central lourd
          const sxCore = ship.x;
          const syCore = ship.y - 20;
          const sxL = ship.x - 10;
          const syL = ship.y - 16;
          const sxR = ship.x + 10;
          const syR = ship.y - 16;

          newlySpawned.push(
            new Projectile(sxCore, syCore, getConvergeVx(sxCore, syCore, vyCore), vyCore, coreDmg, 'plasma', theme.primary),
            new Projectile(sxL, syL, getConvergeVx(sxL, syL, vyWing), vyWing, wingDmg, 'laser', theme.secondary),
            new Projectile(sxR, syR, getConvergeVx(sxR, syR, vyWing), vyWing, wingDmg, 'laser', theme.secondary)
          );
        }

        // 1. Tirs additionnels & Tirs explosifs pour le Vaisseau Amiral
        if (isLeader) {
          if (this.leaderExtraShots > 0) {
            for (let k = 1; k <= this.leaderExtraShots; k++) {
              const side = (k % 2 === 1) ? 1 : -1;
              const col = Math.ceil(k / 2);
              const offX = side * (col * 7 + 4);
              const sx = ship.x + offX;
              const sy = ship.y - 14;
              const vy = -GAME_CONFIG.BASE_BULLET_SPEED * 1.05;
              const vx = getConvergeVx(sx, sy, vy) + side * (col * 14);
              const extraProj = new Projectile(sx, sy, vx, vy, totalTierDamage, 'laser', theme.primary);
              newlySpawned.push(extraProj);
            }
          }

          if (this.explosiveRadius > 0) {
            for (const proj of newlySpawned) {
              proj.isExplosive = true;
              proj.explosionRadius = this.explosiveRadius;
              proj.explosionDamagePct = this.explosiveDamagePct;
            }
          }
        }

        // 2. Surcharges Critiques
        if (this.critChance > 0) {
          for (const proj of newlySpawned) {
            if (Math.random() * 100 < this.critChance) {
              proj.isCrit = true;
              proj.damage *= 3.0;
            }
          }
        }

        // Perk d'Évolution ou Équipement : Tirs Perçants (+1, +2, +3 ou Perforation Totale)
        const effectivePierces = (this.isPiercingUnlocked ? 1 : 0) + this.piercingExtraTargets;
        if (effectivePierces > 0) {
          for (const proj of newlySpawned) {
            proj.isPiercing = true;
            proj.maxPierces = effectivePierces >= 999 ? 9999 : (1 + effectivePierces);
          }
        }

        spawnedProjectiles.push(...newlySpawned);
      }
    }

    // 3. Tir du Missile Explosif toutes les 10 secondes (si équipé sur les Tourelles)
    if (this.hasExplosiveMissile && this.ships.length > 0) {
      this.missileTimer += dt;
      if (this.missileTimer >= 10.0) {
        this.missileTimer = 0;
        const leader = this.ships[0];
        const sx = leader.x;
        const sy = leader.y - 20;
        const vy = -GAME_CONFIG.BASE_BULLET_SPEED * 1.1;
        const vx = 0;
        const missileDmg = (this.bulletDamage * this.evolutionDamageMultiplier) * this.explosiveMissileDamageMult;
        const missile = new Projectile(sx, sy, vx, vy, missileDmg, 'missile', '#FF6600');
        missile.isExplosive = true;
        missile.explosionRadius = 65;
        missile.explosionDamagePct = 100;
        spawnedProjectiles.push(missile);
      }
    }

    return spawnedProjectiles;
  }

  public draw(ctx: CanvasRenderingContext2D) {
    for (let i = this.ships.length - 1; i >= 0; i--) {
      const ship = this.ships[i];
      const isLeader = (i === 0);
      this.drawSingleShip(ctx, ship, isLeader);
    }

    // Bulle de Bouclier Énergétique autour du Vaisseau Amiral
    if (this.energyShieldHp > 0 && this.ships.length > 0) {
      const leader = this.ships[0];
      ctx.save();
      ctx.translate(leader.x, leader.y);

      const pulse = Math.sin(this.animationPhase * 4) * 2;
      const shieldRadius = 26 + pulse;

      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
      if (Renderer.enableGlow) {
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 14;
      }

      ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.beginPath();
      ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Motifs hexagonaux de renfort
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let a = 0; a < 6; a++) {
        const angle = (a * Math.PI) / 3 + this.animationPhase * 0.6;
        const hx = Math.cos(angle) * (shieldRadius * 0.95);
        const hy = Math.sin(angle) * (shieldRadius * 0.95);
        if (a === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();

      // Badge indicateur de PV de bouclier
      const bW = 50;
      const bH = 16;
      const bX = -bW / 2;
      const bY = -shieldRadius - 20;

      ctx.fillStyle = 'rgba(10, 16, 32, 0.9)';
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(bX, bY, bW, bH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#00F0FF';
      ctx.font = 'bold 11px Rajdhani, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🛡️ ${this.energyShieldHp} PV`, 0, bY + bH / 2);

      if (Renderer.enableGlow) {
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }
  }

  private drawSingleShip(
    ctx: CanvasRenderingContext2D,
    ship: ShipUnit,
    isLeader: boolean
  ) {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.tilt);

    const t = Math.min(10, Math.max(1, ship.tier));
    const theme = TIER_THEMES[t] || TIER_THEMES[1];
    const rank = this.evolutionRank; // Rang d'évolution visuel (1 à 5)

    // Échelle selon le Tier, le Rang d'évolution et le rôle
    const roleScale = isLeader ? 1.06 : 0.72;
    const rankScaleBonus = 1.0 + (rank - 1) * 0.08;
    const tierScale = (1.0 + (t - 1) * 0.06) * roleScale * rankScaleBonus;
    ctx.scale(tierScale, tierScale);

    // Traits d'ailes selon le tier
    const traitsCount = Math.min(8, 3 + t);

    // -------------------------------------------------------------
    // 1. PROPULSION & FLAMMES SELON LE RANG D'ÉVOLUTION
    // -------------------------------------------------------------
    ctx.fillStyle = (rank === 4) ? '#B026FF' : ((rank === 3) ? '#FF8800' : theme.flame);
    if (Renderer.enableGlow && isLeader) {
      ctx.shadowColor = (rank === 4) ? '#FF00DD' : ((rank === 3) ? '#FF8800' : theme.glow);
      ctx.shadowBlur = 10;
    }

    const flameH = 9 + Math.random() * (7 + t * 0.8 + rank * 1.5);

    if (rank === 1) {
      // Rang 1 (Scythe) : 1 tuyère centrale
      ctx.beginPath();
      ctx.moveTo(-4, 13);
      ctx.lineTo(0, 13 + flameH);
      ctx.lineTo(4, 13);
      ctx.closePath();
      ctx.fill();
    } else if (rank === 2) {
      // Rang 2 (Falcon) : Double réacteurs jumeaux
      ctx.beginPath();
      ctx.moveTo(-8, 14);
      ctx.lineTo(-5.5, 14 + flameH * 0.9);
      ctx.lineTo(-3, 14);
      ctx.moveTo(3, 14);
      ctx.lineTo(5.5, 14 + flameH * 0.9);
      ctx.lineTo(8, 14);
      ctx.closePath();
      ctx.fill();
    } else if (rank === 3) {
      // Rang 3 (Valkyrie) : Triple réacteurs en éventail
      ctx.beginPath();
      ctx.moveTo(-11, 13);
      ctx.lineTo(-9, 13 + flameH * 0.75);
      ctx.lineTo(-7, 13);
      ctx.moveTo(-3, 14);
      ctx.lineTo(0, 14 + flameH * 1.1);
      ctx.lineTo(3, 14);
      ctx.moveTo(7, 13);
      ctx.lineTo(9, 13 + flameH * 0.75);
      ctx.lineTo(11, 13);
      ctx.closePath();
      ctx.fill();
    } else if (rank === 4) {
      // Rang 4 (Phantom) : Quadruple tuyères ioniques haute poussée
      const qFlame = flameH * 0.85;
      for (const rx of [-13, -5, 5, 13]) {
        ctx.beginPath();
        ctx.moveTo(rx - 2, 13);
        ctx.lineTo(rx, 13 + qFlame);
        ctx.lineTo(rx + 2, 13);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Rang 5 (Hyperion Titan) : Hyper-réacteur central titan + double tuyères d'ailes
      ctx.fillStyle = '#00F0FF';
      ctx.beginPath();
      ctx.moveTo(-5, 15);
      ctx.lineTo(0, 15 + flameH * 1.35);
      ctx.lineTo(5, 15);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#FFE600';
      ctx.beginPath();
      ctx.moveTo(-12, 14);
      ctx.lineTo(-10, 14 + flameH * 0.9);
      ctx.lineTo(-8, 14);
      ctx.moveTo(8, 14);
      ctx.lineTo(10, 14 + flameH * 0.9);
      ctx.lineTo(12, 14);
      ctx.closePath();
      ctx.fill();
    }

    // -------------------------------------------------------------
    // 2. DESSIN DE LA CARLINGUE (5 SILHOUETTES GRADUELLES DISTINCTES)
    // -------------------------------------------------------------
    const shipGrad = ctx.createLinearGradient(0, -22, 0, 18);
    if (rank === 1) {
      shipGrad.addColorStop(0, '#FFFFFF');
      shipGrad.addColorStop(0.3, this.activeSkin.primaryColor);
      shipGrad.addColorStop(0.8, this.activeSkin.secondaryColor);
      shipGrad.addColorStop(1, '#050a18');
    } else if (rank === 2) {
      // Falcon : Teinte Émeraude / Cyan vif
      shipGrad.addColorStop(0, '#FFFFFF');
      shipGrad.addColorStop(0.25, '#00FF88');
      shipGrad.addColorStop(0.7, '#008855');
      shipGrad.addColorStop(1, '#021a0d');
    } else if (rank === 3) {
      // Valkyrie : Teinte Ambre / Or / Crimson électrique
      shipGrad.addColorStop(0, '#FFFFFF');
      shipGrad.addColorStop(0.25, '#FFE600');
      shipGrad.addColorStop(0.65, '#FF3300');
      shipGrad.addColorStop(1, '#200500');
    } else if (rank === 4) {
      // Phantom : Teinte Violet Sombre / Magenta Furtif
      shipGrad.addColorStop(0, '#FFFFFF');
      shipGrad.addColorStop(0.25, '#B026FF');
      shipGrad.addColorStop(0.7, '#4B0082');
      shipGrad.addColorStop(1, '#110022');
    } else {
      // Hyperion Titan : Blanc Divin / Cyan Néon / Accents Or
      shipGrad.addColorStop(0, '#FFFFFF');
      shipGrad.addColorStop(0.3, '#E0F7FF');
      shipGrad.addColorStop(0.7, '#00D4FF');
      shipGrad.addColorStop(1, '#001A33');
    }

    ctx.fillStyle = shipGrad;
    if (Renderer.enableGlow && isLeader) {
      ctx.shadowColor = (rank === 5) ? '#00F0FF' : ((rank === 4) ? '#B026FF' : ((rank === 3) ? '#FFE600' : ((rank === 2) ? '#00FF88' : theme.glow)));
      ctx.shadowBlur = 14;
    }

    ctx.beginPath();

    if (rank === 1) {
      // 🚀 RANG 1 : SCYTHE INTERCEPTOR (Chasseur fin en flèche)
      ctx.moveTo(0, -18);
      ctx.lineTo(16, 12);
      ctx.lineTo(8, 15);
      ctx.lineTo(0, 10);
      ctx.lineTo(-8, 15);
      ctx.lineTo(-16, 12);
    } else if (rank === 2) {
      // 🦅 RANG 2 : FALCON FIGHTER (Ailes delta + Canards avant doubles + Ailerons)
      ctx.moveTo(0, -21); // Museau effilé
      ctx.lineTo(4, -13);
      ctx.lineTo(11, -9); // Canard avant droit
      ctx.lineTo(5, -4);
      ctx.lineTo(19, 10); // Aile principale
      ctx.lineTo(19, 15); // Aileron vertical stabilisateur
      ctx.lineTo(12, 14);
      ctx.lineTo(6, 16);
      ctx.lineTo(0, 11);
      ctx.lineTo(-6, 16);
      ctx.lineTo(-12, 14);
      ctx.lineTo(-19, 15);
      ctx.lineTo(-19, 10);
      ctx.lineTo(-5, -4);
      ctx.lineTo(-11, -9); // Canard avant gauche
      ctx.lineTo(-4, -13);
    } else if (rank === 3) {
      // ⚡ RANG 3 : VALKYRIE CRUSADER (Ailes avant W-Shape + Railgun frontal double pointe)
      ctx.moveTo(0, -13);
      ctx.lineTo(3.5, -23); // Pointe Railgun droite
      ctx.lineTo(6, -12);
      ctx.lineTo(13, -7);
      ctx.lineTo(22, 4);   // Aile avant inversée agressive
      ctx.lineTo(17, 14);
      ctx.lineTo(7, 12);
      ctx.lineTo(0, 15);
      ctx.lineTo(-7, 12);
      ctx.lineTo(-17, 14);
      ctx.lineTo(-22, 4);  // Aile avant inversée gauche
      ctx.lineTo(-13, -7);
      ctx.lineTo(-6, -12);
      ctx.lineTo(-3.5, -23); // Pointe Railgun gauche
    } else if (rank === 4) {
      // 🔮 RANG 4 : PHANTOM BOMBER (Furtif angulaire facetté + Pods d'artillerie lourde d'ailes)
      ctx.moveTo(0, -20);
      ctx.lineTo(7, -10);
      ctx.lineTo(14, -10); // Pod avant droit
      ctx.lineTo(16, -2);
      ctx.lineTo(24, 8);   // Envergure furtive
      ctx.lineTo(17, 16);
      ctx.lineTo(11, 13);
      ctx.lineTo(0, 11);
      ctx.lineTo(-11, 13);
      ctx.lineTo(-17, 16);
      ctx.lineTo(-24, 8);
      ctx.lineTo(-16, -2);
      ctx.lineTo(-14, -10); // Pod avant gauche
      ctx.lineTo(-7, -10);
    } else {
      // 👑 RANG 5 : HYPERION TITAN (Cuirassé imposant + Double balanciers d'énergie + Lames quantiques)
      ctx.moveTo(0, -25);
      ctx.lineTo(6, -17);
      ctx.lineTo(10, -8);
      ctx.lineTo(18, 0);
      ctx.lineTo(27, 11);  // Grande envergure titan
      ctx.lineTo(21, 17);
      ctx.lineTo(14, 13);
      ctx.lineTo(9, 19);
      ctx.lineTo(0, 14);
      ctx.lineTo(-9, 19);
      ctx.lineTo(-14, 13);
      ctx.lineTo(-21, 17);
      ctx.lineTo(-27, 11);
      ctx.lineTo(-18, 0);
      ctx.lineTo(-10, -8);
      ctx.lineTo(-6, -17);
    }

    ctx.closePath();
    ctx.fill();

    // Bordure lumineuse du fuselage
    ctx.strokeStyle = (rank >= 4) ? '#FFFFFF' : ((rank >= 2) ? '#A0FFA0' : '#FFFFFF');
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // -------------------------------------------------------------
    // 3. DÉTAILS STRUCTURAUX SPÉCIFIQUES À CHAQUE RANG
    // -------------------------------------------------------------
    if (rank === 2) {
      // Canards avant : traits d'énergie émeraude
      ctx.strokeStyle = '#00FF88';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(4, -13);
      ctx.lineTo(10, -9);
      ctx.moveTo(-4, -13);
      ctx.lineTo(-10, -9);
      ctx.stroke();
    } else if (rank === 3) {
      // Railgun canon double : lignes électriques dorées lumineuses
      ctx.strokeStyle = '#FFE600';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(3.5, -23);
      ctx.lineTo(3.5, -7);
      ctx.moveTo(-3.5, -23);
      ctx.lineTo(-3.5, -7);
      ctx.stroke();
    } else if (rank === 4) {
      // Pods de lance-plasma latéraux : voyants d'armement magenta
      ctx.fillStyle = '#FF00DD';
      ctx.fillRect(11, -8, 3, 5);
      ctx.fillRect(-14, -8, 3, 5);
    } else if (rank === 5) {
      // 🌟 RANG 5 : ANNEAU QUANTIQUE ORBITAL ROTATIF (AUTOUR DE LA POUPE)
      ctx.save();
      ctx.translate(0, 5);
      const ringAngle = this.animationPhase * 1.5;
      ctx.rotate(ringAngle);
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 1.8;
      if (Renderer.enableGlow && isLeader) {
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 11, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Sphères quantiques orbitales aux pôles de l'anneau
      ctx.fillStyle = '#FFE600';
      ctx.beginPath();
      ctx.arc(24, 0, 2.8, 0, Math.PI * 2);
      ctx.arc(-24, 0, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Traits de structure / nervures d'ailes selon le tier
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.0;
    if (Renderer.enableGlow) {
      ctx.shadowBlur = 0;
    }
    const stripeSpacing = 2.4;
    for (let s = 0; s < traitsCount; s++) {
      const offsetX = 5 + s * stripeSpacing;
      const offsetY = 7 + s * 1.4;
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
      ctx.lineTo(offsetX + 1.8, offsetY + 3.2);
      ctx.moveTo(-offsetX, offsetY);
      ctx.lineTo(-(offsetX + 1.8), offsetY + 3.2);
      ctx.stroke();
    }

    // -------------------------------------------------------------
    // 4. COCKPIT LUMINEUX & RÉACTEUR CENTRAL
    // -------------------------------------------------------------
    ctx.fillStyle = '#FFFFFF';
    if (Renderer.enableGlow && isLeader) {
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 6;
    }
    ctx.beginPath();
    if (rank === 3) {
      // Valkyrie : Coeur cristal ambre au centre
      ctx.fillStyle = '#FFE600';
      ctx.arc(0, -3, 3.2, 0, Math.PI * 2);
    } else if (rank === 4) {
      // Phantom : Cockpit losange furtif
      ctx.fillStyle = '#E0B0FF';
      ctx.ellipse(0, -5, 2.2, 6.0, 0, 0, Math.PI * 2);
    } else if (rank === 5) {
      // Hyperion : Verrière diamant blanc éclatant
      ctx.fillStyle = '#FFFFFF';
      ctx.ellipse(0, -7, 3.2, 7.5, 0, 0, Math.PI * 2);
    } else {
      ctx.ellipse(0, -5, 2.5, 5.5, 0, 0, Math.PI * 2);
    }
    ctx.fill();

    // -------------------------------------------------------------
    // 5. AURA / INSIGNE DE TIER V5+
    // -------------------------------------------------------------
    if (t >= 5 && isLeader) {
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 1.5;
      if (Renderer.enableGlow) {
        ctx.shadowColor = theme.glow;
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.arc(0, 0, 20 + t * 0.8, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (Renderer.enableGlow) {
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}
