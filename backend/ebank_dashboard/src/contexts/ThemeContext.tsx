import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type SgTheme = 'dark' | 'light';

const STORAGE_KEY = 'sg-theme';

type ThemeContextValue = {
  theme: SgTheme;
  setTheme: (theme: SgTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): SgTheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  return 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<SgTheme>(() => readStoredTheme());

  useEffect(() => {
    document.documentElement.classList.remove('sg-theme-dark', 'sg-theme-light');
    document.documentElement.classList.add(`sg-theme-${theme}`);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setTheme = (next: SgTheme) => setThemeState(next);
  const toggleTheme = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
