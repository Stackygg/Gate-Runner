// Générateur de Niveaux : Cycle 3 Modes — Expédition (1, 4..), Raid Fun (2, 5..), Escorte Vaisseau Mère (3, 6..)

import { GAME_CONFIG } from '../config';
import { Gate } from '../entities/Gate';
import { Enemy } from '../entities/Enemy';

export type MissionMode = 'expedition' | 'raid' | 'escort';

export interface LevelData {
  levelNumber: number;
  missionType: MissionMode;
  isFunLevel: boolean;
  totalDistance: number;
  gates: Gate[];
  enemies: Enemy[];
  hasBoss: boolean;
  bossEnemy?: Enemy;
  mothershipHp?: number;
}

export class LevelGenerator {
  public static getMissionType(levelNum: number): MissionMode {
    const r = levelNum % 3;
    if (r === 1) return 'expedition';
    if (r === 2) return 'raid';
    return 'escort';
  }

  public static generateLevel(levelNum: number): LevelData {
    const type = this.getMissionType(levelNum);
    if (type === 'escort') {
      return this.generateEscortLevel(levelNum);
    } else if (type === 'raid') {
      return this.generateFunLevel(levelNum);
    } else {
      return this.generateStandardLevel(levelNum);
    }
  }

  /**
   * Calcule les PV des astéroïdes selon la vague et la phase de démarrage :
   * - 1ère seconde d'apparition (<= 140 px) : strictement 1 PV (peu importe le niveau)
   * - 2 secondes suivantes (<= 420 px)     : plafonné à 2 PV max
   * - Ensuite, progression normale par vague :
   *   - Vague 1 (avant 1er boss) : 1 PV (ou + selon niveau)
   *   - Vague 2 (après 1er boss) : 2 PV
   *   - Vague 3 (après 2e boss)  : 4 PV
   *   - Vague 4 (après 3e boss)  : 8 PV
   */
  public static calculateAsteroidHpByWave(
    curY: number,
    missionType: 'expedition' | 'raid' | 'escort',
    levelNum: number = 1,
    startY?: number
  ): number {
    const defaultStartY = (missionType === 'raid') ? 90 : (missionType === 'escort' ? 40 : -640);
    const initialY = startY !== undefined ? startY : defaultStartY;
    const distFromStart = initialY - curY;

    // 1. Première seconde d'apparition : strictement 1 PV peu importe le niveau
    // À vitesse normale (135 px/s), 1 seconde = ~135-140 px
    if (distFromStart <= 140) {
      return 1;
    }

    let waveIndex = 0; // 0 = avant Boss 1

    if (missionType === 'raid') {
      if (curY < -9000) waveIndex = 3;      // Après Boss 3 (Battleship Nova)
      else if (curY < -5500) waveIndex = 2; // Après Boss 2 (Destroyer Alpha)
      else if (curY < -2500) waveIndex = 1; // Après Boss 1 (Vanguard-01)
      else waveIndex = 0;                  // Avant Boss 1
    } else if (missionType === 'escort') {
      if (curY < -6000) waveIndex = 2;      // Après Boss 2 (Brise-Planète)
      else if (curY < -2600) waveIndex = 1; // Après Boss 1 (Bombardier)
      else waveIndex = 0;                  // Avant Boss 1
    } else { // expedition
      if (curY < -11150) waveIndex = 3;     // Après Boss 3 (Battleship)
      else if (curY < -5350) waveIndex = 2; // Après Boss 2 (Destroyer)
      else if (curY < -2650) waveIndex = 1; // Après Boss 1 (Vanguard-01)
      else waveIndex = 0;                  // Avant Boss 1
    }

    // Progression par puissance de 2 : 1, 2, 4, 8 PV
    const basePower = levelNum > 3 ? Math.floor((levelNum - 1) / 3) : 0;
    const totalPower = Math.min(4, waveIndex + basePower);
    const normalHp = Math.pow(2, totalPower);

    // 2. Les 2 secondes suivantes (entre 1s et 3s, soit jusqu'à 420 px) : 2 PV max
    if (distFromStart <= 420) {
      return Math.min(2, normalHp);
    }

    // 3. Reste du niveau comme prévu
    return normalHp;
  }

