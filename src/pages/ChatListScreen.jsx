import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { logoutUser } from '../services/authService'
import { getUsersList, listenToUserChats, startChatBetweenUsers } from '../services/chatService'
import { decryptMessage } from '../utils/encryption'
import { useTheme } from '../context/ThemeContext'
import '../styles/ChatListScreen.css'

function ChatListScreen({ user }) {
  const navigate = useNavigate()
  const { darkMode, toggleDarkMode } = useTheme()
  const [chats, setChats] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showUserList, setShowUserList] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Listen to user's chats
    const unsubscribe1 = listenToUserChats(user.uid, async (chatsList) => {
      // Decrypt last messages
      const chatsWithDecrypted = await Promise.all(
        chatsList.map(async (chat) => {
          if (chat.lastMessage) {
            try {
              const senderId = chat.lastMessageSenderId
              const decrypted = await decryptMessage(chat.lastMessage, senderId)
              return { ...chat, lastMessageDecrypted: decrypted }
            } catch (error) {
              return { ...chat, lastMessageDecrypted: '[Encrypted]' }
            }
          }
          return chat
        })
      )
      setChats(chatsWithDecrypted)
      setLoading(false)
    })

    // Load all users
    loadUsers()

    return () => {
      unsubscribe1()
    }
  }, [user.uid])

  const loadUsers = async () => {
    try {
      const users = await getUsersList(user.uid)
      setAllUsers(users)
    } catch (error) {
      console.error('Load users error:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await logoutUser()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleStartChat = async (otherUserId) => {
    try {
      const chatId = await startChatBetweenUsers(user.uid, otherUserId)
      navigate(`/chat/${chatId}`)
    } catch (error) {
      console.error('Start chat error:', error)
    }
  }

  const filteredUsers = allUsers.filter(u => 
    (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate()
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="chat-list-screen">
      <div className="chat-list-header">
        <div className="header-left">
          <h1>💬 SecureVibe</h1>
        </div>
        <div className="header-right">
          <button className="icon-btn" onClick={toggleDarkMode} title="Toggle Dark Mode">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button className="icon-btn" onClick={() => navigate('/profile')} title="Profile">
            👤
          </button>
          <button className="icon-btn" onClick={handleLogout} title="Logout">
            🚪
          </button>
        </div>
      </div>

      <div className="search-container">
        <input
          type="text"
          placeholder="🔍 Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <button 
          className="new-chat-btn"
          onClick={() => setShowUserList(!showUserList)}
        >
          ➕ New Chat
        </button>
      </div>

      {showUserList && (
        <div className="users-list">
          <h3>Start a conversation</h3>
          {filteredUsers.length === 0 ? (
            <p className="empty-state">No users found</p>
          ) : (
            filteredUsers.map(u => (
              <div 
                key={u.id} 
                className="user-item"
                onClick={() => handleStartChat(u.id)}
              >
                <img src={u.photoURL} alt={u.name} className="user-avatar" />
                <div className="user-info">
                  <h4>{u.name}</h4>
                  <p>{u.email}</p>
                </div>
                <span className={`status-dot ${u.isOnline ? 'online' : 'offline'}`}></span>
              </div>
            ))
          )}
        </div>
      )}

      <div className="chats-container">
        {loading ? (
          <div className="loading-state">Loading chats...</div>
        ) : chats.length === 0 ? (
          <div className="empty-state">
            <p>No chats yet</p>
            <p>Start a conversation by clicking "New Chat"</p>
          </div>
        ) : (
          chats.map(chat => (
            <div 
              key={chat.id} 
              className="chat-item"
              onClick={() => navigate(`/chat/${chat.id}`)}
            >
              <div className="badge-container">
                <img 
                  src={chat.otherUser.photoURL} 
                  alt={chat.otherUser.name} 
                  className="chat-avatar" 
                />
                {chat.unreadCount > 0 && (
                  <div className="badge-top-right">
                    <Badge count={chat.unreadCount} size="small" color="pink" />
                  </div>
                )}
              </div>
              <div className="chat-info">
                <div className="chat-header-row">
                  <h3>{chat.otherUser.name}</h3>
                  <span className="chat-time">{formatTime(chat.lastMessageTime)}</span>
                </div>
                <p className={`last-message ${chat.unreadCount > 0 ? 'unread' : ''}`}>
                  {chat.lastMessageDecrypted || 'No messages yet'}
                </p>
              </div>
              <span className={`status-dot ${chat.otherUser.isOnline ? 'online' : 'offline'}`}></span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ChatListScreen
