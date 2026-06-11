/**
 * WebRTC Manager for Live Typing
 * Handles peer-to-peer connections for real-time typing indicators
 */

import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../config/firebase'

class WebRTCManager {
  constructor() {
    this.peerConnections = new Map() // chatId -> RTCPeerConnection
    this.dataChannels = new Map() // chatId -> RTCDataChannel
    this.signalingUnsubscribers = new Map() // chatId -> unsubscribe function
    this.typingCallbacks = new Map() // chatId -> callback function
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
  }

  /**
   * Initialize WebRTC connection for a chat
   * @param {string} chatId - Chat ID
   * @param {string} userId - Current user ID
   * @param {string} otherUserId - Other user ID
   * @param {function} onTypingUpdate - Callback for typing updates
   */
  async initConnection(chatId, userId, otherUserId, onTypingUpdate) {
    try {
      // Store callback
      this.typingCallbacks.set(chatId, onTypingUpdate)

      // Create peer connection
      const peerConnection = new RTCPeerConnection(this.configuration)
      this.peerConnections.set(chatId, peerConnection)

      // Create data channel (as initiator)
      const dataChannel = peerConnection.createDataChannel('typing', {
        ordered: true
      })
      
      this.setupDataChannel(chatId, dataChannel)

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignal(chatId, userId, {
            type: 'ice-candidate',
            candidate: {
              candidate: event.candidate.candidate,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              sdpMid: event.candidate.sdpMid
            }
          })
        }
      }

      // Handle incoming data channel (as receiver)
      peerConnection.ondatachannel = (event) => {
        this.setupDataChannel(chatId, event.channel)
      }

      // Create and send offer
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)

      await this.sendSignal(chatId, userId, {
        type: 'offer',
        offer: {
          type: offer.type,
          sdp: offer.sdp
        }
      })

      // Listen for signaling messages
      this.listenForSignals(chatId, userId, otherUserId)

      return true
    } catch (error) {
      console.error('WebRTC init error:', error)
      return false
    }
  }

  /**
   * Setup data channel event handlers
   */
  setupDataChannel(chatId, dataChannel) {
    this.dataChannels.set(chatId, dataChannel)

    dataChannel.onopen = () => {
      console.log('Data channel opened for', chatId)
    }

    dataChannel.onclose = () => {
      console.log('Data channel closed for', chatId)
    }

    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const callback = this.typingCallbacks.get(chatId)
        if (callback) {
          callback(data)
        }
      } catch (error) {
        console.error('Data channel message error:', error)
      }
    }
  }

  /**
   * Send signaling message via Firestore
   */
  async sendSignal(chatId, userId, signal) {
    try {
      const signalRef = doc(db, 'webrtc-signals', chatId, 'signals', `${userId}_${Date.now()}`)
      await setDoc(signalRef, {
        from: userId,
        signal,
        timestamp: serverTimestamp()
      })
    } catch (error) {
      console.error('Send signal error:', error)
    }
  }

  /**
   * Listen for signaling messages from other user
   */
  listenForSignals(chatId, userId, otherUserId) {
    const signalsRef = collection(db, 'webrtc-signals', chatId, 'signals')
    
    const unsubscribe = onSnapshot(signalsRef, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === 'added') {
          const data = change.doc.data()
          
          // Only process signals from other user
          if (data.from === otherUserId) {
            await this.handleSignal(chatId, userId, data.signal)
            
            // Clean up processed signal
            await deleteDoc(change.doc.ref)
          }
        }
      }
    })

    this.signalingUnsubscribers.set(chatId, unsubscribe)
  }

  /**
   * Handle incoming signaling message
   */
  async handleSignal(chatId, userId, signal) {
    try {
      const peerConnection = this.peerConnections.get(chatId)
      if (!peerConnection) return

      switch (signal.type) {
        case 'offer':
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.offer))
          const answer = await peerConnection.createAnswer()
          await peerConnection.setLocalDescription(answer)
          await this.sendSignal(chatId, userId, {
            type: 'answer',
            answer: {
              type: answer.type,
              sdp: answer.sdp
            }
          })
          break

        case 'answer':
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.answer))
          break

        case 'ice-candidate':
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate))
          break
      }
    } catch (error) {
      console.error('Handle signal error:', error)
    }
  }

  /**
   * Send typing event through data channel
   * @param {string} chatId - Chat ID
   * @param {object} event - Typing event data
   */
  sendTypingEvent(chatId, event) {
    const dataChannel = this.dataChannels.get(chatId)
    
    if (dataChannel && dataChannel.readyState === 'open') {
      try {
        dataChannel.send(JSON.stringify(event))
        return true
      } catch (error) {
        console.error('Send typing event error:', error)
        return false
      }
    }
    
    return false
  }

  /**
   * Send typing start event
   */
  sendTypingStart(chatId, userId) {
    return this.sendTypingEvent(chatId, {
      type: 'TYPING_START',
      chatId,
      userId,
      timestamp: Date.now()
    })
  }

  /**
   * Send typing update with text preview
   */
  sendTypingUpdate(chatId, userId, textPreview) {
    return this.sendTypingEvent(chatId, {
      type: 'TYPING_UPDATE',
      chatId,
      userId,
      textPreview,
      timestamp: Date.now()
    })
  }

  /**
   * Send typing stop event
   */
  sendTypingStop(chatId, userId) {
    return this.sendTypingEvent(chatId, {
      type: 'TYPING_STOP',
      chatId,
      userId,
      timestamp: Date.now()
    })
  }

  /**
   * Check if data channel is ready
   */
  isChannelReady(chatId) {
    const dataChannel = this.dataChannels.get(chatId)
    return dataChannel && dataChannel.readyState === 'open'
  }

  /**
   * Close connection for a chat
   */
  closeConnection(chatId) {
    // Close data channel
    const dataChannel = this.dataChannels.get(chatId)
    if (dataChannel) {
      dataChannel.onopen = null
      dataChannel.onclose = null
      dataChannel.onmessage = null
      dataChannel.onerror = null
      dataChannel.close()
      this.dataChannels.delete(chatId)
    }

    // Close peer connection
    const peerConnection = this.peerConnections.get(chatId)
    if (peerConnection) {
      peerConnection.onicecandidate = null
      peerConnection.ondatachannel = null
      peerConnection.oniceconnectionstatechange = null
      peerConnection.onsignalingstatechange = null
      peerConnection.close()
      this.peerConnections.delete(chatId)
    }

    // Unsubscribe from signaling
    const unsubscribe = this.signalingUnsubscribers.get(chatId)
    if (unsubscribe) {
      unsubscribe()
      this.signalingUnsubscribers.delete(chatId)
    }

    // Remove callback
    this.typingCallbacks.delete(chatId)
  }

  /**
   * Close all connections
   */
  closeAllConnections() {
    for (const chatId of this.peerConnections.keys()) {
      this.closeConnection(chatId)
    }
  }
}

// Export singleton instance
export const webrtcManager = new WebRTCManager()

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    webrtcManager.closeAllConnections()
  })
}
