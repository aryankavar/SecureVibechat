import { db, auth } from '../lib/firebase';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { generateGroupKey, encryptGroupKeyForDevices, getPrivateKey } from '@securevibechat/shared';

/**
 * Generates a new group key, encrypts it for all devices of all members,
 * and saves it to Firestore.
 * @param chatId The group chat ID
 * @param memberIds Array of user UIDs in the group
 */
export const initializeGroupKeys = async (chatId: string, memberIds: string[]) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");

  const myDeviceId = localStorage.getItem(`secureDeviceId_${user.uid}`) || localStorage.getItem(`deviceId_${user.uid}`);
  const myPublicKeyBase64 = localStorage.getItem(`publicKey_${user.uid}`);

  if (!myDeviceId || !myPublicKeyBase64) {
    throw new Error("Missing local device info");
  }

  const myPrivateKey = await getPrivateKey(myDeviceId);
  if (!myPrivateKey) {
    throw new Error("Missing private key in IndexedDB");
  }

  // Generate the new symmetric group key
  const groupKey = await generateGroupKey();

  // Gather public keys for all members
  const recipientDevices: Record<string, string> = {};
  
  for (const uid of memberIds) {
    const devicesSnap = await getDocs(collection(db, `users/${uid}/devices`));
    devicesSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.publicKey && data.deviceId) {
        recipientDevices[data.deviceId] = data.publicKey;
      }
    });
  }
  
  // Make sure to include the creator's devices as well
  const myDevicesSnap = await getDocs(collection(db, `users/${user.uid}/devices`));
  myDevicesSnap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.publicKey && data.deviceId) {
      recipientDevices[data.deviceId] = data.publicKey;
    }
  });

  // Encrypt the group key for all devices
  const encryptedKeys = await encryptGroupKeyForDevices(
    groupKey,
    myPrivateKey,
    myPublicKeyBase64,
    recipientDevices
  );

  // Write all encrypted keys to Firestore using a batch
  const batch = writeBatch(db);
  const { setDoc } = await import('firebase/firestore');
  for (const [deviceId, payload] of Object.entries(encryptedKeys)) {
    const keyRef = doc(db, `chats/${chatId}/groupKeys`, deviceId);
    batch.set(keyRef, {
      '1': {
        ...payload,
        createdAt: Date.now()
      }
    });
  }

  // Also set currentEpoch in the chat document
  const chatRef = doc(db, `chats`, chatId);
  batch.update(chatRef, { currentEpoch: 1 });

  await batch.commit();
  console.log(`Group keys initialized for chat ${chatId} at epoch 1`);
};

/**
 * Rotates the group key (Forward Secrecy).
 * Generates a NEW key, increments the epoch, and encrypts for all current participants.
 * @param chatId The group chat ID
 */
export const rotateGroupKey = async (chatId: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");

  const myDeviceId = localStorage.getItem(`secureDeviceId_${user.uid}`) || localStorage.getItem(`deviceId_${user.uid}`);
  const myPublicKeyBase64 = localStorage.getItem(`publicKey_${user.uid}`);

  if (!myDeviceId || !myPublicKeyBase64) {
    throw new Error("Missing local device info");
  }

  const { getPrivateKey, encryptGroupKeyForDevices } = await import('@securevibechat/shared');
  const myPrivateKey = await getPrivateKey(myDeviceId);
  if (!myPrivateKey) throw new Error("Missing private key");

  const { getDoc, updateDoc } = await import('firebase/firestore');
  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);
  
  if (!chatSnap.exists()) {
    throw new Error("Chat not found.");
  }

  const chatData = chatSnap.data();
  const participants = chatData.participants || [];
  const currentEpoch = chatData.currentEpoch || 1;
  const nextEpoch = currentEpoch + 1;

  // 1. Generate new group key
  const newGroupKey = await generateGroupKey();

  // 2. Fetch all participants' devices
  const recipientDevices: Record<string, string> = {};
  for (const uid of participants) {
    const devicesSnap = await getDocs(collection(db, `users/${uid}/devices`));
    devicesSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.publicKey && data.deviceId) {
        recipientDevices[data.deviceId] = data.publicKey;
      }
    });
  }

  if (Object.keys(recipientDevices).length === 0) {
    console.warn("No active devices found for any participants.");
    return;
  }

  // 3. Encrypt the new group key for all devices
  const encryptedKeys = await encryptGroupKeyForDevices(
    newGroupKey,
    myPrivateKey,
    myPublicKeyBase64,
    recipientDevices
  );

  // 4. Save to Firestore (merge with existing device documents)
  const batch = writeBatch(db);
  for (const [deviceId, payload] of Object.entries(encryptedKeys)) {
    const keyRef = doc(db, `chats/${chatId}/groupKeys`, deviceId);
    batch.set(keyRef, {
      [nextEpoch]: {
        ...payload,
        createdAt: Date.now()
      }
    }, { merge: true });
  }

  // Update chat metadata to reflect new epoch
  batch.update(chatRef, { currentEpoch: nextEpoch });

  await batch.commit();
  console.log(`Rotated group key for chat ${chatId} to epoch ${nextEpoch}`);
};

/**
 * Gets the decrypted group key for a specific epoch.
 * @param chatId The chat ID
 * @param epoch The epoch number
 * @returns The decrypted 32-byte group key, or null if not found/decryption failed
 */
export const getGroupKeyForEpoch = async (chatId: string, epoch: number): Promise<Uint8Array | null> => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");

  const myDeviceId = localStorage.getItem(`secureDeviceId_${user.uid}`) || localStorage.getItem(`deviceId_${user.uid}`);
  if (!myDeviceId) {
    console.warn("Missing local device info");
    return null;
  }

  const { getPrivateKey, decryptGroupKey } = await import('@securevibechat/shared');
  const myPrivateKey = await getPrivateKey(myDeviceId);
  if (!myPrivateKey) {
    console.warn("Missing private key");
    return null;
  }

  const { getDoc } = await import('firebase/firestore');
  const keyDocRef = doc(db, `chats/${chatId}/groupKeys`, myDeviceId);
  const keyDocSnap = await getDoc(keyDocRef);
  
  if (!keyDocSnap.exists()) {
    console.warn(`No group keys found for device ${myDeviceId}`);
    return null;
  }

  const keysData = keyDocSnap.data();
  const encryptedPayload = keysData[epoch];
  if (!encryptedPayload) {
    console.warn(`No group key found for epoch ${epoch}`);
    return null;
  }

  return await decryptGroupKey(encryptedPayload, myPrivateKey);
};

/**
 * Gets the current group key and its epoch.
 */
export const getCurrentGroupKey = async (chatId: string): Promise<{ key: Uint8Array; epoch: number } | null> => {
  const { getDoc } = await import('firebase/firestore');
  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);
  
  if (!chatSnap.exists()) {
    return null;
  }
  
  const currentEpoch = chatSnap.data().currentEpoch || 1;
  const key = await getGroupKeyForEpoch(chatId, currentEpoch);
  if (!key) return null;
  
  return { key, epoch: currentEpoch };
};
