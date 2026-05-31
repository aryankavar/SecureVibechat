'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuthStore } from '@/lib/stores/authStore';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onResultClick: (chatId: string, messageId: string) => void;
}

interface SearchResult {
  chatId: string;
  messageId: string;
  senderId: string;
  timestamp: Date | null;
  chatName: string;
}

const RECENT_SEARCHES_KEY = 'svc_recent_searches';
const MAX_RECENT_SEARCHES = 5;

/**
 * iMessage-style search overlay for finding messages.
 *
 * Because messages are E2E-encrypted the panel cannot search plaintext.
 * Instead it queries Firestore for the user's chats and their messages,
 * displaying results as "Encrypted message from [sender] at [time]".
 */
export default function SearchPanel({ isOpen, onClose, onResultClick }: SearchPanelProps) {
  const { user } = useAuthStore();
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {
      // ignore parse errors
    }
  }, []);

  // Focus the input when the panel opens
  useEffect(() => {
    if (isOpen) {
      // Small delay so the slide-down animation is visible before focus
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    } else {
      setSearchText('');
      setResults([]);
    }
  }, [isOpen]);

  // Save a search term to recents
  const saveRecentSearch = useCallback((term: string) => {
    setRecentSearches((prev) => {
      const trimmed = term.trim();
      if (!trimmed) return prev;
      const updated = [trimmed, ...prev.filter((s) => s !== trimmed)].slice(0, MAX_RECENT_SEARCHES);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // quota exceeded – safe to ignore
      }
      return updated;
    });
  }, []);

  // Execute the search against Firestore
  const executeSearch = useCallback(
    async (term: string) => {
      if (!user || !term.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      saveRecentSearch(term);

      try {
        // 1. Get chats the user is in
        const chatsQuery = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', user.uid),
          orderBy('updatedAt', 'desc'),
          limit(20),
        );

        const chatsSnapshot = await getDocs(chatsQuery);
        const allResults: SearchResult[] = [];

        // 2. For each chat, fetch recent messages
        for (const chatDoc of chatsSnapshot.docs) {
          const chatData = chatDoc.data();
          const otherParticipant =
            chatData.participants?.find((p: string) => p !== user.uid) ?? 'Unknown';
          const chatName = chatData.chatName ?? `Chat with ${otherParticipant.substring(0, 6)}…`;

          const messagesQuery = query(
            collection(db, `chats/${chatDoc.id}/messages`),
            orderBy('createdAt', 'desc'),
            limit(10),
          );

          const messagesSnapshot = await getDocs(messagesQuery);

          messagesSnapshot.docs.forEach((msgDoc) => {
            const msgData = msgDoc.data();
            allResults.push({
              chatId: chatDoc.id,
              messageId: msgDoc.id,
              senderId: msgData.senderId ?? 'Unknown',
              timestamp: msgData.createdAt?.toDate?.() ?? null,
              chatName,
            });
          });
        }

        setResults(allResults);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [user, saveRecentSearch],
  );

  // Debounced search trigger
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      executeSearch(value);
    }, 300);
  };

  // Handle selecting a recent search
  const handleRecentClick = (term: string) => {
    setSearchText(term);
    executeSearch(term);
  };

  // Clear recents
  const clearRecents = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // ignore
    }
  };

  // Format timestamp to a friendly string
  const formatTimestamp = (date: Date | null): string => {
    if (!date) return '';
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-[var(--background)]"
      style={{ animation: 'slideDown 0.25s ease-out' }}
    >
      {/* Header with search bar */}
      <div className="px-4 pt-4 pb-2 glass-panel border-b border-[var(--border)]">
        <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
          {/* Search input */}
          <div className="relative flex-1">
            {/* Search icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>

            <input
              ref={inputRef}
              type="text"
              value={searchText}
              onChange={handleInputChange}
              placeholder="Search messages"
              className="w-full pl-9 pr-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--color-imessage-blue)] transition-colors"
            />

            {/* Clear input */}
            {searchText && (
              <button
                type="button"
                onClick={() => {
                  setSearchText('');
                  setResults([]);
                  inputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Clear search"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Cancel button */}
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-imessage-blue)] text-sm font-medium flex-shrink-0 hover:opacity-70 transition-opacity"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Loading state */}
        {isSearching && (
          <div className="flex justify-center py-8">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Searching…
            </div>
          </div>
        )}

        {/* Recent searches (shown when search is empty) */}
        {!searchText && !isSearching && recentSearches.length > 0 && (
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between mb-2 max-w-4xl mx-auto">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Recent Searches
              </h3>
              <button
                type="button"
                onClick={clearRecents}
                className="text-xs text-[var(--color-imessage-blue)] hover:opacity-70 transition-opacity"
              >
                Clear
              </button>
            </div>
            <div className="max-w-4xl mx-auto space-y-1">
              {recentSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => handleRecentClick(term)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors text-left"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4 text-gray-400 flex-shrink-0"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions when empty & no recents */}
        {!searchText && !isSearching && recentSearches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-10 h-10 mb-3"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <p className="text-sm">Search your conversations</p>
            <p className="text-xs mt-1 text-gray-400/70">
              Messages are end-to-end encrypted
            </p>
          </div>
        )}

        {/* Results */}
        {searchText && !isSearching && results.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <div className="px-4 py-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {results.length} {results.length === 1 ? 'result' : 'results'}
              </span>
            </div>
            {results.map((result) => (
              <button
                key={`${result.chatId}-${result.messageId}`}
                type="button"
                onClick={() => onResultClick(result.chatId, result.messageId)}
                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-[var(--surface)] transition-colors border-b border-[var(--border)] text-left"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex-shrink-0 flex items-center justify-center text-white text-sm font-medium">
                  {result.senderId.substring(0, 2).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-[var(--foreground)] truncate">
                      {result.chatName}
                    </span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatTimestamp(result.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    🔒 Encrypted message from {result.senderId.substring(0, 6)}…
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No results */}
        {searchText && !isSearching && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <p className="text-sm">No messages found</p>
            <p className="text-xs mt-1 text-gray-400/70">
              Try a different search term
            </p>
          </div>
        )}
      </div>

      {/* Inline keyframe for slide-down animation */}
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
