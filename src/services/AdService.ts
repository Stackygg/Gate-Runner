// Service de Publicités Récompensées & Interstitielles (Simulateur / Passerelle d'intégration AdMob / UnityAds)
//
// - Pub à récompense : regardée volontairement contre un bonus (aussi pour les joueurs VIP).
// - Pub obligatoire : tous les 3 à 4 essais, supprimée par le Pass VIP Anti-Pub.
// Toute pub regardée remet à zéro le compteur des pubs obligatoires.

import { UpgradeStore } from '../systems/UpgradeStore';

export class AdService {
  private static store: UpgradeStore;
  private static elModal = document.getElementById('modal-ad-player');
  private static elTimerText = document.getElementById('ad-timer-countdown');
  private static elProgressBar = document.getElementById('ad-progress-fill');
  private static elBtnClose = document.getElementById('btn-ad-close');
  private static elRewardTag = document.getElementById('ad-reward-title');
  private static elAdSponsorText = document.getElementById('ad-sponsor-name');
  private static elRewardNotice: HTMLElement | null = null;
  private static elInterstitialNotice: HTMLElement | null = null;

  private static adTimer: number | null = null;
  private static isInterstitial: boolean = false;
  private static currentOnReward: (() => void) | null = null;
  private static currentOnDismiss: (() => void) | null = null;

  private static readonly AD_DURATION_MS = 5000;

  private static readonly SPONSORS = [
    'CYBER-CORE V2 // BOOSTER D\'ÉNERGIE QUANTIQUE',
    'STACKY NEURAL LINK // PILOTAGE HYPERSILENCIEUX',
    'ORBITAL CRYPTO-DRIVE // STOCKAGE INTERGALACTIQUE',
    'NEXUS STAR-SHIPS // MOTEURS À ANTIMATIÈRE'
  ];

  public static init(store: UpgradeStore) {
    this.store = store;
    this.elModal = document.getElementById('modal-ad-player');
    this.elTimerText = document.getElementById('ad-timer-countdown');
    this.elProgressBar = document.getElementById('ad-progress-fill');
    this.elBtnClose = document.getElementById('btn-ad-close');
    this.elRewardTag = document.getElementById('ad-reward-title');
    this.elAdSponsorText = document.getElementById('ad-sponsor-name');
    this.elRewardNotice = document.getElementById('ad-reward-notice');
    this.elInterstitialNotice = document.getElementById('ad-interstitial-notice');

    this.elBtnClose?.addEventListener('click', () => {
      if (this.elBtnClose?.classList.contains('disabled')) return;
      this.closeAd(true);
    });
  }

  /**
   * Pub à récompense : le bonus est versé à la fin de la vidéo
   */
  public static showRewardedAd(
    rewardName: string,
    onReward: () => void,
    onDismiss?: () => void
  ) {
    this.isInterstitial = false;
    this.currentOnReward = onReward;
    this.currentOnDismiss = onDismiss || null;
    if (this.elRewardTag) this.elRewardTag.textContent = rewardName;
    this.play('Récompense dans', 'RÉCOMPENSE VALIDÉE ! 🎁', 'RÉCUPÉRER LE BONUS 🎁');
  }

  /**
   * Pub obligatoire entre deux essais (jamais affichée aux joueurs VIP)
   */
  public static showInterstitialAd(onDone: () => void) {
    if (this.store?.data.noAdsPurchased) {
      onDone();
      return;
    }
    this.isInterstitial = true;
    this.currentOnReward = onDone;
    this.currentOnDismiss = null;
    this.play('Fin de la pub dans', 'MERCI POUR VOTRE SOUTIEN !', 'CONTINUER ▶');
  }

  private static play(countdownLabel: string, doneLabel: string, closeLabel: string) {
    this.elRewardNotice?.classList.toggle('hidden', this.isInterstitial);
    this.elInterstitialNotice?.classList.toggle('hidden', !this.isInterstitial);

    if (this.elAdSponsorText) {
      const randSponsor = this.SPONSORS[Math.floor(Math.random() * this.SPONSORS.length)];
      this.elAdSponsorText.textContent = randSponsor;
    }

    const durationSec = Math.ceil(this.AD_DURATION_MS / 1000);
    if (this.elBtnClose) {
      this.elBtnClose.classList.add('disabled');
      this.elBtnClose.textContent = `PATIENTEZ (${durationSec}s)`;
    }
    if (this.elProgressBar) {
      this.elProgressBar.style.width = '0%';
    }
    if (this.elTimerText) {
      this.elTimerText.textContent = `${countdownLabel} ${durationSec}s...`;
    }

    this.elModal?.classList.remove('hidden');

    if (this.adTimer !== null) {
      clearInterval(this.adTimer);
    }

    const startTime = Date.now();
    this.adTimer = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / this.AD_DURATION_MS);
      const remainingSec = Math.max(0, Math.ceil((this.AD_DURATION_MS - elapsed) / 1000));

      if (this.elProgressBar) {
        this.elProgressBar.style.width = `${progress * 100}%`;
      }

      if (this.elTimerText) {
        this.elTimerText.textContent = remainingSec > 0 ? `${countdownLabel} ${remainingSec}s...` : doneLabel;
      }

      if (this.elBtnClose) {
        if (remainingSec > 0) {
          this.elBtnClose.textContent = `PATIENTEZ (${remainingSec}s)`;
        } else {
          this.elBtnClose.classList.remove('disabled');
          this.elBtnClose.textContent = closeLabel;
        }
      }

      if (elapsed >= this.AD_DURATION_MS && this.adTimer !== null) {
        clearInterval(this.adTimer);
        this.adTimer = null;
      }
    }, 100);
  }

  private static closeAd(rewardGranted: boolean) {
    if (this.adTimer !== null) {
      clearInterval(this.adTimer);
      this.adTimer = null;
    }

    this.elModal?.classList.add('hidden');

    // Une pub regardée jusqu'au bout repousse la prochaine pub obligatoire
    if (rewardGranted) {
      this.store?.resetForcedAdCounter();
    }

    if (rewardGranted && this.currentOnReward) {
      const rewardCb = this.currentOnReward;
      this.currentOnReward = null;
      rewardCb();
    } else if (this.currentOnDismiss) {
      const dismissCb = this.currentOnDismiss;
      this.currentOnDismiss = null;
      dismissCb();
    }
  }
}
