'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const functions = getFunctions(app);

interface SearchedUser {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  about?: string;
  publicKey?: string;
  phoneNumber?: string;
}

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGroupCreate: () => void;
}

export default function NewChatModal({ isOpen, onClose, onOpenGroupCreate }: NewChatModalProps) {
  const { user } = useAuthStore();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [error, setError] = useState('');
  
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const searchUsersFn = httpsCallable<{ query: string }, { users: SearchedUser[] }>(
          functions,
          'searchUsers'
        );
        const result = await searchUsersFn({ query: searchQuery.trim() });
        
        setSearchResults(result.data.users || []);
      } catch (err) {
        console.error('Error searching users:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, functions]);

  const handleStartChat = async (selectedUser: SearchedUser) => {
    if (!user) return;
    
    setIsCreatingChat(true);
    setError('');
    
    try {
      const createChatFn = httpsCallable<{ recipientId: string }, { chatId: string }>(
        functions,
        'createChat'
      );
      
      const result = await createChatFn({
        recipientId: selectedUser.uid
      });
      
      if (result.data.chatId) {
        onClose();
        router.push(`/chat/view?id=${result.data.chatId}`);
      }
    } catch (err: any) {
      console.error('Error creating chat:', err);
      setError(err.message || 'Failed to start chat');
    } finally {
      setIsCreatingChat(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="glass-panel w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[var(--border)]">
          <h2 className="text-xl font-bold">New Chat</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--hover)] text-gray-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm animate-in fade-in">
              {error}
            </div>
          )}
          
          <button
            onClick={() => {
              onClose();
              onOpenGroupCreate();
            }}
            className="w-full flex items-center p-3 mb-4 rounded-xl hover:bg-[var(--hover)] transition-colors group"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--color-imessage-blue)] flex items-center justify-center text-white mr-4 group-hover:scale-105 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="font-medium text-[var(--foreground)]">New Group</h3>
              <p className="text-sm text-gray-500">Create a group chat</p>
            </div>
          </button>
          
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              {searchQuery.trim().length === 0 ? "Suggested Contacts" : "Search Contacts"}
            </h3>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by name or +Phone Number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-imessage-blue)] text-[var(--foreground)]"
              />
            </div>
          </div>
          
          <div className="space-y-1 mt-4">
            {isSearching ? (
              <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-4 border-[var(--color-imessage-blue)] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((resultUser) => (
                <div 
                  key={resultUser.uid} 
                  onClick={() => !isCreatingChat && handleStartChat(resultUser)}
                  className={`flex items-center p-3 rounded-xl cursor-pointer transition-colors ${isCreatingChat ? 'opacity-50' : 'hover:bg-[var(--hover)]'}`}
                >
                  <div className="relative w-12 h-12 rounded-full overflow-hidden mr-4 shrink-0 bg-[var(--background)]">
                    <Image
                      src={resultUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(resultUser.displayName || 'User')}`}
                      alt={resultUser.displayName}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate text-[var(--foreground)]">{resultUser.displayName}</h4>
                    {resultUser.phoneNumber && (
                      <p className="text-xs text-[var(--color-imessage-blue)] font-medium truncate mb-0.5">{resultUser.phoneNumber}</p>
                    )}
                    {resultUser.about && (
                      <p className="text-xs text-gray-500 truncate">{resultUser.about}</p>
                    )}
                  </div>
                </div>
              ))
            ) : searchQuery.trim().length > 0 ? (
              <div className="text-center p-8 text-gray-500">
                <p>No users found</p>
                <p className="text-xs mt-1">Make sure you include the country code (e.g. +91)</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
