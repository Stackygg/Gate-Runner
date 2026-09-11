// Écran de Chargement / Splash Screen Stylisé : Laser Scan & Révélation "Studio" Incandescent

export class SplashScreen {
  private elOverlay: HTMLElement | null = null;
  private elLaser: HTMLElement | null = null;
  private elStudio: HTMLElement | null = null;
  private elStudioWrap: HTMLElement | null = null;
  private elLogoBox: HTMLElement | null = null;
  private elLogoOrangeWrap: HTMLElement | null = null;

  private isDismissed: boolean = false;
  private isStudioIgnited: boolean = false;
  private animFrameId: number | null = null;
  private timerDismiss: any = null;
  private onDismissCallback?: () => void;

  private isLogoClipHidden: boolean = false;
  private isLogoClipNone: boolean = false;

  // Durée du balayage laser : 3.8 secondes (entre 3 et 5 secondes)
  private readonly SWEEP_DURATION_MS: number = 3800;
  // Temps de contemplation après fin du balayage avant transition : 1.1s
  private readonly HOLD_DURATION_MS: number = 1100;

  constructor(onDismiss?: () => void) {
    this.onDismissCallback = onDismiss;
    this.elOverlay = document.getElementById('app-splash-screen');
    if (!this.elOverlay) return;

    this.elLaser = this.elOverlay.querySelector('.splash-laser-beam');
    this.elStudio = this.elOverlay.querySelector('.splash-studio-text');
    this.elStudioWrap = this.elOverlay.querySelector('.splash-studio-wrap');
    this.elLogoBox = this.elOverlay.querySelector('.splash-logo-box');
    this.elLogoOrangeWrap = this.elOverlay.querySelector('.splash-logo-orange-wrap');

    // Permet d'ignorer / passer immédiatement l'écran au toucher / clic sans déclencher d'action sous-jacente
    const handleSkip = (e: Event) => {
      e.stopPropagation();
      this.dismiss(true);
    };

    this.elOverlay.addEventListener('click', handleSkip);
    this.elOverlay.addEventListener('touchend', handleSkip);

    // Démarrage de l'animation de balayage laser synchronisée
    this.startLaserAnimation();
  }

  public getIsDismissed(): boolean {
    return this.isDismissed;
  }

  private startLaserAnimation() {
    if (!this.elLaser) return;

    // Mesure unique des coordonnées hors de la boucle pour ÉLIMINER tout layout thrashing / reflow synchrone (anti-freeze mobile)
    const logoRect = this.elLogoBox ? this.elLogoBox.getBoundingClientRect() : null;
    const studioRect = this.elStudioWrap ? this.elStudioWrap.getBoundingClientRect() : null;
    const logoTop = logoRect ? logoRect.top : 0;
    const logoBottom = logoRect ? logoRect.bottom : 0;
    const studioTop = studioRect ? studioRect.top : 0;

    const startTime = performance.now();
    const startY = -80;
    const endY = (window.innerHeight || 800) + 80;

    const step = (now: number) => {
      if (this.isDismissed) return;

      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / this.SWEEP_DURATION_MS);

      // Easing cinématique doux et fluide
      const eased = this.easeCubic(progress);
      const currentY = startY + (endY - startY) * eased;

      if (this.elLaser) {
        this.elLaser.style.transform = `translate3d(0, ${currentY.toFixed(1)}px, 0)`;

        // Fondu progressif d'entrée et de sortie du faisceau
        if (progress < 0.04) {
          this.elLaser.style.opacity = `${(progress / 0.04).toFixed(2)}`;
        } else if (progress > 0.94) {
          this.elLaser.style.opacity = `${Math.max(0, (1 - progress) / 0.06).toFixed(2)}`;
        } else {
          this.elLaser.style.opacity = '1';
        }
      }

      // Révélation progressive du Logo Orange de haut en bas sans aucun reflow DOM
      if (this.elLogoOrangeWrap && logoBottom > 0) {
        if (currentY <= logoTop) {
          if (!this.isLogoClipHidden) {
            this.elLogoOrangeWrap.style.clipPath = 'inset(0 0 100% 0)';
            this.isLogoClipHidden = true;
          }
        } else if (currentY >= logoBottom) {
          if (!this.isLogoClipNone) {
            this.elLogoOrangeWrap.style.clipPath = 'none';
            this.isLogoClipNone = true;
          }
        } else {
          this.isLogoClipHidden = false;
          this.isLogoClipNone = false;
          const remainingPx = Math.max(0, logoBottom - currentY);
          this.elLogoOrangeWrap.style.clipPath = `inset(-160px -160px ${remainingPx.toFixed(1)}px -160px)`;
        }
      }

      // Déclenchement PILE quand le laser touche le mot "STUDIO" (calcul numérique direct)
      if (!this.isStudioIgnited && studioTop > 0 && currentY >= studioTop) {
        this.igniteStudio();
      }

      if (progress < 1) {
        this.animFrameId = requestAnimationFrame(step);
      } else {
        this.timerDismiss = setTimeout(() => {
          this.dismiss(false);
        }, this.HOLD_DURATION_MS);
      }
    };

    this.animFrameId = requestAnimationFrame(step);
  }

  private easeCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private igniteStudio() {
    this.isStudioIgnited = true;
    if (this.elStudio) {
      this.elStudio.classList.add('ignited');
    }
    if (this.elStudioWrap) {
      this.elStudioWrap.classList.add('ignited');
    }
  }

  public dismiss(instant: boolean = false) {
    if (this.isDismissed || !this.elOverlay) return;
    this.isDismissed = true;
    this.elOverlay.style.pointerEvents = 'none';

    if (this.onDismissCallback) {
      const cb = this.onDismissCallback;
      this.onDismissCallback = undefined;
      cb();
    }

    if (this.elLogoOrangeWrap) {
      this.elLogoOrangeWrap.style.clipPath = 'none';
    }
    if (!this.isStudioIgnited) {
      this.igniteStudio();
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.timerDismiss) {
      clearTimeout(this.timerDismiss);
      this.timerDismiss = null;
    }

    if (instant) {
      this.elOverlay.classList.add('splash-dismiss-fast');
    } else {
      this.elOverlay.classList.add('splash-dismiss');
    }

    // Retrait propre de l'affichage une fois la transition d'opacité achevée
    setTimeout(() => {
      if (this.elOverlay) {
        this.elOverlay.classList.add('hidden');
        this.elOverlay.style.display = 'none';
      }
    }, instant ? 250 : 650);
  }
}

