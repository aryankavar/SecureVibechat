'use client';

import { useState, useRef, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useAuthStore } from '@/lib/stores/authStore';
import { encryptForMultipleDevices, encryptMessage, deriveSharedKey, generateKeyPair } from '@securevibechat/shared';
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
  myDevices?: Record<string, string>;
  recipientId?: string | null;
  isGroup?: boolean;
}

import { createPortal } from 'react-dom';

export default function MessageInput({ chatId, recipientDevices = {}, myDevices = {}, recipientId, isGroup }: MessageInputProps) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  
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

      if (isGroup) {
        // Group fallback: Currently just plaintext wrapper (MVP)
        singleContent = encryptMessage(contentPayload, new Uint8Array(32)); 
      } else {
        let myPrivateKey = localStorage.getItem(`privateKey_${user.uid}`);
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
        senderId: user.uid,
        type,
        status: 'sent',
        createdAt: serverTimestamp(),
        ...additionalData
      });
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
