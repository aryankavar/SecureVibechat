# 🔄 Migration Guide - Enhanced Features

## Overview

This guide helps you integrate the new features into your existing SecureVibe Chat application.

---

## 📋 What's New

### New Files Created

#### Services (3 files)
- `src/services/friendService.js` - Friend request management
- `src/services/notificationService.js` - Push notifications & badges
- `src/services/chatService.js` - **UPDATED** with unread tracking

#### Components (2 files)
- `src/components/Badge.jsx` - Badge notification component
- `src/components/FriendRequestModal.jsx` - Search & send requests modal

#### Pages (1 file)
- `src/pages/FriendRequestsScreen.jsx` - Manage friend requests

#### Styles (3 files)
- `src/styles/Badge.css` - Badge styling
- `src/styles/FriendRequestModal.css` - Modal styling
- `src/styles/FriendRequestsScreen.css` - Requests page styling

#### Updated Files
- `src/pages/ChatListScreen.jsx` - Added badges & friend request button
- `src/pages/ChatScreen.jsx` - Added mark as read functionality
- `src/App.jsx` - Added new route for friend requests
- `src/styles/ChatListScreen.css` - Added badge styles

#### Configuration
- `firestore-enhanced.rules` - Updated security rules
- `.env.example` - Added VAPID key

---

## 🚀 Step-by-Step Migration

### Step 1: Backup Your Current Code

```bash
# Create a backup branch
git checkout -b backup-before-enhancement
git add .
git commit -m "Backup before adding enhanced features"
git checkout main
```

### Step 2: Install Dependencies

No new dependencies needed! All features use existing packages.

```bash
# Verify dependencies are installed
npm install
```

### Step 3: Update Firestore Rules

**Option A: Using Firebase CLI**

```bash
# Copy the new rules
cp firestore-enhanced.rules firestore.rules

# Deploy
firebase deploy --only firestore:rules
```

**Option B: Manual Update**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Firestore Database → Rules
4. Copy content from `firestore-enhanced.rules`
5. Click "Publish"

### Step 4: Update Environment Variables

Add to your `.env` file:

```env
# Optional: For push notifications
VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
```

To get VAPID key:
1. Firebase Console → Project Settings
2. Cloud Messaging tab
3. Web Push certificates → Generate key pair

### Step 5: Verify File Structure

Ensure all new files are in place:

```
src/
├── components/
│   ├── Badge.jsx ✨ NEW
│   └── FriendRequestModal.jsx ✨ NEW
├── pages/
│   ├── ChatListScreen.jsx ✅ UPDATED
│   ├── ChatScreen.jsx ✅ UPDATED
│   └── FriendRequestsScreen.jsx ✨ NEW
├── services/
│   ├── chatService.js ✅ UPDATED
│   ├── friendService.js ✨ NEW
│   └── notificationService.js ✨ NEW
└── styles/
    ├── Badge.css ✨ NEW
    ├── ChatListScreen.css ✅ UPDATED
    ├── FriendRequestModal.css ✨ NEW
    └── FriendRequestsScreen.css ✨ NEW
```

### Step 6: Test the Application

```bash
# Start development server
npm run dev
```

#### Test Checklist

- [ ] App loads without errors
- [ ] Can send friend requests
- [ ] Can accept/reject requests
- [ ] Badges appear on unread chats
- [ ] Badges disappear when chat opened
- [ ] Friend request badge shows count
- [ ] All existing features still work
- [ ] Encryption still works
- [ ] Dark mode still works

### Step 7: Update Existing Chats (Optional)

If you have existing chats, add unread count field:

```javascript
// Run this once in browser console
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db } from './src/config/firebase'

async function migrateChats() {
  const chatsRef = collection(db, 'chats')
  const snapshot = await getDocs(chatsRef)
  
  for (const chatDoc of snapshot.docs) {
    const participants = chatDoc.data().participants
    await updateDoc(doc(db, 'chats', chatDoc.id), {
      unreadCount: {
        [participants[0]]: 0,
        [participants[1]]: 0
      }
    })
  }
  
  console.log('Migration complete!')
}

migrateChats()
```

---

## 🔍 Troubleshooting

### Issue: Import Errors

**Error**: `Cannot find module './services/friendService'`

**Solution**: Ensure all new files are created in correct locations

```bash
# Check file exists
ls src/services/friendService.js
```

### Issue: Firestore Permission Denied

**Error**: `Missing or insufficient permissions`

**Solution**: Update Firestore rules

1. Verify rules are published in Firebase Console
2. Check rules include `friendRequests` and `friends` collections
3. Wait 1-2 minutes for rules to propagate

### Issue: Badges Not Showing

**Error**: Badges don't appear on chat items

**Solution**: 

1. Check `unreadCount` field exists in chat documents
2. Verify Badge component is imported
3. Check CSS is loaded

