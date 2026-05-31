import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from '../config/firebase'

/**
 * Send friend request
 * @param {string} senderId - Sender's user ID
 * @param {string} senderName - Sender's display name
 * @param {string} receiverId - Receiver's user ID
 * @param {string} receiverName - Receiver's display name
 */
export async function sendFriendRequest(senderId, senderName, receiverId, receiverName) {
  try {
    const requestId = `${senderId}_${receiverId}_${Date.now()}`
    const batch = writeBatch(db)
    
    // Add to receiver's incoming requests
    const incomingRef = doc(db, 'friendRequests', receiverId, 'incoming', requestId)
    batch.set(incomingRef, {
      requestId,
      senderId,
      senderName,
      receiverId,
      timestamp: serverTimestamp(),
      status: 'pending'
    })
    
    // Add to sender's sent requests
    const sentRef = doc(db, 'friendRequests', senderId, 'sent', requestId)
    batch.set(sentRef, {
      requestId,
      receiverId,
      receiverName,
      senderId,
      timestamp: serverTimestamp(),
      status: 'pending'
    })
    
    await batch.commit()
    return requestId
  } catch (error) {
    console.error('Send friend request error:', error)
    throw error
  }
}

/**
 * Accept friend request
 * @param {string} userId - Current user ID
 * @param {string} requestId - Request ID
 * @param {string} friendId - Friend's user ID
 */
export async function acceptFriendRequest(userId, requestId, friendId) {
  try {
    const batch = writeBatch(db)
    
    // Add to friends collection (both directions)
    const friend1Ref = doc(db, 'friends', userId, 'list', friendId)
    batch.set(friend1Ref, {
      friendId,
      addedAt: serverTimestamp(),
      status: 'active'
    })
    
    const friend2Ref = doc(db, 'friends', friendId, 'list', userId)
    batch.set(friend2Ref, {
      friendId: userId,
      addedAt: serverTimestamp(),
      status: 'active'
    })
    
    // Delete incoming request
    const incomingRef = doc(db, 'friendRequests', userId, 'incoming', requestId)
    batch.delete(incomingRef)
    
    // Delete sent request
    const sentRef = doc(db, 'friendRequests', friendId, 'sent', requestId)
    batch.delete(sentRef)
    
    await batch.commit()
  } catch (error) {
    console.error('Accept friend request error:', error)
    throw error
  }
}

/**
 * Reject friend request
 * @param {string} userId - Current user ID
 * @param {string} requestId - Request ID
 * @param {string} senderId - Sender's user ID
 */
export async function rejectFriendRequest(userId, requestId, senderId) {
  try {
    const batch = writeBatch(db)
    
    // Delete incoming request
    const incomingRef = doc(db, 'friendRequests', userId, 'incoming', requestId)
    batch.delete(incomingRef)
    
    // Delete sent request
    const sentRef = doc(db, 'friendRequests', senderId, 'sent', requestId)
    batch.delete(sentRef)
    
    await batch.commit()
  } catch (error) {
    console.error('Reject friend request error:', error)
    throw error
  }
}

/**
 * Cancel sent friend request
 * @param {string} userId - Current user ID
 * @param {string} requestId - Request ID
 * @param {string} receiverId - Receiver's user ID
 */
export async function cancelFriendRequest(userId, requestId, receiverId) {
  try {
    const batch = writeBatch(db)
    
    // Delete sent request
    const sentRef = doc(db, 'friendRequests', userId, 'sent', requestId)
    batch.delete(sentRef)
    
    // Delete incoming request
    const incomingRef = doc(db, 'friendRequests', receiverId, 'incoming', requestId)
    batch.delete(incomingRef)
    
    await batch.commit()
  } catch (error) {
    console.error('Cancel friend request error:', error)
    throw error
  }
}

/**
 * Listen to incoming friend requests
 * @param {string} userId - Current user ID
 * @param {function} callback - Callback with requests array
 */
export function listenToIncomingRequests(userId, callback) {
  const requestsRef = collection(db, 'friendRequests', userId, 'incoming')
  
  return onSnapshot(requestsRef, async (snapshot) => {
    const requests = []
    
    for (const docSnap of snapshot.docs) {
      const requestData = docSnap.data()
      
      // Get sender's info
      const senderDoc = await getDoc(doc(db, 'users', requestData.senderId))
      const senderData = senderDoc.data()
      
      requests.push({
        id: docSnap.id,
        ...requestData,
        senderInfo: senderData
      })
    }
    
    callback(requests)
  })
}

/**
 * Listen to sent friend requests
 * @param {string} userId - Current user ID
 * @param {function} callback - Callback with requests array
 */
export function listenToSentRequests(userId, callback) {
  const requestsRef = collection(db, 'friendRequests', userId, 'sent')
  
  return onSnapshot(requestsRef, (snapshot) => {
    const requests = []
    snapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() })
    })
    callback(requests)
  })
}

/**
 * Get user's friends list
 * @param {string} userId - Current user ID
 * @param {function} callback - Callback with friends array
 */
export function listenToFriendsList(userId, callback) {
  const friendsRef = collection(db, 'friends', userId, 'list')
  
  return onSnapshot(friendsRef, async (snapshot) => {
    const friends = []
    
    for (const docSnap of snapshot.docs) {
      const friendData = docSnap.data()
      
      // Get friend's info
      const friendDoc = await getDoc(doc(db, 'users', friendData.friendId))
      const friendInfo = friendDoc.data()
      
      friends.push({
        id: docSnap.id,
        ...friendData,
        ...friendInfo
      })
    }
    
    callback(friends)
  })
}

/**
 * Check if users are friends
 * @param {string} userId - Current user ID
 * @param {string} friendId - Friend's user ID
 */
export async function checkIfFriends(userId, friendId) {
  try {
    const friendDoc = await getDoc(doc(db, 'friends', userId, 'list', friendId))
    return friendDoc.exists()
  } catch (error) {
    console.error('Check friends error:', error)
    return false
  }
}

/**
 * Check if friend request already sent
 * @param {string} senderId - Sender's user ID
 * @param {string} receiverId - Receiver's user ID
 */
export async function checkIfRequestSent(senderId, receiverId) {
  try {
    const sentRef = collection(db, 'friendRequests', senderId, 'sent')
    const q = query(sentRef, where('receiverId', '==', receiverId))
    const snapshot = await getDocs(q)
    return !snapshot.empty
  } catch (error) {
    console.error('Check request error:', error)
    return false
  }
}

/**
 * Search users (excluding current user and existing friends)
 * @param {string} searchQuery - Search term
 * @param {string} currentUserId - Current user ID
 */
export async function searchUsers(searchQuery, currentUserId) {
  try {
    const usersRef = collection(db, 'users')
    const snapshot = await getDocs(usersRef)
    
    const users = []
    snapshot.forEach((doc) => {
      if (doc.id !== currentUserId) {
        const userData = doc.data()
        const matchesSearch = 
          userData.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          userData.email?.toLowerCase().includes(searchQuery.toLowerCase())
        
        if (matchesSearch) {
          users.push({ id: doc.id, ...userData })
        }
      }
    })
    
    return users
  } catch (error) {
    console.error('Search users error:', error)
    throw error
  }
}
