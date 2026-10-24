// Système de Tutoriel interactif avec Sparcky (Copilote de bord officiel Stacky)
//
// Déroulé du vol d'initiation :
// 1. INTRO     : pause, « glisse pour piloter », reprise dès que le joueur bouge
// 2. Leçons    : chaque objet repéré (tutorialTag) met le jeu en pause à son approche,
//                avec une flèche sur la cible et un message d'une ligne
// 3. Portail mur : calculé pour être infranchissable avec la cadence de base,
//                le premier vol se termine donc par une défaite
// 4. Défaite  : le décollage reste bloqué tant que 2 niveaux de Vitesse tir ne sont pas achetés
// 5. Victoire : bilan dans le menu de fin de niveau (1 Iridium au premier tutoriel), puis la mission 1
//                démarre de zéro (diamants et améliorations remis à zéro) avec les derniers conseils de Sparcky
// Les leçons déjà vues ne remettent plus le jeu en pause lors d'un nouvel essai :
// seule la flèche de repère réapparaît.
import { UpgradeStore } from './UpgradeStore';
import { SoundSynth } from '../engine/SoundSynth';
import { Renderer } from '../engine/Renderer';
import { Enemy } from '../entities/Enemy';
import { Gate } from '../entities/Gate';
import { GAME_CONFIG, UPGRADE_TRACKS_CONFIG } from '../config';

type TutorialFlightStep =
  | 'IDLE'
  | 'INTRO'
  | 'LESSON'
  | 'FLYING'
  | 'RUN_END'
  | 'AFTER_DEFEAT'
  | 'VICTORY_SUMMARY'
  | 'MISSION_TIPS'
  | 'MISSION_GOODLUCK'
  | 'COMPLETE';

type MissionProgress = ReturnType<UpgradeStore['getCurrentLevelData']>;

