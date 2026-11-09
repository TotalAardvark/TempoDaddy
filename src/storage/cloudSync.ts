import { doc, getDoc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getDb, getFirebaseAuth } from './firebase';
import { generateWordCode } from './wordList';
import {
  storageManager,
  DEFAULT_PLAYLIST_NAME,
  sanitizeSkill,
  sanitizePlaylist,
  sanitizeSession,
  sanitizeTempoRampSettings,
  sanitizeTimbre,
} from './storageManager';
import type { Skill, Playlist, PracticeSessionLog, TempoRampSettings, MetronomeTimbre } from '../types';

const PROFILE_ID_KEY = 'tempo_coach_profile_id';
const LAST_SYNCED_KEY = 'tempo_coach_last_synced_at';

interface CloudProfileData {
  ownerUid: string;
  skills: Skill[];
  playlists?: Playlist[];
  activePlaylistId?: string;
  sessions: PracticeSessionLog[];
  tempoRampSettings?: TempoRampSettings;
  timbre?: MetronomeTimbre;
  updatedAt: string;
  createdAt?: string;
}

export function getStoredProfileId(): string | null {
  try {
    return localStorage.getItem(PROFILE_ID_KEY);
  } catch {
    return null;
  }
}

export function setStoredProfileId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(PROFILE_ID_KEY, id.toLowerCase().trim());
    } else {
      localStorage.removeItem(PROFILE_ID_KEY);
    }
  } catch (e) {
    console.error('Failed to store profile ID', e);
  }
}

export function getLastSyncedAt(): string | null {
  try {
    return localStorage.getItem(LAST_SYNCED_KEY);
  } catch {
    return null;
  }
}

function setLastSyncedAt(timestamp: string): void {
  try {
    localStorage.setItem(LAST_SYNCED_KEY, timestamp);
  } catch (e) {
    console.error('Failed to store last synced time', e);
  }
}

/**
 * Formats a Firebase or general error into a friendly, actionable message.
 */
function getFriendlyErrorMessage(err: unknown, fallback: string): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'You appear to be offline. Please check your internet connection.';
  }
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = String((err as { code: string }).code);
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
      return 'Invalid profile code or password.';
    }
    if (code === 'auth/user-not-found') {
      return 'Profile was not found.';
    }
    if (code === 'auth/weak-password') {
      return 'Password must be at least 6 characters.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'This profile code is already taken. Please try again.';
    }
    if (code === 'unavailable' || code.includes('network') || code.includes('offline')) {
      return 'Unable to reach Firebase. Please check your internet connection.';
    }
    if (code === 'permission-denied') {
      return 'Permission denied. Please verify your profile code and password.';
    }
    if (code === 'invalid-argument') {
      return 'Invalid profile code format.';
    }
  }
  if (err instanceof Error) {
    if (err.message.includes('offline') || err.message.includes('network') || err.message.includes('Failed to fetch')) {
      return 'Network error: could not connect to Firebase. Check your internet connection.';
    }
    return err.message;
  }
  return fallback;
}

/**
 * Creates a new cloud profile with a unique 2-word code and pushes current local state.
 */
export async function createCloudProfile(password: string): Promise<{ success: boolean; profileId?: string; error?: string }> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, error: 'You are offline. Connect to the internet to back up to the cloud.' };
    }

    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const auth = getFirebaseAuth();
    const db = getDb();
    let uniqueCode = '';
    let ownerUid = '';
    let attempts = 0;

    // Find an unused 2-word code and create the Firebase Auth user atomically
    while (attempts < 5) {
      const candidate = generateWordCode();
      try {
        const userCred = await createUserWithEmailAndPassword(auth, `${candidate}@tempodaddy.app`, password);
        uniqueCode = candidate;
        ownerUid = userCred.user.uid;
        break;
      } catch (authErr: unknown) {
        if (
          typeof authErr === 'object' &&
          authErr !== null &&
          'code' in authErr &&
          (authErr as { code: string }).code === 'auth/email-already-in-use'
        ) {
          attempts++;
          continue;
        }
        throw authErr;
      }
    }

    if (!uniqueCode || !ownerUid) {
      return { success: false, error: 'Could not generate a unique code. Please try again.' };
    }

    const now = new Date().toISOString();
    const data: CloudProfileData = {
      ownerUid,
      skills: storageManager.getSkills(),
      playlists: storageManager.getPlaylists(),
      activePlaylistId: storageManager.getActivePlaylistId(),
      sessions: storageManager.getSessions(),
      tempoRampSettings: storageManager.getTempoRampSettings(),
      timbre: storageManager.getMetronomeTimbre(),
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'profiles', uniqueCode), data);
    setStoredProfileId(uniqueCode);
    setLastSyncedAt(now);
    storageManager.touchLocalModifiedAt(now);
    storageManager.setHasUnsyncedChanges(false);

    return { success: true, profileId: uniqueCode };
  } catch (err: unknown) {
    console.error('Error creating cloud profile:', err);
    return { success: false, error: getFriendlyErrorMessage(err, 'Failed to create cloud profile.') };
  }
}

