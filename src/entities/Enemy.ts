// Entités Ennemis : Astéroïdes Traqueurs, Trous Noirs, Prisons Spatiales, Murs Gauntlet & Boss Spécialisés

import { Projectile } from './Projectile';
import { Renderer } from '../engine/Renderer';
import { SHIP_RANKS } from './RescuedShip';
import { GAME_CONFIG } from '../config';

export type EnemyType = 'block' | 'drone' | 'fast' | 'heavy' | 'black_hole' | 'prison' | 'boss_v1' | 'boss_v2' | 'boss_v3' | 'boss_final' | 'boss_alpharion' | 'boss_betapulsar' | 'boss_gammargantua' | 'gauntlet_wall' | 'corner_turret' | 'shield_generator' | 'boss_minion';

export class Enemy {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public type: EnemyType;
  public hp: number;
  public maxHp: number;
  public isDead: boolean = false;
  public bossName: string = '';
  public multiplier?: number;
  public multiplierValue?: number;
  public prisonRank: number = 2; // Rang du vaisseau prototype emprisonné (2 à 5)
  public cornerIndex?: number;   // Index de coin (0: HG, 1: HD, 2: BG, 3: BD)
  public isRapidSpecial: boolean = false; // Tourelle spéciale rapide (toutes les 3 tourelles, 2 PV et tir ultra rapide)
  public isInvulnerable: boolean = false; // Bouclier protecteur rendant le boss insensible aux tirs directs
  public connectedGenerators: Enemy[] = []; // Générateurs magnétiques alimentant le bouclier
  public shieldAlpha: number = 1.0;
  public minionSpawnTimer: number = 0;
  public diamondReward: number = 0;
  public generatorSide?: 'left' | 'center' | 'right';
  public targetBoss?: Enemy;

  private rotAngle: number = 0;
  private rotSpeed: number = 0;
  private shapePoints: { x: number; y: number }[] = [];
  private phase: number = Math.random() * Math.PI * 2;
  private hitBlinkTimer: number = 0;
  public shootTimer: number = 0;
  public shootInterval: number = 2.0; // Salve de tirs
  public combatTimer: number = 0;      // Temps écoulé en combat actif
  private salvoPattern: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public recoilTimer: number = 0;
  public recoilShakeAmount: number = 0;
  private targetCombatX: number = 330;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    type: EnemyType,
    hp: number = 1,
    bossName: string = '',
    multiplier?: number
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    this.hp = hp;
    this.maxHp = hp;
    this.bossName = bossName;
    this.multiplier = multiplier;
    this.multiplierValue = multiplier;
    if (this.type === 'prison') {
      this.prisonRank = multiplier || 2;
    }

    this.rotSpeed = (Math.random() - 0.5) * 1.5;

