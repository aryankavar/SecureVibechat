import React from 'react'
import '../styles/TypingIndicator.css'

/**
 * Typing Indicator Component
 * Shows when other user is typing with bouncing dots animation
 */
function TypingIndicator({ userName, textPreview = null }) {
  return (
    <div className="typing-indicator-container">
      <div className="typing-indicator">
        <div className="typing-avatar">
          {userName?.charAt(0) || '?'}
        </div>
        <div className="typing-content">
          {textPreview ? (
            <div className="typing-preview">
              <span className="typing-preview-text">{textPreview}</span>
            </div>
          ) : (
            <div className="typing-dots">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
          )}
          <span className="typing-label">{userName} is typing...</span>
        </div>
      </div>
    </div>
  )
}

export default TypingIndicator
