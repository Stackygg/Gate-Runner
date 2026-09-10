// Modal de Fin de Partie (Victoire & Défaite avec calcul des diamants, cristaux et doublement publicitaire)

import confetti from 'canvas-confetti';
import { AdService } from '../services/AdService';
import { MissionQuest } from '../systems/UpgradeStore';
import { EquipmentItem, EquipmentSystem, RARITY_CONFIGS, SLOT_INFO } from '../systems/EquipmentSystem';

export interface GameOverStats {
  isVictory: boolean;
  survivingFleet: number;
  enemiesKilled: number;
  multiplier: number;
  diamondsEarned: number;
  crystalsEarned: number;
  nextLevelNum: number;
  defeatReason?: 'FLEET_DESTROYED' | 'MOTHERSHIP_DESTROYED';
  quests?: MissionQuest[];
  newlyCompletedQuests?: MissionQuest[];
  rewardLoot?: EquipmentItem | EquipmentItem[] | null;
}

export class GameOverModal {
  private elModal = document.getElementById('modal-gameover');
  private elBadge = document.getElementById('modal-status-badge');
  private elTitle = document.getElementById('modal-title');
  private elFinalFleet = document.getElementById('stat-final-fleet');
  private elKills = document.getElementById('stat-kills');
  private elMultiplier = document.getElementById('stat-multiplier');
  private elEarnedDiamonds = document.getElementById('stat-earned-diamonds');
  private elEarnedCrystals = document.getElementById('stat-earned-crystals');
  private elBtnNext = document.getElementById('btn-retry-next');
  private elBtnHangar = document.getElementById('btn-hangar-return');
  private elBtnDoubleAd = document.getElementById('btn-ad-double-diamonds');
  private elQuestsBox = document.getElementById('gameover-quests-box');
  private elQuestsList = document.getElementById('gameover-quests-list');
  private elLootBox = document.getElementById('gameover-loot-box');
  private elLootGrid = document.getElementById('gameover-loot-grid') || document.getElementById('gameover-loot-list');
  private elLootDetails = document.getElementById('gameover-loot-details');
  private elBtnLootToHangar = document.getElementById('btn-gameover-to-hangar');

  private onNextCallback: () => void;
  private onHangarCallback: () => void;
  private onDoubleDiamondsCallback?: (bonusDiamonds: number) => void;
  private onLootToHangarCallback?: () => void;

  private currentStats: GameOverStats | null = null;
  private isDoubled: boolean = false;

  constructor(
    onNext: () => void,
    onHangar: () => void,
    onDoubleDiamonds?: (bonusDiamonds: number) => void,
    onLootToHangar?: () => void
  ) {
    this.onNextCallback = onNext;
    this.onHangarCallback = onHangar;
    this.onDoubleDiamondsCallback = onDoubleDiamonds;
    this.onLootToHangarCallback = onLootToHangar;
    this.setupListeners();
  }

