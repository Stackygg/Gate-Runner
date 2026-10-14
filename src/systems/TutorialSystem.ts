// Système de Tutoriel interactif avec Sparcky (Copilote de bord officiel Stacky)
import { UpgradeStore } from './UpgradeStore';
import { SoundSynth } from '../engine/SoundSynth';
import { GAME_CONFIG } from '../config';

export type TutorialFlightStep = 'IDLE' | 'WELCOME' | 'MOVEMENT' | 'MOVEMENT_DONE' | 'GATES' | 'OBSTACLES' | 'BOSS' | 'COMPLETE';

export class TutorialSystem {
  private store: UpgradeStore;
  private sound: SoundSynth;
  private activeStep: TutorialFlightStep = 'IDLE';
  private stepTimer: number = 0;
  private isFlightTutorialRunning: boolean = false;
  private playerInitialX: number = 270;
  private totalMovementDetected: number = 0;

  // Éléments du DOM (Overlay en vol)
  private elOverlay: HTMLElement | null = null;
  private elText: HTMLElement | null = null;
  private elPrompt: HTMLElement | null = null;
  private elSwipeHint: HTMLElement | null = null;
  private elBtnSkip: HTMLElement | null = null;

  // Modal Conseils de Sparcky
  private elModalTips: HTMLElement | null = null;
  private elBtnCloseTips: HTMLElement | null = null;
  private elBtnOkTips: HTMLElement | null = null;
  private elBtnReplayTuto: HTMLElement | null = null;

  private onReplayCallback?: () => void;
  private gameSetScrollSpeed?: (speed: number) => void;

  constructor(store: UpgradeStore, sound: SoundSynth) {
    this.store = store;
    this.sound = sound;
  }

