// Contrôleur de l'affichage HUD en temps réel avec double monnaie, bannières de phases & timer multiplicateur de boss

export class HUD {
  private elSessionDiamonds = document.getElementById('hud-session-diamonds');
  private elSubFleet = document.getElementById('hud-sub-fleet');
  private elSubDamage = document.getElementById('hud-sub-damage');
  private elSubFireRate = document.getElementById('hud-sub-firerate');
  private elDistanceFill = document.getElementById('hud-distance-fill');
  private elShipMarker = document.getElementById('hud-ship-marker');
  private elLevelLabel = document.getElementById('hud-level-label');
  private elTopHud = document.getElementById('hud-top');
  
  // Boss HUD
  private elBossHud = document.getElementById('boss-hud');
  private elBossName = document.getElementById('boss-name');
  private elBossHpFill = document.getElementById('boss-hp-fill');
  private elBossHpText = document.getElementById('boss-hp-text');
  private elBossTimerBadge = document.getElementById('boss-timer-badge');
  private elBossTimerText = document.getElementById('boss-timer-text');
  private elBossMultiplierText = document.getElementById('boss-multiplier-text');

  // Mothership HUD
  private elMothershipHud = document.getElementById('mothership-hud');
  private elMothershipHpFill = document.getElementById('mothership-hp-fill');
  private elMothershipHpText = document.getElementById('mothership-hp-text');
  private elMothershipStatusTag = document.getElementById('mothership-status-tag');

  private bannerTimer: number | null = null;

  // Cache pour dirty-checking (zéro thrashing DOM à 60 FPS)
  private lastDiamonds: number = -1;
  private lastFleet: number = -1;
  private lastDamage: number = -1;
  private lastFireRate: number = -1;
  private lastProgressRounded: number = -1;
  private lastLevel: number = -1;
  private lastPhase: number = -1;

  public show() {
    this.elTopHud?.classList.remove('hidden');
    // Réinitialiser le cache pour forcer un affichage frais
    this.lastDiamonds = -1;
    this.lastFleet = -1;
    this.lastDamage = -1;
    this.lastFireRate = -1;
    this.lastProgressRounded = -1;
    this.lastLevel = -1;
    this.lastPhase = -1;
  }

  public hide() {
    this.elTopHud?.classList.add('hidden');
    this.hideBoss();
    this.hideMothership();
  }

  public updateStats(
    fleetCount: number,
    sessionDiamonds: number,
    damagePct: number,
    fireRatePct: number,
    progressRatio: number,
    levelNum: number,
    currentPhase: number = 1
  ) {
    const dFloor = Math.floor(sessionDiamonds);
    if (this.lastDiamonds !== dFloor) {
      this.lastDiamonds = dFloor;
      if (this.elSessionDiamonds) this.elSessionDiamonds.textContent = `${dFloor}`;
    }

    if (this.lastFleet !== fleetCount) {
      this.lastFleet = fleetCount;
      if (this.elSubFleet) this.elSubFleet.textContent = `${fleetCount}`;
    }

    if (this.lastDamage !== damagePct) {
      this.lastDamage = damagePct;
      if (this.elSubDamage) this.elSubDamage.textContent = `${damagePct}%`;
    }

    if (this.lastFireRate !== fireRatePct) {
      this.lastFireRate = fireRatePct;
      if (this.elSubFireRate) this.elSubFireRate.textContent = `${fireRatePct}%`;
    }

    // Mise à jour de la barre de distance par échelons de 0.2%
    const progressPct = Math.round(Math.max(0, Math.min(1, progressRatio)) * 500) / 5;
    if (this.lastProgressRounded !== progressPct) {
      this.lastProgressRounded = progressPct;
      if (this.elDistanceFill) this.elDistanceFill.style.width = `${progressPct}%`;
      if (this.elShipMarker) this.elShipMarker.style.left = `${progressPct}%`;
    }

    if (this.lastLevel !== levelNum || this.lastPhase !== currentPhase) {
      this.lastLevel = levelNum;
      this.lastPhase = currentPhase;
      if (this.elLevelLabel) {
        this.elLevelLabel.textContent = `M${levelNum < 10 ? '0' + levelNum : levelNum} • VAGUE ${currentPhase}/4`;
      }
    }
  }

