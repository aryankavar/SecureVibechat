'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { useAuthStore } from '@/lib/stores/authStore';
import Link from 'next/link';

interface ChatPreview {
  id: string;
  type?: 'dm' | 'group';
  participants: string[];
  groupInfo?: {
    name: string;
    avatarUrl: string;
  };
  lastMessage?: {
    text: string;
    timestamp: any;
    senderId: string;
    type: string;
  };
  unreadCount?: Record<string, number>;
  updatedAt: any;
}

export default function ChatList() {
  const { user } = useAuthStore();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatData: ChatPreview[] = [];
      const userIdsToFetch = new Set<string>();

      snapshot.forEach((docSnap) => {
        const data = { id: docSnap.id, ...docSnap.data() } as ChatPreview;
        chatData.push(data);

        // Collect user IDs we need names for (DM chats)
        if (data.type !== 'group') {
          const otherId = data.participants.find((id) => id !== user.uid);
          if (otherId && !userNames[otherId]) {
            userIdsToFetch.add(otherId);
          }
        }
      });

      // Fetch missing user names
      if (userIdsToFetch.size > 0) {
        const newNames: Record<string, string> = { ...userNames };
        await Promise.all(
          Array.from(userIdsToFetch).map(async (uid) => {
            const userSnap = await getDoc(doc(db, 'users', uid));
            if (userSnap.exists()) {
              newNames[uid] = userSnap.data().displayName || `User ${uid.substring(0, 4)}`;
            }
          })
        );
        setUserNames(newNames);
      }

      setChats(chatData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching chats:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-3 animate-pulse">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm mt-10">
        No chats yet. Start a new conversation!
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {chats.map((chat) => {
        const isGroup = chat.type === 'group';
        const unread = chat.unreadCount?.[user?.uid || ''] || 0;

        // Determine display name
        let displayName = 'Chat';
        if (isGroup) {
          displayName = chat.groupInfo?.name || 'Group Chat';
        } else {
          const otherId = chat.participants.find((id) => id !== user?.uid);
          displayName = (otherId && userNames[otherId]) || `User ${(otherId || '').substring(0, 6)}`;
        }

        // Formatting timestamp
        let timeString = '';
        if (chat.updatedAt) {
          try {
            const date = chat.updatedAt.toDate();
            const now = new Date();
            const isToday = date.toDateString() === now.toDateString();
            timeString = isToday
              ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
          } catch {
            timeString = '';
          }
        }

        // Last message preview
        let preview = 'New chat';
        if (chat.lastMessage) {
          const msgType = chat.lastMessage.type;
          if (msgType === 'text') preview = '🔒 Encrypted message';
          else if (msgType === 'image') preview = '📷 Photo';
          else if (msgType === 'video') preview = '🎬 Video';
          else if (msgType === 'audio') preview = '🎤 Voice message';
          else if (msgType === 'file') preview = '📎 Document';
          else if (msgType === 'sticker') preview = '🏷️ Sticker';
          else if (msgType === 'system') preview = chat.lastMessage.text || 'System message';
          else preview = chat.lastMessage.text || 'New chat';
        }

        return (
          <Link
            href={`/chat/view?id=${chat.id}`}
            key={chat.id}
            className="flex items-center px-4 py-3 hover:bg-[var(--surface)] transition-colors border-b border-[var(--border)] cursor-pointer"
          >
            {/* Avatar */}
            {isGroup ? (
              chat.groupInfo?.avatarUrl ? (
                <img src={chat.groupInfo.avatarUrl} alt="" className="w-12 h-12 rounded-full flex-shrink-0 object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex-shrink-0 flex items-center justify-center text-white font-medium">
                  {displayName.substring(0, 2).toUpperCase()}
                </div>
              )
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex-shrink-0 flex items-center justify-center text-white font-medium">
                {displayName.substring(0, 2).toUpperCase()}
              </div>
            )}

            <div className="ml-3 flex-1 overflow-hidden">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="font-semibold text-[15px] truncate text-[var(--foreground)]">
                  {displayName}
                </h3>
                <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{timeString}</span>
              </div>

              <div className="flex justify-between items-center">
                <p className={`text-[14px] truncate ${unread > 0 ? 'text-[var(--foreground)] font-medium' : 'text-gray-500'}`}>
                  {preview}
                </p>
                {unread > 0 && (
                  <span className="ml-2 bg-[var(--color-imessage-blue)] text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {unread}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
