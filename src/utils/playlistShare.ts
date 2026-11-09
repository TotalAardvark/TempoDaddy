import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate';
import type { Playlist, Skill, Subdivision, SkillCategory } from '../types';

export const DEFAULT_IMPORTED_BPM = 45;
const PRODUCTION_BASE_URL = 'https://totalaardvark.github.io/TempoDaddy/';

interface SharedSkillCompact {
  /** title */
  t: string;
  /** category (optional, defaults to 'drumming') */
  c?: SkillCategory;
  /** sticking (optional) */
  s?: string;
  /** subdivision */
  d: Subdivision;
  /** isTriplet (1 = true, omitted/0 = false) */
  tr?: 1;
  /** notes (optional) */
  n?: string;
}

export interface SharedPlaylistBundle {
  /** version */
  v: 1;
  /** playlist name */
  name: string;
  /** skills in playlist order */
  skills: SharedSkillCompact[];
}

function uint8ToUrlSafeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function urlSafeBase64ToUint8(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encodes a playlist and its ordered skills into a URL-safe compressed hash payload.
 */
export function encodePlaylistToHash(playlist: Playlist, allSkills: Skill[]): string {
  const skillMap = new Map(allSkills.map((s) => [s.id, s]));
  const compactSkills: SharedSkillCompact[] = [];

  for (const id of playlist.skillIds) {
    const skill = skillMap.get(id);
    if (!skill) continue;

    const item: SharedSkillCompact = {
      t: skill.title,
      d: skill.subdivision,
    };

    if (skill.category && skill.category !== 'drumming') {
      item.c = skill.category;
    }
    if (skill.sticking && skill.sticking.trim()) {
      item.s = skill.sticking.trim();
    }
    if (skill.isTriplet) {
      item.tr = 1;
    }
    if (skill.notes && skill.notes.trim()) {
      item.n = skill.notes.trim();
    }

    compactSkills.push(item);
  }

  const bundle: SharedPlaylistBundle = {
    v: 1,
    name: playlist.name,
    skills: compactSkills,
  };

  const jsonStr = JSON.stringify(bundle);
  const compressed = deflateSync(strToU8(jsonStr), { level: 9 });
  return uint8ToUrlSafeBase64(compressed);
}

/**
 * Generates the full shareable URL for a playlist.
 */
export function generatePlaylistShareUrl(playlist: Playlist, allSkills: Skill[]): string {
  const payload = encodePlaylistToHash(playlist, allSkills);
  return `${PRODUCTION_BASE_URL}#import=${payload}`;
}

/**
 * Decodes a playlist bundle from either a raw payload string or a full URL hash (`#import=...`).
 */
export function decodePlaylistFromHash(hashOrPayload: string): SharedPlaylistBundle | null {
  try {
    let payload = hashOrPayload.trim();
    if (payload.startsWith('#')) {
      payload = payload.slice(1);
    }
    if (payload.startsWith('import=')) {
      payload = payload.slice('import='.length);
    }
    if (!payload) return null;

    const compressed = urlSafeBase64ToUint8(payload);
    // Guard against oversized inputs or decompression bomb payloads
    if (compressed.length > 65536) {
      console.warn('Import payload exceeds maximum allowed size (64KB).');
      return null;
    }

    const MAX_DECOMPRESSED_SIZE = 512 * 1024; // 512KB
    const outBuffer = new Uint8Array(MAX_DECOMPRESSED_SIZE);
    const decompressed = inflateSync(compressed, { out: outBuffer });
    const jsonStr = strFromU8(decompressed);
    const parsed = JSON.parse(jsonStr) as SharedPlaylistBundle;

    if (
      !parsed ||
      parsed.v !== 1 ||
      typeof parsed.name !== 'string' ||
      !Array.isArray(parsed.skills)
    ) {
      return null;
    }

    const validSubdivisions: Subdivision[] = ['1/4', '1/8', '1/16'];
    const validCategories: SkillCategory[] = ['drumming', 'piano', 'guitar', 'general'];

    const validatedSkills: SharedSkillCompact[] = parsed.skills
      .filter((s) => s && typeof s.t === 'string' && s.t.trim().length > 0)
      .map((s) => ({
        t: s.t.trim(),
        c: s.c && validCategories.includes(s.c) ? s.c : 'drumming',
        s: typeof s.s === 'string' && s.s.trim() ? s.s.trim() : undefined,
        d: validSubdivisions.includes(s.d) ? s.d : '1/4',
        tr: s.tr === 1 ? 1 : undefined,
        n: typeof s.n === 'string' && s.n.trim() ? s.n.trim() : undefined,
      }));

    return {
      v: 1,
      name: parsed.name.trim() || 'Shared Playlist',
      skills: validatedSkills,
    };
  } catch (err) {
    console.error('Failed to decode shared playlist from hash:', err);
    return null;
  }
}

/**
 * Returns a unique playlist name by appending " (2)", " (3)", etc. if a playlist
 * with the target name already exists.
 */
export function getUniquePlaylistName(desiredName: string, existingNames: string[]): string {
  const trimmed = desiredName.trim() || 'New Routine';
  const existingSet = new Set(existingNames.map((n) => n.trim().toLowerCase()));

  if (!existingSet.has(trimmed.toLowerCase())) {
    return trimmed;
  }

  // Base pattern without existing " (N)" suffix
  const baseName = trimmed.replace(/\s\(\d+\)$/, '');
  let counter = 2;
  while (existingSet.has(`${baseName} (${counter})`.toLowerCase())) {
    counter++;
  }
  return `${baseName} (${counter})`;
}
