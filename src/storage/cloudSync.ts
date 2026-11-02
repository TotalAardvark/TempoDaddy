import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb } from './firebase';
import { generateWordCode } from './wordList';
import { storageManager, DEFAULT_PLAYLIST_NAME } from './storageManager';
import type { Skill, Playlist, PracticeSessionLog, TempoRampSettings, MetronomeTimbre } from '../types';

export const PROFILE_ID_KEY = 'tempo_coach_profile_id';
export const LAST_SYNCED_KEY = 'tempo_coach_last_synced_at';

export interface CloudProfileData {
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

export function setLastSyncedAt(timestamp: string): void {
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
    if (code === 'unavailable' || code.includes('network') || code.includes('offline')) {
      return 'Unable to reach Firebase. Please check your internet connection.';
    }
    if (code === 'permission-denied') {
      return 'Permission denied. Please verify your Firestore rules or check the code.';
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
export async function createCloudProfile(): Promise<{ success: boolean; profileId?: string; error?: string }> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, error: 'You are offline. Connect to the internet to back up to the cloud.' };
    }

    const db = getDb();
    let uniqueCode = '';
    let attempts = 0;

    // Find an unused 2-word code
    while (attempts < 5) {
      const candidate = generateWordCode();
      const docRef = doc(db, 'profiles', candidate);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        uniqueCode = candidate;
        break;
      }
      attempts++;
    }

    if (!uniqueCode) {
      return { success: false, error: 'Could not generate a unique code. Please try again.' };
    }

    const now = new Date().toISOString();
    const data: CloudProfileData = {
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
export async function createEmptyCloudProfile(): Promise<{ success: boolean; profileId?: string; error?: string }> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, error: 'You are offline. Connect to the internet to create a profile.' };
    }

    const db = getDb();
    let uniqueCode = '';
    let attempts = 0;

    // Find an unused 2-word code
    while (attempts < 5) {
      const candidate = generateWordCode();
      const docRef = doc(db, 'profiles', candidate);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        uniqueCode = candidate;
        break;
      }
      attempts++;
    }

    if (!uniqueCode) {
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

    return { success: true, profileId: uniqueCode };
  } catch (err: unknown) {
    console.error('Error creating empty cloud profile:', err);
    return { success: false, error: getFriendlyErrorMessage(err, 'Failed to create empty profile.') };
  }
}

/**
 * Loads an existing cloud profile by its 2-word code and overrides/updates local data.
 */
export async function loadCloudProfile(
  code: string,
  options?: { onlyIfNewer?: boolean }
): Promise<{ success: boolean; profileId?: string; unchanged?: boolean; error?: string }> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, error: 'You are offline. Connect to the internet to load a profile.' };
    }

    const cleanCode = code.trim().toLowerCase();
    if (!cleanCode) {
      return { success: false, error: 'Please enter a valid profile code.' };
    }

    const db = getDb();
    const docRef = doc(db, 'profiles', cleanCode);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return { success: false, error: `Profile "${cleanCode}" was not found.` };
    }

    const data = snap.data() as CloudProfileData;

    // If checking in the background (e.g. on focus/resume), skip overwriting local storage
    // when local changes are pending/in-flight or when the remote timestamp hasn't changed.
    if (options?.onlyIfNewer) {
      if (hasPendingSync()) {
        return { success: true, profileId: cleanCode, unchanged: true };
      }
      const lastSynced = getLastSyncedAt();
      if (lastSynced && data.updatedAt && data.updatedAt <= lastSynced) {
        return { success: true, profileId: cleanCode, unchanged: true };
      }
    }

    // Apply cloud data to local storage
    if (Array.isArray(data.skills)) {
      storageManager.saveSkills(data.skills);
    }
    if (Array.isArray(data.playlists) && data.playlists.length > 0) {
      storageManager.savePlaylists(data.playlists);
    } else if (Array.isArray(data.skills)) {
      // Fallback for profiles created before playlists were synced to Firestore
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
      storageManager.saveSessions(data.sessions);
    }
    if (data.tempoRampSettings) {
      storageManager.saveTempoRampSettings(data.tempoRampSettings);
    }
    if (data.timbre) {
      storageManager.saveMetronomeTimbre(data.timbre);
    }

    hasUnsyncedLocalChanges = false;
    setStoredProfileId(cleanCode);
    setLastSyncedAt(data.updatedAt || new Date().toISOString());

    return { success: true, profileId: cleanCode, unchanged: false };
  } catch (err: unknown) {
    console.error('Error loading cloud profile:', err);
    return { success: false, error: getFriendlyErrorMessage(err, 'Failed to load profile from cloud.') };
  }
}

/** Alias for loading/linking an existing sync code */
export const linkExistingCode = loadCloudProfile;

/**
 * Debounced sync & in-flight state tracking to prevent race conditions
 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isSyncInFlight = false;
let hasUnsyncedLocalChanges = false;

export function hasPendingSync(): boolean {
  return debounceTimer !== null || isSyncInFlight || hasUnsyncedLocalChanges;
}

/**
 * Push current local state to the linked cloud profile
 */
export async function syncLocalToCloud(): Promise<{ success: boolean; error?: string }> {
  const profileId = getStoredProfileId();
  if (!profileId) {
    return { success: false, error: 'No profile ID linked.' };
  }

  isSyncInFlight = true;
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const data: Partial<CloudProfileData> = {
      skills: storageManager.getSkills(),
      playlists: storageManager.getPlaylists(),
      activePlaylistId: storageManager.getActivePlaylistId(),
      sessions: storageManager.getSessions(),
      tempoRampSettings: storageManager.getTempoRampSettings(),
      timbre: storageManager.getMetronomeTimbre(),
      updatedAt: now,
    };

    await setDoc(doc(db, 'profiles', profileId), data, { merge: true });
    if (debounceTimer === null) {
      hasUnsyncedLocalChanges = false;
    }
    setLastSyncedAt(now);
    return { success: true };
  } catch (err: unknown) {
    console.error('Error syncing local data to cloud:', err);
    const message = err instanceof Error ? err.message : 'Failed to sync to cloud.';
    return { success: false, error: message };
  } finally {
    isSyncInFlight = false;
  }
}

export function triggerDebouncedCloudSync(delayMs = 2500): void {
  const profileId = getStoredProfileId();
  if (!profileId) return;

  hasUnsyncedLocalChanges = true;
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
  if (!debounceTimer && !hasUnsyncedLocalChanges) {
    return { success: true };
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  return syncLocalToCloud();
}
