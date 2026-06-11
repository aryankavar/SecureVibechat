'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '@/lib/firebase';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const functions = getFunctions(app);

interface GroupInfoPanelProps {
  chatId: string;
  isOpen: boolean;
  onClose: () => void;
  groupInfo: any;
  participants: string[];
  currentUserId: string;
}

interface MemberProfile {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  phoneNumber?: string;
  about?: string;
}

interface SearchedUser {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  phoneNumber?: string;
}

export default function GroupInfoPanel({
  chatId,
  isOpen,
  onClose,
  groupInfo,
  participants,
  currentUserId,
}: GroupInfoPanelProps) {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [removingUid, setRemovingUid] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmRemoveUid, setConfirmRemoveUid] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isAdmin = groupInfo?.adminIds?.includes(currentUserId) ?? false;

  // Fetch member profiles
  useEffect(() => {
    if (!isOpen || !participants.length) return;

    const fetchMembers = async () => {
      setLoadingMembers(true);
      try {
        const profiles: MemberProfile[] = [];
        for (const uid of participants) {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            profiles.push({ uid, ...userDoc.data() } as MemberProfile);
          } else {
            profiles.push({ uid, displayName: `User ${uid.substring(0, 6)}` });
          }
        }
        setMembers(profiles);
      } catch (err) {
        console.error('Error fetching member profiles:', err);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [isOpen, participants]);

  // Focus search input when add member modal opens
  useEffect(() => {
    if (showAddMember && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showAddMember]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddMember) {
          setShowAddMember(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showAddMember]);

  // Search for users to add
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
        // Filter out users already in the group
        const filtered = (result.data.users || []).filter(
          (u) => !participants.includes(u.uid)
        );
        setSearchResults(filtered);
      } catch (err) {
        console.error('Error searching users:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [participants]
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

  const handleAddMember = async (uid: string) => {
    setError('');
    try {
      const addMemberFn = httpsCallable(functions, 'addGroupMember');
      await addMemberFn({ chatId, userId: uid });
      // Close add member modal and refresh will happen via parent re-render
      setShowAddMember(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err: any) {
      console.error('Error adding member:', err);
      setError(err.message || 'Failed to add member.');
    }
  };

  const handleRemoveMember = async (uid: string) => {
    setRemovingUid(uid);
    setError('');
    try {
      const removeMemberFn = httpsCallable(functions, 'removeGroupMember');
      await removeMemberFn({ chatId, userId: uid });
    } catch (err: any) {
      console.error('Error removing member:', err);
      setError(err.message || 'Failed to remove member.');
    } finally {
      setRemovingUid(null);
    }
  };

  const handleLeaveGroup = async () => {
    setIsLeaving(true);
    setError('');
    try {
      const removeMemberFn = httpsCallable(functions, 'removeGroupMember');
      await removeMemberFn({ chatId, userId: currentUserId });
      onClose();
    } catch (err: any) {
      console.error('Error leaving group:', err);
      setError(err.message || 'Failed to leave group.');
      setIsLeaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slide-in Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full w-full max-w-sm glass-panel z-50 transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Group Info</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--surface)] flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Group Avatar & Name */}
          <div className="flex flex-col items-center pt-6 pb-4 px-5">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--color-imessage-blue)] to-indigo-500 flex items-center justify-center shadow-lg mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-[var(--foreground)] text-center">
              {groupInfo?.name || 'Group Chat'}
            </h3>

            {groupInfo?.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1 max-w-[250px]">
                {groupInfo.description}
              </p>
            )}

            <p className="text-xs text-gray-400 mt-2">
              {participants.length} member{participants.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Error display */}
          {error && (
            <div className="mx-5 mb-3 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Members Section */}
          <div className="px-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Members
              </h4>
              {isAdmin && (
                <button
                  onClick={() => setShowAddMember(true)}
                  className="flex items-center gap-1.5 text-sm text-[var(--color-imessage-blue)] font-medium hover:opacity-70 transition-opacity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                  </svg>
                  Add
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
              {loadingMembers ? (
                // Loading skeleton
                [...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-16" />
                    </div>
                  </div>
                ))
              ) : (
                members.map((member) => {
                  const isMemberAdmin = groupInfo?.adminIds?.includes(member.uid) ?? false;
                  const isSelf = member.uid === currentUserId;

                  return (
                    <div
                      key={member.uid}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface)] transition-colors"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex-shrink-0 flex items-center justify-center text-white text-sm font-medium overflow-hidden">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          member.displayName?.substring(0, 2).toUpperCase() || '??'
                        )}
                      </div>

                      {/* Name & Badges */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[var(--foreground)] truncate">
                            {member.displayName}
                            {isSelf && <span className="text-gray-400 font-normal"> (You)</span>}
                          </p>
                          {isMemberAdmin && (
                            <span className="text-[10px] font-semibold text-[var(--color-imessage-blue)] bg-[var(--color-imessage-blue)]/10 px-2 py-0.5 rounded-full flex-shrink-0">
                              Admin
                            </span>
                          )}
                        </div>
                        {member.phoneNumber && (
                          <p className="text-xs text-gray-500 truncate">{member.phoneNumber}</p>
                        )}
                      </div>

                      {/* Remove button (admin only, not for self) */}
                      {isAdmin && !isSelf && (
                        <button
                          onClick={() => setConfirmRemoveUid(member.uid)}
                          disabled={removingUid === member.uid}
                          className="text-xs text-red-500 hover:text-red-600 font-medium px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 flex-shrink-0"
                        >
                          {removingUid === member.uid ? (
                            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            'Remove'
                          )}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Leave Group Button (pinned to bottom) */}
        <div className="px-5 pb-5 pt-3 border-t border-[var(--border)]">
          <button
            onClick={() => setConfirmLeave(true)}
            disabled={isLeaving}
            className="w-full py-3 bg-red-500/10 text-red-500 font-semibold rounded-2xl hover:bg-red-500/20 transition-colors active:scale-[0.98] transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLeaving ? (
              <>
                <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                Leaving...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Leave Group
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add Member Modal Overlay */}
      {showAddMember && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setShowAddMember(false);
              setSearchQuery('');
              setSearchResults([]);
            }}
          />

          <div className="relative w-full max-w-sm mx-4 rounded-3xl glass-panel overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Add Member</h3>
              <button
                onClick={() => {
                  setShowAddMember(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="w-8 h-8 rounded-full bg-[var(--surface)] flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search input */}
            <div className="px-5 pb-3">
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
            </div>

            {/* Results */}
            <div className="max-h-64 overflow-y-auto border-t border-[var(--border)] divide-y divide-[var(--border)]">
              {searchResults.length > 0 ? (
                searchResults.map((resultUser) => (
                  <button
                    key={resultUser.uid}
                    onClick={() => handleAddMember(resultUser.uid)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface)] transition-colors text-left"
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
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                    </svg>
                  </button>
                ))
              ) : searchQuery.trim().length >= 2 && !isSearching ? (
                <div className="px-5 py-8 text-center text-sm text-gray-500">
                  No users found
                </div>
              ) : (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  Search for users to add
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={!!confirmRemoveUid}
        title="Remove Member"
        message="Are you sure you want to remove this member from the group?"
        confirmText="Remove"
        isDestructive={true}
        onConfirm={() => {
          if (confirmRemoveUid) {
            handleRemoveMember(confirmRemoveUid);
            setConfirmRemoveUid(null);
          }
        }}
        onCancel={() => setConfirmRemoveUid(null)}
      />

      <ConfirmDialog
        isOpen={confirmLeave}
        title="Leave Group"
        message="Are you sure you want to leave this group? You won't be able to send or receive messages here anymore."
        confirmText="Leave"
        isDestructive={true}
        onConfirm={() => {
          handleLeaveGroup();
          setConfirmLeave(false);
        }}
        onCancel={() => setConfirmLeave(false)}
      />
    </>
  );
}
