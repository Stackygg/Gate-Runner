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

// Configuration extensible des Secteurs
export const SECTORS_CONFIG: SectorConfig[] = [
  {
    sector: 1,
    name: 'Secteur Alpha',
    missions: [1, 2, 3]
  },
  {
    sector: 2,
    name: 'Secteur Beta',
    missions: [4, 5, 6]
  },
  {
    sector: 3,
    name: 'Secteur Gamma',
    missions: [7, 8, 9]
  },
  {
    sector: 4,
    name: 'Secteur Delta',
    missions: [10, 11, 12]
  },
  {
    sector: 5,
    name: 'Secteur Epsilon',
    missions: [13, 14, 15]
  },
  {
    sector: 6,
    name: 'Secteur Zeta',
    missions: [16, 17, 18]
  },
  {
    sector: 7,
    name: 'Secteur Eta',
    missions: [19, 20, 21]
  },
  {
    sector: 8,
    name: 'Secteur Theta',
    missions: [22, 23, 24]
  },
  {
    sector: 9,
    name: 'Secteur Iota',
    missions: [25, 26, 27]
  },
  {
    sector: 10,
    name: 'Secteur Kappa',
    missions: [28, 29, 30]
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
  hangar: 2,      // Débloqué au Secteur Beta (atteinte du niveau 4 ou 5)
  challenges: 2,  // Débloqué au Secteur Beta
  refinery: 4,    // Débloqué au Secteur Delta (atteinte du niveau 10)
  events: 5       // Débloqué au Secteur Epsilon (atteinte du niveau 15)
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
      // Pour le Hangar et Défis (Secteur Beta / 2) : débloqué dès l'entrée au Secteur Beta (Mission >= 4 ou 5)
      if (feature === 'hangar' || feature === 'challenges') {
        return maxUnlockedMission >= 4;
      }
      // Pour la Raffinerie (Secteur Delta / 4) : débloqué dès la Mission 10 (début du Secteur Delta)
      if (feature === 'refinery') {
        return maxUnlockedMission >= 10;
      }
      // Pour les Événements (Secteur Epsilon / 5) : débloqué dès la Mission 15 (apogée du Secteur Epsilon)
      if (feature === 'events') {
        return maxUnlockedMission >= 15;
      }
      return true;
    }

    return false;
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
