import { useEffect } from 'react';
import { rtdb, db } from '@/lib/firebase';
import { ref, onValue, onDisconnect, set, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';
import { doc, updateDoc, serverTimestamp as firestoreServerTimestamp } from 'firebase/firestore';

export function usePresence(userId: string | undefined | null) {
  useEffect(() => {
    if (!userId || !rtdb) return;

    const connectedRef = ref(rtdb, '.info/connected');
    const userStatusRef = ref(rtdb, `/status/${userId}`);

    const unsubscribe = onValue(connectedRef, async (snap) => {
      if (snap.val() === true) {
        // We're connected (or reconnected)
        const isOfflineForRTDB = {
          state: 'offline',
          lastChanged: rtdbServerTimestamp(),
        };

        const isOnlineForRTDB = {
          state: 'online',
          lastChanged: rtdbServerTimestamp(),
        };

        // 1. Setup disconnect hook for RTDB
        await onDisconnect(userStatusRef).set(isOfflineForRTDB);
        
        // 2. Set RTDB to online
        await set(userStatusRef, isOnlineForRTDB);

        // 3. Update Firestore that we are online
        try {
          await updateDoc(doc(db, 'users', userId), {
            isOnline: true,
            lastOnline: firestoreServerTimestamp()
          });
        } catch (error) {
          console.error("Failed to update firestore online status", error);
        }
      }
    });

    // Cleanup when component unmounts (or user logs out)
    return () => {
      // Unsubscribe RTDB listener
      unsubscribe();
      
      // Attempt to immediately set offline in RTDB and Firestore
      set(userStatusRef, {
        state: 'offline',
        lastChanged: rtdbServerTimestamp(),
      });
      
      updateDoc(doc(db, 'users', userId), {
        isOnline: false,
        lastOnline: firestoreServerTimestamp()
      }).catch(() => {});
    };
  }, [userId]);
}
