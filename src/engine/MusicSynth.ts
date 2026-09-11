// Moteur Audio & Synthétiseur Chiptune 8-Bit Rétro-Funk Polyphonique
// Inclut l'emblématique "Harder, Better, Faster, Stronger" de Daft Punk en 8-Bit Chiptune !

export interface TrackDefinition {
  id: string;
  name: string;
  url?: string; // Chemin du fichier MP3 (ex: '/music/ma-musique.mp3')
  bpm?: number;
  patternLength?: number;
  bass?: string[];
  chords?: string[][];
  lead?: string[];
  drums?: string[];
}

export class MusicSynth {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  public isPlaying: boolean = false;
  public currentTrackId: string = 'main';
  private timerId: number | null = null;
  private step: number = 0;
  private masterGain: GainNode | null = null;
  private audioPlayer: HTMLAudioElement | null = null;

  // Fréquences des notes (Gamme chromatique rétro)
  private readonly notes: Record<string, number> = {
    '---': 0,
    // Octave 1 & 2 (Basse / Slap)
    'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00, 'Bb2': 116.54, 'B2': 123.47,
    // Octave 3 (Accords / Basse haute)
    'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'Eb3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'Bb3': 233.08, 'B3': 246.94,
    // Octave 4 (Lead / Chords)
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'Eb4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'Bb4': 466.16, 'B4': 493.88,
    // Octave 5 (Vocoder Solo / Lead aigu)
    'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'Eb5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'B5': 987.77,
    // Octave 6
    'C6': 1046.50, 'C#6': 1108.73, 'D6': 1174.66, 'E6': 1318.51, 'F#6': 1479.98
  };

