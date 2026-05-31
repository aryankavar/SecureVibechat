import React from 'react'
import '../styles/Badge.css'

/**
 * Badge component for showing notification counts
 * @param {number} count - Number to display
 * @param {string} size - 'small' | 'medium' | 'large'
 * @param {string} color - Badge color theme
 */
function Badge({ count, size = 'medium', color = 'pink' }) {
  if (!count || count === 0) return null
  
  const displayCount = count > 99 ? '99+' : count
  
  return (
    <span className={`badge badge-${size} badge-${color}`}>
      {displayCount}
    </span>
  )
}

export default Badge
