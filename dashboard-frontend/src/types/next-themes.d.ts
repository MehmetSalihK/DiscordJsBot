declare module 'next-themes' {
  export type Theme = 'light' | 'dark' | 'system';
  
  export interface ThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
    enableSystem?: boolean;
    enableColorScheme?: boolean;
    disableTransitionOnChange?: boolean;
    value?: Record<Theme, string>;
    nonce?: string;
  }

  export const ThemeProvider: React.FC<ThemeProviderProps>;
  
  export function useTheme(): {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    themes: Theme[];
    systemTheme: Theme | null;
  };
}
