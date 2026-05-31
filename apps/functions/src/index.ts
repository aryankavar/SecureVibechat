import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Re-export group functions
export { createGroup, addGroupMember, removeGroupMember, updateGroupInfo } from './groupFunctions';

admin.initializeApp();
const db = admin.firestore();

// -----------------------------------------------------------------------------
// USER TRIGGERS
// -----------------------------------------------------------------------------

/**
 * Triggered when a new user signs up via Firebase Auth.
 * Creates their profile document in Firestore.
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const profile = {
    uid: user.uid,
    phoneNumber: user.phoneNumber || '',
    email: user.email || '',
    displayName: user.displayName || 'New User',
    avatarUrl: user.photoURL || `https://ui-avatars.com/api/?name=New+User&background=random`,
    about: "Hey there! I am using SecureVibeChat.",
    isOnline: true,
    lastSeen: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    fcmTokens: [],
    // We expect the client to generate and upload their public key later via a direct write or callable
  };

  await db.collection('users').doc(user.uid).set(profile);

  // Initialize default settings
  await db.collection('users').doc(user.uid).collection('settings').doc('preferences').set({
    readReceipts: true,
    lastSeenVisible: true,
    profilePhotoVisibility: 'everyone'
  });
});

// -----------------------------------------------------------------------------
// CHAT & MESSAGE TRIGGERS
// -----------------------------------------------------------------------------

/**
 * Triggered when a new message is created.
 * Updates chat metadata (last message, unread counts) and sends push notifications.
 */
export const onMessageCreate = functions.firestore
  .document('chats/{chatId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const chatId = context.params.chatId;

    if (!message || message.type === 'system') return;

    const chatRef = db.collection('chats').doc(chatId);
    
    await db.runTransaction(async (transaction) => {
      const chatDoc = await transaction.get(chatRef);
      if (!chatDoc.exists) return;
      
      const chatData = chatDoc.data()!;
      const participants = chatData.participants || [];
      
      // Build unread count updates
      const unreadCountUpdates: any = {};
      
      // Update unread count for everyone except the sender
      participants.forEach((uid: string) => {
        if (uid !== message.senderId) {
          // Increment the specific user's unread count
          unreadCountUpdates[`unreadCount.${uid}`] = admin.firestore.FieldValue.increment(1);
        }
      });

      // Update the chat document with denormalized last message and incremented unread counts
      transaction.update(chatRef, {
        ...unreadCountUpdates,
        lastMessage: {
          text: message.type === 'text' ? message.content.ciphertext : `[${message.type.toUpperCase()}]`,
          senderId: message.senderId,
          type: message.type,
          timestamp: message.createdAt
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    // TODO: Send FCM Push Notification here
    // In a real app, you would query the recipient's FCM tokens and send a silent/data notification
    // to trigger background decryption or a visible notification with hidden content.

    // Mark message as 'delivered' server-side (it was 'sent' when client wrote it)
    // Skip for system messages
    if (message.senderId !== 'system') {
      await snap.ref.update({ status: 'delivered' });
    }
  });

/**
 * Callable: Create a new 1:1 chat between the caller and another user.
 * Returns the chatId (either existing or newly created).
 */
export const createChat = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const recipientId = data.recipientId;
  if (!recipientId) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid recipient');
  }

  // Check if a chat already exists between these two users
  const existingChats = await db.collection('chats')
    .where('participants', 'array-contains', context.auth.uid)
    .get();

  for (const chatDoc of existingChats.docs) {
    const participants = chatDoc.data().participants;
    if (participants.includes(recipientId) && participants.length === 2) {
      return { chatId: chatDoc.id };
    }
  }

  // Create new DM chat
  const newChat = await db.collection('chats').add({
    type: 'dm',
    participants: [context.auth.uid, recipientId],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastMessage: null,
    unreadCount: {
      [context.auth.uid]: 0,
      [recipientId]: 0,
    },
  });

  return { chatId: newChat.id };
});

// -----------------------------------------------------------------------------
// CALLABLE FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Search users securely.
 * Prevents clients from downloading the entire users collection.
 */
export const searchUsers = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const query = data.query?.toLowerCase().trim() || '';
  console.log(`[searchUsers] Executing search for query: "${query}" | Auth UID: ${context.auth.uid}`);
  
  let snapshot;
  
  if (query === '') {
    // Return suggestions (recently active users)
    snapshot = await db.collection('users')
      .orderBy('lastSeen', 'desc')
      .limit(20)
      .get();
      
    if (snapshot.empty) {
      snapshot = await db.collection('users').limit(20).get();
    }
  } else if (query.length < 1 && !query.startsWith('+') && isNaN(Number(query))) {
    return { users: [] };
  } else {
    // Normalize the query for phone number matching by removing spaces and dashes
    const normalizedPhone = query.replace(/[\s-]/g, '');
    const isPhoneNumber = /^\+?\d{8,15}$/.test(normalizedPhone);
    
    if (isPhoneNumber) {
      // Try to match exact normalized phone first (e.g. +918460566881)
      let phoneToSearch = normalizedPhone;
      
      // If user forgot country code (e.g. 10 digits in India), prepend +91 as a fallback for this specific user
      // A better way would be using the request country, but for now we default to +91 if 10 digits
      if (phoneToSearch.length === 10 && !phoneToSearch.startsWith('+')) {
        phoneToSearch = '+91' + phoneToSearch;
      } else if (!phoneToSearch.startsWith('+')) {
        phoneToSearch = '+' + phoneToSearch;
      }

      snapshot = await db.collection('users')
        .where('phoneNumber', '==', phoneToSearch)
        .limit(1)
        .get();
        
      // If not found, try without adding country code just in case
      if (snapshot.empty && normalizedPhone !== phoneToSearch) {
        snapshot = await db.collection('users')
          .where('phoneNumber', '==', normalizedPhone)
          .limit(1)
          .get();
      }
    } else {
      const endQuery = query + '\uf8ff';
      snapshot = await db.collection('users')
        .orderBy('displayNameLower')
        .startAt(query)
        .endAt(endQuery)
        .limit(20)
        .get();
        
      // If for some reason the query yields nothing because older users don't have displayNameLower,
      // fallback to the old displayName query just in case (though it's case sensitive)
      if (snapshot.empty) {
        snapshot = await db.collection('users')
          .orderBy('displayName')
          .startAt(query)
          .endAt(endQuery)
          .limit(20)
          .get();
      }
    }
  }

  const users = snapshot.docs.map(doc => {
    const d = doc.data();
    return {
      uid: d.uid,
      displayName: d.displayName,
      phoneNumber: d.phoneNumber,
      avatarUrl: d.avatarUrl,
      about: d.about,
      publicKey: d.publicKey
    };
  });

  return { users };
});

