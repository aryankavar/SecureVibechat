# 💻 Code Examples

## 🎯 Common Use Cases

### **1. Initialize WebRTC for a Chat**

```javascript
import { webrtcManager } from '../utils/webrtcManager'

// In your ChatScreen component
useEffect(() => {
  if (chatId && user && otherUser) {
    // Initialize WebRTC connection
    webrtcManager.initConnection(
      chatId,
      user.uid,
      otherUser.id,
      handleTypingUpdate
    )
  }

  // Cleanup on unmount
  return () => {
    if (chatId) {
      webrtcManager.closeConnection(chatId)
    }
  }
}, [chatId, user, otherUser])

// Handle typing updates
const handleTypingUpdate = (data) => {
  switch (data.type) {
    case 'TYPING_START':
      setIsOtherUserTyping(true)
      break
      
    case 'TYPING_UPDATE':
      setIsOtherUserTyping(true)
      setTypingPreview(data.textPreview || '')
      
      // Auto-hide after 5 seconds
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        setIsOtherUserTyping(false)
        setTypingPreview('')
      }, 5000)
      break
      
    case 'TYPING_STOP':
      setIsOtherUserTyping(false)
      setTypingPreview('')
      clearTimeout(typingTimeoutRef.current)
      break
  }
}
```

---

### **2. Send Typing Events**

```javascript
const handleTyping = (e) => {
  const value = e.target.value
  setNewMessage(value)
  
  // Send typing start
  if (value && !isTyping) {
    setIsTyping(true)
    webrtcManager.sendTypingStart(chatId, user.uid)
  }
  
  // Send typing update with preview
  if (value) {
    webrtcManager.sendTypingUpdate(chatId, user.uid, value)
  }
  
  // Send typing stop
  if (!value && isTyping) {
    setIsTyping(false)
    webrtcManager.sendTypingStop(chatId, user.uid)
  }
  
  // Auto-stop after 3 seconds of no typing
  clearTimeout(typingTimeoutRef.current)
  typingTimeoutRef.current = setTimeout(() => {
    if (isTyping) {
      setIsTyping(false)
      webrtcManager.sendTypingStop(chatId, user.uid)
    }
  }, 3000)
}
```

---

### **3. Delete Message for Me**

```javascript
import { deleteMessageForMe } from '../services/messageService'

const handleDeleteForMe = async (message) => {
  try {
    await deleteMessageForMe(chatId, message.id, user.uid)
    console.log('Message deleted for me')
  } catch (error) {
    console.error('Delete error:', error)
    alert('Failed to delete message')
  }
}
```

---

### **4. Delete Message for Everyone**

```javascript
import { deleteMessageForEveryone } from '../services/messageService'

const handleDeleteForEveryone = async (message) => {
  try {
    // Confirm with user
    const confirmed = window.confirm(
      'Delete this message for everyone? This cannot be undone.'
    )
    
    if (confirmed) {
      await deleteMessageForEveryone(chatId, message.id, user.uid)
      console.log('Message deleted for everyone')
    }
  } catch (error) {
    console.error('Delete error:', error)
    alert('Failed to delete message')
  }
}
```

---

### **5. Show Context Menu (Desktop)**

```javascript
const [contextMenu, setContextMenu] = useState(null)

const handleContextMenu = (message, event) => {
  event.preventDefault() // Prevent default browser menu
  
  setContextMenu({
    message,
    position: {
      x: event.clientX,
      y: event.clientY
    }
  })
}

// In JSX
<div 
  className="message-bubble"
  onContextMenu={(e) => handleContextMenu(message, e)}
>
  {message.text}
</div>

{contextMenu && (
  <MessageContextMenu
    message={contextMenu.message}
    position={contextMenu.position}
    isOwnMessage={contextMenu.message.senderId === user.uid}
    onClose={() => setContextMenu(null)}
    onDeleteForMe={() => handleDeleteForMe(contextMenu.message)}
    onDeleteForEveryone={() => handleDeleteForEveryone(contextMenu.message)}
    onReply={() => handleReply(contextMenu.message)}
  />
)}
```

---

### **6. Show Context Menu (Mobile - Long Press)**

```javascript
const [longPressTimer, setLongPressTimer] = useState(null)

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

const handleLongPressEnd = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    setLongPressTimer(null)
  }
}

// In JSX
<div 
  className="message-bubble"
  onTouchStart={(e) => handleLongPressStart(message, e)}
  onTouchEnd={handleLongPressEnd}
  onTouchMove={handleLongPressEnd} // Cancel on move
>
  {message.text}
</div>
```

---

### **7. Render Deleted Messages**

