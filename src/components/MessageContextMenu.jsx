import React, { useEffect, useRef } from 'react'
import '../styles/MessageContextMenu.css'

/**
 * Message Context Menu
 * Shows options for message actions (delete, reply, etc.)
 */
function MessageContextMenu({ 
  message, 
  position, 
  isOwnMessage, 
  onClose, 
  onDeleteForMe,
  onDeleteForEveryone,
  onReply 
}) {
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose()
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Check if message can be deleted for everyone (within 1 hour)
  const canDeleteForEveryone = () => {
    if (!isOwnMessage || !message.timestamp) return false
    
    const messageTime = message.timestamp.toMillis()
    const now = Date.now()
    const oneHour = 60 * 60 * 1000
    
    return (now - messageTime) < oneHour
  }

  const handleAction = (action) => {
    action()
    onClose()
  }

  return (
    <div 
      className="message-context-menu" 
      ref={menuRef}
      style={{
        top: position.y,
        left: position.x
      }}
    >
      <button 
        className="context-menu-item"
        onClick={() => handleAction(onReply)}
      >
        <span className="context-menu-icon">↩️</span>
        <span>Reply</span>
      </button>

      <button 
        className="context-menu-item"
        onClick={() => handleAction(onDeleteForMe)}
      >
        <span className="context-menu-icon">🗑️</span>
        <span>Delete for me</span>
      </button>

      {isOwnMessage && canDeleteForEveryone() && (
        <button 
          className="context-menu-item danger"
          onClick={() => handleAction(onDeleteForEveryone)}
        >
          <span className="context-menu-icon">⚠️</span>
          <span>Delete for everyone</span>
        </button>
      )}
    </div>
  )
}

export default MessageContextMenu
