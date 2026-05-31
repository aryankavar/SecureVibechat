import sodium from 'libsodium-wrappers';

export interface KeyPair {
  publicKey: string; // Base64
  privateKey: string; // Base64
}

export interface EncryptedPayload {
  ciphertext: string; // Base64
  iv: string; // Base64
  ephemeralPublicKey?: string; // Base64 (only for the first message or if ephemeral keys are used)
}

/**
 * Initialize libsodium. Must be called before any other functions.
 */
export async function initEncryption(): Promise<void> {
  await sodium.ready;
}

/**
 * Generate a new X25519 keypair for key exchange.
 */
export function generateKeyPair(): KeyPair {
  const keypair = sodium.crypto_box_keypair();
  return {
    publicKey: sodium.to_base64(keypair.publicKey, sodium.base64_variants.ORIGINAL),
    privateKey: sodium.to_base64(keypair.privateKey, sodium.base64_variants.ORIGINAL),
  };
}

/**
 * Derive a shared symmetric key using ECDH (X25519) + BLAKE2b (HKDF).
 * @param myPrivateKey Base64
 * @param theirPublicKey Base64
 */
export function deriveSharedKey(myPrivateKey: string, theirPublicKey: string): Uint8Array {
  const privKey = sodium.from_base64(myPrivateKey, sodium.base64_variants.ORIGINAL);
  const pubKey = sodium.from_base64(theirPublicKey, sodium.base64_variants.ORIGINAL);
  
  // Compute scalar multiplication (ECDH)
  const sharedSecret = sodium.crypto_scalarmult(privKey, pubKey);
  
  // Hash the shared secret to derive a 32-byte key
  return sodium.crypto_generichash(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES, sharedSecret);
}

/**
 * Encrypt a plaintext string using XChaCha20-Poly1305 with a derived shared key.
 * @param plaintext The string to encrypt
 * @param sharedKey The 32-byte derived shared key
 */
export function encryptMessage(plaintext: string, sharedKey: Uint8Array): EncryptedPayload {
  const iv = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext,
    null,
    null,
    iv,
    sharedKey
  );
  
  return {
    ciphertext: sodium.to_base64(ciphertext, sodium.base64_variants.ORIGINAL),
    iv: sodium.to_base64(iv, sodium.base64_variants.ORIGINAL),
  };
}

/**
 * Decrypt an XChaCha20-Poly1305 ciphertext using a derived shared key.
 * @param payload The encrypted payload
 * @param sharedKey The 32-byte derived shared key
 */
export function decryptMessage(payload: EncryptedPayload, sharedKey: Uint8Array): string {
  const ciphertext = sodium.from_base64(payload.ciphertext, sodium.base64_variants.ORIGINAL);
  const iv = sodium.from_base64(payload.iv, sodium.base64_variants.ORIGINAL);
  
  const decrypted = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    ciphertext,
    null,
    iv,
    sharedKey
  );
  
  return sodium.to_string(decrypted);
}

export interface MultiDeviceEncryptedPayload extends EncryptedPayload {
  senderPublicKey: string;
}

/**
 * Encrypt a plaintext message for multiple recipient devices.
 * @param plaintext The string to encrypt
 * @param myPrivateKey Base64
 * @param myPublicKey Base64
 * @param recipientDevices Record of deviceId to Base64 publicKey
 * @returns A record mapping deviceId to EncryptedPayload
 */
export function encryptForMultipleDevices(
  plaintext: string,
  myPrivateKey: string,
  myPublicKey: string,
  recipientDevices: Record<string, string>
): Record<string, MultiDeviceEncryptedPayload> {
  const ciphertexts: Record<string, MultiDeviceEncryptedPayload> = {};
  
  for (const [deviceId, publicKey] of Object.entries(recipientDevices)) {
    try {
      const sharedKey = deriveSharedKey(myPrivateKey, publicKey);
      const encrypted = encryptMessage(plaintext, sharedKey);
      ciphertexts[deviceId] = {
        ...encrypted,
        senderPublicKey: myPublicKey
      };
    } catch (e) {
      console.warn(`Failed to encrypt for device ${deviceId}`, e);
    }
  }
  
  return ciphertexts;
}
