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
          </div>
        `;

        // 3. Case Coffre Quantique (avec icône vectorielle haute fidélité)
        const chestSvgIcon = `
          <svg class="icon-chest-svg chest-bounce" viewBox="0 0 24 24" width="22" height="22" fill="none">
            <defs>
              <linearGradient id="chestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FDE68A"/>
                <stop offset="45%" stop-color="#F59E0B"/>
                <stop offset="100%" stop-color="#B45309"/>
              </linearGradient>
              <linearGradient id="chestLidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#FEF08A"/>
                <stop offset="100%" stop-color="#D97706"/>
              </linearGradient>
            </defs>
            <path d="M2.5 11h19v7.5a2.5 2.5 0 0 1-2.5 2.5h-14a2.5 2.5 0 0 1-2.5-2.5V11z" fill="url(#chestGrad)" stroke="#FDE68A" stroke-width="1.2"/>
            <path d="M4.5 11h15v6.5a1.5 1.5 0 0 1-1.5 1.5h-12a1.5 1.5 0 0 1-1.5-1.5V11z" fill="#0F172A" opacity="0.38"/>
            <path d="M2 10.5V8a3.5 3.5 0 0 1 3.5-3.5h13A3.5 3.5 0 0 1 22 8v2.5H2z" fill="url(#chestLidGrad)" stroke="#FEF08A" stroke-width="1.2"/>
            <line x1="2" y1="10.5" x2="22" y2="10.5" stroke="#FFFFFF" stroke-width="1.2" opacity="0.9"/>
            <rect x="9.5" y="8.5" width="5" height="5.5" rx="1.5" fill="#090D1A" stroke="#FDE68A" stroke-width="1"/>
            <circle cx="12" cy="11.2" r="1.3" fill="#00F0FF"/>
            <circle cx="5" cy="15" r="0.9" fill="#FEF08A"/>
            <circle cx="19" cy="15" r="0.9" fill="#FEF08A"/>
          </svg>
        `;

        const chestCellHtml = `
          <div class="loot-slot-cell cell-chest" title="${chestName}">
            <div class="loot-cell-icon-wrap">
              <span class="loot-cell-icon">${chestSvgIcon}</span>
            </div>
            <div class="loot-cell-val val-chest">x1</div>
            <div class="loot-cell-title" title="${chestName}">COFFRE QUANTIQUE</div>
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
            </div>
          `;
        }).join('');

        this.elLootGrid.innerHTML = iridiumCellHtml + diamondsCellHtml + chestCellHtml + extraCellsHtml;

        // Détails supplémentaires d'effets spéciaux (uniquement si présents)
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

          this.elLootDetails.innerHTML = extraFxHtml;
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
