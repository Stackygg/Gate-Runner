// Contrôleur de la Barre d'Améliorations en bas d'écran (Dock à 5 Échelons & Bonus +1 Vaisseau)

import { UpgradeStore } from '../systems/UpgradeStore';
import { UPGRADE_TRACKS_CONFIG } from '../config';
import { ModalConfirmCrystal } from './ModalConfirmCrystal';
import { AdService } from '../services/AdService';

export class BottomUpgradeDock {
  private dockElement: HTMLElement | null;
  private diamondsValElement: HTMLElement | null;
  private store: UpgradeStore;
  private onUpgradeChangeCallback?: () => void;
  private onAddBonusShipCallback?: () => void;

  constructor(
    store: UpgradeStore,
    onUpgradeChange?: () => void,
    onAddBonusShip?: () => void
  ) {
    this.store = store;
    this.onUpgradeChangeCallback = onUpgradeChange;
    this.onAddBonusShipCallback = onAddBonusShip;
    this.dockElement = document.getElementById('bottom-upgrade-dock');
    this.diamondsValElement = document.getElementById('dock-diamonds-val');

    this.setupListeners();
  }

  private setupListeners() {
    const types: (keyof typeof UPGRADE_TRACKS_CONFIG)[] = ['fireRate', 'damage', 'diamondBoost'];

    types.forEach(type => {
      const btn = document.getElementById(`btn-dock-${type}`);
      btn?.addEventListener('click', (e) => {
        e.stopPropagation(); // Évite de déclencher le décollage lors du clic sur un bouton d'amélioration
        const track = this.store.data.upgradeTracks[type];

        if (track.step < 5) {
          // Achat d'un niveau (1..5)
          if (this.store.buyStep(type)) {
            this.render();
            this.onUpgradeChangeCallback?.();
          }
        } else {
          // Jauge à 5/5 : Passage au palier supérieur
          if (this.store.canTierUpWithDiamonds(type)) {
            // 1 Palier autorisé en diamants (ex: Palier 1->2)
            if (this.store.tierUpWithDiamonds(type)) {
              this.render();
              this.onUpgradeChangeCallback?.();
            }
          } else {
            // Dépassement de 2 paliers : nécessite 1 Iridium <span class="icon-iridium"></span>
            if (this.store.data.violetCrystals >= 1) {
              ModalConfirmCrystal.show(
                `PALIER ${track.tier + 1} : ${UPGRADE_TRACKS_CONFIG[type].title.toUpperCase()}`,
                `Ce palier nécessite 1 Iridium <span class="icon-iridium"></span> pour débloquer le Palier ${track.tier + 1}. Veux-tu continuer ?`,
                () => {
                  if (this.store.tierUpWithCrystal(type)) {
                    this.render();
                    this.onUpgradeChangeCallback?.();
                  }
                }
              );
            }
          }
        }
      });
    });

    // Bonus +1 Vaisseau via Pub 🎬
    document.getElementById('btn-dock-ship-ad')?.addEventListener('click', (e) => {
      e.stopPropagation();
      AdService.showRewardedAd('+1 VAISSEAU DE DÉPART 🚀', () => {
        this.onAddBonusShipCallback?.();
      });
    });

    // Bonus +1 Vaisseau via Iridium
    document.getElementById('btn-dock-ship-crystal')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.store.data.violetCrystals >= 1) {
        ModalConfirmCrystal.show(
          'RENFORT DE DÉPART (+1 VAISSEAU)',
          'Veux-tu utiliser 1 Iridium <span class="icon-iridium"></span> pour ajouter +1 Vaisseau supplémentaire à ta flotte de départ ?',
          () => {
            this.store.data.violetCrystals -= 1;
            this.store.save();
            this.onAddBonusShipCallback?.();
          }
        );
      }
    });
  }

  public show() {
    this.dockElement?.classList.remove('hidden');
    this.dockElement?.classList.add('active');
    this.render();
  }

  public hide() {
    this.dockElement?.classList.add('hidden');
    this.dockElement?.classList.remove('active');
  }

  public render() {
    if (this.diamondsValElement) {
      this.diamondsValElement.textContent = `${this.store.data.diamonds.toLocaleString()}`;
    }

    const types: (keyof typeof UPGRADE_TRACKS_CONFIG)[] = ['fireRate', 'damage', 'diamondBoost'];

    types.forEach(type => {
      const config = UPGRADE_TRACKS_CONFIG[type];
      const track = this.store.data.upgradeTracks[type];

      // Mise à jour du Palier
      const tierEl = document.getElementById(`dock-tier-${type}`);
      if (tierEl) tierEl.textContent = `PALIER ${track.tier}`;

      // Mise à jour des 5 Pips de jauge
      const pipsContainer = document.getElementById(`dock-pips-${type}`);
      if (pipsContainer) {
        const pips = pipsContainer.querySelectorAll('.pip');
        pips.forEach((pip, index) => {
          if (index < track.step) {
            pip.classList.add('filled');
          } else {
            pip.classList.remove('filled');
          }
        });
      }

      // Mise à jour du bouton d'action
      const btn = document.getElementById(`btn-dock-${type}`);
      if (btn) {
        if (track.step < 5) {
          const cost = this.store.getStepCost(type);
          btn.className = `btn-dock-action btn-track-${type}`;
          btn.innerHTML = `<span>+ NIVEAU ${track.step + 1}/5</span><span class="btn-cost-tag">💎 ${cost}</span>`;
          if (this.store.data.diamonds >= cost) {
            btn.removeAttribute('disabled');
            btn.classList.remove('disabled');
          } else {
            btn.setAttribute('disabled', 'true');
            btn.classList.add('disabled');
          }
        } else {
          // Jauge 5/5 : Passage de Palier supérieur
          const canDiamondTier = this.store.canTierUpWithDiamonds(type);

          if (canDiamondTier) {
            const diamondCost = Math.round(config.tierDiamondCost * track.tier);
            const hasDiamonds = this.store.data.diamonds >= diamondCost;
            btn.className = `btn-dock-action btn-track-${type} tier-up-ready`;
            btn.innerHTML = `<span>PALIER ${track.tier + 1}</span><span class="btn-cost-tag">💎 ${diamondCost}</span>`;
            if (hasDiamonds) {
              btn.removeAttribute('disabled');
              btn.classList.remove('disabled');
            } else {
              btn.setAttribute('disabled', 'true');
              btn.classList.add('disabled');
            }
          } else {
            const hasCrystal = this.store.data.violetCrystals >= 1;
            btn.className = `btn-dock-action btn-tier-crystal`;
            btn.innerHTML = `<span>PALIER ${track.tier + 1}</span><span class="btn-cost-tag crystal-cost"><span class="icon-iridium"></span> 1</span>`;
            if (hasCrystal) {
              btn.removeAttribute('disabled');
              btn.classList.remove('disabled');
            } else {
              btn.setAttribute('disabled', 'true');
              btn.classList.add('disabled');
            }
          }
        }
      }
    });
  }
}
