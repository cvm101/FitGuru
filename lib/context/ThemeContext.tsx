import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Palette tokens ──────────────────────────────────────────────────────────

export interface ThemeColors {
  /** Main page background */
  bg: string;
  /** Card inner surface */
  card: string;
  /** Card outer shell (the "bezel") */
  cardOuter: string;
  /** Card outer border */
  cardOuterBorder: string;
  /** Secondary surfaces: stat tiles, row highlights */
  surface: string;
  /** Subtle surface used e.g. in the meal total row */
  surfaceAlt: string;
  /** Default border / divider */
  border: string;
  /** Stronger border e.g. input ring */
  borderStrong: string;
  /** List row separator */
  separator: string;
  /** Primary text */
  text: string;
  /** Secondary text — descriptions, subtitles */
  textSub: string;
  /** Muted / placeholder text */
  textMuted: string;
  /** Form label text */
  label: string;
  /** Input background */
  inputBg: string;
  /** Input border */
  inputBorder: string;
  /** Dashboard header gradient pair */
  headerGradient: readonly [string, string];
}

const LIGHT: ThemeColors = {
  bg: '#F1F5F9',
  card: '#FFFFFF',
  cardOuter: '#E9EDF3',
  cardOuterBorder: 'rgba(15,23,42,0.07)',
  surface: '#F8FAFC',
  surfaceAlt: '#FAFAFA',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  separator: '#F8FAFC',
  text: '#0F172A',
  textSub: '#475569',
  textMuted: '#94A3B8',
  label: '#374151',
  inputBg: '#F8FAFC',
  inputBorder: '#E2E8F0',
  headerGradient: ['#0F172A', '#1E293B'],
};

const DARK: ThemeColors = {
  bg: '#0A0F1A',
  card: '#1A2435',
  cardOuter: '#131C2B',
  cardOuterBorder: 'rgba(255,255,255,0.06)',
  surface: '#0F172A',
  surfaceAlt: '#1A2435',
  border: '#334155',
  borderStrong: '#475569',
  separator: '#1E293B',
  text: '#F1F5F9',
  textSub: '#94A3B8',
  textMuted: '#64748B',
  label: '#94A3B8',
  inputBg: '#0F172A',
  inputBorder: '#334155',
  headerGradient: ['#050A12', '#0A0F1A'],
};

const STORAGE_KEY = 'app_theme';

// ─── Context ─────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  colors: LIGHT,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val === 'dark') setIsDark(true);
      })
      .finally(() => setLoaded(true));
  }, []);

  function toggleTheme() {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  }

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ isDark, colors: isDark ? DARK : LIGHT, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
