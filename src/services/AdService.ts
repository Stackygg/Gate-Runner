// Service de Publicités Récompensées & Interstitielles
//
// - Pub à récompense : regardée volontairement contre un bonus (aussi pour les joueurs VIP).
// - Pub obligatoire : tous les 3 à 4 essais, supprimée par le Pass VIP Anti-Pub.
// Toute pub regardée remet à zéro le compteur des pubs obligatoires.
//
// Sur téléphone : vraies pubs Google AdMob (consentement RGPD via le formulaire Google).
// Dans le navigateur (développement) : lecteur de pub simulé.

import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  AdmobConsentStatus,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents
} from '@capacitor-community/admob';
import { UpgradeStore } from '../systems/UpgradeStore';

// Identifiants AdMob : identifiants de démonstration publics de Google tant que le compte AdMob n'existe pas.
// Avant la mise en production : remplacer par les identifiants du compte AdMob et passer ADMOB_TEST_MODE à false
// (ainsi que l'identifiant d'application dans android/app/src/main/res/values/strings.xml).
const ADMOB_TEST_MODE = true;
const ADMOB_AD_UNITS = {
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
  interstitial: 'ca-app-pub-3940256099942544/1033173712'
};

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

  // AdMob (téléphone uniquement)
  private static readonly useAdMob = Capacitor.isNativePlatform();
  private static adMobReady: Promise<void> | null = null;
  private static privacyOptionsRequired = false;

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

    if (this.useAdMob) {
      this.adMobReady = this.initAdMob();
    }
  }

  // Initialisation d'AdMob puis demande de consentement RGPD (formulaire Google, affiché si nécessaire)
  private static async initAdMob() {
    try {
      await AdMob.initialize({ initializeForTesting: ADMOB_TEST_MODE });
      let consent = await AdMob.requestConsentInfo();
      if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
        consent = await AdMob.showConsentForm();
      }
      // Valeur 'REQUIRED' de PrivacyOptionsRequirementStatus (énumération non exportée par le plugin)
      this.privacyOptionsRequired = String(consent.privacyOptionsRequirementStatus) === 'REQUIRED';
    } catch (err) {
      console.warn('[AdService] Initialisation AdMob impossible', err);
    }
  }

  /**
   * Le joueur doit pouvoir revoir ses choix de consentement (RGPD) : bouton dans les paramètres
   */
  public static isPrivacyOptionsAvailable(): boolean {
    return this.useAdMob && this.privacyOptionsRequired;
  }

  public static async showPrivacyOptions() {
    if (!this.useAdMob) return;
    try {
      await AdMob.showPrivacyOptionsForm();
    } catch (err) {
      console.warn('[AdService] Formulaire de confidentialité indisponible', err);
    }
  }

  /**
   * Pub à récompense : le bonus est versé à la fin de la vidéo
   */
  public static showRewardedAd(
    rewardName: string,
    onReward: () => void,
    onDismiss?: () => void
  ) {
    if (this.useAdMob) {
      void this.showAdMobRewarded(onReward, onDismiss);
      return;
    }
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
    if (this.useAdMob) {
      void this.showAdMobInterstitial(onDone);
      return;
    }
    this.isInterstitial = true;
    this.currentOnReward = onDone;
    this.currentOnDismiss = null;
    this.play('Fin de la pub dans', 'MERCI POUR VOTRE SOUTIEN !', 'CONTINUER ▶');
  }

  // Vidéo récompensée AdMob : la récompense n'est versée que si Google confirme qu'elle a été gagnée
  private static async showAdMobRewarded(onReward: () => void, onDismiss?: () => void) {
    await this.adMobReady;
    let earned = false;
    const rewardedHandle = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
      earned = true;
    });
    const dismissedHandle = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      void rewardedHandle.remove();
      void dismissedHandle.remove();
      if (earned) {
        this.store?.resetForcedAdCounter();
        onReward();
      } else {
        onDismiss?.();
      }
    });

    try {
      await AdMob.prepareRewardVideoAd({ adId: ADMOB_AD_UNITS.rewarded, isTesting: ADMOB_TEST_MODE });
      await AdMob.showRewardVideoAd();
    } catch (err) {
      // Pas de vidéo disponible (hors ligne, aucune annonce) : le joueur garde la main, sans récompense
      void rewardedHandle.remove();
      void dismissedHandle.remove();
      console.warn('[AdService] Vidéo récompensée indisponible', err);
      this.showUnavailableToast();
      onDismiss?.();
    }
  }

  // Pub obligatoire AdMob : si elle ne peut pas s'afficher, le jeu continue sans attendre
  private static async showAdMobInterstitial(onDone: () => void) {
    await this.adMobReady;
    let finished = false;
    const dismissedHandle = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => finish());
    const finish = () => {
      if (finished) return;
      finished = true;
      void dismissedHandle.remove();
      this.store?.resetForcedAdCounter();
      onDone();
    };

    try {
      await AdMob.prepareInterstitial({ adId: ADMOB_AD_UNITS.interstitial, isTesting: ADMOB_TEST_MODE });
      await AdMob.showInterstitial();
    } catch (err) {
      console.warn('[AdService] Pub obligatoire indisponible', err);
      finish();
    }
  }

  private static showUnavailableToast() {
    const toast = document.createElement('div');
    toast.className = 'shop-reward-toast';
    toast.textContent = 'Aucune vidéo disponible pour le moment, réessaie plus tard.';
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 2400);
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
