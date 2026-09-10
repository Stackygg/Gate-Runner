// Service de Publicités Récompensées & Interstitielles (Simulateur / Passerelle d'intégration AdMob / UnityAds)

import { UpgradeStore } from '../systems/UpgradeStore';

export class AdService {
  private static store: UpgradeStore;
  private static elModal = document.getElementById('modal-ad-player');
  private static elTimerText = document.getElementById('ad-timer-countdown');
  private static elProgressBar = document.getElementById('ad-progress-fill');
  private static elBtnClose = document.getElementById('btn-ad-close');
  private static elRewardTag = document.getElementById('ad-reward-title');
  private static elAdSponsorText = document.getElementById('ad-sponsor-name');

  private static adTimer: number | null = null;
  private static countdownVal = 5;
  private static currentOnReward: (() => void) | null = null;
  private static currentOnDismiss: (() => void) | null = null;

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

    this.elBtnClose?.addEventListener('click', () => {
      this.closeAd(true);
    });
  }

  public static showRewardedAd(
    rewardName: string,
    onReward: () => void,
    onDismiss?: () => void
  ) {
    // Si le joueur possède le PASS NO-ADS VIP (Anti-Pub), récompense instantanée sans vidéo !
    if (this.store && this.store.data.noAdsPurchased) {
      this.showNoAdsToast(rewardName);
      onReward();
      return;
    }

    this.currentOnReward = onReward;
    this.currentOnDismiss = onDismiss || null;
    this.countdownVal = 5;

    if (this.elRewardTag) this.elRewardTag.textContent = rewardName;
    if (this.elAdSponsorText) {
      const randSponsor = this.SPONSORS[Math.floor(Math.random() * this.SPONSORS.length)];
      this.elAdSponsorText.textContent = randSponsor;
    }

    if (this.elBtnClose) {
      this.elBtnClose.classList.add('disabled');
      this.elBtnClose.textContent = `PATIENTEZ (${this.countdownVal}s)`;
    }

    if (this.elProgressBar) {
      this.elProgressBar.style.width = '0%';
    }

    if (this.elTimerText) {
      this.elTimerText.textContent = `Récompense dans ${this.countdownVal}s...`;
    }

    this.elModal?.classList.remove('hidden');

    if (this.adTimer !== null) {
      clearInterval(this.adTimer);
    }

    const startTime = Date.now();
    const duration = 5000;

    this.adTimer = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const remainingSec = Math.max(0, Math.ceil((duration - elapsed) / 1000));

      if (this.elProgressBar) {
        this.elProgressBar.style.width = `${progress * 100}%`;
      }

      if (this.elTimerText) {
        if (remainingSec > 0) {
          this.elTimerText.textContent = `Récompense dans ${remainingSec}s...`;
        } else {
          this.elTimerText.textContent = 'RÉCOMPENSE VALIDÉE ! 🎁';
        }
      }

      if (this.elBtnClose) {
        if (remainingSec > 0) {
          this.elBtnClose.textContent = `PATIENTEZ (${remainingSec}s)`;
        } else {
          this.elBtnClose.classList.remove('disabled');
          this.elBtnClose.textContent = 'RÉCUPÉRER LE BONUS 🎁';
        }
      }

      if (elapsed >= duration) {
        if (this.adTimer !== null) {
          clearInterval(this.adTimer);
          this.adTimer = null;
        }
      }
    }, 100);
  }

  private static closeAd(rewardGranted: boolean) {
    if (this.adTimer !== null) {
      clearInterval(this.adTimer);
      this.adTimer = null;
    }

    this.elModal?.classList.add('hidden');

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

  private static showNoAdsToast(rewardName: string) {
    const toast = document.createElement('div');
    toast.className = 'no-ads-vip-toast';
    toast.innerHTML = `🛡️ <strong>PASS VIP NO-ADS</strong> : Bonus <em>${rewardName}</em> accordé instantanément !`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('show');
    }, 50);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 2800);
  }
}
