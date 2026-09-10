// Moteur de Rendu Graphique 3D Haute Performance avec Projection Perspective Exacte & Plein Écran

import { GAME_CONFIG } from '../config';

export interface Star3D {
  x: number;
  y: number;
  z: number;
  speed: number;
  color: string;
  size: number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
  scale: number;
  z: number; // Distance devant le joueur
  isVisible: boolean;
}

export class Renderer {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  private stars: Star3D[] = [];
  private gridOffset: number = 0;
  private screenShakeAmount: number = 0;
  public scale: number = 1;
  public offsetX: number = 0;
  public offsetY: number = 0;

  // Détection Mobile & Optimisation Performance (60 FPS garanti)
  public static isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const hasTouch = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);
    const isSmallScreen = window.innerWidth <= 768;
    return isMobileUA || (hasTouch && isSmallScreen);
  }

  // Contrôle global des effets de lueur / néon (gourmands sur GPU/CPU mobile)
  public static performanceMode: boolean = Renderer.isMobile();
  public static enableGlow: boolean = !Renderer.isMobile();

  public static setPerformanceMode(enabled: boolean) {
    Renderer.performanceMode = enabled;
    Renderer.enableGlow = !enabled;
  }

  // Paramètres de la Caméra 3D & Horizon
  public readonly HORIZON_Y = 140;                         // Ligne d'horizon relevée
  public readonly VANISHING_X = GAME_CONFIG.WORLD_WIDTH / 2; // 270px (Point de fuite central)
  public readonly PLAYER_SCREEN_Y = 660;                   // Position Y du joueur relevée (au-dessus du doigt)
  public readonly FOV_DEPTH = 650;                         // Longueur focale de la caméra

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Impossible de créer le contexte 2D');
    this.ctx = context;

    this.initStars();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  public initStars() {
    // Étoiles uniquement blanches, légèrement jaunes ou légèrement bleues
    const starColors = [
      '#FFFFFF', // Blanc pur
      '#FFFFFF', // Blanc pur
      '#FFFFFF', // Blanc pur
      '#FFF8DB', // Blanc chaud / légèrement jaune
      '#FFF2C6', // Doux jaune stellaire
      '#DCEEFF', // Légèrement bleu pastel
      '#E8F4FF'  // Doux bleu ciel
    ];
    // Nombre d'étoiles adapté pour un ciel cosmique pur et élégant
    const starCount = Renderer.performanceMode ? 80 : 125;
    this.stars = [];
    for (let i = 0; i < starCount; i++) {
      // Répartition spatiale homogène à 360° pour éliminer tout effet de tunnel ou de lignes d'hyperespace
      const startX = (Math.random() - 0.5) * 3800;
      const startY = (Math.random() - 0.5) * 2800;

      this.stars.push({
        x: startX,
        y: startY,
        z: 40 + Math.random() * 2500,
        speed: 35 + Math.random() * 65, // Vitesse de croisière subtile et réaliste pour étoiles lointaines
        color: starColors[Math.floor(Math.random() * starColors.length)],
        size: 1.0 + Math.random() * 1.4
      });
    }
  }

  public handleResize() {
    // En mode performance (mobile par défaut), plafonner le DPR à 1 pour économiser jusqu'à 75% de calculs de pixels
    const maxDpr = Renderer.performanceMode ? 1 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;

    this.canvas.width = Math.round(windowW * dpr);
    this.canvas.height = Math.round(windowH * dpr);

    const scaleX = (windowW * dpr) / GAME_CONFIG.WORLD_WIDTH;
    const scaleY = (windowH * dpr) / GAME_CONFIG.WORLD_HEIGHT;
    this.scale = Math.min(scaleX, scaleY);

    this.offsetX = (this.canvas.width - GAME_CONFIG.WORLD_WIDTH * this.scale) / 2;
    this.offsetY = (this.canvas.height - GAME_CONFIG.WORLD_HEIGHT * this.scale) / 2;

    this.cachedCosmicGradient = null;
  }

  public addScreenShake(_amount: number) {
    // Désactivé pour garantir une stabilité 100% fluide et éliminer tout glitch
    this.screenShakeAmount = 0;
  }

  // Projection mathématique 3D exacte du monde vers l'écran avec Distance Culling (Z-Clip)
  public project(worldX: number, worldY: number): ProjectedPoint {
    const z = GAME_CONFIG.PLAYER_BASE_Y - worldY;

    // Masquage strict des objets trop lointains (z > 2000) pour éliminer le tas d'objets au fond et booster les FPS
    if (z > 2000 || z < -300) {
      return { x: worldX, y: 1200, scale: 0, z, isVisible: false };
    }

    const perspectiveScale = this.FOV_DEPTH / (this.FOV_DEPTH + Math.max(0, z));
    const screenX = this.VANISHING_X + (worldX - this.VANISHING_X) * perspectiveScale;

    let screenY: number;
    if (z >= 0) {
      screenY = this.HORIZON_Y + (this.PLAYER_SCREEN_Y - this.HORIZON_Y) * perspectiveScale;
    } else {
      screenY = this.PLAYER_SCREEN_Y + Math.abs(z) * 1.4;
    }

    return {
      x: screenX,
      y: screenY,
      scale: perspectiveScale,
      z,
      isVisible: z <= 1900 && screenY >= this.HORIZON_Y + 12 && screenY <= GAME_CONFIG.WORLD_HEIGHT + 200
    };
  }

  public currentPhase: number = 1;
  private cachedPhase: number = -1;
  private cachedCosmicGradient: CanvasGradient | null = null;
  private cachedGalaxyCore: CanvasGradient | null = null;
  private cachedNebulaLeft: CanvasGradient | null = null;
  private cachedNebulaRight: CanvasGradient | null = null;
  private cachedViewTop: number = 0;
  private cachedViewBottom: number = 0;

  public clear(dt: number, scrollSpeed: number) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 1. Fond cosmique absolu plein écran
    ctx.fillStyle = '#040610';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Calcul des bornes visibles virtuelles pour couvrir 100% de l'écran quelle que soit la résolution
    const viewLeft = -this.offsetX / this.scale - 200;
    const viewRight = (this.canvas.width - this.offsetX) / this.scale + 200;
    const viewTop = -this.offsetY / this.scale - 100;
    const viewBottom = (this.canvas.height - this.offsetY) / this.scale + 100;
    const viewWidth = viewRight - viewLeft;

    ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);

    // Secousse d'écran
    if (this.screenShakeAmount > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShakeAmount;
      const shakeY = (Math.random() - 0.5) * this.screenShakeAmount;
      ctx.translate(shakeX, shakeY);
      this.screenShakeAmount = Math.max(0, this.screenShakeAmount - dt * 25);
    }

    // 2. Fond Galaxie & Nébuleuses Plein Écran (Caché pour éviter 240 allocations par seconde)
    if (!this.cachedCosmicGradient || this.cachedPhase !== this.currentPhase || this.cachedViewTop !== viewTop || this.cachedViewBottom !== viewBottom) {
      this.cachedViewTop = viewTop;
      this.cachedViewBottom = viewBottom;
      this.cachedPhase = this.currentPhase;

      const cosmicGradient = ctx.createLinearGradient(0, viewTop, 0, viewBottom);
      if (this.currentPhase === 4) {
        cosmicGradient.addColorStop(0, '#090108');
        cosmicGradient.addColorStop(0.25, '#220414');
        cosmicGradient.addColorStop(0.55, '#35061b');
        cosmicGradient.addColorStop(0.85, '#19030e');
        cosmicGradient.addColorStop(1, '#050106');
      } else if (this.currentPhase === 3) {
        cosmicGradient.addColorStop(0, '#05020c');
        cosmicGradient.addColorStop(0.25, '#160528');
        cosmicGradient.addColorStop(0.55, '#290b40');
        cosmicGradient.addColorStop(0.85, '#140420');
        cosmicGradient.addColorStop(1, '#04010a');
      } else if (this.currentPhase === 2) {
        cosmicGradient.addColorStop(0, '#01080b');
        cosmicGradient.addColorStop(0.25, '#051b1e');
        cosmicGradient.addColorStop(0.55, '#0a2e33');
        cosmicGradient.addColorStop(0.85, '#04161a');
        cosmicGradient.addColorStop(1, '#010608');
      } else {
        cosmicGradient.addColorStop(0, '#030612');
        cosmicGradient.addColorStop(0.25, '#0b1130');
        cosmicGradient.addColorStop(0.55, '#171a48');
        cosmicGradient.addColorStop(0.85, '#0a0d28');
        cosmicGradient.addColorStop(1, '#02040c');
      }
      this.cachedCosmicGradient = cosmicGradient;

      const galaxyCore = ctx.createRadialGradient(
        this.VANISHING_X, this.HORIZON_Y, 5,
        this.VANISHING_X, this.HORIZON_Y, 140
      );
      if (this.currentPhase === 4) {
        galaxyCore.addColorStop(0, 'rgba(255, 200, 100, 0.22)');
        galaxyCore.addColorStop(0.25, 'rgba(255, 60, 0, 0.12)');
        galaxyCore.addColorStop(0.60, 'rgba(121, 40, 202, 0.04)');
        galaxyCore.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (this.currentPhase === 3) {
        galaxyCore.addColorStop(0, 'rgba(255, 180, 255, 0.20)');
        galaxyCore.addColorStop(0.25, 'rgba(168, 85, 247, 0.12)');
        galaxyCore.addColorStop(0.60, 'rgba(121, 40, 202, 0.04)');
        galaxyCore.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (this.currentPhase === 2) {
        galaxyCore.addColorStop(0, 'rgba(0, 255, 204, 0.20)');
        galaxyCore.addColorStop(0.25, 'rgba(0, 180, 220, 0.10)');
        galaxyCore.addColorStop(0.60, 'rgba(0, 50, 100, 0.03)');
        galaxyCore.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        galaxyCore.addColorStop(0, 'rgba(180, 230, 255, 0.20)');
        galaxyCore.addColorStop(0.25, 'rgba(0, 150, 255, 0.10)');
        galaxyCore.addColorStop(0.60, 'rgba(0, 40, 120, 0.03)');
        galaxyCore.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      this.cachedGalaxyCore = galaxyCore;
    }

    if (!this.cachedNebulaLeft) {
      const nebulaLeft = ctx.createRadialGradient(
        this.VANISHING_X - 180, this.HORIZON_Y + 120, 20,
        this.VANISHING_X - 180, this.HORIZON_Y + 120, 220
      );
      nebulaLeft.addColorStop(0, 'rgba(121, 40, 202, 0.08)');
      nebulaLeft.addColorStop(0.6, 'rgba(0, 240, 255, 0.02)');
      nebulaLeft.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.cachedNebulaLeft = nebulaLeft;
    }

    if (!this.cachedNebulaRight) {
      const nebulaRight = ctx.createRadialGradient(
        this.VANISHING_X + 190, this.HORIZON_Y + 80, 20,
        this.VANISHING_X + 190, this.HORIZON_Y + 80, 220
      );
      nebulaRight.addColorStop(0, 'rgba(255, 0, 122, 0.07)');
      nebulaRight.addColorStop(0.6, 'rgba(121, 40, 202, 0.02)');
      nebulaRight.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.cachedNebulaRight = nebulaRight;
    }

    ctx.fillStyle = this.cachedCosmicGradient!;
    ctx.fillRect(viewLeft, viewTop, viewWidth, viewBottom - viewTop);

    // 2.1 Cœur de la Galaxie (Lueur subtile et élégante au point de fuite, sans halo laiteux)
    ctx.fillStyle = this.cachedGalaxyCore!;
    ctx.beginPath();
    ctx.arc(this.VANISHING_X, this.HORIZON_Y, 140, 0, Math.PI * 2);
    ctx.fill();

    // 2.2 Nuages de Nébuleuses Latéraux (Teintes cosmiques douces)
    ctx.fillStyle = this.cachedNebulaLeft!;
    ctx.beginPath();
    ctx.arc(this.VANISHING_X - 180, this.HORIZON_Y + 120, 220, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.cachedNebulaRight!;
    ctx.beginPath();
    ctx.arc(this.VANISHING_X + 190, this.HORIZON_Y + 80, 220, 0, Math.PI * 2);
    ctx.fill();

    // 3. Étoiles 3D ponctuelles nettes à vitesse de défilement naturelle et apaisante
    for (const star of this.stars) {
      const starSpeed = star.speed + scrollSpeed * 0.35;
      star.z -= starSpeed * dt;
      if (star.z <= 20) {
        star.z = 2500;
        star.x = (Math.random() - 0.5) * 3800;
        star.y = (Math.random() - 0.5) * 2800;
      }

      const pScale = this.FOV_DEPTH / (this.FOV_DEPTH + star.z);
      const sx = this.VANISHING_X + star.x * pScale;
      const sy = this.HORIZON_Y + star.y * pScale;

      if (sx >= viewLeft && sx <= viewRight && sy >= viewTop && sy <= viewBottom) {
        const pSize = Math.max(1, Math.round(star.size * pScale));
        const alpha = Math.min(1, (1 - star.z / 2500) * 1.2);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = star.color;
        ctx.fillRect(sx - pSize * 0.5, sy - pSize * 0.5, pSize, pSize);
      }
    }
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  }

  // Champ de Force Quantique - 1. Grille d'énergie électrostatique au sol (Arrière-plan sous les astéroïdes)
  public renderForceFieldGrid(timer: number, _maxTimer: number = 10.0) {
    if (timer <= 0) return;
    const ctx = this.ctx;
    const pulse = Math.sin(performance.now() * 0.01) * 0.5 + 0.5;

    // Coordonnées du champ de force au milieu
    const pLeft = this.project(160, 200);
    const pRight = this.project(380, 200);
    const pTopLeft = this.project(160, 150);
    const pTopRight = this.project(380, 150);

    ctx.save();
    // Grille d'énergie électrostatique au sol : fond subtil et net sans voile brumeux
    ctx.fillStyle = `rgba(0, 240, 255, ${0.04 + pulse * 0.03})`;
    ctx.beginPath();
    ctx.moveTo(pLeft.x, pLeft.y);
    ctx.lineTo(pRight.x, pRight.y);
    ctx.lineTo(pTopRight.x, pTopRight.y);
    ctx.lineTo(pTopLeft.x, pTopLeft.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = `rgba(0, 240, 255, ${0.35 + pulse * 0.25})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // Champ de Force Quantique - 2. Barrière néon & Badge Holographique (Au premier plan AU-DESSUS des ennemis)
  public renderForceFieldBarrier(timer: number, _maxTimer: number = 10.0) {
    if (timer <= 0) return;
    const ctx = this.ctx;
    const pulse = Math.sin(performance.now() * 0.01) * 0.5 + 0.5;

    const pLeft = this.project(160, 200);
    const pRight = this.project(380, 200);
    const pTopLeft = this.project(160, 150);

    ctx.save();

    // 1. Rayon laser / Poutre néon de rétention (Rendu net sans shadowBlur lourd)
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 3 * pLeft.scale;
    ctx.beginPath();
    ctx.moveTo(pLeft.x, pLeft.y);
    ctx.lineTo(pRight.x, pRight.y);
    ctx.stroke();

    // 2. Arcs électriques animés
    ctx.strokeStyle = '#FFE600';
    ctx.lineWidth = 1.8 * pLeft.scale;
    ctx.beginPath();
    ctx.moveTo(pLeft.x, pLeft.y);
    const segments = 6;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const arcX = pLeft.x + (pRight.x - pLeft.x) * t;
      const arcY = pLeft.y + (Math.random() - 0.5) * 10 * pLeft.scale;
      ctx.lineTo(arcX, arcY);
    }
    ctx.stroke();

    // 3. Badge Holographique avec Timer - Net et contrasté
    const midX = (pLeft.x + pRight.x) / 2;
    const midY = (pLeft.y + pTopLeft.y) / 2;

    const scale = pLeft.scale;
    const boxW = Math.max(165, 175 * scale);
    const boxH = Math.max(26, 28 * scale);

    ctx.fillStyle = 'rgba(6, 12, 28, 0.95)';
    ctx.strokeStyle = '#FFE600';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = `900 ${Math.max(11, Math.round(12 * scale))}px 'Orbitron', monospace`;
    ctx.fillStyle = '#FFE600';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🛡️ BOUCLIER : ${timer.toFixed(1)}s`, midX, midY);

    ctx.restore();
  }

  // Rendu complet du champ de force
  public renderForceField(timer: number, maxTimer: number = 10.0) {
    this.renderForceFieldGrid(timer, maxTimer);
    this.renderForceFieldBarrier(timer, maxTimer);
  }

  // Vaisseau Mère Orbital / Planète Alliée en mode Escorte & Défense
  public renderMothership(mothershipHp: number, maxHp: number, hitFlash: number, _dt: number = 0.016) {
    const ctx = this.ctx;
    const centerX = GAME_CONFIG.WORLD_WIDTH / 2; // 270
    const mothershipY = GAME_CONFIG.MOTHERSHIP_BASE_Y || 830; // 830
    const hpRatio = Math.max(0, Math.min(1, mothershipHp / maxHp));
    const isFlashing = hitFlash > 0;
    const now = performance.now() * 0.003;
    const pulse = Math.sin(now * 2) * 0.5 + 0.5;

    ctx.save();

    // 1. Halo atmosphérique de la planète mère en arrière-plan à la base de l'écran
    const planetGrad = ctx.createRadialGradient(centerX, 1150, 80, centerX, 1150, 420);
    planetGrad.addColorStop(0, 'rgba(0, 110, 255, 0.45)');
    planetGrad.addColorStop(0.4, 'rgba(0, 240, 255, 0.20)');
    planetGrad.addColorStop(0.75, 'rgba(121, 40, 202, 0.12)');
    planetGrad.addColorStop(1, 'rgba(4, 6, 16, 0)');
    ctx.fillStyle = planetGrad;
    ctx.beginPath();
    ctx.arc(centerX, 1150, 420, Math.PI, Math.PI * 2);
    ctx.fill();

    // Ligne d'horizon atmosphérique bleutée
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, 1150, 380, Math.PI + 0.3, Math.PI * 2 - 0.3);
    ctx.stroke();

    // 2. Réacteurs Ioniques de propulsion du Vaisseau Mère (4 propulseurs titanesques vers le bas)
    const thrusterOffsets = [-120, -45, 45, 120];
    for (const offX of thrusterOffsets) {
      const tx = centerX + offX;
      const ty = mothershipY + 35;
      const plumeH = 35 + Math.random() * 18 + pulse * 10;
      
      const plumeGrad = ctx.createLinearGradient(tx, ty, tx, ty + plumeH);
      plumeGrad.addColorStop(0, '#FFFFFF');
      plumeGrad.addColorStop(0.2, '#00F0FF');
      plumeGrad.addColorStop(0.7, 'rgba(0, 112, 255, 0.7)');
      plumeGrad.addColorStop(1, 'rgba(0, 50, 200, 0)');
      
      ctx.fillStyle = plumeGrad;
      ctx.beginPath();
      ctx.moveTo(tx - 10, ty);
      ctx.lineTo(tx, ty + plumeH);
      ctx.lineTo(tx + 10, ty);
      ctx.closePath();
      ctx.fill();
    }

    // 3. Bouclier Énergétique Holographique (Dôme protecteur au-dessus du vaisseau mère)
    const shieldColor = isFlashing
      ? '#FF5500'
      : (hpRatio > 0.5 ? '#00F0FF' : (hpRatio > 0.25 ? '#FFAA00' : '#FF0055'));
    const shieldAlpha = isFlashing ? 0.45 : (0.12 + pulse * 0.08);

    ctx.fillStyle = isFlashing
      ? 'rgba(255, 85, 0, 0.35)'
      : (hpRatio > 0.5 ? `rgba(0, 240, 255, ${shieldAlpha})` : `rgba(255, 120, 0, ${shieldAlpha})`);
    
    // Dôme supérieur du bouclier
    ctx.beginPath();
    ctx.ellipse(centerX, mothershipY - 25, 230, 95, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Bordure néon du bouclier (Rendu net sans shadowBlur lourd pour fluidité 60 FPS permanente)
    ctx.strokeStyle = shieldColor;
    ctx.lineWidth = isFlashing ? 3.5 : 2;
    ctx.beginPath();
    ctx.ellipse(centerX, mothershipY - 25, 230, 95, 0, Math.PI, Math.PI * 2);
    ctx.stroke();

    // Arcs électriques sur le bouclier en cas d'impact
    if (isFlashing) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const ang = Math.PI + 0.4 + (i * 0.6);
        const sx = centerX + Math.cos(ang) * 230;
        const sy = (mothershipY - 25) + Math.sin(ang) * 95;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 15 + i * 8, sy - 12);
      }
      ctx.stroke();
    }

    // 4. Carlingue & Blindage du Vaisseau Mère (Design Star Dreadnought majestueux)
    ctx.save();
    ctx.translate(centerX, mothershipY);

    // Corps principal (ailes swept-back imposantes)
    const hullGrad = ctx.createLinearGradient(0, -45, 0, 45);
    hullGrad.addColorStop(0, '#1c2844');
    hullGrad.addColorStop(0.3, '#0b1329');
    hullGrad.addColorStop(0.7, '#070c1b');
    hullGrad.addColorStop(1, '#02050f');

    ctx.fillStyle = hullGrad;
    ctx.strokeStyle = isFlashing ? '#FF5500' : '#00F0FF';
    ctx.lineWidth = 2;

    ctx.beginPath();
    // Nez / Proue centrale
    ctx.moveTo(0, -45);
    // Flanc supérieur droit
    ctx.lineTo(60, -32);
    ctx.lineTo(140, -18);
    // Extrémité aile droite
    ctx.lineTo(210, 10);
    ctx.lineTo(205, 32);
    // Tuyères et décrochés arrières droits
    ctx.lineTo(135, 35);
    ctx.lineTo(110, 24);
    ctx.lineTo(55, 36);
    ctx.lineTo(15, 30);
    // Quille centrale arrière
    ctx.lineTo(0, 38);
    // Tuyères et décrochés arrières gauches (symétrie)
    ctx.lineTo(-15, 30);
    ctx.lineTo(-55, 36);
    ctx.lineTo(-110, 24);
    ctx.lineTo(-135, 35);
    // Extrémité aile gauche
    ctx.lineTo(-205, 32);
    ctx.lineTo(-210, 10);
    // Flanc supérieur gauche
    ctx.lineTo(-140, -18);
    ctx.lineTo(-60, -32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Plaques de blindage et lignes de néon lumineuses
    ctx.strokeStyle = isFlashing ? '#FFAA00' : 'rgba(0, 240, 255, 0.65)';
    ctx.lineWidth = 1.5;

    // Lignes géométriques sur les ailes
    ctx.beginPath();
    ctx.moveTo(-180, 12);
    ctx.lineTo(-70, -10);
    ctx.lineTo(-20, -16);
    ctx.moveTo(180, 12);
    ctx.lineTo(70, -10);
    ctx.lineTo(20, -16);
    ctx.stroke();

    // Tourelles de défense sur les flancs
    ctx.fillStyle = '#00F0FF';
    ctx.beginPath();
    ctx.arc(-110, 5, 4, 0, Math.PI * 2);
    ctx.arc(110, 5, 4, 0, Math.PI * 2);
    ctx.fill();

    // Feux de navigation clignotants
    const beaconOn = Math.floor(now * 5) % 2 === 0;
    ctx.fillStyle = beaconOn ? '#00FF88' : '#FF0055';
    ctx.beginPath();
    ctx.arc(-205, 12, 3, 0, Math.PI * 2);
    ctx.arc(205, 12, 3, 0, Math.PI * 2);
    ctx.fill();

    // 5. Passerelle de Commandement Centrale (Tour centrale illuminée)
    const bridgeGrad = ctx.createLinearGradient(0, -38, 0, -12);
    bridgeGrad.addColorStop(0, '#00F0FF');
    bridgeGrad.addColorStop(0.5, '#0070FF');
    bridgeGrad.addColorStop(1, '#050a1c');

    ctx.fillStyle = bridgeGrad;
    ctx.beginPath();
    ctx.moveTo(0, -42);
    ctx.lineTo(22, -22);
    ctx.lineTo(16, -10);
    ctx.lineTo(-16, -10);
    ctx.lineTo(-22, -22);
    ctx.closePath();
    ctx.fill();

    // Baie vitrée holographique dorée/cyan de la passerelle
    ctx.fillStyle = '#FFE600';
    ctx.fillRect(-12, -26, 24, 4);

    // 6. Badge Holographique Tactique au-dessus de la passerelle
    ctx.font = "bold 11px 'Orbitron', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Cadre du badge
    const badgeW = 190;
    const badgeH = 20;
    const badgeY = -68;
    ctx.fillStyle = 'rgba(5, 12, 28, 0.88)';
    ctx.strokeStyle = shieldColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = shieldColor;
    ctx.fillText(`🛡️ VAISSEAU MÈRE : ${Math.ceil(mothershipHp)} / ${maxHp} PV`, 0, badgeY);

    ctx.restore();
    ctx.restore();
  }

  public restore() {
    this.ctx.restore();
  }
}