  // =========================================================================
  // 🌟 NIVEAUX PAIRS : NIVEAU FUN "BATTLEGROUND QUANTIQUE"
  // Voie Gauche : Trou Noir 10 PV ➔ Portails +1 Vaisseau en boucle
  // Voie Droite : Trou Noir 300 PV ➔ Portails +20 Vaisseaux en boucle
  // Centre : Champ de Force 10s + Déluge d'Astéroïdes + 4 Boss consécutifs !
  // =========================================================================
  private static generateFunLevel(levelNum: number): LevelData {
    const gates: Gate[] = [];
    const enemies: Enemy[] = [];

    const leftLaneX = 85;
    const rightLaneX = 455;
    const gateWidth = 95;
    const tierMultiplier = Math.floor(levelNum / 2);

    // 1. VOIE DE GAUCHE : 1 seul Trou Noir initial (15 PV) ➔ flux régulier de Portails +1V
    // File initiale maîtrisée (jusqu'à Y = -1600, ravitaillée dynamiquement en continu)
    // 1 fois sur 10 : bonus aléatoire de +10% à +50% en cadence de tir OU dégâts
    enemies.push(new Enemy(leftLaneX, 360, 75, 75, 'black_hole', 15));
    let gateIdx = 0;
    for (let y = 240; y >= -1600; y -= 320) {
      gateIdx++;
      if (gateIdx % 10 === 0) {
        // 1 fois sur 10 : +10 à 50% cadence de tir ou dégâts
        const isFireRate = Math.random() < 0.5;
        const val = 10 + Math.floor(Math.random() * 9) * 5; // 10% à 50%
        gates.push(new Gate(leftLaneX, y, gateWidth, GAME_CONFIG.GATE_HEIGHT, isFireRate ? 'ADD_FIRERATE' : 'ADD_DAMAGE', val, false));
      } else {
        gates.push(new Gate(leftLaneX, y, gateWidth, GAME_CONFIG.GATE_HEIGHT, 'ADD_SHIPS', 1, false));
      }
    }

    // 2. VOIE DE DROITE : Palier initial 1 (300 PV) + 5 portails +10 espacés de manière aérée (180px)
    // Les paliers suivants (20k, 60k, 150k, 350k PV) entreront séquentiellement et proprement sans encombrement 3D
    const initialRightHp = 300 + (tierMultiplier - 1) * 100;
    enemies.push(new Enemy(rightLaneX, 360, 85, 85, 'black_hole', initialRightHp));
    for (let p = 1; p <= 5; p++) {
      gates.push(new Gate(rightLaneX, 360 - 130 - (p - 1) * 180, gateWidth, GAME_CONFIG.GATE_HEIGHT, 'ADD_SHIPS', 10, false));
    }

    // 3. VOIE DU MILIEU : Déluge d'astéroïdes intense et équilibré à 60 FPS (X entre 165 et 375)
    const midMinX = 165;
    const midMaxX = 375;

    let curY = 90;
    while (curY > -13000) {
      // Ignorer les zones proches des 4 boss
      const nearBoss1 = (curY < -2300 && curY > -2700);
      const nearBoss2 = (curY < -5300 && curY > -5700);
      const nearBoss3 = (curY < -8800 && curY > -9200);
      const nearBoss4 = (curY < -12200 && curY > -12800);

      if (!nearBoss1 && !nearBoss2 && !nearBoss3 && !nearBoss4) {
        const posX = midMinX + Math.random() * (midMaxX - midMinX);
        const size = 44 + Math.random() * 24;
        const hp = LevelGenerator.calculateAsteroidHpByWave(curY, 'raid', levelNum);
        enemies.push(new Enemy(posX, curY, size, size * 0.82, 'block', hp));
      }
      curY -= (24 + Math.random() * 20);
    }

    // 4. LES 4 BOSS ÉCHELONNÉS AU MILIEU :
    // Boss 1 : Vanguard-01 (Y = -2500)
    const b1Hp = 1500 + (tierMultiplier - 1) * 800;
    enemies.push(new Enemy(270, -2500, 150, 85, 'boss_v1', b1Hp, 'VANGUARD-01'));

    // Boss 2 : Destroyer Alpha (Y = -5500)
    const b2Hp = 8000 + (tierMultiplier - 1) * 4000;
    enemies.push(new Enemy(270, -5500, 165, 95, 'boss_v2', b2Hp, 'DESTROYER ALPHA'));

    // Boss 3 : Battleship Nova (Y = -9000)
    const b3Hp = 30000 + (tierMultiplier - 1) * 15000;
    enemies.push(new Enemy(270, -9000, 185, 105, 'boss_v3', b3Hp, 'BATTLESHIP NOVA'));

    // Boss 4 : Titan Overlord (Y = -12500)
    const finalBossHp = 100000 + (tierMultiplier - 1) * 50000;
    const finalBoss = new Enemy(270, -12500, 230, 130, 'boss_final', finalBossHp, 'TITAN OVERLORD');
    enemies.push(finalBoss);

    return {
      levelNumber: levelNum,
      missionType: 'raid',
      isFunLevel: true,
      totalDistance: 13500,
      gates,
      enemies,
      hasBoss: true,
      bossEnemy: finalBoss
    };
  }

