// Système de Tutoriel interactif avec Sparcky (Copilote de bord officiel Stacky)
import { UpgradeStore } from './UpgradeStore';
import { SoundSynth } from '../engine/SoundSynth';
import { GAME_CONFIG } from '../config';
import { Enemy } from '../entities/Enemy';

export type TutorialFlightStep = 
  | 'IDLE' 
  | 'WELCOME' 
  | 'MOVEMENT' 
  | 'PLAYING_WAVE_1' 
  | 'BLACK_HOLE' 
  | 'PLAYING_WAVE_2' 
  | 'RUN_END_SUMMARY' 
  | 'PRE_FLIGHT_UPGRADES' 
  | 'DECIDE_REPLAY_OR_FINISH' 
  | 'COMPLETE';

export class TutorialSystem {
  private store: UpgradeStore;
  private sound: SoundSynth;
  private activeStep: TutorialFlightStep = 'IDLE';
  private isFlightTutorialRunning: boolean = false;
  private isPaused: boolean = false;
  private playerInitialX: number = 270;
  private movementStartTime: number = 0;
  private movementAllowedToResume: boolean = false;

  // Progression au sein du niveau tutoriel
  private wave1KilledCount: number = 0;
  private hasWonTutorialLevel: boolean = false;
  private sessionEarnedDiamonds: number = 0;

  // Éléments du DOM (Overlay en vol)
  private elOverlay: HTMLElement | null = null;
  private elText: HTMLElement | null = null;
  private elBtnAction: HTMLElement | null = null;
  private elBtnSecondary: HTMLElement | null = null;
  private elSwipeHint: HTMLElement | null = null;
  private elSwipeIcon: HTMLElement | null = null;
  private elSwipeText: HTMLElement | null = null;
  private elBtnSkip: HTMLElement | null = null;
  private elDock: HTMLElement | null = null;

  // Modal Conseils de Sparcky
  private elModalTips: HTMLElement | null = null;
  private elBtnCloseTips: HTMLElement | null = null;
  private elBtnOkTips: HTMLElement | null = null;
  private elBtnReplayTuto: HTMLElement | null = null;

  private onReplayCallback?: () => void;
  private gameSetScrollSpeed?: (speed: number) => void;
  private onReloadPreparationCallback?: () => void;
  private onFinishTutorialCallback?: () => void;

  constructor(store: UpgradeStore, sound: SoundSynth) {
    this.store = store;
    this.sound = sound;
  }