export const backfillUsers = functions.https.onRequest(async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    let count = 0;
    const batch = db.batch();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const updates: any = {};
      
      if (data.displayName && !data.displayNameLower) {
        updates.displayNameLower = data.displayName.toLowerCase();
      }
      
      if (!data.lastSeen) {
        updates.lastSeen = admin.firestore.FieldValue.serverTimestamp();
      }
      
      if (Object.keys(updates).length > 0) {
        batch.update(doc.ref, updates);
        count++;
      }
    });
    
    if (count > 0) {
      await batch.commit();
    }
    
    res.json({ success: true, backfilled: count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const debugSearchUsers = functions.https.onRequest(async (req, res) => {
  try {
    const query = (req.query.q as string || '').toLowerCase().trim();
    const endQuery = query + '\uf8ff';
    let results: any = {};
    
    // 1. Try empty query
    const emptySnap = await db.collection('users').orderBy('lastSeen', 'desc').limit(20).get();
    results.emptyQuery = {
      docsFound: emptySnap.docs.length,
      firstDoc: emptySnap.docs[0]?.data() || null
    };

    // 2. Try simple limit query
    const limitSnap = await db.collection('users').limit(20).get();
    results.limitQuery = {
      docsFound: limitSnap.docs.length,
      firstDoc: limitSnap.docs[0]?.data() || null
    };

    // 3. Try displayNameLower query
    const nameSnap = await db.collection('users').orderBy('displayNameLower').startAt(query).endAt(endQuery).limit(20).get();
    results.nameQuery = {
      query: query,
      endQuery: endQuery,
      docsFound: nameSnap.docs.length,
      firstDoc: nameSnap.docs[0]?.data() || null
    };

    res.json({ success: true, results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});
