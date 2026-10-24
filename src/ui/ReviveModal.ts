// Proposition de résurrection après la destruction de la flotte (1 fois par essai, contre une pub)

import { AdService } from '../services/AdService';

const REVIVE_COUNTDOWN_SECONDS = 5;

export class ReviveModal {
  private elModal = document.getElementById('modal-revive');
  private elCountdown = document.getElementById('revive-countdown-val');
  private elShips = document.getElementById('revive-ships');
  private elBtnRevive = document.getElementById('btn-revive-ad');
  private elBtnDecline = document.getElementById('btn-revive-decline');

  private countdownTimer: number | null = null;
  private onRevive: (() => void) | null = null;
  private onDecline: (() => void) | null = null;

  constructor() {
    this.elBtnRevive?.addEventListener('click', () => {
      if (!this.onRevive) return;
      // Le compte à rebours s'arrête pendant la pub ; fermer la pub sans la finir revient à refuser
      this.stopCountdown();
      this.elModal?.classList.add('hidden');
      const revive = this.onRevive;
      const decline = this.onDecline;
      this.onRevive = null;
      this.onDecline = null;
      AdService.showRewardedAd('REVIVRE 🚀', () => revive(), () => decline?.());
    });

    this.elBtnDecline?.addEventListener('click', () => this.decline());
  }

  public show(shipsRestored: number, onRevive: () => void, onDecline: () => void) {
    this.onRevive = onRevive;
    this.onDecline = onDecline;
    if (this.elShips) this.elShips.textContent = `${shipsRestored}`;
    this.elModal?.classList.remove('hidden');

    let remaining = REVIVE_COUNTDOWN_SECONDS;
    if (this.elCountdown) this.elCountdown.textContent = `${remaining}`;
    this.stopCountdown();
    this.countdownTimer = window.setInterval(() => {
      remaining--;
      if (this.elCountdown) this.elCountdown.textContent = `${Math.max(0, remaining)}`;
      if (remaining <= 0) {
        this.decline();
      }
    }, 1000);
  }

  private decline() {
    this.stopCountdown();
    this.elModal?.classList.add('hidden');
    const decline = this.onDecline;
    this.onRevive = null;
    this.onDecline = null;
    decline?.();
  }

  private stopCountdown() {
    if (this.countdownTimer !== null) {
      window.clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }
}
