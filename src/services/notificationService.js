import { 
  doc, 
  setDoc, 
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

/**
 * Request notification permission and get FCM token
 * @param {string} userId - User's ID
 */
export async function requestNotificationPermission(userId) {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications')
      return null
    }
    
    // Request permission
    const permission = await Notification.requestPermission()
    
    if (permission === 'granted') {
      // Get FCM token
      const messaging = getMessaging()
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      })
      
      if (token) {
        // Save token to Firestore
        await setDoc(doc(db, 'users', userId, 'settings', 'notifications'), {
          fcmToken: token,
          enabled: true,
          updatedAt: serverTimestamp()
        }, { merge: true })
        
        return token
      }
    }
    
    return null
  } catch (error) {
    console.error('Notification permission error:', error)
    return null
  }
}

/**
 * Listen for foreground messages
 */
export function listenToForegroundMessages(callback) {
  try {
    const messaging = getMessaging()
    
    return onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload)
      
      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: '/logo.png',
          badge: '/badge.png',
          tag: payload.data?.chatId || 'default'
        })
      }
      
      callback(payload)
    })
  } catch (error) {
    console.error('Listen to messages error:', error)
  }
}

/**
 * Get unread message count for a chat
 * @param {string} chatId - Chat ID
 * @param {string} userId - Current user ID
 */
export async function getUnreadCount(chatId, userId) {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages')
    const q = query(
      messagesRef,
      where('receiverId', '==', userId),
      where('isRead', '==', false)
    )
    
    const snapshot = await getDocs(q)
    return snapshot.size
  } catch (error) {
    console.error('Get unread count error:', error)
    return 0
  }
}

/**
 * Listen to unread counts for all chats
 * @param {string} userId - Current user ID
 * @param {function} callback - Callback with unread counts object
 */
export function listenToUnreadCounts(userId, callback) {
  const chatsRef = collection(db, 'chats')
  const q = query(chatsRef, where('participants', 'array-contains', userId))
  
  return onSnapshot(q, async (snapshot) => {
    const unreadCounts = {}
    
    for (const chatDoc of snapshot.docs) {
      const chatId = chatDoc.id
      
      // Count unread messages in this chat
      const messagesRef = collection(db, 'chats', chatId, 'messages')
      const unreadQuery = query(
        messagesRef,
        where('receiverId', '==', userId),
        where('isRead', '==', false)
      )
      
      const unreadSnapshot = await getDocs(unreadQuery)
      unreadCounts[chatId] = unreadSnapshot.size
    }
    
    callback(unreadCounts)
  })
}

/**
 * Mark messages as read
 * @param {string} chatId - Chat ID
 * @param {string} userId - Current user ID
 */
export async function markMessagesAsRead(chatId, userId) {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages')
    const q = query(
      messagesRef,
      where('receiverId', '==', userId),
      where('isRead', '==', false)
    )
    
    const snapshot = await getDocs(q)
    
    const updatePromises = []
    snapshot.forEach((docSnap) => {
      updatePromises.push(
        updateDoc(doc(db, 'chats', chatId, 'messages', docSnap.id), {
          isRead: true,
          readAt: serverTimestamp()
        })
      )
    })
    
    await Promise.all(updatePromises)
  } catch (error) {
    console.error('Mark as read error:', error)
  }
}

/**
 * Send notification to user (via Cloud Function trigger)
 * This creates a notification document that triggers a Cloud Function
 * @param {string} userId - Recipient user ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data
 */
export async function sendNotification(userId, title, body, data = {}) {
  try {
    const notificationRef = doc(collection(db, 'notifications'))
    await setDoc(notificationRef, {
      userId,
      title,
      body,
      data,
      createdAt: serverTimestamp(),
      sent: false
    })
  } catch (error) {
    console.error('Send notification error:', error)
  }
}

/**
 * Get notification settings for user
 * @param {string} userId - User's ID
 */
export async function getNotificationSettings(userId) {
  try {
    const settingsDoc = await getDoc(doc(db, 'users', userId, 'settings', 'notifications'))
    return settingsDoc.exists() ? settingsDoc.data() : { enabled: false }
  } catch (error) {
    console.error('Get notification settings error:', error)
    return { enabled: false }
  }
}

/**
 * Update notification settings
 * @param {string} userId - User's ID
 * @param {object} settings - Settings object
 */
export async function updateNotificationSettings(userId, settings) {
  try {
    await setDoc(doc(db, 'users', userId, 'settings', 'notifications'), {
      ...settings,
      updatedAt: serverTimestamp()
    }, { merge: true })
  } catch (error) {
    console.error('Update notification settings error:', error)
    throw error
  }
}