// Réglages du portail mur (voir main.ts : updateTutorialWallGate)
export const TUTORIAL_WALL = {
  shootableY: -1300,       // Profondeur où il apparaît : tirable aussitôt, puis il fonce vers la flotte sans s'arrêter
  lessonY: -560,           // Profondeur où Sparcky le présente (assez proche pour bien le lire)
  requiredFireRateSteps: 2 // Niveaux de Vitesse tir exigés avant de repartir (+16 %)
};

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
    tag: 'gate_wall',
    text: 'Ce portail rouge barre toute la route ! Tire dedans avant qu\'il t\'atteigne : chaque tir le fait remonter.',
    triggerY: TUTORIAL_WALL.lessonY
  },
  {
    tag: 'black_hole',
    text: 'Un trou noir bloque ce portail. Va à gauche et tire dessus pour le libérer !',
    triggerY: 200
  },
  {
    tag: 'boss',
    text: 'Le boss tire des salves de projectiles : bouge pour les esquiver, sans le perdre de ta ligne de mire !',
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
  private wallGate: Gate | null = null;
  private hasEarnedIridium: boolean = false;
  private wallValue: number | null = null; // Valeur du portail mur, identique d'un essai à l'autre
  private lastBlockedNudge: number = 0;
  // Progression réelle de la mission 1, mise de côté quand un joueur rejoue le tutoriel depuis le guide
  private savedMission1: MissionProgress | null = null;

  // Éléments du DOM (Overlay en vol)
  private elOverlay: HTMLElement | null = null;
  private elText: HTMLElement | null = null;
  private elBtnAction: HTMLElement | null = null;
  private elSwipeHint: HTMLElement | null = null;
  private elSwipeIcon: HTMLElement | null = null;
  private elSwipeText: HTMLElement | null = null;
  private elBtnSkip: HTMLElement | null = null;
  private elFireRateCard: HTMLElement | null = null;
  private elEscortBar: HTMLElement | null = null;

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
    this.elFireRateCard = document.getElementById('dock-card-fireRate');
    this.elEscortBar = document.getElementById('dock-bonus-escort-bar');
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
   * Valeur (positive) à remonter sur le portail mur. Elle est fixée au premier passage et reste la même
   * aux essais suivants, pour que le joueur voie que ce sont ses améliorations qui font la différence.
   * - à la cadence de base, la flotte entière y passe ;
   * - avec les niveaux de Vitesse tir exigés, il bascule au positif avant d'atteindre la flotte.
   * baseFireRate et baseDamage : cadence et dégâts d'un vaisseau, hors améliorations de la barre.
   */
  public getWallValue(shipCount: number, baseFireRate: number, baseDamage: number): number {
    // Temps de tir : de son apparition jusqu'au franchissement (25 px avant la flotte), au rythme constant du tutoriel,
    // plus le trajet des tirs déjà en vol quand il apparaît (ils le touchent aussitôt)
    const approachTime = (GAME_CONFIG.PLAYER_BASE_Y - 25 - TUTORIAL_WALL.shootableY) / GAME_CONFIG.BASE_SCROLL_SPEED;
    const bulletsInFlight = (GAME_CONFIG.PLAYER_BASE_Y - TUTORIAL_WALL.shootableY) / GAME_CONFIG.BASE_BULLET_SPEED;
    const baseVolleys = baseFireRate * (approachTime + bulletsInFlight);
    const upgradedVolleys = baseVolleys *
      UPGRADE_TRACKS_CONFIG.fireRate.getStatMultiplier(1, TUTORIAL_WALL.requiredFireRateSteps);

    // Les vaisseaux tirent en salves synchronisées : on vise le milieu entre
    // « une salve de plus que la cadence de base » (toute la flotte y passe) et « la cadence améliorée » (franchi)
    const targetVolleys = (baseVolleys + 1 + upgradedVolleys) / 2;
    const value = Math.max(1, Math.round(shipCount * baseDamage * targetVolleys));

    // Une flotte plus petite qu'au premier passage ne pourrait plus le franchir : seul cas où la valeur baisse
    return this.wallValue === null ? value : Math.min(this.wallValue, value);
  }

  /**
   * Fige la valeur du portail mur au moment où il apparaît
   */
  public lockWallValue(value: number) {
    if (this.wallValue === null) {
      this.wallValue = value;
    }
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
    this.wallGate = null;
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
        this.showRetryPreparation();
        break;

      case 'MISSION_TIPS':
        this.sound.playClick();
        this.showGoodLuck();
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

    // Le portail mur quitte la liste une fois franchi : on garde sa trace pour le bilan de fin de vol
    this.wallGate = gates.find(g => g.tutorialTag === 'gate_wall') ?? this.wallGate;

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
    this.sound.playSparckyChirp();

    if (isVictory) {
      // Le tutoriel est validé dès la victoire : une fermeture de l'app ne le relance plus,
      // et la mission 1 démarre de zéro. L'Iridium n'est offert qu'au premier tutoriel (pas en le rejouant)
      // Le bilan s'affiche ensuite dans le menu de fin de niveau (voir main.ts)
      const isReplay = this.savedMission1 !== null;
      this.store.data.tutorialCompleted = true;
      this.restoreMission1();
      this.hasEarnedIridium = !isReplay;
      if (this.hasEarnedIridium) {
        this.store.addIridium(1);
      }
      this.activeStep = 'VICTORY_SUMMARY';
      this.hideOverlay();
      return;
    }

    // Franchi alors qu'il était encore négatif : c'est le portail mur qui a détruit la flotte
    const diedAtWall = !!this.wallGate && this.wallGate.isPassed && this.wallGate.type === 'SUBTRACT_SHIPS';
    this.showMessage(
      diedAtWall
        ? 'Presque ! Il te manquait de la puissance de feu pour remonter ce portail.'
        : `Ta flotte a été détruite ! Tu gardes tes <strong>${earnedDiamonds} 💎</strong> : renforce-toi et réessaie.`,
      'AMÉLIORER ET RÉESSAYER ▶'
    );
  }

  /**
   * Après une défaite : retour sur la piste, décollage bloqué jusqu'à l'achat des niveaux de Vitesse tir
   */
  private showRetryPreparation() {
    this.activeStep = 'AFTER_DEFEAT';
    this.isPaused = false;

    // Sparcky avance les diamants manquants pour ne jamais bloquer un joueur qui en a récolté trop peu
    const missing = this.getFireRateCostToRequirement() - this.store.getCurrentLevelData().diamonds;
    if (missing > 0) {
      this.store.addDiamondsToMission(1, missing);
    }

    this.onRetryCallback?.();
    this.setDockHighlight(true);
    this.showRetryMessage(missing > 0 ? missing : 0);
  }

  private showRetryMessage(advancedDiamonds: number = 0) {
    if (this.hasRequiredFireRate()) {
      this.showMessage("Parfait, tes vaisseaux tirent plus vite ! Touche l'écran pour repartir 🚀", null, true);
      return;
    }
    const required = TUTORIAL_WALL.requiredFireRateSteps;
    const advance = advancedDiamonds > 0 ? ` Je t'avance les ${advancedDiamonds} 💎 qui manquent.` : '';
    this.showMessage(
      `Achète <strong>${required} niveaux de Vitesse tir ⚡</strong> : tes vaisseaux tireront plus vite (${this.getFireRateStepsDone()}/${required}).${advance}`,
      null,
      true
    );
  }

  /**
   * Le vol d'initiation peut-il redécoller ? (après une défaite, il faut les niveaux de Vitesse tir exigés)
   */
  public canLaunch(): boolean {
    return this.activeStep !== 'AFTER_DEFEAT' || this.hasRequiredFireRate();
  }

  /**
   * Toucher l'écran sans avoir acheté les améliorations : Sparcky secoue sa carte et rappelle la consigne
   */
  public onLaunchBlocked() {
    const now = performance.now();
    if (now - this.lastBlockedNudge < 800) return;
    this.lastBlockedNudge = now;

    this.sound.playSparckyChirp();
    this.showRetryMessage();
    this.elOverlay?.classList.remove('nudge');
    void this.elOverlay?.offsetWidth; // Relance l'animation de secousse
    this.elOverlay?.classList.add('nudge');
  }

  /**
   * Appelé après chaque achat dans la barre d'améliorations
   */
  public onUpgradeChanged() {
    if (this.activeStep === 'AFTER_DEFEAT') {
      this.showRetryMessage();
    }
  }

  private getFireRateStepsDone(): number {
    const track = this.store.data.upgradeTracks.fireRate;
    return track.tier > 1 ? TUTORIAL_WALL.requiredFireRateSteps : Math.min(track.step, TUTORIAL_WALL.requiredFireRateSteps);
  }

  public hasRequiredFireRate(): boolean {
    return this.getFireRateStepsDone() >= TUTORIAL_WALL.requiredFireRateSteps;
  }

  // Coût restant (en diamants) pour atteindre les niveaux de Vitesse tir exigés
  private getFireRateCostToRequirement(): number {
    const config = UPGRADE_TRACKS_CONFIG.fireRate;
    const track = this.store.data.upgradeTracks.fireRate;
    let cost = 0;
    for (let step = this.getFireRateStepsDone(); step < TUTORIAL_WALL.requiredFireRateSteps; step++) {
      cost += Math.round((config.baseStepCost + step * config.costPerStep) * track.tier);
    }
    return cost;
  }

  /**
   * Après la victoire : sortie du tutoriel vers la mission 1
   */
  private finishTutorial(showMissionTips: boolean) {
    this.activeStep = 'COMPLETE';
    this.isPaused = false;
    this.isFlightTutorialRunning = false;
    this.setDockHighlight(false);
    this.hideOverlay();
    this.onFinishTutorialCallback?.();
    if (showMissionTips) {
      this.showMissionTips();
    }
  }

  /**
   * Bilan de victoire : nombre d'essais et Iridium gagné, pour le menu de fin de niveau
   */
  public getAttempts(): number {
    return this.attempts;
  }

  public getEarnedIridium(): number {
    return this.hasEarnedIridium ? 1 : 0;
  }

  /**
   * Fermeture du bilan de victoire : direction la mission 1
   */
  public continueAfterVictory() {
    this.finishTutorial(true);
  }

  /**
   * Arrivée en mission 1 : le renfort de départ (pub ou Iridium), puis les encouragements
   */
  private showMissionTips() {
    this.activeStep = 'MISSION_TIPS';
    this.elEscortBar?.classList.add('dock-tutorial-highlight');
    this.sound.playSparckyChirp();
    this.showMessage(
      'Astuce : regarde une pub 🎬 ou utilise 1 Iridium <span class="icon-iridium"></span> pour démarrer avec un vaisseau de plus !',
      'OK ▶',
      true,
      false
    );
  }

  private showGoodLuck() {
    this.activeStep = 'MISSION_GOODLUCK';
    this.elEscortBar?.classList.remove('dock-tutorial-highlight');
    this.showMessage("Bonne chance Commandant, et amuse-toi bien ! 🚀 Touche l'écran pour décoller.", null, true, false);
  }

  /**
   * Décollage d'une mission normale : Sparcky range ses derniers conseils
   */
  public onFlightLaunched() {
    if (this.activeStep === 'MISSION_TIPS' || this.activeStep === 'MISSION_GOODLUCK') {
      this.activeStep = 'COMPLETE';
      this.elEscortBar?.classList.remove('dock-tutorial-highlight');
      this.hideOverlay();
    }
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
    this.highlightTargets = [];
    this.store.data.tutorialCompleted = true;
    this.restoreMission1();
    this.elSwipeHint?.classList.add('hidden');
    this.finishTutorial(false);
  }

  /**
   * Rend à la mission 1 sa progression d'avant le tutoriel (rejeu depuis le guide), ou la remet à zéro
   */
  private restoreMission1() {
    if (this.savedMission1) {
      this.store.data.levelUpgrades[1] = this.savedMission1;
      this.savedMission1 = null;
      this.store.save();
    } else {
      this.store.resetMissionProgress(1);
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
    // Le tutoriel utilise le porte-monnaie de la mission 1 : on met de côté la vraie progression du joueur
    if (this.store.data.levelUpgrades?.[1] && !this.savedMission1) {
      this.savedMission1 = JSON.parse(JSON.stringify(this.store.data.levelUpgrades[1]));
    }
    this.store.data.tutorialCompleted = false;
    this.store.data.selectedMission = 1;
    this.store.resetMissionProgress(1);
    this.attempts = 0;
    this.wallValue = null;
    this.hasSeenIntro = false;
    this.seenLessons.clear();

    this.onReplayCallback?.();
  }

  // Met en valeur la carte « Vitesse tir » de la barre d'améliorations
  private setDockHighlight(on: boolean) {
    this.elFireRateCard?.classList.toggle('dock-tutorial-highlight', on);
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
