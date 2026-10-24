// Contrôleur de la Boutique Stellaire (Achats In-App & Récompenses Publicitaires Quotidiennes)

import { UpgradeStore, SHOP_DAILY_AD_LIMITS, ShopDailyAdType } from '../systems/UpgradeStore';
import { AdService } from '../services/AdService';

// Récompenses des pubs quotidiennes de la boutique
const SHOP_AD_DUST_REWARD = 500;
const SHOP_AD_BARS_REWARD = 1;

export class ShopModal {
  private store: UpgradeStore;
  private elModal = document.getElementById('modal-shop');
  private elBtnClose = document.getElementById('btn-close-shop');
  private elBtnAdDust = document.getElementById('btn-shop-ad-dust');
  private elBtnAdBar = document.getElementById('btn-shop-ad-bar');
  private elAdDustRemaining = document.getElementById('shop-ad-dust-remaining');
  private elAdBarRemaining = document.getElementById('shop-ad-bar-remaining');
  private elBtnNoAds = document.getElementById('btn-shop-buy-noads');
  private onRefreshCallback?: () => void;

  constructor(store: UpgradeStore, onRefresh?: () => void) {
    this.store = store;
    this.onRefreshCallback = onRefresh;
    this.setupListeners();
  }

  private setupListeners() {
    this.elBtnClose?.addEventListener('click', () => {
      this.hide();
    });

    // 1. Offre Pub Quotidienne : Poudre de Diamant (5 fois par jour)
    this.elBtnAdDust?.addEventListener('click', () => {
      if (!this.store.canWatchDailyAd('dust')) return;
      AdService.showRewardedAd(`+${SHOP_AD_DUST_REWARD} POUDRE DE DIAMANT`, () => {
        this.store.recordDailyAdWatch('dust');
        this.store.addDiamondDust(SHOP_AD_DUST_REWARD);
        this.store.recordDailyQuestProgress('shop_purchase', 1);
        this.celebrateReward(`+${SHOP_AD_DUST_REWARD} <span class="icon-diamond-dust"></span> POUDRE AJOUTÉE !`);
        this.render();
        this.onRefreshCallback?.();
      });
    });

    // 2. Offre Pub Quotidienne : Barre d'Iridium (2 fois par jour)
    this.elBtnAdBar?.addEventListener('click', () => {
      if (!this.store.canWatchDailyAd('bars')) return;
      AdService.showRewardedAd(`+${SHOP_AD_BARS_REWARD} BARRE D'IRIDIUM`, () => {
        this.store.recordDailyAdWatch('bars');
        this.store.addIridiumBars(SHOP_AD_BARS_REWARD);
        this.store.recordDailyQuestProgress('shop_purchase', 1);
        this.celebrateReward(`+${SHOP_AD_BARS_REWARD} <span class="icon-iridium-bar"></span> BARRE D'IRIDIUM AJOUTÉE !`);
        this.render();
        this.onRefreshCallback?.();
      });
    });

    // 3. Achat Anti-Pub Permanent (3.99€) : supprime les pubs obligatoires entre les essais
    this.elBtnNoAds?.addEventListener('click', () => {
      if (this.store.data.noAdsPurchased) return;
      // Simulation d'achat Store
      this.store.buyNoAds();
      this.store.recordDailyQuestProgress('shop_purchase', 1);
      this.celebrateReward('🛡️ PASS VIP NO-ADS ACTIVÉ !');
      this.render();
      this.onRefreshCallback?.();
    });

    // 4. Packs d'Iridium (IAP)
    document.querySelectorAll('.btn-buy-crystals').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const amount = parseInt((e.currentTarget as HTMLElement).dataset.amount || '10', 10);
        this.store.addIridium(amount);
        this.store.recordDailyQuestProgress('shop_purchase', 1);
        this.celebrateReward(`+${amount} <span class="icon-iridium"></span> IRIDIUM ACHETÉ !`);
        this.render();
        this.onRefreshCallback?.();
      });
    });

    // 5. Packs de Poudre de Diamant (IAP) : monnaie du compte pour améliorer les équipements
    document.querySelectorAll('.btn-buy-dust').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const amount = parseInt((e.currentTarget as HTMLElement).dataset.amount || '100', 10);
        this.store.addDiamondDust(amount);
        this.store.recordDailyQuestProgress('shop_purchase', 1);
        this.celebrateReward(`+${amount} <span class="icon-diamond-dust"></span> POUDRE DE DIAMANT ACHETÉE !`);
        this.render();
        this.onRefreshCallback?.();
      });
    });
  }

  private celebrateReward(text: string) {
    const toast = document.createElement('div');
    toast.className = 'shop-reward-toast';
    toast.innerHTML = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 2400);
  }

  public render() {
    this.renderDailyAdOffer('dust', this.elBtnAdDust, this.elAdDustRemaining);
    this.renderDailyAdOffer('bars', this.elBtnAdBar, this.elAdBarRemaining);

    if (this.elBtnNoAds) {
      if (this.store.data.noAdsPurchased) {
        this.elBtnNoAds.setAttribute('disabled', 'true');
        this.elBtnNoAds.classList.add('purchased');
        this.elBtnNoAds.textContent = '🛡️ POSSÉDÉ (VIP ACTIF)';
      }
    }
  }

  // Compteur et bouton d'une offre pub quotidienne (désactivé une fois la limite du jour atteinte)
  private renderDailyAdOffer(type: ShopDailyAdType, elBtn: HTMLElement | null, elRemaining: HTMLElement | null) {
    const remaining = this.store.getDailyAdsRemaining(type);
    if (elRemaining) {
      elRemaining.textContent = `${remaining} / ${SHOP_DAILY_AD_LIMITS[type]} aujourd'hui`;
    }
    if (elBtn) {
      elBtn.toggleAttribute('disabled', remaining <= 0);
      elBtn.classList.toggle('disabled', remaining <= 0);
    }
  }

  public show() {
    this.render();
    this.elModal?.classList.remove('hidden');
  }

  public hide() {
    this.elModal?.classList.add('hidden');
  }
}
