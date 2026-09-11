// Système de Secteurs & Progression Modulaire
// Regroupe les missions en Secteurs configurables (ex: Secteur 1 = Niveaux 1, 2, 3)

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

// Configuration extensible des Secteurs
// Chaque secteur regroupe un ensemble de niveaux (3 niveaux initiaux : Expédition, Raid, Escorte)
// De nouveaux niveaux peuvent être ajoutés pour agrandir les secteurs existants ou en créer de nouveaux.
export const SECTORS_CONFIG: SectorConfig[] = [
  {
    sector: 1,
    name: 'Ceinture Initiale',
    missions: [1, 2, 3]
  },
  {
    sector: 2,
    name: 'Nébuleuse Pourpre',
    missions: [4, 5, 6]
  },
  {
    sector: 3,
    name: 'Faille Quantique',
    missions: [7, 8, 9]
  },
  {
    sector: 4,
    name: 'Forge Lunaire',
    missions: [10, 11, 12]
  },
  {
    sector: 5,
    name: 'Cœur Galactique',
    missions: [13, 14, 15]
  }
];

// Paliers de déblocage des fonctionnalités par Secteur
export const FEATURE_UNLOCK_SECTORS: Record<GalacticFeature, number> = {
  hangar: 2,      // Débloqué au Secteur 2 (atteinte du niveau 4 ou 5)
  challenges: 2,  // Débloqué au Secteur 2
  refinery: 4,    // Débloqué au Secteur 4 (atteinte du niveau 10)
  events: 5       // Débloqué au Secteur 5 (atteinte du niveau 15)
};

export class SectorSystem {
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
   * Retourne les informations complètes du secteur pour une mission donnée
   */
  public static getSectorInfo(mission: number): SectorInfo {
    const sectorNum = this.getSectorForMission(mission);
    const levelInSector = this.getLevelInSector(mission);

    const config = SECTORS_CONFIG.find(s => s.sector === sectorNum);
    const totalLevels = config ? config.missions.length : 3;
    const name = config ? config.name : `Secteur ${sectorNum}`;

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

    // Si le joueur a atteint ou dépassé le secteur requis
    if (currentSector > requiredSector) return true;
    if (currentSector === requiredSector) {
      // Pour le Hangar et Défis (Secteur 2) : débloqué dès l'entrée au Secteur 2 (Mission >= 4 ou 5)
      if (feature === 'hangar' || feature === 'challenges') {
        return maxUnlockedMission >= 4;
      }
      // Pour la Raffinerie (Secteur 4) : débloqué dès la Mission 10 (début du Secteur 4)
      if (feature === 'refinery') {
        return maxUnlockedMission >= 10;
      }
      // Pour les Événements (Secteur 5) : débloqué dès la Mission 15 (apogée du Secteur 5)
      if (feature === 'events') {
        return maxUnlockedMission >= 15;
      }
      return true;
    }

    return false;
  }

  /**
   * Formate l'affichage Secteur / Niveau
   * Ex: "SECTEUR 1 • NIVEAU 2" ou "SECTEUR 1 // NIVEAU 2"
   */
  public static formatSectorLevel(mission: number, separator: string = ' • '): string {
    const info = this.getSectorInfo(mission);
    return `SECTEUR ${info.sector}${separator}NIVEAU ${info.levelInSector}`;
  }
}
