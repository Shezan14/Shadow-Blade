const ELEMENT_FREQUENCIES = Object.freeze({ fire: 110, ice: 440, lightning: 760, wind: 230 });

export class AudioManager {
  constructor(AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext) {
    this.AudioContextClass = AudioContextClass;
    this.context = null;
    this.master = null;
    this.ambient = null;
    this.muted = false;
    this.available = Boolean(AudioContextClass);
    const asset = (file) => new URL(`audio/${file}`, typeof document !== 'undefined' ? document.baseURI : 'http://localhost/').toString();
    this.musicTracks = typeof Audio !== 'undefined'
      ? Object.fromEntries([
        ['exploration', new Audio(asset('background-theme.mp3'))],
        ['combat', new Audio(asset('combat-loop.mp3'))],
        ['boss', new Audio(asset('boss-loop.mp3'))],
      ])
      : {};
    this.music = this.musicTracks.exploration ?? null;
    this.musicMode = 'exploration';
    this.musicFade = null;
    this.swordSounds = typeof Audio !== 'undefined'
      ? ['sword-swing-1.ogg', 'sword-swing-2.ogg', 'sword-swing-3.ogg'].map((file) => new Audio(asset(file)))
      : [];
    this.enemyBarks = typeof Audio !== 'undefined'
      ? ['enemy-bark-1.ogg', 'enemy-bark-2.ogg'].map((file) => new Audio(asset(file)))
      : [];
    this.bossBark = typeof Audio !== 'undefined' ? new Audio(asset('boss-bark.ogg')) : null;
    Object.values(this.musicTracks).forEach((track) => { track.loop = true; track.volume = 0; track.preload = 'auto'; });
    this.swordSounds.forEach((sound) => { sound.volume = 0.48; sound.preload = 'auto'; });
    this.enemyBarks.forEach((sound) => { sound.volume = 0.38; sound.preload = 'auto'; });
    if (this.bossBark) { this.bossBark.volume = 0.52; this.bossBark.preload = 'auto'; }
  }

  async unlock() {
    if (!this.available) return false;
    try {
      if (!this.context) this.createGraph();
      // Must start HTML media while the player's click is still an active browser gesture.
      Object.values(this.musicTracks).forEach((track) => {
        if (!this.muted) void track.play().catch(() => {});
      });
      this.setMusicMode(this.musicMode, true);
      if (this.context.state === 'suspended') await this.context.resume();
      return this.context.state === 'running';
    } catch {
      this.available = false;
      return false;
    }
  }

  createGraph() {
    this.context = new this.AudioContextClass();
    const compressor = this.context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 14;
    compressor.ratio.value = 5;
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.34;
    this.master.connect(compressor);
    compressor.connect(this.context.destination);

    this.ambient = this.context.createGain();
    this.ambient.gain.value = 0.045;
    this.ambient.connect(this.master);
    [43.65, 65.41].forEach((frequency, index) => {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = index ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.value = index ? 0.2 : 0.32;
      oscillator.connect(gain);
      gain.connect(this.ambient);
      oscillator.start();
    });
  }

