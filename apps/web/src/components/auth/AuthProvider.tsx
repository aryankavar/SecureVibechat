'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore, UserProfile } from '@/lib/stores/authStore';
import { checkUserProfile } from '@/services/authService';
import { registerDevice, migrateKeysFromLocalStorage } from '@/services/userService';
import { initEncryption } from '@securevibechat/shared';
import { usePresence } from '@/hooks/usePresence';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser, setProfile, setLoading } = useAuthStore();

  usePresence(user?.uid);

  useEffect(() => {
    // Initialize libsodium for the entire app
    initEncryption().catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Fetch extended profile from Firestore
        const profileData = await checkUserProfile(firebaseUser.uid);
        if (profileData) {
          // Migrate any legacy keys before registering
          await migrateKeysFromLocalStorage(firebaseUser.uid);
          // Register the current device (creates or loads keys, registers with Firestore)
          await registerDevice(firebaseUser.uid);
          setProfile(profileData as UserProfile);
        } else {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setProfile, setLoading]);

  return <>{children}</>;
}