    // Génération géométrique pour astéroïdes
    if (this.type === 'block') {
      const numVerts = 7 + Math.floor(Math.random() * 4);
      const rx = this.width / 2;
      const ry = this.height / 2;
      for (let i = 0; i < numVerts; i++) {
        const angle = (i * Math.PI * 2) / numVerts;
        const radiusVariation = 0.75 + Math.random() * 0.45;
        this.shapePoints.push({
          x: Math.cos(angle) * rx * radiusVariation,
          y: Math.sin(angle) * ry * radiusVariation
        });
      }
    }
  }

  public isBossType(): boolean {
    return this.type === 'boss_v1' || this.type === 'boss_v2' || this.type === 'boss_v3' || this.type === 'boss_final' ||
           this.type === 'boss_alpharion' || this.type === 'boss_betapulsar' || this.type === 'boss_gammargantua';
  }

  public update(dt: number, scrollSpeed: number, playerX?: number, targetCombatY: number = 310, isEscortMode: boolean = false): Projectile[] {
    const spawnedProjectiles: Projectile[] = [];
    this.phase += dt * 3;

    if (this.type === 'black_hole') {
      // Les trous noirs sont stationnaires
    } else if (this.type === 'prison') {
      // Les prisons descendent avec le défilement du monde
      this.y += scrollSpeed * dt;
      this.rotAngle += dt * 1.5;
    } else if (this.type === 'block') {
      this.y += scrollSpeed * dt;
      this.rotAngle += this.rotSpeed * dt;

      if (!isEscortMode) {
        // Mode Expédition / Raid : Guidage tardif et diagonal vers le joueur
        if (playerX !== undefined && this.y >= 560) {
          const dx = playerX - this.x;
          const targetSpeed = Math.min(220, Math.max(-220, dx * 0.85));
          this.vx = this.vx * 0.90 + targetSpeed * 0.10;
          this.x += this.vx * dt;
        }
      } else {
        // Mode Escorte / Défense : Les astéroïdes descendent en trajectoire directe sans converger vers le centre
        // Cela permet de menacer les deux ailes et le centre du Vaisseau Mère sur toute sa largeur
        this.x += this.vx * dt;
      }
    } else if (this.type === 'shield_generator') {
      this.rotAngle += dt * 2.0;
      if (this.targetBoss && !this.targetBoss.isDead) {
        let xOff = 0;
        let yOff = 15;
        if (this.generatorSide === 'left') {
          xOff = -190;
        } else if (this.generatorSide === 'right') {
          xOff = 190;
        } else if (this.generatorSide === 'center') {
          xOff = 0;
          yOff = -65;
        }
        this.x += (this.targetBoss.x + xOff - this.x) * 4.5 * dt;
        this.y += (this.targetBoss.y + yOff - this.y) * 4.5 * dt;
      } else {
        this.y += scrollSpeed * dt;
      }

      // Tirs défensifs périodiques
      this.shootTimer += dt;
      if (this.shootTimer >= 2.6 && this.y >= 40 && this.y < 650) {
        this.shootTimer = 0;
        const targetVx = (playerX !== undefined ? Math.max(-45, Math.min(45, (playerX - this.x) * 0.15)) : 0);
        spawnedProjectiles.push(
          new Projectile(this.x, this.y + 24, targetVx, 330, 1, 'enemy_bullet', '#00F0FF')
        );
      }
    } else if (this.type === 'boss_minion') {
      this.y += (scrollSpeed + 90) * dt;
      this.x += Math.sin(this.phase * 2.5) * 120 * dt;
      this.shootTimer += dt;
      if (this.shootTimer >= 2.2 && this.y >= 50 && this.y < 620) {
        this.shootTimer = 0;
        spawnedProjectiles.push(
          new Projectile(this.x, this.y + 14, 0, 310, 1, 'enemy_bullet', '#FFE600')
        );
      }
    } else if (this.isBossType()) {
      // Défilement du boss :
      // 1. Au loin (hors écran, y < -1200) : l'apparition du boss accélère avec le défilement général.
      // 2. Dès qu'il apparaît à l'horizon / entre sur l'écran (y >= -1200) et descend vers son ancrage targetCombatY :
      //    sa vitesse de descente est STRICTEMENT plafonnée à BASE_SCROLL_SPEED (135 px/s).
      //    LE BOSS N'ACCÉLÈRE JAMAIS VERS LE JOUEUR NI EN COMBAT !
      if (this.y < targetCombatY) {
        const bossSpeed = (this.y < -1200) ? scrollSpeed : Math.min(GAME_CONFIG.BASE_SCROLL_SPEED, scrollSpeed);
        this.y += bossSpeed * dt;
        this.x = 330;
      } else {
        // En position de combat à targetCombatY : vitesse et strafe strictement nominaux (AUCUNE accélération)
        if (this.recoilTimer > 0) {
          // Pendant le tir : stabilisation totale (pas de strafe, le boss est ancré pour tirer)
          this.recoilTimer -= dt;
          this.recoilShakeAmount = Math.max(0, this.recoilShakeAmount - dt * 12);
        } else {
          // En dehors du tir : vol stationnaire et strafe fluide sans glitch
          let strafeAmplitude = 80;
          if (this.type === 'boss_final') strafeAmplitude = 60;
          else if (this.type === 'boss_gammargantua') strafeAmplitude = 50;
          else if (this.type === 'boss_betapulsar') strafeAmplitude = 95;
          else if (this.type === 'boss_alpharion') strafeAmplitude = 75;

          this.targetCombatX = 330 + Math.sin(this.phase * 0.6) * strafeAmplitude;
          this.x += (this.targetCombatX - this.x) * 2.2 * dt;
          // Flottement et maintien doux à targetCombatY (ancrage stable sans dérive)
          this.y += (targetCombatY - this.y) * 3.0 * dt;
          this.y += Math.sin(this.phase * 0.9) * 4 * dt;
        }
      }
    } else {
      this.y += scrollSpeed * dt;
    }

    if (this.hitBlinkTimer > 0) {
      this.hitBlinkTimer -= dt;
    }

    // Tirs de Boss : Salves rythmées (pour les Boss de Secteur, engage le combat dès Y >= 45px à longue portée)
    const isSectorBoss = (this.type === 'boss_alpharion' || this.type === 'boss_betapulsar' || this.type === 'boss_gammargantua');
    const minShootY = isSectorBoss ? 45 : (targetCombatY - 5);

    if (this.isBossType() && this.y >= minShootY && this.y < 680) {
      this.combatTimer += dt;

      // Calcul de la cadence de tir
      let effectiveInterval = this.shootInterval;
      if (this.type === 'boss_final' || this.type === 'boss_gammargantua') {
        if (this.combatTimer > 10.0) {
          const overTime = this.combatTimer - 10.0;
          effectiveInterval = Math.max(0.50, this.shootInterval - overTime * 0.075);
        }
      }

      this.shootTimer += dt;
      if (this.shootTimer >= effectiveInterval) {
        this.shootTimer = 0;
        this.recoilTimer = Math.min(0.35, effectiveInterval * 0.35);
        this.recoilShakeAmount = (this.type === 'boss_final' || this.type === 'boss_gammargantua') ? 6.0 : 5.0;

        // 1. PATTERNS DU BOSS FINAL GÉNÉRAL (TITAN OVERLORD)
        if (this.type === 'boss_final') {
          this.salvoPattern = (this.salvoPattern + 1) % 3;
          const bulletSpeed = 360;

          if (this.salvoPattern === 0) {
            const angles = [-90, -60, -30, 0, 30, 60, 90];
            for (const ang of angles) {
              const rad = (ang * Math.PI) / 180;
              spawnedProjectiles.push(
                new Projectile(this.x, this.y + 40, Math.sin(rad) * 220, Math.cos(rad) * bulletSpeed, 1, 'enemy_bullet', '#FF007A')
              );
            }
          } else if (this.salvoPattern === 1) {
            spawnedProjectiles.push(
              new Projectile(this.x - 35, this.y + 45, -20, bulletSpeed * 1.1, 1, 'enemy_bullet', '#FFE600'),
              new Projectile(this.x, this.y + 50, 0, bulletSpeed * 1.15, 1, 'enemy_bullet', '#FFE600'),
              new Projectile(this.x + 35, this.y + 45, 20, bulletSpeed * 1.1, 1, 'enemy_bullet', '#FFE600'),
              new Projectile(this.x - 120, this.y + 20, -130, bulletSpeed, 1, 'enemy_bullet', '#00F0FF'),
              new Projectile(this.x + 120, this.y + 20, 130, bulletSpeed, 1, 'enemy_bullet', '#00F0FF')
            );
          } else {
            const vOffsets = [
              { x: -90, vx: -170 },
              { x: -45, vx: -80 },
              { x: 0,   vx: (playerX !== undefined ? Math.min(50, Math.max(-50, (playerX - this.x) * 0.25)) : 0) },
              { x: 45,  vx: 80 },
              { x: 90,  vx: 170 }
            ];
            for (const v of vOffsets) {
              spawnedProjectiles.push(
                new Projectile(this.x + v.x, this.y + 35, v.vx, bulletSpeed, 1, 'enemy_bullet', '#FF0055')
              );
            }
          }

        // 2. PATTERNS D'ALPHARION (SECTEUR 1 ALPHA : CANONS SOLAIRES & ÉVENTAIL STELLAIRE)
        } else if (this.type === 'boss_alpharion') {
          this.salvoPattern = (this.salvoPattern + 1) % 2;
          const bulletSpeed = 360;

          if (this.salvoPattern === 0) {
            // Salve A : Double Railgun Solaire perçant + 4 flèches plasma latérales
            spawnedProjectiles.push(
              new Projectile(this.x - 28, this.y + 45, -15, bulletSpeed * 1.15, 1, 'enemy_bullet', '#FFE600'),
              new Projectile(this.x + 28, this.y + 45, 15, bulletSpeed * 1.15, 1, 'enemy_bullet', '#FFE600'),
              new Projectile(this.x - 85, this.y + 30, -140, bulletSpeed * 0.95, 1, 'enemy_bullet', '#FFAA00'),
              new Projectile(this.x - 45, this.y + 38, -65, bulletSpeed, 1, 'enemy_bullet', '#FFAA00'),
              new Projectile(this.x + 45, this.y + 38, 65, bulletSpeed, 1, 'enemy_bullet', '#FFAA00'),
              new Projectile(this.x + 85, this.y + 30, 140, bulletSpeed * 0.95, 1, 'enemy_bullet', '#FFAA00')
            );
          } else {
            // Salve B : Nova Solaire en éventail radial 6 tirs
            const solarAngles = [-60, -36, -12, 12, 36, 60];
            for (const ang of solarAngles) {
              const rad = (ang * Math.PI) / 180;
              spawnedProjectiles.push(
                new Projectile(this.x, this.y + 40, Math.sin(rad) * 200, Math.cos(rad) * bulletSpeed, 1, 'enemy_bullet', '#FFE600')
              );
            }
          }

        // 3. PATTERNS DE BETAPULSAR (SECTEUR 2 BETA : ONDES CYCLOTRON & PULSARS MAGNÉTIQUES)
        } else if (this.type === 'boss_betapulsar') {
          this.salvoPattern = (this.salvoPattern + 1) % 2;
          const bulletSpeed = 370;

          if (this.salvoPattern === 0) {
            // Salve A : Vague d'impulsions pulsar cyan à haute vitesse
            const waveOffsets = [
              { x: -90, vx: -160, c: '#00F0FF' },
              { x: -50, vx: -80,  c: '#38BDF8' },
              { x: -18, vx: -20,  c: '#00F0FF' },
              { x: 18,  vx: 20,   c: '#00F0FF' },
              { x: 50,  vx: 80,   c: '#38BDF8' },
              { x: 90,  vx: 160,  c: '#00F0FF' }
            ];
            for (const w of waveOffsets) {
              spawnedProjectiles.push(
                new Projectile(this.x + w.x, this.y + 36, w.vx, bulletSpeed, 1, 'enemy_bullet', w.c)
              );
            }
          } else {
            // Salve B : Doubles tirs convergents accélérés vers la position du joueur
            const aimVx = playerX !== undefined ? Math.min(80, Math.max(-80, (playerX - this.x) * 0.35)) : 0;
            spawnedProjectiles.push(
              new Projectile(this.x - 42, this.y + 44, aimVx - 40, bulletSpeed * 1.15, 1, 'enemy_bullet', '#00F0FF'),
              new Projectile(this.x + 42, this.y + 44, aimVx + 40, bulletSpeed * 1.15, 1, 'enemy_bullet', '#00F0FF'),
              new Projectile(this.x - 70, this.y + 25, -120, bulletSpeed, 1, 'enemy_bullet', '#38BDF8'),
              new Projectile(this.x + 70, this.y + 25, 120, bulletSpeed, 1, 'enemy_bullet', '#38BDF8'),
              new Projectile(this.x, this.y + 50, aimVx, bulletSpeed * 1.2, 1, 'enemy_bullet', '#FFFFFF')
            );
          }

        // 4. PATTERNS DE GAMMARGANTUA (SECTEUR 3 GAMMA : ANNIHILATION GRAVITATIONNELLE & SIÈGE HYPERBEAM)
        } else if (this.type === 'boss_gammargantua') {
          this.salvoPattern = (this.salvoPattern + 1) % 2;
          const bulletSpeed = 380;

          if (this.salvoPattern === 0) {
            // Salve A : Pulsation de singularité gravitationnelle 7 orbes de matière noire
            const gravAngles = [-75, -50, -25, 0, 25, 50, 75];
            for (const ang of gravAngles) {
              const rad = (ang * Math.PI) / 180;
              const col = Math.abs(ang) <= 25 ? '#FF007A' : '#A855F7';
              spawnedProjectiles.push(
                new Projectile(this.x, this.y + 45, Math.sin(rad) * 220, Math.cos(rad) * bulletSpeed, 1, 'enemy_bullet', col)
              );
            }
          } else {
            // Salve B : Tir de barrage d'artillerie lourde (4 tirs centraux massifs + 2 tirs de flanc)
            spawnedProjectiles.push(
              new Projectile(this.x - 60, this.y + 40, -25, bulletSpeed * 1.1, 1, 'enemy_bullet', '#FF0055'),
              new Projectile(this.x - 20, this.y + 48, -10, bulletSpeed * 1.15, 1, 'enemy_bullet', '#A855F7'),
              new Projectile(this.x + 20, this.y + 48, 10, bulletSpeed * 1.15, 1, 'enemy_bullet', '#A855F7'),
              new Projectile(this.x + 60, this.y + 40, 25, bulletSpeed * 1.1, 1, 'enemy_bullet', '#FF0055'),
              new Projectile(this.x - 110, this.y + 20, -150, bulletSpeed * 0.95, 1, 'enemy_bullet', '#7928CA'),
              new Projectile(this.x + 110, this.y + 20, 150, bulletSpeed * 0.95, 1, 'enemy_bullet', '#7928CA')
            );
          }

        // 5. PATTERNS STANDARDS V1, V2, V3
        } else {
          this.salvoPattern = (this.salvoPattern + 1) % 2;
          const bulletColor = (this.type === 'boss_v3') ? '#FF007A' : (this.type === 'boss_v2' ? '#00F0FF' : '#FFAA00');
          const bulletSpeed = (this.type === 'boss_v3') ? 370 : ((this.type === 'boss_v2') ? 350 : 330);

          if (this.salvoPattern === 0) {
            const spreadAngles = [
              { xOff: -65, vx: -185 },
              { xOff: -30, vx: -90 },
              { xOff: 0,   vx: (playerX !== undefined ? Math.max(-45, Math.min(45, (playerX - this.x) * 0.2)) : 0) },
              { xOff: 30,  vx: 90 },
              { xOff: 65,  vx: 185 }
            ];
            for (const s of spreadAngles) {
              spawnedProjectiles.push(
                new Projectile(this.x + s.xOff, this.y + 35, s.vx, bulletSpeed, 1, 'enemy_bullet', bulletColor)
              );
            }
          } else {
            const wideOffsets = [
              { xOff: -85, vx: -150 },
              { xOff: -40, vx: -65 },
              { xOff: 0,   vx: 0 },
              { xOff: 40,  vx: 65 },
              { xOff: 85,  vx: 150 }
            ];
            for (const a of wideOffsets) {
              spawnedProjectiles.push(
                new Projectile(this.x + a.xOff, this.y + 35, a.vx, bulletSpeed, 1, 'enemy_bullet', bulletColor)
              );
            }
          }
        }
      }
    }

    return spawnedProjectiles;
  }

  public takeDamage(amount: number): boolean {
    if (this.isInvulnerable) {
      this.hitBlinkTimer = 0.08;
      return false;
    }
    this.hp -= amount;
    this.hitBlinkTimer = 0.08;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      return true;
    }
    return false;
  }

  public syncShootTimer(timer: number) {
    this.shootTimer = timer;
  }

  public getShootTimer(): number {
    return this.shootTimer;
  }

  public draw3D(ctx: CanvasRenderingContext2D, renderer: Renderer) {
    if (this.y < -1100) {
      return;
    }

    let renderX = this.x;
    let renderY = this.y;
    if (this.isBossType() && this.recoilTimer > 0) {
      // Légère vibration mécanique haute fréquence au tir
      const vib = Math.sin(this.recoilTimer * 60);
      renderX += vib * this.recoilShakeAmount;
      renderY += Math.cos(this.recoilTimer * 60) * (this.recoilShakeAmount * 0.5);
    }

    const pt = renderer.project(renderX, renderY);
    if (!pt.isVisible || pt.scale <= 0.04) return;

    ctx.save();
    const s = pt.scale;
    const isHit = this.hitBlinkTimer > 0;

    // Fondu d'apparition cosmique propre à l'entrée du champ visuel (-1100 à -800)
    if (this.y < -800) {
      ctx.globalAlpha = Math.max(0, Math.min(1, (this.y + 1100) / 300));
    }

    // 1. RENDU DU TROU NOIR (Singularité centrale, tourbillon de matière noire & effets de lumière violette)
    if (this.type === 'black_hole') {
      const radius = Math.max(14, (this.width / 2) * s);
      const coreRadius = radius * 0.68;       // Rond noir central bien défini
      const vortexInnerR = coreRadius * 0.96; // Jonction directe avec le tourbillon
      const vortexOuterR = radius * 1.05;     // Tourbillon de matière noire compact
      const lightOuterR = radius * 1.15;      // Couronne violette resserrée

      ctx.save();
      ctx.translate(pt.x, pt.y);

      // --- A. EFFETS DE LUMIÈRE VIOLETTE EXTERNES & DISQUE D'ACCRÉTION NET ---
      // 1. Anneaux photoniques d'accrétion nets et précis (zéro halo flou / zéro dégradé radial laiteux)
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.70)';
      ctx.lineWidth = Math.max(1.2, 2.2 * s);
      ctx.beginPath();
      ctx.arc(0, 0, lightOuterR * 0.96, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(216, 180, 254, 0.85)';
      ctx.lineWidth = Math.max(1.0, 1.6 * s);
      ctx.beginPath();
      ctx.arc(0, 0, vortexOuterR, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Arcs lumineux photoniques d'accrétion en rotation ralentie
      const lightSpin = this.phase * 0.20;
      for (let i = 0; i < 6; i++) {
        const arcAngle = (i * Math.PI) / 3 + lightSpin;
        const arcR = radius * (0.96 + (i % 2) * 0.08);
        ctx.strokeStyle = (i % 2 === 0) ? 'rgba(216, 180, 254, 0.85)' : 'rgba(168, 85, 247, 0.65)';
        ctx.lineWidth = Math.max(1.0, ((i % 2 === 0) ? 2.0 : 1.2) * s);
        ctx.beginPath();
        ctx.arc(0, 0, arcR, arcAngle, arcAngle + 0.55);
        ctx.stroke();
      }

      // 3. Filaments spirales de lumière violette
      const numLightFilaments = 4;
      const filSpin = this.phase * 0.25;
      for (let f = 0; f < numLightFilaments; f++) {
        const baseAngle = (f * Math.PI * 2) / numLightFilaments + filSpin;
        ctx.beginPath();
        const steps = 6;
        for (let step = 0; step <= steps; step++) {
          const t = step / steps;
          const r = lightOuterR * 0.95 * (1 - t) + vortexOuterR * 0.90 * t;
          const a = baseAngle + t * 0.95;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (step === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.45)';
        ctx.lineWidth = Math.max(0.8, 1.4 * s);
        ctx.stroke();
      }

      // --- B. TOURBILLON NOIR (MATIÈRE NOIRE EN SPIRALE CENTRIPÈTE) ---
      // 8 traînées noires resserrées et fluides
      const numDarkArms = 8;
      const darkSpin = this.phase * 0.35; // Rotation majestueuse et ralentie

      ctx.lineCap = 'round';
      for (let arm = 0; arm < numDarkArms; arm++) {
        const isAlt = (arm % 2 === 1);
        const baseAngle = (arm * Math.PI * 2) / numDarkArms + darkSpin;
        ctx.beginPath();
        const steps = 6;
        const armOuterR = isAlt ? vortexOuterR * 0.97 : vortexOuterR;
        for (let step = 0; step <= steps; step++) {
          const t = step / steps;
          const currentR = armOuterR * (1 - t) + vortexInnerR * t;
          const currentAngle = baseAngle + t * 1.35;
          const px = Math.cos(currentAngle) * currentR;
          const py = Math.sin(currentAngle) * currentR;
          if (step === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = isAlt ? 'rgba(8, 2, 16, 0.95)' : 'rgba(1, 0, 4, 0.98)';
        ctx.lineWidth = Math.max(1.8, (isAlt ? 3.0 : 4.0) * s);
        ctx.stroke();
      }

      // --- C. ROND NOIR CENTRAL (LA SINGULARITÉ / HORIZON DES ÉVÉNEMENTS) ---
      // Cœur noir absolu pur sans aucun flou ni décoloration
      ctx.fillStyle = isHit ? '#FFFFFF' : '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // Anneau photonique (bordure fine de réfraction lumineuse autour de la sphère noire)
      ctx.strokeStyle = isHit ? '#FFFFFF' : 'rgba(216, 180, 254, 0.92)';
      ctx.lineWidth = Math.max(1.2, 2.0 * s);
      ctx.stroke();

      // --- D. BADGE DE POINTS DE VIE (CYBERPUNK VIOLET) ---
      const badgeW = Math.max(28, 48 * s);
      const badgeH = Math.max(14, 18 * s);
      const badgeY = -lightOuterR - badgeH - 3 * s;

      ctx.fillStyle = 'rgba(6, 2, 14, 0.90)';
      ctx.strokeStyle = '#A855F7';
      ctx.lineWidth = Math.max(1, 1.5 * s);
      ctx.beginPath();
      ctx.roundRect(-badgeW / 2, badgeY, badgeW, badgeH, 4 * s);
      ctx.fill();
      ctx.stroke();

      ctx.font = `900 ${Math.max(9, Math.floor(11 * s))}px 'Orbitron', sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🕳️ ${Math.ceil(this.hp)}`, 0, badgeY + badgeH / 2);

      ctx.restore();
      ctx.restore();
      return;
    }

    // 1.1 RENDU DE LA PRISON SPATIALE 3D
    if (this.type === 'prison') {
      const radius = Math.max(18, (this.width / 2) * s);
      const rInfo = SHIP_RANKS[this.prisonRank] || SHIP_RANKS[2];
      const mainCol = isHit ? '#FFFFFF' : rInfo.color;
      const glowCol = isHit ? '#FFFFFF' : rInfo.glowColor;

      ctx.save();
      ctx.translate(pt.x, pt.y);

      // A. Champ d'Énergie Protecteur & Confinement
      const cageGrad = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius * 1.4);
      cageGrad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
      cageGrad.addColorStop(0.5, rInfo.color + '44');
      cageGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = cageGrad;
      if (Renderer.enableGlow) {
        ctx.shadowColor = glowCol;
        ctx.shadowBlur = 18 * s;
      }
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.35, 0, Math.PI * 2);
      ctx.fill();
      if (Renderer.enableGlow) {
        ctx.shadowBlur = 0;
      }

      // B. Anneau de confinement hexagonal tournant
      const numBars = 6;
      ctx.save();
      ctx.rotate(this.rotAngle);
      ctx.strokeStyle = mainCol;
      ctx.lineWidth = Math.max(1.5, 2.5 * s);

      ctx.beginPath();
      for (let i = 0; i < numBars; i++) {
        const a = (i * Math.PI * 2) / numBars;
        const bx = Math.cos(a) * radius;
        const by = Math.sin(a) * radius;
        if (i === 0) ctx.moveTo(bx, by);
        else ctx.lineTo(bx, by);
      }
      ctx.closePath();
      ctx.stroke();

      // Piliers émetteurs laser aux 6 sommets
      for (let i = 0; i < numBars; i++) {
        const a = (i * Math.PI * 2) / numBars;
        const bx = Math.cos(a) * radius;
        const by = Math.sin(a) * radius;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(bx, by, Math.max(2, 3.5 * s), 0, Math.PI * 2);
        ctx.fill();

        // Barreaux laser vers le centre
        ctx.strokeStyle = rInfo.color;
        ctx.lineWidth = Math.max(1, 1.5 * s);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx * 0.35, by * 0.35);
        ctx.stroke();
      }
      ctx.restore();

      // C. Vaisseau Prototype Captif au Centre (en lévitation)
      ctx.save();
      const wobble = Math.sin(this.phase * 4) * 2 * s;
      ctx.translate(0, wobble);
      ctx.scale(s * 0.85, s * 0.85);

      ctx.fillStyle = rInfo.color;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.4;

      // Silhouette miniature selon le prototype
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(11, 9);
      ctx.lineTo(5, 11);
      ctx.lineTo(0, 7);
      ctx.lineTo(-5, 11);
      ctx.lineTo(-11, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit miniature
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, -3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // D. Badge flottant au-dessus avec HP et bonus
      const badgeW = Math.max(95, 145 * s);
      const badgeH = Math.max(22, 30 * s);
      const badgeY = -radius - badgeH - 6 * s;

      ctx.fillStyle = 'rgba(5, 10, 20, 0.9)';
      ctx.strokeStyle = mainCol;
      ctx.lineWidth = Math.max(1, 1.5 * s);
      ctx.beginPath();
      ctx.roundRect(-badgeW / 2, badgeY, badgeW, badgeH, 4 * s);
      ctx.fill();
      ctx.stroke();

      ctx.font = `900 ${Math.max(8, Math.floor(10 * s))}px 'Orbitron', sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🔒 PRISON : ❤️ ${Math.ceil(this.hp)}`, 0, badgeY + badgeH * 0.32);

      ctx.font = `800 ${Math.max(7, Math.floor(8.5 * s))}px 'Orbitron', sans-serif`;
      ctx.fillStyle = rInfo.color;
      ctx.fillText(`[ ${rInfo.perkName} ]`, 0, badgeY + badgeH * 0.72);

      ctx.restore();
      ctx.restore();
      return;
    }

    // 1.2 RENDU DE LA TOURELLE ENNEMIE DE COIN (MODE ARÈNE DÉFENSE)
    if (this.type === 'corner_turret') {
      const radius = Math.max(16, (this.width / 2) * s);
      const isRapid = this.isRapidSpecial;
      const themeColor = isRapid ? '#FFE600' : '#FF0055';
      const eyeCoreColor = isRapid ? '#FFAA00' : '#660022';

      ctx.save();
      ctx.translate(pt.x, pt.y);

      // Calcul de l'angle de visée vers le Cargo central (270, 480)
      const aimAngle = Math.atan2(GAME_CONFIG.CARGO_CENTER_Y - this.y, GAME_CONFIG.CARGO_CENTER_X - this.x);

      // A. Aura menaçante (rouge vif ou doré-foudre selon la variante)
      const haloGrad = ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, radius * 1.5);
      haloGrad.addColorStop(0, isHit ? 'rgba(255, 255, 255, 0.4)' : (isRapid ? 'rgba(255, 230, 0, 0.45)' : 'rgba(255, 0, 85, 0.35)'));
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // B. Double canon orienté vers le cargo
      ctx.save();
      ctx.rotate(aimAngle);
      ctx.fillStyle = isHit ? '#FFFFFF' : (isRapid ? '#1A1804' : '#1A0410');
      ctx.strokeStyle = isHit ? '#FFFFFF' : themeColor;
      ctx.lineWidth = Math.max(1.5, 2 * s);

      // Canons gauche et droite
      ctx.fillRect(radius * 0.3, -radius * 0.38, radius * 0.75, radius * 0.22);
      ctx.strokeRect(radius * 0.3, -radius * 0.38, radius * 0.75, radius * 0.22);
      ctx.fillRect(radius * 0.3, radius * 0.16, radius * 0.75, radius * 0.22);
      ctx.strokeRect(radius * 0.3, radius * 0.16, radius * 0.75, radius * 0.22);

      // Embouts de plasma lumineux
      ctx.fillStyle = isRapid ? '#FFFFFF' : '#FF5500';
      ctx.beginPath();
      ctx.arc(radius * 1.05, -radius * 0.27, radius * 0.12, 0, Math.PI * 2);
      ctx.arc(radius * 1.05, radius * 0.27, radius * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // C. Châssis Cyber-Blindé hexagonal (rotation plus vive si tourelle rapide)
      ctx.fillStyle = isHit ? '#FFFFFF' : '#0B0F19';
      ctx.strokeStyle = isHit ? '#FFFFFF' : themeColor;
      ctx.lineWidth = Math.max(2, 3 * s);
      ctx.beginPath();
      const numSides = 6;
      for (let i = 0; i < numSides; i++) {
        const a = (i * Math.PI * 2) / numSides + this.phase * (isRapid ? 1.6 : 0.8);
        const px = Math.cos(a) * radius;
        const py = Math.sin(a) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // D. Cœur / Œil de visée central pulsant
      const coreR = radius * 0.45;
      const eyeGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, coreR);
      eyeGrad.addColorStop(0, '#FFFFFF');
      eyeGrad.addColorStop(0.5, themeColor);
      eyeGrad.addColorStop(1, eyeCoreColor);
      ctx.fillStyle = eyeGrad;
      ctx.beginPath();
      ctx.arc(0, 0, coreR, 0, Math.PI * 2);
      ctx.fill();

      // E. Badge de Points de Vie bien visible au-dessus
      const badgeW = Math.max(54, 70 * s);
      const badgeH = Math.max(16, 20 * s);
      const badgeY = -radius - badgeH - 6 * s;

      ctx.fillStyle = isRapid ? 'rgba(25, 22, 5, 0.95)' : 'rgba(6, 10, 20, 0.92)';
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = Math.max(1, 1.5 * s);
      ctx.beginPath();
      ctx.roundRect(-badgeW / 2, badgeY, badgeW, badgeH, 4 * s);
      ctx.fill();
      ctx.stroke();

      // Jauge de PV interne dans le badge
      const hpRatio = Math.max(0, Math.min(1, this.hp / this.maxHp));
      const gaugeW = Math.max(0, (badgeW - 4) * hpRatio);
      ctx.fillStyle = themeColor;
      ctx.beginPath();
      ctx.roundRect(-badgeW / 2 + 2, badgeY + 2, gaugeW, badgeH - 4, 2 * s);
      ctx.fill();

      ctx.font = `900 ${Math.max(9, Math.floor(11 * s))}px 'Orbitron', sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const hpBadgeText = isRapid ? `⚡ ${Math.ceil(this.hp)} / ${this.maxHp}` : `❤️ ${Math.ceil(this.hp)} / ${this.maxHp}`;
      ctx.fillText(hpBadgeText, 0, badgeY + badgeH / 2);

      ctx.restore();
      return;
    }

    // =========================================================================
    // ⚡ RENDU DU GÉNÉRATEUR DE BOUCLIER MAGNÉTIQUE (Boss Duel Pylon)
    // =========================================================================
    if (this.type === 'shield_generator') {
      const radius = Math.max(16, (this.width / 2) * s);
      const isCenter = this.generatorSide === 'center';
      const themeColor = isCenter ? '#A855F7' : '#00F0FF';

      ctx.save();
      ctx.translate(pt.x, pt.y);

      if (Renderer.enableGlow) {
        ctx.shadowColor = themeColor;
        ctx.shadowBlur = 18 * s;
      }

      // 1. Anneaux Magnétiques Rotatifs (Pylône générateur)
      ctx.strokeStyle = isHit ? '#FFFFFF' : themeColor;
      ctx.lineWidth = Math.max(1.5, 2.5 * s);
      for (let i = 0; i < 3; i++) {
        const a = this.rotAngle + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 1.05, a, a + 1.2);
        ctx.stroke();
      }

      // 2. Châssis Hexagonal Pylône
      ctx.fillStyle = isHit ? '#FFFFFF' : '#041624';
      ctx.strokeStyle = isHit ? '#FFFFFF' : themeColor;
      ctx.lineWidth = Math.max(2, 3 * s);
      ctx.beginPath();
      for (let h = 0; h < 6; h++) {
        const ha = (h * Math.PI) / 3;
        const hx = Math.cos(ha) * (radius * 0.75);
        const hy = Math.sin(ha) * (radius * 0.75);
        if (h === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 3. Cœur Plasma Energétique Pulsant
      const coreGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, radius * 0.45);
      coreGrad.addColorStop(0, '#FFFFFF');
      coreGrad.addColorStop(0.5, themeColor);
      coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // 4. Barre de Vie du Générateur
      const gBarW = Math.max(65, 80 * s);
      const gBarH = Math.max(12, 14 * s);
      const gBarY = -radius - gBarH - 8 * s;

      ctx.fillStyle = 'rgba(2, 10, 20, 0.9)';
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-gBarW / 2, gBarY, gBarW, gBarH, 3 * s);
      ctx.fill();
      ctx.stroke();

      const gHpRatio = Math.max(0, Math.min(1, this.hp / this.maxHp));
      ctx.fillStyle = themeColor;
      ctx.beginPath();
      ctx.roundRect(-gBarW / 2 + 1, gBarY + 1, (gBarW - 2) * gHpRatio, gBarH - 2, 2 * s);
      ctx.fill();

      ctx.font = `900 ${Math.max(8, Math.floor(9 * s))}px 'Orbitron', sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`⚡ GÉNÉRATEUR`, 0, gBarY + gBarH / 2);

      ctx.restore();
      return;
    }

    // =========================================================================
    // 💎 RENDU DU VAISSEAU MINION DU BOSS (Lâcheur de Diamants)
    // =========================================================================
    if (this.type === 'boss_minion') {
      const minionW = this.width * s;
      const minionH = this.height * s;
      ctx.save();
      ctx.translate(pt.x, pt.y);

      if (Renderer.enableGlow) {
        ctx.shadowColor = '#FFE600';
        ctx.shadowBlur = 12 * s;
      }

      // Châssis Vaisseau Minion Flèche Dorée
      ctx.fillStyle = isHit ? '#FFFFFF' : '#1A1405';
      ctx.strokeStyle = isHit ? '#FFFFFF' : '#FFE600';
      ctx.lineWidth = Math.max(1.5, 2.5 * s);
      ctx.beginPath();
      ctx.moveTo(0, minionH * 0.6);
      ctx.lineTo(-minionW * 0.5, -minionH * 0.4);
      ctx.lineTo(0, -minionH * 0.1);
      ctx.lineTo(minionW * 0.5, -minionH * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Réacteur solaire
      ctx.fillStyle = '#FF9900';
      ctx.beginPath();
      ctx.arc(0, -minionH * 0.2, 4 * s, 0, Math.PI * 2);
      ctx.fill();

      // Indicateur diamant au-dessus
      ctx.font = `${Math.max(9, Math.floor(11 * s))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('💎', 0, -minionH * 0.5);

      ctx.restore();
      return;
    }

    // 2. RENDU DES ASTÉROÏDES 3D
    if (this.type === 'block') {
      const curHp = Math.ceil(this.hp);
      
      // Palette de couleur selon les PV restants :
      // 1 PV : Gris | 2 PV : Brun | 3-4 PV : Orange | 5-8 PV : Rouge | >8 PV : Pourpre
      let colCenter = '#8E939E';
      let colMid = '#4E5362';
      let colEdge = '#22242B';
      let colStroke = '#A4A9B8';
      let colGlow = '#8A8E9B';

      if (curHp === 2) {
        // Brun (2 PV)
        colCenter = '#B07540';
        colMid = '#70431D';
        colEdge = '#3A1E0B';
        colStroke = '#C6864B';
        colGlow = '#A06530';
      } else if (curHp >= 3 && curHp <= 4) {
        // Orange (4 PV)
        colCenter = '#FFA533';
        colMid = '#E65A00';
        colEdge = '#7A2200';
        colStroke = '#FFB74D';
        colGlow = '#FF7700';
      } else if (curHp >= 5 && curHp <= 8) {
        // Rouge (8 PV)
        colCenter = '#FF5252';
        colMid = '#D50000';
        colEdge = '#5A0000';
        colStroke = '#FF1744';
        colGlow = '#FF0055';
      } else if (curHp > 8) {
        // Pourpre / Cramoisi (> 8 PV)
        colCenter = '#FF4081';
        colMid = '#C2185B';
        colEdge = '#4A0025';
        colStroke = '#F50057';
        colGlow = '#FF007A';
      }

      // Réduction de l'opacité proportionnelle aux dégâts subis
      const healthRatio = Math.max(0.1, Math.min(1.0, this.hp / this.maxHp));
      ctx.globalAlpha *= (0.55 + 0.45 * healthRatio);

      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(this.rotAngle);

      const rockGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, (this.width / 2) * s);
      if (isHit) {
        rockGrad.addColorStop(0, '#FFFFFF');
        rockGrad.addColorStop(1, '#FFFFFF');
      } else {
        rockGrad.addColorStop(0, colCenter);
        rockGrad.addColorStop(0.6, colMid);
        rockGrad.addColorStop(1, colEdge);
      }

      ctx.fillStyle = rockGrad;

      ctx.beginPath();
      if (this.shapePoints.length > 0) {
        ctx.moveTo(this.shapePoints[0].x * s, this.shapePoints[0].y * s);
        for (let i = 1; i < this.shapePoints.length; i++) {
          ctx.lineTo(this.shapePoints[i].x * s, this.shapePoints[i].y * s);
        }
      } else {
        ctx.arc(0, 0, (this.width / 2) * s, 0, Math.PI * 2);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = isHit ? '#FFFFFF' : colStroke;
      ctx.lineWidth = Math.max(1.2, 2.5 * s);
      ctx.stroke();

      ctx.restore(); // Restaure la rotation de l'astéroïde
      ctx.restore(); // Restaure le contexte global
      return;
    }

    // 3. RENDU DES MURS MULTIPLICATEURS FINAUX (GAUNTLET WALLS)
    if (this.type === 'gauntlet_wall') {
      const drawW = (this.width + 40) * s;
      const drawH = 50 * s;
      const left = pt.x - drawW / 2;
      const top = pt.y - drawH / 2;

      ctx.save();
      // Cadre holographique doré / diamant
      const wallGrad = ctx.createLinearGradient(left, top, left + drawW, top + drawH);
      wallGrad.addColorStop(0, 'rgba(255, 230, 0, 0.35)');
      wallGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.45)');
      wallGrad.addColorStop(1, 'rgba(255, 0, 122, 0.35)');

      ctx.fillStyle = isHit ? 'rgba(255, 255, 255, 0.9)' : wallGrad;
      if (Renderer.enableGlow) {
        ctx.shadowColor = '#FFE600';
        ctx.shadowBlur = 25 * s;
      }
      ctx.beginPath();
      ctx.roundRect(left, top, drawW, drawH, 10 * s);
      ctx.fill();

      ctx.strokeStyle = '#FFE600';
      ctx.lineWidth = Math.max(2, 3.5 * s);
      ctx.stroke();

      // Texte ultra clair pour le joueur avec contour net
      ctx.font = `900 ${Math.max(12, Math.floor(18 * s))}px 'Orbitron', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(1.5, 3 * s);
      ctx.strokeText(`💎 MULTIPLICATEUR x${this.multiplier || 1.5} 💎`, pt.x, pt.y - 6 * s);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`💎 MULTIPLICATEUR x${this.multiplier || 1.5} 💎`, pt.x, pt.y - 6 * s);

      ctx.font = `700 ${Math.max(9, Math.floor(11 * s))}px 'Chakra Petch', sans-serif`;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(1, 2 * s);
      ctx.strokeText(`TIRE POUR BRISER (PV : ${Math.ceil(this.hp)})`, pt.x, pt.y + 12 * s);
      ctx.fillStyle = '#FFE600';
      ctx.fillText(`TIRE POUR BRISER (PV : ${Math.ceil(this.hp)})`, pt.x, pt.y + 12 * s);

      ctx.restore();
      ctx.restore();
      return;
    }

    // 4. RENDU DES BOSS PAR CLASSE & DU TITAN FINAL ULTRA-ORIGINAL
    if (this.isBossType()) {
      const drawW = this.width * s;
      const drawH = this.height * s;
      const left = pt.x - drawW / 2;
      const top = pt.y - drawH / 2;

      ctx.save();

      // ========================================================
      // A. BOSS FINAL : TITAN OVERLORD (Vaisseau-Mère Suprême Unique)
      // ========================================================
      if (this.type === 'boss_final') {
        if (Renderer.enableGlow) {
          ctx.shadowColor = '#FF007A';
          ctx.shadowBlur = 35 * s;
        }

        // 1. Satellites Orbitaux Flottants (Gauche & Droite)
        const orbitRadiusX = drawW * 0.65;
        const orbitRadiusY = drawH * 0.45;
        const orbitAngle = this.phase * 1.5;

        const drone1X = pt.x + Math.cos(orbitAngle) * orbitRadiusX;
        const drone1Y = pt.y + Math.sin(orbitAngle) * orbitRadiusY;
        const drone2X = pt.x + Math.cos(orbitAngle + Math.PI) * orbitRadiusX;
        const drone2Y = pt.y + Math.sin(orbitAngle + Math.PI) * orbitRadiusY;

        // Liens d'énergie plasmique
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = Math.max(1, 2 * s);
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(drone1X, drone1Y);
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(drone2X, drone2Y);
        ctx.stroke();

        // Rendu des Drones Satellites
        [ { x: drone1X, y: drone1Y }, { x: drone2X, y: drone2Y } ].forEach(d => {
          ctx.fillStyle = '#050a18';
          ctx.strokeStyle = '#00F0FF';
          ctx.lineWidth = 2 * s;
          ctx.beginPath();
          ctx.arc(d.x, d.y, 14 * s, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#FF007A';
          ctx.beginPath();
          ctx.arc(d.x, d.y, 6 * s, 0, Math.PI * 2);
          ctx.fill();
        });

        // 2. Châssis Biologique / Cyber Mécanique du Titan (Couronne & Ailes massives)
        ctx.fillStyle = isHit ? '#FFFFFF' : '#140320';
        ctx.strokeStyle = isHit ? '#FFFFFF' : '#FF007A';
        ctx.lineWidth = Math.max(2.5, 4.5 * s);

        ctx.beginPath();
        ctx.moveTo(pt.x, top + drawH * 1.15); // Pointe avant menaçante
        ctx.lineTo(left + drawW * 0.15, top + drawH * 0.7);
        ctx.lineTo(left - drawW * 0.15, top + drawH * 0.3); // Extrémité aile gauche géante
        ctx.lineTo(left + drawW * 0.2, top - drawH * 0.15);
        ctx.lineTo(pt.x - drawW * 0.1, top - drawH * 0.35);
        ctx.lineTo(pt.x, top - drawH * 0.2); // Crête centrale
        ctx.lineTo(pt.x + drawW * 0.1, top - drawH * 0.35);
        ctx.lineTo(left + drawW * 0.8, top - drawH * 0.15);
        ctx.lineTo(left + drawW * 1.15, top + drawH * 0.3); // Extrémité aile droite géante
        ctx.lineTo(left + drawW * 0.85, top + drawH * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 3. Vortex d'Énergie Central Pulsant (Le Cœur du Titan)
        const coreRadius = 24 * s;
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(-this.phase * 2);

        const coreGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, coreRadius);
        coreGrad.addColorStop(0, '#FFFFFF');
        coreGrad.addColorStop(0.4, '#00F0FF');
        coreGrad.addColorStop(0.8, '#FF007A');
        coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
        ctx.fill();

        // Anneaux d'énergie en rotation
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2 * s;
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + this.phase * 3;
          ctx.beginPath();
          ctx.arc(0, 0, coreRadius * 1.25, a, a + 0.6);
          ctx.stroke();
        }
        ctx.restore();

        // 4. Multi-Canons Lourds
        ctx.fillStyle = '#FFE600';
        [-40 * s, -15 * s, 15 * s, 40 * s].forEach(offX => {
          ctx.fillRect(pt.x + offX - 3 * s, top + drawH * 0.85, 6 * s, 14 * s);
        });

      // ========================================================
      // B. BOSS DE SECTEUR 1 : ALPHARION (Dreadnought Solaire & Crystalline Wings)
      // ========================================================
      } else if (this.type === 'boss_alpharion') {
        if (Renderer.enableGlow) {
          ctx.shadowColor = '#FFE600';
          ctx.shadowBlur = 30 * s;
        }

        ctx.fillStyle = isHit ? '#FFFFFF' : '#1A1202';
        ctx.strokeStyle = isHit ? '#FFFFFF' : '#FFE600';
        ctx.lineWidth = Math.max(2.5, 4 * s);

        // Châssis Flèche Solaire Alpharion
        ctx.beginPath();
        ctx.moveTo(pt.x, top + drawH * 1.08); // Pointe centrale effilée
        ctx.lineTo(left + drawW * 0.25, top + drawH * 0.65);
        ctx.lineTo(left - drawW * 0.05, top + drawH * 0.35); // Aile solaire gauche
        ctx.lineTo(left + drawW * 0.2, top);
        ctx.lineTo(pt.x - drawW * 0.1, top + drawH * 0.15);
        ctx.lineTo(pt.x, top); // Crête supérieure
        ctx.lineTo(pt.x + drawW * 0.1, top + drawH * 0.15);
        ctx.lineTo(left + drawW * 0.8, top);
        ctx.lineTo(left + drawW * 1.05, top + drawH * 0.35); // Aile solaire droite
        ctx.lineTo(left + drawW * 0.75, top + drawH * 0.65);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Gravures & Lignes de panneaux solaires
        ctx.strokeStyle = '#FFAA00';
        ctx.lineWidth = Math.max(1, 1.8 * s);
        ctx.beginPath();
        ctx.moveTo(left + drawW * 0.1, top + drawH * 0.25);
        ctx.lineTo(left + drawW * 0.3, top + drawH * 0.55);
        ctx.moveTo(left + drawW * 0.9, top + drawH * 0.25);
        ctx.lineTo(left + drawW * 0.7, top + drawH * 0.55);
        ctx.stroke();

        // Double Canons Railgun Solaires
        ctx.fillStyle = '#FFE600';
        ctx.fillRect(pt.x - 30 * s, top + drawH * 0.82, 6 * s, 18 * s);
        ctx.fillRect(pt.x + 24 * s, top + drawH * 0.82, 6 * s, 18 * s);

        // Cœur Solaire Fusionnel Alpharion
        const sunRadius = 18 * s;
        const sunGrad = ctx.createRadialGradient(pt.x, top + drawH * 0.45, 2, pt.x, top + drawH * 0.45, sunRadius);
        sunGrad.addColorStop(0, '#FFFFFF');
        sunGrad.addColorStop(0.3, '#FFE600');
        sunGrad.addColorStop(0.7, '#FF6600');
        sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(pt.x, top + drawH * 0.45, sunRadius, 0, Math.PI * 2);
        ctx.fill();

      // ========================================================
      // C. BOSS DE SECTEUR 2 : BETAPULSAR (Dreadnought Catamaran & Pulsar Strobe)
      // ========================================================
      } else if (this.type === 'boss_betapulsar') {
        if (Renderer.enableGlow) {
          ctx.shadowColor = '#00F0FF';
          ctx.shadowBlur = 32 * s;
        }

        ctx.fillStyle = isHit ? '#FFFFFF' : '#031726';
        ctx.strokeStyle = isHit ? '#FFFFFF' : '#00F0FF';
        ctx.lineWidth = Math.max(2.5, 4 * s);

        // Double Fuselage Catamaran Pulsar
        ctx.beginPath();
        ctx.moveTo(left + drawW * 0.18, top + drawH * 1.05); // Ponton gauche proue
        ctx.lineTo(left - drawW * 0.02, top + drawH * 0.4);
        ctx.lineTo(left + drawW * 0.22, top);
        ctx.lineTo(pt.x - drawW * 0.08, top + drawH * 0.25);
        ctx.lineTo(pt.x, top + drawH * 0.45); // Arche magnétique centrale
        ctx.lineTo(pt.x + drawW * 0.08, top + drawH * 0.25);
        ctx.lineTo(left + drawW * 0.78, top);
        ctx.lineTo(left + drawW * 1.02, top + drawH * 0.4);
        ctx.lineTo(left + drawW * 0.82, top + drawH * 1.05); // Ponton droit proue
        ctx.lineTo(left + drawW * 0.68, top + drawH * 0.7);
        ctx.lineTo(left + drawW * 0.32, top + drawH * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Anneaux de confinement magnétique rotatifs
        ctx.save();
        ctx.translate(pt.x, top + drawH * 0.48);
        ctx.rotate(this.phase * 3);
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = Math.max(1.5, 2.5 * s);
        ctx.beginPath();
        ctx.arc(0, 0, 22 * s, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Cœur Pulsar Stroboscopique
        const pulseR = 16 * s * (0.85 + Math.sin(this.phase * 6) * 0.25);
        const pulsarGrad = ctx.createRadialGradient(pt.x, top + drawH * 0.48, 1, pt.x, top + drawH * 0.48, pulseR);
        pulsarGrad.addColorStop(0, '#FFFFFF');
        pulsarGrad.addColorStop(0.4, '#00F0FF');
        pulsarGrad.addColorStop(0.8, '#0284C7');
        pulsarGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = pulsarGrad;
        ctx.beginPath();
        ctx.arc(pt.x, top + drawH * 0.48, pulseR, 0, Math.PI * 2);
        ctx.fill();

        // Émetteurs Cyclotron doubles
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(left + drawW * 0.18, top + drawH * 1.02, 5 * s, 0, Math.PI * 2);
        ctx.arc(left + drawW * 0.82, top + drawH * 1.02, 5 * s, 0, Math.PI * 2);
        ctx.fill();

      // ========================================================
      // D. BOSS DE SECTEUR 3 : GAMMARGANTUA (Forteresse Gravitationnelle Monolithique)
      // ========================================================
      } else if (this.type === 'boss_gammargantua') {
        if (Renderer.enableGlow) {
          ctx.shadowColor = '#FF007A';
          ctx.shadowBlur = 38 * s;
        }

        ctx.fillStyle = isHit ? '#FFFFFF' : '#0F021A';
        ctx.strokeStyle = isHit ? '#FFFFFF' : '#A855F7';
        ctx.lineWidth = Math.max(3, 4.5 * s);

        // Châssis Forteresse Monolithique Gammargantua
        ctx.beginPath();
        ctx.moveTo(pt.x, top + drawH * 1.12); // Pique gravitationnelle centrale
        ctx.lineTo(left + drawW * 0.2, top + drawH * 0.85);
        ctx.lineTo(left - drawW * 0.12, top + drawH * 0.5); // Éperon lourd gauche
        ctx.lineTo(left, top + drawH * 0.1);
        ctx.lineTo(pt.x - drawW * 0.2, top - drawH * 0.1);
        ctx.lineTo(pt.x, top);
        ctx.lineTo(pt.x + drawW * 0.2, top - drawH * 0.1);
        ctx.lineTo(left + drawW, top + drawH * 0.1);
        ctx.lineTo(left + drawW * 1.12, top + drawH * 0.5); // Éperon lourd droit
        ctx.lineTo(left + drawW * 0.8, top + drawH * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Disque d'accrétion gravitationnelle autour de la singularité
        const singX = pt.x;
        const singY = top + drawH * 0.5;
        const accR = 26 * s;

        ctx.save();
        ctx.translate(singX, singY);
        ctx.rotate(-this.phase * 2);
        const diskGrad = ctx.createRadialGradient(0, 0, 8 * s, 0, 0, accR);
        diskGrad.addColorStop(0, '#000000');
        diskGrad.addColorStop(0.4, '#FF007A');
        diskGrad.addColorStop(0.7, '#A855F7');
        diskGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = diskGrad;
        ctx.beginPath();
        ctx.arc(0, 0, accR, 0, Math.PI * 2);
        ctx.fill();

        // Cœur Singularité Noir Absolu
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(0, 0, 10 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Quadruple Canons de Siège Hyperbeam
        ctx.fillStyle = '#FF007A';
        [-45 * s, -18 * s, 18 * s, 45 * s].forEach(ox => {
          ctx.fillRect(pt.x + ox - 3 * s, top + drawH * 0.88, 6 * s, 16 * s);
        });

      // ========================================================
      // E. BOSS V3 : CUIRASSÉS TRIDENT (Battleship Nova & Battleship Dread)
      // ========================================================
      } else if (this.type === 'boss_v3') {
        const isDread = this.bossName.includes('DREAD');
        if (Renderer.enableGlow) {
          ctx.shadowColor = isDread ? '#FF0055' : '#7928CA';
          ctx.shadowBlur = 25 * s;
        }

        ctx.fillStyle = isHit ? '#FFFFFF' : (isDread ? '#220515' : '#180424');
        ctx.strokeStyle = isHit ? '#FFFFFF' : (isDread ? '#FF0055' : '#A855F7');
        ctx.lineWidth = Math.max(2, 3.5 * s);

        // Châssis Trident Cuirassé
        ctx.beginPath();
        ctx.moveTo(pt.x, top + drawH); // Bec central
        ctx.lineTo(left + drawW * 0.35, top + drawH * 0.75);
        ctx.lineTo(left, top + drawH * 0.85); // Poinçon latéral gauche
        ctx.lineTo(left + drawW * 0.15, top);
        ctx.lineTo(left + drawW * 0.85, top);
        ctx.lineTo(left + drawW, top + drawH * 0.85); // Poinçon latéral droit
        ctx.lineTo(left + drawW * 0.65, top + drawH * 0.75);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Noyau plasma pourpre
        ctx.fillStyle = isDread ? '#FF0055' : '#A855F7';
        ctx.beginPath();
        ctx.ellipse(pt.x, top + drawH * 0.4, 16 * s, 8 * s, 0, 0, Math.PI * 2);
        ctx.fill();

      // ========================================================
      // F. BOSS V2 : DESTROYERS JUMEAUX (Destroyer Alpha & Destroyer Omega)
      // ========================================================
      } else if (this.type === 'boss_v2') {
        const isOmega = this.bossName.includes('OMEGA');
        if (Renderer.enableGlow) {
          ctx.shadowColor = isOmega ? '#00F0FF' : '#00AAFF';
          ctx.shadowBlur = 22 * s;
        }

        ctx.fillStyle = isHit ? '#FFFFFF' : (isOmega ? '#081c2e' : '#061322');
        ctx.strokeStyle = isHit ? '#FFFFFF' : (isOmega ? '#00F0FF' : '#0088FF');
        ctx.lineWidth = Math.max(2, 3.2 * s);

        // Châssis Catamaran / Double Fuselage Destroyer
        ctx.beginPath();
        ctx.moveTo(left + drawW * 0.2, top + drawH); // Proue ponton gauche
        ctx.lineTo(left, top + drawH * 0.3);
        ctx.lineTo(left + drawW * 0.25, top);
        ctx.lineTo(pt.x, top + drawH * 0.3); // Pont de liaison central
        ctx.lineTo(left + drawW * 0.75, top);
        ctx.lineTo(left + drawW, top + drawH * 0.3);
        ctx.lineTo(left + drawW * 0.8, top + drawH); // Proue ponton droit
        ctx.lineTo(left + drawW * 0.65, top + drawH * 0.6);
        ctx.lineTo(left + drawW * 0.35, top + drawH * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Réacteurs jumeaux
        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(left + drawW * 0.15, top + 2 * s, 10 * s, 8 * s);
        ctx.fillRect(left + drawW * 0.75, top + 2 * s, 10 * s, 8 * s);

      // ========================================================
      // G. BOSS V1 : CHASSEUR LOURD VANGUARD-01
      // ========================================================
      } else {
        if (Renderer.enableGlow) {
          ctx.shadowColor = '#FFAA00';
          ctx.shadowBlur = 20 * s;
        }

        ctx.fillStyle = isHit ? '#FFFFFF' : '#221100';
        ctx.strokeStyle = isHit ? '#FFFFFF' : '#FF9900';
        ctx.lineWidth = Math.max(2, 3 * s);

        // Flèche d'assaut
        ctx.beginPath();
        ctx.moveTo(pt.x, top + drawH);
        ctx.lineTo(left, top + drawH * 0.4);
        ctx.lineTo(left + drawW * 0.3, top);
        ctx.lineTo(left + drawW * 0.7, top);
        ctx.lineTo(left + drawW, top + drawH * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cockpit orange vif
        ctx.fillStyle = '#FFAA00';
        ctx.beginPath();
        ctx.arc(pt.x, top + drawH * 0.45, 10 * s, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // =========================================================================
      // 🛡️ BOUCLIER MAGNÉTIQUE & ARCS ÉLECTRIQUES (Boss Invulnérable)
      // =========================================================================
      if (this.isInvulnerable) {
        // 1. Arcs électriques reliant les générateurs au boss
        for (const g of this.connectedGenerators) {
          if (g.isDead) continue;
          const gPt = renderer.project(g.x, g.y);
          if (!gPt.isVisible) continue;

          ctx.save();
          ctx.strokeStyle = '#00F0FF';
          ctx.lineWidth = Math.max(2, 3.2 * s);
          if (Renderer.enableGlow) {
            ctx.shadowColor = '#00F0FF';
            ctx.shadowBlur = 16 * s;
          }
          ctx.beginPath();
          ctx.moveTo(gPt.x, gPt.y);
          const segments = 5;
          for (let seg = 1; seg < segments; seg++) {
            const t = seg / segments;
            const midX = gPt.x + (pt.x - gPt.x) * t + (Math.sin(this.phase * 8 + seg) * 16 * s);
            const midY = gPt.y + (pt.y - gPt.y) * t + (Math.cos(this.phase * 8 + seg) * 12 * s);
            ctx.lineTo(midX, midY);
          }
          ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
          ctx.restore();
        }

        // 2. Dôme de Force Hexagonal Pulsant
        const shieldR = Math.max(drawW, drawH) * 0.72;
        ctx.save();
        ctx.translate(pt.x, pt.y);

        const shAlpha = isHit ? 0.75 : 0.28 + Math.sin(this.phase * 5) * 0.12;
        const shGrad = ctx.createRadialGradient(0, 0, shieldR * 0.65, 0, 0, shieldR);
        shGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
        shGrad.addColorStop(0.7, `rgba(0, 240, 255, ${shAlpha * 0.5})`);
        shGrad.addColorStop(1, `rgba(56, 189, 248, ${shAlpha})`);
        ctx.fillStyle = shGrad;
        ctx.beginPath();
        ctx.arc(0, 0, shieldR, 0, Math.PI * 2);
        ctx.fill();

        // Contours hexagonaux
        ctx.strokeStyle = isHit ? '#FFFFFF' : '#00F0FF';
        ctx.lineWidth = Math.max(2, 3.5 * s);
        if (Renderer.enableGlow) {
          ctx.shadowColor = '#00F0FF';
          ctx.shadowBlur = isHit ? 25 * s : 14 * s;
        }
        ctx.beginPath();
        for (let h = 0; h < 6; h++) {
          const ha = (h * Math.PI) / 3 + this.phase * 0.35;
          const hx = Math.cos(ha) * shieldR;
          const hy = Math.sin(ha) * shieldR;
          if (h === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();

        // Alerte holographique sous le bouclier
        ctx.font = `900 ${Math.max(8, Math.floor(10 * s))}px 'Orbitron', sans-serif`;
        ctx.fillStyle = '#00F0FF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('🛡️ CHAMP DE FORCE (DÉTRUISEZ LES GÉNÉRATEURS)', 0, shieldR + 6 * s);

        ctx.restore();
      }

      // --- BARRE DE VIE FLOTTANTE AU-DESSUS DE LA TÊTE DU BOSS ---
      const barW = Math.max(75, drawW * 1.15);
      const barH = Math.max(9, 13 * s);
      const barX = pt.x - barW / 2;
      const barY = top - barH - 18 * s;

      // Fond de jauge
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 4 * s);
      ctx.fill();
      ctx.stroke();

      // Remplissage des PV
      const hpRatio = Math.max(0, Math.min(1, this.hp / this.maxHp));
      const fillW = Math.max(0, (barW - 2) * hpRatio);
      
      const hpGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
      if (this.type === 'boss_final') {
        hpGrad.addColorStop(0, '#FF007A');
        hpGrad.addColorStop(0.5, '#FFE600');
        hpGrad.addColorStop(1, '#00F0FF');
      } else if (this.type === 'boss_alpharion') {
        hpGrad.addColorStop(0, '#FFAA00');
        hpGrad.addColorStop(0.5, '#FFE600');
        hpGrad.addColorStop(1, '#FFFFFF');
      } else if (this.type === 'boss_betapulsar') {
        hpGrad.addColorStop(0, '#0066FF');
        hpGrad.addColorStop(0.5, '#00F0FF');
        hpGrad.addColorStop(1, '#E0F2FE');
      } else if (this.type === 'boss_gammargantua') {
        hpGrad.addColorStop(0, '#FF007A');
        hpGrad.addColorStop(0.5, '#A855F7');
        hpGrad.addColorStop(1, '#3B82F6');
      } else if (this.type === 'boss_v3') {
        hpGrad.addColorStop(0, '#FF0055');
        hpGrad.addColorStop(1, '#A855F7');
      } else if (this.type === 'boss_v2') {
        hpGrad.addColorStop(0, '#0088FF');
        hpGrad.addColorStop(1, '#00F0FF');
      } else {
        hpGrad.addColorStop(0, '#FF5500');
        hpGrad.addColorStop(1, '#FFAA00');
      }

      ctx.fillStyle = hpGrad;
      ctx.beginPath();
      ctx.roundRect(barX + 1, barY + 1, fillW, barH - 2, 3 * s);
      ctx.fill();

      // Texte Titre & Valeur PV avec contour net
      ctx.font = `900 ${Math.max(8, Math.floor(10 * s))}px 'Orbitron', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(1.5, 2 * s);
      ctx.strokeText(`👑 ${this.bossName || 'BOSS'}`, pt.x, barY - 2 * s);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`👑 ${this.bossName || 'BOSS'}`, pt.x, barY - 2 * s);

      ctx.font = `700 ${Math.max(7, Math.floor(9 * s))}px 'Chakra Petch', sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(1, 1.5 * s);
      ctx.strokeText(`${Math.ceil(this.hp)} / ${this.maxHp} HP`, pt.x, barY + barH / 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`${Math.ceil(this.hp)} / ${this.maxHp} HP`, pt.x, barY + barH / 2);

      ctx.restore();
      ctx.restore();
    }
  }
}