  public init(options?: {
    onReplay?: () => void;
    setScrollSpeed?: (speed: number) => void;
  }) {
    this.onReplayCallback = options?.onReplay;
    this.gameSetScrollSpeed = options?.setScrollSpeed;

    this.elOverlay = document.getElementById('tutorial-sparcky-overlay');
    this.elText = document.getElementById('tutorial-sparcky-text');
    this.elPrompt = document.getElementById('tutorial-sparcky-prompt');
    this.elSwipeHint = document.getElementById('tutorial-swipe-hint');
    this.elBtnSkip = document.getElementById('btn-tutorial-skip');

    this.elModalTips = document.getElementById('modal-sparcky-tips');
    this.elBtnCloseTips = document.getElementById('btn-close-sparcky-tips');
    this.elBtnOkTips = document.getElementById('btn-ok-sparcky-tips');
    this.elBtnReplayTuto = document.getElementById('btn-replay-tutorial');

    // Écouteurs de clics
    this.elBtnSkip?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.skipTutorial();
    });

    this.elOverlay?.addEventListener('click', () => {
      this.onOverlayClicked();
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
   * Vérifie si le tutoriel en vol doit être lancé pour cette mission
   */
  public shouldRunFlightTutorial(missionNum: number): boolean {
    return !this.store.data.tutorialCompleted && missionNum === 1;
  }

  /**
   * Démarre la séquence de tutoriel en vol pour la Mission 1
   */
  public startFlightTutorial(currentX: number) {
    this.isFlightTutorialRunning = true;
    this.activeStep = 'WELCOME';
    this.stepTimer = 0;
    this.playerInitialX = currentX;
    this.totalMovementDetected = 0;

    // Ralentissement initial pour laisser le temps de lire
    if (this.gameSetScrollSpeed) {
      this.gameSetScrollSpeed(GAME_CONFIG.BASE_SCROLL_SPEED * 0.4);
    }

    this.sound.playSparckyChirp();
    this.showMessage(
      "Bip-boop ! Salutations Commandant ! Je suis Sparcky, ton copilote de bord. Initialisons tes systèmes de vol !",
      "TOUCHE POUR CONTINUER"
    );
    this.showOverlay();
  }

  /**
   * Clic utilisateur sur l'overlay pour passer à l'étape suivante rapidement
   */
  private onOverlayClicked() {
    if (this.activeStep === 'WELCOME') {
      this.advanceToMovement();
    }
  }

  private advanceToMovement() {
    this.activeStep = 'MOVEMENT';
    this.stepTimer = 0;
    this.totalMovementDetected = 0;

    this.sound.playSparckyChirp();
    this.showMessage(
      "Glisse ton doigt ou la souris à gauche et à droite pour manœuvrer la formation de vaisseaux !",
      "GLISSE POUR TESTER LES COMMANDES"
    );
    if (this.elSwipeHint) {
      this.elSwipeHint.classList.remove('hidden');
    }
  }

  /**
   * Mise à jour du tutoriel à chaque frame en jeu
   */
  public update(
    dt: number,
    playerX: number,
    nearestGateDist: number,
    nearestObstacleDist: number,
    isBossActive: boolean
  ) {
    if (!this.isFlightTutorialRunning) return;

    this.stepTimer += dt;

    switch (this.activeStep) {
      case 'WELCOME':
        // Si le joueur ne clique pas après 3.8s, avance automatiquement
        if (this.stepTimer >= 3.8) {
          this.advanceToMovement();
        }
        break;

      case 'MOVEMENT':
        // Détecte le déplacement du joueur
        const delta = Math.abs(playerX - this.playerInitialX);
        if (delta > 30) {
          this.totalMovementDetected += delta;
        }
        if (this.totalMovementDetected > 60 || this.stepTimer >= 5.0) {
          this.activeStep = 'MOVEMENT_DONE';
          this.stepTimer = 0;
          this.sound.playSparckyChirp();

          if (this.elSwipeHint) {
            this.elSwipeHint.classList.add('hidden');
          }

          // Rétablissement de la vitesse normale
          if (this.gameSetScrollSpeed) {
            this.gameSetScrollSpeed(GAME_CONFIG.BASE_SCROLL_SPEED);
          }

          this.showMessage(
            "Parfait ! Tes réacteurs répondent à merveille. Accélération nominale !",
            null
          );
        }
        break;

      case 'MOVEMENT_DONE':
        if (this.stepTimer >= 2.0) {
          this.hideOverlay();
          // Passe en attente de portails
          if (nearestGateDist < 550) {
            this.triggerGatesStep();
          }
        }
        break;

      case 'GATES':
        if (this.stepTimer >= 4.0) {
          this.hideOverlay();
        }
        break;

      case 'OBSTACLES':
        if (this.stepTimer >= 4.0) {
          this.hideOverlay();
        }
        break;

      case 'BOSS':
        if (this.stepTimer >= 4.5) {
          this.hideOverlay();
        }
        break;
    }

    // Déclencheur des portails
    if ((this.activeStep === 'MOVEMENT_DONE' || this.activeStep === 'IDLE') && nearestGateDist > 0 && nearestGateDist < 500) {
      this.triggerGatesStep();
    }

    // Déclencheur des obstacles & prisons
    if (this.activeStep === 'GATES' && this.stepTimer > 2.0 && nearestObstacleDist > 0 && nearestObstacleDist < 450) {
      this.triggerObstaclesStep();
    }

    // Déclencheur du boss
    if (isBossActive && this.activeStep !== 'BOSS' && this.activeStep !== 'COMPLETE') {
      this.triggerBossStep();
    }
  }

  private triggerGatesStep() {
    this.activeStep = 'GATES';
    this.stepTimer = 0;
    this.sound.playSparckyChirp();
    this.showMessage(
      "Vise les portails bleus et verts pour multiplier ta flotte et ta cadence ! Évite les rouges !",
      null
    );
    this.showOverlay();
  }

  private triggerObstaclesStep() {
    this.activeStep = 'OBSTACLES';
    this.stepTimer = 0;
    this.sound.playSparckyChirp();
    this.showMessage(
      "Tes vaisseaux tirent automatiquement ! Pulvérise les astéroïdes et les prisons pour libérer des alliés !",
      null
    );
    this.showOverlay();
  }

  private triggerBossStep() {
    this.activeStep = 'BOSS';
    this.stepTimer = 0;
    this.sound.playSparckyChirp();
    this.showMessage(
      "Vaisseau amiral en vue ! Détruis-le vite pour maximiser ton multiplicateur de butin !",
      null
    );
    this.showOverlay();
  }

  /**
   * Appelé lors de la victoire de la mission 1
   */
  public onMissionVictory() {
    if (!this.store.data.tutorialCompleted) {
      this.store.data.tutorialCompleted = true;
      this.store.save();
    }
    this.activeStep = 'COMPLETE';
    this.isFlightTutorialRunning = false;
    this.hideOverlay();
  }

  /**
   * Passer le tutoriel immédiatement
   */
  public skipTutorial() {
    this.isFlightTutorialRunning = false;
    this.activeStep = 'COMPLETE';
    this.store.data.tutorialCompleted = true;
    this.store.data.hangarTutorialSeen = true;
    this.store.save();

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
    this.store.data.hangarTutorialSeen = false;
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

  private showMessage(text: string, promptText: string | null) {
    if (this.elText) {
      this.elText.textContent = text;
    }
    if (this.elPrompt) {
      if (promptText) {
        this.elPrompt.textContent = promptText;
        this.elPrompt.classList.remove('hidden');
      } else {
        this.elPrompt.classList.add('hidden');
      }
    }
  }
}
