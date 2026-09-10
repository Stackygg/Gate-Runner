// Système d'Équipement & Générateur de Loot Procédural avec Raretés, Niveaux et Effets Spéciaux

export const MAX_ITEM_LEVEL = 20;

export type EquipmentSlotType = 'WEAPON' | 'SHIELD' | 'ENGINE' | 'CORE' | 'CHEST';

export type EquipmentRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

export type SpecialEffectType =
  | 'NONE'
  | 'LEADER_EXTRA_SHOTS'
  | 'PIERCING_SHOTS'
  | 'EXPLOSIVE_MISSILE'
  | 'ENERGY_SHIELD'
  | 'FLEET_RAPID_FIRE'
  | 'BONUS_STARTING_SHIPS'
  // Compatibilité rétroactive avec les sauvegardes existantes
  | 'EXPLOSIVE_ROUNDS'
  | 'LEADER_RAPID_FIRE'
  | 'WARP_DODGE'
  | 'CRYSTAL_MAGNET'
  | 'CRITICAL_OVERDRIVE';

export interface ItemSpecialEffect {
  type: SpecialEffectType;
  value: number; // Valeur numérique de l'effet
  secondaryValue?: number; // Valeur secondaire éventuelle
  label: string; // Ex: "★ Vaisseau principal : +1 tir"
  description: string;
  icon: string;
}

export interface EquipmentStat {
  type: 'damage' | 'fireRate' | 'speed' | 'diamond' | 'shield';
  value: number; // Valeur brute en % ou unité
  label: string; // Ex: "+18% Dégâts Laser"
}

export interface EquipmentItem {
  id: string;
  name: string;
  slotType: EquipmentSlotType;
  rarity: EquipmentRarity;
  icon: string;
  level: number;
  specialEffect: ItemSpecialEffect;
  stats: EquipmentStat[];
  createdAt: number;
  isChest?: boolean;
  sourceMission?: number;
}

export interface RarityConfig {
  name: string;
  color: string;
  bgGlow: string;
  statCount: number;
  recycleDiamonds: number;
}

export interface ItemUpgradeCost {
  dustCost: number;
  iridiumBarsCost: number;
}

export const RARITY_CONFIGS: Record<EquipmentRarity, RarityConfig> = {
  COMMON: {
    name: 'COMMUN',
    color: '#8b9bb4',
    bgGlow: 'rgba(139, 155, 180, 0.25)',
    statCount: 1,
    recycleDiamonds: 10
  },
  RARE: {
    name: 'RARE',
    color: '#00F0FF',
    bgGlow: 'rgba(0, 240, 255, 0.3)',
    statCount: 2,
    recycleDiamonds: 25
  },
  EPIC: {
    name: 'ÉPIQUE',
    color: '#A855F7',
    bgGlow: 'rgba(168, 85, 247, 0.35)',
    statCount: 3,
    recycleDiamonds: 60
  },
  LEGENDARY: {
    name: 'LÉGENDAIRE',
    color: '#FFE600',
    bgGlow: 'rgba(255, 230, 0, 0.4)',
    statCount: 4,
    recycleDiamonds: 150
  },
  MYTHIC: {
    name: 'MYTHIQUE',
    color: '#FF0055',
    bgGlow: 'rgba(255, 0, 85, 0.45)',
    statCount: 5,
    recycleDiamonds: 350
  }
};

export const SLOT_INFO: Record<EquipmentSlotType, { label: string; icon: string; desc: string }> = {
  WEAPON: { label: 'Tourelle', icon: '🔫', desc: 'Armement offensif : tirs supplémentaires, perforation ou missiles lourds' },
  SHIELD: { label: 'Bouclier', icon: '🛡️', desc: 'Défense spatiale : dôme protecteur absorbant 1 à 4 impacts sans perte' },
  ENGINE: { label: 'Moteur', icon: '⚡', desc: 'Propulsion cinétique : booste la cadence de tir de toute la flotte (+25% à +100%)' },
  CORE: { label: 'Module', icon: '🔮', desc: 'Matrice de commandement : octroie 1 à 4 vaisseaux de renfort dès le décollage' },
  CHEST: { label: 'Coffre', icon: '📦', desc: 'Trésor spatial mystérieux scellé à ouvrir dans le Hangar' }
};

