// Système de Secteurs & Progression Modulaire
// Nommage des secteurs en alphabet grec : Secteur Alpha, Secteur Beta, Secteur Gamma...

export interface SectorConfig {
  sector: number;
  name: string;
  missions: number[]; // Niveaux / missions globales appartenant à ce secteur
}

export interface SectorInfo {
  sector: number;
  levelInSector: number;
  totalLevelsInSector: number;
  sectorName: string;
  globalMission: number;
}

export type GalacticFeature = 'hangar' | 'challenges' | 'refinery' | 'events';

// Alphabet Grec pour la dénomination des Secteurs
export const GREEK_SECTOR_NAMES = [
  'Alpha',
  'Beta',
  'Gamma',
  'Delta',
  'Epsilon',
  'Zeta',
  'Eta',
  'Theta',
  'Iota',
  'Kappa',
  'Lambda',
  'Mu',
  'Nu',
  'Xi',
  'Omicron',
  'Pi',
  'Rho',
  'Sigma',
  'Tau',
  'Upsilon',
  'Phi',
  'Chi',
  'Psi',
  'Omega'
];

export function getGreekSectorName(sector: number): string {
  if (sector >= 1 && sector <= GREEK_SECTOR_NAMES.length) {
    return GREEK_SECTOR_NAMES[sector - 1];
  }
  return `Secteur ${sector}`;
}

export interface UnlockedFeatureItem {
  icon: string;
  title: string;
  desc: string;
}

export interface SectorBossInfo {
  sector: number;
  bossName: string;
  mission: number;
  enemyType: 'boss_alpharion' | 'boss_betapulsar' | 'boss_gammargantua';
  nextSectorGreek: string;
  nextSectorName: string;
  unlockedFeatures: UnlockedFeatureItem[];
}

export const SECTOR_BOSSES: Record<number, SectorBossInfo> = {
  1: {
    sector: 1,
    bossName: 'Alpharion',
    mission: 4,
    enemyType: 'boss_alpharion',
    nextSectorGreek: 'Β',
    nextSectorName: 'Beta',
    unlockedFeatures: [
      { icon: '🛸', title: 'Hangar de Flotte', desc: 'Gestion des prototypes de vaisseaux, modules et équipements.' },
      { icon: '⚔️', title: 'Défis Galactiques', desc: 'Missions spéciales d\'escorte de convois et raids à haut rendement.' },
      { icon: '🌌', title: 'Secteur Beta', desc: 'Nouvelle région spatiale : 5 missions dont les interceptions de convois.' }
    ]
  },
  2: {
    sector: 2,
    bossName: 'Betapulsar',
    mission: 9,
    enemyType: 'boss_betapulsar',
    nextSectorGreek: 'Γ',
    nextSectorName: 'Gamma',
    unlockedFeatures: [
      { icon: '⚡', title: 'Prototypes Tier II', desc: 'Vaisseaux prototypes de rang supérieur avec blindage renforcé.' },
      { icon: '☀️', title: 'Missions Éruptions Solaires', desc: 'Nouvelles missions de combat stellaire et de traversée de flares.' },
      { icon: '🌌', title: 'Secteur Gamma', desc: 'Frontière de la nébuleuse sombre : 6 missions et forteresses spatiales.' }
    ]
  },
  3: {
    sector: 3,
    bossName: 'Gammargantua',
    mission: 15,
    enemyType: 'boss_gammargantua',
    nextSectorGreek: 'Δ',
    nextSectorName: 'Delta',
    unlockedFeatures: [
      { icon: '🏭', title: 'Raffinerie de Matière Noire', desc: 'Conversion d\'énergie pure et fabrication de composants quantiques.' },
      { icon: '🏆', title: 'Défis Rang II', desc: 'Défis d\'arène de niveau 2 avec récompenses d\'iridium accrues.' },
      { icon: '🌌', title: 'Secteur Delta', desc: 'Entrée dans le quadrant impérial et confrontation avec l\'armada lourde.' }
    ]
  }
};

export const SECTORS_CONFIG: SectorConfig[] = [
  {
    sector: 1,
    name: 'Secteur Alpha',
    missions: [1, 2, 3, 4] // Mission 4 = Boss Duel Alpharion
  },
  {
    sector: 2,
    name: 'Secteur Beta',
    missions: [5, 6, 7, 8, 9] // Mission 9 = Boss Duel Betapulsar
  },
  {
    sector: 3,
    name: 'Secteur Gamma',
    missions: [10, 11, 12, 13, 14, 15] // Mission 15 = Boss Duel Gammargantua
  },
  {
    sector: 4,
    name: 'Secteur Delta',
    missions: [16, 17, 18, 19, 20, 21, 22] // 7 missions
  },
  {
    sector: 5,
    name: 'Secteur Epsilon',
    missions: [23, 24, 25, 26, 27, 28, 29, 30] // 8 missions
  },
  {
    sector: 6,
    name: 'Secteur Zeta',
    missions: [31, 32, 33, 34, 35, 36, 37, 38, 39]
  },
  {
    sector: 7,
    name: 'Secteur Eta',
    missions: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49]
  },
  {
    sector: 8,
    name: 'Secteur Theta',
    missions: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60]
  },
  {
    sector: 9,
    name: 'Secteur Iota',
    missions: [61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72]
  },
  {
    sector: 10,
    name: 'Secteur Kappa',
    missions: [73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85]
  }
];