```javascript
// Verify in browser console
import { doc, getDoc } from 'firebase/firestore'
import { db } from './src/config/firebase'

const chatDoc = await getDoc(doc(db, 'chats', 'your_chat_id'))
console.log(chatDoc.data().unreadCount) // Should show object with user IDs
```

### Issue: Friend Requests Not Working

**Error**: Can't send or receive requests

**Solution**:

1. Check Firestore rules include `friendRequests` collection
2. Verify user is authenticated
3. Check browser console for errors
4. Ensure FriendRequestModal is imported correctly

### Issue: Build Errors

**Error**: Build fails with module errors

**Solution**:

```bash
# Clear cache and rebuild
rm -rf node_modules dist .vite
npm install
npm run build
```

---

## 🔄 Rollback Plan

If you need to rollback:

### Option 1: Git Rollback

```bash
# Return to backup
git checkout backup-before-enhancement

# Or revert specific files
git checkout HEAD~1 src/pages/ChatListScreen.jsx
```

### Option 2: Manual Rollback

1. Remove new files:
```bash
rm src/components/Badge.jsx
rm src/components/FriendRequestModal.jsx
rm src/pages/FriendRequestsScreen.jsx
rm src/services/friendService.js
rm src/services/notificationService.js
rm src/styles/Badge.css
rm src/styles/FriendRequestModal.css
rm src/styles/FriendRequestsScreen.css
```

2. Restore original files from backup

3. Revert Firestore rules to previous version

---

## 📊 Database Migration

### Existing Data

Your existing data is **fully compatible**. No migration required for:
- ✅ Users
- ✅ Chats
- ✅ Messages
- ✅ Encryption

### New Collections

The following collections will be created automatically:
- `friendRequests/{userId}/incoming/{requestId}`
- `friendRequests/{userId}/sent/{requestId}`
- `friends/{userId}/list/{friendId}`

### Optional: Add Unread Counts

For existing chats, you can add unread counts:

```javascript
// Firebase Console → Firestore → chats → {chatId}
// Add field:
{
  "unreadCount": {
    "user1_id": 0,
    "user2_id": 0
  }
}
```

Or use the migration script from Step 7 above.

---

## 🎨 Customization

### Change Badge Colors

Edit `src/styles/Badge.css`:

```css
.badge-pink {
  background: linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 100%);
}
```

### Change Animation Speed

Edit animation duration:

```css
@keyframes badgeAppear {
  /* Change from 0.3s to your preferred speed */
  animation: badgeAppear 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### Customize Friend Request Modal

Edit `src/styles/FriendRequestModal.css`:

```css
.modal-content {
  max-width: 600px; /* Change modal width */
  border-radius: 30px; /* Change roundness */
}
```

---

## 📱 Testing on Different Devices

### Desktop Testing

```bash
npm run dev
# Open http://localhost:3000
```

### Mobile Testing

```bash
# Get your local IP
ipconfig getifaddr en0  # Mac
ip addr show  # Linux

# Access from mobile
# http://YOUR_IP:3000
```

### Production Testing

```bash
npm run build
npm run preview
# Test production build locally
```

---

## 🚀 Deployment

### Deploy to Firebase Hosting

```bash
# Build
npm run build

# Deploy
firebase deploy
```

### Deploy to Vercel

```bash
# Build
npm run build

# Deploy
vercel --prod
```

### Deploy to Netlify

```bash
# Build
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

---

## 📚 Additional Resources

### Documentation
- [ENHANCED_FEATURES.md](ENHANCED_FEATURES.md) - Complete feature guide
- [README.md](README.md) - Main documentation
- [FIREBASE_SETUP.md](FIREBASE_SETUP.md) - Firebase configuration

### Code Examples
- `src/services/friendService.js` - Friend request API
- `src/services/notificationService.js` - Notification API
- `src/components/Badge.jsx` - Badge component usage

### Support
- Check browser console for errors
- Review Firestore rules in Firebase Console
- Test with multiple user accounts
- Use Chrome DevTools for debugging

---

## ✅ Post-Migration Checklist

After migration, verify:

- [ ] App builds without errors (`npm run build`)
- [ ] All pages load correctly
- [ ] Friend requests can be sent
- [ ] Friend requests can be accepted/rejected
- [ ] Badges appear on unread chats
- [ ] Badges clear when chat opened
- [ ] Friend request count shows in header
- [ ] Existing chats still work
- [ ] Messages still encrypted
- [ ] Dark mode still works
- [ ] Profile page still works
- [ ] Logout still works
- [ ] Firestore rules updated
- [ ] No console errors
- [ ] Tested on mobile
- [ ] Tested on desktop

---

## 🎉 Success!

Your SecureVibe Chat is now enhanced with:
- ✅ Friend Request System
- ✅ Badge Notifications
- ✅ Push Notifications (optional)
- ✅ All existing features preserved
- ✅ Same beautiful pastel design
- ✅ Same end-to-end encryption

**Enjoy your enhanced chat app! 💬✨**

Need help? Check [ENHANCED_FEATURES.md](ENHANCED_FEATURES.md) for detailed documentation.
