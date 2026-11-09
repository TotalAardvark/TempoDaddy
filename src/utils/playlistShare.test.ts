import { describe, it, expect, vi } from 'vitest';
import {
  encodePlaylistToHash,
  decodePlaylistFromHash,
  generatePlaylistShareUrl,
  getUniquePlaylistName,
} from './playlistShare';
import type { Playlist, Skill } from '../types';

describe('playlistShare', () => {
  const mockSkills: Skill[] = [
    {
      id: 'skill_1',
      title: 'Single Paradiddle',
      category: 'drumming',
      sticking: 'R l r r   L r l l',
      subdivision: '1/16',
      isTriplet: false,
      personalBestBpm: 120,
      order: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      notes: 'Keep accents crisp',
      isHibernated: false,
    },
    {
      id: 'skill_2',
      title: 'Triplet Roll',
      category: 'general',
      sticking: 'R L R L R L',
      subdivision: '1/8',
      isTriplet: true,
      personalBestBpm: 90,
      order: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      isHibernated: false,
    },
  ];

  const mockPlaylist: Playlist = {
    id: 'pl_123',
    name: 'Hands Warmup',
    skillIds: ['skill_1', 'skill_2', 'non_existent_skill'],
    createdAt: '2026-01-01T00:00:00.000Z',
    lastPlayedAt: '2026-01-01T00:00:00.000Z',
  };

  describe('encode and decode roundtrip', () => {
    it('encodes playlist to compressed hash and decodes back with preserved properties', () => {
      const hash = encodePlaylistToHash(mockPlaylist, mockSkills);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);

      const decoded = decodePlaylistFromHash(hash);
      expect(decoded).not.toBeNull();
      expect(decoded?.v).toBe(1);
      expect(decoded?.name).toBe('Hands Warmup');
      expect(decoded?.skills).toHaveLength(2); // non-existent skill skipped

      expect(decoded?.skills[0]).toEqual({
        t: 'Single Paradiddle',
        c: 'drumming',
        s: 'R l r r   L r l l',
        d: '1/16',
        tr: undefined,
        n: 'Keep accents crisp',
      });

      expect(decoded?.skills[1]).toEqual({
        t: 'Triplet Roll',
        c: 'general',
        s: 'R L R L R L',
        d: '1/8',
        tr: 1,
        n: undefined,
      });
    });

    it('decodes payload with # or #import= prefix properly', () => {
      const hash = encodePlaylistToHash(mockPlaylist, mockSkills);
      const decodedFromHash = decodePlaylistFromHash(`#${hash}`);
      const decodedFromImport = decodePlaylistFromHash(`#import=${hash}`);
      const decodedFromBareImport = decodePlaylistFromHash(`import=${hash}`);

      expect(decodedFromHash?.name).toBe('Hands Warmup');
      expect(decodedFromImport?.name).toBe('Hands Warmup');
      expect(decodedFromBareImport?.name).toBe('Hands Warmup');
    });

    it('returns null on invalid or corrupt input', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(decodePlaylistFromHash('')).toBeNull();
      expect(decodePlaylistFromHash('#import=invalid-base64-payload!!!')).toBeNull();
      expect(decodePlaylistFromHash('not_a_valid_gzip_payload')).toBeNull();
      consoleSpy.mockRestore();
    });

    it('generates a full share URL containing #import=', () => {
      const url = generatePlaylistShareUrl(mockPlaylist, mockSkills);
      expect(url).toContain('#import=');
      expect(url.startsWith('https://')).toBe(true);

      const hashPart = url.split('#import=')[1];
      const decoded = decodePlaylistFromHash(hashPart);
      expect(decoded?.name).toBe('Hands Warmup');
    });
  });

  describe('getUniquePlaylistName', () => {
    it('returns unchanged name when no collision exists', () => {
      expect(getUniquePlaylistName('Cool Routine', ['Other Routine', 'Morning Session'])).toBe(
        'Cool Routine'
      );
    });

    it('appends (2) when exact name already exists', () => {
      expect(getUniquePlaylistName('Routine', ['routine'])).toBe('Routine (2)');
    });

    it('increments counter sequentially past existing (2), (3)', () => {
      expect(
        getUniquePlaylistName('Routine', ['Routine', 'Routine (2)', 'Routine (3)'])
      ).toBe('Routine (4)');
    });

    it('handles base names that already contain parentheses', () => {
      expect(getUniquePlaylistName('Routine (2)', ['Routine (2)'])).toBe('Routine (3)');
    });

    it('falls back to default name when empty', () => {
      expect(getUniquePlaylistName('   ', [])).toBe('New Routine');
    });
  });
});