// Noms thématiques procéduraux par type d'équipement
const ITEM_NAMES: Record<EquipmentSlotType, { prefixes: string[]; bases: string[]; suffixes: string[] }> = {
  WEAPON: {
    prefixes: ['Blaster', 'Canon', 'Faisceau', 'Disrupteur', 'Émetteur', 'Générateur', 'Rayon'],
    bases: ['Plasma', 'Tachyon', 'Quantique', 'Photons', 'Hypervitesse', 'Antimatière', 'Impulsion'],
    suffixes: ['Alpha', 'MK-II', 'Vortex', 'Surchargé', 'Titan', 'Zéro-G', 'Cyber']
  },
  SHIELD: {
    prefixes: ['Bouclier', 'Dôme', 'Blindage', 'Matrice', 'Générateur', 'Plaquage', 'Champ'],
    bases: ['Gravitationnel', 'Céramique', 'Déflecteur', 'Holographique', 'Flux', 'Nano-Tissé', 'Stellaire'],
    suffixes: ['Aegis', 'Renforcé', 'Oméga', 'Absorbant', 'Bastion', 'Sanctuaire', 'V3']
  },
  ENGINE: {
    prefixes: ['Propulseur', 'Réacteur', 'Moteur', 'Tuyère', 'Booster', 'Convertisseur', 'Turbine'],
    bases: ['Ionique', 'Sub-Luminique', 'Warp', 'À Fusion', 'Vectoriel', 'Cryo-Flux', 'Solaire'],
    suffixes: ['Turbo', 'Survolté', 'Vitesse-Max', 'Apex', 'Phantom', 'Dynamos', 'Hyper']
  },
  CORE: {
    prefixes: ['Noyau', 'Processeur', 'Cristal', 'Module', 'Cellule', 'Amplificateur', 'Condensateur'],
    bases: ['Cybernétique', 'Quantique', 'Dimensionnel', 'Iridium', 'Surchargé', 'Résonant', 'Nexus'],
    suffixes: ['Infini', 'Matrix', 'Singularité', 'Magnat', 'Overdrive', 'Prisme', 'Cosmos']
  },
  CHEST: {
    prefixes: ['Coffre', 'Trésor', 'Module', 'Sarcophage', 'Relique'],
    bases: ['Stellaire', 'Quantique', 'Mystère', 'Nébuleux', 'Galactique'],
    suffixes: ['Ancien', 'Scellé', 'Secret', 'Légendaire', 'Classifié']
  }
};

export class EquipmentSystem {
  public static readonly MAX_ITEM_LEVEL = MAX_ITEM_LEVEL;

