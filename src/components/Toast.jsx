import React, { useEffect } from 'react'
import '../styles/Toast.css'

/**
 * Toast Notification Component
 * Shows temporary notifications with auto-dismiss
 */
function Toast({ message, type = 'info', duration = 3000, onClose, icon }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getIcon = () => {
    if (icon) return icon
    
    switch (type) {
      case 'success':
        return '✨'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'message':
        return '💬'
      case 'friend':
        return '💌'
      default:
        return 'ℹ️'
    }
  }

  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-icon">{getIcon()}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>✕</button>
    </div>
  )
}

export default Toast