  public readonly tracks: Record<string, TrackDefinition> = {
    // 🕹️ 1. MUSIQUE PRINCIPALE (ACCUEIL & HANGAR) : MAIN MENU
    main: {
      id: 'main',
      name: '🕹️ MAIN MENU',
      url: './music/Main Menu.mp3'
    },
    // ⚡ 2. MUSIQUE DE NIVEAU : CHIP FUNK PULSE
    music1: {
      id: 'music1',
      name: '⚡ CHIP FUNK PULSE',
      url: './music/music1.mp3'
    },
    // 🔥 3. MUSIQUE DE BOSS : TURBO PIXEL
    boss: {
      id: 'boss',
      name: '🔥 TURBO PIXEL',
      url: './music/boss.mp3'
    },
    // 🤖 4. SYNTHÉTISEUR 8-BIT RÉTRO : HARDER, BETTER, FASTER (DAFT PUNK)
    harder_better: {
      id: 'harder_better',
      name: '🤖 HARDER BETTER (8-BIT)',
      bpm: 123,
      patternLength: 64, // 4 mesures complètes avec la progression entière
      bass: [
        // Mesure 1 (Bm7)
        'B2', '---', 'B3', 'D3', '---', 'B2', 'E3', '---',
        'B2', 'B2', 'B3', 'D3', '---', 'B2', 'F#3', '---',
        // Mesure 2 (F#m7)
        'F#2', '---', 'F#3', 'A2', '---', 'F#2', 'C#3', '---',
        'F#2', 'F#2', 'F#3', 'A2', '---', 'F#2', 'E3', '---',
        // Mesure 3 (Dmaj7)
        'D3', '---', 'D4', 'F#3', '---', 'D3', 'A2', '---',
        'D3', 'D3', 'D4', 'F#3', '---', 'D3', 'B2', '---',
        // Mesure 4 (E7 / C#m)
        'E2', '---', 'E3', 'G#2', '---', 'E2', 'B2', 'C#3',
        'E2', 'E2', 'E3', 'G#2', 'B2', 'C#3', 'D3', 'E3'
      ],
      chords: [
        // Mesure 1 : Bm7
        [], ['D4', 'F#4', 'B4'], [], ['D4', 'F#4', 'B4'], [], ['D4', 'F#4', 'A4'], [], ['D4', 'F#4', 'B4'],
        [], ['D4', 'F#4', 'B4'], [], ['D4', 'F#4', 'B4'], [], ['D4', 'F#4', 'A4'], [], ['D4', 'F#4', 'B4'],
        // Mesure 2 : F#m7
        [], ['C#4', 'E4', 'A4'], [], ['C#4', 'E4', 'A4'], [], ['C#4', 'E4', 'F#4'], [], ['C#4', 'E4', 'A4'],
        [], ['C#4', 'E4', 'A4'], [], ['C#4', 'E4', 'A4'], [], ['C#4', 'E4', 'F#4'], [], ['C#4', 'E4', 'A4'],
        // Mesure 3 : Dmaj7
        [], ['F#3', 'A3', 'D4'], [], ['F#3', 'A3', 'D4'], [], ['F#3', 'A3', 'C#4'], [], ['F#3', 'A3', 'D4'],
        [], ['F#3', 'A3', 'D4'], [], ['F#3', 'A3', 'D4'], [], ['F#3', 'A3', 'C#4'], [], ['F#3', 'A3', 'D4'],
        // Mesure 4 : E7
        [], ['G#3', 'B3', 'E4'], [], ['G#3', 'B3', 'E4'], [], ['G#3', 'B3', 'D4'], [], ['G#3', 'B3', 'E4'],
        [], ['G#3', 'B3', 'E4'], [], ['G#3', 'B3', 'E4'], [], ['G#3', 'B3', 'D4'], ['G#3', 'B3', 'E4'], []
      ],
      lead: [
        // "Work it, make it, do it, makes us"
        'F#4', 'A4', 'B4', 'C#5', 'D5', 'C#5', 'B4', 'A4',
        // "Harder, better, faster, stronger"
        'F#4', 'A4', 'B4', 'D5', 'C#5', 'A4', 'B4', 'F#4',
        // "More than ever, hour after"
        'F#5', 'E5', 'C#5', 'B4', 'C#5', 'E5', 'F#5', 'A5',
        // "Our work is never over"
        'G#5', 'F#5', 'E5', 'C#5', 'B4', 'A4', 'B4', 'C#5',
        // Refrain Lead Vocoder Synth Riff (Partie B)
        'F#4', 'F#4', 'A4', 'A4', 'B4', 'B4', 'C#5', 'C#5',
        'D5', 'C#5', 'B4', 'A4', 'F#4', 'A4', 'B4', '---',
        'F#5', '---', 'E5', 'C#5', 'B4', '---', 'A4', 'B4',
        'C#5', 'D5', 'C#5', 'B4', 'A4', 'F#4', '---', '---'
      ],
      drums: [
        // 4-on-the-floor House Beat avec charlestons ouverts sur les contretemps
        'K', 'H', 'S', 'O', 'K', 'H', 'S', 'O',
        'K', 'H', 'S', 'O', 'K', 'K', 'S', 'O',
        'K', 'H', 'S', 'O', 'K', 'H', 'S', 'O',
        'K', 'H', 'S', 'O', 'K', 'O', 'S', 'C',
        'K', 'H', 'S', 'O', 'K', 'H', 'S', 'O',
        'K', 'H', 'S', 'O', 'K', 'K', 'S', 'O',
        'K', 'H', 'S', 'O', 'K', 'H', 'S', 'O',
        'K', 'H', 'S', 'O', 'K', 'O', 'S', 'C'
      ]
    },

    // 🪩 MORCEAU 2 : DAFT FUNK (Around the World / Get Lucky Slap Groove)
    daft_funk: {
      id: 'daft_funk',
      name: '🪩 AROUND THE FUNK',
      bpm: 124,
      patternLength: 32,
      bass: [
        'E2', '---', 'E3', '---', 'G2', '---', 'A2', 'A3',
        '---', 'A2', 'D3', '---', 'D3', '---', 'B2', 'D3',
        'E2', 'E2', 'E3', '---', 'G2', '---', 'A2', 'A3',
        'C3', '---', 'D3', 'E3', 'D3', '---', 'B2', '---'
      ],
      chords: [
        [], ['G3', 'B3', 'E4'], [], ['G3', 'B3', 'E4'], [], ['A3', 'C4', 'E4'], [], ['A3', 'C4', 'E4'],
        [], ['F#3', 'A3', 'D4'], [], ['F#3', 'A3', 'D4'], [], ['F#3', 'A3', 'D4'], [], ['G3', 'B3', 'D4'],
        [], ['G3', 'B3', 'E4'], [], ['G3', 'B3', 'E4'], [], ['A3', 'C4', 'E4'], [], ['A3', 'C4', 'E4'],
        [], ['F#3', 'A3', 'D4'], [], ['F#3', 'A3', 'D4'], [], ['E3', 'G3', 'B3'], ['F#3', 'A3', 'D4'], []
      ],
      lead: [
        'E5', 'G5', 'B5', 'A5', 'G5', 'E5', 'D5', 'E5',
        '---', 'D5', 'E5', 'G5', 'A5', 'G5', 'E5', 'D5',
        'E5', 'G5', 'B5', 'C6', 'B5', 'A5', 'G5', 'A5',
        'G5', 'E5', 'D5', 'B4', 'D5', 'E5', '---', '---'
      ],
      drums: [
        'K', 'H', 'S', 'O', 'K', 'H', 'S', 'O',
        'K', 'H', 'S', 'O', 'K', 'K', 'S', 'O',
        'K', 'H', 'S', 'O', 'K', 'H', 'S', 'O',
        'K', 'H', 'S', 'O', 'K', 'O', 'S', 'C'
      ]
    },

    // 🚀 MORCEAU 3 : CYBER VOYAGER (Space Disco & Synthwave)
    cyber_voyager: {
      id: 'cyber_voyager',
      name: '🌌 CYBER VOYAGER',
      bpm: 126,
      patternLength: 32,
      bass: [
        'A2', 'A2', 'A3', 'A2', 'F2', 'F2', 'F3', 'F2',
        'G2', 'G2', 'G3', 'G2', 'E2', 'E2', 'E3', 'G2',
        'A2', 'A2', 'A3', 'A2', 'F2', 'F2', 'F3', 'F2',
        'G2', 'G2', 'B2', 'D3', 'E3', 'D3', 'B2', 'G2'
      ],
      chords: [
        ['C4', 'E4', 'A4'], [], ['C4', 'E4', 'A4'], [], ['A3', 'C4', 'F4'], [], ['A3', 'C4', 'F4'], [],
        ['B3', 'D4', 'G4'], [], ['B3', 'D4', 'G4'], [], ['G3', 'B3', 'E4'], [], ['G3', 'B3', 'E4'], [],
        ['C4', 'E4', 'A4'], [], ['C4', 'E4', 'A4'], [], ['A3', 'C4', 'F4'], [], ['A3', 'C4', 'F4'], [],
        ['B3', 'D4', 'G4'], [], ['B3', 'D4', 'G4'], [], ['G3', 'B3', 'E4'], [], ['G3', 'B3', 'D4'], []
      ],
      lead: [
        'A4', 'C5', 'E5', 'A5', 'G5', 'E5', 'C5', 'A4',
        'F4', 'A4', 'C5', 'F5', 'E5', 'C5', 'A4', 'F4',
        'G4', 'B4', 'D5', 'G5', 'F5', 'D5', 'B4', 'G4',
        'E4', 'G4', 'B4', 'E5', 'D5', 'B4', 'G4', 'E4'
      ],
      drums: [
        'K', 'H', 'S', 'H', 'K', 'H', 'S', 'H',
        'K', 'H', 'S', 'H', 'K', 'H', 'S', 'H',
        'K', 'H', 'S', 'H', 'K', 'H', 'S', 'H',
        'K', 'H', 'S', 'H', 'K', 'K', 'S', 'O'
      ]
    },

    // ⚡ MORCEAU 4 : ROBOT ROCK (Riff Chiptune Puissant)
    robot_rock: {
      id: 'robot_rock',
      name: '⚡ ROBOT ROCK 8-BIT',
      bpm: 130,
      patternLength: 32,
      bass: [
        'D3', 'D3', 'D3', '---', 'F3', '---', 'G3', 'G#3',
        'A3', '---', 'A2', '---', 'C3', '---', 'C#3', '---',
        'D3', 'D3', 'D3', '---', 'F3', '---', 'G3', 'G#3',
        'A3', 'G3', 'F3', 'D3', 'C3', 'D3', '---', '---'
      ],
      chords: [
        ['D4', 'F4', 'A4'], ['D4', 'F4', 'A4'], [], ['D4', 'F4', 'A4'], [], ['F4', 'A4', 'C5'], [], ['G4', 'B4', 'D5'],
        ['A4', 'C5', 'E5'], ['A4', 'C5', 'E5'], [], ['A4', 'C5', 'E5'], [], ['C4', 'E4', 'G4'], [], ['C#4', 'E4', 'A4'],
        ['D4', 'F4', 'A4'], ['D4', 'F4', 'A4'], [], ['D4', 'F4', 'A4'], [], ['F4', 'A4', 'C5'], [], ['G4', 'B4', 'D5'],
        ['A4', 'C5', 'E5'], [], ['G4', 'B4', 'D5'], [], ['F4', 'A4', 'C5'], [], ['D4', 'F4', 'A4'], []
      ],
      lead: [
        'D5', 'D5', 'F5', 'D5', 'A5', '---', 'G5', 'F5',
        'E5', '---', 'C5', '---', 'D5', '---', 'E5', '---',
        'D5', 'D5', 'F5', 'D5', 'A5', '---', 'G5', 'F5',
        'A5', 'G5', 'F5', 'D5', 'F5', 'D5', '---', '---'
      ],
      drums: [
        'K', 'H', 'S', 'H', 'K', 'K', 'S', 'H',
        'K', 'H', 'S', 'H', 'K', 'H', 'S', 'O',
        'K', 'H', 'S', 'H', 'K', 'K', 'S', 'H',
        'K', 'K', 'S', 'K', 'K', 'S', 'S', 'C'
      ]
    },

    // 👾 MORCEAU 5 : TITAN OVERLORD (Boss Epic)
    boss_titan: {
      id: 'boss_titan',
      name: '👾 TITAN OVERLORD',
      bpm: 144,
      patternLength: 32,
      bass: [
        'A2', 'A2', 'C3', 'A2', 'Eb3', 'D3', 'C3', 'A2',
        'A2', 'A2', 'C3', 'A2', 'Eb3', 'D3', 'F3', 'E3',
        'A2', 'A2', 'C3', 'A2', 'Eb3', 'D3', 'C3', 'A2',
        'Eb3', 'Eb3', 'D3', 'D3', 'C3', 'C3', 'B2', 'G2'
      ],
      chords: [
        ['C4', 'Eb4', 'A4'], [], ['C4', 'Eb4', 'A4'], [], ['D4', 'F4', 'A4'], [], ['C4', 'Eb4', 'A4'], [],
        ['C4', 'Eb4', 'A4'], [], ['C4', 'Eb4', 'A4'], [], ['D4', 'F4', 'Bb4'], [], ['E4', 'G4', 'B4'], [],
        ['C4', 'Eb4', 'A4'], [], ['C4', 'Eb4', 'A4'], [], ['D4', 'F4', 'A4'], [], ['C4', 'Eb4', 'A4'], [],
        ['Eb4', 'Gb4', 'A4'], [], ['D4', 'F4', 'A4'], [], ['C4', 'E4', 'G4'], [], ['B3', 'D4', 'G4'], []
      ],
      lead: [
        'A5', 'Eb5', 'D5', 'C5', 'A4', 'C5', 'D5', 'Eb5',
        'A5', 'Eb5', 'D5', 'C5', 'D5', 'F5', 'E5', 'C5',
        'A5', 'Eb5', 'D5', 'C5', 'A4', 'C5', 'D5', 'Eb5',
        'Eb5', 'D5', 'C5', 'A4', 'G4', 'A4', 'C5', 'Eb5'
      ],
      drums: [
        'K', 'S', 'K', 'S', 'K', 'S', 'K', 'S',
        'K', 'K', 'S', 'K', 'K', 'S', 'O', 'S',
        'K', 'S', 'K', 'S', 'K', 'S', 'K', 'S',
        'K', 'K', 'S', 'K', 'K', 'S', 'S', 'C'
      ]
    }
  };

