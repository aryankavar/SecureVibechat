import { 
  doc, 
  updateDoc, 
  serverTimestamp,
  arrayUnion 
} from 'firebase/firestore'
import { db } from '../config/firebase'

/**
 * Message Service
 * Handles message deletion and other message operations
 */

/**
 * Delete message for current user only
 * @param {string} chatId - Chat ID
 * @param {string} messageId - Message ID
 * @param {string} userId - Current user ID
 */
export async function deleteMessageForMe(chatId, messageId, userId) {
  try {
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId)
    
    await updateDoc(messageRef, {
      deletedFor: arrayUnion(userId)
    })
    
    return true
  } catch (error) {
    console.error('Delete for me error:', error)
    throw error
  }
}

/**
 * Delete message for everyone
 * @param {string} chatId - Chat ID
 * @param {string} messageId - Message ID
 * @param {string} userId - Current user ID (must be sender)
 */
export async function deleteMessageForEveryone(chatId, messageId, userId) {
  try {
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId)
    
    await updateDoc(messageRef, {
      isDeleted: true,
      deletedBy: userId,
      deletedAt: serverTimestamp()
    })
    
    return true
  } catch (error) {
    console.error('Delete for everyone error:', error)
    throw error
  }
}

/**
 * Check if message is deleted for current user
 * @param {object} message - Message object
 * @param {string} userId - Current user ID
 */
export function isMessageDeletedForUser(message, userId) {
  // Check if deleted for everyone
  if (message.isDeleted) {
    return {
      deleted: true,
      forEveryone: true,
      deletedBy: message.deletedBy
    }
  }
  
  // Check if deleted for this user
  if (message.deletedFor && message.deletedFor.includes(userId)) {
    return {
      deleted: true,
      forEveryone: false,
      deletedBy: null
    }
  }
  
  return {
    deleted: false,
    forEveryone: false,
    deletedBy: null
  }
}

/**
 * Get deleted message placeholder text
 * @param {object} message - Message object
 * @param {string} currentUserId - Current user ID
 */
export function getDeletedMessageText(message, currentUserId) {
  if (message.isDeleted) {
    if (message.deletedBy === currentUserId) {
      return 'You deleted this message'
    } else {
      return 'This message was deleted'
    }
  }
  
  return ''
}

/**
 * Check if user can delete message for everyone
 * @param {object} message - Message object
 * @param {string} userId - Current user ID
 * @param {number} timeLimit - Time limit in milliseconds (default 1 hour)
 */
export function canDeleteForEveryone(message, userId, timeLimit = 3600000) {
  // Must be the sender
  if (message.senderId !== userId) {
    return false
  }
  
  // Must not already be deleted
  if (message.isDeleted) {
    return false
  }
  
  // Check time limit
  if (message.timestamp) {
    const messageTime = message.timestamp.toMillis()
    const now = Date.now()
    return (now - messageTime) < timeLimit
  }
  
  return true
}

/**
 * Filter out messages deleted for current user
 * @param {array} messages - Array of messages
 * @param {string} userId - Current user ID
 */
export function filterDeletedMessages(messages, userId) {
  return messages.filter(message => {
    const deletionStatus = isMessageDeletedForUser(message, userId)
    
    // Hide if deleted for this user only (not for everyone)
    if (deletionStatus.deleted && !deletionStatus.forEveryone) {
      return false
    }
    
    return true
  })
}
