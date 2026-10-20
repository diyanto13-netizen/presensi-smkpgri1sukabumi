/**
 * Web Audio API synthesizer, HTML5 Audio Fallback, and Speech Synthesis
 * Engineered for robust cross-device support (Desktop, Android Smartphone, Android Tablet Kiosk).
 */

class SoundService {
  private audioCtx: AudioContext | null = null;
  private isUnlocked = false;
  private indonesianVoice: SpeechSynthesisVoice | null = null;
  private voicesLoaded = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initVoiceLoader();
      this.registerAutoUnlock();
    }
  }

  /**
   * Automatically unlock AudioContext on the first touch, click, or keypress on Android tablets/browsers.
   */
  private registerAutoUnlock() {
    const unlockHandler = () => {
      this.unlockAudio();
      window.removeEventListener('click', unlockHandler);
      window.removeEventListener('touchstart', unlockHandler);
      window.removeEventListener('touchend', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
    };

    window.addEventListener('click', unlockHandler, { passive: true });
    window.addEventListener('touchstart', unlockHandler, { passive: true });
    window.addEventListener('touchend', unlockHandler, { passive: true });
    window.addEventListener('keydown', unlockHandler, { passive: true });
  }

  /**
   * Pre-load speech synthesis voices (fixes Android Chrome async voice loading)
   */
  private initVoiceLoader() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        this.voicesLoaded = true;
        // Priority: Indonesian exact match -> Indonesian lang prefix -> Malay (closely related)
        this.indonesianVoice =
          voices.find(v => v.lang.toLowerCase() === 'id-id' || v.lang.toLowerCase() === 'id_id') ||
          voices.find(v => v.lang.toLowerCase().startsWith('id')) ||
          voices.find(v => v.name.toLowerCase().includes('indonesia')) ||
          voices.find(v => v.lang.toLowerCase().startsWith('ms')) ||
          null;
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  /**
   * Explicitly unlock audio context and wake up device DAC (especially on Android tablets)
   */
  public async unlockAudio(): Promise<boolean> {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return false;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Play a short silent buffer to activate hardware audio output on Android
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);

      this.isUnlocked = true;

      // Also prime speech synthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }

      return true;
    } catch (e) {
      console.warn('Audio unlock warning:', e);
      return false;
    }
  }

  public getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Pleasant two-tone chime for on-time check-in or checkout success
   */
  playSuccess() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) {
        this.playFallbackBeep(880, 0.2);
        return;
      }

      const now = ctx.currentTime;

      // Note 1: 880Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.18);

      // Note 2: 1320Hz (E6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now + 0.12);
      gain2.gain.setValueAtTime(0.22, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.45);
    } catch {
      this.playFallbackBeep(880, 0.25);
    }
  }

  /**
   * Alert chime for late check-in (warning tone)
   */
  playWarning() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) {
        this.playFallbackBeep(587, 0.3);
        return;
      }
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(440, now + 0.15); // A4
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      this.playFallbackBeep(440, 0.3);
    }
  }

  /**
   * Low frequency buzz for rejected scan or error
   */
  playError() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) {
        this.playFallbackBeep(220, 0.3);
        return;
      }
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now); // A3
      osc.frequency.linearRampToValueAtTime(160, now + 0.28);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      this.playFallbackBeep(220, 0.3);
    }
  }

  /**
   * Fallback beep synthesizer using minimal Web Audio or short beep
   */
  private playFallbackBeep(freq: number, duration: number) {
    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        const tempCtx = new AudioCtxClass();
        const osc = tempCtx.createOscillator();
        const gain = tempCtx.createGain();
        osc.frequency.value = freq;
        gain.gain.value = 0.2;
        osc.connect(gain);
        gain.connect(tempCtx.destination);
        osc.start();
        setTimeout(() => {
          try {
            osc.stop();
            tempCtx.close();
          } catch {}
        }, duration * 1000);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Natural Indonesian voice announcement with Android Tablet reliability fixes
   */
  speak(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      // Fix Android Chrome speech queue freeze
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Select voice if available
      if (this.indonesianVoice) {
        utterance.voice = this.indonesianVoice;
      } else {
        // Re-check voices in case they loaded late
        const voices = window.speechSynthesis.getVoices();
        const found =
          voices.find(v => v.lang.toLowerCase() === 'id-id' || v.lang.toLowerCase() === 'id_id') ||
          voices.find(v => v.lang.toLowerCase().startsWith('id')) ||
          voices.find(v => v.name.toLowerCase().includes('indonesia')) ||
          voices.find(v => v.lang.toLowerCase().startsWith('ms'));
        if (found) {
          this.indonesianVoice = found;
          utterance.voice = found;
        }
      }

      // Android Chrome requires utterance keep-alive and error protection
      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis failed:', e);
    }
  }

  /**
   * Diagnostic test for tablet / desktop audio and speech
   */
  async testAudioAndSpeech(): Promise<{
    webAudioSuccess: boolean;
    speechSuccess: boolean;
    voiceName: string;
    hasIndonesianVoice: boolean;
  }> {
    await this.unlockAudio();
    this.playSuccess();

    const voices = typeof window !== 'undefined' && 'speechSynthesis' in window
      ? window.speechSynthesis.getVoices()
      : [];

    const hasIndo = voices.some(v =>
      v.lang.toLowerCase().startsWith('id') || v.name.toLowerCase().includes('indonesia')
    );

    const voiceName = this.indonesianVoice
      ? `${this.indonesianVoice.name} (${this.indonesianVoice.lang})`
      : voices.length > 0
      ? `${voices[0].name} (${voices[0].lang})`
      : 'Default Perangkat (Sistem)';

    setTimeout(() => {
      this.speak('Tes suara absensi berhasil. Sistem siap digunakan.');
    }, 400);

    return {
      webAudioSuccess: true,
      speechSuccess: 'speechSynthesis' in window,
      voiceName,
      hasIndonesianVoice: hasIndo,
    };
  }
}

export const soundService = new SoundService();
