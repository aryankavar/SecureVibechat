import sodium from 'libsodium-wrappers-sumo';

export interface KeyBackupBlob {
  encryptedKey: string;
  salt: string;
  iv: string;
}

export async function encryptPrivateKeyWithPIN(
  privateKeyBytes: Uint8Array,
  pin: string
): Promise<KeyBackupBlob> {
  await sodium.ready;

  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
  
  // Use Argon2id (crypto_pwhash) which is memory-hard and computationally expensive
  const pinBuffer = sodium.from_string(pin);
  const backupKey = sodium.crypto_pwhash(
    32, // Key size
    pinBuffer,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );

  const iv = sodium.randombytes_buf(24);
  const encrypted = sodium.crypto_secretbox_easy(privateKeyBytes, iv, backupKey);

  return {
    encryptedKey: sodium.to_base64(encrypted),
    salt: sodium.to_base64(salt),
    iv: sodium.to_base64(iv),
  };
}

export async function decryptPrivateKeyWithPIN(
  blob: KeyBackupBlob,
  pin: string
): Promise<Uint8Array> {
  await sodium.ready;

  const saltBytes = sodium.from_base64(blob.salt);
  const pinBuffer = sodium.from_string(pin);
  const backupKey = sodium.crypto_pwhash(
    32, // Key size
    pinBuffer,
    saltBytes,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );

  try {
    return sodium.crypto_secretbox_open_easy(
      sodium.from_base64(blob.encryptedKey),
      sodium.from_base64(blob.iv),
      backupKey
    );
  } catch (err) {
    throw new Error('WRONG_PIN');
  }
}

export async function restoreKeyFromBackup(
  encryptedKey: string,
  pin: string,
  salt: string,
  nonce: string
): Promise<string> {
  const bytes = await decryptPrivateKeyWithPIN({ encryptedKey, salt, iv: nonce }, pin);
  await sodium.ready;
  return sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL);
}
