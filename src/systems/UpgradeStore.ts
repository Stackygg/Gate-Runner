// Système de sauvegarde locale avec Améliorations, Vaisseaux & Inventaire d'Équipements

import { UPGRADE_TRACKS_CONFIG, SKINS_CONFIG, ShipSkin } from '../config';
import { LevelGenerator } from './LevelGenerator';
import { SectorSystem } from './SectorSystem';
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
  credits: number;            // 🪙 Crédits galactiques (achats boutique, échanges)
  selectedMission: number;    // Mission active choisie (1, 2, 3...)
  maxUnlockedMission: number; // Niveau le plus élevé débloqué
  completedMissions: number[];// Missions réussies au moins 1 fois
  claimedChestMissions?: number[]; // Missions dont le coffre de 1er franchissement a été récupéré
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
  // Quêtes Quotidiennes, Succès & Boîte de Réception
  dailyQuests: DailyQuestsState;
  achievements: AchievementsState;
  inboxMessages: InboxMessage[];
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
  completions?: { [challengeKey: string]: number }; // Nombre de réussites permanentes par défi et niveau (ex: 'bars_1': 5)
}

export interface EventSeasonState {
  eventId: string;
  seasonName: string;
  divisionName: string;
  bestTimeMs: number | null;
  claimedMilestones: string[];
  rank: number;
}

export type DailyQuestType = 'campaign_missions' | 'shooting_enemies' | 'challenges' | 'open_chest' | 'shop_purchase';

export interface DailyQuestDefinition {
  id: string;
  title: string;
  desc: string;
  target: number;
  type: DailyQuestType;
  requiredFeature?: 'campaign' | 'enemies' | 'challenges' | 'hangar' | 'shop';
  reward: {
    type: 'credits' | 'diamonds' | 'crystals' | 'bars' | 'dust';
    amount: number;
  };
}

export interface DailyQuestItem extends DailyQuestDefinition {
  progress: number;
  isCompleted: boolean;
  isClaimed: boolean;
  isUnlocked: boolean;
  unlockRequirementText?: string;
}

export interface DailyQuestsState {
  date: string; // 'YYYY-MM-DD'
  quests: {
    [questId: string]: {
      progress: number;
      claimed: boolean;
    };
  };
  dailyChestClaimed?: boolean;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  desc: string;
  target: number;
  type: 'max_mission' | 'total_enemies' | 'max_fleet' | 'total_crystals' | 'upgrades_bought' | 'challenges_won';
  reward: {
    type: 'credits' | 'diamonds' | 'crystals' | 'bars' | 'dust';
    amount: number;
  };
}

