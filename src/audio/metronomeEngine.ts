import type { Subdivision } from '../types';

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

  private currentTick: number = 0;
  private nextTickTime: number = 0;
  private timerId: number | null = null;
  private lookaheadMs: number = 25; // How often to check for upcoming notes (ms)
  private scheduleAheadTime: number = 0.1; // How far ahead to schedule audio (seconds)

  private onTickCallback: ((event: MetronomeTickEvent) => void) | null = null;

  constructor(bpm = 100, subdivision: Subdivision = '1/16', isTriplet = false) {
    this.bpm = bpm;
    this.subdivision = subdivision;
    this.isTriplet = isTriplet;
  }

  public setOnTick(callback: (event: MetronomeTickEvent) => void) {
    this.onTickCallback = callback;
  }

  public async unlockAudio(): Promise<boolean> {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    return this.audioCtx.state === 'running';
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

    // Synthesize woodblock/click
    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    if (isDownbeat) {
      // High accented downbeat
      osc.frequency.setValueAtTime(1200, time);
      osc.frequency.exponentialRampToValueAtTime(400, time + 0.035);
      gainNode.gain.setValueAtTime(0.9, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
      osc.start(time);
      osc.stop(time + 0.045);
    } else if (isQuarterBeat) {
      // Standard quarter beat click
      osc.frequency.setValueAtTime(850, time);
      osc.frequency.exponentialRampToValueAtTime(320, time + 0.025);
      gainNode.gain.setValueAtTime(0.65, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
      osc.start(time);
      osc.stop(time + 0.035);
    } else {
      // Subtle subdivision tick
      osc.frequency.setValueAtTime(600, time);
      osc.frequency.exponentialRampToValueAtTime(260, time + 0.015);
      gainNode.gain.setValueAtTime(0.28, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
      osc.start(time);
      osc.stop(time + 0.025);
    }

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
}
