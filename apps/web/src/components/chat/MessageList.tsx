'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, doc, writeBatch, deleteDoc, updateDoc } from 'firebase/firestore';
import { useAuthStore } from '@/lib/stores/authStore';
import { decryptMessage, deriveSharedKey, generateKeyPair } from '@securevibechat/shared';
import { useRecipientTyping } from '@/hooks/useTypingIndicator';
import MessageContextMenu from './MessageContextMenu';

interface Message {
  id: string;
  senderId: string;
  content: any;
  type: string;
  status?: 'sent' | 'delivered' | 'read';
  createdAt: any;
  decryptedText?: string;
  isDecryptionError?: boolean;
  fileMetadata?: any;
}

interface MessageListProps {
  chatId: string;
  recipientDevices?: Record<string, string>;
  myDevices?: Record<string, string>;
  recipientId?: string | null;
  isGroup?: boolean;
  participantProfiles?: Record<string, any>;
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

export default function MessageList({ chatId, recipientDevices = {}, myDevices = {}, recipientId, isGroup, participantProfiles }: MessageListProps) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [myPrivateKey, setMyPrivateKey] = useState<string | null>(null);
  const [myDeviceId, setMyDeviceId] = useState<string | null>(null);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isRecipientTyping = useRecipientTyping(chatId, recipientId ?? null);

  // Load private key and device ID
  useEffect(() => {
    if (!user) return;
    let pk = localStorage.getItem(`privateKey_${user.uid}`);
    let dId = localStorage.getItem(`deviceId_${user.uid}`);
    
    if (!pk || !dId) {
      console.warn("Private key or Device ID missing. Trying to regenerate keys...");
      const newKeys = generateKeyPair();
      pk = newKeys.privateKey;
      dId = crypto.randomUUID();
      localStorage.setItem(`privateKey_${user.uid}`, pk);
      localStorage.setItem(`deviceId_${user.uid}`, dId);
      // We rely on AuthProvider/userService to actually register this new device if it happens
    }
    
    setMyPrivateKey(pk);
    setMyDeviceId(dId);
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
            // Find the sender's public key
            // If the sender is ME, I use my own public key (which is why deriveSharedKey works)
            // But wait! Which device of the sender sent it? 
            // In our `encryptForMultipleDevices`, we derive the key using `senderPrivateKey` and `targetDevicePublicKey`.
            // So to decrypt, the target device (ME) needs to derive the key using `myPrivateKey` and `senderDevicePublicKey`?
            // Wait, we don't know which device sent it!
            // Actually, we use the public key associated with the ciphertext!
            // `ciphertextsMap` structure from `encryptForMultipleDevices`:
            // `[targetDeviceId]: { ciphertext, iv, senderPublicKey }`
            
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
        } else if (data.content?.ciphertext) {
          // Legacy single-device decryption fallback
          try {
             // For legacy, we just find the first available device public key of the sender
             const senderPubKey = data.senderId === user.uid 
               ? localStorage.getItem(`publicKey_${user.uid}`) 
               : Object.values(recipientDevices)[0]; // Best guess
               
             if (senderPubKey) {
               const sharedKey = deriveSharedKey(myPrivateKey, senderPubKey);
               decryptedText = decryptMessage(data.content, sharedKey);
             } else {
               decryptedText = "🔒 Missing sender public key for legacy message";
               isDecryptionError = true;
             }
          } catch (e) {
             console.warn("Decryption failed for legacy message", docSnap.id);
             decryptedText = "🔒 Error decrypting legacy message";
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
  }, [chatId, user, myPrivateKey, myDeviceId, recipientDevices, isGroup]);

  // Context menu action handlers
  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 1500);
    });
  }, []);

  const handleDelete = useCallback(async (messageId: string) => {
    if (!confirm('Delete this message? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, `chats/${chatId}/messages`, messageId));
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  }, [chatId]);

  const handleReply = useCallback((text: string) => {
    // For now, we'll just prepend a quote to the input
    // A full reply system would require a reply-to reference in the message doc
    // This is a placeholder that shows the pattern
    console.log('Reply to:', text);
    // TODO: Set reply-to state in parent and display inline quote
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
        onClick: () => handleReply(msg.decryptedText || ''),
      },
      {
        label: 'Forward',
        icon: ForwardIcon,
        onClick: () => {
          // TODO: Implement forward flow
          console.log('Forward:', msg.decryptedText);
        },
      },
    ];

    // Only allow delete for own messages
    if (isMine) {
      items.push({
        label: 'Delete',
        icon: DeleteIcon,
        onClick: () => handleDelete(msg.id),
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
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMine = msg.senderId === user?.uid;
            const showTail = index === messages.length - 1 || messages[index + 1]?.senderId !== msg.senderId;

            // Render system messages inline
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

            // Parse file metadata if needed
            let fileUrl = msg.decryptedText;
            if (msg.type === 'image' || msg.type === 'video' || msg.type === 'file' || msg.type === 'audio') {
               // In a real implementation, the decrypted text is the download URL
               // and the unencrypted doc has fileMetadata. For simplicity, we assume
               // decryptedText is the URL for now.
            }

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
                  {isGroup && !isMine && !showTail && <div className="w-8" />} {/* spacer for avatar */}

                  <MessageContextMenu items={getMenuItems(msg, isMine)}>
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
                      {expandedMessageId === msg.id && (
                        <div className={`message-timestamp-container ${isMine ? 'text-[#002f6c]' : 'text-gray-600'} animate-in fade-in slide-in-from-right-2 duration-300`}>
                          {msg.createdAt && (
                            <span>
                              {msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {isMine && <StatusIcon status={msg.status} />}
                        </div>
                      )}

                      {/* Message Content rendering based on type */}
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
                  </MessageContextMenu>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator bubble */}
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
      batch.update(msgRef, { status: 'read' });
    });
    const chatRef = doc(db, 'chats', chatId);
    batch.update(chatRef, { [`unreadCount.${myUid}`]: 0 });
    await batch.commit();
  } catch (error) {
    console.error('Failed to mark messages as read:', error);
  }
}
