import { EquipmentSlotType } from './systems/EquipmentSystem';

export interface ShipSkin {
  id: string;
  name: string;
  archetype: string;
  perkText: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  unlockedByDefault: boolean;
  costInBars: number; // Coût en Barres d'Iridium 🟦
  costInCrystals: number; // Compatibilité rétroactive / minerai
  slots: EquipmentSlotType[]; // Slots d'équipement disponibles
  statBonus: {
    fireRateMultiplier: number;
    damageMultiplier: number;
    speedMultiplier: number;
  };
}

export const GAME_CONFIG = {
  WORLD_WIDTH: 540,
  WORLD_HEIGHT: 960,
  ROAD_MARGIN: 35,

  // Flotte & Vaisseau (Limite max de 20 vaisseaux à l'écran, au-delà fusion en V2)
  BASE_FLEET_SIZE: 1,
  MAX_FLEET_SIZE: 20,
  PLAYER_BASE_Y: 660,
  PLAYER_HORIZONTAL_SPEED: 650,
  
  // Tirs & Armes
  BASE_FIRE_RATE: 1.2, // ~1.2 tirs/sec par vaisseau
  BASE_BULLET_SPEED: 980,
  BASE_BULLET_DAMAGE: 1, // 1 dégât de base exact
  
  // Défilement
  BASE_SCROLL_SPEED: 135,
  BOOST_SCROLL_SPEED: 240,

  // Portails
  GATE_WIDTH: 210,
  GATE_HEIGHT: 75,
  GATE_HIT_THRESHOLD: 1,

  // Multiplicateurs Gauntlet
  GAUNTLET_MULTIPLIERS: [1.2, 1.5, 2.0, 3.0, 5.0, 10.0, 20.0, 50.0],

  // Mode Escorte / Défense
  ESCORT_MOTHERSHIP_HP: 100,
  MOTHERSHIP_BASE_Y: 830
};

// Vaisseaux déblocables dans le Hangar avec leurs Slots d'Équipement
export const SKINS_CONFIG: ShipSkin[] = [
  {
    id: 'stacky_interceptor',
    name: 'STACKY INTERCEPTOR',
    archetype: 'Chasseur Éclaireur',
    perkText: '⚡ Cadence de tir +10%',
    primaryColor: '#00F0FF',
    secondaryColor: '#7928CA',
    glowColor: '#00F0FF',
    unlockedByDefault: true,
    costInBars: 0,
    costInCrystals: 0,
    slots: ['WEAPON', 'ENGINE'],
    statBonus: { fireRateMultiplier: 1.10, damageMultiplier: 1.0, speedMultiplier: 1.0 }
  },
  {
    id: 'cyber_viper',
    name: 'CYBER VIPER',
    archetype: 'Intercepteur Furtif',
    perkText: '🚀 Vitesse & Cadence +15%',
    primaryColor: '#00FF88',
    secondaryColor: '#0088FF',
    glowColor: '#00FF88',
    unlockedByDefault: false,
    costInBars: 2,
    costInCrystals: 2,
    slots: ['WEAPON', 'ENGINE', 'CORE'],
    statBonus: { fireRateMultiplier: 1.15, damageMultiplier: 1.0, speedMultiplier: 1.20 }
  },
  {
    id: 'void_dreadnought',
    name: 'VOID PHANTOM',
    archetype: 'Bombardier Plasma',
    perkText: '💥 Dégâts Laser +25%',
    primaryColor: '#FF007A',
    secondaryColor: '#7928CA',
    glowColor: '#FF007A',
    unlockedByDefault: false,
    costInBars: 5,
    costInCrystals: 5,
    slots: ['WEAPON', 'WEAPON', 'CORE'],
    statBonus: { fireRateMultiplier: 0.95, damageMultiplier: 1.25, speedMultiplier: 1.0 }
  },
  {
    id: 'titan_aegis',
    name: 'TITAN AEGIS',
    archetype: 'Cuirassé Défensif',
    perkText: '🛡️ Blindage : +2 Vaisseaux de départ',
    primaryColor: '#38BDF8',
    secondaryColor: '#0284C7',
    glowColor: '#38BDF8',
    unlockedByDefault: false,
    costInBars: 8,
    costInCrystals: 8,
    slots: ['WEAPON', 'SHIELD', 'SHIELD', 'CORE'],
    statBonus: { fireRateMultiplier: 1.0, damageMultiplier: 1.10, speedMultiplier: 0.95 }
  },
  {
    id: 'solar_phoenix',
    name: 'SOLAR PHOENIX',
    archetype: 'Vaisseau de Commandement',
    perkText: '👑 Roi Stellaire : Tous bonus +15%',
    primaryColor: '#FFE600',
    secondaryColor: '#FF3300',
    glowColor: '#FFE600',
    unlockedByDefault: false,
    costInBars: 12,
    costInCrystals: 12,
    slots: ['WEAPON', 'SHIELD', 'ENGINE', 'CORE'],
    statBonus: { fireRateMultiplier: 1.15, damageMultiplier: 1.15, speedMultiplier: 1.15 }
  },
  {
    id: 'hyperion_quantum',
    name: 'HYPERION QUANTUM',
    archetype: 'Destroyer Suprême',
    perkText: '⚡ Survoltage : +30% Dégâts & +25% 💎',
    primaryColor: '#A855F7',
    secondaryColor: '#EC4899',
    glowColor: '#A855F7',
    unlockedByDefault: false,
    costInBars: 20,
    costInCrystals: 20,
    slots: ['WEAPON', 'WEAPON', 'SHIELD', 'ENGINE', 'CORE'],
    statBonus: { fireRateMultiplier: 1.20, damageMultiplier: 1.30, speedMultiplier: 1.10 }
  }
];

// Configuration des 3 améliorations à 5 échelons par palier
export const UPGRADE_TRACKS_CONFIG = {
  fireRate: {
    title: 'Vitesse de Tir',
    icon: '⚡',
    baseStepCost: 8,
    costPerStep: 4,
    tierDiamondCost: 45,
    getStatMultiplier: (tier: number, step: number) => 1.0 + (tier - 1) * 0.40 + step * 0.08
  },
  damage: {
    title: 'Puissance Laser',
    icon: '💥',
    baseStepCost: 10,
    costPerStep: 5,
    tierDiamondCost: 55,
    getStatMultiplier: (tier: number, step: number) => 1.0 + (tier - 1) * 0.50 + step * 0.10
  },
  diamondBoost: {
    title: 'Gain Diamants',
    icon: '💎',
    baseStepCost: 8,
    costPerStep: 4,
    tierDiamondCost: 40,
    getStatMultiplier: (tier: number, step: number) => 1.0 + (tier - 1) * 0.35 + step * 0.08
  }
};
