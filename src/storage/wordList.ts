// Curated dictionary of friendly, easy-to-spell adjectives and nouns
export const ADJECTIVES = [
  'amber', 'ancient', 'atomic', 'azure', 'bright', 'brave', 'brisk', 'breezy',
  'calm', 'clever', 'copper', 'coral', 'cosmic', 'crimson', 'crisp', 'crystal',
  'dapper', 'daring', 'dawn', 'deft', 'delta', 'dune', 'eager', 'early',
  'echo', 'ember', 'epic', 'fair', 'fast', 'fierce', 'firm', 'flying',
  'fresh', 'frost', 'funky', 'gentle', 'giant', 'glad', 'glowing', 'golden',
  'grand', 'groovy', 'happy', 'hardy', 'hasty', 'heroic', 'hidden', 'honest',
  'humble', 'husky', 'hyper', 'icy', 'indigo', 'iron', 'jolly', 'keen',
  'kind', 'laser', 'light', 'lively', 'loyal', 'lucky', 'lunar', 'magic',
  'mellow', 'merry', 'mighty', 'minty', 'modern', 'mystic', 'neon', 'nimble',
  'noble', 'nova', 'ocean', 'olive', 'onyx', 'opal', 'orbit', 'peppy',
  'pilot', 'polar', 'prime', 'pure', 'quick', 'quiet', 'rapid', 'ready',
  'retro', 'rich', 'rising', 'robin', 'robust', 'royal', 'ruby', 'rustic',
  'sage', 'sharp', 'shiny', 'silent', 'silver', 'simple', 'sleek', 'smooth',
  'solar', 'sonic', 'spark', 'speedy', 'steady', 'stellar', 'storm', 'strong',
  'sunny', 'super', 'swift', 'teal', 'tidal', 'timely', 'topaz', 'true',
  'turbo', 'urban', 'valiant', 'velvet', 'vibrant', 'vivid', 'warm', 'wild',
  'wise', 'witty', 'zen', 'zephyr'
];

export const NOUNS = [
  'badger', 'beacon', 'bear', 'beat', 'beaver', 'bison', 'bongo', 'breeze',
  'cadence', 'canyon', 'cedar', 'cheetah', 'cliff', 'cloud', 'clover', 'comet',
  'compass', 'condor', 'coral', 'cosmos', 'coyote', 'crane', 'crater', 'cymbal',
  'delta', 'dolphin', 'drift', 'drummer', 'eagle', 'echo', 'ember', 'falcon',
  'feather', 'fern', 'finch', 'flame', 'flash', 'forest', 'fox', 'galaxy',
  'glacier', 'groove', 'harbor', 'hawk', 'haven', 'hihat', 'horizon', 'hummingbird',
  'island', 'jaguar', 'jungle', 'kiwi', 'lagoon', 'lake', 'lark', 'legend',
  'leopard', 'lightning', 'lion', 'lotus', 'lynx', 'meadow', 'meteor', 'metronome',
  'mirage', 'moon', 'mountain', 'nebula', 'nest', 'oasis', 'ocean', 'orbit',
  'otter', 'owl', 'panda', 'panther', 'paradiddle', 'pebble', 'pelican', 'phoenix',
  'pioneer', 'planet', 'plateau', 'polar', 'pulse', 'pyramid', 'quiver', 'raven',
  'reef', 'rhino', 'rhythm', 'ridge', 'river', 'robin', 'rocket', 'rudiment',
  'sail', 'sea', 'sequoia', 'shadow', 'snare', 'solstice', 'sound', 'spark',
  'stride', 'summit', 'swift', 'tempo', 'throne', 'tiger', 'timber', 'traill',
  'tsunami', 'tundra', 'valley', 'vessel', 'voyager', 'wave', 'wind', 'wolf',
  'woodblock', 'zenith'
];

/**
 * Generates a memorable 2-word code (e.g. "funky-badger" or "swift-cymbal")
 */
export function generateWordCode(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}-${noun}`.toLowerCase();
}
