import React, { useState } from 'react'
import { createUser, loginUser } from '../services/authService'
import '../styles/AuthScreen.css'

function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await loginUser(formData.email, formData.password)
      } else {
        if (!formData.name.trim()) {
          setError('Please enter your name')
          setLoading(false)
          return
        }
        await createUser(formData.email, formData.password, formData.name)
      }
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError('')
    setFormData({ name: '', email: '', password: '' })
  }

  return (
    <div className="auth-screen">
      <div className="auth-background"></div>
      
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-logo">🔒 SecureVibe</h1>
            <p className="auth-tagline">End-to-End Encrypted Chat</p>
          </div>

          <div className="auth-toggle">
            <button 
              className={isLogin ? 'active' : ''} 
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button 
              className={!isLogin ? 'active' : ''} 
              onClick={() => setIsLogin(false)}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  required={!isLogin}
                />
              </div>
            )}

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Sign Up')}
            </button>
          </form>

          <p className="auth-footer">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span onClick={toggleMode} className="auth-link">
              {isLogin ? 'Sign Up' : 'Login'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default AuthScreen
