import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { listenToMessages, sendEncryptedMessage, markMessageSeen, markChatAsRead } from '../services/chatService'
import { 
  deleteMessageForMe, 
  deleteMessageForEveryone, 
  getDeletedMessageText,
  filterDeletedMessages 
} from '../services/messageService'
import { decryptMessage } from '../utils/encryption'
import { webrtcManager } from '../utils/webrtcManager'
import EmojiPicker from 'emoji-picker-react'
import TypingIndicator from '../components/TypingIndicator'
import MessageContextMenu from '../components/MessageContextMenu'
import '../styles/ChatScreen.css'
import '../styles/DeletedMessage.css'

function ChatScreen({ user }) {
  const { chatId } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [otherUser, setOtherUser] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false)
  const [typingPreview, setTypingPreview] = useState('')
  const [contextMenu, setContextMenu] = useState(null)
  const [longPressTimer, setLongPressTimer] = useState(null)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const otherUserTypingTimeoutRef = useRef(null)

  useEffect(() => {
    loadOtherUser()
    
    // Listen to messages
    const unsubscribe = listenToMessages(chatId, async (messagesList) => {
      // Decrypt messages
      const decryptedMessages = await Promise.all(
        messagesList.map(async (msg) => {
          try {
            const decrypted = await decryptMessage(msg.encryptedMessage, msg.senderId)
            
            // Mark as seen if not sent by current user
            if (msg.senderId !== user.uid && !msg.seen) {
              markMessageSeen(chatId, msg.id)
            }
            
            return { ...msg, decryptedText: decrypted }
          } catch (error) {
            return { ...msg, decryptedText: '[Unable to decrypt]' }
          }
        })
      )
      
      // Filter out messages deleted for current user
      const filteredMessages = filterDeletedMessages(decryptedMessages, user.uid)
      
      setMessages(filteredMessages)
    })

    // Mark chat as read when opening
    markChatAsRead(chatId, user.uid)

    return () => unsubscribe()
  }, [chatId, user.uid])

  // Initialize WebRTC for live typing
  useEffect(() => {
    if (chatId && user && otherUser) {
      webrtcManager.initConnection(
        chatId,
        user.uid,
        otherUser.id,
        handleTypingUpdate
      )
    }

    return () => {
      if (chatId) {
        webrtcManager.closeConnection(chatId)
      }
    }
  }, [chatId, user, otherUser])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadOtherUser = async () => {
    try {
      const participants = chatId.split('_')
      const otherUserId = participants.find(id => id !== user.uid)
      
      const userDoc = await getDoc(doc(db, 'users', otherUserId))
      setOtherUser({ id: otherUserId, ...userDoc.data() })
    } catch (error) {
      console.error('Load other user error:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!newMessage.trim()) return

    try {
      await sendEncryptedMessage(user.uid, otherUser.id, newMessage.trim())
      setNewMessage('')
      setShowEmojiPicker(false)
      
      // Stop typing indicator
      webrtcManager.sendTypingStop(chatId, user.uid)
      setIsTyping(false)
    } catch (error) {
      console.error('Send message error:', error)
    }
  }

  // Message context menu handlers
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
    }, 500)
    
    setLongPressTimer(timer)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const handleDeleteForMe = async (message) => {
    try {
      await deleteMessageForMe(chatId, message.id, user.uid)
    } catch (error) {
      console.error('Delete for me error:', error)
      alert('Failed to delete message')
    }
  }

  const handleDeleteForEveryone = async (message) => {
    try {
      const confirmed = window.confirm(
        'Delete this message for everyone? This cannot be undone.'
      )
      
      if (confirmed) {
        await deleteMessageForEveryone(chatId, message.id, user.uid)
      }
    } catch (error) {
      console.error('Delete for everyone error:', error)
      alert('Failed to delete message')
    }
  }

  const handleReply = (message) => {
    // TODO: Implement reply functionality
    console.log('Reply to:', message)
  }

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

  const handleTyping = (e) => {
    const value = e.target.value
    setNewMessage(value)
    
    // Send typing events via WebRTC
    if (value && !isTyping) {
      setIsTyping(true)
      webrtcManager.sendTypingStart(chatId, user.uid)
    }
    
    if (value) {
      // Send typing update with preview (optional)
      webrtcManager.sendTypingUpdate(chatId, user.uid, value)
    }
    
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

  const onEmojiClick = (emojiObject) => {
    setNewMessage(prev => prev + emojiObject.emoji)
  }

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate()
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (!otherUser) {
    return <div className="loading-screen">Loading chat...</div>
  }

  return (
    <div className="chat-screen">
      <div className="chat-header">
        <button className="back-btn" onClick={() => navigate('/chats')}>
          ← Back
        </button>
        <img src={otherUser.photoURL} alt={otherUser.name} className="header-avatar" />
        <div className="header-info">
          <h2>{otherUser.name}</h2>
          <span className={`status ${otherUser.isOnline ? 'online' : 'offline'}`}>
            {otherUser.isOnline ? '🟢 Online' : '⚫ Offline'}
          </span>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>🔒 This chat is end-to-end encrypted</p>
            <p>Send your first message!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.senderId === user.uid
            const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId
            const isDeleted = msg.isDeleted
            
            return (
              <div 
                key={msg.id} 
                className={`message ${isOwn ? 'own' : 'other'} ${showAvatar ? 'show-avatar' : ''} ${isDeleted ? 'deleted' : ''}`}
                onContextMenu={(e) => !isDeleted && handleContextMenu(msg, e)}
                onTouchStart={(e) => !isDeleted && handleLongPressStart(msg, e)}
                onTouchEnd={handleLongPressEnd}
                onTouchMove={handleLongPressEnd}
              >
                {!isOwn && showAvatar && (
                  <img src={otherUser.photoURL} alt="" className="message-avatar" />
                )}
                <div className="message-bubble">
                  {isDeleted ? (
                    <div className="deleted-message-text">
                      <span className="deleted-message-icon">🚫</span>
                      <span>{getDeletedMessageText(msg, user.uid)}</span>
                    </div>
                  ) : (
                    <>
                      <p>{msg.decryptedText}</p>
                      <div className="message-meta">
                        <span className="message-time">{formatMessageTime(msg.timestamp)}</span>
                        {isOwn && (
                          <span className="message-status">
                            {msg.seen ? '✓✓' : msg.delivered ? '✓' : '⏱'}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
        
        {/* Typing indicator */}
        {isOtherUserTyping && (
          <TypingIndicator 
            userName={otherUser.name} 
            textPreview={typingPreview}
          />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message context menu */}
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

      <form className="message-input-container" onSubmit={handleSendMessage}>
        <button 
          type="button"
          className="emoji-btn"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          😊
        </button>
        
        {showEmojiPicker && (
          <div className="emoji-picker-wrapper">
            <EmojiPicker onEmojiClick={onEmojiClick} />
          </div>
        )}
        
        <input
          type="text"
          value={newMessage}
          onChange={handleTyping}
          placeholder="Type a message..."
          className="message-input"
        />
        
        <button type="submit" className="send-btn" disabled={!newMessage.trim()}>
          ➤
        </button>
      </form>
    </div>
  )
}

export default ChatScreen
