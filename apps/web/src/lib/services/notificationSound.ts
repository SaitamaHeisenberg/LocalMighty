import { browser } from '$app/environment';

class NotificationSoundService {
  private audioContext: AudioContext | null = null;
  private enabled = true;
  private volume = 0.5;

  constructor() {
    if (browser) {
      // Load preferences from localStorage
      const stored = localStorage.getItem('localmighty_notification_sound');
      if (stored) {
        try {
          const prefs = JSON.parse(stored);
          this.enabled = prefs.enabled ?? true;
          this.volume = prefs.volume ?? 0.5;
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (!browser) return null;

    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error('Web Audio API not supported');
        return null;
      }
    }

    return this.audioContext;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    this.savePreferences();
  }

  getVolume(): number {
    return this.volume;
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    this.savePreferences();
  }

  private savePreferences(): void {
    if (browser) {
      localStorage.setItem('localmighty_notification_sound', JSON.stringify({
        enabled: this.enabled,
        volume: this.volume,
      }));
    }
  }

  /**
   * Play a pleasant notification sound using Web Audio API
   * Creates a two-tone chime (similar to iMessage)
   */
  play(): void {
    if (!this.enabled || !browser) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    // Resume context if suspended (needed after user interaction)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    // First tone (higher pitch)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5

    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(this.volume * 0.4, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Second tone (lower pitch, slightly delayed)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.10);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.25);
  }

  /**
   * Play a subtle click sound for sent messages
   */
  playSent(): void {
    if (!this.enabled || !browser) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.15, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }
}

export const notificationSound = new NotificationSoundService();
