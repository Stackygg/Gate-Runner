// Système de sauvegarde locale avec Améliorations, Vaisseaux & Inventaire d'Équipements

import { UPGRADE_TRACKS_CONFIG, SKINS_CONFIG, ShipSkin } from '../config';
import { LevelGenerator } from './LevelGenerator';
import { EquipmentItem, EquipmentSlotType, EquipmentSystem, RARITY_CONFIGS, ItemSpecialEffect } from './EquipmentSystem';

export interface EquippedStatsResult {
  damageMultiplier: number;
  fireRateMultiplier: number;
  speedMultiplier: number;
  diamondMultiplier: number;
  bonusStartingShips: number;
  specialEffects: {
    leaderExtraShots: number;
    piercingExtraTargets: number;
    hasExplosiveMissile: boolean;
    explosiveMissileDamageMult: number;
    explosiveRadius: number;
    explosiveDamagePct: number;
    energyShieldHp: number;
    leaderFireRateBonus: number;
    fleetFireRateBonus: number;
    bonusStartingShips: number;
    dodgeChance: number;
    magnetRadius: number;
    critChance: number;
  };
  activeEffectDescriptions: string[];
}

export interface UpgradeStepState {
  tier: number; // Palier actuel (1, 2, 3...)
  step: number; // Échelon actuel (0 à 5)
  allowDiamondTierUp: boolean; // Permet de passer le palier avec des diamants à l'essai suivant
}

export interface LevelUpgradeData {
  diamonds: number;
  upgradeTracks: {
    fireRate: UpgradeStepState;
    damage: UpgradeStepState;
    diamondBoost: UpgradeStepState;
  };
}

export interface MissionQuest {
  id: string;
  slot: 1 | 2 | 3;
  title: string;
  desc: string;
  rewardIridium: number;
  isCompleted: boolean;
  isClassified: boolean;
}

export interface PlayerSaveData {
  violetCrystals: number;     // 🔮 Minerai d'Iridium brut permanent (achats simples, rerolls, renforts)
  iridiumBars: number;        // 🟦 Barres d'Iridium raffiné (Achat de vaisseaux)
  diamondDust: number;        // ✨ Poudre de Diamant (Amélioration d'objets)
  selectedMission: number;    // Mission active choisie (1, 2, 3...)
  maxUnlockedMission: number; // Niveau le plus élevé débloqué
  completedMissions: number[];// Missions réussies au moins 1 fois
  completedQuests: {
    [missionNum: number]: string[]; // IDs des quêtes/hauts-faits validés par niveau
  };
  selectedSkinId: string;
  unlockedSkinIds: string[];
  noAdsPurchased: boolean;    // 🛡️ Pass VIP Anti-Pub acheté
  dailyAdsWatched: {
    date: string; // 'YYYY-MM-DD'
    count: number; // Max 5 par jour
  };
  levelUpgrades: {
    [missionNum: number]: LevelUpgradeData;
  };
  // Inventaire & Équipements
  inventory: EquipmentItem[];
  shipEquippedSlots: {
    [shipId: string]: (string | null)[];
  };
  hasNewLootNotification: boolean;
  // Défis Quotidiens & Événements Saisonniers
  dailyChallenges: DailyChallengesState;
  eventSeason: EventSeasonState;
  // Proxies dynamiques pour le niveau actif
  diamonds: number;
  upgradeTracks: {
    fireRate: UpgradeStepState;
    damage: UpgradeStepState;
    diamondBoost: UpgradeStepState;
  };
}

export interface DailyChallengesState {
  date: string; // 'YYYY-MM-DD'
  attempts: { [challengeId: string]: number }; // Fois joué aujourd'hui (0, 1, 2)
  doubledRuns: { [challengeId: string]: number }; // Fois doublé avec pub aujourd'hui (0, 1, 2)
}

export interface EventSeasonState {
  eventId: string;
  seasonName: string;
  divisionName: string;
  bestTimeMs: number | null;
  claimedMilestones: string[];
  rank: number;
}

const STORAGE_KEY = 'stacky_gate_runner_save_v8';

export class UpgradeStore {
  public data: PlayerSaveData;

  constructor() {
    [
      'stacky_gate_runner_save',
      'stacky_gate_runner_save_v2',
      'stacky_gate_runner_save_v3',
      'stacky_gate_runner_save_v4',
      'stacky_gate_runner_save_v5',
      'stacky_gate_runner_save_v6'
    ].forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
    this.data = this.loadData();
    this.save();
  }

