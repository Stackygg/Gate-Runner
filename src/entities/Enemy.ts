// Entités Ennemis : Astéroïdes Traqueurs, Trous Noirs, Prisons Spatiales, Murs Gauntlet & Boss Spécialisés

import { Projectile } from './Projectile';
import { Renderer } from '../engine/Renderer';
import { SHIP_RANKS } from './RescuedShip';
import { GAME_CONFIG } from '../config';

export type EnemyType = 'block' | 'drone' | 'fast' | 'heavy' | 'black_hole' | 'prison' | 'boss_v1' | 'boss_v2' | 'boss_v3' | 'boss_final' | 'gauntlet_wall';

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

  private rotAngle: number = 0;
  private rotSpeed: number = 0;
  private shapePoints: { x: number; y: number }[] = [];
  private phase: number = Math.random() * Math.PI * 2;
  private hitBlinkTimer: number = 0;
  private shootTimer: number = 0;
  private shootInterval: number = 2.0; // Salve de tirs toutes les 2.0s
  public combatTimer: number = 0;      // Temps écoulé en combat actif
  private salvoPattern: number = 0;
  public vx: number = 0;
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
    return this.type === 'boss_v1' || this.type === 'boss_v2' || this.type === 'boss_v3' || this.type === 'boss_final';
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
          const strafeAmplitude = (this.type === 'boss_final') ? 60 : 80;
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

    // Tirs de Boss : Salves rythmées avec patterns uniques (actif UNIQUEMENT une fois arrivé en position de combat targetCombatY)
    // Cela garantit que le joueur a tout le temps de tirer sur le boss pendant son approche depuis l'horizon avant qu'il n'attaque
    if (this.isBossType() && this.y >= targetCombatY - 5 && this.y < 680) {
      this.combatTimer += dt;

      // Calcul de la cadence de tir :
      // Pour le Boss Final, la cadence s'accélère progressivement au bout de 10 secondes de combat
      let effectiveInterval = this.shootInterval;
      if (this.type === 'boss_final') {
        if (this.combatTimer > 10.0) {
          const overTime = this.combatTimer - 10.0;
          // Accélération continue après 10s : passe de 2.0s à 1.25s à 20s, 0.88s à 25s, et plafonne à 0.50s à 30s+
          effectiveInterval = Math.max(0.50, this.shootInterval - overTime * 0.075);
        }
      }

      this.shootTimer += dt;
      if (this.shootTimer >= effectiveInterval) {
        this.shootTimer = 0;
        // Déclenche la stabilisation d'ancrage et la micro-vibration de recul mécanique
        this.recoilTimer = Math.min(0.35, effectiveInterval * 0.35);
        this.recoilShakeAmount = (this.type === 'boss_final') ? 6.0 : 5.0;

        if (this.type === 'boss_final') {
          // PATTERNS EXCLUSIFS DU BOSS FINAL (TITAN OVERLORD) : +1 munition et spread colossal
          this.salvoPattern = (this.salvoPattern + 1) % 3;
          const bulletSpeed = 360;

          if (this.salvoPattern === 0) {
            // Pattern 0 : 7 tirs en étoile radiale (au lieu de 6) couvrant tout l'arc 180°
            const angles = [-90, -60, -30, 0, 30, 60, 90];
            for (const ang of angles) {
              const rad = (ang * Math.PI) / 180;
              spawnedProjectiles.push(
                new Projectile(this.x, this.y + 40, Math.sin(rad) * 220, Math.cos(rad) * bulletSpeed, 1, 'enemy_bullet', '#FF007A')
              );
            }
          } else if (this.salvoPattern === 1) {
            // Pattern 1 : 5 tirs (3 tirs lourds centraux + 2 tirs satellites ultra-larges)
            spawnedProjectiles.push(
              new Projectile(this.x - 35, this.y + 45, -20, bulletSpeed * 1.1, 1, 'enemy_bullet', '#FFE600'),
              new Projectile(this.x, this.y + 50, 0, bulletSpeed * 1.15, 1, 'enemy_bullet', '#FFE600'),
              new Projectile(this.x + 35, this.y + 45, 20, bulletSpeed * 1.1, 1, 'enemy_bullet', '#FFE600'),
              new Projectile(this.x - 120, this.y + 20, -130, bulletSpeed, 1, 'enemy_bullet', '#00F0FF'),
              new Projectile(this.x + 120, this.y + 20, 130, bulletSpeed, 1, 'enemy_bullet', '#00F0FF')
            );
          } else {
            // Pattern 2 : Salve balayante en V à 5 munitions ultra-large
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
        } else {
          // Bosses V1, V2, V3 : Salves de 5 tirs (au lieu de 4) avec spread très large balayant tout l'écran
          this.salvoPattern = (this.salvoPattern + 1) % 2;
          const bulletColor = (this.type === 'boss_v3') ? '#FF007A' : (this.type === 'boss_v2' ? '#00F0FF' : '#FFAA00');
          const bulletSpeed = (this.type === 'boss_v3') ? 370 : ((this.type === 'boss_v2') ? 350 : 330);

          if (this.salvoPattern === 0) {
            // Salve A : 5 tirs en large éventail balayant l'ensemble de l'écran (gauche à droite)
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
            // Salve B : 5 tirs en rideau balayant déployé en V (impossibilité de camper sur les flancs)
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
      // B. BOSS V3 : CUIRASSÉS TRIDENT (Battleship Nova & Battleship Dread)
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
      // C. BOSS V2 : DESTROYERS JUMEAUX (Destroyer Alpha & Destroyer Omega)
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
      // D. BOSS V1 : CHASSEUR LOURD VANGUARD-01
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
