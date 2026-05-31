import { db, auth } from '../lib/firebase';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { generateKeyPair, initEncryption } from '@securevibechat/shared';

export const registerDevice = async (userUid: string): Promise<{ deviceId: string; publicKey: string; privateKey: string }> => {
  await initEncryption();
  
  // Check if we already have a device registered in localStorage
  let deviceId = localStorage.getItem(`deviceId_${userUid}`);
  let privateKey = localStorage.getItem(`privateKey_${userUid}`);
  let publicKey = localStorage.getItem(`publicKey_${userUid}`);

  if (!deviceId || !privateKey || !publicKey) {
    // Generate new device identity
    deviceId = crypto.randomUUID();
    const keys = generateKeyPair();
    privateKey = keys.privateKey;
    publicKey = keys.publicKey;

    // Save locally
    localStorage.setItem(`deviceId_${userUid}`, deviceId);
    localStorage.setItem(`privateKey_${userUid}`, privateKey);
    localStorage.setItem(`publicKey_${userUid}`, publicKey);
  }

  // Register the device public key in Firestore under the devices subcollection
  await setDoc(doc(db, 'users', userUid, 'devices', deviceId), {
    deviceId,
    publicKey,
    deviceName: navigator.userAgent, // Basic device info
    lastSeen: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });

  return { deviceId, publicKey, privateKey };
};

export const createUserProfile = async (displayName: string, about: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");

  // Register device first to generate keys
  const { publicKey } = await registerDevice(user.uid);

  const profileData = {
    uid: user.uid,
    phoneNumber: user.phoneNumber || '',
    displayName,
    displayNameLower: displayName.toLowerCase(),
    about: about || 'Hey there! I am using SecureVibeChat.',
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`,
    publicKey: publicKey, // Legacy fallback
    isOnline: true,
    lastSeen: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    fcmTokens: [],
  };

  // Write to Firestore
  await setDoc(doc(db, 'users', user.uid), profileData);
  
  // Initialize settings
  await setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), {
    readReceipts: true,
    lastSeenVisible: true,
    profilePhotoVisibility: 'everyone'
  });

  return profileData;
};

export const updateUserProfile = async (displayName: string, about: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");

  const updateData = {
    displayName,
    displayNameLower: displayName.toLowerCase(),
    about,
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, 'users', user.uid), updateData);
  
  return updateData;
};
