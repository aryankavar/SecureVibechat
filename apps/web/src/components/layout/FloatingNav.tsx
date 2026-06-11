'use client';

import { usePathname, useRouter } from 'next/navigation';

interface FloatingNavProps {
  onSettingsClick: () => void;
}

export default function FloatingNav({ onSettingsClick }: FloatingNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isChatsActive = pathname?.startsWith('/chat');
  const isChatViewActive = pathname === '/chat/view';

  return (
    <>
      {/* Desktop Layout: Vertical left pill */}
      <div className="hidden md:flex flex-col justify-center h-full p-4 z-50">
        <div className="glass-panel rounded-full p-2 py-4 flex flex-col gap-6 shadow-2xl items-center border border-[var(--color-glass-panel-border)]">
          <NavButton 
            icon="chats" 
            label="Chats" 
            isActive={isChatsActive} 
            onClick={() => router.push('/chat')} 
          />
          <NavButton 
            icon="settings" 
            label="Settings" 
            isActive={false} 
            onClick={onSettingsClick} 
          />
        </div>
      </div>

      {/* Mobile Layout: Horizontal bottom pill */}
      {!isChatViewActive && (
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[320px]">
          <div className="glass-panel rounded-full p-2 px-6 flex justify-around shadow-2xl border border-[var(--color-glass-panel-border)]">
            <NavButton 
              icon="chats" 
              label="Chats" 
              isActive={isChatsActive} 
              onClick={() => router.push('/chat')} 
            />
            <NavButton 
              icon="settings" 
              label="Settings" 
              isActive={false} 
              onClick={onSettingsClick} 
            />
          </div>
        </div>
      )}
    </>
  );
}

interface NavButtonProps {
  icon: 'chats' | 'settings';
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function NavButton({ icon, label, isActive, onClick }: NavButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`relative group flex flex-col items-center justify-center gap-1 transition-all duration-300 ${isActive ? 'scale-110' : 'hover:scale-105'}`}
    >
      <div className={`p-3 rounded-2xl flex items-center justify-center transition-colors duration-300 ${isActive ? 'bg-[var(--color-imessage-blue)] text-white shadow-lg' : 'text-gray-500 hover:bg-[var(--hover)] hover:text-[var(--foreground)]'}`}>
        {icon === 'chats' && (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75c.95 0 1.867-.137 2.738-.393a8.972 8.972 0 013.91 2.392.75.75 0 001.274-.699 9.006 9.006 0 00-.737-2.316A9.75 9.75 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75z" clipRule="evenodd" />
          </svg>
        )}
        {icon === 'settings' && (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-[var(--color-imessage-blue)]' : 'text-gray-500'}`}>
        {label}
      </span>
    </button>
  );
}
