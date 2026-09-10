// Contrôleur du Menu Principal & du Hangar / Armurerie Stellaire

import { UpgradeStore } from '../systems/UpgradeStore';
import { SKINS_CONFIG, ShipSkin } from '../config';
import { ModalConfirmCrystal } from './ModalConfirmCrystal';
import { Renderer } from '../engine/Renderer';
import { LevelGenerator } from '../systems/LevelGenerator';
import { EquipmentItem, EquipmentSlotType, EquipmentSystem, RARITY_CONFIGS, SLOT_INFO } from '../systems/EquipmentSystem';
import { AdService } from '../services/AdService';
import { SoundSynth } from '../engine/SoundSynth';

export class MenuHangar {
  private store: UpgradeStore;
  private onStartCallback: () => void;
  private onOpenShopCallback?: () => void;

  // Canvases de prévisualisation de vaisseau
  private mainPreviewCanvas: HTMLCanvasElement | null;
  private mainPreviewCtx: CanvasRenderingContext2D | null;
  private hangarCanvas: HTMLCanvasElement | null;
  private hangarCtx: CanvasRenderingContext2D | null;
  private previewAngle: number = 0;
  private previewAnimFrame: number = 0;
  private isPreviewRunning: boolean = false;

  private currentSkinIndex: number = 0;
  private activeInventoryFilter: 'ALL' | EquipmentSlotType = 'ALL';
  private selectedItemForModal: EquipmentItem | null = null;

  // Écrans principaux
  private elScreenMainMenu = document.getElementById('screen-main-menu');
  private elScreenHangar = document.getElementById('screen-hangar');
  private elScreenMissions = document.getElementById('screen-missions');

  // Éléments du Menu Principal & Stations
  private elCrystalsTotal = document.getElementById('hangar-crystals-total');
  private elBarsTotal = document.getElementById('hangar-bars-total');
  private elDustTotal = document.getElementById('hangar-dust-total');
  private elDiamondsTotal = document.getElementById('hangar-diamonds-total');
  private elSkinName = document.getElementById('ship-skin-name');
  private elSkinPerk = document.getElementById('ship-skin-perk');
  private elMainSlotsBadge = document.getElementById('main-ship-slots-badge');
  private elMainEquippedPreview = document.getElementById('main-ship-equipped-preview');
  private elHangarAlertBadge = document.getElementById('hangar-alert-badge');
  private elHangarNotifDot = document.getElementById('hangar-notification-dot');
  private elLevelNum = document.getElementById('hangar-level-num');
  private elMissionLabel = document.getElementById('hangar-selected-mission-label');
  private elMissionStatus = document.getElementById('hangar-mission-status');
  private elMissionQuestsList = document.getElementById('hangar-mission-quests-list');

  // Boutons des Stations Galactiques (Menu Principal - Grille 2x3)
  private elBtnMainMissions = document.getElementById('btn-main-missions');
  private elBtnMainShop = document.getElementById('btn-main-shop');
  private elMissionsQuickBadge = document.getElementById('missions-quick-badge');
  private elBtnMainHangar = document.getElementById('btn-main-hangar');
  private elBtnMainChallenges = document.getElementById('btn-main-challenges');
  private elBtnMainRefinery = document.getElementById('btn-main-refinery');
  private elBtnMainEvents = document.getElementById('btn-main-events');
  private elHangarLockedOverlay = document.getElementById('hangar-locked-overlay');
  private elChallengesLockedOverlay = document.getElementById('challenges-locked-overlay');
  private elRefineryLockedOverlay = document.getElementById('refinery-locked-overlay');
  private elEventsMainLockedOverlay = document.getElementById('events-main-locked-overlay');

  // Éléments de l'écran Missions Dédié & Navigation par Onglets
  private elBtnMissionsBack = document.getElementById('btn-missions-back');
  private elBtnMissionsLaunch = document.getElementById('btn-missions-launch');
  private elMissionsScreenCrystals = document.getElementById('missions-screen-crystals');
  private elMissionsScreenBars = document.getElementById('missions-screen-bars');
  private elMissionsScreenDiamonds = document.getElementById('missions-screen-diamonds');
  private elMissionsScreenDust = document.getElementById('missions-screen-dust');
  private elMissionsScreenLevelNum = document.getElementById('missions-screen-level-num');

  // Sélecteur de Mode (Missions & Défis)
  private activeMissionsMode: 'missions' | 'events' = 'missions';
  private elBtnModePrev = document.getElementById('btn-mode-prev');
  private elBtnModeNext = document.getElementById('btn-mode-next');
  private elTabBtnMissions = document.getElementById('tab-btn-missions');
  private elTabBtnEvents = document.getElementById('tab-btn-events');
  private elTabEventsLockBadge = document.getElementById('tab-events-lock-badge');
  private elViewModeMissions = document.getElementById('view-mode-missions');
  private elViewModeEvents = document.getElementById('view-mode-events');

  // Améliorations de la Mission & Recyclage
  private elMissionActiveDiamondsVal = document.getElementById('mission-active-diamonds-val');
  private elTrackFireRateTierBadge = document.getElementById('track-firerate-tier-badge');
  private elTrackFireRatePips = document.getElementById('track-firerate-pips');
  private elTrackFireRateStepLabel = document.getElementById('track-firerate-step-label');
  private elTrackDamageTierBadge = document.getElementById('track-damage-tier-badge');
  private elTrackDamagePips = document.getElementById('track-damage-pips');
  private elTrackDamageStepLabel = document.getElementById('track-damage-step-label');
  private elTrackDiamondTierBadge = document.getElementById('track-diamond-tier-badge');
  private elTrackDiamondPips = document.getElementById('track-diamond-pips');
  private elTrackDiamondStepLabel = document.getElementById('track-diamond-step-label');
  private elBtnRecycleMissionDiamonds = document.getElementById('btn-recycle-mission-diamonds');
  private elBtnRefundMissionUpgrades = document.getElementById('btn-refund-mission-upgrades');

  // Événements Saisonniers & Classement 100 Joueurs
  private elEventsLockedState = document.getElementById('events-locked-state');
  private elEventsUnlockedState = document.getElementById('events-unlocked-state');
  private elEventsUnlockProgressText = document.getElementById('events-unlock-progress-text');
  private elEventsUnlockProgressFill = document.getElementById('events-unlock-progress-fill');
  private elEventSeasonTimer = document.getElementById('event-season-timer');
  private elEventPlayerRank = document.getElementById('event-player-rank');
  private elEventPlayerTime = document.getElementById('event-player-time');
  private elEventPlayerDivision = document.getElementById('event-player-division');
  private elEventPlayerRewardEst = document.getElementById('event-player-reward-est');
  private elTabEventLeaderboard = document.getElementById('tab-event-leaderboard');
  private elTabEventRewards = document.getElementById('tab-event-rewards');
  private elEventViewLeaderboard = document.getElementById('event-view-leaderboard');
  private elEventViewRewards = document.getElementById('event-view-rewards');
  private elLeaderboardEntriesContainer = document.getElementById('leaderboard-entries-container');
  private elEventMilestonesList = document.getElementById('event-milestones-list');
  private elBtnEventLaunch = document.getElementById('btn-event-launch');

  // Écran Dédié des Défis Quotidiens
  private elScreenChallenges = document.getElementById('screen-challenges');
  private elBtnChallengesBack = document.getElementById('btn-challenges-back');
  private elChallengesScreenCrystals = document.getElementById('challenges-screen-crystals');
  private elChallengesScreenBars = document.getElementById('challenges-screen-bars');
  private elChallengesScreenDiamonds = document.getElementById('challenges-screen-diamonds');
  private elChallengesScreenDust = document.getElementById('challenges-screen-dust');
  private elChallengesResetCountdown = document.getElementById('challenges-reset-countdown');

  // Modal Victoire Défi & Multiplicateur Pub
  private elModalChallengeVictory = document.getElementById('modal-challenge-victory');
  private elBtnCloseChallengeVictory = document.getElementById('btn-close-challenge-victory');
  private elChallengeVictoryIcon = document.getElementById('challenge-victory-icon');
  private elChallengeVictoryName = document.getElementById('challenge-victory-name');
  private elChallengeVictoryRewardText = document.getElementById('challenge-victory-reward-text');
  private elBtnChallengeDoubleAd = document.getElementById('btn-challenge-double-ad');
  private elChallengeDoubleRewardPreview = document.getElementById('challenge-double-reward-preview');
  private elBtnChallengeContinue = document.getElementById('btn-challenge-continue');
  private currentWonChallengeId: string | null = null;

  // Modal Raffinerie & Fonderie Lunaire
  private elModalRefinery = document.getElementById('modal-refinery');
  private elBtnCloseRefinery = document.getElementById('btn-close-refinery');
  private elRefineryTotalDiamondsVal = document.getElementById('refinery-total-diamonds-val');
  private elRefineryDustVal = document.getElementById('refinery-dust-val');
  private elBtnSmeltDiamondsUnit = document.getElementById('btn-smelt-diamonds-unit');
  private elBtnSmeltDiamondsAll = document.getElementById('btn-smelt-diamonds-all');
  private elRefineryIridiumOreVal = document.getElementById('refinery-iridium-ore-val');
  private elRefineryIridiumBarsVal = document.getElementById('refinery-iridium-bars-val');
  private elBtnSmeltIridiumUnit = document.getElementById('btn-smelt-iridium-unit');
  private elBtnSmeltIridiumAll = document.getElementById('btn-smelt-iridium-all');
  private elRefineryFeedbackMsg = document.getElementById('refinery-feedback-msg');

  // HUD Toast
  private elHudToastContainer = document.getElementById('hud-toast-container');
  private elHudToastMsg = document.getElementById('hud-toast-msg');
  private toastTimeout: number = 0;

  // Éléments de l'Écran Hangar Dédié
  private elHangarCrystals = document.getElementById('hangar-screen-crystals');
  private elHangarBars = document.getElementById('hangar-screen-bars');
  private elHangarDust = document.getElementById('hangar-screen-dust');
  private elHangarDiamonds = document.getElementById('hangar-screen-diamonds');
  private elHangarShipName = document.getElementById('hangar-ship-name');
  private elHangarShipArchetype = document.getElementById('hangar-ship-archetype');
  private elHangarShipSlotsCount = document.getElementById('hangar-ship-slots-count');
  private elHangarShipPerkText = document.getElementById('hangar-ship-perk-text');
  private elBtnHangarSelectSkin = document.getElementById('btn-hangar-select-skin');
  private elHangarSlotsFilledBadge = document.getElementById('hangar-slots-filled-badge');
  private elHangarSlotsContainer = document.getElementById('hangar-ship-slots-container');
  private elHangarEquippedSummary = document.getElementById('hangar-equipped-stats-summary');
  private elHangarInventoryCount = document.getElementById('hangar-inventory-count');
  private elHangarInventoryGrid = document.getElementById('hangar-inventory-grid');
  private elHangarInventoryEmpty = document.getElementById('hangar-inventory-empty');

  // Modal d'inspection & amélioration d'équipement
  private elModalItemDetail = document.getElementById('modal-item-detail');
  private elItemModalIcon = document.getElementById('item-modal-icon');
  private elItemModalName = document.getElementById('item-modal-name');
  private elItemModalRarity = document.getElementById('item-modal-rarity');
  private elItemModalSlotType = document.getElementById('item-modal-slot-type');
  private elItemModalLevel = document.getElementById('item-modal-level');
  private elItemModalDesc = document.getElementById('item-modal-desc');
  private elItemModalAffixesList = document.getElementById('item-modal-affixes-list');
  private elItemModalRecycleVal = document.getElementById('item-modal-recycle-val');
  private elItemUpgradeCostVal = document.getElementById('item-upgrade-dust-cost-val');
  private elItemNextLevelVal = document.getElementById('item-next-level-val');
  private elBtnModalUpgradeItem = document.getElementById('btn-modal-upgrade-item');
  private elBtnModalEquip = document.getElementById('btn-modal-equip-item');
  private elBtnModalUnequip = document.getElementById('btn-modal-unequip-item');
  private elBtnModalRecycle = document.getElementById('btn-modal-recycle-item');
  private elBtnCloseItemDetail = document.getElementById('btn-close-item-detail');

  // --- ÉLÉMENTS DU MODAL D'OUVERTURE DE COFFRE ---
  private elModalChestOpening = document.getElementById('modal-chest-opening');
  private elBtnCloseChestModal = document.getElementById('btn-close-chest-modal');
  private elChestStageSealed = document.getElementById('chest-stage-sealed');
  private elChestStageOpening = document.getElementById('chest-stage-opening');
  private elChestStageReward = document.getElementById('chest-stage-reward');
  private elChestModalTitle = document.getElementById('chest-modal-title');
  private elChestModalDesc = document.getElementById('chest-modal-desc');
  private elChestInteractiveBox = document.getElementById('chest-interactive-box');
  private elBtnOpenChestAction = document.getElementById('btn-open-chest-action');
  private elChestRewardCard = document.getElementById('chest-reward-card');
  private elBtnChestRerollAd = document.getElementById('btn-chest-reroll-ad');
  private elBtnChestClaimItem = document.getElementById('btn-chest-claim-item');
  private elHangarChestsCountPill = document.getElementById('hangar-chests-count-pill');

  private currentChestItem: EquipmentItem | null = null;
  private currentRevealedItem: EquipmentItem | null = null;
  private isChestOpening: boolean = false;
  private sound: SoundSynth = new SoundSynth();

  constructor(store: UpgradeStore, onStart: () => void, onOpenShop?: () => void) {
    this.store = store;
    this.onStartCallback = onStart;
    this.onOpenShopCallback = onOpenShop;

    this.mainPreviewCanvas = document.getElementById('ship-preview-canvas') as HTMLCanvasElement | null;
    this.mainPreviewCtx = this.mainPreviewCanvas ? this.mainPreviewCanvas.getContext('2d') : null;

    this.hangarCanvas = document.getElementById('hangar-ship-canvas') as HTMLCanvasElement | null;
    this.hangarCtx = this.hangarCanvas ? this.hangarCanvas.getContext('2d') : null;

    const activeSkin = this.store.getSelectedSkin();
    this.currentSkinIndex = SKINS_CONFIG.findIndex(s => s.id === activeSkin.id);
    if (this.currentSkinIndex < 0) this.currentSkinIndex = 0;

    this.setupListeners();
    this.startPreviewLoop();
  }

