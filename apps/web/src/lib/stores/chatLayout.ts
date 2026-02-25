import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type ChatLayout = 'classic' | 'modern';
export type ModernTheme = 'light' | 'dark-blue';

const LAYOUT_KEY = 'localmighty_chat_layout';
const THEME_KEY = 'localmighty_chat_theme';

function createChatLayoutStore() {
  const storedLayout = browser ? (localStorage.getItem(LAYOUT_KEY) as ChatLayout) : null;
  const initialLayout: ChatLayout = storedLayout || 'classic';

  const { subscribe, set } = writable<ChatLayout>(initialLayout);

  return {
    subscribe,
    set: (layout: ChatLayout) => {
      if (browser) {
        localStorage.setItem(LAYOUT_KEY, layout);
      }
      set(layout);
    },
    toggle: () => {
      const current = browser ? (localStorage.getItem(LAYOUT_KEY) as ChatLayout) || 'classic' : 'classic';
      const newLayout: ChatLayout = current === 'classic' ? 'modern' : 'classic';
      if (browser) {
        localStorage.setItem(LAYOUT_KEY, newLayout);
      }
      set(newLayout);
    },
  };
}

function createModernThemeStore() {
  const storedTheme = browser ? (localStorage.getItem(THEME_KEY) as ModernTheme) : null;
  const initialTheme: ModernTheme = storedTheme || 'light';

  const { subscribe, set } = writable<ModernTheme>(initialTheme);

  return {
    subscribe,
    set: (theme: ModernTheme) => {
      if (browser) {
        localStorage.setItem(THEME_KEY, theme);
      }
      set(theme);
    },
    toggle: () => {
      const current = browser ? (localStorage.getItem(THEME_KEY) as ModernTheme) || 'light' : 'light';
      const newTheme: ModernTheme = current === 'light' ? 'dark-blue' : 'light';
      if (browser) {
        localStorage.setItem(THEME_KEY, newTheme);
      }
      set(newTheme);
    },
  };
}

export const chatLayoutStore = createChatLayoutStore();
export const modernThemeStore = createModernThemeStore();
