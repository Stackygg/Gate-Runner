// Moteur sonore procédural basé sur l'API Web Audio (aucun chargement de fichier externe)

export class SoundSynth {
  private ctx: AudioContext | null = null;
  private sfxMasterGain: GainNode | null = null;
  private volume: number = 0.5;
  private isMuted: boolean = false;
  private bgmOsc: OscillatorNode | null = null;
  private bgmGain: GainNode | null = null;
  private isBgmPlaying: boolean = false;
  private gateComboIndex: number = 0;
  private lastGateHitTime: number = 0;

  private noiseBuffer: AudioBuffer | null = null;
  private lastExplosionTime: number = 0;

  // Notes de la gamme pentatonique pour les impacts sur les portails
  private readonly PENTATONIC_SCALE = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];

  constructor() {
    // Initialisation paresseuse au premier clic/toucher utilisateur
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.sfxMasterGain = this.ctx.createGain();
      this.sfxMasterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.sfxMasterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.noiseBuffer && this.ctx) {
      try {
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.5);
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
      } catch {}
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.sfxMasterGain && this.ctx) {
      this.sfxMasterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.sfxMasterGain && this.ctx) {
      this.sfxMasterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  private getDestination(): AudioNode {
    return this.sfxMasterGain || this.ctx!.destination;
  }

  // Effet sonore de distorsion / hyper-propulsion
  public playWarp() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.getDestination());

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  // Tir laser de vaisseau
  public playLaser(pitchMultiplier: number = 1.0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      const startFreq = (750 + Math.random() * 100) * pitchMultiplier;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.09);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.getDestination());

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Ignorer les erreurs audio de contexte
    }
  }

  // Impact sur un portail multiplicateur (Gamme musicale ascendante ultra-satisfaisante)
  public playGateHit() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = performance.now();
    if (now - this.lastGateHitTime < 400) {
      this.gateComboIndex = (this.gateComboIndex + 1) % this.PENTATONIC_SCALE.length;
    } else {
      this.gateComboIndex = 0;
    }
    this.lastGateHitTime = now;

    try {
      const cTime = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freq = this.PENTATONIC_SCALE[this.gateComboIndex];
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, cTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, cTime + 0.08);

      gain.gain.setValueAtTime(0.12, cTime);
      gain.gain.exponentialRampToValueAtTime(0.001, cTime + 0.08);

      osc.connect(gain);
      gain.connect(this.getDestination());

      osc.start(cTime);
      osc.stop(cTime + 0.08);
    } catch {}
  }

  // Franchissement réussi d'un portail (Accord lumineux triomphal)
  public playGatePass(isPositive: boolean = true) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const cTime = this.ctx.currentTime;
      const notes = isPositive ? [440, 554.37, 659.25, 880] : [350, 310, 260];

      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = isPositive ? 'triangle' : 'sawtooth';
        const start = cTime + idx * 0.04;
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

        osc.connect(gain);
        gain.connect(this.getDestination());

        osc.start(start);
        osc.stop(start + 0.25);
      });
    } catch {}
  }

  // Explosion percutante avec bruit blanc et basses
  public playExplosion(isBig: boolean = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.noiseBuffer) return;

    const now = performance.now();
    if (!isBig && now - this.lastExplosionTime < 50) return; // Évite les saccades sur explosions multiples rapprochées
    this.lastExplosionTime = now;

    try {
      const cTime = this.ctx.currentTime;
      const dur = isBig ? 0.4 : 0.2;

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isBig ? 600 : 900, cTime);
      filter.frequency.exponentialRampToValueAtTime(50, cTime + dur);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(isBig ? 0.35 : 0.18, cTime);
      gain.gain.exponentialRampToValueAtTime(0.01, cTime + dur);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.getDestination());

      whiteNoise.start(cTime);
      whiteNoise.stop(cTime + dur);
    } catch {}
  }

  // Récolte de gemmes / crédits
  public playGemPickup() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const cTime = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, cTime);
      osc.frequency.setValueAtTime(1318.51, cTime + 0.05);

      gain.gain.setValueAtTime(0.1, cTime);
      gain.gain.exponentialRampToValueAtTime(0.001, cTime + 0.12);

      osc.connect(gain);
      gain.connect(this.getDestination());

      osc.start(cTime);
      osc.stop(cTime + 0.12);
    } catch {}
  }

  // Alerte Boss
  public playBossAlarm() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const cTime = this.ctx.currentTime;
      for (let i = 0; i < 2; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = cTime + i * 0.3;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(500, start);
        osc.frequency.linearRampToValueAtTime(200, start + 0.25);

        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

        osc.connect(gain);
        gain.connect(this.getDestination());

        osc.start(start);
        osc.stop(start + 0.25);
      }
    } catch {}
  }

  // Victoire
  public playVictory() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const cTime = this.ctx.currentTime;
      const fanfare = [
        { f: 523.25, d: 0.12 },
        { f: 659.25, d: 0.12 },
        { f: 783.99, d: 0.15 },
        { f: 1046.50, d: 0.4 }
      ];

      let t = cTime;
      fanfare.forEach(note => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.f, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

        osc.connect(gain);
        gain.connect(this.getDestination());

        osc.start(t);
        osc.stop(t + note.d);
        t += note.d * 0.9;
      });
    } catch {}
  }

  // Ouverture de Coffre / Trésor spatial (Montée en tension sourde suivie d'un carillon cristallin)
  public playChestOpen() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;
    try {
      const cTime = this.ctx.currentTime;
      // 1. Rumble / montée en puissance (0.8s)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, cTime);
      osc.frequency.exponentialRampToValueAtTime(520, cTime + 0.8);
      gain.gain.setValueAtTime(0.04, cTime);
      gain.gain.linearRampToValueAtTime(0.25, cTime + 0.75);
      gain.gain.exponentialRampToValueAtTime(0.001, cTime + 0.85);
      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start(cTime);
      osc.stop(cTime + 0.85);

      // 2. Éclat carillonné triomphal à l'ouverture (0.85s)
      const chimeNotes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
      chimeNotes.forEach((freq, idx) => {
        const cOsc = this.ctx!.createOscillator();
        const cGain = this.ctx!.createGain();
        cOsc.type = 'sine';
        const start = cTime + 0.82 + idx * 0.05;
        cOsc.frequency.setValueAtTime(freq, start);
        cGain.gain.setValueAtTime(0.2, start);
        cGain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        cOsc.connect(cGain);
        cGain.connect(this.getDestination());
        cOsc.start(start);
        cOsc.stop(start + 0.4);
      });
    } catch {}
  }

  // Musique de fond procédurale Synthwave d'ambiance
  public startBgm() {
    if (this.isMuted || this.isBgmPlaying) return;
    this.initContext();
    if (!this.ctx) return;

    this.isBgmPlaying = true;
  }

  public stopBgm() {
    this.isBgmPlaying = false;
  }
}
