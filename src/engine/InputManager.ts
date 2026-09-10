// Gestionnaire d'entrées fluide (Souris, Glisser tactile, Clavier)

import { GAME_CONFIG } from '../config';

export class InputManager {
  private targetWorldX: number = GAME_CONFIG.WORLD_WIDTH / 2;
  private currentWorldX: number = GAME_CONFIG.WORLD_WIDTH / 2;
  private isPointerDown: boolean = false;
  private canvas: HTMLCanvasElement;
  private keyboardVelocity: number = 0;
  private keysPressed: { [key: string]: boolean } = {};
  private lastClientX: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupListeners();
  }

  private setupListeners() {
    // --- CONTRÔLES TACTILES MOBILES (Déplacement relatif par glissement au doigt) ---
    // Peu importe où le joueur pose son doigt, le vaisseau ne saute JAMAIS :
    // seul le slide/glissement du doigt fait bouger le vaisseau avec une précision arcade parfaite !
    this.canvas.addEventListener('touchstart', (e) => {
      this.isPointerDown = true;
      if (e.touches && e.touches.length > 0) {
        this.lastClientX = e.touches[0].clientX;
      }
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches.length > 0) {
        const clientX = e.touches[0].clientX;
        const deltaX = clientX - this.lastClientX;
        this.lastClientX = clientX;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = GAME_CONFIG.WORLD_WIDTH / (rect.width || 1);
        const sensitivity = 1.25;

        this.targetWorldX = Math.max(
          GAME_CONFIG.ROAD_MARGIN,
          Math.min(GAME_CONFIG.WORLD_WIDTH - GAME_CONFIG.ROAD_MARGIN, this.targetWorldX + deltaX * scaleX * sensitivity)
        );
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
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPointerDown) {
        const clientX = e.clientX;
        const deltaX = clientX - this.lastClientX;
        this.lastClientX = clientX;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = GAME_CONFIG.WORLD_WIDTH / (rect.width || 1);
        const sensitivity = 1.25;

        this.targetWorldX = Math.max(
          GAME_CONFIG.ROAD_MARGIN,
          Math.min(GAME_CONFIG.WORLD_WIDTH - GAME_CONFIG.ROAD_MARGIN, this.targetWorldX + deltaX * scaleX * sensitivity)
        );
      } else {
        this.lastClientX = e.clientX;
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
    // Prise en compte du clavier
    let dir = 0;
    if (this.keysPressed['arrowleft'] || this.keysPressed['q'] || this.keysPressed['a']) {
      dir -= 1;
    }
    if (this.keysPressed['arrowright'] || this.keysPressed['d']) {
      dir += 1;
    }

    if (dir !== 0) {
      this.targetWorldX = Math.max(
        GAME_CONFIG.ROAD_MARGIN,
        Math.min(GAME_CONFIG.WORLD_WIDTH - GAME_CONFIG.ROAD_MARGIN, this.targetWorldX + dir * 650 * dt)
      );
    }

    // Interpolation douce et ultra-réactive vers la position cible
    const lerpSpeed = 24;
    this.currentWorldX += (this.targetWorldX - this.currentWorldX) * Math.min(1, lerpSpeed * dt);
    return this.currentWorldX;
  }

  public getPositionX(): number {
    return this.currentWorldX;
  }

  public getTargetX(): number {
    return this.targetWorldX;
  }

  public getIsPointerDown(): boolean {
    return this.isPointerDown;
  }

  public resetToCenter() {
    this.targetWorldX = GAME_CONFIG.WORLD_WIDTH / 2;
    this.currentWorldX = GAME_CONFIG.WORLD_WIDTH / 2;
    this.isPointerDown = false;
  }
}
