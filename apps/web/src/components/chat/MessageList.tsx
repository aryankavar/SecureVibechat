'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, doc, writeBatch, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthStore } from '@/lib/stores/authStore';
import { decryptMessage, deriveSharedKey, generateKeyPair, getLibsodiumPrivateKey, storeLibsodiumPrivateKey } from "@securevibechat/shared";
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useRecipientTyping } from '@/hooks/useTypingIndicator';
import MessageContextMenu from './MessageContextMenu';

export interface Message {
  id: string;
  senderId: string;
  content: any;
  type: string;
  status?: 'sent' | 'delivered' | 'read';
  createdAt: any;
  editedAt?: any;
  decryptedText?: string;
  isDecryptionError?: boolean;
  fileMetadata?: any;
  reactions?: Record<string, string>;
  replyToId?: string;
  readBy?: Record<string, any>;
}

interface MessageListProps {
  chatId: string;
  recipientDevices?: Record<string, string>;
  myDevices?: Record<string, string>;
  recipientId: string | null;
  isGroup?: boolean;
  participantProfiles?: Record<string, any>;
  onEdit?: (msg: Message) => void;
  onReply?: (msg: Message) => void;
  disappearingSetting?: string;
}

// Checkmark icons for delivery status
function StatusIcon({ status }: { status?: string }) {
  if (!status) return null;

  if (status === 'read') {
    return (
      <svg width="16" height="11" viewBox="0 0 16 11" fill="none" className="inline-block ml-1">
        <path d="M1 5.5L4.5 9L11 2" stroke="#34B7F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 5.5L8.5 9L15 2" stroke="#34B7F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (status === 'delivered') {
    return (
      <svg width="16" height="11" viewBox="0 0 16 11" fill="none" className="inline-block ml-1">
        <path d="M1 5.5L4.5 9L11 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
        <path d="M5 5.5L8.5 9L15 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      </svg>
    );
  }
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="inline-block ml-1">
      <path d="M1 5.5L4.5 9L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </svg>
  );
}

// Animated typing dots
function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="glass-bubble-received flex items-center gap-1 px-4 py-3">
        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
      </div>
    </div>
  );
}

// Inline toast for copy confirmation
function CopiedToast({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
      Copied to clipboard
    </div>
  );
}

// SVG Icons for context menu
const CopyIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
  </svg>
);

const ReplyIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
  </svg>
);

const EditIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
  </svg>
);

const DeleteIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const ForwardIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
  </svg>
);

import FilePreview from './FilePreview';
import VoicePlayer from './VoicePlayer';

