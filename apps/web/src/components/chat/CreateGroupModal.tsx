'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '@/lib/firebase';
import { useAuthStore } from '@/lib/stores/authStore';

const functions = getFunctions(app);

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchedUser {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  phoneNumber?: string;
}

export default function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const router = useRouter();
  const { user } = useAuthStore();

  // Step state
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 fields
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');

  // Step 2 fields
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setGroupName('');
      setDescription('');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedMembers([]);
      setIsSearching(false);
      setIsCreating(false);
      setError('');
    }
  }, [isOpen]);

  // Focus search input when entering step 2
  useEffect(() => {
    if (step === 2 && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [step]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced user search
  const searchUsers = useCallback(
    async (query: string) => {
      if (query.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const searchUsersFn = httpsCallable<{ query: string }, { users: SearchedUser[] }>(
          functions,
          'searchUsers'
        );
        const result = await searchUsersFn({ query: query.trim() });
        // Filter out current user and already-selected members
        const filtered = (result.data.users || []).filter(
          (u) =>
            u.uid !== user?.uid &&
            !selectedMembers.some((m) => m.uid === u.uid)
        );
        setSearchResults(filtered);
      } catch (err) {
        console.error('Error searching users:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [user, selectedMembers]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(value);
    }, 300);
  };

  const addMember = (member: SearchedUser) => {
    setSelectedMembers((prev) => [...prev, member]);
    setSearchResults((prev) => prev.filter((u) => u.uid !== member.uid));
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const removeMember = (uid: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.uid !== uid));
  };

  const handleNextStep = () => {
    if (!groupName.trim()) {
      setError('Please enter a group name.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setError('');
  };

  const handleCreate = async () => {
    if (selectedMembers.length === 0) {
      setError('Please add at least one member.');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const createGroupFn = httpsCallable<
        { name: string; memberIds: string[]; description: string },
        { chatId: string }
      >(functions, 'createGroup');

      const result = await createGroupFn({
        name: groupName.trim(),
        memberIds: selectedMembers.map((m) => m.uid),
        description: description.trim(),
      });

      onClose();
      router.push(`/chat/view?id=${result.data.chatId}`);
    } catch (err: any) {
      console.error('Error creating group:', err);
      setError(err.message || 'Failed to create group. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={modalRef}
        className="relative w-full max-w-md mx-4 rounded-3xl glass-panel overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                onClick={handleBack}
                className="text-[var(--color-imessage-blue)] hover:opacity-70 transition-opacity text-sm font-medium"
              >
                Back
              </button>
            )}
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              {step === 1 ? 'New Group' : 'Add Members'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--surface)] flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 px-6 pb-4">
          <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-[var(--color-imessage-blue)]' : 'bg-[var(--border)]'}`} />
          <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-[var(--color-imessage-blue)]' : 'bg-[var(--border)]'}`} />
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-6 mb-3 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Group Name & Description */}
        {step === 1 && (
          <div className="px-6 pb-6 space-y-4">
            {/* Group avatar placeholder */}
            <div className="flex justify-center mb-2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--color-imessage-blue)] to-indigo-500 flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5 ml-1">
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                maxLength={50}
                className="w-full px-4 py-3 glass-input text-gray-800 placeholder-gray-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5 ml-1">
                Description <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this group about?"
                maxLength={200}
                rows={3}
                className="w-full px-4 py-3 glass-input text-gray-800 placeholder-gray-500 resize-none"
              />
            </div>

            <button
              onClick={handleNextStep}
              className="w-full py-3 bg-[var(--color-imessage-blue)] text-white font-semibold rounded-2xl hover:opacity-90 transition-opacity active:scale-[0.98] transform"
            >
              Next
            </button>
          </div>
        )}

        {/* Step 2: Search & Select Members */}
        {step === 2 && (
          <div className="px-6 pb-6 space-y-4">
            {/* Selected members chips */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map((member) => (
                  <div
                    key={member.uid}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-imessage-blue)]/10 text-[var(--color-imessage-blue)] rounded-full text-sm font-medium"
                  >
                    <span className="truncate max-w-[120px]">{member.displayName}</span>
                    <button
                      onClick={() => removeMember(member.uid)}
                      className="w-4 h-4 rounded-full bg-[var(--color-imessage-blue)]/20 flex items-center justify-center hover:bg-[var(--color-imessage-blue)]/30 transition-colors flex-shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-2.5 h-2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search by name or phone..."
                className="w-full pl-11 pr-4 py-3 glass-input text-gray-800 placeholder-gray-500"
              />
              {isSearching && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-[var(--color-imessage-blue)] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Search results */}
            <div className="max-h-48 overflow-y-auto rounded-2xl border border-[var(--border)] divide-y divide-[var(--border)]">
              {searchResults.length > 0 ? (
                searchResults.map((resultUser) => (
                  <button
                    key={resultUser.uid}
                    onClick={() => addMember(resultUser)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface)] transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex-shrink-0 flex items-center justify-center text-white text-sm font-medium overflow-hidden">
                      {resultUser.avatarUrl ? (
                        <img src={resultUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        resultUser.displayName?.substring(0, 2).toUpperCase() || '??'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {resultUser.displayName}
                      </p>
                      {resultUser.phoneNumber && (
                        <p className="text-xs text-gray-500 truncate">{resultUser.phoneNumber}</p>
                      )}
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-[var(--color-imessage-blue)] flex-shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                ))
              ) : searchQuery.trim().length >= 2 && !isSearching ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  No users found
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  Search for users to add to the group
                </div>
              )}
            </div>

            {/* Member count */}
            {selectedMembers.length > 0 && (
              <p className="text-xs text-gray-500 text-center">
                {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
              </p>
            )}

            {/* Create button */}
            <button
              onClick={handleCreate}
              disabled={isCreating || selectedMembers.length === 0}
              className="w-full py-3 bg-[var(--color-imessage-blue)] text-white font-semibold rounded-2xl hover:opacity-90 transition-opacity active:scale-[0.98] transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Group'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
