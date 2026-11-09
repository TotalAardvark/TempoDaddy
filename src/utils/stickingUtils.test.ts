import { describe, it, expect } from 'vitest';
import { invertSticking, invertTitle } from './stickingUtils';

describe('stickingUtils', () => {
  describe('invertSticking', () => {
    it('swaps uppercase accents and lowercase strokes correctly', () => {
      expect(invertSticking('R l r r   L r l l')).toBe('L r l l   R l r r');
      expect(invertSticking('R l l r r L')).toBe('L r r l l R');
    });

    it('preserves spaces, punctuation, numbers, and other non-hand characters', () => {
      expect(invertSticking('R-1  l-2 > R')).toBe('L-1  r-2 > L');
      expect(invertSticking('')).toBe('');
    });

    it('double inversion returns original sticking', () => {
      const original = 'R l r r L r l l R r l r L l r l';
      expect(invertSticking(invertSticking(original))).toBe(original);
    });
  });

  describe('invertTitle', () => {
    it('appends (Left) when title starts with R/r', () => {
      expect(invertTitle('Right Hand Lead')).toBe('Right Hand Lead (Left)');
      expect(invertTitle('rudiment')).toBe('rudiment (Left)');
    });

    it('appends (Right) when title starts with L/l', () => {
      expect(invertTitle('Left Hand Lead')).toBe('Left Hand Lead (Right)');
      expect(invertTitle('linear fill')).toBe('linear fill (Right)');
    });

    it('swaps existing (Left) and (Right) suffixes cleanly', () => {
      expect(invertTitle('Single Paradiddle (Left)')).toBe('Single Paradiddle (Right)');
      expect(invertTitle('Single Paradiddle (Right)')).toBe('Single Paradiddle (Left)');
    });

    it('swaps existing (L) and (R) suffixes to (Right) and (Left)', () => {
      expect(invertTitle('Flam Tap (L)')).toBe('Flam Tap (Right)');
      expect(invertTitle('Flam Tap (R)')).toBe('Flam Tap (Left)');
    });

    it('falls back to (Inverted) when title starts with non-R/L letter', () => {
      expect(invertTitle('Paradiddle-diddle')).toBe('Paradiddle-diddle (Inverted)');
      expect(invertTitle('Double Stroke Roll')).toBe('Double Stroke Roll (Inverted)');
    });

    it('handles empty or whitespace-only titles safely', () => {
      expect(invertTitle('')).toBe('');
      expect(invertTitle('   ')).toBe('   ');
    });
  });
});
