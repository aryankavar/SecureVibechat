"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupDisappearingMessages = exports.debugSearchUsers = exports.backfillUsers = exports.searchUsers = exports.createChat = exports.onMessageCreate = exports.onUserCreate = exports.updateGroupInfo = exports.removeGroupMember = exports.addGroupMember = exports.createGroup = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
// Re-export group functions
var groupFunctions_1 = require("./groupFunctions");
Object.defineProperty(exports, "createGroup", { enumerable: true, get: function () { return groupFunctions_1.createGroup; } });
Object.defineProperty(exports, "addGroupMember", { enumerable: true, get: function () { return groupFunctions_1.addGroupMember; } });
Object.defineProperty(exports, "removeGroupMember", { enumerable: true, get: function () { return groupFunctions_1.removeGroupMember; } });
Object.defineProperty(exports, "updateGroupInfo", { enumerable: true, get: function () { return groupFunctions_1.updateGroupInfo; } });
admin.initializeApp();
const db = admin.firestore();
// SECURITY: Shared admin-verification helper for HTTP endpoints.
// Extracts Bearer token, verifies it with Firebase Auth, then checks
// that the caller has a document in the `admins/{uid}` collection.
async function verifyAdmin(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(403).json({ error: 'Unauthorized' });
        return false;
    }
    const token = authHeader.split('Bearer ')[1];
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        const adminDoc = await db.collection('admins').doc(decoded.uid).get();
        if (!adminDoc.exists) {
            res.status(403).json({ error: 'Unauthorized' });
            return false;
        }
        return true;
    }
    catch (_a) {
        res.status(403).json({ error: 'Unauthorized' });
        return false;
    }
}
// -----------------------------------------------------------------------------
// USER TRIGGERS
// -----------------------------------------------------------------------------
/**
 * Triggered when a new user signs up via Firebase Auth.
 * Creates their profile document in Firestore.
 */
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
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
exports.onMessageCreate = functions.firestore
    .document('chats/{chatId}/messages/{messageId}')
    .onCreate(async (snap, context) => {
    var _a;
    const message = snap.data();
    const chatId = context.params.chatId;
    if (!message || message.type === 'system')
        return;
    const chatRef = db.collection('chats').doc(chatId);
    let chatType = 'dm';
    await db.runTransaction(async (transaction) => {
        const chatDoc = await transaction.get(chatRef);
        if (!chatDoc.exists)
            return;
        const chatData = chatDoc.data();
        chatType = chatData.type;
        const participants = chatData.participants || [];
        // Build unread count updates
        const unreadCountUpdates = {};
        // Update unread count for everyone except the sender
        participants.forEach((uid) => {
            if (uid !== message.senderId) {
                // Increment the specific user's unread count
                unreadCountUpdates[`unreadCount.${uid}`] = admin.firestore.FieldValue.increment(1);
            }
        });
        // Update the chat document with denormalized last message and incremented unread counts
        transaction.update(chatRef, Object.assign(Object.assign({}, unreadCountUpdates), { lastMessage: {
                text: message.type === 'text' ? message.content.ciphertext : `[${message.type.toUpperCase()}]`,
                senderId: message.senderId,
                type: message.type,
                timestamp: message.createdAt
            }, updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
    });
    // We still need participants to send FCM
    const chatDoc = await chatRef.get();
    if (!chatDoc.exists)
        return;
    const participants = ((_a = chatDoc.data()) === null || _a === void 0 ? void 0 : _a.participants) || [];
    // Send FCM Push Notification
    if (participants && participants.length > 0) {
        const tokens = [];
        const tokensMap = new Map(); // Keep track of token -> uid for cleanup
        // Fetch fcmTokens for all recipients
        await Promise.all(participants.map(async (uid) => {
            if (uid !== message.senderId) {
                const userDoc = await db.collection('users').doc(uid).get();
                if (userDoc.exists) {
                    const data = userDoc.data();
                    if ((data === null || data === void 0 ? void 0 : data.fcmTokens) && Array.isArray(data.fcmTokens)) {
                        data.fcmTokens.forEach((token) => {
                            tokens.push(token);
                            tokensMap.set(token, uid);
                        });
                    }
                }
            }
        }));
        if (tokens.length > 0) {
            try {
                const payload = {
                    notification: {
                        title: chatType === 'group' ? 'New Group Message' : 'New Message',
                        body: 'You have a new encrypted message.',
                    },
                    data: {
                        chatId,
                        click_action: 'FLUTTER_NOTIFICATION_CLICK', // For mobile apps if needed
                    },
                    tokens,
                };
                const response = await admin.messaging().sendEachForMulticast(payload);
                // Cleanup invalid tokens
                if (response.failureCount > 0) {
                    const tokensToRemoveByUid = {};
                    response.responses.forEach((resp, idx) => {
                        var _a;
                        if (!resp.success) {
                            const errorStr = (_a = resp.error) === null || _a === void 0 ? void 0 : _a.code;
                            if (errorStr === 'messaging/invalid-registration-token' ||
                                errorStr === 'messaging/registration-token-not-registered') {
                                const failedToken = tokens[idx];
                                const uid = tokensMap.get(failedToken);
                                if (uid) {
                                    if (!tokensToRemoveByUid[uid])
                                        tokensToRemoveByUid[uid] = [];
                                    tokensToRemoveByUid[uid].push(failedToken);
                                }
                            }
                        }
                    });
                    // Run cleanup updates
                    const cleanupPromises = Object.entries(tokensToRemoveByUid).map(([uid, staleTokens]) => {
                        return db.collection('users').doc(uid).update({
                            fcmTokens: admin.firestore.FieldValue.arrayRemove(...staleTokens)
                        });
                    });
                    await Promise.all(cleanupPromises);
                }
            }
            catch (error) {
                console.error('Error sending FCM notifications:', error);
            }
        }
    }
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
exports.createChat = functions.https.onCall(async (data, context) => {
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
exports.searchUsers = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    const query = ((_a = data.query) === null || _a === void 0 ? void 0 : _a.toLowerCase().trim()) || '';
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
    }
    else if (query.length < 1 && !query.startsWith('+') && isNaN(Number(query))) {
        return { users: [] };
    }
    else {
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
            }
            else if (!phoneToSearch.startsWith('+')) {
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
        }
        else {
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
// SECURITY: auth-gated — requires valid Firebase ID token + admin role
exports.backfillUsers = functions.https.onRequest(async (req, res) => {
    if (!(await verifyAdmin(req, res)))
        return;
    try {
        const snapshot = await db.collection('users').get();
        let count = 0;
        const batch = db.batch();
        snapshot.forEach(doc => {
            const data = doc.data();
            const updates = {};
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// SECURITY: auth-gated — requires valid Firebase ID token + admin role
exports.debugSearchUsers = functions.https.onRequest(async (req, res) => {
    var _a, _b, _c;
    if (!(await verifyAdmin(req, res)))
        return;
    try {
        const query = (req.query.q || '').toLowerCase().trim();
        const endQuery = query + '\uf8ff';
        let results = {};
        // 1. Try empty query
        const emptySnap = await db.collection('users').orderBy('lastSeen', 'desc').limit(20).get();
        results.emptyQuery = {
            docsFound: emptySnap.docs.length,
            firstDoc: ((_a = emptySnap.docs[0]) === null || _a === void 0 ? void 0 : _a.data()) || null
        };
        // 2. Try simple limit query
        const limitSnap = await db.collection('users').limit(20).get();
        results.limitQuery = {
            docsFound: limitSnap.docs.length,
            firstDoc: ((_b = limitSnap.docs[0]) === null || _b === void 0 ? void 0 : _b.data()) || null
        };
        // 3. Try displayNameLower query
        const nameSnap = await db.collection('users').orderBy('displayNameLower').startAt(query).endAt(endQuery).limit(20).get();
        results.nameQuery = {
            query: query,
            endQuery: endQuery,
            docsFound: nameSnap.docs.length,
            firstDoc: ((_c = nameSnap.docs[0]) === null || _c === void 0 ? void 0 : _c.data()) || null
        };
        res.json({ success: true, results });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
});
// -----------------------------------------------------------------------------
// SCHEDULED TASKS
// -----------------------------------------------------------------------------
/**
 * Scheduled function to delete disappearing messages.
 * Runs every hour to clean up messages older than the chat's disappearingSetting.
 */
exports.cleanupDisappearingMessages = functions.pubsub.schedule('every 1 hours').onRun(async (context) => {
    console.log('Running cleanupDisappearingMessages...');
    const now = Date.now();
    // Settings map (in milliseconds)
    const retentionMs = {
        '1hr': 60 * 60 * 1000,
        '24hr': 24 * 60 * 60 * 1000,
        '7days': 7 * 24 * 60 * 60 * 1000,
    };
    try {
        // We query for chats that have a disappearingSetting set and it's not 'off'
        const chatsSnapshot = await db.collection('chats')
            .where('disappearingSetting', 'in', ['1hr', '24hr', '7days'])
            .get();
        let deletedCount = 0;
        for (const chatDoc of chatsSnapshot.docs) {
            const setting = chatDoc.data().disappearingSetting;
            const ms = retentionMs[setting];
            if (!ms)
                continue;
            const cutoffTime = new Date(now - ms);
            const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffTime);
            const messagesSnapshot = await chatDoc.ref.collection('messages')
                .where('createdAt', '<', cutoffTimestamp)
                .get();
            if (!messagesSnapshot.empty) {
                const batch = db.batch();
                messagesSnapshot.docs.forEach((msgDoc) => {
                    batch.delete(msgDoc.ref);
                    deletedCount++;
                });
                await batch.commit();
            }
        }
        console.log(`Cleaned up ${deletedCount} disappearing messages.`);
    }
    catch (error) {
        console.error('Error cleaning up disappearing messages:', error);
    }
    return null;
});
//# sourceMappingURL=index.js.map