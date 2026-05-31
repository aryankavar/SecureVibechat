/**
 * End-to-End Encryption Utility using AES-GCM
 * Messages are encrypted before sending and decrypted after receiving
 * Keys are derived from user UID + secret phrase
 */

// Convert string to ArrayBuffer
function str2ab(str) {
  const encoder = new TextEncoder()
  return encoder.encode(str)
}

// Convert ArrayBuffer to string
function ab2str(buffer) {
  const decoder = new TextDecoder()
  return decoder.decode(buffer)
}

// Convert ArrayBuffer to Base64
function ab2base64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

// Convert Base64 to ArrayBuffer
function base642ab(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Generate encryption key from user UID and secret phrase
 * @param {string} uid - User's unique ID
 * @returns {Promise<CryptoKey>} - AES-GCM encryption key
 */
export async function generateEncryptionKey(uid) {
  const secretPhrase = import.meta.env.VITE_ENCRYPTION_SECRET || 'default-secret-phrase'
  const keyMaterial = uid + secretPhrase
  
  // Hash the key material using SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', str2ab(keyMaterial))
  
  // Import the hash as an AES-GCM key
  const key = await crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
  
  return key
}

/**
 * Encrypt a message using AES-GCM
 * @param {string} plainText - Message to encrypt
 * @param {string} uid - User's unique ID
 * @returns {Promise<string>} - Encrypted message (Base64 encoded)
 */
export async function encryptMessage(plainText, uid) {
  try {
    const key = await generateEncryptionKey(uid)
    
    // Generate a random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    // Encrypt the message
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      str2ab(plainText)
    )
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(encryptedBuffer), iv.length)
    
    // Return as Base64 string
    return ab2base64(combined.buffer)
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt message')
  }
}

/**
 * Decrypt a message using AES-GCM
 * @param {string} encryptedText - Encrypted message (Base64 encoded)
 * @param {string} uid - User's unique ID
 * @returns {Promise<string>} - Decrypted plain text message
 */
export async function decryptMessage(encryptedText, uid) {
  try {
    const key = await generateEncryptionKey(uid)
    
    // Decode from Base64
    const combined = new Uint8Array(base642ab(encryptedText))
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12)
    const encryptedData = combined.slice(12)
    
    // Decrypt the message
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    )
    
    // Convert to string
    return ab2str(decryptedBuffer)
  } catch (error) {
    console.error('Decryption error:', error)
    return '[Encrypted Message - Unable to decrypt]'
  }
}

/**
 * Test encryption/decryption
 */
export async function testEncryption() {
  const testMessage = 'Hello, this is a secret message! 🔒'
  const testUid = 'test-user-123'
  
  console.log('Original:', testMessage)
  
  const encrypted = await encryptMessage(testMessage, testUid)
  console.log('Encrypted:', encrypted)
  
  const decrypted = await decryptMessage(encrypted, testUid)
  console.log('Decrypted:', decrypted)
  
  console.log('Match:', testMessage === decrypted)
}
