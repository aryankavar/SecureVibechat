'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, collection } from 'firebase/firestore';
import { useAuthStore } from '@/lib/stores/authStore';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import GroupInfoPanel from '@/components/chat/GroupInfoPanel';
import ChatSettingsModal from '@/components/chat/ChatSettingsModal';
import ChatThemePicker from '@/components/chat/ChatThemePicker';
import { CHAT_THEMES } from '@/lib/themes';
import Link from 'next/link';

interface ChatData {
  type: 'dm' | 'group';
  participants: string[];
  groupInfo?: {
    name: string;
    avatarUrl: string;
    description: string;
    createdBy: string;
    admins: string[];
  };
  disappearingSetting?: string;
  themeId?: string;
}

function ChatDetailContent() {
  const searchParams = useSearchParams();
  const chatId = searchParams.get('id');

  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        No chat selected.
      </div>
    );
  }
  
  const { user } = useAuthStore();
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [recipientDevices, setRecipientDevices] = useState<Record<string, string>>({});
  const [myDevices, setMyDevices] = useState<Record<string, string>>({});
  const [headerName, setHeaderName] = useState<string>('Loading...');
  const [headerSubtitle, setHeaderSubtitle] = useState<string>('');
  const [headerAvatar, setHeaderAvatar] = useState<string>('');
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [participantProfiles, setParticipantProfiles] = useState<Record<string, any>>({});
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);

  useEffect(() => {
    if (!user || !chatId) return;

    let unsubscribeRecipientDevices: (() => void) | undefined;
    let unsubscribeMyDevices: (() => void) | undefined;
    let unsubscribeUser: (() => void) | undefined;

    const chatRef = doc(db, 'chats', chatId);
    const unsubscribeChat = onSnapshot(chatRef, async (docSnap) => {
      if (!docSnap.exists()) {
        setLoading(false);
        return;
      }

      const data = docSnap.data() as ChatData;
      setChatData(data);

      if (data.type === 'group') {
        // Group chat
        setHeaderName(data.groupInfo?.name || 'Group Chat');
        setHeaderSubtitle(`${data.participants.length} members`);
        setHeaderAvatar(data.groupInfo?.avatarUrl || '');

        const profiles: Record<string, any> = {};
        await Promise.all(
          data.participants.map(async (uid) => {
            const userSnap = await getDoc(doc(db, 'users', uid));
            if (userSnap.exists()) {
              profiles[uid] = userSnap.data();
            }
          })
        );
        setParticipantProfiles(profiles);

        // Group fallback
        setRecipientDevices({ 'group': 'group' });
        setRecipientId(null);
      } else {
        // DM chat
        const otherId = data.participants.find((id: string) => id !== user.uid);
        if (otherId) {
          setRecipientId(otherId);
          
          unsubscribeUser = onSnapshot(doc(db, 'users', otherId), (userSnap) => {
            if (userSnap.exists()) {
              const userData = userSnap.data();
              setHeaderName(userData.displayName || `User ${otherId.substring(0, 4)}...`);
              
              if (userData.isOnline) {
                setHeaderSubtitle('Online');
              } else if (userData.lastOnline) {
                const date = userData.lastOnline.toDate();
                setHeaderSubtitle(`Last seen ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
              } else {
                setHeaderSubtitle('Offline');
              }

              setHeaderAvatar(userData.avatarUrl || '');
              setParticipantProfiles(prev => ({ ...prev, [otherId]: userData }));
            }
          });

          // Fetch recipient's devices
          unsubscribeRecipientDevices = onSnapshot(collection(db, 'users', otherId, 'devices'), (snapshot) => {
            const devices: Record<string, string> = {};
            snapshot.forEach(doc => {
              devices[doc.id] = doc.data().publicKey;
            });
            setRecipientDevices(devices);
          });

          // Fetch my own devices (so I can read my own sent messages on other devices)
          unsubscribeMyDevices = onSnapshot(collection(db, 'users', user.uid, 'devices'), (snapshot) => {
            const devices: Record<string, string> = {};
            snapshot.forEach(doc => {
              devices[doc.id] = doc.data().publicKey;
            });
            setMyDevices(devices);
          });
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribeChat();
      if (unsubscribeRecipientDevices) unsubscribeRecipientDevices();
      if (unsubscribeMyDevices) unsubscribeMyDevices();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [chatId, user]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-[var(--background)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-imessage-blue)]"></div>
      </div>
    );
  }

  const isGroup = chatData?.type === 'group';

  // Compute effective devices with legacy fallback
  const effectiveRecipientDevices = { ...recipientDevices };
  const legacyPublicKey = recipientId && participantProfiles[recipientId]?.publicKey;
  if (!isGroup && Object.keys(effectiveRecipientDevices).length === 0 && legacyPublicKey) {
    effectiveRecipientDevices['legacy_device'] = legacyPublicKey;
  }

  // Same for my devices
  const effectiveMyDevices = { ...myDevices };
  const myLegacyPublicKey = (typeof window !== 'undefined' && user) ? localStorage.getItem(`publicKey_${user.uid}`) : null;
  if (Object.keys(effectiveMyDevices).length === 0 && myLegacyPublicKey) {
    effectiveMyDevices['legacy_device'] = myLegacyPublicKey;
  }

  const activeTheme = chatData?.themeId && CHAT_THEMES[chatData.themeId] ? CHAT_THEMES[chatData.themeId] : null;
  const containerStyle = activeTheme ? {
    '--color-glass-sent-bg': activeTheme.sentBg,
    '--color-glass-sent-border': activeTheme.sentBorder,
    '--color-glass-sent-read-bg': activeTheme.sentBg,
    '--color-glass-sent-read-border': activeTheme.sentBorder,
    '--color-imessage-blue': activeTheme.sentBorder // optionally tint other accents
  } as React.CSSProperties : {};

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--background)] w-full overflow-hidden" style={containerStyle}>
      {/* Header */}
      <div
        className="glass-panel z-10 px-4 py-3 flex items-center justify-between border-b border-[var(--border)] sticky top-0 bg-[var(--surface)] cursor-pointer"
        onClick={() => isGroup && setShowGroupInfo(true)}
      >
        <div className="flex items-center">
          <Link href="/chat" className="md:hidden mr-3 text-[var(--color-imessage-blue)]">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>

          {/* Avatar */}
          {headerAvatar ? (
            <img src={headerAvatar} alt="" className="w-10 h-10 rounded-full flex-shrink-0 object-cover" />
          ) : (
            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-medium ${
              isGroup ? 'bg-gradient-to-br from-green-400 to-teal-500' : 'bg-gradient-to-br from-blue-400 to-indigo-500'
            }`}>
              {headerName.substring(0, 2).toUpperCase()}
            </div>
          )}

          <div className="ml-3">
            <h2 className="font-semibold text-[15px]">{headerName}</h2>
            <p className="text-xs text-gray-500">{headerSubtitle}</p>
          </div>
        </div>

          {/* Header Actions */}
        <div className="flex space-x-2 text-[var(--color-imessage-blue)]">
          <button onClick={(e) => { e.stopPropagation(); setShowThemePicker(true); }} className="p-2 hover:bg-[var(--hover)] rounded-full transition-colors" title="Change Theme">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25l7.22-7.22a3.75 3.75 0 015.304 5.304L6.75 21z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5z" />
            </svg>
          </button>
          {isGroup && (
            <button onClick={(e) => { e.stopPropagation(); setShowGroupInfo(true); }} className="p-2 hover:bg-[var(--hover)] rounded-full transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); setShowChatSettings(true); }} className="p-2 hover:bg-[var(--hover)] rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      {Object.keys(effectiveRecipientDevices).length > 0 ? (
        <>
          <MessageList
            chatId={chatId}
            recipientDevices={effectiveRecipientDevices}
            myDevices={effectiveMyDevices}
            recipientId={recipientId}
            isGroup={isGroup}
            participantProfiles={participantProfiles}
            onEdit={setEditingMessage}
            onReply={setReplyingTo}
            disappearingSetting={chatData?.disappearingSetting}
          />
          <MessageInput
            chatId={chatId}
            recipientDevices={effectiveRecipientDevices}
            myDevices={effectiveMyDevices}
            recipientId={recipientId}
            isGroup={isGroup}
            editingMessage={editingMessage}
            onCancelEdit={() => setEditingMessage(null)}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
          />
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-4 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-3 text-red-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p>Cannot establish encryption.</p>
          <p className="text-sm">Recipient&apos;s devices not found.</p>
        </div>
      )}

      {/* Group Info Panel */}
      {showGroupInfo && chatData?.groupInfo && (
        <GroupInfoPanel
          chatId={chatId}
          isOpen={showGroupInfo}
          onClose={() => setShowGroupInfo(false)}
          groupInfo={chatData.groupInfo}
          participants={chatData.participants}
          currentUserId={user?.uid || ''}
        />
      )}

      {/* Chat Settings Panel */}
      {showChatSettings && chatData && (
        <ChatSettingsModal
          chatId={chatId}
          isOpen={showChatSettings}
          onClose={() => setShowChatSettings(false)}
          currentSetting={chatData.disappearingSetting || 'off'}
        />
      )}

      {/* Theme Picker */}
      {showThemePicker && (
        <ChatThemePicker
          chatId={chatId}
          currentThemeId={chatData?.themeId || 'default'}
          onClose={() => setShowThemePicker(false)}
        />
      )}
    </div>
  );
}

export default function ChatDetail() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
      <ChatDetailContent />
    </Suspense>
  );
}
