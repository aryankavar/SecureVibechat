import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './config/firebase'
import AuthScreen from './pages/AuthScreen'
import ChatListScreen from './pages/ChatListScreen'
import ChatScreen from './pages/ChatScreen'
import ProfileScreen from './pages/ProfileScreen'
import { ThemeProvider } from './context/ThemeContext'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading SecureVibe...</p>
      </div>
    )
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route 
            path="/" 
            element={user ? <Navigate to="/chats" /> : <AuthScreen />} 
          />
          <Route 
            path="/chats" 
            element={user ? <ChatListScreen user={user} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/chat/:chatId" 
            element={user ? <ChatScreen user={user} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/profile" 
            element={user ? <ProfileScreen user={user} /> : <Navigate to="/" />} 
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
