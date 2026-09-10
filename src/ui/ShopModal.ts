// Contrôleur de la Boutique Stellaire (Achats In-App & Récompenses Publicitaires Quotidiennes)

import { UpgradeStore } from '../systems/UpgradeStore';
import { AdService } from '../services/AdService';
import confetti from 'canvas-confetti';

export class ShopModal {
  private store: UpgradeStore;
  private elModal = document.getElementById('modal-shop');
  private elBtnClose = document.getElementById('btn-close-shop');
  private elDailyAdCount = document.getElementById('shop-daily-ad-count');
  private elBtnAdDiamonds = document.getElementById('btn-shop-ad-diamonds');
  private elBtnAdCrystal = document.getElementById('btn-shop-ad-crystal');
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

    // 1. Offre Pub Quotidienne : 50 Diamants
    this.elBtnAdDiamonds?.addEventListener('click', () => {
      if (!this.store.canWatchDailyAd()) return;
      AdService.showRewardedAd('+50 DIAMANTS 💎', () => {
        this.store.recordDailyAdWatch();
        this.store.addDiamonds(50);
        this.celebrateReward('+50 💎 AJOUTÉS !');
        this.render();
        this.onRefreshCallback?.();
      });
    });

    // 2. Offre Pub Quotidienne : 1 Iridium
    this.elBtnAdCrystal?.addEventListener('click', () => {
      if (!this.store.canWatchDailyAd()) return;
      AdService.showRewardedAd('+1 IRIDIUM QUANTIQUE', () => {
        this.store.recordDailyAdWatch();
        this.store.addIridium(1);
        this.celebrateReward('+1 <span class="icon-iridium"></span> IRIDIUM AJOUTÉ !');
        this.render();
        this.onRefreshCallback?.();
      });
    });

    // 3. Achat Anti-Pub Permanent (3.99€)
    this.elBtnNoAds?.addEventListener('click', () => {
      if (this.store.data.noAdsPurchased) return;
      // Simulation d'achat Store
      this.store.buyNoAds();
      this.celebrateReward('🛡️ PASS VIP NO-ADS ACTIVÉ !');
      this.render();
      this.onRefreshCallback?.();
    });

    // 4. Packs d'Iridium (IAP)
    document.querySelectorAll('.btn-buy-crystals').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const amount = parseInt((e.currentTarget as HTMLElement).dataset.amount || '10', 10);
        this.store.addIridium(amount);
        this.celebrateReward(`+${amount} <span class="icon-iridium"></span> IRIDIUM ACHETÉ !`);
        this.render();
        this.onRefreshCallback?.();
      });
    });

    // 5. Packs de Diamants (IAP)
    document.querySelectorAll('.btn-buy-diamonds').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const amount = parseInt((e.currentTarget as HTMLElement).dataset.amount || '250', 10);
        this.store.addDiamonds(amount);
        this.celebrateReward(`+${amount} 💎 DIAMANTS ACHETÉS !`);
        this.render();
        this.onRefreshCallback?.();
      });
    });
  }

  private celebrateReward(text: string) {
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#00F0FF', '#FF007A', '#FFE600', '#A855F7']
      });
    } catch {}

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
    const remainingAds = this.store.getDailyAdsRemaining();
    if (this.elDailyAdCount) {
      this.elDailyAdCount.textContent = `${remainingAds} / 5 restantes aujourd'hui`;
    }

    if (this.elBtnAdDiamonds) {
      if (remainingAds <= 0) {
        this.elBtnAdDiamonds.setAttribute('disabled', 'true');
        this.elBtnAdDiamonds.classList.add('disabled');
      } else {
        this.elBtnAdDiamonds.removeAttribute('disabled');
        this.elBtnAdDiamonds.classList.remove('disabled');
      }
    }

    if (this.elBtnAdCrystal) {
      if (remainingAds <= 0) {
        this.elBtnAdCrystal.setAttribute('disabled', 'true');
        this.elBtnAdCrystal.classList.add('disabled');
      } else {
        this.elBtnAdCrystal.removeAttribute('disabled');
        this.elBtnAdCrystal.classList.remove('disabled');
      }
    }

    if (this.elBtnNoAds) {
      if (this.store.data.noAdsPurchased) {
        this.elBtnNoAds.setAttribute('disabled', 'true');
        this.elBtnNoAds.classList.add('purchased');
        this.elBtnNoAds.textContent = '🛡️ POSSÉDÉ (VIP ACTIF)';
      }
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
