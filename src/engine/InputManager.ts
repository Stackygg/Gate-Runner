// Gestionnaire d'entrées fluide (Souris, Glisser tactile, Clavier)

import { GAME_CONFIG } from '../config';

export class InputManager {
  private targetWorldX: number = GAME_CONFIG.WORLD_WIDTH / 2;
  private currentWorldX: number = GAME_CONFIG.WORLD_WIDTH / 2;
  private targetWorldY: number = GAME_CONFIG.PLAYER_BASE_Y;
  private currentWorldY: number = GAME_CONFIG.PLAYER_BASE_Y;

  private isPointerDown: boolean = false;
  private canvas: HTMLCanvasElement;
  private keysPressed: { [key: string]: boolean } = {};
  private lastClientX: number = 0;
  private lastClientY: number = 0;

  public isArenaMode: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupListeners();
  }

  public setArenaMode(enabled: boolean) {
    this.isArenaMode = enabled;
    if (enabled) {
      this.targetWorldX = GAME_CONFIG.WORLD_WIDTH / 2;
      this.currentWorldX = GAME_CONFIG.WORLD_WIDTH / 2;
      this.targetWorldY = 620;
      this.currentWorldY = 620;
    } else {
      this.targetWorldY = GAME_CONFIG.PLAYER_BASE_Y;
      this.currentWorldY = GAME_CONFIG.PLAYER_BASE_Y;
    }
  }

  public clientToWorld(clientX: number, clientY: number): { x: number; y: number } {
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;
    const scale = Math.min(windowW / GAME_CONFIG.WORLD_WIDTH, windowH / GAME_CONFIG.WORLD_HEIGHT) || 1;
    const offsetX = (windowW - GAME_CONFIG.WORLD_WIDTH * scale) / 2;
    const offsetY = (windowH - GAME_CONFIG.WORLD_HEIGHT * scale) / 2;

    const x = (clientX - offsetX) / scale;
    const y = (clientY - offsetY) / scale;
    return { x, y };
  }

  private setupListeners() {
    // --- CONTRÔLES TACTILES MOBILES (Déplacement relatif par glissement au doigt) ---
    this.canvas.addEventListener('touchstart', (e) => {
      this.isPointerDown = true;
      if (e.touches && e.touches.length > 0) {
        this.lastClientX = e.touches[0].clientX;
        this.lastClientY = e.touches[0].clientY;
      }
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches.length > 0) {
        const clientX = e.touches[0].clientX;
        const clientY = e.touches[0].clientY;
        const deltaX = clientX - this.lastClientX;
        const deltaY = clientY - this.lastClientY;
        this.lastClientX = clientX;
        this.lastClientY = clientY;

        const windowW = window.innerWidth;
        const windowH = window.innerHeight;
        const scale = Math.min(windowW / GAME_CONFIG.WORLD_WIDTH, windowH / GAME_CONFIG.WORLD_HEIGHT) || 1;
        const sensitivity = 1.35;

        if (this.isArenaMode) {
          const rawX = this.targetWorldX + (deltaX / scale) * sensitivity;
          const rawY = this.targetWorldY + (deltaY / scale) * sensitivity;
          const clamped = this.clampArenaPosition(rawX, rawY);
          this.targetWorldX = clamped.x;
          this.targetWorldY = clamped.y;
        } else {
          this.targetWorldX = Math.max(
            GAME_CONFIG.ROAD_MARGIN,
            Math.min(GAME_CONFIG.WORLD_WIDTH - GAME_CONFIG.ROAD_MARGIN, this.targetWorldX + (deltaX / scale) * sensitivity)
          );
        }
      }
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchend', () => {
      this.isPointerDown = false;
    });

    this.canvas.addEventListener('touchcancel', () => {
      this.isPointerDown = false;
    });

    // --- CONTRÔLES SOURIS SUR DESKTOP ---
    this.canvas.addEventListener('mousedown', (e) => {
      this.isPointerDown = true;
      this.lastClientX = e.clientX;
      this.lastClientY = e.clientY;
      if (this.isArenaMode) {
        const world = this.clientToWorld(e.clientX, e.clientY);
        const clamped = this.clampArenaPosition(world.x, world.y);
        this.targetWorldX = clamped.x;
        this.targetWorldY = clamped.y;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isArenaMode) {
        // Mode arène : la souris dirige directement le vaisseau dans tout l'espace 360° (avec barrière de coin)
        const world = this.clientToWorld(e.clientX, e.clientY);
        const clamped = this.clampArenaPosition(world.x, world.y);
        this.targetWorldX = clamped.x;
        this.targetWorldY = clamped.y;
        return;
      }

      if (this.isPointerDown) {
        const clientX = e.clientX;
        const deltaX = clientX - this.lastClientX;
        this.lastClientX = clientX;

        const windowW = window.innerWidth;
        const windowH = window.innerHeight;
        const scale = Math.min(windowW / GAME_CONFIG.WORLD_WIDTH, windowH / GAME_CONFIG.WORLD_HEIGHT) || 1;
        const sensitivity = 1.25;

        this.targetWorldX = Math.max(
          GAME_CONFIG.ROAD_MARGIN,
          Math.min(GAME_CONFIG.WORLD_WIDTH - GAME_CONFIG.ROAD_MARGIN, this.targetWorldX + (deltaX / scale) * sensitivity)
        );
      } else {
        this.lastClientX = e.clientX;
        this.lastClientY = e.clientY;
      }
    });

    window.addEventListener('mouseup', () => {
      this.isPointerDown = false;
    });

    // Clavier (Flèches / ZQSD / WASD)
    window.addEventListener('keydown', (e) => {
      this.keysPressed[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed[e.key.toLowerCase()] = false;
    });
  }

  /**
   * Restreint les coordonnées du joueur en mode arène :
   * - Ne passe jamais sous les interfaces (HUD haut et bas)
   * - Barrière infranchissable devant les tourelles de coin (impossible de voler dessus)
   */
  public clampArenaPosition(x: number, y: number): { x: number; y: number } {
    const bounds = GAME_CONFIG.ARENA_BOUNDS;
    let cx = Math.max(bounds.MIN_X, Math.min(bounds.MAX_X, x));
    let cy = Math.max(bounds.MIN_Y, Math.min(bounds.MAX_Y, y));

    const barrierR = GAME_CONFIG.ARENA_CORNER_BARRIER_RADIUS;
    for (const turret of GAME_CONFIG.ARENA_CORNER_TURRETS) {
      const dx = cx - turret.x;
      const dy = cy - turret.y;
      const dist = Math.hypot(dx, dy);
      if (dist < barrierR) {
        if (dist > 0.001) {
          cx = turret.x + (dx / dist) * barrierR;
          cy = turret.y + (dy / dist) * barrierR;
        } else {
          cx = turret.x + (dx >= 0 ? barrierR : -barrierR);
        }
      }
    }

    cx = Math.max(bounds.MIN_X, Math.min(bounds.MAX_X, cx));
    cy = Math.max(bounds.MIN_Y, Math.min(bounds.MAX_Y, cy));

    return { x: cx, y: cy };
  }

  public update(dt: number): number {
    // Prise en compte du clavier axe X
    let dirX = 0;
    if (this.keysPressed['arrowleft'] || this.keysPressed['q'] || this.keysPressed['a']) {
      dirX -= 1;
    }
    if (this.keysPressed['arrowright'] || this.keysPressed['d']) {
      dirX += 1;
    }

    if (this.isArenaMode) {
      let dirY = 0;
      if (this.keysPressed['arrowup'] || this.keysPressed['z'] || this.keysPressed['w']) {
        dirY -= 1;
      }
      if (this.keysPressed['arrowdown'] || this.keysPressed['s']) {
        dirY += 1;
      }

      if (dirX !== 0 || dirY !== 0) {
        const nextX = this.targetWorldX + dirX * 800 * dt;
        const nextY = this.targetWorldY + dirY * 800 * dt;
        const clamped = this.clampArenaPosition(nextX, nextY);
        this.targetWorldX = clamped.x;
        this.targetWorldY = clamped.y;
      }
    } else {
      if (dirX !== 0) {
        this.targetWorldX = Math.max(
          GAME_CONFIG.ROAD_MARGIN,
          Math.min(GAME_CONFIG.WORLD_WIDTH - GAME_CONFIG.ROAD_MARGIN, this.targetWorldX + dirX * 650 * dt)
        );
      }
    }

    // Interpolation douce et ultra-réactive vers la position cible
    const lerpSpeed = this.isArenaMode ? 35 : 24;
    this.currentWorldX += (this.targetWorldX - this.currentWorldX) * Math.min(1, lerpSpeed * dt);
    if (this.isArenaMode) {
      this.currentWorldY += (this.targetWorldY - this.currentWorldY) * Math.min(1, lerpSpeed * dt);
    } else {
      this.currentWorldY = GAME_CONFIG.PLAYER_BASE_Y;
    }

    return this.currentWorldX;
  }

  public getPositionX(): number {
    return this.currentWorldX;
  }

  public getPositionY(): number {
    return this.currentWorldY;
  }

  public getPosition(): { x: number; y: number } {
    return { x: this.currentWorldX, y: this.currentWorldY };
  }

  public getTargetX(): number {
    return this.targetWorldX;
  }

  public getTargetY(): number {
    return this.targetWorldY;
  }

  public getIsPointerDown(): boolean {
    return this.isPointerDown;
  }

  public resetToCenter() {
    this.targetWorldX = GAME_CONFIG.WORLD_WIDTH / 2;
    this.currentWorldX = GAME_CONFIG.WORLD_WIDTH / 2;
    this.targetWorldY = this.isArenaMode ? 620 : GAME_CONFIG.PLAYER_BASE_Y;
    this.currentWorldY = this.targetWorldY;
    this.isPointerDown = false;
  }
}