  private volume: number = 0.2;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume * 0.4, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audioPlayer) {
      this.audioPlayer.volume = this.isMuted ? 0 : this.volume;
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume * 0.4, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.audioPlayer) {
      this.audioPlayer.volume = this.isMuted ? 0 : this.volume;
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume * 0.4, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getTrackList(): TrackDefinition[] {
    return Object.values(this.tracks);
  }

  private playNote(freq: number, duration: number, type: OscillatorType = 'square', vol: number = 0.2, time?: number) {
    if (!this.ctx || !this.masterGain || this.isMuted || freq <= 0) return;
    const startTime = time ?? this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    noteGain.gain.setValueAtTime(vol, startTime);
    noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(noteGain);
    noteGain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  private playChord(chordNotes: string[], duration: number, time?: number) {
    if (!chordNotes || chordNotes.length === 0) return;
    for (const noteName of chordNotes) {
      const freq = this.notes[noteName];
      if (freq) {
        this.playNote(freq, duration, 'sawtooth', 0.07, time);
      }
    }
  }

  private playKick(time: number) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(28, time + 0.08);

    gain.gain.setValueAtTime(0.40, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.08);
  }

  private playNoiseDrum(type: 'snare' | 'hihat' | 'openhat' | 'crash', time?: number) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const startTime = time ?? this.ctx.currentTime;
    
    let duration = 0.04;
    let filterFreq = 6000;
    let filterType: BiquadFilterType = 'highpass';
    let vol = 0.12;

    if (type === 'snare') {
      duration = 0.10;
      filterFreq = 1400;
      filterType = 'bandpass';
      vol = 0.26;
    } else if (type === 'openhat') {
      duration = 0.12;
      filterFreq = 7500;
      vol = 0.18;
    } else if (type === 'crash') {
      duration = 0.35;
      filterFreq = 5000;
      vol = 0.30;
    }

    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, startTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(startTime);
  }

  public addCustomMp3Track(id: string, name: string, url: string) {
    this.tracks[id] = { id, name, url };
  }

  public playTrack(trackId: string) {
    this.initContext();
    if (this.currentTrackId === trackId && this.isPlaying) return;

    this.stop();
    this.currentTrackId = trackId;
    this.isPlaying = true;
    this.step = 0;

    const track = this.tracks[trackId] || this.tracks.harder_better;

    // Si c'est un fichier MP3/audio
    if (track.url) {
      try {
        this.audioPlayer = new Audio(encodeURI(track.url));
        this.audioPlayer.loop = true;
        this.audioPlayer.volume = this.isMuted ? 0 : this.volume;
        this.audioPlayer.play().catch(() => {});
      } catch (err) {
        console.warn('Audio MP3 play error:', err);
      }
      return;
    }

    // Sinon, synthétiseur chiptune 8-bit
    const bpm = track.bpm || 120;
    const stepDurationMs = (60 / bpm / 4) * 1000;

    this.timerId = window.setInterval(() => {
      this.tick();
    }, stepDurationMs);
  }

  public nextTrack(): TrackDefinition {
    const trackKeys = Object.keys(this.tracks);
    const currentIndex = trackKeys.indexOf(this.currentTrackId);
    const nextIndex = (currentIndex + 1) % trackKeys.length;
    const nextTrackId = trackKeys[nextIndex];
    this.playTrack(nextTrackId);
    return this.tracks[nextTrackId];
  }

  private tick() {
    if (!this.isPlaying || !this.currentTrackId || !this.ctx) return;
    const track = this.tracks[this.currentTrackId] || this.tracks.harder_better;
    if (track.url || !track.patternLength || !track.bpm || !track.bass || !track.chords || !track.lead || !track.drums) return;

    const currentStep = this.step % track.patternLength;
    const now = this.ctx.currentTime;
    const stepDuration = (60 / track.bpm / 4);

    // 1. Basse Slap Funky (Triangle wave)
    const bassNote = track.bass[currentStep];
    if (bassNote && this.notes[bassNote]) {
      this.playNote(this.notes[bassNote], stepDuration * 0.95, 'triangle', 0.32, now);
    }

    // 2. Accords Funky Stabs (Sawtooth wave filtrée)
    const chord = track.chords[currentStep];
    if (chord && chord.length > 0) {
      this.playChord(chord, stepDuration * 0.85, now);
    }

    // 3. Lead / Vocoder Melodique (Square wave 8-bit)
    const leadNote = track.lead[currentStep];
    if (leadNote && this.notes[leadNote]) {
      this.playNote(this.notes[leadNote], stepDuration * 0.88, 'square', 0.17, now);
    }

    // 4. Batterie House / Disco-Funk
    const drumHit = track.drums[currentStep];
    if (drumHit === 'K') {
      this.playKick(now);
    } else if (drumHit === 'S') {
      this.playNoiseDrum('snare', now);
    } else if (drumHit === 'H') {
      this.playNoiseDrum('hihat', now);
    } else if (drumHit === 'O') {
      this.playNoiseDrum('openhat', now);
    } else if (drumHit === 'C') {
      this.playNoiseDrum('crash', now);
    }

    this.step++;
  }

  public stop() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0;
      this.audioPlayer = null;
    }
    this.isPlaying = false;
  }
}
