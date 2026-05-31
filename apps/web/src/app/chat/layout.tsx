'use client';

import { useAuthStore } from '@/lib/stores/authStore';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import ChatList from '@/components/chat/ChatList';
import CreateGroupModal from '@/components/chat/CreateGroupModal';
import NewChatModal from '@/components/chat/NewChatModal';
import SearchPanel from '@/components/chat/SearchPanel';
import ProfileModal from '@/components/chat/ProfileModal';
import Image from 'next/image';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // If we are on /chat/view, a chat is active.
  const isChatActive = pathname === '/chat/view';

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    } else if (!isLoading && user && !profile) {
      router.push('/profile/setup');
    }
  }, [user, profile, isLoading, router]);

  if (isLoading || !user) {
    return null; // Let the global auth provider/layout handle loading, or show spinner
  }

  return (
    <div className="flex h-[100dvh] w-full bg-transparent overflow-hidden">
      {/* Sidebar: Chat List */}
      <div className={`w-full md:w-80 lg:w-96 flex-col glass-panel shrink-0 ${isChatActive ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 glass-header z-10 flex justify-between items-center sticky top-0">
          <h1 className="text-xl font-bold">Messages</h1>
          <div className="flex items-center gap-3">
            <button 
              className="text-[var(--color-imessage-blue)] transition-opacity hover:opacity-80 p-1"
              onClick={() => setShowNewChat(true)}
              aria-label="New Chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.158 3.71 3.71 1.159-1.157a2.625 2.625 0 000-3.711z" />
                <path d="M10.74 15.596l-3.236 1.079a.375.375 0 01-.47-.47l1.08-3.236a.375.375 0 01.11-.186l8.84-8.84 3.71 3.71-8.84 8.84a.375.375 0 01-.185.109z" />
              </svg>
            </button>
            <button 
              className="relative w-8 h-8 rounded-full overflow-hidden border border-[var(--border)] transition-opacity hover:opacity-80"
              onClick={() => setShowProfile(true)}
              aria-label="Profile Settings"
            >
              {profile ? (
                <Image
                  src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || 'User')}`}
                  alt="Profile"
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="p-3">
          <div className="relative cursor-pointer" onClick={() => setShowSearch(true)}>
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
              </svg>
            </div>
            <div className="block w-full p-2 pl-10 text-sm text-gray-800 bg-white/40 border border-white/60 backdrop-blur-md rounded-xl shadow-inner focus:outline-none">
              Search
            </div>
          </div>
        </div>

        {/* Chat List Items */}
        <ChatList />
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex-col relative ${isChatActive ? 'flex' : 'hidden md:flex'}`}>
        {children}
      </div>

      {/* Modals and Overlays */}
      {showNewChat && (
        <NewChatModal 
          isOpen={showNewChat} 
          onClose={() => setShowNewChat(false)} 
          onOpenGroupCreate={() => setShowCreateGroup(true)}
        />
      )}
      
      {showCreateGroup && (
        <CreateGroupModal isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} />
      )}
      
      {showSearch && (
        <SearchPanel 
          isOpen={showSearch} 
          onClose={() => setShowSearch(false)} 
          onResultClick={(chatId, messageId) => {
            setShowSearch(false);
            router.push(`/chat/view?id=${chatId}`);
            // In a full implementation, we would scroll to the messageId
          }}
        />
      )}
      
      {showProfile && (
        <ProfileModal 
          isOpen={showProfile} 
          onClose={() => setShowProfile(false)} 
        />
      )}
    </div>
  );
}