  /**
   * Règle absolue d'évolution des effets spéciaux :
   * - Commun & Rare : toujours 1
   * - Épique : 1 jusqu'au niveau 19, 2 au niveau 20
   * - Légendaire : 1 (niv 1-14), 2 (niv 15-19), 3 (niv 20) (ou 999 Perforation Totale pour PIERCING_SHOTS au niv 20)
   * - Mythique : 1 (niv 1-9), 2 (niv 10-14), 3 (niv 15-19), 4 (niv 20) (ou 999 Perforation Totale pour PIERCING_SHOTS au niv 20)
   */
  public static getSpecialEffectValue(
    type: SpecialEffectType,
    rarity: EquipmentRarity,
    level: number
  ): number {
    const clampedLevel = Math.max(1, Math.min(MAX_ITEM_LEVEL, level));

    if (type === 'LEADER_EXTRA_SHOTS' || type === 'ENERGY_SHIELD' || type === 'BONUS_STARTING_SHIPS') {
      if (rarity === 'COMMON' || rarity === 'RARE') {
        return 1;
      }
      if (rarity === 'EPIC') {
        return clampedLevel >= 20 ? 2 : 1;
      }
      if (rarity === 'LEGENDARY') {
        if (clampedLevel >= 20) return 3;
        if (clampedLevel >= 15) return 2;
        return 1;
      }
      if (rarity === 'MYTHIC') {
        if (clampedLevel >= 20) return 4;
        if (clampedLevel >= 15) return 3;
        if (clampedLevel >= 10) return 2;
        return 1;
      }
      return 1;
    }

    if (type === 'PIERCING_SHOTS') {
      if (rarity === 'COMMON' || rarity === 'RARE') {
        return 1;
      }
      if (rarity === 'EPIC') {
        return clampedLevel >= 20 ? 2 : 1;
      }
      if (rarity === 'LEGENDARY') {
        if (clampedLevel >= 20) return 999; // Perforation totale
        if (clampedLevel >= 15) return 2;
        return 1;
      }
      if (rarity === 'MYTHIC') {
        if (clampedLevel >= 20) return 999; // Perforation totale
        if (clampedLevel >= 15) return 3;
        if (clampedLevel >= 10) return 2;
        return 1;
      }
      return 1;
    }

    if (type === 'FLEET_RAPID_FIRE' || type === 'LEADER_RAPID_FIRE') {
      const base = {
        COMMON: 25,
        RARE: 35,
        EPIC: 50,
        LEGENDARY: 75,
        MYTHIC: 100
      }[rarity] || 25;
      const bonusPerLevel = {
        COMMON: 0.5,
        RARE: 0.8,
        EPIC: 1.0,
        LEGENDARY: 1.2,
        MYTHIC: 1.5
      }[rarity] || 1.0;
      return Math.round(base + (clampedLevel - 1) * bonusPerLevel);
    }

    if (type === 'EXPLOSIVE_MISSILE') {
      return clampedLevel >= 20 ? 3.0 : 2.0;
    }

    return 1;
  }

  /**
   * Retourne l'information textuelle sur le prochain palier d'effet spécial à débloquer.
   */
  public static getNextUnlockInfo(
    type: SpecialEffectType,
    rarity: EquipmentRarity,
    level: number
  ): string | null {
    if (level >= MAX_ITEM_LEVEL) return 'Niveau max atteint';

    if (type === 'LEADER_EXTRA_SHOTS' || type === 'ENERGY_SHIELD' || type === 'BONUS_STARTING_SHIPS') {
      if (rarity === 'COMMON' || rarity === 'RARE') {
        return 'Palier max d\'effet spécial atteint (1)';
      }
      if (rarity === 'EPIC') {
        return level < 20 ? 'Palier 2 débloqué au Niveau 20 (Coûte 10 Barres d\'Iridium)' : null;
      }
      if (rarity === 'LEGENDARY') {
        if (level < 15) return 'Palier 2 débloqué au Niveau 15';
        if (level < 20) return 'Palier 3 débloqué au Niveau 20 (Coûte 10 Barres d\'Iridium)';
        return null;
      }
      if (rarity === 'MYTHIC') {
        if (level < 10) return 'Palier 2 débloqué au Niveau 10';
        if (level < 15) return 'Palier 3 débloqué au Niveau 15';
        if (level < 20) return 'Palier 4 débloqué au Niveau 20 (Coûte 10 Barres d\'Iridium)';
        return null;
      }
    }

    if (type === 'PIERCING_SHOTS') {
      if (rarity === 'COMMON' || rarity === 'RARE') return 'Palier max d\'effet spécial (+1 cible)';
      if (rarity === 'EPIC') return level < 20 ? '+2 cibles débloqué au Niveau 20 (Coûte 10 Barres d\'Iridium)' : null;
      if (rarity === 'LEGENDARY') {
        if (level < 15) return '+2 cibles débloqué au Niveau 15';
        if (level < 20) return 'Perforation Totale débloquée au Niveau 20 (Coûte 10 Barres d\'Iridium) !';
        return null;
      }
      if (rarity === 'MYTHIC') {
        if (level < 10) return '+2 cibles débloqué au Niveau 10';
        if (level < 15) return '+3 cibles débloqué au Niveau 15';
        if (level < 20) return 'Perforation Totale débloquée au Niveau 20 (Coûte 10 Barres d\'Iridium) !';
        return null;
      }
    }

    if (type === 'EXPLOSIVE_MISSILE') {
      if (level < 20) return 'Dégâts x3 débloqués au Niveau 20 (Coûte 10 Barres d\'Iridium)';
    }

    return null;
  }

