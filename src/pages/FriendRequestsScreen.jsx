import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  listenToIncomingRequests, 
  listenToSentRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest
} from '../services/friendService'
import '../styles/FriendRequestsScreen.css'

function FriendRequestsScreen({ user }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('incoming')
  const [incomingRequests, setIncomingRequests] = useState([])
  const [sentRequests, setSentRequests] = useState([])
  const [processing, setProcessing] = useState({})

  useEffect(() => {
    const unsubscribe1 = listenToIncomingRequests(user.uid, setIncomingRequests)
    const unsubscribe2 = listenToSentRequests(user.uid, setSentRequests)

    return () => {
      unsubscribe1()
      unsubscribe2()
    }
  }, [user.uid])

  const handleAccept = async (requestId, friendId) => {
    setProcessing({ ...processing, [requestId]: 'accepting' })
    try {
      await acceptFriendRequest(user.uid, requestId, friendId)
    } catch (error) {
      console.error('Accept error:', error)
      alert('Failed to accept request')
    } finally {
      setProcessing({ ...processing, [requestId]: null })
    }
  }

  const handleReject = async (requestId, senderId) => {
    setProcessing({ ...processing, [requestId]: 'rejecting' })
    try {
      await rejectFriendRequest(user.uid, requestId, senderId)
    } catch (error) {
      console.error('Reject error:', error)
      alert('Failed to reject request')
    } finally {
      setProcessing({ ...processing, [requestId]: null })
    }
  }

  const handleCancel = async (requestId, receiverId) => {
    setProcessing({ ...processing, [requestId]: 'canceling' })
    try {
      await cancelFriendRequest(user.uid, requestId, receiverId)
    } catch (error) {
      console.error('Cancel error:', error)
      alert('Failed to cancel request')
    } finally {
      setProcessing({ ...processing, [requestId]: null })
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate()
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="friend-requests-screen">
      <div className="requests-header">
        <button className="back-btn" onClick={() => navigate('/chats')}>
          ← Back
        </button>
        <h1>Friend Requests</h1>
      </div>

      <div className="requests-tabs">
        <button
          className={`tab-btn ${activeTab === 'incoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('incoming')}
        >
          Incoming
          {incomingRequests.length > 0 && (
            <span className="tab-badge">{incomingRequests.length}</span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          Sent
          {sentRequests.length > 0 && (
            <span className="tab-badge">{sentRequests.length}</span>
          )}
        </button>
      </div>

      <div className="requests-container">
        {activeTab === 'incoming' ? (
          incomingRequests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>No incoming requests</p>
              <small>Friend requests will appear here</small>
            </div>
          ) : (
            incomingRequests.map((request) => (
              <div key={request.id} className="request-card incoming">
                <img
                  src={request.senderInfo?.photoURL}
                  alt={request.senderName}
                  className="request-avatar"
                />
                <div className="request-info">
                  <h3>{request.senderName}</h3>
                  <p>{request.senderInfo?.email}</p>
                  <span className="request-time">{formatTime(request.timestamp)}</span>
                </div>
                <div className="request-actions">
                  <button
                    className="btn-accept"
                    onClick={() => handleAccept(request.id, request.senderId)}
                    disabled={processing[request.id]}
                  >
                    {processing[request.id] === 'accepting' ? '...' : '✓ Accept'}
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleReject(request.id, request.senderId)}
                    disabled={processing[request.id]}
                  >
                    {processing[request.id] === 'rejecting' ? '...' : '✕ Reject'}
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          sentRequests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📤</div>
              <p>No sent requests</p>
              <small>Requests you send will appear here</small>
            </div>
          ) : (
            sentRequests.map((request) => (
              <div key={request.id} className="request-card sent">
                <div className="request-info">
                  <h3>{request.receiverName}</h3>
                  <span className="request-time">{formatTime(request.timestamp)}</span>
                  <p className="request-status">⏱ Pending</p>
                </div>
                <button
                  className="btn-cancel"
                  onClick={() => handleCancel(request.id, request.receiverId)}
                  disabled={processing[request.id]}
                >
                  {processing[request.id] === 'canceling' ? '...' : 'Cancel'}
                </button>
              </div>
            ))
          )
        )}
      </div>
    </div>
  )
}

export default FriendRequestsScreen
