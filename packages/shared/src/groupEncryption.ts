import sodium from 'libsodium-wrappers';
import { deriveSharedKeyWebCrypto } from './keyStorage';
import { encryptMessage, decryptMessage, EncryptedPayload } from './index';

/**
 * Generate a new random 32-byte group key for XChaCha20-Poly1305.
 */
export async function generateGroupKey(): Promise<Uint8Array> {
  await sodium.ready;
  return sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES);
}

/**
 * Encrypt the 32-byte group key for a list of recipient devices using Web Crypto.
 * @param groupKey The symmetric 32-byte key
 * @param myPrivateKey My CryptoKey
 * @param myPublicKeyBase64 My public key string
 * @param recipientDevices Record of deviceId to Base64 public key
 */
export async function encryptGroupKeyForDevices(
  groupKey: Uint8Array,
  myPrivateKey: CryptoKey,
  myPublicKeyBase64: string,
  recipientDevices: Record<string, string>
): Promise<Record<string, EncryptedPayload>> {
  await sodium.ready;
  // Convert the 32-byte group key to a base64 string so we can encrypt it as "plaintext"
  const groupKeyStr = sodium.to_base64(groupKey, sodium.base64_variants.ORIGINAL);
  
  const ciphertexts: Record<string, EncryptedPayload> = {};
  
  for (const [deviceId, publicKeyBase64] of Object.entries(recipientDevices)) {
    try {
      const sharedKey = await deriveSharedKeyWebCrypto(myPrivateKey, publicKeyBase64);
      const encrypted = encryptMessage(groupKeyStr, sharedKey);
      
      ciphertexts[deviceId] = {
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        senderPublicKey: myPublicKeyBase64
      };
    } catch (e) {
      console.warn(`Failed to encrypt group key for device ${deviceId}`, e);
    }
  }
  
  return ciphertexts;
}

/**
 * Decrypt the group key using the user's private key.
 * @param encryptedGroupKey The encrypted payload
 * @param myPrivateKey My CryptoKey
 * @returns The decrypted 32-byte group key, or null if it fails
 */
export async function decryptGroupKey(
  encryptedGroupKey: EncryptedPayload,
  myPrivateKey: CryptoKey
): Promise<Uint8Array | null> {
  await sodium.ready;
  try {
    const sharedKey = await deriveSharedKeyWebCrypto(myPrivateKey, encryptedGroupKey.senderPublicKey);
    const decryptedStr = decryptMessage(encryptedGroupKey, sharedKey);
    return sodium.from_base64(decryptedStr, sodium.base64_variants.ORIGINAL);
  } catch (e) {
    console.error("Failed to decrypt group key", e);
    return null;
  }
}