// Configuration des 5 Niveaux de Défi et Déblocage par Secteur
export interface ChallengeLevelConfig {
  level: number;
  requiredSector: number;
  requiredSectorName: string;
  difficultyLabel: string;
  rewards: {
    bars: number;
    dust: number;
  };
}

export const CHALLENGE_LEVELS_CONFIG: ChallengeLevelConfig[] = [
  { level: 1, requiredSector: 2, requiredSectorName: 'Beta', difficultyLabel: 'NORMAL', rewards: { bars: 2, dust: 15 } },
  { level: 2, requiredSector: 4, requiredSectorName: 'Delta', difficultyLabel: 'DIFFICILE', rewards: { bars: 3, dust: 25 } },
  { level: 3, requiredSector: 6, requiredSectorName: 'Zeta', difficultyLabel: 'EXPERT', rewards: { bars: 5, dust: 40 } },
  { level: 4, requiredSector: 8, requiredSectorName: 'Theta', difficultyLabel: 'MAÎTRE', rewards: { bars: 8, dust: 65 } },
  { level: 5, requiredSector: 10, requiredSectorName: 'Kappa', difficultyLabel: 'CAUCHEMAR', rewards: { bars: 12, dust: 100 } }
];

// Paliers de déblocage des fonctionnalités par Secteur
export const FEATURE_UNLOCK_SECTORS: Record<GalacticFeature, number> = {
  hangar: 2,      // Débloqué au Secteur Beta (Mission >= 5, après la victoire sur Alpharion)
  challenges: 2,  // Débloqué au Secteur Beta (Mission >= 5)
  refinery: 4,    // Débloqué au Secteur Delta (Mission >= 16, après la victoire sur Gammargantua)
  events: 5       // Débloqué au Secteur Epsilon (Mission >= 23)
};

export class SectorSystem {
  /**
   * Vérifie si un niveau de défi (1 à 5) est débloqué selon la mission max atteinte
   */
  public static isChallengeLevelUnlocked(level: number, maxUnlockedMission: number): boolean {
    const cfg = CHALLENGE_LEVELS_CONFIG.find(c => c.level === level) || CHALLENGE_LEVELS_CONFIG[0];
    const playerSector = this.getSectorForMission(maxUnlockedMission);
    return playerSector >= cfg.requiredSector;
  }

  /**
   * Retourne la configuration d'un niveau de défi
   */
  public static getChallengeLevelConfig(level: number): ChallengeLevelConfig {
    return CHALLENGE_LEVELS_CONFIG.find(c => c.level === level) || CHALLENGE_LEVELS_CONFIG[0];
  }

  /**
   * Retourne le niveau maximum de défi affichable :
   * Tous les niveaux débloqués + au maximum UN niveau verrouillé suivant (plafonné à 5).
   */
  public static getMaxVisibleChallengeLevel(maxUnlockedMission: number): number {
    let highestUnlocked = 0;
    for (const cfg of CHALLENGE_LEVELS_CONFIG) {
      if (this.isChallengeLevelUnlocked(cfg.level, maxUnlockedMission)) {
        highestUnlocked = cfg.level;
      }
    }
    return Math.min(CHALLENGE_LEVELS_CONFIG.length, highestUnlocked + 1);
  }

  /**
   * Retourne le plus haut niveau de défi débloqué pour le joueur (1 à 5).
   */
  public static getHighestUnlockedChallengeLevel(maxUnlockedMission: number): number {
    let highestUnlocked = 1;
    for (const cfg of CHALLENGE_LEVELS_CONFIG) {
      if (this.isChallengeLevelUnlocked(cfg.level, maxUnlockedMission)) {
        highestUnlocked = Math.max(highestUnlocked, cfg.level);
      }
    }
    return highestUnlocked;
  }

  /**
   * Retourne le nom grec du secteur (ex: "Alpha", "Beta", "Delta"...)
   */
  public static getSectorName(sector: number): string {
    return getGreekSectorName(sector);
  }

  /**
   * Retourne le numéro de secteur correspondant à une mission globale (1, 2, 3...)
   */
  public static getSectorForMission(mission: number): number {
    if (mission <= 0) return 1;

    for (const sec of SECTORS_CONFIG) {
      if (sec.missions.includes(mission)) {
        return sec.sector;
      }
    }

    // Calcul procédural si la mission dépasse la liste préconfigurée (3 missions par défaut par secteur)
    const lastConfigured = SECTORS_CONFIG[SECTORS_CONFIG.length - 1];
    const lastMission = lastConfigured.missions[lastConfigured.missions.length - 1];
    if (mission > lastMission) {
      const diff = mission - lastMission;
      return lastConfigured.sector + Math.ceil(diff / 3);
    }

    return 1;
  }

