import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeState {
  wallpaper: string | null;
  glassIntensity: number;
  accentColor: string;
  setWallpaper: (wallpaper: string | null) => void;
  setGlassIntensity: (intensity: number) => void;
  setAccentColor: (color: string) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      wallpaper: null,
      glassIntensity: 0.1, // Adjusted for Mobile blur
      accentColor: '#0A84FF', // iMessage blue
      setWallpaper: (wallpaper) => set({ wallpaper }),
      setGlassIntensity: (glassIntensity) => set({ glassIntensity }),
      setAccentColor: (accentColor) => set({ accentColor }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
