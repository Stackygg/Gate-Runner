// Point d'entrée principal : Boucle de Jeu, Gestion des États, Barre d'Améliorations en bas & Démarrage au Toucher

import { GAME_CONFIG, UPGRADE_TRACKS_CONFIG } from './config';
import { Renderer } from './engine/Renderer';
import { InputManager } from './engine/InputManager';
import { SoundSynth } from './engine/SoundSynth';
import { MusicSynth } from './engine/MusicSynth';
import { ParticleSystem } from './entities/Particle';
import { Fleet } from './entities/Fleet';
import { Projectile } from './entities/Projectile';
import { Gate } from './entities/Gate';
import { Enemy } from './entities/Enemy';
import { UpgradeStore, EquippedStatsResult } from './systems/UpgradeStore';
import { LevelGenerator, LevelData } from './systems/LevelGenerator';
import { CollisionSystem } from './systems/CollisionSystem';
import { RescuedShip, SHIP_RANKS } from './entities/RescuedShip';
import { HUD } from './ui/HUD';
import { MenuHangar } from './ui/MenuHangar';
import { GameOverModal } from './ui/GameOverModal';
import { BottomUpgradeDock } from './ui/BottomUpgradeDock';
import { ShopModal } from './ui/ShopModal';
import { AdService } from './services/AdService';
import { SplashScreen } from './ui/SplashScreen';

export type GameState = 'MENU' | 'PRE_FLIGHT' | 'PLAYING' | 'BOSS' | 'GAUNTLET' | 'GAMEOVER' | 'PAUSED';

export class GameApp {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private input: InputManager;
  private sound: SoundSynth;
  private music: MusicSynth;
  private particles: ParticleSystem;
  private store: UpgradeStore;
  private hud: HUD;
  private hangar: MenuHangar;
  private gameOverModal: GameOverModal;
  private bottomUpgradeDock: BottomUpgradeDock;
  private shopModal: ShopModal;
  private splashScreen: SplashScreen;

  private state: GameState = 'MENU';
  private previousState: GameState = 'PLAYING';
  private lastTime: number = 0;

  // Entités du monde en cours de partie
  private fleet!: Fleet;
  private projectiles: Projectile[] = [];
  private enemyProjectiles: Projectile[] = [];
  private rescuedShips: RescuedShip[] = [];
  private gates: Gate[] = [];
  private enemies: Enemy[] = [];
  private currentLevelData!: LevelData;
  private traveledDistance: number = 0;
  private sessionDiamonds: number = 0;
  private sessionKills: number = 0;
  private maxMultiplierAchieved: number = 1.0;
  private scrollSpeed: number = GAME_CONFIG.BASE_SCROLL_SPEED;
  private forceFieldTimer: number = 0;
  private currentRaidRightTier: number = 1;
  private mothershipHp: number = 100;
  private maxMothershipHp: number = 100;
  private mothershipHitFlash: number = 0;
  private finalBossEnragedTriggered: boolean = false;
  private fleetDamageTakenInRun: number = 0;
  private mothershipDamageTakenInRun: number = 0;
  private victoryDelayTimer?: number;
  private lastPlayedMission: number = 1;

  // Cache & Scratch Arrays réutilisables (0 allocation mémoire par frame = 0 GC freeze)
  private cachedEquippedStats: EquippedStatsResult | null = null;
  private visibleEnemies: Enemy[] = [];
  private visibleTrackElements: (Gate | Enemy)[] = [];

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new Renderer(this.canvas);
    this.input = new InputManager(this.canvas);
    this.sound = new SoundSynth();
    this.music = new MusicSynth();
    this.particles = new ParticleSystem();
    this.store = new UpgradeStore();
    this.hud = new HUD();
    this.splashScreen = new SplashScreen();

    // Initialisation du Service de Publicités Récompensées
    AdService.init(this.store);

    // Initialisation de la Boutique Stellaire
    this.shopModal = new ShopModal(this.store, () => {
      this.hangar.refreshAll();
      this.updateHudStats();
    });

    // Contrôleur de la barre d'améliorations en bas d'écran (avec bonus +1 vaisseau)
    this.bottomUpgradeDock = new BottomUpgradeDock(
      this.store,
      () => {
        this.reapplyUpgradesToFleet();
        this.updateHudStats();
      },
      () => {
        // Bonus +1 Vaisseau de départ
        if (this.fleet) {
          this.fleet.shipCount += 1;
          this.fleet.rebuildFormation();
          this.particles.spawnFloatingText(this.fleet.centerX, this.fleet.centerY - 30, '+1 RENFORT ESCADRON !', '#00FF88', 24);
          this.sound.playGatePass(true);
          this.updateHudStats();
        }
      }
    );

    this.hangar = new MenuHangar(
      this.store,
      () => this.enterMissionPreparation(),
      () => this.shopModal.show()
    );

    this.gameOverModal = new GameOverModal(
      () => this.handleNextOrRetry(),
      () => this.handleReturnToHangar(),
      (bonusDiamonds: number) => {
        // Callback lors du doublement de diamants par pub
        const targetMission = this.lastPlayedMission || (this.currentLevelData ? this.currentLevelData.levelNumber : this.store.data.selectedMission);
        this.store.addDiamondsToMission(targetMission, bonusDiamonds);
        this.hangar.refreshAll();
      },
      () => this.showHangar(true)
    );

    this.setupGlobalControls();
    this.showHangar();

    // Démarrage de la boucle d'animation principale
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  private setupGlobalControls() {
    // Démarrage instantané au clic / toucher sur le canvas
    const onCanvasInteract = () => {
      if (this.state === 'PRE_FLIGHT') {
        this.launchFlight();
      }
    };

    this.canvas.addEventListener('pointerdown', onCanvasInteract);
    this.canvas.addEventListener('touchstart', onCanvasInteract, { passive: true });

    // --- CONTRÔLEURS AUDIO & MODAL PARAMÈTRES ---
    const btnAudio = document.getElementById('btn-audio-toggle');
    const btnHudMusicToggle = document.getElementById('btn-hud-music-toggle');
    const btnHangarMusicToggle = document.getElementById('btn-hangar-music-toggle');
    const btnHangarSettings = document.getElementById('btn-hangar-settings');
    const modalSettings = document.getElementById('modal-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');

    const btnPauseToggleMusic = document.getElementById('btn-pause-toggle-music');
    const btnPauseToggleSfx = document.getElementById('btn-pause-toggle-sfx');
    const sliderPauseMusic = document.getElementById('slider-pause-music') as HTMLInputElement | null;
    const sliderPauseSfx = document.getElementById('slider-pause-sfx') as HTMLInputElement | null;

    const btnSettingsToggleMusic = document.getElementById('btn-settings-toggle-music');
    const btnSettingsToggleSfx = document.getElementById('btn-settings-toggle-sfx');
    const sliderSettingsMusic = document.getElementById('slider-settings-music') as HTMLInputElement | null;
    const sliderSettingsSfx = document.getElementById('slider-settings-sfx') as HTMLInputElement | null;
    const labelSettingsMusicPct = document.getElementById('label-settings-music-pct');
    const labelSettingsSfxPct = document.getElementById('label-settings-sfx-pct');

    const syncAudioUI = () => {
      const musicMuted = this.music.getIsMuted();
      const sfxMuted = this.sound.getIsMuted();
      const musicVol = Math.round(this.music.getVolume() * 100);
      const sfxVol = Math.round(this.sound.getVolume() * 100);

      // Bouton HUD
      if (btnAudio) btnAudio.textContent = sfxMuted ? '🔇' : '🔊';

      // Bouton Musique en Vol (HUD)
      if (btnHudMusicToggle) {
        btnHudMusicToggle.textContent = '🎵';
        if (musicMuted) {
          btnHudMusicToggle.classList.add('muted');
          btnHudMusicToggle.title = 'Activer la musique';
        } else {
          btnHudMusicToggle.classList.remove('muted');
          btnHudMusicToggle.title = 'Couper la musique';
        }
      }

      // Bouton Rapide Musique Hangar (Note de musique avec état barré/grisé)
      if (btnHangarMusicToggle) {
        btnHangarMusicToggle.textContent = '🎵';
        if (musicMuted) {
          btnHangarMusicToggle.classList.add('muted');
          btnHangarMusicToggle.title = 'Activer la musique';
        } else {
          btnHangarMusicToggle.classList.remove('muted');
          btnHangarMusicToggle.title = 'Couper la musique';
        }
      }

      // Contrôles Menu Pause
      if (btnPauseToggleMusic) {
        btnPauseToggleMusic.textContent = musicMuted ? 'OFF' : 'ON';
        btnPauseToggleMusic.className = `btn-audio-toggle-chip ${musicMuted ? 'muted' : 'active'}`;
      }
      if (btnPauseToggleSfx) {
        btnPauseToggleSfx.textContent = sfxMuted ? 'OFF' : 'ON';
        btnPauseToggleSfx.className = `btn-audio-toggle-chip ${sfxMuted ? 'muted' : 'active'}`;
      }
      if (sliderPauseMusic) sliderPauseMusic.value = String(musicVol);
      if (sliderPauseSfx) sliderPauseSfx.value = String(sfxVol);

      // Contrôles Modal Paramètres
      if (btnSettingsToggleMusic) {
        btnSettingsToggleMusic.textContent = musicMuted ? 'OFF' : 'ON';
        btnSettingsToggleMusic.className = `btn-audio-toggle-chip ${musicMuted ? 'muted' : 'active'}`;
      }
      if (btnSettingsToggleSfx) {
        btnSettingsToggleSfx.textContent = sfxMuted ? 'OFF' : 'ON';
        btnSettingsToggleSfx.className = `btn-audio-toggle-chip ${sfxMuted ? 'muted' : 'active'}`;
      }
      if (sliderSettingsMusic) sliderSettingsMusic.value = String(musicVol);
      if (sliderSettingsSfx) sliderSettingsSfx.value = String(sfxVol);
      if (labelSettingsMusicPct) labelSettingsMusicPct.textContent = `${musicVol}%`;
      if (labelSettingsSfxPct) labelSettingsSfxPct.textContent = `${sfxVol}%`;
    };

    // Toggles Musique
    const toggleMusic = () => {
      this.music.toggleMute();
      syncAudioUI();
    };
    btnHudMusicToggle?.addEventListener('click', toggleMusic);
    btnHangarMusicToggle?.addEventListener('click', toggleMusic);
    btnPauseToggleMusic?.addEventListener('click', toggleMusic);
    btnSettingsToggleMusic?.addEventListener('click', toggleMusic);

    // Toggles Bruitages (SFX)
    const toggleSfx = () => {
      this.sound.toggleMute();
      syncAudioUI();
    };
    btnAudio?.addEventListener('click', toggleSfx);
    btnPauseToggleSfx?.addEventListener('click', toggleSfx);
    btnSettingsToggleSfx?.addEventListener('click', toggleSfx);

    // Sliders Musique
    const onMusicSliderChange = (e: Event) => {
      const val = Number((e.target as HTMLInputElement).value);
      this.music.setVolume(val / 100);
      if (this.music.getIsMuted() && val > 0) this.music.setMuted(false);
      syncAudioUI();
    };
    sliderPauseMusic?.addEventListener('input', onMusicSliderChange);
    sliderSettingsMusic?.addEventListener('input', onMusicSliderChange);

    // Sliders SFX
    const onSfxSliderChange = (e: Event) => {
      const val = Number((e.target as HTMLInputElement).value);
      this.sound.setVolume(val / 100);
      if (this.sound.getIsMuted() && val > 0) this.sound.setMuted(false);
      syncAudioUI();
    };
    sliderPauseSfx?.addEventListener('input', onSfxSliderChange);
    sliderSettingsSfx?.addEventListener('input', onSfxSliderChange);

    // Modal Paramètres (⚙️)
    const btnSettingsTogglePerf = document.getElementById('btn-settings-toggle-perf');

    const syncPerfUI = () => {
      const isPerf = Renderer.performanceMode;
      if (btnSettingsTogglePerf) {
        btnSettingsTogglePerf.textContent = isPerf ? 'ON' : 'OFF';
        btnSettingsTogglePerf.className = `btn-audio-toggle-chip ${isPerf ? 'active' : 'muted'}`;
      }
    };

    btnSettingsTogglePerf?.addEventListener('click', () => {
      Renderer.setPerformanceMode(!Renderer.performanceMode);
      this.renderer.initStars();
      this.renderer.handleResize();
      syncPerfUI();
    });

    btnHangarSettings?.addEventListener('click', () => {
      syncAudioUI();
      syncPerfUI();
      modalSettings?.classList.remove('hidden');
    });

    btnCloseSettings?.addEventListener('click', () => {
      modalSettings?.classList.add('hidden');
    });

    syncAudioUI();
    syncPerfUI();

    // Boutons Sélecteur de Morceau
    const btnMusic = document.getElementById('btn-music-track');
    const btnHangarMusic = document.getElementById('btn-hangar-music');
    const hudMusicName = document.getElementById('hud-music-name');
    const hangarMusicName = document.getElementById('hangar-music-name');

    const switchTrack = () => {
      const track = this.music.nextTrack();
      const shortName = track.name.replace(/^[^\s]+\s*/, '');
      if (hudMusicName) hudMusicName.textContent = shortName;
      if (hangarMusicName) hangarMusicName.textContent = shortName;
    };

    btnMusic?.addEventListener('click', switchTrack);
    btnHangarMusic?.addEventListener('click', switchTrack);

    // Bouton Pause
    const btnPause = document.getElementById('btn-pause');
    const modalPause = document.getElementById('modal-pause');
    const btnResume = document.getElementById('btn-resume-game');
    const btnRestart = document.getElementById('btn-restart-run');
    const btnQuit = document.getElementById('btn-quit-hangar');

    const togglePause = () => {
      if (this.state === 'PLAYING' || this.state === 'BOSS' || this.state === 'GAUNTLET') {
        this.previousState = this.state;
        this.state = 'PAUSED';
        syncAudioUI();
        modalPause?.classList.remove('hidden');
      } else if (this.state === 'PAUSED') {
        this.state = this.previousState;
        modalPause?.classList.add('hidden');
      }
    };

    btnPause?.addEventListener('click', togglePause);
    btnResume?.addEventListener('click', togglePause);

    btnRestart?.addEventListener('click', () => {
      modalPause?.classList.add('hidden');
      this.enterMissionPreparation();
    });

    btnQuit?.addEventListener('click', () => {
      modalPause?.classList.add('hidden');
      this.showHangar();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        togglePause();
      }
    });
  }

  public showHangar(openDedicatedHangar: boolean = false) {
    this.state = 'MENU';
    this.music.playTrack('main');
    this.hud.hide();
    this.hud.hideMothership();
    this.bottomUpgradeDock.hide();
    if (openDedicatedHangar) {
      this.hangar.showHangar();
    } else {
      this.hangar.showMainMenu();
    }
  }

  private currentPhase: number = 1;
  private finalBossTimer: number = 30.0;
  private finalBossMultiplier: number = 5.0;

  // Entrée dans le niveau : scène 3D déjà visible + barre d'amélioration en bas
  public enterMissionPreparation() {
    this.state = 'PRE_FLIGHT';
    this.music.playTrack('main');
    this.hangar.hide();
    this.hud.show();
    this.hud.hideBoss();

    this.traveledDistance = 0;
    this.sessionDiamonds = 0;
    this.sessionKills = 0;
    this.maxMultiplierAchieved = 5.0;
    this.finalBossTimer = 30.0;
    this.finalBossMultiplier = 5.0;
    this.finalBossEnragedTriggered = false;
    this.scrollSpeed = GAME_CONFIG.BASE_SCROLL_SPEED;
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.rescuedShips = [];
    this.particles.clear();
    this.input.resetToCenter();
    this.fleetDamageTakenInRun = 0;
    this.mothershipDamageTakenInRun = 0;
    this.victoryDelayTimer = undefined;
    this.currentPhase = 1;
    this.renderer.currentPhase = 1;
    this.hud.showPhaseBanner(1, 'AVANT-POSTE DE RECONNAISSANCE');

    // Génération du niveau
    this.currentLevelData = LevelGenerator.generateLevel(this.store.data.selectedMission);
    this.gates = this.currentLevelData.gates;
    this.enemies = this.currentLevelData.enemies;
    this.forceFieldTimer = this.currentLevelData.isFunLevel ? 10.0 : 0;
    this.currentRaidRightTier = 1;

    // Gestion du Vaisseau Mère (Mode Escorte / Défense)
    this.mothershipHitFlash = 0;
    if (this.currentLevelData.missionType === 'escort') {
      this.mothershipHp = this.currentLevelData.mothershipHp || 100;
      this.maxMothershipHp = this.mothershipHp;
      this.hud.showMothership(this.mothershipHp, this.maxMothershipHp);
    } else {
      this.hud.hideMothership();
    }

    // Initialisation de la flotte (40 vaisseaux 4x10 pour niveaux Raid, 20 pour niveaux classiques et escorte)
    this.initFleet();

    // Réinitialisation du quota de passage de palier gratuit par essai
    this.store.resetSessionTierAllowance();

    // Affichage du Dock d'améliorations en bas
    this.bottomUpgradeDock.show();

    // Mise à jour du HUD
    this.updateHudStats();
  }

  private initFleet() {
    const frTrack = this.store.data.upgradeTracks.fireRate;
    const dmgTrack = this.store.data.upgradeTracks.damage;
    
    const fireRateMultiplier = UPGRADE_TRACKS_CONFIG.fireRate.getStatMultiplier(frTrack.tier, frTrack.step);
    const damageMultiplier = UPGRADE_TRACKS_CONFIG.damage.getStatMultiplier(dmgTrack.tier, dmgTrack.step);
    const activeSkin = this.store.getSelectedSkin();
    this.cachedEquippedStats = this.store.getEquippedStats(activeSkin.id);
    const equippedStats = this.cachedEquippedStats;

    const isFun = this.currentLevelData ? this.currentLevelData.isFunLevel : (this.store.data.selectedMission % 3 === 2);
    const maxFleet = isFun ? 40 : 20;

    const fleetFRBonus = 1 + (equippedStats.specialEffects.fleetFireRateBonus || 0) / 100;
    const totalFR = fireRateMultiplier * equippedStats.fireRateMultiplier * fleetFRBonus;
    const totalDmg = damageMultiplier * equippedStats.damageMultiplier;
    const startingShips = GAME_CONFIG.BASE_FLEET_SIZE + (equippedStats.bonusStartingShips || 0) + (equippedStats.specialEffects.bonusStartingShips || 0);

    this.fleet = new Fleet(startingShips, activeSkin, totalFR, totalDmg, maxFleet);
    this.fleet.setEquippedSpecialEffects(equippedStats.specialEffects);
  }

  private reapplyUpgradesToFleet() {
    if (this.fleet) {
      const frTrack = this.store.data.upgradeTracks.fireRate;
      const dmgTrack = this.store.data.upgradeTracks.damage;
      
      const fireRateMultiplier = UPGRADE_TRACKS_CONFIG.fireRate.getStatMultiplier(frTrack.tier, frTrack.step);
      const damageMultiplier = UPGRADE_TRACKS_CONFIG.damage.getStatMultiplier(dmgTrack.tier, dmgTrack.step);
      this.cachedEquippedStats = this.store.getEquippedStats(this.fleet.activeSkin.id);
      const equippedStats = this.cachedEquippedStats;

      const fleetFRBonus = 1 + (equippedStats.specialEffects.fleetFireRateBonus || 0) / 100;
      this.fleet.fireRate = GAME_CONFIG.BASE_FIRE_RATE * this.fleet.activeSkin.statBonus.fireRateMultiplier * fireRateMultiplier * equippedStats.fireRateMultiplier * fleetFRBonus;
      this.fleet.bulletDamage = GAME_CONFIG.BASE_BULLET_DAMAGE * this.fleet.activeSkin.statBonus.damageMultiplier * damageMultiplier * equippedStats.damageMultiplier;
      this.fleet.setEquippedSpecialEffects(equippedStats.specialEffects);
    }
  }

  private updateHudStats() {
    if (!this.fleet || !this.currentLevelData) return;
    const progress = this.traveledDistance / this.currentLevelData.totalDistance;

    const effectiveDamage = this.fleet.bulletDamage * this.fleet.evolutionDamageMultiplier;
    const damagePct = Math.round((effectiveDamage / GAME_CONFIG.BASE_BULLET_DAMAGE) * 100);

    const effectiveFireRate = this.fleet.fireRate * this.fleet.evolutionFireRateMultiplier;
    const fireRatePct = Math.round((effectiveFireRate / GAME_CONFIG.BASE_FIRE_RATE) * 100);

    this.hud.updateStats(
      this.fleet.shipCount,
      this.sessionDiamonds,
      damagePct,
      fireRatePct,
      progress,
      this.currentLevelData.levelNumber,
      this.currentPhase
    );
  }

  // Décollage immédiat au premier mouvement / clic
  public launchFlight() {
    if (this.state !== 'PRE_FLIGHT') return;

    this.state = 'PLAYING';
    this.bottomUpgradeDock.hide();

    // Démarrage de la musique de combat en vol (Chip Funk Pulse)
    this.music.playTrack('music1');
  }

  private handleNextOrRetry() {
    this.enterMissionPreparation();
  }

  private handleReturnToHangar() {
    this.showHangar();
  }

  private triggerGameOver(isVictory: boolean, defeatReason: 'FLEET_DESTROYED' | 'MOTHERSHIP_DESTROYED' = 'FLEET_DESTROYED') {
    this.state = 'GAMEOVER';
    this.music.stop();
    this.scrollSpeed = 0;
    this.bottomUpgradeDock.hide();

    this.lastPlayedMission = this.currentLevelData ? this.currentLevelData.levelNumber : this.store.data.selectedMission;
    let earnedDiamonds = Math.round(this.sessionDiamonds);
    let earnedIridium = 0;
    let finalMultiplier = this.maxMultiplierAchieved;
    let newlyCompletedQuests: any[] = [];
    let rewardLoot: any = undefined;
    const missionQuests = this.store.getQuestsForMission(this.lastPlayedMission);

    if (isVictory) {
      this.sound.playVictory();
      earnedDiamonds = Math.round(this.sessionDiamonds * finalMultiplier + 10);
      this.store.addDiamondsToMission(this.lastPlayedMission, earnedDiamonds);

      // Validation des Quêtes / Hauts-Faits de la mission (1 Iridium par quête accomplie)
      const questValidation = this.store.validateQuests(this.lastPlayedMission, {
        noDamageFleet: this.fleetDamageTakenInRun === 0,
        noDamageMothership: (this.currentLevelData.missionType === 'escort') && (this.mothershipDamageTakenInRun === 0)
      });
      newlyCompletedQuests = questValidation.newlyCompletedQuests;

      // 1 Iridium permanent offert lors du 1er franchissement de la mission
      const clearResult = this.store.completeMission(this.lastPlayedMission);
      earnedIridium = clearResult.crystalsAwarded + questValidation.totalIridiumAwarded;

      // Butin d'équipement aléatoire généré en fin de mission
      rewardLoot = this.store.generateMissionLoot(this.lastPlayedMission, true);
    } else {
      this.sound.playExplosion(true);
      finalMultiplier = 1.0;
      // En cas d'échec : les diamants de la session s'accumulent et débloquent l'option diamant pour les 5/5
      this.store.addDiamondsToMission(this.lastPlayedMission, earnedDiamonds);
      this.store.onRunDefeat();
    }

    this.gameOverModal.show({
      isVictory,
      survivingFleet: Math.max(0, this.fleet ? this.fleet.shipCount : 0),
      enemiesKilled: this.sessionKills,
      multiplier: finalMultiplier,
      diamondsEarned: earnedDiamonds,
      crystalsEarned: earnedIridium,
      nextLevelNum: this.store.data.selectedMission,
      defeatReason,
      quests: this.store.getQuestsForMission(this.lastPlayedMission),
      newlyCompletedQuests,
      rewardLoot
    });
  }

  // --- BOUCLE DE JEU PRINCIPALE (60 FPS) ---
  private gameLoop(currentTime: number) {
    // Si l'écran d'introduction (Splash Screen) est en cours, suspendre le rendu canvas pour libérer 100% du CPU/GPU mobile
    if (this.splashScreen && !this.splashScreen.getIsDismissed()) {
      requestAnimationFrame((t) => this.gameLoop(t));
      return;
    }

    const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    if (this.state === 'PRE_FLIGHT') {
      if (this.input.getIsPointerDown()) {
        this.launchFlight();
      }
      this.updatePreFlight(dt);
      this.renderFrame(dt, 0);
    } else if (this.state === 'PLAYING' || this.state === 'BOSS' || this.state === 'GAUNTLET') {
      this.updateGame(dt);
      this.renderFrame(dt, this.scrollSpeed);
    } else if (this.state === 'MENU') {
      this.renderer.clear(dt, 0);
    }

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  private updatePreFlight(dt: number) {
    const targetX = this.input.update(dt);
    this.fleet.update(dt, targetX);
    this.particles.update(dt);
  }

  private updateGame(dt: number) {
    const targetX = this.input.update(dt);

    // 1. Déplacement de la Flotte & Tir automatique
    const newBullets = this.fleet.update(dt, targetX);
    if (newBullets.length > 0) {
      this.projectiles.push(...newBullets);
      this.sound.playLaser();
    }

    // 2. Défilement & Détection dynamique des 4 Phases de jeu
    this.traveledDistance += this.scrollSpeed * dt;

    let newPhase = 1;
    if (this.traveledDistance >= 14400) newPhase = 4;
    else if (this.traveledDistance >= 8200) newPhase = 3;
    else if (this.traveledDistance >= 2800) newPhase = 2;
    else newPhase = 1;

    if (newPhase !== this.currentPhase) {
      this.currentPhase = newPhase;
      this.renderer.currentPhase = newPhase;
      const phaseNames: Record<number, string> = {
        1: 'AVANT-POSTE DE RECONNAISSANCE',
        2: 'ESCADRON DESTROYER',
        3: 'ARMADA CUIRASSÉE',
        4: 'LE TITAN FINAL'
      };
      this.hud.showPhaseBanner(newPhase, phaseNames[newPhase]);
      this.sound.playGatePass();
    }

    const aliveBlackHoles = this.enemies.filter(e => e.type === 'black_hole' && !e.isDead);

    for (const p of this.projectiles) {
      if (!p.isDead && (p.type === 'laser' || p.type === 'plasma' || p.type === 'missile')) {
        // Seuls les tirs tirés dans la colonne de gauche (X <= 175) sont attirés par le trou noir
        if (p.x <= 175) {
          for (const bh of aliveBlackHoles) {
            const dx = bh.x - p.x;
            const dy = bh.y - p.y;
            const distSq = dx * dx + dy * dy;
            const pullRadius = 150;

            if (distSq < pullRadius * pullRadius && distSq > 150) {
              const dist = Math.sqrt(distSq);
              // Aspiration légère et subtile limitée à la colonne
              const force = (1 - dist / pullRadius) * 240;
              p.vx += (dx / dist) * force * dt * 2.0;
              p.x += (dx / dist) * force * dt * 0.35;
            }
          }
        }
      }
      p.update(dt);
    }
    this.projectiles = this.projectiles.filter(p => !p.isDead);

    // 2.1 Mise à jour des trous noirs et des portails (Voies Gauche et Droite)
    const gateRapidSpeed = Math.max(380, this.scrollSpeed * 2.5);
    const isEscort = (this.currentLevelData?.missionType === 'escort');

    // Progression des trous noirs gauches avec espacement naturel
    const leftBHs = aliveBlackHoles.filter(bh => bh.x <= 200).sort((a, b) => b.y - a.y);
    for (let i = 0; i < leftBHs.length; i++) {
      const bh = leftBHs[i];
      let targetY = (this.currentLevelData?.isFunLevel) ? 360 : (360 - i * 330);

      // Tous les trous noirs surveillent les portails libérés en descente devant eux pour ne pas les écraser
      const precedingGates = this.gates.filter(g => !g.isPassed && !g.isBossReward && Math.abs(g.x - bh.x) < 85 && g.y > bh.y);
      if (precedingGates.length > 0) {
        const lowestGateY = Math.min(...precedingGates.map(g => g.y));
        targetY = Math.min(targetY, lowestGateY - 140);
      }

      if (bh.y < targetY) {
        bh.y += Math.min(targetY - bh.y, 340 * dt);
      }
    }

    // Progression et Spawn Séquentiel des Trous Noirs Droits en Mode Raid
    if (this.currentLevelData?.isFunLevel) {
      const rightLaneX = 455;
      const gateWidth = 95;
      const rightBH = aliveBlackHoles.find(bh => Math.abs(bh.x - rightLaneX) < 50);
      const rightGates = this.gates.filter(g => !g.isPassed && Math.abs(g.x - rightLaneX) < 50);

      // Si le trou noir de droite actuel et ses portails sont tous passés/vaincus, faire entrer le palier suivant
      if (!rightBH && rightGates.length === 0 && this.currentRaidRightTier < 5) {
        this.currentRaidRightTier++;
        const tierMultiplier = Math.floor(this.store.data.selectedMission / 2);
        const hpTiers = [
          300 + (tierMultiplier - 1) * 100,
          20000 + (tierMultiplier - 1) * 10000,
          60000 + (tierMultiplier - 1) * 30000,
          150000 + (tierMultiplier - 1) * 75000,
          350000 + (tierMultiplier - 1) * 150000
        ];
        const nextHp = hpTiers[this.currentRaidRightTier - 1] || 500000;

        // Spawn fluide depuis l'espace lointain (Y = -350) pour glisser majestueusement vers le combat à Y = 360
        const newBH = new Enemy(rightLaneX, -350, 85, 85, 'black_hole', nextHp);
        this.enemies.push(newBH);

        // 5 portails +10 espacés de manière aérée et lisible (180px) pour éliminer tout chevauchement en 3D
        for (let p = 1; p <= 5; p++) {
          this.gates.push(new Gate(rightLaneX, -350 - 130 - (p - 1) * 180, gateWidth, GAME_CONFIG.GATE_HEIGHT, 'ADD_SHIPS', 10, false));
        }
      }

      // Progression du trou noir droit vers sa position de combat (Y = 360)
      if (rightBH) {
        let targetY = 360;
        const precedingGates = this.gates.filter(g => !g.isPassed && !g.isBossReward && Math.abs(g.x - rightBH.x) < 85 && g.y > rightBH.y);
        if (precedingGates.length > 0) {
          const lowestGateY = Math.min(...precedingGates.map(g => g.y));
          targetY = Math.min(targetY, lowestGateY - 140);
        }
        if (rightBH.y < targetY) {
          rightBH.y += Math.min(targetY - rightBH.y, 340 * dt);
        }
      }
    } else {
      // Progression classique pour les missions non-Raid
      const rightBHs = aliveBlackHoles.filter(bh => bh.x > 200).sort((a, b) => b.y - a.y);
      for (let i = 0; i < rightBHs.length; i++) {
        const bh = rightBHs[i];
        let targetY = 360 - i * 330;
        const precedingGates = this.gates.filter(g => !g.isPassed && !g.isBossReward && Math.abs(g.x - bh.x) < 85 && g.y > bh.y);
        if (precedingGates.length > 0) {
          const lowestGateY = Math.min(...precedingGates.map(g => g.y));
          targetY = Math.min(targetY, lowestGateY - 140);
        }
        if (bh.y < targetY) {
          bh.y += Math.min(targetY - bh.y, 340 * dt);
        }
      }
    }

    // Ravitaillement continu et équilibré de portails sur la voie de gauche en Mode Raid
    if (this.currentLevelData?.isFunLevel) {
      const leftLaneX = 85;
      const gateWidth = 95;
      const leftGates = this.gates.filter(g => !g.isPassed && Math.abs(g.x - leftLaneX) < 50);
      const minLeftY = leftGates.length > 0 ? Math.min(...leftGates.map(g => g.y)) : 240;

      // On maintient en permanence des portails d'avance (jusqu'à Y = -1600) tant que le combat final est actif
      const isFinalBossDead = this.enemies.some(e => e.type === 'boss_final' && e.isDead);
      if (!isFinalBossDead && minLeftY > -1600) {
        const nextY = minLeftY - 320;
        // 1 fois sur 10 : +10 à 50% cadence de tir OU dégâts aléatoirement
        const isBonus = Math.random() < 0.10;
        if (isBonus) {
          const isFireRate = Math.random() < 0.5;
          const val = 10 + Math.floor(Math.random() * 9) * 5; // 10% à 50%
          this.gates.push(new Gate(leftLaneX, nextY, gateWidth, GAME_CONFIG.GATE_HEIGHT, isFireRate ? 'ADD_FIRERATE' : 'ADD_DAMAGE', val, false));
        } else {
          this.gates.push(new Gate(leftLaneX, nextY, gateWidth, GAME_CONFIG.GATE_HEIGHT, 'ADD_SHIPS', 1, false));
        }
      }
    }

    // Mise à jour fluide des portails :
    // Tant qu'un trou noir est VIVANT devant lui, le portail reste verrouillé à son espacement exact dans la file
    // Dès que le trou noir est DÉTRUIT, les portails libérés descendent promptement vers le joueur pour être collectés
    for (const gate of this.gates) {
      if (gate.isPassed) continue;

      // Si le portail a dépassé la flotte du joueur sans collision, le marquer pour qu'il disparaisse proprement
      if (gate.y > this.fleet.centerY + 50) {
        gate.isPassed = true;
        if (gate.pairGate) {
          gate.pairGate.isPassed = true;
          gate.pairGate = undefined;
        }
        continue;
      }

      if (isEscort || gate.isBossReward) {
        gate.update(dt, 340);
        continue;
      }

      let blockingBH: Enemy | undefined;
      if (gate.assignedBH) {
        if (!gate.assignedBH.isDead) {
          blockingBH = gate.assignedBH;
        }
      } else {
        blockingBH = aliveBlackHoles
          .filter(bh => Math.abs(bh.x - gate.x) < 85 && bh.y >= gate.y - 40)
          .sort((a, b) => a.y - b.y)[0];
      }

      if (blockingBH) {
        // Le trou noir est vivant : le portail maintient sa position ordonnée et rigide dans la file
        const isRightRaid = (this.currentLevelData?.isFunLevel && Math.abs(gate.x - 455) < 50);
        const isLeftRaid = (this.currentLevelData?.isFunLevel && Math.abs(gate.x - 85) < 50);
        const precedingGates = this.gates.filter(other => 
          !other.isPassed && 
          !other.isBossReward && 
          Math.abs(other.x - gate.x) < 85 && 
          other !== gate && 
          other.y > gate.y && 
          other.y < blockingBH.y
        ).length;

        const gateSpacing = isRightRaid ? 180 : (isLeftRaid ? 320 : 110);
        const headSpace = isLeftRaid ? 120 : 130;
        const safeMaxY = blockingBH.y - headSpace - precedingGates * gateSpacing;

        // Met à jour les animations d'énergie du portail sans dérive de position
        gate.update(dt, 0, safeMaxY);
        gate.y = safeMaxY;
      } else {
        // Le trou noir devant est vaincu : le portail est libéré et glisse promptement vers le joueur !
        gate.update(dt, gateRapidSpeed);
      }
    }

    // 2.2 Champ de Force Temporaire au Milieu (Niveaux Fun / Raid)
    if (this.forceFieldTimer > 0) {
      const prev = this.forceFieldTimer;
      this.forceFieldTimer = Math.max(0, this.forceFieldTimer - dt);
      if (prev > 0 && this.forceFieldTimer === 0) {
        this.sound.playWarp();
        this.renderer.addScreenShake(10);
        this.particles.spawnFloatingText(GAME_CONFIG.WORLD_WIDTH / 2, 180, '💥 CHAMP DE FORCE LIBÉRÉ !', '#FFE600', 26);
      }
      // Rétention propre des astéroïdes au-dessus du champ de force sans empilement
      const midAsteroids = this.enemies
        .filter(e => e.type === 'block' && !e.isDead && e.x > 150 && e.x < 390 && e.y >= 40)
        .sort((a, b) => b.y - a.y);

      for (let i = 0; i < midAsteroids.length; i++) {
        const ast = midAsteroids[i];
        const maxAllowed = 150 - i * 36;
        if (ast.y > maxAllowed) {
          ast.y = maxAllowed;
        }
      }
    }

    // Positionnement échelonné des boss (évite les superpositions tout en maintenant la routine de combat)
    const activeBosses = this.enemies
      .filter(e => e.isBossType() && !e.isDead && e.y >= -250)
      .sort((a, b) => b.y - a.y); // Du plus avancé (plus proche du joueur) au plus en retrait

    const bossSlotY = [200, 90, -20, -130];

    // Synchronisation de l'armada : tous les boss en ligne tirent ensemble de manière coordonnée
    if (activeBosses.length > 1) {
      const finalBossInArmada = activeBosses.find(b => b.type === 'boss_final');
      // Si le boss final a dépassé 10s de combat, il tire à son propre rythme accéléré
      if (!finalBossInArmada || finalBossInArmada.combatTimer <= 10.0) {
        const leaderShootTimer = activeBosses[0].getShootTimer();
        for (let i = 1; i < activeBosses.length; i++) {
          activeBosses[i].syncShootTimer(leaderShootTimer);
        }
      }
    }

    // Mise à jour des ennemis
    for (const enemy of this.enemies) {
      let targetCombatY = 220;
      if (enemy.isBossType()) {
        const slotIdx = activeBosses.indexOf(enemy);
        if (slotIdx >= 0 && slotIdx < bossSlotY.length) {
          targetCombatY = bossSlotY[slotIdx];
        } else if (slotIdx >= bossSlotY.length) {
          targetCombatY = -30 - (slotIdx - 3) * 110;
        }
      }

      const enemyBullets = enemy.update(dt, this.scrollSpeed, this.fleet.centerX, targetCombatY, isEscort);
      if (enemyBullets.length > 0) {
        this.enemyProjectiles.push(...enemyBullets);
      }
    }

    // Projectiles ennemis
    for (const ep of this.enemyProjectiles) {
      ep.update(dt);
    }

    // 3. Détection et résolution des Collisions 3D
    const dmTrack = this.store.data.upgradeTracks.diamondBoost;
    const diamondBoostMultiplier = UPGRADE_TRACKS_CONFIG.diamondBoost.getStatMultiplier(dmTrack.tier, dmTrack.step);
    const eqDiamondMultiplier = this.cachedEquippedStats ? this.cachedEquippedStats.diamondMultiplier : 1.0;
    const totalDiamondMultiplier = diamondBoostMultiplier * (eqDiamondMultiplier || 1.0);

    const collisionResults = CollisionSystem.checkAndResolve(
      this.fleet,
      this.projectiles,
      this.enemyProjectiles,
      this.gates,
      this.enemies,
      this.particles,
      this.sound,
      1.0,
      totalDiamondMultiplier
    );

    this.sessionDiamonds += collisionResults.diamondsEarned;
    this.sessionKills += collisionResults.enemiesKilled;
    this.fleetDamageTakenInRun += collisionResults.fleetDamageTaken;
    if (collisionResults.highestGauntletMultiplier > this.maxMultiplierAchieved) {
      this.maxMultiplierAchieved = collisionResults.highestGauntletMultiplier;
    }

    if (collisionResults.screenShake > 0) {
      this.renderer.addScreenShake(collisionResults.screenShake);
    }

    // 3.05 Récupération et vol des Vaisseaux Prototypes Libérés
    if (collisionResults.rescuedShipsSpawned && collisionResults.rescuedShipsSpawned.length > 0) {
      this.rescuedShips.push(...collisionResults.rescuedShipsSpawned);
    }

    for (const ship of this.rescuedShips) {
      const collected = ship.update(dt, this.fleet.centerX, this.fleet.centerY);
      if (collected) {
        const upgraded = this.fleet.evolveToRank(ship.targetRank);
        const rInfo = SHIP_RANKS[ship.targetRank] || SHIP_RANKS[2];
        this.sound.playWarp();
        this.renderer.addScreenShake(14);
        this.particles.spawnExplosion(this.fleet.centerX, this.fleet.centerY, rInfo.color, 45);
        this.particles.spawnGems(this.fleet.centerX, this.fleet.centerY, 8);

        // Annonce flottante d'évolution avec le perk
        this.particles.spawnFloatingText(
          this.fleet.centerX,
          this.fleet.centerY - 55,
          `⭐ ÉVOLUTION : ${rInfo.name} !`,
          rInfo.color,
          26
        );
        this.particles.spawnFloatingText(
          this.fleet.centerX,
          this.fleet.centerY - 24,
          `⚡ ${rInfo.perkName} !`,
          '#FFE600',
          22
        );
      }
    }
    this.rescuedShips = this.rescuedShips.filter(s => !s.isDead);
    this.projectiles = this.projectiles.filter(p => !p.isDead);
    this.enemyProjectiles = this.enemyProjectiles.filter(ep => !ep.isDead);

    // 3.1 Mode Escorte / Défense : Interception des astéroïdes menaçant le Vaisseau Mère
    this.mothershipHitFlash = Math.max(0, this.mothershipHitFlash - dt);
    if (this.currentLevelData?.missionType === 'escort') {
      let frameMothershipDmg = 0;
      let lastHitX = GAME_CONFIG.WORLD_WIDTH / 2;

      for (const enemy of this.enemies) {
        if (!enemy.isDead && enemy.y >= 680) {
          enemy.isDead = true;
          const dmg = (enemy.type === 'block') ? 5 : (enemy.isBossType() ? 25 : 10);
          frameMothershipDmg += dmg;
          lastHitX = enemy.x;
          this.particles.spawnExplosion(enemy.x, 780, '#FF5500', 8);
        }
      }

      // Tirs ennemis atteignant le bouclier du Vaisseau Mère
      for (const ep of this.enemyProjectiles) {
        if (!ep.isDead && ep.y >= 750) {
          ep.isDead = true;
          frameMothershipDmg += 2;
          lastHitX = ep.x;
          this.particles.spawnExplosion(ep.x, 780, '#FFAA00', 4);
        }
      }

      if (frameMothershipDmg > 0) {
        this.mothershipHp = Math.max(0, this.mothershipHp - frameMothershipDmg);
        this.mothershipDamageTakenInRun += frameMothershipDmg;
        this.mothershipHitFlash = 0.25;
        this.sound.playExplosion(false);
        this.particles.spawnFloatingText(lastHitX, 760, `-${frameMothershipDmg} BOUCLIER !`, '#FF0055', 20);
        this.hud.updateMothershipHp(this.mothershipHp, this.maxMothershipHp);

        if (this.mothershipHp <= 0) {
          this.sound.playExplosion(true);
          this.particles.spawnExplosion(GAME_CONFIG.WORLD_WIDTH / 2, 830, '#FF0055', 40);
          this.triggerGameOver(false, 'MOTHERSHIP_DESTROYED');
          return;
        }
      }
    }

    // 4. Nettoyage des entités hors écran et des portails consommés
    this.projectiles = this.projectiles.filter(p => !p.isDead && p.y > -4500 && p.y < 1200);
    this.enemyProjectiles = this.enemyProjectiles.filter(ep => !ep.isDead && ep.y < 1200 && ep.y > -4500);
    this.enemies = this.enemies.filter(e => !e.isDead && e.y < 1100);
    this.gates = this.gates.filter(g => !g.isPassed && g.y <= this.fleet.centerY + 50);

    this.particles.update(
      dt,
      this.fleet?.centerX,
      this.fleet?.centerY,
      this.fleet?.magnetRadius
    );

    // 4.1 Hyperpropulsion Fluide entre les vagues (Expédition & Raid) :
    // Dès qu'aucun obstacle/trou noir/portail/boss n'est présent sur la zone de combat,
    // la vitesse de défilement accélère pour faire glisser la vague suivante et l'apparition du boss sans attente !
    // RÈGLE : Les astéroïdes accélèrent et l'apparition du boss accélère, mais le boss lui-même n'accélère JAMAIS en combat !
    const playerY = this.fleet ? this.fleet.centerY : GAME_CONFIG.PLAYER_BASE_Y;
    const hasActiveBoss = this.enemies.some(e => e.isBossType() && !e.isDead && e.y >= -300 && e.y < playerY + 50);
    const hasActiveBlackHole = this.enemies.some(e => e.type === 'black_hole' && !e.isDead && e.y >= -150 && e.y < playerY + 50);
    const hasActiveGate = this.gates.some(g => !g.isPassed && g.y >= -150 && g.y < playerY + 25);
    const hasActiveAsteroids = this.enemies.some(e => e.type === 'block' && !e.isDead && e.y >= -100 && e.y < playerY + 40);

    const hasScreenObstacles = hasActiveBoss || hasActiveBlackHole || hasActiveGate || hasActiveAsteroids;
    const hasUpcomingContent = this.enemies.some(e => !e.isDead && e.y < -150) || this.gates.some(g => !g.isPassed && g.y < -150);
    const allowHyperdrive = (this.currentLevelData?.missionType !== 'escort');

    if (allowHyperdrive && !hasScreenObstacles && hasUpcomingContent && this.state !== 'BOSS' && this.state !== 'GAMEOVER' && this.state !== 'PAUSED') {
      // Hyperdrive fluide : fait glisser la vague d'astéroïdes et l'approche du boss sans saccade
      this.scrollSpeed = Math.min(GAME_CONFIG.BASE_SCROLL_SPEED * 2.6, this.scrollSpeed + dt * 1000);
    } else {
      // Décélération fluide et naturelle vers la vitesse nominale dès qu'un boss ou obstacle est présent
      const decelSpeed = hasActiveBoss ? 2800 : 1800;
      this.scrollSpeed = Math.max(GAME_CONFIG.BASE_SCROLL_SPEED, this.scrollSpeed - dt * decelSpeed);
    }

    // 5. État et Affichage des Boss de Vagues & Timer Dégressif (30s de x5.0 à x1.0)
    const activeBoss = this.enemies.find(e => e.isBossType() && !e.isDead && e.y >= 0 && e.y < 750);
    if (activeBoss) {
      if (this.state !== 'BOSS') {
        this.state = 'BOSS';
        this.music.playTrack('boss');
      }
      const isFinal = (activeBoss.type === 'boss_final');
      this.hud.showBoss(activeBoss.bossName, activeBoss.hp, activeBoss.maxHp, isFinal);

      if (isFinal) {
        this.finalBossTimer = Math.max(0, this.finalBossTimer - dt);
        // Multiplicateur dégressif : démarre à x5.0 à 30s et descend progressivement jusqu'à x1.0 à 0s
        this.finalBossMultiplier = 1.0 + 4.0 * (this.finalBossTimer / 30.0);
        this.maxMultiplierAchieved = this.finalBossMultiplier;

        const isEnraged = (activeBoss.combatTimer >= 10.0);
        this.hud.updateBossTimer(this.finalBossTimer, this.finalBossMultiplier, isEnraged);

        // Alerte visuelle et sonore au déclenchement de la surcharge à 10 secondes de combat
        if (!this.finalBossEnragedTriggered && isEnraged) {
          this.finalBossEnragedTriggered = true;
          this.sound.playWarp();
          this.renderer.addScreenShake(12);
          this.particles.spawnFloatingText(activeBoss.x, activeBoss.y + 65, '⚡ SURCHARGE DU TITAN : CADENCE ACCÉLÉRÉE ! ⚡', '#FF0055', 24);
        }
      }
    } else {
      if (this.state === 'BOSS') {
        this.state = 'PLAYING';
        this.music.playTrack('music1');
      }
      this.hud.hideBoss();
    }

    // 6. Conditions de Fin de Partie
    if (this.fleet.shipCount <= 0) {
      this.triggerGameOver(false, 'FLEET_DESTROYED');
      return;
    }

    // Victoire : Uniquement si le boss final est anéanti (ou si mission sans boss et distance atteinte)
    if (this.currentLevelData.bossEnemy) {
      if (this.currentLevelData.bossEnemy.isDead) {
        if (this.victoryDelayTimer === undefined) {
          this.victoryDelayTimer = 1.8;
          this.sound.playWarp();
        }
        this.victoryDelayTimer -= dt;
        if (this.victoryDelayTimer <= 0) {
          this.maxMultiplierAchieved = this.finalBossMultiplier;
          this.triggerGameOver(true);
          return;
        }
      }
    } else if (this.traveledDistance >= this.currentLevelData.totalDistance) {
      this.triggerGameOver(true);
      return;
    }

    // 7. Mise à jour de l'interface HUD
    this.updateHudStats();
  }

  // --- RENDU 3D PERSPECTIVE GLOBAL ---
  private renderFrame(dt: number, scrollSpeed: number) {
    this.renderer.clear(dt, scrollSpeed);

    // 1. Dessin du Vaisseau Mère en mode Escorte / Défense (arrière-plan de scène)
    if (this.currentLevelData?.missionType === 'escort') {
      this.renderer.renderMothership(this.mothershipHp, this.maxMothershipHp, this.mothershipHitFlash, dt);
    }

    // 2. Dessin de la Grille au sol du Champ de Force Quantique (Niveaux Raid / Fun)
    if (this.forceFieldTimer > 0) {
      this.renderer.renderForceFieldGrid(this.forceFieldTimer, 10.0);
    }

    // 3. Dessin des Ennemis classiques, Astéroïdes & Boss visibles (-1200 à 850, hors Trous Noirs)
    this.visibleEnemies.length = 0;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.isDead && e.type !== 'black_hole' && e.y >= -1200 && e.y <= 850) {
        this.visibleEnemies.push(e);
      }
    }
    this.visibleEnemies.sort((a, b) => a.y - b.y);
    for (let i = 0; i < this.visibleEnemies.length; i++) {
      this.visibleEnemies[i].draw3D(this.renderer.ctx, this.renderer);
    }

    // 3.1 Dessin de la Barrière et du Badge du Champ de Force (AU-DESSUS des ennemis & astéroïdes retenus)
    if (this.forceFieldTimer > 0) {
      this.renderer.renderForceFieldBarrier(this.forceFieldTimer, 10.0);
    }

    // 4. Dessin des Projectiles Joueur (Lasers)
    for (let i = 0; i < this.projectiles.length; i++) {
      this.projectiles[i].draw3D(this.renderer.ctx, this.renderer);
    }

    // 5. Dessin des Projectiles Ennemis (Tirs aliens)
    for (let i = 0; i < this.enemyProjectiles.length; i++) {
      this.enemyProjectiles[i].draw3D(this.renderer.ctx, this.renderer);
    }

    // 6. Dessin unifié et hiérarchisé par profondeur (Y) des Portails & Trous Noirs (-1400 à 850)
    // Permet un ordre d'affichage en 3D naturel (les éléments lointains sont dessinés derrière les éléments proches)
    this.visibleTrackElements.length = 0;
    const maxTrackY = this.fleet ? this.fleet.centerY + 40 : 700;
    for (let i = 0; i < this.gates.length; i++) {
      const g = this.gates[i];
      if (!g.isPassed && g.y >= -1400 && g.y <= maxTrackY) {
        this.visibleTrackElements.push(g);
      }
    }
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.isDead && e.type === 'black_hole' && e.y >= -1400 && e.y <= maxTrackY) {
        this.visibleTrackElements.push(e);
      }
    }
    this.visibleTrackElements.sort((a, b) => a.y - b.y);
    for (let i = 0; i < this.visibleTrackElements.length; i++) {
      this.visibleTrackElements[i].draw3D(this.renderer.ctx, this.renderer);
    }

    // 8. Dessin des Vaisseaux Prototypes Libérés & Bonus
    for (let i = 0; i < this.rescuedShips.length; i++) {
      this.rescuedShips[i].draw3D(this.renderer.ctx, this.renderer);
    }

    // 9. Dessin de la Flotte du Joueur
    this.fleet.draw(this.renderer.ctx);

    // 10. Dessin des Particules, Gemmes récoltables et Textes Flottants (+1, +10, etc.)
    this.particles.draw3D(this.renderer.ctx, this.renderer);
  }
}

// Initialisation globale
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
