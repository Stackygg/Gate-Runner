// Retours haptiques (vibrations) : plugin natif Capacitor sur téléphone, API Vibration du navigateur sinon.
// - léger : portail franchi
// - moyen : astéroïde ou ennemi percuté
// - fort  : flotte détruite ou supernova de fin de niveau

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Écart minimal entre deux petites vibrations, pour ne pas saturer lors d'une rafale d'impacts
const MIN_INTERVAL_MS = 60;

export class HapticService {
  private static lastPulseAt = 0;
  private static enabled = true;

  // Réglé depuis les paramètres du jeu (mémorisé dans la sauvegarde)
  public static setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public static isEnabled(): boolean {
    return this.enabled;
  }

  public static light() {
    this.impact(ImpactStyle.Light, 15);
  }

  public static medium() {
    this.impact(ImpactStyle.Medium, 35);
  }

  public static heavy() {
    if (!this.enabled) return;
    this.lastPulseAt = performance.now();
    if (Capacitor.isNativePlatform()) {
      Haptics.vibrate({ duration: 450 }).catch(() => {});
    } else {
      this.webVibrate([180, 70, 260]);
    }
  }

  private static impact(style: ImpactStyle, fallbackMs: number) {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastPulseAt < MIN_INTERVAL_MS) return;
    this.lastPulseAt = now;

    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style }).catch(() => {});
    } else {
      this.webVibrate(fallbackMs);
    }
  }

  private static webVibrate(pattern: number | number[]) {
    try {
      navigator.vibrate?.(pattern);
    } catch {}
  }
}