  /**
   * Formate l'effet spécial avec son libellé et sa description calibrés.
   */
  public static formatSpecialEffect(
    type: SpecialEffectType,
    rarity: EquipmentRarity,
    level: number
  ): ItemSpecialEffect {
    const val = this.getSpecialEffectValue(type, rarity, level);

    switch (type) {
      case 'LEADER_EXTRA_SHOTS':
        return {
          type,
          value: val,
          label: `★ Vaisseau principal : +${val} tir${val > 1 ? 's' : ''}`,
          description: `Le vaisseau amiral projette +${val} tir${val > 1 ? 's' : ''} convergent${val > 1 ? 's' : ''} supplémentaire${val > 1 ? 's' : ''}.`,
          icon: '🔫'
        };

      case 'PIERCING_SHOTS': {
        const isTotal = val >= 999;
        return {
          type,
          value: val,
          label: isTotal ? `★ Tirs Perforants : Perforation Totale` : `★ Tirs Perforants : +${val} cible${val > 1 ? 's' : ''}`,
          description: isTotal
            ? `Les lasers traversent TOUTES les cibles et astéroïdes sans jamais être arrêtés !`
            : `Les tirs traversent ${val} cible${val > 1 ? 's' : ''} supplémentaire${val > 1 ? 's' : ''} avant de disparaître.`,
          icon: '🎯'
        };
      }

      case 'EXPLOSIVE_MISSILE':
        return {
          type,
          value: val,
          label: `★ Missile Explosif (${val}x Dégâts / 10s)`,
          description: `Toutes les 10 secondes, le vaisseau amiral lance un missile lourd infligeant ${val}x les dégâts normaux avec déflagration de zone.`,
          icon: '🚀'
        };

      case 'ENERGY_SHIELD':
        return {
          type,
          value: val,
          label: `★ Bouclier Énergétique : +${val} PV`,
          description: `Le vaisseau amiral démarre avec un bouclier de ${val} PV absorbant les impacts sans perte de flotte.`,
          icon: '🛡️'
        };

      case 'FLEET_RAPID_FIRE':
      case 'LEADER_RAPID_FIRE':
        return {
          type: 'FLEET_RAPID_FIRE',
          value: val,
          label: `★ Cadence Flotte : +${val}%`,
          description: `Accélère la cadence de tir de TOUTE la flotte de +${val}%.`,
          icon: '⚡'
        };

      case 'BONUS_STARTING_SHIPS':
      case 'CRYSTAL_MAGNET':
        return {
          type: 'BONUS_STARTING_SHIPS',
          value: val,
          label: `★ Renforts de Départ : +${val} vaisseau${val > 1 ? 'x' : ''}`,
          description: `Démarre la mission avec +${val} vaisseau${val > 1 ? 'x' : ''} d'escorte supplémentaire${val > 1 ? 's' : ''} dans la formation.`,
          icon: '🚀'
        };

      default:
        return {
          type: 'NONE',
          value: 0,
          label: `Statistique Renforcée`,
          description: `Cet équipement bénéficie d'une statistique principale considérablement surchargée (+25% à +40%).`,
          icon: '💠'
        };
    }
  }

  /**
   * Tire aléatoirement un effet spécial adapté au slotType.
   */
  public static rollSpecialEffect(slotType: EquipmentSlotType, rarity: EquipmentRarity): ItemSpecialEffect {
    switch (slotType) {
      case 'WEAPON': {
        const roll = Math.random();
        let fxType: SpecialEffectType;
        if (roll < 0.34) fxType = 'LEADER_EXTRA_SHOTS';
        else if (roll < 0.67) fxType = 'PIERCING_SHOTS';
        else fxType = 'EXPLOSIVE_MISSILE';
        return this.formatSpecialEffect(fxType, rarity, 1);
      }
      case 'SHIELD':
        return this.formatSpecialEffect('ENERGY_SHIELD', rarity, 1);
      case 'ENGINE':
        return this.formatSpecialEffect('FLEET_RAPID_FIRE', rarity, 1);
      case 'CORE':
        return this.formatSpecialEffect('BONUS_STARTING_SHIPS', rarity, 1);
      default:
        return this.formatSpecialEffect('NONE', rarity, 1);
    }
  }

