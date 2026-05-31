"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGroupInfo = exports.removeGroupMember = exports.addGroupMember = exports.createGroup = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const getDb = () => admin.firestore();
// -----------------------------------------------------------------------------
// GROUP CHAT MANAGEMENT
// -----------------------------------------------------------------------------
/**
 * Create a new group chat.
 * The caller becomes the admin automatically.
 */
exports.createGroup = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { name, memberIds, description, avatarUrl } = data;
    if (!name || typeof name !== 'string' || name.trim().length < 1) {
        throw new functions.https.HttpsError('invalid-argument', 'Group name is required');
    }
    if (!Array.isArray(memberIds) || memberIds.length < 1) {
        throw new functions.https.HttpsError('invalid-argument', 'At least 1 other member is required');
    }
    if (memberIds.length > 256) {
        throw new functions.https.HttpsError('invalid-argument', 'Maximum 256 members per group');
    }
    // Include creator in participants
    const allParticipants = Array.from(new Set([context.auth.uid, ...memberIds]));
    // Verify all members exist
    const memberChecks = await Promise.all(allParticipants.map(uid => getDb().collection('users').doc(uid).get()));
    const invalidMembers = memberChecks.filter(doc => !doc.exists);
    if (invalidMembers.length > 0) {
        throw new functions.https.HttpsError('not-found', 'One or more members do not exist');
    }
    // Initialize unread counts
    const unreadCount = {};
    allParticipants.forEach(uid => { unreadCount[uid] = 0; });
    // Create group chat document
    const groupChat = await getDb().collection('chats').add({
        type: 'group',
        participants: allParticipants,
        groupInfo: {
            name: name.trim(),
            description: (description === null || description === void 0 ? void 0 : description.trim()) || '',
            avatarUrl: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=random&size=200`,
            createdBy: context.auth.uid,
            admins: [context.auth.uid],
        },
        lastMessage: null,
        unreadCount,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Add a system message announcing group creation
    await getDb().collection(`chats/${groupChat.id}/messages`).add({
        senderId: 'system',
        type: 'system',
        content: { ciphertext: '', iv: '' },
        systemText: `Group "${name.trim()}" was created`,
        status: 'delivered',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { chatId: groupChat.id };
});
/**
 * Add a member to an existing group chat.
 * Only admins can add members.
 */
exports.addGroupMember = functions.https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { chatId, userId } = data;
    if (!chatId || !userId) {
        throw new functions.https.HttpsError('invalid-argument', 'chatId and userId are required');
    }
    const chatRef = getDb().collection('chats').doc(chatId);
    const chatDoc = await chatRef.get();
    if (!chatDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Chat not found');
    }
    const chatData = chatDoc.data();
    if (chatData.type !== 'group') {
        throw new functions.https.HttpsError('failed-precondition', 'Can only add members to groups');
    }
    if (!chatData.groupInfo.admins.includes(context.auth.uid)) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can add members');
    }
    if (chatData.participants.includes(userId)) {
        throw new functions.https.HttpsError('already-exists', 'User is already a member');
    }
    if (chatData.participants.length >= 256) {
        throw new functions.https.HttpsError('resource-exhausted', 'Group is at maximum capacity');
    }
    // Verify user exists
    const userDoc = await getDb().collection('users').doc(userId).get();
    if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User not found');
    }
    const userName = ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.displayName) || 'Someone';
    const adderDoc = await getDb().collection('users').doc(context.auth.uid).get();
    const adderName = ((_b = adderDoc.data()) === null || _b === void 0 ? void 0 : _b.displayName) || 'Someone';
    await getDb().runTransaction(async (transaction) => {
        transaction.update(chatRef, {
            participants: admin.firestore.FieldValue.arrayUnion(userId),
            [`unreadCount.${userId}`]: 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    // System message
    await getDb().collection(`chats/${chatId}/messages`).add({
        senderId: 'system',
        type: 'system',
        content: { ciphertext: '', iv: '' },
        systemText: `${adderName} added ${userName}`,
        status: 'delivered',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
/**
 * Remove a member from a group chat.
 * Admins can remove anyone. Users can remove themselves (leave).
 */
exports.removeGroupMember = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { chatId, userId } = data;
    if (!chatId || !userId) {
        throw new functions.https.HttpsError('invalid-argument', 'chatId and userId are required');
    }
    const chatRef = getDb().collection('chats').doc(chatId);
    const chatDoc = await chatRef.get();
    if (!chatDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Chat not found');
    }
    const chatData = chatDoc.data();
    if (chatData.type !== 'group') {
        throw new functions.https.HttpsError('failed-precondition', 'Not a group chat');
    }
    const isSelf = userId === context.auth.uid;
    const isAdmin = chatData.groupInfo.admins.includes(context.auth.uid);
    if (!isSelf && !isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can remove members');
    }
    if (!chatData.participants.includes(userId)) {
        throw new functions.https.HttpsError('not-found', 'User is not a member');
    }
    // Get names for system message
    const userDoc = await getDb().collection('users').doc(userId).get();
    const userName = ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.displayName) || 'Someone';
    await getDb().runTransaction(async (transaction) => {
        const updates = {
            participants: admin.firestore.FieldValue.arrayRemove(userId),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        // If leaving user is an admin, remove from admins too
        if (chatData.groupInfo.admins.includes(userId)) {
            updates['groupInfo.admins'] = admin.firestore.FieldValue.arrayRemove(userId);
        }
        // Remove their unread count
        updates[`unreadCount.${userId}`] = admin.firestore.FieldValue.delete();
        transaction.update(chatRef, updates);
    });
    // System message
    const systemText = isSelf ? `${userName} left the group` : `${userName} was removed`;
    await getDb().collection(`chats/${chatId}/messages`).add({
        senderId: 'system',
        type: 'system',
        content: { ciphertext: '', iv: '' },
        systemText,
        status: 'delivered',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
/**
 * Update group info (name, description, avatar).
 * Only admins can update.
 */
exports.updateGroupInfo = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { chatId, name, description, avatarUrl } = data;
    if (!chatId) {
        throw new functions.https.HttpsError('invalid-argument', 'chatId is required');
    }
    const chatRef = getDb().collection('chats').doc(chatId);
    const chatDoc = await chatRef.get();
    if (!chatDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Chat not found');
    }
    const chatData = chatDoc.data();
    if (chatData.type !== 'group') {
        throw new functions.https.HttpsError('failed-precondition', 'Not a group chat');
    }
    if (!chatData.groupInfo.admins.includes(context.auth.uid)) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can update group info');
    }
    const updates = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (name !== undefined)
        updates['groupInfo.name'] = name.trim();
    if (description !== undefined)
        updates['groupInfo.description'] = description.trim();
    if (avatarUrl !== undefined)
        updates['groupInfo.avatarUrl'] = avatarUrl;
    await chatRef.update(updates);
    return { success: true };
});
//# sourceMappingURL=groupFunctions.js.map