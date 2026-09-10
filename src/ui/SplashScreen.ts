// Écran de Chargement / Splash Screen Stylisé : Laser Scan & Révélation "Studio"

export class SplashScreen {
  private elOverlay: HTMLElement | null = null;
  private isDismissed: boolean = false;
  private timerDismiss: any = null;

  constructor() {
    this.elOverlay = document.getElementById('app-splash-screen');
    if (!this.elOverlay) return;

    // Permet d'ignorer / passer immédiatement l'écran au toucher / clic sans déclencher d'action sous-jacente
    const handleSkip = (e: Event) => {
      e.stopPropagation();
      this.dismiss(true);
    };

    this.elOverlay.addEventListener('click', handleSkip);
    this.elOverlay.addEventListener('touchend', handleSkip);

    // Lancement automatique du cycle de fin après l'animation complète (2.4 secondes)
    this.timerDismiss = setTimeout(() => {
      this.dismiss(false);
    }, 2400);
  }

  public dismiss(instant: boolean = false) {
    if (this.isDismissed || !this.elOverlay) return;
    this.isDismissed = true;
    this.elOverlay.style.pointerEvents = 'none';

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
    }, instant ? 300 : 650);
  }
}
