// Système de Tutoriel interactif avec Sparcky (Copilote de bord officiel Stacky)
//
// Déroulé du vol d'initiation :
// 1. INTRO     : pause, « glisse pour piloter », reprise dès que le joueur bouge
// 2. Leçons    : chaque objet repéré (tutorialTag) met le jeu en pause à son approche,
//                avec une flèche sur la cible et un message d'une ligne
// 3. Fin de vol : bilan (victoire ou défaite), puis passage par la barre d'améliorations
// Les leçons déjà vues ne remettent plus le jeu en pause lors d'un nouvel essai :
// seule la flèche de repère réapparaît.
import { UpgradeStore } from './UpgradeStore';
import { SoundSynth } from '../engine/SoundSynth';
import { Renderer } from '../engine/Renderer';
import { Enemy } from '../entities/Enemy';
import { Gate } from '../entities/Gate';

type TutorialFlightStep =
  | 'IDLE'
  | 'INTRO'
  | 'LESSON'
  | 'FLYING'
  | 'RUN_END'
  | 'AFTER_DEFEAT'
  | 'FINAL_UPGRADE'
  | 'COMPLETE';

interface TutorialTarget {
  x: number;
  y: number;
}

interface TutorialLesson {
  tag: string;
  text: string;
  // Profondeur Y à partir de laquelle l'objet repéré déclenche la leçon
  triggerY: number;
}

const TUTORIAL_LESSONS: TutorialLesson[] = [
  {
    tag: 'gate_add',
    text: 'Les portails <strong class="tuto-blue">bleus</strong> ajoutent des vaisseaux. Passe dedans !',
    triggerY: 120
  },
  {
    tag: 'gate_choice',
    text: 'Un seul portail par rangée. Lequel te donne le plus de vaisseaux ?',
    triggerY: 120
  },
  {
    tag: 'gate_red',
    text: 'Les portails <strong class="tuto-red">rouges</strong> retirent des vaisseaux. Évite-les !',
    triggerY: 120
  },
  {
    tag: 'wave2',
    text: 'Attention : ces astéroïdes détruisent tes vaisseaux. Tire-les pour gagner des 💎 !',
    triggerY: 60
  },
  {
    tag: 'black_hole',
    text: 'Un trou noir bloque ce portail. Va à gauche et tire dessus pour le libérer !',
    triggerY: 200
  },
  {
    tag: 'boss',
    text: 'Le boss ! Esquive ses tirs et garde-le dans ta ligne de mire.',
    triggerY: 40
  }
];

// Délai minimal d'affichage d'un message avant qu'un toucher puisse le fermer
const MIN_MESSAGE_MS = 700;
// Durée de vol (secondes) après laquelle un repère ignoré disparaît pour laisser place à la leçon suivante
const HIGHLIGHT_MAX_AGE = 8;

export class TutorialSystem {
  private store: UpgradeStore;
  private sound: SoundSynth;
  private activeStep: TutorialFlightStep = 'IDLE';
  private isFlightTutorialRunning: boolean = false;
  private isPaused: boolean = false;

  // Progression conservée entre deux essais (sans persistance : un rechargement relance tout)
  private attempts: number = 0;
  private hasSeenIntro: boolean = false;
  private seenLessons = new Set<string>();
  private triggeredThisRun = new Set<string>();

  private stepStartTime: number = 0;
  private playerInitialX: number = 270;
  private pendingTap: boolean = false;
  private highlightTargets: TutorialTarget[] = [];
  private highlightPhase: number = 0;
  private highlightAge: number = 0;
  private skipArmedTimer?: number;

  // Éléments du DOM (Overlay en vol)
  private elOverlay: HTMLElement | null = null;
  private elText: HTMLElement | null = null;
  private elBtnAction: HTMLElement | null = null;
  private elSwipeHint: HTMLElement | null = null;
  private elSwipeIcon: HTMLElement | null = null;
  private elSwipeText: HTMLElement | null = null;
  private elBtnSkip: HTMLElement | null = null;
  private elDock: HTMLElement | null = null;

  // Modal Conseils de Sparcky
  private elModalTips: HTMLElement | null = null;

  private onReplayCallback?: () => void;
  private onRetryCallback?: () => void;
  private onFinishTutorialCallback?: () => void;

  constructor(store: UpgradeStore, sound: SoundSynth) {
    this.store = store;
    this.sound = sound;
  }

