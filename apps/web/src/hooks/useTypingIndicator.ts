'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { rtdb } from '@/lib/firebase';
import { ref, set, onValue, serverTimestamp, onDisconnect } from 'firebase/database';
import { useAuthStore } from '@/lib/stores/authStore';

/**
 * Hook to manage typing indicator state via Firebase RTDB.
 * 
 * Writes to: /presence/{myUid}/typing/{chatId}
 * Reads from: /presence/{recipientUid}/typing/{chatId}
 * 
 * Auto-clears typing status after 3 seconds of inactivity.
 */
export function useTypingIndicator(chatId: string, recipientId: string | null) {
  const { user } = useAuthStore();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Set my typing status
  const setTyping = useCallback((isTyping: boolean) => {
    if (!user || !chatId) return;
    
    // Avoid redundant writes
    if (isTypingRef.current === isTyping) return;
    isTypingRef.current = isTyping;

    const typingRef = ref(rtdb, `presence/${user.uid}/typing/${chatId}`);
    set(typingRef, {
      isTyping,
      timestamp: serverTimestamp(),
    });
  }, [user, chatId]);

  // Called on every keystroke — debounces the "stop typing" signal
  const handleTyping = useCallback(() => {
    setTyping(true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop after 3 seconds of no keystrokes
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 3000);
  }, [setTyping]);

  // Stop typing immediately (e.g., on message send)
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(false);
  }, [setTyping]);

  // Cleanup on unmount — clear typing status
  useEffect(() => {
    if (!user || !chatId) return;

    const typingRef = ref(rtdb, `presence/${user.uid}/typing/${chatId}`);

    // When user disconnects, auto-clear typing
    onDisconnect(typingRef).set({
      isTyping: false,
      timestamp: serverTimestamp(),
    });

    return () => {
      // Clear typing on unmount
      set(typingRef, { isTyping: false, timestamp: serverTimestamp() });
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [user, chatId]);

  return { handleTyping, stopTyping };
}

/**
 * Hook to listen to the recipient's typing status.
 */
export function useRecipientTyping(chatId: string, recipientId: string | null): boolean {
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);

  useEffect(() => {
    if (!recipientId || !chatId) return;

    const typingRef = ref(rtdb, `presence/${recipientId}/typing/${chatId}`);

    const unsubscribe = onValue(typingRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.isTyping) {
        // Verify the typing indicator is fresh (< 5 seconds old)
        const now = Date.now();
        const typingTimestamp = data.timestamp || 0;
        const isFresh = (now - typingTimestamp) < 5000;
        setIsRecipientTyping(isFresh ? true : false);
      } else {
        setIsRecipientTyping(false);
      }
    });

    return () => unsubscribe();
  }, [recipientId, chatId]);

  return isRecipientTyping;
}
