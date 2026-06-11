'use client';

import { useState, useRef } from 'react';
import { useThemeStore, PRESET_WALLPAPERS } from '@/lib/stores/themeStore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuthStore } from '@/lib/stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

interface ThemeSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACCENT_COLORS = [
  '#0A84FF', // Blue
  '#30D158', // Green
  '#FF453A', // Red
  '#FF9F0A', // Orange
  '#BF5AF2', // Purple
  '#5E5CE6', // Indigo
];

export default function ThemeSettings({ isOpen, onClose }: ThemeSettingsProps) {
  const { wallpaper, glassIntensity, accentColor, setWallpaper, setGlassIntensity, setAccentColor } = useThemeStore();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleCustomWallpaper = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('Wallpaper image is too large. Please choose an image under 15MB.');
      return;
    }

    if (!file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
      alert('Please select a valid image file (JPG, PNG, WebP). HEIC formats from iPhones are not supported on the web yet, please convert to JPG first.');
      setIsUploading(false);
      return;
    }
    
    setIsUploading(true);
    try {
      const storage = getStorage();
      const fileRef = ref(storage, `wallpapers/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      setWallpaper(url);
    } catch (error: any) {
      console.error('Error uploading wallpaper:', error);
      if (error?.code === 'storage/unauthorized') {
        alert('Permission denied: The file may be too large or an invalid format.');
      } else {
        alert('Failed to upload custom wallpaper. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full sm:max-w-md h-[90vh] sm:h-[85vh] bg-white/40 dark:bg-black/40 backdrop-blur-[40px] saturate-[180%] border border-white/50 dark:border-white/10 sm:rounded-[32px] rounded-t-[32px] overflow-hidden flex flex-col shadow-2xl"
          >
            {/* iOS Settings Header */}
            <div className="flex items-center justify-between p-4 sticky top-0 bg-transparent z-10 border-b border-gray-200/50 dark:border-white/10">
              <button onClick={onClose} className="flex items-center text-[var(--color-accent)] font-medium">
                <ChevronLeft size={24} />
                <span>Back</span>
              </button>
              <h2 className="text-lg font-semibold absolute left-1/2 -translate-x-1/2 text-black dark:text-white">Appearance</h2>
              <div className="w-16" /> {/* Spacer */}
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-6">
              
              {/* Wallpaper Section */}
              <div className="space-y-2">
                <h3 className="text-[13px] uppercase text-gray-500 font-medium px-4">Wallpaper</h3>
                <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-[16px] p-4 shadow-sm border border-white/50 dark:border-white/10">
                  <div className="grid grid-cols-3 gap-3">
                    {PRESET_WALLPAPERS.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => setWallpaper(preset)}
                        className={`aspect-[9/16] rounded-xl shadow-sm transition-transform relative overflow-hidden ${wallpaper === preset ? 'ring-2 ring-[var(--color-accent)] ring-offset-2 dark:ring-offset-[#2C2C2E]' : ''}`}
                        style={{ background: preset, backgroundSize: 'cover' }}
                      >
                        {wallpaper === preset && (
                          <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                            <div className="w-6 h-6 bg-[var(--color-accent)] rounded-full flex items-center justify-center text-white">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="aspect-[9/16] rounded-xl bg-gray-100 dark:bg-gray-700 flex flex-col items-center justify-center gap-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <span className="text-2xl">+</span>
                      <span className="text-xs font-medium">{isUploading ? '...' : 'Custom'}</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleCustomWallpaper} />
                  </div>
                </div>
              </div>

              {/* Glass Intensity Slider (Thick iOS Style) */}
              <div className="space-y-2">
                <h3 className="text-[13px] uppercase text-gray-500 font-medium px-4">Liquid Glass</h3>
                <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-[16px] p-4 shadow-sm flex flex-col gap-4 border border-white/50 dark:border-white/10">
                  <p className="text-sm text-gray-500">Adjust the blur intensity of floating elements.</p>
                  <div className="relative h-12 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex items-center">
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-[var(--color-accent)] transition-all"
                      style={{ width: `${glassIntensity * 100}%` }}
                    />
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05"
                      value={glassIntensity}
                      onChange={(e) => setGlassIntensity(parseFloat(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div 
                      className="absolute w-8 h-8 bg-white rounded-full shadow-md pointer-events-none transition-all"
                      style={{ left: `calc(${glassIntensity * 100}% - 16px)`, marginLeft: glassIntensity < 0.1 ? '16px' : glassIntensity > 0.9 ? '-16px' : '0' }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 font-medium px-2 uppercase">
                    <span>Clear</span>
                    <span>Frosted</span>
                  </div>
                </div>
              </div>

              {/* Accent Color Section */}
              <div className="space-y-2">
                <h3 className="text-[13px] uppercase text-gray-500 font-medium px-4">Accent Color</h3>
                <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-[16px] p-4 shadow-sm border border-white/50 dark:border-white/10">
                  <div className="flex justify-between flex-wrap gap-2">
                    {ACCENT_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setAccentColor(color)}
                        className={`w-12 h-12 rounded-full transition-all relative ${accentColor === color ? 'scale-110 shadow-lg' : 'hover:scale-105'}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                      >
                        {accentColor === color && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 border-2 border-white rounded-full" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
