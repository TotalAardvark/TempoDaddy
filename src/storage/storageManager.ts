import type { Skill, Playlist, PracticeSessionLog, TempoRampSettings, MetronomeTimbre, PbDisplayRange, PbStats, Subdivision, SkillCategory } from '../types';
import { INITIAL_SKILLS } from '../data/initialSkills';

const SKILLS_KEY = 'tempo_skills_v1';
const PLAYLISTS_KEY = 'tempo_playlists_v1';
const ACTIVE_PLAYLIST_ID_KEY = 'tempo_active_playlist_id_v1';
const SESSIONS_KEY = 'tempo_sessions_v1';
const TEMPO_RAMP_KEY = 'tempo_coach_ramp_settings_v1';
const TIMBRE_KEY = 'tempo_coach_metronome_timbre_v1';
const PB_DISPLAY_RANGE_KEY = 'tempo_coach_pb_display_range_v1';
const FRONT_DOOR_BPM_KEY = 'tempo_front_door_bpm_v1';
const LOCAL_MODIFIED_KEY = 'tempo_coach_local_modified_at';
const HAS_UNSYNCED_KEY = 'tempo_coach_has_unsynced_changes';

const DEFAULT_TIMBRE: MetronomeTimbre = 'woodblock';
export const DEFAULT_PLAYLIST_NAME = "Let's Go!";

export const DEFAULT_RAMP_SETTINGS: TempoRampSettings = {
  startPercent: 80,
  targetPercent: 90,
  measures: 16,
  enabled: true,
};

/**
 * Formats a Date or ISO date string into a local YYYY-MM-DD date key.
 */
export function toLocalDateKey(dateInput: Date | string = new Date()): string {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) {
    return typeof dateInput === 'string' ? dateInput.slice(0, 10) : '';
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function sanitizeSkill(raw: unknown, defaultOrder = 0): Skill | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const s = raw as Record<string, unknown>;
  const id = typeof s.id === 'string' && s.id.trim() ? s.id.trim() : '';
  const title = typeof s.title === 'string' && s.title.trim() ? s.title.trim() : '';
  if (!id || !title) return null;

  const rawBpm = Number(s.personalBestBpm);
  const personalBestBpm = Number.isFinite(rawBpm) && rawBpm > 0 ? Math.round(Math.max(20, Math.min(500, rawBpm))) : 80;

  const validSubdivisions: Subdivision[] = ['1/4', '1/8', '1/16'];
  const subdivision = validSubdivisions.includes(s.subdivision as Subdivision) ? (s.subdivision as Subdivision) : '1/16';

  const validCategories: SkillCategory[] = ['drumming', 'piano', 'guitar', 'general'];
  const category: SkillCategory = validCategories.includes(s.category as SkillCategory) ? (s.category as SkillCategory) : 'drumming';

  const order = typeof s.order === 'number' && Number.isFinite(s.order) ? s.order : defaultOrder;

  return {
    id,
    title,
    category,
    sticking: typeof s.sticking === 'string' ? s.sticking.trim() : undefined,
    notes: typeof s.notes === 'string' ? s.notes : undefined,
    personalBestBpm,
    subdivision,
    isTriplet: Boolean(s.isTriplet),
    isHibernated: Boolean(s.isHibernated),
    order,
    createdAt: typeof s.createdAt === 'string' ? s.createdAt : new Date().toISOString(),
  };
}

export function sanitizePlaylist(raw: unknown): Playlist | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const p = raw as Record<string, unknown>;
  const id = typeof p.id === 'string' && p.id.trim() ? p.id.trim() : '';
  const name = typeof p.name === 'string' && p.name.trim() ? p.name.trim() : '';
  if (!id || !name) return null;

  const rawSkillIds = Array.isArray(p.skillIds) ? p.skillIds : [];
  const skillIds = rawSkillIds.filter((sid): sid is string => typeof sid === 'string' && sid.trim().length > 0);

  return {
    id,
    name,
    skillIds,
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
    lastPlayedAt: typeof p.lastPlayedAt === 'string' ? p.lastPlayedAt : new Date().toISOString(),
  };
}

