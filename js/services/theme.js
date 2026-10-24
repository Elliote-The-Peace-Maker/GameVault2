export const THEMES = [
  { id: 'vice-city', name: 'Vice City', era: '1986 / Leonida', description: 'Neon pink, ocean cyan, and midnight blue.', colors: ['#ff3e9d', '#50e5f1'] },
  { id: 'liberty-city', name: 'Liberty City', era: 'Classic / GTA III', description: 'Concrete slate, amber streetlights, and cold blue.', colors: ['#e0ad60', '#73c8e9'] },
  { id: 'san-andreas', name: 'San Andreas', era: '1992', description: 'Sunset orange, palm green, and warm dusk.', colors: ['#f69a4c', '#86c982'] },
  { id: 'gta-iv', name: 'Liberty City · GTA IV', era: '2008', description: 'Steel blue, graphite, and restrained gold.', colors: ['#dbb465', '#79aee8'] },
  { id: 'los-santos', name: 'Los Santos', era: '2013', description: 'Coastal blue, cream, and sunset coral.', colors: ['#e9a95c', '#69c9e9'] },
  { id: 'leonida', name: 'Leonida', era: 'Modern day', description: 'Tropical aqua, hot coral, and humid night.', colors: ['#fb688f', '#50d8c7'] },
];

const STORAGE_KEY = 'gamevault-ui-theme';
const allowed = new Set(THEMES.map((theme) => theme.id));

export function normalizeTheme(theme) {
  return allowed.has(theme) ? theme : 'vice-city';
}

export function getSavedTheme() {
  try {
    return normalizeTheme(localStorage.getItem(STORAGE_KEY));
  } catch {
    return 'vice-city';
  }
}

export function saveLocalTheme(theme) {
  const safeTheme = normalizeTheme(theme);
  try {
    localStorage.setItem(STORAGE_KEY, safeTheme);
  } catch {
    // The theme still applies for this page even if browser storage is unavailable.
  }
  return safeTheme;
}

export function applyTheme(theme, { remember = false } = {}) {
  const safeTheme = remember ? saveLocalTheme(theme) : normalizeTheme(theme);
  document.documentElement.dataset.gvTheme = safeTheme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = safeTheme === 'vice-city' ? '#111023' : '#10131d';
  return safeTheme;
}