  // =========================================================================
  // 🚀 NIVEAUX (3N+1) : MISSION EXPÉDITION CLASSIQUE
  // 4 Séquences de Portails & Trous Noirs sur la voie de gauche
  // 4 Boss intermédiaires + Titan Overlord à la fin
  // =========================================================================
  private static generateStandardLevel(levelNum: number): LevelData {
    const gates: Gate[] = [];
    const enemies: Enemy[] = [];

    const effectiveTier = Math.floor(levelNum / 2);
    const leftLaneX = 100;
    const leftGateWidth = 115;

    // 1. SÉQUENCE 1 : Trou Noir #1 (15 PV) à Y=360 + 2 Portails (+1 et +1)
    const bhHp1 = Math.max(15, 15 + effectiveTier * 10);
    const bh1 = new Enemy(leftLaneX, 360, 80, 80, 'black_hole', bhHp1);
    enemies.push(bh1);
    const g1 = new Gate(leftLaneX, 250, leftGateWidth, GAME_CONFIG.GATE_HEIGHT, 'ADD_SHIPS', 1, false);
    const g2 = new Gate(leftLaneX, 140, leftGateWidth, GAME_CONFIG.GATE_HEIGHT, 'ADD_SHIPS', 1, false);
    g1.assignedBH = bh1;
    g2.assignedBH = bh1;
    gates.push(g1, g2);

    // 2. SÉQUENCE 2 : Trou Noir #2 (75 PV) à Y=30 + 2 Portails (+2 vaisseaux et +50% cadence)
    const bhHp2 = 75 + effectiveTier * 45;
    const bh2 = new Enemy(leftLaneX, 30, 85, 85, 'black_hole', bhHp2);
    enemies.push(bh2);
    const g3 = new Gate(leftLaneX, -80, leftGateWidth, GAME_CONFIG.GATE_HEIGHT, 'ADD_SHIPS', 2, false);
    const g4 = new Gate(leftLaneX, -190, leftGateWidth, GAME_CONFIG.GATE_HEIGHT, 'ADD_FIRERATE', 50, false);
    g3.assignedBH = bh2;
    g4.assignedBH = bh2;
    gates.push(g3, g4);

    // 3. SÉQUENCE 3 : Trou Noir #3 (1000 PV) à Y=-300 + 2 Portails (+5 vaisseaux et +50% cadence)
    const bhHp3 = 1000 + effectiveTier * 500;
    const bh3 = new Enemy(leftLaneX, -300, 90, 90, 'black_hole', bhHp3);
    enemies.push(bh3);
    const g5 = new Gate(leftLaneX, -410, leftGateWidth, GAME_CONFIG.GATE_HEIGHT, 'ADD_SHIPS', 5, false);
    const g6 = new Gate(leftLaneX, -520, leftGateWidth, GAME_CONFIG.GATE_HEIGHT, 'ADD_FIRERATE', 50, false);
    g5.assignedBH = bh3;
    g6.assignedBH = bh3;
    gates.push(g5, g6);

    // 4. SÉQUENCE 4 : Trou Noir #4 (5000 PV) à Y=-640 + 2 Portails (x2 flotte et +X% dégâts)
    const bhHp4 = 5000 + effectiveTier * 2500;
    const bh4 = new Enemy(leftLaneX, -640, 95, 95, 'black_hole', bhHp4);
    enemies.push(bh4);
    const g7 = new Gate(leftLaneX, -750, leftGateWidth, GAME_CONFIG.GATE_HEIGHT, 'MULTIPLY_SHIPS', 2.0, false);
    const g8 = new Gate(leftLaneX, -860, leftGateWidth, GAME_CONFIG.GATE_HEIGHT, 'ADD_DAMAGE', 0, true);
    g7.assignedBH = bh4;
    g8.assignedBH = bh4;
    gates.push(g7, g8);

    // Astéroïdes de la voie de droite (X entre 195 et 485)
    const asteroidMinX = 195;
    const asteroidMaxX = 485;

    const spawnDenseAsteroids = (startY: number, endY: number, stepRange: [number, number]) => {
      let curY = startY;
      while (curY > endY) {
        const posX = asteroidMinX + Math.random() * (asteroidMaxX - asteroidMinX);
        const size = 46 + Math.random() * 26;
        const hp = LevelGenerator.calculateAsteroidHpByWave(curY, 'expedition', levelNum);
        enemies.push(new Enemy(posX, curY, size, size * 0.82, 'block', hp));
        curY -= (stepRange[0] + Math.random() * (stepRange[1] - stepRange[0]));
      }
    };

    // Vague 1
    spawnDenseAsteroids(-640, -2480, [26, 42]);
    const b1Hp = 600 + effectiveTier * 400;
    enemies.push(new Enemy(330, -2650, 150, 85, 'boss_v1', b1Hp, 'VANGUARD-01'));

    // Vague 2
    spawnDenseAsteroids(-2950, -5150, [18, 30]);
    const b2aHp = 3000 + effectiveTier * 2000;
    enemies.push(new Enemy(330, -5350, 165, 95, 'boss_v2', b2aHp, 'DESTROYER ALPHA'));

    spawnDenseAsteroids(-5650, -7850, [18, 30]);
    const b2bHp = 7000 + effectiveTier * 4000;
    enemies.push(new Enemy(330, -8050, 165, 95, 'boss_v2', b2bHp, 'DESTROYER OMEGA'));

    // Vague 3
    spawnDenseAsteroids(-8350, -10950, [14, 24]);
    const b3aHp = 18000 + effectiveTier * 10000;
    enemies.push(new Enemy(330, -11150, 185, 105, 'boss_v3', b3aHp, 'BATTLESHIP NOVA'));

    spawnDenseAsteroids(-11450, -14050, [14, 24]);
    const b3bHp = 45000 + effectiveTier * 22000;
    enemies.push(new Enemy(330, -14250, 185, 105, 'boss_v3', b3bHp, 'BATTLESHIP DREAD'));

    // Vague 4
    spawnDenseAsteroids(-14550, -16900, [10, 18]);
    const finalBossHp = 120000 + effectiveTier * 60000;
    const finalBoss = new Enemy(330, -17800, 230, 130, 'boss_final', finalBossHp, 'TITAN OVERLORD');
    enemies.push(finalBoss);

    return {
      levelNumber: levelNum,
      missionType: 'expedition',
      isFunLevel: false,
      totalDistance: 19000,
      gates,
      enemies,
      hasBoss: true,
      bossEnemy: finalBoss
    };
  }

