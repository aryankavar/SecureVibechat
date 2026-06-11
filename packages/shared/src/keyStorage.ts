export async function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Only works in browser environment
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }
    
    const req = window.indexedDB.open('securevibe-keys', 2);
    
    req.onupgradeneeded = (e) => {
      const target = e.target as IDBOpenDBRequest;
      if (!target.result.objectStoreNames.contains('keys')) {
        target.result.createObjectStore('keys', { keyPath: 'deviceId' });
      }
      if (!target.result.objectStoreNames.contains('libsodium-keys')) {
        target.result.createObjectStore('libsodium-keys', { keyPath: 'deviceId' });
      }
    };
    
    req.onsuccess = (e) => {
      resolve((e.target as IDBOpenDBRequest).result);
    };
    
    req.onerror = () => {
      reject(req.error);
    };
  });
}

export async function storePrivateKey(key: CryptoKey, deviceId: string): Promise<void> {
  const db = await openKeyDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readwrite');
    const store = tx.objectStore('keys');
    const req = store.put({ key, deviceId, createdAt: Date.now() });
    
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getPrivateKey(deviceId: string): Promise<CryptoKey | null> {
  const db = await openKeyDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readonly');
    const store = tx.objectStore('keys');
    const req = store.get(deviceId);
    
    req.onsuccess = () => {
      resolve(req.result ? req.result.key : null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deletePrivateKey(deviceId: string): Promise<void> {
  const db = await openKeyDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readwrite');
    const store = tx.objectStore('keys');
    const req = store.delete(deviceId);
    
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Store a libsodium X25519 private key (base64 string) in IndexedDB
export async function storeLibsodiumPrivateKey(deviceId: string, privateKeyBase64: string): Promise<void> {
  const db = await openKeyDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('libsodium-keys', 'readwrite');
    const store = tx.objectStore('libsodium-keys');
    const req = store.put({ privateKeyBase64, deviceId, createdAt: Date.now() });
    
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Retrieve a libsodium X25519 private key from IndexedDB
export async function getLibsodiumPrivateKey(deviceId: string): Promise<string | null> {
  const db = await openKeyDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('libsodium-keys', 'readonly');
    const store = tx.objectStore('libsodium-keys');
    const req = store.get(deviceId);
    
    req.onsuccess = () => {
      resolve(req.result ? req.result.privateKeyBase64 : null);
    };
    req.onerror = () => reject(req.error);
  });
}

// Delete a libsodium key from IndexedDB  
export async function deleteLibsodiumPrivateKey(deviceId: string): Promise<void> {
  const db = await openKeyDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('libsodium-keys', 'readwrite');
    const store = tx.objectStore('libsodium-keys');
    const req = store.delete(deviceId);
    
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function generateNonExtractableKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false, // extractable: false
    ['deriveBits'] // We will derive bits for libsodium
  );
}

export async function generateExtractableKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, // extractable: true
    ['deriveBits']
  );
}

export async function exportPrivateKey(key: CryptoKey): Promise<Uint8Array> {
  const exported = await crypto.subtle.exportKey('pkcs8', key);
  return new Uint8Array(exported);
}

export async function importPrivateKeyNonExtractable(bytes: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'pkcs8',
    bytes as any,
    { name: 'ECDH', namedCurve: 'P-256' },
    false, // non-extractable
    ['deriveBits']
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  // Convert ArrayBuffer to Base64
  const bytes = new Uint8Array(exported);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function importPublicKey(base64Key: string): Promise<CryptoKey> {
  const binary = atob(base64Key);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  return await crypto.subtle.importKey(
    'raw',
    bytes.buffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
}

/**
 * Derives a 32-byte shared symmetric key using Web Crypto ECDH.
 * @param myPrivateKey CryptoKey (unextractable)
 * @param theirPublicKeyBase64 Base64 string of their raw public key
 */
export async function deriveSharedKeyWebCrypto(
  myPrivateKey: CryptoKey,
  theirPublicKeyBase64: string
): Promise<Uint8Array> {
  const theirPublicKey = await importPublicKey(theirPublicKeyBase64);
  
  // Derive bits (32 bytes = 256 bits for XChaCha20 or AES-256)
  const sharedBits = await crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: theirPublicKey
    },
    myPrivateKey,
    256 // 32 bytes
  );
  
  return new Uint8Array(sharedBits);
}
