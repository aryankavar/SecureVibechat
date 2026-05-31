/**
 * Sound Manager - Handles all audio notifications
 * Supports volume control and enable/disable toggle
 */

class SoundManager {
  constructor() {
    this.sounds = {}
    this.enabled = true
    this.volume = 0.5 // Default 50%
    this.initialized = false
  }

  /**
   * Initialize sound manager with audio files
   */
  async init() {
    if (this.initialized) return

    // Define sound files (you'll need to add these to public/sounds/)
    const soundFiles = {
      messageSent: '/sounds/message-sent.mp3',
      messageReceived: '/sounds/message-received.mp3',
      friendRequest: '/sounds/friend-request.mp3',
      requestAccepted: '/sounds/request-accepted.mp3',
      messageRead: '/sounds/message-read.mp3',
      notification: '/sounds/notification.mp3'
    }

    // Preload all sounds
    for (const [key, path] of Object.entries(soundFiles)) {
      try {
        const audio = new Audio(path)
        audio.volume = this.volume
        audio.preload = 'auto'
        this.sounds[key] = audio
      } catch (error) {
        console.warn(`Failed to load sound: ${key}`, error)
      }
    }

    this.initialized = true
  }

  /**
   * Play a sound
   * @param {string} soundName - Name of the sound to play
   */
  async play(soundName) {
    if (!this.enabled || !this.initialized) return

    const sound = this.sounds[soundName]
    if (!sound) {
      console.warn(`Sound not found: ${soundName}`)
      return
    }

    try {
      // Clone the audio to allow overlapping sounds
      const audioClone = sound.cloneNode()
      audioClone.volume = this.volume
      await audioClone.play()
    } catch (error) {
      console.warn(`Failed to play sound: ${soundName}`, error)
    }
  }

  /**
   * Set volume (0-1)
   * @param {number} volume - Volume level (0-1)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume))
    
    // Update all loaded sounds
    Object.values(this.sounds).forEach(sound => {
      sound.volume = this.volume
    })
  }

  /**
   * Enable/disable sounds
   * @param {boolean} enabled - Whether sounds are enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled
  }

  /**
   * Get current settings
   */
  getSettings() {
    return {
      enabled: this.enabled,
      volume: this.volume
    }
  }
}

// Export singleton instance
export const soundManager = new SoundManager()

// Sound effect helpers
export const playSounds = {
  messageSent: () => soundManager.play('messageSent'),
  messageReceived: () => soundManager.play('messageReceived'),
  friendRequest: () => soundManager.play('friendRequest'),
  requestAccepted: () => soundManager.play('requestAccepted'),
  messageRead: () => soundManager.play('messageRead'),
  notification: () => soundManager.play('notification')
}
