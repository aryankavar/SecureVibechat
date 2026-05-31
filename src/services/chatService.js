import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  addDoc,
  updateDoc
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { encryptMessage, decryptMessage } from '../utils/encryption'

/**
 * Get list of all users except current user
 * @param {string} currentUserId - Current user's ID
 */
export async function getUsersList(currentUserId) {
  try {
    const usersRef = collection(db, 'users')
    const snapshot = await getDocs(usersRef)
    
    const users = []
    snapshot.forEach((doc) => {
      if (doc.id !== currentUserId) {
        users.push({ id: doc.id, ...doc.data() })
      }
    })
    
    return users
  } catch (error) {
    console.error('Get users error:', error)
    throw error
  }
}

/**
 * Generate chat ID from two user IDs (consistent ordering)
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 */
export function generateChatId(userId1, userId2) {
  return [userId1, userId2].sort().join('_')
}

/**
 * Start or get existing chat between two users
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 */
export async function startChatBetweenUsers(userId1, userId2) {
  try {
    const chatId = generateChatId(userId1, userId2)
    const chatRef = doc(db, 'chats', chatId)
    
    // Check if chat exists
    const chatDoc = await getDoc(chatRef)
    
    if (!chatDoc.exists()) {
      // Create new chat
      await setDoc(chatRef, {
        participants: [userId1, userId2],
        createdAt: serverTimestamp(),
        lastMessage: null,
        lastMessageTime: serverTimestamp(),
        unreadCount: {
          [userId1]: 0,
          [userId2]: 0
        }
      })
    }
    
    return chatId
  } catch (error) {
    console.error('Start chat error:', error)
    throw error
  }
}

/**
 * Send encrypted message with unread tracking
 * @param {string} senderId - Sender's user ID
 * @param {string} receiverId - Receiver's user ID
 * @param {string} plainMessage - Plain text message
 */
export async function sendEncryptedMessage(senderId, receiverId, plainMessage) {
  try {
    const chatId = generateChatId(senderId, receiverId)
    
    // Encrypt message using sender's key
    const encryptedMessage = await encryptMessage(plainMessage, senderId)
    
    // Add message to chat
    const messagesRef = collection(db, 'chats', chatId, 'messages')
    const messageDoc = await addDoc(messagesRef, {
      senderId,
      receiverId,
      encryptedMessage,
      timestamp: serverTimestamp(),
      delivered: false,
      seen: false,
      isRead: false,
      deliveredAt: null,
      readAt: null
    })
    
    // Update chat's last message and increment unread count
    const chatRef = doc(db, 'chats', chatId)
    const chatDoc = await getDoc(chatRef)
    const currentUnread = chatDoc.data()?.unreadCount || {}
    
    await updateDoc(chatRef, {
      lastMessage: encryptedMessage,
      lastMessageTime: serverTimestamp(),
      lastMessageSenderId: senderId,
      [`unreadCount.${receiverId}`]: (currentUnread[receiverId] || 0) + 1
    })
    
    return messageDoc.id
  } catch (error) {
    console.error('Send message error:', error)
    throw error
  }
}

/**
 * Listen to messages in a chat (real-time)
 * @param {string} chatId - Chat ID
 * @param {function} callback - Callback function with messages array
 */
export function listenToMessages(chatId, callback) {
  const messagesRef = collection(db, 'chats', chatId, 'messages')
  const q = query(messagesRef, orderBy('timestamp', 'asc'))
  
  return onSnapshot(q, (snapshot) => {
    const messages = []
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() })
    })
    callback(messages)
  })
}

/**
 * Get user's chats with last message preview
 * @param {string} userId - Current user ID
 * @param {function} callback - Callback with chats array
 */
export function listenToUserChats(userId, callback) {
  const chatsRef = collection(db, 'chats')
  
  // Simple query without orderBy to avoid index requirement
  // We'll sort on the client side instead
  const q = query(
    chatsRef, 
    where('participants', 'array-contains', userId)
  )
  
  return onSnapshot(q, async (snapshot) => {
    const chats = []
    
    for (const chatDoc of snapshot.docs) {
      const chatData = chatDoc.data()
      const otherUserId = chatData.participants.find(id => id !== userId)
      
      // Get other user's info
      const userDoc = await getDoc(doc(db, 'users', otherUserId))
      const userData = userDoc.data()
      
      chats.push({
        id: chatDoc.id,
        ...chatData,
        otherUser: {
          id: otherUserId,
          ...userData
        },
        unreadCount: chatData.unreadCount?.[userId] || 0
      })
    }
    
    // Sort by lastMessageTime on client side (newest first)
    chats.sort((a, b) => {
      const timeA = a.lastMessageTime?.toMillis() || 0
      const timeB = b.lastMessageTime?.toMillis() || 0
      return timeB - timeA
    })
    
    callback(chats)
  })
}

/**
 * Mark all messages in chat as read
 * @param {string} chatId - Chat ID
 * @param {string} userId - Current user ID
 */
export async function markChatAsRead(chatId, userId) {
  try {
    // Get all unread messages
    const messagesRef = collection(db, 'chats', chatId, 'messages')
    const q = query(
      messagesRef,
      where('receiverId', '==', userId),
      where('isRead', '==', false)
    )
    
    const snapshot = await getDocs(q)
    
    // Update each message
    const updatePromises = []
    snapshot.forEach((docSnap) => {
      updatePromises.push(
        updateDoc(doc(db, 'chats', chatId, 'messages', docSnap.id), {
          isRead: true,
          readAt: serverTimestamp(),
          seen: true
        })
      )
    })
    
    await Promise.all(updatePromises)
    
    // Reset unread count for this user
    await updateDoc(doc(db, 'chats', chatId), {
      [`unreadCount.${userId}`]: 0
    })
  } catch (error) {
    console.error('Mark chat as read error:', error)
  }
}

/**
 * Mark message as delivered
 * @param {string} chatId - Chat ID
 * @param {string} messageId - Message ID
 */
export async function markMessageDelivered(chatId, messageId) {
  try {
    await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
      delivered: true,
      deliveredAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Mark delivered error:', error)
  }
}

/**
 * Mark message as seen
 * @param {string} chatId - Chat ID
 * @param {string} messageId - Message ID
 */
export async function markMessageSeen(chatId, messageId) {
  try {
    await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
      seen: true,
      isRead: true,
      readAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Mark seen error:', error)
  }
}