export function sanitizeSession(raw: unknown): PracticeSessionLog | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const s = raw as Record<string, unknown>;
  const id = typeof s.id === 'string' && s.id.trim() ? s.id.trim() : '';
  const skillId = typeof s.skillId === 'string' && s.skillId.trim() ? s.skillId.trim() : '';
  if (!id || !skillId) return null;

  const rawBpm = Number(s.bpm);
  if (!Number.isFinite(rawBpm) || rawBpm <= 0) return null;
  const bpm = Math.round(Math.max(20, Math.min(500, rawBpm)));

  const rawDuration = Number(s.durationSeconds);
  const durationSeconds = Number.isFinite(rawDuration) && rawDuration >= 0 ? Math.round(rawDuration) : 0;

  return {
    id,
    skillId,
    date: typeof s.date === 'string' ? s.date : new Date().toISOString(),
    bpm,
    durationSeconds,
    isPersonalBest: Boolean(s.isPersonalBest),
  };
}

export function sanitizeTempoRampSettings(raw: unknown): TempoRampSettings {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_RAMP_SETTINGS;
  const r = raw as Record<string, unknown>;

  const startPercent = Number.isFinite(Number(r.startPercent)) ? Math.max(10, Math.min(200, Number(r.startPercent))) : DEFAULT_RAMP_SETTINGS.startPercent;
  const targetPercent = Number.isFinite(Number(r.targetPercent)) ? Math.max(10, Math.min(200, Number(r.targetPercent))) : DEFAULT_RAMP_SETTINGS.targetPercent;
  const measures = Number.isFinite(Number(r.measures)) ? Math.max(1, Math.min(128, Math.round(Number(r.measures)))) : DEFAULT_RAMP_SETTINGS.measures;
  const enabled = typeof r.enabled === 'boolean' ? r.enabled : DEFAULT_RAMP_SETTINGS.enabled;

  return { startPercent, targetPercent, measures, enabled };
}

export function sanitizeTimbre(raw: unknown): MetronomeTimbre {
  if (raw === 'woodblock' || raw === 'beep' || raw === 'loud') {
    return raw;
  }
  if (raw === 'rimshot') {
    return 'loud';
  }
  return DEFAULT_TIMBRE;
}

