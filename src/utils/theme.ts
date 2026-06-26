/**
 * Theme utility functions for handling Dark / Light mode.
 */

export type Theme = 'dark' | 'light';

export const THEME_KEY = 'theme-preference';

/**
 * Resolves the initial theme based on localStorage or system preferences.
 */
export function getInitialTheme(fallbackWindow?: Window): Theme {
  const win = fallbackWindow || (typeof window !== 'undefined' ? window : null);
  if (!win) return 'dark';

  try {
    const stored = win.localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored as Theme;
    }

    // Default to system preference
    const mediaQuery = win.matchMedia('(prefers-color-scheme: light)');
    return mediaQuery.matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/**
 * Toggles the theme between dark and light.
 */
export function toggleTheme(currentTheme: Theme): Theme {
  return currentTheme === 'dark' ? 'light' : 'dark';
}

/**
 * Applies the theme class to the document root and persists it in localStorage.
 */
export function applyTheme(theme: Theme, fallbackWindow?: Window): void {
  const win = fallbackWindow || (typeof window !== 'undefined' ? window : null);
  if (!win) return;

  try {
    const root = win.document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    win.localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.error('Failed to apply/persist theme:', e);
  }
}
