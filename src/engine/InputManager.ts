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

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = GAME_CONFIG.WORLD_WIDTH / (rect.width || 1);
        const scaleY = GAME_CONFIG.WORLD_HEIGHT / (rect.height || 1);
        const sensitivity = 1.25;

        this.targetWorldX = Math.max(
          GAME_CONFIG.ROAD_MARGIN,
          Math.min(GAME_CONFIG.WORLD_WIDTH - GAME_CONFIG.ROAD_MARGIN, this.targetWorldX + deltaX * scaleX * sensitivity)
        );

        if (this.isArenaMode) {
          this.targetWorldY = Math.max(
            70,
            Math.min(GAME_CONFIG.WORLD_HEIGHT - 70, this.targetWorldY + deltaY * scaleY * sensitivity)
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
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPointerDown) {
        const clientX = e.clientX;
        const clientY = e.clientY;
        const deltaX = clientX - this.lastClientX;
        const deltaY = clientY - this.lastClientY;
        this.lastClientX = clientX;
        this.lastClientY = clientY;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = GAME_CONFIG.WORLD_WIDTH / (rect.width || 1);
        const scaleY = GAME_CONFIG.WORLD_HEIGHT / (rect.height || 1);
        const sensitivity = 1.25;

        this.targetWorldX = Math.max(
          GAME_CONFIG.ROAD_MARGIN,
          Math.min(GAME_CONFIG.WORLD_WIDTH - GAME_CONFIG.ROAD_MARGIN, this.targetWorldX + deltaX * scaleX * sensitivity)
        );

        if (this.isArenaMode) {
          this.targetWorldY = Math.max(
            70,
            Math.min(GAME_CONFIG.WORLD_HEIGHT - 70, this.targetWorldY + deltaY * scaleY * sensitivity)
          );
        }
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
      this.targetWorldX = Math.max(
        GAME_CONFIG.ROAD_MARGIN,
        Math.min(GAME_CONFIG.WORLD_WIDTH - GAME_CONFIG.ROAD_MARGIN, this.targetWorldX + dirX * 650 * dt)
      );
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
          70,
          Math.min(GAME_CONFIG.WORLD_HEIGHT - 70, this.targetWorldY + dirY * 650 * dt)
        );
      }
    }

    // Interpolation douce et ultra-réactive vers la position cible
    const lerpSpeed = 24;
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