/**
 * Creates a brand new empty cloud profile (no skills in queue, fresh state)
 * and links this device to it.
 */
export async function createEmptyCloudProfile(password: string): Promise<{ success: boolean; profileId?: string; error?: string }> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, error: 'You are offline. Connect to the internet to create a profile.' };
    }

    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const auth = getFirebaseAuth();
    const db = getDb();
    let uniqueCode = '';
    let ownerUid = '';
    let attempts = 0;

    // Find an unused 2-word code and create the Firebase Auth user atomically
    while (attempts < 5) {
      const candidate = generateWordCode();
      try {
        const userCred = await createUserWithEmailAndPassword(auth, `${candidate}@tempodaddy.app`, password);
        uniqueCode = candidate;
        ownerUid = userCred.user.uid;
        break;
      } catch (authErr: unknown) {
        if (
          typeof authErr === 'object' &&
          authErr !== null &&
          'code' in authErr &&
          (authErr as { code: string }).code === 'auth/email-already-in-use'
        ) {
          attempts++;
          continue;
        }
        throw authErr;
      }
    }

    if (!uniqueCode || !ownerUid) {
      return { success: false, error: 'Could not generate a unique code. Please try again.' };
    }

    const now = new Date().toISOString();
    const emptyDefaultPlaylist: Playlist = {
      id: 'default_lets_go',
      name: DEFAULT_PLAYLIST_NAME,
      skillIds: [],
      createdAt: now,
      lastPlayedAt: now,
    };
    const data: CloudProfileData = {
      ownerUid,
      skills: [],
      playlists: [emptyDefaultPlaylist],
      activePlaylistId: emptyDefaultPlaylist.id,
      sessions: [],
      tempoRampSettings: storageManager.getTempoRampSettings(),
      timbre: storageManager.getMetronomeTimbre(),
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'profiles', uniqueCode), data);
    storageManager.saveSkills([]);
    storageManager.savePlaylists([emptyDefaultPlaylist]);
    storageManager.setActivePlaylistId(emptyDefaultPlaylist.id, false);
    storageManager.saveSessions([]);
    setStoredProfileId(uniqueCode);
    setLastSyncedAt(now);
    storageManager.touchLocalModifiedAt(now);
    storageManager.setHasUnsyncedChanges(false);

    return { success: true, profileId: uniqueCode };
  } catch (err: unknown) {
    console.error('Error creating empty cloud profile:', err);
    return { success: false, error: getFriendlyErrorMessage(err, 'Failed to create empty profile.') };
  }
}

/**
 * Loads an existing cloud profile by its 2-word code and updates local data.
 */
