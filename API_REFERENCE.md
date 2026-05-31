# API Reference - WebRTC & Message Deletion

## 🔌 WebRTC Manager API

### **webrtcManager.initConnection()**
Initialize WebRTC connection for a chat.

```javascript
await webrtcManager.initConnection(
  chatId,        // string: Chat ID
  userId,        // string: Current user ID
  otherUserId,   // string: Other user ID
  onTypingUpdate // function: Callback for typing events
)
```

**Returns:** `Promise<boolean>` - Success status

---

### **webrtcManager.sendTypingStart()**
Send typing start event.

```javascript
webrtcManager.sendTypingStart(chatId, userId)
```

**Returns:** `boolean` - Success status

---

### **webrtcManager.sendTypingUpdate()**
Send typing update with text preview.

```javascript
webrtcManager.sendTypingUpdate(chatId, userId, textPreview)
```

**Parameters:**
- `chatId` (string): Chat ID
- `userId` (string): Current user ID
- `textPreview` (string): Current input text (optional)

**Returns:** `boolean` - Success status

---

### **webrtcManager.sendTypingStop()**
Send typing stop event.

```javascript
webrtcManager.sendTypingStop(chatId, userId)
```

**Returns:** `boolean` - Success status

---

### **webrtcManager.isChannelReady()**
Check if data channel is ready.

```javascript
const isReady = webrtcManager.isChannelReady(chatId)
```

**Returns:** `boolean` - Channel ready status

---

### **webrtcManager.closeConnection()**
Close WebRTC connection for a chat.

```javascript
webrtcManager.closeConnection(chatId)
```

---

## 🗑️ Message Service API

### **deleteMessageForMe()**
Delete message for current user only.

```javascript
await deleteMessageForMe(chatId, messageId, userId)
```

**Firestore Update:**
```javascript
{
  deletedFor: arrayUnion(userId)
}
```

**Returns:** `Promise<boolean>` - Success status

---

### **deleteMessageForEveryone()**
Delete message for all users.

```javascript
await deleteMessageForEveryone(chatId, messageId, userId)
```

**Firestore Update:**
```javascript
{
  isDeleted: true,
  deletedBy: userId,
  deletedAt: serverTimestamp()
}
```

**Returns:** `Promise<boolean>` - Success status

---

### **isMessageDeletedForUser()**
Check if message is deleted for current user.

```javascript
const status = isMessageDeletedForUser(message, userId)
```

**Returns:**
```javascript
{
  deleted: boolean,      // Is deleted
  forEveryone: boolean,  // Deleted for everyone
  deletedBy: string      // User who deleted (or null)
}
```

---

### **getDeletedMessageText()**
Get placeholder text for deleted message.

```javascript
const text = getDeletedMessageText(message, currentUserId)
```

**Returns:**
- `"You deleted this message"` - If current user deleted
- `"This message was deleted"` - If other user deleted
- `""` - If not deleted

---

### **canDeleteForEveryone()**
Check if user can delete message for everyone.

```javascript
const canDelete = canDeleteForEveryone(message, userId, timeLimit)
```

**Parameters:**
- `message` (object): Message object
- `userId` (string): Current user ID
- `timeLimit` (number): Time limit in ms (default: 3600000 = 1 hour)

**Returns:** `boolean` - Can delete status

---

### **filterDeletedMessages()**
Filter out messages deleted for current user.

```javascript
const filtered = filterDeletedMessages(messages, userId)
```

**Returns:** `Array` - Filtered messages array

---

## 🎨 Component APIs

### **TypingIndicator Component**

```jsx
<TypingIndicator 
  userName="John Doe"      // string: User name
  textPreview="Hello..."   // string (optional): Text preview
/>
```

**Props:**
- `userName` (string, required): Name of typing user
- `textPreview` (string, optional): Current typing text

---

### **MessageContextMenu Component**

```jsx
<MessageContextMenu
  message={messageObject}
  position={{ x: 100, y: 200 }}
  isOwnMessage={true}
  onClose={() => {}}
  onDeleteForMe={() => {}}
  onDeleteForEveryone={() => {}}
  onReply={() => {}}
/>
```

**Props:**
- `message` (object, required): Message object
- `position` (object, required): Menu position `{ x, y }`
- `isOwnMessage` (boolean, required): Is current user's message
- `onClose` (function, required): Close menu callback
- `onDeleteForMe` (function, required): Delete for me callback
- `onDeleteForEveryone` (function, required): Delete for everyone callback
- `onReply` (function, required): Reply callback

---

## 📊 Data Structures

### **Typing Event**
```javascript
{
  type: 'TYPING_START' | 'TYPING_UPDATE' | 'TYPING_STOP',
  chatId: string,
  userId: string,
  textPreview: string,  // Optional
  timestamp: number
}
```

---

### **WebRTC Signal**
```javascript
{
  from: string,  // User ID
  signal: {
    type: 'offer' | 'answer' | 'ice-candidate',
    offer: RTCSessionDescription,      // For offer
    answer: RTCSessionDescription,     // For answer
    candidate: RTCIceCandidate        // For ICE
  },
  timestamp: Timestamp
}
```

---

### **Message Object (with deletion)**
```javascript
{
  id: string,
  senderId: string,
  receiverId: string,
  encryptedMessage: string,
  timestamp: Timestamp,
  seen: boolean,
  delivered: boolean,
  
  // Deletion fields
  isDeleted: boolean,           // Deleted for everyone
  deletedBy: string,            // User who deleted
  deletedAt: Timestamp,         // When deleted
  deletedFor: string[]          // Users who deleted for themselves
}
```

---

## 🔥 Firestore Collections