  public resetAll() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('stacky_gate_runner_save_v7');
    } catch {}
    this.data = this.getDefaultData();
    this.save();
  }

  private createDefaultLevelData(): LevelUpgradeData {
    return {
      diamonds: 0,
      upgradeTracks: {
        fireRate: { tier: 1, step: 0, allowDiamondTierUp: false },
        damage: { tier: 1, step: 0, allowDiamondTierUp: false },
        diamondBoost: { tier: 1, step: 0, allowDiamondTierUp: false }
      }
    };
  }

  private getDefaultData(): PlayerSaveData {
    const today = new Date().toISOString().slice(0, 10);
    const self = this;

    const baseData: PlayerSaveData = {
      violetCrystals: 0,
      iridiumBars: 0,
      diamondDust: 0,
      selectedMission: 1,
      maxUnlockedMission: 1,
      completedMissions: [],
      completedQuests: {},
      selectedSkinId: 'stacky_interceptor',
      unlockedSkinIds: ['stacky_interceptor'],
      noAdsPurchased: false,
      dailyAdsWatched: { date: today, count: 0 },
      levelUpgrades: {
        1: this.createDefaultLevelData()
      },
      inventory: [],
      shipEquippedSlots: {
        stacky_interceptor: [null, null]
      },
      hasNewLootNotification: false,
      dailyChallenges: {
        date: today,
        attempts: {},
        doubledRuns: {}
      },
      eventSeason: {
        eventId: 'event_season_1',
        seasonName: 'OPÉRATION NÉBULEUSE NOIRE // SAISON 1',
        divisionName: 'Division Orion #42',
        bestTimeMs: null,
        claimedMilestones: [],
        rank: 88
      },
      get diamonds() {
        return self.getCurrentLevelData().diamonds;
      },
      set diamonds(val: number) {
        self.getCurrentLevelData().diamonds = val;
      },
      get upgradeTracks() {
        return self.getCurrentLevelData().upgradeTracks;
      },
      set upgradeTracks(val) {
        self.getCurrentLevelData().upgradeTracks = val;
      }
    };

    return baseData;
  }

  public getCurrentLevelData(): LevelUpgradeData {
    const mission = this.data.selectedMission || 1;
    if (!this.data.levelUpgrades) {
      this.data.levelUpgrades = {};
    }
    if (!this.data.levelUpgrades[mission]) {
      this.data.levelUpgrades[mission] = this.createDefaultLevelData();
    }
    return this.data.levelUpgrades[mission];
  }

  private loadData(): PlayerSaveData {
    const defaultData = this.getDefaultData();
    try {
      // Vérification v8 ou migration transparente depuis v7
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('stacky_gate_runner_save_v7');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.violetCrystals !== undefined) defaultData.violetCrystals = parsed.violetCrystals;
        if (parsed.iridiumBars !== undefined) defaultData.iridiumBars = parsed.iridiumBars;
        if (parsed.diamondDust !== undefined) defaultData.diamondDust = parsed.diamondDust;
        if (parsed.selectedMission !== undefined) defaultData.selectedMission = parsed.selectedMission;
        if (parsed.maxUnlockedMission !== undefined) defaultData.maxUnlockedMission = parsed.maxUnlockedMission;
        if (parsed.completedMissions !== undefined) defaultData.completedMissions = parsed.completedMissions;
        if (parsed.completedQuests !== undefined) defaultData.completedQuests = parsed.completedQuests;
        if (parsed.selectedSkinId !== undefined) defaultData.selectedSkinId = parsed.selectedSkinId;
        if (parsed.unlockedSkinIds !== undefined) defaultData.unlockedSkinIds = parsed.unlockedSkinIds;
        if (parsed.noAdsPurchased !== undefined) defaultData.noAdsPurchased = parsed.noAdsPurchased;
        if (parsed.dailyAdsWatched !== undefined) defaultData.dailyAdsWatched = parsed.dailyAdsWatched;
        if (parsed.levelUpgrades !== undefined) defaultData.levelUpgrades = parsed.levelUpgrades;
        if (parsed.inventory && Array.isArray(parsed.inventory) && parsed.inventory.length > 0) {
          defaultData.inventory = parsed.inventory.map((item: any) => {
            EquipmentSystem.ensureItemSpecialEffect(item);
            return item;
          });
        }
        if (parsed.shipEquippedSlots !== undefined) {
          defaultData.shipEquippedSlots = parsed.shipEquippedSlots;
          // Nettoyer les équipements sur les vaisseaux non débloqués
          if (defaultData.unlockedSkinIds) {
            Object.keys(defaultData.shipEquippedSlots).forEach(sid => {
              if (!defaultData.unlockedSkinIds.includes(sid)) {
                defaultData.shipEquippedSlots[sid] = [];
              }
            });
          }
        }
        if (parsed.hasNewLootNotification !== undefined) defaultData.hasNewLootNotification = parsed.hasNewLootNotification;
        if (parsed.dailyChallenges !== undefined) defaultData.dailyChallenges = parsed.dailyChallenges;
        if (parsed.eventSeason !== undefined) defaultData.eventSeason = parsed.eventSeason;
      }
      // Règle stricte : Avant de débloquer le Hangar (Niveau 5), le vaisseau ne dispose d'aucun objet équipé
      // mais conserve précieusement ses coffres non identifiés gagnés en mission !
      if (defaultData.maxUnlockedMission < 5) {
        defaultData.shipEquippedSlots = {
          stacky_interceptor: [null, null]
        };
        defaultData.inventory = (defaultData.inventory || []).filter(item => item.isChest || item.slotType === 'CHEST');
      }
    } catch {
      // Ignorer erreur JSON
    }
    return defaultData;
  }

  public getDailyAdsRemaining(): number {
    const today = new Date().toISOString().slice(0, 10);
    if (!this.data.dailyAdsWatched || this.data.dailyAdsWatched.date !== today) {
      this.data.dailyAdsWatched = { date: today, count: 0 };
      this.save();
    }
    return Math.max(0, 5 - this.data.dailyAdsWatched.count);
  }

  public canWatchDailyAd(): boolean {
    return this.getDailyAdsRemaining() > 0;
  }

  public recordDailyAdWatch(): boolean {
    if (this.canWatchDailyAd()) {
      this.data.dailyAdsWatched.count++;
      this.save();
      return true;
    }
    return false;
  }

  public buyNoAds(): void {
    this.data.noAdsPurchased = true;
    this.save();
  }

  public save() {
    try {
      const toSave = {
        violetCrystals: this.data.violetCrystals,
        iridiumBars: this.data.iridiumBars,
        diamondDust: this.data.diamondDust,
        selectedMission: this.data.selectedMission,
        maxUnlockedMission: this.data.maxUnlockedMission,
        completedMissions: this.data.completedMissions,
        completedQuests: this.data.completedQuests,
        selectedSkinId: this.data.selectedSkinId,
        unlockedSkinIds: this.data.unlockedSkinIds,
        noAdsPurchased: this.data.noAdsPurchased,
        dailyAdsWatched: this.data.dailyAdsWatched,
        levelUpgrades: this.data.levelUpgrades,
        inventory: this.data.inventory,
        shipEquippedSlots: this.data.shipEquippedSlots,
        hasNewLootNotification: this.data.hasNewLootNotification,
        dailyChallenges: this.data.dailyChallenges,
        eventSeason: this.data.eventSeason
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {}
  }

  // --- MONNAIES (DIAMANTS DU NIVEAU ACTIF, IRIDIUM BRUT, BARRES D'IRIDIUM, POUDRE DE DIAMANT) ---
  public addDiamonds(amount: number) {
    this.getCurrentLevelData().diamonds += Math.round(amount);
    this.save();
  }

  public addDiamondsToMission(missionNum: number, amount: number) {
    if (!this.data.levelUpgrades) {
      this.data.levelUpgrades = {};
    }
    if (!this.data.levelUpgrades[missionNum]) {
      this.data.levelUpgrades[missionNum] = this.createDefaultLevelData();
    }
    this.data.levelUpgrades[missionNum].diamonds += Math.round(amount);
    this.save();
  }

  public addCrystals(amount: number) {
    this.data.violetCrystals += Math.round(amount);
    this.save();
  }

  public addIridium(amount: number) {
    this.addCrystals(amount);
  }

  public addIridiumBars(amount: number) {
    this.data.iridiumBars = (this.data.iridiumBars || 0) + Math.round(amount);
    this.save();
  }

  public addDiamondDust(amount: number) {
    this.data.diamondDust = (this.data.diamondDust || 0) + Math.round(amount);
    this.save();
  }

  public get iridium(): number {
    return this.data.violetCrystals;
  }

  public set iridium(val: number) {
    this.data.violetCrystals = val;
  }

  /**
   * Calcule le total cumulé des diamants restants à travers TOUTES les missions.
   */
  public getTotalRemainingDiamonds(): number {
    let total = 0;
    if (this.data.levelUpgrades) {
      for (const lvl of Object.values(this.data.levelUpgrades)) {
        if (lvl && typeof lvl.diamonds === 'number') {
          total += lvl.diamonds;
        }
      }
    }
    return total;
  }

  /**
   * Fond une quantité de diamants (toutes missions confondues) en Poudre de Diamant.
   * Ratio par défaut : 10 diamants = 1 Poudre de Diamant.
   */
  public smeltDiamondsToDust(diamondsCount: number, ratio = 10): { success: boolean; dustGained: number; diamondsSpent: number } {
    const total = this.getTotalRemainingDiamonds();
    if (diamondsCount <= 0 || total < diamondsCount) {
      return { success: false, dustGained: 0, diamondsSpent: 0 };
    }

    const dustGained = Math.floor(diamondsCount / ratio);
    if (dustGained <= 0) {
      return { success: false, dustGained: 0, diamondsSpent: 0 };
    }

    let toDeduct = diamondsCount;
    // Déduire en priorité du niveau actif actuel
    const currentLvl = this.getCurrentLevelData();
    if (currentLvl.diamonds > 0) {
      const fromCur = Math.min(currentLvl.diamonds, toDeduct);
      currentLvl.diamonds -= fromCur;
      toDeduct -= fromCur;
    }

    // Déduire le reste des autres missions
    if (toDeduct > 0 && this.data.levelUpgrades) {
      for (const lvl of Object.values(this.data.levelUpgrades)) {
        if (lvl.diamonds > 0) {
          const fromLvl = Math.min(lvl.diamonds, toDeduct);
          lvl.diamonds -= fromLvl;
          toDeduct -= fromLvl;
          if (toDeduct <= 0) break;
        }
      }
    }

    this.data.diamondDust = (this.data.diamondDust || 0) + dustGained;
    this.save();
    return { success: true, dustGained, diamondsSpent: diamondsCount };
  }

  /**
   * Fond tous les diamants restants cumulés de toutes les missions en Poudre de Diamant.
   */
  public smeltAllDiamondsToDust(ratio = 10): { success: boolean; dustGained: number; diamondsSpent: number } {
    const total = this.getTotalRemainingDiamonds();
    const maxSmeltable = total - (total % ratio);
    if (maxSmeltable <= 0) {
      return { success: false, dustGained: 0, diamondsSpent: 0 };
    }
    return this.smeltDiamondsToDust(maxSmeltable, ratio);
  }

  /**
   * Fond les diamants d'une mission spécifique en Poudre de Diamant.
   */
  public smeltMissionDiamonds(missionNum: number, ratio = 10): { success: boolean; dustGained: number; diamondsSpent: number } {
    if (!this.data.levelUpgrades || !this.data.levelUpgrades[missionNum]) {
      return { success: false, dustGained: 0, diamondsSpent: 0 };
    }
    const lvl = this.data.levelUpgrades[missionNum];
    const diamondsAvailable = lvl.diamonds || 0;
    const maxSmeltable = diamondsAvailable - (diamondsAvailable % ratio);
    if (maxSmeltable <= 0) {
      return { success: false, dustGained: 0, diamondsSpent: 0 };
    }

    const dustGained = Math.floor(maxSmeltable / ratio);
    lvl.diamonds -= maxSmeltable;
    this.data.diamondDust = (this.data.diamondDust || 0) + dustGained;
    this.save();
    return { success: true, dustGained, diamondsSpent: maxSmeltable };
  }

  /**
   * Réinitialise les 3 améliorations d'une mission et rembourse tous les diamants investis
   * dans la réserve de diamants de cette mission.
   */
  public refundMissionUpgrades(missionNum: number): { success: boolean; diamondsRefunded: number } {
    if (!this.data.levelUpgrades || !this.data.levelUpgrades[missionNum]) {
      return { success: false, diamondsRefunded: 0 };
    }
    const lvl = this.data.levelUpgrades[missionNum];
    const tracks = lvl.upgradeTracks;
    if (!tracks) {
      return { success: false, diamondsRefunded: 0 };
    }

    let totalRefund = 0;
    const trackKeys = ['fireRate', 'damage', 'diamondBoost'] as const;

    for (const key of trackKeys) {
      const track = tracks[key];
      const cfg = UPGRADE_TRACKS_CONFIG[key];
      if (!track || !cfg) continue;

      // Paliers antérieurs (tous les échelons + coût de palier)
      for (let t = 1; t < track.tier; t++) {
        for (let s = 0; s < 5; s++) {
          totalRefund += Math.round((cfg.baseStepCost + s * cfg.costPerStep) * t);
        }
        totalRefund += Math.round(cfg.tierDiamondCost * t);
      }

      // Palier actuel (échelons achetés)
      for (let s = 0; s < track.step; s++) {
        totalRefund += Math.round((cfg.baseStepCost + s * cfg.costPerStep) * track.tier);
      }

      // Réinitialisation de la voie
      track.tier = 1;
      track.step = 0;
      track.allowDiamondTierUp = false;
    }

    lvl.diamonds = (lvl.diamonds || 0) + totalRefund;
    this.save();
    return { success: true, diamondsRefunded: totalRefund };
  }

  /**
   * Fond du minerai d'iridium brut en Barres d'Iridium raffiné.
   * Ratio par défaut : 2 minerais d'iridium brut = 1 Barre d'Iridium.
   */
  public smeltIridiumOreToBars(barsCount = 1, orePerBar = 2): { success: boolean; barsGained: number; oreSpent: number } {
    const oreNeeded = barsCount * orePerBar;
    if (barsCount <= 0 || this.data.violetCrystals < oreNeeded) {
      return { success: false, barsGained: 0, oreSpent: 0 };
    }

    this.data.violetCrystals -= oreNeeded;
    this.data.iridiumBars = (this.data.iridiumBars || 0) + barsCount;
    this.save();
    return { success: true, barsGained: barsCount, oreSpent: oreNeeded };
  }

  /**
   * Fond tout le minerai d'iridium disponible en Barres d'Iridium.
   */
  public smeltAllIridiumOreToBars(orePerBar = 2): { success: boolean; barsGained: number; oreSpent: number } {
    const maxBars = Math.floor(this.data.violetCrystals / orePerBar);
    if (maxBars <= 0) {
      return { success: false, barsGained: 0, oreSpent: 0 };
    }
    return this.smeltIridiumOreToBars(maxBars, orePerBar);
  }

  /**
   * Raffine les diamants du niveau actif en Iridium permanent via la Raffinerie Lunaire (Rétro-compatibilité).
   */
  public refineDiamondsToIridium(conversionCount = 1, costPerUnit = 500): { success: boolean; refined: number; diamondsSpent: number } {
    const lvl = this.getCurrentLevelData();
    const maxPossible = Math.floor(lvl.diamonds / costPerUnit);
    const toConvert = Math.min(conversionCount, maxPossible);

    if (toConvert <= 0) {
      return { success: false, refined: 0, diamondsSpent: 0 };
    }

    const spent = toConvert * costPerUnit;
    lvl.diamonds -= spent;
    this.data.violetCrystals += toConvert;
    this.save();
    return { success: true, refined: toConvert, diamondsSpent: spent };
  }

  // --- QUÊTES / HAUTS-FAITS PAR NIVEAU (3 QUÊTES / PALIER IRIDIUM) ---
  public getQuestsForMission(missionNum: number): MissionQuest[] {
    const isEscort = LevelGenerator.getMissionType(missionNum) === 'escort';
    const completed = this.data.completedQuests?.[missionNum] || [];

    return [
      // Quête 1 : Toutes missions
      {
        id: 'no_damage_fleet',
        slot: 1,
        title: 'FLOTTE INTOUCHABLE',
        desc: 'Terminer la mission sans subir de dégât',
        rewardIridium: 1,
        isCompleted: completed.includes('no_damage_fleet'),
        isClassified: false
      },
      // Quête 2 : Spécifique Escorte, ou Classifiée pour les autres
      isEscort
        ? {
            id: 'no_damage_mothership',
            slot: 2,
            title: 'BOUCLIER INTACT',
            desc: 'Terminer sans aucun dégât sur le vaisseau mère',
            rewardIridium: 1,
            isCompleted: completed.includes('no_damage_mothership'),
            isClassified: false
          }
        : {
            id: 'classified_slot_2',
            slot: 2,
            title: 'OBJECTIF CLASSIFIÉ',
            desc: '???',
            rewardIridium: 1,
            isCompleted: false,
            isClassified: true
          },
      // Quête 3 : Objectif Secret
      {
        id: 'classified_slot_3',
        slot: 3,
        title: 'OBJECTIF SECRET',
        desc: '???',
        rewardIridium: 1,
        isCompleted: false,
        isClassified: true
      }
    ];
  }

  public validateQuests(
    missionNum: number,
    conditions: { noDamageFleet: boolean; noDamageMothership: boolean }
  ): { newlyCompletedQuests: MissionQuest[]; totalIridiumAwarded: number } {
    if (!this.data.completedQuests) {
      this.data.completedQuests = {};
    }
    if (!this.data.completedQuests[missionNum]) {
      this.data.completedQuests[missionNum] = [];
    }

    const completed = this.data.completedQuests[missionNum];
    const newlyCompleted: MissionQuest[] = [];
    let iridiumAwarded = 0;

    const quests = this.getQuestsForMission(missionNum);

    // Vérification Quête 1 : Finir sans dégât sur la flotte
    if (conditions.noDamageFleet && !completed.includes('no_damage_fleet')) {
      completed.push('no_damage_fleet');
      this.addIridium(1);
      iridiumAwarded += 1;
      const q1 = quests.find(q => q.id === 'no_damage_fleet');
      if (q1) newlyCompleted.push({ ...q1, isCompleted: true });
    }

    // Vérification Quête 2 : Finir sans dégât sur le vaisseau mère (si mission d'escorte)
    const isEscort = LevelGenerator.getMissionType(missionNum) === 'escort';
    if (isEscort && conditions.noDamageMothership && !completed.includes('no_damage_mothership')) {
      completed.push('no_damage_mothership');
      this.addIridium(1);
      iridiumAwarded += 1;
      const q2 = quests.find(q => q.id === 'no_damage_mothership');
      if (q2) newlyCompleted.push({ ...q2, isCompleted: true });
    }

    if (iridiumAwarded > 0) {
      this.save();
    }

    return { newlyCompletedQuests: newlyCompleted, totalIridiumAwarded: iridiumAwarded };
  }

  // --- AMÉLIORATIONS À 5 ÉCHELONS (SPÉCIFIQUES AU NIVEAU SÉLECTIONNÉ) ---
  public getStepCost(type: keyof typeof UPGRADE_TRACKS_CONFIG): number {
    const config = UPGRADE_TRACKS_CONFIG[type];
    const track = this.getCurrentLevelData().upgradeTracks[type];
    if (track.step >= 5) return Infinity;
    // Coût progressif par échelon dans le palier
    return Math.round((config.baseStepCost + track.step * config.costPerStep) * track.tier);
  }

  public buyStep(type: keyof typeof UPGRADE_TRACKS_CONFIG): boolean {
    const lvl = this.getCurrentLevelData();
    const track = lvl.upgradeTracks[type];
    if (track.step >= 5) return false;

    const cost = this.getStepCost(type);
    if (lvl.diamonds >= cost) {
      lvl.diamonds -= cost;
      track.step++;
      this.save();
      return true;
    }
    return false;
  }

  private sessionFreeTierUps: Record<string, number> = { fireRate: 0, damage: 0, diamondBoost: 0 };

  // Vérifie si le joueur a le droit de passer ce palier avec des Diamants (1 palier autorisé par essai/retry)
  public canTierUpWithDiamonds(type: keyof typeof UPGRADE_TRACKS_CONFIG): boolean {
    const used = this.sessionFreeTierUps[type] || 0;
    return used < 1;
  }

  // Passer au palier supérieur avec des Diamants 💎 (1 seul par essai/session avant de devoir retry)
  public tierUpWithDiamonds(type: keyof typeof UPGRADE_TRACKS_CONFIG): boolean {
    const lvl = this.getCurrentLevelData();
    const track = lvl.upgradeTracks[type];
    if (track.step < 5 || !this.canTierUpWithDiamonds(type)) return false;

    const cost = Math.round(UPGRADE_TRACKS_CONFIG[type].tierDiamondCost * track.tier);
    if (lvl.diamonds >= cost) {
      lvl.diamonds -= cost;
      track.tier++;
      track.step = 0;
      this.sessionFreeTierUps[type] = (this.sessionFreeTierUps[type] || 0) + 1;
      this.save();
      return true;
    }
    return false;
  }

  // Passer au palier supérieur avec 1 Cristal 🔮 (débloque immédiatement sans restriction)
  public tierUpWithCrystal(type: keyof typeof UPGRADE_TRACKS_CONFIG): boolean {
    const lvl = this.getCurrentLevelData();
    const track = lvl.upgradeTracks[type];
    if (track.step < 5) return false;

    if (this.data.violetCrystals >= 1) {
      this.data.violetCrystals -= 1;
      track.tier++;
      track.step = 0;
      this.save();
      return true;
    }
    return false;
  }

  // Réinitialise le quota de passage de palier gratuit (appelé lors d'un retry / défaite / nouvelle tentative)
  public resetSessionTierAllowance() {
    this.sessionFreeTierUps = { fireRate: 0, damage: 0, diamondBoost: 0 };
  }

  public onRunDefeat() {
    this.resetSessionTierAllowance();
    this.save();
  }

  public completeMission(missionNum: number): { isFirstClear: boolean; crystalsAwarded: number } {
    let isFirstClear = false;
    let crystalsAwarded = 0;

    if (!this.data.completedMissions.includes(missionNum)) {
      this.data.completedMissions.push(missionNum);
      this.data.violetCrystals += 1;
      isFirstClear = true;
      crystalsAwarded = 1;
    }

    if (missionNum >= this.data.maxUnlockedMission) {
      this.data.maxUnlockedMission = missionNum + 1;
    }
    this.data.selectedMission = missionNum + 1;

    // Déblocage des équipements et du Hangar au Niveau 5 : attribution des objets de départ
    if (this.data.maxUnlockedMission >= 5 && (!this.data.inventory || !this.data.inventory.some(i => !i.isChest && i.slotType !== 'CHEST'))) {
      const starters = EquipmentSystem.createStarterItems();
      if (!this.data.inventory) this.data.inventory = [];
      this.data.inventory.push(...starters);
      this.data.hasNewLootNotification = true;
    }

    // S'assure que le nouveau niveau débloqué est initialisé à 0
    if (!this.data.levelUpgrades[missionNum + 1]) {
      this.data.levelUpgrades[missionNum + 1] = this.createDefaultLevelData();
    }
    
    this.save();

    return { isFirstClear, crystalsAwarded };
  }

  public selectMission(missionNum: number) {
    if (missionNum >= 1 && missionNum <= this.data.maxUnlockedMission) {
      this.data.selectedMission = missionNum;
      this.getCurrentLevelData();
      this.save();
    }
  }

  // --- HANGAR & SKINS ---
  public getSelectedSkin(): ShipSkin {
    const skin = SKINS_CONFIG.find(s => s.id === this.data.selectedSkinId);
    return skin || SKINS_CONFIG[0];
  }

  public selectSkin(skinId: string) {
    if (this.data.unlockedSkinIds.includes(skinId)) {
      this.data.selectedSkinId = skinId;
      this.save();
    }
  }

  public unlockSkin(skinId: string): boolean {
    const skin = SKINS_CONFIG.find(s => s.id === skinId);
    if (!skin || this.data.unlockedSkinIds.includes(skinId)) return false;

    const barCost = skin.costInBars ?? skin.costInCrystals;
    if ((this.data.iridiumBars || 0) >= barCost) {
      this.data.iridiumBars = (this.data.iridiumBars || 0) - barCost;
      this.data.unlockedSkinIds.push(skinId);
      this.data.selectedSkinId = skinId;
      this.save();
      return true;
    }
    return false;
  }

  // --- ÉQUIPEMENTS & BUTIN QUANTIQUE (SYSTÈME DE COFFRES) ---
  public generateMissionLoot(missionNum: number, isVictory: boolean = true): EquipmentItem | null {
    if (!isVictory) return null;
    // Règle du Trésor : chaque mission victorieuse octroie un Coffre scellé
    // - Avant le Niveau 5 : "Coffre Non Identifié" pour préserver la surprise du Hangar
    // - Après le Niveau 5 : "Coffre Stellaire" avec tirage et relance publicitaire dans le Hangar
    const chest = EquipmentSystem.generateChest(missionNum);
    if (!this.data.inventory) this.data.inventory = [];
    this.data.inventory.unshift(chest);
    this.data.hasNewLootNotification = true;
    this.save();
    return chest;
  }

  public openChest(chestId: string, finalItem: EquipmentItem): boolean {
    if (!this.data.inventory) return false;
    const idx = this.data.inventory.findIndex(i => i.id === chestId);
    if (idx === -1) return false;

    // Consommation du coffre et attribution de l'objet déverrouillé
    this.data.inventory.splice(idx, 1);
    this.data.inventory.unshift(finalItem);
    this.save();
    return true;
  }

  public getChestsCount(): number {
    return (this.data.inventory || []).filter(i => i.isChest || i.slotType === 'CHEST').length;
  }

  public getShipSlots(shipId: string): { slotType: EquipmentSlotType; item: EquipmentItem | null }[] {
    const skin = SKINS_CONFIG.find(s => s.id === shipId) || SKINS_CONFIG[0];
    const equipped = this.data.shipEquippedSlots?.[shipId] || [];
    return skin.slots.map((slotType, idx) => {
      const itemId = equipped[idx];
      const item = itemId ? (this.data.inventory?.find(i => i.id === itemId) || null) : null;
      return { slotType, item };
    });
  }

  public equipItem(shipId: string, slotIndex: number, itemId: string): boolean {
    const skin = SKINS_CONFIG.find(s => s.id === shipId);
    if (!skin || slotIndex < 0 || slotIndex >= skin.slots.length) return false;

    // Vaisseau non débloqué : impossible d'équiper !
    if (!this.data.unlockedSkinIds.includes(shipId)) return false;

    const item = this.data.inventory?.find(i => i.id === itemId);
    if (!item) return false;

    // Vérification de compatibilité de type de slot
    const targetSlotType = skin.slots[slotIndex];
    if (item.slotType !== targetSlotType) return false;

    if (!this.data.shipEquippedSlots) this.data.shipEquippedSlots = {};
    if (!this.data.shipEquippedSlots[shipId]) {
      this.data.shipEquippedSlots[shipId] = new Array(skin.slots.length).fill(null);
    }

    // Si cet item était déjà équipé ailleurs, le retirer
    Object.keys(this.data.shipEquippedSlots).forEach(sid => {
      const slots = this.data.shipEquippedSlots[sid];
      if (Array.isArray(slots)) {
        for (let j = 0; j < slots.length; j++) {
          if (slots[j] === itemId) slots[j] = null;
        }
      }
    });

    this.data.shipEquippedSlots[shipId][slotIndex] = itemId;
    this.save();
    return true;
  }

  public unequipItem(shipId: string, slotIndex: number): boolean {
    if (this.data.shipEquippedSlots?.[shipId] && this.data.shipEquippedSlots[shipId][slotIndex]) {
      this.data.shipEquippedSlots[shipId][slotIndex] = null;
      this.save();
      return true;
    }
    return false;
  }

  public recycleItem(itemId: string): number {
    const itemIdx = this.data.inventory?.findIndex(i => i.id === itemId);
    if (itemIdx === undefined || itemIdx < 0) return 0;

    const item = this.data.inventory[itemIdx];
    const diamondGain = RARITY_CONFIGS[item.rarity]?.recycleDiamonds || 15;

    // Déséquiper si présent
    if (this.data.shipEquippedSlots) {
      Object.keys(this.data.shipEquippedSlots).forEach(sid => {
        const slots = this.data.shipEquippedSlots[sid];
        if (Array.isArray(slots)) {
          for (let j = 0; j < slots.length; j++) {
            if (slots[j] === itemId) slots[j] = null;
          }
        }
      });
    }

    this.data.inventory.splice(itemIdx, 1);
    this.addDiamonds(diamondGain);
    this.save();
    return diamondGain;
  }

  public upgradeItem(itemId: string): { success: boolean; item?: EquipmentItem; cost: number; error?: string } {
    const item = this.data.inventory?.find(i => i.id === itemId);
    if (!item) return { success: false, cost: 0, error: 'Équipement introuvable' };

    if (item.level >= EquipmentSystem.MAX_ITEM_LEVEL) {
      return { success: false, cost: 0, error: `Niveau maximum (${EquipmentSystem.MAX_ITEM_LEVEL}) déjà atteint` };
    }

    const maxUnlocked = Math.max(1, this.data.maxUnlockedMission || 1);
    if (item.level >= maxUnlocked) {
      return { success: false, cost: 0, error: `Amélioration bloquée : débloquez d'abord la Mission ${item.level + 1} !` };
    }

    const { dustCost, iridiumBarsCost } = EquipmentSystem.getUpgradeCost(item);

    if (iridiumBarsCost > 0 && (this.data.iridiumBars || 0) < iridiumBarsCost) {
      return { success: false, cost: dustCost, error: `Barres d'iridium insuffisantes (${this.data.iridiumBars || 0}/${iridiumBarsCost} 🟦 requis pour le Niv. 20)` };
    }

    if ((this.data.diamondDust || 0) < dustCost) {
      return { success: false, cost: dustCost, error: `Poudre de diamant insuffisante (${this.data.diamondDust || 0}/${dustCost})` };
    }

    if (iridiumBarsCost > 0) {
      this.data.iridiumBars = (this.data.iridiumBars || 0) - iridiumBarsCost;
    }
    this.data.diamondDust = (this.data.diamondDust || 0) - dustCost;

    EquipmentSystem.upgradeItem(item);
    this.save();
    return { success: true, item, cost: dustCost };
  }

  public getEquippedStats(shipId: string): EquippedStatsResult {
    const res: EquippedStatsResult = {
      damageMultiplier: 1.0,
      fireRateMultiplier: 1.0,
      speedMultiplier: 1.0,
      diamondMultiplier: 1.0,
      bonusStartingShips: 0,
      specialEffects: {
        leaderExtraShots: 0,
        piercingExtraTargets: 0,
        hasExplosiveMissile: false,
        explosiveMissileDamageMult: 2.0,
        explosiveRadius: 0,
        explosiveDamagePct: 0,
        energyShieldHp: 0,
        leaderFireRateBonus: 0,
        fleetFireRateBonus: 0,
        bonusStartingShips: 0,
        dodgeChance: 0,
        magnetRadius: 0,
        critChance: 0
      },
      activeEffectDescriptions: []
    };

    // Avant de débloquer les équipements / le Hangar (Niveau 5), aucun bonus d'objet n'est accordé
    if (!this.data.unlockedSkinIds.includes(shipId) || (this.data.maxUnlockedMission || 1) < 5) {
      return res;
    }

    const slots = this.getShipSlots(shipId);
    for (const s of slots) {
      if (!s.item) continue;
      // Statistiques standard
      for (const st of s.item.stats) {
        if (st.type === 'damage') res.damageMultiplier += st.value / 100;
        else if (st.type === 'fireRate') res.fireRateMultiplier += st.value / 100;
        else if (st.type === 'speed') res.speedMultiplier += st.value / 100;
        else if (st.type === 'diamond') res.diamondMultiplier += st.value / 100;
        else if (st.type === 'shield') res.bonusStartingShips += st.value;
      }
      // Effet Spécial Unique
      const fx = EquipmentSystem.ensureItemSpecialEffect(s.item);
      if (fx && fx.type !== 'NONE') {
        res.activeEffectDescriptions.push(fx.label);
        switch (fx.type) {
          case 'LEADER_EXTRA_SHOTS':
            res.specialEffects.leaderExtraShots += fx.value;
            break;
          case 'PIERCING_SHOTS':
            res.specialEffects.piercingExtraTargets = Math.max(res.specialEffects.piercingExtraTargets, fx.value);
            break;
          case 'EXPLOSIVE_MISSILE':
            res.specialEffects.hasExplosiveMissile = true;
            res.specialEffects.explosiveMissileDamageMult = Math.max(res.specialEffects.explosiveMissileDamageMult, fx.value);
            break;
          case 'ENERGY_SHIELD':
            res.specialEffects.energyShieldHp += fx.value;
            break;
          case 'FLEET_RAPID_FIRE':
          case 'LEADER_RAPID_FIRE':
            res.specialEffects.fleetFireRateBonus += fx.value;
            break;
          case 'BONUS_STARTING_SHIPS':
            res.specialEffects.bonusStartingShips += fx.value;
            break;
          case 'EXPLOSIVE_ROUNDS':
            res.specialEffects.explosiveRadius = Math.max(res.specialEffects.explosiveRadius, fx.value);
            res.specialEffects.explosiveDamagePct = Math.max(res.specialEffects.explosiveDamagePct, fx.secondaryValue || 50);
            break;
          case 'WARP_DODGE':
            res.specialEffects.dodgeChance = Math.min(80, res.specialEffects.dodgeChance + fx.value);
            break;
          case 'CRYSTAL_MAGNET':
            res.specialEffects.bonusStartingShips += Math.max(1, Math.round(fx.value / 100));
            break;
          case 'CRITICAL_OVERDRIVE':
            res.specialEffects.critChance = Math.min(90, res.specialEffects.critChance + fx.value);
            break;
        }
      }
    }

    return res;
  }

  // --- GESTION DES DÉFIS QUOTIDIENS ---
  public checkDailyChallengesReset(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (!this.data.dailyChallenges || this.data.dailyChallenges.date !== today) {
      this.data.dailyChallenges = {
        date: today,
        attempts: {},
        doubledRuns: {}
      };
      this.save();
    }
  }

  public getChallengeAttemptsLeft(challengeId: string): number {
    this.checkDailyChallengesReset();
    const used = this.data.dailyChallenges.attempts[challengeId] || 0;
    return Math.max(0, 2 - used);
  }

  public canPlayChallenge(challengeId: string): boolean {
    return this.getChallengeAttemptsLeft(challengeId) > 0;
  }

  public consumeChallengeAttempt(challengeId: string): boolean {
    if (!this.canPlayChallenge(challengeId)) return false;
    const used = this.data.dailyChallenges.attempts[challengeId] || 0;
    this.data.dailyChallenges.attempts[challengeId] = used + 1;
    this.save();
    return true;
  }

  public canDoubleChallengeReward(challengeId: string): boolean {
    this.checkDailyChallengesReset();
    const doubled = this.data.dailyChallenges.doubledRuns[challengeId] || 0;
    const attempts = this.data.dailyChallenges.attempts[challengeId] || 0;
    return attempts > doubled;
  }

  public markChallengeDoubled(challengeId: string): void {
    const doubled = this.data.dailyChallenges.doubledRuns[challengeId] || 0;
    this.data.dailyChallenges.doubledRuns[challengeId] = doubled + 1;
    this.save();
  }

  // --- GESTION DES ÉVÉNEMENTS & CLASSEMENT SUR 100 JOUEURS ---
  public recordEventTime(timeMs: number): { rank: number; isNewRecord: boolean } {
    if (!this.data.eventSeason) {
      this.data.eventSeason = {
        eventId: 'event_season_1',
        seasonName: 'OPÉRATION NÉBULEUSE NOIRE // SAISON 1',
        divisionName: 'Division Orion #42',
        bestTimeMs: null,
        claimedMilestones: [],
        rank: 88
      };
    }

    let isNewRecord = false;
    if (this.data.eventSeason.bestTimeMs === null || timeMs < this.data.eventSeason.bestTimeMs) {
      this.data.eventSeason.bestTimeMs = timeMs;
      isNewRecord = true;
    }

    // Calcul du rang continu dans la division de 100 joueurs
    // Moins de 60s -> Rang 1 (Top 1%), ~100s -> Rang 15 (Top 15%), ~150s -> Rang 45, >220s -> Rang ~85
    const sec = this.data.eventSeason.bestTimeMs / 1000;
    let rank = Math.min(100, Math.max(1, Math.round(1 + Math.pow(Math.max(0, sec - 50) / 140, 1.4) * 99)));
    this.data.eventSeason.rank = rank;
    this.save();
    return { rank, isNewRecord };
  }

  public claimEventMilestone(milestoneId: string): boolean {
    if (!this.data.eventSeason) return false;
    if (this.data.eventSeason.claimedMilestones.includes(milestoneId)) return false;
    this.data.eventSeason.claimedMilestones.push(milestoneId);
    this.save();
    return true;
  }
}
