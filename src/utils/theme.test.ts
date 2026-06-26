import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getInitialTheme, toggleTheme, applyTheme, THEME_KEY } from './theme';

describe('Theme Utility Tests', () => {
  let mockStorage: Record<string, string>;
  let mockWindow: {
    localStorage: {
      getItem: ReturnType<typeof vi.fn>;
      setItem: ReturnType<typeof vi.fn>;
    };
    matchMedia: ReturnType<typeof vi.fn>;
    document: {
      documentElement: {
        classList: {
          add: ReturnType<typeof vi.fn>;
          remove: ReturnType<typeof vi.fn>;
        };
      };
    };
  };

  beforeEach(() => {
    mockStorage = {};
    mockWindow = {
      localStorage: {
        getItem: vi.fn((key) => mockStorage[key] || null),
        setItem: vi.fn((key, val) => {
          mockStorage[key] = val;
        }),
      },
      matchMedia: vi.fn().mockReturnValue({
        matches: false, // Default to dark mode (matches light: false)
      }),
      document: {
        documentElement: {
          classList: {
            add: vi.fn(),
            remove: vi.fn(),
          },
        },
      },
    };
  });

  it('should toggle theme correctly', () => {
    expect(toggleTheme('dark')).toBe('light');
    expect(toggleTheme('light')).toBe('dark');
  });

  it('should retrieve initial theme from localStorage if set', () => {
    mockStorage[THEME_KEY] = 'light';
    const theme = getInitialTheme(mockWindow as unknown as Window);
    expect(theme).toBe('light');
    expect(mockWindow.localStorage.getItem).toHaveBeenCalledWith(THEME_KEY);
  });

  it('should fall back to media query matching if localStorage is empty', () => {
    mockWindow.matchMedia = vi.fn().mockReturnValue({ matches: true }); // light mode preferred
    const theme = getInitialTheme(mockWindow as unknown as Window);
    expect(theme).toBe('light');
  });

  it('should apply light theme class and save to localStorage', () => {
    applyTheme('light', mockWindow as unknown as Window);
    expect(mockWindow.document.documentElement.classList.add).toHaveBeenCalledWith('light');
    expect(mockWindow.localStorage.setItem).toHaveBeenCalledWith(THEME_KEY, 'light');
  });

  it('should remove light theme class and save dark to localStorage', () => {
    applyTheme('dark', mockWindow as unknown as Window);
    expect(mockWindow.document.documentElement.classList.remove).toHaveBeenCalledWith('light');
    expect(mockWindow.localStorage.setItem).toHaveBeenCalledWith(THEME_KEY, 'dark');
  });
});