  // =========================================================================
  // 🛡️ NIVEAUX (3N) : MISSION DÉFENSE // ESCORTE DU VAISSEAU MÈRE
  // Le Vaisseau Mère / Planète à l'arrière possède 100 PV.
  // Les astéroïdes foncent vers lui : le joueur doit tous les intercepter !
  // Défaite si PV Vaisseau Mère = 0 ou Flotte anéantie.
  // =========================================================================
  private static generateEscortLevel(levelNum: number): LevelData {
    const gates: Gate[] = [];
    const enemies: Enemy[] = [];
    const tierMultiplier = Math.max(1, Math.floor(levelNum / 3));

    // 1. Distribution stratégique de portails d'amélioration pour intercepter la pluie d'astéroïdes
    const gatePositions = [
      { y: 250, type: 'ADD_SHIPS' as const, val: 2, lane: 110 },
      { y: 120, type: 'ADD_FIRERATE' as const, val: 40, lane: 430 },
      { y: -300, type: 'ADD_SHIPS' as const, val: 3, lane: 110 },
      { y: -650, type: 'ADD_DAMAGE' as const, val: 50, lane: 430 },
      { y: -1200, type: 'MULTIPLY_SHIPS' as const, val: 2.0, lane: 270 },
      { y: -2000, type: 'ADD_SHIPS' as const, val: 5, lane: 120 },
      { y: -3500, type: 'ADD_FIRERATE' as const, val: 50, lane: 420 },
      { y: -4500, type: 'MULTIPLY_SHIPS' as const, val: 1.5, lane: 270 },
      { y: -5800, type: 'ADD_DAMAGE' as const, val: 75, lane: 120 },
      { y: -7200, type: 'ADD_SHIPS' as const, val: 8, lane: 420 },
      { y: -8800, type: 'MULTIPLY_SHIPS' as const, val: 2.0, lane: 270 },
      { y: -10500, type: 'ADD_DAMAGE' as const, val: 100, lane: 120 }
    ];

    for (const g of gatePositions) {
      gates.push(new Gate(g.lane, g.y, 110, GAME_CONFIG.GATE_HEIGHT, g.type, g.val, false));
    }

    // 2. Déluge massif d'astéroïdes menaçant le Vaisseau Mère sur toute la largeur (X de 65 à 475)
    // Point de départ reculé à Y = 40 pour laisser au joueur le temps de se positionner et attraper les premiers portails
    let curY = 40;
    while (curY > -12000) {
      // Éviter les zones de boss
      const nearBoss1 = (curY < -2400 && curY > -2900);
      const nearBoss2 = (curY < -5800 && curY > -6400);
      const nearBoss3 = (curY < -11000 && curY > -11800);

      if (!nearBoss1 && !nearBoss2 && !nearBoss3) {
        // Fréquence dense : 1 à 2 astéroïdes par coordonnée Y répartis sur les flancs
        const count = Math.random() < 0.45 ? 2 : 1;
        for (let s = 0; s < count; s++) {
          const minX = (count === 1) ? 70 : (s === 0 ? 70 : 275);
          const maxX = (count === 1) ? 470 : (s === 0 ? 265 : 470);
          const posX = minX + Math.random() * (maxX - minX);
          const size = 38 + Math.random() * 26;
          const hp = LevelGenerator.calculateAsteroidHpByWave(curY, 'escort', levelNum);
          const offset = (s > 0) ? (Math.random() - 0.5) * 12 : 0;
          enemies.push(new Enemy(posX, curY + offset, size, size * 0.85, 'block', hp));
        }
      }
      curY -= (8 + Math.random() * 10);
    }

    // 3. Boss assaillants en mode Escorte
    // Boss 1 : Bombardier de Siège
    const b1Hp = 1200 + (tierMultiplier - 1) * 800;
    enemies.push(new Enemy(270, -2600, 155, 90, 'boss_v1', b1Hp, 'BOMBARDIER DE SIÈGE'));

    // Boss 2 : Cuirassé Brise-Planète
    const b2Hp = 10000 + (tierMultiplier - 1) * 5000;
    enemies.push(new Enemy(270, -6000, 175, 100, 'boss_v2', b2Hp, 'BRISE-PLANÈTE'));

    // Boss 3 Final : Titan Annihilateur
    const finalBossHp = 80000 + (tierMultiplier - 1) * 40000;
    const finalBoss = new Enemy(270, -11400, 230, 130, 'boss_final', finalBossHp, 'TITAN ANNIHILATEUR');
    enemies.push(finalBoss);

    return {
      levelNumber: levelNum,
      missionType: 'escort',
      isFunLevel: false,
      totalDistance: 12500,
      gates,
      enemies,
      hasBoss: true,
      bossEnemy: finalBoss,
      mothershipHp: GAME_CONFIG.ESCORT_MOTHERSHIP_HP
    };
  }
}
