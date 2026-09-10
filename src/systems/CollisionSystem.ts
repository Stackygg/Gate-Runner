// Système de Détection et Résolution des Collisions

import { Fleet } from '../entities/Fleet';
import { Gate, GateType } from '../entities/Gate';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { ParticleSystem } from '../entities/Particle';
import { SoundSynth } from '../engine/SoundSynth';
import { RescuedShip, SHIP_RANKS } from '../entities/RescuedShip';

export interface CollisionResults {
  diamondsEarned: number;
  enemiesKilled: number;
  highestGauntletMultiplier: number;
  screenShake: number;
  fleetDamageTaken: number;
  rescuedShipsSpawned: RescuedShip[];
}

export class CollisionSystem {
  private static lastGateHitSoundTime: number = 0;

  public static checkAndResolve(
    fleet: Fleet,
    projectiles: Projectile[],
    enemyProjectiles: Projectile[],
    gates: Gate[],
    enemies: Enemy[],
    particles: ParticleSystem,
    sound: SoundSynth,
    gateBoostFactor: number = 1.0,
    diamondMultiplier: number = 1.0
  ): CollisionResults {
    const results: CollisionResults = {
      diamondsEarned: 0,
      enemiesKilled: 0,
      highestGauntletMultiplier: 1.0,
      screenShake: 0,
      fleetDamageTaken: 0,
      rescuedShipsSpawned: []
    };

    // 1. Tirs du joueur contre les Portails (Seuls les portails SPÉCIAUX absorbent les tirs pour monter en valeur)
    for (const proj of projectiles) {
      if (proj.isDead) continue;

      for (const gate of gates) {
        if (gate.isPassed) continue;

        // Seuls les portails SPÉCIAUX sont sensibles aux tirs et les absorbent
        if (!gate.isSpecial) continue;

        const left = gate.x - gate.width / 2;
        const right = gate.x + gate.width / 2;
        const top = gate.y - 30;
        const bottom = gate.y + gate.height + 30;

        if (proj.x >= left && proj.x <= right && proj.y >= top && proj.y <= bottom) {
          proj.isDead = true; // Le portail spécial absorbe le tir
          gate.onHit(proj.damage, gateBoostFactor);
          
          // Débouncing du son et des étincelles pour garantir une fluidité 60 FPS sans freeze
          const now = performance.now();
          if (now - CollisionSystem.lastGateHitSoundTime > 90) {
            CollisionSystem.lastGateHitSoundTime = now;
            sound.playGateHit();
            particles.spawnGateHitSpark(proj.x, proj.y, '#00FFCC');
          }
          break;
        }
      }
    }

    // 2. Tirs du joueur contre les Ennemis, Astéroïdes et Murs de Gauntlet
    // Optimisation majeure : filtrage spatial des cibles actives dans la zone de tir (-1200 à 850)
    const activeEnemies = enemies.filter(e => !e.isDead && e.y >= -1200 && e.y <= 850);

    for (const proj of projectiles) {
      if (proj.isDead) continue;

      for (const enemy of activeEnemies) {
        if (enemy.isDead) continue;

        const hitPadding = enemy.isBossType() ? 45 : (enemy.type === 'prison' ? 18 : 8);
        const halfH = enemy.height / 2 + hitPadding;

        // Élimination ultra-rapide par distance verticale Y
        if (Math.abs(enemy.y - proj.y) > halfH) continue;

        const halfW = enemy.width / 2 + hitPadding;
        if (Math.abs(enemy.x - proj.x) > halfW) continue;

        if (proj.hitTargets.has(enemy)) continue;
        proj.hitTargets.add(enemy);

        if (proj.isPiercing) {
          proj.pierceCount++;
          if (proj.pierceCount >= proj.maxPierces) {
            proj.isDead = true;
          }
        } else {
          proj.isDead = true;
        }

        const isKilled = enemy.takeDamage(proj.damage);
        // Émission d'étincelles débouncée pour fluidité optimale et élimination du brouillard de particules
        const isHighHpBh = (enemy.type === 'black_hole' && enemy.hp > 80);
        const shouldSpark = isHighHpBh 
          ? (Math.random() < 0.15) 
          : (Math.random() < 0.55 || enemy.isBossType() || enemy.type === 'prison');
        if (shouldSpark) {
          particles.spawnExplosion(proj.x, proj.y, proj.isPiercing ? '#FFE600' : (proj.isExplosive ? '#FF6600' : '#00F0FF'), enemy.isBossType() ? 5 : 2);
        }

        // Déflagration de zone si tir explosif
        if (proj.isExplosive && proj.explosionRadius > 0) {
          particles.spawnExplosion(proj.x, proj.y, '#FF6600', 16);
          const splashDmg = Math.max(1, Math.round(proj.damage * (proj.explosionDamagePct / 100)));
          for (const other of activeEnemies) {
            if (other === enemy || other.isDead) continue;
            const dist = Math.hypot(other.x - proj.x, other.y - proj.y);
            if (dist <= proj.explosionRadius) {
              const killedOther = other.takeDamage(splashDmg);
              particles.spawnExplosion(other.x, other.y, '#FF9900', 5);
              if (killedOther) {
                results.enemiesKilled++;
              }
            }
          }
        }

          if (isKilled) {
            results.enemiesKilled++;
            results.screenShake = Math.max(results.screenShake, enemy.isBossType() ? 20 : (enemy.type === 'prison' ? 14 : 6));
            sound.playExplosion(enemy.isBossType() || enemy.type === 'prison');

            // Récompenses en Diamants 💎
            let diamondReward = 5;

            if (enemy.type === 'prison') {
              diamondReward = 20;
              const rInfo = SHIP_RANKS[enemy.prisonRank] || SHIP_RANKS[2];
              particles.spawnFloatingText(enemy.x, enemy.y, `🔓 PRISON BRISÉE ! PROTOTYPE LIBÉRÉ !`, rInfo.color, 24);
              particles.spawnExplosion(enemy.x, enemy.y, rInfo.color, 45);
              // Spawn du vaisseau prototype libéré qui descend vers la flotte
              results.rescuedShipsSpawned.push(new RescuedShip(enemy.x, enemy.y, enemy.prisonRank));
            } else if (enemy.type === 'black_hole') {
              diamondReward = 12;
              sound.playExplosion(true);
              particles.spawnFloatingText(enemy.x, enemy.y, '🌌 SINGULARITÉ BRISÉE!', '#C084FC', 24);
              particles.spawnExplosion(enemy.x, enemy.y, '#A855F7', 40);
            } else if (enemy.type === 'block') {
              diamondReward = Math.max(2, Math.min(15, Math.floor(enemy.maxHp / 5)));
            } else if (enemy.type === 'boss_v1') {
              diamondReward = 20;
              particles.spawnFloatingText(enemy.x, enemy.y, '🏆 VANGUARD VAINCU!', '#FFAA00', 24);
            } else if (enemy.type === 'boss_v2') {
              diamondReward = 35;
              particles.spawnFloatingText(enemy.x, enemy.y, '🏆 DESTROYER ANÉANTI!', '#00F0FF', 24);
            } else if (enemy.type === 'boss_v3') {
              diamondReward = 50;
              particles.spawnFloatingText(enemy.x, enemy.y, '🏆 CUIRASSÉ ÉLIMINÉ!', '#FF007A', 26);
            } else if (enemy.type === 'boss_final') {
              diamondReward = 100;
              particles.spawnFloatingText(enemy.x, enemy.y, '👑 OVERLORD DÉTRUIT!', '#FFE600', 28);
            } else if (enemy.type === 'gauntlet_wall' && enemy.multiplierValue) {
              diamondReward = Math.round(enemy.multiplierValue * 10);
              results.highestGauntletMultiplier = enemy.multiplierValue;
              particles.spawnFloatingText(enemy.x, enemy.y, `x${enemy.multiplierValue} MULTIPLIER!`, '#FFE600', 26);
            }

            // Largage de butin par les Boss : +1 à 5 vaisseaux, +10 à 50% cadence, +10 à 50% dégâts
            if (enemy.isBossType()) {
              CollisionSystem.spawnBossRewardGates(enemy, gates, particles);
            }

            // Accumulation précise avec virgule flottante pour combler les décimales au fur et à mesure
            results.diamondsEarned += diamondReward * diamondMultiplier;
            const explosionColor = enemy.type === 'black_hole' ? '#A855F7' : (enemy.type === 'prison' ? '#FF007A' : '#00F0FF');
            particles.spawnExplosion(enemy.x, enemy.y, explosionColor, enemy.isBossType() ? 50 : 20);
            particles.spawnGems(enemy.x, enemy.y, Math.min(8, Math.ceil(diamondReward / 2)));
          }

          if (proj.isDead) {
            break;
          }
        }
      }

    // 3. Traversée des Portails par la Flotte du Joueur
    for (const gate of gates) {
      if (gate.isPassed) continue;

      // Si le portail a dépassé la flotte du joueur sans collision, le marquer comme passé pour libérer l'écran
      if (gate.y > fleet.centerY + 50) {
        gate.isPassed = true;
        if (gate.pairGate && !gate.pairGate.isPassed) {
          gate.pairGate.isPassed = true;
          gate.pairGate.pairGate = undefined;
          gate.pairGate = undefined;
        }
        continue;
      }

      if (gate.y >= fleet.centerY - 25 && gate.y <= fleet.centerY + 50) {
        const left = gate.x - gate.width / 2;
        const right = gate.x + gate.width / 2;

        if (fleet.centerX >= left - 25 && fleet.centerX <= right + 25) {
          gate.isPassed = true;

          // Si le portail fait partie d'une paire exclusive (ex: butin de boss), dissoudre instantanément l'autre portail
          if (gate.pairGate && !gate.pairGate.isPassed) {
            gate.pairGate.isPassed = true;
            particles.spawnExplosion(gate.pairGate.x, gate.pairGate.y, '#334455', 18);
            gate.pairGate.pairGate = undefined;
            gate.pairGate = undefined;
          }

          switch (gate.type) {
            case 'ADD_SHIPS':
              fleet.shipCount += Math.round(gate.value);
              sound.playGatePass(true);
              particles.spawnFloatingText(fleet.centerX, fleet.centerY - 30, `+${Math.round(gate.value)} 🚀`, '#00F0FF', 24);
              break;
            case 'MULTIPLY_SHIPS':
              fleet.shipCount = Math.max(1, Math.round(fleet.shipCount * gate.value));
              sound.playGatePass(true);
              particles.spawnFloatingText(fleet.centerX, fleet.centerY - 30, `x${gate.value.toFixed(1)} 🚀`, '#00FF88', 24);
              break;
            case 'SUBTRACT_SHIPS':
              fleet.shipCount = Math.max(0, fleet.shipCount - Math.abs(Math.round(gate.value)));
              sound.playGatePass(false);
              particles.spawnFloatingText(fleet.centerX, fleet.centerY - 30, `-${Math.abs(Math.round(gate.value))} 🚀`, '#FF0055', 22);
              break;
            case 'DIVIDE_SHIPS':
              fleet.shipCount = Math.max(0, Math.floor(fleet.shipCount / Math.max(1, gate.value)));
              sound.playGatePass(false);
              particles.spawnFloatingText(fleet.centerX, fleet.centerY - 30, `÷${gate.value.toFixed(1)} 🚀`, '#FF0055', 22);
              break;
            case 'ADD_FIRERATE':
              fleet.fireRate *= (1 + gate.value / 100);
              sound.playGatePass(true);
              particles.spawnFloatingText(fleet.centerX, fleet.centerY - 30, `+${Math.round(gate.value)}% ⚡`, '#FFE600', 24);
              break;
            case 'ADD_DAMAGE':
              fleet.bulletDamage *= (1 + gate.value / 100);
              sound.playGatePass(true);
              particles.spawnFloatingText(fleet.centerX, fleet.centerY - 30, `+${Math.round(gate.value)}% 🎯`, '#FF007A', 24);
              break;
          }

          fleet.rebuildFormation();
          particles.spawnExplosion(fleet.centerX, fleet.centerY, gate.isPositive() ? '#00F0FF' : '#FF0055', 25);
        }
      }
    }

    // 4. Collision des Vaisseaux contre les Ennemis et Astéroïdes (1 dégât par astéroïde)
    for (const enemy of enemies) {
      if (enemy.isDead) continue;

      if (enemy.y >= fleet.centerY - 40 && enemy.y <= fleet.centerY + 40) {
        const left = enemy.x - enemy.width / 2;
        const right = enemy.x + enemy.width / 2;

        if (fleet.centerX >= left - 35 && fleet.centerX <= right + 35) {
          const dmg = enemy.isBossType() ? fleet.shipCount : 1;
          const lost = fleet.takeDamage(dmg);

          // L'astéroïde / ennemi ayant percuté le joueur est détruit
          enemy.takeDamage(999);
          sound.playExplosion(false);

          if (lost === -1) {
            // Esquive Warp réussie
            particles.spawnFloatingText(fleet.centerX, fleet.centerY - 35, `⚡ ESQUIVE WARP !`, '#00F0FF', 22);
            particles.spawnExplosion(fleet.centerX, fleet.centerY, '#00F0FF', 14);
          } else if (lost === -2) {
            // Bouclier d'énergie du vaisseau amiral
            particles.spawnFloatingText(fleet.centerX, fleet.centerY - 35, `🛡️ BOUCLIER ABSORBÉ !`, '#00F0FF', 22);
            particles.spawnExplosion(fleet.centerX, fleet.centerY, '#00F0FF', 24);
            results.screenShake = 1;
          } else if (lost > 0) {
            results.fleetDamageTaken += lost;
            results.screenShake = 2;
            particles.spawnExplosion(enemy.x, enemy.y, '#FF0055', 22);
            particles.spawnFloatingText(fleet.centerX, fleet.centerY - 35, `-${lost} VAISSEAU`, '#FF0055', 20);
          }
        }
      }
    }

    // 5. Collision des tirs ennemis contre la Flotte (chaque vaisseau de la formation peut être touché)
    for (const ep of enemyProjectiles) {
      if (ep.isDead) continue;

      for (const ship of fleet.ships) {
        if (Math.abs(ep.x - ship.x) <= 16 && Math.abs(ep.y - ship.y) <= 18) {
          ep.isDead = true;
          const lost = fleet.takeDamage(1);
          sound.playExplosion(false);

          if (lost === -1) {
            particles.spawnFloatingText(ship.x, ship.y - 25, `⚡ ESQUIVE !`, '#00F0FF', 20);
            particles.spawnExplosion(ep.x, ep.y, '#00F0FF', 10);
          } else if (lost === -2) {
            particles.spawnFloatingText(ship.x, ship.y - 25, `🛡️ BOUCLIER ABSORBÉ !`, '#00F0FF', 20);
            particles.spawnExplosion(ep.x, ep.y, '#00F0FF', 18);
          } else if (lost > 0) {
            results.fleetDamageTaken += lost;
            particles.spawnExplosion(ep.x, ep.y, '#FF0055', 12);
            particles.spawnFloatingText(ship.x, ship.y - 25, `-${lost} FLOTTE`, '#FF0055', 18);
          }
          break;
        }
      }
    }

    return results;
  }