  private setupListeners() {
    this.elBtnNext?.addEventListener('click', () => {
      this.hide();
      this.onNextCallback();
    });

    this.elBtnHangar?.addEventListener('click', () => {
      this.hide();
      this.onHangarCallback();
    });

    this.elBtnLootToHangar?.addEventListener('click', () => {
      this.hide();
      if (this.onLootToHangarCallback) {
        this.onLootToHangarCallback();
      } else {
        this.onHangarCallback();
      }
    });

    this.elBtnDoubleAd?.addEventListener('click', () => {
      if (this.isDoubled || !this.currentStats) return;

      AdService.showRewardedAd('DOUBLER LES DIAMANTS (x2) 💎', () => {
        this.isDoubled = true;
        const bonusDiamonds = this.currentStats!.diamondsEarned;
        this.currentStats!.diamondsEarned *= 2;

        if (this.elEarnedDiamonds) {
          this.elEarnedDiamonds.textContent = `+${this.currentStats!.diamondsEarned.toLocaleString()}`;
          this.elEarnedDiamonds.classList.add('doubled-sparkle');
        }

        const lootDiamonds = document.getElementById('stat-loot-diamonds');
        if (lootDiamonds) {
          lootDiamonds.textContent = `+${this.currentStats!.diamondsEarned.toLocaleString()}`;
          lootDiamonds.classList.add('doubled-sparkle');
        }

        document.querySelectorAll('.diamonds-amount').forEach(el => {
          el.textContent = `+${this.currentStats!.diamondsEarned.toLocaleString()}`;
          el.classList.add('doubled-sparkle');
        });

        if (this.elBtnDoubleAd) {
          this.elBtnDoubleAd.setAttribute('disabled', 'true');
          this.elBtnDoubleAd.classList.add('disabled');
          this.elBtnDoubleAd.innerHTML = '<span class="ad-icon-big">✅</span><span class="ad-label-big">x2 💎 (DOUBLÉ !)</span>';
        }

        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#00F0FF', '#FFE600']
          });
        } catch {}

        this.onDoubleDiamondsCallback?.(bonusDiamonds);
      });
    });
  }

  public show(stats: GameOverStats) {
    if (!this.elModal) return;
    this.currentStats = { ...stats };
    this.isDoubled = false;

    if (stats.isVictory) {
      if (this.elBadge) {
        this.elBadge.className = 'modal-badge victory';
        this.elBadge.textContent = 'VICTOIRE ÉCLATANTE !';
      }
      if (this.elTitle) this.elTitle.textContent = 'MISSION ACCOMPLIE';
      if (this.elBtnNext) this.elBtnNext.textContent = `CONTINUER (MISSION ${stats.nextLevelNum}) ▶`;

      // Explosion de confettis cyberpunk
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00F0FF', '#FF007A', '#FFE600', '#7928CA']
        });
      } catch {}
    } else {
      if (this.elBadge) {
        this.elBadge.className = 'modal-badge defeat';
        this.elBadge.textContent = (stats.defeatReason === 'MOTHERSHIP_DESTROYED') ? 'DÉFENSE ÉCHOUÉE' : 'ÉCHEC DE MISSION';
      }
      if (this.elTitle) {
        this.elTitle.textContent = (stats.defeatReason === 'MOTHERSHIP_DESTROYED') ? 'VAISSEAU MÈRE DÉTRUIT' : 'FLOTTE ANÉANTIE';
      }
      if (this.elBtnNext) this.elBtnNext.textContent = 'RÉESSAYER LA MISSION 🔄';
    }

    if (this.elFinalFleet) this.elFinalFleet.textContent = `${stats.survivingFleet} vaisseau(x)`;
    if (this.elKills) this.elKills.textContent = `${stats.enemiesKilled}`;
    if (this.elMultiplier) this.elMultiplier.textContent = `x${stats.multiplier.toFixed(1)}`;
    if (this.elEarnedDiamonds) {
      this.elEarnedDiamonds.classList.remove('doubled-sparkle');
      this.elEarnedDiamonds.textContent = `+${stats.diamondsEarned.toLocaleString()}`;
    }
    if (this.elEarnedCrystals) {
      this.elEarnedCrystals.textContent = `+${stats.crystalsEarned.toLocaleString()}`;
    }

    // Réinitialise le bouton de pub (Grand icone 🎬 et x2 💎)
    if (this.elBtnDoubleAd) {
      this.elBtnDoubleAd.removeAttribute('disabled');
      this.elBtnDoubleAd.classList.remove('disabled');
      this.elBtnDoubleAd.innerHTML = '<span class="ad-icon-big">🎬</span><span class="ad-label-big">x2 💎</span>';
      
      // Actif surtout en cas de défaite ou victoire si des diamants ont été récoltés
      if (stats.diamondsEarned <= 0) {
        this.elBtnDoubleAd.style.display = 'none';
      } else {
        this.elBtnDoubleAd.style.display = 'flex';
      }
    }

    // Rendu des Quêtes / Hauts-Faits de la mission
    if (this.elQuestsBox && this.elQuestsList) {
      if (stats.quests && stats.quests.length > 0) {
        this.elQuestsBox.style.display = 'block';
        this.elQuestsList.innerHTML = stats.quests.map(q => {
          const isNewlyCompleted = stats.newlyCompletedQuests?.some(nq => nq.id === q.id);
          const isCompleted = q.isCompleted || isNewlyCompleted;
          
          let badgeClass = 'quest-chip-locked';
          let badgeText = '🔒 SECRET';
          let titleText = q.title;
          let descText = q.desc;
          let rewardHtml = `<span class="quest-reward-pill">+${q.rewardIridium} <span class="icon-iridium"></span></span>`;

          if (isNewlyCompleted) {
            badgeClass = 'quest-chip-new';
            badgeText = '🏆 DÉBLOQUÉ !';
            rewardHtml = `<span class="quest-reward-pill reward-new">+1 <span class="icon-iridium"></span> GAGNÉ</span>`;
          } else if (isCompleted) {
            badgeClass = 'quest-chip-done';
            badgeText = '✅ VALIDÉ';
            rewardHtml = `<span class="quest-reward-pill reward-done">VALIDÉ <span class="icon-iridium"></span></span>`;
          } else if (q.isClassified) {
            badgeClass = 'quest-chip-locked';
            badgeText = '🔒 SECRET';
            titleText = 'OBJECTIF CLASSIFIÉ';
            descText = '???';
            rewardHtml = `<span class="quest-reward-pill">+1 <span class="icon-iridium"></span></span>`;
          } else {
            badgeClass = 'quest-chip-pending';
            badgeText = '⭕ NON ATTEINT';
            rewardHtml = `<span class="quest-reward-pill">+1 <span class="icon-iridium"></span></span>`;
          }

          return `
            <div class="gameover-quest-row ${isNewlyCompleted ? 'quest-row-highlight' : ''}">
              <div class="quest-row-left">
                <span class="quest-status-badge ${badgeClass}">${badgeText}</span>
                <div class="quest-row-info">
                  <div class="quest-row-title">${titleText}</div>
                  <div class="quest-row-desc">${descText}</div>
                </div>
              </div>
              <div class="quest-row-right">
                ${rewardHtml}
              </div>
            </div>
          `;
        }).join('');
      } else {
        this.elQuestsBox.style.display = 'none';
      }
    }

    const elTopRewards = document.getElementById('gameover-top-rewards');
    const elTopDivider = document.getElementById('gameover-top-divider');
    if (elTopRewards) {
      elTopRewards.style.display = stats.isVictory ? 'none' : 'flex';
    }
    if (elTopDivider) {
      elTopDivider.style.display = stats.isVictory ? 'none' : 'block';
    }

    // Rendu du Butin de la mission avec cases d'inventaire (Iridium, Diamants, Trésor & Équipements)
    if (this.elLootBox && this.elLootGrid) {
      if (stats.isVictory) {
        this.elLootBox.classList.remove('hidden');

        const rawLoot: EquipmentItem[] = stats.rewardLoot
          ? (Array.isArray(stats.rewardLoot) ? stats.rewardLoot : [stats.rewardLoot])
          : [];

        const chestItem = rawLoot.find(item => item.slotType === 'CHEST' || item.isChest);
        const extraItems = rawLoot.filter(item => item !== chestItem);

        const chestMissionLvl = chestItem?.sourceMission || chestItem?.level || Math.max(1, stats.nextLevelNum - 1);
        const chestName = chestItem ? chestItem.name : `Coffre Stellaire (Mission ${chestMissionLvl})`;
        const isPreHangar = chestMissionLvl < 5;

        // 1. Case Iridium
        const iridiumCellHtml = `
          <div class="loot-slot-cell cell-iridium" title="Minerai d'Iridium pur récupéré">
            <div class="loot-cell-icon-wrap">
              <span class="loot-cell-icon"><span class="icon-iridium"></span></span>
            </div>
            <div class="loot-cell-val val-iridium"><span id="stat-loot-iridium">+${stats.crystalsEarned}</span></div>
            <div class="loot-cell-title">IRIDIUM</div>
            <span class="loot-cell-badge badge-iridium">RESSOURCE</span>
          </div>
        `;

        // 2. Case Diamants
        const diamondsCellHtml = `
          <div class="loot-slot-cell cell-diamonds" title="Diamants de mission récoltés">
            <div class="loot-cell-icon-wrap">
              <span class="loot-cell-icon">💎</span>
            </div>
            <div class="loot-cell-val val-diamonds"><span id="stat-loot-diamonds" class="diamonds-amount">+${stats.diamondsEarned.toLocaleString()}</span></div>
            <div class="loot-cell-title">DIAMANTS</div>
            <span class="loot-cell-badge badge-diamonds">DEVISE</span>
          </div>
        `;

        // 3. Case Trésor (Coffre Scellé)
        const chestCellHtml = `
          <div class="loot-slot-cell cell-chest" title="${chestName}">
            <div class="loot-cell-icon-wrap">
              <span class="loot-cell-icon chest-bounce">📦</span>
            </div>
            <div class="loot-cell-val val-chest">x1</div>
            <div class="loot-cell-title" title="${chestName}">TRÉSOR</div>
            <span class="loot-cell-badge badge-chest">SCELLÉ</span>
          </div>
        `;

        // 4. Éventuels loots supplémentaires (Équipements)
        const extraCellsHtml = extraItems.map(item => {
          const rarityCfg = RARITY_CONFIGS[item.rarity];
          const slotCfg = SLOT_INFO[item.slotType];
          return `
            <div class="loot-slot-cell cell-equipment" style="border-color: ${rarityCfg.color}; box-shadow: 0 0 14px ${rarityCfg.bgGlow};" title="${item.name} (${slotCfg.label})">
              <div class="loot-cell-icon-wrap">
                <span class="loot-cell-icon">${slotCfg.icon}</span>
              </div>
              <div class="loot-cell-val" style="color: ${rarityCfg.color}">NIV. ${item.level}</div>
              <div class="loot-cell-title" style="color: ${rarityCfg.color}" title="${item.name}">${item.name}</div>
              <span class="loot-cell-badge" style="background: ${rarityCfg.color}22; color: ${rarityCfg.color}; border: 1px solid ${rarityCfg.color};">${rarityCfg.name}</span>
            </div>
          `;
        }).join('');

        this.elLootGrid.innerHTML = iridiumCellHtml + diamondsCellHtml + chestCellHtml + extraCellsHtml;

        // Message descriptif compact sous les cases
        if (this.elLootDetails) {
          const extraFxHtml = extraItems.map(item => {
            const fx = EquipmentSystem.ensureItemSpecialEffect(item);
            if (!fx) return '';
            return `
              <div class="loot-special-fx-row" style="margin-top: 4px;">
                <span class="loot-fx-tag">${fx.icon} EFFET SPÉCIAL</span>
                <div class="loot-fx-label">${fx.label} : ${fx.description}</div>
              </div>
            `;
          }).join('');

          this.elLootDetails.innerHTML = `
            <div class="loot-chest-info-banner">
              <span class="loot-info-sparkle">✨</span>
              <span>${isPreHangar
                ? "Trésor spatial sécurisé ! Débloquez le Hangar (Niveau 5) pour l'ouvrir !"
                : "Trésor transféré dans votre soute ! Rendez-vous au Hangar pour l'ouvrir avec relance publicitaire possible."}</span>
            </div>
            ${extraFxHtml}
          `;
        }
      } else {
        this.elLootBox.classList.add('hidden');
        if (this.elLootGrid) this.elLootGrid.innerHTML = '';
        if (this.elLootDetails) this.elLootDetails.innerHTML = '';
      }
    }

    this.elModal.classList.remove('hidden');
  }

  public hide() {
    this.elModal?.classList.add('hidden');
  }
}