export const storageManager = {
  getLocalModifiedAt(): string {
    try {
      return localStorage.getItem(LOCAL_MODIFIED_KEY) || '1970-01-01T00:00:00.000Z';
    } catch {
      return '1970-01-01T00:00:00.000Z';
    }
  },

  touchLocalModifiedAt(timestamp?: string): string {
    const ts = timestamp || new Date().toISOString();
    try {
      localStorage.setItem(LOCAL_MODIFIED_KEY, ts);
    } catch (e) {
      console.error('Failed to set local modified at', e);
    }
    return ts;
  },

  getHasUnsyncedChanges(): boolean {
    try {
      return localStorage.getItem(HAS_UNSYNCED_KEY) === 'true';
    } catch {
      return false;
    }
  },

  setHasUnsyncedChanges(val: boolean): void {
    try {
      localStorage.setItem(HAS_UNSYNCED_KEY, val ? 'true' : 'false');
    } catch (e) {
      console.error('Failed to set has unsynced changes', e);
    }
  },

  markLocalChange() {
    this.touchLocalModifiedAt();
    this.setHasUnsyncedChanges(true);
  },

  getSkills(): Skill[] {
    try {
      const stored = localStorage.getItem(SKILLS_KEY);
      if (!stored) {
        localStorage.setItem(SKILLS_KEY, JSON.stringify(INITIAL_SKILLS));
        return INITIAL_SKILLS;
      }
      const parsed: Skill[] = JSON.parse(stored);
      // Auto-migrate standard sticking to accented casing if needed
      const stickingMap: Record<string, string> = {
        'R L R R   L R L L': 'R l r r   L r l l',
        'L R L L   R L R R': 'L r l l   R l r r',
        'R   L L   R R   L': 'R l l r r L',
        'L   R R   L L   R': 'L r r l l R',
        'R L R R L R L L': 'R l r r   L r l l',
        'L R L L R L R R': 'L r l l   R l r r',
        'R L L R R L': 'R l l r r L',
        'L R R L L R': 'L r r l l R',
      };
      let changed = false;
      parsed.forEach((s) => {
        if (s.sticking && stickingMap[s.sticking]) {
          s.sticking = stickingMap[s.sticking];
          changed = true;
        }
      });
      if (changed) {
        this.saveSkills(parsed);
      }
      return parsed;
    } catch (e) {
      console.error('Error reading skills from localStorage', e);
      return INITIAL_SKILLS;
    }
  },

  saveSkills(skills: Skill[]) {
    try {
      localStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
      this.markLocalChange();
    } catch (e) {
      console.error('Error saving skills to localStorage', e);
    }
  },

  getPlaylists(): Playlist[] {
    try {
      const stored = localStorage.getItem(PLAYLISTS_KEY);
      const skills = this.getSkills();
      const validSkillIds = new Set(skills.map((s) => s.id));

      if (!stored) {
        // Initialize default playlist containing all existing non-hibernated and hibernated skill IDs
        const defaultPlaylist: Playlist = {
          id: 'default_lets_go',
          name: DEFAULT_PLAYLIST_NAME,
          skillIds: skills.map((s) => s.id),
          createdAt: new Date().toISOString(),
          lastPlayedAt: new Date().toISOString(),
        };
        const initialList = [defaultPlaylist];
        localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(initialList));
        localStorage.setItem(ACTIVE_PLAYLIST_ID_KEY, defaultPlaylist.id);
        return initialList;
      }
      const parsed: Playlist[] = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const defaultPlaylist: Playlist = {
          id: 'default_lets_go',
          name: DEFAULT_PLAYLIST_NAME,
          skillIds: skills.map((s) => s.id),
          createdAt: new Date().toISOString(),
          lastPlayedAt: new Date().toISOString(),
        };
        const initialList = [defaultPlaylist];
        localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(initialList));
        localStorage.setItem(ACTIVE_PLAYLIST_ID_KEY, defaultPlaylist.id);
        return initialList;
      }

      // Clean up any dangling skill IDs that no longer exist in skills table
      let needsSave = false;
      parsed.forEach((pl) => {
        const cleaned = pl.skillIds.filter((id) => validSkillIds.has(id));
        if (cleaned.length !== pl.skillIds.length) {
          pl.skillIds = cleaned;
          needsSave = true;
        }
      });

      // Rescue any orphaned skills that exist in skills storage but aren't in any playlist
      const assignedSkillIds = new Set<string>();
      parsed.forEach((pl) => pl.skillIds.forEach((id) => assignedSkillIds.add(id)));
      const orphanedSkillIds = skills.map((s) => s.id).filter((id) => !assignedSkillIds.has(id));
      if (orphanedSkillIds.length > 0) {
        const activeId = localStorage.getItem(ACTIVE_PLAYLIST_ID_KEY);
        const targetPlaylist = parsed.find((p) => p.id === activeId) || parsed[0];
        targetPlaylist.skillIds.push(...orphanedSkillIds);
        needsSave = true;
      }

      if (needsSave) {
        localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(parsed));
      }
      return parsed;
    } catch (e) {
      console.error('Error reading playlists from localStorage', e);
      return [];
    }
  },

  savePlaylists(playlists: Playlist[]) {
    try {
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
      this.markLocalChange();
    } catch (e) {
      console.error('Error saving playlists to localStorage', e);
    }
  },

  getActivePlaylistId(): string {
    try {
      const activeId = localStorage.getItem(ACTIVE_PLAYLIST_ID_KEY);
      const playlists = this.getPlaylists();
      if (activeId && playlists.some((p) => p.id === activeId)) {
        return activeId;
      }
      if (playlists.length > 0) {
        localStorage.setItem(ACTIVE_PLAYLIST_ID_KEY, playlists[0].id);
        return playlists[0].id;
      }
    } catch (e) {
      console.error('Error reading active playlist ID', e);
    }
    return 'default_lets_go';
  },

  setActivePlaylistId(playlistId: string, touchLastPlayed = true) {
    try {
      localStorage.setItem(ACTIVE_PLAYLIST_ID_KEY, playlistId);
      if (touchLastPlayed) {
        // Update lastPlayedAt on this playlist
        const playlists = this.getPlaylists();
        const idx = playlists.findIndex((p) => p.id === playlistId);
        if (idx !== -1) {
          playlists[idx].lastPlayedAt = new Date().toISOString();
          this.savePlaylists(playlists);
        }
      }
    } catch (e) {
      console.error('Error saving active playlist ID', e);
    }
  },

  createPlaylist(name: string, initialSkillIds: string[] = []): Playlist {
    const playlists = this.getPlaylists();
    const newPlaylist: Playlist = {
      id: `pl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: name.trim() || 'New Routine',
      skillIds: [...initialSkillIds],
      createdAt: new Date().toISOString(),
      lastPlayedAt: new Date().toISOString(),
    };
    playlists.push(newPlaylist);
    this.savePlaylists(playlists);
    return newPlaylist;
  },

  updatePlaylist(id: string, updates: Partial<Pick<Playlist, 'name' | 'skillIds'>>): Playlist[] {
    const playlists = this.getPlaylists();
    const idx = playlists.findIndex((p) => p.id === id);
    if (idx !== -1) {
      if (updates.name !== undefined) {
        playlists[idx].name = updates.name.trim() || playlists[idx].name;
      }
      if (updates.skillIds !== undefined) {
        playlists[idx].skillIds = [...updates.skillIds];
      }
      this.savePlaylists(playlists);
    }
    return playlists;
  },

  deletePlaylist(
    id: string,
    deleteSkillsFromAllPlaylists: boolean = false
  ): { remainingPlaylists: Playlist[]; deletedSkillIds: string[] } {
    let playlists = this.getPlaylists();
    const target = playlists.find((p) => p.id === id);
    const deletedSkillIds: string[] = [];

    if (!target) {
      return { remainingPlaylists: playlists, deletedSkillIds: [] };
    }

    if (deleteSkillsFromAllPlaylists) {
      deletedSkillIds.push(...target.skillIds);
      // Remove these skills completely from storage
      const skills = this.getSkills().filter((s) => !deletedSkillIds.includes(s.id));
      this.saveSkills(skills);

      // Clean skill references from remaining playlists
      playlists = playlists
        .filter((p) => p.id !== id)
        .map((p) => ({
          ...p,
          skillIds: p.skillIds.filter((sid) => !deletedSkillIds.includes(sid)),
        }));
    } else {
      // Just delete the playlist, orphan skills will be rescued into another playlist
      playlists = playlists.filter((p) => p.id !== id);
      if (playlists.length > 0 && target.skillIds.length > 0) {
        const fallback = playlists[0];
        target.skillIds.forEach((sid) => {
          if (!fallback.skillIds.includes(sid)) {
            fallback.skillIds.push(sid);
          }
        });
      }
    }

    // Never leave playlists empty: ensure at least one playlist exists
    if (playlists.length === 0) {
      const skills = this.getSkills();
      const defaultPlaylist: Playlist = {
        id: 'default_lets_go',
        name: DEFAULT_PLAYLIST_NAME,
        skillIds: skills.map((s) => s.id),
        createdAt: new Date().toISOString(),
        lastPlayedAt: new Date().toISOString(),
      };
      playlists = [defaultPlaylist];
    }

    this.savePlaylists(playlists);

    // If active playlist was deleted, point active ID to the first remaining playlist
    const activeId = this.getActivePlaylistId();
    if (activeId === id) {
      this.setActivePlaylistId(playlists[0].id, false);
    }

    return { remainingPlaylists: playlists, deletedSkillIds };
  },

  addSkillToPlaylist(skillId: string, playlistId: string) {
    const playlists = this.getPlaylists();
    const pl = playlists.find((p) => p.id === playlistId);
    if (pl && !pl.skillIds.includes(skillId)) {
      pl.skillIds.push(skillId);
      this.savePlaylists(playlists);
    }
  },

  removeSkillFromPlaylist(skillId: string, playlistId: string) {
    const playlists = this.getPlaylists();
    const pl = playlists.find((p) => p.id === playlistId);
    if (pl) {
      pl.skillIds = pl.skillIds.filter((id) => id !== skillId);
      this.savePlaylists(playlists);
    }
  },

  saveSessions(sessions: PracticeSessionLog[]) {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      this.markLocalChange();
    } catch (e) {
      console.error('Error saving sessions to localStorage', e);
    }
  },

  getSessions(): PracticeSessionLog[] {
    try {
      const stored = localStorage.getItem(SESSIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error reading sessions from localStorage', e);
      return [];
    }
  },

  addSession(session: PracticeSessionLog): { isNewPb: boolean } {
    try {
      const sessions = this.getSessions();
      const skills = this.getSkills();
      const skillIndex = skills.findIndex((s) => s.id === session.skillId);
      let isNewPb = false;

      if (skillIndex !== -1) {
        const currentPb = skills[skillIndex].personalBestBpm ?? 0;
        // Equal PB score rule: hitting exact PB does not count as a new PB
        // First-run baseline rule: warmup tempo does not lower or overwrite existing PB
        if (session.bpm > currentPb) {
          skills[skillIndex].personalBestBpm = session.bpm;
          isNewPb = true;
          session.isPersonalBest = true;
          this.saveSkills(skills);
        } else {
          session.isPersonalBest = false;
        }
      }

      sessions.push(session);
      this.saveSessions(sessions);
      return { isNewPb };
    } catch (e) {
      console.error('Error adding session', e);
      return { isNewPb: false };
    }
  },

  getSkillHistory(skillId: string): PracticeSessionLog[] {
    return this.getSessions()
      .filter((s) => s.skillId === skillId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  calculateStreak(): number {
    const sessions = this.getSessions();
    if (sessions.length === 0) return 0;

    const practicedDays = new Set<string>();
    sessions.forEach((s) => {
      practicedDays.add(toLocalDateKey(s.date));
    });

    const now = new Date();
    const todayStr = toLocalDateKey(now);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocalDateKey(yesterday);

    let streak = 0;
    let checkDate = new Date(now);

    if (practicedDays.has(todayStr)) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
      while (practicedDays.has(toLocalDateKey(checkDate))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    } else if (practicedDays.has(yesterdayStr)) {
      streak = 1;
      checkDate = yesterday;
      checkDate.setDate(checkDate.getDate() - 1);
      while (practicedDays.has(toLocalDateKey(checkDate))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    return streak;
  },

  getPbStats(): PbStats {
    const sessions = this.getSessions();
    const now = new Date();
    // Sunday at 00:00:00 as start of the current week
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime();
    // 1st of the current month at 00:00:00
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const thisWeek = sessions.filter((s) => s.isPersonalBest && new Date(s.date).getTime() >= startOfWeek).length;
    const thisMonth = sessions.filter((s) => s.isPersonalBest && new Date(s.date).getTime() >= startOfMonth).length;
    const allTime = sessions.filter((s) => s.isPersonalBest).length;

    return {
      thisWeek,
      thisMonth,
      allTime,
    };
  },

  getPbDisplayRange(): PbDisplayRange {
    try {
      const stored = localStorage.getItem(PB_DISPLAY_RANGE_KEY);
      if (stored === 'thisWeek' || stored === 'thisMonth' || stored === 'allTime') {
        return stored;
      }
    } catch (e) {
      console.error('Failed to get pb display range', e);
    }
    return 'allTime';
  },

  setPbDisplayRange(range: PbDisplayRange): void {
    try {
      localStorage.setItem(PB_DISPLAY_RANGE_KEY, range);
    } catch (e) {
      console.error('Failed to save pb display range', e);
    }
  },

  getPracticedDates(): string[] {
    const sessions = this.getSessions();
    return Array.from(new Set(sessions.map((s) => toLocalDateKey(s.date))));
  },

  toggleHibernate(skillId: string): Skill[] {
    const skills = this.getSkills();
    const idx = skills.findIndex((s) => s.id === skillId);
    if (idx !== -1) {
      skills[idx].isHibernated = !skills[idx].isHibernated;
      this.saveSkills(skills);
    }
    return skills;
  },

  getTempoRampSettings(): TempoRampSettings {
    try {
      const data = localStorage.getItem(TEMPO_RAMP_KEY);
      if (data) {
        return sanitizeTempoRampSettings(JSON.parse(data));
      }
    } catch (e) {
      console.error('Failed to get tempo ramp settings', e);
    }
    return DEFAULT_RAMP_SETTINGS;
  },

  saveTempoRampSettings(settings: TempoRampSettings): void {
    try {
      const sanitized = sanitizeTempoRampSettings(settings);
      localStorage.setItem(TEMPO_RAMP_KEY, JSON.stringify(sanitized));
      this.markLocalChange();
    } catch (e) {
      console.error('Failed to save tempo ramp settings', e);
    }
  },

  getMetronomeTimbre(): MetronomeTimbre {
    try {
      const stored = localStorage.getItem(TIMBRE_KEY);
      return sanitizeTimbre(stored);
    } catch (e) {
      console.error('Failed to get metronome timbre', e);
    }
    return DEFAULT_TIMBRE;
  },

  saveMetronomeTimbre(timbre: MetronomeTimbre): void {
    try {
      const sanitized = sanitizeTimbre(timbre);
      localStorage.setItem(TIMBRE_KEY, sanitized);
      this.markLocalChange();
    } catch (e) {
      console.error('Failed to save metronome timbre', e);
    }
  },

  exportDataJson(): string {
    return JSON.stringify({
      skills: this.getSkills(),
      playlists: this.getPlaylists(),
      activePlaylistId: this.getActivePlaylistId(),
      sessions: this.getSessions(),
      tempoRampSettings: this.getTempoRampSettings(),
      timbre: this.getMetronomeTimbre(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  },

  importDataJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (typeof data !== 'object' || data === null) {
        return false;
      }

      if (Array.isArray(data.skills)) {
        const validatedSkills = data.skills
          .map((s: unknown, i: number) => sanitizeSkill(s, i))
          .filter((s: Skill | null): s is Skill => Boolean(s));
        this.saveSkills(validatedSkills);
      }

      if (Array.isArray(data.playlists)) {
        const validatedPlaylists = data.playlists
          .map((p: unknown) => sanitizePlaylist(p))
          .filter((p: Playlist | null): p is Playlist => Boolean(p));
        if (validatedPlaylists.length > 0) {
          this.savePlaylists(validatedPlaylists);
        }
      }

      if (data.activePlaylistId && typeof data.activePlaylistId === 'string') {
        this.setActivePlaylistId(data.activePlaylistId, false);
      }

      // Ensure playlists reconcile against imported skills
      this.getPlaylists();

      if (Array.isArray(data.sessions)) {
        const validatedSessions = data.sessions
          .map((s: unknown) => sanitizeSession(s))
          .filter((s: PracticeSessionLog | null): s is PracticeSessionLog => Boolean(s));
        this.saveSessions(validatedSessions);
      }

      if (data.tempoRampSettings) {
        this.saveTempoRampSettings(sanitizeTempoRampSettings(data.tempoRampSettings));
      }

      if (data.timbre) {
        this.saveMetronomeTimbre(sanitizeTimbre(data.timbre));
      }

      this.markLocalChange();
      return true;
    } catch (e) {
      console.error('Failed to import JSON data', e);
      return false;
    }
  },

  getFrontDoorBpm(): number {
    try {
      const raw = localStorage.getItem(FRONT_DOOR_BPM_KEY);
      if (!raw) return 67;
      const parsed = parseInt(raw, 10);
      return Number.isFinite(parsed) && parsed >= 20 && parsed <= 500 ? parsed : 67;
    } catch {
      return 67;
    }
  },

  saveFrontDoorBpm(bpm: number): void {
    try {
      if (Number.isFinite(bpm) && bpm >= 20 && bpm <= 500) {
        localStorage.setItem(FRONT_DOOR_BPM_KEY, String(Math.round(bpm)));
      }
    } catch {
      // Ignore private browsing storage errors
    }
  },
};
