import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateProfile } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import { logoutUser } from '../services/authService'
import '../styles/ProfileScreen.css'

function ProfileScreen({ user }) {
  const navigate = useNavigate()
  const [name, setName] = useState(user.displayName || '')
  const [photoURL, setPhotoURL] = useState(user.photoURL || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // Update auth profile
      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL: photoURL
      })

      // Update Firestore user document
      await updateDoc(doc(db, 'users', user.uid), {
        name: name,
        photoURL: photoURL
      })

      setMessage('✅ Profile updated successfully!')
    } catch (error) {
      setMessage('❌ Failed to update profile')
      console.error('Update profile error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logoutUser()
      navigate('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="profile-screen">
      <div className="profile-header">
        <button className="back-btn" onClick={() => navigate('/chats')}>
          ← Back
        </button>
        <h1>Profile Settings</h1>
      </div>

      <div className="profile-container">
        <div className="profile-avatar-section">
          <img src={photoURL || user.photoURL} alt="Profile" className="profile-avatar-large" />
          <p className="profile-email">{user.email}</p>
        </div>

        <form onSubmit={handleUpdateProfile} className="profile-form">
          <div className="form-group">
            <label>Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
            />
          </div>

          <div className="form-group">
            <label>Avatar URL</label>
            <input
              type="url"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
            <small>Or use a service like ui-avatars.com</small>
          </div>

          {message && <div className="profile-message">{message}</div>}

          <button type="submit" className="update-btn" disabled={loading}>
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>

        <div className="profile-actions">
          <button className="logout-btn" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>

        <div className="profile-info">
          <h3>🔒 Security Information</h3>
          <p>Your messages are end-to-end encrypted using AES-GCM encryption.</p>
          <p>Only you and your chat partner can read the messages.</p>
          <p>User ID: <code>{user.uid}</code></p>
        </div>
      </div>
    </div>
  )
}

export default ProfileScreen
