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
import { CargoShip } from './entities/CargoShip';
import { UpgradeStore, EquippedStatsResult } from './systems/UpgradeStore';
import { LevelGenerator, LevelData } from './systems/LevelGenerator';
import { CollisionSystem } from './systems/CollisionSystem';
import { SectorSystem } from './systems/SectorSystem';
import { RescuedShip, SHIP_RANKS } from './entities/RescuedShip';
import { HUD } from './ui/HUD';
import { MenuHangar } from './ui/MenuHangar';
import { GameOverModal } from './ui/GameOverModal';
import { BottomUpgradeDock } from './ui/BottomUpgradeDock';
import { ShopModal } from './ui/ShopModal';
import { AdService } from './services/AdService';
import { SplashScreen } from './ui/SplashScreen';
import { Stargate } from './entities/Stargate';

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
  private stargate: Stargate | null = null;
  private stargateWarpTimer: number = 0;
  private stargateFleetSpeed: number = 0;
  private isVictoryOutro: boolean = false;
  private victoryOutroTimer: number = 0;
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

  // Défi Spécial : Convoi d'Iridium (Défense Arène 360°)
  private cargoShip: CargoShip | null = null;
  private survivalTimer: number = 0;
  private maxSurvivalDuration: number = 0;
  private asteroidSpawnTimer: number = 0;
  private cornerTurretSpawnTimer: number = 0;
  private cornerTurretSpawnCount: number = 0;

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
    this.splashScreen = new SplashScreen(() => {
      // Synchronisation : Démarrer la musique principale seulement à l'arrivée sur le menu (après l'animation Stacky)
      if (this.state === 'MENU') {
        this.music.playTrack('main');
      }
    });

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
      () => this.showHangar(true),
      (reward: { type: 'bars' | 'dust'; amount: number }) => {
        // Callback lors du doublement du butin de défi par pub
        if (reward.type === 'bars') {
          this.store.addIridiumBars(reward.amount);
        } else {
          this.store.addDiamondDust(reward.amount);
        }
        this.hangar.refreshCurrencies();
        this.hangar.updateChallengesDisplay();
      }
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

    // Bouton Sélecteur de Morceau
    const btnMusic = document.getElementById('btn-music-track');
    const hudMusicName = document.getElementById('hud-music-name');

    const switchTrack = () => {
      const track = this.music.nextTrack();
      const shortName = track.name.replace(/^[^\s]+\s*/, '');
      if (hudMusicName) hudMusicName.textContent = shortName;
    };

    btnMusic?.addEventListener('click', switchTrack);

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
        if (btnQuit) {
          const isHangarUnlocked = SectorSystem.isFeatureUnlocked('hangar', this.store.data.maxUnlockedMission);
          btnQuit.textContent = isHangarUnlocked ? 'QUITTER VERS LE HANGAR 🛸' : 'QUITTER VERS LE MENU 🛸';
        }
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
    this.renderer.isArenaMode = false;
    this.input.setArenaMode(false);
    this.cargoShip = null;
    this.store.setActiveChallenge(null);
    if (!this.splashScreen || this.splashScreen.getIsDismissed()) {
      this.music.playTrack('main');
    }
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

    // Génération du niveau (Défi Convoi ou mission standard)
    const activeChallenge = this.store.getActiveChallenge();
    if (activeChallenge && activeChallenge.id === 'bars') {
      this.currentLevelData = LevelGenerator.generateCargoDefenseLevel(activeChallenge.level);
    } else {
      this.currentLevelData = LevelGenerator.generateLevel(this.store.data.selectedMission);
    }

    const isArena = this.currentLevelData.gameplayType === 'arena_defense';
    this.renderer.isArenaMode = isArena;
    this.input.setArenaMode(isArena);

    this.gates = this.currentLevelData.gates;
    this.enemies = [...this.currentLevelData.enemies];
    if (this.currentLevelData.bossEnemy) {
      this.currentLevelData.bossEnemy.isLevelBoss = true;
    }
    this.stargate = null;
    this.stargateWarpTimer = 0;
    this.stargateFleetSpeed = 0;
    this.isVictoryOutro = false;
    this.victoryOutroTimer = 0;
    this.victoryDelayTimer = undefined;
    this.forceFieldTimer = this.currentLevelData.isFunLevel ? 10.0 : 0;
    this.currentRaidRightTier = 1;

    // Gestion du Vaisseau Mère (Mode Escorte classique ou Cargo Convoi d'Iridium)
    this.mothershipHitFlash = 0;
    if (isArena) {
      this.cargoShip = new CargoShip(this.currentLevelData.mothershipHp || GAME_CONFIG.CARGO_BASE_HP);
      this.survivalTimer = this.currentLevelData.survivalDuration || 60;
      this.maxSurvivalDuration = this.survivalTimer;
      this.asteroidSpawnTimer = 0;
      this.cornerTurretSpawnTimer = 0;
      this.cornerTurretSpawnCount = 0;
      this.enemyProjectiles = [];
      this.sessionDiamonds = 0;
      this.mothershipHp = this.cargoShip.hp;
      this.maxMothershipHp = this.cargoShip.maxHp;
      this.hud.showMothership(this.cargoShip.hp, this.cargoShip.maxHp, "🛡️ INTÉGRITÉ DU CARGO D'IRIDIUM");
      this.hud.showPhaseBanner(1, "CONVOI D'IRIDIUM // DÉFENSE 360°");
    } else if (this.currentLevelData.missionType === 'escort') {
      this.cargoShip = null;
      this.mothershipHp = this.currentLevelData.mothershipHp || 100;
      this.maxMothershipHp = this.mothershipHp;
      this.hud.showMothership(this.mothershipHp, this.maxMothershipHp);
    } else {
      this.cargoShip = null;
      this.hud.hideMothership();
    }

    // Bannière tactique explicative pour les Boss de Fin de Secteur
    if (this.currentLevelData.isSectorBossDuel) {
      if (this.currentLevelData.levelNumber === 4) {
        this.hud.showPhaseBanner(1, "DUEL ALPHARION // ABATTEZ LES MINIONS POUR DES DIAMANTS 💎");
      } else if (this.currentLevelData.levelNumber === 9) {
        this.hud.showPhaseBanner(1, "DUEL BETAPULSAR // DÉTRUISEZ LES GÉNÉRATEURS MAGNÉTIQUES ⚡");
      } else if (this.currentLevelData.levelNumber === 15) {
        this.hud.showPhaseBanner(1, "DUEL GAMMARGANTUA // BRISEZ LES ANCRES GRAVITATIONNELLES 🌌");
      }
    }

    // Initialisation de la flotte (40 vaisseaux 4x10 pour niveaux Raid, 20 pour niveaux classiques et escorte)
    this.initFleet();

    // Réinitialisation du quota de passage de palier gratuit par essai
    this.store.resetSessionTierAllowance();

    // Affichage du Dock d'améliorations en bas (uniquement en mode classique/runner)
    if (isArena) {
      this.bottomUpgradeDock.hide();
      this.launchFlight();
    } else {
      this.bottomUpgradeDock.show();
    }

    // Mise à jour du HUD
    this.updateHudStats();
  }

  private initFleet() {
    const isChallenge = !!(this.currentLevelData && (this.currentLevelData.challengeId || this.currentLevelData.gameplayType === 'arena_defense'));

    let fireRateMultiplier = 1.0;
    let damageMultiplier = 1.0;

    // Dans les défis, aucune amélioration d'échelons/paliers n'est appliquée.
    // Seuls les statistiques et objets intrinsèques du vaisseau sélectionné sont pris en compte.
    if (!isChallenge) {
      const frTrack = this.store.data.upgradeTracks.fireRate;
      const dmgTrack = this.store.data.upgradeTracks.damage;
      fireRateMultiplier = UPGRADE_TRACKS_CONFIG.fireRate.getStatMultiplier(frTrack.tier, frTrack.step);
      damageMultiplier = UPGRADE_TRACKS_CONFIG.damage.getStatMultiplier(dmgTrack.tier, dmgTrack.step);
    }

    const activeSkin = this.store.getSelectedSkin();
    this.cachedEquippedStats = this.store.getEquippedStats(activeSkin.id);
    const equippedStats = this.cachedEquippedStats;

    const isFun = this.currentLevelData ? this.currentLevelData.isFunLevel : (this.store.data.selectedMission % 3 === 2);
    const maxFleet = isFun ? 40 : 20;

    const fleetFRBonus = 1 + (equippedStats.specialEffects.fleetFireRateBonus || 0) / 100;
    const totalFR = fireRateMultiplier * equippedStats.fireRateMultiplier * fleetFRBonus;
    const totalDmg = damageMultiplier * equippedStats.damageMultiplier;
    const startingShips = isChallenge ? 1 : (GAME_CONFIG.BASE_FLEET_SIZE + (equippedStats.bonusStartingShips || 0) + (equippedStats.specialEffects.bonusStartingShips || 0));

    this.fleet = new Fleet(startingShips, activeSkin, totalFR, totalDmg, maxFleet);
    this.fleet.setEquippedSpecialEffects(equippedStats.specialEffects);

    if (this.currentLevelData?.gameplayType === 'arena_defense') {
      this.fleet.isInvincible = true;
      this.fleet.centerX = GAME_CONFIG.CARGO_CENTER_X;
      this.fleet.centerY = GAME_CONFIG.CARGO_CENTER_Y + 120;
    }
  }

  private reapplyUpgradesToFleet() {
    const isChallenge = !!(this.currentLevelData && (this.currentLevelData.challengeId || this.currentLevelData.gameplayType === 'arena_defense'));
    if (isChallenge) return; // Pas d'améliorations appliquées en cours de défi

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
    const isArena = this.currentLevelData.gameplayType === 'arena_defense';
    const isChallenge = !!this.currentLevelData.challengeId || isArena;

    const progress = isArena
      ? Math.min(1.0, this.traveledDistance / Math.max(1, this.maxSurvivalDuration))
      : this.traveledDistance / this.currentLevelData.totalDistance;

    const effectiveDamage = this.fleet.bulletDamage * this.fleet.evolutionDamageMultiplier;
    const damagePct = Math.round((effectiveDamage / GAME_CONFIG.BASE_BULLET_DAMAGE) * 100);

    const effectiveFireRate = this.fleet.fireRate * this.fleet.evolutionFireRateMultiplier;
    const fireRatePct = Math.round((effectiveFireRate / GAME_CONFIG.BASE_FIRE_RATE) * 100);

    const challengeLvl = this.currentLevelData.challengeLevel || 1;
    const sectorInfo = SectorSystem.getSectorInfo(this.currentLevelData.levelNumber);
    const sectorName = sectorInfo.sectorName;
    const isBossDuel = !!this.currentLevelData.isSectorBossDuel;

    let customLabel: string | undefined = undefined;
    if (isArena) {
      customLabel = `CONVOI D'IRIDIUM • NIVEAU ${challengeLvl}`;
    } else if (isBossDuel) {
      customLabel = `Secteur ${sectorName} : Boss`;
    } else {
      const lvlStr = sectorInfo.levelInSector < 10 ? `0${sectorInfo.levelInSector}` : `${sectorInfo.levelInSector}`;
      customLabel = `Secteur ${sectorName} : ${lvlStr}`;
    }

    this.hud.updateStats(
      this.fleet.shipCount,
      this.sessionDiamonds,
      damagePct,
      fireRatePct,
      progress,
      this.currentLevelData.levelNumber,
      this.currentPhase,
      {
        isChallenge,
        customLabel,
        isBossDuel,
        escortPct: Math.round(progress * 100)
      }
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
    const isArena = (this.currentLevelData?.gameplayType === 'arena_defense') || (this.store.getActiveChallenge()?.id === 'bars');
    if (isArena) {
      if (!this.store.canPlayChallenge('bars')) {
        this.showHangar();
        return;
      }
      const activeChallenge = this.store.getActiveChallenge();
      const chLvl = this.currentLevelData?.challengeLevel || (activeChallenge ? activeChallenge.level : 1);
      this.store.setActiveChallenge({ id: 'bars', level: chLvl });
      this.enterMissionPreparation();
      this.launchFlight();
      return;
    }
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

    // Détection Défi Quotidien (Convoi d'Iridium ou Raid de Diamant)
    const isChallenge = !!(this.currentLevelData && (this.currentLevelData.challengeId || this.currentLevelData.gameplayType === 'arena_defense'));
    if (isChallenge) {
      const challengeId = this.currentLevelData.challengeId || 'bars';
      const challengeLvl = this.currentLevelData.challengeLevel || 1;
      const config = SectorSystem.getChallengeLevelConfig(challengeLvl);
      let challengeReward: { type: 'bars' | 'dust'; amount: number; label: string } | undefined;

      if (isVictory) {
        this.sound.playVictory();
        this.store.consumeChallengeAttempt(challengeId);
        this.store.recordChallengeVictory(challengeId, challengeLvl);
        if (challengeId === 'bars') {
          this.store.addIridiumBars(config.rewards.bars);
          challengeReward = { type: 'bars', amount: config.rewards.bars, label: "Barres d'Iridium" };
        } else {
          this.store.addDiamondDust(config.rewards.dust);
          challengeReward = { type: 'dust', amount: config.rewards.dust, label: 'Poudre de Diamant' };
        }
        this.hangar.updateChallengesDisplay();
        this.hangar.refreshCurrencies();
      } else {
        this.sound.playExplosion(true);
      }

      // Quêtes & Succès : progression Défi
      if (isVictory) {
        this.store.recordDailyQuestProgress('challenges', 1);
        this.store.recordAchievementProgress('challenges_won', 1);
      }
      if (this.sessionKills > 0) {
        this.store.recordAchievementProgress('total_enemies', this.sessionKills);
      }
      if (this.fleet) {
        this.store.recordAchievementProgress('max_fleet', this.fleet.shipCount, true);
      }

      this.gameOverModal.show({
        isVictory,
        survivingFleet: Math.max(1, this.fleet ? this.fleet.shipCount : 1),
        enemiesKilled: this.sessionKills,
        multiplier: 1.0,
        diamondsEarned: 0,
        crystalsEarned: 0,
        nextLevelNum: this.store.data.selectedMission,
        defeatReason: (defeatReason === 'MOTHERSHIP_DESTROYED') ? 'MOTHERSHIP_DESTROYED' : 'FLEET_DESTROYED',
        quests: [],
        newlyCompletedQuests: [],
        rewardLoot: null,
        isChallenge: true,
        challengeReward,
        challengeAttemptsLeft: this.store.getChallengeAttemptsLeft(challengeId),
        isHangarUnlocked: SectorSystem.isFeatureUnlocked('hangar', this.store.data.maxUnlockedMission)
      });
      return;
    }

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

    // Quêtes & Succès : progression Mission
    if (isVictory) {
      this.store.recordDailyQuestProgress('campaign_missions', 1);
    }
    this.store.recordAchievementProgress('max_mission', this.store.data.maxUnlockedMission, true);
    if (this.sessionKills > 0) {
      this.store.recordAchievementProgress('total_enemies', this.sessionKills);
    }
    if (this.fleet) {
      this.store.recordAchievementProgress('max_fleet', this.fleet.shipCount, true);
    }
    if (earnedIridium > 0) {
      this.store.recordAchievementProgress('total_crystals', this.store.data.violetCrystals, true);
    }

    const isSectorBoss = SectorSystem.isSectorBossMission(this.lastPlayedMission);
    const bossInfo = SectorSystem.getSectorBossForMission(this.lastPlayedMission);
    const newlyUnlockedFeatures = (isVictory && isSectorBoss) ? SectorSystem.getNewlyUnlockedFeaturesForMission(this.lastPlayedMission) : [];

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
      rewardLoot,
      isSectorBoss,
      sectorBossName: bossInfo?.bossName,
      nextSectorName: bossInfo?.nextSectorName,
      nextSectorGreek: bossInfo?.nextSectorGreek,
      newlyUnlockedFeatures,
      isHangarUnlocked: SectorSystem.isFeatureUnlocked('hangar', this.store.data.maxUnlockedMission)
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
      if (this.currentLevelData?.gameplayType === 'arena_defense') {
        this.updateArenaDefense(dt);
      } else {
        this.updateGame(dt);
      }
      this.renderFrame(dt, this.currentLevelData?.gameplayType === 'arena_defense' ? 0 : this.scrollSpeed);
    } else if (this.state === 'MENU') {
      this.renderer.clear(dt, 0);
    }

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  private updatePreFlight(dt: number) {
    this.input.update(dt);
    if (this.currentLevelData?.gameplayType === 'arena_defense') {
      const pos = this.input.getPosition();
      this.fleet.updateArena(dt, pos.x, pos.y, []);
      this.cargoShip?.update(dt);
      this.particles.update(dt);
      return;
    }
    const targetX = this.input.getPositionX();
    this.fleet.update(dt, targetX);
    this.particles.update(dt);
  }

  // Explosion stellaire SuperNova qui détruit tout sauf la flotte alliée
  private triggerNovaBlast(x: number, y: number) {
    this.renderer.triggerNovaFlash();
    this.particles.spawnSuperNova(x, y);
    this.sound.playExplosion(true);
    this.sound.playWarp();
    this.renderer.addScreenShake(35);

    // Destruction totale de tous les projectiles ennemis
    this.enemyProjectiles = [];

    // Vaporisation instantanée de tous les ennemis et obstacles restants à l'écran
    for (const enemy of this.enemies) {
      if (!enemy.isDead) {
        enemy.isDead = true;
        this.particles.spawnExplosion(enemy.x, enemy.y, '#00F0FF', 16);
        this.particles.spawnGems(enemy.x, enemy.y, 4);
      }
    }

    // Disparition instantanée et totale de tous les portails restants lors de la Supernova
    for (const gate of this.gates) {
      if (!gate.isPassed) {
        gate.isPassed = true;
        this.particles.spawnExplosion(gate.x, gate.y, gate.isSpecial ? '#00F0FF' : '#FFE600', 14);
      }
    }
    this.gates = [];
  }

  private updateGame(dt: number) {
    const levelBoss = this.currentLevelData?.bossEnemy;
    const isBossDying = !!(levelBoss && levelBoss.isDying && !levelBoss.isDead);

    // 1. Phase d'implosion cinématique du Boss de fin : arrêt total des tirs et tremblements cosmiques
    if (isBossDying) {
      this.fleet.canShoot = false;
      this.projectiles = [];
      this.enemyProjectiles = [];
      this.scrollSpeed = 0;

      // Micro-tremblements qui s'amplifient jusqu'à scale 0
      const tremble = Math.min(7, 1.5 + levelBoss.deathTimer * 3.8);
      this.renderer.addScreenShake(tremble);

      // Gerbes d'étincelles énergétiques convergeant vers le point d'effondrement
      if (Math.random() < 0.7) {
        const sc = Math.max(0.1, levelBoss.deathScale);
        const rx = (Math.random() - 0.5) * levelBoss.width * sc;
        const ry = (Math.random() - 0.5) * levelBoss.height * sc;
        this.particles.spawnHitSparks(levelBoss.x + rx, levelBoss.y + ry, '#00F0FF');
      }
    }

    // Détection universelle de victoire : Boss vaincu (après effondrement à scale 0) OU distance cible franchie
    const isBossDead = !!(levelBoss && levelBoss.isDead);
    const isDistanceReached = (this.traveledDistance >= this.currentLevelData.totalDistance);
    const isLevelComplete = levelBoss ? isBossDead : isDistanceReached;

    // 2. Déclenchement de la Supernova au moment exact où le boss atteint l'échelle 0
    if (!this.isVictoryOutro && isLevelComplete) {
      this.isVictoryOutro = true;
      this.victoryOutroTimer = 0;
      this.stargateFleetSpeed = 0;
      this.fleet.canShoot = false;

      // Déclenchement de la Supernova éclatante à l'emplacement exact de la singularité
      const novaX = levelBoss ? levelBoss.x : 270;
      const novaY = levelBoss ? levelBoss.y : 200;
      this.triggerNovaBlast(novaX, novaY);
    }

    let targetX = this.fleet.centerX;

    if (this.isVictoryOutro) {
      // Les tirs s'arrêtent dès le déclenchement de la victoire
      this.fleet.canShoot = false;
      this.victoryOutroTimer += dt;

      if (this.victoryOutroTimer < 1.2) {
        // Phase 1 (0s à 1.2s) : Le joueur peut encore manœuvrer librement
        targetX = this.input.update(dt);
      } else {
        // Phase 2 (1.2s à 2.2s) : Les vaisseaux se centrent automatiquement au milieu (X = 270)
        this.fleet.centerX += (270 - this.fleet.centerX) * 4.5 * dt;
        targetX = this.fleet.centerX;
      }
    } else {
      targetX = this.input.update(dt);
    }

    // 1. Déplacement de la Flotte & Tir automatique (bloqué si canShoot est faux ou si boss en train d'imploser)
    const newBullets = this.fleet.update(dt, targetX);
    if (this.fleet.canShoot && !isBossDying && newBullets.length > 0) {
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
    if (this.currentLevelData?.isFunLevel && !this.isVictoryOutro) {
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
    if (this.currentLevelData?.isFunLevel && !this.isVictoryOutro) {
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
      // Rétention fluide des astéroïdes au niveau du champ de force avec superposition naturelle (sans glitch ni file indienne)
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        if (e.type === 'block' && !e.isDead && e.x > 150 && e.x < 390 && e.y > 150) {
          e.y = 150;
        }
      }
    }

    // Positionnement échelonné des boss dès leur apparition à l'horizon (maintien de la routine et des slots)
    const activeBosses = this.enemies
      .filter(e => e.isBossType() && !e.isDead && e.y >= -1200)
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
        if (this.currentLevelData?.isSectorBossDuel) {
          // Le boss s'arrête rapidement au fond de l'espace (Y = -500) pour commencer le combat
          targetCombatY = -500;
        } else {
          const slotIdx = activeBosses.indexOf(enemy);
          if (slotIdx >= 0 && slotIdx < bossSlotY.length) {
            targetCombatY = bossSlotY[slotIdx];
          } else if (slotIdx >= bossSlotY.length) {
            targetCombatY = -30 - (slotIdx - 3) * 110;
          }
        }
      }

      const enemyBullets = enemy.update(dt, this.scrollSpeed, this.fleet.centerX, targetCombatY, isEscort);
      if (enemyBullets.length > 0 && !isBossDying && !this.isVictoryOutro) {
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
    if (collisionResults.shootingShipsKilled > 0) {
      this.store.recordDailyQuestProgress('shooting_enemies', collisionResults.shootingShipsKilled);
    }
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
    // RÈGLE : Les astéroïdes accélèrent jusqu'au joueur. L'apparition du boss au loin accélère, mais dès qu'il entre sur l'écran, le boss n'accélère JAMAIS vers le joueur !
    const playerY = this.fleet ? this.fleet.centerY : GAME_CONFIG.PLAYER_BASE_Y;
    const isExpedition = (this.currentLevelData?.missionType === 'expedition');

    // Distances de proximité du joueur adaptées au mode Expédition pour que les astéroïdes accélèrent jusqu'au joueur
    const bhProximityY = isExpedition ? (playerY - 320) : -150;
    const gateProximityY = isExpedition ? (playerY - 240) : -150;
    const asteroidProximityY = isExpedition ? (playerY - 220) : -100;
    const bossHorizonY = -1200; // Horizon visible où le boss apparaît à l'écran

    const hasActiveBoss = this.enemies.some(e => e.isBossType() && !e.isDead && e.y >= bossHorizonY && e.y < playerY + 50);
    const hasActiveBlackHole = this.enemies.some(e => e.type === 'black_hole' && !e.isDead && e.y >= bhProximityY && e.y < playerY + 50);
    const hasActiveGate = this.gates.some(g => !g.isPassed && g.y >= gateProximityY && g.y < playerY + 25);
    const hasActiveAsteroids = this.enemies.some(e => e.type === 'block' && !e.isDead && e.y >= asteroidProximityY && e.y < playerY + 40);

    const hasScreenObstacles = hasActiveBoss || hasActiveBlackHole || hasActiveGate || hasActiveAsteroids;
    const hasUpcomingContent = this.enemies.some(e => !e.isDead && e.y < asteroidProximityY) || this.gates.some(g => !g.isPassed && g.y < gateProximityY);
    const allowHyperdrive = (this.currentLevelData?.missionType !== 'escort');

    if (allowHyperdrive && !hasScreenObstacles && hasUpcomingContent && this.state !== 'BOSS' && this.state !== 'GAMEOVER' && this.state !== 'PAUSED') {
      // Hyperdrive fluide : fait glisser la vague d'astéroïdes jusqu'au joueur et l'apparition du boss sans attente
      this.scrollSpeed = Math.min(GAME_CONFIG.BASE_SCROLL_SPEED * 2.8, this.scrollSpeed + dt * 1000);
    } else {
      // Décélération fluide et naturelle vers la vitesse nominale dès qu'un boss ou obstacle est présent
      const decelSpeed = hasActiveBoss ? 2800 : 1800;
      this.scrollSpeed = Math.max(GAME_CONFIG.BASE_SCROLL_SPEED, this.scrollSpeed - dt * decelSpeed);
    }

    // 5. État et Affichage des Boss de Vagues & Timer Dégressif (30s de x5.0 à x1.0)
    const activeBoss = this.enemies.find(e => e.isBossType() && !e.isDead && e.y >= bossHorizonY && e.y < 750);
    if (activeBoss) {
      if (this.state !== 'BOSS') {
        this.state = 'BOSS';
        this.music.playTrack('boss');
      }
      const isFinal = activeBoss.isLevelBoss || (activeBoss.type === 'boss_final');
      this.hud.showBoss(activeBoss.bossName, activeBoss.hp, activeBoss.maxHp, isFinal);

      if (isFinal) {
        // Le timer dégressif du boss final ne s'enclenche que lorsque le combat commence réellement en position
        if (activeBoss.combatTimer > 0) {
          this.finalBossTimer = Math.max(0, this.finalBossTimer - dt);
        }
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

      // Mécanique unique de Boss de Secteur : Spawn de Minions toutes les 5s (Alpharion & Gammargantua)
      if (activeBoss.type === 'boss_alpharion' || activeBoss.type === 'boss_gammargantua') {
        activeBoss.minionSpawnTimer += dt;
        if (activeBoss.minionSpawnTimer >= 5.0 && activeBoss.y >= -550) {
          activeBoss.minionSpawnTimer = 0;
          activeBoss.minionWaveIndex++;
          this.sound.playWarp();
          this.particles.spawnFloatingText(activeBoss.x, activeBoss.y + 70, '⚡ MINIONS DÉPLOYÉS !', '#FFE600', 22);

          // Règle utilisateur : 5 PV max au début, puis augmentent 5 par 5 en PV à chaque vague
          const waveHp = 5 + activeBoss.minionWaveIndex * 5;
          const minionName = (activeBoss.type === 'boss_gammargantua') ? 'DRONE GRAVITATIONNEL' : 'DRONE SOLAIRE';

          const mLeft = new Enemy(activeBoss.x - 140, activeBoss.y + 40, 54, 44, 'boss_minion', waveHp, minionName);
          const mCenter = new Enemy(activeBoss.x, activeBoss.y + 75, 58, 48, 'boss_minion', waveHp, minionName);
          const mRight = new Enemy(activeBoss.x + 140, activeBoss.y + 40, 54, 44, 'boss_minion', waveHp, minionName);

          this.enemies.push(mLeft, mCenter, mRight);
        }
      }

      // Mécanique unique de Boss de Secteur : Vérification continue du bouclier magnétique
      if (activeBoss.isInvulnerable && activeBoss.connectedGenerators.length > 0) {
        const remainingGenerators = activeBoss.connectedGenerators.filter(g => !g.isDead);
        if (remainingGenerators.length === 0) {
          activeBoss.isInvulnerable = false;
          activeBoss.generatorRespawnTimer = 15.0;
          this.sound.playExplosion(true);
          this.renderer.addScreenShake(25);
          this.particles.spawnFloatingText(activeBoss.x, activeBoss.y - 60, '💥 BOUCLIER BRISÉ ! 15s DE VULNÉRABILITÉ !', '#00F0FF', 26);
          this.particles.spawnExplosion(activeBoss.x, activeBoss.y, '#00F0FF', 60);
        }
      }

      // Mécanique unique de Betapulsar : Réapparition des générateurs toutes les 15 secondes après leur mort
      if (activeBoss.type === 'boss_betapulsar' && !activeBoss.isInvulnerable && !activeBoss.isDead) {
        activeBoss.generatorRespawnTimer -= dt;
        if (activeBoss.generatorRespawnTimer <= 0) {
          activeBoss.generatorRespawnTimer = 15.0;
          activeBoss.isInvulnerable = true;

          const genLeft = new Enemy(activeBoss.x - 175, activeBoss.y + 85, 80, 80, 'shield_generator', 10, 'GÉNÉRATEUR ALPHA');
          genLeft.generatorSide = 'left';
          genLeft.targetBoss = activeBoss;

          const genRight = new Enemy(activeBoss.x + 175, activeBoss.y + 85, 80, 80, 'shield_generator', 10, 'GÉNÉRATEUR BETA');
          genRight.generatorSide = 'right';
          genRight.targetBoss = activeBoss;

          activeBoss.connectedGenerators = [genLeft, genRight];
          this.enemies.push(genLeft, genRight);

          this.sound.playWarp();
          this.renderer.addScreenShake(16);
          this.particles.spawnFloatingText(activeBoss.x, activeBoss.y - 60, '⚡ RÉGÉNÉRATION DU BOUCLIER MAGNÉTIQUE !', '#00F0FF', 26);
          this.particles.spawnExplosion(genLeft.x, genLeft.y, '#00F0FF', 35);
          this.particles.spawnExplosion(genRight.x, genRight.y, '#00F0FF', 35);
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

    // 7. Séquence de Victoire & Ruée vers l'Horizon / Stargate (Toutes les missions)
    if (this.isVictoryOutro) {
      if (this.currentLevelData.isSectorBossDuel) {
        // --- SÉQUENCE STARGATE DE TRANSIT INTERSTELLAIRE (BOSS DUELS) ---
        if (!this.stargate) {
          const nextGreek = this.currentLevelData.nextSectorGreek || 'Β';
          const nextSecName = this.currentLevelData.nextSectorName || 'Beta';
          const gateY = -500;
          this.stargate = new Stargate(270, gateY, nextGreek, nextSecName);
          this.stargateFleetSpeed = 0;
          this.sound.playWarp();
          this.renderer.addScreenShake(20);
          this.particles.spawnFloatingText(270, 240, `🌀 PORTE VERS LE SECTEUR ${nextSecName.toUpperCase()} OUVERTE !`, '#00F0FF', 24);
        }

        this.stargate.update(dt);

        if (this.stargate.isFullyOpen && !this.stargate.isEngulfing) {
          this.stargate.startEngulfing();
        }

        if (this.victoryOutroTimer >= 2.2) {
          this.stargateFleetSpeed = Math.min(1250, this.stargateFleetSpeed + 550 * dt);
          this.fleet.centerY -= this.stargateFleetSpeed * dt;
          this.fleet.centerX += (this.stargate.x - this.fleet.centerX) * 5.0 * dt;

          this.particles.spawnGems(this.fleet.centerX, this.fleet.centerY + 25, 2);
          this.particles.spawnExplosion(this.fleet.centerX, this.fleet.centerY, '#00F0FF', 1);

          const dist = Math.hypot(this.stargate.x - this.fleet.centerX, this.stargate.y - this.fleet.centerY);
          if (dist < 45 || this.fleet.centerY <= this.stargate.y + 20) {
            this.sound.playWarp();
            this.renderer.addScreenShake(30);
            this.particles.spawnExplosion(this.stargate.x, this.stargate.y, '#00F0FF', 100);
            this.maxMultiplierAchieved = this.finalBossMultiplier;
            this.triggerGameOver(true);
            return;
          }
        } else if (this.victoryOutroTimer >= 1.2) {
          this.scrollSpeed = Math.max(0, this.scrollSpeed - 120 * dt);
        }
        return;
      } else {
        // --- SÉQUENCE UNIVERSELLE VERS L'HORIZON (TOUTES LES AUTRES MISSIONS) ---
        if (this.victoryOutroTimer >= 2.2) {
          this.stargateFleetSpeed = Math.min(1250, this.stargateFleetSpeed + 550 * dt);
          this.fleet.centerY -= this.stargateFleetSpeed * dt;
          this.fleet.centerX += (270 - this.fleet.centerX) * 5.0 * dt;

          this.particles.spawnGems(this.fleet.centerX, this.fleet.centerY + 25, 2);
          this.particles.spawnExplosion(this.fleet.centerX, this.fleet.centerY, '#00F0FF', 1);

          // Passage du point de fuite vers l'horizon lointain (Y <= -850)
          if (this.fleet.centerY <= -850 || this.victoryOutroTimer >= 3.8) {
            this.sound.playWarp();
            this.renderer.addScreenShake(25);
            this.particles.spawnExplosion(270, 140, '#00F0FF', 80);
            this.maxMultiplierAchieved = this.finalBossMultiplier || 1.0;
            this.triggerGameOver(true);
            return;
          }
        } else if (this.victoryOutroTimer >= 1.2) {
          this.scrollSpeed = Math.max(0, this.scrollSpeed - 120 * dt);
        }
        return;
      }
    }

    // 7. Mise à jour de l'interface HUD
    this.updateHudStats();
  }

  // --- DÉFI SPÉCIAL : CONVOI D'IRIDIUM (MODE ARÈNE DÉFENSE 360°) ---
  private updateArenaDefense(dt: number) {
    // 1. Déplacement 2D libre du joueur et auto-ciblage des astéroïdes
    this.input.update(dt);
    const pos = this.input.getPosition();
    const newBullets = this.fleet.updateArena(dt, pos.x, pos.y, this.enemies);
    if (newBullets.length > 0) {
      this.projectiles.push(...newBullets);
      this.sound.playLaser();
    }

    // 2. Progression temporelle & Synchronisation du HUD
    this.traveledDistance += dt;
    this.survivalTimer = Math.max(0, this.survivalTimer - dt);
    this.updateHudStats();

    // 3. Mise à jour du Vaisseau Cargo central
    if (this.cargoShip) {
      this.cargoShip.update(dt);
      this.hud.showMothership(this.cargoShip.hp, this.cargoShip.maxHp, "🛡️ INTÉGRITÉ DU CARGO D'IRIDIUM");
      if (this.cargoShip.isDestroyed()) {
        this.sound.playExplosion(true);
        this.particles.spawnExplosion(this.cargoShip.x, this.cargoShip.y, '#FF0055', 40);
        this.renderer.addScreenShake(18);
        this.triggerGameOver(false, 'MOTHERSHIP_DESTROYED');
        return;
      }
    }

    // 4. Victoire : le compte à rebours de survie est écoulé
    if (this.survivalTimer <= 0) {
      if (!this.isVictoryOutro) {
        this.isVictoryOutro = true;
        this.victoryOutroTimer = 0;
        this.fleet.canShoot = false;
        this.triggerNovaBlast(GAME_CONFIG.CARGO_CENTER_X, GAME_CONFIG.CARGO_CENTER_Y);
        this.particles.spawnFloatingText(GAME_CONFIG.CARGO_CENTER_X, GAME_CONFIG.CARGO_CENTER_Y - 50, 'CONVOI DÉFENDU AVEC SUCCÈS !', '#00F0FF', 24);
      }
      this.victoryOutroTimer += dt;
      if (this.victoryOutroTimer >= 2.0) {
        this.triggerGameOver(true);
        return;
      }
    }

    // 5. Générateur dynamique d'astéroïdes depuis les 4 bordures de l'écran
    // Multiplicateur progressif de difficulté x1.5 par niveau (lvl 1 à 5) :
    this.asteroidSpawnTimer += dt;
    const lvl = this.currentLevelData?.challengeLevel || 1;
    const diffMultiplier = Math.pow(1.5, lvl - 1); // x1.0 (lvl 1), x1.5 (lvl 2), x2.25 (lvl 3), x3.38 (lvl 4), x5.06 (lvl 5)
    const elapsedRatio = Math.min(1.0, this.traveledDistance / Math.max(1, this.maxSurvivalDuration));

    // Cadence et taille de vague modulées pour augmenter le flux total d'astéroïdes de x1.5 par niveau
    const baseInterval = Math.max(0.35, 1.15 - elapsedRatio * 0.45);
    const spawnInterval = Math.max(0.20, baseInterval / Math.sqrt(diffMultiplier));

    if (this.asteroidSpawnTimer >= spawnInterval) {
      this.asteroidSpawnTimer = 0;
      
      const baseBatch = (elapsedRatio > 0.6) ? 2 : 1;
      const spawnCount = Math.min(16, Math.max(2, Math.round(baseBatch * 2 * Math.sqrt(diffMultiplier))));

      for (let s = 0; s < spawnCount; s++) {
        // Choix de la bordure : 0 = Haut, 1 = Bas, 2 = Gauche, 3 = Droite
        const edge = Math.floor(Math.random() * 4);
        let spawnX = 0;
        let spawnY = 0;

        if (edge === 0) {
          spawnX = Math.random() * GAME_CONFIG.WORLD_WIDTH;
          spawnY = -40;
        } else if (edge === 1) {
          spawnX = Math.random() * GAME_CONFIG.WORLD_WIDTH;
          spawnY = GAME_CONFIG.WORLD_HEIGHT + 40;
        } else if (edge === 2) {
          spawnX = -40;
          spawnY = Math.random() * GAME_CONFIG.WORLD_HEIGHT;
        } else {
          spawnX = GAME_CONFIG.WORLD_WIDTH + 40;
          spawnY = Math.random() * GAME_CONFIG.WORLD_HEIGHT;
        }

        // Cible : Cargo central avec très légère déviation aléatoire
        const targetX = this.cargoShip ? this.cargoShip.x : GAME_CONFIG.CARGO_CENTER_X;
        const targetY = this.cargoShip ? this.cargoShip.y : GAME_CONFIG.CARGO_CENTER_Y;
        const jitterX = (Math.random() - 0.5) * 36;
        const jitterY = (Math.random() - 0.5) * 36;

        const angle = Math.atan2((targetY + jitterY) - spawnY, (targetX + jitterX) - spawnX);
        const speed = 75 + Math.random() * 35 + (lvl - 1) * 16;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        const minHp = 1 + (lvl - 1) * 2;
        const maxHp = 3 + (lvl - 1) * 5;
        const hp = Math.floor(minHp + Math.random() * (maxHp - minHp + 1));
        const size = 30 + Math.min(22, hp * 1.5);

        const ast = new Enemy(spawnX, spawnY, size, size, 'block', hp);
        ast.vx = vx;
        ast.vy = vy;
        this.enemies.push(ast);
      }
    }

    // 5.1 Générateur de Vaisseaux Ennemis (Tourelles dans les Coins)
    // À chaque nouvelle difficulté, la cadence de réapparition des tourelles augmente de x1.5
    this.cornerTurretSpawnTimer += dt;
    const cornerAnchors = GAME_CONFIG.ARENA_CORNER_TURRETS;
    const maxTurrets = lvl >= 2 ? 4 : 3;
    const activeTurrets = this.enemies.filter(e => e.type === 'corner_turret' && !e.isDead);

    const turretSpawnInterval = Math.max(1.0, 9.0 / diffMultiplier);
    if (this.cornerTurretSpawnTimer >= turretSpawnInterval && activeTurrets.length < maxTurrets) {
      this.cornerTurretSpawnTimer = 0;
      const occupied = new Set(activeTurrets.map(t => t.cornerIndex));
      const available = cornerAnchors.filter(c => !occupied.has(c.cornerIndex));
      if (available.length > 0) {
        this.cornerTurretSpawnCount++;
        // Toutes les 3 tourelles : variante spéciale rapide qui n'a que 1 PV et cadence EXTRÊMEMENT rapide
        const isRapid = (this.cornerTurretSpawnCount % 3 === 0);
        const spot = available[Math.floor(Math.random() * available.length)];
        const turretHp = isRapid ? 1 : (5 + (lvl - 1) * 3);
        const turret = new Enemy(spot.x, spot.y, 42, 42, 'corner_turret', turretHp);
        turret.cornerIndex = spot.cornerIndex;
        turret.isRapidSpecial = isRapid;
        turret.shootInterval = isRapid ? 0.22 : Math.max(1.8, 2.6 - (lvl - 1) * 0.2);
        turret.shootTimer = isRapid ? 0.18 : 0.8;
        this.enemies.push(turret);
        this.particles.spawnWarpRing(spot.x, spot.y, isRapid ? '#FFE600' : '#FF0055');
        this.sound.playLaser(isRapid ? 1.3 : 1.0);
      }
    }

    // 5.2 Salves de tirs des Tourelles de Coin vers le Cargo Central
    for (const turret of activeTurrets) {
      turret.shootTimer += dt;
      if (turret.shootTimer >= turret.shootInterval) {
        turret.shootTimer = 0;
        const targetX = this.cargoShip ? this.cargoShip.x : GAME_CONFIG.CARGO_CENTER_X;
        const targetY = this.cargoShip ? this.cargoShip.y : GAME_CONFIG.CARGO_CENTER_Y;
        const angle = Math.atan2(targetY - turret.y, targetX - turret.x);
        const isRapid = !!turret.isRapidSpecial;
        const bulletSpeed = isRapid ? (310 + (lvl - 1) * 15) : (190 + (lvl - 1) * 15);
        const vx = Math.cos(angle) * bulletSpeed;
        const vy = Math.sin(angle) * bulletSpeed;
        const bulletDmg = isRapid ? 1.5 : (5 + (lvl - 1));
        const bulletColor = isRapid ? '#FFE600' : '#FF0055';

        const enemyBullet = new Projectile(turret.x, turret.y, vx, vy, bulletDmg, 'enemy_bullet', bulletColor);
        this.enemyProjectiles.push(enemyBullet);
        this.sound.playLaser(isRapid ? 1.4 : 1.0);
        this.particles.spawnHitSparks(turret.x, turret.y, bulletColor);
      }
    }

    // 6. Mise à jour des Projectiles du Joueur
    for (const p of this.projectiles) {
      p.update(dt);
    }

    // 6.2 Mise à jour des Projectiles Ennemis & Collisions (Le joueur peut tanker les tirs ennemis)
    for (const ep of this.enemyProjectiles) {
      ep.update(dt);

      // Collision Projectile Ennemi vs Vaisseau Cargo
      if (this.cargoShip && !ep.isDead) {
        const dCargo = Math.hypot(ep.x - this.cargoShip.x, ep.y - this.cargoShip.y);
        if (dCargo < 36 + ep.radius) {
          ep.isDead = true;
          const dmg = ep.damage || 5;
          this.cargoShip.takeDamage(dmg);
          this.mothershipHitFlash = 0.25;
          this.particles.spawnHitSparks(ep.x, ep.y, '#FF0055');
          this.particles.spawnFloatingText(this.cargoShip.x, this.cargoShip.y - 45, `-${dmg} HP`, '#FF0055', 18);
          this.sound.playExplosion(false);
          this.renderer.addScreenShake(5);
        }
      }

      // Collision Projectile Ennemi vs Flotte du Joueur (Bouclier du joueur invincible tanke le tir)
      if (!ep.isDead) {
        const dPlayer = Math.hypot(ep.x - this.fleet.centerX, ep.y - this.fleet.centerY);
        if (dPlayer < 28 + ep.radius) {
          ep.isDead = true;
          this.particles.spawnHitSparks(ep.x, ep.y, '#00F0FF');
          this.sound.playShieldHit();
        }
      }
    }

    // 7. Mise à jour des Ennemis (Astéroïdes & Tourelles) & Collisions
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const ast = this.enemies[i];
      if (ast.isDead) continue;

      if (ast.type === 'block') {
        ast.x += (ast.vx || 0) * dt;
        ast.y += (ast.vy || 0) * dt;

        // 7.1 Collision Astéroïde vs Cargo central
        if (this.cargoShip) {
          const dCargo = Math.hypot(ast.x - this.cargoShip.x, ast.y - this.cargoShip.y);
          if (dCargo < 38 + ast.width * 0.4) {
            ast.isDead = true;
            const dmg = Math.min(25, 6 + Math.round(ast.maxHp * 0.5));
            this.cargoShip.takeDamage(dmg);
            this.mothershipHitFlash = 0.25;
            this.particles.spawnExplosion(ast.x, ast.y, '#FF4466', 16);
            this.particles.spawnFloatingText(this.cargoShip.x, this.cargoShip.y - 45, `-${dmg} HP`, '#FF0055', 20);
            this.sound.playExplosion(false);
            this.renderer.addScreenShake(6);
            continue;
          }
        }
      }

      // 7.2 Collision Ennemi vs Flotte du Joueur :
      // On ne peut "tanker" QUE les astéroïdes (et on les tue instantanément) !
      // Les tourelles ne peuvent PAS être détruites en volant dessus.
      if (ast.type === 'block') {
        const dPlayer = Math.hypot(ast.x - this.fleet.centerX, ast.y - this.fleet.centerY);
        if (dPlayer < 32 + ast.width * 0.4) {
          ast.isDead = true;
          ast.hp = 0;
          this.sessionKills++;
          this.particles.spawnHitSparks(ast.x, ast.y, '#00F0FF');
          this.particles.spawnExplosion(ast.x, ast.y, '#00F0FF', 16);
          this.sound.playExplosion(false);
          continue;
        }
      } else if (ast.type === 'corner_turret') {
        // La tourelle repousse le joueur s'il tente de voler dessus (dégâts uniquement par les tirs)
        const dPlayer = Math.hypot(this.fleet.centerX - ast.x, this.fleet.centerY - ast.y);
        const minD = GAME_CONFIG.ARENA_CORNER_BARRIER_RADIUS;
        if (dPlayer < minD && dPlayer > 0.001) {
          const pushX = (this.fleet.centerX - ast.x) / dPlayer;
          const pushY = (this.fleet.centerY - ast.y) / dPlayer;
          this.fleet.centerX = ast.x + pushX * minD;
          this.fleet.centerY = ast.y + pushY * minD;
          this.particles.spawnHitSparks(ast.x + pushX * 25, ast.y + pushY * 25, '#FF0055');
        }
      }

      // 7.3 Collision Ennemi vs Projectiles du Joueur
      for (const p of this.projectiles) {
        if (p.isDead) continue;
        const dProj = Math.hypot(ast.x - p.x, ast.y - p.y);
        if (dProj < p.radius + ast.width * 0.45) {
          ast.takeDamage(p.damage);
          this.particles.spawnHitSparks(p.x, p.y, p.color);
          if (!p.isPiercing) {
            p.isDead = true;
          }
          if (ast.isDead) {
            this.sessionKills++;
            // Pas de diamants reçus en tuant des ennemis dans les défis
            this.particles.spawnExplosion(ast.x, ast.y, ast.type === 'corner_turret' ? '#FF0055' : '#00F0FF', 14);
            this.sound.playExplosion(false);
            if (ast.type === 'corner_turret') {
              this.particles.spawnFloatingText(ast.x, ast.y - 22, 'TOURELLE DÉTRUITE 💥', '#FF0055', 18);
            }
            break;
          }
        }
      }
    }

    // 8. Nettoyage des entités détruites ou sorties de l'écran
    this.enemies = this.enemies.filter(e => !e.isDead && e.x >= -120 && e.x <= 660 && e.y >= -120 && e.y <= 1080);
    this.projectiles = this.projectiles.filter(p => !p.isDead);
    this.enemyProjectiles = this.enemyProjectiles.filter(ep => !ep.isDead && ep.x >= -60 && ep.x <= 600 && ep.y >= -60 && ep.y <= 1020);

    // 9. Particules
    this.particles.update(dt);
  }

  // --- RENDU 3D PERSPECTIVE GLOBAL ---
  private renderFrame(dt: number, scrollSpeed: number) {
    if (this.currentLevelData?.gameplayType === 'arena_defense') {
      this.renderer.clear(dt, 0);

      // 1. Dessin du Cargo central à défendre
      if (this.cargoShip) {
        this.cargoShip.draw(this.renderer.ctx);
      }

      // 2. Dessin des Projectiles du joueur en 360°
      for (let i = 0; i < this.projectiles.length; i++) {
        this.projectiles[i].draw3D(this.renderer.ctx, this.renderer);
      }

      // 3. Dessin des Ennemis et Astéroïdes
      for (let i = 0; i < this.enemies.length; i++) {
        this.enemies[i].draw3D(this.renderer.ctx, this.renderer);
      }

      // 3.5 Dessin des Projectiles Ennemis (Tourelles au premier plan)
      for (let i = 0; i < this.enemyProjectiles.length; i++) {
        this.enemyProjectiles[i].draw3D(this.renderer.ctx, this.renderer);
      }

      // 4. Dessin de la Flotte du joueur
      this.fleet.draw(this.renderer.ctx, this.renderer);

      // 5. Dessin des Particules et textes flottants
      this.particles.draw3D(this.renderer.ctx, this.renderer);
      return;
    }

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

    // 8.5 Dessin de la Porte Stellaire (Stargate) lors du transit de fin de secteur
    if (this.stargate) {
      this.stargate.draw3D(this.renderer.ctx, this.renderer);
    }

    // 8.8 Dessin des Projectiles Ennemis (Tirs aliens en premier plan tactique pour une visibilité optimale)
    for (let i = 0; i < this.enemyProjectiles.length; i++) {
      this.enemyProjectiles[i].draw3D(this.renderer.ctx, this.renderer);
    }

    // 9. Dessin de la Flotte du Joueur (avec perspective 3D)
    this.fleet.draw(this.renderer.ctx, this.renderer);

    // 10. Dessin des Particules, Gemmes récoltables et Textes Flottants (+1, +10, etc.)
    this.particles.draw3D(this.renderer.ctx, this.renderer);
  }
}

// Initialisation globale
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