export async function loadCloudProfile(
  code: string,
  passwordOrOptions?: string | { onlyIfNewer?: boolean },
  maybeOptions?: { onlyIfNewer?: boolean }
): Promise<{ success: boolean; profileId?: string; unchanged?: boolean; error?: string }> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, error: 'You are offline. Connect to the internet to load a profile.' };
    }

    let password: string | undefined;
    let options: { onlyIfNewer?: boolean } | undefined;

    if (typeof passwordOrOptions === 'string') {
      password = passwordOrOptions;
      options = maybeOptions;
    } else if (typeof passwordOrOptions === 'object' && passwordOrOptions !== null) {
      options = passwordOrOptions;
    }

    const cleanCode = code.trim().toLowerCase();
    if (!cleanCode) {
      return { success: false, error: 'Please enter a valid profile code.' };
    }

    // Skip overwriting local storage when local changes are pending/in-flight
    if (options?.onlyIfNewer && hasPendingSync()) {
      return { success: true, profileId: cleanCode, unchanged: true };
    }

    const auth = getFirebaseAuth();
    if (!auth.currentUser) {
      try {
        await auth.authStateReady();
      } catch {
        // Continue
      }
    }

    const expectedEmail = `${cleanCode}@tempodaddy.app`;
    if (!auth.currentUser || auth.currentUser.email !== expectedEmail) {
      if (!password) {
        if (options?.onlyIfNewer) {
          // Background sync check without saved password session skips silently
          return { success: true, profileId: cleanCode, unchanged: true };
        }
        return { success: false, error: 'Password is required to access this profile.' };
      }
      await signInWithEmailAndPassword(auth, expectedEmail, password);
    }

    const db = getDb();
    const docRef = doc(db, 'profiles', cleanCode);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return { success: false, error: `Profile "${cleanCode}" was not found.` };
    }

    const data = snap.data() as CloudProfileData;

    // Check Last-Write-Wins timestamp rule
    if (options?.onlyIfNewer) {
      const localModified = storageManager.getLocalModifiedAt();
      const hasUnsynced = storageManager.getHasUnsyncedChanges();
      if (hasUnsynced || (data.updatedAt && data.updatedAt <= localModified)) {
        return { success: true, profileId: cleanCode, unchanged: true };
      }
    }

    // Apply cloud data to local storage with schema validation/sanitization
    if (Array.isArray(data.skills)) {
      const sanitized = data.skills
        .map((s, idx) => sanitizeSkill(s, idx))
        .filter((s): s is Skill => s !== null);
      storageManager.saveSkills(sanitized);
    }

    if (Array.isArray(data.playlists) && data.playlists.length > 0) {
      const sanitized = data.playlists
        .map(sanitizePlaylist)
        .filter((p): p is Playlist => p !== null);
      storageManager.savePlaylists(sanitized);
    } else if (Array.isArray(data.skills)) {
      const now = new Date().toISOString();
      const fallbackPlaylist: Playlist = {
        id: 'default_lets_go',
        name: DEFAULT_PLAYLIST_NAME,
        skillIds: data.skills.map((s) => s.id),
        createdAt: now,
        lastPlayedAt: now,
      };
      storageManager.savePlaylists([fallbackPlaylist]);
      storageManager.setActivePlaylistId(fallbackPlaylist.id, false);
    }

    if (data.activePlaylistId && typeof data.activePlaylistId === 'string') {
      storageManager.setActivePlaylistId(data.activePlaylistId, false);
    }
    // Reconcile playlists against loaded skills so no skill is left orphaned
    storageManager.getPlaylists();

    if (Array.isArray(data.sessions)) {
      const sanitized = data.sessions
        .map(sanitizeSession)
        .filter((s): s is PracticeSessionLog => s !== null);
      storageManager.saveSessions(sanitized);
    }

    if (data.tempoRampSettings) {
      storageManager.saveTempoRampSettings(sanitizeTempoRampSettings(data.tempoRampSettings));
    }

    if (data.timbre) {
      storageManager.saveMetronomeTimbre(sanitizeTimbre(data.timbre));
    }

    const syncTimestamp = data.updatedAt || new Date().toISOString();
    setStoredProfileId(cleanCode);
    setLastSyncedAt(syncTimestamp);
    storageManager.touchLocalModifiedAt(syncTimestamp);
    storageManager.setHasUnsyncedChanges(false);

    return { success: true, profileId: cleanCode, unchanged: false };
  } catch (err: unknown) {
    console.error('Error loading cloud profile:', err);
    return { success: false, error: getFriendlyErrorMessage(err, 'Failed to load profile from cloud.') };
  }
}

