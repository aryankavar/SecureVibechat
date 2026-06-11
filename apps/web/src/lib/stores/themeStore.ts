import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  wallpaper: string;
  glassIntensity: number;
  accentColor: string;
  setWallpaper: (url: string) => void;
  setGlassIntensity: (intensity: number) => void;
  setAccentColor: (color: string) => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const PRESET_WALLPAPERS = [
  'linear-gradient(45deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
  'linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)',
  'linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)',
  'linear-gradient(120deg, #fdfbfb 0%, #ebedee 100%)',
  'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(to right, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(to right, #fa709a 0%, #fee140 100%)',
];

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      wallpaper: PRESET_WALLPAPERS[1], // Default to a soft blue gradient
      glassIntensity: 0.5, // 0 to 1, where 1 is fully opaque/blurry
      accentColor: '#0A84FF', // iOS blue
      
      setWallpaper: (url) => set({ wallpaper: url }),
      setGlassIntensity: (intensity) => set({ glassIntensity: intensity }),
      setAccentColor: (color) => set({ accentColor: color }),
      
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
