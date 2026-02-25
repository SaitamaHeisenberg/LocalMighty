import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'localmighty_theme';

function createThemeStore() {
  // Get initial theme from localStorage or default to 'system'
  const storedTheme = browser ? (localStorage.getItem(STORAGE_KEY) as Theme) : null;
  const initialTheme: Theme = storedTheme || 'system';

  const { subscribe, set, update } = writable<Theme>(initialTheme);

  function applyTheme(theme: Theme) {
    if (!browser) return;

    const html = document.documentElement;
    let isDark = false;

    if (theme === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      isDark = theme === 'dark';
    }

    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }

  // Apply initial theme
  if (browser) {
    applyTheme(initialTheme);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const currentTheme = localStorage.getItem(STORAGE_KEY) as Theme;
      if (currentTheme === 'system' || !currentTheme) {
        applyTheme('system');
      }
    });
  }

  return {
    subscribe,
    set: (theme: Theme) => {
      if (browser) {
        localStorage.setItem(STORAGE_KEY, theme);
      }
      applyTheme(theme);
      set(theme);
    },
    toggle: () => {
      update((current) => {
        const newTheme: Theme = current === 'dark' ? 'light' : 'dark';
        if (browser) {
          localStorage.setItem(STORAGE_KEY, newTheme);
        }
        applyTheme(newTheme);
        return newTheme;
      });
    },
    init: () => {
      if (browser) {
        const theme = (localStorage.getItem(STORAGE_KEY) as Theme) || 'system';
        applyTheme(theme);
      }
    },
  };
}

export const themeStore = createThemeStore();