  toggleMuted() {
    this.muted = !this.muted;
    Object.values(this.musicTracks).forEach((track) => { track.muted = this.muted; if (!this.muted) void track.play().catch(() => {}); });
    this.swordSounds.forEach((sound) => { sound.muted = this.muted; });
    this.enemyBarks.forEach((sound) => { sound.muted = this.muted; });
    if (this.bossBark) this.bossBark.muted = this.muted;
    if (this.master && this.context) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.34, this.context.currentTime, 0.025);
    }
    return this.muted;
  }

  setState(state) {
    if (!this.ambient || !this.context) return;
    const active = state === 'PLAYING' || state === 'BOSS_FIGHT';
    this.ambient.gain.setTargetAtTime(active ? 0.055 : 0.025, this.context.currentTime, 0.3);
  }

  setMusicMode(mode = 'exploration', immediate = false) {
    if (!this.musicTracks[mode]) mode = 'exploration';
    if (mode === this.musicMode && !immediate) return;
    this.musicMode = mode;
    const levels = { exploration: 0.22, combat: 0.26, boss: 0.3 };
    const tracks = Object.entries(this.musicTracks);
    tracks.forEach(([, track]) => { if (!this.muted) void track.play().catch(() => {}); });
    if (this.musicFade) clearInterval(this.musicFade);
    if (immediate) {
      tracks.forEach(([id, track]) => { track.volume = id === mode && !this.muted ? levels[id] : 0; });
      return;
    }
    let step = 0;
    const start = Object.fromEntries(tracks.map(([id, track]) => [id, track.volume]));
    this.musicFade = setInterval(() => {
      step += 1;
      const progress = Math.min(1, step / 18);
      tracks.forEach(([id, track]) => {
        const target = id === mode && !this.muted ? levels[id] : 0;
        track.volume = start[id] + (target - start[id]) * progress;
      });
      if (progress >= 1) { clearInterval(this.musicFade); this.musicFade = null; }
    }, 55);
  }

  tone({ frequency = 220, endFrequency = frequency, duration = 0.12, volume = 0.12, type = 'sine', delay = 0 }) {
    if (!this.context || this.context.state !== 'running' || this.muted) return false;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
    return true;
  }

  sword(combo = 0) {
    const sample = this.swordSounds[combo % this.swordSounds.length];
    if (sample && !this.muted) {
      const voice = sample.cloneNode();
      voice.volume = sample.volume;
      void voice.play().catch(() => {});
    }
    const started = this.tone({ frequency: 980 + combo * 85, endFrequency: 150, duration: 0.2, volume: 0.18, type: 'sawtooth' });
    this.tone({ frequency: 160 + combo * 25, endFrequency: 58, duration: 0.1, volume: 0.11, type: 'square', delay: 0.025 });
    return started;
  }

  bark(boss = false) {
    if (this.muted) return false;
    const sample = boss ? this.bossBark : this.enemyBarks[Math.floor(Math.random() * this.enemyBarks.length)];
    if (!sample) return false;
    const voice = sample.cloneNode();
    voice.volume = sample.volume;
    void voice.play().catch(() => {});
    return true;
  }

  hit() {
    this.tone({ frequency: 95, endFrequency: 42, duration: 0.11, volume: 0.16, type: 'square' });
  }

  damage() {
    this.tone({ frequency: 72, endFrequency: 36, duration: 0.24, volume: 0.18, type: 'sawtooth' });
  }

  movement(state) {
    if (state === 'jump') this.tone({ frequency: 130, endFrequency: 240, duration: 0.16, volume: 0.07, type: 'triangle' });
    if (state === 'dodge') this.tone({ frequency: 190, endFrequency: 58, duration: 0.18, volume: 0.08, type: 'triangle' });
  }

  element(id) {
    const frequency = ELEMENT_FREQUENCIES[id];
    if (!frequency) return false;
    this.tone({
      frequency,
      endFrequency: id === 'lightning' ? frequency * 1.7 : frequency * 0.72,
      duration: id === 'wind' ? 0.32 : 0.22,
      volume: 0.13,
      type: id === 'ice' ? 'sine' : id === 'wind' ? 'triangle' : 'sawtooth',
    });
    if (id === 'lightning') this.tone({ frequency: 1180, endFrequency: 310, duration: 0.09, volume: 0.08, type: 'square', delay: 0.025 });
    return true;
  }

  encounter(stage) {
    if (!['mini_intro', 'final_intro', 'victory_pending', 'complete'].includes(stage)) return false;
    const victory = stage === 'complete';
    this.tone({ frequency: victory ? 220 : 82, endFrequency: victory ? 440 : 48, duration: 0.55, volume: 0.11, type: 'triangle' });
    return true;
  }

  menu() { return this.tone({ frequency: 310, endFrequency: 560, duration: 0.16, volume: 0.08, type: 'triangle' }); }
}
