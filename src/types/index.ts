export type Subdivision = '1/4' | '1/8' | '1/16';

export type MetronomeTimbre = 'woodblock' | 'beep' | 'loud';

export type SkillCategory = 'drumming' | 'piano' | 'guitar' | 'general';

export type PbDisplayRange = 'thisWeek' | 'thisMonth' | 'allTime';

export interface PracticeSessionLog {
  id: string;
  skillId: string;
  date: string; // ISO string
  bpm: number;
  durationSeconds: number;
  isPersonalBest: boolean;
  notes?: string;
}

export interface Skill {
  id: string;
  title: string;
  category: SkillCategory;
  sticking?: string;
  personalBestBpm: number;
  targetBpm?: number;
  subdivision: Subdivision;
  isTriplet: boolean;
  order: number;
  createdAt: string;
  isHibernated?: boolean;
  notes?: string;
}

export interface Playlist {
  id: string;
  name: string;
  skillIds: string[];
  createdAt: string;
  lastPlayedAt?: string;
}

export interface PresetSkill {
  title: string;
  category: SkillCategory;
  sticking?: string;
  defaultPb: number;
  subdivision: Subdivision;
  isTriplet: boolean;
  description?: string;
}

export interface TempoRampSettings {
  startPercent: number; // e.g. 80
  targetPercent: number; // e.g. 90
  measures: number; // e.g. 16 measures (64 beats)
  enabled: boolean;
}
