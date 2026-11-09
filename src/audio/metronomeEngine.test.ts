import { describe, it, expect } from 'vitest';
import { MetronomeEngine } from './metronomeEngine';
import { MIN_BPM, MAX_BPM } from '../types';

describe('MetronomeEngine', () => {
  describe('BPM clamping and rounding', () => {
    it('clamps BPM below MIN_BPM up to MIN_BPM', () => {
      const engine = new MetronomeEngine(100);
      engine.setBpm(10);
      expect(engine.getBpm()).toBe(MIN_BPM);
    });

    it('clamps BPM above MAX_BPM down to MAX_BPM', () => {
      const engine = new MetronomeEngine(100);
      engine.setBpm(999);
      expect(engine.getBpm()).toBe(MAX_BPM);
    });

    it('rounds floating-point BPM to nearest integer', () => {
      const engine = new MetronomeEngine(100);
      engine.setBpm(115.4);
      expect(engine.getBpm()).toBe(115);
      engine.setBpm(115.6);
      expect(engine.getBpm()).toBe(116);
    });

    it('retains valid in-range BPM values', () => {
      const engine = new MetronomeEngine(100);
      engine.setBpm(144);
      expect(engine.getBpm()).toBe(144);
    });
  });

  describe('Subdivision tick math', () => {
    it('calculates straight subdivisions per beat correctly', () => {
      const engine = new MetronomeEngine(100, '1/4', false);
      expect(engine.getSubdivisionsPerBeat()).toBe(1);

      engine.setSubdivision('1/8', false);
      expect(engine.getSubdivisionsPerBeat()).toBe(2);

      engine.setSubdivision('1/16', false);
      expect(engine.getSubdivisionsPerBeat()).toBe(4);
    });

    it('calculates triplet subdivisions per beat correctly', () => {
      const engine = new MetronomeEngine(100, '1/4', true);
      expect(engine.getSubdivisionsPerBeat()).toBe(3);

      engine.setSubdivision('1/8', true);
      expect(engine.getSubdivisionsPerBeat()).toBe(3);

      engine.setSubdivision('1/16', true);
      expect(engine.getSubdivisionsPerBeat()).toBe(6); // Sextuplet
    });

    it('calculates total ticks per measure (4 beats per measure) accurately', () => {
      const engine = new MetronomeEngine(100, '1/4', false);
      expect(engine.getTotalTicksPerMeasure()).toBe(4);

      engine.setSubdivision('1/8', false);
      expect(engine.getTotalTicksPerMeasure()).toBe(8);

      engine.setSubdivision('1/16', false);
      expect(engine.getTotalTicksPerMeasure()).toBe(16);

      engine.setSubdivision('1/4', true);
      expect(engine.getTotalTicksPerMeasure()).toBe(12);

      engine.setSubdivision('1/8', true);
      expect(engine.getTotalTicksPerMeasure()).toBe(12);

      engine.setSubdivision('1/16', true);
      expect(engine.getTotalTicksPerMeasure()).toBe(24);
    });
    it('does not rewind to downbeat tick 0 when switching subdivisions mid-measure', () => {
      const engine = new MetronomeEngine(100, '1/16', false);
      // Simulate advanceTick having moved to tick 1 (right after downbeat 0 was scheduled)
      // We access private property via bracket notation for unit testing internal state
      (engine as unknown as { currentTick: number }).currentTick = 1;
      engine.setSubdivision('1/8', false);
      // It should not rewind to 0 (which would cause a duplicate downbeat)
      expect((engine as unknown as { currentTick: number }).currentTick).toBeGreaterThan(0);
    });
  });

  describe('Timbre configuration', () => {
    it('sets and retrieves metronome timbre', () => {
      const engine = new MetronomeEngine(100, '1/16', false, 'woodblock');
      expect(engine.getTimbre()).toBe('woodblock');

      engine.setTimbre('loud');
      expect(engine.getTimbre()).toBe('loud');

      engine.setTimbre('beep');
      expect(engine.getTimbre()).toBe('beep');
    });
  });
});
