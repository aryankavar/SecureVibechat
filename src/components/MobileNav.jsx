import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Badge from './Badge'
import '../styles/MobileNav.css'

/**
 * Mobile Bottom Navigation Bar
 * Shows on mobile devices only (< 768px)
 */
function MobileNav({ unreadCount = 0, requestCount = 0 }) {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    {
      id: 'home',
      icon: '🏠',
      label: 'Home',
      path: '/chats',
      badge: 0
    },
    {
      id: 'chats',
      icon: '💬',
      label: 'Chats',
      path: '/chats',
      badge: unreadCount
    },
    {
      id: 'requests',
      icon: '👥',
      label: 'Requests',
      path: '/friend-requests',
      badge: requestCount
    },
    {
      id: 'profile',
      icon: '👤',
      label: 'Profile',
      path: '/profile',
      badge: 0
    },
    {
      id: 'settings',
      icon: '⚙️',
      label: 'Settings',
      path: '/settings',
      badge: 0
    }
  ]

  const isActive = (path) => {
    return location.pathname === path
  }

  const handleNavClick = (path) => {
    navigate(path)
    
    // Add haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
  }

  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-container">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`mobile-nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => handleNavClick(item.path)}
            aria-label={item.label}
          >
            <div className="mobile-nav-icon-wrapper">
              <span className="mobile-nav-icon">{item.icon}</span>
              {item.badge > 0 && (
                <div className="mobile-nav-badge">
                  <Badge count={item.badge} size="small" color="pink" />
                </div>
              )}
            </div>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

export default MobileNav