export interface AchievementItem extends AchievementDefinition {
  progress: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

export interface AchievementsState {
  [achievementId: string]: {
    progress: number;
    claimed: boolean;
  };
}

export interface InboxMessage {
  id: string;
  date: string;
  sender: string;
  title: string;
  content: string;
  reward?: {
    type: 'credits' | 'diamonds' | 'crystals' | 'bars' | 'dust';
    amount: number;
  };
  isClaimed: boolean;
  isRead: boolean;
}

export const DAILY_QUESTS_CONFIG: DailyQuestDefinition[] = [
  {
    id: 'dq_campaign',
    title: 'Missions de Campagne',
    desc: 'Terminer 3 missions de campagne',
    target: 3,
    type: 'campaign_missions',
    requiredFeature: 'campaign',
    reward: { type: 'diamonds', amount: 50 }
  },
  {
    id: 'dq_shooting_enemies',
    title: 'Chasseur de Vaisseaux',
    desc: 'Éliminer 20 vaisseaux ennemis (hors astéroïdes)',
    target: 20,
    type: 'shooting_enemies',
    requiredFeature: 'enemies',
    reward: { type: 'diamonds', amount: 100 }
  },
  {
    id: 'dq_challenges',
    title: 'Convoi d\'Iridium',
    desc: 'Terminer 1 défi quotidien',
    target: 1,
    type: 'challenges',
    requiredFeature: 'challenges',
    reward: { type: 'bars', amount: 1 }
  },
  {
    id: 'dq_open_chest',
    title: 'Ravitaillement Hangar',
    desc: 'Ouvrir 1 coffre',
    target: 1,
    type: 'open_chest',
    requiredFeature: 'hangar',
    reward: { type: 'dust', amount: 10 }
  },
  {
    id: 'dq_shop_purchase',
    title: 'Client de la Boutique',
    desc: 'Acheter 1 objet dans la boutique (pubs incluses)',
    target: 1,
    type: 'shop_purchase',
    requiredFeature: 'shop',
    reward: { type: 'diamonds', amount: 50 }
  }
];

export const ACHIEVEMENTS_CONFIG: AchievementDefinition[] = [
  { id: 'ach_first_blood', title: 'Baptême de l\'Espace', desc: 'Compléter la première mission de campagne', target: 1, type: 'max_mission', reward: { type: 'diamonds', amount: 50 } },
  { id: 'ach_beta_sector', title: 'Franchir le Secteur Beta', desc: 'Atteindre le Secteur Beta (Mission 4)', target: 4, type: 'max_mission', reward: { type: 'bars', amount: 1 } },
  { id: 'ach_delta_sector', title: 'Explorateur du Secteur Delta', desc: 'Atteindre le Secteur Delta (Mission 10)', target: 10, type: 'max_mission', reward: { type: 'crystals', amount: 1 } },
  { id: 'ach_enemies_100', title: 'Tireur d\'Élite', desc: 'Éliminer 100 vaisseaux ennemis au total', target: 100, type: 'total_enemies', reward: { type: 'diamonds', amount: 100 } },
  { id: 'ach_enemies_500', title: 'Terreur des Corsaires', desc: 'Éliminer 500 vaisseaux ennemis au total', target: 500, type: 'total_enemies', reward: { type: 'bars', amount: 2 } },
  { id: 'ach_fleet_20', title: 'Amiral de Flotte', desc: 'Commander une armada de 20 vaisseaux en vol', target: 20, type: 'max_fleet', reward: { type: 'diamonds', amount: 150 } },
  { id: 'ach_crystals_10', title: 'Mineur d\'Iridium', desc: 'Récolter 10 minerais d\'iridium au total', target: 10, type: 'total_crystals', reward: { type: 'dust', amount: 25 } },
  { id: 'ach_challenges_5', title: 'Vétéran de l\'Iridium', desc: 'Compléter 5 défis du Convoi d\'Iridium', target: 5, type: 'challenges_won', reward: { type: 'bars', amount: 2 } }
];

export const DEFAULT_INBOX_MESSAGES: InboxMessage[] = [
  {
    id: 'msg_welcome',
    date: 'Transmission Prioritaire',
    sender: 'COMMUTATEUR DE LA FLOTTE',
    title: 'Dotation Initiale de Recrue',
    content: 'Commandant, félicitations pour votre affectation. L\'état-major vous alloue cette dotation d\'accueil (1 Iridium Quantique) pour préparer votre flotte.',
    reward: { type: 'crystals', amount: 1 },
    isClaimed: false,
    isRead: false
  },
  {
    id: 'msg_daily_briefing',
    date: 'Ordres du Jour',
    sender: 'CENTRE DES OPÉRATIONS',
    title: 'Protocole Quotidien Activé',
    content: 'Les objectifs quotidiens sont réinitialisés chaque nuit à minuit (fuseau France/Belgique). Consultez régulièrement votre terminal de Quêtes pour maximiser vos gains.',
    reward: { type: 'diamonds', amount: 50 },
    isClaimed: false,
    isRead: false
  }
];

export function getParisDateString(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function getParisCountdownToMidnight(): { hours: number; minutes: number; text: string } {
  try {
    const now = new Date();
    const parisString = now.toLocaleString('en-US', { timeZone: 'Europe/Paris' });
    const parisNow = new Date(parisString);
    const parisMidnight = new Date(parisNow);
    parisMidnight.setHours(24, 0, 0, 0);
    const diff = Math.max(0, parisMidnight.getTime() - parisNow.getTime());
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return {
      hours,
      minutes,
      text: `${hours} H ${minutes} Min`
    };
  } catch {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = Math.max(0, midnight.getTime() - now.getTime());
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return {
      hours,
      minutes,
      text: `${hours} H ${minutes} Min`
    };
  }
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
      credits: 0,
      selectedMission: 1,
      maxUnlockedMission: 1,
      completedMissions: [],
      claimedChestMissions: [],
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
      dailyQuests: {
        date: getParisDateString(),
        quests: {},
        dailyChestClaimed: false
      },
      achievements: {},
      inboxMessages: DEFAULT_INBOX_MESSAGES.map(m => ({ ...m })),
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
        if (parsed.credits !== undefined) defaultData.credits = parsed.credits;
        if (parsed.selectedMission !== undefined) defaultData.selectedMission = parsed.selectedMission;
        if (parsed.maxUnlockedMission !== undefined) defaultData.maxUnlockedMission = parsed.maxUnlockedMission;
        if (parsed.completedMissions !== undefined) defaultData.completedMissions = parsed.completedMissions;
        if (parsed.claimedChestMissions !== undefined) {
          defaultData.claimedChestMissions = parsed.claimedChestMissions;
        } else if (parsed.completedMissions !== undefined) {
          defaultData.claimedChestMissions = [...parsed.completedMissions];
        }
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
        if (parsed.dailyQuests !== undefined) {
          defaultData.dailyQuests = parsed.dailyQuests;
          if (defaultData.dailyQuests.dailyChestClaimed === undefined) {
            defaultData.dailyQuests.dailyChestClaimed = false;
          }
        }
        if (parsed.achievements !== undefined) defaultData.achievements = parsed.achievements;
        if (parsed.inboxMessages !== undefined && Array.isArray(parsed.inboxMessages)) {
          defaultData.inboxMessages = parsed.inboxMessages;
        }
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
        credits: this.data.credits,
        selectedMission: this.data.selectedMission,
        maxUnlockedMission: this.data.maxUnlockedMission,
        completedMissions: this.data.completedMissions,
        claimedChestMissions: this.data.claimedChestMissions,
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
        eventSeason: this.data.eventSeason,
        dailyQuests: this.data.dailyQuests,
        achievements: this.data.achievements,
        inboxMessages: this.data.inboxMessages
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {}
  }

  // --- MONNAIES (DIAMANTS DU NIVEAU ACTIF, CRÉDITS, IRIDIUM BRUT, BARRES D'IRIDIUM, POUDRE DE DIAMANT) ---
  public getCredits(): number {
    return this.data.credits || 0;
  }

  public addCredits(amount: number) {
    this.data.credits = (this.data.credits || 0) + Math.max(0, Math.round(amount));
    this.save();
  }

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
    
    // Règle du coffre unique : accordé uniquement lors de la 1ère réalisation du niveau
    if (!this.data.claimedChestMissions) this.data.claimedChestMissions = [];
    if (this.data.claimedChestMissions.includes(missionNum)) {
      return null;
    }
    this.data.claimedChestMissions.push(missionNum);

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

    const currentRank = item.rank || 1;
    if (currentRank >= EquipmentSystem.MAX_ITEM_RANK) {
      return { success: false, cost: 0, error: `Rang maximum (${EquipmentSystem.MAX_ITEM_RANK}) déjà atteint` };
    }

    const { dustCost, iridiumBarsCost } = EquipmentSystem.getUpgradeCost(item);

    if (iridiumBarsCost > 0 && (this.data.iridiumBars || 0) < iridiumBarsCost) {
      return { success: false, cost: dustCost, error: `Barres d'iridium insuffisantes (${this.data.iridiumBars || 0}/${iridiumBarsCost} 🟦 requises pour le Rang 20)` };
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
      const existingCompletions = this.data.dailyChallenges?.completions || {};
      this.data.dailyChallenges = {
        date: today,
        attempts: {},
        doubledRuns: {},
        completions: existingCompletions
      };
      this.save();
    } else if (!this.data.dailyChallenges.completions) {
      this.data.dailyChallenges.completions = {};
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

  public resetChallengeAttempts(challengeId?: string): void {
    if (!this.data.dailyChallenges) {
      this.data.dailyChallenges = {
        date: new Date().toISOString().split('T')[0],
        attempts: {},
        doubledRuns: {},
        completions: {}
      };
    }
    if (challengeId) {
      delete this.data.dailyChallenges.attempts[challengeId];
      delete this.data.dailyChallenges.doubledRuns[challengeId];
    } else {
      this.data.dailyChallenges.attempts = {};
      this.data.dailyChallenges.doubledRuns = {};
    }
    this.save();
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

  /**
   * Retourne le nombre de fois que ce défi a été réussi à ce niveau
   */
  public getChallengeCompletions(challengeId: string, level: number): number {
    this.checkDailyChallengesReset();
    const key = `${challengeId}_${level}`;
    return this.data.dailyChallenges.completions?.[key] || 0;
  }

  /**
   * Enregistre une victoire sur ce défi à ce niveau (+1 réussite)
   */
  public recordChallengeVictory(challengeId: string, level: number): void {
    this.checkDailyChallengesReset();
    const key = `${challengeId}_${level}`;
    if (!this.data.dailyChallenges.completions) {
      this.data.dailyChallenges.completions = {};
    }
    this.data.dailyChallenges.completions[key] = (this.data.dailyChallenges.completions[key] || 0) + 1;
    this.save();
  }

  /**
   * Indique si la simulation est débloquée (>= 5 réussites sur ce niveau)
   */
  public canSimulateChallenge(challengeId: string, level: number): boolean {
    return this.getChallengeCompletions(challengeId, level) >= 5;
  }

  // Défi actif en cours de jeu (si lancé via l'écran des défis)
  public activeChallenge: { id: 'bars' | 'dust'; level: number } | null = null;

  public setActiveChallenge(challenge: { id: 'bars' | 'dust'; level: number } | null): void {
    this.activeChallenge = challenge;
  }

  public getActiveChallenge(): { id: 'bars' | 'dust'; level: number } | null {
    return this.activeChallenge;
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

  // =========================================================================
  // GESTION DES RÉCOMPENSES MULTI-DEVISES
  // =========================================================================
  public addReward(type: 'credits' | 'diamonds' | 'crystals' | 'bars' | 'dust', amount: number) {
    if (type === 'credits') {
      this.addCredits(amount);
    } else if (type === 'diamonds') {
      const activeMission = this.data.selectedMission || 1;
      this.addDiamondsToMission(activeMission, amount);
    } else if (type === 'crystals') {
      this.addCrystals(amount);
    } else if (type === 'bars') {
      this.addIridiumBars(amount);
    } else if (type === 'dust') {
      this.addDiamondDust(amount);
    }
  }

  // =========================================================================
  // QUÊTES QUOTIDIENNES (Reset Minuit Heure de Paris)
  // =========================================================================
  public checkDailyQuestsReset(): void {
    const today = getParisDateString();
    if (!this.data.dailyQuests || this.data.dailyQuests.date !== today) {
      this.data.dailyQuests = {
        date: today,
        quests: {},
        dailyChestClaimed: false
      };
      this.save();
    }
  }

  public getDailyQuests(): DailyQuestItem[] {
    this.checkDailyQuestsReset();
    const maxUnlocked = this.data.maxUnlockedMission || 1;

    return DAILY_QUESTS_CONFIG.map(cfg => {
      const state = this.data.dailyQuests.quests[cfg.id] || { progress: 0, claimed: false };
      const progress = Math.min(cfg.target, state.progress || 0);
      const isCompleted = progress >= cfg.target;
      const isClaimed = !!state.claimed;

      let isUnlocked = true;
      let unlockRequirementText = '';

      if (cfg.requiredFeature === 'challenges') {
        isUnlocked = SectorSystem.isFeatureUnlocked('challenges', maxUnlocked);
        if (!isUnlocked) unlockRequirementText = 'Disponible au Secteur Beta (Mission 4)';
      } else if (cfg.requiredFeature === 'hangar') {
        isUnlocked = SectorSystem.isFeatureUnlocked('hangar', maxUnlocked);
        if (!isUnlocked) unlockRequirementText = 'Disponible au Secteur Beta (Mission 4)';
      }

      return {
        ...cfg,
        progress,
        isCompleted,
        isClaimed,
        isUnlocked,
        unlockRequirementText
      };
    });
  }

  public getDailyFeasibleQuests(): DailyQuestItem[] {
    return this.getDailyQuests().filter(q => q.isUnlocked);
  }

  public isDailyChestUnlocked(): boolean {
    const feasible = this.getDailyFeasibleQuests();
    if (feasible.length === 0) return false;
    return feasible.every(q => q.isCompleted);
  }

  public isDailyChestClaimed(): boolean {
    this.checkDailyQuestsReset();
    return !!this.data.dailyQuests.dailyChestClaimed;
  }

  public claimDailyChest(): { success: boolean; reward?: { type: 'crystals'; amount: number } } {
    this.checkDailyQuestsReset();
    if (!this.isDailyChestUnlocked() || this.isDailyChestClaimed()) {
      return { success: false };
    }
    this.data.dailyQuests.dailyChestClaimed = true;
    this.addReward('crystals', 1);
    this.save();
    return { success: true, reward: { type: 'crystals', amount: 1 } };
  }

  public recordDailyQuestProgress(type: DailyQuestType, amount: number = 1): void {
    this.checkDailyQuestsReset();
    let hasChanged = false;
    const maxUnlocked = this.data.maxUnlockedMission || 1;

    for (const cfg of DAILY_QUESTS_CONFIG) {
      if (cfg.type === type) {
        // Ne pas progresser si la fonctionnalité est encore verrouillée
        if (cfg.requiredFeature === 'challenges' && !SectorSystem.isFeatureUnlocked('challenges', maxUnlocked)) {
          continue;
        }
        if (cfg.requiredFeature === 'hangar' && !SectorSystem.isFeatureUnlocked('hangar', maxUnlocked)) {
          continue;
        }

        if (!this.data.dailyQuests.quests[cfg.id]) {
          this.data.dailyQuests.quests[cfg.id] = { progress: 0, claimed: false };
        }
        const q = this.data.dailyQuests.quests[cfg.id];
        if (q.progress < cfg.target) {
          q.progress = Math.min(cfg.target, q.progress + amount);
          hasChanged = true;
        }
      }
    }

    if (hasChanged) {
      this.save();
    }
  }

  public claimDailyQuest(questId: string): { success: boolean; reward?: { type: 'credits' | 'diamonds' | 'crystals' | 'bars' | 'dust'; amount: number } } {
    this.checkDailyQuestsReset();
    const cfg = DAILY_QUESTS_CONFIG.find(q => q.id === questId);
    if (!cfg) return { success: false };

    const q = this.data.dailyQuests.quests[questId];
    if (!q || q.progress < cfg.target || q.claimed) {
      return { success: false };
    }

    q.claimed = true;
    this.addReward(cfg.reward.type, cfg.reward.amount);
    this.save();
    return { success: true, reward: cfg.reward };
  }

  // =========================================================================
  // SUCCÈS (ACHIEVEMENTS À VIE)
  // =========================================================================
  public getAchievements(): AchievementItem[] {
    if (!this.data.achievements) {
      this.data.achievements = {};
    }

    // Calcul / synchronisation dynamique des succès basés sur l'état existant
    const currentMaxMission = this.data.maxUnlockedMission || 1;
    const currentTotalCrystals = this.data.violetCrystals || 0;

    return ACHIEVEMENTS_CONFIG.map(cfg => {
      let state = this.data.achievements[cfg.id];
      if (!state) {
        state = { progress: 0, claimed: false };
        this.data.achievements[cfg.id] = state;
      }

      // Sync auto selon les stats déjà existantes
      if (cfg.type === 'max_mission') {
        state.progress = Math.max(state.progress, currentMaxMission);
      } else if (cfg.type === 'total_crystals') {
        state.progress = Math.max(state.progress, currentTotalCrystals);
      }

      const progress = Math.min(cfg.target, state.progress);
      const isCompleted = progress >= cfg.target;
      const isClaimed = !!state.claimed;

      return {
        ...cfg,
        progress,
        isCompleted,
        isClaimed
      };
    });
  }

  public recordAchievementProgress(type: 'max_mission' | 'total_enemies' | 'max_fleet' | 'total_crystals' | 'upgrades_bought' | 'challenges_won', amountOrValue: number, isSet: boolean = false): void {
    if (!this.data.achievements) {
      this.data.achievements = {};
    }
    let hasChanged = false;

    for (const cfg of ACHIEVEMENTS_CONFIG) {
      if (cfg.type === type) {
        if (!this.data.achievements[cfg.id]) {
          this.data.achievements[cfg.id] = { progress: 0, claimed: false };
        }
        const a = this.data.achievements[cfg.id];
        if (isSet) {
          if (amountOrValue > a.progress) {
            a.progress = Math.min(cfg.target, amountOrValue);
            hasChanged = true;
          }
        } else {
          if (a.progress < cfg.target) {
            a.progress = Math.min(cfg.target, a.progress + amountOrValue);
            hasChanged = true;
          }
        }
      }
    }

    if (hasChanged) {
      this.save();
    }
  }

  public claimAchievement(achievementId: string): { success: boolean; reward?: { type: 'credits' | 'diamonds' | 'crystals' | 'bars' | 'dust'; amount: number } } {
    if (!this.data.achievements) return { success: false };
    const cfg = ACHIEVEMENTS_CONFIG.find(a => a.id === achievementId);
    if (!cfg) return { success: false };

    const a = this.data.achievements[achievementId];
    if (!a || a.progress < cfg.target || a.claimed) {
      return { success: false };
    }

    a.claimed = true;
    this.addReward(cfg.reward.type, cfg.reward.amount);
    this.save();
    return { success: true, reward: cfg.reward };
  }

  // =========================================================================
  // BOÎTE DE RÉCEPTION (INBOX)
  // =========================================================================
  public getInboxMessages(): InboxMessage[] {
    if (!this.data.inboxMessages || !Array.isArray(this.data.inboxMessages) || this.data.inboxMessages.length === 0) {
      this.data.inboxMessages = DEFAULT_INBOX_MESSAGES.map(m => ({ ...m }));
      this.save();
    }
    return this.data.inboxMessages;
  }

  public claimInboxMessage(messageId: string): { success: boolean; reward?: { type: 'credits' | 'diamonds' | 'crystals' | 'bars' | 'dust'; amount: number } } {
    const messages = this.getInboxMessages();
    const msg = messages.find(m => m.id === messageId);
    if (!msg || msg.isClaimed || !msg.reward) {
      return { success: false };
    }

    msg.isClaimed = true;
    msg.isRead = true;
    this.addReward(msg.reward.type, msg.reward.amount);
    this.save();
    return { success: true, reward: msg.reward };
  }

  // =========================================================================
  // INDICATEURS DE NOTIFICATION
  // =========================================================================
  public getUnclaimedQuestsCount(): number {
    const unclaimedQuests = this.getDailyQuests().filter(q => q.isUnlocked && q.isCompleted && !q.isClaimed).length;
    const unclaimedChest = (this.isDailyChestUnlocked() && !this.isDailyChestClaimed()) ? 1 : 0;
    return unclaimedQuests + unclaimedChest;
  }

  public getUnclaimedAchievementsCount(): number {
    return this.getAchievements().filter(a => a.isCompleted && !a.isClaimed).length;
  }

  public getUnclaimedInboxCount(): number {
    return this.getInboxMessages().filter(m => !m.isClaimed && m.reward).length;
  }

  public hasUnclaimedQuestsOrAchievements(): boolean {
    return (this.getUnclaimedQuestsCount() + this.getUnclaimedAchievementsCount()) > 0;
  }
}

