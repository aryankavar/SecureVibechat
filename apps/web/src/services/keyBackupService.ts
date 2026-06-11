import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { encryptPrivateKeyWithPIN, decryptPrivateKeyWithPIN } from '@securevibechat/shared';
import sodium from 'libsodium-wrappers';

/**
 * Backs up the user's private key to Firestore, encrypted with a PIN.
 * Call this once during first registration, after keypair generation.
 */
export async function backupPrivateKey(
  privateKeyBytes: Uint8Array,
  pin: string,
  uid: string
): Promise<void> {
  const encryptedBlob = await encryptPrivateKeyWithPIN(privateKeyBytes, pin);

  // Store the encrypted blob in Firestore
  // Firebase never sees the PIN or the raw private key — only encrypted bytes
  await setDoc(doc(db, `users/${uid}/keyBackup/default`), {
    ...encryptedBlob,
    createdAt: serverTimestamp(),
    schemaVersion: 1,
  });
}

/**
 * Restores a private key from Firestore backup using the user's PIN.
 * Call this on new device login when no local key is found in IndexedDB.
 */
export async function restorePrivateKey(
  pin: string,
  uid: string
): Promise<Uint8Array> {
  // Fetch the encrypted backup from Firestore
  const backupSnap = await getDoc(doc(db, `users/${uid}/keyBackup/default`));

  if (!backupSnap.exists()) {
    throw new Error('NO_BACKUP_FOUND');
  }

  const data = backupSnap.data();
  const blob = {
    encryptedKey: data.encryptedKey,
    salt: data.salt,
    iv: data.iv,
  };

  return decryptPrivateKeyWithPIN(blob, pin);
}

/**
 * Checks whether a key backup exists for this user.
 * Use to decide whether to show "Restore from backup" or "Set up backup PIN".
 */
export async function hasKeyBackup(uid: string): Promise<boolean> {
  const backupSnap = await getDoc(doc(db, `users/${uid}/keyBackup/default`));
  return backupSnap.exists();
}
