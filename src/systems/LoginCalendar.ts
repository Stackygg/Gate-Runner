// Calendrier de connexion : 31 jours de récompenses pour les connexions consécutives.
// - Un jour manqué fait repartir la série au jour 1.
// - Après le jour 31, un nouveau cycle recommence au jour 1.
// - Les jours 7, 14, 21, 28 et 31 sont des grands paliers (coffres garantis, barres d'iridium).

import { UpgradeStore, getParisDateString } from './UpgradeStore';
import { EquipmentRarity, EquipmentSystem } from './EquipmentSystem';

export const LOGIN_CALENDAR_DAYS = 31;

export interface LoginReward {
  dust?: number;
  iridium?: number;
  bars?: number;
  chest?: EquipmentRarity; // Coffre d'équipement à rareté garantie
}

export const LOGIN_REWARDS: LoginReward[] = [
  { dust: 20 },                      // J1
  { iridium: 1 },                    // J2
  { dust: 30 },                      // J3
  { bars: 1 },                       // J4
  { dust: 40 },                      // J5
  { iridium: 2 },                    // J6
  { chest: 'EPIC', iridium: 3 },     // J7 ★
  { dust: 30 },                      // J8
  { iridium: 1 },                    // J9
  { dust: 40 },                      // J10
  { bars: 1 },                       // J11
  { dust: 50 },                      // J12
  { iridium: 2 },                    // J13
  { bars: 5, dust: 150 },            // J14 ★
  { dust: 40 },                      // J15
  { iridium: 2 },                    // J16
  { dust: 50 },                      // J17
  { bars: 2 },                       // J18
  { dust: 60 },                      // J19
  { iridium: 3 },                    // J20
  { chest: 'LEGENDARY', iridium: 5 },// J21 ★
  { dust: 50 },                      // J22
  { iridium: 2 },                    // J23
  { dust: 60 },                      // J24
  { bars: 2 },                       // J25
  { dust: 75 },                      // J26
  { iridium: 3 },                    // J27
  { bars: 10, dust: 300 },           // J28 ★
  { dust: 75 },                      // J29
  { iridium: 3 },                    // J30
  { chest: 'MYTHIC', bars: 10 }      // J31 ★★
];

export const LOGIN_MILESTONE_DAYS = [7, 14, 21, 28, 31];

export interface LoginCalendarStatus {
  claimedDay: number;      // Dernier jour réclamé de la série en cours (0 si aucun)
  nextDay: number;         // Jour réclamable aujourd'hui (ou demain si déjà réclamé)
  canClaimToday: boolean;
  streakBroken: boolean;   // Une série existait mais un jour a été manqué
}

function previousDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export class LoginCalendar {
  public static getStatus(store: UpgradeStore): LoginCalendarStatus {
    const today = getParisDateString();
    const state = store.data.loginCalendar || { day: 0, lastClaimDate: null };

    if (state.lastClaimDate === today) {
      return { claimedDay: state.day, nextDay: (state.day % LOGIN_CALENDAR_DAYS) + 1, canClaimToday: false, streakBroken: false };
    }

    const isConsecutive = state.lastClaimDate !== null && state.lastClaimDate === previousDate(today);
    if (isConsecutive && state.day < LOGIN_CALENDAR_DAYS) {
      return { claimedDay: state.day, nextDay: state.day + 1, canClaimToday: true, streakBroken: false };
    }

    // Première connexion, cycle de 31 jours terminé ou série interrompue : retour au jour 1
    const streakBroken = state.day > 0 && !isConsecutive;
    return { claimedDay: 0, nextDay: 1, canClaimToday: true, streakBroken };
  }

  /**
   * Verse la récompense du jour et avance la série. Renvoie la récompense versée (ou null si déjà réclamée).
   */
  public static claim(store: UpgradeStore): { day: number; reward: LoginReward } | null {
    const status = this.getStatus(store);
    if (!status.canClaimToday) return null;

    const day = status.nextDay;
    const reward = LOGIN_REWARDS[day - 1];

    if (reward.dust) store.addDiamondDust(reward.dust);
    if (reward.iridium) store.addIridium(reward.iridium);
    if (reward.bars) store.addIridiumBars(reward.bars);
    if (reward.chest) {
      const level = Math.max(1, store.data.maxUnlockedMission || 1);
      const chest = EquipmentSystem.generateRewardChest(level, reward.chest, `Coffre de connexion — Jour ${day}`);
      if (!store.data.inventory) store.data.inventory = [];
      store.data.inventory.unshift(chest);
      store.data.hasNewLootNotification = true;
    }

    store.data.loginCalendar = { day, lastClaimDate: getParisDateString() };
    store.save();
    return { day, reward };
  }
}