### **/webrtc-signals/{chatId}/signals/{signalId}**
```javascript
{
  from: string,
  signal: object,
  timestamp: Timestamp
}
```

**Security Rules:**
```javascript
match /webrtc-signals/{chatId} {
  allow read, write: if isAuthenticated();
  
  match /signals/{signalId} {
    allow read, write, delete: if isAuthenticated();
  }
}
```

---

### **/chats/{chatId}/messages/{messageId}**
```javascript
{
  senderId: string,
  receiverId: string,
  encryptedMessage: string,
  timestamp: Timestamp,
  seen: boolean,
  delivered: boolean,
  isDeleted: boolean,
  deletedBy: string,
  deletedAt: Timestamp,
  deletedFor: string[]
}
```

**Security Rules:**
```javascript
match /messages/{messageId} {
  allow read: if isAuthenticated() && 
    request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
  
  allow update: if isAuthenticated() && 
    (request.auth.uid == resource.data.senderId || 
     request.auth.uid == resource.data.receiverId);
}
```

---

## 🎯 Event Handlers

### **handleTypingUpdate()**
Callback for WebRTC typing events.

```javascript
const handleTypingUpdate = (data) => {
  switch (data.type) {
    case 'TYPING_START':
      setIsOtherUserTyping(true)
      break
      
    case 'TYPING_UPDATE':
      setIsOtherUserTyping(true)
      setTypingPreview(data.textPreview || '')
      
      // Reset timeout
      clearTimeout(otherUserTypingTimeoutRef.current)
      otherUserTypingTimeoutRef.current = setTimeout(() => {
        setIsOtherUserTyping(false)
        setTypingPreview('')
      }, 5000)
      break
      
    case 'TYPING_STOP':
      setIsOtherUserTyping(false)
      setTypingPreview('')
      clearTimeout(otherUserTypingTimeoutRef.current)
      break
  }
}
```

---

### **handleContextMenu()**
Desktop right-click handler.

```javascript
const handleContextMenu = (message, event) => {
  event.preventDefault()
  setContextMenu({
    message,
    position: {
      x: event.clientX,
      y: event.clientY
    }
  })
}
```

---

### **handleLongPressStart()**
Mobile long-press handler.

```javascript
const handleLongPressStart = (message, event) => {
  const timer = setTimeout(() => {
    const touch = event.touches[0]
    setContextMenu({
      message,
      position: {
        x: touch.clientX,
        y: touch.clientY
      }
    })
  }, 500) // 500ms long-press duration
  
  setLongPressTimer(timer)
}
```

---

### **handleLongPressEnd()**
Cancel long-press.

```javascript
const handleLongPressEnd = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    setLongPressTimer(null)
  }
}
```

---

## 🔧 Configuration

### **WebRTC ICE Servers**
```javascript
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}
```

**Custom TURN Server:**
```javascript
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'username',
      credential: 'password'
    }
  ]
}
```

---

### **Typing Timeouts**
```javascript
// Auto-stop typing after 3 seconds
const TYPING_AUTO_STOP = 3000

// Hide typing indicator after 5 seconds
const TYPING_INDICATOR_TIMEOUT = 5000

// Long-press duration
const LONG_PRESS_DURATION = 500
```

---

### **Delete Time Limits**
```javascript
// 1 hour = 3600000 ms
const DELETE_TIME_LIMIT = 3600000

// No limit
const DELETE_TIME_LIMIT = Infinity

// 5 minutes
const DELETE_TIME_LIMIT = 300000
```

---

## 🎨 CSS Variables

### **Colors**
```css
--pastel-pink: #FFB6D9
--pastel-blue: #A8D8EA
--pastel-purple: #D4A5D4
--text-primary: #2D3748
--text-secondary: #718096
--bg-primary: #FFFFFF
--bg-secondary: #F7FAFC
--border-color: #E2E8F0
```

---

### **Shadows**
```css
--shadow: 0 4px 12px rgba(0, 0, 0, 0.08)
--shadow-hover: 0 8px 24px rgba(0, 0, 0, 0.12)
```

---

### **Gradients**
```css
--bg-gradient: linear-gradient(135deg, #FFB6D9 0%, #A8D8EA 100%)
```

---

## 📱 Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 768px) {
  /* Mobile styles */
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  /* Tablet styles */
}

/* Desktop */
@media (min-width: 1025px) {
  /* Desktop styles */
}
```

---

## 🐛 Error Handling

### **WebRTC Errors**
```javascript
try {
  await webrtcManager.initConnection(...)
} catch (error) {
  console.error('WebRTC init error:', error)
  // Fallback to Firestore-based typing
}
```

---

### **Deletion Errors**
```javascript
try {
  await deleteMessageForEveryone(chatId, messageId, userId)
} catch (error) {
  console.error('Delete error:', error)
  alert('Failed to delete message')
}
```

---

## ✅ Type Definitions (TypeScript)

```typescript
interface TypingEvent {
  type: 'TYPING_START' | 'TYPING_UPDATE' | 'TYPING_STOP'
  chatId: string
  userId: string
  textPreview?: string
  timestamp: number
}

interface Message {
  id: string
  senderId: string
  receiverId: string
  encryptedMessage: string
  timestamp: Timestamp
  seen: boolean
  delivered: boolean
  isDeleted?: boolean
  deletedBy?: string
  deletedAt?: Timestamp
  deletedFor?: string[]
}

interface ContextMenuPosition {
  x: number
  y: number
}

interface DeletionStatus {
  deleted: boolean
  forEveryone: boolean
  deletedBy: string | null
}
```

---

This API reference covers all the main functions and components you'll need to work with! 🚀
