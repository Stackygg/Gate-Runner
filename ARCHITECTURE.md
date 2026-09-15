# 🗺️ STACKY-GATERUNNER : FEUILLE DE ROUTE & ARCHITECTURE SYSTÈME

Ce document sert de repère et de boussole permanente pour l'architecture, la répartition des rôles et les constantes fondamentales du projet.

---

## 1. 📐 Invariants & Constantes Clés (`src/config.ts` & `src/engine/Renderer.ts`)

| Paramètre | Valeur | Description |
| :--- | :--- | :--- |
| **`WORLD_WIDTH`** | `540` px | Largeur virtuelle totale de l'arène spatiale. |
| **`VANISHING_X`** | `270` px (`WORLD_WIDTH / 2`) | **Centre exact** de l'écran et point de fuite central de la perspective 3D. |
| **`WORLD_HEIGHT`** | `960` px | Hauteur de référence du viewport. |
| **`PLAYER_BASE_Y`** | `660` px | Ligne de vol de base de la flotte du joueur. |
| **`HORIZON_Y`** | `140` px | Ligne d'horizon supérieure où convergent le point de fuite et les objets lointains. |
| **`FOV_DEPTH`** | `650` px | Longueur focale de projection 3D (`perspectiveScale = FOV_DEPTH / (FOV_DEPTH + z)`). |
| **Profondeur `z`** | `PLAYER_BASE_Y - worldY` | `z = 0` au niveau du joueur (`scale = 1.0`), `z > 0` vers le fond (`scale < 1.0`). |
| **Limite Combat Boss** | `Y = -500` | Position ancrée des boss de fin de secteur dans l'espace lointain (`scale ~ 0.36`). |
| **Apparition Horizon** | `Y = -1350` | Zone d'émergence des objets cosmiques depuis le point de fuite. |

---

## 2. 🌳 Arborescence des Fichiers & Responsabilités

```
Stacky-GateRunner/
├── index.html                     # Point d'entrée DOM, HUD overlays, modales et conteneurs UI
└── src/
    ├── config.ts                  # GAME_CONFIG, UPGRADE_TRACKS_CONFIG, Skins, Skins catalog
    ├── main.ts                    # Boucle de jeu (Game Loop), GameApp, gestion d'états, coordinateur principal
    │
    ├── engine/                    # MOTEUR DE JEU & SYSTÈMES BAS NIVEAU
    │   ├── Renderer.ts            # Projection 3D perspective, ciel étoilé, gradients cosmiques, fond et vaisseau-mère
    │   ├── InputManager.ts        # Gestion des entrées (souris, tactile, clavier) avec conversion monde/écran
    │   ├── SoundManager.ts        # Synthétiseur Audio Web Audio API (lasers, explosions, warp, portails)
    │   └── MusicManager.ts        # Gestion des pistes musicales spatiales et boucles d'ambiance
    │
    ├── entities/                  # ENTITÉS INTERACTIVES DU MONDE
    │   ├── Fleet.ts               # Flotte du joueur (formation, tirs, shields, rangs 1-5, projection 3D)
    │   ├── Enemy.ts               # Astéroïdes, prisons, trous noirs, boss normaux (V1..Final) et boss de secteur
    │   ├── Gate.ts                # Portails modificateurs (+, x, -, ÷) pour la taille et les dégâts de flotte
    │   ├── Projectile.ts          # Lasers, plasmas, missiles et tirs ennemis (avec projection 3D)
    │   ├── ParticleSystem.ts      # Étincelles, débris d'astéroïdes, gemmes récoltables, textes flottants (+10, etc.)
    │   ├── CargoShip.ts           # Vaisseau cargo central pour les défis de défense d'Iridium 360°
    │   ├── RescuedShip.ts         # Vaisseaux prototypes alliés libérés des prisons
    │   └── Stargate.ts            # Porte stellaire circulaire (chevrons, vortex énergétique, glyphe grec, bannière)
    │
    ├── systems/                   # SYSTÈMES DE JEU & LOGIQUE MÉTIER
    │   ├── LevelGenerator.ts      # Générateur procédural des missions (standard, fun/raid, escorte, boss duels, défis)
    │   ├── SectorSystem.ts        # Définition des Secteurs (Alpha, Beta, Gamma, Delta) et déclencheurs de déblocages
    │   ├── CollisionSystem.ts     # Détection et résolution des collisions (projectiles, vaisseaux, astéroïdes, portes)
    │   └── Store.ts               # Persistance LocalStorage (diamants, paliers, prototypes débloqués, inventaire)
    │
    ├── ui/                        # INTERFACES UTILISATEUR & MODALES
    │   ├── HUD.ts                 # Barres supérieures (PV vaisseau-mère, HP boss, jauge distance, compteurs)
    │   ├── GameOverModal.ts       # Pop-up de fin de mission (victoire/défaite, récompenses) & modale de déblocage secteur
    │   ├── MenuHangar.ts          # Menu Hangar de flotte (équipement des prototypes, pièces détachées, arbre)
    │   ├── UpgradeDock.ts         # Dock inférieur d'améliorations rapides avant le lancement du vol
    │   ├── BottomUpgradeDock.ts   # Raccourcis de mise à niveau rapide de la flotte
    │   └── ChallengesModal.ts     # Modale de sélection des Défis Spéciaux (Convois d'Iridium, Gauntlets)
    │
    └── styles/
        └── style.css              # Feuilles de styles glassmorphism, HUD néon, animations et thèmes rétro-futuristes
```