  public init(options?: {
    onReplay?: () => void;
    setScrollSpeed?: (speed: number) => void;
    onReloadPreparation?: () => void;
    onFinishTutorial?: () => void;
  }) {
    this.onReplayCallback = options?.onReplay;
    this.gameSetScrollSpeed = options?.setScrollSpeed;
    this.onReloadPreparationCallback = options?.onReloadPreparation;
    this.onFinishTutorialCallback = options?.onFinishTutorial;

    this.elOverlay = document.getElementById('tutorial-sparcky-overlay');
    this.elText = document.getElementById('tutorial-sparcky-text');
    this.elBtnAction = document.getElementById('tutorial-sparcky-btn-action');
    this.elBtnSecondary = document.getElementById('tutorial-sparcky-btn-secondary');
    this.elSwipeHint = document.getElementById('tutorial-swipe-hint');
    this.elSwipeIcon = document.getElementById('tutorial-swipe-icon');
    this.elSwipeText = document.getElementById('tutorial-swipe-text');
    this.elBtnSkip = document.getElementById('btn-tutorial-skip');
    this.elDock = document.getElementById('bottom-upgrade-dock');

    this.elModalTips = document.getElementById('modal-sparcky-tips');
    this.elBtnCloseTips = document.getElementById('btn-close-sparcky-tips');
    this.elBtnOkTips = document.getElementById('btn-ok-sparcky-tips');
    this.elBtnReplayTuto = document.getElementById('btn-replay-tutorial');

    // Écouteurs de clics
    this.elBtnSkip?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.skipTutorial();
    });

    this.elBtnAction?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onUserAdvance();
    });

    this.elBtnSecondary?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onSecondaryAdvance();
    });

    this.elOverlay?.addEventListener('click', () => {
      this.onUserAdvance();
    });

    // Modal Tips
    this.elBtnCloseTips?.addEventListener('click', () => this.hideTipsModal());
    this.elBtnOkTips?.addEventListener('click', () => this.hideTipsModal());
    this.elBtnReplayTuto?.addEventListener('click', () => {
      this.hideTipsModal();
      this.resetAndReplayTutorial();
    });

    // Boutons pour ouvrir le guide de Sparcky
    document.getElementById('btn-sparcky-tips')?.addEventListener('click', () => this.showTipsModal());
    document.getElementById('btn-hangar-sparcky-tips')?.addEventListener('click', () => this.showTipsModal());
  }

  /**
   * Indique si le jeu doit être mis en pause tactique par Sparcky
   */
  public isGamePaused(): boolean {
    return this.isFlightTutorialRunning && this.isPaused;
  }

  /**
   * Indique si le tutoriel de vol est actuellement actif
   */
  public isTutorialActive(): boolean {
    return this.isFlightTutorialRunning;
  }

  /**
   * Vérifie si le tutoriel en vol doit être lancé pour cette mission
   */
  public shouldRunFlightTutorial(missionNum: number): boolean {
    return !this.store.data.tutorialCompleted && missionNum === 1;
  }

  /**
   * Démarre la séquence de tutoriel en vol
   */
  public startFlightTutorial(currentX: number) {
    this.isFlightTutorialRunning = true;
    this.activeStep = 'WELCOME';
    this.playerInitialX = currentX;
    this.wave1KilledCount = 0;
    this.isPaused = true; // PAUSE DU JEU

    if (this.gameSetScrollSpeed) {
      this.gameSetScrollSpeed(0);
    }

    this.sound.playSparckyChirp();
    this.showMessage(
      "Bip-boop ! Salutations Commandant ! Je suis Sparcky, ton copilote de bord. Initialisons tes systèmes de vol !",
      "CONTINUER ▶"
    );
    this.showOverlay();
  }

  /**
   * Progression manuelle de l'utilisateur (clic sur le bouton d'action principal ou sur la carte)
   */
  private onUserAdvance() {
    this.sound.playClick();

    switch (this.activeStep) {
      case 'WELCOME':
        this.advanceToMovement();
        break;

      case 'MOVEMENT':
        // Si le joueur clique après le délai d'une seconde
        if (this.movementAllowedToResume) {
          this.resumeFromMovement();
        }
        break;

      case 'BLACK_HOLE':
        this.isPaused = false;
        this.activeStep = 'PLAYING_WAVE_2';
        this.hideOverlay();
        if (this.gameSetScrollSpeed) {
          this.gameSetScrollSpeed(GAME_CONFIG.BASE_SCROLL_SPEED);
        }
        break;

      case 'RUN_END_SUMMARY':
        // Le joueur clique pour voir les améliorations : on relance en préparation avec le dock affiché
        this.showPreFlightUpgrades();
        break;

      case 'PRE_FLIGHT_UPGRADES':
        if (this.hasWonTutorialLevel) {
          // Si le boss a déjà été battu, proposer de refaire ou terminer
          this.showDecisionReplayOrFinish();
        } else {
          // Sinon inviter à dépenser les diamants et décoller
          this.elDock?.classList.remove('dock-tutorial-highlight');
          this.hideOverlay();
          this.activeStep = 'IDLE';
        }
        break;

      case 'DECIDE_REPLAY_OR_FINISH':
        // Bouton principal : "REFAIRE LE NIVEAU 🚀"
        this.elDock?.classList.remove('dock-tutorial-highlight');
        this.hideOverlay();
        this.activeStep = 'IDLE';
        break;
    }
  }

  /**
   * Action sur le bouton secondaire (par exemple "TERMINER LE TUTORIEL ✅")
   */
  private onSecondaryAdvance() {
    this.sound.playClick();

    if (this.activeStep === 'DECIDE_REPLAY_OR_FINISH') {
      this.completeTutorialAndLeave();
    }
  }

  /**
   * Étape 2 : Mouvement et annonce des astéroïdes
   */
  private advanceToMovement() {
    this.activeStep = 'MOVEMENT';
    this.movementStartTime = performance.now();
    this.movementAllowedToResume = false;
    this.isPaused = true; // Le niveau est en stop

    if (this.gameSetScrollSpeed) {
      this.gameSetScrollSpeed(0);
    }

    // Détection de la plateforme (tactile vs souris)
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.matchMedia('(pointer: coarse)').matches);
    if (this.elSwipeIcon) {
      this.elSwipeIcon.textContent = isTouchDevice ? '👆' : '🖱️';
    }
    if (this.elSwipeText) {
      this.elSwipeText.textContent = isTouchDevice ? 'GLISSE TON DOIGT POUR PILOTER' : 'BOUGE LA SOURIS POUR PILOTER';
    }

    this.sound.playSparckyChirp();
    this.showMessage(
      "Des astéroïdes foncent vers ton vaisseau, glisse ton vaisseau pour détruire les astéroïdes et obtenir des diamants pour améliorer ton vaisseau !",
      null // Pas de bouton : se relance au mouvement après minimum 1s
    );

    if (this.elSwipeHint) {
      this.elSwipeHint.classList.remove('hidden');
    }
  }

  /**
   * Reprise du jeu après le menu de mouvement
   */
  private resumeFromMovement() {
    this.isPaused = false;
    this.activeStep = 'PLAYING_WAVE_1';
    this.sound.playLaser();

    if (this.elSwipeHint) {
      this.elSwipeHint.classList.add('hidden');
    }
    this.hideOverlay();

    if (this.gameSetScrollSpeed) {
      this.gameSetScrollSpeed(GAME_CONFIG.BASE_SCROLL_SPEED);
    }
  }

  /**
   * Signalement de destruction d'ennemi (pour détecter les 10 astéroïdes de la vague 1)
   */
  public onEnemyKilled(enemy: Enemy) {
    if (!this.isFlightTutorialRunning) return;

    if ((enemy as any).isTutorialWave1) {
      this.wave1KilledCount++;
      if (this.wave1KilledCount >= 10 && this.activeStep === 'PLAYING_WAVE_1') {
        this.triggerBlackHoleStep();
      }
    }
  }

  /**
   * Étape 3 : Le Trou Noir bloque les portails (5 PV)
   */
  private triggerBlackHoleStep() {
    this.activeStep = 'BLACK_HOLE';
    this.isPaused = true; // PAUSE DU JEU DEVANT LE TROU NOIR
    if (this.gameSetScrollSpeed) {
      this.gameSetScrollSpeed(0);
    }

    this.sound.playSparckyChirp();
    this.showMessage(
      "Les trous noirs bloquent les portails, détruis-les pour accéder aux portails !",
      "DÉTRUIRE LE TROU NOIR ⚔️"
    );
    this.showOverlay();
  }

  /**
   * Signalement de victoire lors de la destruction du boss
   */
  public onMissionVictory() {
    this.hasWonTutorialLevel = true;
  }

  /**
   * Fin de vol du tutoriel (défaite ou victoire contre le boss 300 PV)
   */
  public handleRunEnd(isVictory: boolean, earnedDiamonds: number) {
    this.isPaused = true;
    if (this.gameSetScrollSpeed) {
      this.gameSetScrollSpeed(0);
    }

    if (isVictory) {
      this.hasWonTutorialLevel = true;
    }
    this.sessionEarnedDiamonds = earnedDiamonds;
    this.activeStep = 'RUN_END_SUMMARY';

    this.sound.playSparckyChirp();
    this.showMessage(
      `Tu as obtenu ${earnedDiamonds} diamants 💎 ! Utilise-les pour améliorer ton vaisseau et terminer le niveau !`,
      "AMÉLIORER MON VAISSEAU 🛠️"
    );
    this.showOverlay();
  }

  /**
   * Relance le niveau en mode préparation (PRE_FLIGHT) et présente les améliorations en bas
   */
  private showPreFlightUpgrades() {
    this.activeStep = 'PRE_FLIGHT_UPGRADES';

    // Relance la préparation de mission pour afficher le vaisseau sur le tarmac et la barre d'amélioration
    if (this.onReloadPreparationCallback) {
      this.onReloadPreparationCallback();
    }

    // Mise en surbrillance de la barre d'amélioration
    if (this.elDock) {
      this.elDock.classList.add('dock-tutorial-highlight');
    }

    this.sound.playSparckyChirp();
    this.showMessage(
      "Voici tes améliorations de combat :<br><br>" +
      "⚡ <strong>Cadence de tir</strong> : Accélère les tirs de tes vaisseaux.<br>" +
      "💥 <strong>Dégâts</strong> : Multiplie la puissance destructrice de tes lasers.<br>" +
      "💎 <strong>Bonus Diamants</strong> : Augmente les diamants obtenus sur chaque ennemi.<br><br>" +
      "Chaque boost possède 5 niveaux par palier (1/5 à 5/5) payables en diamants. Une fois à 5/5, tu passes au palier supérieur ! Au bout de plusieurs paliers, l'accès se bloque et nécessite de l'Iridium 🔮 pour continuer.",
      "CONTINUER ▶"
    );
    this.showOverlay();
  }

  /**
   * Choix de fin de tutoriel lorsque le boss d'initiation a été vaincu
   */
  private showDecisionReplayOrFinish() {
    this.activeStep = 'DECIDE_REPLAY_OR_FINISH';
    this.sound.playSparckyChirp();

    this.showMessage(
      "Félicitations, tu as vaincu le boss d'initiation ! Souhaites-tu refaire le niveau avec tes nouvelles améliorations ou terminer le tutoriel et accéder au Hangar ?",
      "REFAIRE LE NIVEAU 🚀",
      "TERMINER LE TUTORIEL ✅"
    );
    this.showOverlay();
  }

  /**
   * Validation définitive et sortie du tutoriel vers le Hangar
   */
  private completeTutorialAndLeave() {
    this.store.data.tutorialCompleted = true;
    this.store.data.hangarTutorialSeen = true;
    this.store.save();

    this.isPaused = false;
    this.isFlightTutorialRunning = false;
    this.activeStep = 'COMPLETE';

    if (this.elDock) {
      this.elDock.classList.remove('dock-tutorial-highlight');
    }
    this.hideOverlay();

    if (this.onFinishTutorialCallback) {
      this.onFinishTutorialCallback();
    }
  }

  /**
   * Mise à jour du tutoriel à chaque frame en jeu
   */
  public update(
    dt: number,
    playerX: number,
    isPointerDown: boolean
  ) {
    if (!this.isFlightTutorialRunning) return;

    // Gestion de l'étape MOVEMENT (minimum 1 seconde d'affichage, puis reprise dès interaction)
    if (this.activeStep === 'MOVEMENT') {
      const elapsed = performance.now() - this.movementStartTime;
      if (elapsed >= 1000) {
        this.movementAllowedToResume = true;
        const deltaX = Math.abs(playerX - this.playerInitialX);
        if (isPointerDown || deltaX > 8) {
          this.resumeFromMovement();
        }
      }
    }
  }

  /**
   * Passer le tutoriel immédiatement
   */
  public skipTutorial() {
    this.isPaused = false;
    this.isFlightTutorialRunning = false;
    this.activeStep = 'COMPLETE';
    this.store.data.tutorialCompleted = true;
    this.store.data.hangarTutorialSeen = true;
    this.store.save();

    if (this.elDock) {
      this.elDock.classList.remove('dock-tutorial-highlight');
    }

    if (this.gameSetScrollSpeed) {
      this.gameSetScrollSpeed(GAME_CONFIG.BASE_SCROLL_SPEED);
    }

    this.hideOverlay();
    if (this.elSwipeHint) {
      this.elSwipeHint.classList.add('hidden');
    }
  }

  /**
   * Tutoriel du Hangar (lors du 1er accès au Hangar)
   */
  public checkHangarTutorial() {
    if (!this.store.data.hangarTutorialSeen) {
      this.store.data.hangarTutorialSeen = true;
      this.store.save();
      this.showHangarWelcomeModal();
    }
  }

  private showHangarWelcomeModal() {
    this.sound.playSparckyChirp();
    const modal = document.getElementById('modal-sparcky-hangar-welcome');
    if (modal) {
      modal.classList.remove('hidden');
      const btn = document.getElementById('btn-close-hangar-welcome');
      const onConfirm = () => {
        modal.classList.add('hidden');
        btn?.removeEventListener('click', onConfirm);
      };
      btn?.addEventListener('click', onConfirm);
    }
  }

  /**
   * Ouvre la fenêtre d'aide / Conseils de vol de Sparcky
   */
  public showTipsModal() {
    this.sound.playSparckyChirp();
    this.elModalTips?.classList.remove('hidden');
  }

  public hideTipsModal() {
    this.sound.playClick();
    this.elModalTips?.classList.add('hidden');
  }

  /**
   * Recommencer le tutoriel (remet tutorialCompleted à false et lance la mission 1)
   */
  public resetAndReplayTutorial() {
    this.store.data.tutorialCompleted = false;
    this.hasWonTutorialLevel = false;
    this.wave1KilledCount = 0;
    this.isFlightTutorialRunning = true;
    this.store.data.selectedMission = 1;
    this.store.save();

    if (this.onReplayCallback) {
      this.onReplayCallback();
    }
  }

  private showOverlay() {
    this.elOverlay?.classList.remove('hidden');
  }

  private hideOverlay() {
    this.elOverlay?.classList.add('hidden');
  }

  private showMessage(text: string, actionLabel: string | null, secondaryLabel: string | null = null) {
    if (this.elText) {
      this.elText.innerHTML = text;
    }
    if (this.elBtnAction) {
      if (actionLabel) {
        this.elBtnAction.textContent = actionLabel;
        this.elBtnAction.classList.remove('hidden');
      } else {
        this.elBtnAction.classList.add('hidden');
      }
    }
    if (this.elBtnSecondary) {
      if (secondaryLabel) {
        this.elBtnSecondary.textContent = secondaryLabel;
        this.elBtnSecondary.classList.remove('hidden');
      } else {
        this.elBtnSecondary.classList.add('hidden');
      }
    }
  }
}
