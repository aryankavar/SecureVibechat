# 🔥 Firebase Setup Guide

Complete guide to setting up Firebase for SecureVibe Chat.

## 📋 Prerequisites

- Google account
- Node.js installed (v16 or higher)
- Basic understanding of Firebase

## 🚀 Step-by-Step Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `securevibe-chat` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

### Step 2: Register Your Web App

1. In Firebase Console, click the web icon (`</>`)
2. Register app nickname: `SecureVibe Chat Web`
3. Check "Also set up Firebase Hosting" (optional)
4. Click "Register app"
5. Copy the Firebase configuration object

### Step 3: Enable Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click "Get started"
3. Click on "Email/Password" under Sign-in method
4. Enable "Email/Password"
5. Click "Save"

### Step 4: Create Firestore Database

1. Go to **Build** → **Firestore Database**
2. Click "Create database"
3. Select location (choose closest to your users)
4. Start in **production mode**
5. Click "Enable"

### Step 5: Set Up Firestore Security Rules

1. In Firestore Database, go to **Rules** tab
2. Replace the default rules with:

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

3. Click "Publish"

### Step 6: Create Firestore Indexes (Optional but Recommended)

1. Go to **Indexes** tab in Firestore
2. Add composite index for chats:
   - Collection: `chats`
   - Fields:
     - `participants` (Array)
     - `lastMessageTime` (Descending)
   - Query scope: Collection

This index will be automatically suggested when you run queries. You can also create it when Firebase prompts you.

### Step 7: Set Up Firebase Storage (Optional - for future features)

1. Go to **Build** → **Storage**
2. Click "Get started"
3. Start in **production mode**
4. Click "Done"

### Step 8: Configure Your Application

1. Copy your Firebase configuration
2. Create `.env` file in your project root:

```env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
VITE_ENCRYPTION_SECRET=change_this_to_a_strong_secret_phrase
```

## 📊 Firestore Data Structure

### Users Collection

```
/users/{userId}
  ├── uid: string
  ├── name: string
  ├── email: string
  ├── photoURL: string
  ├── isOnline: boolean
  ├── lastOnline: timestamp
  └── createdAt: timestamp
```

### Chats Collection

```
/chats/{chatId}
  ├── participants: array[userId1, userId2]
  ├── createdAt: timestamp
  ├── lastMessage: string (encrypted)
  ├── lastMessageTime: timestamp
  ├── lastMessageSenderId: string
  └── /messages/{messageId}
      ├── senderId: string
      ├── receiverId: string
      ├── encryptedMessage: string
      ├── timestamp: timestamp
      ├── delivered: boolean
      └── seen: boolean
```

## 🔒 Security Best Practices

### 1. Firestore Rules

✅ **DO:**
- Validate user authentication
- Check user permissions
- Validate data types and required fields
- Use helper functions for reusability

❌ **DON'T:**
- Allow public read/write access
- Trust client-side validation only
- Store sensitive data without encryption

### 2. Authentication

✅ **DO:**
- Enforce strong passwords (min 6 characters)
- Use email verification (optional)
- Implement rate limiting
- Monitor suspicious activity

❌ **DON'T:**
- Store passwords in Firestore
- Allow weak passwords
- Share authentication tokens

### 3. Data Security

✅ **DO:**
- Encrypt messages before storing
- Use HTTPS only
- Validate all inputs
- Implement proper error handling

❌ **DON'T:**
- Store plain text messages
- Expose API keys in client code (use environment variables)
- Trust user input without validation

## 🧪 Testing Your Setup

### Test Authentication

```javascript
// In browser console
import { createUser } from './src/services/authService'

createUser('test@example.com', 'password123', 'Test User')
  .then(user => console.log('User created:', user))
  .catch(error => console.error('Error:', error))
```

### Test Firestore Connection

```javascript
// In browser console
import { db } from './src/config/firebase'
import { collection, getDocs } from 'firebase/firestore'

getDocs(collection(db, 'users'))
  .then(snapshot => console.log('Users:', snapshot.size))
  .catch(error => console.error('Error:', error))
```

### Test Encryption

```javascript
// In browser console
import { encryptMessage, decryptMessage } from './src/utils/encryption'

const testUid = 'test-user-123'
const message = 'Hello, World!'

encryptMessage(message, testUid)
  .then(encrypted => {
    console.log('Encrypted:', encrypted)
    return decryptMessage(encrypted, testUid)
  })
  .then(decrypted => console.log('Decrypted:', decrypted))
```

## 📈 Monitoring and Analytics

### Enable Firebase Analytics

1. Go to **Analytics** → **Dashboard**
2. View user engagement, retention, and events
3. Set up custom events for:
   - Message sent
   - Chat created
   - User login
   - Profile updated

### Enable Performance Monitoring

1. Go to **Release & Monitor** → **Performance**
2. Add Firebase Performance SDK (optional)
3. Monitor app load times and network requests

### Enable Crashlytics (Optional)

1. Go to **Release & Monitor** → **Crashlytics**
2. Follow setup instructions
3. Monitor app crashes and errors

## 💰 Firebase Pricing

### Free Tier (Spark Plan)

- **Authentication**: 10,000 verifications/month
- **Firestore**: 
  - 50,000 reads/day
  - 20,000 writes/day
  - 20,000 deletes/day
  - 1 GB storage
- **Hosting**: 10 GB storage, 360 MB/day transfer

### Paid Tier (Blaze Plan)

- Pay as you go
- Free tier included
- Additional usage charged per operation

**Estimate for 1,000 active users:**
- ~$5-10/month for typical usage
- Monitor usage in Firebase Console

## 🆘 Troubleshooting

### "Permission Denied" Errors

1. Check Firestore rules are published
2. Verify user is authenticated
3. Check user has permission for the operation
4. Review Firebase Console logs

### Authentication Errors

1. Verify Firebase config in `.env`
2. Check email/password is enabled
3. Ensure password meets requirements (min 6 chars)
4. Check browser console for detailed errors

### Firestore Connection Issues

1. Check internet connection
2. Verify Firebase project is active
3. Check Firestore is enabled
4. Review browser console for errors

### Index Errors

When you see "The query requires an index", Firebase will provide a link to create it automatically. Click the link and wait for the index to build (usually 1-2 minutes).

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firebase Pricing](https://firebase.google.com/pricing)

## 🎓 Next Steps

1. ✅ Complete Firebase setup
2. ✅ Configure environment variables
3. ✅ Test authentication
4. ✅ Test Firestore operations
5. ✅ Deploy your application

---

**Your Firebase setup is complete! 🎉**

Now you can run your application with:

```bash
npm install
npm run dev
```
