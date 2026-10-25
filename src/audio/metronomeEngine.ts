import type { Subdivision, MetronomeTimbre } from '../types';

export interface MetronomeTickEvent {
  tickIndex: number;
  totalTicksPerMeasure: number;
  isDownbeat: boolean;
  isQuarterBeat: boolean;
  bpm: number;
}

export class MetronomeEngine {
  private audioCtx: AudioContext | null = null;
  private isRunning: boolean = false;
  private bpm: number = 100;
  private subdivision: Subdivision = '1/16';
  private isTriplet: boolean = false;
  private beatsPerMeasure: number = 4; // standard 4/4
  private timbre: MetronomeTimbre = 'woodblock';
  private noiseBuffer: AudioBuffer | null = null;

  private currentTick: number = 0;
  private nextTickTime: number = 0;
  private timerId: number | null = null;
  private lookaheadMs: number = 25; // How often to check for upcoming notes (ms)
  private scheduleAheadTime: number = 0.1; // How far ahead to schedule audio (seconds)

  private onTickCallback: ((event: MetronomeTickEvent) => void) | null = null;

  constructor(
    bpm = 100,
    subdivision: Subdivision = '1/16',
    isTriplet = false,
    timbre: MetronomeTimbre = 'woodblock'
  ) {
    this.bpm = bpm;
    this.subdivision = subdivision;
    this.isTriplet = isTriplet;
    this.timbre = timbre;
  }

  public setOnTick(callback: (event: MetronomeTickEvent) => void) {
    this.onTickCallback = callback;
  }

  public setTimbre(timbre: MetronomeTimbre) {
    this.timbre = timbre;
  }

  public getTimbre(): MetronomeTimbre {
    return this.timbre;
  }

  public async unlockAudio(): Promise<boolean> {
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    return this.audioCtx.state === 'running';
  }

  public async playPreview(previewTimbre?: MetronomeTimbre) {
    await this.unlockAudio();
    if (!this.audioCtx) return;
    const t = previewTimbre || this.timbre;
    this.scheduleSound(true, false, this.audioCtx.currentTime + 0.01, t);
  }

  public getSubdivisionsPerBeat(): number {
    if (this.isTriplet) {
      if (this.subdivision === '1/16') return 6; // Sextuplet
      return 3; // Triplet for 1/4 and 1/8
    }
    switch (this.subdivision) {
      case '1/4':
        return 1;
      case '1/8':
        return 2;
      case '1/16':
      default:
        return 4;
    }
  }

  public getTotalTicksPerMeasure(): number {
    return this.beatsPerMeasure * this.getSubdivisionsPerBeat();
  }

  public setBpm(newBpm: number) {
    this.bpm = Math.max(30, Math.min(320, Math.round(newBpm)));
  }

  public getBpm(): number {
    return this.bpm;
  }

  public setSubdivision(subdivision: Subdivision, isTriplet: boolean) {
    this.subdivision = subdivision;
    this.isTriplet = isTriplet;
    // reset tick position to prevent out-of-bounds glitches
    this.currentTick = 0;
  }

  public async start() {
    if (this.isRunning) return;
    await this.unlockAudio();
    if (!this.audioCtx) return;

    this.isRunning = true;
    this.currentTick = 0;
    this.nextTickTime = this.audioCtx.currentTime + 0.05;

    this.scheduler();
    this.timerId = window.setInterval(() => this.scheduler(), this.lookaheadMs);
  }