/**
 * Disconnects the local device from the cloud profile and signs out of Firebase.
 */
export async function unlinkCloudProfile(): Promise<void> {
  cancelPendingSync();
  setStoredProfileId(null);
  storageManager.setHasUnsyncedChanges(false);
  try {
    const auth = getFirebaseAuth();
    await signOut(auth);
  } catch (e) {
    console.warn('Error signing out of Firebase Auth:', e);
  }
}

/**
 * Concurrency queue & in-flight state tracking to prevent race conditions
 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isSyncInFlight = false;
let isSyncQueued = false;
let inFlightSyncPromise: Promise<{ success: boolean; error?: string }> | null = null;
let queuedSyncPromise: Promise<{ success: boolean; error?: string }> | null = null;

export function cancelPendingSync(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  isSyncInFlight = false;
  isSyncQueued = false;
  inFlightSyncPromise = null;
  queuedSyncPromise = null;
}

export function hasPendingSync(): boolean {
  return (
    debounceTimer !== null ||
    isSyncInFlight ||
    isSyncQueued ||
    storageManager.getHasUnsyncedChanges()
  );
}

/**
 * Push current local state to the linked cloud profile
 */
export async function syncLocalToCloud(): Promise<{ success: boolean; error?: string }> {
  const profileId = getStoredProfileId();
  if (!profileId) {
    return { success: false, error: 'No profile ID linked.' };
  }

  // If a sync is already running, queue a subsequent sync rather than dropping it
  if (isSyncInFlight) {
    isSyncQueued = true;
    if (!queuedSyncPromise) {
      queuedSyncPromise = (async () => {
        try {
          await inFlightSyncPromise;
        } catch {
          // ignore previous sync error
        }
        if (isSyncQueued) {
          isSyncQueued = false;
          return syncLocalToCloud();
        }
        return { success: true };
      })();
    }
    return queuedSyncPromise;
  }

  isSyncInFlight = true;
  const currentSync = (async () => {
    try {
      const auth = getFirebaseAuth();
      if (!auth.currentUser) {
        try {
          await auth.authStateReady();
        } catch {
          // Continue
        }
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, error: 'Not authenticated with Firebase. Please re-enter your password.' };
      }

      const db = getDb();
      const now = new Date().toISOString();
      const data: Partial<CloudProfileData> = {
        ownerUid: currentUser.uid,
        skills: storageManager.getSkills(),
        playlists: storageManager.getPlaylists(),
        activePlaylistId: storageManager.getActivePlaylistId(),
        sessions: storageManager.getSessions(),
        tempoRampSettings: storageManager.getTempoRampSettings(),
        timbre: storageManager.getMetronomeTimbre(),
        updatedAt: now,
      };

      await setDoc(doc(db, 'profiles', profileId), data, { merge: true });
      setLastSyncedAt(now);
      storageManager.touchLocalModifiedAt(now);

      // Only clear unsynced state if no new edits were queued during the sync
      if (!isSyncQueued && debounceTimer === null) {
        storageManager.setHasUnsyncedChanges(false);
      }
      return { success: true };
    } catch (err: unknown) {
      console.error('Error syncing local data to cloud:', err);
      return { success: false, error: getFriendlyErrorMessage(err, 'Failed to sync to cloud.') };
    } finally {
      isSyncInFlight = false;
      inFlightSyncPromise = null;
      queuedSyncPromise = null;
    }
  })();

  inFlightSyncPromise = currentSync;
  return currentSync;
}

export function triggerDebouncedCloudSync(delayMs = 2500): void {
  const profileId = getStoredProfileId();
  if (!profileId) return;

  storageManager.setHasUnsyncedChanges(true);
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    syncLocalToCloud().catch((err) => {
      console.warn('Debounced cloud sync warning:', err);
    });
  }, delayMs);
}

/**
 * Flush pending debounced cloud sync immediately (e.g. before unload or on backgrounding)
 */
export async function forceCloudSync(): Promise<{ success: boolean; error?: string }> {
  if (!debounceTimer && !storageManager.getHasUnsyncedChanges()) {
    return { success: true };
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  return syncLocalToCloud();
}
