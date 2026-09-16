import { EquipmentSlotType } from './systems/EquipmentSystem';

export type ShipClass = 'Éclaireur' | 'Chasseur' | 'Intercepteur';

export interface ShipSkin {
  id: string;
  name: string;
  shipClass: ShipClass;
  archetype: string; // Alias de compatibilité
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

export type GameplayType = 'runner' | 'arena_defense';

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

  // Mode Escorte / Défense Vaisseau Mère (Runner classique)
  ESCORT_MOTHERSHIP_HP: 100,
  MOTHERSHIP_BASE_Y: 830,

  // Mode Convoi d'Iridium (Arène Défense 360°)
  CARGO_CENTER_X: 270,
  CARGO_CENTER_Y: 480,
  CARGO_WIDTH: 66,
  CARGO_HEIGHT: 74,
  CARGO_BASE_HP: 100,

  // Périmètre d'action du joueur & Ancrages des tourelles (dégagés de l'interface HUD)
  ARENA_BOUNDS: {
    MIN_X: 65,
    MAX_X: 475,
    MIN_Y: 155, // Dégagé sous le HUD haut (~115px)
    MAX_Y: 805  // Dégagé au-dessus de la barre cargo (~850px)
  },
  ARENA_CORNER_TURRETS: [
    { x: 70, y: 175, cornerIndex: 0 },  // Haut-Gauche
    { x: 470, y: 175, cornerIndex: 1 }, // Haut-Droite
    { x: 70, y: 785, cornerIndex: 2 },  // Bas-Gauche
    { x: 470, y: 785, cornerIndex: 3 }  // Bas-Droite
  ],
  ARENA_CORNER_BARRIER_RADIUS: 95 // Rayon infranchissable autour des tourelles de coin
};

// Vaisseaux déblocables dans le Hangar avec leurs Classes et leurs Slots d'Équipement
export const SKINS_CONFIG: ShipSkin[] = [
  // =========================================================================
  // CLASSE ÉCLAIREUR (Profil agile, reconnaissance & vitesse)
  // =========================================================================
  {
    id: 'stacky_interceptor',
    name: 'STACKY SCOUT',
    shipClass: 'Éclaireur',
    archetype: 'Éclaireur',
    perkText: '⚡ Vitesse d\'attaque +10%',
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
    shipClass: 'Éclaireur',
    archetype: 'Éclaireur',
    perkText: '🚀 Vitesse & Vitesse d\'attaque +15%',
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
    shipClass: 'Éclaireur',
    archetype: 'Éclaireur',
    perkText: '💥 Puissance d\'attaque +25%',
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
    shipClass: 'Éclaireur',
    archetype: 'Éclaireur',
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
    shipClass: 'Éclaireur',
    archetype: 'Éclaireur',
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
    shipClass: 'Éclaireur',
    archetype: 'Éclaireur',
    perkText: '⚡ Survoltage : +30% Dégâts & +25% 💎',
    primaryColor: '#A855F7',
    secondaryColor: '#EC4899',
    glowColor: '#A855F7',
    unlockedByDefault: false,
    costInBars: 20,
    costInCrystals: 20,
    slots: ['WEAPON', 'WEAPON', 'SHIELD', 'ENGINE', 'CORE'],
    statBonus: { fireRateMultiplier: 1.20, damageMultiplier: 1.30, speedMultiplier: 1.10 }
  },

  // =========================================================================
  // CLASSE CHASSEUR (Assaut lourd, blindage renforcé, canons d'ailes)
  // =========================================================================
  {
    id: 'chasseur_vanguard',
    name: 'VANGUARD ASSAULT',
    shipClass: 'Chasseur',
    archetype: 'Chasseur',
    perkText: '⚔️ Canons Lourds : Dégâts +25% & Cadence +15%',
    primaryColor: '#FF3344',
    secondaryColor: '#FF8800',
    glowColor: '#FF3344',
    unlockedByDefault: false,
    costInBars: 15,
    costInCrystals: 15,
    slots: ['WEAPON', 'WEAPON', 'ENGINE', 'SHIELD'],
    statBonus: { fireRateMultiplier: 1.15, damageMultiplier: 1.25, speedMultiplier: 1.05 }
  },
  {
    id: 'chasseur_valkyrie',
    name: 'VALKYRIE STRIKER',
    shipClass: 'Chasseur',
    archetype: 'Chasseur',
    perkText: '⚡ Rafale Frontale : Dégâts +35% & Vitesse +15%',
    primaryColor: '#FF9900',
    secondaryColor: '#CC0022',
    glowColor: '#FF9900',
    unlockedByDefault: false,
    costInBars: 22,
    costInCrystals: 22,
    slots: ['WEAPON', 'WEAPON', 'SHIELD', 'CORE'],
    statBonus: { fireRateMultiplier: 1.20, damageMultiplier: 1.35, speedMultiplier: 1.15 }
  },

  // =========================================================================
  // CLASSE INTERCEPTEUR (Apex de combat, ailes forward-swept, plasma quantique)
  // =========================================================================
  {
    id: 'intercepteur_phantom',
    name: 'PHANTOM ECLIPSE',
    shipClass: 'Intercepteur',
    archetype: 'Intercepteur',
    perkText: '🚀 Surtension Véloce : Cadence +35% & Vitesse +30%',
    primaryColor: '#B026FF',
    secondaryColor: '#00F0FF',
    glowColor: '#B026FF',
    unlockedByDefault: false,
    costInBars: 32,
    costInCrystals: 32,
    slots: ['WEAPON', 'WEAPON', 'ENGINE', 'ENGINE', 'CORE'],
    statBonus: { fireRateMultiplier: 1.35, damageMultiplier: 1.30, speedMultiplier: 1.30 }
  },
  {
    id: 'intercepteur_apex',
    name: 'APEX OMEGA',
    shipClass: 'Intercepteur',
    archetype: 'Intercepteur',
    perkText: '👑 Suprématie Quantique : Tous bonus +45% & Faisceau Pulsé',
    primaryColor: '#00FFFF',
    secondaryColor: '#FFE600',
    glowColor: '#00FFFF',
    unlockedByDefault: false,
    costInBars: 45,
    costInCrystals: 45,
    slots: ['WEAPON', 'WEAPON', 'SHIELD', 'ENGINE', 'CORE'],
    statBonus: { fireRateMultiplier: 1.45, damageMultiplier: 1.45, speedMultiplier: 1.35 }
  }
];

// Configuration des 3 améliorations à 5 échelons par palier
export const UPGRADE_TRACKS_CONFIG = {
  fireRate: {
    title: 'Vitesse d\'attaque',
    icon: '⚡',
    baseStepCost: 8,
    costPerStep: 4,
    tierDiamondCost: 45,
    getStatMultiplier: (tier: number, step: number) => 1.0 + (tier - 1) * 0.40 + step * 0.08
  },
  damage: {
    title: 'Puissance d\'attaque',
    icon: '💥',
    baseStepCost: 10,
    costPerStep: 5,
    tierDiamondCost: 55,
    getStatMultiplier: (tier: number, step: number) => 1.0 + (tier - 1) * 0.50 + step * 0.10
  },
  diamondBoost: {
    title: 'Bonus Diamants',
    icon: '💎',
    baseStepCost: 8,
    costPerStep: 4,
    tierDiamondCost: 40,
    getStatMultiplier: (tier: number, step: number) => 1.0 + (tier - 1) * 0.35 + step * 0.08
  }
};
