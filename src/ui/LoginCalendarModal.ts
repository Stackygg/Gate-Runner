// Fenêtre du calendrier de connexion (31 jours, grands paliers aux jours 7, 14, 21, 28 et 31)

import confetti from 'canvas-confetti';
import { UpgradeStore } from '../systems/UpgradeStore';
import { RARITY_CONFIGS } from '../systems/EquipmentSystem';
import {
  LoginCalendar,
  LoginReward,
  LOGIN_CALENDAR_DAYS,
  LOGIN_MILESTONE_DAYS,
  LOGIN_REWARDS
} from '../systems/LoginCalendar';

export class LoginCalendarModal {
  private store: UpgradeStore;
  private onClaimed: () => void;

  private elModal = document.getElementById('modal-login-calendar');
  private elGrid = document.getElementById('login-calendar-grid');
  private elSubtitle = document.getElementById('login-calendar-subtitle');
  private elToday = document.getElementById('login-calendar-today');
  private elBtnClaim = document.getElementById('btn-login-calendar-claim');
  private elBtnClose = document.getElementById('btn-close-login-calendar');
  private elBtnOpen = document.getElementById('btn-main-calendar');
  private elBadge = document.getElementById('calendar-badge');

  constructor(store: UpgradeStore, onClaimed: () => void) {
    this.store = store;
    this.onClaimed = onClaimed;

    this.elBtnOpen?.addEventListener('click', () => this.show());
    this.elBtnClose?.addEventListener('click', () => this.hide());
    this.elBtnClaim?.addEventListener('click', () => this.claim());
    this.refreshBadge();
  }

  public canClaimToday(): boolean {
    return LoginCalendar.getStatus(this.store).canClaimToday;
  }

  public show() {
    this.render();
    this.elModal?.classList.remove('hidden');
  }

  public hide() {
    this.elModal?.classList.add('hidden');
  }

  public refreshBadge() {
    this.elBadge?.classList.toggle('hidden', !this.canClaimToday());
  }

  private claim() {
    const result = LoginCalendar.claim(this.store);
    if (!result) return;

    const isMilestone = LOGIN_MILESTONE_DAYS.includes(result.day);
    try {
      confetti({
        particleCount: isMilestone ? 140 : 70,
        spread: isMilestone ? 90 : 65,
        origin: { y: 0.6 },
        colors: ['#FFE600', '#00F0FF', '#FF6B00', '#A855F7']
      });
    } catch {}

    this.render();
    this.refreshBadge();
    this.onClaimed();
  }

  private render() {
    const status = LoginCalendar.getStatus(this.store);
    // Jour mis en avant : celui à récupérer aujourd'hui, sinon celui déjà récupéré
    const highlightDay = status.canClaimToday ? status.nextDay : status.claimedDay;

    if (this.elSubtitle) {
      if (status.streakBroken) {
        this.elSubtitle.textContent = 'Série interrompue : le calendrier repart au jour 1.';
      } else if (status.canClaimToday) {
        this.elSubtitle.textContent = `Jour ${status.nextDay} sur ${LOGIN_CALENDAR_DAYS} : connecte-toi chaque jour pour de meilleures récompenses !`;
      } else {
        this.elSubtitle.textContent = `Jour ${status.claimedDay} récupéré. Reviens demain pour le jour ${status.nextDay} !`;
      }
    }

    if (this.elGrid) {
      let html = '';
      for (let day = 1; day <= LOGIN_CALENDAR_DAYS; day++) {
        const reward = LOGIN_REWARDS[day - 1];
        const isClaimed = day <= status.claimedDay;
        const isToday = day === highlightDay && status.canClaimToday;
        const isMilestone = LOGIN_MILESTONE_DAYS.includes(day);
        const classes = [
          'login-day',
          isClaimed ? 'claimed' : '',
          isToday ? 'today' : '',
          isMilestone ? 'milestone' : '',
          day === LOGIN_CALENDAR_DAYS ? 'final' : ''
        ].filter(Boolean).join(' ');
        html += `
          <div class="${classes}" title="${this.describeReward(reward)}">
            <span class="login-day-num">${isMilestone ? '★ ' : ''}J${day}</span>
            <span class="login-day-reward">${this.renderMainReward(reward)}</span>
            ${isClaimed ? '<span class="login-day-check">✓</span>' : ''}
          </div>
        `;
      }
      this.elGrid.innerHTML = html;
    }

    if (this.elToday) {
      const day = status.canClaimToday ? status.nextDay : status.claimedDay;
      const label = status.canClaimToday ? "Aujourd'hui" : 'Récupéré';
      this.elToday.innerHTML = day > 0 ? `${label} : <strong>${this.describeReward(LOGIN_REWARDS[day - 1])}</strong>` : '';
    }

    if (this.elBtnClaim) {
      this.elBtnClaim.toggleAttribute('disabled', !status.canClaimToday);
      this.elBtnClaim.classList.toggle('disabled', !status.canClaimToday);
      this.elBtnClaim.textContent = status.canClaimToday ? 'RÉCUPÉRER 🎁' : 'À DEMAIN !';
    }
  }

  // Icône et quantité de la récompense principale d'une case (coffre > barres > iridium > poudre)
  private renderMainReward(reward: LoginReward): string {
    if (reward.chest) {
      const color = RARITY_CONFIGS[reward.chest].color;
      return `<span class="login-chest" style="color: ${color}; text-shadow: 0 0 8px ${color};">🛸</span>`;
    }
    if (reward.bars) return `<span class="icon-iridium-bar"></span><span>${reward.bars}</span>`;
    if (reward.iridium) return `<span class="icon-iridium"></span><span>${reward.iridium}</span>`;
    return `<span class="icon-diamond-dust"></span><span>${reward.dust ?? 0}</span>`;
  }

  private describeReward(reward: LoginReward): string {
    const parts: string[] = [];
    if (reward.chest) parts.push(`Coffre ${RARITY_CONFIGS[reward.chest].name}`);
    if (reward.bars) parts.push(`${reward.bars} barre${reward.bars > 1 ? 's' : ''} d'iridium`);
    if (reward.iridium) parts.push(`${reward.iridium} iridium`);
    if (reward.dust) parts.push(`${reward.dust} poudre de diamant`);
    return parts.join(' + ');
  }
}
