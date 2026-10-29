/**
 * Utility functions for inverting drumming sticking patterns and exercise titles.
 */

/**
 * Inverts sticking notation:
 * - Swaps 'R' <-> 'L' (preserving uppercase accents)
 * - Swaps 'r' <-> 'l' (preserving lowercase)
 * - Leaves spaces, punctuation, numbers, and other characters intact
 */
export function invertSticking(sticking: string): string {
  return sticking.replace(/[rRlL]/g, (char) => {
    switch (char) {
      case 'R':
        return 'L';
      case 'r':
        return 'l';
      case 'L':
        return 'R';
      case 'l':
        return 'r';
      default:
        return char;
    }
  });
}

/**
 * Updates exercise title when inverting sticking:
 * - If original skill starts with R or r, adds " (Left)"
 * - If original skill starts with L or l, adds " (Right)"
 * - If title already has (Left) / (Right) or (L) / (R), swaps them cleanly
 */
export function invertTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return title;

  // If already tagged with (Left) or (Right), swap them
  if (/\s*\(Left\)$/i.test(trimmed)) {
    return trimmed.replace(/\s*\(Left\)$/i, ' (Right)');
  }
  if (/\s*\(Right\)$/i.test(trimmed)) {
    return trimmed.replace(/\s*\(Right\)$/i, ' (Left)');
  }

  // If tagged with (L) or (R), replace with (Right) or (Left)
  if (/\s*\(L\)$/i.test(trimmed)) {
    return trimmed.replace(/\s*\(L\)$/i, ' (Right)');
  }
  if (/\s*\(R\)$/i.test(trimmed)) {
    return trimmed.replace(/\s*\(R\)$/i, ' (Left)');
  }

  // Check the first letter of the title
  const firstLetter = trimmed.charAt(0);
  if (firstLetter === 'R' || firstLetter === 'r') {
    return `${trimmed} (Left)`;
  }
  if (firstLetter === 'L' || firstLetter === 'l') {
    return `${trimmed} (Right)`;
  }

  // Fallback if title does not start with R or L
  return `${trimmed} (Inverted)`;
}
