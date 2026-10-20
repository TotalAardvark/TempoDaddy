import type { Skill, PracticeSessionLog, TempoRampSettings } from '../types';
import { INITIAL_SKILLS } from '../data/initialSkills';

const SKILLS_KEY = 'tempo_skills_v1';
const SESSIONS_KEY = 'tempo_sessions_v1';
const TEMPO_RAMP_KEY = 'tempo_coach_ramp_settings_v1';

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
        if (session.bpm > skills[skillIndex].personalBestBpm) {
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

  exportDataJson(): string {
    return JSON.stringify({
      skills: this.getSkills(),
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
