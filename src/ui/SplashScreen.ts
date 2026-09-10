// Écran de Chargement / Splash Screen Stylisé : Laser Scan & Révélation "Studio" Incandescent

export class SplashScreen {
  private elOverlay: HTMLElement | null = null;
  private elLaser: HTMLElement | null = null;
  private elStudio: HTMLElement | null = null;
  private elStudioWrap: HTMLElement | null = null;

  private isDismissed: boolean = false;
  private isStudioIgnited: boolean = false;
  private animFrameId: number | null = null;
  private timerDismiss: any = null;

  // Durée du balayage laser : 3.8 secondes (entre 3 et 5 secondes)
  private readonly SWEEP_DURATION_MS: number = 3800;
  // Temps de contemplation après fin du balayage avant transition : 1.1s
  private readonly HOLD_DURATION_MS: number = 1100;

  constructor() {
    this.elOverlay = document.getElementById('app-splash-screen');
    if (!this.elOverlay) return;

    this.elLaser = this.elOverlay.querySelector('.splash-laser-beam');
    this.elStudio = this.elOverlay.querySelector('.splash-studio-text');
    this.elStudioWrap = this.elOverlay.querySelector('.splash-studio-wrap');

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

  private startLaserAnimation() {
    if (!this.elLaser) return;

    const startTime = performance.now();
    const startY = -80;

    const step = (now: number) => {
      if (this.isDismissed) return;

      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / this.SWEEP_DURATION_MS);

      // Easing cinématique doux et fluide
      const eased = this.easeCubic(progress);

      const endY = window.innerHeight + 80;
      const currentY = startY + (endY - startY) * eased;

      if (this.elLaser) {
        this.elLaser.style.transform = `translate3d(0, ${currentY}px, 0)`;

        // Fondu progressif d'entrée et de sortie du faisceau
        if (progress < 0.04) {
          this.elLaser.style.opacity = `${progress / 0.04}`;
        } else if (progress > 0.94) {
          this.elLaser.style.opacity = `${Math.max(0, (1 - progress) / 0.06)}`;
        } else {
          this.elLaser.style.opacity = '1';
        }
      }

      // Déclenchement PILE quand le laser touche le mot "STUDIO"
      if (!this.isStudioIgnited && this.elStudioWrap) {
        const studioRect = this.elStudioWrap.getBoundingClientRect();
        if (currentY >= studioRect.top) {
          this.igniteStudio();
        }
      }

      if (progress < 1) {
        this.animFrameId = requestAnimationFrame(step);
      } else {
        // Balayage terminé : laisser briller le logo et STUDIO incandescent
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