---

## 3. 🔄 Flux d'une Frame dans `main.ts` (`gameLoop`)

1. **`dt` Clamping** : Plafonné à `0.05s` pour empêcher les sauts de physique en cas de lag.
2. **Entrées & Flotte (`updateGame`)** :
   - `input.update(dt)` ➔ calcul de `targetX`.
   - Si le boss de secteur meurt :
     - `0s à 1.0s` : Le joueur garde le contrôle de sa flotte (`canShoot = false`).
     - `1.0s à 2.2s` : Les vaisseaux se regroupent au centre (`X = 270`) et ralentissent.
     - `2.2s+` : Ruée vers le portail en 3D (`stargateFleetSpeed` accélère, `fleet.centerY` diminue).
   - `fleet.update(dt, targetX)` ➔ génération des tirs (si `canShoot == true`).
3. **Mise à jour du Monde** :
   - Défilement `traveledDistance += scrollSpeed * dt`.
   - `Enemy.update()` pour chaque ennemi/boss.
   - `Stargate.update()` (rotation de l'anneau, chevrons, vortex).
   - `CollisionSystem.checkCollisions()`.
4. **Rendu (`renderFrame`)** :
   - `renderer.clear()` : Ciel étoilé et gradients cosmiques.
   - Entités en arrière-plan : Vaisseau-Mère, Portails de flotte (`Gate.draw3D`), Trous noirs.
   - Projectiles (`Projectile.draw3D`) et Ennemis (`Enemy.draw3D`).
   - Stargate (`Stargate.draw3D`).
   - **Flotte du Joueur (`fleet.draw(ctx, renderer)`)** :
     - Projette chaque vaisseau via `renderer.project(ship.x, ship.y)`.
     - Réduit la taille proportionnellement à la distance (`scale = pt.scale`).
     - Fait converger la formation vers le vortex selon la perspective 3D.
   - Particules (`ParticleSystem.draw3D`).

---

## 4. 👑 Boss de Fin de Secteur & Noms

| Secteur | Mission Finale | Nom du Boss | Type | Mécanique Signature |
| :---: | :---: | :---: | :---: | :--- |
| **Alpha** | Mission 4 | **Alpharion** | `boss_alpharion` | Minions solaires rapides qui foncent sur la flotte. |
| **Beta** | Mission 9 | **Betapulsar** | `boss_betapulsar` | Bouclier magnétique alimenté par 2 générateurs latéraux régénérables. |
| **Gamma** | Mission 15 | **Gammargantua** | `boss_gammargantua` | 3 Ancrages gravitationnels de singularité & tirs d'antimatière. |
| **Delta** | Mission 22 | *(À venir)* | `boss_final` | Cuirassé dimensionnel. |
