import type { Skill, Playlist, PracticeSessionLog, TempoRampSettings, MetronomeTimbre, PbDisplayRange } from '../types';
import { INITIAL_SKILLS } from '../data/initialSkills';

const SKILLS_KEY = 'tempo_skills_v1';
const PLAYLISTS_KEY = 'tempo_playlists_v1';
const ACTIVE_PLAYLIST_ID_KEY = 'tempo_active_playlist_id_v1';
const SESSIONS_KEY = 'tempo_sessions_v1';
const TEMPO_RAMP_KEY = 'tempo_coach_ramp_settings_v1';
const TIMBRE_KEY = 'tempo_coach_metronome_timbre_v1';
const PB_DISPLAY_RANGE_KEY = 'tempo_coach_pb_display_range_v1';
const DEFAULT_TIMBRE: MetronomeTimbre = 'woodblock';

export const DEFAULT_PLAYLIST_NAME = "Let's Go!";

export const DEFAULT_RAMP_SETTINGS: TempoRampSettings = {
  startPercent: 80,
  targetPercent: 90,
  measures: 16,
  enabled: true,
};

export const storageManager = {
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
      // Clean up any dangling skill IDs that no longer exist in skills table
      let needsSave = false;
      parsed.forEach((pl) => {
        const cleaned = pl.skillIds.filter((id) => validSkillIds.has(id));
        if (cleaned.length !== pl.skillIds.length) {
          pl.skillIds = cleaned;
          needsSave = true;
        }
      });
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

  setActivePlaylistId(playlistId: string) {
    try {
      localStorage.setItem(ACTIVE_PLAYLIST_ID_KEY, playlistId);
      // Update lastPlayedAt on this playlist
      const playlists = this.getPlaylists();
      const idx = playlists.findIndex((p) => p.id === playlistId);
      if (idx !== -1) {
        playlists[idx].lastPlayedAt = new Date().toISOString();
        this.savePlaylists(playlists);
      }
    } catch (e) {
      console.error('Error saving active playlist ID', e);
    }
  },

  createPlaylist(name: string): Playlist {
    const playlists = this.getPlaylists();
    const newPlaylist: Playlist = {
      id: `pl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: name.trim() || 'New Routine',
      skillIds: [],
      createdAt: new Date().toISOString(),
      lastPlayedAt: new Date().toISOString(),
    };
    playlists.push(newPlaylist);
    this.savePlaylists(playlists);
    this.setActivePlaylistId(newPlaylist.id);
    return newPlaylist;
  },

  updatePlaylist(id: string, updates: Partial<Omit<Playlist, 'id'>>): Playlist[] {
    const playlists = this.getPlaylists();
    const idx = playlists.findIndex((p) => p.id === id);
    if (idx !== -1) {
      playlists[idx] = { ...playlists[idx], ...updates };
      this.savePlaylists(playlists);
    }
    return playlists;
  },

  deletePlaylist(playlistId: string): { remainingPlaylists: Playlist[]; deletedSkillIds: string[] } {
    const playlists = this.getPlaylists();
    const remaining = playlists.filter((p) => p.id !== playlistId);
    this.savePlaylists(remaining);

    // If active playlist was deleted, fallback to first remaining
    if (this.getActivePlaylistId() === playlistId && remaining.length > 0) {
      this.setActivePlaylistId(remaining[0].id);
    }

    // Clean up skills that only existed in the deleted playlist
    const allRemainingSkillIds = new Set<string>();
    remaining.forEach((p) => p.skillIds.forEach((sid) => allRemainingSkillIds.add(sid)));

    const allSkills = this.getSkills();
    const deletedSkillIds: string[] = [];
    const keptSkills: Skill[] = [];

    // Filter against existing skills in the deleted playlist
    const targetPlaylist = playlists.find((p) => p.id === playlistId);
    const existingTargetSkillIds = new Set(
      (targetPlaylist?.skillIds || []).filter((sid) => allSkills.some((s) => s.id === sid))
    );

    allSkills.forEach((skill) => {
      if (allRemainingSkillIds.has(skill.id)) {
        keptSkills.push(skill);
      } else if (existingTargetSkillIds.has(skill.id)) {
        deletedSkillIds.push(skill.id);
      } else {
        keptSkills.push(skill);
      }
    });

    if (deletedSkillIds.length > 0) {
      this.saveSkills(keptSkills);
    }

    return { remainingPlaylists: remaining, deletedSkillIds };
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

  getPlaylistsForSkill(skillId: string): Playlist[] {
    const playlists = this.getPlaylists();
    return playlists.filter((p) => p.skillIds.includes(skillId));
  },

  saveSessions(sessions: PracticeSessionLog[]) {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
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
      sessions.push(session);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));

      // Check and update skill Personal Best
      const skills = this.getSkills();
      const skillIndex = skills.findIndex((s) => s.id === session.skillId);
      let isNewPb = false;

      if (skillIndex !== -1) {
        if (session.isPersonalBest || session.bpm > skills[skillIndex].personalBestBpm) {
          skills[skillIndex].personalBestBpm = session.bpm;
          isNewPb = true;
          this.saveSkills(skills);
        }
      }

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

  getMostRecentSession(skillId: string): PracticeSessionLog | null {
    const history = this.getSkillHistory(skillId);
    return history.length > 0 ? history[history.length - 1] : null;
  },

  getTodayPracticedSkillIds(): string[] {
    const today = new Date().toISOString().slice(0, 10);
    const sessions = this.getSessions();
    const practicedToday = new Set<string>();

    sessions.forEach((s) => {
      if (s.date.slice(0, 10) === today) {
        practicedToday.add(s.skillId);
      }
    });

    return Array.from(practicedToday);
  },

  calculateStreak(): number {
    const sessions = this.getSessions();
    if (sessions.length === 0) return 0;

    const uniqueDates = Array.from(
      new Set(sessions.map((s) => s.date.slice(0, 10)))
    ).sort().reverse();

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // If neither today nor yesterday has practice, streak is 0
    if (!uniqueDates.includes(today) && !uniqueDates.includes(yesterday)) {
      return 0;
    }

    let streak = 0;
    let checkDate = new Date();
    if (!uniqueDates.includes(today)) {
      checkDate = new Date(Date.now() - 86400000);
    }

    while (true) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (uniqueDates.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  },

  getWeeklyPbCount(): number {
    const sessions = this.getSessions();
    const oneWeekAgo = Date.now() - 7 * 86400000;
    return sessions.filter((s) => s.isPersonalBest && new Date(s.date).getTime() >= oneWeekAgo).length;
  },

  getPbStats(): {
    thisWeek: number;
    thisMonth: number;
    allTime: number;
    sinceReset: number;
    resetDate: string | null;
  } {
    const sessions = this.getSessions();
    const now = new Date();
    const oneWeekAgo = Date.now() - 7 * 86400000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const resetDate = localStorage.getItem('tempo_coach_pb_reset_date');
    const resetTime = resetDate ? new Date(resetDate).getTime() : 0;

    const thisWeek = sessions.filter((s) => s.isPersonalBest && new Date(s.date).getTime() >= oneWeekAgo).length;
    const thisMonth = sessions.filter((s) => s.isPersonalBest && new Date(s.date).getTime() >= startOfMonth).length;
    const allTime = sessions.filter((s) => s.isPersonalBest).length;
    const sinceReset = resetDate
      ? sessions.filter((s) => s.isPersonalBest && new Date(s.date).getTime() >= resetTime).length
      : allTime;

    return {
      thisWeek,
      thisMonth,
      allTime,
      sinceReset,
      resetDate,
    };
  },

  resetPbCounter(): void {
    localStorage.setItem('tempo_coach_pb_reset_date', new Date().toISOString());
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
    return Array.from(new Set(sessions.map((s) => s.date.slice(0, 10))));
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
        return { ...DEFAULT_RAMP_SETTINGS, ...JSON.parse(data) };
      }
    } catch (e) {
      console.error('Failed to get tempo ramp settings', e);
    }
    return DEFAULT_RAMP_SETTINGS;
  },

  saveTempoRampSettings(settings: TempoRampSettings): void {
    try {
      localStorage.setItem(TEMPO_RAMP_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save tempo ramp settings', e);
    }
  },

  getMetronomeTimbre(): MetronomeTimbre {
    try {
      const stored = localStorage.getItem(TIMBRE_KEY);
      if (stored === 'woodblock' || stored === 'beep' || stored === 'loud') {
        return stored;
      }
      if (stored === 'rimshot') {
        return 'loud';
      }
    } catch (e) {
      console.error('Failed to get metronome timbre', e);
    }
    return DEFAULT_TIMBRE;
  },

  saveMetronomeTimbre(timbre: MetronomeTimbre): void {
    try {
      localStorage.setItem(TIMBRE_KEY, timbre);
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
      exportedAt: new Date().toISOString(),
    }, null, 2);
  },

  importDataJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.skills)) {
        this.saveSkills(data.skills);
      }
      if (Array.isArray(data.playlists)) {
        this.savePlaylists(data.playlists);
      }
      if (data.activePlaylistId && typeof data.activePlaylistId === 'string') {
        this.setActivePlaylistId(data.activePlaylistId);
      }
      if (Array.isArray(data.sessions)) {
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(data.sessions));
      }
      return true;
    } catch (e) {
      console.error('Failed to import JSON data', e);
      return false;
    }
  },
};
