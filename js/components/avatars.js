import presets from '../../data/avatar-presets.json';
import { SUPABASE_URL } from '../config.js';
import { escapeHTML } from '../services/supabase.js';

const presetsBySource = new Map(presets.map((preset) => [preset.src, preset]));
const presetPaths = presets.map((preset) => preset.src);

function fallbackPreset(identity = 'guest') {
  const text = String(identity || 'guest');
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return presets[(hash >>> 0) % presets.length];
}

export function avatarSource(profile = {}) {
  if (presetsBySource.has(profile.avatar_url)) return profile.avatar_url;

  // Only display uploaded files from this project's public avatar bucket.
  try {
    const project = new URL(SUPABASE_URL);
    const uploaded = new URL(profile.avatar_url);
    if (project.protocol === 'https:' && uploaded.protocol === 'https:' &&
      uploaded.origin === project.origin &&
      /^\/storage\/v1\/object\/public\/vexra-avatars\/[a-zA-Z0-9/_-]+\.(?:jpe?g|png|webp)$/i.test(uploaded.pathname)) {
      return uploaded.toString();
    }
  } catch {}

  return fallbackPreset(profile.id || profile.username || profile.display_name).src;
}

export function avatarMarkup(profile = {}, className = 'gv-player-avatar', alt = '') {
  const src = avatarSource(profile);
  return `<img class="${className}" src="${escapeHTML(src)}" alt="${escapeHTML(alt)}" loading="lazy" decoding="async">`;
}

export function avatarPresets() {
  return presets;
}

export function isAvatarPreset(src) {
  return presetPaths.includes(src);
}
