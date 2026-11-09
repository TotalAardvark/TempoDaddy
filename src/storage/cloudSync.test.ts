import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getStoredProfileId,
  setStoredProfileId,
  getLastSyncedAt,
  loadCloudProfile,
  syncLocalToCloud,
  triggerDebouncedCloudSync,
  hasPendingSync,
  unlinkCloudProfile,
  cancelPendingSync,
} from './cloudSync';
import { storageManager } from './storageManager';
import type { Skill } from '../types';

// Mock external Firebase network boundary only (I/O boundary per rules)
const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockDoc = vi.fn((...args: unknown[]) => ({ path: `${args[1]}/${args[2]}`, id: args[2] }));
const mockSignOut = vi.fn().mockResolvedValue(undefined);
const mockSignInWithEmailAndPassword = vi.fn().mockResolvedValue({ user: { uid: 'uid_123', email: 'test-code@tempodaddy.app' } });
const mockAuthStateReady = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

vi.mock('./firebase', () => ({
  getDb: () => ({}),
  getFirebaseAuth: () => ({
    currentUser: { uid: 'uid_123', email: 'test-code@tempodaddy.app' },
    authStateReady: () => mockAuthStateReady(),
  }),
}));

describe('cloudSync', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.resetAllMocks();
    cancelPendingSync();
    mockSignOut.mockResolvedValue(undefined);
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: { uid: 'uid_123', email: 'test-code@tempodaddy.app' } });
    mockAuthStateReady.mockResolvedValue(undefined);

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

  describe('Profile ID persistence', () => {
    it('stores, normalizes to lowercase, and retrieves profile ID', () => {
      expect(getStoredProfileId()).toBeNull();
      setStoredProfileId('  GOLD-TIGER  ');
      expect(getStoredProfileId()).toBe('gold-tiger');
    });

    it('removes stored profile ID when set to null', () => {
      setStoredProfileId('gold-tiger');
      expect(getStoredProfileId()).toBe('gold-tiger');
      setStoredProfileId(null);
      expect(getStoredProfileId()).toBeNull();
    });

    it('returns null initially and retrieves stored last synced timestamp', () => {
      expect(getLastSyncedAt()).toBeNull();
      store.set('tempo_coach_last_synced_at', '2026-11-09T12:00:00.000Z');
      expect(getLastSyncedAt()).toBe('2026-11-09T12:00:00.000Z');
    });
  });

  describe('Unsynced changes reload persistence', () => {
    it('persists unsynced local changes flag in localStorage and detects pending sync across reloads', () => {
      setStoredProfileId('gold-tiger');
      storageManager.setHasUnsyncedChanges(false);
      expect(hasPendingSync()).toBe(false);

      // Simulating a local skill edit
      storageManager.markLocalChange();
      expect(storageManager.getHasUnsyncedChanges()).toBe(true);
      expect(hasPendingSync()).toBe(true);

      // Verify it was stored in localStorage under 'tempo_coach_has_unsynced_changes'
      expect(store.get('tempo_coach_has_unsynced_changes')).toBe('true');

      // Simulate app reload by reading from localStorage again
      expect(storageManager.getHasUnsyncedChanges()).toBe(true);
      expect(hasPendingSync()).toBe(true);
    });

    it('triggerDebouncedCloudSync immediately sets unsynced changes flag before timer fires', () => {
      vi.useFakeTimers();
      setStoredProfileId('gold-tiger');
      storageManager.setHasUnsyncedChanges(false);

      triggerDebouncedCloudSync(2000);
      expect(storageManager.getHasUnsyncedChanges()).toBe(true);
      expect(hasPendingSync()).toBe(true);
    });
  });

  describe('Last-Write-Wins conflict resolution in loadCloudProfile', () => {
    it('skips overwriting local data when onlyIfNewer is true and local changes are unsynced', async () => {
      setStoredProfileId('test-code');
      storageManager.setHasUnsyncedChanges(true);

      const res = await loadCloudProfile('test-code', { onlyIfNewer: true });
      expect(res.success).toBe(true);
      expect(res.unchanged).toBe(true);
      expect(mockGetDoc).not.toHaveBeenCalled();
    });

    it('skips overwriting local data when onlyIfNewer is true and cloud updatedAt <= localModified', async () => {
      setStoredProfileId('test-code');
      storageManager.setHasUnsyncedChanges(false);
      storageManager.touchLocalModifiedAt('2026-11-09T12:00:00.000Z');

      // Cloud document has older or equal timestamp
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          ownerUid: 'uid_123',
          updatedAt: '2026-11-09T11:00:00.000Z', // older
          skills: [],
        }),
      });

      const res = await loadCloudProfile('test-code', { onlyIfNewer: true });
      expect(res.success).toBe(true);
      expect(res.unchanged).toBe(true);
    });

    it('loads and overwrites local data when cloud updatedAt is strictly newer than localModified', async () => {
      setStoredProfileId('test-code');
      storageManager.setHasUnsyncedChanges(false);
      storageManager.touchLocalModifiedAt('2026-11-09T08:00:00.000Z');

      const cloudSkills: Skill[] = [
        {
          id: 'sk_cloud',
          title: 'Cloud Rudiment',
          category: 'drumming',
          subdivision: '1/16',
          isTriplet: false,
          personalBestBpm: 150,
          order: 0,
          createdAt: '2026-11-09T00:00:00.000Z',
        },
      ];

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          ownerUid: 'uid_123',
          updatedAt: '2026-11-09T09:00:00.000Z', // strictly newer
          skills: cloudSkills,
          playlists: [],
          sessions: [],
        }),
      });

      const res = await loadCloudProfile('test-code', { onlyIfNewer: true });
      expect(res.success).toBe(true);
      expect(res.unchanged).toBe(false);

      const localSkills = storageManager.getSkills();
      expect(localSkills.some((s) => s.id === 'sk_cloud')).toBe(true);
      expect(storageManager.getLocalModifiedAt()).toBe('2026-11-09T09:00:00.000Z');
      expect(storageManager.getHasUnsyncedChanges()).toBe(false);
    });
  });

  describe('Concurrency queueing in syncLocalToCloud', () => {
    it('queues a subsequent sync call when a sync is already in flight', async () => {
      setStoredProfileId('test-code');
      storageManager.setHasUnsyncedChanges(true);

      let resolveFirstDoc: () => void;
      const firstDocPromise = new Promise<void>((resolve) => {
        resolveFirstDoc = resolve;
      });

      let callCount = 0;
      mockSetDoc.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return firstDocPromise;
        }
        return Promise.resolve();
      });

      // Launch first sync (will remain in-flight)
      const firstSyncPromise = syncLocalToCloud();

      // Launch second sync while first is in-flight -> should queue and return queued promise
      const secondSyncPromise = syncLocalToCloud();
      expect(callCount).toBe(1);

      // Resolve the first in-flight sync
      resolveFirstDoc!();
      await firstSyncPromise;

      // Await second sync completion
      const secondSyncRes = await secondSyncPromise;
      expect(secondSyncRes.success).toBe(true);

      // The queued sync must have executed
      expect(callCount).toBe(2);
      expect(storageManager.getHasUnsyncedChanges()).toBe(false);
    });
  });

  describe('unlinkCloudProfile', () => {
    it('clears stored profile ID, clears unsynced changes, and signs out of Firebase Auth', async () => {
      setStoredProfileId('test-code');
      storageManager.setHasUnsyncedChanges(true);

      await unlinkCloudProfile();

      expect(getStoredProfileId()).toBeNull();
      expect(storageManager.getHasUnsyncedChanges()).toBe(false);
      expect(mockSignOut).toHaveBeenCalled();
    });
  });
});