```javascript
import { getDeletedMessageText } from '../services/messageService'

// In your message rendering
messages.map((msg) => {
  const isDeleted = msg.isDeleted
  
  return (
    <div className={`message ${isDeleted ? 'deleted' : ''}`}>
      <div className="message-bubble">
        {isDeleted ? (
          <div className="deleted-message-text">
            <span className="deleted-message-icon">🚫</span>
            <span>{getDeletedMessageText(msg, user.uid)}</span>
          </div>
        ) : (
          <p>{msg.decryptedText}</p>
        )}
      </div>
    </div>
  )
})
```

---

### **8. Filter Deleted Messages**

```javascript
import { filterDeletedMessages } from '../services/messageService'

// After decrypting messages
const decryptedMessages = await Promise.all(
  messagesList.map(async (msg) => {
    const decrypted = await decryptMessage(msg.encryptedMessage, msg.senderId)
    return { ...msg, decryptedText: decrypted }
  })
)

// Filter out messages deleted for current user
const filteredMessages = filterDeletedMessages(decryptedMessages, user.uid)

setMessages(filteredMessages)
```

---

### **9. Show Typing Indicator**

```javascript
import TypingIndicator from '../components/TypingIndicator'

// In your JSX
{isOtherUserTyping && (
  <TypingIndicator 
    userName={otherUser.name} 
    textPreview={typingPreview} // Optional
  />
)}
```

---

### **10. Check if Data Channel is Ready**

```javascript
const sendTypingEvent = () => {
  if (webrtcManager.isChannelReady(chatId)) {
    // WebRTC is ready, use it
    webrtcManager.sendTypingUpdate(chatId, user.uid, text)
  } else {
    // Fallback to Firestore
    console.log('WebRTC not ready, using Firestore fallback')
    // Implement Firestore-based typing indicator
  }
}
```

---

### **11. Custom Typing Timeout**

```javascript
const TYPING_TIMEOUT = 3000 // 3 seconds
const INDICATOR_TIMEOUT = 5000 // 5 seconds

const handleTyping = (e) => {
  const value = e.target.value
  setNewMessage(value)
  
  if (value) {
    webrtcManager.sendTypingUpdate(chatId, user.uid, value)
  }
  
  // Auto-stop after custom timeout
  clearTimeout(typingTimeoutRef.current)
  typingTimeoutRef.current = setTimeout(() => {
    webrtcManager.sendTypingStop(chatId, user.uid)
  }, TYPING_TIMEOUT)
}

const handleTypingUpdate = (data) => {
  if (data.type === 'TYPING_UPDATE') {
    setIsOtherUserTyping(true)
    
    // Auto-hide after custom timeout
    clearTimeout(indicatorTimeoutRef.current)
    indicatorTimeoutRef.current = setTimeout(() => {
      setIsOtherUserTyping(false)
    }, INDICATOR_TIMEOUT)
  }
}
```

---

### **12. Disable Text Preview**

```javascript
// Send typing update without preview
const handleTyping = (e) => {
  const value = e.target.value
  setNewMessage(value)
  
  if (value) {
    // Send empty string for textPreview
    webrtcManager.sendTypingUpdate(chatId, user.uid, '')
  }
}

// In TypingIndicator component
<TypingIndicator 
  userName={otherUser.name} 
  textPreview={null} // Don't show preview
/>
```

---

### **13. Custom Delete Time Limit**

```javascript
import { canDeleteForEveryone } from '../services/messageService'

const THIRTY_MINUTES = 30 * 60 * 1000
const ONE_HOUR = 60 * 60 * 1000
const NO_LIMIT = Infinity

const handleDeleteForEveryone = async (message) => {
  // Check with custom time limit
  if (!canDeleteForEveryone(message, user.uid, THIRTY_MINUTES)) {
    alert('You can only delete messages within 30 minutes')
    return
  }
  
  await deleteMessageForEveryone(chatId, message.id, user.uid)
}
```

---

### **14. Handle WebRTC Connection Failure**

```javascript
const initWebRTC = async () => {
  try {
    const success = await webrtcManager.initConnection(
      chatId,
      user.uid,
      otherUser.id,
      handleTypingUpdate
    )
    
    if (!success) {
      console.log('WebRTC failed, using Firestore fallback')
      // Implement Firestore-based typing
      setupFirestoreTyping()
    }
  } catch (error) {
    console.error('WebRTC error:', error)
    // Fallback to Firestore
    setupFirestoreTyping()
  }
}

const setupFirestoreTyping = () => {
  // Listen to Firestore for typing status
  const typingRef = doc(db, 'chats', chatId, 'typing', otherUser.id)
  
  onSnapshot(typingRef, (snapshot) => {
    const data = snapshot.data()
    setIsOtherUserTyping(data?.isTyping || false)
  })
}
```

---

### **15. Batch Delete Multiple Messages**

```javascript
const handleBatchDelete = async (messageIds) => {
  try {
    const deletePromises = messageIds.map(messageId => 
      deleteMessageForMe(chatId, messageId, user.uid)
    )
    
    await Promise.all(deletePromises)
    console.log('All messages deleted')
  } catch (error) {
    console.error('Batch delete error:', error)
  }
}
```