  /**
   * Retourne l'index du niveau dans le secteur (1-indexed : ex: Niveau 1, 2 ou 3)
   */
  public static getLevelInSector(mission: number): number {
    if (mission <= 0) return 1;

    for (const sec of SECTORS_CONFIG) {
      const idx = sec.missions.indexOf(mission);
      if (idx !== -1) {
        return idx + 1;
      }
    }

    // Fallback procédural : cycle de 3
    const r = ((mission - 1) % 3) + 1;
    return r;
  }

  /**
   * Retourne la liste des missions/niveaux appartenant à un secteur
   */
  public static getMissionsForSector(sector: number): number[] {
    if (sector <= 0) return [1, 2, 3];
    const config = SECTORS_CONFIG.find(s => s.sector === sector);
    if (config) {
      return [...config.missions];
    }
    // Fallback procédural : 3 missions par secteur
    const start = 1 + (sector - 1) * 3;
    return [start, start + 1, start + 2];
  }

  /**
   * Retourne le numéro global de mission pour un secteur et un niveau dans ce secteur
   */
  public static getMissionForSectorAndLevel(sector: number, levelInSector: number): number {
    const missions = this.getMissionsForSector(sector);
    const clampedLevel = Math.max(1, Math.min(levelInSector, missions.length));
    return missions[clampedLevel - 1];
  }

  /**
   * Retourne le nombre total de secteurs configurés
   */
  public static getMaxSectors(): number {
    return SECTORS_CONFIG.length;
  }

  /**
   * Retourne les informations complètes du secteur pour une mission donnée
   */
  public static getSectorInfo(mission: number): SectorInfo {
    const sectorNum = this.getSectorForMission(mission);
    const levelInSector = this.getLevelInSector(mission);

    const config = SECTORS_CONFIG.find(s => s.sector === sectorNum);
    const totalLevels = config ? config.missions.length : 3;
    const greekName = getGreekSectorName(sectorNum);
    const name = config ? config.name : `Secteur ${greekName}`;

    return {
      sector: sectorNum,
      levelInSector,
      totalLevelsInSector: totalLevels,
      sectorName: name,
      globalMission: mission
    };
  }

  /**
   * Retourne le secteur requis pour une fonctionnalité
   */
  public static getFeatureUnlockSector(feature: GalacticFeature): number {
    return FEATURE_UNLOCK_SECTORS[feature] || 1;
  }

  /**
   * Vérifie si une fonctionnalité est débloquée en fonction de la mission max atteinte
   */
  public static isFeatureUnlocked(feature: GalacticFeature, maxUnlockedMission: number): boolean {
    const currentSector = this.getSectorForMission(maxUnlockedMission);
    const requiredSector = this.getFeatureUnlockSector(feature);

    if (currentSector > requiredSector) return true;
    if (currentSector === requiredSector) {
      // Pour le Hangar et Défis (Secteur Beta / 2) : débloqué dès l'entrée au Secteur Beta (Mission >= 5, après Alpharion)
      if (feature === 'hangar' || feature === 'challenges') {
        return maxUnlockedMission >= 5;
      }
      // Pour la Raffinerie (Secteur Delta / 4) : débloqué dès la Mission 16 (début du Secteur Delta, après Gammargantua)
      if (feature === 'refinery') {
        return maxUnlockedMission >= 16;
      }
      // Pour les Événements (Secteur Epsilon / 5) : débloqué dès la Mission 23 (début du Secteur Epsilon)
      if (feature === 'events') {
        return maxUnlockedMission >= 23;
      }
      return true;
    }

    return false;
  }

  /**
   * Vérifie si une mission est le combat de boss final de son secteur
   */
  public static isSectorBossMission(mission: number): boolean {
    return Object.values(SECTOR_BOSSES).some(b => b.mission === mission);
  }

  /**
   * Retourne la configuration du boss de secteur pour une mission donnée
   */
  public static getSectorBossForMission(mission: number): SectorBossInfo | null {
    return Object.values(SECTOR_BOSSES).find(b => b.mission === mission) || null;
  }

  /**
   * Retourne la configuration du boss pour un secteur donné (ex: 1 = Alpharion, 2 = Betapulsar, 3 = Gammargantua)
   */
  public static getSectorBossForSector(sector: number): SectorBossInfo | null {
    return SECTOR_BOSSES[sector] || null;
  }

  /**
   * Retourne les fonctionnalités nouvellement débloquées lorsqu'une mission est accomplie
   */
  public static getNewlyUnlockedFeaturesForMission(mission: number): UnlockedFeatureItem[] {
    const boss = this.getSectorBossForMission(mission);
    if (boss) {
      return [...boss.unlockedFeatures];
    }
    return [];
  }

  /**
   * Formate l'affichage Secteur / Niveau avec les noms grecs
   * Ex: "SECTEUR ALPHA • NIVEAU 2" ou "SECTEUR BETA // NIVEAU 1"
   */
  public static formatSectorLevel(mission: number, separator: string = ' • '): string {
    const info = this.getSectorInfo(mission);
    const greek = this.getSectorName(info.sector).toUpperCase();
    return `SECTEUR ${greek}${separator}NIVEAU ${info.levelInSector}`;
  }
}