  /**
   * Génère un équipement aléatoire basé sur le numéro de la mission complétée.
   * Règle des objets normaux (Communs) :
   * - 25% de chance d'avoir l'effet spécial
   * - 75% de chance d'avoir une statistique augmentée (vitesse d'attaque ou dégâts pour les tourelles)
   */
  public static generateLoot(missionNum: number, forceHighRarity: boolean = false, forceSpecialEffect: boolean = false): EquipmentItem {
    const slotTypes: EquipmentSlotType[] = ['WEAPON', 'SHIELD', 'ENGINE', 'CORE'];
    const slotType = slotTypes[Math.floor(Math.random() * slotTypes.length)];

    const rarity = this.rollRarity(missionNum, forceHighRarity);
    const rarityConfig = RARITY_CONFIGS[rarity];

    const itemLevel = Math.max(1, Math.min(MAX_ITEM_LEVEL, Math.floor(missionNum * 1.2 + Math.random() * 2)));

    const nameData = ITEM_NAMES[slotType];
    const prefix = nameData.prefixes[Math.floor(Math.random() * nameData.prefixes.length)];
    const base = nameData.bases[Math.floor(Math.random() * nameData.bases.length)];
    const suffix = nameData.suffixes[Math.floor(Math.random() * nameData.suffixes.length)];
    const name = `${prefix} ${base} ${suffix}`;
    const icon = SLOT_INFO[slotType].icon;

    let specialEffect: ItemSpecialEffect;
    let stats: EquipmentStat[];

    if (rarity === 'COMMON') {
      const hasSpecial = forceSpecialEffect || (Math.random() < 0.25); // Effet spécial garanti pour les coffres
      if (hasSpecial) {
        specialEffect = this.rollSpecialEffect(slotType, rarity);
        stats = [];
      } else {
        specialEffect = {
          type: 'NONE',
          value: 0,
          label: 'Statistique Renforcée',
          description: 'Cet équipement commun bénéficie d\'une statistique principale considérablement augmentée (+25% à +40%).',
          icon: '💠'
        };
        // Statistique augmentée (dégâts ou cadence pour les tourelles)
        stats = this.generateStats(slotType, 1, itemLevel, rarity, true);
      }
    } else {
      specialEffect = this.rollSpecialEffect(slotType, rarity);
      const remainingStatCount = Math.max(1, rarityConfig.statCount - 1);
      stats = this.generateStats(slotType, remainingStatCount, itemLevel, rarity, false);
    }

    return {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      slotType,
      rarity,
      icon,
      level: itemLevel,
      specialEffect,
      stats,
      createdAt: Date.now()
    };
  }

  /**
   * Assure qu'un objet possède un effet spécial valide (avec migration rétroactive).
   */
  public static ensureItemSpecialEffect(item: EquipmentItem): ItemSpecialEffect {
    if (!item.specialEffect) {
      item.specialEffect = this.rollSpecialEffect(item.slotType, item.rarity);
    } else {
      // Migrations transparentes des anciens effets
      if (item.specialEffect.type === 'CRYSTAL_MAGNET') {
        item.specialEffect.type = 'BONUS_STARTING_SHIPS';
      } else if (item.specialEffect.type === 'WARP_DODGE') {
        item.specialEffect.type = 'FLEET_RAPID_FIRE';
      } else if (item.specialEffect.type === 'EXPLOSIVE_ROUNDS') {
        item.specialEffect.type = 'EXPLOSIVE_MISSILE';
      } else if (item.specialEffect.type === 'LEADER_RAPID_FIRE') {
        item.specialEffect.type = 'FLEET_RAPID_FIRE';
      }

      // Plafonnement rétroactif à 20
      if (item.level > MAX_ITEM_LEVEL) {
        item.level = MAX_ITEM_LEVEL;
      }

      // Recalibrer la valeur selon le tableau officiel
      if (item.specialEffect.type !== 'NONE') {
        const formatted = this.formatSpecialEffect(item.specialEffect.type, item.rarity, item.level);
        item.specialEffect = formatted;
      }
    }
    return item.specialEffect;
  }

