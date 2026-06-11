'use client';

import { CHAT_THEMES } from '@/lib/themes';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface ChatThemePickerProps {
  chatId: string;
  currentThemeId: string;
  onClose: () => void;
}

export default function ChatThemePicker({ chatId, currentThemeId, onClose }: ChatThemePickerProps) {
  const handleSelectTheme = async (themeId: string) => {
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        themeId: themeId,
      });
      onClose();
    } catch (err) {
      console.error('Failed to update theme:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="glass-panel w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden p-6 animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-[var(--foreground)]">Chat Theme</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--hover)] text-gray-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {Object.entries(CHAT_THEMES).map(([id, theme]) => (
            <button
              key={id}
              onClick={() => handleSelectTheme(id)}
              className="flex flex-col items-center gap-2 group outline-none"
            >
              <div 
                className={`w-16 h-16 rounded-full border-2 transition-transform duration-200 group-hover:scale-110 group-active:scale-95 ${currentThemeId === id ? 'border-[var(--foreground)] shadow-lg' : 'border-transparent'}`}
                style={{ backgroundColor: theme.sentBg, borderColor: currentThemeId === id ? 'var(--foreground)' : theme.sentBorder }}
              />
              <span className={`text-xs font-medium text-center ${currentThemeId === id ? 'text-[var(--foreground)]' : 'text-gray-500'}`}>
                {theme.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
