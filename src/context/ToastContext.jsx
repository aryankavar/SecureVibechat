import React, { createContext, useContext, useState, useCallback } from 'react'
import Toast from '../components/Toast'

const ToastContext = createContext()

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'info', duration = 3000, icon) => {
    const id = Date.now()
    const toast = { id, message, type, duration, icon }
    
    setToasts(prev => [...prev, toast])

    // Auto-remove after duration
    setTimeout(() => {
      removeToast(id)
    }, duration)

    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  // Convenience methods
  const toast = {
    success: (message, duration) => showToast(message, 'success', duration, '✨'),
    error: (message, duration) => showToast(message, 'error', duration, '❌'),
    warning: (message, duration) => showToast(message, 'warning', duration, '⚠️'),
    info: (message, duration) => showToast(message, 'info', duration, 'ℹ️'),
    message: (message, duration) => showToast(message, 'message', duration, '💬'),
    friend: (message, duration) => showToast(message, 'friend', duration, '💌')
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            icon={toast.icon}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
