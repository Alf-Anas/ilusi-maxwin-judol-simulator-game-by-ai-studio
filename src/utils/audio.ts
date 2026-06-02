/**
 * Ilusi Maxwin - Audio Manager Utility
 * This handles background ambience and interactive sound effects.
 * It attempts to load custom MP3 files from the '/sounds/' directory.
 * If these files are missing or haven't been uploaded yet, it falls back
 * to a built-in Web Audio API synthesizer so everything works out of the box!
 */

class AudioManager {
  private baseCtx: AudioContext | null = null;
  private bgAudio: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private currentAmbienceOscs: { osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode }[] = [];

  constructor() {
    // Lazy initialisation of Audio to prevent autoplay policy blocks on module load
  }

  private initCtx() {
    if (!this.baseCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.baseCtx = new AudioCtxClass();
      }
    }
    if (this.baseCtx && this.baseCtx.state === "suspended") {
      this.baseCtx.resume();
    }
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
    
    // Set volume on the HTML Audio element
    if (this.bgAudio) {
      this.bgAudio.muted = mute;
    }

    // Toggle synth background
    if (mute) {
      this.stopSynthAmbience();
      if (this.bgAudio) {
        try {
          this.bgAudio.pause();
        } catch (_) {}
      }
    } else {
      this.playBackground();
    }
  }

  // --- HTML5 Audio Loading ---
  playBackground() {
    if (this.isMuted) return;
    this.initCtx();

    // Check if bgAudio already exists
    if (!this.bgAudio) {
      this.bgAudio = new Audio("/sounds/background.mp3");
      this.bgAudio.loop = true;
      this.bgAudio.volume = 0.35;
    }

    this.bgAudio.play().then(() => {
      // Successfully playing custom MP3, we don't need synth fallback
      this.stopSynthAmbience();
    }).catch(() => {
      // MP3 failed to load or autoplay blocked -> fall back to synthesizing ambience
      this.startSynthAmbience();
    });
  }

  stopBackground() {
    if (this.bgAudio) {
      try {
        this.bgAudio.pause();
      } catch (_) {}
    }
    this.stopSynthAmbience();
  }

  // Plays a sound, with synth fallback if custom file is missing
  private playSound(url: string, synthFallback: () => void) {
    if (this.isMuted) return;
    this.initCtx();

    const audio = new Audio(url);
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Failed to load custom audio config -> call synthesized retro fallback
      synthFallback();
    });
  }

  playClick() {
    this.playSound("/sounds/click.mp3", () => {
      this.synthBeep(800, 0.05, 0.1, "sine");
    });
  }

  playSpin() {
    this.playSound("/sounds/spin.mp3", () => {
      // Short interactive blips in a fast sequence
      this.synthBeep(500, 0.08, 0.2, "triangle");
      setTimeout(() => this.synthBeep(650, 0.08, 0.2, "triangle"), 150);
      setTimeout(() => this.synthBeep(800, 0.08, 0.2, "triangle"), 300);
    });
  }

  playWin() {
    this.playSound("/sounds/win.mp3", () => {
      // Triumphant rising arpeggio
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C major notes
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.synthBeep(freq, 0.12, 0.2, "sine");
        }, idx * 100);
      });
    });
  }

  playLose() {
    this.playSound("/sounds/lose.mp3", () => {
      // Sad descending sound
      this.synthDescending(400, 80, 1.2);
    });
  }

  // --- Real-time Synthesis Engines (Web Audio API Fallbacks) ---
  private synthBeep(freq: number, duration: number, volume: number = 0.2, type: OscillatorType = "sine") {
    if (!this.baseCtx || this.isMuted) return;
    try {
      this.initCtx();
      const ctx = this.baseCtx!;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  }

  private synthDescending(startFreq: number, endFreq: number, duration: number) {
    if (!this.baseCtx || this.isMuted) return;
    try {
      this.initCtx();
      const ctx = this.baseCtx!;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  }

  private startSynthAmbience() {
    if (!this.baseCtx || this.isMuted || this.currentAmbienceOscs.length > 0) return;
    try {
      this.initCtx();
      const ctx = this.baseCtx!;
      
      // We generate a low, eerie, tension-inducing drone (dual oscillators at 60Hz and 61.5Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(60.0, ctx.currentTime); 
      
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(61.5, ctx.currentTime); // creating detune beating effect

      gain.gain.setValueAtTime(0.12, ctx.currentTime); // discrete background drone
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      
      this.currentAmbienceOscs.push({ osc1, osc2, gain });
    } catch (_) {}
  }

  private stopSynthAmbience() {
    this.currentAmbienceOscs.forEach(({ osc1, osc2, gain }) => {
      try {
        osc1.stop();
        osc2.stop();
        gain.disconnect();
      } catch (_) {}
    });
    this.currentAmbienceOscs = [];
  }
}

export const audioManager = new AudioManager();
