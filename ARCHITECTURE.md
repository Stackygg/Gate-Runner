# 🗺️ STACKY-GATERUNNER : FEUILLE DE ROUTE & ARCHITECTURE MAÎTRESSE

> **Guide de référence pérenne et exhaustif** : ce document consigne l'ensemble des constantes fondamentales, formules mathématiques, unités de jeu, hiérarchies de fichiers et registres de données pour orienter tout travail de conception, d'équilibrage et de débogage.

---

## 1. 📐 Invariants & Géométrie Spatiale 3D

| Constante | Valeur | Fichier source | Rôle & Impact mathématique |
| :--- | :--- | :--- | :--- |
| **`WORLD_WIDTH`** | `540` px | `src/config.ts` | Largeur virtuelle du monde. |
| **`VANISHING_X`** | `270` px | `src/engine/Renderer.ts` | **Centre exact de l'écran** et point de fuite central (`WORLD_WIDTH / 2`). |
| **`WORLD_HEIGHT`** | `960` px | `src/config.ts` | Hauteur virtuelle de référence (ratio 9:16 mobile/arcade). |
| **`PLAYER_BASE_Y`** | `660` px | `src/config.ts` | Ligne de vol nominale de la flotte du joueur (`PLAYER_SCREEN_Y`). |
| **`HORIZON_Y`** | `140` px | `src/engine/Renderer.ts` | Ligne d'horizon supérieure où convergent le point de fuite et les objets lointains. |
| **`FOV_DEPTH`** | `650` px | `src/engine/Renderer.ts` | Distance focale de la caméra 3D. |
| **`ROAD_MARGIN`** | `35` px | `src/config.ts` | Marge latérale infranchissable pour les vaisseaux du joueur (`X` entre 35 et 505). |
| **Profondeur `z`** | `PLAYER_BASE_Y - worldY` | `src/engine/Renderer.ts` | `z = 0` au joueur (`scale = 1.0`), `z > 0` vers l'horizon (`scale < 1.0`). |
| **Formule `perspectiveScale`** | `FOV_DEPTH / (FOV_DEPTH + max(0, z))` | `src/engine/Renderer.ts` | Décroissance d'échelle géométrique réaliste en profondeur. |
| **Point de Fuite X** | `VANISHING_X + (x - VANISHING_X) * scale` | `src/engine/Renderer.ts` | Convergence optique des objets et trajectoires vers le centre 270. |
| **Point de Fuite Y** | `HORIZON_Y + (PLAYER_SCREEN_Y - HORIZON_Y) * scale` | `src/engine/Renderer.ts` | Projection optique de la coordonnée Y vers l'horizon. |
| **Émergence Horizon** | `Y = -1350` | `src/systems/LevelGenerator.ts` | Coordonnée d'apparition des objets et boss depuis le fond cosmique. |
| **Limite Combat Boss** | `Y = -500` | `src/main.ts` | Ancrage des boss de fin de secteur (`scale ~ 0.36`), laissant 50% de l'arène libre. |
| **Culling 3D** | `z > 2000` ou `z < -300` | `src/engine/Renderer.ts` | Masquage strict des entités hors-champ pour maintenir 60 FPS constants. |

---

## 2. ⚡ Flotte du Joueur & Armement (`src/entities/Fleet.ts` & `src/config.ts`)

