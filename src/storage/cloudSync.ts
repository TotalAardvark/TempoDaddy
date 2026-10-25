import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb } from './firebase';
import { generateWordCode } from './wordList';
import { storageManager } from './storageManager';
import type { Skill, PracticeSessionLog, TempoRampSettings, MetronomeTimbre } from '../types';

export const PROFILE_ID_KEY = 'tempo_coach_profile_id';
export const LAST_SYNCED_KEY = 'tempo_coach_last_synced_at';

export interface CloudProfileData {
  skills: Skill[];
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
 * Loads an existing cloud profile by its 2-word code and overrides/updates local data.
 */
export async function loadCloudProfile(code: string): Promise<{ success: boolean; profileId?: string; error?: string }> {
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

    // Apply cloud data to local storage
    if (Array.isArray(data.skills)) {
      storageManager.saveSkills(data.skills);
    }
    if (Array.isArray(data.sessions)) {
      localStorage.setItem('tempo_sessions_v1', JSON.stringify(data.sessions));
    }
    if (data.tempoRampSettings) {
      storageManager.saveTempoRampSettings(data.tempoRampSettings);
    }
    if (data.timbre) {
      storageManager.saveMetronomeTimbre(data.timbre);
    }

    setStoredProfileId(cleanCode);
    setLastSyncedAt(data.updatedAt || new Date().toISOString());

    return { success: true, profileId: cleanCode };
  } catch (err: unknown) {
    console.error('Error loading cloud profile:', err);
    return { success: false, error: getFriendlyErrorMessage(err, 'Failed to load profile from cloud.') };
  }
}

/** Alias for loading/linking an existing sync code */
export const linkExistingCode = loadCloudProfile;

/**
 * Push current local state to the linked cloud profile
 */
export async function syncLocalToCloud(): Promise<{ success: boolean; error?: string }> {
  const profileId = getStoredProfileId();
  if (!profileId) {
    return { success: false, error: 'No profile ID linked.' };
  }

  try {
    const db = getDb();
    const now = new Date().toISOString();
    const data: Partial<CloudProfileData> = {
      skills: storageManager.getSkills(),
      sessions: storageManager.getSessions(),
      tempoRampSettings: storageManager.getTempoRampSettings(),
      timbre: storageManager.getMetronomeTimbre(),
      updatedAt: now,
    };

    await setDoc(doc(db, 'profiles', profileId), data, { merge: true });
    setLastSyncedAt(now);
    return { success: true };
  } catch (err: unknown) {
    console.error('Error syncing local data to cloud:', err);
    const message = err instanceof Error ? err.message : 'Failed to sync to cloud.';
    return { success: false, error: message };
  }
}

/**
 * Debounced sync helper to prevent flooding Firebase with writes
 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function triggerDebouncedCloudSync(delayMs = 15000): void {
  const profileId = getStoredProfileId();
  if (!profileId) return;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    syncLocalToCloud().catch((err) => {
      console.warn('Debounced cloud sync warning:', err);
    });
  }, delayMs);
}

/**
 * Force immediate cloud sync (e.g. before unload or user triggers sync)
 */
export async function forceCloudSync(): Promise<{ success: boolean; error?: string }> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  return syncLocalToCloud();
}