  public showPhaseBanner(phaseNum: number, title: string) {
    const elBanner = document.getElementById('phase-alert-banner');
    const elBadge = document.getElementById('phase-banner-badge');
    const elTitle = document.getElementById('phase-banner-title');
    if (!elBanner) return;

    if (elBadge) elBadge.textContent = `PHASE ${phaseNum} / 4`;
    if (elTitle) elTitle.textContent = title;

    if (this.bannerTimer !== null) {
      clearTimeout(this.bannerTimer);
      elBanner.classList.remove('animate-in');
      void elBanner.offsetWidth; // Force reflow
    }

    elBanner.classList.remove('hidden');
    elBanner.classList.add('animate-in');

    this.bannerTimer = window.setTimeout(() => {
      elBanner.classList.remove('animate-in');
      elBanner.classList.add('hidden');
      this.bannerTimer = null;
    }, 2800);
  }

  public showBoss(name: string, hp: number, maxHp: number, isFinalBoss: boolean = false) {
    this.elBossHud?.classList.remove('hidden');
    if (this.elBossName) this.elBossName.textContent = name;
    if (isFinalBoss) {
      this.elBossTimerBadge?.classList.remove('hidden');
    } else {
      this.elBossTimerBadge?.classList.add('hidden');
    }
    this.updateBossHp(hp, maxHp);
  }

  public updateBossTimer(timeRemaining: number, multiplier: number, isEnraged: boolean = false) {
    this.elBossTimerBadge?.classList.remove('hidden');
    if (this.elBossTimerText) {
      this.elBossTimerText.textContent = `${Math.max(0, timeRemaining).toFixed(1)}s`;
    }
    if (this.elBossMultiplierText) {
      this.elBossMultiplierText.textContent = isEnraged ? `x${multiplier.toFixed(1)} ⚡` : `x${multiplier.toFixed(1)}`;
    }
    if (this.elBossTimerBadge) {
      if (isEnraged) {
        this.elBossTimerBadge.classList.add('enraged');
      } else {
        this.elBossTimerBadge.classList.remove('enraged');
      }
    }
  }

  public updateBossHp(hp: number, maxHp: number) {
    if (this.elBossHpFill) {
      const ratio = Math.max(0, Math.min(1, hp / maxHp));
      this.elBossHpFill.style.width = `${ratio * 100}%`;
    }
    if (this.elBossHpText) {
      this.elBossHpText.textContent = `${Math.ceil(hp)} / ${maxHp} HP`;
    }
  }

  public hideBoss() {
    this.elBossHud?.classList.add('hidden');
    this.elBossTimerBadge?.classList.add('hidden');
  }

  public showMothership(hp: number, maxHp: number) {
    this.elMothershipHud?.classList.remove('hidden');
    this.updateMothershipHp(hp, maxHp);
  }

  public updateMothershipHp(hp: number, maxHp: number) {
    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    if (this.elMothershipHpFill) {
      this.elMothershipHpFill.style.width = `${ratio * 100}%`;
      if (ratio <= 0.25) {
        this.elMothershipHpFill.style.background = 'linear-gradient(90deg, #FF0055, #FF5500)';
      } else if (ratio <= 0.5) {
        this.elMothershipHpFill.style.background = 'linear-gradient(90deg, #FFAA00, #FFE600)';
      } else {
        this.elMothershipHpFill.style.background = 'linear-gradient(90deg, #00FF88, #00F0FF)';
      }
    }
    if (this.elMothershipHpText) {
      this.elMothershipHpText.textContent = `${Math.ceil(Math.max(0, hp))} / ${maxHp} PV`;
    }
    if (this.elMothershipStatusTag) {
      const pct = Math.ceil(ratio * 100);
      if (pct <= 25) {
        this.elMothershipStatusTag.textContent = `CRITIQUE ${pct}%`;
        this.elMothershipStatusTag.style.color = '#FF0055';
      } else if (pct <= 50) {
        this.elMothershipStatusTag.textContent = `ALERTE ${pct}%`;
        this.elMothershipStatusTag.style.color = '#FFAA00';
      } else {
        this.elMothershipStatusTag.textContent = `BOUCLIER ${pct}%`;
        this.elMothershipStatusTag.style.color = '#00F0FF';
      }
    }
  }

  public hideMothership() {
    this.elMothershipHud?.classList.add('hidden');
  }
}
