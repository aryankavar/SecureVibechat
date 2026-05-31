'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface ContextMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface MessageContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
}

/**
 * Context menu that appears on right-click (desktop) or long-press (mobile).
 * Positioned dynamically to stay within viewport bounds.
 */
export default function MessageContextMenu({ items, children }: MessageContextMenuProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Close menu on outside click or scroll
  useEffect(() => {
    if (!visible) return;

    const handleClose = () => setVisible(false);
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('scroll', handleClose, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('scroll', handleClose, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible]);

  const handleOutsideClick = (e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setVisible(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setVisible(false);
  };

  // Position the menu, clamping to viewport
  const showMenu = useCallback((clientX: number, clientY: number) => {
    const menuWidth = 200;
    const menuHeight = items.length * 44 + 16; // approx height
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let x = clientX;
    let y = clientY;

    // Clamp to right edge
    if (x + menuWidth > viewportW - 8) {
      x = viewportW - menuWidth - 8;
    }
    // Clamp to bottom edge
    if (y + menuHeight > viewportH - 8) {
      y = viewportH - menuHeight - 8;
    }

    setPosition({ x, y });
    setVisible(true);
  }, [items.length]);

  // Right-click handler (desktop)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    showMenu(e.clientX, e.clientY);
  };

  // Long-press handlers (mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      showMenu(touch.clientX, touch.clientY);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <>
      {/* Wrapper around the message bubble */}
      <div
        ref={containerRef}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        className="select-none"
      >
        {children}
      </div>

      {/* Context menu portal */}
      {visible && (
        <div
          className="fixed inset-0 z-[100]"
          onClick={() => setVisible(false)}
        >
          {/* Subtle backdrop blur */}
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
          
          {/* Menu */}
          <div
            ref={menuRef}
            className="absolute bg-white dark:bg-[#2C2C2E] rounded-xl shadow-2xl overflow-hidden min-w-[180px] animate-in fade-in zoom-in-95 duration-150 border border-[var(--border)]"
            style={{ left: position.x, top: position.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  item.onClick();
                  setVisible(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left
                  ${item.danger 
                    ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' 
                    : 'text-[var(--foreground)] hover:bg-gray-100 dark:hover:bg-white/10'}
                  ${idx < items.length - 1 ? 'border-b border-[var(--border)]' : ''}
                `}
              >
                <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
