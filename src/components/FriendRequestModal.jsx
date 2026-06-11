import React, { useState, useEffect } from 'react'
import { searchUsers, sendFriendRequest, checkIfFriends, checkIfRequestSent } from '../services/friendService'
import '../styles/FriendRequestModal.css'

function FriendRequestModal({ user, onClose }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState({})
  const [message, setMessage] = useState('')

  useEffect(() => {
    let timeoutId;
    let isCancelled = false;

    const performSearch = async () => {
      setLoading(true);
      try {
        const results = await searchUsers(searchQuery, user.uid);
        if (isCancelled) return;

        // Check friendship status for each result
        const resultsWithStatus = await Promise.all(
          results.map(async (result) => {
            const isFriend = await checkIfFriends(user.uid, result.id);
            const requestSent = await checkIfRequestSent(user.uid, result.id);
            return { ...result, isFriend, requestSent };
          })
        );
        
        if (isCancelled) return;
        setSearchResults(resultsWithStatus);
      } catch (error) {
        if (isCancelled) return;
        console.error('Search error:', error);
        setMessage('Search failed. Please try again.');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    if (searchQuery.trim().length >= 2) {
      timeoutId = setTimeout(() => {
        performSearch();
      }, 500); // 500ms debounce
    } else {
      setSearchResults([]);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      isCancelled = true;
    };
  }, [searchQuery, user.uid]);

  const handleSendRequest = async (receiverId, receiverName) => {
    setSending({ ...sending, [receiverId]: true })
    setMessage('')
    
    try {
      await sendFriendRequest(user.uid, user.displayName, receiverId, receiverName)
      
      // Update local state
      setSearchResults(results =>
        results.map(r =>
          r.id === receiverId ? { ...r, requestSent: true } : r
        )
      )
      
      setMessage(`✅ Friend request sent to ${receiverName}!`)
      
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Send request error:', error)
      setMessage('❌ Failed to send request. Please try again.')
    } finally {
      setSending({ ...sending, [receiverId]: false })
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content friend-request-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔍 Find Friends</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="search-section">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input-modal"
            autoFocus
          />
        </div>

        {message && (
          <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <div className="search-results">
          {loading ? (
            <div className="loading-state">
              <div className="spinner-small"></div>
              <p>Searching...</p>
            </div>
          ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
            <div className="empty-state">
              <p>No users found</p>
              <small>Try a different search term</small>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="empty-state">
              <p>👋 Start typing to search</p>
              <small>Search by name or email</small>
            </div>
          ) : (
            searchResults.map((result) => (
              <div key={result.id} className="user-result">
                <img
                  src={result.photoURL}
                  alt={result.name}
                  className="user-result-avatar"
                />
                <div className="user-result-info">
                  <h4>{result.name}</h4>
                  <p>{result.email}</p>
                </div>
                
                {result.isFriend ? (
                  <button className="btn-status" disabled>
                    ✓ Friends
                  </button>
                ) : result.requestSent ? (
                  <button className="btn-status" disabled>
                    ⏱ Pending
                  </button>
                ) : (
                  <button
                    className="btn-send-request"
                    onClick={() => handleSendRequest(result.id, result.name)}
                    disabled={sending[result.id]}
                  >
                    {sending[result.id] ? '...' : '➕ Add Friend'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default FriendRequestModal
