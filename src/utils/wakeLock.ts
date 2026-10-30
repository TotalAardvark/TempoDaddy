// Screen Wake Lock Manager for keeping display active during metronome playback
// Direct gesture acquisition + visibility/focus recovery for iOS & Desktop PWAs

class WakeLockManager {
  private sentinel: WakeLockSentinel | null = null;
  private isRequested: boolean = false;
  private isSupported: boolean = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  constructor() {
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.isRequested) {
          this.request();
        }
      });

      window.addEventListener('focus', () => {
        if (this.isRequested) {
          this.request();
        }
      });
    }
  }

  /**
   * Request screen wake lock. Best called synchronously in a direct user gesture handler
   * (e.g. click, tap, keydown).
   */
  public async request(): Promise<boolean> {
    this.isRequested = true;
    if (!this.isSupported) return false;

    // If we already have an active unreleased sentinel, no need to re-request
    if (this.sentinel && !this.sentinel.released) {
      return true;
    }

    try {
      this.sentinel = await navigator.wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
      });
      return true;
    } catch (err) {
      // Typically occurs if battery is in Low Power Mode, document is hidden,
      // or user gesture expired.
      console.warn('Screen Wake Lock request non-critical warning:', err);
      return false;
    }
  }

  /**
   * Release screen wake lock when metronome is stopped or workout ends.
   */
  public async release(): Promise<void> {
    this.isRequested = false;
    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch {
        // Ignore release errors
      }
      this.sentinel = null;
    }
  }

  /**
   * Check whether wake lock is currently active.
   */
  public isActive(): boolean {
    return !!this.sentinel && !this.sentinel.released;
  }
}

export const wakeLockManager = new WakeLockManager();
