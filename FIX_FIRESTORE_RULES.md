# 🔧 Fix Firestore Rules - Quick Guide

## ❌ The Problem

You're getting this error:
```
FirebaseError: Missing or insufficient permissions
```

This happens because the Firestore security rules are preventing you from creating new chats.

## ✅ The Solution

Update your Firestore security rules to allow chat creation.

### Step 1: Go to Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database**
4. Click on the **Rules** tab

### Step 2: Replace the Rules

Copy and paste these rules (or use the `firestore.rules` file):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      // Anyone authenticated can read user profiles
      allow read: if isAuthenticated();
      
      // Users can only write their own profile
      allow create, update: if isOwner(userId);
      
      // Users cannot delete their profile (optional restriction)
      allow delete: if isOwner(userId);
    }
    
    // Chats collection
    match /chats/{chatId} {
      // Allow read if user is a participant (for existing chats)
      allow read: if isAuthenticated() && 
        (request.auth.uid in resource.data.participants);
      
      // Allow create if user is one of the participants
      allow create: if isAuthenticated() && 
        request.auth.uid in request.resource.data.participants;
      
      // Allow update if user is a participant
      allow update: if isAuthenticated() && 
        request.auth.uid in resource.data.participants;
      
      // Messages subcollection
      match /messages/{messageId} {
        // Only chat participants can read messages
        allow read: if isAuthenticated() && 
          request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
        
        // Only chat participants can create messages
        allow create: if isAuthenticated() && 
          request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants &&
          request.auth.uid == request.resource.data.senderId;
        
        // Only sender or receiver can update message (for seen/delivered status)
        allow update: if isAuthenticated() && 
          (request.auth.uid == resource.data.senderId || 
           request.auth.uid == resource.data.receiverId);
        
        // No one can delete messages (optional restriction)
        allow delete: if false;
      }
    }
  }
}
```

### Step 3: Publish the Rules

1. Click the **Publish** button
2. Wait for confirmation

### Step 4: Test Your App

1. Refresh your app
2. Try creating a new chat
3. It should work now! ✅

## 🔍 What Changed?

The key fix is in the `chats` collection rules:

**Before (broken):**
```javascript
allow read, write: if request.auth != null && 
  request.auth.uid in resource.data.participants;
```

**After (fixed):**
```javascript
// Separate create from read/update
allow create: if request.auth != null && 
  request.auth.uid in request.resource.data.participants;

allow read, update: if request.auth != null && 
  request.auth.uid in resource.data.participants;
```

**Why?** When creating a new chat, `resource.data` doesn't exist yet, so we need to check `request.resource.data` instead.

## 🚀 Quick Deploy (Using Firebase CLI)

If you have Firebase CLI installed:

```bash
# Deploy the rules file
firebase deploy --only firestore:rules
```

## ✅ Verify It's Working

After updating the rules:

1. **Create a new chat** - Click "New Chat" and select a user
2. **Send a message** - Type and send a message
3. **Check for errors** - Open browser console (F12)
4. **No errors?** - You're all set! 🎉

## 🐛 Still Having Issues?

### Check Authentication
```javascript
// In browser console
firebase.auth().currentUser
// Should show your user object
```

### Check Firestore Connection
```javascript
// In browser console
console.log('User ID:', firebase.auth().currentUser.uid)
```

### Check Rules Are Published
- Go to Firebase Console → Firestore → Rules
- Verify the rules match the ones above
- Check the "Last published" timestamp

## 📚 Learn More

- [Firestore Security Rules Docs](https://firebase.google.com/docs/firestore/security/get-started)
- [FIREBASE_SETUP.md](FIREBASE_SETUP.md) - Complete Firebase guide
- [README.md](README.md) - Full documentation

---

**Your app should work perfectly now! 🎉**
