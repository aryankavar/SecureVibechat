import { db, auth } from '../lib/firebase';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { initEncryption, generateKeyPair } from '@securevibechat/shared';

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
    if (deviceId && privateKey && publicKey) {
      localStorage.setItem(`deviceId_${userUid}`, deviceId);
      localStorage.setItem(`privateKey_${userUid}`, privateKey);
      localStorage.setItem(`publicKey_${userUid}`, publicKey);
    }
  }

  if (!deviceId || !privateKey || !publicKey) {
     throw new Error("Failed to generate keys");
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

// SECURITY: Restore device keys from PIN-encrypted backup in Firestore.
// No hardcoded PINs — always verify against the real encrypted backup.
export const restoreDeviceWithPIN = async (uid: string, pin: string): Promise<boolean> => {
  const { getDoc } = await import('firebase/firestore');
  const { restoreKeyFromBackup } = await import('@securevibechat/shared');

  // Fetch the encrypted key backup from Firestore
  const deviceId = localStorage.getItem(`deviceId_${uid}`);
  if (!deviceId) {
    throw new Error('NO_DEVICE_ID');
  }

  const backupDoc = await getDoc(doc(db, 'users', uid, 'keyBackups', deviceId));
  if (!backupDoc.exists()) {
    throw new Error('NO_BACKUP_FOUND');
  }

  const backupData = backupDoc.data();
  try {
    // Decrypt the private key using the user-provided PIN
    const restoredKey = await restoreKeyFromBackup(
      backupData.encryptedPrivateKey,
      pin,
      backupData.salt,
      backupData.nonce
    );

    if (!restoredKey) {
      throw new Error('WRONG_PIN');
    }

    // Store the restored key locally
    localStorage.setItem(`privateKey_${uid}`, restoredKey);
    return true;
  } catch (e: any) {
    if (e.message === 'WRONG_PIN') throw e;
    throw new Error('WRONG_PIN');
  }
};

export const fetchUserTheme = async (uid: string) => {
  // Try to load from localStorage as fallback
  const saved = localStorage.getItem(`theme_${uid}`);
  if (saved) return JSON.parse(saved);
  return null;
};

export const updateUserTheme = async (theme: any) => {
  // Local storage cache
  const user = auth.currentUser;
  if (user) {
    localStorage.setItem(`theme_${user.uid}`, JSON.stringify(theme));
  }
};
