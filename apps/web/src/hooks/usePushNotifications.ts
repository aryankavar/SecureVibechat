'use client';

import { useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuthStore } from '@/lib/stores/authStore';

export function usePushNotifications() {
  const { user } = useAuthStore();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!user) return;
    try {
      const messagingSupported = await isSupported();
      if (!messagingSupported) {
        console.log('Firebase Messaging is not supported in this browser.');
        return;
      }

      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission === 'granted') {
        const messaging = getMessaging();
        
        // Use a dummy vapidKey for now. In production, provide the real vapidKey from Firebase Console
        const token = await getToken(messaging, { 
          // vapidKey: "YOUR_PUBLIC_VAPID_KEY_HERE" 
        });

        if (token) {
          setFcmToken(token);
          
          // Save the token to the user's current device document
          const deviceId = localStorage.getItem(`deviceId_${user.uid}`);
          if (deviceId) {
            await updateDoc(doc(db, `users/${user.uid}/devices/${deviceId}`), {
              fcmToken: token,
              lastUpdatedAt: new Date()
            });
          }
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  useEffect(() => {
    const setupMessaging = async () => {
      try {
        const messagingSupported = await isSupported();
        if (messagingSupported && permissionStatus === 'granted') {
          const messaging = getMessaging();
          const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Foreground message received: ', payload);
            // We can optionally show a toast here, but since the app uses real-time 
            // Firestore listeners, the message will already appear in the UI.
          });
          return unsubscribe;
        }
      } catch (err) {
        console.warn('FCM setup failed', err);
      }
    };

    let unsub: any;
    setupMessaging().then(u => { unsub = u; });

    return () => {
      if (unsub) unsub();
    };
  }, [permissionStatus]);

  return { requestPermission, permissionStatus, fcmToken };
}
