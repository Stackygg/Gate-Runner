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
          this.targetWorldX = Math.max(
            35,
            Math.min(GAME_CONFIG.WORLD_WIDTH - 35, this.targetWorldX + (deltaX / scale) * sensitivity)
          );
          this.targetWorldY = Math.max(
            60,
            Math.min(GAME_CONFIG.WORLD_HEIGHT - 60, this.targetWorldY + (deltaY / scale) * sensitivity)
          );
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
        this.targetWorldX = Math.max(35, Math.min(GAME_CONFIG.WORLD_WIDTH - 35, world.x));
        this.targetWorldY = Math.max(60, Math.min(GAME_CONFIG.WORLD_HEIGHT - 60, world.y));
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isArenaMode) {
        // Mode arène : la souris dirige directement le vaisseau dans tout l'espace 360°
        const world = this.clientToWorld(e.clientX, e.clientY);
        this.targetWorldX = Math.max(35, Math.min(GAME_CONFIG.WORLD_WIDTH - 35, world.x));
        this.targetWorldY = Math.max(60, Math.min(GAME_CONFIG.WORLD_HEIGHT - 60, world.y));
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

  public update(dt: number): number {
    // Prise en compte du clavier axe X
    let dirX = 0;
    if (this.keysPressed['arrowleft'] || this.keysPressed['q'] || this.keysPressed['a']) {
      dirX -= 1;
    }
    if (this.keysPressed['arrowright'] || this.keysPressed['d']) {
      dirX += 1;
    }

    if (dirX !== 0) {
      const minX = this.isArenaMode ? 35 : GAME_CONFIG.ROAD_MARGIN;
      const maxX = this.isArenaMode ? GAME_CONFIG.WORLD_WIDTH - 35 : GAME_CONFIG.WORLD_WIDTH - GAME_CONFIG.ROAD_MARGIN;
      this.targetWorldX = Math.max(minX, Math.min(maxX, this.targetWorldX + dirX * 800 * dt));
    }

    // Prise en compte du clavier axe Y en mode arène
    if (this.isArenaMode) {
      let dirY = 0;
      if (this.keysPressed['arrowup'] || this.keysPressed['z'] || this.keysPressed['w']) {
        dirY -= 1;
      }
      if (this.keysPressed['arrowdown'] || this.keysPressed['s']) {
        dirY += 1;
      }
      if (dirY !== 0) {
        this.targetWorldY = Math.max(
          60,
          Math.min(GAME_CONFIG.WORLD_HEIGHT - 60, this.targetWorldY + dirY * 800 * dt)
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