  public stop() {
    this.isRunning = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public toggle(): boolean {
    if (this.isRunning) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  private scheduler() {
    if (!this.audioCtx || !this.isRunning) return;

    while (this.nextTickTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentTick, this.nextTickTime);
      this.advanceTick();
    }
  }

  private advanceTick() {
    const ticksPerBeat = this.getSubdivisionsPerBeat();
    const secondsPerBeat = 60.0 / this.bpm;
    const secondsPerTick = secondsPerBeat / ticksPerBeat;

    this.nextTickTime += secondsPerTick;
    this.currentTick = (this.currentTick + 1) % this.getTotalTicksPerMeasure();
  }

  private scheduleNote(tickIndex: number, time: number) {
    if (!this.audioCtx) return;

    const ticksPerBeat = this.getSubdivisionsPerBeat();
    const totalTicks = this.getTotalTicksPerMeasure();
    const isDownbeat = tickIndex === 0;
    const isQuarterBeat = tickIndex % ticksPerBeat === 0;

    this.scheduleSound(isDownbeat, isQuarterBeat, time, this.timbre);

    // Trigger visual callback synchronized to when the sound actually plays
    if (this.onTickCallback) {
      const timeUntilPlay = Math.max(0, (time - this.audioCtx.currentTime) * 1000);
      window.setTimeout(() => {
        if (this.isRunning && this.onTickCallback) {
          this.onTickCallback({
            tickIndex,
            totalTicksPerMeasure: totalTicks,
            isDownbeat,
            isQuarterBeat,
            bpm: this.bpm,
          });
        }
      }, timeUntilPlay);
    }
  }

  private getNoiseBuffer(): AudioBuffer | null {
    if (!this.audioCtx) return null;
    if (!this.noiseBuffer) {
      const sampleRate = this.audioCtx.sampleRate;
      const buffer = this.audioCtx.createBuffer(1, sampleRate, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < sampleRate; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }

  private scheduleSound(
    isDownbeat: boolean,
    isQuarterBeat: boolean,
    time: number,
    timbre: MetronomeTimbre
  ) {
    if (!this.audioCtx) return;

    // Tempo-dependent decay scale factor:
    // As metronome gets faster, decay gets shorter to maximize intelligibility
    const tempoScale = Math.max(0.4, Math.min(1.0, 100 / this.bpm));

    if (timbre === 'loud') {
      // Sound 3: "Loud" Preset - Piercing loud tone + white noise transient snap
      const osc = this.audioCtx.createOscillator();
      const oscGain = this.audioCtx.createGain();

      // High-mid piercing tonal core
      let freq = 1500;
      let oscGainVal = 0.42;
      let duration = 0.016 * tempoScale;

      if (isDownbeat) {
        osc.type = 'triangle';
        freq = 2700;
        oscGainVal = 1.0;
        duration = 0.045 * tempoScale;
      } else if (isQuarterBeat) {
        osc.type = 'triangle';
        freq = 2000;
        oscGainVal = 0.78;
        duration = 0.028 * tempoScale;
      } else {
        osc.type = 'sine';
      }

      osc.frequency.setValueAtTime(freq, time);
      if (isDownbeat) {
        osc.frequency.exponentialRampToValueAtTime(1400, time + duration * 0.7);
      } else if (isQuarterBeat) {
        osc.frequency.exponentialRampToValueAtTime(1100, time + duration * 0.7);
      }

      oscGain.gain.setValueAtTime(0.001, time);
      oscGain.gain.linearRampToValueAtTime(oscGainVal, time + 0.001);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(oscGain);
      oscGain.connect(this.audioCtx.destination);
      osc.start(time);
      osc.stop(time + duration + 0.004);

      // White noise transient layer for crisp snap
      const noiseBuf = this.getNoiseBuffer();
      if (noiseBuf) {
        const noiseSource = this.audioCtx.createBufferSource();
        noiseSource.buffer = noiseBuf;

        const noiseFilter = this.audioCtx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(isDownbeat ? 3500 : 4500, time);

        const noiseGain = this.audioCtx.createGain();
        const noiseDuration = (isDownbeat ? 0.024 : isQuarterBeat ? 0.016 : 0.009) * tempoScale;
        const noiseVol = isDownbeat ? 0.85 : isQuarterBeat ? 0.60 : 0.32;

        noiseGain.gain.setValueAtTime(0.001, time);
        noiseGain.gain.linearRampToValueAtTime(noiseVol, time + 0.0008);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + noiseDuration);

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.audioCtx.destination);

        noiseSource.start(time);
        noiseSource.stop(time + noiseDuration + 0.003);
      }
    } else if (timbre === 'beep') {
      // Sound 2: Digital Beep (Clean high-cut synth pulse)
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';

      let freq = 1050;
      let gainVal = 0.24;
      let duration = 0.018 * tempoScale;

      if (isDownbeat) {
        freq = 2400; // 2.4kHz high downbeat accent
        gainVal = 0.90;
        duration = 0.038 * tempoScale;
      } else if (isQuarterBeat) {
        freq = 1600; // 1.6kHz on-beat pulse
        gainVal = 0.65;
        duration = 0.026 * tempoScale;
      }

      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(gainVal, time + 0.0015);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(time);
      osc.stop(time + duration + 0.004);
    } else {
      // Sound 1: Woodblock (Warm acoustic wood percussion with boosted 2.0kHz transient accent)
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      let startFreq = 700;
      let endFreq = 300;
      let gainVal = 0.28;
      let duration = 0.020 * tempoScale;

      if (isDownbeat) {
        startFreq = 2000;
        endFreq = 500;
        gainVal = 0.95;
        duration = 0.040 * tempoScale;
      } else if (isQuarterBeat) {
        startFreq = 1100;
        endFreq = 380;
        gainVal = 0.68;
        duration = 0.028 * tempoScale;
      }

      osc.frequency.setValueAtTime(startFreq, time);
      osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration * 0.75);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(gainVal, time + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(time);
      osc.stop(time + duration + 0.004);
    }
  }
}