  public init(options?: {
    onReplay?: () => void;
    onRetry?: () => void;
    onFinishTutorial?: () => void;
  }) {
    this.onReplayCallback = options?.onReplay;
    this.onRetryCallback = options?.onRetry;
    this.onFinishTutorialCallback = options?.onFinishTutorial;

    this.elOverlay = document.getElementById('tutorial-sparcky-overlay');
    this.elText = document.getElementById('tutorial-sparcky-text');
    this.elBtnAction = document.getElementById('tutorial-sparcky-btn-action');
    this.elSwipeHint = document.getElementById('tutorial-swipe-hint');
    this.elSwipeIcon = document.getElementById('tutorial-swipe-icon');
    this.elSwipeText = document.getElementById('tutorial-swipe-text');
    this.elBtnSkip = document.getElementById('btn-tutorial-skip');
    this.elDock = document.getElementById('bottom-upgrade-dock');
    this.elModalTips = document.getElementById('modal-sparcky-tips');

    this.elBtnSkip?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onSkipPressed();
    });

    this.elBtnAction?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onUserAdvance();
    });

    this.elOverlay?.addEventListener('click', () => {
      this.onUserAdvance();
    });

    // Un toucher bref peut commencer et finir entre deux images : on le mémorise jusqu'à la prochaine mise à jour
    document.getElementById('game-canvas')?.addEventListener('pointerdown', () => {
      this.pendingTap = true;
    });

    // Modal Tips
    document.getElementById('btn-close-sparcky-tips')?.addEventListener('click', () => this.hideTipsModal());
    document.getElementById('btn-ok-sparcky-tips')?.addEventListener('click', () => this.hideTipsModal());
    document.getElementById('btn-replay-tutorial')?.addEventListener('click', () => {
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
   * Vérifie si la mission demandée doit être remplacée par le vol d'initiation
   */
  public shouldRunFlightTutorial(missionNum: number): boolean {
    return !this.store.data.tutorialCompleted && missionNum === 1;
  }

  /**
   * Premier essai : le vol démarre directement, sans passer par la barre d'améliorations
   */
  public isFirstAttempt(): boolean {
    return this.attempts === 0;
  }

  /**
   * Démarre (ou reprend) la séquence de tutoriel en vol
   */
  public startFlightTutorial(currentX: number) {
    this.attempts++;
    this.isFlightTutorialRunning = true;
    this.triggeredThisRun.clear();
    this.highlightTargets = [];
    this.setDockHighlight(false);

    if (this.hasSeenIntro) {
      // Nouvel essai : pas de pause, Sparcky laisse piloter
      this.isPaused = false;
      this.activeStep = 'FLYING';
      this.hideOverlay();
      return;
    }

    this.activeStep = 'INTRO';
    this.isPaused = true;
    this.playerInitialX = currentX;
    this.stepStartTime = performance.now();

    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
    if (this.elSwipeIcon) {
      this.elSwipeIcon.textContent = isTouchDevice ? '👆' : '🖱️';
    }
    if (this.elSwipeText) {
      this.elSwipeText.textContent = isTouchDevice ? 'GLISSE POUR PILOTER' : 'BOUGE LA SOURIS';
    }
    this.elSwipeHint?.classList.remove('hidden');

    this.sound.playSparckyChirp();
    this.showMessage(
      "Salut, je suis Sparcky ! Déplace ton vaisseau : il tire tout seul. Détruis les astéroïdes !",
      null
    );
  }

  /**
   * Appelé à chaque décollage hors vol d'initiation (ferme le dernier conseil de Sparcky)
   */
  public onFlightLaunched() {
    if (this.activeStep === 'FINAL_UPGRADE') {
      this.activeStep = 'COMPLETE';
      this.isFlightTutorialRunning = false;
      this.setDockHighlight(false);
      this.hideOverlay();
    }
  }

  /**
   * Progression manuelle de l'utilisateur (bouton d'action ou toucher de la carte)
   */
  private onUserAdvance() {
    switch (this.activeStep) {
      case 'INTRO':
        if (performance.now() - this.stepStartTime >= MIN_MESSAGE_MS) {
          this.resumeFlight();
        }
        break;

      case 'LESSON':
        this.resumeFlight();
        break;

      case 'RUN_END':
        this.sound.playClick();
        if (this.store.data.tutorialCompleted) {
          this.showFinalUpgrade();
        } else {
          this.showRetryPreparation();
        }
        break;
    }
  }

  private resumeFlight() {
    this.sound.playClick();
    this.isPaused = false;
    this.activeStep = 'FLYING';
    this.hasSeenIntro = true;
    this.elSwipeHint?.classList.add('hidden');
    this.hideOverlay();
  }

  /**
   * Mise à jour du tutoriel à chaque frame en vol (y compris pendant la pause)
   */
  public update(
    dt: number,
    playerX: number,
    gates: Gate[],
    enemies: Enemy[]
  ) {
    const pointerPressed = this.pendingTap;
    this.pendingTap = false;
    if (!this.isFlightTutorialRunning) return;

    this.highlightPhase += dt;
    const elapsed = performance.now() - this.stepStartTime;

    if (this.activeStep === 'INTRO') {
      if (elapsed >= MIN_MESSAGE_MS && (pointerPressed || Math.abs(playerX - this.playerInitialX) > 8)) {
        this.resumeFlight();
      }
      return;
    }

    if (this.activeStep === 'LESSON') {
      // Un toucher n'importe où sur l'écran reprend le vol
      if (elapsed >= MIN_MESSAGE_MS && pointerPressed) {
        this.resumeFlight();
      }
      return;
    }

    if (this.activeStep !== 'FLYING') return;

    // Retire les repères des objets franchis ou détruits, ou ignorés depuis trop longtemps (trou noir laissé de côté)
    this.highlightAge += dt;
    this.highlightTargets = this.highlightTargets.filter(t => {
      const done = (t as Gate).isPassed || (t as Enemy).isDead || (t as Enemy).isDying;
      return !done && t.y < 600 && this.highlightAge < HIGHLIGHT_MAX_AGE;
    });

    // Une leçon à la fois : on attend que la cible précédente soit franchie ou détruite
    if (this.highlightTargets.length > 0) return;

    for (const lesson of TUTORIAL_LESSONS) {
      if (this.triggeredThisRun.has(lesson.tag)) continue;

      const targets: TutorialTarget[] = [
        ...gates.filter(g => g.tutorialTag === lesson.tag && !g.isPassed),
        ...enemies.filter(e => e.tutorialTag === lesson.tag && !e.isDead)
      ];
      if (targets.length === 0) continue;
      if (!targets.some(t => t.y >= lesson.triggerY)) continue;

      this.triggeredThisRun.add(lesson.tag);
      // Les astéroïdes forment une vague : un seul repère suffit, sur le plus proche
      const highlighted = lesson.tag === 'wave2'
        ? [targets.reduce((a, b) => (b.y > a.y ? b : a))]
        : targets;
      this.highlightTargets.push(...highlighted);
      this.highlightAge = 0;

      if (!this.seenLessons.has(lesson.tag)) {
        this.seenLessons.add(lesson.tag);
        this.activeStep = 'LESSON';
        this.isPaused = true;
        this.stepStartTime = performance.now();
        this.sound.playSparckyChirp();
        this.showMessage(lesson.text, 'OK ▶');
      }
      break;
    }
  }

  /**
   * Dessine une flèche rebondissante au-dessus des objets repérés par Sparcky
   */
  public drawHighlight(ctx: CanvasRenderingContext2D, renderer: Renderer) {
    if (!this.isFlightTutorialRunning || this.highlightTargets.length === 0) return;

    const bounce = Math.sin(this.highlightPhase * 6) * 8;
    const pulse = 0.55 + 0.45 * Math.sin(this.highlightPhase * 5);

    for (const target of this.highlightTargets) {
      const pt = renderer.project(target.x, target.y);
      if (!pt.isVisible || pt.scale <= 0.05) continue;

      const s = Math.max(0.45, pt.scale);
      const tipY = pt.y - 62 * s + bounce;

      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#FF6B00';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#FF6B00';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.ellipse(pt.x, pt.y, 70 * s, 34 * s, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.fillStyle = '#FF6B00';
      ctx.beginPath();
      ctx.moveTo(pt.x, tipY);
      ctx.lineTo(pt.x - 18 * s, tipY - 24 * s);
      ctx.lineTo(pt.x - 7 * s, tipY - 24 * s);
      ctx.lineTo(pt.x - 7 * s, tipY - 46 * s);
      ctx.lineTo(pt.x + 7 * s, tipY - 46 * s);
      ctx.lineTo(pt.x + 7 * s, tipY - 24 * s);
      ctx.lineTo(pt.x + 18 * s, tipY - 24 * s);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Fin de vol du tutoriel (défaite ou victoire contre le boss d'initiation)
   */
  public handleRunEnd(isVictory: boolean, earnedDiamonds: number) {
    this.isPaused = true;
    this.activeStep = 'RUN_END';
    this.highlightTargets = [];
    this.elSwipeHint?.classList.add('hidden');

    if (isVictory) {
      // Le tutoriel est validé dès la victoire : une fermeture de l'app ne le relance plus
      this.store.data.tutorialCompleted = true;
      this.store.save();
    }

    this.sound.playSparckyChirp();
    if (isVictory) {
      this.showMessage(
        `Boss vaincu, bravo Commandant ! 🎉 Tu as gagné <strong>${earnedDiamonds} 💎</strong>.`,
        'AMÉLIORER MA FLOTTE ▶',
        false,
        false
      );
    } else {
      this.showMessage(
        `Ta flotte a été détruite ! Tu gardes tes <strong>${earnedDiamonds} 💎</strong> : renforce-toi et réessaie.`,
        'AMÉLIORER ET RÉESSAYER ▶'
      );
    }
  }

  /**
   * Après une défaite : retour sur la piste avec la barre d'améliorations mise en valeur
   */
  private showRetryPreparation() {
    this.activeStep = 'AFTER_DEFEAT';
    this.isPaused = false;
    this.onRetryCallback?.();
    this.setDockHighlight(true);
    this.showMessage(
      "Achète une amélioration avec tes 💎, puis touche l'écran pour repartir. Astuce : vise les portails bleus !",
      null,
      true
    );
  }

  /**
   * Après la victoire : préparation de la mission 1 avec les diamants gagnés
   */
  private showFinalUpgrade() {
    this.activeStep = 'FINAL_UPGRADE';
    this.isPaused = false;
    this.onFinishTutorialCallback?.();
    this.setDockHighlight(true);
    this.showMessage(
      "Dépense tes 💎 dans une amélioration, puis touche l'écran pour lancer la mission 1 !",
      null,
      true,
      false
    );
  }

  /**
   * « PASSER » demande une confirmation : un premier appui arme le bouton pendant 3 secondes
   */
  private onSkipPressed() {
    if (this.skipArmedTimer === undefined) {
      this.sound.playClick();
      if (this.elBtnSkip) this.elBtnSkip.textContent = 'SÛR ? ✕';
      this.elBtnSkip?.classList.add('armed');
      this.skipArmedTimer = window.setTimeout(() => this.disarmSkip(), 3000);
      return;
    }
    this.disarmSkip();
    this.skipTutorial();
  }

  private disarmSkip() {
    if (this.skipArmedTimer !== undefined) {
      window.clearTimeout(this.skipArmedTimer);
      this.skipArmedTimer = undefined;
    }
    if (this.elBtnSkip) this.elBtnSkip.textContent = 'PASSER ✕';
    this.elBtnSkip?.classList.remove('armed');
  }

  /**
   * Passer le tutoriel : on quitte le vol d'initiation pour la vraie mission 1
   */
  public skipTutorial() {
    const wasFinalStep = this.activeStep === 'FINAL_UPGRADE';
    this.isPaused = false;
    this.isFlightTutorialRunning = false;
    this.activeStep = 'COMPLETE';
    this.highlightTargets = [];
    this.store.data.tutorialCompleted = true;
    this.store.save();

    this.setDockHighlight(false);
    this.hideOverlay();
    this.elSwipeHint?.classList.add('hidden');

    // Déjà en préparation de la mission 1 : rien à recharger
    if (!wasFinalStep) {
      this.onFinishTutorialCallback?.();
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
   * Recommencer le tutoriel depuis le début (intro et leçons comprises)
   */
  public resetAndReplayTutorial() {
    this.store.data.tutorialCompleted = false;
    this.store.data.selectedMission = 1;
    this.store.save();
    this.attempts = 0;
    this.hasSeenIntro = false;
    this.seenLessons.clear();

    this.onReplayCallback?.();
  }

  private setDockHighlight(on: boolean) {
    this.elDock?.classList.toggle('dock-tutorial-highlight', on);
  }

  private hideOverlay() {
    this.elOverlay?.classList.add('hidden');
  }

  /**
   * Affiche la carte de Sparcky. En préparation (dock visible), elle se place en haut de l'écran.
   */
  private showMessage(text: string, actionLabel: string | null, atTop: boolean = false, canSkip: boolean = true) {
    this.elBtnSkip?.classList.toggle('hidden', !canSkip);
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
    this.elOverlay?.classList.toggle('at-top', atTop);
    this.elOverlay?.classList.remove('hidden');
  }
}
