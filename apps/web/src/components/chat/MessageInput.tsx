'use client';

import { useState, useRef, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useAuthStore } from '@/lib/stores/authStore';
import { encryptMessage, encryptForMultipleDevices, getLibsodiumPrivateKey } from '@securevibechat/shared';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import dynamic from 'next/dynamic';
import type { EmojiClickData } from 'emoji-picker-react';

import VoiceRecorder from './VoiceRecorder';
import FileUploader from './FileUploader';
import GifPicker from './GifPicker';
import StickerPicker from './StickerPicker';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface MessageInputProps {
  chatId: string;
  recipientDevices?: Record<string, string>;
  editingMessage?: any;
  onCancelEdit?: () => void;
  myDevices?: Record<string, string>;
  recipientId?: string | null;
  isGroup?: boolean;
  replyingTo?: any;
  onCancelReply?: () => void;
}

import { createPortal } from 'react-dom';

export default function MessageInput({ chatId, recipientDevices = {}, myDevices = {}, recipientId, isGroup, editingMessage, onCancelEdit, replyingTo, onCancelReply }: MessageInputProps) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (editingMessage && editingMessage.type === 'text') {
      setText(editingMessage.decryptedText || '');
    } else {
      setText('');
    }
  }, [editingMessage]);

  
  // Popover states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  
  const { user } = useAuthStore();
  const { handleTyping, stopTyping } = useTypingIndicator(chatId, recipientId ?? null);
  
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
        setShowGifPicker(false);
        setShowStickerPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeAllPopovers = () => {
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    setShowStickerPicker(false);
  };

  const handleSendText = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || !user || (!isGroup && Object.keys(recipientDevices).length === 0)) return;

    const payloadText = text.trim();
    setText('');
    await sendMessage('text', payloadText);
  };

  // Helper to send message (handles encryption for all types)
  const sendMessage = async (type: string, contentPayload: string, additionalData: any = {}) => {
    if (!user || (!isGroup && Object.keys(recipientDevices).length === 0)) return;
    setIsSending(true);
    stopTyping();
    closeAllPopovers();

    try {
      let ciphertextsMap: Record<string, any> = {};
      let singleContent: any = null;
      let groupEpoch: number | undefined;

      if (isGroup) {
        const { getCurrentGroupKey } = await import('@/services/groupService');
        const groupKeyData = await getCurrentGroupKey(chatId);
        if (!groupKeyData) {
          console.warn("No group key available. Cannot encrypt group message.");
          setIsSending(false);
          return;
        }
        singleContent = encryptMessage(contentPayload, groupKeyData.key);
        groupEpoch = groupKeyData.epoch;
      } else {
        let myDeviceId = localStorage.getItem(`deviceId_${user.uid}`);
        let myPrivateKey: string | null = null;
        if (myDeviceId) {
          myPrivateKey = await getLibsodiumPrivateKey(myDeviceId);
        }
        let myPublicKey = localStorage.getItem(`publicKey_${user.uid}`);
        if (!myPrivateKey || !myPublicKey) {
          console.warn("Private/Public key missing. Cannot encrypt.");
          setIsSending(false);
          return;
        }

        // Combine recipient devices and my OTHER devices so I can read my own messages
        const allTargetDevices = { ...recipientDevices, ...myDevices };
        
        ciphertextsMap = encryptForMultipleDevices(contentPayload, myPrivateKey, myPublicKey, allTargetDevices);
      }

      await addDoc(collection(db, `chats/${chatId}/messages`), {
        ...(singleContent ? { content: singleContent } : { ciphertexts: ciphertextsMap }),
        ...(groupEpoch ? { epoch: groupEpoch } : {}),
        senderId: user.uid,
        type,
        status: 'sent',
        createdAt: serverTimestamp(),
        ...(replyingTo ? { replyToId: replyingTo.id } : {}),
        ...additionalData
      });
      onCancelReply?.();
    } catch (error) {
      console.error(`Error sending ${type} message:`, error);
      alert(`Failed to send ${type} message.`);
    } finally {
      setIsSending(false);
    }
  };

  // Handlers for advanced features
  const handleVoiceSend = async (blob: Blob, duration: number) => {
    setShowVoiceRecorder(false);
    // In a real app, upload blob to Firebase Storage first, get URL
    // For MVP, we pass dummy URL. The FileUploader handles actual uploads.
    // await sendMessage('audio', fakeUrl, { duration });
  };

  const handleFileUpload = async (fileUrl: string, metadata: any) => {
    setShowFileUploader(false);
    
    let type = 'file';
    if (metadata.mimeType.startsWith('image/')) type = 'image';
    if (metadata.mimeType.startsWith('video/')) type = 'video';
    if (metadata.mimeType.startsWith('audio/')) type = 'audio';

    await sendMessage(type, fileUrl, { fileMetadata: metadata });
  };

  const handleGifSelect = async (gifUrl: string) => {
    await sendMessage('image', gifUrl, { fileMetadata: { mimeType: 'image/gif' } });
  };

  const handleStickerSelect = async (stickerUrl: string) => {
    await sendMessage('sticker', stickerUrl);
  };

  return (
    <div className="relative p-4 glass-panel border-t border-[var(--border)] z-10 w-full bg-transparent">
      
      
      {editingMessage && (
        <div className="absolute -top-10 left-0 w-full bg-gray-100 dark:bg-gray-800 text-sm px-4 py-2 flex justify-between items-center rounded-t-xl border border-b-0 border-[var(--border)]">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-blue-500"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
            <span className="font-medium text-gray-700 dark:text-gray-300">Editing Message</span>
          </div>
          <button onClick={() => { onCancelEdit?.(); setText(''); }} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {replyingTo && !editingMessage && (
        <div className="absolute -top-14 left-0 w-full bg-gray-100 dark:bg-gray-800 text-sm px-4 py-2 flex justify-between items-center rounded-t-xl border border-b-0 border-[var(--border)]">
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center gap-2 mb-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-blue-500"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
              <span className="font-medium text-blue-500">Replying to message</span>
            </div>
            <div className="text-gray-600 dark:text-gray-400 line-clamp-1 text-xs">
              {replyingTo.type === 'text' ? replyingTo.decryptedText : 'Media'}
            </div>
          </div>
          <button onClick={() => onCancelReply?.()} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 ml-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* File Uploader Modal */}
      {showFileUploader && typeof document !== 'undefined' && createPortal(
        <FileUploader 
          chatId={chatId} 
          onUploadComplete={handleFileUpload} 
          onClose={() => setShowFileUploader(false)} 
        />,
        document.body
      )}

      {/* Popovers Container */}
      <div ref={popoverRef} className="absolute bottom-full left-4 mb-2 z-50">
        {showEmojiPicker && (
          <div className="shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
            <EmojiPicker
              onEmojiClick={(e) => { setText((prev) => prev + e.emoji); inputRef.current?.focus(); }}
              width={350} height={400} searchPlaceHolder="Search emoji..." skinTonesDisabled lazyLoadEmojis
            />
          </div>
        )}
        {showGifPicker && (
          <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifPicker(false)} />
        )}
        {showStickerPicker && (
          <StickerPicker onSelect={handleStickerSelect} onClose={() => setShowStickerPicker(false)} />
        )}
      </div>

      {showVoiceRecorder ? (
        <VoiceRecorder onSend={handleVoiceSend} onCancel={() => setShowVoiceRecorder(false)} />
      ) : (
        <form onSubmit={handleSendText} className="flex items-end gap-2 max-w-4xl mx-auto w-full">
          {/* Attachment button */}
          <button type="button" onClick={() => setShowFileUploader(true)} className="p-2 text-gray-500 hover:text-[var(--color-imessage-blue)] rounded-full transition-colors mb-1 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>

          {/* GIF button */}
          <button type="button" onClick={() => { closeAllPopovers(); setShowGifPicker(!showGifPicker); }} className={`p-2 rounded-full mb-1 flex-shrink-0 font-bold text-xs ${showGifPicker ? 'text-[var(--color-imessage-blue)]' : 'text-gray-500'}`}>
            GIF
          </button>

          {/* Sticker button */}
          <button type="button" onClick={() => { closeAllPopovers(); setShowStickerPicker(!showStickerPicker); }} className={`p-2 rounded-full mb-1 flex-shrink-0 ${showStickerPicker ? 'text-[var(--color-imessage-blue)]' : 'text-gray-500'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.866 8.21 8.21 0 003.001 2.479z" />
            </svg>
          </button>

          {/* Emoji toggle */}
          <button type="button" onClick={() => { closeAllPopovers(); setShowEmojiPicker(!showEmojiPicker); }} className={`p-2 rounded-full mb-1 flex-shrink-0 ${showEmojiPicker ? 'text-[var(--color-imessage-blue)]' : 'text-gray-500'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75z" />
            </svg>
          </button>

          <div className="relative flex-1">
            <input
              id="message-input"
              name="message"
              ref={inputRef} type="text" value={text}
              onChange={(e) => { setText(e.target.value); e.target.value.length > 0 ? handleTyping() : stopTyping(); }}
              placeholder="iMessage"
              className="w-full pl-4 pr-4 py-2.5 glass-input min-w-0 text-gray-800 placeholder-gray-500"
              disabled={(!isGroup && Object.keys(recipientDevices || {}).length === 0) || isSending}
            />
          </div>

          {/* Send / Mic button */}
          {text.trim() ? (
            <button type="submit" disabled={isSending} className="p-2 rounded-full mb-1 flex-shrink-0 transition-all bg-[var(--color-imessage-blue)] text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" /></svg>
            </button>
          ) : (
            <button type="button" onClick={() => setShowVoiceRecorder(true)} className="p-2 rounded-full mb-1 flex-shrink-0 transition-all text-gray-500 hover:text-[var(--color-imessage-blue)]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
            </button>
          )}
        </form>
      )}
    </div>
  );
}
