'use client';

import { useState, useRef, useEffect } from 'react';

interface StickerPickerProps {
  onSelect: (stickerUrl: string) => void;
  onClose: () => void;
}

interface StickerCategory {
  id: string;
  label: string;
  icon: string;
  stickers: string[];
}

const STICKER_CATEGORIES: StickerCategory[] = [
  {
    id: 'smileys',
    label: 'Smileys',
    icon: '😊',
    stickers: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
      '🙂', '😉', '😊', '😇', '🥰', '😍', '😘', '😜',
    ],
  },
  {
    id: 'animals',
    label: 'Animals',
    icon: '🐶',
    stickers: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
      '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
    ],
  },
  {
    id: 'food',
    label: 'Food',
    icon: '🍕',
    stickers: [
      '🍎', '🍕', '🍔', '🍟', '🌮', '🍣', '🍜', '🍩',
      '🎂', '🍰', '🧁', '🍫', '☕', '🧋', '🍷', '🍺',
    ],
  },
  {
    id: 'activities',
    label: 'Activities',
    icon: '⚽',
    stickers: [
      '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎮', '🎯',
      '🎲', '🎸', '🎹', '🎨', '🏄', '🚴', '🧗', '🎪',
    ],
  },
  {
    id: 'travel',
    label: 'Travel',
    icon: '✈️',
    stickers: [
      '✈️', '🚗', '🚀', '🛸', '🚢', '🏖️', '🏔️', '🗽',
      '🗼', '🎡', '🌋', '🏕️', '🌅', '🌈', '🌙', '⭐',
    ],
  },
  {
    id: 'objects',
    label: 'Objects',
    icon: '💡',
    stickers: [
      '💡', '📱', '💻', '🎧', '📷', '🔑', '💎', '🎁',
      '🎈', '🎉', '🏆', '🥇', '💰', '📚', '✏️', '❤️',
    ],
  },
];

export default function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>(STICKER_CATEGORIES[0].id);
  const pickerRef = useRef<HTMLDivElement>(null);

  const currentCategory = STICKER_CATEGORIES.find((c) => c.id === activeCategory) ?? STICKER_CATEGORIES[0];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full left-4 mb-2 z-50 w-[340px] bg-white dark:bg-[#1C1C1E] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 flex flex-col"
      style={{ maxHeight: 350 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Stickers</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-0.5 px-2 pb-1 overflow-x-auto scrollbar-none">
        {STICKER_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveCategory(category.id)}
            className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-xs transition-all ${
              activeCategory === category.id
                ? 'bg-[var(--color-imessage-blue)]/10 text-[var(--color-imessage-blue)]'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
            title={category.label}
          >
            <span className="text-lg leading-none">{category.icon}</span>
            <span className="text-[10px] font-medium leading-none">{category.label}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px bg-[var(--border)]" />

      {/* Sticker grid */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="grid grid-cols-4 gap-2">
          {currentCategory.stickers.map((emoji, index) => (
            <button
              key={`${currentCategory.id}-${index}`}
              type="button"
              onClick={() => onSelect(emoji)}
              className="flex items-center justify-center w-[70px] h-[70px] rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all active:scale-90 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-imessage-blue)] mx-auto"
              title={`Send ${emoji} sticker`}
            >
              <span className="text-5xl leading-none select-none" style={{ fontSize: '50px' }}>
                {emoji}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-[var(--border)] text-center">
        <span className="text-[10px] text-gray-400">{currentCategory.label} Stickers</span>
      </div>
    </div>
  );
}
