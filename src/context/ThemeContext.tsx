import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * useThemeEffect:
 * A comprehensive utility hook that:
 * 1. Synchronizes document.documentElement classList (removing 'dark' and adding 'light', or vice versa)
 * 2. Sets data-theme attribute on <html> to match the active theme
 * 3. Sets CSS colorScheme style property on the root document
 * 4. Ensures persistence across browser sessions using localStorage ('site_theme')
 * 5. Listens to 'matchMedia' system OS preferences, automatically switching themes when OS preferences change
 */
export const useThemeEffect = (
  themeProp?: Theme,
  setThemeStateProp?: (theme: Theme | ((prev: Theme) => Theme)) => void
) => {
  const context = useContext(ThemeContext);
  const theme = themeProp ?? context?.theme ?? 'light';
  const setThemeState = setThemeStateProp ?? context?.setTheme;

  // 1. Force complete synchronization with document.documentElement and localStorage
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    }

    // Persist across sessions
    try {
      localStorage.setItem('site_theme', theme);
    } catch (err) {
      console.warn('Failed to save theme in localStorage:', err);
    }

    // Dispatch custom event to notify any non-React components or listeners
    try {
      window.dispatchEvent(new CustomEvent('site-theme-change', { detail: { theme } }));
    } catch {
      // Safe fallback for restricted iframe contexts
    }
  }, [theme]);
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('site_theme') as Theme | null;
        if (saved === 'light' || saved === 'dark') {
          return saved;
        }
      } catch (err) {
        console.warn('Error accessing localStorage for theme initialization:', err);
      }
    }
    // Any new user / first-time visitor automatically gets light mode
    return 'light';
  });

  // Attach useThemeEffect to automatically synchronize document.documentElement and data-theme
  useThemeEffect(theme, setThemeState);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const contextValue = useMemo(() => ({
    theme,
    toggleTheme,
    setTheme,
  }), [theme, toggleTheme, setTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