  /**
   * Fait apparaître des portails de butin spéciaux à la mort d'un boss.
   * Récompenses aléatoires :
   * - +1 à 5 vaisseaux (+X 🚀)
   * - +10 à 50% cadence de tir (+X% ⚡)
   * - +10 à 50% dégâts (+X% 🎯)
   */
  private static spawnBossRewardGates(
    enemy: Enemy,
    gates: Gate[],
    particles: ParticleSystem
  ): void {
    const rewardOptions: { type: GateType; value: number }[] = [
      {
        type: 'ADD_SHIPS',
        value: Math.floor(1 + Math.random() * 5) // +1 à 5 vaisseaux
      },
      {
        type: 'ADD_FIRERATE',
        value: 10 + Math.floor(Math.random() * 9) * 5 // +10% à +50% par paliers de 5%
      },
      {
        type: 'ADD_DAMAGE',
        value: 10 + Math.floor(Math.random() * 9) * 5 // +10% à +50% par paliers de 5%
      }
    ];

    // Mélange pour sélectionner 2 récompenses distinctes proposées au joueur
    rewardOptions.sort(() => Math.random() - 0.5);
    const reward1 = rewardOptions[0];
    const reward2 = rewardOptions[1];

    // Positionnement des deux portails côte à côte dans le couloir central libre (X = 270)
    // Cela évite tout chevauchement avec les voies de trous noirs à gauche (X = 85) et à droite (X = 455)
    const centerLaneX = 270;
    const leftX = centerLaneX - 60; // X = 210
    const rightX = centerLaneX + 60; // X = 330
    const spawnY = Math.min(enemy.y - 30, 200);
    const gateW = 105;
    const gateH = 50;

    // Chance de 5% d'être un portail spécial (sinon portails normaux)
    const isSpecial = Math.random() < 0.05;

    // Création des 2 portails de récompense mutuellement exclusifs
    const gateLeft = new Gate(leftX, spawnY, gateW, gateH, reward1.type, reward1.value, isSpecial);
    const gateRight = new Gate(rightX, spawnY, gateW, gateH, reward2.type, reward2.value, isSpecial);

    gateLeft.isBossReward = true;
    gateRight.isBossReward = true;

    // Liaison exclusive : franchir l'un fait instantanément disparaître l'autre
    gateLeft.pairGate = gateRight;
    gateRight.pairGate = gateLeft;

    gates.push(gateLeft);
    gates.push(gateRight);

    particles.spawnExplosion(enemy.x, enemy.y - 20, '#00F0FF', 35);
  }
}