  private static rollRarity(missionNum: number, forceHighRarity: boolean): EquipmentRarity {
    const roll = Math.random() * 100;

    if (forceHighRarity) {
      if (missionNum >= 15 && roll < 20) return 'MYTHIC';
      if (missionNum >= 10 && roll < 55) return 'LEGENDARY';
      return 'EPIC';
    }

    const mythicChance = missionNum >= 15 ? Math.min(7.0, 3.0 + (missionNum - 15) * 0.8) : 0;
    const legendaryChance = missionNum >= 10 ? Math.min(16.0, 5.0 + (missionNum - 10) * 1.1) : 0;
    const epicChance = missionNum >= 5 ? Math.min(25.0, 7.0 + (missionNum - 5) * 1.3) : 0;

    let rareChance = 30.0;
    if (missionNum < 5) {
      rareChance = 30.0 + (missionNum - 1) * 1.0;
    } else if (missionNum < 10) {
      rareChance = 33.0 + (missionNum - 5) * 0.5;
    } else if (missionNum < 15) {
      rareChance = 35.5 - (missionNum - 10) * 0.2;
    } else {
      rareChance = Math.max(30.0, 34.5 - (missionNum - 15) * 0.5);
    }

    if (mythicChance > 0 && roll < mythicChance) return 'MYTHIC';
    const legThreshold = mythicChance + legendaryChance;
    if (legendaryChance > 0 && roll < legThreshold) return 'LEGENDARY';
    const epicThreshold = legThreshold + epicChance;
    if (epicChance > 0 && roll < epicThreshold) return 'EPIC';
    const rareThreshold = epicThreshold + rareChance;
    if (roll < rareThreshold) return 'RARE';

    return 'COMMON';
  }

  private static generateStats(
    slotType: EquipmentSlotType,
    statCount: number,
    level: number,
    rarity: EquipmentRarity,
    boostedPrimary: boolean = false
  ): EquipmentStat[] {
    if (statCount <= 0) return [];

    const multiplier = 1 + (level - 1) * 0.08;
    const rarityMultiplier = {
      COMMON: 1.0,
      RARE: 1.25,
      EPIC: 1.6,
      LEGENDARY: 2.1,
      MYTHIC: 2.8
    }[rarity];

    const stats: EquipmentStat[] = [];
    const usedTypes = new Set<string>();

    if (boostedPrimary) {
      // Pour les objets communs sans effet spécial : statistique augmentée (+25% à +40%)
      if (slotType === 'WEAPON') {
        const primType = Math.random() < 0.5 ? 'damage' : 'fireRate';
        const val = primType === 'damage'
          ? Math.round((26 + Math.random() * 12) * multiplier)
          : Math.round((22 + Math.random() * 10) * multiplier);
        const label = primType === 'damage' ? `+${val}% Dégâts Laser (Surchargé)` : `+${val}% Cadence de Tir (Surchargé)`;
        stats.push({ type: primType, value: val, label });
        usedTypes.add(primType);
      } else if (slotType === 'SHIELD') {
        const val = Math.round((18 + Math.random() * 10) * multiplier);
        stats.push({ type: 'speed', value: val, label: `+${val}% Maniabilité Latérale (Surchargé)` });
        usedTypes.add('speed');
      } else if (slotType === 'ENGINE') {
        const val = Math.round((24 + Math.random() * 10) * multiplier);
        stats.push({ type: 'fireRate', value: val, label: `+${val}% Vitesse de Tir (Surchargé)` });
        usedTypes.add('fireRate');
      } else {
        const val = Math.round((30 + Math.random() * 15) * multiplier);
        stats.push({ type: 'diamond', value: val, label: `+${val}% Butin Diamants (Surchargé)` });
        usedTypes.add('diamond');
      }
      return stats;
    }

    // Priorités classiques selon le type de slot (pas de renforts de départ sur bouclier)
    const primaryTypeBySlot: Record<EquipmentSlotType, EquipmentStat['type']> = {
      WEAPON: 'damage',
      SHIELD: 'speed',
      ENGINE: 'fireRate',
      CORE: 'diamond',
      CHEST: 'diamond'
    };

    const primType = primaryTypeBySlot[slotType];
    stats.push(this.createStat(primType, multiplier * rarityMultiplier * 1.2));
    usedTypes.add(primType);

    const availablePool: EquipmentStat['type'][] = ['damage', 'fireRate', 'speed', 'diamond'];

    while (stats.length < statCount) {
      const remainingPool = availablePool.filter(t => !usedTypes.has(t));
      if (remainingPool.length === 0) break;

      const randomType = remainingPool[Math.floor(Math.random() * remainingPool.length)];
      stats.push(this.createStat(randomType, multiplier * rarityMultiplier));
      usedTypes.add(randomType);
    }

    return stats;
  }

