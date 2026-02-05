import { create } from 'zustand';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

function applyTheme(mode: ThemeMode) {
  const isDark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

function getInitialMode(): ThemeMode {
  const stored = localStorage.getItem('kohout-theme') as ThemeMode | null;
  return stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'system';
}

export const useThemeStore = create<ThemeState>((set) => {
  const initial = getInitialMode();
  applyTheme(initial);

  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const current = useThemeStore.getState().mode;
    if (current === 'system') applyTheme('system');
  });

  return {
    mode: initial,
    setTheme: (mode) => {
      localStorage.setItem('kohout-theme', mode);
      applyTheme(mode);
      set({ mode });
    },
  };
});
