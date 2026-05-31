# ⚡ Quick Reference - Enhanced Features

## 🎯 Quick Start

### 1. Update Firestore Rules (REQUIRED)

```bash
# Copy enhanced rules to Firebase Console
# Firestore Database → Rules → Paste → Publish
```

Use rules from `firestore-enhanced.rules`

### 2. Add Environment Variable (Optional)

```env
# For push notifications
VITE_FIREBASE_VAPID_KEY=your_key_here
```

### 3. Run the App

```bash
npm install
npm run dev
```

---

## 🔥 New Features at a Glance

### 👥 Friend Requests

| Action | Button | Location |
|--------|--------|----------|
| Search Users | ➕ | Header (top right) |
| View Requests | 👥 | Header (with badge) |
| Accept Request | ✓ Accept | Friend Requests page |
| Reject Request | ✕ Reject | Friend Requests page |

### 🔔 Badges

| Badge | Location | Meaning |
|-------|----------|---------|
| Pink circle on avatar | Chat list | Unread messages |
| Pink circle on 👥 | Header | Pending requests |
| Number inside | Badge | Count |

### 📱 Notifications (Optional)

| Event | Notification |
|-------|--------------|
| New message | "New message from {name}" |
| Friend request | "{name} sent you a friend request" |
| Request accepted | "{name} accepted your request" |

---

## 📋 Common Tasks

### Send Friend Request

1. Click ➕ in header
2. Search for user
3. Click "➕ Add Friend"
4. Done! ✅

### Accept Friend Request

1. Click 👥 in header (with badge)
2. Go to "Incoming" tab
3. Click "✓ Accept"
4. Now friends! 🎉

### Check Unread Messages

- Look for pink badge on chat avatar
- Number shows unread count
- Badge disappears when you open chat

### Enable Notifications

1. App will prompt for permission
2. Click "Allow"
3. Notifications enabled! 🔔

---

## 🎨 UI Elements

### Header Icons

```
💬 SecureVibe  |  ➕  👥  🌙  👤  🚪
                  │   │   │   │   └─ Logout
                  │   │   │   └───── Profile
                  │   │   └───────── Dark Mode
                  │   └───────────── Friend Requests (with badge)
                  └───────────────── Add Friend
```

### Chat List Item

```
┌─────────────────────────────────────┐
│ [Avatar]  Name              2m ago  │
│  (badge)  Last message...           │
│           ● Online                  │
└─────────────────────────────────────┘
```

### Friend Request Card

```
┌─────────────────────────────────────┐
│ [Avatar]  John Doe                  │
│           john@email.com            │
│           5 minutes ago             │
│                                     │
│           [✓ Accept]  [✕ Reject]   │
└─────────────────────────────────────┘
```

---

## 🔧 Firestore Structure

### Friend Requests

```
/friendRequests/{userId}/
  ├── incoming/{requestId}
  │   ├── senderId
  │   ├── senderName
  │   ├── timestamp
  │   └── status: "pending"
  └── sent/{requestId}
      ├── receiverId
      ├── receiverName
      ├── timestamp
      └── status: "pending"
```

### Friends

```
/friends/{userId}/
  └── list/{friendId}
      ├── friendId
      ├── addedAt
      └── status: "active"
```

### Chats (Updated)

```
/chats/{chatId}
  ├── participants: [userId1, userId2]
  ├── unreadCount: {
  │     userId1: 0,
  │     userId2: 3
  │   }
  └── messages/{messageId}
      ├── isRead: false
      ├── readAt: null
      └── ...
```

---

## 💻 Code Snippets

### Import Services

```javascript
// Friend requests
import { 
  sendFriendRequest,
  acceptFriendRequest,
  listenToIncomingRequests
} from './services/friendService'

// Notifications
import { 
  requestNotificationPermission,
  markMessagesAsRead
} from './services/notificationService'

// Badge component
import Badge from './components/Badge'
```

### Use Badge Component

```javascript
<Badge count={5} size="small" color="pink" />

// With positioning
<div className="badge-container">
  <img src={avatar} alt="User" />
  <div className="badge-top-right">
    <Badge count={unreadCount} size="small" color="pink" />
  </div>
</div>
```

### Send Friend Request

```javascript
await sendFriendRequest(
  currentUser.uid,
  currentUser.displayName,
  friendId,
  friendName
)
```

### Listen to Requests

```javascript
const unsubscribe = listenToIncomingRequests(userId, (requests) => {
  console.log('Incoming:', requests)
})
```

### Mark Chat as Read

```javascript
import { markChatAsRead } from './services/chatService'

await markChatAsRead(chatId, userId)
```

---

## 🎨 Customization

### Change Badge Color

```css
/* src/styles/Badge.css */
.badge-pink {
  background: linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 100%);
}
```

### Change Badge Size

```javascript
<Badge count={5} size="large" color="pink" />
// Options: "small", "medium", "large"
```

### Change Badge Position

```css
.badge-top-right {
  position: absolute;
  top: -8px;
  right: -8px;
}
```

---

## 🐛 Quick Fixes

### Badges Not Showing

```javascript
// Check unreadCount exists
console.log(chat.unreadCount)

// Manually add if missing
await updateDoc(doc(db, 'chats', chatId), {
  unreadCount: { userId1: 0, userId2: 0 }
})
```

### Friend Requests Not Working

1. Check Firestore rules are published
2. Verify user is authenticated
3. Check browser console for errors

### Notifications Not Working

1. Check VAPID key in `.env`
2. Verify permission is granted
3. Check service worker is registered

---

## 📱 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl/Cmd + K` | Search users (in modal) |
| `Esc` | Close modal |
| `Enter` | Send message |
| `Ctrl/Cmd + /` | Toggle dark mode |

---

## 🔒 Security Notes

- ✅ Messages remain end-to-end encrypted
- ✅ Only participants can read messages
- ✅ Users can only see their own requests
- ✅ Friend lists are private
- ✅ Firestore rules enforce permissions

---

## 📊 Performance Tips

- Badges update in real-time (no polling)
- Efficient Firestore queries (no unnecessary reads)
- Client-side sorting (no indexes needed)
- Lazy loading for modals
- Optimized animations (GPU accelerated)

---

## 🎯 Testing Checklist

Quick test before deploying:

- [ ] Send friend request
- [ ] Accept friend request
- [ ] Badge appears on unread chat
- [ ] Badge disappears when chat opened
- [ ] Friend request badge shows count
- [ ] Dark mode still works
- [ ] Messages still encrypted
- [ ] No console errors

---

## 📞 Support

### Documentation
- [ENHANCED_FEATURES.md](ENHANCED_FEATURES.md) - Full feature guide
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Integration guide
- [README.md](README.md) - Main documentation

### Quick Links
- [Firebase Console](https://console.firebase.google.com/)
- [Firestore Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [FCM Setup](https://firebase.google.com/docs/cloud-messaging/js/client)

---

## 🎉 That's It!

You now have:
- ✅ Friend request system
- ✅ Badge notifications
- ✅ Push notifications (optional)
- ✅ Beautiful pastel UI
- ✅ End-to-end encryption
- ✅ Real-time updates

**Happy chatting! 💬✨**
