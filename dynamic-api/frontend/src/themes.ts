export type Theme = 'dark' | 'light' | 'ocean' | 'forest';

export interface ThemeOption {
  id: Theme;
  label: string;
  description: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    label: 'Dark',
    description: 'Slate background with cyan accents — default admin look.',
  },
  {
    id: 'light',
    label: 'Light',
    description: 'Bright interface for daytime and well-lit environments.',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Deep navy panels with teal highlights — calm, technical feel.',
  },
  {
    id: 'forest',
    label: 'Forest',
    description: 'Charcoal green surfaces with emerald accents — easy on the eyes.',
  },
];

export const THEME_ORDER: Theme[] = THEME_OPTIONS.map((t) => t.id);

export function getThemeOption(id: string): ThemeOption | undefined {
  return THEME_OPTIONS.find((t) => t.id === id);
}

export function isTheme(value: string): value is Theme {
  return THEME_ORDER.includes(value as Theme);
}

export function nextTheme(current: Theme): Theme {
  const index = THEME_ORDER.indexOf(current);
  return THEME_ORDER[(index + 1) % THEME_ORDER.length];
}