### Statistiques Fondamentales
- **Taille de base** : `BASE_FLEET_SIZE = 1` vaisseau amiral (départ).
- **Plafond Flotte Standard / Escorte** : `MAX_FLEET_SIZE = 20` vaisseaux max. Au-delà, fusion automatique en rang supérieur.
- **Plafond Mode Raid / Fun** : `40` vaisseaux max.
- **Vitesse latérale** : `650` px/s au clavier ou suivi instantané lissé à la souris/tactile.
- **Cadence de tir de base** : `BASE_FIRE_RATE = 1.2` salve/seconde.
- **Vitesse des projectiles** : `BASE_BULLET_SPEED = 980` px/s.
- **Dégâts nominaux** : `BASE_BULLET_DAMAGE = 1.0` dégât par tir par défaut.
- **Point de convergence des lasers** : `targetConvergenceY = -1000` (les lasers convergent en cône vers l'horizon).

### Évolution Visuelle & Multiplicateurs de Rang (Libération de Prisons)
1. **Rang 1 : Scythe** : Monoréacteur central, cadence `x1.0`.
2. **Rang 2 : Falcon** : Réacteurs jumeaux émeraude, cadence `x1.3`.
3. **Rang 3 : Valkyrie** : Triple tuyère ambre / or, cadence `x1.6`.
4. **Rang 4 : Phantom** : Quadruple tuyère furtive magenta / violet, cadence `x1.8`.
5. **Rang 5 : Hyperion Titan** : Réacteur titan blanc / cyan + double tuyères d'ailes, cadence `x2.0`.

### Formule Complète des Dégâts par Tir
$$\text{Dégâts} = \text{BASE\_BULLET\_DAMAGE} \times \text{Multiplicateur Amélioration Hangar} \times \text{Multiplicateur Skin} \times \text{Tier V1..V10} \times \text{Bonus Équipement}$$

### Tiers de Vaisseaux (V1 à V10)
- Échelle visuelle : `tierScale = (1.0 + (tier - 1) * 0.06) * roleScale * rankScaleBonus * pt.scale`.
- Thèmes de couleurs : V1 Cyan `#00F0FF`, V2 Or `#FFE600`, V3 Magenta `#FF007A`, V4 Violet `#B026FF`, V5 Émeraude `#00FF88`, V6 Orange `#FF7700`, V7 Rubis `#E11D48`, V8 Bleu Nuit `#2563EB`, V9 Vert Néon `#22C55E`, V10 Dieu Stellaire `#FFFFFF`.

---

## 3. 🛸 Catalogue des Vaisseaux & Prototypes (`SKINS_CONFIG`)

| ID | Nom | Archétype | Bonus Passif | Coût Barres 🟦 | Slots Équipement |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `stacky_interceptor` | **Stacky Interceptor** | Chasseur Éclaireur | ⚡ Cadence +10% | `0` (Par défaut) | `WEAPON`, `ENGINE` |
| `cyber_viper` | **Cyber Viper** | Intercepteur Furtif | 🚀 Vitesse & Cadence +15% | `2` | `WEAPON`, `ENGINE`, `CORE` |
| `void_dreadnought` | **Void Phantom** | Bombardier Plasma | 💥 Dégâts Laser +25% | `5` | `WEAPON`, `WEAPON`, `CORE` |
| `titan_aegis` | **Titan Aegis** | Cuirassé Défensif | 🛡️ +2 Vaisseaux au départ | `8` | `WEAPON`, `SHIELD`, `SHIELD`, `CORE` |
| `solar_phoenix` | **Solar Phoenix** | Vaisseau Commandement | 👑 Tous bonus +15% | `12` | `WEAPON`, `SHIELD`, `ENGINE`, `CORE` |
| `hyperion_quantum` | **Hyperion Quantum** | Destroyer Suprême | ⚡ +30% Dégâts & +25% 💎 | `20` | `WEAPON`, `WEAPON`, `SHIELD`, `ENGINE`, `CORE` |

---

## 4. 🚪 Système de Portails Numériques (`src/entities/Gate.ts`)

- **Dimensions** : Largeur standard `210` px (ou `125` px en voie double gauche/droite), Hauteur `75` px.
- **Seuil de traversée** : Dès que `gate.y >= fleet.centerY - 25 && gate.y <= fleet.centerY + 50`.
- **Types d'Opérations** :
  - `ADD_SHIPS` : Ajoute $+X$ vaisseaux (couleur Cyan `#00F0FF`).
  - `MULTIPLY_SHIPS` : Multiplie la flotte par $\times X$ (couleur Vert Émeraude `#00FF88`).
  - `SUBTRACT_SHIPS` : Réduit la flotte de $-X$ vaisseaux (couleur Rouge `#FF0055`).
  - `DIVIDE_SHIPS` : Divise la flotte par $\div X$ (couleur Rouge Sang `#FF0033`).
  - `ADD_DAMAGE` : Augmente la puissance laser de $+X\%$ (couleur Améthyste `#B026FF`).
  - `ADD_FIRE_RATE` : Augmente la cadence de tir de $+X\%$ (couleur Or Solaire `#FFE600`).

---

## 5. 👾 Ennemis, Obstacles & Formules de PV (`src/entities/Enemy.ts`)

### Types d'Entités & Rôles
1. `'block'` : Astéroïde procédural destructible. Lâche des gemmes et diamants.
2. `'prison'` : Capsule blindée contenant un prototype allié (augmente le rang d'évolution à la libération).
3. `'black_hole'` : Trou noir stationnaire exerçant une attraction gravitationnelle sur les tirs dans sa colonne.
4. `'shield_generator'` : Pylône projetant un faisceau de champ de force vers un boss (le boss est immunisé tant que le générateur vit).
5. `'boss_minion'` : Drone d'escorte d'Alpharion/Gammargantua, fonçant plus vite que le boss (`320+ px/s`).
6. `'corner_turret'` : Tourelle de coin fixe en arène 360° (75 PV, cadence 1.8s, tirs orientés).
7. `'gauntlet_wall'` : Barrière de station spatiale à contourner.

### Formule des PV des Astéroïdes (`calculateAsteroidHpByWave`)
- En mode Expédition / Raid :
  $$\text{PV} = \text{Base Wave} \times (1 + (\text{levelNum} - 1) \times 0.25) \times \text{Tier Multiplier}$$
- Les PV augmentent en escalier de la Vague 1 à la Vague 4 pour matcher la puissance grandissante de la flotte.

---

## 6. 👑 Registre des Boss de Fin de Secteur & Duels Spéciaux

| Secteur | Mission Finale | Boss | PV de Base | Comportement & Phase d'Attaque | Destination Stargate |
| :---: | :---: | :---: | :---: | :--- | :---: |
| **Alpha** | Mission 4 | **Alpharion** | `8 000` | Escadron de minions rapides (5 PV + 5 par vague) largués toutes les 5s. Salves doubles solaires. | **Beta [Β]** |
| **Beta** | Mission 9 | **Betapulsar** | `25 000` | Protégé par 2 Générateurs Magnétiques (10 PV). Vulnérable 15s si détruits, puis régénération. | **Gamma [Γ]** |
| **Gamma** | Mission 15 | **Gammargantua** | `65 000` | 3 Ancrages gravitationnels de singularité (50 PV). Rayon lourd central + téléportation phasique. | **Delta [Δ]** |
| **Delta** | Mission 22 | *(En création)* | `150 000` | Cuirassé dimensionnel suprême avec faisceaux orbitaux. | **Epsilon [Ε]** |

---

## 7. 🌌 Séquence Stargate de Fin de Secteur (`src/main.ts`)

Chronologie millimétrée après la destruction du boss final :
1. **$0.0\text{s} \to 1.0\text{s}$ (Phase de contrôle libre)** :
   - Les tirs de la flotte sont **immédiatement coupés** (`fleet.canShoot = false`).
   - Le joueur a le contrôle 100% libre de sa flotte pour célébrer et manœuvrer.
   - La Stargate apparaît au centre (`X = 270, Y = -500`) et commence son déploiement énergétique.
2. **$1.0\text{s} \to 2.2\text{s}$ (Phase d'alignement)** :
   - Les vaisseaux ralentissent leur défilement (`scrollSpeed` réduit).
   - La flotte est guidée en douceur vers l'axe central (`X = 270`).
3. **$2.2\text{s}+$ (Ruée hyper-espace 3D)** :
   - Accélération progressive en profondeur (`stargateFleetSpeed` grimpe jusqu'à 1050 px/s).
   - Les vaisseaux diminuent d'échelle (`scale` de 1.0 à 0.36) en suivant le cône de perspective 3D.
   - Pénétration dans le vortex ➔ Onde de choc, flash warp ➔ Affichage de la pop-up « Contenu débloqué : ».

---

## 8. 🗺️ Arborescence des Fichiers & Registre des Fonctions

```
Stacky-GateRunner/
├── ARCHITECTURE.md                # Ce document de référence maître
├── index.html                     # Squelette DOM, conteneurs canvas, HUD, modales
└── src/
    ├── config.ts                  # GAME_CONFIG, SKINS_CONFIG, UPGRADE_TRACKS_CONFIG
    ├── main.ts                    # GameApp : gameLoop, updateGame, renderFrame, triggerGameOver
    │
    ├── engine/                    # MOTEUR BAS NIVEAU
    │   ├── Renderer.ts            # project(x, y), clear(), renderMothership(), étoiles
    │   ├── InputManager.ts        # update(dt), getPositionX(), setArenaMode()
    │   ├── SoundManager.ts        # playLaser(), playExplosion(), playWarp(), playGatePass()
    │   └── MusicManager.ts        # playTrack('music1' | 'music2' | 'boss')
    │
    ├── entities/                  # OBJETS DU MONDE
    │   ├── Fleet.ts               # update(), draw(ctx, renderer), rebuildFormation(), takeDamage()
    │   ├── Enemy.ts               # update(), draw3D(ctx, renderer), takeDamage(), isBossType()
    │   ├── Gate.ts                # draw3D(ctx, renderer), isPositive()
    │   ├── Projectile.ts          # update(), draw3D(ctx, renderer)
    │   ├── ParticleSystem.ts      # spawnExplosion(), spawnFloatingText(), spawnGems(), draw3D()
    │   ├── CargoShip.ts           # update(), draw(), takeDamage() (Mode Arène 360°)
    │   ├── RescuedShip.ts         # update(), draw3D() (Prototypes libérés)
    │   └── Stargate.ts            # update(), draw3D() (Porte circulaire, chevrons, vortex, glyphe)
    │
    ├── systems/                   # LOGIQUE & DONNÉES
    │   ├── LevelGenerator.ts      # generateLevel(), generateBossDuelLevel(), calculateAsteroidHpByWave()
    │   ├── SectorSystem.ts        # SECTORS_CONFIG, getSectorForMission(), isSectorBossMission()
    │   ├── CollisionSystem.ts     # checkCollisions(), checkLaserCollisions(), checkGatePass()
    │   ├── EquipmentSystem.ts     # Inventaire de pièces, craft, bonus passifs
    │   └── Store.ts               # Persistance localStorage, getEquippedStats(), save()
    │
    ├── ui/                        # INTERFACES UTILISATEUR
    │   ├── HUD.ts                 # showPhaseBanner(), updateStats(), showBoss(), showMothership()
    │   ├── GameOverModal.ts       # showSectorUnlockModal(), showVictory(), showDefeat()
    │   ├── MenuHangar.ts          # Rendu du Hangar, sélection de skin, équipement de modules
    │   ├── UpgradeDock.ts         # Dock de pré-vol
    │   ├── BottomUpgradeDock.ts   # Raccourcis de montée en niveau
    │   └── ChallengesModal.ts     # Sélection des défis (Convoi Iridium, Gauntlets)
    │
    └── styles/
        └── style.css              # Styles CSS néon, glassmorphism, animations HUD
```

---

## 9. 🗄️ Sauvegarde & LocalStorage (`src/systems/Store.ts`)

- **Clé de stockage unique** : `localStorage.getItem('stacky_gaterunner_save')`.
- **Champs principaux** :
  - `diamonds` : Monnaie principale de montée en niveau.
  - `iridiumBars` / `crystals` : Monnaie rare des défis pour débloquer les vaisseaux.
  - `selectedMission` : Mission courante (1 à 22+).
  - `selectedSkin` : Vaisseau actif équipé.
  - `unlockedSkins` : Tableau des IDs de vaisseaux possédés.
  - `upgradeTracks` : Paliers et échelons actuels (`fireRate`, `damage`).
  - `equipmentInventory` : Pièces d'armement et réacteurs collectés.