  private static createStat(type: EquipmentStat['type'], scale: number): EquipmentStat {
    switch (type) {
      case 'damage': {
        const val = Math.round((5 + Math.random() * 6) * scale);
        return { type, value: val, label: `+${val}% Dégâts Laser` };
      }
      case 'fireRate': {
        const val = Math.round((4 + Math.random() * 5) * scale);
        return { type, value: val, label: `+${val}% Cadence de Tir` };
      }
      case 'speed': {
        const val = Math.round((6 + Math.random() * 6) * scale);
        return { type, value: val, label: `+${val}% Maniabilité Latérale` };
      }
      case 'diamond': {
        const val = Math.round((8 + Math.random() * 10) * scale);
        return { type, value: val, label: `+${val}% Butin Diamants` };
      }
      case 'shield': {
        const val = Math.round((6 + Math.random() * 6) * scale);
        return { type: 'speed', value: val, label: `+${val}% Défense / Maniabilité` };
      }
    }
  }

  /**
   * Crée des objets de départ équilibrés pour le joueur.
   */
  public static createStarterItems(): EquipmentItem[] {
    return [
      {
        id: 'starter_weapon_1',
        name: 'Blaster Plasma Recrue',
        slotType: 'WEAPON',
        rarity: 'COMMON',
        icon: '🔫',
        level: 1,
        specialEffect: {
          type: 'LEADER_EXTRA_SHOTS',
          value: 1,
          label: '★ Vaisseau principal : +1 tir',
          description: 'Le vaisseau amiral projette 1 tir additionnel convergent.',
          icon: '🔫'
        },
        stats: [],
        createdAt: Date.now()
      },
      {
        id: 'starter_engine_1',
        name: 'Propulseur Ionique V1',
        slotType: 'ENGINE',
        rarity: 'COMMON',
        icon: '⚡',
        level: 1,
        specialEffect: {
          type: 'FLEET_RAPID_FIRE',
          value: 25,
          label: '★ Cadence Flotte : +25%',
          description: 'Accélère la cadence de tir de TOUTE la flotte de +25%.',
          icon: '⚡'
        },
        stats: [],
        createdAt: Date.now() + 1
      },
      {
        id: 'starter_shield_1',
        name: 'Matrice Déflectrice Mk-1',
        slotType: 'SHIELD',
        rarity: 'RARE',
        icon: '🛡️',
        level: 1,
        specialEffect: {
          type: 'ENERGY_SHIELD',
          value: 1,
          label: '★ Bouclier Énergétique : +1 PV',
          description: 'Le vaisseau amiral démarre avec 1 PV de bouclier absorbant 1 impact sans perte de flotte.',
          icon: '🛡️'
        },
        stats: [
          { type: 'speed', value: 5, label: '+5% Maniabilité Latérale' }
        ],
        createdAt: Date.now() + 2
      }
    ];
  }

