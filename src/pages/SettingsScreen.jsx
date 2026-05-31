import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { soundManager } from '../utils/soundManager'
import { useToast } from '../context/ToastContext'
import '../styles/SettingsScreen.css'

/**
 * Settings Screen
 * Manage app preferences: sounds, notifications, theme
 */
function SettingsScreen({ user }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [settings, setSettings] = useState({
    soundEnabled: true,
    soundVolume: 50,
    notificationsEnabled: true,
    vibrationEnabled: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [user.uid])

  const loadSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'preferences'))
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data()
        setSettings({
          soundEnabled: data.soundEnabled ?? true,
          soundVolume: data.soundVolume ?? 50,
          notificationsEnabled: data.notificationsEnabled ?? true,
          vibrationEnabled: data.vibrationEnabled ?? true
        })
        
        // Apply sound settings
        soundManager.setEnabled(data.soundEnabled ?? true)
        soundManager.setVolume((data.soundVolume ?? 50) / 100)
      }
    } catch (error) {
      console.error('Load settings error:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async (newSettings) => {
    setSaving(true)
    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), {
        ...newSettings,
        updatedAt: new Date()
      })
      
      toast.success('Settings saved!')
    } catch (error) {
      console.error('Save settings error:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (key) => {
    const newSettings = { ...settings, [key]: !settings[key] }
    setSettings(newSettings)
    
    // Apply immediately
    if (key === 'soundEnabled') {
      soundManager.setEnabled(newSettings.soundEnabled)
    }
    
    await saveSettings(newSettings)
  }

  const handleVolumeChange = async (e) => {
    const volume = parseInt(e.target.value)
    const newSettings = { ...settings, soundVolume: volume }
    setSettings(newSettings)
    
    // Apply immediately
    soundManager.setVolume(volume / 100)
  }

  const handleVolumeChangeEnd = async () => {
    await saveSettings(settings)
    
    // Play test sound
    soundManager.play('notification')
  }

  const testSound = () => {
    soundManager.play('notification')
  }

  if (loading) {
    return (
      <div className="settings-screen">
        <div className="loading-state">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="settings-screen">
      <div className="settings-header">
        <button className="back-btn" onClick={() => navigate('/chats')}>
          ← Back
        </button>
        <h1>Settings</h1>
      </div>

      <div className="settings-container">
        {/* Sound Settings */}
        <div className="settings-section">
          <h2>🔊 Sound</h2>
          
          <div className="setting-item">
            <div className="setting-info">
              <h3>Sound Effects</h3>
              <p>Play sounds for messages and notifications</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={() => handleToggle('soundEnabled')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {settings.soundEnabled && (
            <div className="setting-item">
              <div className="setting-info">
                <h3>Volume</h3>
                <p>{settings.soundVolume}%</p>
              </div>
              <div className="volume-control">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.soundVolume}
                  onChange={handleVolumeChange}
                  onMouseUp={handleVolumeChangeEnd}
                  onTouchEnd={handleVolumeChangeEnd}
                  className="volume-slider"
                />
                <button className="test-sound-btn" onClick={testSound}>
                  Test
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notification Settings */}
        <div className="settings-section">
          <h2>🔔 Notifications</h2>
          
          <div className="setting-item">
            <div className="setting-info">
              <h3>Push Notifications</h3>
              <p>Receive notifications for new messages</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.notificationsEnabled}
                onChange={() => handleToggle('notificationsEnabled')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h3>Vibration</h3>
              <p>Vibrate on new messages (mobile only)</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.vibrationEnabled}
                onChange={() => handleToggle('vibrationEnabled')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* About Section */}
        <div className="settings-section">
          <h2>ℹ️ About</h2>
          
          <div className="setting-item">
            <div className="setting-info">
              <h3>Version</h3>
              <p>SecureVibe Chat 2.0</p>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h3>Encryption</h3>
              <p>AES-GCM 256-bit end-to-end encryption</p>
            </div>
          </div>
        </div>

        {saving && (
          <div className="saving-indicator">
            Saving...
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsScreen
