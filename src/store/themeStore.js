import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'system', // 'light', 'dark', or 'system'
      resolvedTheme: 'dark', // actual applied theme
      
      // Initialize theme on app load
      initTheme: () => {
        const { theme } = get();
        const resolved = theme === 'system' 
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : theme;
        
        set({ resolvedTheme: resolved });
        get().applyTheme(resolved);
        
        // Listen for system theme changes
        if (theme === 'system') {
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (get().theme === 'system') {
              const newTheme = e.matches ? 'dark' : 'light';
              set({ resolvedTheme: newTheme });
              get().applyTheme(newTheme);
            }
          });
        }
      },
      
      // Apply theme to document
      applyTheme: (theme) => {
        const root = document.documentElement;
        
        // Add transition class for smooth theme switch
        root.classList.add('theme-transitioning');
        
        if (theme === 'dark') {
          root.classList.add('dark');
          root.style.colorScheme = 'dark';
        } else {
          root.classList.remove('dark');
          root.style.colorScheme = 'light';
        }
        
        // Remove transition class after animation
        setTimeout(() => {
          root.classList.remove('theme-transitioning');
        }, 500);
      },
      
      // Set theme
      setTheme: (theme) => {
        const resolved = theme === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : theme;
        
        set({ theme, resolvedTheme: resolved });
        get().applyTheme(resolved);
      },
      
      // Toggle between light and dark
      toggleTheme: () => {
        const { resolvedTheme } = get();
        const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
        set({ theme: newTheme, resolvedTheme: newTheme });
        get().applyTheme(newTheme);
      },
    }),
    {
      name: 'prepforge-theme',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
