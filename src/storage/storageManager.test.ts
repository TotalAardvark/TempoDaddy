import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { storageManager, toLocalDateKey } from './storageManager';
import type { Skill, Playlist, PracticeSessionLog } from '../types';

describe('storageManager', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    const localStorageMock = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size;
      },
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('toLocalDateKey', () => {
    it('formats a date into YYYY-MM-DD local format', () => {
      const d = new Date(2026, 4, 15); // May 15, 2026
      expect(toLocalDateKey(d)).toBe('2026-05-15');
    });

    it('preserves existing YYYY-MM-DD string', () => {
      expect(toLocalDateKey('2026-11-09')).toBe('2026-11-09');
    });
  });

  describe('calculateStreak', () => {
    it('returns 0 when no practice sessions exist', () => {
      storageManager.saveSessions([]);
      expect(storageManager.calculateStreak()).toBe(0);
    });

    it('returns 0 when last practice was more than 1 day ago', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));

      const sessions: PracticeSessionLog[] = [
        {
          id: 's1',
          skillId: 'sk1',
          date: '2026-05-08T10:00:00Z', // 2 days ago
          bpm: 100,
          durationSeconds: 120,
          isPersonalBest: false,
        },
      ];
      storageManager.saveSessions(sessions);
      expect(storageManager.calculateStreak()).toBe(0);
    });

    it('calculates active streak starting from yesterday when not yet practiced today', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));

      const sessions: PracticeSessionLog[] = [
        { id: 's1', skillId: 'sk1', date: '2026-05-09T10:00:00Z', bpm: 100, durationSeconds: 60, isPersonalBest: false }, // yesterday
        { id: 's2', skillId: 'sk1', date: '2026-05-08T10:00:00Z', bpm: 100, durationSeconds: 60, isPersonalBest: false }, // 2 days ago
      ];
      storageManager.saveSessions(sessions);
      expect(storageManager.calculateStreak()).toBe(2);
    });

    it('calculates active streak including today across consecutive days', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));

      const sessions: PracticeSessionLog[] = [
        { id: 's1', skillId: 'sk1', date: '2026-05-10T09:00:00Z', bpm: 100, durationSeconds: 60, isPersonalBest: false }, // today
        { id: 's2', skillId: 'sk1', date: '2026-05-09T10:00:00Z', bpm: 100, durationSeconds: 60, isPersonalBest: false }, // yesterday
        { id: 's3', skillId: 'sk1', date: '2026-05-08T10:00:00Z', bpm: 100, durationSeconds: 60, isPersonalBest: false }, // 2 days ago
        { id: 's4', skillId: 'sk1', date: '2026-05-07T10:00:00Z', bpm: 100, durationSeconds: 60, isPersonalBest: false }, // 3 days ago
      ];
      storageManager.saveSessions(sessions);
      expect(storageManager.calculateStreak()).toBe(4);
    });

    it('breaks streak calculation when a day in the sequence was missed', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));

      const sessions: PracticeSessionLog[] = [
        { id: 's1', skillId: 'sk1', date: '2026-05-10T09:00:00Z', bpm: 100, durationSeconds: 60, isPersonalBest: false }, // today
        { id: 's2', skillId: 'sk1', date: '2026-05-09T10:00:00Z', bpm: 100, durationSeconds: 60, isPersonalBest: false }, // yesterday
        // missing 2026-05-08
        { id: 's3', skillId: 'sk1', date: '2026-05-07T10:00:00Z', bpm: 100, durationSeconds: 60, isPersonalBest: false },
      ];
      storageManager.saveSessions(sessions);
      expect(storageManager.calculateStreak()).toBe(2);
    });
  });

  describe('orphan rescue and playlist reconciliation', () => {
    it('rescues orphaned skills by appending them to the active playlist', () => {
      const skills: Skill[] = [
        {
          id: 'sk_in_playlist',
          title: 'Skill 1',
          category: 'drumming',
          subdivision: '1/16',
          isTriplet: false,
          personalBestBpm: 100,
          order: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          isHibernated: false,
        },
        {
          id: 'sk_orphaned',
          title: 'Orphan Skill',
          category: 'drumming',
          subdivision: '1/16',
          isTriplet: false,
          personalBestBpm: 100,
          order: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          isHibernated: false,
        },
      ];
      storageManager.saveSkills(skills);

      const playlist: Playlist = {
        id: 'pl_main',
        name: 'Main Routine',
        skillIds: ['sk_in_playlist'],
        createdAt: '2026-01-01T00:00:00.000Z',
        lastPlayedAt: '2026-01-01T00:00:00.000Z',
      };
      storageManager.savePlaylists([playlist]);
      storageManager.setActivePlaylistId('pl_main');

      const reconciledPlaylists = storageManager.getPlaylists();
      const mainPl = reconciledPlaylists.find((p) => p.id === 'pl_main');
      expect(mainPl?.skillIds).toContain('sk_orphaned');
      expect(mainPl?.skillIds).toContain('sk_in_playlist');
    });

    it('cleans up dangling skill IDs that no longer exist in skills table', () => {
      const skills: Skill[] = [
        {
          id: 'sk_valid',
          title: 'Valid Skill',
          category: 'drumming',
          subdivision: '1/16',
          isTriplet: false,
          personalBestBpm: 100,
          order: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          isHibernated: false,
        },
      ];
      storageManager.saveSkills(skills);

      const playlist: Playlist = {
        id: 'pl_main',
        name: 'Main Routine',
        skillIds: ['sk_valid', 'sk_deleted_one', 'sk_deleted_two'],
        createdAt: '2026-01-01T00:00:00.000Z',
        lastPlayedAt: '2026-01-01T00:00:00.000Z',
      };
      storageManager.savePlaylists([playlist]);

      const reconciled = storageManager.getPlaylists();
      expect(reconciled[0].skillIds).toEqual(['sk_valid']);
    });
  });

  describe('JSON export and import', () => {
    it('exports all stored data and imports it cleanly', () => {
      const testSkills: Skill[] = [
        {
          id: 'sk_test',
          title: 'Paradiddle',
          category: 'drumming',
          subdivision: '1/16',
          isTriplet: false,
          personalBestBpm: 125,
          order: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          isHibernated: false,
        },
      ];
      const testPlaylists: Playlist[] = [
        {
          id: 'pl_test',
          name: 'My Routine',
          skillIds: ['sk_test'],
          createdAt: '2026-01-01T00:00:00.000Z',
          lastPlayedAt: '2026-01-01T00:00:00.000Z',
        },
      ];
      const testSessions: PracticeSessionLog[] = [
        {
          id: 'sess_1',
          skillId: 'sk_test',
          date: '2026-01-01T10:00:00.000Z',
          bpm: 125,
          durationSeconds: 180,
          isPersonalBest: true,
        },
      ];

      storageManager.saveSkills(testSkills);
      storageManager.savePlaylists(testPlaylists);
      storageManager.setActivePlaylistId('pl_test');
      storageManager.saveSessions(testSessions);
      storageManager.saveMetronomeTimbre('loud');
      storageManager.saveTempoRampSettings({
        startPercent: 75,
        targetPercent: 95,
        measures: 24,
        enabled: true,
      });

      const jsonStr = storageManager.exportDataJson();
      expect(typeof jsonStr).toBe('string');
      const parsed = JSON.parse(jsonStr);
      expect(parsed.skills).toHaveLength(1);
      expect(parsed.playlists).toHaveLength(1);
      expect(parsed.timbre).toBe('loud');

      // Clear local store
      store.clear();

      // Import back
      const success = storageManager.importDataJson(jsonStr);
      expect(success).toBe(true);

      expect(storageManager.getSkills()).toEqual(testSkills);
      expect(storageManager.getPlaylists()[0].id).toBe('pl_test');
      expect(storageManager.getActivePlaylistId()).toBe('pl_test');
      expect(storageManager.getSessions()).toEqual(testSessions);
      expect(storageManager.getMetronomeTimbre()).toBe('loud');
      expect(storageManager.getTempoRampSettings()).toEqual({
        startPercent: 75,
        targetPercent: 95,
        measures: 24,
        enabled: true,
      });
    });

    it('returns false when importing invalid JSON string', () => {
      const result = storageManager.importDataJson('not-a-valid-json{{{');
      expect(result).toBe(false);
    });
  });

  describe('addSession and personal best detection', () => {
    it('updates skill personalBestBpm and marks isNewPb when BPM is higher', () => {
      const skills: Skill[] = [
        {
          id: 'sk_pb',
          title: 'Skill PB',
          category: 'drumming',
          subdivision: '1/16',
          isTriplet: false,
          personalBestBpm: 100,
          order: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          isHibernated: false,
        },
      ];
      storageManager.saveSkills(skills);

      const res = storageManager.addSession({
        id: 's_new',
        skillId: 'sk_pb',
        date: new Date().toISOString(),
        bpm: 110,
        durationSeconds: 120,
        isPersonalBest: false,
      });

      expect(res.isNewPb).toBe(true);
      const updatedSkills = storageManager.getSkills();
      expect(updatedSkills[0].personalBestBpm).toBe(110);
    });

    it('does not mark isNewPb when BPM is strictly equal to current personal best (equal score rule)', () => {
      const skills: Skill[] = [
        {
          id: 'sk_pb',
          title: 'Skill PB',
          category: 'drumming',
          subdivision: '1/16',
          isTriplet: false,
          personalBestBpm: 100,
          order: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          isHibernated: false,
        },
      ];
      storageManager.saveSkills(skills);

      const session: PracticeSessionLog = {
        id: 's_equal',
        skillId: 'sk_pb',
        date: new Date().toISOString(),
        bpm: 100, // Exact match
        durationSeconds: 120,
        isPersonalBest: false,
      };

      const res = storageManager.addSession(session);

      expect(res.isNewPb).toBe(false);
      expect(session.isPersonalBest).toBe(false);
      const updatedSkills = storageManager.getSkills();
      expect(updatedSkills[0].personalBestBpm).toBe(100);
    });

    it('does not mark isNewPb or lower existing baseline PB when first session is at reduced warmup tempo', () => {
      const skills: Skill[] = [
        {
          id: 'sk_baseline',
          title: 'Preset Rudiment',
          category: 'drumming',
          subdivision: '1/16',
          isTriplet: false,
          personalBestBpm: 120, // Preset baseline PB
          order: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          isHibernated: false,
        },
      ];
      storageManager.saveSkills(skills);

      // First ever practice run at 80% warmup tempo (96 BPM)
      const session: PracticeSessionLog = {
        id: 's_warmup',
        skillId: 'sk_baseline',
        date: new Date().toISOString(),
        bpm: 96,
        durationSeconds: 120,
        isPersonalBest: false,
      };

      const res = storageManager.addSession(session);

      expect(res.isNewPb).toBe(false);
      expect(session.isPersonalBest).toBe(false);
      const updatedSkills = storageManager.getSkills();
      // Baseline 120 BPM must remain intact
      expect(updatedSkills[0].personalBestBpm).toBe(120);
    });
  });
});