  private setupListeners() {
    // Bouton Boutique (Menu Principal)
    document.getElementById('btn-hangar-shop')?.addEventListener('click', () => {
      this.onOpenShopCallback?.();
    });

    // Boutons Reset de la Sauvegarde / Run
    const elModalReset = document.getElementById('modal-confirm-reset');
    const openResetModal = () => {
      elModalReset?.classList.remove('hidden');
    };
    const closeResetModal = () => {
      elModalReset?.classList.add('hidden');
    };

    document.getElementById('btn-settings-reset-save')?.addEventListener('click', () => {
      document.getElementById('modal-settings')?.classList.add('hidden');
      openResetModal();
    });
    document.getElementById('btn-cancel-reset')?.addEventListener('click', closeResetModal);
    document.getElementById('btn-confirm-reset')?.addEventListener('click', () => {
      this.store.resetAll();
      window.location.reload();
    });

    // Clic sur le bandeau News
    document.getElementById('main-news-banner')?.addEventListener('click', () => {
      this.showHudToast('📢 HOLONET : Les forges d\'Iridium et la Raffinerie sont prêtes ! Terminez des missions pour progresser.', false);
    });

    // Bouton Décoller
    document.getElementById('btn-start-game')?.addEventListener('click', () => {
      this.hide();
      this.onStartCallback();
    });

    // Navigation vers l'écran Missions
    this.elBtnMainMissions?.addEventListener('click', () => {
      this.showMissions();
    });

    // Clic sur Boutique depuis la grille
    this.elBtnMainShop?.addEventListener('click', () => {
      this.onOpenShopCallback?.();
    });

    // Retour depuis l'écran Missions
    this.elBtnMissionsBack?.addEventListener('click', () => {
      this.showMainMenu();
    });

    // Lancement de mission depuis l'écran Missions
    this.elBtnMissionsLaunch?.addEventListener('click', () => {
      this.hide();
      this.onStartCallback();
    });

    // Navigation par onglets & flèches entre MISSIONS et ÉVÉNEMENTS
    this.elTabBtnMissions?.addEventListener('click', () => {
      this.switchMissionsMode('missions');
    });

    this.elTabBtnEvents?.addEventListener('click', () => {
      this.switchMissionsMode('events');
    });

    this.elBtnModePrev?.addEventListener('click', () => {
      this.switchMissionsMode('missions');
    });

    this.elBtnModeNext?.addEventListener('click', () => {
      this.switchMissionsMode('events');
    });

    // Recyclage des diamants de la mission active en Poudre de Diamant
    this.elBtnRecycleMissionDiamonds?.addEventListener('click', () => {
      const curMission = this.store.data.selectedMission;
      const res = this.store.smeltMissionDiamonds(curMission);
      if (res.success && res.dustGained > 0) {
        this.refreshAll();
        this.showHudToast(`💎 ${res.diamondsSpent} DIAMANTS DE LA MISSION ${curMission} RECYCLÉS EN +${res.dustGained} POUDRE !`, false);
      } else {
        this.showHudToast(`💎 Solde insuffisant : il faut au moins 10 diamants sur cette mission pour recycler.`, true);
      }
    });

    // Réinitialisation des améliorations de la mission active & remboursement des diamants
    this.elBtnRefundMissionUpgrades?.addEventListener('click', () => {
      const curMission = this.store.data.selectedMission;
      const res = this.store.refundMissionUpgrades(curMission);
      if (res.success && res.diamondsRefunded > 0) {
        this.refreshAll();
        this.showHudToast(`🔄 AMÉLIORATIONS RÉINITIALISÉES : +${res.diamondsRefunded} 💎 REMBOURSÉS DANS LA MISSION !`, false);
      } else {
        this.showHudToast(`Aucune amélioration à réinitialiser sur cette mission.`, true);
      }
    });

    // Boutons de lancement des Défis
    document.querySelectorAll('.btn-challenge-launch').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.store.data.maxUnlockedMission < 15) {
          this.showHudToast('🔒 DÉFIS VERROUILLÉS : Atteignez le Niveau 15 pour débloquer ces modes !', true);
          return;
        }
        this.hide();
        this.onStartCallback();
      });
    });

    // Clic sur la station Hangar (Débloqué Niveau 5)
    this.elBtnMainHangar?.addEventListener('click', () => {
      if (this.store.data.maxUnlockedMission >= 5) {
        this.showHangar();
      } else {
        this.showHudToast('🔒 HANGAR VERROUILLÉ : Débloqué au Niveau 5. Atteignez la Mission 5 pour y accéder !', true);
      }
    });

    // Clic sur la station Défis (Débloqué Niveau 5)
    this.elBtnMainChallenges?.addEventListener('click', () => {
      if (this.store.data.maxUnlockedMission >= 5) {
        this.showChallenges();
      } else {
        this.showHudToast('🔒 DÉFIS VERROUILLÉS : Débloqués au Niveau 5. Atteignez la Mission 5 pour y accéder !', true);
      }
    });

    // Clic sur la station Raffinerie (Débloqué Niveau 10)
    this.elBtnMainRefinery?.addEventListener('click', () => {
      if (this.store.data.maxUnlockedMission >= 10) {
        this.openRefineryModal();
      } else {
        this.showHudToast('🔒 RAFFINERIE VERROUILLÉE : Débloquée au Niveau 10. Atteignez la Mission 10 pour exploiter la forge lunaire !', true);
      }
    });

    // Clic sur la station Événements (Débloqué Niveau 15)
    this.elBtnMainEvents?.addEventListener('click', () => {
      this.showMissions();
      this.switchMissionsMode('events');
      if (this.store.data.maxUnlockedMission < 15) {
        this.showHudToast('🔒 ÉVÉNEMENTS VERROUILLÉS : Débloqués au Niveau 15. Atteignez la Mission 15 pour y accéder !', true);
      }
    });

    // Événements Écran Défis Quotidiens
    this.elBtnChallengesBack?.addEventListener('click', () => {
      this.showMainMenu();
    });

    document.querySelectorAll('.btn-launch-challenge').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.challengeId;
        if (id) {
          this.handleLaunchDailyChallenge(id);
        }
      });
    });

    this.elBtnCloseChallengeVictory?.addEventListener('click', () => {
      this.closeChallengeVictoryModal();
    });

    this.elBtnChallengeContinue?.addEventListener('click', () => {
      this.closeChallengeVictoryModal();
    });

    this.elBtnChallengeDoubleAd?.addEventListener('click', () => {
      this.handleDoubleChallengeReward();
    });

    // Événements Tournoi & Classement Saisonniers
    this.elTabEventLeaderboard?.addEventListener('click', () => {
      this.switchEventSubtab('leaderboard');
    });

    this.elTabEventRewards?.addEventListener('click', () => {
      this.switchEventSubtab('rewards');
    });

    this.elBtnEventLaunch?.addEventListener('click', () => {
      this.handleLaunchEvent();
    });

    // Événements du Modal Raffinerie
    this.elBtnCloseRefinery?.addEventListener('click', () => {
      this.closeRefineryModal();
    });

    // 1. Atelier Fonderie de Diamants -> Poudre de Diamant
    this.elBtnSmeltDiamondsUnit?.addEventListener('click', () => {
      this.handleSmeltDiamonds(50);
    });

    this.elBtnSmeltDiamondsAll?.addEventListener('click', () => {
      this.handleSmeltDiamondsAll();
    });

    // 2. Atelier Haut-Fourneau d'Iridium -> Barres d'Iridium
    this.elBtnSmeltIridiumUnit?.addEventListener('click', () => {
      this.handleSmeltIridium(1);
    });

    this.elBtnSmeltIridiumAll?.addEventListener('click', () => {
      this.handleSmeltIridiumAll();
    });

    // Éventuel bouton Hangar secondaire (si présent)
    document.getElementById('btn-open-hangar')?.addEventListener('click', () => {
      if (this.store.data.maxUnlockedMission >= 5) this.showHangar();
      else this.showHudToast('🔒 HANGAR VERROUILLÉ : Débloqué au Niveau 5 !', true);
    });

    // Bouton Retour depuis le Hangar
    document.getElementById('btn-hangar-back')?.addEventListener('click', () => {
      this.showMainMenu();
    });

    // Navigation des missions
    document.getElementById('btn-hangar-prev-mission')?.addEventListener('click', () => {
      if (this.store.data.selectedMission > 1) {
        this.store.selectMission(this.store.data.selectedMission - 1);
        this.refreshAll();
      }
    });

    document.getElementById('btn-hangar-next-mission')?.addEventListener('click', () => {
      if (this.store.data.selectedMission < this.store.data.maxUnlockedMission) {
        this.store.selectMission(this.store.data.selectedMission + 1);
        this.refreshAll();
      }
    });

    // Navigation des vaisseaux dans le Hangar
    document.getElementById('btn-hangar-prev-ship')?.addEventListener('click', () => {
      this.currentSkinIndex = (this.currentSkinIndex - 1 + SKINS_CONFIG.length) % SKINS_CONFIG.length;
      this.updateHangarShipDisplay();
    });

    document.getElementById('btn-hangar-next-ship')?.addEventListener('click', () => {
      this.currentSkinIndex = (this.currentSkinIndex + 1) % SKINS_CONFIG.length;
      this.updateHangarShipDisplay();
    });

    // Bouton Équiper / Débloquer vaisseau dans le Hangar
    this.elBtnHangarSelectSkin?.addEventListener('click', () => {
      const skin = SKINS_CONFIG[this.currentSkinIndex];
      const isUnlocked = this.store.data.unlockedSkinIds.includes(skin.id);

      if (isUnlocked) {
        this.store.selectSkin(skin.id);
        this.updateHangarShipDisplay();
        this.updateMainMenuDisplay();
      } else {
        this.promptUnlockCurrentSkin();
      }
    });

    // Onglets de filtre de l'inventaire
    const filterTabs = document.querySelectorAll('.inventory-tabs-row .inv-tab-btn');
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeInventoryFilter = (tab.getAttribute('data-filter') || 'ALL') as any;
        this.renderInventory();
      });
    });

    // Fermeture du modal d'inspection d'objet
    this.elBtnCloseItemDetail?.addEventListener('click', () => {
      this.closeItemDetailModal();
    });

    // Clic en dehors du modal d'objet pour le fermer
    this.elModalItemDetail?.addEventListener('click', (e) => {
      if (e.target === this.elModalItemDetail) {
        this.closeItemDetailModal();
      }
    });

    // Listeners du Modal Ouverture de Coffre
    this.elBtnCloseChestModal?.addEventListener('click', () => {
      this.closeChestModal();
    });

    this.elModalChestOpening?.addEventListener('click', (e) => {
      if (e.target === this.elModalChestOpening && !this.isChestOpening) {
        this.closeChestModal();
      }
    });

    this.elChestInteractiveBox?.addEventListener('click', () => {
      this.triggerChestOpening();
    });

    this.elBtnOpenChestAction?.addEventListener('click', () => {
      this.triggerChestOpening();
    });

    this.elBtnChestRerollAd?.addEventListener('click', () => {
      this.rerollChestReward();
    });

    this.elBtnChestClaimItem?.addEventListener('click', () => {
      this.claimChestReward();
    });

    // Actions du modal d'objet
    this.elBtnModalEquip?.addEventListener('click', () => {
      if (!this.selectedItemForModal) return;
      const targetSkin = SKINS_CONFIG[this.currentSkinIndex];

      // Sécurité : Impossible d'équiper sur un vaisseau verrouillé !
      if (!this.store.data.unlockedSkinIds.includes(targetSkin.id)) {
        this.closeItemDetailModal();
        this.promptUnlockCurrentSkin();
        return;
      }

      const slots = this.store.getShipSlots(targetSkin.id);

      // Trouver le premier slot compatible vide
      let targetSlotIndex = -1;
      for (let i = 0; i < targetSkin.slots.length; i++) {
        if (targetSkin.slots[i] === this.selectedItemForModal.slotType && !slots[i].item) {
          targetSlotIndex = i;
          break;
        }
      }

      // Si aucun slot compatible n'est vide, écraser le premier slot compatible
      if (targetSlotIndex === -1) {
        for (let i = 0; i < targetSkin.slots.length; i++) {
          if (targetSkin.slots[i] === this.selectedItemForModal.slotType) {
            targetSlotIndex = i;
            break;
          }
        }
      }

      if (targetSlotIndex !== -1) {
        this.store.equipItem(targetSkin.id, targetSlotIndex, this.selectedItemForModal.id);
        this.closeItemDetailModal();
        this.renderShipSlots();
        this.renderInventory();
        this.updateMainMenuDisplay();
      }
    });

    this.elBtnModalUnequip?.addEventListener('click', () => {
      if (!this.selectedItemForModal) return;
      const targetSkin = SKINS_CONFIG[this.currentSkinIndex];
      const slots = this.store.getShipSlots(targetSkin.id);
      const slotIndex = slots.findIndex(s => s.item?.id === this.selectedItemForModal!.id);

      if (slotIndex !== -1) {
        this.store.unequipItem(targetSkin.id, slotIndex);
      } else {
        // Chercher sur n'importe quel vaisseau
        for (const [shipId, sList] of Object.entries(this.store.data.shipEquippedSlots)) {
          const sIdx = sList.indexOf(this.selectedItemForModal.id);
          if (sIdx !== -1) {
            this.store.unequipItem(shipId, sIdx);
            break;
          }
        }
      }

      this.closeItemDetailModal();
      this.renderShipSlots();
      this.renderInventory();
      this.updateMainMenuDisplay();
    });

    this.elBtnModalRecycle?.addEventListener('click', () => {
      if (!this.selectedItemForModal) return;
      const earned = this.store.recycleItem(this.selectedItemForModal.id);
      this.closeItemDetailModal();
      this.refreshAll();
      this.renderShipSlots();
      this.renderInventory();
    });

    // Amélioration de l'équipement avec la Poudre de Diamant & Barres d'Iridium
    this.elBtnModalUpgradeItem?.addEventListener('click', () => {
      if (!this.selectedItemForModal) return;
      const res = this.store.upgradeItem(this.selectedItemForModal.id);
      if (res.success && res.item) {
        this.selectedItemForModal = res.item;
        this.openItemDetailModal(res.item);
        this.refreshCurrencies();
        this.renderShipSlots();
        this.renderInventory();
        this.updateMainMenuDisplay();
        if (res.item.level >= EquipmentSystem.MAX_ITEM_LEVEL) {
          this.showHudToast(`🏆 ${res.item.name.toUpperCase()} A ATTEINT LE NIVEAU ULTIME 20 !`, false);
        } else {
          this.showHudToast(`⚡ ${res.item.name.toUpperCase()} AMÉLIORÉ AU NIV. ${res.item.level} !`, false);
        }
      } else {
        this.showHudToast(res.error || 'Amélioration impossible', true);
      }
    });
  }

  // --- GESTION DES ÉCRANS ---
  public showMainMenu() {
    this.elScreenMainMenu?.classList.add('active');
    this.elScreenMainMenu?.classList.remove('hidden');
    this.elScreenHangar?.classList.remove('active');
    this.elScreenHangar?.classList.add('hidden');
    this.elScreenMissions?.classList.remove('active');
    this.elScreenMissions?.classList.add('hidden');
    this.elScreenChallenges?.classList.remove('active');
    this.elScreenChallenges?.classList.add('hidden');
    this.closeChallengeVictoryModal();
    this.startPreviewLoop();
    this.refreshAll();
  }

  public showMissions() {
    this.stopPreviewLoop();
    this.elScreenMainMenu?.classList.remove('active');
    this.elScreenMainMenu?.classList.add('hidden');
    this.elScreenHangar?.classList.remove('active');
    this.elScreenHangar?.classList.add('hidden');
    this.elScreenChallenges?.classList.remove('active');
    this.elScreenChallenges?.classList.add('hidden');
    this.elScreenMissions?.classList.remove('hidden');
    this.elScreenMissions?.classList.add('active');
    this.switchMissionsMode('missions');
    this.refreshCurrencies();
    this.updateMainMenuDisplay();
  }

  public switchMissionsMode(mode: 'missions' | 'events') {
    this.activeMissionsMode = mode;
    this.elTabBtnMissions?.classList.toggle('active', mode === 'missions');
    this.elTabBtnEvents?.classList.toggle('active', mode === 'events');

    this.elViewModeMissions?.classList.toggle('hidden', mode !== 'missions');
    this.elViewModeEvents?.classList.toggle('hidden', mode !== 'events');

    const maxUnlocked = this.store.data.maxUnlockedMission;
    const isEventsUnlocked = maxUnlocked >= 15;
    if (this.elTabEventsLockBadge) {
      this.elTabEventsLockBadge.style.display = isEventsUnlocked ? 'none' : 'inline-block';
    }

    if (mode === 'events') {
      this.updateEventsDisplay();
    }
  }

  public showHangar(preselectFilter?: EquipmentSlotType) {
    // Nettoie l'alerte de nouveau butin
    this.store.data.hasNewLootNotification = false;
    this.store.save();

    this.elScreenMainMenu?.classList.remove('active');
    this.elScreenMainMenu?.classList.add('hidden');
    this.elScreenMissions?.classList.remove('active');
    this.elScreenMissions?.classList.add('hidden');
    this.elScreenChallenges?.classList.remove('active');
    this.elScreenChallenges?.classList.add('hidden');
    this.elScreenHangar?.classList.remove('hidden');
    this.elScreenHangar?.classList.add('active');

    const activeSkin = this.store.getSelectedSkin();
    this.currentSkinIndex = SKINS_CONFIG.findIndex(s => s.id === activeSkin.id);
    if (this.currentSkinIndex < 0) this.currentSkinIndex = 0;

    if (preselectFilter) {
      this.setInventoryFilter(preselectFilter);
    } else {
      this.setInventoryFilter('ALL');
    }

    this.startPreviewLoop();
    this.updateHangarShipDisplay();
    this.refreshCurrencies();
  }

  public show() {
    this.showMainMenu();
  }

  public hide() {
    this.stopPreviewLoop();
    this.elScreenMainMenu?.classList.remove('active');
    this.elScreenMainMenu?.classList.add('hidden');
    this.elScreenHangar?.classList.remove('active');
    this.elScreenHangar?.classList.add('hidden');
    this.elScreenMissions?.classList.remove('active');
    this.elScreenMissions?.classList.add('hidden');
    this.elScreenChallenges?.classList.remove('active');
    this.elScreenChallenges?.classList.add('hidden');
    this.closeItemDetailModal();
    this.closeRefineryModal();
    this.closeChallengeVictoryModal();
  }

  public refreshAll() {
    this.refreshCurrencies();
    this.updateMainMenuDisplay();
    this.updateHangarShipDisplay();
  }

  private refreshCurrencies() {
    const crys = (this.store.data.violetCrystals || 0).toLocaleString();
    const bars = (this.store.data.iridiumBars || 0).toLocaleString();
    const dust = (this.store.data.diamondDust || 0).toLocaleString();
    const diam = (this.store.data.diamonds || 0).toLocaleString();

    if (this.elCrystalsTotal) this.elCrystalsTotal.textContent = crys;
    if (this.elBarsTotal) this.elBarsTotal.textContent = bars;
    if (this.elDustTotal) this.elDustTotal.textContent = dust;
    if (this.elDiamondsTotal) this.elDiamondsTotal.textContent = diam;

    if (this.elHangarCrystals) this.elHangarCrystals.textContent = crys;
    if (this.elHangarBars) this.elHangarBars.textContent = bars;
    if (this.elHangarDust) this.elHangarDust.textContent = dust;
    if (this.elHangarDiamonds) this.elHangarDiamonds.textContent = diam;

    if (this.elMissionsScreenCrystals) this.elMissionsScreenCrystals.textContent = crys;
    if (this.elMissionsScreenBars) this.elMissionsScreenBars.textContent = bars;
    if (this.elMissionsScreenDiamonds) this.elMissionsScreenDiamonds.textContent = diam;
    if (this.elMissionsScreenDust) this.elMissionsScreenDust.textContent = dust;

    if (this.elChallengesScreenCrystals) this.elChallengesScreenCrystals.textContent = crys;
    if (this.elChallengesScreenBars) this.elChallengesScreenBars.textContent = bars;
    if (this.elChallengesScreenDiamonds) this.elChallengesScreenDiamonds.textContent = diam;
    if (this.elChallengesScreenDust) this.elChallengesScreenDust.textContent = dust;
  }

  // --- MENU PRINCIPAL (ACCUEIL) ---
  private updateMainMenuDisplay() {
    const activeSkin = this.store.getSelectedSkin();
    const equippedItemIds = this.store.getShipSlots(activeSkin.id).filter(id => id !== null);

    if (this.elSkinName) this.elSkinName.textContent = activeSkin.name;
    if (this.elSkinPerk) this.elSkinPerk.textContent = activeSkin.perkText;
    if (this.elMainSlotsBadge) {
      this.elMainSlotsBadge.textContent = `${activeSkin.slots.length} SLOTS`;
    }
    if (this.elMainEquippedPreview) {
      const activeSkinSlots = this.store.getShipSlots(activeSkin.id);
      this.elMainEquippedPreview.innerHTML = `
        <div class="mini-sockets-bar">
          ${activeSkinSlots.map(s => {
            const info = SLOT_INFO[s.slotType];
            const isFilled = s.item !== null;
            const rarityColor = s.item ? RARITY_CONFIGS[s.item.rarity].color : 'rgba(255, 255, 255, 0.15)';
            return `
              <span class="mini-socket-chip ${isFilled ? 'filled' : 'empty'}" style="border-color: ${rarityColor};" title="${info.label} : ${isFilled ? s.item!.name : 'Vide'}">
                <span class="mini-socket-icon">${info.icon}</span>
                <span class="mini-socket-status-dot ${isFilled ? 'active' : ''}" style="${isFilled ? `background: ${rarityColor}; box-shadow: 0 0 5px ${rarityColor};` : ''}"></span>
              </span>
            `;
          }).join('')}
        </div>
      `;
    }

    // Paliers de déblocage des stations galactiques
    const maxUnlocked = this.store.data.maxUnlockedMission;
    const isHangarUnlocked = maxUnlocked >= 5;
    const isChallengesUnlocked = maxUnlocked >= 5;
    const isRefineryUnlocked = maxUnlocked >= 10;
    const isEventsUnlocked = maxUnlocked >= 15;

    if (this.elTabEventsLockBadge) {
      this.elTabEventsLockBadge.style.display = isEventsUnlocked ? 'none' : 'inline-block';
    }

    // 1. Station Hangar (Niv 5)
    if (this.elBtnMainHangar) {
      if (isHangarUnlocked) {
        this.elBtnMainHangar.classList.remove('station-locked');
        this.elBtnMainHangar.classList.add('station-active');
        if (this.elHangarLockedOverlay) this.elHangarLockedOverlay.classList.add('hidden');
      } else {
        this.elBtnMainHangar.classList.remove('station-active');
        this.elBtnMainHangar.classList.add('station-locked');
        if (this.elHangarLockedOverlay) this.elHangarLockedOverlay.classList.remove('hidden');
      }
    }

    // 2. Station Défis (Niv 5)
    if (this.elBtnMainChallenges) {
      if (isChallengesUnlocked) {
        this.elBtnMainChallenges.classList.remove('station-locked');
        this.elBtnMainChallenges.classList.add('station-active');
        if (this.elChallengesLockedOverlay) this.elChallengesLockedOverlay.classList.add('hidden');
      } else {
        this.elBtnMainChallenges.classList.remove('station-active');
        this.elBtnMainChallenges.classList.add('station-locked');
        if (this.elChallengesLockedOverlay) this.elChallengesLockedOverlay.classList.remove('hidden');
      }
    }

    // 3. Station Raffinerie (Niv 10)
    if (this.elBtnMainRefinery) {
      if (isRefineryUnlocked) {
        this.elBtnMainRefinery.classList.remove('station-locked');
        this.elBtnMainRefinery.classList.add('station-active');
        if (this.elRefineryLockedOverlay) this.elRefineryLockedOverlay.classList.add('hidden');
      } else {
        this.elBtnMainRefinery.classList.remove('station-active');
        this.elBtnMainRefinery.classList.add('station-locked');
        if (this.elRefineryLockedOverlay) this.elRefineryLockedOverlay.classList.remove('hidden');
      }
    }

    // 4. Station Événements (Niv 15)
    if (this.elBtnMainEvents) {
      if (isEventsUnlocked) {
        this.elBtnMainEvents.classList.remove('station-locked');
        this.elBtnMainEvents.classList.add('station-active');
        if (this.elEventsMainLockedOverlay) this.elEventsMainLockedOverlay.classList.add('hidden');
      } else {
        this.elBtnMainEvents.classList.remove('station-active');
        this.elBtnMainEvents.classList.add('station-locked');
        if (this.elEventsMainLockedOverlay) this.elEventsMainLockedOverlay.classList.remove('hidden');
      }
    }

    // Notification de butin (seulement si Hangar débloqué)
    const hasLoot = !!this.store.data.hasNewLootNotification && isHangarUnlocked;
    if (this.elHangarAlertBadge) {
      if (hasLoot) this.elHangarAlertBadge.classList.remove('hidden');
      else this.elHangarAlertBadge.classList.add('hidden');
    }
    if (this.elHangarNotifDot) {
      if (hasLoot) this.elHangarNotifDot.classList.remove('hidden');
      else this.elHangarNotifDot.classList.add('hidden');
    }

    // Missions
    const mission = this.store.data.selectedMission;
    if (this.elLevelNum) this.elLevelNum.textContent = `${mission}`;
    if (this.elMissionsScreenLevelNum) this.elMissionsScreenLevelNum.textContent = `${mission}`;
    if (this.elMissionsQuickBadge) {
      this.elMissionsQuickBadge.textContent = `MISSION ${mission < 10 ? '0' + mission : mission}`;
    }
    if (this.elMissionLabel) {
      this.elMissionLabel.textContent = `MISSION ${mission < 10 ? '0' + mission : mission}`;
    }

    if (this.elMissionStatus) {
      const type = LevelGenerator.getMissionType(mission);
      if (type === 'escort') {
        this.elMissionStatus.textContent = '🛡️ DÉFENSE // ESCORTE';
        this.elMissionStatus.className = 'mission-type-tag escort';
      } else if (type === 'raid') {
        this.elMissionStatus.textContent = '⚡ RAID // ARMADA';
        this.elMissionStatus.className = 'mission-type-tag raid';
      } else {
        this.elMissionStatus.textContent = '🚀 EXPÉDITION';
        this.elMissionStatus.className = 'mission-type-tag expedition';
      }
    }

    this.renderMissionQuests(mission);
    this.updateMissionsUpgradesDisplay(mission);
  }

  private updateMissionsUpgradesDisplay(mission: number) {
    const lvl = this.store.data.levelUpgrades?.[mission] || {
      diamonds: 0,
      upgradeTracks: {
        fireRate: { tier: 1, step: 0, allowDiamondTierUp: false },
        damage: { tier: 1, step: 0, allowDiamondTierUp: false },
        diamondBoost: { tier: 1, step: 0, allowDiamondTierUp: false }
      }
    };

    if (this.elMissionActiveDiamondsVal) {
      this.elMissionActiveDiamondsVal.textContent = (lvl.diamonds || 0).toLocaleString();
    }

    const renderPips = (el: HTMLElement | null, step: number) => {
      if (!el) return;
      let html = '';
      for (let i = 0; i < 5; i++) {
        html += `<span class="track-pip ${i < step ? 'filled' : ''}"></span>`;
      }
      el.innerHTML = html;
    };

    // 1. Cadence
    const fr = lvl.upgradeTracks?.fireRate || { tier: 1, step: 0 };
    if (this.elTrackFireRateTierBadge) this.elTrackFireRateTierBadge.textContent = `PALIER ${fr.tier}`;
    if (this.elTrackFireRateStepLabel) this.elTrackFireRateStepLabel.textContent = `${fr.step}/5`;
    renderPips(this.elTrackFireRatePips, fr.step);

    // 2. Dégâts
    const dmg = lvl.upgradeTracks?.damage || { tier: 1, step: 0 };
    if (this.elTrackDamageTierBadge) this.elTrackDamageTierBadge.textContent = `PALIER ${dmg.tier}`;
    if (this.elTrackDamageStepLabel) this.elTrackDamageStepLabel.textContent = `${dmg.step}/5`;
    renderPips(this.elTrackDamagePips, dmg.step);

    // 3. Diamants
    const dia = lvl.upgradeTracks?.diamondBoost || { tier: 1, step: 0 };
    if (this.elTrackDiamondTierBadge) this.elTrackDiamondTierBadge.textContent = `PALIER ${dia.tier}`;
    if (this.elTrackDiamondStepLabel) this.elTrackDiamondStepLabel.textContent = `${dia.step}/5`;
    renderPips(this.elTrackDiamondPips, dia.step);

    // Boutons de recyclage & réinitialisation
    const diamondsAvailable = lvl.diamonds || 0;
    const canRecycle = diamondsAvailable >= 10;
    if (this.elBtnRecycleMissionDiamonds) {
      (this.elBtnRecycleMissionDiamonds as HTMLButtonElement).disabled = !canRecycle;
      this.elBtnRecycleMissionDiamonds.style.opacity = canRecycle ? '1' : '0.45';
      const dustWillGain = Math.floor(diamondsAvailable / 10);
      const subEl = this.elBtnRecycleMissionDiamonds.querySelector('.recycle-btn-sub');
      if (subEl) {
        if (canRecycle) {
          subEl.innerHTML = `Convertit ${diamondsAvailable - (diamondsAvailable % 10)} 💎 ➔ +${dustWillGain} <span class="icon-diamond-dust"></span> Poudre`;
        } else {
          subEl.textContent = `Nécessite au moins 10 💎 sur cette mission (Actuel: ${diamondsAvailable})`;
        }
      }
    }

    if (this.elBtnRefundMissionUpgrades) {
      const hasUpgrades = (fr.tier > 1 || fr.step > 0) || (dmg.tier > 1 || dmg.step > 0) || (dia.tier > 1 || dia.step > 0);
      (this.elBtnRefundMissionUpgrades as HTMLButtonElement).disabled = !hasUpgrades;
      this.elBtnRefundMissionUpgrades.style.opacity = hasUpgrades ? '1' : '0.45';
    }
  }

  private renderMissionQuests(mission: number) {
    if (!this.elMissionQuestsList) return;
    const quests = this.store.getQuestsForMission(mission);

    this.elMissionQuestsList.innerHTML = quests.map(q => {
      let badgeHtml = '';
      let rewardTag = `<span class="quest-item-reward">+${q.rewardIridium} <span class="icon-iridium"></span></span>`;

      if (q.isCompleted) {
        badgeHtml = `<span class="quest-status-chip validated">✅ VALIDÉ</span>`;
        rewardTag = `<span class="quest-item-reward earned">1 <span class="icon-iridium"></span> OBTENU</span>`;
      } else if (q.isClassified) {
        badgeHtml = `<span class="quest-status-chip locked">🔒 ???</span>`;
        rewardTag = `<span class="quest-item-reward">+1 <span class="icon-iridium"></span></span>`;
      } else {
        badgeHtml = `<span class="quest-status-chip pending">⭕ EN COURS</span>`;
        rewardTag = `<span class="quest-item-reward">+1 <span class="icon-iridium"></span></span>`;
      }

      return `
        <div class="hangar-quest-item ${q.isCompleted ? 'quest-item-completed' : ''}">
          <div class="quest-item-left">
            ${badgeHtml}
            <div class="quest-item-details">
              <span class="quest-item-title">${q.title}</span>
              <span class="quest-item-desc">${q.desc}</span>
            </div>
          </div>
          <div class="quest-item-right">
            ${rewardTag}
          </div>
        </div>
      `;
    }).join('');
  }

  // --- HANGAR & ÉQUIPEMENTS DÉDIÉ ---
  private updateHangarShipDisplay() {
    const skin = SKINS_CONFIG[this.currentSkinIndex];
    if (!skin) return;

    if (this.elHangarShipName) this.elHangarShipName.textContent = skin.name;
    if (this.elHangarShipArchetype) this.elHangarShipArchetype.textContent = skin.archetype.toUpperCase();
    if (this.elHangarShipSlotsCount) {
      this.elHangarShipSlotsCount.textContent = `${skin.slots.length} SLOTS D'ÉQUIPEMENT`;
    }
    if (this.elHangarShipPerkText) this.elHangarShipPerkText.textContent = skin.perkText;

    const isUnlocked = this.store.data.unlockedSkinIds.includes(skin.id);
    const isEquipped = this.store.data.selectedSkinId === skin.id;

    if (this.elBtnHangarSelectSkin) {
      if (isEquipped) {
        this.elBtnHangarSelectSkin.textContent = 'ÉQUIPÉ';
        this.elBtnHangarSelectSkin.className = 'btn-action-small btn-ship-equip-action equipped';
      } else if (isUnlocked) {
        this.elBtnHangarSelectSkin.textContent = 'CHOISIR CE VAISSEAU';
        this.elBtnHangarSelectSkin.className = 'btn-action-small btn-ship-equip-action ready';
      } else {
        const barCost = skin.costInBars ?? skin.costInCrystals;
        this.elBtnHangarSelectSkin.innerHTML = `DÉBLOQUER (<span class="icon-iridium-bar"></span> ${barCost})`;
        const canAfford = (this.store.data.iridiumBars || 0) >= barCost;
        this.elBtnHangarSelectSkin.className = `btn-action-small btn-ship-equip-action buy ${canAfford ? '' : 'disabled'}`;
      }
    }

    this.renderShipSlots();
    this.renderInventory();
  }

  private renderShipSlots() {
    const skin = SKINS_CONFIG[this.currentSkinIndex];
    if (!skin || !this.elHangarSlotsContainer) return;

    const isUnlocked = this.store.data.unlockedSkinIds.includes(skin.id);
    const shipSlots = this.store.getShipSlots(skin.id);
    const filledCount = shipSlots.filter(s => s.item !== null).length;

    if (this.elHangarSlotsFilledBadge) {
      if (isUnlocked) {
        this.elHangarSlotsFilledBadge.textContent = `${filledCount} / ${skin.slots.length}`;
        this.elHangarSlotsFilledBadge.className = 'slots-filled-badge';
      } else {
        this.elHangarSlotsFilledBadge.textContent = '🔒 VERROUILLÉ';
        this.elHangarSlotsFilledBadge.className = 'slots-filled-badge locked';
      }
    }

    if (!isUnlocked) {
      const barCost = skin.costInBars ?? skin.costInCrystals;
      this.elHangarSlotsContainer.innerHTML = `
        <div class="ship-locked-notice" role="button" title="Débloquer ce vaisseau">
          <span class="locked-notice-icon">🔒</span>
          <div class="locked-notice-text">
            <span class="locked-notice-title">VAISSEAU NON DÉBLOQUÉ</span>
            <span class="locked-notice-sub">Utilisez ${barCost} Barres d'Iridium pour débloquer ses ${skin.slots.length} emplacements.</span>
          </div>
        </div>
        <div class="ship-slots-socket-row">
          ${skin.slots.map((slotType, index) => {
            const slotInfo = SLOT_INFO[slotType];
            return `
              <div class="ship-slot-socket locked-socket" data-slot-index="${index}" title="${slotInfo.label} (Verrouillé)">
                <div class="socket-frame locked">
                  <span class="socket-icon">${slotInfo.icon}</span>
                  <span class="socket-lock-badge">🔒</span>
                </div>
                <div class="socket-meta">
                  <span class="socket-type-label">${slotInfo.label.toUpperCase()}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      this.elHangarSlotsContainer.querySelectorAll('.locked-socket, .ship-locked-notice').forEach(el => {
        el.addEventListener('click', () => {
          this.promptUnlockCurrentSkin();
        });
      });

      this.updateEquippedStatsSummary(skin.id);
      return;
    }

    // Vaisseau débloqué : Rendu des sockets d'équipement avec icônes
    this.elHangarSlotsContainer.innerHTML = `
      <div class="ship-slots-socket-row">
        ${shipSlots.map((slotData, index) => {
          const slotType = slotData.slotType;
          const slotInfo = SLOT_INFO[slotType];
          const item = slotData.item;

          if (item) {
            const rarityCfg = RARITY_CONFIGS[item.rarity];
            const primaryStat = item.stats[0]?.label || '';

            return `
              <div class="ship-slot-socket equipped-socket" data-slot-index="${index}" style="border-color: ${rarityCfg.color}; box-shadow: 0 0 12px ${rarityCfg.bgGlow};">
                <button class="btn-socket-quick-remove" data-slot-index="${index}" title="Déséquiper">✕</button>
                <div class="socket-frame equipped" data-item-id="${item.id}" style="background: ${rarityCfg.color}18;">
                  <span class="socket-icon">${slotInfo.icon}</span>
                  <span class="socket-rarity-dot" style="background: ${rarityCfg.color}; box-shadow: 0 0 6px ${rarityCfg.color};"></span>
                  <span class="socket-lvl-tag">NIV.${item.level}</span>
                </div>
                <div class="socket-meta" data-item-id="${item.id}">
                  <span class="socket-item-title" style="color: ${rarityCfg.color};">${item.name}</span>
                  <span class="socket-stat-hint">${primaryStat}</span>
                </div>
              </div>
            `;
          } else {
            return `
              <div class="ship-slot-socket empty-socket" data-slot-index="${index}" data-slot-type="${slotType}" title="Équiper ${slotInfo.label}">
                <div class="socket-frame empty">
                  <span class="socket-icon">${slotInfo.icon}</span>
                  <span class="socket-add-plus">+</span>
                </div>
                <div class="socket-meta">
                  <span class="socket-type-label">${slotInfo.label.toUpperCase()}</span>
                  <span class="socket-empty-sub">+ ÉQUIPER</span>
                </div>
              </div>
            `;
          }
        }).join('')}
      </div>
    `;

    // Listeners sur les sockets équipés
    this.elHangarSlotsContainer.querySelectorAll('.equipped-socket .socket-frame, .equipped-socket .socket-meta').forEach(el => {
      el.addEventListener('click', () => {
        const itemId = el.getAttribute('data-item-id');
        const item = this.store.data.inventory.find(i => i.id === itemId);
        if (item) this.openItemDetailModal(item);
      });
    });

    // Bouton de déséquipement rapide
    this.elHangarSlotsContainer.querySelectorAll('.btn-socket-quick-remove').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const slotIdx = Number(el.getAttribute('data-slot-index'));
        this.store.unequipItem(skin.id, slotIdx);
        this.renderShipSlots();
        this.renderInventory();
        this.updateMainMenuDisplay();
      });
    });

    // Listeners sur les sockets vides
    this.elHangarSlotsContainer.querySelectorAll('.empty-socket').forEach(el => {
      el.addEventListener('click', () => {
        const sType = el.getAttribute('data-slot-type') as EquipmentSlotType;
        if (sType) this.setInventoryFilter(sType);
      });
    });

    this.updateEquippedStatsSummary(skin.id);
  }

  private promptUnlockCurrentSkin() {
    const skin = SKINS_CONFIG[this.currentSkinIndex];
    if (!skin || this.store.data.unlockedSkinIds.includes(skin.id)) return;

    const barCost = skin.costInBars ?? skin.costInCrystals;
    const playerBars = this.store.data.iridiumBars || 0;

    if (playerBars >= barCost) {
      ModalConfirmCrystal.show(
        `DÉBLOQUER ${skin.name.toUpperCase()}`,
        `Veux-tu utiliser ${barCost} Barres d'Iridium <span class="icon-iridium-bar"></span> pour forger et débloquer ce vaisseau ?`,
        () => {
          const bought = this.store.unlockSkin(skin.id);
          if (bought) {
            this.refreshAll();
            this.updateHangarShipDisplay();
            this.updateMainMenuDisplay();
            this.showHudToast(`🚀 ${skin.name.toUpperCase()} DÉBLOQUÉ AVEC SUCCÈS !`, false);
          }
        }
      );
    } else {
      ModalConfirmCrystal.show(
        `VAISSEAU VERROUILLÉ`,
        `Il te faut ${barCost} Barres d'Iridium <span class="icon-iridium-bar"></span> pour forger le ${skin.name}. Tu as actuellement ${playerBars} Barre${playerBars > 1 ? 's' : ''}.<br><br>💡 <em>Fonde ton minerai d'iridium brut dans la Raffinerie Lunaire pour obtenir des barres d'iridium !</em>`,
        () => {}
      );
    }
  }

  private updateEquippedStatsSummary(shipId: string) {
    if (!this.elHangarEquippedSummary) return;
    const stats = this.store.getEquippedStats(shipId);

    const chips: string[] = [];

    const dmgBonus = Math.round((stats.damageMultiplier - 1.0) * 100);
    if (dmgBonus > 0) chips.push(`<span class="stat-chip dmg">💥 Dégâts +${dmgBonus}%</span>`);

    const frBonus = Math.round((stats.fireRateMultiplier - 1.0) * 100);
    if (frBonus > 0) chips.push(`<span class="stat-chip fr">⚡ Cadence +${frBonus}%</span>`);

    const spdBonus = Math.round((stats.speedMultiplier - 1.0) * 100);
    if (spdBonus > 0) chips.push(`<span class="stat-chip spd">💨 Vitesse +${spdBonus}%</span>`);

    const diaBonus = Math.round((stats.diamondMultiplier - 1.0) * 100);
    if (diaBonus > 0) chips.push(`<span class="stat-chip dia">💎 Diamants +${diaBonus}%</span>`);

    if (stats.bonusStartingShips > 0) {
      chips.push(`<span class="stat-chip flt">🚀 Flotte Début +${stats.bonusStartingShips}</span>`);
    }

    if (stats.activeEffectDescriptions && stats.activeEffectDescriptions.length > 0) {
      for (const fxDesc of stats.activeEffectDescriptions) {
        chips.push(`<span class="stat-chip fx" style="border-color: #FFE600; color: #FFE600; background: rgba(255, 230, 0, 0.12); box-shadow: 0 0 8px rgba(255, 230, 0, 0.25);">${fxDesc}</span>`);
      }
    }

    if (chips.length === 0) {
      this.elHangarEquippedSummary.innerHTML = `<span class="stat-chip empty">Aucun équipement installé</span>`;
    } else {
      this.elHangarEquippedSummary.innerHTML = chips.join('');
    }
  }

  private setInventoryFilter(filter: 'ALL' | EquipmentSlotType) {
    this.activeInventoryFilter = filter;
    const tabs = document.querySelectorAll('.inventory-tabs-row .inv-tab-btn');
    tabs.forEach(tab => {
      if (tab.getAttribute('data-filter') === filter) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    this.renderInventory();
  }

  private renderInventory() {
    if (!this.elHangarInventoryGrid) return;

    let items = this.store.data.inventory;
    if (this.activeInventoryFilter === 'CHEST') {
      items = items.filter(i => i.isChest || i.slotType === 'CHEST');
    } else if (this.activeInventoryFilter !== 'ALL') {
      items = items.filter(i => !i.isChest && i.slotType === this.activeInventoryFilter);
    } else {
      // Pour 'ALL' : placer les coffres scellés en premier
      items = [...items].sort((a, b) => {
        const aIsChest = (a.isChest || a.slotType === 'CHEST') ? 1 : 0;
        const bIsChest = (b.isChest || b.slotType === 'CHEST') ? 1 : 0;
        return bIsChest - aIsChest;
      });
    }

    // Mise à jour du badge d'alerte du nombre de coffres
    const chestCount = this.store.getChestsCount();
    if (this.elHangarChestsCountPill) {
      if (chestCount > 0) {
        this.elHangarChestsCountPill.classList.remove('hidden');
        this.elHangarChestsCountPill.textContent = `${chestCount}`;
      } else {
        this.elHangarChestsCountPill.classList.add('hidden');
      }
    }

    if (this.elHangarInventoryCount) {
      this.elHangarInventoryCount.textContent = `${this.store.data.inventory.length} OBJETS`;
    }

    if (items.length === 0) {
      if (this.elHangarInventoryEmpty) this.elHangarInventoryEmpty.classList.remove('hidden');
      this.elHangarInventoryGrid.innerHTML = '';
      return;
    }

    if (this.elHangarInventoryEmpty) this.elHangarInventoryEmpty.classList.add('hidden');

    const viewedSkin = SKINS_CONFIG[this.currentSkinIndex];

    this.elHangarInventoryGrid.innerHTML = items.map(item => {
      // Affichage spécifique des Coffres Scellés
      if (item.isChest || item.slotType === 'CHEST') {
        return `
          <div class="inv-item-card inv-card-chest" data-item-id="${item.id}" style="border-color: #F59E0B; box-shadow: 0 0 16px rgba(245, 158, 11, 0.45); background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%);">
            <div class="inv-card-top">
              <span class="inv-card-slot-icon chest-bounce">📦</span>
              <span class="inv-card-rarity-tag" style="background: rgba(245, 158, 11, 0.2); color: #F59E0B; border: 1px solid #F59E0B;">SCELLÉ</span>
              <span class="inv-card-lvl">MISSION ${item.sourceMission || item.level}</span>
            </div>
            <div class="inv-card-title" style="color: #FCD34D;">${item.name}</div>
            <div class="inv-card-chest-hint">Trésor spatial scellé à ouvrir</div>
            <div class="inv-card-bottom">
              <span class="inv-item-status-pill chest-action-pill">🔓 OUVRIR</span>
            </div>
          </div>
        `;
      }

      const rarityCfg = RARITY_CONFIGS[item.rarity];
      const slotInfo = SLOT_INFO[item.slotType];

      // Vérifie si cet objet est équipé sur un vaisseau
      let equippedOnShipName: string | null = null;
      let isEquippedOnCurrentShip = false;

      for (const [shipId, slots] of Object.entries(this.store.data.shipEquippedSlots)) {
        if (slots.includes(item.id)) {
          const skin = SKINS_CONFIG.find(s => s.id === shipId);
          equippedOnShipName = skin ? skin.name : shipId;
          if (shipId === viewedSkin.id) isEquippedOnCurrentShip = true;
          break;
        }
      }

      let statusPillHtml = '';
      if (isEquippedOnCurrentShip) {
        statusPillHtml = `<span class="inv-item-status-pill current-ship">ÉQUIPÉ</span>`;
      } else if (equippedOnShipName) {
        statusPillHtml = `<span class="inv-item-status-pill other-ship">SUR ${equippedOnShipName.toUpperCase()}</span>`;
      }

      const fx = EquipmentSystem.ensureItemSpecialEffect(item);
      const fxHtml = fx ? `<div class="inv-card-special-fx"><span class="fx-icon">${fx.icon}</span> ${fx.label}</div>` : '';
      const primaryStat = item.stats[0]?.label || '';
      const otherAffixesCount = Math.max(0, item.stats.length - 1);
      const extraAffixesTag = otherAffixesCount > 0 ? `<span class="inv-more-affixes">+${otherAffixesCount} stat(s)</span>` : '';

      return `
        <div class="inv-item-card" data-item-id="${item.id}" style="border-color: ${rarityCfg.color}; box-shadow: 0 0 10px ${rarityCfg.bgGlow};">
          <div class="inv-card-top">
            <span class="inv-card-slot-icon">${slotInfo.icon}</span>
            <span class="inv-card-rarity-tag" style="background: ${rarityCfg.color}22; color: ${rarityCfg.color}; border: 1px solid ${rarityCfg.color};">${rarityCfg.name}</span>
            <span class="inv-card-lvl">NIV. ${item.level}</span>
          </div>

          <div class="inv-card-title" style="color: ${rarityCfg.color};">${item.name}</div>
          ${fxHtml}
          ${primaryStat ? `<div class="inv-card-stat">${primaryStat}</div>` : ''}
          
          <div class="inv-card-bottom">
            ${statusPillHtml}
            ${extraAffixesTag}
          </div>
        </div>
      `;
    }).join('');

    // Listener sur chaque carte d'objet (gestion coffres vs équipements)
    this.elHangarInventoryGrid.querySelectorAll('.inv-item-card').forEach(el => {
      el.addEventListener('click', () => {
        const itemId = el.getAttribute('data-item-id');
        const item = this.store.data.inventory.find(i => i.id === itemId);
        if (item) {
          if (item.isChest || item.slotType === 'CHEST') {
            this.openChestModal(item);
          } else {
            this.openItemDetailModal(item);
          }
        }
      });
    });
  }

  // --- MODAL D'INSPECTION D'OBJET ---
  private openItemDetailModal(item: EquipmentItem) {
    this.selectedItemForModal = item;
    const rarityCfg = RARITY_CONFIGS[item.rarity];
    const slotInfo = SLOT_INFO[item.slotType];
    const viewedSkin = SKINS_CONFIG[this.currentSkinIndex];

    if (this.elItemModalIcon) this.elItemModalIcon.textContent = slotInfo.icon;
    if (this.elItemModalName) {
      this.elItemModalName.textContent = item.name;
      this.elItemModalName.style.color = rarityCfg.color;
      this.elItemModalName.style.textShadow = `0 0 10px ${rarityCfg.bgGlow}`;
    }

    if (this.elItemModalRarity) {
      this.elItemModalRarity.textContent = rarityCfg.name;
      this.elItemModalRarity.style.color = rarityCfg.color;
      this.elItemModalRarity.style.background = `${rarityCfg.color}22`;
      this.elItemModalRarity.style.borderColor = rarityCfg.color;
    }

    if (this.elItemModalSlotType) this.elItemModalSlotType.textContent = slotInfo.label.toUpperCase();
    if (this.elItemModalLevel) this.elItemModalLevel.textContent = `NIV. ${item.level}`;
    if (this.elItemModalDesc) this.elItemModalDesc.textContent = slotInfo.desc;

    // Rendu de l'Effet Spécial Unique
    const fx = EquipmentSystem.ensureItemSpecialEffect(item);
    const elFxBox = document.getElementById('item-modal-special-effect-box');
    const elFxIcon = document.getElementById('item-modal-fx-icon');
    const elFxLabel = document.getElementById('item-modal-fx-label');
    const elFxDesc = document.getElementById('item-modal-fx-desc');

    if (elFxBox) {
      if (fx && fx.type !== 'NONE') {
        elFxBox.style.display = 'block';
        elFxBox.style.borderColor = rarityCfg.color;
        elFxBox.style.boxShadow = `0 0 12px ${rarityCfg.bgGlow}`;
        if (elFxIcon) elFxIcon.textContent = fx.icon;
        if (elFxLabel) {
          elFxLabel.textContent = fx.label;
          elFxLabel.style.color = rarityCfg.color;
        }
        if (elFxDesc) {
          const nextUnlock = EquipmentSystem.getNextUnlockInfo(fx.type, item.rarity, item.level);
          elFxDesc.innerHTML = `${fx.description}${nextUnlock ? `<div class="special-effect-next-unlock" style="margin-top: 6px; font-size: 0.72rem; color: #38bdf8; font-style: italic;">✦ ${nextUnlock}</div>` : ''}`;
        }
      } else {
        // Objet standard sans effet spécial mais avec stats primaires boostées
        elFxBox.style.display = 'block';
        elFxBox.style.borderColor = '#64748b';
        elFxBox.style.boxShadow = 'none';
        if (elFxIcon) elFxIcon.textContent = '🛡️';
        if (elFxLabel) {
          elFxLabel.textContent = 'ÉQUIPEMENT RENFORCÉ';
          elFxLabel.style.color = '#94a3b8';
        }
        if (elFxDesc) {
          elFxDesc.textContent = 'Objet standard sans effet spécial mais doté d\'une statistique primaire accrue (+30% bonus de base).';
        }
      }
    }

    if (this.elItemModalAffixesList) {
      if (item.stats.length === 0) {
        this.elItemModalAffixesList.innerHTML = `
          <div class="modal-affix-item" style="opacity: 0.6; font-style: italic;">
            <span class="modal-affix-bullet">•</span>
            <span class="modal-affix-text">Aucune stat mineure (Effet spécial principal actif)</span>
          </div>
        `;
      } else {
        this.elItemModalAffixesList.innerHTML = item.stats.map(stat => `
          <div class="modal-affix-item">
            <span class="modal-affix-bullet" style="color: ${rarityCfg.color};">✦</span>
            <span class="modal-affix-text">${stat.label}</span>
          </div>
        `).join('');
      }
    }

    if (this.elItemModalRecycleVal) {
      this.elItemModalRecycleVal.textContent = `💎 +${rarityCfg.recycleDiamonds} Diamants`;
    }

    // Configuration de la section d'amélioration (Poudre de Diamant & Barres d'Iridium)
    const { dustCost, iridiumBarsCost } = EquipmentSystem.getUpgradeCost(item);
    const playerDust = this.store.data.diamondDust || 0;
    const playerBars = this.store.data.iridiumBars || 0;
    const maxUnlocked = Math.max(1, this.store.data.maxUnlockedMission || 1);

    if (this.elItemUpgradeCostVal) {
      this.elItemUpgradeCostVal.textContent = dustCost.toString();
    }
    const elBarsCostPill = document.getElementById('item-modal-upgrade-bars-cost');
    const elBarsCostVal = document.getElementById('item-upgrade-bars-cost-val');
    if (elBarsCostPill && elBarsCostVal) {
      if (iridiumBarsCost > 0) {
        elBarsCostPill.classList.remove('hidden');
        elBarsCostVal.textContent = iridiumBarsCost.toString();
      } else {
        elBarsCostPill.classList.add('hidden');
      }
    }

    const elUpgradeDesc = document.getElementById('item-modal-upgrade-desc');
    const isMaxLevel = item.level >= EquipmentSystem.MAX_ITEM_LEVEL;
    const isLockedByMission = item.level >= maxUnlocked;
    const hasEnoughDust = playerDust >= dustCost;
    const hasEnoughBars = playerBars >= iridiumBarsCost;

    if (this.elItemNextLevelVal) {
      this.elItemNextLevelVal.textContent = isMaxLevel ? 'MAX' : (item.level + 1).toString();
    }

    if (elUpgradeDesc) {
      if (isMaxLevel) {
        elUpgradeDesc.textContent = `🏆 Cet équipement a atteint son potentiel maximal absolu (Niveau ${EquipmentSystem.MAX_ITEM_LEVEL}).`;
      } else if (isLockedByMission) {
        elUpgradeDesc.textContent = `🔒 Niveau bloqué : Terminez la Mission ${item.level} pour débloquer la Mission ${item.level + 1} et pouvoir l'améliorer.`;
      } else if (item.level === 19) {
        elUpgradeDesc.textContent = `⭐ AMÉLIORATION ULTIME : Débloque le palier final de l'effet spécial (Coûte 10 Barres d'Iridium et de la Poudre) !`;
      } else {
        elUpgradeDesc.textContent = `Améliore le niveau de cet équipement (+12% aux statistiques passives et progression de l'effet spécial).`;
      }
    }

    if (this.elBtnModalUpgradeItem) {
      if (isMaxLevel) {
        this.elBtnModalUpgradeItem.setAttribute('disabled', 'true');
        this.elBtnModalUpgradeItem.className = 'btn-modal-upgrade maxed';
        this.elBtnModalUpgradeItem.innerHTML = `<span>🏆 NIVEAU MAXIMUM (20)</span>`;
      } else if (isLockedByMission) {
        this.elBtnModalUpgradeItem.setAttribute('disabled', 'true');
        this.elBtnModalUpgradeItem.className = 'btn-modal-upgrade locked';
        this.elBtnModalUpgradeItem.innerHTML = `<span>🔒 REQUIS : MISSION ${item.level + 1} DÉBLOQUÉE</span>`;
      } else if (!hasEnoughBars) {
        this.elBtnModalUpgradeItem.setAttribute('disabled', 'true');
        this.elBtnModalUpgradeItem.className = 'btn-modal-upgrade disabled';
        this.elBtnModalUpgradeItem.innerHTML = `<span>⚠️ 10 BARRES D'IRIDIUM REQUISES (${playerBars}/10 <span class="icon-iridium-bar"></span>)</span>`;
      } else if (!hasEnoughDust) {
        this.elBtnModalUpgradeItem.setAttribute('disabled', 'true');
        this.elBtnModalUpgradeItem.className = 'btn-modal-upgrade disabled';
        this.elBtnModalUpgradeItem.innerHTML = `<span>⚠️ POUDRE INSUFFISANTE (${playerDust.toLocaleString()}/${dustCost.toLocaleString()} <span class="icon-diamond-dust"></span>)</span>`;
      } else if (item.level === 19) {
        this.elBtnModalUpgradeItem.removeAttribute('disabled');
        this.elBtnModalUpgradeItem.className = 'btn-modal-upgrade ultimate';
        this.elBtnModalUpgradeItem.innerHTML = `<span>⭐ AMÉLIORER AU NIVEAU ULTIME 20 (10 <span class="icon-iridium-bar"></span> + ${dustCost.toLocaleString()} <span class="icon-diamond-dust"></span>)</span>`;
      } else {
        this.elBtnModalUpgradeItem.removeAttribute('disabled');
        this.elBtnModalUpgradeItem.className = 'btn-modal-upgrade';
        this.elBtnModalUpgradeItem.innerHTML = `<span>⚡ AMÉLIORER AU NIVEAU ${item.level + 1} (${dustCost.toLocaleString()} <span class="icon-diamond-dust"></span>)</span>`;
      }
    }

    // Gestion de l'état des boutons d'action
    const currentSkinSlots = this.store.getShipSlots(viewedSkin.id);
    const isEquippedOnCurrentSkin = currentSkinSlots.some(s => s.item?.id === item.id);
    const hasCompatibleSlot = viewedSkin.slots.includes(item.slotType);
    const isCurrentSkinUnlocked = this.store.data.unlockedSkinIds.includes(viewedSkin.id);

    if (this.elBtnModalUnequip) {
      if (isEquippedOnCurrentSkin) {
        this.elBtnModalUnequip.classList.remove('hidden');
      } else {
        this.elBtnModalUnequip.classList.add('hidden');
      }
    }

    if (this.elBtnModalEquip) {
      if (isEquippedOnCurrentSkin) {
        this.elBtnModalEquip.classList.add('hidden');
      } else if (!isCurrentSkinUnlocked) {
        this.elBtnModalEquip.classList.remove('hidden');
        this.elBtnModalEquip.setAttribute('disabled', 'true');
        this.elBtnModalEquip.className = 'btn-primary btn-modal-equip disabled';
        this.elBtnModalEquip.innerHTML = `🔒 DÉBLOQUEZ D'ABORD ${viewedSkin.name.toUpperCase()}`;
      } else if (!hasCompatibleSlot) {
        this.elBtnModalEquip.classList.remove('hidden');
        this.elBtnModalEquip.setAttribute('disabled', 'true');
        this.elBtnModalEquip.className = 'btn-primary btn-modal-equip disabled';
        this.elBtnModalEquip.textContent = `AUCUN SLOT ${slotInfo.label.toUpperCase()} SUR CE VAISSEAU`;
      } else {
        this.elBtnModalEquip.classList.remove('hidden');
        this.elBtnModalEquip.removeAttribute('disabled');
        this.elBtnModalEquip.className = 'btn-primary btn-modal-equip';
        this.elBtnModalEquip.textContent = `ÉQUIPER SUR ${viewedSkin.name.toUpperCase()}`;
      }
    }

    this.elModalItemDetail?.classList.remove('hidden');
  }

  private closeItemDetailModal() {
    this.elModalItemDetail?.classList.add('hidden');
    this.selectedItemForModal = null;
  }

  // --- RENDU 3D DES VAISSEAUX DANS LES CANVASES ---
  public startPreviewLoop() {
    if (this.isPreviewRunning) return;
    this.isPreviewRunning = true;
    const render = () => {
      if (!this.isPreviewRunning) return;
      this.drawShipPreviews();
      this.previewAnimFrame = requestAnimationFrame(render);
    };
    this.previewAnimFrame = requestAnimationFrame(render);
  }

  public stopPreviewLoop() {
    this.isPreviewRunning = false;
    if (this.previewAnimFrame) {
      cancelAnimationFrame(this.previewAnimFrame);
      this.previewAnimFrame = 0;
    }
  }

  private drawShipPreviews() {
    // Si aucun écran utilisant un canvas de vaisseau n'est visible, ne rien calculer !
    const isMainMenuVisible = !!(this.elScreenMainMenu && !this.elScreenMainMenu.classList.contains('hidden'));
    const isHangarVisible = !!(this.elScreenHangar && !this.elScreenHangar.classList.contains('hidden'));
    if (!isMainMenuVisible && !isHangarVisible) return;

    this.previewAngle += 0.025;

    // 1. Dessin sur le canvas du menu principal (Vaisseau actif équipé) UNIQUEMENT si visible
    if (isMainMenuVisible && this.mainPreviewCtx && this.mainPreviewCanvas) {
      const activeSkin = this.store.getSelectedSkin();
      this.drawSingleShip(this.mainPreviewCtx, this.mainPreviewCanvas, activeSkin, 0.60);
    }

    // 2. Dessin sur le canvas du hangar (Vaisseau actuellement visionné) UNIQUEMENT si visible
    if (isHangarVisible && this.hangarCtx && this.hangarCanvas) {
      const viewedSkin = SKINS_CONFIG[this.currentSkinIndex] || SKINS_CONFIG[0];
      this.drawSingleShip(this.hangarCtx, this.hangarCanvas, viewedSkin, 0.85);
    }
  }

  private drawSingleShip(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, skin: ShipSkin, scaleFactor: number) {
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2 + 2);
    ctx.scale(scaleFactor, scaleFactor);

    // Oscillation et inclinaison dynamique
    const hoverY = Math.sin(this.previewAngle * 1.5) * 4;
    ctx.translate(0, hoverY);
    ctx.rotate(Math.sin(this.previewAngle) * 0.12);

    // Ombre / Aura lumineuse (valeur légère pour préserver 60 FPS)
    if (Renderer.enableGlow) {
      ctx.shadowColor = skin.glowColor;
      ctx.shadowBlur = 10;
    }

    // Coque du vaisseau
    ctx.fillStyle = '#070b1e';
    ctx.strokeStyle = skin.primaryColor;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.lineTo(40, 30);
    ctx.lineTo(20, 20);
    ctx.lineTo(0, 35);
    ctx.lineTo(-20, 20);
    ctx.lineTo(-40, 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Ailes intérieures
    ctx.fillStyle = skin.secondaryColor;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(25, 20);
    ctx.lineTo(0, 10);
    ctx.lineTo(-25, 20);
    ctx.closePath();
    ctx.fill();

    // Verrière cockpit
    ctx.fillStyle = '#FFFFFF';
    if (Renderer.enableGlow) {
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 8;
    }
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.lineTo(8, -10);
    ctx.lineTo(0, -5);
    ctx.lineTo(-8, -10);
    ctx.closePath();
    ctx.fill();

    // Réacteur plasma
    if (Renderer.enableGlow) {
      ctx.shadowColor = skin.primaryColor;
      ctx.shadowBlur = 16;
    }
    ctx.fillStyle = skin.primaryColor;
    ctx.beginPath();
    ctx.arc(0, 28, 6 + Math.sin(this.previewAngle * 8) * 2, 0, Math.PI * 2);
    ctx.fill();

    if (Renderer.enableGlow) {
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  // --- GESTION DE LA RAFFINERIE LUNAIRE & FONDERIE D'IRIDIUM ---
  private openRefineryModal() {
    this.updateRefineryDisplay();
    if (this.elRefineryFeedbackMsg) {
      this.elRefineryFeedbackMsg.classList.add('hidden');
      this.elRefineryFeedbackMsg.textContent = '';
    }
    this.elModalRefinery?.classList.remove('hidden');
  }

  private closeRefineryModal() {
    this.elModalRefinery?.classList.add('hidden');
  }

  private updateRefineryDisplay() {
    const totalDiamonds = this.store.getTotalRemainingDiamonds();
    const dust = this.store.data.diamondDust || 0;
    const ore = this.store.data.violetCrystals || 0;
    const bars = this.store.data.iridiumBars || 0;

    if (this.elRefineryTotalDiamondsVal) this.elRefineryTotalDiamondsVal.textContent = totalDiamonds.toLocaleString();
    if (this.elRefineryDustVal) this.elRefineryDustVal.textContent = dust.toLocaleString();
    if (this.elRefineryIridiumOreVal) this.elRefineryIridiumOreVal.textContent = ore.toLocaleString();
    if (this.elRefineryIridiumBarsVal) this.elRefineryIridiumBarsVal.textContent = bars.toLocaleString();

    // 1. Atelier Diamants -> Poudre
    const canSmelt50Diamonds = totalDiamonds >= 50;
    const canSmeltAnyDiamonds = totalDiamonds >= 10;

    if (this.elBtnSmeltDiamondsUnit) {
      if (canSmelt50Diamonds || canSmeltAnyDiamonds) {
        this.elBtnSmeltDiamondsUnit.removeAttribute('disabled');
      } else {
        this.elBtnSmeltDiamondsUnit.setAttribute('disabled', 'true');
      }
    }

    if (this.elBtnSmeltDiamondsAll) {
      if (canSmeltAnyDiamonds) {
        this.elBtnSmeltDiamondsAll.removeAttribute('disabled');
      } else {
        this.elBtnSmeltDiamondsAll.setAttribute('disabled', 'true');
      }
    }

    // 2. Atelier Minerai d'Iridium -> Barres d'Iridium
    const canSmeltOneBar = ore >= 2;

    if (this.elBtnSmeltIridiumUnit) {
      if (canSmeltOneBar) {
        this.elBtnSmeltIridiumUnit.removeAttribute('disabled');
      } else {
        this.elBtnSmeltIridiumUnit.setAttribute('disabled', 'true');
      }
    }

    if (this.elBtnSmeltIridiumAll) {
      if (canSmeltOneBar) {
        this.elBtnSmeltIridiumAll.removeAttribute('disabled');
      } else {
        this.elBtnSmeltIridiumAll.setAttribute('disabled', 'true');
      }
    }
  }

  private handleSmeltDiamonds(amount = 50) {
    const total = this.store.getTotalRemainingDiamonds();
    const toSmelt = Math.min(amount, total - (total % 10));
    if (toSmelt < 10) {
      if (this.elRefineryFeedbackMsg) {
        this.elRefineryFeedbackMsg.className = 'refinery-feedback error';
        this.elRefineryFeedbackMsg.textContent = '⚠️ Diamants insuffisants (minimum 10 diamants cumulés requis pour 1 poudre).';
        this.elRefineryFeedbackMsg.classList.remove('hidden');
      }
      return;
    }

    const res = this.store.smeltDiamondsToDust(toSmelt, 10);
    if (res.success) {
      this.refreshCurrencies();
      this.updateRefineryDisplay();
      if (this.elRefineryFeedbackMsg) {
        this.elRefineryFeedbackMsg.className = 'refinery-feedback';
        this.elRefineryFeedbackMsg.innerHTML = `<span class="icon-diamond-dust"></span> Fonderie activée ! <strong>+${res.dustGained} Poudre de Diamant</strong> obtenue (${res.diamondsSpent} 💎 consumés).`;
        this.elRefineryFeedbackMsg.classList.remove('hidden');
      }
      this.showHudToast(`💎 +${res.dustGained} POUDRE DE DIAMANT OBTENUE !`, false);
    }
  }

  private handleSmeltDiamondsAll() {
    const res = this.store.smeltAllDiamondsToDust(10);
    if (res.success) {
      this.refreshCurrencies();
      this.updateRefineryDisplay();
      if (this.elRefineryFeedbackMsg) {
        this.elRefineryFeedbackMsg.className = 'refinery-feedback';
        this.elRefineryFeedbackMsg.innerHTML = `⚡ TOUT FONDUS ! <strong>+${res.dustGained} Poudre de Diamant</strong> obtenue (${res.diamondsSpent} 💎 de toutes vos missions consumés).`;
        this.elRefineryFeedbackMsg.classList.remove('hidden');
      }
      this.showHudToast(`💎 +${res.dustGained} POUDRE DE DIAMANT CONVERTIE !`, false);
    } else {
      if (this.elRefineryFeedbackMsg) {
        this.elRefineryFeedbackMsg.className = 'refinery-feedback error';
        this.elRefineryFeedbackMsg.textContent = '⚠️ Aucun diamant convertible (minimum 10 diamants requis).';
        this.elRefineryFeedbackMsg.classList.remove('hidden');
      }
    }
  }

  private handleSmeltIridium(barsCount = 1) {
    const res = this.store.smeltIridiumOreToBars(barsCount, 2);
    if (res.success) {
      this.refreshCurrencies();
      this.updateRefineryDisplay();
      if (this.elRefineryFeedbackMsg) {
        this.elRefineryFeedbackMsg.className = 'refinery-feedback';
        this.elRefineryFeedbackMsg.innerHTML = `🔥 Haut-fourneau activé ! <strong>+${res.barsGained} Barre d'Iridium</strong> coulée (${res.oreSpent} minerais bruts raffinés).`;
        this.elRefineryFeedbackMsg.classList.remove('hidden');
      }
      this.showHudToast(`🔥 +${res.barsGained} BARRE D'IRIDIUM FORGÉE !`, false);
    } else {
      if (this.elRefineryFeedbackMsg) {
        this.elRefineryFeedbackMsg.className = 'refinery-feedback error';
        this.elRefineryFeedbackMsg.textContent = '⚠️ Minerai d\'iridium insuffisant (2 minerais bruts requis par barre).';
        this.elRefineryFeedbackMsg.classList.remove('hidden');
      }
    }
  }

  private handleSmeltIridiumAll() {
    const res = this.store.smeltAllIridiumOreToBars(2);
    if (res.success) {
      this.refreshCurrencies();
      this.updateRefineryDisplay();
      if (this.elRefineryFeedbackMsg) {
        this.elRefineryFeedbackMsg.className = 'refinery-feedback';
        this.elRefineryFeedbackMsg.innerHTML = `⚡ RAFFINAGE TOTAL ! <strong>+${res.barsGained} Barres d'Iridium</strong> coulées (${res.oreSpent} minerais raffinés).`;
        this.elRefineryFeedbackMsg.classList.remove('hidden');
      }
      this.showHudToast(`🔥 +${res.barsGained} BARRES D'IRIDIUM FORGÉES !`, false);
    } else {
      if (this.elRefineryFeedbackMsg) {
        this.elRefineryFeedbackMsg.className = 'refinery-feedback error';
        this.elRefineryFeedbackMsg.textContent = '⚠️ Aucun minerai à couler (minimum 2 minerais requis).';
        this.elRefineryFeedbackMsg.classList.remove('hidden');
      }
    }
  }

  // --- GESTION DES DÉFIS QUOTIDIENS (DÉBLOQUÉS NIV 5) ---
  public showChallenges() {
    this.stopPreviewLoop();
    this.elScreenMainMenu?.classList.remove('active');
    this.elScreenMainMenu?.classList.add('hidden');
    this.elScreenHangar?.classList.remove('active');
    this.elScreenHangar?.classList.add('hidden');
    this.elScreenMissions?.classList.remove('active');
    this.elScreenMissions?.classList.add('hidden');

    this.elScreenChallenges?.classList.remove('hidden');
    this.elScreenChallenges?.classList.add('active');

    this.updateChallengesDisplay();
    this.refreshCurrencies();
  }

  private getCountdownToMidnight(): string {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = Math.max(0, midnight.getTime() - now.getTime());
    const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
    const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  private updateChallengesDisplay() {
    if (this.elChallengesResetCountdown) {
      this.elChallengesResetCountdown.textContent = this.getCountdownToMidnight();
    }

    const challenges = ['crystals', 'diamonds', 'dust', 'bars'];
    challenges.forEach(id => {
      const attemptsLeft = this.store.getChallengeAttemptsLeft(id);
      const pill = document.getElementById(`challenge-attempts-${id}`);
      const btn = document.querySelector(`button.btn-launch-challenge[data-challenge-id="${id}"]`) as HTMLButtonElement | null;

      if (pill) {
        if (attemptsLeft === 2) {
          pill.className = 'challenge-attempts-pill';
          pill.textContent = '2 / 2 RESTANTS';
        } else if (attemptsLeft === 1) {
          pill.className = 'challenge-attempts-pill warning';
          pill.textContent = '1 / 2 RESTANT';
        } else {
          pill.className = 'challenge-attempts-pill empty';
          pill.textContent = '0 / 2 (ÉPUISÉ)';
        }
      }

      if (btn) {
        if (attemptsLeft > 0) {
          btn.removeAttribute('disabled');
          btn.innerHTML = `<span>DÉCOLLER</span><span>🚀</span>`;
        } else {
          btn.setAttribute('disabled', 'true');
          btn.innerHTML = `<span>ÉPUISÉ</span><span>🔒</span>`;
        }
      }
    });
  }

  private handleLaunchDailyChallenge(id: string) {
    if (!this.store.canPlayChallenge(id)) {
      this.showHudToast('⚠️ Tentatives quotidiennes épuisées pour ce défi ! Revenez demain.', true);
      return;
    }

    const consumed = this.store.consumeChallengeAttempt(id);
    if (!consumed) return;

    // Attribue la récompense de base du défi
    const rewardsMap: Record<string, { type: string; amt: number }> = {
      crystals: { type: 'crystals', amt: 350 },
      diamonds: { type: 'diamonds', amt: 40 },
      dust: { type: 'dust', amt: 15 },
      bars: { type: 'bars', amt: 2 }
    };

    const r = rewardsMap[id] || { type: 'crystals', amt: 350 };
    if (r.type === 'crystals') this.store.addCrystals(r.amt);
    else if (r.type === 'diamonds') this.store.addDiamonds(r.amt);
    else if (r.type === 'dust') this.store.addDiamondDust(r.amt);
    else if (r.type === 'bars') this.store.addIridiumBars(r.amt);

    this.refreshCurrencies();
    this.updateChallengesDisplay();
    this.openChallengeVictoryModal(id);
  }

  private openChallengeVictoryModal(id: string) {
    this.currentWonChallengeId = id;
    const infoMap: Record<string, { title: string; icon: string; rewardText: string; shortText: string }> = {
      crystals: {
        title: "RAID D'IRIDIUM ACCOMPLI !",
        icon: '🔮',
        rewardText: "+350 Minerais d'Iridium bruts",
        shortText: "+350 Minerais"
      },
      diamonds: {
        title: 'MOISSON DE DIAMANTS ACCOMPLIE !',
        icon: '💎',
        rewardText: '+40 Diamants de mission',
        shortText: '+40 Diamants'
      },
      dust: {
        title: 'POUSSIÈRE DE DIAMANT RÉCOLTÉE !',
        icon: '💎',
        rewardText: '+15 Poudre de Diamant pour vos équipements',
        shortText: '+15 Poudre'
      },
      bars: {
        title: "CONVOI D'IRIDIUM ESCORTÉ !",
        icon: '🟦',
        rewardText: "+2 Barres d'Iridium raffiné",
        shortText: "+2 Barres"
      }
    };

    const info = infoMap[id] || infoMap.crystals;

    if (this.elChallengeVictoryIcon) {
      if (id === 'dust') {
        this.elChallengeVictoryIcon.innerHTML = '<span class="icon-diamond-dust" style="width: 2em; height: 2em;"></span>';
      } else if (id === 'bars') {
        this.elChallengeVictoryIcon.innerHTML = '<span class="icon-iridium-bar" style="width: 2em; height: 2em;"></span>';
      } else {
        this.elChallengeVictoryIcon.textContent = info.icon;
      }
    }
    if (this.elChallengeVictoryName) this.elChallengeVictoryName.textContent = info.title;
    if (this.elChallengeVictoryRewardText) this.elChallengeVictoryRewardText.textContent = info.rewardText;
    if (this.elChallengeDoubleRewardPreview) this.elChallengeDoubleRewardPreview.textContent = info.shortText;

    const canDouble = this.store.canDoubleChallengeReward(id);
    if (this.elBtnChallengeDoubleAd) {
      if (canDouble) {
        this.elBtnChallengeDoubleAd.removeAttribute('disabled');
        this.elBtnChallengeDoubleAd.innerHTML = `<span>📺 DOUBLER LE BUTIN (x2)</span><span class="double-tag">${info.shortText}</span>`;
      } else {
        this.elBtnChallengeDoubleAd.setAttribute('disabled', 'true');
        this.elBtnChallengeDoubleAd.innerHTML = `<span>✓ BUTIN DÉJÀ DOUBLÉ</span><span class="double-tag">MAX</span>`;
      }
    }

    this.elModalChallengeVictory?.classList.remove('hidden');
  }

  private handleDoubleChallengeReward() {
    if (!this.currentWonChallengeId) return;
    const id = this.currentWonChallengeId;

    if (!this.store.canDoubleChallengeReward(id)) {
      this.showHudToast('⚠️ Le butin a déjà été doublé pour cette tentative !', true);
      return;
    }

    AdService.showRewardedAd(
      'DOUBLER DÉFI QUOTIDIEN (x2)',
      () => {
        const rewardsMap: Record<string, { type: string; amt: number }> = {
          crystals: { type: 'crystals', amt: 350 },
          diamonds: { type: 'diamonds', amt: 40 },
          dust: { type: 'dust', amt: 15 },
          bars: { type: 'bars', amt: 2 }
        };

        const r = rewardsMap[id] || { type: 'crystals', amt: 350 };
        if (r.type === 'crystals') this.store.addCrystals(r.amt);
        else if (r.type === 'diamonds') this.store.addDiamonds(r.amt);
        else if (r.type === 'dust') this.store.addDiamondDust(r.amt);
        else if (r.type === 'bars') this.store.addIridiumBars(r.amt);

        this.store.markChallengeDoubled(id);
        this.refreshCurrencies();
        this.updateChallengesDisplay();

        if (this.elBtnChallengeDoubleAd) {
          this.elBtnChallengeDoubleAd.setAttribute('disabled', 'true');
          this.elBtnChallengeDoubleAd.innerHTML = `<span>✓ BUTIN DOUBLÉ AVEC SUCCÈS !</span><span class="double-tag">x2 REÇU</span>`;
        }

        this.showHudToast('🎉 TRANSMISSION VALIDÉE : BUTIN DU DÉFI DOUBLÉ (x2) !', false);
      },
      () => {
        this.showHudToast('Transmission publicitaire interrompue.', true);
      }
    );
  }

  private closeChallengeVictoryModal() {
    this.elModalChallengeVictory?.classList.add('hidden');
    this.currentWonChallengeId = null;
    this.updateChallengesDisplay();
    this.refreshCurrencies();
  }

  // --- GESTION DES ÉVÉNEMENTS & CLASSEMENT SUR 100 JOUEURS (DÉBLOQUÉS NIV 15) ---
  public showEvents() {
    this.showMissions();
    this.switchMissionsMode('events');
  }

  private switchEventSubtab(tab: 'leaderboard' | 'rewards') {
    this.elTabEventLeaderboard?.classList.toggle('active', tab === 'leaderboard');
    this.elTabEventRewards?.classList.toggle('active', tab === 'rewards');

    this.elEventViewLeaderboard?.classList.toggle('hidden', tab !== 'leaderboard');
    this.elEventViewRewards?.classList.toggle('hidden', tab !== 'rewards');

    if (tab === 'leaderboard') {
      this.render100PlayerLeaderboard();
    } else {
      this.renderEventMilestones();
    }
  }

  private formatTimeMs(ms: number | null): string {
    if (ms === null || ms <= 0) return '--:--';
    const totalSec = ms / 1000;
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSec % 60).toString().padStart(2, '0');
    const cs = Math.floor((totalSec * 100) % 100).toString().padStart(2, '0');
    return `${m}:${s}.${cs}`;
  }

  private getRankRewardEstimate(rank: number): string {
    if (rank === 1) return '50 <span class="icon-iridium-bar"></span> + 100 <span class="icon-diamond-dust"></span>';
    if (rank <= 5) return '25 <span class="icon-iridium-bar"></span> + 50 <span class="icon-diamond-dust"></span>';
    if (rank <= 20) return '12 <span class="icon-iridium-bar"></span> + 25 <span class="icon-diamond-dust"></span>';
    if (rank <= 50) return '5 <span class="icon-iridium-bar"></span> + 10 <span class="icon-diamond-dust"></span> + 1k <span class="icon-iridium"></span>';
    return '1 <span class="icon-iridium-bar"></span> + 500 <span class="icon-iridium"></span>';
  }

  private updateEventsDisplay() {
    const isUnlocked = this.store.data.maxUnlockedMission >= 15;
    if (!isUnlocked) {
      this.elEventsLockedState?.classList.remove('hidden');
      this.elEventsUnlockedState?.classList.add('hidden');
      const curLvl = Math.min(14, this.store.data.maxUnlockedMission);
      if (this.elEventsUnlockProgressText) {
        this.elEventsUnlockProgressText.textContent = `Mission ${curLvl} / 15`;
      }
      if (this.elEventsUnlockProgressFill) {
        this.elEventsUnlockProgressFill.style.width = `${Math.min(100, (curLvl / 15) * 100)}%`;
      }
      return;
    }

    this.elEventsLockedState?.classList.add('hidden');
    this.elEventsUnlockedState?.classList.remove('hidden');

    if (this.elBtnEventLaunch) {
      this.elBtnEventLaunch.setAttribute('disabled', 'true');
      this.elBtnEventLaunch.className = 'btn-launch-game event-launch-btn disabled';
    }
  }

  private render100PlayerLeaderboard() {
    if (!this.elLeaderboardEntriesContainer) return;
    const playerRank = this.store.data.eventSeason?.rank || 88;
    const playerBestMs = this.store.data.eventSeason?.bestTimeMs;

    const basePilots = [
      'Nova_Prime', 'ShadowWing', 'CyberPhantom', 'Valkyrie-X', 'Solaris9',
      'GhostRecon', 'NebulaRider', 'VoidStalker', 'ApexHunter', 'TitanClaw',
      'Hyperion', 'ZeroG_Ace', 'QuantumPulse', 'OmegaStrike', 'StarLord88',
      'IronFalcon', 'CrimsonFox', 'DarkMatter', 'Pulsar77', 'AstroViper',
      'CosmicRay', 'VortexPilot', 'Starlight_01', 'PhotonBlaster', 'NightHawk',
      'SolarFlare', 'GalacticRebel', 'SkyStriker', 'EchoLeader', 'RogueVector'
    ];

    let html = '';
    for (let r = 1; r <= 100; r++) {
      const isPlayer = r === playerRank;
      let timeStr = '';
      if (isPlayer) {
        timeStr = playerBestMs ? this.formatTimeMs(playerBestMs) : '01:54.20';
      } else {
        // Temps simulé progressif de 01:04.12 à 03:20.00
        const simSec = 64 + Math.pow(r / 100, 1.3) * 136;
        const simMs = simSec * 1000 + ((r * 137) % 990);
        timeStr = this.formatTimeMs(simMs);
      }

      const pilotName = isPlayer
        ? 'COMMANDANT (VOUS)'
        : (basePilots[(r - 1) % basePilots.length] + (r > basePilots.length ? `_${r}` : ''));

      let tierBadge = '';
      if (r === 1) tierBadge = '<span class="lb-tier-medal gold">🥇 1er</span>';
      else if (r === 2) tierBadge = '<span class="lb-tier-medal silver">🥈 2e</span>';
      else if (r === 3) tierBadge = '<span class="lb-tier-medal bronze">🥉 3e</span>';
      else if (r <= 5) tierBadge = '<span class="lb-tier-tag top5">TOP 5%</span>';
      else if (r <= 20) tierBadge = '<span class="lb-tier-tag top20">TOP 20%</span>';
      else if (r <= 50) tierBadge = '<span class="lb-tier-tag top50">TOP 50%</span>';

      html += `
        <div class="leaderboard-entry-row ${isPlayer ? 'player-row' : ''} ${r <= 3 ? 'podium-row' : ''}" data-rank="${r}">
          <div class="entry-rank-col">
            <span class="rank-num">#${r}</span>
            ${tierBadge}
          </div>
          <div class="entry-pilot-col">
            <span class="pilot-name">${pilotName}</span>
            ${isPlayer ? '<span class="player-you-tag">VOUS</span>' : ''}
          </div>
          <div class="entry-time-col">
            <span class="pilot-time">${timeStr}</span>
          </div>
        </div>
      `;
    }

    this.elLeaderboardEntriesContainer.innerHTML = html;

    // Scroll vers la position du joueur après rendu
    setTimeout(() => {
      const pRow = this.elLeaderboardEntriesContainer?.querySelector('.player-row') as HTMLElement | null;
      if (pRow && this.elLeaderboardEntriesContainer) {
        this.elLeaderboardEntriesContainer.scrollTop = Math.max(0, pRow.offsetTop - 120);
      }
    }, 50);
  }

  private renderEventMilestones() {
    if (!this.elEventMilestonesList) return;
    const ev = this.store.data.eventSeason;
    const playerTime = ev?.bestTimeMs || null;
    const claimed = ev?.claimedMilestones || [];

    const milestones = [
      {
        id: 'milestone_1',
        title: 'BAPTÊME DE LA NÉBULEUSE',
        targetDesc: 'Terminer le secteur en moins de 03:00',
        targetMs: 180000,
        rewardLabel: '+500 🔮 Minerais + 10 💎 Diamants',
        applyReward: () => {
          this.store.addCrystals(500);
          this.store.addDiamonds(10);
        }
      },
      {
        id: 'milestone_2',
        title: 'PILOTE CHEVRONNÉ',
        targetDesc: 'Terminer le secteur en moins de 02:00',
        targetMs: 120000,
        rewardLabel: '+1 000 🔮 + 25 💎 + 5 <span class="icon-diamond-dust"></span> Poudre',
        applyReward: () => {
          this.store.addCrystals(1000);
          this.store.addDiamonds(25);
          this.store.addDiamondDust(5);
        }
      },
      {
        id: 'milestone_3',
        title: 'AS DES RAYONS STELLAIRES',
        targetDesc: 'Terminer le secteur en moins de 01:30',
        targetMs: 90000,
        rewardLabel: '+2 000 🔮 + 50 💎 + 15 <span class="icon-diamond-dust"></span> + 2 <span class="icon-iridium-bar"></span> Barres',
        applyReward: () => {
          this.store.addCrystals(2000);
          this.store.addDiamonds(50);
          this.store.addDiamondDust(15);
          this.store.addIridiumBars(2);
        }
      },
      {
        id: 'milestone_4',
        title: 'MAÎTRE DE LA DIVISION',
        targetDesc: 'Terminer le secteur en moins de 01:10 (Chrono Élite)',
        targetMs: 70000,
        rewardLabel: '+5 000 🔮 + 100 💎 + 35 <span class="icon-diamond-dust"></span> + 5 <span class="icon-iridium-bar"></span> Barres',
        applyReward: () => {
          this.store.addCrystals(5000);
          this.store.addDiamonds(100);
          this.store.addDiamondDust(35);
          this.store.addIridiumBars(5);
        }
      }
    ];

    let html = '';
    milestones.forEach(m => {
      const isClaimed = claimed.includes(m.id);
      const isReached = playerTime !== null && playerTime <= m.targetMs;

      let btnHtml = '';
      if (isClaimed) {
        btnHtml = `<button class="btn-milestone-claim claimed" disabled>✓ RÉCLAMÉ</button>`;
      } else if (isReached) {
        btnHtml = `<button class="btn-milestone-claim ready" data-milestone-id="${m.id}">RÉCLAMER 🎁</button>`;
      } else {
        const reqStr = this.formatTimeMs(m.targetMs);
        btnHtml = `<button class="btn-milestone-claim locked" disabled>REQUIS &lt; ${reqStr} 🔒</button>`;
      }

      html += `
        <div class="milestone-card ${isClaimed ? 'claimed' : isReached ? 'ready' : 'locked'}">
          <div class="milestone-info">
            <div class="milestone-title">${m.title}</div>
            <div class="milestone-target">${m.targetDesc}</div>
            <div class="milestone-reward-text">RÉCOMPENSE : <strong>${m.rewardLabel}</strong></div>
          </div>
          <div class="milestone-action">
            ${btnHtml}
          </div>
        </div>
      `;
    });

    this.elEventMilestonesList.innerHTML = html;

    // Écouteurs de réclamation des paliers
    this.elEventMilestonesList.querySelectorAll('button.btn-milestone-claim.ready').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mid = (e.currentTarget as HTMLElement).dataset.milestoneId;
        const target = milestones.find(m => m.id === mid);
        if (target && this.store.claimEventMilestone(target.id)) {
          target.applyReward();
          this.refreshCurrencies();
          this.renderEventMilestones();
          this.showHudToast(`🎁 PALIER VALIDÉ : ${target.rewardLabel} REÇU !`, false);
        }
      });
    });
  }

  private handleLaunchEvent() {
    if (this.store.data.maxUnlockedMission < 15) {
      this.showHudToast('🔒 ÉVÉNEMENT VERROUILLÉ : Débloqué au Niveau 15 !', true);
      return;
    }
    this.showHudToast('⏳ ÉVÉNEMENT EN ATTENTE : Prochain tournoi dans 21 jours !', true);
  }

  public showHudToast(message: string, isWarning = false) {
    if (!this.elHudToastContainer || !this.elHudToastMsg) return;
    this.elHudToastMsg.textContent = message;
    this.elHudToastMsg.className = `hud-toast-msg ${isWarning ? 'warning' : 'success'}`;
    this.elHudToastContainer.classList.remove('hidden');
    this.elHudToastContainer.style.opacity = '1';

    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = window.setTimeout(() => {
      if (this.elHudToastContainer) {
        this.elHudToastContainer.style.opacity = '0';
        setTimeout(() => {
          this.elHudToastContainer?.classList.add('hidden');
        }, 300);
      }
    }, 2800);
  }

  public destroy() {
    cancelAnimationFrame(this.previewAnimFrame);
  }

  // --- GESTIONNAIRE D'OUVERTURE DE COFFRE ---
  private openChestModal(chest: EquipmentItem) {
    this.currentChestItem = chest;
    this.currentRevealedItem = null;
    this.isChestOpening = false;

    if (this.elChestModalTitle) {
      this.elChestModalTitle.textContent = chest.name.toUpperCase();
    }
    if (this.elChestModalDesc) {
      this.elChestModalDesc.textContent = (chest.sourceMission || chest.level) < 5
        ? "Ce coffre mystère a été sécurisé lors de vos premières missions. Ouvrez-le pour enfin découvrir son équipement !"
        : "Ce trésor spatial renferme un équipement forgé dans les nébuleuses de la mission. Brisez le sceau pour le révéler !";
    }

    // Réinitialisation des étapes
    this.elChestStageSealed?.classList.remove('hidden');
    this.elChestStageOpening?.classList.add('hidden');
    this.elChestStageReward?.classList.add('hidden');

    this.elModalChestOpening?.classList.remove('hidden');
  }

  private closeChestModal() {
    this.elModalChestOpening?.classList.add('hidden');
    this.currentChestItem = null;
    this.currentRevealedItem = null;
    this.isChestOpening = false;
  }

  private triggerChestOpening() {
    if (this.isChestOpening || !this.currentChestItem) return;
    this.isChestOpening = true;

    // Transition vers l'animation d'ouverture
    this.elChestStageSealed?.classList.add('hidden');
    this.elChestStageOpening?.classList.remove('hidden');
    this.sound.playChestOpen();

    // Délai dramatique de déchiffrement quantique (1 seconde)
    setTimeout(() => {
      if (!this.currentChestItem) return;
      this.currentRevealedItem = EquipmentSystem.openChest(this.currentChestItem);
      this.renderChestReward();
      this.elChestStageOpening?.classList.add('hidden');
      this.elChestStageReward?.classList.remove('hidden');
      this.sound.playVictory();
      this.isChestOpening = false;
    }, 1000);
  }

  private renderChestReward() {
    if (!this.currentRevealedItem || !this.elChestRewardCard) return;
    const item = this.currentRevealedItem;
    const rarityCfg = RARITY_CONFIGS[item.rarity];
    const slotInfo = SLOT_INFO[item.slotType];
    const fx = EquipmentSystem.ensureItemSpecialEffect(item);

    const hasRealFx = fx && fx.type !== 'NONE';
    const fxHtml = hasRealFx ? `
      <div class="loot-special-fx-row" style="margin-top: 10px; background: rgba(0, 0, 0, 0.4); padding: 8px 12px; border-radius: 8px; border-left: 3px solid ${rarityCfg.color};">
        <span class="loot-fx-tag" style="font-size: 0.68rem; font-family: var(--font-cyber); font-weight: 800; color: #FCD34D;">${fx.icon} EFFET SPÉCIAL UNIQUE</span>
        <div class="loot-fx-label" style="font-weight: 800; color: #FFFFFF; font-size: 0.82rem; margin-top: 2px;">${fx.label}</div>
        <div class="loot-fx-desc" style="font-size: 0.72rem; color: #94a3b8; margin-top: 2px;">${fx.description}</div>
      </div>
    ` : `
      <div class="loot-special-fx-row" style="margin-top: 10px; background: rgba(0, 0, 0, 0.3); padding: 6px 10px; border-radius: 6px; border-left: 3px solid #64748b;">
        <span class="loot-fx-tag" style="font-size: 0.65rem; font-family: var(--font-cyber); font-weight: 700; color: #94a3b8;">🛡️ STATISTIQUE RENFORCÉE</span>
        <div class="loot-fx-desc" style="font-size: 0.70rem; color: #94a3b8; margin-top: 2px;">Équipement sans effet passif mais avec une statistique principale accrue.</div>
      </div>
    `;

    const statsHtml = item.stats.map(st => `
      <div class="loot-affix-row" style="display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #e2e8f0; margin-top: 4px;">
        <span style="color: ${rarityCfg.color};">✦</span>
        <span>${st.label}</span>
      </div>
    `).join('');

    this.elChestRewardCard.style.borderColor = rarityCfg.color;
    this.elChestRewardCard.style.boxShadow = `0 0 25px ${rarityCfg.bgGlow}`;
    this.elChestRewardCard.innerHTML = `
      <div class="loot-card-top" style="display: flex; align-items: center; gap: 12px;">
        <span class="loot-slot-icon" style="font-size: 2.2rem;">${slotInfo.icon}</span>
        <div class="loot-meta" style="flex: 1;">
          <div class="loot-item-name" style="font-family: var(--font-cyber); font-size: 1.05rem; font-weight: 900; color: ${rarityCfg.color}; text-shadow: 0 0 8px ${rarityCfg.bgGlow};">${item.name}</div>
          <div class="loot-sub-tags" style="display: flex; gap: 6px; align-items: center; margin-top: 4px;">
            <span class="loot-badge-rarity" style="font-size: 0.65rem; font-weight: 900; padding: 2px 8px; border-radius: 4px; background: ${rarityCfg.color}22; color: ${rarityCfg.color}; border: 1px solid ${rarityCfg.color};">${rarityCfg.name}</span>
            <span class="loot-badge-slot" style="font-size: 0.65rem; color: #94a3b8; font-weight: 700;">${slotInfo.label.toUpperCase()}</span>
            <span class="loot-badge-lvl" style="font-size: 0.65rem; color: #38bdf8; font-weight: 700;">NIV. ${item.level}</span>
          </div>
        </div>
      </div>
      <div class="loot-affixes-box" style="margin-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 8px;">
        ${fxHtml}
        ${statsHtml ? `<div style="margin-top: 8px;">${statsHtml}</div>` : ''}
      </div>
    `;
  }

  private rerollChestReward() {
    if (!this.currentChestItem) return;
    AdService.showRewardedAd('RELANCER LE BUTIN DU COFFRE', () => {
      if (!this.currentChestItem) return;
      this.sound.playChestOpen();
      this.currentRevealedItem = EquipmentSystem.rerollChestLoot(this.currentChestItem.sourceMission || this.currentChestItem.level || 1);
      this.renderChestReward();
      this.showHudToast('🎲 NOUVEAU TIRAGE GÉNÉRÉ AVEC SUCCÈS !', false);
    });
  }

  private claimChestReward() {
    if (!this.currentChestItem || !this.currentRevealedItem) return;
    const item = this.currentRevealedItem;
    this.store.openChest(this.currentChestItem.id, item);
    this.closeChestModal();
    this.refreshCurrencies();
    this.renderShipSlots();
    this.renderInventory();
    this.updateMainMenuDisplay();
    this.showHudToast(`🎉 ${item.name.toUpperCase()} AJOUTÉ À L'INVENTAIRE !`, false);
  }
}