  /**
   * Calcule le coût en Poudre de Diamant et en Barres d'Iridium (10 barres pour le passage au niveau 20).
   * La progression en Poudre de Diamant est exponentielle selon le niveau et la rareté de l'objet.
   */
  public static getUpgradeCost(item: EquipmentItem): ItemUpgradeCost {
    // Bases calibrées pour un coût cumulé total de :
    // Commun: ~20 000 | Rare: ~50 000 | Épique: ~100 000 | Légendaire: ~200 000 | Mythique: ~500 000
    const baseCostByRarity: Record<EquipmentRarity, number> = {
      COMMON: 76,
      RARE: 191,
      EPIC: 381,
      LEGENDARY: 762,
      MYTHIC: 1905
    };

    const base = baseCostByRarity[item.rarity] || 76;
    const EXPONENTIAL_GROWTH_RATE = 1.25;

    // Règle spécifique : les niveaux 19 et 20 ont exactement la même quantité de poudre,
    // le niveau 20 requérant 10 barres d'iridium en plus.
    const effectiveLevel = Math.min(18, Math.max(1, item.level));
    const dustCost = Math.round(base * Math.pow(EXPONENTIAL_GROWTH_RATE, effectiveLevel - 1));

    // Le dernier niveau (20) coûte obligatoirement 10 barres d'iridium en plus
    const iridiumBarsCost = (item.level === 19) ? 10 : 0;

    return { dustCost, iridiumBarsCost };
  }

  /**
   * Améliore le niveau d'un équipement (plafonné à MAX_ITEM_LEVEL = 20)
   * et renforce son effet spécial selon le palier officiel.
   */
  public static upgradeItem(item: EquipmentItem): boolean {
    if (item.level >= MAX_ITEM_LEVEL) return false;
    item.level += 1;

    // Amélioration de 12% sur les statistiques passives
    for (const st of item.stats) {
      st.value = Math.max(1, Math.round(st.value * 1.12));
      if (st.type === 'damage') st.label = `+${st.value}% Dégâts Laser`;
      else if (st.type === 'fireRate') st.label = `+${st.value}% Vitesse de Tir`;
      else if (st.type === 'speed') st.label = `+${st.value}% Vitesse de Vol`;
      else if (st.type === 'diamond') st.label = `+${st.value}% Gain Diamants`;
    }

    // Mise à jour de l'Effet Spécial selon le niveau et la rareté
    if (item.specialEffect && item.specialEffect.type !== 'NONE') {
      const updatedFx = this.formatSpecialEffect(item.specialEffect.type, item.rarity, item.level);
      item.specialEffect = updatedFx;
    }

    return true;
  }

  /**
   * Génère un coffre mystère scellé dropped en fin de mission.
   * Avant le déblocage du Hangar (Niveau 5) : "Coffre Non Identifié".
   * Après le déblocage du Hangar : "Coffre Stellaire (Mission X)".
   */
  public static generateChest(missionNum: number): EquipmentItem {
    const isPreHangar = missionNum < 5;
    const name = isPreHangar ? 'Coffre Non Identifié' : `Coffre Stellaire (Mission ${missionNum})`;
    const rarity = isPreHangar ? 'RARE' : this.rollRarity(missionNum, false);
    return {
      id: `chest_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name,
      slotType: 'CHEST',
      rarity,
      icon: '📦',
      level: Math.max(1, missionNum),
      specialEffect: {
        type: 'NONE',
        value: 0,
        label: 'Trésor Stellaire Scellé',
        description: 'À ouvrir dans le Hangar Spatial pour révéler un équipement aléatoire.',
        icon: '📦'
      },
      stats: [],
      isChest: true,
      sourceMission: missionNum,
      createdAt: Date.now()
    };
  }

  /**
   * Ouvre un coffre et génère un véritable équipement avec Effet Spécial garanti.
   */
  public static openChest(chest: EquipmentItem): EquipmentItem {
    const mission = chest.sourceMission || chest.level || 1;
    return this.generateLoot(mission, false, true);
  }

  /**
   * Relance le tirage du butin d'un coffre (avec bonus de chance de haute rareté et Effet Spécial garanti).
   */
  public static rerollChestLoot(missionNum: number): EquipmentItem {
    const luckyBoost = Math.random() < 0.45;
    return this.generateLoot(missionNum, luckyBoost, true);
  }
}