---

### **16. Animate Message Deletion**

```javascript
const handleDeleteWithAnimation = async (message) => {
  // Add deleting class for animation
  const messageElement = document.getElementById(`msg-${message.id}`)
  messageElement?.classList.add('deleting')
  
  // Wait for animation
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // Delete message
  await deleteMessageForMe(chatId, message.id, user.uid)
}

// CSS
.message.deleting {
  animation: messageDelete 0.3s ease forwards;
}

@keyframes messageDelete {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.9);
  }
}
```

---

### **17. Show Typing Indicator with Avatar**

```javascript
// Custom TypingIndicator with user photo
<div className="typing-indicator">
  <img 
    src={otherUser.photoURL} 
    alt={otherUser.name}
    className="typing-avatar"
  />
  <div className="typing-content">
    <div className="typing-dots">
      <span className="typing-dot"></span>
      <span className="typing-dot"></span>
      <span className="typing-dot"></span>
    </div>
    <span className="typing-label">
      {otherUser.name} is typing...
    </span>
  </div>
</div>
```

---

### **18. Throttle Typing Updates**

```javascript
import { useRef } from 'react'

const useThrottle = (callback, delay) => {
  const lastRun = useRef(Date.now())
  
  return (...args) => {
    const now = Date.now()
    
    if (now - lastRun.current >= delay) {
      callback(...args)
      lastRun.current = now
    }
  }
}

// Usage
const throttledTypingUpdate = useThrottle((text) => {
  webrtcManager.sendTypingUpdate(chatId, user.uid, text)
}, 200) // Send every 200ms max

const handleTyping = (e) => {
  const value = e.target.value
  setNewMessage(value)
  
  if (value) {
    throttledTypingUpdate(value)
  }
}
```

---

### **19. Custom Context Menu Position**

```javascript
const handleContextMenu = (message, event) => {
  event.preventDefault()
  
  // Get viewport dimensions
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Menu dimensions
  const menuWidth = 200
  const menuHeight = 150
  
  // Calculate position
  let x = event.clientX
  let y = event.clientY
  
  // Adjust if menu would go off-screen
  if (x + menuWidth > viewportWidth) {
    x = viewportWidth - menuWidth - 10
  }
  
  if (y + menuHeight > viewportHeight) {
    y = viewportHeight - menuHeight - 10
  }
  
  setContextMenu({
    message,
    position: { x, y }
  })
}
```

---

### **20. Monitor WebRTC Connection Status**

```javascript
const [connectionStatus, setConnectionStatus] = useState('disconnected')

const initWebRTC = async () => {
  const peerConnection = await webrtcManager.initConnection(
    chatId,
    user.uid,
    otherUser.id,
    handleTypingUpdate
  )
  
  // Monitor connection state
  peerConnection.onconnectionstatechange = () => {
    setConnectionStatus(peerConnection.connectionState)
    
    switch (peerConnection.connectionState) {
      case 'connected':
        console.log('WebRTC connected ✅')
        break
      case 'disconnected':
        console.log('WebRTC disconnected ⚠️')
        break
      case 'failed':
        console.log('WebRTC failed ❌')
        // Fallback to Firestore
        setupFirestoreTyping()
        break
    }
  }
}

// Show status in UI
<div className="connection-status">
  {connectionStatus === 'connected' ? '🟢' : '🔴'} 
  {connectionStatus}
</div>
```

---

## 🎨 Styling Examples

### **Custom Typing Dot Colors**

```css
/* Gradient dots */
.typing-dot:nth-child(1) {
  background: linear-gradient(135deg, #FFB6D9, #FF9EC7);
}

.typing-dot:nth-child(2) {
  background: linear-gradient(135deg, #A8D8EA, #8BC9E0);
}

.typing-dot:nth-child(3) {
  background: linear-gradient(135deg, #D4A5D4, #C48FC4);
}
```

---

### **Custom Context Menu Style**

```css
.message-context-menu {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  padding: 12px;
}

.context-menu-item {
  padding: 14px 18px;
  border-radius: 10px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.context-menu-item:hover {
  background: linear-gradient(135deg, #FFB6D9, #A8D8EA);
  color: white;
  transform: translateX(4px);
}
```

---

### **Custom Deleted Message Style**

```css
.message.deleted .message-bubble {
  background: linear-gradient(135deg, #F7FAFC, #EDF2F7);
  border: 2px dashed #CBD5E0;
  padding: 16px;
}

.deleted-message-text {
  color: #718096;
  font-size: 14px;
  font-style: italic;
  display: flex;
  align-items: center;
  gap: 10px;
}

.deleted-message-icon {
  font-size: 20px;
  opacity: 0.5;
}
```

---

These examples cover most common use cases! 🚀