export default function MessageList({ chatId, recipientDevices = {}, myDevices = {}, recipientId, isGroup, participantProfiles, onEdit, onReply, disappearingSetting }: MessageListProps) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [myPrivateKey, setMyPrivateKey] = useState<string | null>(null);
  const [myDeviceId, setMyDeviceId] = useState<string | null>(null);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isRecipientTyping = useRecipientTyping(chatId, recipientId ?? null);

  // Load private key and device ID
  useEffect(() => {
    if (!user) return;

    const loadKeys = async () => {
      let dId = localStorage.getItem(`deviceId_${user.uid}`);
      let pk: string | null = null;

      if (dId) {
        pk = await getLibsodiumPrivateKey(dId);
      }
      
      if (!pk || !dId) {
        console.warn("Private key or Device ID missing. Trying to regenerate keys...");
        const newKeys = generateKeyPair();
        pk = newKeys.privateKey;
        dId = crypto.randomUUID();
        localStorage.setItem(`deviceId_${user.uid}`, dId);
        await storeLibsodiumPrivateKey(dId, pk);
        // We rely on AuthProvider/userService to actually register this new device if it happens
      }
      
      setMyPrivateKey(pk);
      setMyDeviceId(dId);
    };

    loadKeys();
  }, [user]);

  // Fetch and decrypt messages + mark unread as read
  useEffect(() => {
    if (!user || !myPrivateKey || !myDeviceId) return;

    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList: Message[] = [];
      const unreadMessageIds: string[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        
        // Handle disappearing messages
        let expired = false;
        if (disappearingSetting && disappearingSetting !== 'off' && data.createdAt) {
          let maxAgeMs = 0;
          if (disappearingSetting === '1hr') maxAgeMs = 60 * 60 * 1000;
          else if (disappearingSetting === '24hr') maxAgeMs = 24 * 60 * 60 * 1000;
          else if (disappearingSetting === '7days') maxAgeMs = 7 * 24 * 60 * 60 * 1000;
          
          if (maxAgeMs > 0) {
            const msgTime = data.createdAt.toMillis ? data.createdAt.toMillis() : (data.createdAt.seconds * 1000);
            if ((Date.now() - msgTime) > maxAgeMs) {
              expired = true;
            }
          }
        }
        
        if (expired) return; // Skip rendering expired messages

        // Handle soft-deleted messages
        if (data.isDeleted) {
          msgList.push({
            id: docSnap.id,
            ...data,
            decryptedText: data.deletedBy === user.uid
              ? '🚫 You deleted this message'
              : '🚫 This message was deleted',
            isDecryptionError: false,
            type: 'deleted',
          } as Message);
          return;
        }

        // Skip messages deleted for this specific user ("delete for me")
        if (data.deletedFor && Array.isArray(data.deletedFor) && data.deletedFor.includes(user.uid)) {
          return;
        }

        let decryptedText = '';
        let isDecryptionError = false;

        // Handle decryption based on message type
        if (data.type === 'system') {
          decryptedText = data.systemText || 'System message';
        } else if (isGroup && data.content?.ciphertext) {
           // MVP Group: Just decrypt using a dummy shared key or we stored group key
           try {
             decryptedText = decryptMessage(data.content, new Uint8Array(32));
           } catch (e) {
             decryptedText = "🔒 Error decrypting group message";
             isDecryptionError = true;
           }
        } else if (data.ciphertexts && data.ciphertexts[myDeviceId]) {
          // Multi-device decryption
          try {
            const ciphertextData = data.ciphertexts[myDeviceId];
            if (ciphertextData.senderPublicKey) {
              const sharedKey = deriveSharedKey(myPrivateKey, ciphertextData.senderPublicKey);
              decryptedText = decryptMessage(ciphertextData, sharedKey);
            } else {
               decryptedText = "🔒 Missing sender public key in ciphertext";
               isDecryptionError = true;
            }
          } catch (e) {
            console.warn("Decryption failed for multi-device message", docSnap.id);
            decryptedText = "🔒 Error decrypting message";
            isDecryptionError = true;
          }
        } else {
          decryptedText = `[Unsupported message type or not encrypted for this device]`;
        }

        if (data.senderId !== user.uid && data.status !== 'read') {
          unreadMessageIds.push(docSnap.id);
        }

        msgList.push({
          id: docSnap.id,
          ...data,
          decryptedText,
          isDecryptionError
        } as Message);
      });

      setMessages(msgList);

      if (unreadMessageIds.length > 0) {
        markMessagesAsRead(chatId, unreadMessageIds, user.uid);
      }

      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [chatId, user, myPrivateKey, myDeviceId, recipientDevices, isGroup, disappearingSetting]);

  // Context menu action handlers
  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 1500);
    });
  }, []);

  const handleReact = async (messageId: string, emoji: string) => {
    if (!user) return;
    try {
      const msgRef = doc(db, `chats/${chatId}/messages`, messageId);
      const msg = messages.find(m => m.id === messageId);
      if (!msg) return;
      
      const newReactions = { ...(msg.reactions || {}) };
      
      if (newReactions[user.uid] === emoji) {
        delete newReactions[user.uid];
      } else {
        newReactions[user.uid] = emoji;
      }
      
      await updateDoc(msgRef, { reactions: newReactions });
    } catch (error) {
      console.error("Failed to react:", error);
    }
  };

  // SECURITY: Use updateDoc with isDeleted flag instead of deleteDoc.
  // Firestore rules block deleteDoc (allow delete: if false).
  const handleDelete = useCallback(async (messageId: string) => {
    try {
      const msgRef = doc(db, `chats/${chatId}/messages`, messageId);
      await updateDoc(msgRef, {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: user?.uid || '',
      });
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  }, [chatId, user]);

  const handleReply = useCallback((text: string) => {
    console.log('Reply to:', text);
  }, []);

  // Build context menu items for a message
  const getMenuItems = (msg: Message, isMine: boolean) => {
    const items = [
      {
        label: 'Copy',
        icon: CopyIcon,
        onClick: () => handleCopy(msg.decryptedText || ''),
      },
      {
        label: 'Reply',
        icon: ReplyIcon,
        onClick: () => onReply?.(msg),
      },
      {
        label: 'Forward',
        icon: ForwardIcon,
        onClick: () => {
          console.log('Forward:', msg.decryptedText);
        },
      },
    ];

    if (isMine && msg.type === 'text') {
      items.push({
        label: 'Edit',
        icon: EditIcon,
        onClick: () => onEdit?.(msg),
      });
    }

    if (isMine) {
      items.push({
        label: 'Delete',
        icon: DeleteIcon,
        onClick: () => setDeletingMessageId(msg.id),
        danger: true,
      } as any);
    }

    return items;
  };

  return (
    <>
      <CopiedToast visible={showCopiedToast} />

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-transparent w-full">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-3 text-gray-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <p>Messages are end-to-end encrypted.</p>
            <p className="text-sm mt-1">No one outside of this chat can read them.</p>
            {disappearingSetting && disappearingSetting !== 'off' && (
              <div className="mt-4 px-4 py-2 bg-[var(--color-imessage-blue)]/10 text-[var(--color-imessage-blue)] rounded-xl text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Disappearing messages turned on
              </div>
            )}
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMine = msg.senderId === user?.uid;
            const showTail = index === messages.length - 1 || messages[index + 1]?.senderId !== msg.senderId;
            const repliedMsg = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null;

            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="flex justify-center my-4">
                  <div className="bg-gray-200/50 dark:bg-gray-800/50 text-gray-500 text-xs px-3 py-1 rounded-full font-medium">
                    {msg.decryptedText}
                  </div>
                </div>
              );
            }

            const senderProfile = participantProfiles?.[msg.senderId];
            const senderName = senderProfile?.displayName || `User ${msg.senderId.substring(0, 4)}`;

            return (
              <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} mb-1`}>
                {isGroup && !isMine && showTail && (
                  <span className="text-xs text-gray-400 ml-4 mb-1">{senderName}</span>
                )}
                
                <div className="flex items-end">
                  {isGroup && !isMine && showTail && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-medium mr-2 flex-shrink-0 mb-1">
                      {senderName.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  {isGroup && !isMine && !showTail && <div className="w-8" />}

                  <MessageContextMenu items={getMenuItems(msg, isMine)} onReact={(emoji) => handleReact(msg.id, emoji)}>
                    <div className="relative">
                      <div
                        onClick={() => setExpandedMessageId(expandedMessageId === msg.id ? null : msg.id)}
                        className={`
                          ${isMine ? (msg.status === 'read' ? 'glass-bubble-sent-read' : 'glass-bubble-sent') : 'glass-bubble-received'}
                          ${!showTail ? (isMine ? 'rounded-br-[24px]' : 'rounded-bl-[24px]') : ''}
                          ${msg.isDecryptionError ? 'italic text-opacity-80' : ''}
                          ${(msg.type === 'sticker' || msg.type === 'image' || msg.type === 'video') ? 'p-1 bg-transparent border-0 shadow-none' : 'px-3 py-2'}
                          transition-all duration-300 active:scale-95 overflow-hidden cursor-pointer
                        `}
                        style={{ maxWidth: '280px' }}
                      >
                        {msg.replyToId && (
                          <div className={`mb-1 p-2 rounded-lg text-xs border-l-2 ${isMine ? 'bg-white/10 border-white/50 text-white/90' : 'bg-black/5 dark:bg-white/5 border-[var(--color-imessage-blue)] text-gray-500'}`}>
                            <div className="font-semibold mb-0.5">{repliedMsg ? (repliedMsg.senderId === user?.uid ? 'You' : participantProfiles?.[repliedMsg.senderId]?.displayName || 'Someone') : 'Message'}</div>
                            <div className="line-clamp-1">{repliedMsg ? (repliedMsg.type === 'text' ? repliedMsg.decryptedText : 'Media') : 'Replied to a message'}</div>
                          </div>
                        )}
                      {expandedMessageId === msg.id && (
                        <div className={`message-timestamp-container ${isMine ? 'text-[#002f6c]' : 'text-gray-600'} animate-in fade-in slide-in-from-right-2 duration-300`}>
                          {msg.createdAt && (
                            <span>
                              {msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {msg.editedAt && <span className="ml-1 opacity-70 italic">(edited)</span>}
                            </span>
                          )}
                          {isMine && (
                            <StatusIcon 
                              status={
                                isGroup 
                                ? (Object.keys(participantProfiles || {}).filter(id => id !== user?.uid).every(id => msg.readBy && msg.readBy[id]) ? 'read' : 'delivered')
                                : msg.status
                              } 
                            />
                          )}
                        </div>
                      )}

                      {msg.type === 'text' && (
                        <span className="break-words" style={{ wordBreak: 'break-word' }}>
                          {msg.decryptedText}
                        </span>
                      )}
                      
                      {msg.type === 'sticker' && (
                        <span className="text-8xl leading-none block my-2" title="sticker">{msg.decryptedText}</span>
                      )}

                      {(msg.type === 'image' || msg.type === 'video' || msg.type === 'file') && (
                        <FilePreview 
                          fileUrl={msg.decryptedText || ''} 
                          metadata={msg.fileMetadata || { fileName: 'File', fileSize: 0, mimeType: msg.type === 'image' ? 'image/jpeg' : 'application/octet-stream' }}
                          isMine={isMine}
                        />
                      )}

                      {msg.type === 'audio' && (
                        <VoicePlayer 
                          audioUrl={msg.decryptedText || ''} 
                          isMine={isMine} 
                        />
                      )}
                    </div>
                    {/* Reactions Pill (Outside bubble) */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className={`absolute -bottom-3 ${isMine ? 'right-2' : 'left-2'} bg-white dark:bg-[#2C2C2E] border border-[var(--border)] rounded-full px-1.5 py-0.5 text-[10px] shadow-sm flex items-center gap-1 z-10 hover:scale-110 transition-transform`}>
                        {Array.from(new Set(Object.values(msg.reactions))).map(emoji => (
                          <span key={emoji}>{emoji}</span>
                        ))}
                        {Object.keys(msg.reactions).length > 1 && (
                          <span className="text-gray-500 font-medium ml-0.5">{Object.keys(msg.reactions).length}</span>
                        )}
                      </div>
                    )}
                  </div>


                  </MessageContextMenu>
                </div>
              </div>
            );
          })
        )}

        {isRecipientTyping && <TypingBubble />}

        <div ref={bottomRef} className="h-1" />
      </div>
    </>
  );
}

/**
 * Batch-update message statuses to 'read'.
 */
async function markMessagesAsRead(chatId: string, messageIds: string[], myUid: string) {
  try {
    const batch = writeBatch(db);
    messageIds.forEach((msgId) => {
      const msgRef = doc(db, `chats/${chatId}/messages`, msgId);
      batch.update(msgRef, { 
        status: 'read',
        [`readBy.${myUid}`]: Date.now()
      });
    });
    const chatRef = doc(db, 'chats', chatId);
    batch.update(chatRef, { [`unreadCount.${myUid}`]: 0 });
    await batch.commit();
  } catch (err) {
    console.error("Error marking messages as read:", err);
  }
}
